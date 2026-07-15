export type GrokCandidateShape = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type GrokCandidateEvaluation = {
  accepted: boolean;
  reason?: string;
};

export type GrokOverlayCandidate = {
  attributeText: string;
  ancestorAttributeText: string;
  inModal: boolean;
  inViewport: boolean;
};

export type GrokOverlayEvaluation = {
  blocking: boolean;
  reason?: string;
};

export type GrokTerminalErrorEvaluation = {
  found: boolean;
  reason?: string;
  message?: string;
};

export function normalizeGrokCandidateText(text: string) {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

const cookieConsentPattern = /cookie|consent|onetrust|vendor|privacy|gdpr/i;

export function evaluateGrokOverlayCandidate(candidate: GrokOverlayCandidate): GrokOverlayEvaluation {
  if (!candidate.inViewport) {
    return {
      blocking: false,
      reason: 'outside-viewport',
    };
  }

  if (
    cookieConsentPattern.test(candidate.attributeText) ||
    cookieConsentPattern.test(candidate.ancestorAttributeText)
  ) {
    return {
      blocking: false,
      reason: 'cookie-consent-widget',
    };
  }

  if (!candidate.inModal) {
    return {
      blocking: false,
      reason: 'not-inside-modal',
    };
  }

  return {
    blocking: true,
  };
}

const maxTerminalErrorTextLength = 240;

// Account/plan gating chrome (live regression 2026-07-14: the standalone
// upsell block "Sign up to continue seamlessly with Grok's full power" won
// candidate selection and was recorded as a successful Council
// contribution). These are provider-availability states, not responses:
// they classify as a structured availability failure so the provider
// fallback chain can advance. Deliberately narrow phrases; matching is
// length-bounded so a long real answer that quotes one of them is never
// affected.
const accountOrPlanBlockPhrases = [
  'sign up to continue',
  'sign in to continue',
  'log in to continue',
  'create an account to continue',
];

export function matchesGrokAccountOrPlanBlock(normalizedText: string) {
  return normalizedText.length > 0 &&
    normalizedText.length <= maxTerminalErrorTextLength &&
    accountOrPlanBlockPhrases.some((phrase) => normalizedText.includes(phrase));
}

export function evaluateGrokTerminalErrorText(
  text: string,
  promptNeedle = '',
): GrokTerminalErrorEvaluation {
  const normalized = normalizeGrokCandidateText(text);

  if (!normalized) {
    return { found: false };
  }

  // Error banners are short standalone blocks; long text is transcript/prompt content
  // that may legitimately mention phrases like "rate limit".
  if (normalized.length > maxTerminalErrorTextLength) {
    return { found: false };
  }

  if (promptNeedle) {
    const needle = normalizeGrokCandidateText(promptNeedle).slice(0, 120);

    if (needle && normalized.includes(needle)) {
      return { found: false };
    }
  }

  if (matchesGrokAccountOrPlanBlock(normalized)) {
    return {
      found: true,
      reason: 'grok-account-or-plan-block',
      message: text.slice(0, maxTerminalErrorTextLength),
    };
  }

  if (
    normalized.includes('please try again soon') ||
    normalized.includes('upgrade for higher priority access') ||
    normalized.includes('higher priority access')
  ) {
    return {
      found: true,
      reason: 'grok-capacity-error',
      message: text.slice(0, maxTerminalErrorTextLength),
    };
  }

  if (
    normalized.includes('rate limit') ||
    normalized.includes('too many requests') ||
    normalized.includes('temporarily limited')
  ) {
    return {
      found: true,
      reason: 'grok-rate-limited',
      message: text.slice(0, maxTerminalErrorTextLength),
    };
  }

  if (
    normalized.includes('something went wrong') ||
    normalized.includes('network error') ||
    normalized.includes('unable to generate') ||
    normalized.includes('failed to generate')
  ) {
    return {
      found: true,
      reason: 'grok-runtime-error',
      message: text.slice(0, maxTerminalErrorTextLength),
    };
  }

  return { found: false };
}

export function evaluateGrokCandidate(
  candidate: GrokCandidateShape,
  promptNeedle = '',
): GrokCandidateEvaluation {
  const normalized = normalizeGrokCandidateText(candidate.text);

  if (normalized.length <= 5) {
    return {
      accepted: false,
      reason: 'too-short',
    };
  }

  if (candidate.x < 120) {
    return {
      accepted: false,
      reason: 'outside-central-chat-left',
    };
  }

  if (candidate.width < 100 || candidate.width > 900) {
    return {
      accepted: false,
      reason: 'outside-central-chat-width',
    };
  }

  // A short standalone account/plan gate can never be a response, even if
  // it wins geometry and length checks. Length-bounded: a long real answer
  // quoting one of these phrases is not rejected.
  if (matchesGrokAccountOrPlanBlock(normalized)) {
    return {
      accepted: false,
      reason: 'grok-account-or-plan-block',
    };
  }

  if (
    /^(share|copy|feedback|regenerate|retry|thinking|sources?|related|sign in|sign up|new chat|settings|show all|more)$/i.test(candidate.text.trim()) ||
    normalized.includes("explore xai's mission") ||
    normalized.includes('discover xai products') ||
    normalized.includes('how does grok differ from chatgpt') ||
    normalized.includes("what is xai's mission") ||
    normalized.includes('say exactly: grok is ok') ||
    normalized.includes('thought for 1s') ||
    normalized.includes('thought for') ||
    normalized.includes('please try again soon') ||
    normalized.includes('upgrade for higher priority access') ||
    normalized.includes('rate limit') ||
    normalized.includes('too many requests') ||
    normalized.includes('something went wrong') ||
    normalized.includes('network error') ||
    normalized.includes('unable to generate') ||
    normalized.includes('failed to generate')
  ) {
    return {
      accepted: false,
      reason: 'grok-chrome-suggestion-or-error',
    };
  }

  if (promptNeedle) {
    const normalizedPrompt = normalizeGrokCandidateText(promptNeedle);
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
