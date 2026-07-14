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

export type CouncilRolePosition = 'opening' | 'middle' | 'late' | 'final';

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
    fantasyTitle: 'Lantern Bearer',
    practicalTitle: 'Fact-Checker / Evidence Verifier',
    description: 'Separates fact from inference and speculation, checks important claims, and corrects unsupported or inaccurate statements.',
    defaultOutputPolicy: 'fact-check-report',
    preferredPosition: 'opening',
    providerAffinity: ['perplexity', 'google', 'gemini'],
  },
  {
    id: 'inquisitor',
    fantasyTitle: 'Inquisitor',
    practicalTitle: 'Skeptic / Critical Reviewer',
    description: 'Challenges assumptions, tests reasoning, and looks for weaknesses, missing evidence, and plausible counterexamples.',
    defaultOutputPolicy: 'critique',
    defaultVariables: { dissent: 'adversarial' },
    preferredPosition: 'middle',
    providerAffinity: ['claude', 'grok'],
  },
  {
    id: 'rival',
    fantasyTitle: 'Rival',
    practicalTitle: 'Competing Strategist / Alternative Solution Generator',
    description: 'Produces a genuinely different approach rather than merely agreeing with or criticizing the previous one.',
    defaultOutputPolicy: 'alternative-proposal',
    preferredPosition: 'middle',
    providerAffinity: ['gemini', 'chatgpt', 'claude'],
  },
  {
    id: 'wild-mage',
    fantasyTitle: 'Wild Mage',
    practicalTitle: 'Innovator / Divergent Thinker',
    description: 'Expands the option space with unconventional ideas, unexpected combinations, and possibilities others may overlook.',
    defaultOutputPolicy: 'alternative-proposal',
    defaultVariables: { dissent: 'collaborative' },
    preferredPosition: 'middle',
    providerAffinity: ['grok', 'chatgpt', 'gemini'],
  },
  {
    id: 'royal-scribe',
    fantasyTitle: 'Royal Scribe',
    practicalTitle: 'Editor in Chief / Final Synthesizer',
    description: 'Turns multiple contributions into a coherent final answer without erasing meaningful disagreement.',
    defaultOutputPolicy: 'final-answer',
    preferredPosition: 'final',
    providerAffinity: ['chatgpt', 'claude'],
  },
  {
    id: 'magistrate',
    fantasyTitle: 'Magistrate',
    practicalTitle: 'Decision Judge / Tradeoff Arbiter',
    description: 'Compares competing options against explicit criteria and makes a reasoned judgment.',
    defaultOutputPolicy: 'recommendation',
    preferredPosition: 'late',
    providerAffinity: ['claude', 'chatgpt'],
  },
  {
    id: 'empath',
    fantasyTitle: 'Empath',
    practicalTitle: 'Human Impact / Stakeholder Reviewer',
    description: 'Examines how a proposal affects the people involved, including different needs, incentives, fears, and unintended consequences.',
    defaultOutputPolicy: 'free-response',
    preferredPosition: 'middle',
    providerAffinity: ['claude', 'chatgpt'],
  },
  {
    id: 'saboteur',
    fantasyTitle: 'Saboteur',
    practicalTitle: 'Failure-Mode Analyst / Defensive Red Team',
    description: 'Looks for realistic ways a proposal could fail, break down, be misused, or produce unintended consequences.',
    defaultOutputPolicy: 'critique',
    defaultVariables: { dissent: 'adversarial' },
    preferredPosition: 'middle',
    providerAffinity: ['claude', 'grok', 'chatgpt'],
  },
  {
    id: 'cartographer',
    fantasyTitle: 'Cartographer',
    practicalTitle: 'Systems Mapper / Structure Analyst',
    description: 'Maps the components, relationships, dependencies, and hidden structure of a complex problem.',
    defaultOutputPolicy: 'synthesis',
    preferredPosition: 'opening',
    providerAffinity: ['claude', 'gemini', 'chatgpt'],
  },
  {
    id: 'archivist',
    fantasyTitle: 'Archivist',
    practicalTitle: 'Context Keeper / Continuity Reviewer',
    description: 'Checks the current work against prior decisions, terminology, requirements, and established context.',
    defaultOutputPolicy: 'critique',
    preferredPosition: 'middle',
    providerAffinity: ['claude', 'chatgpt'],
  },
  {
    id: 'alchemist',
    fantasyTitle: 'Alchemist',
    practicalTitle: 'Synthesizer / Combination Specialist',
    description: 'Combines compatible ideas from different contributions into a stronger hybrid approach.',
    defaultOutputPolicy: 'synthesis',
    preferredPosition: 'late',
    providerAffinity: ['chatgpt', 'claude', 'gemini'],
  },
  {
    id: 'scout',
    fantasyTitle: 'Scout',
    practicalTitle: 'Opportunity Finder / Edge Explorer',
    description: 'Searches the edges of the problem for overlooked opportunities, adjacent possibilities, and useful directions others may have missed.',
    defaultOutputPolicy: 'free-response',
    preferredPosition: 'middle',
    providerAffinity: ['grok', 'gemini', 'perplexity'],
  },
  {
    id: 'quartermaster',
    fantasyTitle: 'Quartermaster',
    practicalTitle: 'Practicality / Resource Planner',
    description: 'Tests whether an idea can actually be executed with the available time, people, money, tools, and dependencies.',
    defaultOutputPolicy: 'recommendation',
    preferredPosition: 'late',
    providerAffinity: ['chatgpt', 'claude'],
  },
  {
    id: 'oracle',
    fantasyTitle: 'Oracle',
    practicalTitle: 'Scenario Analyst / Forecaster',
    description: 'Explores plausible future outcomes, second-order effects, and what could change under different conditions.',
    defaultOutputPolicy: 'free-response',
    preferredPosition: 'middle',
    providerAffinity: ['gemini', 'claude', 'chatgpt'],
  },
  {
    id: 'master-of-questions',
    fantasyTitle: 'Master of Questions',
    practicalTitle: 'Clarifier / Socratic Examiner',
    description: 'Finds the questions that must be answered before the problem can be understood or solved properly.',
    defaultOutputPolicy: 'free-response',
    preferredPosition: 'opening',
    providerAffinity: ['claude', 'chatgpt'],
  },
  {
    id: 'smith',
    fantasyTitle: 'Smith',
    practicalTitle: 'Implementation Planner / Builder',
    description: 'Turns abstract recommendations into a concrete, ordered, and executable plan.',
    defaultOutputPolicy: 'recommendation',
    preferredPosition: 'late',
    providerAffinity: ['chatgpt', 'claude'],
  },
  {
    id: 'councillor',
    fantasyTitle: 'Councillor',
    practicalTitle: 'General Deliberator',
    description: 'An equal-status generalist councillor who examines the question independently, forms a clear position, and will eventually cast one vote.',
    defaultOutputPolicy: 'recommendation',
    // Deliberately no preferredPosition and no providerAffinity: every
    // Councillor seat is equal and no provider is senior to another.
  },
];

export function getCouncilRole(id: string): RoleDefinition | undefined {
  return councilRoles.find((role) => role.id === id);
}
