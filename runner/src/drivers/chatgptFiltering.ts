export const chatgptChromeExactPhrases = [
  'new chat',
  'chatgpt',
  'explore gpts',
  'library',
  'sora',
  'projects',
  'settings',
  'help',
  'search',
  'temporary chat',
  'copy',
  'retry',
  'regenerate',
  'share',
  'edit',
  'read aloud',
  'good response',
  'bad response',
  'stop',
  'stop generating',
  'thinking',
  'thinking...',
  'working',
  'searching',
  'searching...',
  'loading',
  'loading...',
];

export const chatgptChromeIncludesPhrases = [
  'chatgpt can make mistakes',
  'check important info',
  'upgrade plan',
  'upgrade your plan',
  'get plus',
  'memory updated',
  'message chatgpt',
  'ask anything',
  'what can i help with',
  'is this conversation helpful',
];

export type ChatGptCandidateGeometry = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  // The discovery selector that produced this candidate, when known.
  // Provider-semantic single-message anchors are exempt from size-proxy
  // rejection (see chatGptCandidateRejectionReason).
  selector?: string;
};

// Selectors that identify exactly one assistant message by ChatGPT's own
// semantics. Such a node is by construction never a page or transcript
// parent, so its rendered size must not be used against it: a long
// completed response is thousands of pixels tall (live regression
// 2026-07-14: a completed ~8,000-char answer exceeded the 1200px cap every
// poll, latestAssistantText stayed empty, and waitForCompletion timed out
// on a visibly finished response).
const semanticAssistantSelectors = [
  '[data-message-author-role="assistant"]',
  '[data-testid*="conversation-turn"][data-testid*="assistant"]',
];

export function isSemanticAssistantSelector(selector: string | undefined) {
  return selector !== undefined && semanticAssistantSelectors.includes(selector);
}

export type ChatGptSubmissionSignals = {
  prompt: string;
  composerText: string;
  promptVisibleAsUserMessage: boolean;
  stopVisible: boolean;
  beforeAssistantText: string;
  currentAssistantText: string;
};

export function normalizeChatGptCandidateText(text: string) {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function chatGptSubmissionEvidenceReasons(signals: ChatGptSubmissionSignals) {
  const normalizedPrompt = normalizeChatGptCandidateText(signals.prompt);
  const normalizedComposer = normalizeChatGptCandidateText(signals.composerText);
  const normalizedBeforeAssistant = normalizeChatGptCandidateText(signals.beforeAssistantText);
  const normalizedCurrentAssistant = normalizeChatGptCandidateText(signals.currentAssistantText);
  const reasons: string[] = [];

  if (normalizedPrompt && normalizedComposer.length === 0) {
    reasons.push('composer-cleared');
  }

  if (signals.promptVisibleAsUserMessage) {
    reasons.push('prompt-visible-as-user-message');
  }

  if (signals.stopVisible) {
    reasons.push('stop-control-visible');
  }

  if (normalizedCurrentAssistant && normalizedCurrentAssistant !== normalizedBeforeAssistant) {
    reasons.push('assistant-response-changed');
  }

  return reasons;
}

function stripChatGptChromeSuffixes(text: string) {
  return text
    .replace(/\bChatGPT can make mistakes\.?\s*Check important info\.?.*$/i, '')
    .replace(/\bCheck important info\.?.*$/i, '')
    .trim();
}

export function isChatGptShellOrStatusText(text: string) {
  const normalized = normalizeChatGptCandidateText(text);
  const normalizedStatus = normalized.replace(/[.]+$/g, '');

  return normalized.length === 0 ||
    /^(thinking|working|searching|generating|loading)$/.test(normalizedStatus) ||
    chatgptChromeExactPhrases.includes(normalized) ||
    chatgptChromeIncludesPhrases.some((phrase) => normalized.includes(phrase));
}

export function cleanChatGptResponseText(text: string) {
  const seenLines = new Set<string>();

  return text
    .replace(/\r/g, '\n')
    .split('\n')
    .flatMap((line) => line.split(/\s{2,}/))
    .map((line) => line.trim())
    .map(stripChatGptChromeSuffixes)
    .filter(Boolean)
    .filter((line) => !isChatGptShellOrStatusText(line))
    .filter((line) => !/^(copy|retry|regenerate|share|edit|read aloud)$/i.test(line))
    .filter((line) => {
      const normalized = normalizeChatGptCandidateText(line);

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

export function isChatGptPromptOnly(text: string, promptNeedle = '') {
  if (!promptNeedle) {
    return false;
  }

  const normalized = normalizeChatGptCandidateText(text);
  const normalizedPrompt = normalizeChatGptCandidateText(promptNeedle);

  return normalized === normalizedPrompt ||
    (normalized.includes(normalizedPrompt) && normalized.length <= normalizedPrompt.length + 160);
}

export function evaluateChatGptCandidateText(text: string, promptNeedle = '') {
  const cleanedText = cleanChatGptResponseText(text);

  if (!cleanedText || isChatGptShellOrStatusText(cleanedText)) {
    return {
      accepted: false,
      reason: 'chatgpt-shell-or-status-text',
    };
  }

  if (isChatGptPromptOnly(cleanedText, promptNeedle) || isChatGptPromptOnly(text, promptNeedle)) {
    return {
      accepted: false,
      reason: 'submitted-prompt-only',
    };
  }

  return {
    accepted: true,
  };
}

export function chatGptCandidateRejectionReason(
  candidate: ChatGptCandidateGeometry,
  promptNeedle = '',
  siblingCandidates: ChatGptCandidateGeometry[] = [],
) {
  const cleanedText = cleanChatGptResponseText(candidate.text);
  const normalizedRaw = normalizeChatGptCandidateText(candidate.text);

  if (!cleanedText) return 'empty-after-clean';

  // The size cap is a proxy for page/transcript parents and applies only to
  // broad fallback selectors. Semantic assistant-message nodes are exempt:
  // a single long completed response legitimately exceeds any fixed height.
  if (
    !isSemanticAssistantSelector(candidate.selector) &&
    (candidate.width > 1100 || candidate.height > 1200)
  ) {
    return 'page-or-transcript-parent-container';
  }

  if (candidate.x < 90 && candidate.width <= 180) return 'navigation-container';

  const area = candidate.width * candidate.height;
  const smallerValidChild = siblingCandidates.some((sibling) => {
    if (sibling === candidate) return false;

    const siblingCleanedText = cleanChatGptResponseText(sibling.text);
    const siblingArea = sibling.width * sibling.height;

    return siblingCleanedText.length > 0 &&
      (siblingCleanedText === cleanedText || normalizedRaw.includes(normalizeChatGptCandidateText(siblingCleanedText))) &&
      siblingArea < area * 0.75 &&
      !isChatGptPromptOnly(siblingCleanedText, promptNeedle) &&
      !isChatGptShellOrStatusText(siblingCleanedText);
  });

  if (smallerValidChild) return 'page-or-transcript-parent-container';

  if (isChatGptPromptOnly(cleanedText, promptNeedle) || isChatGptPromptOnly(candidate.text, promptNeedle)) {
    return 'submitted-prompt-only';
  }
  if (isChatGptShellOrStatusText(cleanedText) || isChatGptShellOrStatusText(candidate.text)) {
    return 'known-chatgpt-chrome';
  }

  return '';
}
