import { BookOpen, ClipboardCopy, ScrollText } from 'lucide-react';
import { useState } from 'react';
import {
  clearRoleFlavourOverride,
  councilRoles,
  getCanonicalRoleFlavourText,
  resolveRoleFlavourText,
  setRoleFlavourOverride,
  toCouncilRoleFlavourOverrides,
} from '../../shared/council/index.js';
import { RoleFlavourEditor } from '../components/roles/RoleFlavourEditor';
import { RoleFramingPreview } from '../components/roles/RoleFramingPreview';
import { RoleGrimoireList } from '../components/roles/RoleGrimoireList';
import { loadRoleFlavourOverrides, saveRoleFlavourOverrides } from '../utils/roleFlavour';
import './RoleGrimoirePage.css';

export function RoleGrimoirePage() {
  const [overrides, setOverrides] = useState(loadRoleFlavourOverrides);
  const [selectedRoleId, setSelectedRoleId] = useState(councilRoles[0]?.id ?? '');
  const [draftText, setDraftText] = useState(
    () => resolveRoleFlavourText(selectedRoleId, overrides) ?? '',
  );

  const selectedRole = councilRoles.find((role) => role.id === selectedRoleId) ?? councilRoles[0];
  const savedText = resolveRoleFlavourText(selectedRole.id, overrides) ?? '';
  const canonicalText = getCanonicalRoleFlavourText(selectedRole.id) ?? '';
  const customizedRoleIds = new Set(Object.keys(overrides.overrides));
  const hasUnsavedChanges = draftText !== savedText;
  const isCustomized = customizedRoleIds.has(selectedRole.id);

  const handleSelect = (roleId: string) => {
    setSelectedRoleId(roleId);
    setDraftText(resolveRoleFlavourText(roleId, overrides) ?? '');
  };

  const handleSave = () => {
    const next = setRoleFlavourOverride(overrides, selectedRole.id, draftText);
    saveRoleFlavourOverrides(next);
    setOverrides(next);
    setDraftText(resolveRoleFlavourText(selectedRole.id, next) ?? '');
  };

  const handleDiscard = () => {
    setDraftText(savedText);
  };

  const handleRevertToCanonical = () => {
    const next = clearRoleFlavourOverride(overrides, selectedRole.id);
    saveRoleFlavourOverrides(next);
    setOverrides(next);
    setDraftText(canonicalText);
  };

  const [copied, setCopied] = useState(false);
  const councilOverrides = toCouncilRoleFlavourOverrides(overrides);

  const handleCopyCouncilOverrides = () => {
    if (!councilOverrides) {
      return;
    }

    navigator.clipboard
      .writeText(JSON.stringify({ roleFlavourOverrides: councilOverrides }, null, 2))
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => undefined);
  };

  return (
    <section className="role-grimoire-page" aria-labelledby="role-grimoire-title">
      <div className="role-grimoire-page__hero">
        <div className="role-grimoire-page__intro">
          <p className="eyebrow">Council Roles</p>
          <h2 id="role-grimoire-title">The Role Grimoire</h2>
          <p>
            Edit the flavour text that shapes how each council role interprets its task — the
            provider-facing instruction behind every fantasy title. Each role always shows its
            practical purpose alongside its title.
          </p>
        </div>
        <div className="role-grimoire-page__notice">
          <BookOpen size={18} aria-hidden="true" />
          <span>{councilRoles.length} roles</span>
        </div>
      </div>

      <div className="role-grimoire-page__summary" aria-label="Role grimoire summary">
        <div>
          <ScrollText size={18} aria-hidden="true" />
          <span>Canonical source: shared/council/roleFlavourText.ts</span>
        </div>
        <div>
          <span>{customizedRoleIds.size} customized locally</span>
        </div>
        <div>
          <span>Council Scrolls carry customizations via roleFlavourOverrides</span>
        </div>
        <button
          className="role-grimoire-page__copy"
          disabled={!councilOverrides}
          onClick={handleCopyCouncilOverrides}
          type="button"
        >
          <ClipboardCopy size={16} aria-hidden="true" />
          <span>{copied ? 'Copied!' : 'Copy council overrides JSON'}</span>
        </button>
      </div>

      <div className="role-grimoire-page__workspace">
        <RoleGrimoireList
          customizedRoleIds={customizedRoleIds}
          onSelect={handleSelect}
          roles={councilRoles}
          selectedRoleId={selectedRole.id}
        />
        <RoleFlavourEditor
          draftText={draftText}
          hasUnsavedChanges={hasUnsavedChanges}
          isCustomized={isCustomized}
          isDraftCanonical={draftText === canonicalText}
          onDiscard={handleDiscard}
          onDraftChange={setDraftText}
          onRevertToCanonical={handleRevertToCanonical}
          onSave={handleSave}
          role={selectedRole}
        />
        <RoleFramingPreview draftText={draftText} role={selectedRole} />
      </div>
    </section>
  );
}
