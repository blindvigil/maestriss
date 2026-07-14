// Canonical Calling library: structural Calling identity and metadata only.
//
// A Calling is the behavioral lens a seat in a Council Formation assigns to
// its AI. Fantasy titles are presentation for Studio and reports. The
// provider-facing behavioral prompt content ("flavour text") is a separate
// concern owned by callingFlavourText.ts, keyed by the stable calling id, so
// that the Studio editor and the Runner prompt composition consume one
// canonical source. Flavour wording must stay plain, constructive, and
// benign: live baton testing showed that security-flavored wording (e.g.
// "token", "verification") can trigger provider refusals even for harmless
// tasks. Refusal-safety assertions in the council suite enforce this for
// every Calling.
//
// The canonical library contains exactly sixteen Callings. Equal
// deliberation (Crown Council) is a Doctrine mechanic, not a Calling.

import type { CouncilOutputPolicy, CouncilVariableOverrides } from './schema.js';
import type { CognitiveStatOverrides } from './cognitiveStats.js';

export type CallingPosition = 'opening' | 'middle' | 'late' | 'final';

export type CallingDefinition = {
  id: string;
  fantasyTitle: string;
  practicalTitle: string;
  description: string;
  defaultOutputPolicy: CouncilOutputPolicy;
  defaultVariables?: CouncilVariableOverrides;
  // Partial cognitive-stat defaults: only the dimensions that meaningfully
  // define this Calling (approved initial characterization). They sit above
  // provider defaults and below Formation seat overrides in resolution.
  cognitiveDefaults?: CognitiveStatOverrides;
  preferredPosition?: CallingPosition;
  // The Suggested Mind: the single AI we believe is best suited to this
  // Calling. A soft recommendation only — it never invalidates a
  // configuration that binds a different preferred Mind to a seat, and
  // Doctrines freely do so. Canonical invariant: providerAffinity[0] ===
  // suggestedProvider, so there is exactly one canonical answer to which
  // Mind best suits the Calling; seat-level divergence belongs to the
  // seat's Preferred Mind, never to Calling metadata.
  suggestedProvider?: string;
  // The canonical ordered provider ranking for this Calling: the broader
  // list of suitable Minds, best fit first (its head equals the Suggested
  // Mind, per the invariant above). Soft metadata — never used to reject a
  // configuration — but it is the single canonical source the Doctrine
  // factories use to derive each seat's ordered provider fallback chain
  // (assigned preferred Mind first, then this ranking minus that Mind).
  // Per-seat customization lives on CouncilStage.providerFallbacks.
  providerAffinity?: string[];
};

