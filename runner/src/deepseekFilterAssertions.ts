import { evaluateDeepSeekCandidateText } from './drivers/deepseekFiltering.js';

type Case = {
  input: string;
  expected: 'accepted' | 'rejected';
};

const cases: Case[] = [
  {
    input: 'TodayDeepSeek OKDeepSeek OK7 DaysLinear Algebra...',
    expected: 'rejected',
  },
  {
    input: 'TodayDeepSeek OK7 DaysLinear Algebra Roundtable Xcitium Datto 2025-12',
    expected: 'rejected',
  },
  {
    input: 'DeepSeek OK',
    expected: 'accepted',
  },
];

let failureCount = 0;

for (const testCase of cases) {
  const result = evaluateDeepSeekCandidateText(testCase.input);
  const actual = result.accepted ? 'accepted' : 'rejected';

  if (actual !== testCase.expected) {
    failureCount += 1;
    console.error(`FAIL: expected ${testCase.expected}, got ${actual}: ${testCase.input}`);
    console.error(`Reason: ${result.reason ?? '(none)'}`);
  } else {
    console.log(`PASS: ${testCase.expected}: ${testCase.input}`);
  }
}

if (failureCount > 0) {
  process.exitCode = 1;
}
