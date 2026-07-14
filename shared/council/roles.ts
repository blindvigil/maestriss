// Council role library: structural role identity and metadata only.
//
// Fantasy titles are presentation for Studio and reports. The provider-facing
// behavioral prompt content ("flavour text") is a separate concern owned by
// roleFlavourText.ts, keyed by the stable role id, so that the Studio editor
// and the Runner prompt composition consume one canonical source. Flavour
// wording must stay plain, constructive, and benign: live baton testing
// showed that security-flavored wording (e.g. "token", "verification") can
// trigger provider refusals even for harmless tasks. Refusal-safety
// assertions in the council suite enforce this for every role.

import type { CouncilOutputPolicy, CouncilVariableOverrides } from './schema.js';

export type CouncilRolePosition = 'opening' | 'middle' | 'final';

export type RoleDefinition = {
  id: string;
  fantasyTitle: string;
  practicalTitle: string;
  description: string;
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
    defaultOutputPolicy: 'fact-check-report',
    preferredPosition: 'opening',
    providerAffinity: ['perplexity', 'google', 'gemini'],
  },
  {
    id: 'inquisitor',
    fantasyTitle: 'The Inquisitor',
    practicalTitle: 'Skeptic / Critical Reviewer',
    description: 'Challenges assumptions and finds weaknesses, preserving only what survives scrutiny.',
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
    defaultOutputPolicy: 'alternative-proposal',
    preferredPosition: 'middle',
    providerAffinity: ['gemini', 'chatgpt', 'claude'],
  },
  {
    id: 'wild-mage',
    fantasyTitle: 'The Wild Mage',
    practicalTitle: 'Innovator / Divergent Thinker',
    description: 'Expands the option space with unconventional possibilities and non-obvious alternatives.',
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
    defaultOutputPolicy: 'recommendation',
    preferredPosition: 'final',
    providerAffinity: ['claude', 'chatgpt'],
  },
  {
    id: 'royal-scribe',
    fantasyTitle: 'The Royal Scribe',
    practicalTitle: 'Editor in Chief / Final Synthesizer',
    description: 'Consolidates all contributions into the council\'s final answer without inventing consensus.',
    defaultOutputPolicy: 'final-answer',
    preferredPosition: 'final',
    providerAffinity: ['chatgpt', 'claude'],
  },
];

export function getCouncilRole(id: string): RoleDefinition | undefined {
  return councilRoles.find((role) => role.id === id);
}
