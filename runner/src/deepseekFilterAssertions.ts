import {
  deepSeekGeometryRejectionReason,
  evaluateDeepSeekCandidateText,
  type DeepSeekCandidateGeometry,
} from './drivers/deepseekFiltering.js';

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

function assertGeometry(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`PASS geometry: ${label}`);
    return;
  }

  failureCount += 1;
  console.error(`FAIL geometry: ${label}`);

  if (detail) {
    console.error(`  ${detail}`);
  }
}

function geometry(partial: Partial<DeepSeekCandidateGeometry>): DeepSeekCandidateGeometry {
  return {
    left: 480,
    right: 1230,
    width: 750,
    viewportWidth: 1920,
    composerLeft: 466,
    composerWidth: 774,
    insideSidebar: false,
    ...partial,
  };
}

// Live baton failure fixture (2026-07-13): narrow ~700px viewport, sidebar
// collapsed, composer at x=33 width=634, correct answer at x=20 width=660.
const narrowLayout = {
  viewportWidth: 700,
  composerLeft: 33,
  composerWidth: 634,
};

// 1 + 2 + 7. Valid answer near the left edge, spanning nearly the full
//            narrow viewport, is accepted (the exact live geometry tuple).
{
  const reason = deepSeekGeometryRejectionReason(geometry({
    ...narrowLayout,
    left: 20,
    right: 680,
    width: 660,
  }));
  assertGeometry(reason === '', 'live-shaped narrow-layout answer at x=20 width=660 accepted', reason);

  const text = evaluateDeepSeekCandidateText(
    'MAESTRISS-CHATGPT-CLAUDE-GEMINI-GOOGLE-DEEPSEEK',
    'this is a simple text-formatting test. text: maestriss-chatgpt-claude-gemini-google add this suffix: -deepseek reply',
  );
  assertGeometry(text.accepted, 'live-shaped baton answer text accepted', text.reason);
}

// 3. True sidebar/history content still rejected — structurally, and
//    geometrically when it sits entirely left of the conversation column.
{
  const structural = deepSeekGeometryRejectionReason(geometry({ insideSidebar: true, left: 0, right: 250, width: 250 }));
  assertGeometry(
    structural === 'sidebar-history-container',
    'sidebar ancestry still rejected structurally',
    structural,
  );

  const geometric = deepSeekGeometryRejectionReason(geometry({ left: 0, right: 250, width: 250 }));
  assertGeometry(
    geometric === 'left-of-conversation-column',
    'wide-layout sidebar region left of the composer still rejected',
    geometric,
  );
}

// Transcript-level parents wider than the conversation column still rejected,
// in both wide and narrow layouts.
{
  const wide = deepSeekGeometryRejectionReason(geometry({ left: 0, right: 1920, width: 1920 }));
  assertGeometry(
    wide === 'page-or-transcript-parent-container',
    'wide-layout page container rejected',
    wide,
  );

  const narrow = deepSeekGeometryRejectionReason(geometry({
    ...narrowLayout,
    left: 0,
    right: 700,
    width: 700,
  }));
  assertGeometry(
    narrow === 'page-or-transcript-parent-container',
    'narrow-layout full-page container wider than the composer column rejected',
    narrow,
  );
}

// 4. Submitted prompt still rejected by text evaluation.
{
  const prompt = 'This is a simple text-formatting test. Text: MAESTRISS-CHATGPT-CLAUDE-GEMINI-GOOGLE Add this suffix: -DEEPSEEK Reply with only the resulting text. Result: MAESTRISS-CHATGPT-CLAUDE-GEMINI-GOOGLE-DEEPSEEK';
  const needle = prompt.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 120);
  const result = evaluateDeepSeekCandidateText(prompt, needle);
  assertGeometry(
    !result.accepted && result.reason === 'submitted-prompt-only',
    'submitted prompt still rejected',
    result.reason,
  );
}

// 6. Longer answers within the conversation column still pass.
{
  const reason = deepSeekGeometryRejectionReason(geometry({ left: 480, right: 1230, width: 750 }));
  const text = evaluateDeepSeekCandidateText(
    'A longer valid answer.\nIt has several lines of ordinary explanation without history markers.',
  );
  assertGeometry(
    reason === '' && text.accepted,
    'longer wide-layout answer still accepted',
    `${reason || '(no geometry reason)'} / ${text.reason ?? '(accepted)'}`,
  );
}

// No composer found: fall back to the viewport-based width cap only.
{
  const reason = deepSeekGeometryRejectionReason(geometry({
    composerLeft: null,
    composerWidth: null,
    left: 20,
    right: 680,
    width: 660,
    viewportWidth: 700,
  }));
  assertGeometry(
    reason === 'page-or-transcript-parent-container',
    'without a composer the conservative viewport width cap still applies',
    reason,
  );
}

if (failureCount > 0) {
  process.exitCode = 1;
}
