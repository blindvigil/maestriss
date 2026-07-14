// Minimal live Council execution engine.
//
// Executes a validated Council Configuration seat by seat, in Formation
// order, over an injected ask function — the same dependency-injection shape
// as the baton test engine, so deterministic assertions run the real engine
// with a fake ask and the CLI runs it over the existing `/ask` lifecycle.
//
// Honesty contract (baton philosophy):
// - A contribution is only ever the actual extracted provider response.
//   Nothing is fabricated, and failed or skipped seats contribute nothing.
// - Every composed provider-facing prompt is preserved verbatim on the seat
//   record for inspection; the prompt sent is byte-identical to the prompt
//   recorded.
// - The Council Configuration is never mutated.
//
// Failure-policy semantics implemented here:
// - halt: stop immediately; later seats are recorded as not-run.
// - retry-once: re-send the same exact composed prompt one time; Council
//   state does not advance between attempts. The schema does not define
//   behaviour after a failed retry, so the safest reading applies: halt.
// - skip-and-record: record the failure and continue; the failed seat's
//   output is never forwarded.
// Deterministic failures (prompt composition/budget errors) are never
// retried — recomposing against unchanged state cannot succeed — so under
// retry-once they halt after a single composition attempt.
//
// Provider readiness (when a readiness function is injected) is a pre-ask
// gate: a not-ready provider consumes no ask attempt. Under skip-and-record
// the seat is recorded as skipped; under halt or retry-once the Council
// halts (there is no ask attempt to retry).

import {
  composeStagePrompt,
  validateCouncilConfiguration,
  type CognitiveStats,
  type CouncilConfiguration,
  type CouncilContribution,
  type CouncilFailurePolicy,
  type CouncilInputPolicy,
} from '../../shared/council/index.js';
import type { ParticipantRunResponse } from './types.js';

export type CouncilAskFn = (providerId: string, prompt: string) => Promise<ParticipantRunResponse>;

export type CouncilSeatReadiness = {
  status: string;
  notes?: string[];
};

export type CouncilReadinessFn = (providerId: string) => Promise<CouncilSeatReadiness | undefined>;

export type CouncilSeatOutcome = 'pass' | 'fail' | 'skipped' | 'not-run';

// Structured composition diagnostics for one seat, captured verbatim from
// the shared composition pipeline. Pure observability: nothing here alters
// what is sent to a provider.
export type CouncilSeatComposition = {
  resolvedCognitiveStats: CognitiveStats;
  eligibleContributionIds: string[];
  memorySelectedContributionIds: string[];
  includedContributionIds: string[];
  truncatedContributionIds: string[];
  omittedContributionIds: string[];
  promptChars: number;
  totalPromptChars: number;
  perContributionCap: number;
  callingFlavourSource: 'canonical' | 'council-override';
};

export type CouncilSeatResult = {
  seat: number;
  seatCount: number;
  stageId: string;
  provider: string;
  calling: string;
  inputPolicy: CouncilInputPolicy;
  failurePolicy: CouncilFailurePolicy;
  // Exact provider-facing prompt composed for this seat, byte-identical to
  // what ask received. Absent only when no prompt was composed (not-run,
  // readiness skip, or composition failure).
  prompt?: string;
  // Number of real ask attempts sent for this seat (0 when none was sent).
  attempts: number;
  outcome: CouncilSeatOutcome;
  // Actual extracted provider response (successful seats only).
  response?: string;
  responseChars?: number;
  // Wall-clock milliseconds across all ask attempts for this seat (absent
  // when no attempt was made). Measured via the injectable clock.
  elapsedMs?: number;
  // Present whenever a prompt was composed for this seat.
  composition?: CouncilSeatComposition;
  error?: string;
  failureReason?: string;
  readinessStatus?: string;
  readinessNotes?: string[];
};

export type CouncilRunFinalResult = 'PASS' | 'PARTIAL' | 'FAIL';

export type CouncilRunResult = {
  configurationId: string;
  configurationName: string;
  doctrineId?: string;
  request: string;
  seats: CouncilSeatResult[];
  // Chronological record of real successful contributions only.
  contributions: CouncilContribution[];
  finalResult: CouncilRunFinalResult;
  // The last successful seat output. Not a synthesis and not a collective
  // verdict — merely the final contribution in chronological order.
  finalContribution?: CouncilContribution;
  haltedAtSeat?: number;
  // Honesty marker: no vote casting or tallying exists in this slice, so a
  // Crown Council run must never be reported as a collective verdict.
  voteAggregationImplemented: false;
};

