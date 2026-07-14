import { BookOpen, ClipboardCopy, ScrollText } from 'lucide-react';
import { useState } from 'react';
import {
  clearCallingFlavourOverride,
  councilCallings,
  getCanonicalCallingFlavourText,
  resolveCallingFlavourText,
  setCallingFlavourOverride,
  toCouncilCallingFlavourOverrides,
} from '../../shared/council/index.js';
import { CallingFlavourEditor } from '../components/callings/CallingFlavourEditor';
import { CallingFramingPreview } from '../components/callings/CallingFramingPreview';
import { CallingGrimoireList } from '../components/callings/CallingGrimoireList';
import { loadCallingFlavourOverrides, saveCallingFlavourOverrides } from '../utils/callingFlavour';
import './CallingGrimoirePage.css';

export function CallingGrimoirePage() {
  const [overrides, setOverrides] = useState(loadCallingFlavourOverrides);
  const [selectedCallingId, setSelectedCallingId] = useState(councilCallings[0]?.id ?? '');
  const [draftText, setDraftText] = useState(
    () => resolveCallingFlavourText(selectedCallingId, overrides) ?? '',
  );

  const selectedCalling =
    councilCallings.find((calling) => calling.id === selectedCallingId) ?? councilCallings[0];
  const savedText = resolveCallingFlavourText(selectedCalling.id, overrides) ?? '';
  const canonicalText = getCanonicalCallingFlavourText(selectedCalling.id) ?? '';
  const customizedCallingIds = new Set(Object.keys(overrides.overrides));
  const hasUnsavedChanges = draftText !== savedText;
  const isCustomized = customizedCallingIds.has(selectedCalling.id);

  const handleSelect = (callingId: string) => {
    setSelectedCallingId(callingId);
    setDraftText(resolveCallingFlavourText(callingId, overrides) ?? '');
  };

  const handleSave = () => {
    const next = setCallingFlavourOverride(overrides, selectedCalling.id, draftText);
    saveCallingFlavourOverrides(next);
    setOverrides(next);
    setDraftText(resolveCallingFlavourText(selectedCalling.id, next) ?? '');
  };

  const handleDiscard = () => {
    setDraftText(savedText);
  };

  const handleRevertToCanonical = () => {
    const next = clearCallingFlavourOverride(overrides, selectedCalling.id);
    saveCallingFlavourOverrides(next);
    setOverrides(next);
    setDraftText(canonicalText);
  };

  const [copied, setCopied] = useState(false);
  const councilOverrides = toCouncilCallingFlavourOverrides(overrides);

  const handleCopyCouncilOverrides = () => {
    if (!councilOverrides) {
      return;
    }

    navigator.clipboard
      .writeText(JSON.stringify({ callingFlavourOverrides: councilOverrides }, null, 2))
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => undefined);
  };

  return (
    <section className="calling-grimoire-page" aria-labelledby="calling-grimoire-title">
      <div className="calling-grimoire-page__hero">
        <div className="calling-grimoire-page__intro">
          <p className="eyebrow">Calling Library</p>
          <h2 id="calling-grimoire-title">Calling Grimoire</h2>
          <p>
            Edit the flavour text that shapes how each Calling interprets its seat — the
            provider-facing instruction behind every fantasy title. Each Calling always shows its
            practical function and Suggested AI alongside its title.
          </p>
        </div>
        <div className="calling-grimoire-page__notice">
          <BookOpen size={18} aria-hidden="true" />
          <span>{councilCallings.length} Callings</span>
        </div>
      </div>

      <div className="calling-grimoire-page__summary" aria-label="Calling grimoire summary">
        <div>
          <ScrollText size={18} aria-hidden="true" />
          <span>Canonical source: shared/council/callingFlavourText.ts</span>
        </div>
        <div>
          <span>{customizedCallingIds.size} customized locally</span>
        </div>
        <div>
          <span>Councils carry customizations via callingFlavourOverrides</span>
        </div>
        <button
          className="calling-grimoire-page__copy"
          disabled={!councilOverrides}
          onClick={handleCopyCouncilOverrides}
          type="button"
        >
          <ClipboardCopy size={16} aria-hidden="true" />
          <span>{copied ? 'Copied!' : 'Copy Council overrides JSON'}</span>
        </button>
      </div>

      <div className="calling-grimoire-page__workspace">
        <CallingGrimoireList
          callings={councilCallings}
          customizedCallingIds={customizedCallingIds}
          onSelect={handleSelect}
          selectedCallingId={selectedCalling.id}
        />
        <CallingFlavourEditor
          calling={selectedCalling}
          draftText={draftText}
          hasUnsavedChanges={hasUnsavedChanges}
          isCustomized={isCustomized}
          isDraftCanonical={draftText === canonicalText}
          onDiscard={handleDiscard}
          onDraftChange={setDraftText}
          onRevertToCanonical={handleRevertToCanonical}
          onSave={handleSave}
        />
        <CallingFramingPreview calling={selectedCalling} draftText={draftText} />
      </div>
    </section>
  );
}
