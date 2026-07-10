import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Locator, Page } from 'playwright';
import type { ParticipantDriver } from './base.js';
import {
  cleanGoogleResponseText,
  googleCandidateRejectionReason,
  isGooglePromptOnly,
  isGoogleShellOrStatusText,
  normalizeGoogleCandidateText,
} from './googleFiltering.js';

const googleAiModeTargetUrl = 'https://www.google.com/ai';
const googleAiModeFallbackUrl = 'https://www.google.com/search?udm=50';
const pendingGooglePrompts = new WeakMap<Page, string>();
const maxGoogleAnswerLength = 12000;
const truncationNotice = '\n\n[Google response truncated by Maestriss]';

type GoogleComposerCandidate = {
  selector: string;
  index: number;
  strategy: string;
  text: string;
  placeholder: string;
  aria: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type GoogleResponseDiagnostics = {
  url: string;
  aiModeDetected: boolean;
  response: string;
  responseLength: number;
  candidateCount: number;
  selectedText: string;
  selectedPreview: string;
  selectedGeometry: string;
  rejectedCandidates: Array<{ reason: string; preview: string; geometry: string }>;
  stopVisible: boolean;
  stopCandidate: string;
  generatingVisible: boolean;
  generatingCandidate: string;
};

function capGoogleAnswer(text: string) {
  if (text.length <= maxGoogleAnswerLength) {
    return text;
  }

  const availableTextLength = Math.max(0, maxGoogleAnswerLength - truncationNotice.length);
  return `${text.slice(0, availableTextLength).trimEnd()}${truncationNotice}`;
}

function preview(text: string, length = 180) {
  return text.replace(/\s+/g, ' ').trim().slice(0, length);
}

function isGoogleHost(hostname: string) {
  const normalized = hostname.toLowerCase();
  return normalized === 'google.com' || normalized === 'www.google.com';
}

function isGoogleUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && isGoogleHost(parsed.hostname);
  } catch {
    return false;
  }
}

function isGoogleHomepage(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' &&
      isGoogleHost(parsed.hostname) &&
      (parsed.pathname === '/' || parsed.pathname === '') &&
      parsed.search === '';
  } catch {
    return false;
  }
}

function isGoogleAiModeUrl(url: string) {
  try {
    const parsed = new URL(url);
    return isGoogleHost(parsed.hostname) &&
      (parsed.pathname === '/ai' || parsed.searchParams.get('udm') === '50');
  } catch {
    return false;
  }
}

function isExecutionContextDestroyed(error: unknown) {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return message.includes('execution context was destroyed') ||
    message.includes('cannot find context with specified id') ||
    message.includes('most likely because of a navigation');
}

async function settleGooglePage(page: Page) {
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => undefined);
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
  await page.waitForTimeout(350);
}

async function saveGoogleDebugArtifact(page: Page, name: string) {
  const debugDir = path.join(process.cwd(), 'debug');
  const htmlPath = path.join(debugDir, `${name}.html`);
  const screenshotPath = path.join(debugDir, `${name}.png`);

  await mkdir(debugDir, { recursive: true });
  await writeFile(htmlPath, await page.content().catch(() => ''), 'utf8');
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);

  return { htmlPath, screenshotPath };
}

async function evaluateGooglePage<T>(page: Page, script: string): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await settleGooglePage(page);
      return await page.evaluate<T>(script);
    } catch (error) {
      lastError = error;

      if (!isExecutionContextDestroyed(error)) {
        throw error;
      }

      await page.waitForTimeout(500);
    }
  }

  throw lastError;
}

