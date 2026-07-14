// Deterministic assertions for the Council execution engine.
//
// The real engine (runCouncil) is exercised with injected fake ask and
// readiness functions, following the baton assertion architecture: no
// browser, no network, no timing dependence. Fake asks return scripted
// responses, so every assertion about prompts, contributions, retries, and
// result classification is exact.

import {
  composeStagePrompt,
  councilSchemaVersion,
  defaultCouncilBudgets,
  defaultCouncilRules,
  defaultCouncilVariables,
  getCanonicalCallingFlavourText,
  getCouncilDoctrine,
  type CouncilConfiguration,
  type CouncilContribution,
  type CouncilStage,
} from '../../shared/council/index.js';
import { runCouncil, type CouncilAskFn, type CouncilRunResult } from './councilExecution.js';
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

type AskCall = {
  provider: string;
  prompt: string;
};

// Sequential scripted ask: each call consumes the next scripted responder.
// Falls back to a deterministic per-call answer when the script runs out.
function makeScriptedAsk(
  calls: AskCall[],
  script: Array<(provider: string, prompt: string) => ParticipantRunResponse> = [],
): CouncilAskFn {
  let callIndex = 0;

  return async (provider, prompt) => {
    calls.push({ provider, prompt });
    const responder = script[callIndex];
    callIndex += 1;

    if (responder) {
      return responder(provider, prompt);
    }

    return completedResponse(provider, prompt, `Answer ${callIndex} from ${provider}`);
  };
}

const testRequest = 'Compare two options for the weekly summary format and recommend one.';

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
    id: 'execution-test-council',
    name: 'Execution Test Council',
    rules: { ...defaultCouncilRules },
    variables: { ...defaultCouncilVariables },
    budgets: { ...defaultCouncilBudgets },
    stages,
    ...extra,
  };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }

  return value;
}

function expectedPromptFor(
  configuration: CouncilConfiguration,
  stageIndex: number,
  priorContributions: CouncilContribution[],
): string {
  return composeStagePrompt({
    configuration,
    stage: configuration.stages[stageIndex],
    request: testRequest,
    priorContributions,
  }).prompt;
}

async function testSuccessfulRun() {
  // Same provider (claude) on seats 1 and 3, same Calling (wild-mage) on
  // seats 2 and 3: neither may be deduplicated.
  const configuration = makeConfiguration([
    makeStage({ id: 's1', provider: 'claude', calling: 'sage', inputPolicy: 'original-only' }),
    makeStage({ id: 's2', provider: 'grok', calling: 'wild-mage' }),
    makeStage({ id: 's3', provider: 'claude', calling: 'wild-mage', inputPolicy: 'full-record', failurePolicy: 'halt' }),
  ]);
  deepFreeze(configuration);
  const snapshot = JSON.stringify(configuration);

  const calls: AskCall[] = [];
  const result = await runCouncil({ configuration, request: testRequest, ask: makeScriptedAsk(calls) });

  assert(result.finalResult === 'PASS', 'all-success run classifies as PASS', `got ${result.finalResult}`);
  assert(calls.length === 3, 'successful run sends exactly one ask per seat', `got ${calls.length}`);
  assert(
    calls.map((call) => call.provider).join(',') === 'claude,grok,claude',
    'seats execute in exact Formation order and providers repeat without deduplication',
    calls.map((call) => call.provider).join(','),
  );
  assert(
    result.seats.map((seat) => seat.calling).join(',') === 'sage,wild-mage,wild-mage',
    'the same Calling executes on multiple seats without deduplication',
  );
  assert(
    result.contributions.length === 3 &&
    result.contributions.every((contribution, index) => contribution.text === `Answer ${index + 1} from ${calls[index].provider}`),
    'each successful contribution enters Council state chronologically with the actual response text',
  );
  assert(
    result.finalContribution?.stageId === 's3',
    'final contribution is the last successful seat output',
  );

  // Exact prompt verification: what ask received must equal an independent
  // composition against the real prior contributions.
  const prior: CouncilContribution[] = [];
  let promptsExact = true;

  for (let index = 0; index < configuration.stages.length; index += 1) {
    const expected = expectedPromptFor(configuration, index, prior);

    if (calls[index].prompt !== expected || result.seats[index].prompt !== expected) {
      promptsExact = false;
    }

    prior.push(result.contributions[index]);
  }

  assert(promptsExact, 'every seat sends the exact shared-pipeline composed prompt and records it verbatim');
  assert(
    JSON.stringify(configuration) === snapshot,
    'the Council Configuration is not mutated by execution',
  );

  // Determinism: an identical rerun produces byte-identical prompts.
  const rerunCalls: AskCall[] = [];
  await runCouncil({ configuration, request: testRequest, ask: makeScriptedAsk(rerunCalls) });
  assert(
    JSON.stringify(rerunCalls) === JSON.stringify(calls),
    'identical input and deterministic fake asks produce byte-identical prompts across runs',
  );
}

