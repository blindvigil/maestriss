// Built-in Council Doctrines: deterministic, code-backed factories that
// produce complete Council Configurations.
//
// A Doctrine defines the intended cognitive workflow and purpose of a
// Council and provides a default Formation: the ordered composition of
// seats, each seat assigned a Calling and a default provider (AI). The same
// Calling may hold several seats and the same provider may hold several
// seats; Calling identity and provider identity are independent, and
// Suggested AI / provider affinity are never constraints. Built-in Doctrines
// are expert-designed editable starting points, not rigid execution classes:
// a future user-created Council is simply a saved Council Configuration
// (this same schema), typically authored by modifying a Doctrine's output.
//
// Per-seat policies are deterministic v1 defaults intended for tuning after
// real council runs: the first seat reads the original request only, the
// final seat reads the full budgeted record and halts on failure, mid-chain
// judging/combining Callings (magistrate, alchemist, royal-scribe) read the
// full budgeted record, and every other seat reads the previous contribution
// plus the original request and is skipped-and-recorded on failure.

import { councilProviders } from './providers.js';
import { getCouncilCalling } from './callings.js';
import type { CognitiveStatOverrides } from './cognitiveStats.js';
import {
  councilSchemaVersion,
  defaultCouncilBudgets,
  defaultCouncilRules,
  defaultCouncilVariables,
  type CouncilConfiguration,
  type CouncilRules,
  type CouncilStage,
  type CouncilVariables,
} from './schema.js';

export type CouncilDoctrineBuildOptions = {
  id?: string;
  name?: string;
  // Only Crown Council is size-configurable; fixed-Formation Doctrines
  // ignore size.
  size?: number;
  // Compact council-level Calling flavour overrides (customized Callings
  // only), e.g. produced from Studio Calling Grimoire edits via
  // toCouncilCallingFlavourOverrides. Omitted or empty means canonical text.
  callingFlavourOverrides?: Record<string, string>;
};

export type CouncilDoctrine = {
  id: string;
  fantasyTitle: string;
  practicalTitle: string;
  description: string;
  defaultSize: number;
  build: (options?: CouncilDoctrineBuildOptions) => CouncilConfiguration;
};

export const crownCouncilMinSize = 2;
export const crownCouncilMaxSize = 12;
export const crownCouncilDefaultSize = 4;

type FormationSeat = {
  calling: string;
  provider: string;
  // Choreography-sensitive per-seat cognitive overrides only (approved
  // set); Formations are deliberately not broadly stat-tuned.
  cognitiveOverrides?: CognitiveStatOverrides;
};

type FixedDoctrineDefinition = {
  id: string;
  fantasyTitle: string;
  practicalTitle: string;
  description: string;
  formation: FormationSeat[];
  rules?: Partial<CouncilRules>;
  variables?: Partial<CouncilVariables>;
};

function requireCalling(id: string) {
  const calling = getCouncilCalling(id);

  if (!calling) {
    throw new Error(`Council doctrine references unknown calling "${id}".`);
  }

  return calling;
}

// Only embed overrides when something is actually customized, so Doctrine
// output never carries an empty (or canonical-duplicating) block.
function flavourOverridesFor(
  options: CouncilDoctrineBuildOptions,
): Pick<CouncilConfiguration, 'callingFlavourOverrides'> {
  return options.callingFlavourOverrides && Object.keys(options.callingFlavourOverrides).length > 0
    ? { callingFlavourOverrides: { ...options.callingFlavourOverrides } }
    : {};
}

const fullRecordMidChainCallings = new Set(['magistrate', 'alchemist', 'royal-scribe']);

function seatStage(seat: FormationSeat, index: number, formationSize: number): CouncilStage {
  requireCalling(seat.calling);
  const isFirst = index === 0;
  const isFinal = index === formationSize - 1;

  return {
    id: `stage-${index + 1}-${seat.calling}`,
    provider: seat.provider,
    calling: seat.calling,
    inputPolicy: isFirst
      ? 'original-only'
      : isFinal || fullRecordMidChainCallings.has(seat.calling)
        ? 'full-record'
        : 'previous-plus-original',
    ...(seat.cognitiveOverrides ? { cognitiveOverrides: { ...seat.cognitiveOverrides } } : {}),
    failurePolicy: isFinal ? 'halt' : 'skip-and-record',
  };
}

