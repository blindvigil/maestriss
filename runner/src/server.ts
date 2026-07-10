import http from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { assertAskCapableDriversResolve, getDriver } from './drivers/index.js';
import { inspectParticipantPage, type InspectionResult } from './inspector.js';
import { participants, type RunnerParticipant } from './participants.js';
import { getPromptTemplate } from './promptTemplates.js';
import { ensureParticipantPage, listParticipantPages, openParticipants } from './runner.js';
import { waitForManualSecurityVerification } from './security.js';
import { renderPromptTemplate } from './templateRenderer.js';
import type { ParticipantErrorResponse, ParticipantResponse, ParticipantRunResponse } from './types.js';

export const runnerHost = '127.0.0.1';
export const runnerPort = 4137;
export const runnerBaseUrl = `http://${runnerHost}:${runnerPort}`;

export type BrowserChannel = 'chromium' | 'chrome' | 'msedge';
export type BrowserMode = 'persistent-profile' | 'cdp';

export type HealthResponse = {
  browserMode: BrowserMode;
  browserChannel: BrowserChannel;
  connected: boolean;
  participantCount: number;
  activeRequestIds: string[];
};

export type AskResponse = {
  participant: string;
  response: string;
  normalizedResponse?: ParticipantRunResponse;
};

export type InspectResponse = {
  participant: string;
  inspection: InspectionResult;
};

export type ChainResponse = {
  from: string;
  to: string;
  sourceResponse: string;
  targetResponse: string;
  sourceNormalizedResponse: ParticipantResponse;
  targetNormalizedResponse: ParticipantResponse;
  sourcePrompt?: string;
};

export type RandomRunResponse = {
  originalPrompt: string;
  order: string[];
  excludedProviders: ProviderStatus[];
  responses: ParticipantRunResponse[];
  finalResponse?: ParticipantRunResponse;
};

export type ProviderReadinessStatus =
  | 'ready'
  | 'logged-out'
  | 'security-verification'
  | 'unsupported-browser-login'
  | 'driver-not-implemented'
  | 'unknown';

export type ProviderStatus = {
  participant: string;
  driverImplemented: boolean;
  pageUrl: string;
  pageTitle: string;
  status: ProviderReadinessStatus;
  notes: string[];
};

type JsonRecord = Record<string, unknown>;

type RunnerServerOptions = {
  browserChannel: BrowserChannel;
  connectCdpUrl?: string;
  runnerRoot: string;
  userDataDir: string;
};

type BrowserSession = {
  context: BrowserContext;
  mode: BrowserMode;
  close: () => Promise<void>;
};

let askRequestCounter = 0;

type ActiveAskRequest = {
  requestId: string;
  participant: string;
  controller: AbortController;
  startedAt: number;
};

function securityAttemptLimit(participantName: string) {
  return participantName.toLowerCase() === 'claude' ? 2 : Number.POSITIVE_INFINITY;
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function statusDisplayName(participantId: string) {
  const participant = participants.find((candidate) => candidate.id === participantId);
  return participant?.name ?? participantId.charAt(0).toUpperCase() + participantId.slice(1);
}

async function saveAskFailureArtifacts(page: Page, participantName: string) {
  const debugDir = path.join(process.cwd(), 'debug');
  await mkdir(debugDir, { recursive: true });

  const normalizedName = participantName.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  const htmlPath = path.join(debugDir, `${normalizedName}-ask-failure.html`);
  const screenshotPath = path.join(debugDir, `${normalizedName}-ask-failure.png`);

  await writeFile(htmlPath, await page.content().catch(() => ''), 'utf8');
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);

  return { htmlPath, screenshotPath };
}

