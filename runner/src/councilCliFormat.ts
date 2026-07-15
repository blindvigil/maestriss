// Council CLI operator output: formatting and run reporting.
//
// This module renders the high-level orchestration view for live Council
// runs (Terminal 2). Everything is derived from structured execution records
// — CouncilSeatStart/Attempt/Result and CouncilSeatComposition — never by
// parsing provider-facing prompt text, so a future Studio UI can consume the
// same records. All functions are pure apart from the injected print/clock,
// which keeps the output deterministically assertable.
//
// Low-level provider lifecycle diagnostics (page resolution, composer
// discovery, submission evidence, candidate rejection) deliberately stay in
// the Runner service output (Terminal 1) and are not duplicated here.

import {
  cognitiveStatKeys,
  describeCognitiveLevel,
  getCouncilCalling,
  getCouncilProvider,
  renderCognitiveGuidance,
  type CouncilConfiguration,
  type CouncilInputPolicy,
} from '../../shared/council/index.js';
import type {
  CouncilExecutionTarget,
  CouncilPreflightComplete,
  CouncilPreflightStart,
  CouncilProviderAvailabilityEvent,
  CouncilProviderRejectedEvent,
  CouncilProviderSkippedEvent,
  CouncilRunResult,
  CouncilSeatAttempt,
  CouncilSeatBegin,
  CouncilSeatComposition,
  CouncilSeatResult,
  CouncilSeatStart,
} from './councilExecution.js';
import type { ProviderAvailabilityState } from './councilAvailability.js';

const heavyRule = '='.repeat(60);
const lightRule = '-'.repeat(60);

export function formatChars(count: number): string {
  return count.toLocaleString('en-US');
}

// Deterministic FNV-1a 32-bit identity of a composed prompt: a cheap
// diagnostic proving the exact same prompt is reused across retries and
// provider fallbacks. Not cryptographic; display metadata only.
export function promptIdentity(prompt: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < prompt.length; index += 1) {
    hash ^= prompt.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash.toString(16).padStart(8, '0');
}

export function formatClock(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mmss = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return hours > 0 ? `${hours}:${mmss}` : mmss;
}

export function formatSeconds(elapsedMs: number): string {
  return `${(elapsedMs / 1000).toFixed(1)} s`;
}

export function callingTitle(callingId: string): string {
  return getCouncilCalling(callingId)?.fantasyTitle ?? callingId;
}

export function callingPracticalTitle(callingId: string): string {
  return getCouncilCalling(callingId)?.practicalTitle ?? callingId;
}

export function providerDisplayName(providerId: string): string {
  return getCouncilProvider(providerId)?.displayName ?? providerId;
}

export function seatLabel(callingId: string, providerId: string): string {
  return `${callingTitle(callingId)} / ${providerDisplayName(providerId)}`;
}

// CLI display text only: these explanations never reach a provider and do
// not alter canonical prompt composition.
export function describeInputPolicy(policy: CouncilInputPolicy, n?: number): string {
  switch (policy) {
    case 'original-only':
      return 'Original request only; no prior Council contributions are eligible.';
    case 'previous-only':
      return 'Only the immediately previous successful contribution is eligible.';
    case 'previous-plus-original':
      return 'Original request plus the immediately previous successful contribution.';
    case 'last-n':
      return `Original request plus up to the latest ${n ?? 'N'} eligible contributions.`;
    case 'full-record':
      return 'Original request plus the full prior Council record, subject to Memory and prompt budgets.';
    case 'independent-round':
      return 'Independent judgment from the original request; prior Council contributions are excluded.';
  }
}

type ContributionDisplayInfo = {
  seat: number;
  calling: string;
  provider: string;
  chars: number;
};

type ReporterCounters = {
  passed: number;
  skipped: number;
  failed: number;
  processed: number;
};

export type CouncilRunReporterOptions = {
  doctrine: { fantasyTitle: string; practicalTitle: string };
  configuration: CouncilConfiguration;
  requestChars: number;
  verbose: boolean;
  print: (line: string) => void;
  now?: () => number;
  // Run-level execution override in force for this run, if any. When set, the
  // reporter renders the execution path (Mind/model/transport) and keeps the
  // configured Preferred Mind visible without falsifying it.
  executionOverride?: CouncilExecutionTarget;
};

