// Deterministic assertions for the Council CLI operator output.
//
// The reporter is driven by the real execution engine (runCouncil) with
// injected fake asks and an injected clock, and every assertion runs against
// the captured printed lines — the same rendering path the live CLI uses.
// No browser, no Runner service, no network.

import {
  councilSchemaVersion,
  defaultCouncilBudgets,
  defaultCouncilRules,
  defaultCouncilVariables,
  getCouncilDoctrine,
  type CouncilConfiguration,
  type CouncilStage,
} from '../../shared/council/index.js';
import { runCouncil, type CouncilSeatStart } from './councilExecution.js';
import {
  createCouncilRunReporter,
  describeInputPolicy,
  formatChars,
  formatClock,
} from './councilCliFormat.js';
import { describeCognitiveLevel } from '../../shared/council/index.js';
import type { ParticipantResponse, ParticipantRunResponse } from './types.js';

let failureCount = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`PASS: ${label}`);
    return;
  }

  failureCount += 1;
  console.error(`FAIL: ${label}`);

  if (detail) {
    console.error(`  ${detail}`);
  }
}

function completedResponse(participant: string, question: string, answer: string): ParticipantResponse {
  return {
    participant,
    question,
    answer,
    citations: [],
    elapsedSeconds: 1,
    rawText: answer,
    cleanedText: answer,
  };
}

function failedResponse(participant: string, question: string, error: string, reason: string): ParticipantRunResponse {
  return {
    ...completedResponse(participant, question, ''),
    status: 'failed',
    error,
    reason,
  };
}

type Responder = (provider: string, prompt: string) => ParticipantRunResponse;

function makeScriptedAsk(script: Responder[] = []) {
  let callIndex = 0;

  return async (provider: string, prompt: string): Promise<ParticipantRunResponse> => {
    const responder = script[callIndex];
    callIndex += 1;

    if (responder) {
      return responder(provider, prompt);
    }

    return completedResponse(provider, prompt, `Answer ${callIndex} from ${provider}`);
  };
}

const request = 'Compare two options for the weekly summary format and recommend one.';

function makeStage(overrides: Partial<CouncilStage> & Pick<CouncilStage, 'id'>): CouncilStage {
  return {
    provider: 'claude',
    calling: 'sage',
    inputPolicy: 'previous-plus-original',
    failurePolicy: 'skip-and-record',
    ...overrides,
  };
}

function makeConfiguration(
  stages: CouncilStage[],
  extra: Partial<CouncilConfiguration> = {},
): CouncilConfiguration {
  return {
    schemaVersion: councilSchemaVersion,
    id: 'cli-test-council',
    name: 'CLI Test Council',
    rules: { ...defaultCouncilRules },
    variables: { ...defaultCouncilVariables },
    budgets: { ...defaultCouncilBudgets },
    stages,
    ...extra,
  };
}

type ScenarioOptions = {
  stages: CouncilStage[];
  script?: Responder[];
  verbose?: boolean;
  preflight?: boolean;
  extraConfig?: Partial<CouncilConfiguration>;
  getReadiness?: (providerId: string) => Promise<{ status: string; notes?: string[] } | undefined>;
};

async function runScenario(options: ScenarioOptions) {
  const configuration = makeConfiguration(options.stages, options.extraConfig ?? {});
  const lines: string[] = [];
  let clock = 0;
  const now = () => {
    clock += 250;
    return clock;
  };

  const reporter = createCouncilRunReporter({
    doctrine: { fantasyTitle: 'Test Doctrine', practicalTitle: 'Test Purpose' },
    configuration,
    requestChars: request.length,
    verbose: options.verbose ?? false,
    print: (line) => lines.push(line),
    now,
  });

  reporter.start();
  const result = await runCouncil({
    configuration,
    request,
    ask: makeScriptedAsk(options.script ?? []),
    now,
    ...(options.getReadiness ? { getReadiness: options.getReadiness } : {}),
    ...(options.preflight ? { preflight: true } : {}),
    onPreflightStart: reporter.onPreflightStart,
    onProviderAvailability: reporter.onProviderAvailability,
    onPreflightComplete: reporter.onPreflightComplete,
    onSeatBegin: reporter.onSeatBegin,
    onProviderRejected: reporter.onProviderRejected,
    onProviderSkipped: reporter.onProviderSkipped,
    onSeatStart: reporter.onSeatStart,
    onSeatAttempt: reporter.onSeatAttempt,
    onSeatResult: reporter.onSeatResult,
  });
  reporter.finish(result);

  return { lines, text: lines.join('\n'), result };
}

