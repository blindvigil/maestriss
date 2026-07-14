// Browser persistence for Role Grimoire flavour-text overrides.
//
// Persistence boundary (deliberate, documented): edits are versioned local
// overrides stored in this browser's localStorage. They never modify the
// canonical defaults in shared/council/roleFlavourText.ts, and the Runner
// consumes canonical text only until a future slice carries customized
// flavour text inside Council Configurations. All envelope logic (parsing,
// versioning, immutable updates) lives in the shared module so it stays
// deterministic and testable without a browser; this file only does the
// localStorage I/O.

import {
  parseRoleFlavourOverrides,
  serializeRoleFlavourOverrides,
  type RoleFlavourOverrides,
} from '../../shared/council/index.js';

export const roleFlavourOverridesStorageKey = 'maestriss.roleFlavourOverrides';

export function loadRoleFlavourOverrides(): RoleFlavourOverrides {
  try {
    return parseRoleFlavourOverrides(window.localStorage.getItem(roleFlavourOverridesStorageKey));
  } catch {
    return parseRoleFlavourOverrides(null);
  }
}

export function saveRoleFlavourOverrides(overrides: RoleFlavourOverrides) {
  try {
    window.localStorage.setItem(
      roleFlavourOverridesStorageKey,
      serializeRoleFlavourOverrides(overrides),
    );
  } catch {
    // Storage can be unavailable (private mode, quota); the editor keeps
    // working in memory and the page surfaces persistence as local-only.
  }
}
