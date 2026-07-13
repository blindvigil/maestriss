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

export type DeepSeekCandidateGeometry = {
  left: number;
  right: number;
  width: number;
  viewportWidth: number;
  composerLeft: number | null;
  composerWidth: number | null;
  insideSidebar: boolean;
};

// Geometry is supporting evidence only. Valid answers can sit near the
// viewport's left edge in narrow/responsive layouts (live baton failure
// 2026-07-13: the correct answer at x=20 width=660 in a ~700px viewport was
// rejected by an absolute `left < 250` cutoff, and would then have failed the
// `width > innerWidth * 0.72` cap). Sidebar rejection is structural
// (ancestry) first; the geometric rules are measured relative to the
// composer, which anchors the conversation column in every layout.
export function deepSeekGeometryRejectionReason(geometry: DeepSeekCandidateGeometry): string {
  if (geometry.insideSidebar) {
    return 'sidebar-history-container';
  }

  if (geometry.composerLeft !== null && geometry.right < geometry.composerLeft - 24) {
    return 'left-of-conversation-column';
  }

  const widthCap = geometry.composerWidth !== null
    ? geometry.composerWidth + 64
    : Math.min(geometry.viewportWidth * 0.72, 920);

  if (geometry.width > widthCap) {
    return 'page-or-transcript-parent-container';
  }

  return '';
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
