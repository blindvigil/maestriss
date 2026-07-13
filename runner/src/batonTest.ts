import type { ParticipantRunResponse } from './types.js';

export const defaultBatonSeed = 'MAESTRISS';

// Canonical baton participant order for the sequential multi-provider baton test.
export const defaultBatonOrder = [
  'chatgpt',
  'claude',
  'gemini',
  'google',
  'deepseek',
  'grok',
  'copilot',
  'perplexity',
  'reka',
];

export type BatonAskFn = (participantId: string, prompt: string) => Promise<ParticipantRunResponse>;

export type BatonReadiness = {
  status: string;
  notes?: string[];
};

export type BatonReadinessFn = (participantId: string) => Promise<BatonReadiness | undefined>;

export type BatonStageOutcome = 'pass' | 'fail' | 'skipped' | 'not-run';

export type BatonStageResult = {
  stage: number;
  stageCount: number;
  participant: string;
  token: string;
  inputBaton: string;
  expectedOutput: string;
  outcome: BatonStageOutcome;
  actualOutput?: string;
  error?: string;
  failureReason?: string;
  readinessStatus?: string;
  readinessNotes?: string[];
};

export type BatonFinalResult = 'PASS' | 'PARTIAL' | 'FAIL';

export type BatonTestResult = {
  seed: string;
  order: string[];
  stages: BatonStageResult[];
  finalResult: BatonFinalResult;
  finalBaton: string;
  expectedFinalBaton: string;
  stoppedAtStage?: number;
};

export type RunBatonTestOptions = {
  ask: BatonAskFn;
  seed?: string;
  order?: string[];
  skipUnavailable?: boolean;
  getReadiness?: BatonReadinessFn;
  onStage?: (stage: BatonStageResult) => void;
};

export function batonToken(participantId: string) {
  return `-${participantId.toUpperCase()}`;
}

// Provider-facing wording is deliberately a plain text-formatting exercise.
// Words like "token", "verification", or "deterministic" caused a live Claude
// refusal (misread as an authentication/verification protocol), so they must
// not appear in the prompt sent to providers.
export function buildBatonPrompt(batonValue: string, token: string, expectedOutput: string) {
  return [
    'This is a simple text-formatting test.',
    '',
    'Text:',
    batonValue,
    '',
    'Add this suffix:',
    token,
    '',
    'Reply with only the resulting text.',
    '',
    'Result:',
    expectedOutput,
  ].join('\n');
}

export async function runBatonTest(options: RunBatonTestOptions): Promise<BatonTestResult> {
  const seed = (options.seed ?? defaultBatonSeed).trim();
  const order = options.order ?? defaultBatonOrder;
  const skipUnavailable = options.skipUnavailable === true;

  if (!seed) {
    throw new Error('Baton seed must be a non-empty string.');
  }

  if (order.length === 0) {
    throw new Error('Baton participant order must not be empty.');
  }

  if (new Set(order).size !== order.length) {
    throw new Error('Baton participant order must not contain duplicates.');
  }

  if (skipUnavailable && !options.getReadiness) {
    throw new Error('skipUnavailable requires a readiness function.');
  }

  const stageCount = order.length;
  const stages: BatonStageResult[] = [];
  // The baton is always the actual extracted output of the previous
  // successful stage. It is never rebuilt from expected values.
  let baton = seed;
  let stoppedAtStage: number | undefined;
  let skippedCount = 0;

  const record = (stage: BatonStageResult) => {
    stages.push(stage);
    options.onStage?.(stage);
  };

  for (let index = 0; index < order.length; index += 1) {
    const participant = order[index];
    const stageNumber = index + 1;
    const token = batonToken(participant);
    const base = {
      stage: stageNumber,
      stageCount,
      participant,
      token,
      inputBaton: baton,
      expectedOutput: `${baton}${token}`,
    };

    if (stoppedAtStage !== undefined) {
      record({ ...base, outcome: 'not-run' });
      continue;
    }

    if (skipUnavailable) {
      const readiness = await options.getReadiness!(participant);

      if (readiness?.status !== 'ready') {
        skippedCount += 1;
        record({
          ...base,
          outcome: 'skipped',
          readinessStatus: readiness?.status ?? 'unknown',
          ...(readiness?.notes?.length ? { readinessNotes: readiness.notes } : {}),
        });
        continue;
      }
    }

    const prompt = buildBatonPrompt(baton, token, base.expectedOutput);
    let response: ParticipantRunResponse;

    try {
      response = await options.ask(participant, prompt);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      stoppedAtStage = stageNumber;
      record({
        ...base,
        outcome: 'fail',
        error: message,
        failureReason: 'ask-error',
      });
      continue;
    }

    if ('status' in response) {
      stoppedAtStage = stageNumber;
      record({
        ...base,
        outcome: 'fail',
        ...(response.answer ? { actualOutput: response.answer } : {}),
        error: response.error,
        failureReason: response.reason ?? response.status,
      });
      continue;
    }

    // Outer-whitespace trim only, matching the normal provider response
    // contract. Meaningful mismatches are never normalized away.
    const actual = response.answer.trim();

    if (actual !== base.expectedOutput) {
      stoppedAtStage = stageNumber;
      record({
        ...base,
        outcome: 'fail',
        actualOutput: actual,
        failureReason: 'exact-mismatch',
      });
      continue;
    }

    baton = actual;
    record({
      ...base,
      outcome: 'pass',
      actualOutput: actual,
    });
  }

  const finalResult: BatonFinalResult = stoppedAtStage !== undefined
    ? 'FAIL'
    : skippedCount > 0
      ? 'PARTIAL'
      : 'PASS';

  // Whole-test expectation given skips: seed plus every non-skipped token.
  const expectedFinalBaton = stages.reduce(
    (value, stage) => (stage.outcome === 'skipped' ? value : `${value}${stage.token}`),
    seed,
  );

  return {
    seed,
    order: [...order],
    stages,
    finalResult,
    finalBaton: baton,
    expectedFinalBaton,
    ...(stoppedAtStage !== undefined ? { stoppedAtStage } : {}),
  };
}