function browserGoogleDetectorScript(submittedPrompt: string) {
  return `(() => {
    const submittedPrompt = ${JSON.stringify(submittedPrompt)};
    const exactPromptMatch = submittedPrompt.match(/^\\s*say exactly:\\s*(.+?)\\s*$/i);
    const exactExpectedAnswer = exactPromptMatch ? exactPromptMatch[1].trim() : '';
    const exactChrome = new Set([
      'ai mode', 'all', 'images', 'videos', 'news', 'maps', 'shopping', 'forums', 'more',
      'search', 'google search', 'ai mode history', 'you said', 'searching', 'sources',
      'show more', 'share', 'copy', 'feedback', 'helpful', 'not helpful', 'retry',
      'regenerate', 'ask anything', 'ask a follow-up', 'dive deeper', 'my ad center',
      'transcribing', 'new thread', 'google apps', 'privacy policy', 'terms of service',
      'something went wrong', "your history wasn't deleted"
    ]);
    const includesChrome = [
      'ai can make mistakes, so double-check responses',
      'google may use account and system data',
      'a copy of this chat',
      'your feedback will include',
      'privacy policy',
      'terms of service',
      'my ad center',
      'ai mode history',
      "your history wasn't deleted"
    ];

    function normalize(text) {
      return String(text || '').replace(/\\s+/g, ' ').trim().toLowerCase();
    }

    function stripChromeSuffixes(text) {
      return String(text || '')
        .replace(/\\bAI can make mistakes, so double-check responses.*$/i, '')
        .replace(/\\bGoogle may use account and system data.*$/i, '')
        .replace(/\\bA copy of this chat.*$/i, '')
        .replace(/\\bYour feedback will include.*$/i, '')
        .trim();
    }

    function visible(element) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0';
    }

    function enabled(element) {
      return !element.disabled &&
        element.getAttribute('aria-disabled') !== 'true' &&
        !element.hasAttribute('disabled');
    }

    function geometry(element) {
      const rect = element.getBoundingClientRect();
      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };
    }

    function geometryText(rect) {
      return 'x=' + rect.x + ' y=' + rect.y + ' width=' + rect.width + ' height=' + rect.height;
    }

    function lineClean(text) {
      if (exactExpectedAnswer && normalize(text).includes(normalize(exactExpectedAnswer))) {
        return exactExpectedAnswer;
      }

      const seen = new Set();
      return String(text || '')
        .replace(/\\r/g, '\\n')
        .split('\\n')
        .flatMap((line) => line.split(/\\s{2,}/))
        .map((line) => line.trim())
        .map(stripChromeSuffixes)
        .filter(Boolean)
        .filter((line) => {
          const normalized = normalize(line);
          const normalizedStatus = normalized.replace(/[.。…]+$/g, '');
          return !/^(transcribing|listening|speak now|searching|generating|loading)$/.test(normalizedStatus) &&
            !exactChrome.has(normalized) &&
            !includesChrome.some((phrase) => normalized.includes(phrase));
        })
        .filter((line) => !/^say exactly:/i.test(line))
        .filter((line) => !/^you said\\b/i.test(line))
        .filter((line) => !/^https?:\\/\\//i.test(line))
        .filter((line) => {
          const normalized = normalize(line);
          if (seen.has(normalized)) return false;
          seen.add(normalized);
          return true;
        })
        .join('\\n')
        .replace(/\\n{3,}/g, '\\n\\n')
        .trim();
    }

    function cloneText(element) {
      const clone = element.cloneNode(true);
      clone.querySelectorAll([
        'button',
        '[role="button"]',
        'nav',
        'footer',
        'header',
        'aside',
        'script',
        'style',
        'svg',
        'img',
        '[aria-hidden="true"]',
        '[hidden]',
        'textarea',
        'input',
        '[contenteditable="true"]',
        '[role="textbox"]',
        '[role="searchbox"]',
        '[class*="source" i]',
        '[class*="citation" i]',
        '[class*="carousel" i]',
        '[class*="related" i]',
        '[class*="share" i]',
        '[class*="feedback" i]',
        '[aria-label*="Share" i]',
        '[aria-label*="Feedback" i]',
        '[aria-label*="My Ad Center" i]',
        '[aria-label*="History" i]',
        'g-scrolling-carousel',
        'g-inner-card',
        'a[href*="/search?"]'
      ].join(',')).forEach((child) => child.remove());

      return String(clone.textContent || '').trim();
    }

    function elementDescriptor(element) {
      return [
        element.tagName.toLowerCase(),
        element.getAttribute('role') || '',
        element.getAttribute('aria-label') || '',
        element.className ? String(element.className).slice(0, 80) : ''
      ].filter(Boolean).join(' | ').replace(/\\s+/g, ' ');
    }

    function promptOnly(text) {
      const normalized = normalize(text);
      const prompt = normalize(submittedPrompt);
      if (!prompt) return false;
      return normalized === prompt ||
        normalized === normalize('You said ' + submittedPrompt) ||
        (normalized.includes(prompt) && normalized.length <= prompt.length + 120);
    }

    function rejectionReason(candidate) {
      const cleaned = candidate.cleanedText;
      const normalizedRaw = normalize(candidate.text);
      const exactMatch = exactExpectedAnswer && normalizedRaw.includes(normalize(exactExpectedAnswer));
      const chromeMarkers = [
        'ai mode history', 'you said', 'searching', 'sources', 'share', 'feedback'
      ].filter((marker) => normalizedRaw.includes(marker)).length;

      if (!cleaned) return 'empty-after-clean';
      if (promptOnly(cleaned) || promptOnly(candidate.text)) return 'submitted-prompt-only';
      if (exactMatch) return '';
      if (/^(transcribing|listening|speak now|searching|generating|loading)[.。…]*$/i.test(candidate.text.trim())) return 'known-google-status';
      if (exactChrome.has(normalize(cleaned)) || exactChrome.has(normalize(candidate.text))) return 'known-google-chrome';
      if (includesChrome.some((phrase) => normalize(cleaned).includes(phrase) || normalizedRaw.includes(phrase))) return 'known-google-chrome';
      if (candidate.rect.width > 1100 || candidate.rect.height > window.innerHeight * 0.82) return 'giant-page-container';
      if (chromeMarkers >= 3) return 'giant-ai-mode-shell';
      if (candidate.rect.x < 80 && candidate.rect.width <= 140) return 'navigation-container';
      if (candidate.element.closest('nav, footer, header, aside')) return 'navigation-or-page-chrome';
      if (candidate.element.closest('button, [role="button"]')) return 'button-or-toolbar';
      if (candidate.element.closest('textarea, input, [contenteditable="true"], [role="textbox"], [role="searchbox"]')) return 'composer';
      if (candidate.text.length > 2000 && chromeMarkers > 0) return 'duplicated-parent-container';
      return '';
    }

    const aiModeDetected = /\\/ai(?:$|[?#/])/.test(location.href) ||
      new URL(location.href).searchParams.get('udm') === '50' ||
      /\\bAI Mode\\b/i.test(String(document.body?.innerText || ''));

    const selectors = [
      '[data-attrid*="AI"]',
      '[aria-label*="AI Mode" i]',
      '[data-md]',
      '[class*="ai-overview" i]',
      '[class*="ai_mode" i]',
      '[class*="aimode" i]',
      '[class*="answer" i]',
      '[class*="response" i]',
      'article',
      'main [role="article"]',
      'main [data-md]',
      'main div[dir="ltr"]',
      'main p',
      'main div',
      '[role="main"] div[dir="ltr"]',
      '[role="main"] p',
      '[role="main"] div',
      'body div[dir="ltr"]',
      'body p',
      'body span',
      'body div'
    ];

    const seen = new Set();
    const elements = [];
    for (const selector of selectors) {
      for (const element of Array.from(document.querySelectorAll(selector))) {
        if (seen.has(element)) continue;
        seen.add(element);
        if (!visible(element)) continue;
        elements.push({ element, selector });
      }
    }

    const candidates = elements.map(({ element, selector }) => {
      const rect = geometry(element);
      const text = cloneText(element);
      const cleanedText = lineClean(text);
      return {
        element,
        selector,
        text,
        cleanedText,
        rect,
        descriptor: elementDescriptor(element),
        exactMatch: exactExpectedAnswer && normalize(text).includes(normalize(exactExpectedAnswer))
      };
    }).filter((candidate) => candidate.text.trim().length > 0);

    const rejected = [];
    const valid = [];
    for (const candidate of candidates) {
      const reason = rejectionReason(candidate);
      if (reason) {
        if (rejected.length < 16) {
          rejected.push({
            reason,
            preview: candidate.text.replace(/\\s+/g, ' ').trim().slice(0, 180),
            geometry: geometryText(candidate.rect)
          });
        }
      } else {
        valid.push(candidate);
      }
    }

    valid.sort((a, b) => {
      if (a.exactMatch !== b.exactMatch) return a.exactMatch ? -1 : 1;
      const yDelta = b.rect.y - a.rect.y;
      if (Math.abs(yDelta) > 24) return yDelta;
      const areaA = a.rect.width * a.rect.height;
      const areaB = b.rect.width * b.rect.height;
      return areaA - areaB || a.cleanedText.length - b.cleanedText.length;
    });

    const selected = valid[0] || null;

    const stopControls = Array.from(document.querySelectorAll('button, [role="button"], [aria-label]'))
      .filter((element) => visible(element) && enabled(element))
      .map((element) => ({
        text: [
          element.textContent || '',
          element.getAttribute('aria-label') || '',
          element.getAttribute('title') || '',
          element.className ? String(element.className) : ''
        ].join(' ').replace(/\\s+/g, ' ').trim(),
        element
      }))
      .filter((candidate) => /^stop( generating)?$/i.test(candidate.text) || /\\bstop generating\\b/i.test(candidate.text));

    const generatingCandidates = Array.from(document.querySelectorAll([
      '[role="progressbar"]',
      '[aria-busy="true"]',
      '[aria-live]',
      '[class*="loading" i]',
      '[class*="spinner" i]',
      '[class*="progress" i]'
    ].join(',')))
      .filter((element) => visible(element))
      .map((element) => ({
        text: [
          element.textContent || '',
          element.getAttribute('aria-label') || '',
          element.getAttribute('role') || '',
          element.className ? String(element.className) : ''
        ].join(' ').replace(/\\s+/g, ' ').trim(),
        element
      }))
      .filter((candidate) => {
        const normalized = normalize(candidate.text);
        return candidate.element.getAttribute('aria-busy') === 'true' ||
          candidate.element.getAttribute('role') === 'progressbar' ||
          /\\b(searching|generating|loading|thinking)\\b/i.test(normalized);
      });

    return {
      url: location.href,
      aiModeDetected,
      response: selected ? selected.cleanedText : '',
      responseLength: selected ? selected.cleanedText.length : 0,
      candidateCount: candidates.length,
      selectedText: selected ? selected.cleanedText : '',
      selectedPreview: selected ? selected.cleanedText.replace(/\\s+/g, ' ').trim().slice(0, 180) : '',
      selectedGeometry: selected ? geometryText(selected.rect) + ' selector=' + selected.selector + ' descriptor=' + selected.descriptor : '',
      rejectedCandidates: rejected,
      stopVisible: stopControls.length > 0,
      stopCandidate: stopControls[0] ? stopControls[0].text.slice(0, 180) : 'none',
      generatingVisible: generatingCandidates.length > 0,
      generatingCandidate: generatingCandidates[0] ? generatingCandidates[0].text.slice(0, 180) : 'none'
    };
  })()`;
}