function buildFixedConfiguration(
  definition: FixedDoctrineDefinition,
  options: CouncilDoctrineBuildOptions = {},
): CouncilConfiguration {
  return {
    schemaVersion: councilSchemaVersion,
    id: options.id ?? definition.id,
    name: options.name ?? definition.fantasyTitle,
    description: definition.description,
    doctrineId: definition.id,
    rules: { ...defaultCouncilRules, ...(definition.rules ?? {}) },
    variables: { ...defaultCouncilVariables, ...(definition.variables ?? {}) },
    budgets: { ...defaultCouncilBudgets },
    ...flavourOverridesFor(options),
    stages: definition.formation.map((seat, index) =>
      seatStage(seat, index, definition.formation.length)),
  };
}

// V1 default Formations, approved 2026-07-13/14. These are editable
// starting points intended for deliberate tuning after real council runs.
const fixedDoctrineDefinitions: FixedDoctrineDefinition[] = [
  {
    id: 'realm-summit',
    fantasyTitle: 'Realm Summit',
    practicalTitle: 'Reconcile Perspectives & Forge Common Ground',
    description: 'Identify substantive disagreements, represent differing perspectives fairly, negotiate conflicts, and construct a position with meaningful common ground.',
    formation: [
      { calling: 'empath', provider: 'claude' },
      { calling: 'cartographer', provider: 'gemini' },
      { calling: 'rival', provider: 'chatgpt' },
      { calling: 'inquisitor', provider: 'claude' },
      { calling: 'alchemist', provider: 'gemini' },
      { calling: 'magistrate', provider: 'claude' },
      { calling: 'royal-scribe', provider: 'chatgpt' },
    ],
    rules: {
      requireNovelContribution: true,
      preserveDissentInSynthesis: true,
      distinguishConsensusFromMinority: true,
    },
  },
  {
    id: 'dream-lab',
    fantasyTitle: 'Dream Lab',
    practicalTitle: 'Generate, Explore & Evolve Bold Ideas',
    description: 'Expansive brainstorming: encourage divergent possibilities, unusual directions, adjacent opportunities, combinations, and evolution of promising ideas before converging.',
    formation: [
      { calling: 'sage', provider: 'claude' },
      { calling: 'cartographer', provider: 'gemini' },
      // Approved choreography overrides: both divergent passes run at full
      // imaginative temperament; the second additionally carries maximum
      // Memory so any widening of its eligible prior material is exposed.
      { calling: 'wild-mage', provider: 'grok', cognitiveOverrides: { temperament: 9 } },
      { calling: 'wild-mage', provider: 'chatgpt', cognitiveOverrides: { temperament: 9, memory: 9 } },
      { calling: 'pathfinder', provider: 'gemini' },
      { calling: 'alchemist', provider: 'claude' },
      { calling: 'royal-scribe', provider: 'chatgpt' },
    ],
    rules: {
      requireNovelContribution: true,
      forbidRepetition: true,
    },
  },
  {
    id: 'crucible',
    fantasyTitle: 'Crucible',
    practicalTitle: 'Challenge, Test & Prove or Disprove a Thesis',
    description: 'Treat a thesis as a claim to be tested: examine evidence, assumptions, counterarguments, competing explanations, and failure conditions before reaching a reasoned judgment.',
    formation: [
      { calling: 'cartographer', provider: 'chatgpt' },
      { calling: 'lantern-bearer', provider: 'perplexity' },
      { calling: 'rival', provider: 'gemini' },
      { calling: 'inquisitor', provider: 'claude' },
      { calling: 'saboteur', provider: 'grok' },
      { calling: 'lantern-bearer', provider: 'google' },
      { calling: 'magistrate', provider: 'claude' },
      { calling: 'royal-scribe', provider: 'chatgpt' },
    ],
    rules: {
      requireDisagreement: true,
      labelEvidenceVsInference: true,
      preserveDissentInSynthesis: true,
      distinguishConsensusFromMinority: true,
    },
  },
  {
    id: 'imperial-court',
    fantasyTitle: 'Imperial Court',
    practicalTitle: 'Judge, Refine & Elevate a Work to Its Definitive Form',
    description: 'Authoritative review of an existing work: examine structure, clarity, rhetoric, consistency, accuracy, audience fit, and polish toward a definitive final form.',
    formation: [
      { calling: 'archivist', provider: 'claude' },
      { calling: 'lantern-bearer', provider: 'perplexity' },
      { calling: 'cartographer', provider: 'gemini' },
      { calling: 'inquisitor', provider: 'claude' },
      { calling: 'empath', provider: 'chatgpt' },
      { calling: 'architect', provider: 'claude' },
      { calling: 'royal-scribe', provider: 'chatgpt' },
    ],
    rules: {
      forbidRepetition: true,
      labelEvidenceVsInference: true,
      preserveDissentInSynthesis: true,
      distinguishConsensusFromMinority: true,
    },
  },
  {
    id: 'arcane-expedition',
    fantasyTitle: 'Arcane Expedition',
    practicalTitle: 'Investigate Obscure, Esoteric & Hard-to-Find Knowledge',
    description: 'Explore obscure, specialized, unusual, poorly documented, or difficult-to-find subject matter, seeking overlooked context and non-obvious connections while distinguishing evidence from speculation.',
    formation: [
      { calling: 'sage', provider: 'claude' },
      { calling: 'pathfinder', provider: 'google' },
      { calling: 'pathfinder', provider: 'perplexity' },
      { calling: 'archivist', provider: 'claude' },
      { calling: 'lantern-bearer', provider: 'perplexity' },
      { calling: 'cartographer', provider: 'gemini' },
      { calling: 'oracle', provider: 'chatgpt' },
      { calling: 'royal-scribe', provider: 'claude' },
    ],
    rules: {
      requireNovelContribution: true,
      labelEvidenceVsInference: true,
    },
  },
  {
    id: 'scholars-conclave',
    fantasyTitle: "Scholar's Conclave",
    practicalTitle: 'Conduct Rigorous Academic Research & Evidence Synthesis',
    description: 'Approach the question as an academic research problem: evaluate evidence quality, competing findings, methodology, scholarly context, and uncertainty before synthesizing conclusions.',
    formation: [
      { calling: 'sage', provider: 'claude' },
      { calling: 'pathfinder', provider: 'google' },
      { calling: 'lantern-bearer', provider: 'perplexity' },
      { calling: 'archivist', provider: 'claude' },
      { calling: 'cartographer', provider: 'gemini' },
      { calling: 'inquisitor', provider: 'claude' },
      { calling: 'magistrate', provider: 'chatgpt' },
      { calling: 'royal-scribe', provider: 'claude' },
    ],
    rules: {
      requireDisagreement: true,
      labelEvidenceVsInference: true,
      preserveDissentInSynthesis: true,
    },
  },
  {
    id: 'grand-academy',
    fantasyTitle: 'Grand Academy',
    practicalTitle: 'Teach, Explain & Build Deep Understanding',
    description: 'Determine how to explain a subject effectively: establish assumed knowledge, decompose concepts, order them pedagogically, use examples and analogies, anticipate misunderstandings, and build durable understanding.',
    formation: [
      { calling: 'sage', provider: 'claude' },
      { calling: 'cartographer', provider: 'gemini' },
      { calling: 'empath', provider: 'chatgpt' },
      { calling: 'archivist', provider: 'claude' },
      { calling: 'wild-mage', provider: 'gemini' },
      { calling: 'architect', provider: 'claude' },
      { calling: 'royal-scribe', provider: 'chatgpt' },
    ],
    rules: { forbidRepetition: true },
  },
  {
    id: 'decision-chamber',
    fantasyTitle: 'Decision Chamber',
    practicalTitle: 'Compare Options, Weigh Tradeoffs & Choose a Path',
    description: 'Identify realistic options, define decision criteria, compare tradeoffs, expose hidden costs and risks, and recommend a path with clear reasoning.',
    formation: [
      { calling: 'cartographer', provider: 'gemini' },
      { calling: 'lantern-bearer', provider: 'perplexity' },
      { calling: 'rival', provider: 'chatgpt' },
      { calling: 'inquisitor', provider: 'claude' },
      { calling: 'oracle', provider: 'gemini' },
      { calling: 'magistrate', provider: 'claude' },
      { calling: 'royal-scribe', provider: 'chatgpt' },
    ],
    rules: {
      labelEvidenceVsInference: true,
      preserveDissentInSynthesis: true,
    },
  },
  {
    id: 'trial-by-fire',
    fantasyTitle: 'Trial by Fire',
    practicalTitle: 'Attack Assumptions & Expose Weaknesses Before Failure',
    description: 'Aggressively stress-test a proposal, plan, design, or argument: seek failure modes, fragile assumptions, contradictions, adversarial conditions, and overlooked weaknesses.',
    formation: [
      { calling: 'cartographer', provider: 'chatgpt' },
      { calling: 'inquisitor', provider: 'claude' },
      { calling: 'saboteur', provider: 'grok' },
      { calling: 'rival', provider: 'gemini' },
      // Approved choreography override: the second stress-test pass runs at
      // maximum Dissent with maximum Memory over its eligible material.
      { calling: 'saboteur', provider: 'claude', cognitiveOverrides: { memory: 9, dissent: 9 } },
      { calling: 'magistrate', provider: 'claude' },
      { calling: 'royal-scribe', provider: 'chatgpt' },
    ],
    rules: {
      requireDisagreement: true,
      forbidRepetition: true,
      preserveDissentInSynthesis: true,
    },
  },
  {
    id: 'war-room',
    fantasyTitle: 'War Room',
    practicalTitle: 'Develop Strategy Against Goals, Obstacles & Opposition',
    description: 'Develop strategy in the presence of constraints, obstacles, competing actors, or opposition: examine positioning, leverage, sequencing, countermoves, and strategic risk.',
    formation: [
      { calling: 'cartographer', provider: 'gemini' },
      { calling: 'pathfinder', provider: 'perplexity' },
      { calling: 'oracle', provider: 'chatgpt' },
      { calling: 'rival', provider: 'gemini' },
      { calling: 'saboteur', provider: 'claude' },
      { calling: 'quartermaster', provider: 'chatgpt' },
      { calling: 'magistrate', provider: 'claude' },
      { calling: 'royal-scribe', provider: 'chatgpt' },
    ],
    rules: {
      forbidRepetition: true,
      preserveDissentInSynthesis: true,
    },
  },
  {
    id: 'workshop',
    fantasyTitle: 'Workshop',
    practicalTitle: 'Diagnose Practical Problems & Build Workable Solutions',
    description: 'Focus on a concrete problem: diagnose causes, identify constraints, develop practical solutions, and converge on something that can realistically work.',
    formation: [
      { calling: 'sage', provider: 'claude' },
      { calling: 'cartographer', provider: 'chatgpt' },
      { calling: 'pathfinder', provider: 'perplexity' },
      { calling: 'wild-mage', provider: 'grok' },
      { calling: 'alchemist', provider: 'gemini' },
      { calling: 'architect', provider: 'claude' },
      { calling: 'royal-scribe', provider: 'chatgpt' },
    ],
    rules: {
      requireNovelContribution: true,
      forbidRepetition: true,
    },
  },
  {
    id: 'oracles-table',
    fantasyTitle: "Oracle's Table",
    practicalTitle: 'Explore Futures, Consequences & Likely Outcomes',
    description: 'Examine plausible future scenarios, second-order effects, branching consequences, uncertainty, and indicators that would make one outcome more likely than another.',
    formation: [
      { calling: 'cartographer', provider: 'gemini' },
      { calling: 'pathfinder', provider: 'perplexity' },
      { calling: 'lantern-bearer', provider: 'google' },
      { calling: 'oracle', provider: 'chatgpt' },
      // Approved choreography override: the second scenario pass runs at
      // maximum Depth with maximum Memory over its eligible material.
      { calling: 'oracle', provider: 'gemini', cognitiveOverrides: { memory: 9, depth: 9 } },
      { calling: 'inquisitor', provider: 'claude' },
      { calling: 'magistrate', provider: 'claude' },
      { calling: 'royal-scribe', provider: 'chatgpt' },
    ],
    rules: {
      labelEvidenceVsInference: true,
      preserveDissentInSynthesis: true,
      distinguishConsensusFromMinority: true,
    },
  },
  {
    id: 'creation-chamber',
    fantasyTitle: 'Creation Chamber',
    practicalTitle: 'Shape, Develop & Refine a Creative Vision',
    description: 'Take a creative concept or partially formed work and deliberately develop it: explore creative choices, establish a coherent vision, critique alternatives, and refine the result.',
    formation: [
      { calling: 'sage', provider: 'claude' },
      { calling: 'wild-mage', provider: 'grok' },
      { calling: 'wild-mage', provider: 'chatgpt' },
      { calling: 'rival', provider: 'gemini' },
      { calling: 'empath', provider: 'claude' },
      { calling: 'alchemist', provider: 'chatgpt' },
      { calling: 'architect', provider: 'claude' },
    ],
    rules: { requireNovelContribution: true },
  },
  {
    id: 'socratic-circle',
    fantasyTitle: 'Socratic Circle',
    practicalTitle: 'Deepen Inquiry Through Questions, Assumptions & First Principles',
    description: 'Use disciplined questioning to clarify the problem, expose assumptions, identify missing knowledge, examine definitions, and drive the inquiry toward first principles.',
    formation: [
      { calling: 'sage', provider: 'claude' },
      // Approved choreography override: the second inquiry pass runs at
      // maximum Depth with maximum Memory over its eligible material.
      { calling: 'sage', provider: 'chatgpt', cognitiveOverrides: { memory: 9, depth: 9 } },
      { calling: 'cartographer', provider: 'gemini' },
      { calling: 'inquisitor', provider: 'claude' },
      { calling: 'empath', provider: 'chatgpt' },
      { calling: 'oracle', provider: 'gemini' },
      { calling: 'royal-scribe', provider: 'claude' },
    ],
    rules: {
      requireDisagreement: true,
      forbidRepetition: true,
    },
  },
  {
    id: 'grand-campaign',
    fantasyTitle: 'Grand Campaign',
    practicalTitle: 'Turn an Objective Into a Coordinated, Executable Plan',
    description: 'Take an established objective or strategy and determine how to execute it: identify phases, dependencies, resources, constraints, sequencing, risks, responsibilities, and concrete next actions.',
    formation: [
      { calling: 'cartographer', provider: 'gemini' },
      { calling: 'sage', provider: 'claude' },
      { calling: 'pathfinder', provider: 'perplexity' },
      { calling: 'quartermaster', provider: 'chatgpt' },
      { calling: 'saboteur', provider: 'claude' },
      { calling: 'architect', provider: 'chatgpt' },
      { calling: 'magistrate', provider: 'claude' },
      { calling: 'royal-scribe', provider: 'chatgpt' },
    ],
    rules: { forbidRepetition: true },
  },
];

