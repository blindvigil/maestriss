import { getCouncilProvider, type CallingDefinition } from '../../../shared/council/index.js';
import './CallingFlavourEditor.css';

// Resolved from the shared registries; a Calling without a single Suggested
// AI displays an honest placeholder instead of a provider name.
function suggestedProviderLabel(calling: CallingDefinition): string {
  if (!calling.suggestedProvider) {
    return 'Varies by Council';
  }

  return getCouncilProvider(calling.suggestedProvider)?.displayName ?? calling.suggestedProvider;
}

type CallingFlavourEditorProps = {
  calling: CallingDefinition;
  draftText: string;
  isCustomized: boolean;
  hasUnsavedChanges: boolean;
  isDraftCanonical: boolean;
  onDraftChange: (text: string) => void;
  onSave: () => void;
  onDiscard: () => void;
  onRevertToCanonical: () => void;
};

export function CallingFlavourEditor({
  calling,
  draftText,
  isCustomized,
  hasUnsavedChanges,
  isDraftCanonical,
  onDraftChange,
  onSave,
  onDiscard,
  onRevertToCanonical,
}: CallingFlavourEditorProps) {
  return (
    <section className="calling-flavour-editor" aria-label={`Flavour text for ${calling.fantasyTitle}`}>
      <header className="calling-flavour-editor__header">
        <div>
          <h3>{calling.fantasyTitle}</h3>
          <p className="calling-flavour-editor__practical">{calling.practicalTitle}</p>
          <p className="calling-flavour-editor__suggested">
            Suggested AI: <strong>{suggestedProviderLabel(calling)}</strong>
          </p>
          <p className="calling-flavour-editor__description">{calling.description}</p>
        </div>
        <div className="calling-flavour-editor__status">
          <span data-kind={isCustomized ? 'customized' : 'canonical'}>
            {isCustomized ? 'Customized (local)' : 'Canonical'}
          </span>
          {hasUnsavedChanges && <span data-kind="unsaved">Unsaved changes</span>}
        </div>
      </header>

      <label className="calling-flavour-editor__label" htmlFor="calling-flavour-text">
        Calling flavour text — the provider-facing instruction that gives this Calling its perspective
      </label>
      <textarea
        className="calling-flavour-editor__textarea"
        id="calling-flavour-text"
        onChange={(event) => onDraftChange(event.target.value)}
        rows={9}
        spellCheck
        value={draftText}
      />

      <div className="calling-flavour-editor__actions">
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

      <p className="calling-flavour-editor__note">
        Edits are saved as local overrides in this browser. Canonical defaults live in{' '}
        <code>shared/council/callingFlavourText.ts</code>. Execution never reads browser state:
        customizations take effect only when embedded into a Council Configuration as{' '}
        <code>callingFlavourOverrides</code> (use Copy Council overrides JSON above).
      </p>
    </section>
  );
}
