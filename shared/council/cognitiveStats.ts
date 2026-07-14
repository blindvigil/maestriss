// Canonical cognitive stats: the six Maestriss behavioral dimensions.
//
// A cognitive stat is a Maestriss product concept, not a provider API
// parameter. Temperament is not API temperature, Depth is not a
// reasoning-token budget, and Memory is not a native context-window setting.
// Current execution drives provider web interfaces, so stats act through
// deterministic provider-facing instructions (cognitiveGuidance.ts) and
// mechanical prior-contribution exposure (Memory, applied inside prompt
// composition). A future API-backed execution layer may additionally map
// compatible stats onto native provider parameters; that mapping is
// deliberately out of scope here.
//
// Each stat stores exactly one of ten deterministic levels, 0-9:
//   0 = strongest left extreme ... 5 = neutral ... 9 = strongest right extreme
// The six dimensions, in canonical order:
//   temperament  Precise      <-> Imaginative
//   voice        Terse        <-> Expansive
//   conviction   Adaptable    <-> Resolute
//   dissent      Cooperative  <-> Adversarial
//   depth        Swift        <-> Exhaustive
//   memory       Isolated     <-> Full Council
//
// Resolution precedence (highest priority first):
//   Formation seat override > Calling default > provider default > neutral.
// Suggested AI is advisory metadata and never participates in resolution;
// the provider actually assigned to the Formation seat is authoritative.
//
// Calling intensity (roleIntensity) is a separate mechanism: it selects full
// Calling flavour text versus the light one-line framing and is not a
// cognitive stat.

import { getCouncilCalling } from './callings.js';

export type CognitiveStatLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type CognitiveStats = {
  temperament: CognitiveStatLevel;
  voice: CognitiveStatLevel;
  conviction: CognitiveStatLevel;
  dissent: CognitiveStatLevel;
  depth: CognitiveStatLevel;
  memory: CognitiveStatLevel;
};

export type CognitiveStatOverrides = Partial<CognitiveStats>;

export const cognitiveStatKeys = [
  'temperament',
  'voice',
  'conviction',
  'dissent',
  'depth',
  'memory',
] as const;

export type CognitiveStatKey = (typeof cognitiveStatKeys)[number];

export const neutralCognitiveStatLevel: CognitiveStatLevel = 5;

export const neutralCognitiveStats: CognitiveStats = {
  temperament: 5,
  voice: 5,
  conviction: 5,
  dissent: 5,
  depth: 5,
  memory: 5,
};

export function isCognitiveStatLevel(value: unknown): value is CognitiveStatLevel {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 9;
}

// Maestriss product defaults per AI engine (approved first calibration).
// These are deliberate product characterizations of how each engine is used
// inside a Council — NOT empirical or scientific claims about provider
// psychology. Google AI Mode deliberately uses neutral defaults and stays
// outside the balanced eight-engine Suggested Calling ownership model.
// Data only: provider-facing prose lives in cognitiveGuidance.ts.
export const providerCognitiveDefaults: Record<string, CognitiveStats> = {
  chatgpt: { temperament: 5, voice: 5, conviction: 5, dissent: 5, depth: 7, memory: 5 },
  claude: { temperament: 4, voice: 7, conviction: 4, dissent: 5, depth: 9, memory: 7 },
  gemini: { temperament: 7, voice: 7, conviction: 5, dissent: 4, depth: 7, memory: 7 },
  grok: { temperament: 9, voice: 5, conviction: 7, dissent: 9, depth: 5, memory: 5 },
  deepseek: { temperament: 4, voice: 5, conviction: 7, dissent: 5, depth: 9, memory: 5 },
  copilot: { temperament: 4, voice: 5, conviction: 5, dissent: 4, depth: 5, memory: 5 },
  perplexity: { temperament: 0, voice: 5, conviction: 5, dissent: 5, depth: 7, memory: 5 },
  reka: { temperament: 5, voice: 5, conviction: 4, dissent: 4, depth: 5, memory: 7 },
  google: { ...neutralCognitiveStats },
};

// Pure, deterministic resolution of all six stats for one Formation seat.
// Layers merge lowest priority first; unknown provider or Calling ids simply
// contribute nothing from that layer. Inputs are never mutated.
export function resolveCognitiveStats(
  providerId: string,
  callingId: string,
  seatOverrides?: CognitiveStatOverrides,
): CognitiveStats {
  return {
    ...neutralCognitiveStats,
    ...(providerCognitiveDefaults[providerId] ?? {}),
    ...(getCouncilCalling(callingId)?.cognitiveDefaults ?? {}),
    ...(seatOverrides ?? {}),
  };
}

// Mechanical Memory exposure: how much input-policy-eligible prior material
// a seat actually receives. Input policy remains authoritative for
// ELIGIBILITY (and for original-request inclusion); Memory only narrows the
// eligible set and can never expand it. independent-round therefore exposes
// zero prior contributions at every Memory level.
export type MemoryExposure = {
  // Maximum number of newest eligible contributions to expose. Absent means
  // no count narrowing: the input policy's own selection is preserved.
  maxContributions?: number;
  // Optional tightened per-contribution cap, as a fraction of the Council's
  // perContributionChars budget.
  capFraction?: number;
};

// Level 5 preserves current input-policy behavior exactly (no narrowing).
// Level 9 exposes all eligible contributions within normal prompt budgets —
// mechanically identical to level 5 today because every input policy's
// default selection already equals its eligible set; the distinction is
// reserved for future policies whose default exposure is narrower than
// their eligibility.
export const memoryExposureByLevel: Record<CognitiveStatLevel, MemoryExposure> = {
  0: { maxContributions: 0 },
  1: { maxContributions: 1, capFraction: 0.25 },
  2: { maxContributions: 1, capFraction: 0.5 },
  3: { maxContributions: 1 },
  4: { maxContributions: 2 },
  5: {},
  6: { maxContributions: 3 },
  7: { maxContributions: 4 },
  8: { maxContributions: 6 },
  9: {},
};