export function shuffleParticipants(participantIds: string[]) {
  const shuffled = [...participantIds];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function createErrorResponse(
  participant: string,
  question: string,
  status: ParticipantErrorResponse['status'],
  error: string,
  reason?: string,
  partial?: Partial<ParticipantResponse>,
): ParticipantErrorResponse {
  return {
    participant,
    question,
    answer: partial?.answer ?? '',
    citations: [],
    elapsedSeconds: partial?.elapsedSeconds ?? 0,
    rawText: partial?.rawText ?? '',
    cleanedText: partial?.cleanedText ?? partial?.answer ?? '',
    status,
    error,
    ...(reason ? { reason } : {}),
    ...(partial?.rawHtml ? { rawHtml: partial.rawHtml } : {}),
  };
}

function nextAskRequestId() {
  askRequestCounter += 1;
  return `ask-${askRequestCounter.toString().padStart(4, '0')}`;
}

function logAskStep(requestId: string | undefined, message: string) {
  if (requestId) {
    console.log(`[${requestId}] ${message}`);
  } else {
    console.log(message);
  }
}

function askTimeoutMs(participantName: string) {
  switch (participantName.toLowerCase()) {
    case 'claude':
      return 255000;
    case 'chatgpt':
      return 135000;
    case 'gemini':
    case 'deepseek':
      return 225000;
    default:
      return 195000;
  }
}

function abortError(requestId?: string) {
  return new Error(`Request ${requestId ?? ''} cancelled`.trim());
}

function throwIfAborted(signal?: AbortSignal, requestId?: string) {
  if (signal?.aborted) {
    throw abortError(requestId);
  }
}

async function runCancellableStep<T>(
  step: Promise<T>,
  signal?: AbortSignal,
  requestId?: string,
): Promise<T> {
  throwIfAborted(signal, requestId);

  if (!signal) {
    return step;
  }

  return Promise.race([
    step,
    new Promise<T>((_, reject) => {
      if (signal.aborted) {
        reject(abortError(requestId));
        return;
      }

      signal.addEventListener('abort', () => reject(abortError(requestId)), { once: true });
    }),
  ]);
}

function isCancellationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes('cancelled');
}

function bodyContainsAny(bodyText: string, patterns: string[]) {
  const normalized = bodyText.toLowerCase();
  return patterns.some((pattern) => normalized.includes(pattern.toLowerCase()));
}

async function getVisiblePageText(page: import('playwright').Page) {
  return page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
}

async function hasVisibleComposer(page: import('playwright').Page) {
  return page.evaluate<boolean>(`(() => {
    return Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]'))
      .some((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden';
      });
  })()`).catch(() => false);
}

async function hasVisibleLoginForm(page: import('playwright').Page) {
  return page.evaluate<boolean>(`(() => {
    function visible(el) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden';
    }

    const emailOrPassword = Array.from(document.querySelectorAll(
      'input[type="email"], input[type="password"], input[name*="email" i], input[name*="password" i], input[autocomplete="username"], input[autocomplete="current-password"]'
    )).some(visible);

    const loginForm = Array.from(document.querySelectorAll('form'))
      .filter(visible)
      .some((form) => /log in|login|sign in|sign up|create account/i.test(form.textContent || ''));

    return emailOrPassword || loginForm;
  })()`).catch(() => false);
}

function isLoginUrl(pageUrl: string) {
  try {
    const parsed = new URL(pageUrl);
    return /\/(login|signin|sign-in|signup|sign-up|auth|account)/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

async function detectProviderStatus(
  context: BrowserContext,
  participant: RunnerParticipant,
): Promise<ProviderStatus> {
  const driver = getDriver(participant.id) ?? getDriver(participant.name);
  const driverImplemented = Boolean(driver?.pastePrompt && driver.submitPrompt && driver.waitForCompletion);
  const result = await ensureParticipantPage(context, participant);
  const pageTitle = await result.page.title().catch(() => result.title || '');
  const pageUrl = result.page.url() || result.url;
  const bodyText = await getVisiblePageText(result.page);
  const combined = `${pageTitle}\n${bodyText}`;
  const visibleComposer = await hasVisibleComposer(result.page);
  const visibleLoginForm = await hasVisibleLoginForm(result.page);
  const notes: string[] = [];

  if (!driverImplemented) {
    notes.push('No ask-capable driver is implemented for this participant.');
    return {
      participant: participant.id,
      driverImplemented,
      pageUrl,
      pageTitle,
      status: 'driver-not-implemented',
      notes,
    };
  }

  if (bodyContainsAny(combined, [
    'Just a moment',
    'Verify you are human',
    'Performing security verification',
    'Cloudflare',
  ])) {
    notes.push('Security verification page detected.');
    return {
      participant: participant.id,
      driverImplemented,
      pageUrl,
      pageTitle,
      status: 'security-verification',
      notes,
    };
  }

  if (bodyContainsAny(combined, [
    "Couldn't sign you in",
    'This browser or app may not be secure',
  ])) {
    notes.push('Provider rejected this browser/profile for login.');
    return {
      participant: participant.id,
      driverImplemented,
      pageUrl,
      pageTitle,
      status: 'unsupported-browser-login',
      notes,
    };
  }

  if (!visibleComposer && (isLoginUrl(pageUrl) || visibleLoginForm)) {
    notes.push('Login page/form detected and no chat composer is visible.');
    return {
      participant: participant.id,
      driverImplemented,
      pageUrl,
      pageTitle,
      status: 'logged-out',
      notes,
    };
  }

  if (!visibleComposer) {
    notes.push('Ask-capable driver exists, but no composer was detected during readiness check.');
    return {
      participant: participant.id,
      driverImplemented,
      pageUrl,
      pageTitle,
      status: 'unknown',
      notes,
    };
  }

  notes.push('Ask-capable driver exists and a composer is visible.');
  return {
    participant: participant.id,
    driverImplemented,
    pageUrl,
    pageTitle,
    status: pageUrl ? 'ready' : 'unknown',
    notes,
  };
}

async function getProviderStatuses(context: BrowserContext) {
  const statuses: ProviderStatus[] = [];

  for (const participant of participants) {
    statuses.push(await detectProviderStatus(context, participant));
  }

  return statuses;
}

function jsonResponse(response: http.ServerResponse, statusCode: number, payload: unknown) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(payload, null, 2));
}

