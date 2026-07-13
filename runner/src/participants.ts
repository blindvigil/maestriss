// The runner's participant roster is the shared canonical council provider
// registry (shared/council/providers.ts), re-projected into the runner's
// existing participant shape with no behavioral change. Drivers, readiness,
// and lifecycle behavior remain runner-internal.

import { councilProviders } from '../../shared/council/providers.js';

export type RunnerParticipant = {
  id: string;
  name: string;
  url: string;
};

export const participants: RunnerParticipant[] = councilProviders.map((provider) => ({
  id: provider.id,
  name: provider.displayName,
  url: provider.canonicalUrl,
}));