async function testFormattingPrimitives() {
  assert(formatChars(3842) === '3,842', 'character counts render with thousands separators');
  assert(formatClock(134000) === '02:14', 'elapsed clock renders MM:SS', formatClock(134000));
  assert(formatClock(3_734_000) === '1:02:14', 'elapsed clock renders hours when needed');

  assert(
    describeInputPolicy('original-only').includes('no prior Council contributions are eligible') &&
    describeInputPolicy('previous-only').includes('immediately previous successful contribution') &&
    describeInputPolicy('previous-plus-original').includes('Original request plus the immediately previous') &&
    describeInputPolicy('last-n', 3).includes('latest 3 eligible contributions') &&
    describeInputPolicy('full-record').includes('full prior Council record') &&
    describeInputPolicy('independent-round').includes('Independent judgment'),
    'every input policy renders its practical explanation (last-n with its actual N)',
  );

  assert(
    describeCognitiveLevel('temperament', 9) === 'Extremely Imaginative' &&
    describeCognitiveLevel('voice', 5) === 'Neutral' &&
    describeCognitiveLevel('conviction', 2) === 'Strongly Adaptable' &&
    describeCognitiveLevel('dissent', 1) === 'Extremely Cooperative' &&
    describeCognitiveLevel('depth', 6) === 'Slightly Exhaustive' &&
    describeCognitiveLevel('memory', 0).startsWith('Isolated') &&
    describeCognitiveLevel('memory', 9) === 'Full eligible record',
    'cognitive level descriptors are deterministic display metadata with level-appropriate wording',
  );
}

async function testPreRunHeader() {
  const doctrine = getCouncilDoctrine('dream-lab')!;
  const configuration = doctrine.build();
  const lines: string[] = [];
  const reporter = createCouncilRunReporter({
    doctrine,
    configuration,
    requestChars: 3842,
    verbose: false,
    print: (line) => lines.push(line),
    now: () => 0,
  });

  reporter.start();
  const text = lines.join('\n');

  assert(
    text.includes('MAESTRISS COUNCIL') &&
    text.includes('Doctrine: Dream Lab') &&
    text.includes('Purpose: Generate, Explore & Evolve Bold Ideas') &&
    text.includes('Party size: 7') &&
    text.includes('Original request: 3,842 chars'),
    'pre-run header includes Doctrine, purpose, party size, and request size',
  );

  const formationOrder = ['1. Sage', '2. Cartographer', '3. Wild Mage', '4. Wild Mage', '5. Pathfinder', '6. Alchemist', '7. Royal Scribe'];
  let previousIndex = -1;
  const ordered = formationOrder.every((entry) => {
    const index = text.indexOf(entry);
    const inOrder = index > previousIndex;
    previousIndex = index;
    return index !== -1 && inOrder;
  });
  assert(ordered, 'pre-run header lists the actual ordered Formation from the canonical Doctrine');
  assert(
    text.includes('— Grok') && text.includes('— ChatGPT') && text.includes('— Claude'),
    'Formation lines carry provider display names',
  );
}

