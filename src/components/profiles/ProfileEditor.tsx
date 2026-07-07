import type { Profile } from '../../types/profile';
import './ProfileEditor.css';

type ProfileEditorProps = {
  profile: Profile;
  onInstructionChange: (id: string, instruction: string) => void;
};

export function ProfileEditor({ profile, onInstructionChange }: ProfileEditorProps) {
  return (
    <section className="profile-editor" aria-labelledby="profile-editor-title">
      <div className="profile-editor__header">
        <p className="eyebrow">Selected Profile</p>
        <h3 id="profile-editor-title">{profile.name}</h3>
        <p>{profile.description}</p>
      </div>

      <div className="profile-editor__meta">
        <span>Intended Use</span>
        <strong>{profile.intendedUse}</strong>
      </div>

      <label className="profile-editor__prompt">
        <span>Default Instruction Text</span>
        <textarea
          onChange={(event) => onInstructionChange(profile.id, event.target.value)}
          spellCheck="true"
          value={profile.instruction}
        />
      </label>
    </section>
  );
}
