import { evaluateRekaCandidateText } from './drivers/rekaFiltering.js';

type Case = {
  input: string;
  expected: 'accepted' | 'rejected';
};

const cases: Case[] = [
  {
    input: 'We use cookies to ensure you get the best experience...',
    expected: 'rejected',
  },
  {
    input: 'SETTINGSAPIAPI PlatformTalk to SalesEvan Fabri',
    expected: 'rejected',
  },
  {
    input: 'API DocumentationAPI PlatformTalk to Sales',
    expected: 'rejected',
  },
  {
    input: 'Responses may be inaccurate. Verify important information.',
    expected: 'rejected',
  },
  {
    input: 'Image analysisCode analysisMultilingual chat',
    expected: 'rejected',
  },
  {
    input: 'Reka OK',
    expected: 'accepted',
  },
];

let failureCount = 0;

for (const testCase of cases) {
  const result = evaluateRekaCandidateText(testCase.input);
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