// -------------------------------------------------------------------------
// Crown Council: deliberate as peers and reach a collective verdict.
//
// Equal deliberation and voting are Doctrine mechanics, not a Calling: every
// seat holds the same Calling (Magistrate — each peer weighs the arguments
// and forms a reasoned judgment), all seats share one independent
// deliberation round with identical policies, and default providers are
// distributed across seats in canonical registry order so no provider is
// senior to another. Seats repeat providers when the Formation exceeds the
// registry.
//
// Honest boundaries: explicit voting semantics (casting, tallying,
// persistence, ties, reporting) are future execution work; true parallel
// round execution is a later slice (independent-round currently composes
// against the original request and executes serially); and there is no
// synthesis seat — a future non-voting synthesis/tally stage will be modeled
// separately rather than silently consuming one of the voting seats, which
// means today a Crown Council run has no consolidated final stage.
// -------------------------------------------------------------------------

function buildCrownCouncil(options: CouncilDoctrineBuildOptions = {}): CouncilConfiguration {
  const size = options.size ?? crownCouncilDefaultSize;

  if (!Number.isInteger(size) || size < crownCouncilMinSize || size > crownCouncilMaxSize) {
    throw new Error(
      `Crown Council size must be an integer between ${crownCouncilMinSize} and ${crownCouncilMaxSize}; received ${JSON.stringify(options.size)}.`,
    );
  }

  requireCalling('magistrate');

  const stages = Array.from({ length: size }, (_, index): CouncilStage => ({
    id: `stage-${index + 1}-magistrate`,
    provider: councilProviders[index % councilProviders.length].id,
    calling: 'magistrate',
    inputPolicy: 'independent-round',
    // Approved choreography override: every Magistrate deliberates at Memory
    // 0, making seat-level isolation explicit on top of the already-isolated
    // independent round.
    cognitiveOverrides: { memory: 0 },
    round: 'deliberation',
    failurePolicy: 'skip-and-record',
  }));

  return {
    schemaVersion: councilSchemaVersion,
    id: options.id ?? `crown-council-of-${size}`,
    name: options.name ?? `Crown Council of ${size}`,
    description: 'A council of equal peers who each deliberate independently, weigh the arguments, and hold one vote toward a collective verdict. Vote casting, tallying, and any non-voting synthesis stage are future execution work.',
    doctrineId: 'crown-council',
    rules: { ...defaultCouncilRules },
    variables: {
      ...defaultCouncilVariables,
      inputMode: 'independent',
    },
    budgets: { ...defaultCouncilBudgets },
    ...flavourOverridesFor(options),
    stages,
  };
}

