import {
  batonToken,
  buildBatonPrompt,
  defaultBatonOrder,
  defaultBatonSeed,
  runBatonTest,
  type BatonAskFn,
  type BatonReadinessFn,
} from './batonTest.js';
import type { ParticipantResponse, ParticipantRunResponse } from './types.js';

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

function completedResponse(participant: string, question: string, answer: string): ParticipantResponse {
  return {
    participant,
    question,
    answer,
    citations: [],
    elapsedSeconds: 1,
    rawText: answer,
    cleanedText: answer,
  };
}

function failedResponse(participant: string, question: string, error: string, reason: string): ParticipantRunResponse {
  return {
    ...completedResponse(participant, question, ''),
    status: 'failed',
    error,
    reason,
  };
}

function extractCurrentBaton(prompt: string) {
  const match = prompt.match(/Text:\n(.*)\n/);
  return match?.[1] ?? '';
}

type AskCall = {
  participant: string;
  prompt: string;
};

// Well-behaved synthetic provider: appends its token to the baton value it
// actually received in the prompt, exactly like a live provider should.
function makeTokenAppendingAsk(calls: AskCall[], overrides?: Record<string, (baton: string) => ParticipantRunResponse>): BatonAskFn {
  return async (participant, prompt) => {
    calls.push({ participant, prompt });
    const baton = extractCurrentBaton(prompt);
    const override = overrides?.[participant];

    if (override) {
      return override(baton);
    }

    return completedResponse(participant, prompt, `${baton}${batonToken(participant)}`);
  };
}

function makeReadiness(statuses: Record<string, string>): BatonReadinessFn {
  return async (participant) => ({
    status: statuses[participant] ?? 'ready',
    notes: [],
  });
}

const threeProviderOrder = ['chatgpt', 'claude', 'gemini'];

