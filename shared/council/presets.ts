// Built-in council presets: deterministic, code-backed factories that produce
// complete Council Configurations.
//
// The party model: each ordered stage is one PARTY SLOT — slot/order → role →
// provider. The same role may hold several slots and the same provider may
// hold several slots; role identity and provider identity are independent,
// and provider affinity is never a constraint. Built-in presets are
// expert-designed editable starting points, not rigid execution classes: a
// future user-created Council is simply a saved Council Configuration (this
// same schema), typically authored by modifying a preset's output.
//
// Per-slot policies are deterministic v1 defaults intended for tuning after
// real council runs: the first slot reads the original request only, the
// final slot reads the full budgeted record and halts on failure, mid-chain
// judging/combining roles (magistrate, alchemist, royal-scribe) read the
// full budgeted record, and every other slot reads the previous contribution
// plus the original request and is skipped-and-recorded on failure.

import { councilProviders } from './providers.js';
import { getCouncilRole, type RoleDefinition } from './roles.js';
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

export type CouncilPresetBuildOptions = {
  id?: string;
  name?: string;
  // Only Council of X is size-configurable; fixed-party presets ignore size.
  size?: number;
  // Compact council-level flavour overrides (customized roles only), e.g.
  // produced from Studio Role Grimoire edits via
  // toCouncilRoleFlavourOverrides. Omitted or empty means canonical text.
  roleFlavourOverrides?: Record<string, string>;
};

export type CouncilPreset = {
  id: string;
  fantasyTitle: string;
  practicalTitle: string;
  description: string;
  defaultSize: number;
  build: (options?: CouncilPresetBuildOptions) => CouncilConfiguration;
};

export const councilOfXMinSize = 2;
export const councilOfXMaxSize = 12;
export const councilOfXDefaultSize = 4;

type PartySlot = {
  role: string;
  provider: string;
};

type FixedPresetDefinition = {
  id: string;
  fantasyTitle: string;
  practicalTitle: string;
  description: string;
  party: PartySlot[];
  rules?: Partial<CouncilRules>;
  variables?: Partial<CouncilVariables>;
};

function requireRole(id: string): RoleDefinition {
  const role = getCouncilRole(id);

  if (!role) {
    throw new Error(`Council preset references unknown role "${id}".`);
  }

  return role;
}

// Only embed overrides when something is actually customized, so preset
// output never carries an empty (or canonical-duplicating) block.
function flavourOverridesFor(
  options: CouncilPresetBuildOptions,
): Pick<CouncilConfiguration, 'roleFlavourOverrides'> {
  return options.roleFlavourOverrides && Object.keys(options.roleFlavourOverrides).length > 0
    ? { roleFlavourOverrides: { ...options.roleFlavourOverrides } }
    : {};
}

const fullRecordMidChainRoles = new Set(['magistrate', 'alchemist', 'royal-scribe']);

function slotStage(slot: PartySlot, index: number, partySize: number): CouncilStage {
  requireRole(slot.role);
  const isFirst = index === 0;
  const isFinal = index === partySize - 1;

  return {
    id: `stage-${index + 1}-${slot.role}`,
    provider: slot.provider,
    role: slot.role,
    inputPolicy: isFirst
      ? 'original-only'
      : isFinal || fullRecordMidChainRoles.has(slot.role)
        ? 'full-record'
        : 'previous-plus-original',
    failurePolicy: isFinal ? 'halt' : 'skip-and-record',
  };
}

function buildFixedConfiguration(
  definition: FixedPresetDefinition,
  options: CouncilPresetBuildOptions = {},
): CouncilConfiguration {
  return {
    schemaVersion: councilSchemaVersion,
    id: options.id ?? definition.id,
    name: options.name ?? definition.fantasyTitle,
    description: definition.description,
    presetId: definition.id,
    rules: { ...defaultCouncilRules, ...(definition.rules ?? {}) },
    variables: { ...defaultCouncilVariables, ...(definition.variables ?? {}) },
    budgets: { ...defaultCouncilBudgets },
    ...flavourOverridesFor(options),
    stages: definition.party.map((slot, index) => slotStage(slot, index, definition.party.length)),
  };
}