async function testInputPolicies() {
  const configuration = makeConfiguration([
    makeStage({ id: 's1', inputPolicy: 'original-only' }),
    makeStage({ id: 's2', provider: 'gemini', calling: 'cartographer', inputPolicy: 'previous-only' }),
    makeStage({ id: 's3', provider: 'chatgpt', calling: 'rival', inputPolicy: 'previous-plus-original' }),
    makeStage({ id: 's4', provider: 'grok', calling: 'inquisitor', inputPolicy: 'last-n', inputPolicyN: 2 }),
    makeStage({ id: 's5', provider: 'claude', calling: 'magistrate', inputPolicy: 'full-record' }),
    makeStage({ id: 's6', provider: 'deepseek', calling: 'oracle', inputPolicy: 'independent-round' }),
  ]);

  const calls: AskCall[] = [];
  const result = await runCouncil({ configuration, request: testRequest, ask: makeScriptedAsk(calls) });

  assert(result.finalResult === 'PASS', 'input-policy run completes as PASS');

  const answer = (index: number) => `Answer ${index} from ${calls[index - 1].provider}`;
  const originalMarker = '--- ORIGINAL USER REQUEST ---';

  assert(
    calls[1].prompt.includes(answer(1)) && !calls[1].prompt.includes(originalMarker),
    'previous-only receives the previous contribution and not the original request',
  );
  assert(
    calls[2].prompt.includes(answer(2)) &&
    !calls[2].prompt.includes(answer(1)) &&
    calls[2].prompt.includes(originalMarker),
    'previous-plus-original receives only the previous contribution plus the original request',
  );
  assert(
    calls[3].prompt.includes(answer(2)) &&
    calls[3].prompt.includes(answer(3)) &&
    !calls[3].prompt.includes(answer(1)),
    'last-n (n=2) receives exactly the last two contributions',
  );
  assert(
    calls[4].prompt.includes(answer(1)) &&
    calls[4].prompt.includes(answer(2)) &&
    calls[4].prompt.includes(answer(3)) &&
    calls[4].prompt.includes(answer(4)),
    'full-record receives every prior contribution',
  );
  assert(
    calls[5].prompt.includes(originalMarker) &&
    !calls[5].prompt.includes('CONTRIBUTION FROM'),
    'independent-round receives the original request without any prior outputs',
  );
}

async function testFlavourOverrideAndProviderAssignment() {
  const canonical = getCanonicalCallingFlavourText('sage') ?? '';
  const overrideText = 'Frame the problem by listing the three most decision-relevant open questions first.';
  const configuration = makeConfiguration(
    // Sage's Suggested AI is claude; the Formation assigns gemini. The
    // Formation assignment is authoritative.
    [makeStage({ id: 's1', provider: 'gemini', calling: 'sage', inputPolicy: 'original-only' })],
    { callingFlavourOverrides: { sage: overrideText } },
  );

  const calls: AskCall[] = [];
  const result = await runCouncil({ configuration, request: testRequest, ask: makeScriptedAsk(calls) });

  assert(result.finalResult === 'PASS', 'flavour-override run completes as PASS');
  assert(
    calls[0].prompt.includes(overrideText),
    'a Council-level Calling flavour override appears in the exact sent prompt',
  );
  assert(
    canonical.length > 0 && !calls[0].prompt.includes(canonical),
    'the overridden canonical flavour text is absent from the sent prompt',
  );
  assert(
    calls[0].provider === 'gemini',
    "the Formation seat provider is used for execution, overriding the Calling's Suggested AI",
  );
}

