import { defaultProfiles } from '../data/defaultProfiles';
import type { Profile } from '../types/profile';

export function createDefaultProfiles(): Profile[] {
  return defaultProfiles.map((profile) => ({ ...profile }));
}

export function createProfile(index: number): Profile {
  return {
    id: `custom-profile-${Date.now()}-${index}`,
    name: `New Profile ${index}`,
    description: 'Custom behavioral profile ready for configuration.',
    intendedUse: 'Use in a Maestriss run when a custom stance is needed.',
    instruction:
      'Describe the behavior this participant should follow. Include tone, review stance, output expectations, and any constraints that should shape the response.',
  };
}

export function duplicateProfile(profile: Profile, index: number): Profile {
  return {
    ...profile,
    id: `${profile.id}-copy-${Date.now()}-${index}`,
    name: `${profile.name} Copy`,
  };
}
