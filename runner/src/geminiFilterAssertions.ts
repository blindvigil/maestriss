import {
  cleanGeminiResponseText,
  evaluateGeminiCandidateText,
  geminiCandidateRejectionReason,
} from './drivers/geminiFiltering.js';
import { buildGeminiResponseDetectorScript } from './drivers/geminiDriver.js';

type GeminiCase = {
  text: string;
  expected: 'accepted' | 'rejected';
  expectedReason?: string;
  prompt?: string;
};

const cases: GeminiCase[] = [
  {
    text: 'Gemini OK',
    expected: 'accepted',
  },
  {
    text: 'Say exactly: Gemini OK',
    prompt: 'Say exactly: Gemini OK',
    expected: 'rejected',
    expectedReason: 'gemini-shell-or-status-text',
  },
  ...[
    'New chat',
    'Conversation with Gemini',
    'You said',
    'Copy',
    'Share',
    'Gemini is AI and can make mistakes.',
    'Upgrade',
  ].map((text) => ({
    text,
    expected: 'rejected' as const,
    expectedReason: 'gemini-shell-or-status-text',
  })),
];

const cleanCases = [
  {
    text: 'Gemini OK',
    expected: 'Gemini OK',
  },
  {
    text: 'New notebook Conversation with Gemini  You said  Say exactly: Gemini OK  Gemini is AI and can make mistakes.',
    expected: '',
  },
  {
    text: 'Gemini OK\nCopy\nShare\nGemini is AI and can make mistakes.',
    expected: 'Gemini OK',
  },
  {
    text: 'Gemini said Gemini OK',
    expected: 'Gemini OK',
  },
];

const geometryCases = [
  {
    candidate: { text: 'Gemini OK', x: 192, y: 192, width: 708, height: 24 },
    expectedReason: '',
  },
  {
    candidate: { text: 'Say exactly: Gemini OK', x: 704, y: 98, width: 174, height: 26 },
    expectedReason: 'empty-after-clean',
  },
  {
    candidate: { text: 'New notebook', x: 0, y: 0, width: 52, height: 910 },
    expectedReason: 'left-navigation-container',
  },
  {
    candidate: { text: 'Gemini OK', x: 0, y: 0, width: 1039, height: 910 },
    expectedReason: 'page-or-conversation-parent-container',
  },
];

let failureCount = 0;
const detectorScript = buildGeminiResponseDetectorScript('Say exactly: Gemini OK');

if (detectorScript.includes('__name')) {
  failureCount += 1;
  console.error('FAIL gemini detector script: contains __name');
} else {
  console.log('PASS gemini detector script: no __name');
}

for (const testCase of cases) {
  const result = evaluateGeminiCandidateText(testCase.text, testCase.prompt ?? '');
  const actual = result.accepted ? 'accepted' : 'rejected';

  if (actual !== testCase.expected) {
    failureCount += 1;
    console.error(`FAIL gemini candidate: expected ${testCase.expected}, got ${actual}: ${testCase.text}`);
    console.error(`Reason: ${result.reason ?? '(none)'}`);
  } else if (testCase.expectedReason && result.reason !== testCase.expectedReason) {
    failureCount += 1;
    console.error(
      `FAIL gemini reason: expected ${testCase.expectedReason}, got ${result.reason ?? '(none)'}: ${testCase.text}`,
    );
  } else {
    console.log(`PASS gemini candidate: ${testCase.expected}: ${testCase.text}`);
  }
}

for (const testCase of cleanCases) {
  const actual = cleanGeminiResponseText(testCase.text);

  if (actual !== testCase.expected) {
    failureCount += 1;
    console.error(`FAIL gemini clean: expected ${JSON.stringify(testCase.expected)}, got ${JSON.stringify(actual)}`);
  } else {
    console.log(`PASS gemini clean: ${JSON.stringify(testCase.expected)}`);
  }
}

for (const testCase of geometryCases) {
  const actual = geminiCandidateRejectionReason(testCase.candidate, 'Say exactly: Gemini OK');

  if (actual !== testCase.expectedReason) {
    failureCount += 1;
    console.error(
      `FAIL gemini geometry: expected ${JSON.stringify(testCase.expectedReason)}, got ${JSON.stringify(actual)}: ` +
      JSON.stringify(testCase.candidate),
    );
  } else {
    console.log(`PASS gemini geometry: ${actual || 'accepted'}: ${testCase.candidate.text}`);
  }
}

if (failureCount > 0) {
  process.exitCode = 1;
}
