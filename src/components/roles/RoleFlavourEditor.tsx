import type { RoleDefinition } from '../../../shared/council/index.js';
import './RoleFlavourEditor.css';

type RoleFlavourEditorProps = {
  role: RoleDefinition;
  draftText: string;
  isCustomized: boolean;
  hasUnsavedChanges: boolean;
  isDraftCanonical: boolean;
  onDraftChange: (text: string) => void;
  onSave: () => void;
  onDiscard: () => void;
  onRevertToCanonical: () => void;
};

export function RoleFlavourEditor({
  role,
  draftText,
  isCustomized,
  hasUnsavedChanges,
  isDraftCanonical,
  onDraftChange,
  onSave,
  onDiscard,
  onRevertToCanonical,
}: RoleFlavourEditorProps) {
  return (
    <section className="role-flavour-editor" aria-label={`Flavour text for ${role.fantasyTitle}`}>
      <header className="role-flavour-editor__header">
        <div>
          <h3>{role.fantasyTitle}</h3>
          <p className="role-flavour-editor__practical">{role.practicalTitle}</p>
          <p className="role-flavour-editor__description">{role.description}</p>
        </div>
        <div className="role-flavour-editor__status">
          <span data-kind={isCustomized ? 'customized' : 'canonical'}>
            {isCustomized ? 'Customized (local)' : 'Canonical'}
          </span>
          {hasUnsavedChanges && <span data-kind="unsaved">Unsaved changes</span>}
        </div>
      </header>

      <label className="role-flavour-editor__label" htmlFor="role-flavour-text">
        Flavour text — the provider-facing instruction that gives this role its perspective
      </label>
      <textarea
        className="role-flavour-editor__textarea"
        id="role-flavour-text"
        onChange={(event) => onDraftChange(event.target.value)}
        rows={9}
        spellCheck
        value={draftText}
      />

      <div className="role-flavour-editor__actions">
        <button disabled={!hasUnsavedChanges} onClick={onSave} type="button">
          Save local override
        </button>
        <button disabled={!hasUnsavedChanges} onClick={onDiscard} type="button">
          Discard changes
        </button>
        <button disabled={isDraftCanonical && !isCustomized} onClick={onRevertToCanonical} type="button">
          Revert to canonical
        </button>
      </div>

      <p className="role-flavour-editor__note">
        Edits are saved as local overrides in this browser. Canonical defaults live in{' '}
        <code>shared/council/roleFlavourText.ts</code>. Execution never reads browser state:
        customizations take effect only when embedded into a Council Configuration as{' '}
        <code>roleFlavourOverrides</code> (use Copy council overrides JSON above).
      </p>
    </section>
  );
}