// Human-readable label for an execution target: an API target shows its
// family and model; a browser target shows the canonical provider name.
export function executionTargetLabel(target: CouncilExecutionTarget): string {
  if (target.transport === 'api') {
    const familyLabel = target.providerFamily === 'openai'
      ? 'OpenAI'
      : providerDisplayName(target.providerFamily);
    return `${familyLabel} API (${target.model ?? target.mindId})`;
  }

  return providerDisplayName(target.mindId);
}

function providerFamilyLabel(providerFamily: string): string {
  return providerFamily === 'openai' ? 'OpenAI' : providerDisplayName(providerFamily);
}

export type CouncilRunReporter = {
  start: () => void;
  // Run-scoped availability preflight surface (no-ops when preflight is off).
  onPreflightStart: (event: CouncilPreflightStart) => void;
  onProviderAvailability: (event: CouncilProviderAvailabilityEvent) => void;
  onPreflightComplete: (event: CouncilPreflightComplete) => void;
  onSeatBegin: (begin: CouncilSeatBegin) => void;
  onProviderRejected: (event: CouncilProviderRejectedEvent) => void;
  // A chain Mind skipped because it is already unavailable for this run.
  onProviderSkipped: (event: CouncilProviderSkippedEvent) => void;
  onSeatStart: (start: CouncilSeatStart) => void;
  onSeatAttempt: (attempt: CouncilSeatAttempt) => void;
  onSeatResult: (seat: CouncilSeatResult) => void;
  finish: (result: CouncilRunResult) => void;
  // Prints one elapsed-time heartbeat line if an ask is currently active;
  // prints nothing otherwise. Driven by an external interval.
  heartbeatTick: () => void;
};

// CLI markers for run availability states.
function availabilityMarker(state: ProviderAvailabilityState): string {
  return state === 'ready' ? '✓' : state === 'unavailable' ? '⚠' : '?';
}