async function getGoogleResponseDiagnostics(page: Page, submittedPrompt = '') {
  return evaluateGooglePage<GoogleResponseDiagnostics>(page, browserGoogleDetectorScript(submittedPrompt));
}

async function detectGoogleAiMode(page: Page) {
  if (isGoogleAiModeUrl(page.url())) {
    return true;
  }

  return evaluateGooglePage<boolean>(page, `(() => {
    function visible(element) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0';
    }

    const bodyText = String(document.body?.innerText || '');
    const aiModeTextVisible = /\\bAI Mode\\b/i.test(bodyText);
    const aiModeShell = Array.from(document.querySelectorAll([
      'textarea',
      'input[name="q"]',
      '[contenteditable="true"]',
      '[role="textbox"]',
      '[role="searchbox"]',
      '[aria-label*="AI Mode" i]',
      '[data-attrid*="AI"]',
      '[class*="ai-mode" i]',
      '[class*="aimode" i]'
    ].join(','))).some((element) => visible(element));

    return aiModeTextVisible && aiModeShell;
  })()`).catch(() => false);
}

async function ensureAiMode(page: Page) {
  const currentUrl = page.url();

  if (!isGoogleUrl(currentUrl)) {
    throw new Error(`Google ask refused non-Google page: ${currentUrl}`);
  }

  console.log(`Google target URL: ${googleAiModeTargetUrl}`);

  if (!isGoogleAiModeUrl(currentUrl) && !await detectGoogleAiMode(page)) {
    await page.goto(googleAiModeTargetUrl, { waitUntil: 'domcontentloaded' });
    await settleGooglePage(page);
  }

  let detected = await detectGoogleAiMode(page);
  console.log(`Google AI Mode detected: ${detected ? 'yes' : 'no'}`);

  if (detected) {
    return;
  }

  console.log('Google AI Mode fallback URL used');
  await page.goto(googleAiModeFallbackUrl, { waitUntil: 'domcontentloaded' });
  await settleGooglePage(page);

  detected = await detectGoogleAiMode(page);
  console.log(`Google AI Mode detected: ${detected ? 'yes' : 'no'}`);

  if (detected) {
    return;
  }

  console.log('Google AI Mode unavailable');
  const artifacts = await saveGoogleDebugArtifact(page, 'google-ai-mode-unavailable').catch(() => undefined);
  const artifactMessage = artifacts
    ? `\nSaved diagnostics:\n${artifacts.htmlPath}\n${artifacts.screenshotPath}`
    : '';
  throw new Error(`google-ai-mode-unavailable${artifactMessage}`);
}