async function testHalt() {
  const configuration = makeConfiguration([
    makeStage({ id: 's1', inputPolicy: 'original-only' }),
    makeStage({ id: 's2', provider: 'gemini', failurePolicy: 'halt' }),
    makeStage({ id: 's3', provider: 'chatgpt' }),
  ]);

  const calls: AskCall[] = [];
  const result = await runCouncil({
    configuration,
    request: testRequest,
    ask: makeScriptedAsk(calls, [
      (provider, prompt) => completedResponse(provider, prompt, 'Real first contribution'),
      (provider, prompt) => failedResponse(provider, prompt, 'Timed out', 'timeout'),
    ]),
  });

  assert(result.finalResult === 'FAIL', 'halt failure classifies the run as FAIL', `got ${result.finalResult}`);
  assert(result.haltedAtSeat === 2, 'run records the halted seat', `got ${result.haltedAtSeat}`);
  assert(calls.length === 2, 'halt stops later seats from executing', `got ${calls.length} asks`);
  assert(
    result.seats[2].outcome === 'not-run',
    'seats after a halt are recorded as not-run',
  );
  assert(
    result.contributions.length === 1 && result.contributions[0].text === 'Real first contribution',
    'all real prior contributions are preserved after a halt',
  );
}

async function testRetryOnce() {
  const failingConfiguration = makeConfiguration([
    makeStage({ id: 's1', inputPolicy: 'original-only', failurePolicy: 'retry-once' }),
    makeStage({ id: 's2', provider: 'gemini' }),
  ]);

  const failingCalls: AskCall[] = [];
  const failingResult = await runCouncil({
    configuration: failingConfiguration,
    request: testRequest,
    ask: makeScriptedAsk(failingCalls, [
      (provider, prompt) => failedResponse(provider, prompt, 'Blocked', 'provider-blocked'),
      (provider, prompt) => failedResponse(provider, prompt, 'Blocked again', 'provider-blocked'),
    ]),
  });

  assert(
    failingCalls.length === 2,
    'retry-once with persistent failure performs exactly two asks',
    `got ${failingCalls.length}`,
  );
  assert(
    failingCalls[0].prompt === failingCalls[1].prompt,
    'the retry re-sends the same exact composed prompt',
  );
  assert(
    failingResult.contributions.length === 0,
    'a failed retry adds no fabricated contribution',
  );
  assert(
    failingResult.finalResult === 'FAIL' && failingResult.haltedAtSeat === 1,
    'a failed retry halts the Council',
    `got ${failingResult.finalResult} at ${failingResult.haltedAtSeat}`,
  );

  const recoveringCalls: AskCall[] = [];
  const recoveringResult = await runCouncil({
    configuration: failingConfiguration,
    request: testRequest,
    ask: makeScriptedAsk(recoveringCalls, [
      (provider, prompt) => failedResponse(provider, prompt, 'Transient', 'timeout'),
      (provider, prompt) => completedResponse(provider, prompt, 'Recovered real answer'),
    ]),
  });

  assert(
    recoveringResult.finalResult === 'PASS' &&
    recoveringResult.seats[0].attempts === 2 &&
    recoveringResult.contributions.filter((contribution) => contribution.stageId === 's1').length === 1 &&
    recoveringResult.contributions[0].text === 'Recovered real answer',
    'a successful retry adds exactly one real contribution and the run continues',
  );
  assert(
    recoveringCalls.length === 3,
    'a successful retry consumes two asks for the seat plus one for the next seat',
    `got ${recoveringCalls.length}`,
  );
}

