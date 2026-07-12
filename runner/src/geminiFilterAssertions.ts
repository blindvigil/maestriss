import {
  cleanGeminiResponseText,
  evaluateGeminiCandidateText,
  geminiCandidateRejectionReason,
} from './drivers/geminiFiltering.js';
import { buildGeminiResponseDetectorScript } from './drivers/geminiDriver.js';
import { chromium } from 'playwright';

type GeminiCase = {
  text: string;
  expected: 'accepted' | 'rejected';
  expectedReason?: string;
  prompt?: string;
};

type GeminiDetectorFixtureDiagnostics = {
  selectedCleanedText: string;
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
    candidate: { text: 'Gemini OK', x: 16, y: 200, width: 653, height: 32 },
    expectedReason: '',
  },
  {
    candidate: { text: 'Gemini OK', x: 24, y: 200, width: 637, height: 24 },
    expectedReason: '',
  },
  {
    candidate: { text: 'Gemini said Gemini OK', x: 16, y: 196, width: 653, height: 88 },
    expectedReason: '',
  },
  {
    candidate: {
      text: 'Gemini OK',
      x: 16,
      y: 200,
      width: 653,
      height: 32,
      insideExcludedArea: true,
      insideResponseContainer: true,
    },
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
    candidate: {
      text: 'Some previous chat title about planning',
      x: 16,
      y: 160,
      width: 320,
      height: 32,
      insideExcludedArea: true,
    },
    expectedReason: 'navigation-or-sidebar-container',
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

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1047, height: 872 } });
await page.setContent(`
  <main>
    <div id="chat-history" class="chat-history-scroll-container">
      <div class="conversation-container">
        <user-query>
          <div class="user-query-container">
            <p>Say exactly: Gemini OK</p>
          </div>
        </user-query>
        <model-response>
          <response-container>
            <structured-content-container class="model-response-text">
              <message-content>
                <div id="model-response-message-content-test" class="markdown">
                  <p style="margin-left:16px; width:653px; min-height:32px;">Gemini OK</p>
                </div>
              </message-content>
            </structured-content-container>
          </response-container>
        </model-response>
      </div>
    </div>
    <nav class="sidebar history"><p>Old Gemini OK chat title</p></nav>
  </main>
`);

const fixtureDiagnostics = await page.evaluate<GeminiDetectorFixtureDiagnostics>(
  buildGeminiResponseDetectorScript('Say exactly: Gemini OK'),
);
await browser.close();

if (fixtureDiagnostics.selectedCleanedText !== 'Gemini OK') {
  failureCount += 1;
  console.error(
    `FAIL gemini detector fixture: expected "Gemini OK", got ` +
    JSON.stringify(fixtureDiagnostics.selectedCleanedText),
  );
  console.error(JSON.stringify(fixtureDiagnostics, null, 2));
} else {
  console.log('PASS gemini detector fixture: selected Gemini OK from model-response');
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