function textResponse(response: http.ServerResponse, statusCode: number, text: string) {
  response.writeHead(statusCode, {
    'content-type': 'text/plain; charset=utf-8',
  });
  response.end(text);
}

async function readJsonBody(request: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const body = Buffer.concat(chunks).toString('utf8').trim();

  if (!body) {
    return {};
  }

  return JSON.parse(body);
}

async function launchPersistentBrowser(browserChannel: BrowserChannel, userDataDir: string): Promise<BrowserSession> {
  console.log(`Using browser channel: ${browserChannel}`);

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: null,
    ...(browserChannel === 'chromium' ? {} : { channel: browserChannel }),
  });

  return {
    context,
    mode: 'persistent-profile',
    close: () => context.close(),
  };
}

async function connectExistingBrowserOverCdp(connectCdpUrl: string): Promise<BrowserSession> {
  console.log(`Connecting to existing browser over CDP: ${connectCdpUrl}`);
  const browser: Browser = await chromium.connectOverCDP(connectCdpUrl);
  const context = browser.contexts()[0] ?? await browser.newContext();
  console.log('Browser connected via CDP');

  return {
    context,
    mode: 'cdp',
    close: async () => {
      void browser;
      // CDP mode attaches to a user-managed browser; do not close it on runner shutdown.
    },
  };
}

async function createBrowserSession(options: RunnerServerOptions): Promise<BrowserSession> {
  if (options.connectCdpUrl) {
    return connectExistingBrowserOverCdp(options.connectCdpUrl);
  }

  return launchPersistentBrowser(options.browserChannel, options.userDataDir);
}

function isBlankStartupUrl(pageUrl: string) {
  return pageUrl === 'about:blank' ||
    pageUrl.startsWith('chrome://newtab') ||
    pageUrl.startsWith('chrome://new-tab-page') ||
    pageUrl.startsWith('edge://newtab') ||
    pageUrl.startsWith('edge://new-tab-page');
}

async function closeBlankStartupTabs(context: BrowserContext, participantPages: Page[]) {
  const participantPageSet = new Set(participantPages);

  for (const page of context.pages()) {
    if (participantPageSet.has(page) || page.isClosed()) {
      continue;
    }

    const pageUrl = page.url();
    const title = await page.title().catch(() => '');
    const blankByUrl = isBlankStartupUrl(pageUrl);
    const blankByTitle = title.trim() === 'New Tab' && pageUrl.startsWith('chrome://');

    if (!blankByUrl && !blankByTitle) {
      continue;
    }

    await page.close().catch(() => undefined);
    console.log(`Closed blank startup tab: ${title || '(untitled)'} ${pageUrl}`);
  }
}

function findParticipantByName(name: string) {
  const normalized = name.toLowerCase();

  return participants.find((participant) => (
    participant.id === normalized ||
    participant.name.toLowerCase() === normalized
  ));
}

