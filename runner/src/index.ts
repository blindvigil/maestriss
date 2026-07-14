import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  runnerBaseUrl,
  startRunnerServer,
  type AskResponse,
  type BrowserChannel,
  type ChainResponse,
  type HealthResponse,
  type InspectResponse,
  type ProviderStatus,
  type RandomRunResponse,
} from './server.js';
import {
  defaultBatonSeed,
  runBatonTest,
  type BatonStageResult,
} from './batonTest.js';
import { runCouncil } from './councilExecution.js';
import { createCouncilRunReporter } from './councilCliFormat.js';
import {
  councilDoctrines,
  getCouncilDoctrine,
} from '../../shared/council/index.js';
import { participants } from './participants.js';
import type { ParticipantRunResponse } from './types.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

// The compiled entry point's depth differs between tsx (src/) and the built
// output (dist/runner/src/), so resolve the runner package root by walking
// up to the nearest package.json instead of assuming a fixed depth.
function findRunnerRoot(startDir: string): string {
  let current = startDir;

  for (let depth = 0; depth < 8; depth += 1) {
    if (existsSync(path.join(current, 'package.json'))) {
      return current;
    }

    const parent = path.dirname(current);

    if (parent === current) {
      break;
    }

    current = parent;
  }

  throw new Error(`Could not locate the runner package root from ${startDir}.`);
}

const runnerRoot = findRunnerRoot(currentDir);
const userDataDir = path.join(runnerRoot, '.user-data');

// Canonical Maestriss version owner: root package.json (Reference doc 12,
// Versioning and Release Policy). No fallback version is ever fabricated.
const semVerPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?$/;

function readMaestrissVersion(): string {
  const rootPackagePath = path.resolve(runnerRoot, '..', 'package.json');
  const parsed = JSON.parse(readFileSync(rootPackagePath, 'utf8')) as { version?: unknown };

  if (typeof parsed.version !== 'string' || !semVerPattern.test(parsed.version)) {
    throw new Error(
      `Canonical Maestriss version in ${rootPackagePath} is missing or not valid SemVer: ` +
      `${JSON.stringify(parsed.version)}. Run "npm run verify:version" from the repository root.`,
    );
  }

  return parsed.version;
}

type CliOptions = {
  browserChannel: BrowserChannel;
  connectCdpUrl?: string;
  focusActiveParticipant: boolean;
  verbose: boolean;
  args: string[];
};

function parseCliOptions(args: string[]): CliOptions {
  const parsedArgs: string[] = [];
  let browserChannel: BrowserChannel = 'chromium';
  let connectCdpUrl: string | undefined;
  let focusActiveParticipant = true;
  let verbose = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--channel') {
      const channel = args[index + 1];

      if (channel !== 'chromium' && channel !== 'chrome' && channel !== 'msedge') {
        throw new Error('Invalid browser channel. Use "chromium", "chrome", or "msedge".');
      }

      browserChannel = channel;
      index += 1;
      continue;
    }

    if (arg === '--connect-cdp') {
      const url = args[index + 1];

      if (!url) {
        throw new Error('Missing CDP URL. Usage: npm run dev -- serve --connect-cdp http://127.0.0.1:9222');
      }

      connectCdpUrl = url;
      index += 1;
      continue;
    }

    if (arg === '--verbose') {
      verbose = true;
      continue;
    }

    if (arg === '--focus-tabs') {
      focusActiveParticipant = true;
      continue;
    }

    if (arg === '--no-focus-tabs') {
      focusActiveParticipant = false;
      continue;
    }

    parsedArgs.push(arg);
  }

  return {
    browserChannel,
    connectCdpUrl,
    focusActiveParticipant,
    verbose,
    args: parsedArgs,
  };
}

function printRunnerNotRunning() {
  console.log('Maestriss Runner is not running. Start it with:');
  console.log('npm run dev -- serve');
}

function isConnectionFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('fetch failed') ||
    message.includes('ECONNREFUSED') ||
    message.includes('connect ECONNREFUSED')
  );
}

type JsonEndpoint = '/ask' | '/cancel-all' | '/chain' | '/health' | '/inspect' | '/providers/status' | '/run-random';

