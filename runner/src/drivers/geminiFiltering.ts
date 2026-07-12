const geminiChromeExactPhrases = [
  'share',
  'feedback',
  'copy',
  'export',
  'google apps',
  'sign in',
  'source',
  'sources',
  'related',
  'show all',
  'more',
  'listen',
  'thumbs up',
  'thumbs down',
  'which response is more helpful?',
  'choice a',
  'choice b',
  'response a',
  'response b',
  'gemini',
  'new chat',
  'recent',
  'activity',
  'settings',
  'help',
  'notebook',
  'notebooks',
  'saved info',
  'extensions',
  'apps',
  'menu',
  'upgrade',
];

const geminiChromeIncludesPhrases = [
  'conversation with gemini',
  'gemini is ai and can make mistakes',
  'you said',
  'double-check response',
  'modify response',
  'view other drafts',
  'google apps',
  'gemini apps activity',
  'notebooklm',
  'saved info',
  'upgrade',
];

export function normalizeGeminiCandidateText(text: string) {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function isGeminiShellOrStatusText(text: string) {
  const normalized = normalizeGeminiCandidateText(text);

  return normalized.length === 0 ||
    geminiChromeExactPhrases.includes(normalized) ||
    geminiChromeIncludesPhrases.some((phrase) => normalized.includes(phrase));
}

export type GeminiCandidateGeometry = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  insideExcludedArea?: boolean;
  insideResponseContainer?: boolean;
};

export function stripGeminiAccessibilityPrefix(text: string) {
  return text.replace(/^\s*gemini said\b\s*/i, '').trim();
}

export function cleanGeminiResponseText(text: string) {
  const seenLines = new Set<string>();

  return text
    .replace(/\r/g, '\n')
    .split('\n')
    .flatMap((line) => line.split(/\s{2,}/))
    .map((line) => line.trim())
    .map(stripGeminiAccessibilityPrefix)
    .filter(Boolean)
    .filter((line) => !isGeminiShellOrStatusText(line))
    .filter((line) => !/^say exactly:/i.test(line))
    .filter((line) => !/^which response is more helpful/i.test(line))
    .filter((line) => !/^(choice|response)\s+[ab]\b/i.test(line))
    .filter((line) => !/^https?:\/\//i.test(line))
    .filter((line) => {
      const normalized = normalizeGeminiCandidateText(line);

      if (seenLines.has(normalized)) {
        return false;
      }

      seenLines.add(normalized);
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function isCentralGeminiResponseCandidate(candidate: Pick<GeminiCandidateGeometry, 'x' | 'width'>) {
  return candidate.x >= 0 && candidate.width >= 100 && candidate.width <= 900;
}

export function geminiCandidateRejectionReason(candidate: GeminiCandidateGeometry, promptNeedle = '') {
  const cleanedText = cleanGeminiResponseText(candidate.text);

  if (!cleanedText) return 'empty-after-clean';
  if (isGeminiPromptOnly(cleanedText, promptNeedle)) return 'submitted-prompt-only';
  if (isGeminiShellOrStatusText(cleanedText) || isGeminiShellOrStatusText(candidate.text)) return 'known-gemini-chrome';
  if (candidate.width > 900) return 'page-or-conversation-parent-container';
  if (candidate.x < 80 && candidate.width <= 120) return 'left-navigation-container';
  if (candidate.insideExcludedArea && !candidate.insideResponseContainer) return 'navigation-or-sidebar-container';
  if (!isCentralGeminiResponseCandidate(candidate)) return 'outside-central-response-column';

  return '';
}

export function isGeminiPromptOnly(text: string, promptNeedle = '') {
  if (!promptNeedle) {
    return false;
  }

  const normalized = normalizeGeminiCandidateText(text);
  const normalizedPrompt = normalizeGeminiCandidateText(promptNeedle);

  return normalized === normalizedPrompt ||
    (normalized.includes(normalizedPrompt) && normalized.length <= normalizedPrompt.length + 180);
}

export function evaluateGeminiCandidateText(text: string, promptNeedle = '') {
  const cleanedText = cleanGeminiResponseText(text);

  if (!cleanedText || isGeminiShellOrStatusText(cleanedText)) {
    return {
      accepted: false,
      reason: 'gemini-shell-or-status-text',
    };
  }

  if (isGeminiPromptOnly(cleanedText, promptNeedle)) {
    return {
      accepted: false,
      reason: 'submitted-prompt-only',
    };
  }

  return {
    accepted: true,
  };
}