async function testSuccessfulSeatOutput() {
  const scenario = await runScenario({
    stages: [
      makeStage({ id: 's1', inputPolicy: 'original-only' }),
      makeStage({ id: 's2', provider: 'chatgpt', calling: 'royal-scribe', inputPolicy: 'full-record', failurePolicy: 'halt' }),
    ],
  });
  const { text } = scenario;

  assert(
    text.includes('SEAT 1 OF 2 — SAGE') &&
    text.includes('Preferred Mind: Claude') &&
    text.includes('Calling: Clarifier / Socratic Examiner') &&
    text.includes('Stage id: s1'),
    'seat header includes seat X of N, Calling, provider, and stage id',
  );
  assert(
    text.includes('Executed by: Claude') &&
    text.includes('Fallback used: NO'),
    'a no-fallback seat still states its executing provider explicitly',
  );
  assert(
    text.includes('Temperament: 4 — Slightly Precise') &&
    text.includes('Voice: 7 — Moderately Expansive') &&
    text.includes('Conviction: 2 — Strongly Adaptable') &&
    text.includes('Dissent: 5 — Neutral') &&
    text.includes('Depth: 8 — Strongly Exhaustive') &&
    text.includes('Memory: 7 — Newest 4 contributions'),
    'all six resolved cognitive stats render with numeric level and descriptor',
  );
  assert(
    text.includes('Input policy: original-only') &&
    text.includes('Original request only; no prior Council contributions are eligible.'),
    'input policy explanation renders alongside the raw policy id',
  );
  assert(
    text.includes('Eligible prior contributions: 0') &&
    text.includes('Eligible prior contributions: 1') &&
    text.includes('Memory-selected contributions: 1') &&
    text.includes('Included after prompt budget: 1'),
    'context counts render from actual composition metadata',
  );
  assert(
    /Context carried forward:\n {2}✓ Seat 1 — Sage \/ Claude — [\d,]+ chars/.test(text),
    'carried-forward contributions list seat, Calling, provider, and size',
  );
  assert(/Prompt length: [\d,]+ chars/.test(text), 'prompt length renders');
  assert(
    text.includes('Max response length: 1,024 chars'),
    'the seat block shows the resolved response target with readable formatting',
  );
  assert(
    text.includes('Response target: 1,024 chars') && !text.includes('Target exceeded'),
    'a within-target response shows its target concisely with no warning',
  );
  assert(
    text.includes('Status: PROMPT COMPOSED — OK') &&
    text.includes('Status: SENDING TO CLAUDE (attempt 1 of 1)...'),
    'composition and sending status lines render',
  );
  assert(
    text.includes('Status: RESPONSE RECEIVED') &&
    /Elapsed: [\d.]+ s/.test(text) &&
    /Response length: [\d,]+ chars/.test(text) &&
    text.includes('Attempt: 1 of 1'),
    'successful seat output includes elapsed time, response length, and attempt count',
  );
  assert(
    text.includes('Contribution recorded:') &&
    text.includes('Council contributions now: 1') &&
    text.includes('RESULT: PASS') &&
    text.includes('Next: Seat 2 of 2 — Royal Scribe / ChatGPT'),
    'successful seat records the contribution and announces the next seat',
  );
  assert(
    text.includes('Council progress: 1/2 seats processed | 1 passed | 0 skipped | 0 failed | elapsed'),
    'running summary counts pass/skip/fail after every seat',
  );
  assert(
    text.includes('COUNCIL COMPLETE') &&
    text.includes('Final result: PASS') &&
    text.includes('Passed: 2') &&
    text.includes('Successful contributions: 2') &&
    text.includes('Last successful contribution:') &&
    /Final contribution length: [\d,]+ chars/.test(text),
    'final PASS summary reports seats, contributions, and final authority',
  );
  assert(
    !text.includes('--- provider-facing prompt ---'),
    'normal mode never prints the full provider-facing prompt',
  );
  assert(
    scenario.result.seats.every((seat) => text.includes(seat.response ?? '')),
    'actual extracted responses remain fully visible in normal mode',
  );
}

async function testRetryOutput() {
  const { text } = await runScenario({
    stages: [makeStage({ id: 's1', inputPolicy: 'original-only', failurePolicy: 'retry-once' })],
    script: [
      (provider, prompt) => failedResponse(provider, prompt, 'Please try again soon...', 'timeout'),
      (provider, prompt) => completedResponse(provider, prompt, 'Recovered real answer'),
    ],
  });

  assert(
    text.includes('Status: ASK FAILED') &&
    text.includes('Failure category: timeout') &&
    text.includes('Message: Please try again soon...'),
    'failed attempt output surfaces the lifecycle failure category and message',
  );
  assert(
    text.includes('Failure policy: retry-once') &&
    text.includes('Decision: RETRYING SAME SEAT') &&
    text.includes('The exact same composed prompt will be used.') &&
    text.includes('No Council contribution has been recorded.'),
    'retry output states no contribution was recorded before the retry',
  );
  assert(
    text.includes('Retry attempt: 2 of 2') &&
    text.includes('Attempt: 2 of 2') &&
    text.includes('RESULT: PASS'),
    'the retry attempt is announced and the recovered seat passes',
  );
}

