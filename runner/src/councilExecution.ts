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
// Provider fallback: a seat is a stable positional identity that owns its
// Calling, its preferred Mind (stage.provider), its cognitive overrides,
// and its fallback preferences. The preferred Mind is bound seat state but
// is not guaranteed to be the executing provider: the fallback chain
// (effectiveProviderChain: preferred Mind first, then the ordered fallback
// Minds) lists the alternates permitted to execute the same unchanged seat.
// The prompt is composed exactly once per seat — with cognitive stats
// resolved from the PREFERRED Mind, preserving the seat's identity — and
// provider unavailability walks the chain, sending that byte-identical
// prompt to the next Mind. Fallback is strictly limited to structured
// provider-availability conditions: any non-ready readiness status, or an
// ask failure whose category is in providerUnavailableAskReasons. All other
// failures (composition errors, timeouts, refusals, empty extractions,
// transport errors) belong to the seat's failure policy and are never
// disguised by fallback.
//
// Fallback and failure policy ordering: availability rejections consume no
// retry budget; once a provider actually executes the seat (readiness ok
// and its ask fails for a non-availability reason, or succeeds), normal
// seat attempt semantics apply to that executing provider — retry-once
// retries the same provider with the same prompt, and a non-availability
// failure never advances the chain. If an ask fails with a structured
// availability category (e.g. a usage limit hit after the readiness
// snapshot), the chain advances exactly as a readiness rejection would.
// An exhausted chain (every provider unavailable) is recorded with
// failureReason 'provider-unavailable': under skip-and-record the seat is
// skipped; under halt or retry-once the Council halts (there is no
// available provider to retry).

