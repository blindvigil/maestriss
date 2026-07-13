import {
  cleanPerplexityResponseText,
  evaluatePerplexityCandidate,
  selectPerplexityResponseCandidate,
  type PerplexityCandidate,
} from './drivers/perplexityFiltering.js';

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

function candidate(partial: Partial<PerplexityCandidate> & { text: string }): PerplexityCandidate {
  return {
    tier: 'semantic-answer',
    insideQueryContainer: false,
    bottom: 500,
    ...partial,
  };
}

// Live baton failure shape (2026-07-12): prompt in a group/query heading
// container, answer-only text in a prose/markdown-content node, and a
// transcript-level main parent containing prompt + answer + chrome.
const batonPrompt = [
  'This is a simple text-formatting test.',
  '',
  'Text:',
  'MAESTRISS-CHATGPT-CLAUDE-GEMINI-GOOGLE-DEEPSEEK-GROK',
  '',
  'Add this suffix:',
  '-PERPLEXITY',
  '',
  'Reply with only the resulting text.',
  '',
  'Result:',
  'MAESTRISS-CHATGPT-CLAUDE-GEMINI-GOOGLE-DEEPSEEK-GROK-PERPLEXITY',
].join('\n');
const batonAnswer = 'MAESTRISS-CHATGPT-CLAUDE-GEMINI-GOOGLE-DEEPSEEK-GROK-PERPLEXITY';
const batonTranscript = `Answer Images Share ${batonPrompt}\nShow more ${batonAnswer} Sources Ask a follow-up`;

// 1. Accept a clean answer-only candidate.
{
  const evaluation = evaluatePerplexityCandidate(candidate({ text: batonAnswer }), batonPrompt);
  assert(evaluation.accepted, 'accepts a clean answer-only candidate', evaluation.reason);
}

// 2. Reject submitted-prompt-only text and query containers.
{
  const promptOnly = evaluatePerplexityCandidate(
    candidate({ text: batonPrompt, tier: 'legacy-container' }),
    batonPrompt,
  );
  assert(
    !promptOnly.accepted && promptOnly.reason === 'submitted-prompt-only',
    'rejects submitted-prompt-only text',
    promptOnly.reason,
  );

  const queryContainer = evaluatePerplexityCandidate(
    candidate({ text: batonAnswer, insideQueryContainer: true }),
    batonPrompt,
  );
  assert(
    !queryContainer.accepted && queryContainer.reason === 'submitted-prompt-container',
    'rejects candidates inside the query container structurally',
    queryContainer.reason,
  );
}

// 3. Reject a transcript parent containing prompt + answer when a smaller
//    valid answer child exists.
{
  const transcript = evaluatePerplexityCandidate(
    candidate({ text: batonTranscript, tier: 'legacy-container', bottom: 900 }),
    batonPrompt,
  );
  assert(
    !transcript.accepted && transcript.reason === 'contains-submitted-prompt',
    'rejects a transcript parent containing the full submitted prompt',
    transcript.reason,
  );

  const selection = selectPerplexityResponseCandidate([
    candidate({ text: batonPrompt, tier: 'legacy-container', insideQueryContainer: true, bottom: 300 }),
    candidate({ text: batonAnswer, bottom: 520 }),
    candidate({ text: batonTranscript, tier: 'legacy-container', bottom: 900 }),
  ], batonPrompt);

  assert(
    selection.selected?.text === batonAnswer,
    'selects the answer-only child over the transcript parent',
    selection.selected?.text.slice(0, 120),
  );
}

// 4. Preserve valid longer answers.
{
  const answerLines = [
    'The maximum input sizes differ by provider.',
    'ChatGPT accepts very long prompts in practice, while others cap sooner.',
    'A safe working budget for cross-provider workflows is a few thousand characters.',
  ];
  const longAnswer = [answerLines[0], '', answerLines[1], answerLines[2]].join('\n');
  const evaluation = evaluatePerplexityCandidate(candidate({ text: longAnswer }), batonPrompt);
  assert(evaluation.accepted, 'preserves valid longer answers', evaluation.reason);
  assert(
    // Canonical cleaning collapses blank separator lines but keeps every
    // answer line intact and in order.
    cleanPerplexityResponseText(longAnswer) === answerLines.join('\n'),
    'cleaning preserves multi-paragraph answer lines',
    cleanPerplexityResponseText(longAnswer),
  );
}

