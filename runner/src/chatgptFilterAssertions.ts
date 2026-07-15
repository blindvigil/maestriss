import {
  buildChatGptAssistantCandidatesScript,
  buildChatGptPromptVisibleScript,
  chatGptClickSendButtonScript,
  chatGptComposerReadyScript,
  chatGptComposerTextScript,
  chatGptDispatchEnterScript,
  chatGptStopControlScript,
} from './drivers/chatgptDriver.js';
import {
  chatGptCandidateRejectionReason,
  chatGptSubmissionEvidenceReasons,
  cleanChatGptResponseText,
  evaluateChatGptCandidateText,
} from './drivers/chatgptFiltering.js';

type ChatGptCase = {
  text: string;
  expected: 'accepted' | 'rejected';
  expectedReason?: string;
  prompt?: string;
};

const cases: ChatGptCase[] = [
  {
    text: 'ChatGPT OK',
    expected: 'accepted',
  },
  {
    text: 'Yes.',
    expected: 'accepted',
  },
  {
    text: 'Here is a concise answer.\n\nIt has two short paragraphs.',
    expected: 'accepted',
  },
  {
    text: 'Say exactly: ChatGPT OK',
    prompt: 'Say exactly: ChatGPT OK',
    expected: 'rejected',
    expectedReason: 'submitted-prompt-only',
  },
  ...[
    'New chat',
    'Explore GPTs',
    'Library',
    'Copy',
    'Retry',
    'Regenerate',
    'Share',
    'Read aloud',
    'Thinking...',
    'Searching',
    'Stop generating',
    'ChatGPT can make mistakes. Check important info.',
  ].map((text) => ({
    text,
    expected: 'rejected' as const,
    expectedReason: 'chatgpt-shell-or-status-text',
  })),
];

const cleanCases = [
  {
    text: 'ChatGPT OK',
    expected: 'ChatGPT OK',
  },
  {
    text: 'ChatGPT OK\nCopy\nRetry\nShare',
    expected: 'ChatGPT OK',
  },
  {
    text: 'ChatGPT OK\nChatGPT can make mistakes. Check important info.',
    expected: 'ChatGPT OK',
  },
  {
    text: 'ChatGPT OK ChatGPT can make mistakes. Check important info.',
    expected: 'ChatGPT OK',
  },
  {
    text: 'Thinking...',
    expected: '',
  },
];

const geometrySiblings = [
  { text: 'Say exactly: ChatGPT OK\nChatGPT OK\nCopy\nRetry', x: 280, y: 100, width: 780, height: 180 },
  { text: 'ChatGPT OK', x: 320, y: 180, width: 180, height: 28 },
];

const geometryCases = [
  {
    candidate: { text: 'ChatGPT OK', x: 320, y: 180, width: 180, height: 28 },
    prompt: 'Say exactly: ChatGPT OK',
    siblings: geometrySiblings,
    expectedReason: '',
  },
  {
    candidate: {
      text: 'New chat\nExplore GPTs\nSay exactly: ChatGPT OK\nChatGPT OK\nCopy\nRetry\nChatGPT can make mistakes',
      x: 0,
      y: 0,
      width: 1280,
      height: 1400,
    },
    prompt: 'Say exactly: ChatGPT OK',
    siblings: [],
    expectedReason: 'page-or-transcript-parent-container',
  },
  {
    candidate: { text: 'Say exactly: ChatGPT OK', x: 420, y: 98, width: 240, height: 28 },
    prompt: 'Say exactly: ChatGPT OK',
    siblings: geometrySiblings,
    expectedReason: 'submitted-prompt-only',
  },
  {
    candidate: geometrySiblings[0],
    prompt: 'Say exactly: ChatGPT OK',
    siblings: geometrySiblings,
    expectedReason: 'page-or-transcript-parent-container',
  },
  {
    // Exact live regression (2026-07-14 Dream Lab run): a completed ~8,000
    // character response rendered far taller than the 1200px size cap, so
    // every semantic assistant candidate was rejected as a transcript
    // parent, latestAssistantText stayed empty, and waitForCompletion timed
    // out on a visibly finished answer. Semantic assistant-message nodes are
    // exempt from the size proxy: they identify exactly one message.
    candidate: {
      text: 'The strongest common thread across the contributions is that they are all arguing against a stateless polling architecture. '.repeat(60),
      x: 640,
      y: -2200,
      width: 768,
      height: 2600,
      selector: '[data-message-author-role="assistant"]',
    },
    prompt: 'Say exactly: ChatGPT OK',
    siblings: [],
    expectedReason: '',
  },
  {
    // The size proxy still guards broad fallback selectors: an equally tall
    // candidate without a semantic assistant selector stays rejected.
    candidate: {
      text: 'The strongest common thread across the contributions is that they are all arguing against a stateless polling architecture. '.repeat(60),
      x: 640,
      y: -2200,
      width: 768,
      height: 2600,
      selector: '[class*="markdown"]',
    },
    prompt: 'Say exactly: ChatGPT OK',
    siblings: [],
    expectedReason: 'page-or-transcript-parent-container',
  },
  {
    // The semantic exemption bypasses only the size proxy — every other
    // rejection rule still applies to assistant-selector candidates.
    candidate: {
      text: 'Say exactly: ChatGPT OK',
      x: 640,
      y: 120,
      width: 768,
      height: 1400,
      selector: '[data-message-author-role="assistant"]',
    },
    prompt: 'Say exactly: ChatGPT OK',
    siblings: [],
    expectedReason: 'submitted-prompt-only',
  },
];