async function requestJson<TResponse>(
  pathName: JsonEndpoint,
  init?: RequestInit,
): Promise<TResponse | undefined> {
  try {
    const response = await globalThis.fetch(`${runnerBaseUrl}${pathName}`, init);
    const responseText = await response.text();
    let payload: { error?: string } = {};

    if (responseText) {
      try {
        payload = JSON.parse(responseText) as { error?: string };
      } catch {
        payload = { error: responseText };
      }
    }

    if (!response.ok) {
      throw new Error(`Runner request ${pathName} failed: ${payload.error ?? `HTTP ${response.status}`}`);
    }

    return payload as TResponse;
  } catch (error) {
    if (isConnectionFailure(error)) {
      printRunnerNotRunning();
      return undefined;
    }

    throw error;
  }
}

async function getJson<TResponse>(pathName: JsonEndpoint): Promise<TResponse | undefined> {
  return requestJson<TResponse>(pathName, {
    method: 'GET',
  });
}

async function postJson<TResponse>(
  pathName: JsonEndpoint,
  body: unknown,
): Promise<TResponse | undefined> {
  return requestJson<TResponse>(pathName, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

async function runAskClient(driverName: string, promptParts: string[]) {
  const debugClick = promptParts.includes('--debug-click');
  const prompt = promptParts.filter((part) => part !== '--debug-click').join(' ').trim();

  if (!prompt) {
    throw new Error(`Missing prompt. Usage: npm run dev -- ask ${driverName} "your prompt here"`);
  }

  const result = await postJson<AskResponse>('/ask', {
    participant: driverName,
    prompt,
    debugClick,
  });

  if (!result) {
    return;
  }

  console.log(`\n--- ${result.participant} response ---\n`);
  console.log(result.response || '[No response text detected]');
  console.log('\n--- end response ---\n');
  console.log('Done.');
}

async function runInspectClient(participant: string) {
  const result = await postJson<InspectResponse>('/inspect', {
    participant,
  });

  if (!result) {
    return;
  }

  const { inspection } = result;
  console.log(`Current URL: ${inspection.currentUrl}`);
  console.log(`Page title: ${inspection.title || '(untitled)'}`);
  console.log(`readyState: ${inspection.readyState}`);
  console.table([inspection.counts]);

  console.log('\nVisible button labels:');
  inspection.visibleButtonLabels.forEach((label, index) => {
    console.log(`${index + 1}. ${label}`);
  });

  console.log('\nVisible textarea placeholders:');
  inspection.visibleTextareaPlaceholders.forEach((placeholder, index) => {
    console.log(`${index + 1}. ${placeholder}`);
  });

  console.log('\nVisible textbox placeholders:');
  inspection.visibleTextboxPlaceholders.forEach((placeholder, index) => {
    console.log(`${index + 1}. ${placeholder}`);
  });

  console.log('\nCandidate composer selectors:');
  inspection.candidateComposerSelectors.forEach((selector, index) => {
    console.log(`${index + 1}. ${selector}`);
  });

  console.log('\nCandidate send buttons:');
  inspection.candidateSendButtons.forEach((button, index) => {
    console.log(`${index + 1}. ${button}`);
  });

  console.log('\nCandidate response containers:');
  inspection.candidateResponseContainers.forEach((container, index) => {
    console.log(`${index + 1}. ${container}`);
  });

  console.log('\nVisible stop/generating indicators:');
  inspection.visibleGeneratingIndicators.forEach((indicator, index) => {
    console.log(`${index + 1}. ${indicator}`);
  });

  console.log('\nCandidate composer outerHTML:');
  inspection.candidateOuterHtml.forEach((html, index) => {
    console.log(`\n--- candidate ${index + 1} ---\n${html}`);
  });

  console.log(`\nSaved HTML: ${inspection.htmlPath}`);
  console.log(`Saved screenshot: ${inspection.screenshotPath}`);
}

function printNormalizedResponse(label: string, response: ParticipantRunResponse) {
  console.log(`\n--- ${label} normalized response ---\n`);
  console.log(`participant: ${response.participant}`);
  if ('status' in response) {
    console.log(`status: ${response.status}`);
  }
  console.log(`question: ${response.question || '(not recorded)'}`);
  console.log(`elapsedSeconds: ${response.elapsedSeconds.toFixed(2)}`);
  console.log(`citations: ${response.citations.length}`);
  if ('error' in response) {
    console.log(`error: ${response.error}`);
  }
  console.log('');
  console.log(response.answer || '[No answer text detected]');
}

async function runChainClient(from: string, to: string | undefined, promptParts: string[]) {
  if (!to) {
    throw new Error('Missing chain target. Usage: npm run dev -- chain google chatgpt "optional prompt"');
  }

  const prompt = promptParts.join(' ').trim();
  const result = await postJson<ChainResponse>('/chain', {
    from,
    to,
    ...(prompt ? { prompt } : {}),
  });

  if (!result) {
    return;
  }

  printNormalizedResponse('Google', result.sourceNormalizedResponse);
  printNormalizedResponse('ChatGPT', result.targetNormalizedResponse);
  console.log('\n--- end chain ---\n');
  console.log('Done.');
}

async function runRandomClient(promptParts: string[], verbose: boolean) {
  const prompt = promptParts.join(' ').trim();

  if (!prompt) {
    throw new Error('Missing prompt. Usage: npm run dev -- run-random "original prompt here"');
  }

  const result = await postJson<RandomRunResponse>('/run-random', {
    prompt,
  });

  if (!result) {
    return;
  }

  console.log(`Chosen order: ${result.order.join(' -> ')}`);

  if (result.excludedProviders.length > 0) {
    console.log('\nExcluded participants:');
    result.excludedProviders.forEach((provider) => {
      console.log(`${provider.participant}: ${provider.status}`);

      if (provider.notes.length > 0) {
        console.log(`  ${provider.notes.join(' ')}`);
      }
    });
  }

  for (const response of result.responses) {
    const status = 'status' in response ? response.status : 'completed';
    console.log(`${response.participant}: ${status}`);

    if ('error' in response) {
      console.log(`  ${response.error}`);
    }
  }

  if (result.finalResponse) {
    const finalStatus = 'status' in result.finalResponse ? result.finalResponse.status : 'completed';
    console.log(`chatgpt final: ${finalStatus}`);

    if ('error' in result.finalResponse) {
      console.log(`  ${result.finalResponse.error}`);
    }

    console.log('\n--- final answer ---\n');
    console.log(result.finalResponse.answer || '[No final answer returned]');
  }

  if (verbose) {
    for (const response of result.responses) {
      printNormalizedResponse(response.participant, response);
    }

    if (result.finalResponse) {
      printNormalizedResponse('ChatGPT final', result.finalResponse);
    }
  }

  console.log('\n--- end random workflow ---\n');
  console.log('Done.');
}

function batonDisplayName(participantId: string) {
  const participant = participants.find((candidate) => candidate.id === participantId);
  return participant?.name ?? participantId;
}

function printBatonStage(stage: BatonStageResult) {
  const displayName = batonDisplayName(stage.participant);

  if (stage.outcome === 'fail') {
    console.log(`\nFAIL at stage ${stage.stage}/${stage.stageCount}: ${displayName}`);
    console.log('\nInput:');
    console.log(stage.inputBaton);
    console.log('\nExpected:');
    console.log(stage.expectedOutput);
    console.log('\nActual:');
    console.log(stage.actualOutput ?? '[No answer text detected]');

    if (stage.failureReason) {
      console.log(`\nFailure category: ${stage.failureReason}`);
    }

    if (stage.error) {
      console.log(`Error: ${stage.error}`);
    }

    return;
  }

  console.log(`\n[${stage.stage}/${stage.stageCount}] ${displayName}`);

  if (stage.outcome === 'not-run') {
    console.log('NOT RUN — chain stopped at an earlier stage');
    return;
  }

  if (stage.outcome === 'skipped') {
    console.log(`SKIPPED — provider unavailable before ask (status: ${stage.readinessStatus ?? 'unknown'})`);

    if (stage.readinessNotes?.length) {
      console.log(`  ${stage.readinessNotes.join(' ')}`);
    }

    return;
  }

  console.log(`Input:    ${stage.inputBaton}`);
  console.log(`Expected: ${stage.expectedOutput}`);
  console.log(`Actual:   ${stage.actualOutput}`);
  console.log('PASS');
}

async function runBatonTestClient(args: string[]) {
  let seed = defaultBatonSeed;
  let skipUnavailable = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--seed') {
      const value = args[index + 1];

      if (!value || value.startsWith('--')) {
        throw new Error('Missing seed value. Usage: npm run dev -- baton-test --seed MAESTRISS');
      }

      seed = value;
      index += 1;
      continue;
    }

    if (arg === '--skip-unavailable') {
      skipUnavailable = true;
      continue;
    }

    throw new Error(
      `Unknown baton-test argument "${arg}". Usage: npm run dev -- baton-test [--seed MAESTRISS] [--skip-unavailable]`,
    );
  }

  let readinessSnapshot: Map<string, ProviderStatus> | undefined;

  const getReadiness = async (participantId: string) => {
    if (!readinessSnapshot) {
      const statusResult = await getJson<{ providers: ProviderStatus[] }>('/providers/status');

      if (!statusResult) {
        throw new Error('Runner service is not reachable for provider readiness.');
      }

      readinessSnapshot = new Map(
        statusResult.providers.map((provider) => [provider.participant, provider]),
      );
    }

    return readinessSnapshot.get(participantId);
  };

  const ask = async (participantId: string, prompt: string): Promise<ParticipantRunResponse> => {
    const result = await postJson<AskResponse>('/ask', {
      participant: participantId,
      prompt,
    });

    if (!result) {
      throw new Error('Runner service is not reachable.');
    }

    return result.normalizedResponse ?? {
      participant: participantId,
      question: prompt,
      answer: result.response ?? '',
      citations: [],
      elapsedSeconds: 0,
      rawText: result.response ?? '',
      cleanedText: result.response ?? '',
    };
  };

  console.log('\nMaestriss Sequential Baton Test\n');
  console.log('Seed:');
  console.log(seed);

  if (skipUnavailable) {
    console.log('\nSkip mode enabled: provider readiness is checked once at run start.');
  }

  const result = await runBatonTest({
    ask,
    seed,
    skipUnavailable,
    ...(skipUnavailable ? { getReadiness } : {}),
    onStage: printBatonStage,
  });

  console.log(`\nFINAL RESULT: ${result.finalResult}`);

  if (result.finalResult === 'FAIL') {
    console.log('\nChain stopped. No fabricated baton was forwarded.');
    process.exitCode = 1;
    return;
  }

  console.log('\nFinal baton:');
  console.log(result.finalBaton);

  if (result.finalResult === 'PARTIAL') {
    console.log('\nExpected final baton (skipped tokens omitted):');
    console.log(result.expectedFinalBaton);
  }
}