async function testSkipAndRecord() {
  const configuration = makeConfiguration([
    makeStage({ id: 's1', inputPolicy: 'original-only' }),
    makeStage({ id: 's2', provider: 'gemini', failurePolicy: 'skip-and-record' }),
    makeStage({ id: 's3', provider: 'chatgpt', inputPolicy: 'full-record', failurePolicy: 'halt' }),
  ]);

  const calls: AskCall[] = [];
  const result = await runCouncil({
    configuration,
    request: testRequest,
    ask: makeScriptedAsk(calls, [
      (provider, prompt) => completedResponse(provider, prompt, 'First real contribution'),
      (provider, prompt) => failedResponse(provider, prompt, 'Refused', 'refusal'),
      (provider, prompt) => completedResponse(provider, prompt, 'Final real contribution'),
    ]),
  });

  assert(result.finalResult === 'PARTIAL', 'skip-and-record run reaching the end classifies as PARTIAL', `got ${result.finalResult}`);
  assert(
    result.seats[1].outcome === 'skipped' && result.seats[1].failureReason === 'refusal',
    'the failed seat is recorded as skipped with its real failure reason',
  );
  assert(calls.length === 3, 'skip-and-record continues to the next seat');
  assert(
    calls[2].prompt.includes('First real contribution') && !calls[2].prompt.includes('Refused'),
    'a skipped seat forwards nothing: later full-record prompts contain only real successful contributions',
  );
  assert(
    result.contributions.map((contribution) => contribution.stageId).join(',') === 's1,s3',
    'skipped seats never enter Council contribution state',
  );
}

async function testReadinessGate() {
  const configuration = makeConfiguration([
    makeStage({ id: 's1', inputPolicy: 'original-only' }),
    makeStage({ id: 's2', provider: 'copilot', failurePolicy: 'skip-and-record' }),
    makeStage({ id: 's3', provider: 'chatgpt', failurePolicy: 'halt' }),
  ]);

  const calls: AskCall[] = [];
  const result = await runCouncil({
    configuration,
    request: testRequest,
    ask: makeScriptedAsk(calls),
    getReadiness: async (providerId) =>
      providerId === 'copilot'
        ? { status: 'provider-blocked', notes: ['Copilot chat is blocked for this account.'] }
        : { status: 'ready' },
  });

  assert(
    result.finalResult === 'PARTIAL' &&
    result.seats[1].outcome === 'skipped' &&
    result.seats[1].attempts === 0 &&
    result.seats[1].readinessStatus === 'provider-blocked',
    'an unavailable provider under skip-and-record is skipped before any ask',
  );
  assert(
    calls.map((call) => call.provider).join(',') === 'claude,chatgpt',
    'no ask is sent to an unavailable provider',
    calls.map((call) => call.provider).join(','),
  );

  const haltingConfiguration = makeConfiguration([
    makeStage({ id: 's1', provider: 'copilot', inputPolicy: 'original-only', failurePolicy: 'halt' }),
    makeStage({ id: 's2', provider: 'chatgpt' }),
  ]);
  const haltingCalls: AskCall[] = [];
  const haltingResult = await runCouncil({
    configuration: haltingConfiguration,
    request: testRequest,
    ask: makeScriptedAsk(haltingCalls),
    getReadiness: async (providerId) =>
      providerId === 'copilot' ? { status: 'logged-out' } : { status: 'ready' },
  });

  assert(
    haltingResult.finalResult === 'FAIL' && haltingCalls.length === 0,
    'an unavailable provider under halt fails the Council without any ask',
  );
}

async function testEmptyResponseAndErrors() {
  const configuration = makeConfiguration([
    makeStage({ id: 's1', inputPolicy: 'original-only', failurePolicy: 'halt' }),
  ]);

  const result = await runCouncil({
    configuration,
    request: testRequest,
    ask: makeScriptedAsk([], [
      (provider, prompt) => completedResponse(provider, prompt, '   '),
    ]),
  });

  assert(
    result.finalResult === 'FAIL' &&
    result.seats[0].failureReason === 'empty-response' &&
    result.contributions.length === 0,
    'an empty extracted answer is a seat failure, never a contribution',
  );

  let blankRequestRejected = false;

  try {
    await runCouncil({ configuration, request: '   ', ask: makeScriptedAsk([]) });
  } catch {
    blankRequestRejected = true;
  }

  assert(blankRequestRejected, 'a blank request is rejected before execution');

  let invalidConfigurationRejected = false;

  try {
    await runCouncil({
      configuration: { ...configuration, stages: [] },
      request: testRequest,
      ask: makeScriptedAsk([]),
    });
  } catch (error) {
    invalidConfigurationRejected =
      error instanceof Error && error.message.includes('invalid');
  }

  assert(invalidConfigurationRejected, 'an invalid Council Configuration is rejected before execution');
}