export type CouncilSeatStart = {
  seat: number;
  seatCount: number;
  stageId: string;
  provider: string;
  calling: string;
  inputPolicy: CouncilInputPolicy;
  failurePolicy: CouncilFailurePolicy;
  prompt: string;
  composition: CouncilSeatComposition;
  attempt: number;
  maxAttempts: number;
};

// Fired after every real ask attempt with its individual outcome, so an
// operator surface can report a failed first attempt before the retry runs.
export type CouncilSeatAttempt = {
  seat: number;
  seatCount: number;
  stageId: string;
  provider: string;
  calling: string;
  failurePolicy: CouncilFailurePolicy;
  attempt: number;
  maxAttempts: number;
  outcome: 'pass' | 'fail';
  failureReason?: string;
  error?: string;
  elapsedMs: number;
  responseChars?: number;
  // True when this failed attempt will be followed by a retry of the same
  // seat with the same exact composed prompt.
  willRetry: boolean;
};

export type RunCouncilOptions = {
  configuration: CouncilConfiguration;
  request: string;
  ask: CouncilAskFn;
  getReadiness?: CouncilReadinessFn;
  // Injectable clock for deterministic timing in assertions.
  now?: () => number;
  // Fired once per real ask attempt, before it is sent.
  onSeatStart?: (start: CouncilSeatStart) => void;
  // Fired once per real ask attempt, after it resolves.
  onSeatAttempt?: (attempt: CouncilSeatAttempt) => void;
  onSeatResult?: (seat: CouncilSeatResult) => void;
};

type SeatAttemptFailure = {
  failureReason: string;
  error?: string;
};

function askFailure(response: ParticipantRunResponse): SeatAttemptFailure | undefined {
  if ('status' in response) {
    return {
      failureReason: response.reason ?? response.status,
      error: response.error,
    };
  }

  if (!response.answer.trim()) {
    return { failureReason: 'empty-response' };
  }

  return undefined;
}

