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
  CouncilRunResult,
  CouncilSeatAttempt,
  CouncilSeatComposition,
  CouncilSeatResult,
  CouncilSeatStart,
} from './councilExecution.js';

const heavyRule = '='.repeat(60);
const lightRule = '-'.repeat(60);

export function formatChars(count: number): string {
  return count.toLocaleString('en-US');
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
};

export type CouncilRunReporter = {
  start: () => void;
  onSeatStart: (start: CouncilSeatStart) => void;
  onSeatAttempt: (attempt: CouncilSeatAttempt) => void;
  onSeatResult: (seat: CouncilSeatResult) => void;
  finish: (result: CouncilRunResult) => void;
  // Prints one elapsed-time heartbeat line if an ask is currently active;
  // prints nothing otherwise. Driven by an external interval.
  heartbeatTick: () => void;
};

export function createCouncilRunReporter(options: CouncilRunReporterOptions): CouncilRunReporter {
  const { configuration, doctrine, print, verbose } = options;
  const now = options.now ?? Date.now;
  const seatCount = configuration.stages.length;
  const contributionInfo = new Map<string, ContributionDisplayInfo>();
  const counters: ReporterCounters = { passed: 0, skipped: 0, failed: 0, processed: 0 };
  let runStartedAt = 0;
  let activeAsk: { provider: string; startedAt: number } | undefined;

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

  const printVerboseDiagnostics = (start: CouncilSeatStart) => {
    const { composition } = start;
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
    print('Resolved cognitive instructions:');
    print(guidance || '(none — all prose stats are neutral)');
    print('--- END COUNCIL COMPOSITION DIAGNOSTICS ---');
    print('');
    print('--- provider-facing prompt ---');
    print(start.prompt);
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
      print('');
      print(heavyRule);
    },

    onSeatStart: (start) => {
      if (start.attempt > 1) {
        print('');
        print(`Retry attempt: ${start.attempt} of ${start.maxAttempts}`);
        print(`Re-sending the exact same composed prompt to ${providerDisplayName(start.provider)}...`);
        activeAsk = { provider: start.provider, startedAt: now() };
        return;
      }

      const { composition } = start;

      print('');
      print(lightRule);
      print(`SEAT ${start.seat} OF ${start.seatCount} — ${callingTitle(start.calling).toUpperCase()}`);
      print(`AI: ${providerDisplayName(start.provider)}`);
      print(`Calling: ${callingPracticalTitle(start.calling)}`);
      print(`Stage id: ${start.stageId}`);
      print('');
      print(`Input policy: ${start.inputPolicy}`);
      print(`  ${describeInputPolicy(start.inputPolicy, configuration.stages[start.seat - 1]?.inputPolicyN)}`);
      print('');
      printContextFlow(composition);
      print('');
      printCognitiveStats(composition);
      print('');
      print(`Prompt length: ${formatChars(composition.promptChars)} chars`);
      print(`Calling flavour: ${composition.callingFlavourSource}`);
      print(`Failure policy: ${start.failurePolicy}`);
      print('');
      print('Status: PROMPT COMPOSED — OK');

      if (verbose) {
        printVerboseDiagnostics(start);
        print('');
      }

      print(`Status: SENDING TO ${providerDisplayName(start.provider).toUpperCase()} (attempt ${start.attempt} of ${start.maxAttempts})...`);
      activeAsk = { provider: start.provider, startedAt: now() };
    },

    onSeatAttempt: (attempt) => {
      activeAsk = undefined;

      if (attempt.outcome === 'pass') {
        print('');
        print('Status: RESPONSE RECEIVED');
        print(`Elapsed: ${formatSeconds(attempt.elapsedMs)}`);
        print(`Response length: ${formatChars(attempt.responseChars ?? 0)} chars`);
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

      if (seat.outcome === 'not-run') {
        print('');
        print(`SEAT ${seat.seat} OF ${seat.seatCount} — ${seatLabel(seat.calling, seat.provider)}: NOT RUN (the Council halted at an earlier seat)`);
        return;
      }

      // Seats rejected before any ask (readiness gate or composition
      // failure) never fired onSeatStart/onSeatAttempt, so print a compact
      // block here.
      if (seat.attempts === 0) {
        print('');
        print(lightRule);
        print(`SEAT ${seat.seat} OF ${seat.seatCount} — ${callingTitle(seat.calling).toUpperCase()}`);
        print(`AI: ${providerDisplayName(seat.provider)}`);
        print('');
        print(`Status: ${seat.outcome === 'skipped' ? 'SKIPPED BEFORE ASK' : 'FAILED BEFORE ASK'}`);
        print(`Failure category: ${seat.failureReason ?? 'unknown'}`);

        if (seat.readinessStatus) {
          print(`Provider readiness: ${seat.readinessStatus}`);
        }

        if (seat.readinessNotes?.length) {
          print(`  ${seat.readinessNotes.join(' ')}`);
        }

        if (seat.error) {
          print(`Message: ${seat.error}`);
        }

        printFailureDecision(seat.failurePolicy, false);
      }

      if (seat.outcome === 'pass') {
        counters.passed += 1;
        counters.processed += 1;
        contributionInfo.set(seat.stageId, {
          seat: seat.seat,
          calling: seat.calling,
          provider: seat.provider,
          chars: seat.responseChars ?? seat.response?.length ?? 0,
        });
        print('');
        print('Contribution recorded:');
        print(`  Seat ${seat.seat} — ${seatLabel(seat.calling, seat.provider)}`);
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

      print(`[${formatClock(now() - activeAsk.startedAt)}] ${providerDisplayName(activeAsk.provider)} is still processing...`);
    },
  };
}