const councilRunUsage =
  'Usage: npm run dev -- council run --doctrine <doctrine-id> (--prompt "text" | --prompt-file path) [--size N] [--verbose]';

type CouncilRunCliArgs = {
  doctrineId: string;
  request: string;
  size?: number;
};

function parseCouncilRunArgs(args: string[]): CouncilRunCliArgs {
  let doctrineId: string | undefined;
  let promptText: string | undefined;
  let promptFile: string | undefined;
  let size: number | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const value = args[index + 1];

    if (arg === '--doctrine') {
      if (!value || value.startsWith('--')) {
        throw new Error(`Missing doctrine id. ${councilRunUsage}`);
      }
      doctrineId = value;
      index += 1;
      continue;
    }

    if (arg === '--prompt') {
      if (value === undefined) {
        throw new Error(`Missing prompt text. ${councilRunUsage}`);
      }
      promptText = value;
      index += 1;
      continue;
    }

    if (arg === '--prompt-file') {
      if (!value || value.startsWith('--')) {
        throw new Error(`Missing prompt file path. ${councilRunUsage}`);
      }
      promptFile = value;
      index += 1;
      continue;
    }

    if (arg === '--size') {
      const parsed = Number(value);
      if (!value || !Number.isInteger(parsed) || parsed < 1) {
        throw new Error(`--size requires a positive integer. ${councilRunUsage}`);
      }
      size = parsed;
      index += 1;
      continue;
    }

    throw new Error(`Unknown council run argument "${arg}". ${councilRunUsage}`);
  }

  if (!doctrineId) {
    throw new Error(`Missing --doctrine. ${councilRunUsage}`);
  }

  if ((promptText === undefined) === (promptFile === undefined)) {
    throw new Error(`Provide exactly one of --prompt or --prompt-file. ${councilRunUsage}`);
  }

  const request = promptFile !== undefined
    ? readFileSync(path.resolve(promptFile), 'utf8').trim()
    : (promptText ?? '').trim();

  if (!request) {
    throw new Error(
      promptFile !== undefined
        ? `Prompt file "${promptFile}" contains no text.`
        : 'Prompt must be a non-empty string.',
    );
  }

  return { doctrineId, request, ...(size !== undefined ? { size } : {}) };
}

