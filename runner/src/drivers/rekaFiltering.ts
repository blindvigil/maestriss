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

// Reka response candidate selection.
//
// Live DOM evidence (2026-07-13, runner/debug/reka.html, real conversation):
// - assistant answers render in div.prose.prose-chat (markdown renderer)
//   inside a div.flex.justify-start row;
// - the submitted user prompt renders in p.whitespace-pre-line inside a
//   div.flex.justify-end bubble;
// - transcript-level column parents contain prompt + answer + chrome and are
//   also bottom-most and longest, so they must never win by geometry alone.
//
// The previous detector scanned page-wide selectors and picked the
// newest/bottom-most/longest candidate; its prompt-only guard capped at
// needle + 80 chars, so any prompt longer than ~200 chars let both the
// transcript parent and the user bubble survive filtering.

export type RekaCandidateTier = 'semantic-answer' | 'legacy-container';

export type RekaResponseCandidate = {
  text: string;
  tier: RekaCandidateTier;
  insideUserBubble: boolean;
  bottom: number;
  createdAt: number;
};

export type RekaSelectionResult = {
  selected?: RekaResponseCandidate;
  rejected: Array<{ candidate: RekaResponseCandidate; reason: string }>;
};

export function evaluateRekaResponseCandidate(
  candidate: RekaResponseCandidate,
  prompt = '',
): RekaCandidateEvaluation {
  if (candidate.insideUserBubble) {
    return {
      accepted: false,
      reason: 'submitted-prompt-container',
    };
  }

  const needle = normalizeRekaCandidateText(prompt).slice(0, 120);
  const baseEvaluation = evaluateRekaCandidateText(candidate.text, needle);

  if (!baseEvaluation.accepted) {
    return baseEvaluation;
  }

  const normalized = normalizeRekaCandidateText(candidate.text);
  const normalizedPrompt = normalizeRekaCandidateText(prompt);

  if (normalizedPrompt && normalized === normalizedPrompt) {
    return {
      accepted: false,
      reason: 'submitted-prompt-only',
    };
  }

  // A candidate containing the entire submitted prompt plus more text is a
  // transcript-shaped parent (prompt + answer + chrome), not the answer.
  if (normalizedPrompt && normalized.includes(normalizedPrompt) && normalized.length > normalizedPrompt.length) {
    return {
      accepted: false,
      reason: 'contains-submitted-prompt',
    };
  }

  return {
    accepted: true,
  };
}

function byRecencyBottomLength(a: RekaResponseCandidate, b: RekaResponseCandidate) {
  const createdDelta = b.createdAt - a.createdAt;

  if (Math.abs(createdDelta) > 0) {
    return createdDelta;
  }

  const bottomDelta = b.bottom - a.bottom;

  if (Math.abs(bottomDelta) > 20) {
    return bottomDelta;
  }

  return b.text.length - a.text.length;
}

export function selectRekaResponseCandidate(
  candidates: RekaResponseCandidate[],
  prompt = '',
): RekaSelectionResult {
  const rejected: Array<{ candidate: RekaResponseCandidate; reason: string }> = [];
  const accepted: RekaResponseCandidate[] = [];

  for (const candidate of candidates) {
    const evaluation = evaluateRekaResponseCandidate(candidate, prompt);

    if (evaluation.accepted) {
      accepted.push(candidate);
    } else {
      rejected.push({ candidate, reason: evaluation.reason ?? 'rejected' });
    }
  }

  const semanticCandidates = accepted.filter((candidate) => candidate.tier === 'semantic-answer');
  const pool = semanticCandidates.length > 0 ? semanticCandidates : accepted;

  if (semanticCandidates.length > 0) {
    for (const candidate of accepted) {
      if (candidate.tier === 'legacy-container') {
        rejected.push({ candidate, reason: 'legacy-container-superseded-by-semantic-answer' });
      }
    }
  }

  const sorted = [...pool].sort(byRecencyBottomLength);

  return {
    ...(sorted[0] ? { selected: sorted[0] } : {}),
    rejected,
  };
}
