import {
  evaluateRekaCandidateText,
  evaluateRekaResponseCandidate,
  selectRekaResponseCandidate,
  type RekaResponseCandidate,
} from './drivers/rekaFiltering.js';
import {
  selectRekaSubmitTarget,
  type RekaSubmitButtonDescriptor,
} from './drivers/rekaSubmitTargets.js';

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

function assertSubmit(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`PASS submit-target: ${label}`);
    return;
  }

  failureCount += 1;
  console.error(`FAIL submit-target: ${label}`);

  if (detail) {
    console.error(`  ${detail}`);
  }
}

function submitButton(
  partial: Partial<RekaSubmitButtonDescriptor> & { index: number; text: string },
): RekaSubmitButtonDescriptor {
  return {
    tag: 'button',
    classes: '',
    scope: 'form',
    overlapsComposerBox: false,
    hasSvgIcon: true,
    x: 1400,
    y: 900,
    width: 36,
    height: 36,
    centerX: 1418,
    centerY: 918,
    backgroundColor: 'rgb(0, 0, 0)',
    ...partial,
  };
}

// DOM-shaped fixture from runner/debug/reka-submit-failed.html (2026-07-13):
// one <form> containing a model picker (lucide-atom), an attach control
// (lucide-paperclip), and the send control (lucide-send), with the composer
// expanded to 288px by a long multiline prompt so nothing overlaps the legacy
// composer box.
const longPromptFormButtons: RekaSubmitButtonDescriptor[] = [
  submitButton({
    index: 0,
    text: 'dropdown-menu-trigger lucide lucide-atom h-4 w-4 stroke-2',
    scope: 'form',
    overlapsComposerBox: false,
    x: 860,
    y: 890,
    centerX: 878,
    centerY: 908,
  }),
  submitButton({
    index: 1,
    text: 'tooltip-trigger lucide lucide-paperclip h-4 w-4',
    scope: 'form',
    overlapsComposerBox: false,
    x: 905,
    y: 890,
    centerX: 923,
    centerY: 908,
  }),
  submitButton({
    index: 2,
    text: 'tooltip-trigger bg-primary text-primary-foreground size-9 lucide lucide-send h-4 w-4',
    scope: 'form',
    overlapsComposerBox: false,
    x: 1420,
    y: 890,
    centerX: 1438,
    centerY: 908,
  }),
];

// 1. Short composer: in-box send button is selected.
{
  const selection = selectRekaSubmitTarget([
    submitButton({
      index: 0,
      text: 'tooltip-trigger bg-primary lucide lucide-send h-4 w-4',
      scope: 'form',
      overlapsComposerBox: true,
    }),
  ]);

  assertSubmit(
    selection.selected?.index === 0,
    'short composer selects the visible in-box send button',
  );
}

// 2. Long/expanded composer: send button is structurally associated (same
//    form) but outside the composer box, and is still selected.
{
  const selection = selectRekaSubmitTarget(longPromptFormButtons);

  assertSubmit(
    selection.selected?.index === 2,
    'expanded composer selects the form-scoped lucide-send button without overlap',
    `selected index ${selection.selected?.index}, text ${selection.selected?.text}`,
  );
  assertSubmit(
    selection.excludedCount === 2,
    'model picker and attach control are excluded',
    `excludedCount ${selection.excludedCount}`,
  );
}

// 3. Missing/excluded-only buttons: no target is selected, so the driver
//    falls through to keyboard strategies instead of hard-failing.
{
  const none = selectRekaSubmitTarget([]);
  const excludedOnly = selectRekaSubmitTarget([
    submitButton({ index: 0, text: 'tooltip-trigger lucide lucide-paperclip h-4 w-4' }),
    submitButton({ index: 1, text: 'dropdown-menu-trigger lucide lucide-atom h-4 w-4' }),
  ]);

  assertSubmit(
    none.selected === undefined && excludedOnly.selected === undefined,
    'no candidates or excluded-only candidates produce no selection',
  );
}