async function runCouncilRunClient(args: string[], verbose: boolean) {
  const cli = parseCouncilRunArgs(args);
  const doctrine = getCouncilDoctrine(cli.doctrineId);

  if (!doctrine) {
    const validIds = councilDoctrines.map((candidate) => candidate.id).join(', ');
    throw new Error(`Unknown doctrine "${cli.doctrineId}". Valid doctrine ids: ${validIds}`);
  }

  const configuration = doctrine.build(cli.size !== undefined ? { size: cli.size } : undefined);
  const reporter = createCouncilRunReporter({
    doctrine,
    configuration,
    requestChars: cli.request.length,
    verbose,
    print: (line) => console.log(line),
  });

  reporter.start();

  const statusResult = await getJson<{ providers: ProviderStatus[] }>('/providers/status');

  if (!statusResult) {
    return;
  }

  const readinessSnapshot = new Map(
    statusResult.providers.map((provider) => [provider.participant, provider]),
  );

  const ask = async (providerId: string, prompt: string): Promise<ParticipantRunResponse> => {
    const result = await postJson<AskResponse>('/ask', {
      participant: providerId,
      prompt,
    });

    if (!result) {
      throw new Error('Runner service is not reachable.');
    }

    return result.normalizedResponse ?? {
      participant: providerId,
      question: prompt,
      answer: result.response ?? '',
      citations: [],
      elapsedSeconds: 0,
      rawText: result.response ?? '',
      cleanedText: result.response ?? '',
    };
  };

  // Elapsed-time heartbeat while an ask is in flight. The reporter prints
  // nothing when no ask is active, so the interval is safe to keep running
  // between seats; it is cleared when the run ends.
  const heartbeat = setInterval(() => reporter.heartbeatTick(), 10_000);

  try {
    const result = await runCouncil({
      configuration,
      request: cli.request,
      ask,
      getReadiness: async (providerId) => readinessSnapshot.get(providerId),
      onSeatBegin: reporter.onSeatBegin,
      onProviderRejected: reporter.onProviderRejected,
      onSeatStart: reporter.onSeatStart,
      onSeatAttempt: reporter.onSeatAttempt,
      onSeatResult: reporter.onSeatResult,
    });

    reporter.finish(result);

    if (result.finalResult === 'FAIL') {
      process.exitCode = 1;
    }
  } finally {
    clearInterval(heartbeat);
  }
}

