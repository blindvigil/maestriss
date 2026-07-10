const googleChromeExactPhrases = [
  'ai mode',
  'all',
  'images',
  'videos',
  'news',
  'maps',
  'shopping',
  'forums',
  'more',
  'search',
  'google search',
  'ai mode history',
  'you said',
  'searching',
  'sources',
  'show more',
  'share',
  'copy',
  'feedback',
  'helpful',
  'not helpful',
  'retry',
  'regenerate',
  'ask anything',
  'ask a follow-up',
  'dive deeper',
  'my ad center',
  'transcribing',
  'new thread',
  'google apps',
  'privacy policy',
  'terms of service',
  'something went wrong',
  "your history wasn't deleted",
];

const googleChromeIncludesPhrases = [
  'ai can make mistakes, so double-check responses',
  'google may use account and system data',
  'a copy of this chat',
  'your feedback will include',
  'privacy policy',
  'terms of service',
  'my ad center',
  'ai mode history',
  'your history was not deleted',
  "your history wasn't deleted",
];

export type GoogleCandidateGeometry = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export function normalizeGoogleCandidateText(text: string) {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

function stripGoogleChromeSuffixes(text: string) {
  return text
    .replace(/\bAI can make mistakes, so double-check responses.*$/i, '')
    .replace(/\bGoogle may use account and system data.*$/i, '')
    .replace(/\bA copy of this chat.*$/i, '')
    .replace(/\bYour feedback will include.*$/i, '')
    .trim();
}

export function isGoogleShellOrStatusText(text: string) {
  const normalized = normalizeGoogleCandidateText(text);
  const normalizedStatus = normalized.replace(/[.。…]+$/g, '');

  return normalized.length === 0 ||
    /^(transcribing|listening|speak now|searching|generating|loading)$/.test(normalizedStatus) ||
    googleChromeExactPhrases.includes(normalized) ||
    googleChromeIncludesPhrases.some((phrase) => normalized.includes(phrase));
}

export function cleanGoogleResponseText(text: string) {
  const seenLines = new Set<string>();

  return text
    .replace(/\r/g, '\n')
    .split('\n')
    .flatMap((line) => line.split(/\s{2,}/))
    .map((line) => line.trim())
    .map(stripGoogleChromeSuffixes)
    .filter(Boolean)
    .filter((line) => !isGoogleShellOrStatusText(line))
    .filter((line) => !/^say exactly:/i.test(line))
    .filter((line) => !/^you said\b/i.test(line))
    .filter((line) => !/^https?:\/\//i.test(line))
    .filter((line) => {
      const normalized = normalizeGoogleCandidateText(line);

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

export function isGooglePromptOnly(text: string, promptNeedle = '') {
  if (!promptNeedle) {
    return false;
  }

  const normalized = normalizeGoogleCandidateText(text);
  const normalizedPrompt = normalizeGoogleCandidateText(promptNeedle);

  return normalized === normalizedPrompt ||
    normalized === normalizeGoogleCandidateText(`You said ${promptNeedle}`) ||
    (normalized.includes(normalizedPrompt) && normalized.length <= normalizedPrompt.length + 120);
}

export function googleCandidateRejectionReason(
  candidate: GoogleCandidateGeometry,
  promptNeedle = '',
) {
  const cleanedText = cleanGoogleResponseText(candidate.text);
  const normalizedRaw = normalizeGoogleCandidateText(candidate.text);
  const chromeMarkers = [
    'ai mode history',
    'you said',
    'searching',
    'sources',
    'share',
    'feedback',
  ].filter((marker) => normalizedRaw.includes(marker)).length;

  if (!cleanedText) return 'empty-after-clean';
  if (chromeMarkers >= 3) return 'giant-ai-mode-shell';
  if (isGooglePromptOnly(cleanedText, promptNeedle) || isGooglePromptOnly(candidate.text, promptNeedle)) {
    return 'submitted-prompt-only';
  }
  if (isGoogleShellOrStatusText(cleanedText) || isGoogleShellOrStatusText(candidate.text)) {
    return 'known-google-chrome';
  }
  if (candidate.width > 1100 || candidate.height > 1200) return 'giant-page-container';
  if (candidate.x < 80 && candidate.width <= 140) return 'navigation-container';

  return '';
}

export function evaluateGoogleCandidateText(text: string, promptNeedle = '') {
  const cleanedText = cleanGoogleResponseText(text);

  if (!cleanedText || isGoogleShellOrStatusText(cleanedText)) {
    return {
      accepted: false,
      reason: 'google-shell-or-status-text',
    };
  }

  if (isGooglePromptOnly(cleanedText, promptNeedle) || isGooglePromptOnly(text, promptNeedle)) {
    return {
      accepted: false,
      reason: 'submitted-prompt-only',
    };
  }

  return {
    accepted: true,
  };
}