// 4. Legacy short-prompt geometry still works: a page-scoped send button that
//    overlaps the composer box is selected when no structural button exists.
{
  const selection = selectRekaSubmitTarget([
    submitButton({
      index: 0,
      text: 'send message arrow-up',
      scope: 'page',
      overlapsComposerBox: true,
      hasSvgIcon: true,
    }),
  ]);

  assertSubmit(
    selection.selected?.index === 0,
    'page-scoped overlapping send button remains selectable',
  );
}

// 5. Structural evidence outranks geometric overlap: a form-scoped send
//    button beats a page-scoped overlapping icon button.
{
  const selection = selectRekaSubmitTarget([
    submitButton({
      index: 0,
      text: 'some toolbar icon button',
      scope: 'page',
      overlapsComposerBox: true,
    }),
    submitButton({
      index: 1,
      text: 'tooltip-trigger bg-primary lucide lucide-send h-4 w-4',
      scope: 'form',
      overlapsComposerBox: false,
    }),
  ]);

  assertSubmit(
    selection.selected?.index === 1,
    'form-scoped send button outranks page-scoped overlapping button',
  );
}

function assertResponse(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`PASS response-select: ${label}`);
    return;
  }

  failureCount += 1;
  console.error(`FAIL response-select: ${label}`);

  if (detail) {
    console.error(`  ${detail}`);
  }
}

function responseCandidate(
  partial: Partial<RekaResponseCandidate> & { text: string },
): RekaResponseCandidate {
  return {
    tier: 'semantic-answer',
    insideUserBubble: false,
    bottom: 500,
    createdAt: 2000,
    ...partial,
  };
}

// Live baton failure shape (2026-07-13, runner/debug/reka.html): the user
// prompt renders in a justify-end bubble, the assistant answer in
// div.prose.prose-chat, and transcript-level parents contain prompt + answer.
const rekaBatonPrompt = [
  'This is a simple text-formatting test.',
  '',
  'Text:',
  'MAESTRISS-CHATGPT-CLAUDE-GEMINI-GOOGLE-DEEPSEEK-GROK-PERPLEXITY',
  '',
  'Add this suffix:',
  '-REKA',
  '',
  'Reply with only the resulting text.',
  '',
  'Result:',
  'MAESTRISS-CHATGPT-CLAUDE-GEMINI-GOOGLE-DEEPSEEK-GROK-PERPLEXITY-REKA',
].join('\n');
const rekaBatonAnswer = 'MAESTRISS-CHATGPT-CLAUDE-GEMINI-GOOGLE-DEEPSEEK-GROK-PERPLEXITY-REKA';
const rekaBatonTranscript = `${rekaBatonPrompt}\n${rekaBatonAnswer}`;

// 1. Clean answer-only candidate accepted.
{
  const evaluation = evaluateRekaResponseCandidate(
    responseCandidate({ text: rekaBatonAnswer }),
    rekaBatonPrompt,
  );
  assertResponse(evaluation.accepted, 'clean answer-only candidate accepted', evaluation.reason);
}

// 2. Prompt-only rejected — both the exact prompt text (longer than the old
//    needle+80 cap) and the user bubble container.
{
  const promptOnly = evaluateRekaResponseCandidate(
    responseCandidate({ text: rekaBatonPrompt, tier: 'legacy-container' }),
    rekaBatonPrompt,
  );
  assertResponse(
    !promptOnly.accepted && promptOnly.reason === 'submitted-prompt-only',
    'long prompt-only text rejected',
    promptOnly.reason,
  );

  const bubble = evaluateRekaResponseCandidate(
    responseCandidate({ text: rekaBatonAnswer, insideUserBubble: true }),
    rekaBatonPrompt,
  );
  assertResponse(
    !bubble.accepted && bubble.reason === 'submitted-prompt-container',
    'user bubble candidates rejected structurally',
    bubble.reason,
  );
}

