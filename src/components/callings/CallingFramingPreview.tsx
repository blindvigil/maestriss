import { renderCallingFraming, type CallingDefinition } from '../../../shared/council/index.js';
import './CallingFramingPreview.css';

// Shows the exact Calling-framing section a provider would receive from the
// council prompt-composition pipeline. Full intensity previews the current
// draft (what would be supplied after saving); light intensity comes from
// the same shared function composition uses, so preview and execution can
// never drift.
export function CallingFramingPreview({ calling, draftText }: { calling: CallingDefinition; draftText: string }) {
  return (
    <aside className="calling-framing-preview" aria-label="Calling instruction preview">
      <h4>Provider-facing instruction</h4>

      <p className="calling-framing-preview__caption">Full intensity (current draft)</p>
      <pre>{draftText || '(empty — the canonical text will be used)'}</pre>

      <p className="calling-framing-preview__caption">Light intensity (fixed one-liner)</p>
      <pre>{renderCallingFraming(calling, 'light')}</pre>

      <p className="calling-framing-preview__hint">
        This text is injected as the Calling-framing section of the seat prompt, between the council
        rules and the behavioral instructions. Fantasy titles are never sent to providers.
      </p>
    </aside>
  );
}