const submissionEvidenceCases = [
  {
    name: 'composer cleared',
    signals: {
      prompt: 'Say exactly: ChatGPT OK',
      composerText: '',
      promptVisibleAsUserMessage: false,
      stopVisible: false,
      beforeAssistantText: '',
      currentAssistantText: '',
    },
    expected: ['composer-cleared'],
  },
  {
    name: 'user message visible',
    signals: {
      prompt: 'Say exactly: ChatGPT OK',
      composerText: 'Say exactly: ChatGPT OK',
      promptVisibleAsUserMessage: true,
      stopVisible: false,
      beforeAssistantText: '',
      currentAssistantText: '',
    },
    expected: ['prompt-visible-as-user-message'],
  },
  {
    name: 'generation stop visible',
    signals: {
      prompt: 'Say exactly: ChatGPT OK',
      composerText: 'Say exactly: ChatGPT OK',
      promptVisibleAsUserMessage: false,
      stopVisible: true,
      beforeAssistantText: '',
      currentAssistantText: '',
    },
    expected: ['stop-control-visible'],
  },
  {
    name: 'assistant response changed',
    signals: {
      prompt: 'Say exactly: ChatGPT OK',
      composerText: 'Say exactly: ChatGPT OK',
      promptVisibleAsUserMessage: false,
      stopVisible: false,
      beforeAssistantText: '',
      currentAssistantText: 'ChatGPT OK',
    },
    expected: ['assistant-response-changed'],
  },
  {
    name: 'no evidence',
    signals: {
      prompt: 'Say exactly: ChatGPT OK',
      composerText: 'Say exactly: ChatGPT OK',
      promptVisibleAsUserMessage: false,
      stopVisible: false,
      beforeAssistantText: '',
      currentAssistantText: '',
    },
    expected: [],
  },
];

// Every ChatGPT browser-evaluated script must be valid standalone JavaScript
// (the live regression class: page.evaluate SyntaxError) and must not contain
// transpiler-injected helpers like __name that do not exist in the browser.
const browserScripts = [
  { name: 'composer-text', script: chatGptComposerTextScript },
  { name: 'stop-control', script: chatGptStopControlScript },
  { name: 'composer-ready', script: chatGptComposerReadyScript },
  { name: 'click-send-button', script: chatGptClickSendButtonScript },
  { name: 'dispatch-enter', script: chatGptDispatchEnterScript },
  { name: 'assistant-candidates', script: buildChatGptAssistantCandidatesScript() },
  { name: 'prompt-visible', script: buildChatGptPromptVisibleScript('Say exactly: ChatGPT OK') },
];

let failureCount = 0;

for (const { name, script } of browserScripts) {
  if (script.includes('__name')) {
    failureCount += 1;
    console.error(`FAIL chatgpt browser script ${name}: contains __name`);
    continue;
  }

  try {
    new Function(`return ${script};`);
    console.log(`PASS chatgpt browser script ${name}: valid standalone JavaScript without __name`);
  } catch (error) {
    failureCount += 1;
    console.error(`FAIL chatgpt browser script ${name}: ${String(error)}`);
  }
}

for (const testCase of cases) {
  const result = evaluateChatGptCandidateText(testCase.text, testCase.prompt ?? '');
  const actual = result.accepted ? 'accepted' : 'rejected';

  if (actual !== testCase.expected) {
    failureCount += 1;
    console.error(`FAIL chatgpt candidate: expected ${testCase.expected}, got ${actual}: ${testCase.text}`);
    console.error(`Reason: ${result.reason ?? '(none)'}`);
  } else if (testCase.expectedReason && result.reason !== testCase.expectedReason) {
    failureCount += 1;
    console.error(
      `FAIL chatgpt reason: expected ${testCase.expectedReason}, got ${result.reason ?? '(none)'}: ${testCase.text}`,
    );
  } else {
    console.log(`PASS chatgpt candidate: ${testCase.expected}: ${testCase.text}`);
  }
}

for (const testCase of cleanCases) {
  const actual = cleanChatGptResponseText(testCase.text);

  if (actual !== testCase.expected) {
    failureCount += 1;
    console.error(`FAIL chatgpt clean: expected ${JSON.stringify(testCase.expected)}, got ${JSON.stringify(actual)}`);
  } else {
    console.log(`PASS chatgpt clean: ${JSON.stringify(testCase.expected)}`);
  }
}

for (const testCase of geometryCases) {
  const actual = chatGptCandidateRejectionReason(testCase.candidate, testCase.prompt, testCase.siblings);

  if (actual !== testCase.expectedReason) {
    failureCount += 1;
    console.error(
      `FAIL chatgpt geometry: expected ${JSON.stringify(testCase.expectedReason)}, got ${JSON.stringify(actual)}: ` +
      JSON.stringify(testCase.candidate),
    );
  } else {
    console.log(`PASS chatgpt geometry: ${actual || 'accepted'}: ${testCase.candidate.text}`);
  }
}

for (const testCase of submissionEvidenceCases) {
  const actual = chatGptSubmissionEvidenceReasons(testCase.signals);

  if (JSON.stringify(actual) !== JSON.stringify(testCase.expected)) {
    failureCount += 1;
    console.error(
      `FAIL chatgpt submit evidence ${testCase.name}: ` +
      `expected ${JSON.stringify(testCase.expected)}, got ${JSON.stringify(actual)}`,
    );
  } else {
    console.log(`PASS chatgpt submit evidence: ${testCase.name}`);
  }
}

if (failureCount > 0) {
  process.exitCode = 1;
}
