import type { Profile } from '../../types/profile';
import './ProfileCard.css';

type ProfileCardProps = {
  profile: Profile;
  selected: boolean;
  onSelect: (id: string) => void;
};

export function ProfileCard({ profile, selected, onSelect }: ProfileCardProps) {
  return (
    <button
      className="profile-card"
      data-selected={selected}
      onClick={() => onSelect(profile.id)}
      type="button"
    >
      <span>{profile.name}</span>
      <strong>{profile.description}</strong>
      <small>{profile.intendedUse}</small>
    </button>
  );
}
