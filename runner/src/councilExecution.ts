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
//
// Run-scoped provider availability: provider unavailability is a routine
// operating condition, so availability learned during a run is remembered for
// the remainder of that run (createProviderAvailabilityRegistry — never
// persisted; a new run starts empty). When `preflight` is enabled, one
// readiness pass at Council start classifies every Mind that can appear in the
// Formation as ready / unavailable / unknown; unknown remains executable. A
// Mind established unavailable (by preflight, a readiness gate, or a
// structured ask failure) is skipped on every later seat with no fresh check
// and no ask — a run-scoped circuit breaker. The effective execution chain of
// a seat is derived at runtime as the configured chain minus the run's
// unavailable Minds; the configured chain and the seat's Preferred Mind are
// never rewritten. This is strictly an availability filter layered BEFORE the
// existing per-seat failure policy: it never circuit-breaks timeouts,
// refusals, composition errors, or any non-availability failure.

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
import {
  classifyReadinessState,
  createProviderAvailabilityRegistry,
  deriveEffectiveChain,
  relevantProviders,
  type CouncilProviderAvailabilityEntry,
  type ProviderAvailabilitySource,
} from './councilAvailability.js';
import type { ParticipantRunResponse } from './types.js';

export type CouncilAskFn = (providerId: string, prompt: string) => Promise<ParticipantRunResponse>;

export type CouncilSeatReadiness = {
  status: string;
  notes?: string[];
};

export type CouncilReadinessFn = (providerId: string) => Promise<CouncilSeatReadiness | undefined>;

// How a Seat's composed prompt reaches a Mind and how the response returns.
// 'browser' is the existing Native Runner /ask path; 'api' is a direct
// provider API (initially the OpenAI Responses API). Transport is deliberately
// distinct from Mind identity: one provider family may later carry multiple
// models and multiple transports.
export type CouncilExecutionTransport = 'browser' | 'api';

// A concrete execution target: the Mind/model actually asked, plus its
// transport. For browser execution the mindId is the canonical provider id
// (e.g. 'chatgpt') so existing behaviour is unchanged; for an API target the
// mindId is a distinct execution-mind id (e.g. 'openai-gpt-4o-mini') carrying
// its provider family and model. This is narrowly scoped execution metadata —
// NOT a redesign of the canonical provider/Calling/Doctrine schema.
export type CouncilExecutionTarget = {
  mindId: string;
  providerFamily: string;
  transport: CouncilExecutionTransport;
  model?: string;
};

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
  'grok-account-or-plan-block',
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

// One provider rejected during a seat's chain walk.
//   phase 'readiness'  — a per-seat readiness check refused it; no ask sent.
//   phase 'ask'        — one real ask surfaced a structured availability
//                        failure.
//   phase 'run-scoped' — the provider was already established unavailable
//                        earlier in THIS run (preflight or an earlier seat),
//                        so it was skipped with no fresh check and no ask.
// For a run-scoped skip, `source` records where the provider was originally
// established unavailable.
export type CouncilProviderRejection = {
  provider: string;
  phase: 'readiness' | 'ask' | 'run-scoped';
  reason: string;
  error?: string;
  notes?: string[];
  elapsedMs?: number;
  source?: ProviderAvailabilitySource;
};

// Full structured provider-selection state for one seat, sufficient for a
// future Studio UI to render fallback live without parsing CLI text.
// Vocabulary: preferredProvider is the seat's bound preferred Mind;
// executedProvider is the provider that actually completed the seat (a
// fallback Mind when it differs from the preferred Mind).
export type CouncilSeatProviderSelection = {
  preferredProvider: string;
  // The seat's full configured provider chain (preferred Mind first, then the
  // ordered fallback Minds). Never mutated by run-scoped availability.
  providerChain: string[];
  // The effective execution chain at seat start: the configured chain minus
  // the providers already established unavailable for this run, preserving
  // configured order. Equal to providerChain when nothing has been learned.
  effectiveChain: string[];
  executedProvider?: string;
  fallbackUsed: boolean;
  rejectedProviders: CouncilProviderRejection[];
  chainExhausted: boolean;
  // Run-level execution override requested for this run (e.g. force every Seat
  // through the OpenAI API). Present only when an override is active; the
  // configured Preferred Mind (preferredProvider) is never falsified by it.
  executionOverride?: CouncilExecutionTarget;
  // The target that actually executed (or attempted) this Seat: the browser
  // provider under normal execution, or the override target under an override.
  executedTarget?: CouncilExecutionTarget;
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
  // Resolved requested response-size ceiling (prompt-side target; overruns
  // are diagnostic, never failures).
  resolvedMaxResponseChars: number;
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
  // True when the actual contribution length exceeds the seat's resolved
  // maxResponseChars target. Diagnostic only: the seat still passes and the
  // contribution enters Council history unchanged.
  responseTargetExceeded?: boolean;
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
  // Final run-scoped availability snapshot for every relevant Mind, in
  // Formation-first-seen order. Run-scoped only: a new run starts empty.
  providerAvailability: CouncilProviderAvailabilityEntry[];
  // The run-level execution override in force for this run, if any.
  executionOverride?: CouncilExecutionTarget;
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
  // Configured chain minus providers already unavailable for this run.
  effectiveChain: string[];
  prompt: string;
  composition: CouncilSeatComposition;
};

