// Reka submit-control selection.
//
// Live DOM evidence (2026-07-13, runner/debug/reka-submit-failed.html):
// the composer (div#message.ProseMirror[contenteditable="true"]) and the send
// button share a single <form class="w-full"> ancestor containing exactly
// three buttons: a model picker (lucide-atom), an attach control
// (lucide-paperclip), and the send control (lucide-send paper-plane icon,
// data-slot="tooltip-trigger", bg-primary).
//
// The previous detector only accepted buttons geometrically overlapping a
// composer container capped at 260px height. A long multiline prompt expanded
// the composer past that cap, the send button fell outside the box, zero
// candidates survived, and submission hard-failed before any keyboard
// fallback ran. Structural scope (same form as the composer) is now the
// primary evidence; geometry is supporting evidence only.

export type RekaSubmitScope = 'form' | 'ancestor' | 'page';

export type RekaSubmitButtonDescriptor = {
  index: number;
  tag: string;
  // Combined lowercased text/aria-label/title/data-testid/data-slot/class
  // plus descendant svg metadata, as gathered in the browser.
  text: string;
  classes: string;
  scope: RekaSubmitScope;
  overlapsComposerBox: boolean;
  hasSvgIcon: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  backgroundColor: string;
};

export type RekaSubmitTargetSelection = {
  selected?: RekaSubmitButtonDescriptor;
  score?: number;
  consideredCount: number;
  excludedCount: number;
};

export const rekaSubmitExcludePattern =
  /attach|attachment|paperclip|clip|file|upload|model|settings|menu|sidebar|side panel|user|account|avatar|atom|dictation|microphone|voice/;

export const rekaSubmitSendPattern =
  /send|submit|arrow|paper-plane|plane|corner|lucide-send|send-horizontal/;

export function isExcludedRekaSubmitCandidate(candidate: RekaSubmitButtonDescriptor) {
  return rekaSubmitExcludePattern.test(candidate.text);
}

export function scoreRekaSubmitCandidate(candidate: RekaSubmitButtonDescriptor) {
  // Structural relation to the composer is the primary evidence.
  let score = candidate.scope === 'form'
    ? 600
    : candidate.scope === 'ancestor'
      ? 300
      : 0;

  if (rekaSubmitSendPattern.test(candidate.text)) {
    score += 800;
  }

  if (candidate.hasSvgIcon) {
    score += 80;
  }

  // Geometry as supporting evidence only: right-edge position, size, and
  // composer-box overlap break ties between structurally equal candidates.
  if (candidate.overlapsComposerBox) {
    score += 100;
  }

  score += (candidate.x + candidate.width) / 10;
  score += Math.min(candidate.width * candidate.height, 3600) / 200;

  return score;
}

export function selectRekaSubmitTarget(
  candidates: RekaSubmitButtonDescriptor[],
): RekaSubmitTargetSelection {
  const excluded = candidates.filter(isExcludedRekaSubmitCandidate);
  const scored = candidates
    .filter((candidate) => !isExcludedRekaSubmitCandidate(candidate))
    .map((candidate) => ({
      candidate,
      score: scoreRekaSubmitCandidate(candidate),
    }))
    .sort((left, right) => right.score - left.score);

  const best = scored[0];

  return {
    ...(best ? { selected: best.candidate, score: best.score } : {}),
    consideredCount: scored.length,
    excludedCount: excluded.length,
  };
}