async function askParticipantResponse(
  context: BrowserContext,
  participantName: string,
  prompt: string,
  requestId?: string,
  signal?: AbortSignal,
  options: { debugClick?: boolean } = {},
): Promise<ParticipantRunResponse> {
  throwIfAborted(signal, requestId);
  const driver = getDriver(participantName);

  if (!driver) {
    return createErrorResponse(participantName, prompt, 'failed', `Unknown driver "${participantName}".`);
  }

  if (!driver.pastePrompt || !driver.submitPrompt || !driver.waitForCompletion) {
    return createErrorResponse(
      driver.name.toLowerCase(),
      prompt,
      'failed',
      `Driver "${driver.name}" does not support ask mode yet.`,
      'driver-not-implemented',
    );
  }

  const activeDriver = driver;
  const pastePrompt = (page: Page, text: string) => driver.pastePrompt!.call(activeDriver, page, text);
  const submitPrompt = (page: Page) => driver.submitPrompt!.call(activeDriver, page, options);
  const waitForCompletion = (page: Page) => driver.waitForCompletion!.call(activeDriver, page);
  const participant = participants.find((candidate) => activeDriver.matchParticipant(candidate));

  if (!participant) {
    return createErrorResponse(
      activeDriver.name.toLowerCase(),
      prompt,
      'failed',
      `No participant matches driver "${activeDriver.name}".`,
    );
  }

  const result = await runCancellableStep(ensureParticipantPage(context, participant), signal, requestId);
  logAskStep(requestId, `driver found: ${activeDriver.name}`);
  logAskStep(requestId, `${result.status === 'reused' ? 'Reusing' : 'Opening'} ${result.participant.name}...`);
  logAskStep(requestId, `participant: ${result.participant.id}`);
  const startedAt = Date.now();

  async function extractPartialResponse() {
    const elapsedSeconds = (Date.now() - startedAt) / 1000;

    if (activeDriver.extractParticipantResponse) {
      return activeDriver.extractParticipantResponse(result.page, {
        question: prompt,
        elapsedSeconds,
      });
    }

    const response = await activeDriver.extractResponse(result.page);

    return {
      participant: activeDriver.name.toLowerCase(),
      question: prompt,
      answer: response,
      citations: [],
      elapsedSeconds,
      rawText: response,
      cleanedText: response,
    };
  }

  try {
    const securityStatus = await runCancellableStep(
      waitForManualSecurityVerification(
        result.page,
        result.participant.name,
        securityAttemptLimit(activeDriver.name),
      ),
      signal,
      requestId,
    );

    if (securityStatus === 'blocked') {
      throw new Error(`${result.participant.name} is blocked by security verification.`);
    }

    logAskStep(requestId, 'step: waitForReady');
    await runCancellableStep(activeDriver.waitForReady(result.page), signal, requestId);
    throwIfAborted(signal, requestId);
    logAskStep(requestId, 'step: pastePrompt');
    await runCancellableStep(pastePrompt(result.page, prompt), signal, requestId);
    throwIfAborted(signal, requestId);
    logAskStep(requestId, 'step: submitPrompt');
    await runCancellableStep(submitPrompt(result.page), signal, requestId);
    throwIfAborted(signal, requestId);
    logAskStep(requestId, 'step: waitForCompletion');
    await runCancellableStep(waitForCompletion(result.page), signal, requestId);
    throwIfAborted(signal, requestId);
    logAskStep(requestId, 'step: extractResponse');

    const normalizedResponse = await runCancellableStep(extractPartialResponse(), signal, requestId);
    logAskStep(requestId, 'completed');
    return normalizedResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith('reka-debug-click-complete')) {
      const debugMessage = 'Reka debug-click completed; inspect reka-after-coordinate-click.png';
      logAskStep(requestId, 'completed: debug-click');

      return {
        participant: activeDriver.name.toLowerCase(),
        question: prompt,
        answer: debugMessage,
        citations: [],
        elapsedSeconds: (Date.now() - startedAt) / 1000,
        rawText: message,
        cleanedText: debugMessage,
      };
    }

    const artifacts = await saveAskFailureArtifacts(result.page, result.participant.id).catch(() => undefined);
    let partial: ParticipantResponse | undefined;
    let extractionError = '';
    const cancelled = isCancellationError(error);

    if (!cancelled) {
      try {
        logAskStep(requestId, 'step: extractResponse');
        partial = await extractPartialResponse();
      } catch (partialError) {
        extractionError = partialError instanceof Error ? partialError.message : String(partialError);
      }
    }

    const artifactMessage = artifacts
      ? [
        `Ask failure HTML: ${artifacts.htmlPath}`,
        `Ask failure screenshot: ${artifacts.screenshotPath}`,
      ].join('\n')
      : '';
    const fullMessage = [
      message,
      artifactMessage,
      extractionError ? `Partial extraction failed: ${extractionError}` : '',
    ].filter(Boolean).join('\n');

    logAskStep(requestId, `failed: ${message}`);

    return createErrorResponse(
      activeDriver.name.toLowerCase(),
      prompt,
      'failed',
      fullMessage,
      cancelled ? 'cancelled' : message,
      partial,
    );
  }
}

