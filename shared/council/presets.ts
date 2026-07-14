// Built-in council presets: deterministic, code-backed factories that produce
// complete Council Configurations. A future user-created preset is simply a
// saved Council Configuration document; it needs no second architecture.

import { getCouncilRole, type RoleDefinition } from './roles.js';
import {
  councilSchemaVersion,
  defaultCouncilBudgets,
  defaultCouncilRules,
  defaultCouncilVariables,
  type CouncilConfiguration,
  type CouncilFailurePolicy,
  type CouncilInputPolicy,
  type CouncilStage,
} from './schema.js';

export type CouncilPresetBuildOptions = {
  id?: string;
  name?: string;
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
  build: (options?: CouncilPresetBuildOptions) => CouncilConfiguration;
};

export const councilOfXMinSize = 2;
export const councilOfXMaxSize = 12;
export const councilOfXDefaultSize = 4;

function requireRole(id: string): RoleDefinition {
  const role = getCouncilRole(id);

  if (!role) {
    throw new Error(`Council preset references unknown role "${id}".`);
  }

  return role;
}

// Deterministic provider assignment: prefer the role's first affinity
// provider that has not been used yet, then fall back to its first affinity.
// Multiple stages may legitimately share a provider.
function pickProvider(role: RoleDefinition, usedProviders: Set<string>): string {
  const affinity = role.providerAffinity ?? [];
  const unused = affinity.find((provider) => !usedProviders.has(provider));
  const chosen = unused ?? affinity[0] ?? 'chatgpt';
  usedProviders.add(chosen);
  return chosen;
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

function buildStage(
  index: number,
  roleId: string,
  usedProviders: Set<string>,
  inputPolicy: CouncilInputPolicy,
  failurePolicy: CouncilFailurePolicy,
): CouncilStage {
  const role = requireRole(roleId);

  return {
    id: `stage-${index + 1}-${roleId}`,
    provider: pickProvider(role, usedProviders),
    role: roleId,
    inputPolicy,
    failurePolicy,
  };
}

function buildCouncilOfX(options: CouncilPresetBuildOptions = {}): CouncilConfiguration {
  const size = options.size ?? councilOfXDefaultSize;

  if (!Number.isInteger(size) || size < councilOfXMinSize || size > councilOfXMaxSize) {
    throw new Error(
      `Council of X size must be an integer between ${councilOfXMinSize} and ${councilOfXMaxSize}; received ${JSON.stringify(options.size)}.`,
    );
  }

  const middleRotation = ['inquisitor', 'rival', 'wild-mage'];
  const roleIds = [
    'lantern-bearer',
    ...Array.from({ length: size - 2 }, (_, index) => middleRotation[index % middleRotation.length]),
    'royal-scribe',
  ];

  const usedProviders = new Set<string>();
  // Stage ids carry the index, so a repeated middle role stays unique.
  const stages = roleIds.map((roleId, index) => {
    const isFirst = index === 0;
    const isFinal = index === roleIds.length - 1;

    return buildStage(
      index,
      roleId,
      usedProviders,
      isFirst ? 'original-only' : isFinal ? 'full-record' : 'previous-plus-original',
      isFinal ? 'halt' : 'skip-and-record',
    );
  });

  return {
    schemaVersion: councilSchemaVersion,
    id: options.id ?? `council-of-${size}`,
    name: options.name ?? `Council of ${size}`,
    description: 'A general-purpose council: verify, challenge, and synthesize an answer to the request.',
    presetId: 'council-of-x',
    rules: {
      ...defaultCouncilRules,
      requireNovelContribution: true,
      forbidRepetition: true,
    },
    variables: { ...defaultCouncilVariables },
    budgets: { ...defaultCouncilBudgets },
    ...flavourOverridesFor(options),
    stages,
  };
}

function buildTrialByFire(options: CouncilPresetBuildOptions = {}): CouncilConfiguration {
  const usedProviders = new Set<string>();
  const stages: CouncilStage[] = [
    buildStage(0, 'inquisitor', usedProviders, 'original-only', 'skip-and-record'),
    buildStage(1, 'rival', usedProviders, 'previous-plus-original', 'skip-and-record'),
    buildStage(2, 'magistrate', usedProviders, 'full-record', 'halt'),
  ];

  return {
    schemaVersion: councilSchemaVersion,
    id: options.id ?? 'trial-by-fire',
    name: options.name ?? 'Trial by Fire',
    description: 'Stress-test an idea: challenge it, field a competing approach, then judge the tradeoffs.',
    presetId: 'trial-by-fire',
    rules: {
      ...defaultCouncilRules,
      requireDisagreement: true,
      forbidRepetition: true,
      preserveDissentInSynthesis: true,
    },
    variables: {
      ...defaultCouncilVariables,
      dissent: 'adversarial',
    },
    budgets: { ...defaultCouncilBudgets },
    ...flavourOverridesFor(options),
    stages,
  };
}

function buildEditorialCourt(options: CouncilPresetBuildOptions = {}): CouncilConfiguration {
  const usedProviders = new Set<string>();
  const stages: CouncilStage[] = [
    buildStage(0, 'lantern-bearer', usedProviders, 'original-only', 'skip-and-record'),
    buildStage(1, 'inquisitor', usedProviders, 'previous-plus-original', 'skip-and-record'),
    buildStage(2, 'wild-mage', usedProviders, 'previous-plus-original', 'skip-and-record'),
    buildStage(3, 'royal-scribe', usedProviders, 'full-record', 'halt'),
  ];

  return {
    schemaVersion: councilSchemaVersion,
    id: options.id ?? 'editorial-court',
    name: options.name ?? 'The Editorial Court',
    description: 'An editorial panel: verify, challenge, expand, and deliver a polished final document.',
    presetId: 'editorial-court',
    rules: {
      ...defaultCouncilRules,
      forbidRepetition: true,
      labelEvidenceVsInference: true,
      preserveDissentInSynthesis: true,
      distinguishConsensusFromMinority: true,
    },
    variables: { ...defaultCouncilVariables },
    budgets: { ...defaultCouncilBudgets },
    ...flavourOverridesFor(options),
    stages,
  };
}

export const councilPresets: CouncilPreset[] = [
  {
    id: 'council-of-x',
    fantasyTitle: 'Council of X',
    practicalTitle: 'General Configurable Council',
    description: 'A configurable council of X participants that verifies, challenges, and synthesizes.',
    build: buildCouncilOfX,
  },
  {
    id: 'trial-by-fire',
    fantasyTitle: 'Trial by Fire',
    practicalTitle: 'Idea Stress-Test',
    description: 'Challenge an idea from several directions and judge what survives.',
    build: buildTrialByFire,
  },
  {
    id: 'editorial-court',
    fantasyTitle: 'The Editorial Court',
    practicalTitle: 'Editorial Panel',
    description: 'Review, improve, and deliver a polished final document.',
    build: buildEditorialCourt,
  },
];

export function getCouncilPreset(id: string): CouncilPreset | undefined {
  return councilPresets.find((preset) => preset.id === id);
}
