// Canonical Maestriss provider vocabulary, shared by Studio and the Runner.
//
// Identities are adopted verbatim from the execution-verified Runner
// participant registry (ids, display names, URLs validated live across the
// nine-provider baton test). Studio's divergent participant ids
// ("reka-chat") and stale Copilot URL migrate to these values in a future
// slice.
//
// This module carries shared metadata only. Driver mechanics, selectors,
// readiness detection, and timeout behavior remain Runner-internal.

export type CouncilProvider = {
  id: string;
  displayName: string;
  canonicalUrl: string;
  // Soft hint that the provider's primary surface performs live web search.
  // Never a guarantee and never used to reject a configuration.
  searchCapabilityHint: boolean;
};

export const councilProviders: CouncilProvider[] = [
  {
    id: 'chatgpt',
    displayName: 'ChatGPT',
    canonicalUrl: 'https://chatgpt.com/',
    searchCapabilityHint: false,
  },
  {
    id: 'claude',
    displayName: 'Claude',
    canonicalUrl: 'https://claude.ai/new',
    searchCapabilityHint: false,
  },
  {
    id: 'deepseek',
    displayName: 'DeepSeek',
    canonicalUrl: 'https://chat.deepseek.com/',
    searchCapabilityHint: false,
  },
  {
    id: 'gemini',
    displayName: 'Gemini',
    canonicalUrl: 'https://gemini.google.com/app',
    searchCapabilityHint: true,
  },
  {
    id: 'grok',
    displayName: 'Grok',
    canonicalUrl: 'https://grok.com/',
    searchCapabilityHint: true,
  },
  {
    id: 'copilot',
    displayName: 'Copilot',
    canonicalUrl: 'https://m365.cloud.microsoft/chat/',
    searchCapabilityHint: true,
  },
  {
    id: 'perplexity',
    displayName: 'Perplexity',
    canonicalUrl: 'https://www.perplexity.ai/',
    searchCapabilityHint: true,
  },
  {
    id: 'reka',
    displayName: 'Reka Chat',
    canonicalUrl: 'https://app.reka.ai/chat?utm_source=copilot.com',
    searchCapabilityHint: false,
  },
  {
    id: 'google',
    displayName: 'Google',
    canonicalUrl: 'https://www.google.com/ai',
    searchCapabilityHint: true,
  },
];

export function getCouncilProvider(id: string): CouncilProvider | undefined {
  return councilProviders.find((provider) => provider.id === id);
}