async function testSkipAndPartialOutput() {
  const { text } = await runScenario({
    stages: [
      makeStage({ id: 's1', inputPolicy: 'original-only' }),
      makeStage({ id: 's2', provider: 'gemini', calling: 'oracle' }),
      makeStage({ id: 's3', provider: 'chatgpt', calling: 'royal-scribe', inputPolicy: 'full-record', failurePolicy: 'halt' }),
    ],
    script: [
      (provider, prompt) => completedResponse(provider, prompt, 'First real contribution'),
      (provider, prompt) => failedResponse(provider, prompt, 'Refused', 'refusal'),
      (provider, prompt) => completedResponse(provider, prompt, 'Final real contribution'),
    ],
  });

  assert(
    text.includes('Decision: SKIPPING SEAT') &&
    text.includes('No contribution recorded.') &&
    text.includes('Later seats will receive only successful prior contributions.') &&
    text.includes('RESULT: SKIPPED — no contribution recorded, nothing forwarded from this seat'),
    'skip output states nothing was recorded or forwarded',
  );
  assert(
    text.includes('Council progress: 2/3 seats processed | 1 passed | 1 skipped | 0 failed'),
    'running summary counts the skipped seat',
  );
  assert(
    text.includes('Final result: PARTIAL') &&
    /Skipped\/failed seats:\n {2}Seat 2 — Oracle \/ Gemini — SKIPPED: refusal/.test(text),
    'final PARTIAL summary lists every skipped seat with its failure category',
  );
}

async function testHaltOutput() {
  const { text } = await runScenario({
    stages: [
      makeStage({ id: 's1', inputPolicy: 'original-only' }),
      makeStage({ id: 's2', provider: 'gemini', calling: 'oracle', failurePolicy: 'halt' }),
      makeStage({ id: 's3', provider: 'chatgpt', calling: 'royal-scribe', inputPolicy: 'full-record', failurePolicy: 'halt' }),
    ],
    script: [
      (provider, prompt) => completedResponse(provider, prompt, 'First real contribution'),
      (provider, prompt) => failedResponse(provider, prompt, 'Timed out', 'timeout'),
    ],
  });

  assert(
    text.includes('Decision: HALTING COUNCIL') &&
    text.includes('Successful prior contributions are preserved.') &&
    text.includes('No later seats will execute.') &&
    text.includes('RESULT: FAIL — the Council halted at this seat'),
    'halt output identifies the decision and preservation semantics',
  );
  assert(
    text.includes('NOT RUN (the Council halted at an earlier seat)'),
    'seats after the halt render as not run',
  );
  assert(
    text.includes('Final result: FAIL') &&
    text.includes('Halted at:') &&
    text.includes('Seat 2 — Oracle / Gemini') &&
    text.includes('Failure category: timeout') &&
    text.includes('Successful contributions before halt: 1'),
    'final FAIL summary identifies the halted seat, Calling, AI, category, and prior contribution count',
  );
}