import {
  composeStagePrompt,
  effectiveProviderChain,
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

// Structured provider-availability categories that make an ask failure
// fallback-eligible. Deliberately narrow and explicit: drivers introducing
// a new availability category must add it here — fallback must never become
// a generic "try another AI whenever anything breaks" mechanism.
export const providerUnavailableAskReasons: ReadonlySet<string> = new Set([
  // Readiness vocabulary that can also surface as ask failure categories.
  'provider-blocked',
  'logged-out',
  'security-verification',
  'unsupported-browser-login',
  'driver-not-implemented',
  // Structured driver availability categories observed live.
  'grok-capacity-error',
  'grok-rate-limited',
  // Generic availability categories reserved for provider drivers.
  'provider-unavailable',
  'account-restricted',
  'usage-limit',
  'rate-limited',
  'session-unavailable',
]);

export function isProviderUnavailabilityReason(reason: string | undefined): boolean {
  return reason !== undefined && providerUnavailableAskReasons.has(reason);
}

// One provider rejected during a seat's chain walk. phase 'readiness' means
// no ask was sent to it; phase 'ask' means one real ask surfaced a
// structured availability failure.
export type CouncilProviderRejection = {
  provider: string;
  phase: 'readiness' | 'ask';
  reason: string;
  error?: string;
  notes?: string[];
  elapsedMs?: number;
};

// Full structured provider-selection state for one seat, sufficient for a
// future Studio UI to render fallback live without parsing CLI text.
// Vocabulary: preferredProvider is the seat's bound preferred Mind;
// executedProvider is the provider that actually completed the seat (a
// fallback Mind when it differs from the preferred Mind).
export type CouncilSeatProviderSelection = {
  preferredProvider: string;
  providerChain: string[];
  executedProvider?: string;
  fallbackUsed: boolean;
  rejectedProviders: CouncilProviderRejection[];
  chainExhausted: boolean;
};

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
  // Provider-selection state: preferred provider, the effective chain,
  // rejections, the executing provider, and whether the chain was
  // exhausted. Present for every seat that reached provider selection.
  providerSelection?: CouncilSeatProviderSelection;
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

// Fired exactly once per seat after successful prompt composition, before
// any provider is checked: the seat block for operator surfaces.
export type CouncilSeatBegin = {
  seat: number;
  seatCount: number;
  stageId: string;
  calling: string;
  inputPolicy: CouncilInputPolicy;
  failurePolicy: CouncilFailurePolicy;
  preferredProvider: string;
  providerChain: string[];
  prompt: string;
  composition: CouncilSeatComposition;
};

// Fired when a provider in the seat's chain is rejected as unavailable
// (readiness phase or structured ask-availability failure).
export type CouncilProviderRejectedEvent = {
  seat: number;
  seatCount: number;
  stageId: string;
  calling: string;
  preferredProvider: string;
  providerChain: string[];
  // 1-based position of the rejected provider in the chain.
  choiceIndex: number;
  rejection: CouncilProviderRejection;
  nextProvider?: string;
  nextChoiceIndex?: number;
};

export type CouncilSeatStart = {
  seat: number;
  seatCount: number;
  stageId: string;
  // The provider this ask is being sent to (the executing candidate).
  provider: string;
  preferredProvider: string;
  providerChain: string[];
  // 1-based position of the executing provider in the chain.
  choiceIndex: number;
  fallbackUsed: boolean;
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
  // Fired once per seat after composition, before provider selection.
  onSeatBegin?: (begin: CouncilSeatBegin) => void;
  // Fired when a chain provider is rejected as unavailable.
  onProviderRejected?: (event: CouncilProviderRejectedEvent) => void;
  // Fired once per real ask attempt on the executing provider, before it is
  // sent. (Asks that end in a structured availability rejection fire
  // onProviderRejected instead of onSeatAttempt.)
  onSeatStart?: (start: CouncilSeatStart) => void;
  // Fired once per executing-provider ask attempt, after it resolves.
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

    // Compose exactly once per seat, before provider selection: the prompt
    // belongs to the seat (Calling framing, cognitive stats resolved from
    // the PREFERRED provider, context, budgets) and is reused byte-identical
    // by any fallback provider. Composition failures are deterministic
    // Maestriss failures — never retried and never disguised by fallback.
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

    const providerChain = effectiveProviderChain(stage);
    const rejectedProviders: CouncilProviderRejection[] = [];
    const maxAttempts = stage.failurePolicy === 'retry-once' ? 2 : 1;
    let attempts = 0;
    let executedProvider: string | undefined;
    let lastFailure: SeatAttemptFailure | undefined;
    let successText: string | undefined;
    const seatStartedAt = now();

    options.onSeatBegin?.({
      seat: base.seat,
      seatCount: base.seatCount,
      stageId: base.stageId,
      calling: base.calling,
      inputPolicy: base.inputPolicy,
      failurePolicy: base.failurePolicy,
      preferredProvider: stage.provider,
      providerChain,
      prompt,
      composition,
    });

    for (let choice = 0; choice < providerChain.length && successText === undefined; choice += 1) {
      const candidate = providerChain[choice];
      const nextProvider = providerChain[choice + 1];

      const rejectCandidate = (rejection: CouncilProviderRejection) => {
        rejectedProviders.push(rejection);
        options.onProviderRejected?.({
          seat: base.seat,
          seatCount: base.seatCount,
          stageId: base.stageId,
          calling: base.calling,
          preferredProvider: stage.provider,
          providerChain,
          choiceIndex: choice + 1,
          rejection,
          ...(nextProvider !== undefined ? { nextProvider, nextChoiceIndex: choice + 2 } : {}),
        });
      };

      if (options.getReadiness) {
        const readiness = await options.getReadiness(candidate);

        if (readiness?.status !== 'ready') {
          rejectCandidate({
            provider: candidate,
            phase: 'readiness',
            reason: readiness?.status ?? 'unknown',
            ...(readiness?.notes?.length ? { notes: readiness.notes } : {}),
          });
          continue;
        }
      }

      // This candidate executes the seat. Availability rejections above
      // consumed no retry budget; normal attempt/failure-policy semantics
      // now apply to this provider with the same exact composed prompt.
      executedProvider = candidate;
      lastFailure = undefined;
      let providerAttempts = 0;
      let availabilityRejection = false;

      while (providerAttempts < maxAttempts && successText === undefined) {
        providerAttempts += 1;
        attempts += 1;
        options.onSeatStart?.({
          ...base,
          provider: candidate,
          preferredProvider: stage.provider,
          providerChain,
          choiceIndex: choice + 1,
          fallbackUsed: candidate !== stage.provider,
          prompt,
          composition,
          attempt: providerAttempts,
          maxAttempts,
        });
        const attemptStartedAt = now();
        let attemptFailure: SeatAttemptFailure | undefined;

        try {
          const response = await ask(candidate, prompt);
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

        const attemptElapsedMs = now() - attemptStartedAt;

        if (attemptFailure && isProviderUnavailabilityReason(attemptFailure.failureReason)) {
          // The ask itself surfaced a structured availability failure
          // (e.g. a usage limit hit after the readiness snapshot). This is
          // a provider rejection, not a seat execution failure: it consumes
          // no retry budget and the chain advances with the same prompt.
          rejectCandidate({
            provider: candidate,
            phase: 'ask',
            reason: attemptFailure.failureReason,
            ...(attemptFailure.error ? { error: attemptFailure.error } : {}),
            elapsedMs: attemptElapsedMs,
          });
          executedProvider = undefined;
          availabilityRejection = true;
          break;
        }

        if (attemptFailure) {
          lastFailure = attemptFailure;
        }

        options.onSeatAttempt?.({
          seat: base.seat,
          seatCount: base.seatCount,
          stageId: base.stageId,
          provider: candidate,
          calling: base.calling,
          failurePolicy: base.failurePolicy,
          attempt: providerAttempts,
          maxAttempts,
          outcome: successText !== undefined ? 'pass' : 'fail',
          ...(attemptFailure ? { failureReason: attemptFailure.failureReason } : {}),
          ...(attemptFailure?.error ? { error: attemptFailure.error } : {}),
          elapsedMs: attemptElapsedMs,
          ...(successText !== undefined ? { responseChars: successText.length } : {}),
          willRetry: successText === undefined && providerAttempts < maxAttempts,
        });
      }

      if (successText === undefined && !availabilityRejection) {
        // A real execution failure on the executing provider: the seat's
        // failure policy owns it. Fallback never disguises non-availability
        // failures, so the chain does not advance.
        break;
      }
    }

    const elapsedMs = now() - seatStartedAt;
    const chainExhausted = successText === undefined && executedProvider === undefined;
    const providerSelection: CouncilSeatProviderSelection = {
      preferredProvider: stage.provider,
      providerChain,
      ...(executedProvider !== undefined ? { executedProvider } : {}),
      fallbackUsed: executedProvider !== undefined && executedProvider !== stage.provider,
      rejectedProviders,
      chainExhausted,
    };

    if (successText !== undefined) {
      // The contribution is attributed to the provider that actually
      // produced it.
      contributions.push({
        stageId: stage.id,
        provider: executedProvider ?? stage.provider,
        calling: stage.calling,
        text: successText,
      });
      record({
        ...base,
        prompt,
        composition,
        providerSelection,
        attempts,
        outcome: 'pass',
        response: successText,
        responseChars: successText.length,
        elapsedMs,
      });
      continue;
    }

    if (chainExhausted) {
      // Every configured provider choice was unavailable. Compatibility:
      // readinessStatus reflects the preferred provider's readiness
      // rejection when that is how it was rejected.
      const preferredRejection = rejectedProviders[0];
      const readinessFields = preferredRejection?.phase === 'readiness'
        ? {
            readinessStatus: preferredRejection.reason,
            ...(preferredRejection.notes?.length ? { readinessNotes: preferredRejection.notes } : {}),
          }
        : {};
      const exhaustionFields = {
        prompt,
        composition,
        providerSelection,
        attempts,
        failureReason: 'provider-unavailable',
        elapsedMs,
        ...readinessFields,
      };

      if (stage.failurePolicy === 'skip-and-record') {
        record({ ...base, ...exhaustionFields, outcome: 'skipped' });
        continue;
      }

      // halt and retry-once: an exhausted provider chain leaves no
      // available provider to retry, so the Council halts.
      haltedAtSeat = base.seat;
      record({ ...base, ...exhaustionFields, outcome: 'fail' });
      continue;
    }

    const failureFields = {
      ...(lastFailure?.error ? { error: lastFailure.error } : {}),
      failureReason: lastFailure?.failureReason ?? 'unknown',
    };

    if (stage.failurePolicy === 'skip-and-record') {
      record({ ...base, prompt, composition, providerSelection, attempts, outcome: 'skipped', elapsedMs, ...failureFields });
      continue;
    }

    // halt, and retry-once whose retry also failed: stop the Council.
    haltedAtSeat = base.seat;
    record({ ...base, prompt, composition, providerSelection, attempts, outcome: 'fail', elapsedMs, ...failureFields });
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