// V1 default party compositions, approved 2026-07-13. These are editable
// starting points intended for deliberate tuning after real council runs.
const fixedPresetDefinitions: FixedPresetDefinition[] = [
  {
    id: 'concord',
    fantasyTitle: 'Concord',
    practicalTitle: 'Seek Consensus',
    description: 'Surface perspectives and disagreements, combine compatible ideas, judge the tradeoffs, and finish with a synthesis that separates genuine consensus from unresolved dissent.',
    party: [
      { role: 'empath', provider: 'claude' },
      { role: 'cartographer', provider: 'gemini' },
      { role: 'rival', provider: 'chatgpt' },
      { role: 'inquisitor', provider: 'claude' },
      { role: 'alchemist', provider: 'gemini' },
      { role: 'magistrate', provider: 'claude' },
      { role: 'royal-scribe', provider: 'chatgpt' },
    ],
    rules: {
      requireNovelContribution: true,
      preserveDissentInSynthesis: true,
      distinguishConsensusFromMinority: true,
    },
  },
  {
    id: 'idea-forge',
    fantasyTitle: 'Idea Forge',
    practicalTitle: 'Brainstorm',
    description: 'Clarify the creative space, generate divergent ideas across multiple passes, force a competing direction, and organize the results without collapsing the idea space early.',
    party: [
      { role: 'master-of-questions', provider: 'claude' },
      { role: 'cartographer', provider: 'gemini' },
      { role: 'wild-mage', provider: 'grok' },
      { role: 'wild-mage', provider: 'chatgpt' },
      { role: 'rival', provider: 'gemini' },
      { role: 'alchemist', provider: 'claude' },
      { role: 'royal-scribe', provider: 'chatgpt' },
    ],
    rules: {
      requireNovelContribution: true,
      forbidRepetition: true,
    },
    variables: { dissent: 'collaborative' },
  },
  {
    id: 'crucible',
    fantasyTitle: 'Crucible',
    practicalTitle: 'Prove / Disprove a Thesis',
    description: 'Define a thesis precisely, establish the facts, challenge it from every angle, re-check the claims, and report what is supported, disproven, unresolved, or assumption-dependent.',
    party: [
      { role: 'cartographer', provider: 'chatgpt' },
      { role: 'lantern-bearer', provider: 'perplexity' },
      { role: 'rival', provider: 'gemini' },
      { role: 'inquisitor', provider: 'claude' },
      { role: 'saboteur', provider: 'grok' },
      { role: 'lantern-bearer', provider: 'google' },
      { role: 'magistrate', provider: 'claude' },
      { role: 'royal-scribe', provider: 'chatgpt' },
    ],
    rules: {
      requireDisagreement: true,
      labelEvidenceVsInference: true,
      preserveDissentInSynthesis: true,
      distinguishConsensusFromMinority: true,
    },
    variables: { dissent: 'adversarial' },
  },
  {
    id: 'editorial-court',
    fantasyTitle: 'Editorial Court',
    practicalTitle: 'Editorial Panel',
    description: 'Verify, restructure, critique, and strengthen a document, then deliver a polished final edition that respects the source material and its readers.',
    party: [
      { role: 'archivist', provider: 'claude' },
      { role: 'lantern-bearer', provider: 'perplexity' },
      { role: 'cartographer', provider: 'gemini' },
      { role: 'inquisitor', provider: 'claude' },
      { role: 'empath', provider: 'chatgpt' },
      { role: 'smith', provider: 'claude' },
      { role: 'royal-scribe', provider: 'chatgpt' },
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
    practicalTitle: 'Obscure & Esoteric Deep Research',
    description: 'Research obscure, fragmented, or poorly indexed subjects: search broadly, separate evidence from folklore, map connections, and synthesize a coherent account.',
    party: [
      { role: 'master-of-questions', provider: 'claude' },
      { role: 'scout', provider: 'google' },
      { role: 'scout', provider: 'perplexity' },
      { role: 'archivist', provider: 'claude' },
      { role: 'lantern-bearer', provider: 'perplexity' },
      { role: 'cartographer', provider: 'gemini' },
      { role: 'oracle', provider: 'chatgpt' },
      { role: 'royal-scribe', provider: 'claude' },
    ],
    rules: {
      requireNovelContribution: true,
      labelEvidenceVsInference: true,
    },
  },
  {
    id: 'scholars-conclave',
    fantasyTitle: "Scholar's Conclave",
    practicalTitle: 'Academic Deep Research',
    description: 'Frame a research question, locate and verify evidence, organize schools of thought, challenge methodology, and synthesize an academically responsible answer.',
    party: [
      { role: 'master-of-questions', provider: 'claude' },
      { role: 'scout', provider: 'google' },
      { role: 'lantern-bearer', provider: 'perplexity' },
      { role: 'archivist', provider: 'claude' },
      { role: 'cartographer', provider: 'gemini' },
      { role: 'inquisitor', provider: 'claude' },
      { role: 'magistrate', provider: 'chatgpt' },
      { role: 'royal-scribe', provider: 'claude' },
    ],
    rules: {
      requireDisagreement: true,
      labelEvidenceVsInference: true,
      preserveDissentInSynthesis: true,
    },
  },
  {
    id: 'academy',
    fantasyTitle: 'Academy',
    practicalTitle: 'Pedagogical Approach',
    description: "Work out what a learner needs, map prerequisites, respect the learner's perspective, generate teaching approaches, and build a coherent educational explanation.",
    party: [
      { role: 'master-of-questions', provider: 'claude' },
      { role: 'cartographer', provider: 'gemini' },
      { role: 'empath', provider: 'chatgpt' },
      { role: 'archivist', provider: 'claude' },
      { role: 'wild-mage', provider: 'gemini' },
      { role: 'smith', provider: 'claude' },
      { role: 'royal-scribe', provider: 'chatgpt' },
    ],
    rules: { forbidRepetition: true },
  },
  {
    id: 'decision-chamber',
    fantasyTitle: 'Decision Chamber',
    practicalTitle: 'Compare Options & Decide',
    description: 'Define the decision and criteria, establish facts, develop a serious competing option, examine consequences, and deliver a reasoned recommendation.',
    party: [
      { role: 'cartographer', provider: 'gemini' },
      { role: 'lantern-bearer', provider: 'perplexity' },
      { role: 'rival', provider: 'chatgpt' },
      { role: 'inquisitor', provider: 'claude' },
      { role: 'oracle', provider: 'gemini' },
      { role: 'magistrate', provider: 'claude' },
      { role: 'royal-scribe', provider: 'chatgpt' },
    ],
    rules: {
      labelEvidenceVsInference: true,
      preserveDissentInSynthesis: true,
    },
  },
  {
    id: 'trial-by-fire',
    fantasyTitle: 'Trial by Fire',
    practicalTitle: 'Aggressive Stress Testing',
    description: 'Stress-test a proposal from multiple adversarial angles, force alternatives, run a second robustness pass, and document what survives.',
    party: [
      { role: 'cartographer', provider: 'chatgpt' },
      { role: 'inquisitor', provider: 'claude' },
      { role: 'saboteur', provider: 'grok' },
      { role: 'rival', provider: 'gemini' },
      { role: 'saboteur', provider: 'claude' },
      { role: 'magistrate', provider: 'claude' },
      { role: 'royal-scribe', provider: 'chatgpt' },
    ],
    rules: {
      requireDisagreement: true,
      forbidRepetition: true,
      preserveDissentInSynthesis: true,
    },
    variables: { dissent: 'adversarial' },
  },
  {
    id: 'war-room',
    fantasyTitle: 'War Room',
    practicalTitle: 'Strategic Planning',
    description: 'Map the situation, gather intelligence, explore scenarios, develop competing strategies, assess resources and risks, and produce a coherent strategic plan.',
    party: [
      { role: 'cartographer', provider: 'gemini' },
      { role: 'scout', provider: 'perplexity' },
      { role: 'oracle', provider: 'chatgpt' },
      { role: 'rival', provider: 'gemini' },
      { role: 'saboteur', provider: 'claude' },
      { role: 'quartermaster', provider: 'chatgpt' },
      { role: 'magistrate', provider: 'claude' },
      { role: 'royal-scribe', provider: 'chatgpt' },
    ],
    rules: {
      forbidRepetition: true,
      preserveDissentInSynthesis: true,
    },
  },
  {
    id: 'workshop',
    fantasyTitle: 'Workshop',
    practicalTitle: 'Practical Problem Solving',
    description: 'Clarify the real problem, map causes, gather missing information, generate unconventional options, combine the strongest ideas, and build a workable solution.',
    party: [
      { role: 'master-of-questions', provider: 'claude' },
      { role: 'cartographer', provider: 'chatgpt' },
      { role: 'scout', provider: 'perplexity' },
      { role: 'wild-mage', provider: 'grok' },
      { role: 'alchemist', provider: 'gemini' },
      { role: 'smith', provider: 'claude' },
      { role: 'royal-scribe', provider: 'chatgpt' },
    ],
    rules: {
      requireNovelContribution: true,
      forbidRepetition: true,
    },
  },
  {
    id: 'oracles-table',
    fantasyTitle: "Oracle's Table",
    practicalTitle: 'Forecasting & Prediction',
    description: 'Establish the current situation, gather signals, run independent scenario analyses, challenge overconfidence, and produce a calibrated final outlook.',
    party: [
      { role: 'cartographer', provider: 'gemini' },
      { role: 'scout', provider: 'perplexity' },
      { role: 'lantern-bearer', provider: 'google' },
      { role: 'oracle', provider: 'chatgpt' },
      { role: 'oracle', provider: 'gemini' },
      { role: 'inquisitor', provider: 'claude' },
      { role: 'magistrate', provider: 'claude' },
      { role: 'royal-scribe', provider: 'chatgpt' },
    ],
    rules: {
      labelEvidenceVsInference: true,
      preserveDissentInSynthesis: true,
      distinguishConsensusFromMinority: true,
    },
  },
  {
    id: 'creative-studio',
    fantasyTitle: 'Creative Studio',
    practicalTitle: 'Creative Development',
    description: 'Clarify the creative goal, diverge across multiple passes, weigh audience and emotional effect, combine the strongest concepts, and develop the chosen one fully.',
    party: [
      { role: 'master-of-questions', provider: 'claude' },
      { role: 'wild-mage', provider: 'grok' },
      { role: 'wild-mage', provider: 'chatgpt' },
      { role: 'rival', provider: 'gemini' },
      { role: 'empath', provider: 'claude' },
      { role: 'alchemist', provider: 'chatgpt' },
      { role: 'smith', provider: 'claude' },
    ],
    rules: { requireNovelContribution: true },
    variables: { dissent: 'collaborative' },
  },
  {
    id: 'socratic-circle',
    fantasyTitle: 'Socratic Circle',
    practicalTitle: 'Deep Questioning & Inquiry',
    description: 'Interrogate definitions and assumptions through layered questioning, map what the questions reveal, and synthesize what has genuinely been learned.',
    party: [
      { role: 'master-of-questions', provider: 'claude' },
      { role: 'master-of-questions', provider: 'chatgpt' },
      { role: 'cartographer', provider: 'gemini' },
      { role: 'inquisitor', provider: 'claude' },
      { role: 'empath', provider: 'chatgpt' },
      { role: 'oracle', provider: 'gemini' },
      { role: 'royal-scribe', provider: 'claude' },
    ],
    rules: {
      requireDisagreement: true,
      forbidRepetition: true,
    },
  },
  {
    id: 'campaign',
    fantasyTitle: 'Campaign',
    practicalTitle: 'Implementation & Execution Planning',
    description: 'Turn an accepted objective into an executable campaign: resolve unknowns, gather information, resource and sequence the work, harden it against risk, and issue the final ordered plan.',
    party: [
      { role: 'cartographer', provider: 'gemini' },
      { role: 'master-of-questions', provider: 'claude' },
      { role: 'scout', provider: 'perplexity' },
      { role: 'quartermaster', provider: 'chatgpt' },
      { role: 'saboteur', provider: 'claude' },
      { role: 'smith', provider: 'chatgpt' },
      { role: 'magistrate', provider: 'claude' },
      { role: 'royal-scribe', provider: 'chatgpt' },
    ],
    rules: { forbidRepetition: true },
  },
];

// -------------------------------------------------------------------------
// Council of X: X genuinely equal voting Councillors.
//
// Every deliberating seat uses the dedicated Councillor role (the same role
// intentionally duplicated across all seats), each seat deliberates
// independently (one shared independent round; each seat sees the original
// request only), and default providers are distributed across seats in
// canonical registry order — an arbitrary but deterministic rotation in
// which no provider is senior to another. Seats repeat providers when X
// exceeds the registry.
//
// Honest boundaries: explicit voting semantics (casting, tallying,
// persistence, ties, reporting) are future execution work; true parallel
// round execution is a later slice (independent-round currently composes
// against the original request and executes serially); and there is no
// synthesis seat — a future non-voting synthesis/tally stage will be modeled
// separately rather than silently consuming one of the X voting seats, which
// means today a Council of X run has no consolidated final stage.
// -------------------------------------------------------------------------

function buildCouncilOfX(options: CouncilPresetBuildOptions = {}): CouncilConfiguration {
  const size = options.size ?? councilOfXDefaultSize;

  if (!Number.isInteger(size) || size < councilOfXMinSize || size > councilOfXMaxSize) {
    throw new Error(
      `Council of X size must be an integer between ${councilOfXMinSize} and ${councilOfXMaxSize}; received ${JSON.stringify(options.size)}.`,
    );
  }

  requireRole('councillor');

  const stages = Array.from({ length: size }, (_, index): CouncilStage => ({
    id: `stage-${index + 1}-councillor`,
    provider: councilProviders[index % councilProviders.length].id,
    role: 'councillor',
    inputPolicy: 'independent-round',
    round: 'deliberation',
    failurePolicy: 'skip-and-record',
  }));

  return {
    schemaVersion: councilSchemaVersion,
    id: options.id ?? `council-of-${size}`,
    name: options.name ?? `Council of ${size}`,
    description: 'A council of equal voting Councillors who each deliberate independently and hold one vote. Vote casting, tallying, and any non-voting synthesis stage are future execution work.',
    presetId: 'council-of-x',
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

function fixedPreset(definition: FixedPresetDefinition): CouncilPreset {
  return {
    id: definition.id,
    fantasyTitle: definition.fantasyTitle,
    practicalTitle: definition.practicalTitle,
    description: definition.description,
    defaultSize: definition.party.length,
    build: (options) => buildFixedConfiguration(definition, options),
  };
}

function requireDefinition(id: string): FixedPresetDefinition {
  const definition = fixedPresetDefinitions.find((candidate) => candidate.id === id);

  if (!definition) {
    throw new Error(`Missing built-in preset definition "${id}".`);
  }

  return definition;
}

// Canonical preset order (approved 2026-07-13).
export const councilPresets: CouncilPreset[] = [
  fixedPreset(requireDefinition('concord')),
  fixedPreset(requireDefinition('idea-forge')),
  fixedPreset(requireDefinition('crucible')),
  fixedPreset(requireDefinition('editorial-court')),
  {
    id: 'council-of-x',
    fantasyTitle: 'Council of X',
    practicalTitle: 'Equal Deliberation & Voting',
    description: 'A configurable council of X equal voting Councillors who each deliberate independently and hold one vote. Vote casting, tallying, and any non-voting synthesis stage are future execution work.',
    defaultSize: councilOfXDefaultSize,
    build: buildCouncilOfX,
  },
  fixedPreset(requireDefinition('arcane-expedition')),
  fixedPreset(requireDefinition('scholars-conclave')),
  fixedPreset(requireDefinition('academy')),
  fixedPreset(requireDefinition('decision-chamber')),
  fixedPreset(requireDefinition('trial-by-fire')),
  fixedPreset(requireDefinition('war-room')),
  fixedPreset(requireDefinition('workshop')),
  fixedPreset(requireDefinition('oracles-table')),
  fixedPreset(requireDefinition('creative-studio')),
  fixedPreset(requireDefinition('socratic-circle')),
  fixedPreset(requireDefinition('campaign')),
];

export function getCouncilPreset(id: string): CouncilPreset | undefined {
  return councilPresets.find((preset) => preset.id === id);
}