async function askParticipant(
  context: BrowserContext,
  participantName: string,
  prompt: string,
  requestId?: string,
  signal?: AbortSignal,
  options: { debugClick?: boolean } = {},
): Promise<AskResponse> {
  const normalizedResponse = await askParticipantResponse(context, participantName, prompt, requestId, signal, options);

  return {
    participant: normalizedResponse.participant,
    response: normalizedResponse.answer,
    normalizedResponse,
  };
}

async function extractParticipantResponse(
  context: BrowserContext,
  participantName: string,
  question = '',
) {
  const driver = getDriver(participantName);

  if (!driver) {
    throw new Error(`Unknown driver "${participantName}".`);
  }

  const participant = participants.find((candidate) => driver.matchParticipant(candidate));

  if (!participant) {
    throw new Error(`No participant matches driver "${driver.name}".`);
  }

  const result = await ensureParticipantPage(context, participant);
  console.log(`${result.status === 'reused' ? 'Reusing' : 'Opening'} ${result.participant.name}...`);

  if (driver.extractParticipantResponse) {
    return driver.extractParticipantResponse(result.page, {
      question,
      elapsedSeconds: 0,
    });
  }

  const response = await driver.extractResponse(result.page);

  return {
    participant: driver.name.toLowerCase(),
    question,
    answer: response,
    citations: [],
    elapsedSeconds: 0,
    rawText: response,
    cleanedText: response,
  };
}

function buildHandoffPrompt(sourceResponse: ParticipantResponse) {
  const template = getPromptTemplate('critique-factual-accuracy');

  if (!template) {
    throw new Error('Missing prompt template: critique-factual-accuracy');
  }

  return renderPromptTemplate(template, sourceResponse);
}

function canAskParticipant(participantName: string) {
  const driver = getDriver(participantName);
  return Boolean(driver?.pastePrompt && driver.submitPrompt && driver.waitForCompletion);
}

function capPromptContribution(text: string) {
  const maxLength = 4000;

  if (text.length <= maxLength) {
    return text;
  }

  const notice = '\n[Participant contribution truncated by Maestriss]';
  const availableTextLength = Math.max(0, maxLength - notice.length);
  return `${text.slice(0, availableTextLength).trimEnd()}${notice}`;
}

function buildFinalPrompt(originalPrompt: string, responses: ParticipantRunResponse[]) {
  return [
    'Original question:',
    originalPrompt,
    '',
    'You are the final participant in a Maestriss reasoning pipeline.',
    'Review all previous normalized participant responses, account for failures/skips, and produce a concise final synthesis.',
    '',
    ...responses.flatMap((response, index) => {
      const status = 'status' in response ? response.status : 'completed';
      const error = 'error' in response ? response.error : '';
      const content = capPromptContribution(response.cleanedText || response.answer || '[No answer returned]');

      return [
        `Participant ${index + 1}: ${response.participant}`,
        `Status: ${status}`,
        ...(error ? [`Error: ${error}`] : []),
        'Cleaned answer:',
        content,
        '',
      ];
    }),
    'Final task:',
    'Produce the best final answer, noting important disagreements or missing evidence when relevant.',
  ].join('\n');
}