async function assertStillInAiMode(page: Page) {
  if (isGoogleAiModeUrl(page.url()) || await detectGoogleAiMode(page)) {
    return;
  }

  console.log('Google AI Mode unavailable');
  const artifacts = await saveGoogleDebugArtifact(page, 'google-ai-mode-unavailable').catch(() => undefined);
  const artifactMessage = artifacts
    ? `\nSaved diagnostics:\n${artifacts.htmlPath}\n${artifacts.screenshotPath}`
    : '';
  throw new Error(`google-ai-mode-unavailable${artifactMessage}`);
}

async function getEditableCandidateCount(page: Page) {
  return evaluateGooglePage<number>(page, `(() => {
    function visible(element) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0';
    }

    return Array.from(document.querySelectorAll('textarea, input, [contenteditable="true"], [role="textbox"], [role="searchbox"]'))
      .filter(visible).length;
  })()`).catch(() => 0);
}

async function findGoogleComposer(page: Page): Promise<{ locator: Locator; candidate: GoogleComposerCandidate }> {
  const candidates = await evaluateGooglePage<GoogleComposerCandidate[]>(page, `(() => {
    const selectors = [
      { selector: 'textarea[placeholder*="Ask anything" i]', strategy: 'textarea-placeholder-ask-anything' },
      { selector: 'textarea[placeholder*="Ask a follow-up" i]', strategy: 'textarea-placeholder-follow-up' },
      { selector: 'textarea[placeholder*="Follow up" i]', strategy: 'textarea-placeholder-follow-up' },
      { selector: 'textarea[placeholder*="Search" i]', strategy: 'textarea-placeholder-search' },
      { selector: 'textarea[aria-label*="Ask" i]', strategy: 'textarea-aria-ask' },
      { selector: 'textarea[aria-label*="Search" i]', strategy: 'textarea-aria-search' },
      { selector: 'textarea', strategy: 'textarea' },
      { selector: '[contenteditable="true"][role="textbox"]', strategy: 'contenteditable-role-textbox' },
      { selector: '[contenteditable="true"]', strategy: 'contenteditable' },
      { selector: '[role="textbox"]', strategy: 'role-textbox' },
      { selector: '[role="searchbox"]', strategy: 'role-searchbox' },
      { selector: 'input[name="q"]', strategy: 'input-name-q' }
    ];

    function visible(element) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0';
    }

    function editable(element) {
      return !element.disabled &&
        !element.readOnly &&
        element.getAttribute('aria-disabled') !== 'true' &&
        !element.hasAttribute('disabled');
    }

    const results = [];
    for (const entry of selectors) {
      const elements = Array.from(document.querySelectorAll(entry.selector));
      elements.forEach((element, index) => {
        if (!visible(element) || !editable(element)) return;
        if (element.closest('nav, footer, header, aside')) return;
        const rect = element.getBoundingClientRect();
        const text = String(element.value || element.textContent || '').trim();
        const placeholder = element.getAttribute('placeholder') || '';
        const aria = element.getAttribute('aria-label') || '';
        const combined = [text, placeholder, aria].join(' ');
        const preferred = /ask anything|ask a follow-up|follow up|search/i.test(combined);
        results.push({
          selector: entry.selector,
          index,
          strategy: entry.strategy,
          text,
          placeholder,
          aria,
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          preferred
        });
      });
    }

    results.sort((a, b) => {
      if (a.preferred !== b.preferred) return a.preferred ? -1 : 1;
      return b.y - a.y || b.width - a.width;
    });

    return results.map(({ preferred, ...result }) => result).slice(0, 8);
  })()`);

  for (const candidate of candidates) {
    const locator = page.locator(candidate.selector).nth(candidate.index);

    if (await locator.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log(`Google composer found: ${candidate.selector}`);
      console.log(`Google composer strategy: ${candidate.strategy}`);
      return { locator, candidate };
    }
  }

  const artifacts = await saveGoogleDebugArtifact(page, 'google-composer-not-found').catch(() => undefined);
  const candidateCount = await getEditableCandidateCount(page);
  const title = await page.title().catch(() => '');
  const artifactMessage = artifacts
    ? `\nSaved diagnostics:\n${artifacts.htmlPath}\n${artifacts.screenshotPath}`
    : '';
  throw new Error(
    `Could not find Google AI Mode composer.\nURL: ${page.url()}\nTitle: ${title}\nEditable candidate count: ${candidateCount}${artifactMessage}`,
  );
}

