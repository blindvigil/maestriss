// Display-only descriptors for cognitive stat levels.
//
// These short human-readable labels are presentation metadata for operator
// output (Runner CLI today, Studio UI later). They are NEVER provider-facing
// and must not become a second instruction catalog: the only provider-facing
// wording for cognitive stats lives in cognitiveGuidance.ts.
//
// The five prose stats use a deterministic intensity scale mirrored around
// neutral; Memory uses mechanical labels describing its actual exposure
// behavior, which is more useful to an operator than an intensity adjective.

import type { CognitiveStatKey, CognitiveStatLevel } from './cognitiveStats.js';

const statPoles: Record<Exclude<CognitiveStatKey, 'memory'>, [string, string]> = {
  temperament: ['Precise', 'Imaginative'],
  voice: ['Terse', 'Expansive'],
  conviction: ['Adaptable', 'Resolute'],
  dissent: ['Cooperative', 'Adversarial'],
  depth: ['Swift', 'Exhaustive'],
};

// Indexed by distance from neutral (1-5).
const intensityByDistance = ['', 'Slightly', 'Moderately', 'Strongly', 'Extremely', 'Maximally'];

const memoryDescriptors: readonly string[] = [
  'Isolated — no prior contributions',
  'Newest contribution only, quarter cap',
  'Newest contribution only, half cap',
  'Newest contribution only',
  'Newest 2 contributions',
  'Neutral — input-policy default',
  'Newest 3 contributions',
  'Newest 4 contributions',
  'Newest 6 contributions',
  'Full eligible record',
];

export function describeCognitiveLevel(stat: CognitiveStatKey, level: CognitiveStatLevel): string {
  if (stat === 'memory') {
    return memoryDescriptors[level];
  }

  if (level === 5) {
    return 'Neutral';
  }

  const [left, right] = statPoles[stat];
  const distance = Math.abs(level - 5);
  return `${intensityByDistance[distance]} ${level < 5 ? left : right}`;
}
