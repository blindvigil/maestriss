// Deterministic cognitive-guidance instruction catalog.
//
// Fixed provider-facing text for the five prose-driven cognitive stats
// (Temperament, Voice, Conviction, Dissent, Depth), ten locked entries each,
// indexed by level 0-9. Level 5 is neutral and emits no instruction, so an
// all-neutral seat contributes no cognitive-guidance section at all: sparse
// injection is intentional to keep prompts high-signal.
//
// Memory is primarily mechanical (prior-contribution exposure, applied in
// prompt composition via memoryExposureByLevel) and deliberately emits no
// prose here.
//
// This catalog is a separate prompt layer from Calling flavour text: flavour
// text answers "what kind of thinker am I?", cognitive guidance answers "how
// should I behave in this particular seat?". Stat wording is never
// concatenated into canonical flavour-text storage.
//
// Rules for this file: fixed text checked into source only — no runtime
// generation, no number interpolation ("Voice = 8" style wording is
// forbidden), monotonic semantic progression per stat, and plain benign
// wording (screened by the refusal-safety assertions). Conviction must never
// instruct an AI to ignore facts or corrections; Dissent stays analytical
// and is never hostility toward people.

import {
  cognitiveStatKeys,
  neutralCognitiveStatLevel,
  type CognitiveStatKey,
  type CognitiveStats,
} from './cognitiveStats.js';

export const proseCognitiveStatKeys = [
  'temperament',
  'voice',
  'conviction',
  'dissent',
  'depth',
] as const satisfies readonly CognitiveStatKey[];

export type ProseCognitiveStatKey = (typeof proseCognitiveStatKeys)[number];

export const cognitiveInstructionCatalog: Record<ProseCognitiveStatKey, readonly string[]> = {
  temperament: [
    'Prefer the most literal, constrained, and evidence-bound interpretation. Avoid speculative expansion unless it is necessary to answer the question.',
    'Stay extremely precise and conservative. Favor direct interpretations and well-supported possibilities over imaginative alternatives.',
    'Favor precise, grounded interpretation. Explore alternatives only when they are clearly relevant.',
    'Lean toward precision and restraint, while allowing limited exploration when it improves the analysis.',
    'Remain somewhat more precise than imaginative. Consider modest alternative interpretations without drifting far from the evidence.',
    '',
    'Allow useful imaginative exploration beyond the most obvious interpretation while remaining grounded.',
    'Actively explore non-obvious possibilities, alternative framings, and useful associations.',
    'Favor imaginative and unconventional exploration. Seek surprising combinations and possibilities others may overlook.',
    'Push strongly beyond conventional interpretations. Explore bold, unusual, associative, and highly imaginative possibilities wherever they may reveal useful directions.',
  ],
  voice: [
    'State only the essential answer. Use the fewest words practical.',
    'Be exceptionally terse. Omit secondary explanation unless it is required for clarity.',
    'Be very concise. Include only the major reasoning needed to understand the conclusion.',
    'Favor brevity and focus tightly on the main points.',
    'Be somewhat concise while still explaining the important reasoning.',
    '',
    'Add useful explanation and develop the key reasoning beyond a bare conclusion.',
    'Give a detailed contribution with supporting explanation and relevant implications.',
    'Be highly expansive. Develop nuance, reasoning, and implications thoroughly.',
    'Fully elaborate the contribution wherever meaningful substance exists. Explore details, nuance, implications, qualifications, and supporting reasoning extensively.',
  ],
  conviction: [
    'Treat every emerging conclusion as highly provisional. Readily revise or abandon it when another contribution offers useful evidence or reasoning.',
    'Remain extremely flexible. Prefer updating the position over defending an earlier conclusion.',
    'Be highly willing to revise the position when credible alternatives or stronger reasoning appear.',
    'Lean toward adaptability. Defend conclusions lightly and update them readily when the case changes.',
    'Remain somewhat flexible and open to revision while preserving conclusions that still appear well supported.',
    '',
    'Hold supported conclusions with moderate confidence, but revise them when competing reasoning is materially stronger.',
    'Defend the strongest supported position firmly while remaining responsive to substantial counterevidence.',
    'Be highly resolute. Require strong evidence or reasoning before abandoning the position you judge best supported.',
    'Commit strongly to the position you judge best supported and defend it rigorously. Revise only when competing reasoning materially defeats the case.',
  ],
  dissent: [
    'Prioritize harmony, constructive extension, and reconciliation. Seek compatible interpretations before emphasizing disagreement.',
    'Strongly favor cooperation and common ground. Raise disagreement only when it materially matters.',
    'Favor constructive development of prior material and look for ways positions can coexist.',
    'Lean cooperative. Prefer refinement and reconciliation while still noting important weaknesses.',
    'Be somewhat collaborative, but identify meaningful disagreement when necessary.',
    '',
    'Lean toward challenge. Test prior material and state substantive disagreement clearly.',
    'Actively seek weaknesses, counterarguments, and meaningful points of disagreement.',
    'Favor adversarial examination. Challenge assumptions and pressure-test conclusions aggressively.',
    'Relentlessly search for substantive disagreement, weak assumptions, counterarguments, and failure points. Prioritize rigorous challenge over harmony.',
  ],
  depth: [
    'Identify the most consequential point quickly and avoid secondary analysis.',
    'Focus only on the few highest-impact considerations. Avoid exhaustive exploration.',
    'Keep the analysis shallow and practical. Address the main reasoning without pursuing distant implications.',
    'Favor a focused analysis of the central issues with limited examination of edge cases.',
    'Examine the main reasoning and a small number of important implications.',
    '',
    'Examine the central reasoning and important implications in meaningful detail.',
    'Analyze assumptions, consequences, and relevant alternatives beyond the obvious surface answer.',
    'Perform a deep analysis of assumptions, edge cases, downstream effects, and serious alternative interpretations.',
    'Examine the problem exhaustively where useful. Trace assumptions, edge cases, interactions, downstream consequences, competing interpretations, and second-order effects in depth.',
  ],
};

// Every provider-facing sentence this catalog can emit, for refusal-safety
// screening alongside the composition instruction catalog.
export const cognitiveGuidanceInstructionTexts: string[] = proseCognitiveStatKeys.flatMap(
  (stat) => cognitiveInstructionCatalog[stat].filter((text) => text.length > 0),
);

// Renders the sparse cognitive-guidance section for a resolved stat set:
// only non-neutral prose stats emit a line, in canonical stat order, and an
// all-neutral set renders nothing at all. Memory never emits prose.
export function renderCognitiveGuidance(stats: CognitiveStats): string {
  const lines = proseCognitiveStatKeys
    .filter((stat) => stats[stat] !== neutralCognitiveStatLevel)
    .map((stat) => `- ${cognitiveInstructionCatalog[stat][stats[stat]]}`);

  if (lines.length === 0) {
    return '';
  }

  return ['Cognitive guidance:', ...lines].join('\n');
}

// Compile-time guarantee that the prose keys stay aligned with the canonical
// six-stat vocabulary (memory is deliberately the only non-prose stat).
const nonProseKeys = cognitiveStatKeys.filter(
  (key) => !(proseCognitiveStatKeys as readonly string[]).includes(key),
);

if (nonProseKeys.length !== 1 || nonProseKeys[0] !== 'memory') {
  throw new Error('Cognitive guidance catalog is out of sync with the canonical cognitive stat keys.');
}
