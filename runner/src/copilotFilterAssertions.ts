import { evaluateCopilotCandidateText } from './drivers/copilotFiltering.js';

type CopilotCase = {
  text: string;
  expected: 'accepted' | 'rejected';
  expectedReason?: string;
};

const cases: CopilotCase[] = [
  {
    text: 'Stopped generating',
    expected: 'rejected',
    expectedReason: 'copilot-shell-or-status-text',
  },
  {
    text: 'Copilot OK',
    expected: 'accepted',
  },
];

let failureCount = 0;

for (const testCase of cases) {
  const result = evaluateCopilotCandidateText(testCase.text);
  const actual = result.accepted ? 'accepted' : 'rejected';

  if (actual !== testCase.expected) {
    failureCount += 1;
    console.error(`FAIL copilot candidate: expected ${testCase.expected}, got ${actual}: ${testCase.text}`);
    console.error(`Reason: ${result.reason ?? '(none)'}`);
  } else if (testCase.expectedReason && result.reason !== testCase.expectedReason) {
    failureCount += 1;
    console.error(
      `FAIL copilot reason: expected ${testCase.expectedReason}, got ${result.reason ?? '(none)'}: ${testCase.text}`,
    );
  } else {
    console.log(`PASS copilot candidate: ${testCase.expected}: ${testCase.text}`);
  }
}

if (failureCount > 0) {
  process.exitCode = 1;
}