// 5. Preserve normal independent exact-answer smoke behavior.
{
  const smokePrompt = 'Say exactly: Perplexity OK';
  const selection = selectPerplexityResponseCandidate([
    candidate({ text: smokePrompt, tier: 'legacy-container', insideQueryContainer: true, bottom: 300 }),
    candidate({ text: 'Perplexity OK', bottom: 520 }),
    candidate({ text: `Answer Images ${smokePrompt} Perplexity OK Sources`, tier: 'legacy-container', bottom: 900 }),
  ], smokePrompt);

  assert(
    selection.selected?.text === 'Perplexity OK',
    'smoke-shaped thread still selects the exact answer',
    selection.selected?.text,
  );
}

// 6. Reject stale prompt echo (candidate is exactly the submitted prompt).
{
  const evaluation = evaluatePerplexityCandidate(candidate({ text: batonPrompt }), batonPrompt);
  assert(
    !evaluation.accepted && evaluation.reason === 'submitted-prompt-only',
    'rejects a stale echo that is exactly the submitted prompt',
    evaluation.reason,
  );
}

// 7. Live-shaped baton fixture selects exactly the answer-only text, and the
//    semantic tier supersedes accepted legacy containers.
{
  const chromeContainer = candidate({
    // Legacy container that survives evaluation (no prompt inside) but must
    // lose to the semantic answer node even though it is lower on the page.
    text: `${batonAnswer} Sources Related Ask a follow-up something else entirely`,
    tier: 'legacy-container',
    bottom: 950,
  });
  const selection = selectPerplexityResponseCandidate([
    candidate({ text: batonPrompt, tier: 'legacy-container', insideQueryContainer: true, bottom: 300 }),
    candidate({ text: batonAnswer, bottom: 520 }),
    candidate({ text: batonAnswer, bottom: 521 }),
    candidate({ text: batonTranscript, tier: 'legacy-container', bottom: 900 }),
    chromeContainer,
  ], batonPrompt);

  assert(
    selection.selected?.text === batonAnswer,
    'live-shaped baton fixture selects exactly the answer-only text',
    selection.selected?.text.slice(0, 160),
  );
  assert(
    selection.rejected.some((entry) => entry.reason === 'legacy-container-superseded-by-semantic-answer'),
    'accepted legacy containers are superseded by semantic answer nodes',
  );
  assert(
    selection.rejected.some((entry) => entry.reason === 'contains-submitted-prompt'),
    'transcript parent rejection reason is reported',
  );
}

// 8. Selection works without prompt knowledge via structural rejection.
{
  const selection = selectPerplexityResponseCandidate([
    candidate({ text: batonPrompt, insideQueryContainer: true, bottom: 300 }),
    candidate({ text: batonAnswer, bottom: 520 }),
  ]);

  assert(
    selection.selected?.text === batonAnswer,
    'query container is rejected structurally even without prompt context',
    selection.selected?.text.slice(0, 120),
  );
}

// 9. Cleaning removes chrome lines, URLs, and duplicate lines.
{
  const cleaned = cleanPerplexityResponseText([
    batonAnswer,
    'Sources',
    'Related',
    'https://example.com/source',
    batonAnswer,
  ].join('\n'));

  assert(cleaned === batonAnswer, 'cleaning strips chrome lines, URLs, and duplicates', cleaned);
}

// 10. Empty-after-clean and too-short rejection.
{
  const chromeOnly = evaluatePerplexityCandidate(candidate({ text: 'Sources\nRelated\nShare' }), batonPrompt);
  assert(
    !chromeOnly.accepted && chromeOnly.reason === 'empty-after-clean',
    'rejects chrome-only candidates as empty after cleaning',
    chromeOnly.reason,
  );

  const tooShort = evaluatePerplexityCandidate(candidate({ text: 'OK' }), batonPrompt);
  assert(
    !tooShort.accepted && tooShort.reason === 'too-short',
    'rejects too-short candidates',
    tooShort.reason,
  );
}

if (failureCount > 0) {
  console.error(`\n${failureCount} Perplexity filter assertion(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('\nAll Perplexity filter assertions passed.');
}
