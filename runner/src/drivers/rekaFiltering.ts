export type RekaCandidateEvaluation = {
  accepted: boolean;
  reason?: string;
};

export const rekaChromeExactPhrases = [
  'share',
  'copy',
  'feedback',
  'regenerate',
  'retry',
  'source',
  'sources',
  'related',
  'sign in',
  'sign up',
  'log in',
  'new chat',
  'settings',
  'show all',
  'more',
  'reka',
  'reka chat',
  'playground',
  'prompt type',
  'api',
  'api platform',
  'api documentation',
  'talk to sales',
  'explore',
  'template',
  'templates',
  'library',
  'history',
  'upgrade',
  'profile',
  'log out',
  'evan fabri',
];

export const rekaChromeIncludesPhrases = [
  'responses may be inaccurate. verify important information.',
  'we use cookies',
  'settings',
  'api platform',
  'talk to sales',
  'api documentation',
  'evan fabri',
  'image analysis',
  'code analysis',
  'multilingual chat',
  'fast, fluent, multimodal',
  'start a new chat',
  'ask anything',
  'try reka',
  'welcome to reka',
  'what can i help',
  'choose a model',
  'prompt type',
  'playground',
  'log in',
];

export function normalizeRekaCandidateText(text: string) {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function isKnownRekaChrome(text: string) {
  const normalized = normalizeRekaCandidateText(text);

  return rekaChromeExactPhrases.includes(normalized) ||
    rekaChromeIncludesPhrases.some((phrase) => normalized.includes(phrase));
}

export function evaluateRekaCandidateText(text: string, promptNeedle = ''): RekaCandidateEvaluation {
  const normalized = normalizeRekaCandidateText(text);

  if (normalized.length <= 5) {
    return {
      accepted: false,
      reason: 'too-short',
    };
  }

  if (isKnownRekaChrome(normalized)) {
    return {
      accepted: false,
      reason: 'known-reka-chrome',
    };
  }

  if (promptNeedle) {
    const normalizedPrompt = normalizeRekaCandidateText(promptNeedle);
    const onlyPrompt = normalized.includes(normalizedPrompt) &&
      normalized.length <= normalizedPrompt.length + 80;

    if (onlyPrompt) {
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