async function runRandomWorkflow(
  context: BrowserContext,
  originalPrompt: string,
): Promise<RandomRunResponse> {
  const providerStatuses = await getProviderStatuses(context);
  const statusByParticipant = new Map(providerStatuses.map((status) => [status.participant, status]));
  const candidateMiddleParticipants = [
    'gemini',
    'perplexity',
    'grok',
    'deepseek',
    'copilot',
    'reka',
  ];
  const readyMiddleParticipants = candidateMiddleParticipants.filter((participant) => (
    statusByParticipant.get(participant)?.status === 'ready'
  ));
  const middleParticipants = shuffleParticipants(readyMiddleParticipants);
  const googleReady = statusByParticipant.get('google')?.status === 'ready';
  const chatgptReady = statusByParticipant.get('chatgpt')?.status === 'ready';
  const excludedProviders = providerStatuses.filter((status) => (
    (candidateMiddleParticipants.includes(status.participant) ||
      status.participant === 'google' ||
      status.participant === 'chatgpt') &&
    status.status !== 'ready'
  ));
  const order = [
    ...(googleReady ? ['google'] : []),
    ...middleParticipants,
    ...(chatgptReady ? ['chatgpt'] : []),
  ];
  const responses: ParticipantRunResponse[] = [];

  console.log(`Random workflow order: ${order.join(' -> ')}`);
  excludedProviders.forEach((status) => {
    console.log(`Excluded: ${statusDisplayName(status.participant)} - ${status.status}`);
  });

  let previousResponse: ParticipantRunResponse;
  let latestCompletedResponse: ParticipantResponse | undefined;

  if (googleReady) {
    console.log('Running: Google');

    try {
      previousResponse = await askParticipantResponse(context, 'google', originalPrompt);
      if (!('status' in previousResponse)) {
        latestCompletedResponse = previousResponse;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`Failed: Google - ${message}`);
      previousResponse = createErrorResponse('google', originalPrompt, 'failed', message);
    }

    responses.push(previousResponse);
  } else {
    const googleStatus = statusByParticipant.get('google');
    responses.push(createErrorResponse(
      'google',
      originalPrompt,
      'skipped',
      googleStatus?.status ?? 'unknown',
      googleStatus?.notes.join(' ') || 'Google is not ready.',
    ));
  }

  for (const participant of middleParticipants) {
    const displayName = statusDisplayName(participant);

    if (!canAskParticipant(participant)) {
      console.log(`Failed: ${displayName} - driver-not-implemented`);
      const skipped = createErrorResponse(
        participant,
        originalPrompt,
        'skipped',
        'driver-not-implemented',
        'Participant driver does not support ask mode yet.',
      );
      responses.push(skipped);
      previousResponse = skipped;
      continue;
    }

    console.log(`Running: ${displayName}`);

    if (!latestCompletedResponse) {
      console.log(`Failed: ${displayName} - no-completed-response-available`);
      const skipped = createErrorResponse(
        participant,
        originalPrompt,
        'skipped',
        'no-completed-response-available',
        'No completed participant response is available as prompt input.',
      );
      responses.push(skipped);
      continue;
    }

    try {
      const handoffPrompt = buildHandoffPrompt(latestCompletedResponse);
      previousResponse = await askParticipantResponse(context, participant, handoffPrompt);
      responses.push(previousResponse);
      if (!('status' in previousResponse)) {
        latestCompletedResponse = previousResponse;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`Failed: ${displayName} - ${message}`);
      const failed = createErrorResponse(participant, originalPrompt, 'failed', message);
      responses.push(failed);
      previousResponse = failed;
    }
  }

  let finalResponse: ParticipantRunResponse;

  if (chatgptReady) {
    console.log('Running: ChatGPT final');
    const finalPrompt = buildFinalPrompt(originalPrompt, responses);

    try {
      finalResponse = await askParticipantResponse(context, 'chatgpt', finalPrompt);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`Failed: ChatGPT final - ${message}`);
      finalResponse = createErrorResponse('chatgpt', finalPrompt, 'failed', message);
    }
  } else {
    const chatgptStatus = statusByParticipant.get('chatgpt');
    finalResponse = createErrorResponse(
      'chatgpt',
      originalPrompt,
      'skipped',
      chatgptStatus?.status ?? 'unknown',
      chatgptStatus?.notes.join(' ') || 'ChatGPT is not ready.',
    );
  }

  return {
    originalPrompt,
    order,
    excludedProviders,
    responses,
    finalResponse,
  };
}

async function chainParticipants(
  context: BrowserContext,
  from: string,
  to: string,
  prompt?: string,
): Promise<ChainResponse> {
  if (from.toLowerCase() !== 'google' || to.toLowerCase() !== 'chatgpt') {
    throw new Error('Proof-of-concept chain only supports google -> chatgpt.');
  }

  const source = prompt
    ? await askParticipantResponse(context, from, prompt)
    : await extractParticipantResponse(context, from);
  const handoffPrompt = buildHandoffPrompt(source);
  const target = await askParticipantResponse(context, to, handoffPrompt);

  return {
    from: source.participant,
    to: target.participant,
    sourceResponse: source.answer,
    targetResponse: target.answer,
    sourceNormalizedResponse: source,
    targetNormalizedResponse: target,
    ...(prompt ? { sourcePrompt: prompt } : {}),
  };
}