async function testMemoryVersusBudgetDiagnostics() {
  // Memory narrowing: seat 5 sees only the newest 2 of 4 eligible.
  const memoryScenario = await runScenario({
    stages: [
      makeStage({ id: 's1', inputPolicy: 'original-only' }),
      makeStage({ id: 's2', provider: 'gemini', calling: 'oracle' }),
      makeStage({ id: 's3', provider: 'grok', calling: 'wild-mage' }),
      makeStage({ id: 's4', provider: 'chatgpt', calling: 'rival' }),
      makeStage({
        id: 's5',
        provider: 'chatgpt',
        calling: 'inquisitor',
        inputPolicy: 'full-record',
        cognitiveOverrides: { memory: 4 },
        failurePolicy: 'halt',
      }),
    ],
  });

  assert(
    memoryScenario.text.includes('Memory excluded:') &&
    /Memory excluded:\n {2}○ Seat 1 — Sage \/ Claude/.test(memoryScenario.text) &&
    !memoryScenario.text.includes('Prompt budget omitted:'),
    'Memory-excluded contributions are reported distinctly (and not as budget omissions)',
  );

  // Budget pressure: tight budgets truncate and omit without Memory involvement.
  const longAnswer = (provider: string, prompt: string) =>
    completedResponse(provider, prompt, 'X'.repeat(500));
  const budgetScenario = await runScenario({
    stages: [
      makeStage({ id: 's1', inputPolicy: 'original-only' }),
      makeStage({ id: 's2', provider: 'gemini', calling: 'oracle' }),
      makeStage({ id: 's3', provider: 'grok', calling: 'wild-mage' }),
      makeStage({
        id: 's4',
        provider: 'chatgpt',
        calling: 'royal-scribe',
        inputPolicy: 'full-record',
        failurePolicy: 'halt',
      }),
    ],
    script: [longAnswer, longAnswer, longAnswer, longAnswer],
    extraConfig: { budgets: { perContributionChars: 200, totalPromptChars: 2000 } },
  });

  assert(
    budgetScenario.text.includes('Prompt budget omitted:') &&
    !budgetScenario.text.includes('Memory excluded:'),
    'budget-omitted contributions are reported distinctly from Memory exclusions',
  );
  assert(
    budgetScenario.text.includes('Prompt contribution truncated:') &&
    /Original: 500 chars/.test(budgetScenario.text) &&
    budgetScenario.text.includes('Included cap: 200 chars'),
    'truncated contributions report original size and the applied cap',
  );
}

async function testReadinessSkipOutput() {
  const { text } = await runScenario({
    stages: [
      makeStage({ id: 's1', inputPolicy: 'original-only' }),
      makeStage({ id: 's2', provider: 'copilot', calling: 'oracle' }),
    ],
    getReadiness: async (providerId) =>
      providerId === 'copilot'
        ? { status: 'provider-blocked', notes: ['Copilot chat is blocked for this account.'] }
        : { status: 'ready' },
  });

  assert(
    text.includes('Status: COPILOT UNAVAILABLE — provider-blocked') &&
    text.includes('Copilot cannot execute this seat.') &&
    text.includes('Copilot chat is blocked for this account.'),
    'a readiness-rejected provider renders its structured unavailability',
  );
  assert(
    text.includes('PROVIDER CHAIN EXHAUSTED') &&
    /Attempted:\n {2}1\. Copilot — provider-blocked/.test(text) &&
    text.includes('No provider executed this seat.') &&
    text.includes('Decision: SKIPPING SEAT'),
    'a single-provider seat with an unavailable provider reports chain exhaustion and the failure-policy decision',
  );
}

async function testFallbackRendering() {
  const { text, result } = await runScenario({
    stages: [
      makeStage({
        id: 's1',
        provider: 'copilot',
        providerFallbacks: ['claude', 'chatgpt'],
        inputPolicy: 'original-only',
      }),
    ],
    getReadiness: async (providerId) =>
      providerId === 'copilot'
        ? { status: 'provider-blocked', notes: ['Plan upgrade required.'] }
        : { status: 'ready' },
  });

  assert(
    text.includes('Preferred Mind: Copilot') &&
    text.includes('Provider chain: Copilot → Claude → ChatGPT'),
    'the seat block shows the preferred provider and the full ordered chain',
  );
  assert(
    text.includes('Status: COPILOT UNAVAILABLE — provider-blocked') &&
    text.includes('Fallback: TRYING CLAUDE (choice 2 of 3)...') &&
    text.includes('The seat is unchanged: same Calling, cognitive stats, context, and composed prompt.'),
    'provider transitions state the rejection, the next choice, and seat invariance',
  );
  assert(
    text.includes('Status: SENDING TO CLAUDE (fallback choice 2 of 3, attempt 1 of 1)...'),
    'the sending line identifies the fallback position in the chain',
  );
  assert(
    text.includes('Executed by: Claude') &&
    text.includes('Preferred Mind: Copilot') &&
    text.includes('Fallback used: YES') &&
    text.includes('Final result: PASS'),
    'normal mode states preferred versus executing provider without verbose diagnostics',
  );
  assert(
    result.seats[0].providerSelection?.executedProvider === 'claude' &&
    result.seats[0].providerSelection?.fallbackUsed === true,
    'the structured record matches the rendered fallback state',
  );
}