export async function runCouncil(options: RunCouncilOptions): Promise<CouncilRunResult> {
  const { configuration, ask } = options;
  const now = options.now ?? Date.now;
  const request = options.request.trim();

  if (!request) {
    throw new Error('Council request must be a non-empty string.');
  }

  const validation = validateCouncilConfiguration(configuration);

  if (!validation.valid) {
    const issues = validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ');
    throw new Error(`Council configuration "${configuration.id}" is invalid: ${issues}`);
  }

  const seatCount = configuration.stages.length;
  const seats: CouncilSeatResult[] = [];
  const contributions: CouncilContribution[] = [];
  let haltedAtSeat: number | undefined;

  const record = (seat: CouncilSeatResult) => {
    seats.push(seat);
    options.onSeatResult?.(seat);
  };

  for (let index = 0; index < configuration.stages.length; index += 1) {
    const stage = configuration.stages[index];
    const base = {
      seat: index + 1,
      seatCount,
      stageId: stage.id,
      provider: stage.provider,
      calling: stage.calling,
      inputPolicy: stage.inputPolicy,
      failurePolicy: stage.failurePolicy,
    };

    if (haltedAtSeat !== undefined) {
      record({ ...base, attempts: 0, outcome: 'not-run' });
      continue;
    }

    if (options.getReadiness) {
      const readiness = await options.getReadiness(stage.provider);

      if (readiness?.status !== 'ready') {
        const readinessFields = {
          readinessStatus: readiness?.status ?? 'unknown',
          ...(readiness?.notes?.length ? { readinessNotes: readiness.notes } : {}),
        };

        if (stage.failurePolicy === 'skip-and-record') {
          record({
            ...base,
            attempts: 0,
            outcome: 'skipped',
            failureReason: 'provider-unavailable',
            ...readinessFields,
          });
          continue;
        }

        // halt and retry-once: no ask attempt exists to retry, so the
        // Council halts on an unavailable provider.
        haltedAtSeat = base.seat;
        record({
          ...base,
          attempts: 0,
          outcome: 'fail',
          failureReason: 'provider-unavailable',
          ...readinessFields,
        });
        continue;
      }
    }

    // Compose against real prior contributions only. Composition failures
    // (e.g. budget exceeded) are deterministic, so they are never retried.
    let prompt: string;
    let composition: CouncilSeatComposition;

    try {
      const composed = composeStagePrompt({
        configuration,
        stage,
        request,
        priorContributions: contributions,
      });

      prompt = composed.prompt;
      composition = {
        resolvedCognitiveStats: composed.resolvedCognitiveStats,
        eligibleContributionIds: composed.eligibleContributionIds,
        memorySelectedContributionIds: composed.memorySelectedContributionIds,
        includedContributionIds: composed.includedContributionIds,
        truncatedContributionIds: composed.truncatedContributionIds,
        omittedContributionIds: composed.omittedContributionIds,
        promptChars: composed.prompt.length,
        totalPromptChars: configuration.budgets.totalPromptChars,
        perContributionCap: composed.effectivePerContributionChars,
        callingFlavourSource:
          configuration.callingFlavourOverrides?.[stage.calling] !== undefined
            ? 'council-override'
            : 'canonical',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (stage.failurePolicy === 'skip-and-record') {
        record({
          ...base,
          attempts: 0,
          outcome: 'fail',
          error: message,
          failureReason: 'prompt-composition-error',
        });
        continue;
      }

      haltedAtSeat = base.seat;
      record({
        ...base,
        attempts: 0,
        outcome: 'fail',
        error: message,
        failureReason: 'prompt-composition-error',
      });
      continue;
    }

    const maxAttempts = stage.failurePolicy === 'retry-once' ? 2 : 1;
    let attempts = 0;
    let lastFailure: SeatAttemptFailure | undefined;
    let successText: string | undefined;
    const seatStartedAt = now();

    while (attempts < maxAttempts && successText === undefined) {
      attempts += 1;
      options.onSeatStart?.({ ...base, prompt, composition, attempt: attempts, maxAttempts });
      const attemptStartedAt = now();
      let attemptFailure: SeatAttemptFailure | undefined;

      try {
        const response = await ask(stage.provider, prompt);
        const failure = askFailure(response);

        if (failure) {
          attemptFailure = failure;
        } else {
          // Outer-whitespace trim only, matching the provider response
          // contract; the text itself is never rewritten.
          successText = (response as { answer: string }).answer.trim();
        }
      } catch (error) {
        attemptFailure = {
          failureReason: 'ask-error',
          error: error instanceof Error ? error.message : String(error),
        };
      }

      if (attemptFailure) {
        lastFailure = attemptFailure;
      }

      options.onSeatAttempt?.({
        seat: base.seat,
        seatCount: base.seatCount,
        stageId: base.stageId,
        provider: base.provider,
        calling: base.calling,
        failurePolicy: base.failurePolicy,
        attempt: attempts,
        maxAttempts,
        outcome: successText !== undefined ? 'pass' : 'fail',
        ...(attemptFailure ? { failureReason: attemptFailure.failureReason } : {}),
        ...(attemptFailure?.error ? { error: attemptFailure.error } : {}),
        elapsedMs: now() - attemptStartedAt,
        ...(successText !== undefined ? { responseChars: successText.length } : {}),
        willRetry: successText === undefined && attempts < maxAttempts,
      });
    }

    const elapsedMs = now() - seatStartedAt;

    if (successText !== undefined) {
      contributions.push({
        stageId: stage.id,
        provider: stage.provider,
        calling: stage.calling,
        text: successText,
      });
      record({
        ...base,
        prompt,
        composition,
        attempts,
        outcome: 'pass',
        response: successText,
        responseChars: successText.length,
        elapsedMs,
      });
      continue;
    }

    const failureFields = {
      ...(lastFailure?.error ? { error: lastFailure.error } : {}),
      failureReason: lastFailure?.failureReason ?? 'unknown',
    };

    if (stage.failurePolicy === 'skip-and-record') {
      record({ ...base, prompt, composition, attempts, outcome: 'skipped', elapsedMs, ...failureFields });
      continue;
    }

    // halt, and retry-once whose retry also failed: stop the Council.
    haltedAtSeat = base.seat;
    record({ ...base, prompt, composition, attempts, outcome: 'fail', elapsedMs, ...failureFields });
  }

  const reachedEndCleanly = haltedAtSeat === undefined;
  const everySeatPassed = seats.every((seat) => seat.outcome === 'pass');

  const finalResult: CouncilRunFinalResult = !reachedEndCleanly
    ? 'FAIL'
    : everySeatPassed
      ? 'PASS'
      : 'PARTIAL';

  const finalContribution = contributions[contributions.length - 1];

  return {
    configurationId: configuration.id,
    configurationName: configuration.name,
    ...(configuration.doctrineId ? { doctrineId: configuration.doctrineId } : {}),
    request,
    seats,
    contributions,
    finalResult,
    ...(finalContribution ? { finalContribution } : {}),
    ...(haltedAtSeat !== undefined ? { haltedAtSeat } : {}),
    voteAggregationImplemented: false,
  };
}