// 3. Transcript parent containing prompt + answer rejected.
{
  const transcript = evaluateRekaResponseCandidate(
    responseCandidate({ text: rekaBatonTranscript, tier: 'legacy-container', bottom: 940 }),
    rekaBatonPrompt,
  );
  assertResponse(
    !transcript.accepted && transcript.reason === 'contains-submitted-prompt',
    'transcript parent containing full prompt rejected',
    transcript.reason,
  );
}

// 4 + 7. Live-shaped baton fixture: smaller answer-only child preferred and
//        exactly the answer-only result is selected.
{
  const selection = selectRekaResponseCandidate([
    responseCandidate({ text: rekaBatonPrompt, tier: 'legacy-container', insideUserBubble: true, bottom: 300, createdAt: 1000 }),
    responseCandidate({ text: rekaBatonAnswer, bottom: 520, createdAt: 2000 }),
    responseCandidate({ text: rekaBatonTranscript, tier: 'legacy-container', bottom: 940, createdAt: 2000 }),
    responseCandidate({ text: 'HomeEdgeResearchChatSpeechPrompt TypeClearImage analysisCode analysisMultilingual chat', tier: 'legacy-container', bottom: 900, createdAt: 2000 }),
  ], rekaBatonPrompt);

  assertResponse(
    selection.selected?.text === rekaBatonAnswer,
    'live-shaped baton fixture selects exactly the answer-only text',
    selection.selected?.text.slice(0, 120),
  );
  assertResponse(
    selection.rejected.some((entry) => entry.reason === 'contains-submitted-prompt'),
    'transcript parent rejection reason is reported',
  );
}

// 5. Valid longer answers preserved.
{
  const longAnswer = [
    'Here is a longer valid answer with several sentences.',
    'It explains the reasoning in detail and spans multiple lines.',
    'None of it repeats the submitted prompt verbatim.',
  ].join('\n');
  const evaluation = evaluateRekaResponseCandidate(
    responseCandidate({ text: longAnswer }),
    rekaBatonPrompt,
  );
  assertResponse(evaluation.accepted, 'valid longer answers preserved', evaluation.reason);
}

// 6. Stale prompt echo rejected even when it is the newest candidate.
{
  const selection = selectRekaResponseCandidate([
    responseCandidate({ text: rekaBatonPrompt, tier: 'legacy-container', bottom: 940, createdAt: 3000 }),
  ], rekaBatonPrompt);

  assertResponse(
    selection.selected === undefined,
    'stale prompt echo alone produces no selection',
    selection.selected?.text.slice(0, 120),
  );
}

// 7b. Semantic answer supersedes an accepted legacy container.
{
  const selection = selectRekaResponseCandidate([
    responseCandidate({ text: rekaBatonAnswer, bottom: 520, createdAt: 2000 }),
    responseCandidate({ text: `${rekaBatonAnswer} and unrelated trailing panel text`, tier: 'legacy-container', bottom: 940, createdAt: 2000 }),
  ], rekaBatonPrompt);

  assertResponse(
    selection.selected?.tier === 'semantic-answer' &&
    selection.rejected.some((entry) => entry.reason === 'legacy-container-superseded-by-semantic-answer'),
    'semantic answer supersedes accepted legacy containers',
  );
}

// 8. Prior Reka OK smoke behavior preserved.
{
  const smokePrompt = 'Say exactly: Reka OK';
  const selection = selectRekaResponseCandidate([
    responseCandidate({ text: smokePrompt, tier: 'legacy-container', insideUserBubble: true, bottom: 300, createdAt: 1000 }),
    responseCandidate({ text: 'Reka OK', bottom: 520, createdAt: 2000 }),
    responseCandidate({ text: `${smokePrompt}\nReka OK`, tier: 'legacy-container', bottom: 940, createdAt: 2000 }),
  ], smokePrompt);

  assertResponse(
    selection.selected?.text === 'Reka OK',
    'smoke-shaped thread still selects the exact answer',
    selection.selected?.text,
  );
}

if (failureCount > 0) {
  process.exitCode = 1;
}
