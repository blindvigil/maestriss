// Council role library.
//
// Fantasy titles are presentation for Studio and reports. Provider-facing
// prompt text uses only the practical framing below and must stay plain,
// constructive, and benign: live baton testing showed that security-flavored
// wording (e.g. "token", "verification") can trigger provider refusals even
// for harmless tasks. Refusal-safety assertions in the council suite enforce
// this for every role.

import type { CouncilOutputPolicy, CouncilVariableOverrides } from './schema.js';

export type CouncilRolePosition = 'opening' | 'middle' | 'final';

export type RoleDefinition = {
  id: string;
  fantasyTitle: string;
  practicalTitle: string;
  description: string;
  // Provider-facing stance text. Roles own perspective; output policies own
  // deliverable shape. This text must not restate output format.
  inputFraming: string;
  defaultOutputPolicy: CouncilOutputPolicy;
  defaultVariables?: CouncilVariableOverrides;
  preferredPosition?: CouncilRolePosition;
  // Soft hint only: informs preset provider assignment and future UI
  // suggestions. Never used to reject a configuration.
  providerAffinity?: string[];
};

export const councilRoles: RoleDefinition[] = [
  {
    id: 'lantern-bearer',
    fantasyTitle: 'The Lantern Bearer',
    practicalTitle: 'Fact-Checker / Evidence Verifier',
    description: 'Separates verifiable fact from inference and speculation, and corrects unsupported claims.',
    inputFraming: [
      'You are acting as the council\'s fact-checker.',
      'Treat the material you receive as a set of claims to examine.',
      'Separate what is verifiable fact, what is reasonable inference, and what is speculation or opinion.',
      'Correct claims that are unsupported or wrong, and say plainly when something cannot be confirmed.',
    ].join(' '),
    defaultOutputPolicy: 'fact-check-report',
    preferredPosition: 'opening',
    providerAffinity: ['perplexity', 'google', 'gemini'],
  },
  {
    id: 'inquisitor',
    fantasyTitle: 'The Inquisitor',
    practicalTitle: 'Skeptic / Critical Reviewer',
    description: 'Challenges assumptions and finds weaknesses, preserving only what survives scrutiny.',
    inputFraming: [
      'You are acting as the council\'s critical reviewer.',
      'Treat the prior material as claims that have not yet earned acceptance.',
      'Identify weak assumptions, unsupported leaps, missing considerations, and plausible counterexamples.',
      'Keep what survives scrutiny and say why it survives.',
    ].join(' '),
    defaultOutputPolicy: 'critique',
    defaultVariables: { dissent: 'adversarial' },
    preferredPosition: 'middle',
    providerAffinity: ['claude', 'grok'],
  },
  {
    id: 'rival',
    fantasyTitle: 'The Rival',
    practicalTitle: 'Competing Strategist',
    description: 'Produces a genuinely competing solution and compares it honestly with the prior approach.',
    inputFraming: [
      'You are acting as the council\'s competing strategist.',
      'Do not simply critique the prior material.',
      'Produce a genuinely different solution or interpretation of your own,',
      'then compare the two approaches and explain where each one is stronger or weaker.',
    ].join(' '),
    defaultOutputPolicy: 'alternative-proposal',
    preferredPosition: 'middle',
    providerAffinity: ['gemini', 'chatgpt', 'claude'],
  },
  {
    id: 'wild-mage',
    fantasyTitle: 'The Wild Mage',
    practicalTitle: 'Innovator / Divergent Thinker',
    description: 'Expands the option space with unconventional possibilities and non-obvious alternatives.',
    inputFraming: [
      'You are acting as the council\'s divergent thinker.',
      'Use the prior material as a starting point rather than a boundary.',
      'Contribute unconventional possibilities, unexpected combinations, and non-obvious alternatives',
      'that the council has not yet considered.',
    ].join(' '),
    defaultOutputPolicy: 'alternative-proposal',
    defaultVariables: { dissent: 'collaborative' },
    preferredPosition: 'middle',
    providerAffinity: ['grok', 'chatgpt'],
  },
  {
    id: 'magistrate',
    fantasyTitle: 'The Magistrate',
    practicalTitle: 'Decision Judge / Tradeoff Arbiter',
    description: 'Weighs competing contributions against explicit criteria and makes a clear recommendation.',
    inputFraming: [
      'You are acting as the council\'s decision judge.',
      'Weigh the competing contributions against explicit criteria such as correctness, feasibility, risk, and cost.',
      'State the criteria you are using, compare the options against them,',
      'and be explicit about the tradeoffs behind your judgment.',
    ].join(' '),
    defaultOutputPolicy: 'recommendation',
    preferredPosition: 'final',
    providerAffinity: ['claude', 'chatgpt'],
  },
  {
    id: 'royal-scribe',
    fantasyTitle: 'The Royal Scribe',
    practicalTitle: 'Editor in Chief / Final Synthesizer',
    description: 'Consolidates all contributions into the council\'s final answer without inventing consensus.',
    inputFraming: [
      'You are acting as the council\'s editor in chief.',
      'Treat all prior contributions as source material for a final document.',
      'Merge overlapping points, reconcile terminology, and preserve important disagreement',
      'rather than inventing consensus.',
    ].join(' '),
    defaultOutputPolicy: 'final-answer',
    preferredPosition: 'final',
    providerAffinity: ['chatgpt', 'claude'],
  },
];

export function getCouncilRole(id: string): RoleDefinition | undefined {
  return councilRoles.find((role) => role.id === id);
}