async function runCheckProvidersClient(verbose: boolean) {
  const result = await getJson<{ providers: ProviderStatus[] }>('/providers/status');

  if (!result) {
    return;
  }

  console.table(
    result.providers.map((provider) => ({
      participant: provider.participant,
      driverImplemented: provider.driverImplemented,
      status: provider.status,
      pageTitle: provider.pageTitle || '(untitled)',
      pageUrl: provider.pageUrl,
    })),
  );

  if (verbose) {
    console.log('\nProvider notes:');
    result.providers.forEach((provider) => {
      console.log(`\n${provider.participant}`);
      console.log(`  status: ${provider.status}`);
      console.log(`  driverImplemented: ${provider.driverImplemented}`);
      console.log(`  pageTitle: ${provider.pageTitle || '(untitled)'}`);
      console.log(`  pageUrl: ${provider.pageUrl}`);
      console.log(`  notes: ${provider.notes.join(' ') || '(none)'}`);
    });
  }
}

async function runHealthClient() {
  const result = await getJson<HealthResponse>('/health');

  if (!result) {
    return;
  }

  console.log(`Browser mode: ${result.browserMode}`);
  console.log(`Browser channel: ${result.browserChannel}`);
  console.log(`Connected: ${result.connected ? 'yes' : 'no'}`);
  console.log(`Focus active participant: ${result.focusActiveParticipant ? 'yes' : 'no'}`);
  console.log(`Participant count: ${result.participantCount}`);
  console.log(`Active requests: ${result.activeRequestIds.length > 0 ? result.activeRequestIds.join(', ') : '(none)'}`);
}