// Fired once at Council start, before any seat, when run-scoped preflight is
// enabled: the set of Minds that may appear anywhere in the Formation.
export type CouncilPreflightStart = {
  providers: string[];
};

// Fired per provider as availability is established: once during preflight for
// every relevant Mind, and again when a Mind transitions to unavailable during
// execution. phase 'preflight' is the start-of-run inspection; phase
// 'execution' is a dynamic transition surfaced by a readiness gate or ask.
export type CouncilProviderAvailabilityEvent = CouncilProviderAvailabilityEntry & {
  phase: 'preflight' | 'execution';
};

// Fired once after preflight completes with the full availability snapshot.
// availableCount counts Minds that are not unavailable (ready plus unknown —
// unknown remains executable); totalCount is the relevant-Mind count.
export type CouncilPreflightComplete = {
  entries: CouncilProviderAvailabilityEntry[];
  availableCount: number;
  totalCount: number;
};

// Fired when a chain provider is skipped because it was already established
// unavailable earlier in this run: no readiness check and no ask are issued.
export type CouncilProviderSkippedEvent = {
  seat: number;
  seatCount: number;
  stageId: string;
  calling: string;
  preferredProvider: string;
  providerChain: string[];
  // 1-based position of the skipped provider in the configured chain.
  choiceIndex: number;
  rejection: CouncilProviderRejection;
  nextProvider?: string;
  nextChoiceIndex?: number;
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
  // Run-scoped provider availability. When true (and getReadiness is
  // provided), one preflight readiness pass runs at Council start over the
  // Minds that may appear in the Formation, populating a run-scoped registry;
  // providers established unavailable are then skipped on every seat without a
  // fresh readiness check or ask, and per-seat readiness re-checking is
  // suppressed (the registry plus ask-phase detection govern availability).
  // When false or absent, behaviour is the legacy per-seat readiness gate.
  preflight?: boolean;
  // Run-level execution override: force every Seat to execute through this
  // single target (e.g. the OpenAI API), bypassing the Seat's normal
  // browser-provider fallback chain. Composition is unchanged — cognitive
  // stats, Calling, context, and the byte-identical composed prompt still come
  // from the Seat's configured identity; only the executing target changes.
  // The `ask` function receives this target's mindId. When absent, execution
  // walks the configured provider chain exactly as before.
  executionOverride?: CouncilExecutionTarget;
  // Injectable clock for deterministic timing in assertions.
  now?: () => number;
  // Fired once at Council start when preflight is enabled, before any seat.
  onPreflightStart?: (event: CouncilPreflightStart) => void;
  // Fired per Mind as availability is established (preflight or execution).
  onProviderAvailability?: (event: CouncilProviderAvailabilityEvent) => void;
  // Fired once after preflight completes with the full availability snapshot.
  onPreflightComplete?: (event: CouncilPreflightComplete) => void;
  // Fired when a chain provider is skipped because it is already unavailable
  // for this run (no readiness check, no ask, no retry consumed).
  onProviderSkipped?: (event: CouncilProviderSkippedEvent) => void;
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

  // Run-scoped provider availability. Created fresh per run and never
  // persisted: a provider established unavailable is remembered only for the
  // remainder of THIS run. The Council Configuration and its canonical
  // provider chains are never mutated; effective chains are derived at
  // runtime.
  const runStartedAt = now();
  const availability = createProviderAvailabilityRegistry();
  const configuredChains = configuration.stages.map((stage) => effectiveProviderChain(stage));
  // A run-level execution override forces every Seat to one target, so the
  // relevant Mind set is only that target — unrelated browser providers must
  // not be preflighted.
  const preflightMinds = options.executionOverride
    ? [options.executionOverride.mindId]
    : relevantProviders(configuredChains);
  const preflightRan = options.preflight === true && options.getReadiness !== undefined;

  // Mark a provider unavailable in the run registry and announce the
  // transition once. Preflight markings announce phase 'preflight'; every
  // other detection (readiness gate or ask failure) is an execution-time
  // transition.
  const markUnavailable = (
    provider: string,
    reason: string,
    source: ProviderAvailabilitySource,
    extra: { message?: string; notes?: string[] } = {},
    availabilityPhase: 'preflight' | 'execution' = 'execution',
  ) => {
    const evidence = {
      provider,
      reason,
      source,
      firstDetectedAtMs: now() - runStartedAt,
      ...(extra.message ? { message: extra.message } : {}),
      ...(extra.notes?.length ? { notes: extra.notes } : {}),
    };

    if (availability.markUnavailable(evidence)) {
      options.onProviderAvailability?.({ provider, state: 'unavailable', evidence, phase: availabilityPhase });
    }
  };

  if (preflightRan) {
    options.onPreflightStart?.({ providers: preflightMinds });

    for (const provider of preflightMinds) {
      const readiness = await options.getReadiness!(provider);
      const state = classifyReadinessState(readiness?.status);

      if (state === 'ready') {
        availability.markReady(provider);
        options.onProviderAvailability?.({ provider, state: 'ready', phase: 'preflight' });
      } else if (state === 'unavailable') {
        markUnavailable(
          provider,
          readiness?.status ?? 'unknown',
          'preflight',
          { ...(readiness?.notes?.length ? { notes: readiness.notes } : {}) },
          'preflight',
        );
      } else {
        availability.markUnknown(provider);
        options.onProviderAvailability?.({ provider, state: 'unknown', phase: 'preflight' });
      }
    }

    const entries = availability.snapshot(preflightMinds);
    options.onPreflightComplete?.({
      entries,
      availableCount: entries.filter((entry) => entry.state !== 'unavailable').length,
      totalCount: entries.length,
    });
  }

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
        resolvedMaxResponseChars: composed.resolvedMaxResponseChars,
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

    // The Seat's configured provider chain (Preferred Mind + fallbacks). Never
    // mutated; recorded verbatim for reporting.
    const providerChain = effectiveProviderChain(stage);
    // The chain actually walked for execution. Normally the configured chain
    // mapped to browser targets; under a run-level execution override it is a
    // single forced target and the configured fallback chain is NOT walked.
    const executionSteps: Array<{ askId: string; target: CouncilExecutionTarget }> = options.executionOverride
      ? [{ askId: options.executionOverride.mindId, target: options.executionOverride }]
      : providerChain.map((id) => ({
          askId: id,
          target: { mindId: id, providerFamily: id, transport: 'browser' as const },
        }));
    const walkChain = executionSteps.map((step) => step.askId);
    // Effective chain at seat start: the walked chain minus Minds already
    // established unavailable for this run. Purely derived.
    const effectiveChain = deriveEffectiveChain(walkChain, availability);
    const rejectedProviders: CouncilProviderRejection[] = [];
    const maxAttempts = stage.failurePolicy === 'retry-once' ? 2 : 1;
    let attempts = 0;
    let executedProvider: string | undefined;
    let executedTarget: CouncilExecutionTarget | undefined;
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
      providerChain: walkChain,
      effectiveChain,
      prompt,
      composition,
    });

    for (let choice = 0; choice < executionSteps.length && successText === undefined; choice += 1) {
      const step = executionSteps[choice];
      const candidate = step.askId;
      const nextProvider = executionSteps[choice + 1]?.askId;

      const rejectCandidate = (rejection: CouncilProviderRejection) => {
        rejectedProviders.push(rejection);
        options.onProviderRejected?.({
          seat: base.seat,
          seatCount: base.seatCount,
          stageId: base.stageId,
          calling: base.calling,
          preferredProvider: stage.provider,
          providerChain: walkChain,
          choiceIndex: choice + 1,
          rejection,
          ...(nextProvider !== undefined ? { nextProvider, nextChoiceIndex: choice + 2 } : {}),
        });
      };

      // Run-scoped circuit breaker: a Mind already established unavailable
      // earlier in this run is skipped with no fresh readiness check and no
      // ask — it consumes no retry budget and forwards nothing.
      if (availability.isUnavailable(candidate)) {
        const evidence = availability.evidenceFor(candidate);
        const rejection: CouncilProviderRejection = {
          provider: candidate,
          phase: 'run-scoped',
          reason: evidence?.reason ?? 'provider-unavailable',
          ...(evidence?.source ? { source: evidence.source } : {}),
          ...(evidence?.notes?.length ? { notes: evidence.notes } : {}),
        };
        rejectedProviders.push(rejection);
        options.onProviderSkipped?.({
          seat: base.seat,
          seatCount: base.seatCount,
          stageId: base.stageId,
          calling: base.calling,
          preferredProvider: stage.provider,
          providerChain: walkChain,
          choiceIndex: choice + 1,
          rejection,
          ...(nextProvider !== undefined ? { nextProvider, nextChoiceIndex: choice + 2 } : {}),
        });
        continue;
      }

      // Legacy per-seat readiness gate. Suppressed once run-scoped preflight
      // has run: preflight already established availability, unknown Minds
      // remain executable (the first ask establishes their state), and
      // re-checking a Mind already known ready is wasteful. A readiness
      // rejection also circuit-breaks the Mind for the rest of the run.
      if (!preflightRan && options.getReadiness) {
        const readiness = await options.getReadiness(candidate);

        if (readiness?.status !== 'ready') {
          const reason = readiness?.status ?? 'unknown';
          markUnavailable(candidate, reason, 'readiness', {
            ...(readiness?.notes?.length ? { notes: readiness.notes } : {}),
          });
          rejectCandidate({
            provider: candidate,
            phase: 'readiness',
            reason,
            ...(readiness?.notes?.length ? { notes: readiness.notes } : {}),
          });
          continue;
        }

        availability.markReady(candidate);
      }

      // This candidate executes the seat. Availability rejections above
      // consumed no retry budget; normal attempt/failure-policy semantics
      // now apply to this target with the same exact composed prompt.
      executedProvider = candidate;
      executedTarget = step.target;
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
          providerChain: walkChain,
          choiceIndex: choice + 1,
          fallbackUsed: options.executionOverride ? false : candidate !== stage.provider,
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
          // no retry budget and the chain advances with the same prompt. It
          // also circuit-breaks the Mind for the rest of the run, so later
          // seats skip it without another ask.
          markUnavailable(candidate, attemptFailure.failureReason, 'ask', {
            ...(attemptFailure.error ? { message: attemptFailure.error } : {}),
          });
          rejectCandidate({
            provider: candidate,
            phase: 'ask',
            reason: attemptFailure.failureReason,
            ...(attemptFailure.error ? { error: attemptFailure.error } : {}),
            elapsedMs: attemptElapsedMs,
          });
          executedProvider = undefined;
          executedTarget = undefined;
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
      effectiveChain,
      ...(executedProvider !== undefined ? { executedProvider } : {}),
      // Under an execution override the executing target is not a "fallback":
      // it is a forced run-level override, reported separately.
      fallbackUsed: options.executionOverride
        ? false
        : executedProvider !== undefined && executedProvider !== stage.provider,
      rejectedProviders,
      chainExhausted,
      ...(options.executionOverride ? { executionOverride: options.executionOverride } : {}),
      ...(executedTarget !== undefined ? { executedTarget } : {}),
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
        responseTargetExceeded: successText.length > composition.resolvedMaxResponseChars,
        elapsedMs,
      });
      continue;
    }

    if (chainExhausted) {
      // Every configured provider choice was unavailable. Compatibility:
      // readinessStatus reflects the preferred provider's rejection when it
      // was refused before any ask — a per-seat readiness gate, or a
      // run-scoped skip that originated from preflight/readiness.
      const preferredRejection = rejectedProviders[0];
      const readinessLike =
        preferredRejection?.phase === 'readiness' ||
        (preferredRejection?.phase === 'run-scoped' &&
          (preferredRejection.source === 'preflight' || preferredRejection.source === 'readiness'));
      const readinessFields = readinessLike
        ? {
            readinessStatus: preferredRejection!.reason,
            ...(preferredRejection!.notes?.length ? { readinessNotes: preferredRejection!.notes } : {}),
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
    providerAvailability: availability.snapshot(preflightMinds),
    ...(options.executionOverride ? { executionOverride: options.executionOverride } : {}),
    voteAggregationImplemented: false,
  };
}