async function inspectParticipant(
  context: BrowserContext,
  participantName: string,
  runnerRoot: string,
): Promise<InspectResponse> {
  const participant = findParticipantByName(participantName);

  if (!participant) {
    throw new Error(`Unknown participant "${participantName}".`);
  }

  const result = await ensureParticipantPage(context, participant);
  console.log(`${result.status === 'reused' ? 'Reusing' : 'Opening'} ${result.participant.name}...`);

  const securityStatus = await waitForManualSecurityVerification(
    result.page,
    result.participant.name,
    securityAttemptLimit(result.participant.name),
  );

  if (securityStatus === 'blocked') {
    throw new Error(`${result.participant.name} is blocked by security verification.`);
  }

  return {
    participant: result.participant.name,
    inspection: await inspectParticipantPage(result.page, participant, runnerRoot),
  };
}

export async function startRunnerServer(options: RunnerServerOptions) {
  assertAskCapableDriversResolve();
  const browserSession = await createBrowserSession(options);
  const { context } = browserSession;
  const opened = await openParticipants(context, participants);
  await closeBlankStartupTabs(context, opened.map((result) => result.page));
  const activeAskRequests = new Map<string, ActiveAskRequest>();
  let queue = Promise.resolve();

  const enqueue = <T>(work: () => Promise<T>) => {
    const next = queue.then(work, work);
    queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  };

  const server = http.createServer((request, response) => {
    const immediateUrl = new URL(request.url ?? '/', runnerBaseUrl);

    if (request.method === 'GET' && immediateUrl.pathname === '/health') {
      void (async () => {
        try {
          const matchedPages = await listParticipantPages(context, participants);
          const health: HealthResponse = {
            browserMode: browserSession.mode,
            browserChannel: options.browserChannel,
            connected: true,
            participantCount: matchedPages.length,
            activeRequestIds: Array.from(activeAskRequests.values()).map((activeRequest) => (
              `${activeRequest.requestId}:${activeRequest.participant}`
            )),
          };
          jsonResponse(response, 200, health);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          jsonResponse(response, 500, { error: message });
        }
      })();
      return;
    }

    if (request.method === 'POST' && immediateUrl.pathname === '/cancel-all') {
      const cancelled = Array.from(activeAskRequests.values()).map((activeRequest) => {
        activeRequest.controller.abort();
        logAskStep(activeRequest.requestId, 'cancelled by /cancel-all');
        return {
          requestId: activeRequest.requestId,
          participant: activeRequest.participant,
        };
      });

      jsonResponse(response, 200, {
        cancelled,
      });
      return;
    }

    void enqueue(async () => {
      const url = new URL(request.url ?? '/', runnerBaseUrl);

      try {
        if (request.method === 'GET' && url.pathname === '/health') {
          const matchedPages = await listParticipantPages(context, participants);
          const health: HealthResponse = {
            browserMode: browserSession.mode,
            browserChannel: options.browserChannel,
            connected: true,
            participantCount: matchedPages.length,
            activeRequestIds: Array.from(activeAskRequests.values()).map((activeRequest) => (
              `${activeRequest.requestId}:${activeRequest.participant}`
            )),
          };
          jsonResponse(response, 200, health);
          return;
        }

        if (request.method === 'POST' && url.pathname === '/cancel-all') {
          const cancelled = Array.from(activeAskRequests.values()).map((activeRequest) => {
            activeRequest.controller.abort();
            logAskStep(activeRequest.requestId, 'cancelled by /cancel-all');
            return {
              requestId: activeRequest.requestId,
              participant: activeRequest.participant,
            };
          });

          jsonResponse(response, 200, {
            cancelled,
          });
          return;
        }

        if (request.method === 'GET' && url.pathname === '/providers/status') {
          const statuses = await getProviderStatuses(context);
          jsonResponse(response, 200, { providers: statuses });
          return;
        }

        if (request.method === 'POST' && url.pathname === '/ask') {
          const body = await readJsonBody(request);

          if (!isJsonRecord(body) || typeof body.participant !== 'string' || typeof body.prompt !== 'string') {
            jsonResponse(response, 400, {
              error: 'Expected JSON body with participant and prompt strings.',
            });
            return;
          }

          const participantName = body.participant;
          const participantKey = participantName.toLowerCase();
          const prompt = body.prompt;
          const debugClick = body.debugClick === true;
          const activeRequest = activeAskRequests.get(participantKey);

          if (activeRequest) {
            const normalizedResponse = createErrorResponse(
              participantKey,
              prompt,
              'failed',
              `Participant "${participantName}" is already running request ${activeRequest.requestId}.`,
              'participant-busy',
            );

            jsonResponse(response, 200, {
              participant: normalizedResponse.participant,
              response: normalizedResponse.answer,
              normalizedResponse,
            });
            return;
          }

          const requestId = nextAskRequestId();
          const controller = new AbortController();
          activeAskRequests.set(participantKey, {
            requestId,
            participant: participantKey,
            controller,
            startedAt: Date.now(),
          });
          logAskStep(requestId, `participant: ${participantName}`);
          const askTask = askParticipant(context, participantName, prompt, requestId, controller.signal, { debugClick })
            .finally(() => {
              const currentRequest = activeAskRequests.get(participantKey);

              if (currentRequest?.requestId === requestId) {
                activeAskRequests.delete(participantKey);
              }
            });

          askTask.catch((error: unknown) => {
            const message = error instanceof Error ? error.message : String(error);
            logAskStep(requestId, `failed after HTTP timeout: ${message}`);
          });

          let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
          const timeoutTask = new Promise<AskResponse>((resolve) => {
            timeoutHandle = setTimeout(() => {
              const elapsedSeconds = askTimeoutMs(participantName) / 1000;
              controller.abort();
              const normalizedResponse = createErrorResponse(
                participantName.toLowerCase(),
                prompt,
                'failed',
                `Ask request timed out after ${elapsedSeconds.toFixed(0)} seconds.`,
                'http-timeout',
                { elapsedSeconds },
              );

              logAskStep(requestId, 'failed: http-timeout');

              return {
                participant: normalizedResponse.participant,
                response: normalizedResponse.answer,
                normalizedResponse,
              };
            }, askTimeoutMs(participantName));
          });
          const result = await Promise.race([
            askTask,
            timeoutTask,
          ]).finally(() => {
            if (timeoutHandle) {
              clearTimeout(timeoutHandle);
            }
          });
          jsonResponse(response, 200, result);
          return;
        }

        if (request.method === 'POST' && url.pathname === '/chain') {
          const body = await readJsonBody(request);

          if (!isJsonRecord(body) || typeof body.from !== 'string' || typeof body.to !== 'string') {
            jsonResponse(response, 400, {
              error: 'Expected JSON body with from and to strings.',
            });
            return;
          }

          const prompt = typeof body.prompt === 'string' ? body.prompt : undefined;

          if ('prompt' in body && typeof body.prompt !== 'undefined' && !prompt) {
            jsonResponse(response, 400, {
              error: 'Expected prompt to be a string when provided.',
            });
            return;
          }

          const result = await chainParticipants(context, body.from, body.to, prompt);
          jsonResponse(response, 200, result);
          return;
        }

        if (request.method === 'POST' && url.pathname === '/inspect') {
          const body = await readJsonBody(request);

          if (!isJsonRecord(body) || typeof body.participant !== 'string') {
            jsonResponse(response, 400, {
              error: 'Expected JSON body with participant string.',
            });
            return;
          }

          const result = await inspectParticipant(context, body.participant, options.runnerRoot);
          jsonResponse(response, 200, result);
          return;
        }

        if (request.method === 'POST' && url.pathname === '/run-random') {
          const body = await readJsonBody(request);

          if (!isJsonRecord(body) || typeof body.prompt !== 'string') {
            jsonResponse(response, 400, {
              error: 'Expected JSON body with prompt string.',
            });
            return;
          }

          const result = await runRandomWorkflow(context, body.prompt);
          jsonResponse(response, 200, result);
          return;
        }

        textResponse(response, 404, 'Not found');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        jsonResponse(response, 500, { error: message });
      }
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);

      if (!response.headersSent) {
        jsonResponse(response, 500, { error: message });
      } else {
        response.end();
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(runnerPort, runnerHost, () => {
      server.off('error', reject);
      resolve();
    });
  });

  console.log(`Maestriss Runner listening on ${runnerBaseUrl}`);
  console.log('Browser connected');
  console.log(`Participant tab count: ${opened.length}`);

  const shutdown = async () => {
    console.log('\nStopping Maestriss Runner...');
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    await browserSession.close();
    process.exit(0);
  };

  process.once('SIGINT', () => {
    void shutdown();
  });

  process.once('SIGTERM', () => {
    void shutdown();
  });

  return {
    server,
    context,
    userDataDir: options.connectCdpUrl ? undefined : path.resolve(options.userDataDir),
  };
}
