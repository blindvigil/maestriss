import { Copy, Plus, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useMemo } from 'react';
import { ProfileCard } from '../components/profiles/ProfileCard';
import { ProfileEditor } from '../components/profiles/ProfileEditor';
import { useProject } from '../context/ProjectContext';
import { defaultProfiles } from '../data/defaultProfiles';
import { createProfile, duplicateProfile } from '../utils/profiles';
import './ProfilesPage.css';

export function ProfilesPage() {
  const { project, updateProject } = useProject();
  const profiles = project.profiles.items;
  const selectedProfileId = project.profiles.selectedProfileId;

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? profiles[0],
    [profiles, selectedProfileId],
  );

  const defaultProfile = selectedProfile
    ? defaultProfiles.find((profile) => profile.id === selectedProfile.id)
    : undefined;

  const handleInstructionChange = (id: string, instruction: string) => {
    updateProject((currentProject) => ({
      ...currentProject,
      profiles: {
        ...currentProject.profiles,
        items: currentProject.profiles.items.map((profile) =>
          profile.id === id ? { ...profile, instruction } : profile,
        ),
      },
    }));
  };

  const handleDuplicateProfile = () => {
    if (!selectedProfile) {
      return;
    }

    const profile = duplicateProfile(selectedProfile, profiles.length + 1);
    updateProject((currentProject) => ({
      ...currentProject,
      profiles: {
        items: [...currentProject.profiles.items, profile],
        selectedProfileId: profile.id,
      },
    }));
  };

  const handleResetProfile = () => {
    if (!selectedProfile || !defaultProfile) {
      return;
    }

    updateProject((currentProject) => ({
      ...currentProject,
      profiles: {
        ...currentProject.profiles,
        items: currentProject.profiles.items.map((profile) =>
          profile.id === selectedProfile.id ? { ...defaultProfile } : profile,
        ),
      },
    }));
  };

  const handleCreateProfile = () => {
    const profile = createProfile(profiles.length + 1);
    updateProject((currentProject) => ({
      ...currentProject,
      profiles: {
        items: [...currentProject.profiles.items, profile],
        selectedProfileId: profile.id,
      },
    }));
  };

  const handleSelectedProfileChange = (id: string) => {
    updateProject((currentProject) => ({
      ...currentProject,
      profiles: {
        ...currentProject.profiles,
        selectedProfileId: id,
      },
    }));
  };

  return (
    <section className="profiles-page" aria-labelledby="profiles-title">
      <div className="profiles-page__hero">
        <div className="profiles-page__intro">
          <p className="eyebrow">Behavior Profiles</p>
          <h2 id="profiles-title">Profiles</h2>
          <p>
            Define the stance, tone, and responsibility a participant should use during a Maestriss
            run, from peer critique to final editorial synthesis.
          </p>
        </div>
        <div className="profiles-page__actions">
          <button
            className="profiles-page__button"
            disabled={!defaultProfile}
            onClick={handleResetProfile}
            type="button"
          >
            <RotateCcw size={16} aria-hidden="true" />
            <span>Reset Profile</span>
          </button>
          <button className="profiles-page__button" onClick={handleDuplicateProfile} type="button">
            <Copy size={16} aria-hidden="true" />
            <span>Duplicate Profile</span>
          </button>
          <button
            className="profiles-page__button profiles-page__button--primary"
            onClick={handleCreateProfile}
            type="button"
          >
            <Plus size={16} aria-hidden="true" />
            <span>Create Profile</span>
          </button>
        </div>
      </div>

      <div className="profiles-page__summary" aria-label="Profiles summary">
        <div>
          <SlidersHorizontal size={18} aria-hidden="true" />
          <span>{profiles.length} profiles</span>
        </div>
        <div>
          <span>Selected: {selectedProfile?.name ?? 'None'}</span>
        </div>
      </div>

      <div className="profiles-page__workspace">
        <div className="profiles-page__list" aria-label="Available profiles">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              onSelect={handleSelectedProfileChange}
              profile={profile}
              selected={profile.id === selectedProfile?.id}
            />
          ))}
        </div>

        {selectedProfile && (
          <ProfileEditor
            onInstructionChange={handleInstructionChange}
            profile={selectedProfile}
          />
        )}
      </div>
    </section>
  );
}
