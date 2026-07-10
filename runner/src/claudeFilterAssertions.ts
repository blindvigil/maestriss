import {
  claudeCandidateRejectionReason,
  cleanClaudeResponseText,
  evaluateClaudeCandidateText,
} from './drivers/claudeFiltering.js';

type ClaudeCase = {
  text: string;
  expected: 'accepted' | 'rejected';
  expectedReason?: string;
  prompt?: string;
};

const cases: ClaudeCase[] = [
  {
    text: 'Claude OK',
    expected: 'accepted',
  },
  {
    text: 'Claude can help with this in a few steps.\n\nFirst, define the goal clearly.\n\nThen verify the result.',
    expected: 'accepted',
  },
  {
    text: 'Say exactly: Claude OK',
    prompt: 'Say exactly: Claude OK',
    expected: 'rejected',
    expectedReason: 'submitted-prompt-only',
  },
  ...[
    'New chat',
    'Projects',
    'Artifacts',
    'Recents',
    'Search',
    'Copy',
    'Retry',
    'Regenerate',
    'Share',
    'Edit',
    'Claude is responding',
    'Thinking...',
    'Loading...',
    'Stop generating',
    'Claude can make mistakes',
  ].map((text) => ({
    text,
    expected: 'rejected' as const,
    expectedReason: 'claude-shell-or-status-text',
  })),
];

const cleanCases = [
  {
    text: 'Claude OK\nStop generating',
    expected: 'Claude OK',
  },
  {
    text: 'Thought for 1s\nClaude OK',
    expected: 'Claude OK',
  },
  {
    text: 'Thought for 14sA longer answer',
    expected: 'A longer answer',
  },
  {
    text: 'Thought for 1sClaude OK',
    expected: 'Claude OK',
  },
  {
    text: 'Claude responded: Claude OK',
    expected: 'Claude OK',
  },
  {
    text: 'Thought for 1s',
    expected: '',
  },
  {
    text: 'Claude OK',
    expected: 'Claude OK',
  },
  {
    text: 'Stop generating',
    expected: '',
  },
];

let failureCount = 0;

const geometrySiblings = [
  { text: 'Claude responded: Claude OKThought for 1sClaude OK', x: 16, y: 166, width: 643, height: 76 },
  { text: 'Thought for 1sClaude OK', x: 16, y: 166, width: 643, height: 64 },
  { text: 'Claude OK', x: 16, y: 206, width: 643, height: 24 },
];

const geometryCases = [
  {
    candidate: { text: 'Claude OK', x: 16, y: 206, width: 643, height: 24 },
    prompt: 'Say exactly: Claude OK',
    siblings: geometrySiblings,
    expectedReason: '',
  },
  {
    candidate: {
      text: 'New chat\nProjects\nRecents\nSay exactly: Claude OK\nClaude OK\nClaude can make mistakes',
      x: 0,
      y: 0,
      width: 1200,
      height: 900,
    },
    prompt: 'Say exactly: Claude OK',
    siblings: [],
    expectedReason: 'page-or-transcript-parent-container',
  },
  {
    candidate: { text: 'Say exactly: Claude OK', x: 470, y: 98, width: 174, height: 26 },
    prompt: 'Say exactly: Claude OK',
    siblings: geometrySiblings,
    expectedReason: 'submitted-prompt-only',
  },
  {
    candidate: geometrySiblings[0],
    prompt: 'Say exactly: Claude OK',
    siblings: geometrySiblings,
    expectedReason: 'page-or-transcript-parent-container',
  },
];

for (const testCase of cases) {
  const result = evaluateClaudeCandidateText(testCase.text, testCase.prompt ?? '');
  const actual = result.accepted ? 'accepted' : 'rejected';

  if (actual !== testCase.expected) {
    failureCount += 1;
    console.error(`FAIL claude candidate: expected ${testCase.expected}, got ${actual}: ${testCase.text}`);
    console.error(`Reason: ${result.reason ?? '(none)'}`);
  } else if (testCase.expectedReason && result.reason !== testCase.expectedReason) {
    failureCount += 1;
    console.error(
      `FAIL claude reason: expected ${testCase.expectedReason}, got ${result.reason ?? '(none)'}: ${testCase.text}`,
    );
  } else {
    console.log(`PASS claude candidate: ${testCase.expected}: ${testCase.text}`);
  }
}

for (const testCase of cleanCases) {
  const actual = cleanClaudeResponseText(testCase.text);

  if (actual !== testCase.expected) {
    failureCount += 1;
    console.error(`FAIL claude clean: expected ${JSON.stringify(testCase.expected)}, got ${JSON.stringify(actual)}`);
  } else {
    console.log(`PASS claude clean: ${JSON.stringify(testCase.expected)}`);
  }
}

for (const testCase of geometryCases) {
  const actual = claudeCandidateRejectionReason(testCase.candidate, testCase.prompt, testCase.siblings);

  if (actual !== testCase.expectedReason) {
    failureCount += 1;
    console.error(
      `FAIL claude geometry: expected ${JSON.stringify(testCase.expectedReason)}, got ${JSON.stringify(actual)}: ` +
      JSON.stringify(testCase.candidate),
    );
  } else {
    console.log(`PASS claude geometry: ${actual || 'accepted'}: ${testCase.candidate.text}`);
  }
}

if (failureCount > 0) {
  process.exitCode = 1;
}
