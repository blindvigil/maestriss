import {
  evaluateGrokCandidate,
  evaluateGrokOverlayCandidate,
  evaluateGrokTerminalErrorText,
} from './drivers/grokFiltering.js';

type CandidateCase = {
  input: {
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  promptNeedle?: string;
  expected: 'accepted' | 'rejected';
  expectedReason?: string;
};

type OverlayCase = {
  input: {
    attributeText: string;
    ancestorAttributeText: string;
    inModal: boolean;
    inViewport: boolean;
  };
  expected: 'blocking' | 'not-blocking';
};

type TerminalErrorCase = {
  text: string;
  promptNeedle?: string;
  expected: string | 'not-found';
};

const candidateCases: CandidateCase[] = [
  {
    input: {
      text: 'Grok OK',
      x: 164,
      y: 170,
      width: 768,
      height: 68,
    },
    expected: 'accepted',
  },
  {
    input: {
      text: 'Say exactly: Grok OK',
      x: 743,
      y: 80,
      width: 189,
      height: 46,
    },
    promptNeedle: 'Say exactly: Grok OK',
    expected: 'rejected',
    expectedReason: 'submitted-prompt-only',
  },
  {
    input: {
      text: 'Say exactly: Grok OKGrok OK',
      x: 57,
      y: 0,
      width: 982,
      height: 910,
    },
    expected: 'rejected',
    expectedReason: 'outside-central-chat-left',
  },
];

const overlayCases: OverlayCase[] = [
  {
    // Grok's cookie-consent widget contains a "Search…" vendor list input and must
    // never be treated as a blocking search/history overlay.
    input: {
      attributeText: 'vendor-search-handler search… cookie list search',
      ancestorAttributeText: 'onetrust-pc-sdk ot-pc-content',
      inModal: true,
      inViewport: true,
    },
    expected: 'not-blocking',
  },
  {
    input: {
      attributeText: 'search conversations',
      ancestorAttributeText: 'dialog-content',
      inModal: true,
      inViewport: true,
    },
    expected: 'blocking',
  },
  {
    // Ordinary page search inputs outside a modal are not blocking overlays.
    input: {
      attributeText: 'search',
      ancestorAttributeText: 'app-shell',
      inModal: false,
      inViewport: true,
    },
    expected: 'not-blocking',
  },
  {
    input: {
      attributeText: 'search conversations',
      ancestorAttributeText: 'dialog-content',
      inModal: true,
      inViewport: false,
    },
    expected: 'not-blocking',
  },
];

const longTranscriptMentioningRateLimit =
  'ORIGINAL PROMPT ==================== The roundtable discussed API design. ' +
  'ChatGPT noted that a rate limit strategy with exponential backoff is standard practice, ' +
  'and Claude added that too many requests should surface a clear retry-after header so clients ' +
  'can recover gracefully without hammering the service or losing user trust in the product.';

const terminalErrorCases: TerminalErrorCase[] = [
  {
    text: 'Please try again soon, or upgrade for higher priority access',
    expected: 'grok-capacity-error',
  },
  {
    text: 'Something went wrong',
    expected: 'grok-runtime-error',
  },
  {
    text: 'You have hit the rate limit.',
    expected: 'grok-rate-limited',
  },
  {
    text: 'Grok OK',
    expected: 'not-found',
  },
  {
    // Long transcript content that merely mentions error phrases is not a terminal state.
    text: longTranscriptMentioningRateLimit,
    expected: 'not-found',
  },
  {
    // The user's own prompt bubble echoing an error phrase is not a terminal state.
    text: 'Say exactly: rate limit reached',
    promptNeedle: 'Say exactly: rate limit reached',
    expected: 'not-found',
  },
];

let failureCount = 0;

for (const testCase of candidateCases) {
  const result = evaluateGrokCandidate(testCase.input, testCase.promptNeedle);
  const actual = result.accepted ? 'accepted' : 'rejected';

  if (actual !== testCase.expected) {
    failureCount += 1;
    console.error(`FAIL candidate: expected ${testCase.expected}, got ${actual}: ${testCase.input.text}`);
    console.error(`Reason: ${result.reason ?? '(none)'}`);
  } else if (testCase.expectedReason && result.reason !== testCase.expectedReason) {
    failureCount += 1;
    console.error(`FAIL candidate reason: expected ${testCase.expectedReason}, got ${result.reason ?? '(none)'}: ${testCase.input.text}`);
  } else {
    console.log(`PASS candidate: ${testCase.expected}: ${testCase.input.text}`);
  }
}

for (const testCase of overlayCases) {
  const result = evaluateGrokOverlayCandidate(testCase.input);
  const actual = result.blocking ? 'blocking' : 'not-blocking';

  if (actual !== testCase.expected) {
    failureCount += 1;
    console.error(`FAIL overlay: expected ${testCase.expected}, got ${actual}: ${testCase.input.attributeText}`);
    console.error(`Reason: ${result.reason ?? '(none)'}`);
  } else {
    console.log(`PASS overlay: ${testCase.expected}: ${testCase.input.attributeText}`);
  }
}

for (const testCase of terminalErrorCases) {
  const result = evaluateGrokTerminalErrorText(testCase.text, testCase.promptNeedle ?? '');
  const actual = result.found ? (result.reason ?? 'found') : 'not-found';

  if (actual !== testCase.expected) {
    failureCount += 1;
    console.error(`FAIL terminal-error: expected ${testCase.expected}, got ${actual}: ${testCase.text.slice(0, 80)}`);
  } else {
    console.log(`PASS terminal-error: ${testCase.expected}: ${testCase.text.slice(0, 80)}`);
  }
}

if (failureCount > 0) {
  process.exitCode = 1;
}
