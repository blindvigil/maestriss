// Isolated live OpenAI API smoke test.
//
// This is NOT part of any deterministic or offline suite: it makes a real
// billed API call. Run it explicitly with `npm run test:openai-api`.
//
// Purpose: prove that the official OpenAI Node SDK and the Responses API can
// reach a real, currently supported model and return an exact expected string.
// The client construction, Responses API call, response-shape extraction, and
// structured failure classification are shared with Council API execution via
// `openaiTransport.ts`; this file stays small and only adds the exact-response
// validation specific to the smoke test.
//
// Key hygiene: OPENAI_API_KEY is read from the environment and used only to
// construct the SDK client. It is never printed, logged, persisted, written to
// configuration or debug artifacts, or included in any error output. If it is
// absent, the test fails clearly before any network request.

import {
  OPENAI_DEFAULT_MODEL,
  createOpenAiResponsesCaller,
  readOpenAiKey,
} from './openaiTransport.js';

const PROMPT = 'Reply with exactly: MAESTRISS OPENAI API OK';
const EXPECTED = 'MAESTRISS OPENAI API OK';

async function runSmokeTest(): Promise<void> {
  const apiKey = readOpenAiKey();

  // Fail clearly BEFORE any API request when the key is absent. The value is
  // never printed — only its presence and length are ever observable.
  if (!apiKey) {
    console.error('RESULT: FAIL — missing-api-key');
    console.error('OPENAI_API_KEY is not set in the environment. Set it in a fresh terminal and retry.');
    process.exitCode = 1;
    return;
  }

  console.log('Maestriss OpenAI API smoke test');
  console.log(`Model: ${OPENAI_DEFAULT_MODEL}`);
  console.log('API: Responses API (official openai Node SDK)');
  console.log(`OPENAI_API_KEY: present (length ${apiKey.length}); value never printed`);
  console.log('Sending single-line smoke prompt...');

  const caller = createOpenAiResponsesCaller({ apiKey, model: OPENAI_DEFAULT_MODEL });
  const result = await caller(PROMPT);

  if (!result.ok) {
    console.error(`RESULT: FAIL — ${result.category}`);

    if (result.message) {
      console.error(result.message);
    }

    if (result.detail) {
      console.error(`Detail: ${JSON.stringify(result.detail)}`);
    }

    process.exitCode = 1;
    return;
  }

  // Normalize only surrounding whitespace; the text itself is not rewritten.
  const normalized = result.text.trim();

  if (normalized !== EXPECTED) {
    console.error('RESULT: FAIL — exact-response-mismatch');
    console.error(`Expected: ${EXPECTED}`);
    console.error(`Received: ${normalized}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Normalized returned text: ${normalized}`);
  console.log('RESULT: PASS — exact expected response received.');
}

runSmokeTest().catch((error: unknown) => {
  // Defensive catch: the caller classifies API errors internally, so this only
  // fires on an unexpected non-API throw. Never touches the key.
  console.error('RESULT: FAIL — network-or-availability-failure');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
