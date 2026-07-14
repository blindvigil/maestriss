// Browser persistence for Calling Grimoire flavour-text overrides.
//
// Persistence boundary (deliberate, documented): edits are versioned local
// overrides stored in this browser's localStorage. They never modify the
// canonical defaults in shared/council/callingFlavourText.ts, and execution
// reads customizations only from a Council Configuration's
// callingFlavourOverrides. All envelope logic (parsing, versioning, legacy
// calling-id migration, immutable updates) lives in the shared module so it
// stays deterministic and testable without a browser; this file only does
// the localStorage I/O.
//
// The storage key deliberately keeps its legacy "role" name so overrides
// saved before the Calling vocabulary migration keep loading; the shared
// parser migrates legacy calling ids on read.

import {
  parseCallingFlavourOverrides,
  serializeCallingFlavourOverrides,
  type CallingFlavourOverrides,
} from '../../shared/council/index.js';

export const callingFlavourOverridesStorageKey = 'maestriss.roleFlavourOverrides';

export function loadCallingFlavourOverrides(): CallingFlavourOverrides {
  try {
    return parseCallingFlavourOverrides(window.localStorage.getItem(callingFlavourOverridesStorageKey));
  } catch {
    return parseCallingFlavourOverrides(null);
  }
}

export function saveCallingFlavourOverrides(overrides: CallingFlavourOverrides) {
  try {
    window.localStorage.setItem(
      callingFlavourOverridesStorageKey,
      serializeCallingFlavourOverrides(overrides),
    );
  } catch {
    // Storage can be unavailable (private mode, quota); the editor keeps
    // working in memory and the page surfaces persistence as local-only.
  }
}
