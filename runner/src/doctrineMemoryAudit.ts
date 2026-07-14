// Deterministic Doctrine input-policy × Memory coherence audit.
//
// For every seat of every canonical Doctrine, this diagnostic simulates a
// fully successful run (synthetic contributions, no browser, no Runner
// service, no network) through the REAL shared composition pipeline and
// reports, per seat: input policy, the resolved Memory level and which
// layer set it, the contribution ids eligible under the input policy, the
// ids actually exposed after Memory narrowing, and a mechanical assessment.
//
// Assessment vocabulary:
// - COHERENT: Memory and input policy act together without tension.
// - INDEPENDENCE PRESERVED: independent-round seat exposing zero prior
//   contributions (Crown Council; the explicit memory 0 is redundant but
//   harmless belt-and-braces).
// - MEMORY CONSTRAINED BY POLICY: a deliberately non-neutral Memory level
//   (seat override or Calling default) whose allowance exceeds what the
//   input policy makes eligible — the Memory intent cannot act.
// - NARROWS FULL RECORD: resolved Memory (from any layer) exposes fewer
//   contributions than the seat's full-record eligibility — flagged because
//   the Doctrine factory documents judging/final seats as reading the full
//   budgeted record.
//
// This tool never changes behavior; it reads the same shared functions
// execution uses, so its numbers are exact.

import {
  composeStagePrompt,
  councilDoctrines,
  getCouncilCalling,
  memoryExposureByLevel,
  type CouncilContribution,
  type CouncilStage,
} from '../../shared/council/index.js';

const request = 'Audit request: compare two options and recommend one.';

type SeatAudit = {
  doctrineId: string;
  seat: number;
  calling: string;
  provider: string;
  inputPolicy: string;
  memory: number;
  memoryLayer: 'seat' | 'calling' | 'provider' | 'neutral';
  priorCount: number;
  eligible: string[];
  selected: string[];
  requestIncluded: boolean;
  assessment: string;
};

function memoryLayer(stage: CouncilStage): SeatAudit['memoryLayer'] {
  if (stage.cognitiveOverrides?.memory !== undefined) {
    return 'seat';
  }
  if (getCouncilCalling(stage.calling)?.cognitiveDefaults?.memory !== undefined) {
    return 'calling';
  }
  return 'provider';
}

function assess(audit: Omit<SeatAudit, 'assessment'>): string {
  if (audit.inputPolicy === 'independent-round') {
    return 'INDEPENDENCE PRESERVED';
  }

  if (audit.selected.length < audit.eligible.length) {
    return 'NARROWS FULL RECORD';
  }

  const deliberate = audit.memoryLayer === 'seat' || audit.memoryLayer === 'calling';
  const exposure = memoryExposureByLevel[audit.memory as keyof typeof memoryExposureByLevel];
  const allowance = exposure.maxContributions;
  const wantsMore = allowance === undefined ? audit.memory === 9 : allowance > audit.eligible.length;

  if (deliberate && audit.memory > 5 && wantsMore && audit.eligible.length < audit.priorCount) {
    return 'MEMORY CONSTRAINED BY POLICY';
  }

  return 'COHERENT';
}

const findings: SeatAudit[] = [];

for (const doctrine of councilDoctrines) {
  const configuration = doctrine.build();
  const contributions: CouncilContribution[] = [];

  console.log(`\n== ${doctrine.id} (${doctrine.fantasyTitle}) ==`);

  configuration.stages.forEach((stage, index) => {
    const composed = composeStagePrompt({
      configuration,
      stage,
      request,
      priorContributions: contributions,
    });

    const base = {
      doctrineId: doctrine.id,
      seat: index + 1,
      calling: stage.calling,
      provider: stage.provider,
      inputPolicy: stage.inputPolicy,
      memory: composed.resolvedCognitiveStats.memory,
      memoryLayer: memoryLayer(stage),
      priorCount: contributions.length,
      eligible: composed.eligibleContributionIds,
      selected: composed.memorySelectedContributionIds,
      requestIncluded: composed.prompt.includes('--- ORIGINAL USER REQUEST ---'),
    };
    const audit: SeatAudit = { ...base, assessment: assess(base) };
    findings.push(audit);

    console.log(
      `${audit.seat}. ${audit.calling}(${audit.provider}) ${audit.inputPolicy} ` +
      `memory=${audit.memory}[${audit.memoryLayer}] ` +
      `eligible=${audit.eligible.length}[${audit.eligible.join(',') || '-'}] ` +
      `selected=${audit.selected.length}[${audit.selected.join(',') || '-'}] ` +
      `request=${audit.requestIncluded ? 'yes' : 'no'} ` +
      `${audit.assessment}`,
    );

    contributions.push({
      stageId: stage.id,
      provider: stage.provider,
      calling: stage.calling,
      text: `Synthetic contribution from seat ${index + 1} (${stage.calling}).`,
    });
  });
}

console.log('\n== Summary of non-COHERENT seats ==');

const flagged = findings.filter(
  (audit) => audit.assessment !== 'COHERENT' && audit.assessment !== 'INDEPENDENCE PRESERVED',
);

if (flagged.length === 0) {
  console.log('(none)');
} else {
  for (const audit of flagged) {
    console.log(
      `${audit.doctrineId} seat ${audit.seat} ${audit.calling}(${audit.provider}) ` +
      `${audit.inputPolicy} memory=${audit.memory}[${audit.memoryLayer}] ` +
      `eligible=${audit.eligible.length} selected=${audit.selected.length} -> ${audit.assessment}`,
    );
  }
}

const crown = findings.filter((audit) => audit.doctrineId === 'crown-council');
const crownIndependent = crown.every(
  (audit) => audit.selected.length === 0 && audit.eligible.length === 0 && audit.requestIncluded,
);
console.log(
  `\nCrown Council independence: ${crownIndependent ? 'PRESERVED' : 'VIOLATED'} ` +
  '(zero eligible, zero exposed, original request present on every seat)',
);

if (!crownIndependent) {
  process.exitCode = 1;
}