export const councilCallings: CallingDefinition[] = [
  {
    id: 'lantern-bearer',
    fantasyTitle: 'Lantern Bearer',
    practicalTitle: 'Fact-Checker / Evidence Verifier',
    description: 'Separates fact from inference and speculation, checks important claims, and corrects unsupported or inaccurate statements.',
    defaultOutputPolicy: 'fact-check-report',
    cognitiveDefaults: { temperament: 1, depth: 8 },
    preferredPosition: 'opening',
    suggestedProvider: 'perplexity',
    providerAffinity: ['perplexity', 'google', 'gemini', 'claude', 'chatgpt'],
  },
  {
    id: 'inquisitor',
    fantasyTitle: 'Inquisitor',
    practicalTitle: 'Skeptic / Critical Reviewer',
    description: 'Challenges assumptions, tests reasoning, and looks for weaknesses, missing evidence, and plausible counterexamples.',
    defaultOutputPolicy: 'critique',
    cognitiveDefaults: { dissent: 9, depth: 8 },
    preferredPosition: 'middle',
    suggestedProvider: 'claude',
    providerAffinity: ['claude', 'grok', 'chatgpt', 'deepseek', 'gemini'],
  },
  {
    id: 'rival',
    fantasyTitle: 'Rival',
    practicalTitle: 'Competing Strategist',
    description: 'Produces a genuinely different approach rather than merely agreeing with or criticizing the previous one.',
    defaultOutputPolicy: 'alternative-proposal',
    cognitiveDefaults: { conviction: 8, dissent: 8 },
    preferredPosition: 'middle',
    suggestedProvider: 'gemini',
    providerAffinity: ['gemini', 'chatgpt', 'claude', 'grok', 'deepseek'],
  },
  {
    id: 'wild-mage',
    fantasyTitle: 'Wild Mage',
    practicalTitle: 'Innovator / Divergent Thinker',
    description: 'Expands the option space with unconventional ideas, unexpected combinations, and possibilities others may overlook.',
    defaultOutputPolicy: 'alternative-proposal',
    cognitiveDefaults: { temperament: 9, conviction: 3 },
    preferredPosition: 'middle',
    suggestedProvider: 'grok',
    providerAffinity: ['grok', 'chatgpt', 'gemini', 'claude', 'reka'],
  },
  {
    id: 'magistrate',
    fantasyTitle: 'Magistrate',
    practicalTitle: 'Decision Judge / Tradeoff Arbiter',
    description: 'Compares competing options against explicit criteria and makes a reasoned judgment.',
    defaultOutputPolicy: 'recommendation',
    cognitiveDefaults: { temperament: 2, conviction: 8, dissent: 5 },
    preferredPosition: 'late',
    suggestedProvider: 'claude',
    providerAffinity: ['claude', 'chatgpt', 'gemini', 'deepseek', 'grok'],
  },
  {
    id: 'royal-scribe',
    fantasyTitle: 'Royal Scribe',
    practicalTitle: 'Editor in Chief / Final Synthesizer',
    description: 'Turns multiple contributions into a coherent final answer without erasing meaningful disagreement.',
    defaultOutputPolicy: 'final-answer',
    cognitiveDefaults: { voice: 8, dissent: 2, memory: 9 },
    preferredPosition: 'final',
    suggestedProvider: 'chatgpt',
    providerAffinity: ['chatgpt', 'claude', 'gemini', 'deepseek', 'copilot'],
  },
  {
    id: 'saboteur',
    fantasyTitle: 'Saboteur',
    practicalTitle: 'Failure-Mode Analyst',
    description: 'Looks for realistic ways a proposal could fail, break down, be misused, or produce unintended consequences.',
    defaultOutputPolicy: 'critique',
    cognitiveDefaults: { dissent: 9, conviction: 8 },
    preferredPosition: 'middle',
    suggestedProvider: 'claude',
    providerAffinity: ['claude', 'grok', 'chatgpt', 'deepseek', 'gemini'],
  },
  {
    id: 'empath',
    fantasyTitle: 'Empath',
    practicalTitle: 'Human-Impact Reviewer',
    description: 'Examines how a proposal affects the people involved, including different needs, incentives, fears, and unintended consequences.',
    defaultOutputPolicy: 'free-response',
    cognitiveDefaults: { dissent: 1, conviction: 3 },
    preferredPosition: 'middle',
    // Explicit product decision: Reka is the Empath's default Mind.
    suggestedProvider: 'reka',
    providerAffinity: ['reka', 'claude', 'chatgpt', 'gemini', 'copilot'],
  },
  {
    id: 'alchemist',
    fantasyTitle: 'Alchemist',
    practicalTitle: 'Synthesizer / Combiner',
    description: 'Combines compatible ideas from different contributions into a stronger hybrid approach.',
    defaultOutputPolicy: 'synthesis',
    cognitiveDefaults: { temperament: 7, dissent: 1, memory: 8 },
    preferredPosition: 'late',
    suggestedProvider: 'chatgpt',
    providerAffinity: ['chatgpt', 'claude', 'gemini', 'deepseek', 'reka'],
  },
  {
    id: 'cartographer',
    fantasyTitle: 'Cartographer',
    practicalTitle: 'Structure / First-Principles Analyst',
    description: 'Maps the components, relationships, dependencies, and hidden structure of a complex problem.',
    defaultOutputPolicy: 'synthesis',
    cognitiveDefaults: { temperament: 2, depth: 8 },
    preferredPosition: 'opening',
    suggestedProvider: 'gemini',
    providerAffinity: ['gemini', 'claude', 'chatgpt', 'deepseek', 'grok'],
  },
  {
    id: 'oracle',
    fantasyTitle: 'Oracle',
    practicalTitle: 'Scenario / Second-Order Analyst',
    description: 'Explores plausible future outcomes, second-order effects, and what could change under different conditions.',
    defaultOutputPolicy: 'free-response',
    cognitiveDefaults: { temperament: 8, depth: 9 },
    preferredPosition: 'middle',
    suggestedProvider: 'gemini',
    providerAffinity: ['gemini', 'claude', 'chatgpt', 'grok', 'deepseek'],
  },
  {
    id: 'sage',
    fantasyTitle: 'Sage',
    practicalTitle: 'Clarifier / Socratic Examiner',
    description: 'Finds the questions that must be answered before the problem can be understood or solved properly.',
    defaultOutputPolicy: 'free-response',
    cognitiveDefaults: { conviction: 2, depth: 8 },
    preferredPosition: 'opening',
    suggestedProvider: 'claude',
    providerAffinity: ['claude', 'chatgpt', 'gemini', 'deepseek', 'reka'],
  },
  {
    id: 'pathfinder',
    fantasyTitle: 'Pathfinder',
    practicalTitle: 'Opportunity Finder / Edge Explorer',
    description: 'Searches the edges of the problem for overlooked opportunities, adjacent possibilities, and useful directions others may have missed.',
    defaultOutputPolicy: 'free-response',
    cognitiveDefaults: { temperament: 8, depth: 7 },
    preferredPosition: 'middle',
    suggestedProvider: 'perplexity',
    providerAffinity: ['perplexity', 'grok', 'gemini', 'google', 'chatgpt'],
  },
  {
    id: 'archivist',
    fantasyTitle: 'Archivist',
    practicalTitle: 'Source & Context Curator',
    description: 'Checks the current work against prior decisions, terminology, requirements, and established context.',
    defaultOutputPolicy: 'critique',
    cognitiveDefaults: { temperament: 1, memory: 9 },
    preferredPosition: 'middle',
    suggestedProvider: 'claude',
    providerAffinity: ['claude', 'chatgpt', 'perplexity', 'google', 'gemini'],
  },
  {
    id: 'quartermaster',
    fantasyTitle: 'Quartermaster',
    practicalTitle: 'Resource / Constraint Planner',
    description: 'Tests whether an idea can actually be executed with the available time, people, money, tools, and dependencies.',
    defaultOutputPolicy: 'recommendation',
    cognitiveDefaults: { temperament: 2, voice: 3 },
    preferredPosition: 'late',
    suggestedProvider: 'chatgpt',
    providerAffinity: ['chatgpt', 'claude', 'gemini', 'deepseek', 'copilot'],
  },
  {
    id: 'architect',
    fantasyTitle: 'Architect',
    practicalTitle: 'Implementation Planner / Builder',
    description: 'Turns abstract recommendations into a concrete, ordered, and executable plan.',
    defaultOutputPolicy: 'recommendation',
    cognitiveDefaults: { temperament: 2, depth: 8, conviction: 6 },
    preferredPosition: 'late',
    suggestedProvider: 'chatgpt',
    providerAffinity: ['chatgpt', 'claude', 'deepseek', 'gemini', 'copilot'],
  },
];

export function getCouncilCalling(id: string): CallingDefinition | undefined {
  return councilCallings.find((calling) => calling.id === id);
}