async function runCancelAllClient() {
  const result = await postJson<{ cancelled: Array<{ requestId: string; participant: string }> }>('/cancel-all', {});

  if (!result) {
    return;
  }

  if (result.cancelled.length === 0) {
    console.log('No active requests to cancel.');
    return;
  }

  console.log('Cancelled active requests:');
  result.cancelled.forEach((request) => {
    console.log(`${request.requestId}: ${request.participant}`);
  });
}

function printUsage() {
  console.log('Usage:');
  console.log('  npm run dev -- serve [--focus-tabs|--no-focus-tabs]');
  console.log('  npm run dev -- health');
  console.log('  npm run dev -- cancel-all');
  console.log('  npm run dev -- check-providers [--verbose]');
  console.log('  npm run dev -- ask chatgpt "prompt here"');
  console.log('  npm run dev -- chain google chatgpt "optional prompt"');
  console.log('  npm run dev -- run-random "original prompt here" [--verbose]');
  console.log('  npm run dev -- baton-test [--seed MAESTRISS] [--skip-unavailable]');
  console.log('  npm run dev -- council run --doctrine dream-lab (--prompt "text" | --prompt-file path) [--size N] [--verbose]');
  console.log('  npm run dev -- inspect claude');
  console.log('  npm run dev -- version');
}

async function main() {
  const {
    browserChannel,
    connectCdpUrl,
    focusActiveParticipant,
    verbose,
    args: [command, target, ...args],
  } = parseCliOptions(process.argv.slice(2));

  if (command === 'version') {
    console.log(`Maestriss ${readMaestrissVersion()}`);
    return;
  }

  console.log('Maestriss native runner proof of concept');
  console.log(`Configured participants: ${participants.map((participant) => participant.name).join(', ')}`);

  if (command === 'serve') {
    if (connectCdpUrl) {
      console.log(`Using external browser CDP endpoint: ${connectCdpUrl}`);
    } else {
      console.log(`Using persistent browser profile: ${userDataDir}`);
    }

    await startRunnerServer({
      browserChannel,
      connectCdpUrl,
      focusActiveParticipant,
      runnerRoot,
      userDataDir,
    });
    return;
  }

  if (command === 'health') {
    await runHealthClient();
    return;
  }

  if (command === 'cancel-all') {
    await runCancelAllClient();
    return;
  }

  if (command === 'check-providers') {
    await runCheckProvidersClient(verbose);
    return;
  }

  if (command === 'ask' && target) {
    await runAskClient(target, args);
    return;
  }

  if (command === 'chain' && target) {
    await runChainClient(target, args[0], args.slice(1));
    return;
  }

  if (command === 'run-random') {
    await runRandomClient([target, ...args].filter((part): part is string => Boolean(part)), verbose);
    return;
  }

  if (command === 'baton-test') {
    await runBatonTestClient([target, ...args].filter((part): part is string => Boolean(part)));
    return;
  }

  if (command === 'council') {
    if (target !== 'run') {
      throw new Error(`Unknown council subcommand ${JSON.stringify(target)}. ${councilRunUsage}`);
    }

    await runCouncilRunClient(args, verbose);
    return;
  }

  if (command === 'inspect' && target) {
    await runInspectClient(target);
    return;
  }

  printUsage();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
