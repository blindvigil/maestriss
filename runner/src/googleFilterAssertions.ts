import {
  cleanGoogleResponseText,
  evaluateGoogleCandidateText,
  googleCandidateRejectionReason,
} from './drivers/googleFiltering.js';

type GoogleCase = {
  text: string;
  expected: 'accepted' | 'rejected';
  expectedReason?: string;
  prompt?: string;
};

const cases: GoogleCase[] = [
  {
    text: 'Google OK',
    expected: 'accepted',
  },
  {
    text: 'Say exactly: Google OK',
    prompt: 'Say exactly: Google OK',
    expected: 'rejected',
    expectedReason: 'google-shell-or-status-text',
  },
  ...[
    'AI Mode',
    'You said',
    'Searching',
    'Transcribing...',
    'Sources',
    'Show more',
    'Share',
    'Feedback',
    'My Ad Center',
    'AI can make mistakes, so double-check responses',
  ].map((text) => ({
    text,
    expected: 'rejected' as const,
    expectedReason: 'google-shell-or-status-text',
  })),
];

const cleanCases = [
  {
    text: 'Google OK',
    expected: 'Google OK',
  },
  {
    text: 'Google OK\nAI can make mistakes, so double-check responses',
    expected: 'Google OK',
  },
  {
    text: 'Google OK A copy of this chat, including the images and video, will be included with your feedback',
    expected: 'Google OK',
  },
];

const geometryCases = [
  {
    candidate: {
      text: 'AI Mode history\nYou said\nSay exactly: Google OK\nSearching\nGoogle OK\nSources\nShare\nFeedback',
      x: 0,
      y: 0,
      width: 1039,
      height: 910,
    },
    expectedReason: 'giant-ai-mode-shell',
  },
  {
    candidate: { text: 'Google OK', x: 220, y: 300, width: 160, height: 24 },
    expectedReason: '',
  },
];

let failureCount = 0;

for (const testCase of cases) {
  const result = evaluateGoogleCandidateText(testCase.text, testCase.prompt ?? '');
  const actual = result.accepted ? 'accepted' : 'rejected';

  if (actual !== testCase.expected) {
    failureCount += 1;
    console.error(`FAIL google candidate: expected ${testCase.expected}, got ${actual}: ${testCase.text}`);
    console.error(`Reason: ${result.reason ?? '(none)'}`);
  } else if (testCase.expectedReason && result.reason !== testCase.expectedReason) {
    failureCount += 1;
    console.error(
      `FAIL google reason: expected ${testCase.expectedReason}, got ${result.reason ?? '(none)'}: ${testCase.text}`,
    );
  } else {
    console.log(`PASS google candidate: ${testCase.expected}: ${testCase.text}`);
  }
}

for (const testCase of cleanCases) {
  const actual = cleanGoogleResponseText(testCase.text);

  if (actual !== testCase.expected) {
    failureCount += 1;
    console.error(`FAIL google clean: expected ${JSON.stringify(testCase.expected)}, got ${JSON.stringify(actual)}`);
  } else {
    console.log(`PASS google clean: ${JSON.stringify(testCase.expected)}`);
  }
}

for (const testCase of geometryCases) {
  const actual = googleCandidateRejectionReason(testCase.candidate, 'Say exactly: Google OK');

  if (actual !== testCase.expectedReason) {
    failureCount += 1;
    console.error(
      `FAIL google geometry: expected ${JSON.stringify(testCase.expectedReason)}, got ${JSON.stringify(actual)}: ` +
      JSON.stringify(testCase.candidate),
    );
  } else {
    console.log(`PASS google geometry: ${actual || 'accepted'}: ${testCase.candidate.text}`);
  }
}

if (failureCount > 0) {
  process.exitCode = 1;
}