async function testExhaustionRendering() {
  const { text } = await runScenario({
    stages: [
      makeStage({
        id: 's1',
        provider: 'copilot',
        providerFallbacks: ['claude'],
        inputPolicy: 'original-only',
      }),
      makeStage({ id: 's2', provider: 'gemini', calling: 'oracle', failurePolicy: 'halt' }),
    ],
    getReadiness: async (providerId) =>
      providerId === 'copilot'
        ? { status: 'provider-blocked' }
        : providerId === 'claude'
          ? { status: 'logged-out' }
          : { status: 'ready' },
  });

  assert(
    text.includes('PROVIDER CHAIN EXHAUSTED') &&
    /Attempted:\n {2}1\. Copilot — provider-blocked\n {2}2\. Claude — logged-out/.test(text) &&
    text.includes('No provider executed this seat.'),
    'chain exhaustion lists every attempted provider with its structured reason in order',
  );
  assert(
    text.includes('Decision: SKIPPING SEAT') &&
    text.includes('RESULT: SKIPPED — no contribution recorded, nothing forwarded from this seat') &&
    text.includes('Final result: PARTIAL'),
    'after exhaustion the seat failure policy resolves the outcome coherently',
  );
}

async function testResponseTargetWarning() {
  const { text, result } = await runScenario({
    stages: [
      makeStage({ id: 's1', inputPolicy: 'original-only', maxResponseChars: 32, failurePolicy: 'halt' }),
    ],
    script: [
      (provider, prompt) => completedResponse(provider, prompt, 'X'.repeat(100)),
    ],
  });

  assert(
    text.includes('Max response length: 32 chars') &&
    text.includes('Response length: 100 chars') &&
    text.includes('Response target: 32 chars') &&
    text.includes('Target exceeded: YES') &&
    text.includes('WARNING: Response exceeded requested target by 68 characters.'),
    'an over-target response warns clearly with the exact overage',
  );
  assert(
    text.includes('RESULT: PASS') &&
    result.seats[0].responseTargetExceeded === true &&
    result.contributions[0].text.length === 100,
    'the over-target seat still passes and its contribution is preserved unchanged',
  );
}

async function testVerbosePromptIdentity() {
  const { text } = await runScenario({
    stages: [
      makeStage({
        id: 's1',
        provider: 'copilot',
        providerFallbacks: ['claude'],
        inputPolicy: 'original-only',
      }),
    ],
    verbose: true,
    getReadiness: async (providerId) =>
      providerId === 'copilot' ? { status: 'provider-blocked' } : { status: 'ready' },
  });

  const identities = [...text.matchAll(/fnv1a ([0-9a-f]{8})/g)].map((match) => match[1]);
  assert(
    text.includes('Prompt identity: fnv1a') &&
    text.includes('Prompt identity unchanged: fnv1a') &&
    identities.length === 2 &&
    identities[0] === identities[1],
    'verbose mode proves the composed prompt is byte-identical across the fallback via its identity hash',
    identities.join(','),
  );
}

