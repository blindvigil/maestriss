export type DeepSeekCandidateEvaluation = {
  accepted: boolean;
  reason?: string;
};

export const deepSeekHistoryMarkers = [
  'today',
  '7 days',
  '30 days',
  '2026-',
  '2025-',
  'linear algebra',
  'roundtable',
  'xcitium',
  'datto',
];

export function normalizeDeepSeekCandidateText(text: string) {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function evaluateDeepSeekCandidateText(text: string, promptNeedle = ''): DeepSeekCandidateEvaluation {
  const normalized = normalizeDeepSeekCandidateText(text);

  if (normalized.length <= 5) {
    return {
      accepted: false,
      reason: 'too-short',
    };
  }

  const containsHistoryMarker = deepSeekHistoryMarkers.some((marker) => normalized.includes(marker));

  if (containsHistoryMarker) {
    return {
      accepted: false,
      reason: 'history-sidebar-marker',
    };
  }

  if (/^(share|copy|feedback|regenerate|retry|deepthink|search|sources?|related|sign in|sign up|new chat|settings|show all|more)$/i.test(text.trim())) {
    return {
      accepted: false,
      reason: 'known-deepseek-chrome',
    };
  }

  if (promptNeedle) {
    const normalizedPrompt = normalizeDeepSeekCandidateText(promptNeedle);
    const onlyPrompt = normalized.includes(normalizedPrompt) &&
      normalized.length <= normalizedPrompt.length + 120;

    if (onlyPrompt || normalized === normalizedPrompt) {
      return {
        accepted: false,
        reason: 'submitted-prompt-only',
      };
    }
  }

  return {
    accepted: true,
  };
}
