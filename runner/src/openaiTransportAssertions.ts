// Deterministic assertions for the shared OpenAI transport.
//
// Browser-free and network-free: the OpenAI request is behind an injectable
// caller, so the Council-facing adapter, the failure-category mapping, and the
// Responses-API text extraction are all exercised without the SDK or a live
// call. The live end-to-end proof stays in `npm run test:openai-api`.

import {
  createOpenAiCouncilAsk,
  extractResponseText,
  mapOpenAiCategoryToCouncilReason,
  readOpenAiKey,
  type OpenAiCallResult,
  type OpenAiFailureCategory,
} from './openaiTransport.js';
import { providerUnavailableAskReasons } from './councilExecution.js';
import type { ParticipantErrorResponse, ParticipantResponse } from './types.js';

let failureCount = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`PASS: ${label}`);
    return;
  }

  failureCount += 1;
  console.error(`FAIL: ${label}`);

  if (detail) {
    console.error(`  ${detail}`);
  }
}

const MIND_ID = 'openai-gpt-4o-mini';

function fixedCaller(result: OpenAiCallResult) {
  const inputs: string[] = [];
  const caller = async (input: string) => {
    inputs.push(input);
    return result;
  };
  return { caller, inputs };
}

async function testSuccessMapping() {
  const { caller, inputs } = fixedCaller({ ok: true, text: '  A concrete answer.  ' });
  const ask = createOpenAiCouncilAsk({ caller, mindId: MIND_ID });
  const response = (await ask('ignored', 'the exact composed prompt')) as ParticipantResponse;

  assert(
    inputs.length === 1 && inputs[0] === 'the exact composed prompt',
    'the adapter forwards the exact composed prompt to the OpenAI caller unchanged',
  );
  assert(
    !('status' in response) &&
    response.participant === MIND_ID &&
    response.answer === '  A concrete answer.  ' &&
    response.rawText === '  A concrete answer.  ',
    'a successful OpenAI result becomes a normalized response carrying the raw text verbatim (engine trims outer whitespace, not the transport)',
  );
}

async function testFailureCategoryMapping() {
  const cases: Array<{ category: OpenAiFailureCategory; reason: string; unavailable: boolean }> = [
    { category: 'authentication-failure', reason: 'session-unavailable', unavailable: true },
    { category: 'billing-or-quota-failure', reason: 'usage-limit', unavailable: true },
    { category: 'rate-limit', reason: 'rate-limited', unavailable: true },
    { category: 'network-or-availability-failure', reason: 'provider-unavailable', unavailable: true },
    { category: 'missing-api-key', reason: 'session-unavailable', unavailable: true },
    { category: 'malformed-api-response', reason: 'malformed-response', unavailable: false },
  ];

  for (const testCase of cases) {
    assert(
      mapOpenAiCategoryToCouncilReason(testCase.category) === testCase.reason,
      `${testCase.category} maps to Council reason "${testCase.reason}"`,
      mapOpenAiCategoryToCouncilReason(testCase.category),
    );
    assert(
      providerUnavailableAskReasons.has(testCase.reason) === testCase.unavailable,
      `${testCase.category} is ${testCase.unavailable ? 'a run-unavailable' : 'a NON-availability'} category for the circuit breaker`,
    );

    const { caller } = fixedCaller({ ok: false, category: testCase.category, message: 'diag' });
    const ask = createOpenAiCouncilAsk({ caller, mindId: MIND_ID });
    const response = (await ask('ignored', 'prompt')) as ParticipantErrorResponse;

    assert(
      'status' in response &&
      response.status === 'failed' &&
      response.reason === testCase.reason &&
      response.error === 'diag' &&
      response.answer === '',
      `${testCase.category} becomes a failed normalized response with the mapped reason and no fabricated answer`,
    );
  }

  assert(
    providerUnavailableAskReasons.has('malformed-response') === false,
    'a malformed API response is never disguised as provider unavailability',
  );
}

async function testExtraction() {
  assert(
    extractResponseText({ output_text: 'hello', output: [] } as never) === 'hello',
    'extractResponseText prefers the aggregated output_text',
  );
  assert(
    extractResponseText({
      output_text: '',
      output: [{ type: 'message', content: [{ type: 'output_text', text: 'from-structured' }] }],
    } as never) === 'from-structured',
    'extractResponseText falls back to the structured output_text content items',
  );
  assert(
    extractResponseText({ output_text: '', output: [] } as never) === undefined,
    'extractResponseText returns undefined when there is no output text (malformed)',
  );
}

async function testKeyReading() {
  const original = process.env.OPENAI_API_KEY;

  try {
    delete process.env.OPENAI_API_KEY;
    assert(readOpenAiKey() === undefined, 'readOpenAiKey returns undefined when the key is absent');

    process.env.OPENAI_API_KEY = '   ';
    assert(readOpenAiKey() === undefined, 'readOpenAiKey treats a blank key as absent');

    process.env.OPENAI_API_KEY = 'sk-not-a-real-key';
    assert(readOpenAiKey() === 'sk-not-a-real-key', 'readOpenAiKey returns a present key value');
  } finally {
    if (original === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = original;
    }
  }
}

async function main() {
  await testSuccessMapping();
  await testFailureCategoryMapping();
  await testExtraction();
  await testKeyReading();

  if (failureCount > 0) {
    console.error(`\n${failureCount} OpenAI transport assertion(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log('\nAll OpenAI transport assertions passed.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