async function main() {
  // Provider-facing prompt is a neutral text-formatting exercise.
  {
    const prompt = buildBatonPrompt('MAESTRISS-CHATGPT', '-CLAUDE', 'MAESTRISS-CHATGPT-CLAUDE');
    const expectedPrompt = [
      'This is a simple text-formatting test.',
      '',
      'Text:',
      'MAESTRISS-CHATGPT',
      '',
      'Add this suffix:',
      '-CLAUDE',
      '',
      'Reply with only the resulting text.',
      '',
      'Result:',
      'MAESTRISS-CHATGPT-CLAUDE',
    ].join('\n');

    assert(prompt === expectedPrompt, 'baton prompt uses the exact neutral text-formatting wording');

    const bannedWords = ['token', 'deterministic', 'verification', 'authentication', 'protocol', 'baton', 'chain'];
    const lowered = prompt.toLowerCase();
    const found = bannedWords.filter((word) => lowered.includes(word));

    assert(
      found.length === 0,
      'baton prompt contains no security/verification-suggestive vocabulary',
      found.length ? `found: ${found.join(', ')}` : undefined,
    );
    assert(
      lowered.includes('add this suffix'),
      'baton prompt describes the transformation as adding a suffix',
    );
  }
  // 1. Full successful 3-provider synthetic chain.
  {
    const calls: AskCall[] = [];
    const result = await runBatonTest({
      ask: makeTokenAppendingAsk(calls),
      order: threeProviderOrder,
    });

    assert(result.finalResult === 'PASS', 'successful 3-provider chain reports PASS', `got ${result.finalResult}`);
    assert(
      result.finalBaton === 'MAESTRISS-CHATGPT-CLAUDE-GEMINI',
      'successful chain produces the full expected baton',
      `got ${result.finalBaton}`,
    );
    assert(
      result.stages.every((stage) => stage.outcome === 'pass'),
      'every stage of a successful chain passes',
    );
    assert(
      result.expectedFinalBaton === result.finalBaton,
      'expected final baton matches actual final baton on full pass',
    );

    // 2. Each actual response becomes the next input.
    assert(
      result.stages[1].inputBaton === result.stages[0].actualOutput &&
      result.stages[2].inputBaton === result.stages[1].actualOutput,
      'each stage input is the previous stage actual output',
    );
    assert(
      extractCurrentBaton(calls[1].prompt) === result.stages[0].actualOutput &&
      extractCurrentBaton(calls[2].prompt) === result.stages[1].actualOutput,
      'each prompt carries the previous stage actual output as the current baton',
    );

    // 10. Final baton is computed from actual successful outputs.
    assert(
      result.finalBaton === result.stages[2].actualOutput,
      'final baton is the last successful actual output',
    );
  }

  // Outer-whitespace trim only (canonical response contract behavior).
  {
    const result = await runBatonTest({
      order: ['chatgpt'],
      ask: async (participant, prompt) => (
        completedResponse(participant, prompt, '  MAESTRISS-CHATGPT\n')
      ),
    });

    assert(
      result.finalResult === 'PASS' && result.finalBaton === 'MAESTRISS-CHATGPT',
      'outer whitespace is trimmed before exact comparison',
      `got ${result.finalResult} / ${JSON.stringify(result.finalBaton)}`,
    );
  }

  // 3. Wrong transformed output fails immediately. 5. No later providers run.
  {
    const calls: AskCall[] = [];
    const result = await runBatonTest({
      order: threeProviderOrder,
      ask: makeTokenAppendingAsk(calls, {
        claude: (baton) => completedResponse('claude', '', `${baton}-WRONG`),
      }),
    });

    assert(result.finalResult === 'FAIL', 'wrong transformed output fails the run', `got ${result.finalResult}`);
    assert(result.stoppedAtStage === 2, 'wrong output stops the chain at its stage', `got ${result.stoppedAtStage}`);
    assert(
      result.stages[1].outcome === 'fail' && result.stages[1].failureReason === 'exact-mismatch',
      'wrong output stage records an exact-mismatch failure',
    );
    assert(calls.length === 2, 'no later providers execute after a failure', `got ${calls.length} ask calls`);
    assert(result.stages[2].outcome === 'not-run', 'stages after a failure are reported as not-run');
    assert(
      result.finalBaton === 'MAESTRISS-CHATGPT',
      'failed run keeps the last real baton and forwards nothing fabricated',
      `got ${result.finalBaton}`,
    );
  }

  // 4. Stale previous output fails: unchanged baton echoed back.
  {
    const result = await runBatonTest({
      order: threeProviderOrder,
      ask: makeTokenAppendingAsk([], {
        claude: (baton) => completedResponse('claude', '', baton),
      }),
    });

    assert(
      result.finalResult === 'FAIL' && result.stoppedAtStage === 2,
      'a provider returning the unchanged previous baton fails',
      `got ${result.finalResult} at ${result.stoppedAtStage}`,
    );
  }

  // 4b. Stale smoke-test answer fails.
  {
    const result = await runBatonTest({
      order: threeProviderOrder,
      ask: makeTokenAppendingAsk([], {
        gemini: () => completedResponse('gemini', '', 'Gemini OK'),
      }),
    });

    assert(
      result.finalResult === 'FAIL' && result.stoppedAtStage === 3,
      'a stale exact-answer smoke result fails the baton stage',
      `got ${result.finalResult} at ${result.stoppedAtStage}`,
    );
  }

  // 4c. A future expected baton not derived from actual input fails.
  {
    const result = await runBatonTest({
      order: threeProviderOrder,
      ask: makeTokenAppendingAsk([], {
        claude: () => completedResponse('claude', '', 'MAESTRISS-CHATGPT-CLAUDE-GEMINI'),
      }),
    });

    assert(
      result.finalResult === 'FAIL' && result.stoppedAtStage === 2,
      'a future baton not derived from the actual input fails exact comparison',
      `got ${result.finalResult} at ${result.stoppedAtStage}`,
    );
  }

  // 6. Unavailable provider fails by default.
  {
    const calls: AskCall[] = [];
    const result = await runBatonTest({
      order: threeProviderOrder,
      ask: makeTokenAppendingAsk(calls, {
        claude: () => failedResponse('claude', '', 'Claude is blocked by security verification.', 'security-verification'),
      }),
    });

    assert(
      result.finalResult === 'FAIL' && result.stoppedAtStage === 2,
      'an unavailable provider fails the run by default',
      `got ${result.finalResult} at ${result.stoppedAtStage}`,
    );
    assert(
      result.stages[1].failureReason === 'security-verification',
      'ask failure lifecycle category is preserved on the stage',
      `got ${result.stages[1].failureReason}`,
    );
    assert(calls.length === 2, 'default mode still attempts the unavailable provider ask', `got ${calls.length}`);
  }

  // 7-9. Unavailable provider may be skipped only in explicit skip mode.
  {
    const calls: AskCall[] = [];
    const result = await runBatonTest({
      order: threeProviderOrder,
      skipUnavailable: true,
      getReadiness: makeReadiness({ claude: 'logged-out' }),
      ask: makeTokenAppendingAsk(calls),
    });

    assert(result.stages[1].outcome === 'skipped', 'skip mode skips a not-ready provider before its ask');
    assert(
      result.stages[1].readinessStatus === 'logged-out',
      'skipped stage reports the readiness status',
      `got ${result.stages[1].readinessStatus}`,
    );
    assert(
      !calls.some((call) => call.participant === 'claude'),
      'skipped provider is never asked',
    );
    assert(
      result.finalBaton === 'MAESTRISS-CHATGPT-GEMINI',
      'skipped provider token is not added to the baton',
      `got ${result.finalBaton}`,
    );
    assert(
      extractCurrentBaton(calls[1].prompt) === 'MAESTRISS-CHATGPT',
      'provider after a skip receives the actual current baton without the skipped token',
    );
    assert(result.finalResult === 'PARTIAL', 'skip mode produces PARTIAL, not PASS', `got ${result.finalResult}`);
    assert(
      result.expectedFinalBaton === 'MAESTRISS-CHATGPT-GEMINI',
      'expected final baton omits skipped tokens',
      `got ${result.expectedFinalBaton}`,
    );
  }

  // 7b. Without skip mode, readiness is not consulted and the ask proceeds.
  {
    let readinessCalls = 0;
    const calls: AskCall[] = [];
    const result = await runBatonTest({
      order: threeProviderOrder,
      ask: makeTokenAppendingAsk(calls),
      getReadiness: async (participant) => {
        readinessCalls += 1;
        return { status: participant === 'claude' ? 'logged-out' : 'ready' };
      },
    });

    assert(
      readinessCalls === 0 && calls.length === 3 && result.finalResult === 'PASS',
      'default mode ignores readiness and asks every provider',
      `readinessCalls=${readinessCalls} calls=${calls.length} result=${result.finalResult}`,
    );
  }

  // 11. Custom seed handling.
  {
    const result = await runBatonTest({
      order: ['chatgpt', 'claude'],
      seed: 'CUSTOM-SEED',
      ask: makeTokenAppendingAsk([]),
    });

    assert(
      result.finalResult === 'PASS' && result.finalBaton === 'CUSTOM-SEED-CHATGPT-CLAUDE',
      'custom seed flows through the full chain',
      `got ${result.finalBaton}`,
    );
  }

  // 12. Deterministic participant order.
  {
    const canonicalOrder = [
      'chatgpt',
      'claude',
      'gemini',
      'google',
      'deepseek',
      'grok',
      'copilot',
      'perplexity',
      'reka',
    ];

    assert(
      JSON.stringify(defaultBatonOrder) === JSON.stringify(canonicalOrder),
      'default baton order is the canonical nine-provider sequence',
    );
    assert(defaultBatonSeed === 'MAESTRISS', 'default seed is MAESTRISS');

    const result = await runBatonTest({
      order: canonicalOrder,
      ask: makeTokenAppendingAsk([]),
    });

    assert(
      JSON.stringify(result.order) === JSON.stringify(canonicalOrder) &&
      result.stages.map((stage) => stage.participant).join(',') === canonicalOrder.join(','),
      'stages execute in the configured deterministic order',
    );
    assert(
      result.finalBaton === 'MAESTRISS-CHATGPT-CLAUDE-GEMINI-GOOGLE-DEEPSEEK-GROK-COPILOT-PERPLEXITY-REKA',
      'full nine-provider synthetic chain produces the canonical final baton',
      `got ${result.finalBaton}`,
    );
  }

  // Ask function throwing is a stage failure, not a crash.
  {
    const result = await runBatonTest({
      order: threeProviderOrder,
      ask: async (participant, prompt) => {
        if (participant === 'gemini') {
          throw new Error('connection lost');
        }

        return completedResponse(participant, prompt, `${extractCurrentBaton(prompt)}${batonToken(participant)}`);
      },
    });

    assert(
      result.finalResult === 'FAIL' &&
      result.stoppedAtStage === 3 &&
      result.stages[2].failureReason === 'ask-error',
      'a thrown ask error fails the stage and stops the chain',
      `got ${result.finalResult} at ${result.stoppedAtStage} (${result.stages[2].failureReason})`,
    );
  }

  if (failureCount > 0) {
    console.error(`\n${failureCount} baton test assertion(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log('\nAll baton test assertions passed.');
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