// Observability metadata is additive: it must reflect real execution facts
// without changing any execution semantics.
async function testStructuredObservabilityMetadata() {
  const configuration = makeConfiguration([
    makeStage({ id: 's1', inputPolicy: 'original-only', failurePolicy: 'retry-once' }),
    makeStage({ id: 's2', provider: 'gemini', inputPolicy: 'full-record', failurePolicy: 'halt' }),
  ]);

  let clock = 0;
  const now = () => {
    clock += 1000;
    return clock;
  };
  const attempts: Array<{ seat: number; attempt: number; outcome: string; willRetry: boolean }> = [];

  const result = await runCouncil({
    configuration,
    request: testRequest,
    now,
    ask: makeScriptedAsk([], [
      (provider, prompt) => failedResponse(provider, prompt, 'Transient', 'timeout'),
      (provider, prompt) => completedResponse(provider, prompt, 'Recovered real answer'),
    ]),
    onSeatAttempt: (attempt) => attempts.push({
      seat: attempt.seat,
      attempt: attempt.attempt,
      outcome: attempt.outcome,
      willRetry: attempt.willRetry,
    }),
  });

  assert(
    JSON.stringify(attempts) === JSON.stringify([
      { seat: 1, attempt: 1, outcome: 'fail', willRetry: true },
      { seat: 1, attempt: 2, outcome: 'pass', willRetry: false },
      { seat: 2, attempt: 1, outcome: 'pass', willRetry: false },
    ]),
    'onSeatAttempt reports each real attempt with its outcome and retry decision',
    JSON.stringify(attempts),
  );

  const [seat1, seat2] = result.seats;
  assert(
    seat1.responseChars === 'Recovered real answer'.length &&
    typeof seat1.elapsedMs === 'number' && seat1.elapsedMs > 0 &&
    typeof seat2.elapsedMs === 'number' && seat2.elapsedMs > 0,
    'seat records carry response length and injected-clock elapsed time',
  );
  assert(
    seat2.composition !== undefined &&
    seat2.composition.includedContributionIds.join(',') === 's1' &&
    seat2.composition.promptChars === seat2.prompt?.length &&
    seat2.composition.totalPromptChars === configuration.budgets.totalPromptChars &&
    seat2.composition.callingFlavourSource === 'canonical' &&
    seat2.composition.resolvedCognitiveStats.memory === 7,
    'seat records preserve structured composition diagnostics matching the exact prompt',
  );
  assert(
    result.finalResult === 'PASS' && result.contributions.length === 2,
    'observability metadata changes no execution semantics (retry run still passes identically)',
  );
}