async function readComposerText(locator: Locator) {
  const inputValue = await locator.inputValue({ timeout: 1000 }).catch(() => undefined);

  if (inputValue !== undefined) {
    return inputValue;
  }

  return locator.evaluate((element) => String(element.textContent || '')).catch(() => '');
}

async function fillComposer(locator: Locator, prompt: string) {
  await locator.click();
  await locator.fill(prompt).catch(async () => {
    await locator.click();
    await locator.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await locator.press('Backspace');
    await locator.pressSequentially(prompt, { delay: 2 });
  });
}

async function promptVisibleAsUserMessage(page: Page, prompt: string) {
  const normalizedPrompt = normalizeGoogleCandidateText(prompt);

  return evaluateGooglePage<boolean>(page, `(() => {
    const prompt = ${JSON.stringify(normalizedPrompt)};
    function normalize(text) {
      return String(text || '').replace(/\\s+/g, ' ').trim().toLowerCase();
    }
    function visible(element) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0';
    }

    return Array.from(document.querySelectorAll('main *, [role="main"] *'))
      .filter(visible)
      .some((element) => normalize(element.textContent) === prompt || normalize(element.textContent) === normalize('You said ' + prompt));
  })()`).catch(() => false);
}

async function clickNearbySubmitButton(page: Page, composer: GoogleComposerCandidate) {
  const clicked = await evaluateGooglePage<boolean>(page, `(() => {
    const composer = ${JSON.stringify(composer)};
    function visible(element) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0';
    }
    function enabled(element) {
      return !element.disabled &&
        element.getAttribute('aria-disabled') !== 'true' &&
        !element.hasAttribute('disabled');
    }
    function score(element) {
      const rect = element.getBoundingClientRect();
      const text = [
        element.textContent || '',
        element.getAttribute('aria-label') || '',
        element.getAttribute('title') || '',
        element.className ? String(element.className) : ''
      ].join(' ');
      const labelMatch = /send|submit|search|arrow|go/i.test(text) ? 0 : 1000;
      const dy = Math.abs((rect.y + rect.height / 2) - (composer.y + composer.height / 2));
      const right = rect.x >= composer.x + composer.width - 120 ? 0 : 300;
      return labelMatch + right + dy + Math.abs(rect.x - (composer.x + composer.width));
    }

    const buttons = Array.from(document.querySelectorAll('button, [role="button"]'))
      .filter((element) => visible(element) && enabled(element))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.y >= composer.y - 80 &&
          rect.y <= composer.y + composer.height + 100 &&
          rect.x >= composer.x - 40 &&
          rect.x <= composer.x + composer.width + 180;
      })
      .sort((a, b) => score(a) - score(b));

    if (!buttons[0]) return false;
    buttons[0].click();
    return true;
  })()`).catch(() => false);

  if (clicked) {
    console.log('Google submit strategy: nearby send button');
  }

  return clicked;
}