async function testVerboseDiagnostics() {
  const override = 'Frame the problem by listing the three most decision-relevant open questions first.';
  const scenario = await runScenario({
    stages: [
      makeStage({ id: 's1', inputPolicy: 'original-only' }),
      makeStage({ id: 's2', provider: 'gemini', calling: 'oracle', failurePolicy: 'halt' }),
    ],
    verbose: true,
    extraConfig: { callingFlavourOverrides: { sage: override } },
  });
  const { text, result } = scenario;

  assert(
    text.includes('--- COUNCIL COMPOSITION DIAGNOSTICS ---') &&
    text.includes('Calling flavour source: council-override') &&
    text.includes('Calling flavour source: canonical') &&
    text.includes('Eligible contribution ids: s1') &&
    text.includes('Memory-selected contribution ids: s1') &&
    text.includes('Included contribution ids: s1') &&
    text.includes('Truncated contribution ids: (none)') &&
    text.includes('Omitted contribution ids: (none)') &&
    /Prompt budget: [\d,]+ \/ 12,000 chars/.test(text) &&
    text.includes('Per-contribution cap: 4,000 chars') &&
    text.includes('Resolved max response chars: 1024'),
    'verbose diagnostics expose flavour source, composition ids, and budget usage',
  );
  assert(
    text.includes('Resolved cognitive instructions:') &&
    text.includes('Cognitive guidance:'),
    'verbose diagnostics include the exact resolved cognitive instruction lines',
  );
  assert(
    result.seats.every((seat) => seat.prompt !== undefined && text.includes(seat.prompt)) &&
    text.includes('--- provider-facing prompt ---'),
    'verbose mode prints the exact provider-facing prompt for every seat',
  );
}

async function testRunScopedAvailabilityOutput() {
  // Start-of-run availability summary plus per-seat effective-chain and skip
  // rendering, driven by a preflight over a Formation with a mix of states.
  const readiness = async (providerId: string) => {
    const states: Record<string, string> = {
      claude: 'security-verification',
      grok: 'account-or-plan-block',
      reka: 'unknown',
    };
    return { status: states[providerId] ?? 'ready' };
  };

  const { text } = await runScenario({
    preflight: true,
    getReadiness: readiness,
    stages: [
      makeStage({ id: 's1', provider: 'grok', providerFallbacks: ['chatgpt', 'gemini'], calling: 'sage', inputPolicy: 'original-only' }),
      makeStage({ id: 's2', provider: 'reka', calling: 'oracle', inputPolicy: 'original-only', failurePolicy: 'halt' }),
    ],
  });

  assert(
    text.includes('CHECKING MINDS...') &&
    text.includes('✓ ChatGPT — ready') &&
    text.includes('⚠ Grok — account-or-plan-block') &&
    text.includes('? Reka Chat — unknown'),
    'the run opens with a live per-Mind availability check over the Formation Minds',
  );
  assert(
    text.includes('Mind availability:') &&
    /READY[\s\S]*✓ ChatGPT/.test(text) &&
    /UNAVAILABLE[\s\S]*⚠ Grok — account-or-plan-block/.test(text) &&
    /UNKNOWN[\s\S]*\? Reka Chat/.test(text),
    'the availability summary groups Minds into READY / UNAVAILABLE / UNKNOWN distinctly',
  );
  assert(
    /Available Minds: \d+ of \d+/.test(text),
    'the availability summary reports the available-of-total count',
  );
  assert(
    text.includes('Unavailable this run:') &&
    text.includes('Effective chain: ChatGPT → Gemini') &&
    text.includes('Preferred Mind remains: Grok (unavailable this run, not rewritten)'),
    'a seat whose preferred Mind is unavailable shows the effective chain while keeping the configured Preferred Mind',
  );
  assert(
    text.includes('Grok skipped — already unavailable for this run (account-or-plan-block).'),
    'the seat renders a concise run-scoped skip line instead of a fresh unavailability report',
  );
  assert(
    text.includes('Executed by: ChatGPT'),
    'execution falls through the effective chain to the first available Mind',
  );
}

