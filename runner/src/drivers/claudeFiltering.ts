export const claudeChromeExactPhrases = [
  'new chat',
  'chats',
  'projects',
  'artifacts',
  'recents',
  'search',
  'settings',
  'copy',
  'retry',
  'regenerate',
  'share',
  'edit',
  'stop',
  'stop generating',
  'thinking',
  'thinking...',
  'loading',
  'loading...',
  'claude is responding',
  'claude can make mistakes',
];

export const claudeChromeIncludesPhrases = [
  'claude can make mistakes',
  'claude is responding',
  'thinking...',
  'loading...',
  'upgrade',
  'get claude pro',
  'create a project',
  'search chats',
  'recent chats',
  'conversation history',
];

export function normalizeClaudeCandidateText(text: string) {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function isClaudeShellOrStatusText(text: string) {
  const normalized = normalizeClaudeCandidateText(text);

  return normalized.length === 0 ||
    /^thought for \d+s$/.test(normalized) ||
    claudeChromeExactPhrases.includes(normalized) ||
    claudeChromeIncludesPhrases.some((phrase) => normalized.includes(phrase));
}

export function stripClaudeTransientPrefix(text: string) {
  return text
    .replace(/^\s*claude responded:\s*/i, '')
    .replace(/^\s*(?:thought for \d+s|thinking(?:\.\.\.|\.)?|claude is responding)\s*/i, '')
    .trim();
}

export function cleanClaudeResponseText(text: string) {
  const seen = new Set<string>();

  return text
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .map(stripClaudeTransientPrefix)
    .filter(Boolean)
    .filter((line) => !isClaudeShellOrStatusText(line))
    .filter((line) => !/^(copy|retry|regenerate|share|edit|new chat|projects|artifacts|recents|search)$/i.test(line))
    .filter((line) => {
      const normalized = normalizeClaudeCandidateText(line);

      if (seen.has(normalized)) {
        return false;
      }

      seen.add(normalized);
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function isClaudePromptOnly(text: string, promptNeedle = '') {
  if (!promptNeedle) {
    return false;
  }

  const normalized = normalizeClaudeCandidateText(text);
  const normalizedPrompt = normalizeClaudeCandidateText(promptNeedle);

  return normalized === normalizedPrompt ||
    (normalized.includes(normalizedPrompt) && normalized.length <= normalizedPrompt.length + 160);
}

export function evaluateClaudeCandidateText(text: string, promptNeedle = '') {
  const cleanedText = cleanClaudeResponseText(text);

  if (!cleanedText || isClaudeShellOrStatusText(cleanedText)) {
    return {
      accepted: false,
      reason: 'claude-shell-or-status-text',
    };
  }

  if (isClaudePromptOnly(cleanedText, promptNeedle)) {
    return {
      accepted: false,
      reason: 'submitted-prompt-only',
    };
  }

  return {
    accepted: true,
  };
}

export type ClaudeCandidateGeometry = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export function claudeCandidateRejectionReason(
  candidate: ClaudeCandidateGeometry,
  promptNeedle = '',
  siblingCandidates: ClaudeCandidateGeometry[] = [],
) {
  const cleanedText = cleanClaudeResponseText(candidate.text);
  const normalizedRaw = normalizeClaudeCandidateText(candidate.text);
  const normalizedCleaned = normalizeClaudeCandidateText(cleanedText);

  if (!cleanedText || cleanedText.length <= 5) return 'too-short';
  if (candidate.height > 600) return 'page-or-transcript-parent-container';
  if (isClaudePromptOnly(cleanedText, promptNeedle) || isClaudePromptOnly(candidate.text, promptNeedle)) {
    return 'submitted-prompt-only';
  }
  if (isClaudeShellOrStatusText(cleanedText) || isClaudeShellOrStatusText(candidate.text)) {
    return 'known-claude-chrome';
  }

  const area = candidate.width * candidate.height;
  const smallerValidChild = siblingCandidates.some((sibling) => {
    if (sibling === candidate) return false;

    const siblingCleanedText = cleanClaudeResponseText(sibling.text);
    const siblingArea = sibling.width * sibling.height;

    return (siblingCleanedText === cleanedText || normalizedRaw.includes(normalizeClaudeCandidateText(siblingCleanedText))) &&
      siblingArea < area * 0.75 &&
      !isClaudePromptOnly(siblingCleanedText, promptNeedle) &&
      !isClaudeShellOrStatusText(siblingCleanedText);
  });

  if (smallerValidChild && normalizedRaw !== normalizedCleaned) return 'page-or-transcript-parent-container';

  return '';
}
