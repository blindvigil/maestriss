import { renderRoleFraming, type RoleDefinition } from '../../../shared/council/index.js';
import './RoleFramingPreview.css';

type RoleFramingPreviewProps = {
  role: RoleDefinition;
  draftText: string;
};

// Shows the exact role-framing section a provider would receive from the
// council prompt-composition pipeline. Full intensity previews the current
// draft (what would be supplied after saving); light intensity comes from
// the same shared function composition uses, so preview and execution can
// never drift.
export function RoleFramingPreview({ role, draftText }: RoleFramingPreviewProps) {
  return (
    <aside className="role-framing-preview" aria-label="Role instruction preview">
      <h4>Provider-facing instruction</h4>

      <p className="role-framing-preview__caption">Full role intensity (current draft)</p>
      <pre>{draftText || '(empty — the canonical text will be used)'}</pre>

      <p className="role-framing-preview__caption">Light role intensity (fixed one-liner)</p>
      <pre>{renderRoleFraming(role, 'light')}</pre>

      <p className="role-framing-preview__hint">
        This text is injected as the role-framing section of the stage prompt, between the council
        rules and the behavioral instructions. Fantasy titles are never sent to providers.
      </p>
    </aside>
  );
}