function logGoogleDiagnostics(prefix: string, diagnostics: GoogleResponseDiagnostics, stableMs: number) {
  console.log(
    `${prefix}: responseLength=${diagnostics.responseLength} stableMs=${stableMs} ` +
    `stopVisible=${diagnostics.stopVisible} generatingVisible=${diagnostics.generatingVisible} ` +
    `candidateCount=${diagnostics.candidateCount} preview=${diagnostics.selectedPreview}`,
  );
  console.log(`Google selected candidate preview: ${diagnostics.selectedGeometry} ${diagnostics.selectedPreview}`);
  diagnostics.rejectedCandidates.slice(0, 3).forEach((candidate) => {
    console.log(`Google rejected candidate reason: ${candidate.reason} ${candidate.geometry} ${candidate.preview}`);
  });
  console.log(`Google stop candidate: ${diagnostics.stopCandidate}`);
  console.log(`Google generating candidate: ${diagnostics.generatingCandidate}`);
}

export const googleDriver: ParticipantDriver = {
  name: 'Google',

  matchParticipant(participant) {
    return isGoogleUrl(participant.url);
  },

  async waitForReady(page: Page) {
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => undefined);
    await ensureAiMode(page);
  },

  async pastePrompt(page: Page, prompt: string) {
    await this.waitForReady(page);
    await assertStillInAiMode(page);

    const { locator } = await findGoogleComposer(page);
    console.log(`Google prompt length: ${prompt.length}`);
    await fillComposer(locator, prompt);

    const pastedText = await readComposerText(locator);
    const textPresent = normalizeGoogleCandidateText(pastedText).includes(normalizeGoogleCandidateText(prompt));
    console.log(`Google text present after paste: ${textPresent ? 'yes' : 'no'}`);

    if (!textPresent) {
      const artifacts = await saveGoogleDebugArtifact(page, 'google-submit-failed').catch(() => undefined);
      const artifactMessage = artifacts
        ? `\nSaved diagnostics:\n${artifacts.htmlPath}\n${artifacts.screenshotPath}`
        : '';
      throw new Error(`google-submit-failed${artifactMessage}`);
    }

    pendingGooglePrompts.set(page, prompt);
    console.log('Google paste verified');
  },

  async submitPrompt(page: Page) {
    const prompt = pendingGooglePrompts.get(page);

    if (!prompt) {
      throw new Error('Google submitPrompt called before pastePrompt.');
    }

    await assertStillInAiMode(page);
    const beforeDiagnostics = await getGoogleResponseDiagnostics(page, prompt).catch(() => undefined);
    const { locator, candidate } = await findGoogleComposer(page);

    if (!await clickNearbySubmitButton(page, candidate)) {
      await locator.press('Enter');
      console.log('Google submit strategy: Enter');
    }

    await page.waitForTimeout(1500);
    await assertStillInAiMode(page);

    let composerText = await readComposerText(locator).catch(() => '');
    let afterDiagnostics = await getGoogleResponseDiagnostics(page, prompt).catch(() => undefined);
    let submitted = normalizeGoogleCandidateText(composerText).length === 0 ||
      await promptVisibleAsUserMessage(page, prompt) ||
      Boolean(afterDiagnostics?.stopVisible || afterDiagnostics?.generatingVisible) ||
      Boolean(beforeDiagnostics && afterDiagnostics && beforeDiagnostics.selectedText !== afterDiagnostics.selectedText);

    if (!submitted) {
      await locator.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');
      console.log('Google submit strategy: Ctrl+Enter fallback');
      await page.waitForTimeout(1500);
      await assertStillInAiMode(page);
      composerText = await readComposerText(locator).catch(() => '');
      afterDiagnostics = await getGoogleResponseDiagnostics(page, prompt).catch(() => undefined);
      submitted = normalizeGoogleCandidateText(composerText).length === 0 ||
        await promptVisibleAsUserMessage(page, prompt) ||
        Boolean(afterDiagnostics?.stopVisible || afterDiagnostics?.generatingVisible) ||
        Boolean(beforeDiagnostics && afterDiagnostics && beforeDiagnostics.selectedText !== afterDiagnostics.selectedText);
    }

    if (!submitted) {
      const artifacts = await saveGoogleDebugArtifact(page, 'google-submit-failed').catch(() => undefined);
      const artifactMessage = artifacts
        ? `\nSaved diagnostics:\n${artifacts.htmlPath}\n${artifacts.screenshotPath}`
        : '';
      throw new Error(`google-submit-failed${artifactMessage}`);
    }

    console.log('Google prompt submitted');
  },

  async waitForCompletion(page: Page) {
    const prompt = pendingGooglePrompts.get(page) ?? '';
    const startedAt = Date.now();
    const hardTimeoutMs = 180000;
    const requiredStableMs = 5000;
    let lastText = '';
    let stableSince = Date.now();
    let lastLogAt = 0;
    let liveDebugSaved = false;

    while (Date.now() - startedAt < hardTimeoutMs) {
      await assertStillInAiMode(page);
      const diagnostics = await getGoogleResponseDiagnostics(page, prompt);
      const currentText = cleanGoogleResponseText(diagnostics.response);

      if (currentText !== lastText) {
        lastText = currentText;
        stableSince = Date.now();
      }

      const stableForMs = Date.now() - stableSince;

      if (Date.now() - lastLogAt >= 5000) {
        logGoogleDiagnostics('Google wait', diagnostics, stableForMs);
        lastLogAt = Date.now();
      }

      if (
        diagnostics.responseLength > 5 &&
        stableForMs >= requiredStableMs &&
        !diagnostics.stopVisible &&
        !diagnostics.generatingVisible
      ) {
        return;
      }

      if (!liveDebugSaved && Date.now() - startedAt >= 10000 && diagnostics.responseLength === 0) {
        await saveGoogleDebugArtifact(page, 'google-live-debug').catch(() => undefined);
        liveDebugSaved = true;
      }

      await page.waitForTimeout(500);
    }

    await saveGoogleDebugArtifact(page, 'google-response-not-found').catch(() => undefined);
    throw new Error('Timed out waiting for Google AI Mode completion.');
  },

  async extractParticipantResponse(page: Page, context) {
    await this.waitForReady(page);
    await assertStillInAiMode(page);

    const currentUrl = page.url();

    if (!isGoogleUrl(currentUrl)) {
      throw new Error(`Google extraction refused non-Google page: ${currentUrl}`);
    }

    if (isGoogleHomepage(currentUrl)) {
      throw new Error('Google is open but no AI Mode response is loaded.');
    }

    const prompt = context.question || pendingGooglePrompts.get(page) || '';
    const diagnostics = await getGoogleResponseDiagnostics(page, prompt);
    logGoogleDiagnostics('Google extract', diagnostics, 0);

    const rawText = diagnostics.selectedText;
    const cleanedText = cleanGoogleResponseText(rawText);
    const finalText = capGoogleAnswer(cleanedText);
    console.log(`Google extraction URL: ${currentUrl}`);
    console.log(`Google raw extracted length: ${rawText.length}`);
    console.log(`Google cleaned extracted length: ${cleanedText.length}`);
    console.log(`Google final capped length: ${finalText.length}`);

    if (
      !diagnostics.aiModeDetected ||
      !finalText ||
      isGoogleShellOrStatusText(finalText) ||
      isGooglePromptOnly(finalText, prompt)
    ) {
      throw new Error('Google is open but no AI Mode response is loaded.');
    }

    return {
      participant: this.name.toLowerCase(),
      question: context.question,
      answer: finalText,
      citations: [],
      elapsedSeconds: context.elapsedSeconds,
      rawText,
      cleanedText: finalText,
      rawHtml: await page.content().catch(() => undefined),
    };
  },

  async extractResponse(page: Page) {
    const response = await this.extractParticipantResponse?.(page, {
      question: pendingGooglePrompts.get(page) ?? '',
      elapsedSeconds: 0,
    });

    return response?.answer ?? '';
  },
};