async function testExecutionTimeAvailabilityOutput() {
  // A Mind that passes preflight but becomes unavailable during an ask is
  // reported as a fresh transition on the first seat and skipped concisely on
  // a later seat.
  const { text } = await runScenario({
    preflight: true,
    getReadiness: async () => ({ status: 'ready' }),
    stages: [
      makeStage({ id: 's1', provider: 'grok', providerFallbacks: ['chatgpt'], calling: 'sage', inputPolicy: 'original-only' }),
      makeStage({ id: 's2', provider: 'grok', providerFallbacks: ['gemini'], calling: 'oracle', inputPolicy: 'original-only', failurePolicy: 'halt' }),
    ],
    script: [
      (provider, prompt) => failedResponse(provider, prompt, 'Sign up to continue', 'grok-account-or-plan-block'),
    ],
  });

  assert(
    text.includes('Status: GROK UNAVAILABLE — grok-account-or-plan-block') &&
    text.includes('Grok is now unavailable for the rest of this Council run and will be skipped on later seats.') &&
    text.includes('Fallback: TRYING CHATGPT'),
    'a Mind failing an ask with an availability category is reported as a mid-run transition with the fallback',
  );
  assert(
    text.includes('Grok skipped — already unavailable for this run (grok-account-or-plan-block).'),
    'the later seat reports the concise run-scoped skip rather than repeating the full explanation',
  );
}

async function testHeartbeat() {
  const lines: string[] = [];
  let clock = 0;
  const configuration = makeConfiguration([makeStage({ id: 's1', inputPolicy: 'original-only' })]);
  const reporter = createCouncilRunReporter({
    doctrine: { fantasyTitle: 'Test Doctrine', practicalTitle: 'Test Purpose' },
    configuration,
    requestChars: 10,
    verbose: false,
    print: (line) => lines.push(line),
    now: () => clock,
  });

  reporter.heartbeatTick();
  const beforeAnyAsk = lines.length;
  assert(beforeAnyAsk === 0, 'heartbeat prints nothing before any ask is active');

  const start: CouncilSeatStart = {
    seat: 1,
    seatCount: 1,
    stageId: 's1',
    provider: 'claude',
    preferredProvider: 'claude',
    providerChain: ['claude'],
    choiceIndex: 1,
    fallbackUsed: false,
    calling: 'sage',
    inputPolicy: 'original-only',
    failurePolicy: 'skip-and-record',
    prompt: 'prompt text',
    composition: {
      resolvedCognitiveStats: { temperament: 5, voice: 5, conviction: 5, dissent: 5, depth: 5, memory: 5 },
      eligibleContributionIds: [],
      memorySelectedContributionIds: [],
      includedContributionIds: [],
      truncatedContributionIds: [],
      omittedContributionIds: [],
      promptChars: 11,
      totalPromptChars: 12000,
      perContributionCap: 4000,
      resolvedMaxResponseChars: 1024,
      callingFlavourSource: 'canonical',
    },
    attempt: 1,
    maxAttempts: 1,
  };

  reporter.onSeatStart(start);
  clock += 10_000;
  reporter.heartbeatTick();
  assert(
    lines[lines.length - 1] === '[00:10] Claude is still processing...',
    'heartbeat prints an elapsed-time line while the ask is active',
    lines[lines.length - 1],
  );

  clock += 10_000;
  reporter.heartbeatTick();
  assert(
    lines[lines.length - 1] === '[00:20] Claude is still processing...',
    'heartbeat elapsed time advances on each tick',
  );

  reporter.onSeatAttempt({
    seat: 1,
    seatCount: 1,
    stageId: 's1',
    provider: 'claude',
    calling: 'sage',
    failurePolicy: 'skip-and-record',
    attempt: 1,
    maxAttempts: 1,
    outcome: 'pass',
    elapsedMs: 20_000,
    responseChars: 12,
    willRetry: false,
  });
  const afterResolve = lines.length;
  reporter.heartbeatTick();
  assert(lines.length === afterResolve, 'heartbeat stops immediately when the ask resolves');
}

async function main() {
  await testFormattingPrimitives();
  await testPreRunHeader();
  await testSuccessfulSeatOutput();
  await testRetryOutput();
  await testSkipAndPartialOutput();
  await testHaltOutput();
  await testMemoryVersusBudgetDiagnostics();
  await testReadinessSkipOutput();
  await testResponseTargetWarning();
  await testFallbackRendering();
  await testExhaustionRendering();
  await testVerbosePromptIdentity();
  await testVerboseDiagnostics();
  await testRunScopedAvailabilityOutput();
  await testExecutionTimeAvailabilityOutput();
  await testHeartbeat();

  if (failureCount > 0) {
    console.error(`\n${failureCount} council CLI assertion(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log('\nAll council CLI assertions passed.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
