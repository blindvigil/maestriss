// Perplexity response filtering and candidate selection.
//
// Live DOM evidence (2026-07-12, thread page):
// - The assistant answer lives in a stable semantic container:
//   div[id^="markdown-content-"] > ... > div.prose[data-renderer]
// - The submitted prompt lives in a query container:
//   div.group/query[role="heading"][aria-level="1"]
// - main/article are transcript-level parents containing prompt + answer +
//   chrome, and must never beat a semantic answer node.
//
// The original inline detector selected the bottom-most/longest candidate and
// only rejected "prompt-only" candidates shorter than needle + 120 chars, so
// any sufficiently long prompt promoted the transcript parent to the answer.

export type PerplexityCandidateTier = 'semantic-answer' | 'legacy-container';

export type PerplexityCandidate = {
  text: string;
  tier: PerplexityCandidateTier;
  insideQueryContainer: boolean;
  bottom: number;
};

export type PerplexityCandidateEvaluation = {
  accepted: boolean;
  reason?: string;
};

export type PerplexitySelectionResult = {
  selected?: PerplexityCandidate;
  rejected: Array<{ candidate: PerplexityCandidate; reason: string }>;
};

export function normalizePerplexityText(text: string) {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function perplexityPromptNeedle(prompt: string) {
  return prompt.replace(/\s+/g, ' ').trim().slice(0, 80).toLowerCase();
}

export function cleanPerplexityResponseText(text: string) {
  const seenLines = new Set<string>();

  return text
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(sources?|related|share|copy|rewrite|follow-up|ask follow-up|sign in|sign up|try pro|upgrade|show all|more)$/i.test(line))
    .filter((line) => !/^https?:\/\//i.test(line))
    .filter((line) => {
      const normalized = line.toLowerCase().replace(/\s+/g, ' ');

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

export function evaluatePerplexityCandidate(
  candidate: PerplexityCandidate,
  prompt = '',
): PerplexityCandidateEvaluation {
  if (candidate.insideQueryContainer) {
    return {
      accepted: false,
      reason: 'submitted-prompt-container',
    };
  }

  if (candidate.text.trim().length <= 5) {
    return {
      accepted: false,
      reason: 'too-short',
    };
  }

  if (cleanPerplexityResponseText(candidate.text).length === 0) {
    return {
      accepted: false,
      reason: 'empty-after-clean',
    };
  }

  const normalized = normalizePerplexityText(candidate.text);
  const normalizedPrompt = normalizePerplexityText(prompt);
  const needle = perplexityPromptNeedle(prompt);

  if (needle && (
    normalized === normalizedPrompt ||
    (normalized.includes(needle) && normalized.length <= needle.length + 120)
  )) {
    return {
      accepted: false,
      reason: 'submitted-prompt-only',
    };
  }

  // A candidate that contains the entire submitted prompt plus more text is a
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

function byBottomThenLength(a: PerplexityCandidate, b: PerplexityCandidate) {
  const bottomDelta = b.bottom - a.bottom;

  if (Math.abs(bottomDelta) > 20) {
    return bottomDelta;
  }

  return b.text.length - a.text.length;
}

export function selectPerplexityResponseCandidate(
  candidates: PerplexityCandidate[],
  prompt = '',
): PerplexitySelectionResult {
  const rejected: Array<{ candidate: PerplexityCandidate; reason: string }> = [];
  const accepted: PerplexityCandidate[] = [];

  for (const candidate of candidates) {
    const evaluation = evaluatePerplexityCandidate(candidate, prompt);

    if (evaluation.accepted) {
      accepted.push(candidate);
    } else {
      rejected.push({ candidate, reason: evaluation.reason ?? 'rejected' });
    }
  }

  const semanticCandidates = accepted.filter((candidate) => candidate.tier === 'semantic-answer');
  const pool = semanticCandidates.length > 0
    ? semanticCandidates
    : accepted;

  if (semanticCandidates.length > 0) {
    for (const candidate of accepted) {
      if (candidate.tier === 'legacy-container') {
        rejected.push({ candidate, reason: 'legacy-container-superseded-by-semantic-answer' });
      }
    }
  }

  const sorted = [...pool].sort(byBottomThenLength);

  return {
    ...(sorted[0] ? { selected: sorted[0] } : {}),
    rejected,
  };
}