// The canonical Doctrine Formations encode specific cognitive flows: a
// repeated Calling's second seat must genuinely receive the prior material
// its input policy defines, so the second pass is real work rather than a
// blind duplicate. These assertions run the real engine over the real
// canonical Doctrines with deterministic fake asks and verify the exact
// provider-facing prompt each critical seat receives.
async function testDoctrineCognitiveFlows() {
  const originalMarker = '--- ORIGINAL USER REQUEST ---';

  const runDoctrine = async (doctrineId: string) => {
    const doctrine = getCouncilDoctrine(doctrineId);
    const configuration = doctrine!.build();
    const calls: AskCall[] = [];
    const result = await runCouncil({ configuration, request: testRequest, ask: makeScriptedAsk(calls) });
    return { configuration, calls, result };
  };

  // makeScriptedAsk's fallback answers are "Answer <n> from <provider>", so
  // seat n's actual contribution is uniquely identifiable in later prompts.
  const answerFrom = (calls: AskCall[], seat: number) =>
    `Answer ${seat} from ${calls[seat - 1].provider}`;

  const dreamLab = await runDoctrine('dream-lab');
  assert(
    dreamLab.result.finalResult === 'PASS' &&
    dreamLab.configuration.stages[2].calling === 'wild-mage' &&
    dreamLab.configuration.stages[3].calling === 'wild-mage',
    "Dream Lab's canonical Formation seats Wild Mage on seats 3 and 4 and executes cleanly",
  );
  assert(
    dreamLab.calls[3].prompt.includes(answerFrom(dreamLab.calls, 3)) &&
    dreamLab.calls[3].prompt.includes(originalMarker) &&
    !dreamLab.calls[3].prompt.includes(answerFrom(dreamLab.calls, 2)),
    "Dream Lab's second Wild Mage receives the first Wild Mage's actual contribution plus the original request (previous-plus-original) for a real second divergent pass",
  );

  const trialByFire = await runDoctrine('trial-by-fire');
  assert(
    trialByFire.configuration.stages[3].calling === 'rival' &&
    trialByFire.configuration.stages[4].calling === 'saboteur',
    "Trial by Fire's canonical Formation places the second Saboteur directly after the Rival",
  );
  assert(
    trialByFire.calls[4].prompt.includes(answerFrom(trialByFire.calls, 4)) &&
    trialByFire.calls[4].prompt.includes(originalMarker),
    "Trial by Fire's second Saboteur receives the Rival's actual contribution",
  );

  const oraclesTable = await runDoctrine('oracles-table');
  assert(
    oraclesTable.configuration.stages[3].calling === 'oracle' &&
    oraclesTable.configuration.stages[4].calling === 'oracle',
    "Oracle's Table's canonical Formation seats Oracle on seats 4 and 5",
  );
  assert(
    oraclesTable.calls[4].prompt.includes(answerFrom(oraclesTable.calls, 4)) &&
    oraclesTable.calls[4].prompt.includes(originalMarker),
    "Oracle's Table's second Oracle receives the first Oracle's actual scenarios",
  );

  // In the canonical Socratic Circle Formation the Cartographer's
  // first-principles decomposition comes after both Sages, so the earlier
  // inquiry available to the second Sage is the first Sage's contribution.
  const socraticCircle = await runDoctrine('socratic-circle');
  assert(
    socraticCircle.configuration.stages[0].calling === 'sage' &&
    socraticCircle.configuration.stages[1].calling === 'sage',
    "Socratic Circle's canonical Formation opens with two consecutive Sage seats",
  );
  assert(
    socraticCircle.calls[1].prompt.includes(answerFrom(socraticCircle.calls, 1)) &&
    socraticCircle.calls[1].prompt.includes(originalMarker),
    "Socratic Circle's second Sage receives the first Sage's actual earlier inquiry plus the original request",
  );
}

async function testCrownCouncilHonesty() {
  const doctrine = getCouncilDoctrine('crown-council');
  const configuration = doctrine!.build();
  const calls: AskCall[] = [];
  const result: CouncilRunResult = await runCouncil({
    configuration,
    request: testRequest,
    ask: makeScriptedAsk(calls),
  });

  assert(result.finalResult === 'PASS', 'Crown Council run completes as PASS with all seats succeeding');
  assert(
    result.voteAggregationImplemented === false,
    'Crown Council run result explicitly reports that vote aggregation is not implemented',
  );
  assert(
    calls.every((call) => !call.prompt.includes('CONTRIBUTION FROM')),
    'every Crown Council seat deliberates independently without prior outputs',
  );
  assert(
    result.doctrineId === 'crown-council' &&
    result.finalContribution?.stageId === configuration.stages[configuration.stages.length - 1].id,
    'the Crown Council final contribution is the last individual opinion, with the doctrine identified for honest reporting',
  );
}

async function main() {
  await testSuccessfulRun();
  await testInputPolicies();
  await testFlavourOverrideAndProviderAssignment();
  await testHalt();
  await testRetryOnce();
  await testSkipAndRecord();
  await testReadinessGate();
  await testEmptyResponseAndErrors();
  await testStructuredObservabilityMetadata();
  await testDoctrineCognitiveFlows();
  await testCrownCouncilHonesty();

  if (failureCount > 0) {
    console.error(`\n${failureCount} council execution assertion(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log('\nAll council execution assertions passed.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