function fixedDoctrine(definition: FixedDoctrineDefinition): CouncilDoctrine {
  return {
    id: definition.id,
    fantasyTitle: definition.fantasyTitle,
    practicalTitle: definition.practicalTitle,
    description: definition.description,
    defaultSize: definition.formation.length,
    build: (options) => buildFixedConfiguration(definition, options),
  };
}

function requireDefinition(id: string): FixedDoctrineDefinition {
  const definition = fixedDoctrineDefinitions.find((candidate) => candidate.id === id);

  if (!definition) {
    throw new Error(`Missing built-in doctrine definition "${id}".`);
  }

  return definition;
}

// Canonical Doctrine order (approved 2026-07-14).
export const councilDoctrines: CouncilDoctrine[] = [
  fixedDoctrine(requireDefinition('realm-summit')),
  fixedDoctrine(requireDefinition('dream-lab')),
  fixedDoctrine(requireDefinition('crucible')),
  fixedDoctrine(requireDefinition('imperial-court')),
  {
    id: 'crown-council',
    fantasyTitle: 'Crown Council',
    practicalTitle: 'Deliberate as Peers & Reach a Collective Verdict',
    description: 'A configurable council of equal peers with one vote each, deliberating independently toward a collective verdict. Explicit voting semantics are future execution work.',
    defaultSize: crownCouncilDefaultSize,
    build: buildCrownCouncil,
  },
  fixedDoctrine(requireDefinition('arcane-expedition')),
  fixedDoctrine(requireDefinition('scholars-conclave')),
  fixedDoctrine(requireDefinition('grand-academy')),
  fixedDoctrine(requireDefinition('decision-chamber')),
  fixedDoctrine(requireDefinition('trial-by-fire')),
  fixedDoctrine(requireDefinition('war-room')),
  fixedDoctrine(requireDefinition('workshop')),
  fixedDoctrine(requireDefinition('oracles-table')),
  fixedDoctrine(requireDefinition('creation-chamber')),
  fixedDoctrine(requireDefinition('socratic-circle')),
  fixedDoctrine(requireDefinition('grand-campaign')),
];

export function getCouncilDoctrine(id: string): CouncilDoctrine | undefined {
  return councilDoctrines.find((doctrine) => doctrine.id === id);
}