export function createCouncilRunReporter(options: CouncilRunReporterOptions): CouncilRunReporter {
  const { configuration, doctrine, print, verbose } = options;
  const executionOverride = options.executionOverride;
  const now = options.now ?? Date.now;
  const seatCount = configuration.stages.length;
  // Display label for an execution-mind id: an active API override target
  // renders its family/model; every other id resolves as a provider name.
  const mindDisplayName = (mindId: string): string =>
    executionOverride && mindId === executionOverride.mindId
      ? executionTargetLabel(executionOverride)
      : providerDisplayName(mindId);
  const contributionInfo = new Map<string, ContributionDisplayInfo>();
  const counters: ReporterCounters = { passed: 0, skipped: 0, failed: 0, processed: 0 };
  // Run-scoped availability accumulated from preflight and execution events,
  // so per-seat rendering can explain the effective chain without re-probing.
  const availabilityByProvider = new Map<string, { state: ProviderAvailabilityState; reason?: string }>();
  let runStartedAt = 0;
  let activeAsk: { provider: string; startedAt: number } | undefined;
  let seatHeaderPrinted = false;
  let seatPromptIdentity = '';
  let seatMaxResponseChars: number | undefined;

  const contributionLine = (marker: string, stageId: string) => {
    const info = contributionInfo.get(stageId);

    if (!info) {
      return `  ${marker} ${stageId}`;
    }

    return `  ${marker} Seat ${info.seat} — ${seatLabel(info.calling, info.provider)} — ${formatChars(info.chars)} chars`;
  };

  const printContextFlow = (composition: CouncilSeatComposition) => {
    const memorySelected = new Set(composition.memorySelectedContributionIds);
    const memoryExcluded = composition.eligibleContributionIds.filter((id) => !memorySelected.has(id));

    print(`Eligible prior contributions: ${composition.eligibleContributionIds.length}`);
    print(`Memory-selected contributions: ${composition.memorySelectedContributionIds.length}`);
    print(`Included after prompt budget: ${composition.includedContributionIds.length}`);
    print('');
    print('Context carried forward:');

    if (composition.includedContributionIds.length === 0) {
      print('  (none — this seat works from the original request only)');
    } else {
      for (const stageId of composition.includedContributionIds) {
        print(contributionLine('✓', stageId));
      }
    }

    if (memoryExcluded.length > 0) {
      print('Memory excluded:');
      for (const stageId of memoryExcluded) {
        print(contributionLine('○', stageId));
      }
    }

    if (composition.omittedContributionIds.length > 0) {
      print('Prompt budget omitted:');
      for (const stageId of composition.omittedContributionIds) {
        print(contributionLine('○', stageId));
      }
    }

    if (composition.truncatedContributionIds.length > 0) {
      print('Prompt contribution truncated:');
      for (const stageId of composition.truncatedContributionIds) {
        print(contributionLine('!', stageId));
        const info = contributionInfo.get(stageId);

        if (info) {
          print(`    Original: ${formatChars(info.chars)} chars`);
        }

        print(`    Included cap: ${formatChars(composition.perContributionCap)} chars`);
      }
    }
  };

  const printCognitiveStats = (composition: CouncilSeatComposition) => {
    print('Resolved cognitive stats:');

    for (const stat of cognitiveStatKeys) {
      const level = composition.resolvedCognitiveStats[stat];
      const label = stat.charAt(0).toUpperCase() + stat.slice(1);
      print(`  ${label}: ${level} — ${describeCognitiveLevel(stat, level)}`);
    }
  };

  const printVerboseDiagnostics = (source: { prompt: string; composition: CouncilSeatComposition }) => {
    const { composition } = source;
    const ids = (list: string[]) => (list.length > 0 ? list.join(', ') : '(none)');
    const guidance = renderCognitiveGuidance(composition.resolvedCognitiveStats);

    print('');
    print('--- COUNCIL COMPOSITION DIAGNOSTICS ---');
    print(`Calling flavour source: ${composition.callingFlavourSource}`);
    print(`Eligible contribution ids: ${ids(composition.eligibleContributionIds)}`);
    print(`Memory-selected contribution ids: ${ids(composition.memorySelectedContributionIds)}`);
    print(`Included contribution ids: ${ids(composition.includedContributionIds)}`);
    print(`Truncated contribution ids: ${ids(composition.truncatedContributionIds)}`);
    print(`Omitted contribution ids: ${ids(composition.omittedContributionIds)}`);
    print(`Prompt budget: ${formatChars(composition.promptChars)} / ${formatChars(composition.totalPromptChars)} chars`);
    print(`Per-contribution cap: ${formatChars(composition.perContributionCap)} chars`);
    print(`Resolved max response chars: ${composition.resolvedMaxResponseChars}`);
    print('Resolved cognitive instructions:');
    print(guidance || '(none — all prose stats are neutral)');
    print('--- END COUNCIL COMPOSITION DIAGNOSTICS ---');
    print('');
    print('--- provider-facing prompt ---');
    print(source.prompt);
    print('--- end provider-facing prompt ---');
  };

  const printRunningSummary = () => {
    print(
      `Council progress: ${counters.processed}/${seatCount} seats processed | ` +
      `${counters.passed} passed | ${counters.skipped} skipped | ${counters.failed} failed | ` +
      `elapsed ${formatClock(now() - runStartedAt)}`,
    );
  };

  const printNextSeat = (completedSeat: number) => {
    const nextStage = configuration.stages[completedSeat];

    if (!nextStage) {
      return;
    }

    print('');
    print(`Next: Seat ${completedSeat + 1} of ${seatCount} — ${seatLabel(nextStage.calling, nextStage.provider)}`);
  };

  const printFailureDecision = (failurePolicy: string, willRetry: boolean) => {
    print('');
    print(`Failure policy: ${failurePolicy}`);

    if (willRetry) {
      print('Decision: RETRYING SAME SEAT');
      print('The exact same composed prompt will be used.');
      print('No Council contribution has been recorded.');
      return;
    }

    if (failurePolicy === 'skip-and-record') {
      print('Decision: SKIPPING SEAT');
      print('No contribution recorded.');
      print('Later seats will receive only successful prior contributions.');
      return;
    }

    print('Decision: HALTING COUNCIL');
    print('Successful prior contributions are preserved.');
    print('No later seats will execute.');
  };

  return {
    start: () => {
      runStartedAt = now();
      const titleWidth = Math.max(
        ...configuration.stages.map((stage) => callingTitle(stage.calling).length),
      );

      print(heavyRule);
      print('MAESTRISS COUNCIL');
      print(heavyRule);
      print('');
      print(`Doctrine: ${doctrine.fantasyTitle}`);
      print(`Purpose: ${doctrine.practicalTitle}`);
      print(`Party size: ${seatCount}`);
      print(`Original request: ${formatChars(options.requestChars)} chars`);
      print('Failure mode: Formation-defined per seat');
      print(`Started: ${new Date(runStartedAt).toLocaleTimeString()}`);
      print('');
      print('Formation:');
      configuration.stages.forEach((stage, index) => {
        print(`  ${index + 1}. ${callingTitle(stage.calling).padEnd(titleWidth)} — ${providerDisplayName(stage.provider)}`);
      });

      if (executionOverride) {
        print('');
        print('RUN EXECUTION OVERRIDE');
        print(`Mind: ${executionTargetLabel(executionOverride)}`);
        print(`Provider family: ${providerFamilyLabel(executionOverride.providerFamily)}`);

        if (executionOverride.model) {
          print(`Model: ${executionOverride.model}`);
        }

        print(`Transport: ${executionOverride.transport.toUpperCase()}`);
        print('');
        print('All Formation Seats retain their canonical Callings and cognitive configuration.');
        print('Canonical Preferred Minds are not mutated.');
        print('Normal provider fallback chains are bypassed for this run.');
      }

      print('');
      print(heavyRule);
    },

    onPreflightStart: (event) => {
      print('');
      print('CHECKING MINDS...');
      print(`Inspecting ${event.providers.length} Mind${event.providers.length === 1 ? '' : 's'} that may serve in this Council.`);
    },

    onProviderAvailability: (event) => {
      const reason = event.state === 'unavailable' ? event.evidence?.reason : undefined;
      availabilityByProvider.set(event.provider, { state: event.state, ...(reason ? { reason } : {}) });

      // Live per-Mind line during preflight only; execution transitions are
      // narrated by the seat-level rejection output.
      if (event.phase !== 'preflight') {
        return;
      }

      const name = mindDisplayName(event.provider);
      const detail = event.state === 'ready'
        ? 'ready'
        : event.state === 'unavailable'
          ? event.evidence?.reason ?? 'unavailable'
          : 'unknown';
      print(`${availabilityMarker(event.state)} ${name} — ${detail}`);
    },

    onPreflightComplete: (event) => {
      const group = (state: ProviderAvailabilityState) =>
        event.entries.filter((entry) => entry.state === state);
      const ready = group('ready');
      const unavailable = group('unavailable');
      const unknown = group('unknown');

      print('');
      print('Mind availability:');

      if (ready.length > 0) {
        print('');
        print('  READY');
        ready.forEach((entry) => print(`  ${availabilityMarker('ready')} ${mindDisplayName(entry.provider)}`));
      }

      if (unavailable.length > 0) {
        print('');
        print('  UNAVAILABLE');
        unavailable.forEach((entry) =>
          print(`  ${availabilityMarker('unavailable')} ${mindDisplayName(entry.provider)} — ${entry.evidence?.reason ?? 'unavailable'}`),
        );
      }

      if (unknown.length > 0) {
        print('');
        print('  UNKNOWN');
        unknown.forEach((entry) =>
          print(`  ${availabilityMarker('unknown')} ${mindDisplayName(entry.provider)} — state not established; still eligible`),
        );
      }

      print('');
      print(`Available Minds: ${event.availableCount} of ${event.totalCount}`);

      if (unavailable.length > 0) {
        print('Unavailable Minds are skipped for the rest of this run; the saved Council and its provider chains are unchanged.');
      }

      print('');
      print(heavyRule);
    },

    onSeatBegin: (begin) => {
      seatHeaderPrinted = true;
      seatPromptIdentity = promptIdentity(begin.prompt);
      seatMaxResponseChars = begin.composition.resolvedMaxResponseChars;
      const { composition } = begin;

      print('');
      print(lightRule);
      print(`SEAT ${begin.seat} OF ${begin.seatCount} — ${callingTitle(begin.calling).toUpperCase()}`);

      // Under a run-level execution override every Seat is forced to the
      // override target. Show the execution path while keeping the configured
      // Preferred Mind visible (never rewritten); skip the normal
      // configured-vs-effective chain rendering, which does not apply.
      if (executionOverride) {
        print(`Configured Preferred Mind: ${providerDisplayName(begin.preferredProvider)}`);
        print(`Execution override: ${executionTargetLabel(executionOverride)}`);
        print(`Provider family: ${providerFamilyLabel(executionOverride.providerFamily)}`);

        if (executionOverride.model) {
          print(`Model: ${executionOverride.model}`);
        }

        print(`Transport: ${executionOverride.transport.toUpperCase()}`);
        print(`Resolved max response chars: ${begin.composition.resolvedMaxResponseChars}`);
        print(`Calling: ${callingPracticalTitle(begin.calling)}`);
        print(`Stage id: ${begin.stageId}`);
        print('');
        print(`Input policy: ${begin.inputPolicy}`);
        print(`  ${describeInputPolicy(begin.inputPolicy, configuration.stages[begin.seat - 1]?.inputPolicyN)}`);
        print('');
        printContextFlow(composition);
        print('');
        printCognitiveStats(composition);
        print('');
        print(`Prompt length: ${formatChars(composition.promptChars)} chars`);
        print(`Max response length: ${formatChars(composition.resolvedMaxResponseChars)} chars`);
        print(`Calling flavour: ${composition.callingFlavourSource}`);
        print(`Failure policy: ${begin.failurePolicy}`);
        print('');
        print('Status: PROMPT COMPOSED — OK');

        if (verbose) {
          print(`Prompt identity: fnv1a ${seatPromptIdentity}`);
          printVerboseDiagnostics(begin);
          print('');
        }

        return;
      }

      print(`Preferred Mind: ${providerDisplayName(begin.preferredProvider)}`);

      if (begin.providerChain.length > 1) {
        print(`Provider chain: ${begin.providerChain.map(providerDisplayName).join(' → ')}`);
      }

      // When the run has already learned some Minds are unavailable, show the
      // configured-vs-effective distinction. The Preferred Mind is never
      // rewritten, even when it is the unavailable one.
      const unavailableThisRun = begin.providerChain.filter(
        (provider) => !begin.effectiveChain.includes(provider),
      );

      if (unavailableThisRun.length > 0) {
        print('Unavailable this run:');
        unavailableThisRun.forEach((provider) => {
          const reason = availabilityByProvider.get(provider)?.reason;
          print(`  ${providerDisplayName(provider)}${reason ? ` — ${reason}` : ''}`);
        });
        print(
          begin.effectiveChain.length > 0
            ? `Effective chain: ${begin.effectiveChain.map(providerDisplayName).join(' → ')}`
            : 'Effective chain: (none — every configured Mind is unavailable this run)',
        );

        if (!begin.effectiveChain.includes(begin.preferredProvider)) {
          print(`Preferred Mind remains: ${providerDisplayName(begin.preferredProvider)} (unavailable this run, not rewritten)`);
        }
      }

      print(`Calling: ${callingPracticalTitle(begin.calling)}`);
      print(`Stage id: ${begin.stageId}`);
      print('');
      print(`Input policy: ${begin.inputPolicy}`);
      print(`  ${describeInputPolicy(begin.inputPolicy, configuration.stages[begin.seat - 1]?.inputPolicyN)}`);
      print('');
      printContextFlow(composition);
      print('');
      printCognitiveStats(composition);
      print('');
      print(`Prompt length: ${formatChars(composition.promptChars)} chars`);
      print(`Max response length: ${formatChars(composition.resolvedMaxResponseChars)} chars`);
      print(`Calling flavour: ${composition.callingFlavourSource}`);
      print(`Failure policy: ${begin.failurePolicy}`);
      print('');
      print('Status: PROMPT COMPOSED — OK');

      if (verbose) {
        printVerboseDiagnostics(begin);
        print(`Prompt identity: fnv1a ${seatPromptIdentity}`);
        print('');
      }
    },

    onProviderRejected: (event) => {
      activeAsk = undefined;
      const name = mindDisplayName(event.rejection.provider);

      print('');
      print(`Status: ${name.toUpperCase()} UNAVAILABLE — ${event.rejection.reason}`);
      print(`${name} cannot execute this seat.`);

      if (event.rejection.notes?.length) {
        print(`  ${event.rejection.notes.join(' ')}`);
      }

      if (event.rejection.error) {
        print(`Message: ${event.rejection.error}`);
      }

      // Note the run-scoped circuit breaker only when this Mind can recur on a
      // later seat, so the operator understands it will be skipped there.
      const recursLater = configuration.stages
        .slice(event.seat)
        .some((stage) => [stage.provider, ...(stage.providerFallbacks ?? [])].includes(event.rejection.provider));

      if (recursLater) {
        print(`${name} is now unavailable for the rest of this Council run and will be skipped on later seats.`);
      }

      if (event.nextProvider !== undefined) {
        print(
          `Fallback: TRYING ${providerDisplayName(event.nextProvider).toUpperCase()} ` +
          `(choice ${event.nextChoiceIndex} of ${event.providerChain.length})...`,
        );
        print('The seat is unchanged: same Calling, cognitive stats, context, and composed prompt.');
      }
    },

    onProviderSkipped: (event) => {
      activeAsk = undefined;
      const name = mindDisplayName(event.rejection.provider);

      print('');
      print(`${name} skipped — already unavailable for this run (${event.rejection.reason}).`);

      if (event.nextProvider !== undefined) {
        print(
          `Fallback: TRYING ${providerDisplayName(event.nextProvider).toUpperCase()} ` +
          `(choice ${event.nextChoiceIndex} of ${event.providerChain.length})...`,
        );
      }
    },

    onSeatStart: (start) => {
      if (start.attempt > 1) {
        print('');
        print(`Retry attempt: ${start.attempt} of ${start.maxAttempts}`);
        print(`Re-sending the exact same composed prompt to ${mindDisplayName(start.provider)}...`);
        activeAsk = { provider: start.provider, startedAt: now() };
        return;
      }

      // Under an execution override the target is forced; there is no fallback
      // position to describe.
      if (executionOverride) {
        print(`Status: SENDING TO ${executionTargetLabel(executionOverride).toUpperCase()} (attempt ${start.attempt} of ${start.maxAttempts})...`);
        activeAsk = { provider: start.provider, startedAt: now() };
        return;
      }

      if (start.fallbackUsed && verbose) {
        print(`Prompt identity unchanged: fnv1a ${promptIdentity(start.prompt)}`);
      }

      const attemptSuffix = start.choiceIndex > 1
        ? `(fallback choice ${start.choiceIndex} of ${start.providerChain.length}, attempt ${start.attempt} of ${start.maxAttempts})`
        : `(attempt ${start.attempt} of ${start.maxAttempts})`;

      print(`Status: SENDING TO ${providerDisplayName(start.provider).toUpperCase()} ${attemptSuffix}...`);
      activeAsk = { provider: start.provider, startedAt: now() };
    },

    onSeatAttempt: (attempt) => {
      activeAsk = undefined;

      if (attempt.outcome === 'pass') {
        print('');
        print('Status: RESPONSE RECEIVED');
        print(`Elapsed: ${formatSeconds(attempt.elapsedMs)}`);
        print(`Response length: ${formatChars(attempt.responseChars ?? 0)} chars`);

        if (seatMaxResponseChars !== undefined) {
          print(`Response target: ${formatChars(seatMaxResponseChars)} chars`);

          const overage = (attempt.responseChars ?? 0) - seatMaxResponseChars;

          if (overage > 0) {
            print('Target exceeded: YES');
            print(`WARNING: Response exceeded requested target by ${formatChars(overage)} characters.`);
          }
        }

        print(`Attempt: ${attempt.attempt} of ${attempt.maxAttempts}`);
        return;
      }

      print('');
      print('Status: ASK FAILED');
      print(`Elapsed: ${formatSeconds(attempt.elapsedMs)}`);
      print(`Failure category: ${attempt.failureReason ?? 'unknown'}`);

      if (attempt.error) {
        print(`Message: ${attempt.error}`);
      }

      printFailureDecision(attempt.failurePolicy, attempt.willRetry);
    },

    onSeatResult: (seat) => {
      activeAsk = undefined;
      const headerPrinted = seatHeaderPrinted;
      seatHeaderPrinted = false;

      if (seat.outcome === 'not-run') {
        print('');
        print(`SEAT ${seat.seat} OF ${seat.seatCount} — ${seatLabel(seat.calling, seat.provider)}: NOT RUN (the Council halted at an earlier seat)`);
        return;
      }

      const selection = seat.providerSelection;

      // Every configured provider choice was unavailable.
      if (selection?.chainExhausted) {
        print('');
        print('PROVIDER CHAIN EXHAUSTED');
        print('');
        print('Attempted:');
        selection.rejectedProviders.forEach((rejection, index) => {
          print(`  ${index + 1}. ${providerDisplayName(rejection.provider)} — ${rejection.reason}`);
        });
        print('');
        print('No provider executed this seat.');
        printFailureDecision(seat.failurePolicy, false);
      } else if (seat.attempts === 0 && !headerPrinted) {
        // Composition failed before provider selection: no seat block was
        // printed, so print a compact one here.
        print('');
        print(lightRule);
        print(`SEAT ${seat.seat} OF ${seat.seatCount} — ${callingTitle(seat.calling).toUpperCase()}`);
        print(`Preferred Mind: ${providerDisplayName(seat.provider)}`);
        print('');
        print(`Status: ${seat.outcome === 'skipped' ? 'SKIPPED BEFORE ASK' : 'FAILED BEFORE ASK'}`);
        print(`Failure category: ${seat.failureReason ?? 'unknown'}`);

        if (seat.error) {
          print(`Message: ${seat.error}`);
        }

        printFailureDecision(seat.failurePolicy, false);
      }

      if (seat.outcome === 'pass') {
        const executedProvider = selection?.executedProvider ?? seat.provider;

        counters.passed += 1;
        counters.processed += 1;
        contributionInfo.set(seat.stageId, {
          seat: seat.seat,
          calling: seat.calling,
          provider: executedProvider,
          chars: seat.responseChars ?? seat.response?.length ?? 0,
        });
        print('');

        const executedTarget = selection?.executedTarget;

        if (selection?.executionOverride && executedTarget) {
          print(`Execution Mind: ${executionTargetLabel(executedTarget)}`);
          print(`Provider family: ${providerFamilyLabel(executedTarget.providerFamily)}`);

          if (executedTarget.model) {
            print(`Model: ${executedTarget.model}`);
          }

          print(`Transport: ${executedTarget.transport.toUpperCase()}`);
          print(`Configured Preferred Mind: ${providerDisplayName(selection.preferredProvider)}`);
          print(`Run override: ${executionTargetLabel(selection.executionOverride)}`);
        } else {
          print(`Executed by: ${providerDisplayName(executedProvider)}`);
          print(`Preferred Mind: ${providerDisplayName(selection?.preferredProvider ?? seat.provider)}`);
          print(`Fallback used: ${selection?.fallbackUsed ? 'YES' : 'NO'}`);
        }

        print('');
        print('Contribution recorded:');
        print(`  Seat ${seat.seat} — ${callingTitle(seat.calling)} / ${mindDisplayName(executedProvider)}`);
        print(`  Council contributions now: ${contributionInfo.size}`);
        print('');
        print('Response:');
        print(seat.response ?? '[No response text]');
        print('');
        print('RESULT: PASS');
        printRunningSummary();
        printNextSeat(seat.seat);
        return;
      }

      if (seat.outcome === 'skipped') {
        counters.skipped += 1;
        counters.processed += 1;
        print('');
        print('RESULT: SKIPPED — no contribution recorded, nothing forwarded from this seat');
        printRunningSummary();
        printNextSeat(seat.seat);
        return;
      }

      counters.failed += 1;
      counters.processed += 1;
      print('');
      print('RESULT: FAIL — the Council halted at this seat');
      printRunningSummary();
    },

    finish: (result) => {
      const elapsed = formatClock(now() - runStartedAt);
      const notRun = result.seats.filter((seat) => seat.outcome === 'not-run').length;
      const problemSeats = result.seats.filter(
        (seat) => seat.outcome === 'skipped' || seat.outcome === 'fail',
      );

      print('');
      print(heavyRule);
      print('COUNCIL COMPLETE');
      print(heavyRule);
      print('');
      print(`Doctrine: ${doctrine.fantasyTitle}`);
      print(`Final result: ${result.finalResult}`);
      print('');
      print('Seats:');
      print(`  Passed: ${counters.passed}`);
      print(`  Skipped: ${counters.skipped}`);
      print(`  Failed: ${counters.failed}`);

      if (notRun > 0) {
        print(`  Not run: ${notRun}`);
      }

      print('');
      print(`Elapsed: ${elapsed}`);
      print(`Successful contributions: ${result.contributions.length}`);

      if (problemSeats.length > 0) {
        print('');
        print('Skipped/failed seats:');
        problemSeats.forEach((seat) => {
          print(
            `  Seat ${seat.seat} — ${seatLabel(seat.calling, seat.provider)} — ` +
            `${seat.outcome.toUpperCase()}: ${seat.failureReason ?? 'unknown'}`,
          );
        });
      }

      if (result.finalResult === 'FAIL' && result.haltedAtSeat !== undefined) {
        const halted = result.seats.find((seat) => seat.seat === result.haltedAtSeat);

        print('');
        print('Halted at:');
        print(`  Seat ${result.haltedAtSeat} — ${halted ? seatLabel(halted.calling, halted.provider) : '(unknown seat)'}`);
        print(`  Failure category: ${halted?.failureReason ?? 'unknown'}`);
        print(`  Successful contributions before halt: ${result.contributions.length}`);
      }

      if (result.finalContribution) {
        const finalSeat = result.seats.find(
          (seat) => seat.outcome === 'pass' && seat.stageId === result.finalContribution?.stageId,
        );

        print('');
        print('Last successful contribution:');
        print(
          `  Seat ${finalSeat?.seat ?? '?'} — ` +
          `${seatLabel(result.finalContribution.calling, result.finalContribution.provider)}`,
        );
        print(`Final contribution length: ${formatChars(result.finalContribution.text.length)} chars`);
        print('');
        print('Final contribution:');
        print(result.finalContribution.text);
      } else {
        print('');
        print('No seat produced a contribution.');
      }

      if (result.doctrineId === 'crown-council') {
        print('');
        print(
          'Crown Council note: explicit vote casting and tallying are not yet implemented. ' +
          'Each seat above is an independent individual opinion, and the final contribution is ' +
          "the last seat's individual opinion — not a collective verdict.",
        );
      }

      if (result.finalResult === 'FAIL') {
        print('');
        print('The Council halted before completion. No fabricated contribution was forwarded.');
      }

      print('');
      print(heavyRule);
    },

    heartbeatTick: () => {
      if (!activeAsk) {
        return;
      }

      print(`[${formatClock(now() - activeAsk.startedAt)}] ${mindDisplayName(activeAsk.provider)} is still processing...`);
    },
  };
}
