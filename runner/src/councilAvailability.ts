// Run-scoped provider availability registry for a single Council run.
//
// Provider unavailability is a routine operating condition of Maestriss, not
// an exceptional edge case: on any given day several Minds may be sitting in
// a Cloudflare "prove you're human" loop, logged out, plan-gated, or blocked
// for the account. This registry remembers, for the duration of ONE Council
// run, which Minds have been established unavailable so that later Seats never
// re-check or re-attempt them.
//
// Invariants:
// - The registry is created fresh per run and is NEVER persisted. A new
//   Council run begins with a new registry.
// - The saved Council Configuration and its canonical provider preference
//   chains are never mutated. The effective execution chain is derived at
//   runtime as (configured chain) minus (providers unavailable this run).
// - State is monotonic within a run: once a provider is established
//   unavailable it stays unavailable for the rest of the run (no automatic
//   mid-run recovery or re-probing). 'unknown' remains executable — the first
//   real ask may establish its state.

export type ProviderAvailabilityState = 'unknown' | 'ready' | 'unavailable';

// Where an availability fact was first established during the run.
//   preflight — the one provider-readiness pass at Council start.
//   readiness — a per-seat readiness rejection (legacy per-seat gating).
//   ask       — a structured availability failure surfaced by a real ask.
export type ProviderAvailabilitySource = 'preflight' | 'readiness' | 'ask';

// Structured evidence retained for an unavailable provider, sufficient for
// the CLI and a future Studio UI to explain the decision without re-probing.
export type ProviderUnavailabilityEvidence = {
  provider: string;
  reason: string;
  message?: string;
  source: ProviderAvailabilitySource;
  // Run-relative milliseconds (measured from run start via the injected
  // clock) at which the provider was first established unavailable.
  // Diagnostic only; never affects execution.
  firstDetectedAtMs?: number;
  notes?: string[];
};

export type CouncilProviderAvailabilityEntry = {
  provider: string;
  state: ProviderAvailabilityState;
  // Present only when state === 'unavailable'.
  evidence?: ProviderUnavailabilityEvidence;
};

export type ProviderAvailabilityRegistry = {
  get(provider: string): ProviderAvailabilityState;
  isUnavailable(provider: string): boolean;
  evidenceFor(provider: string): ProviderUnavailabilityEvidence | undefined;
  markReady(provider: string): void;
  markUnknown(provider: string): void;
  // Marks a provider unavailable. First evidence wins: a provider already
  // recorded unavailable keeps its original first-detection evidence. Returns
  // true only when this call newly transitioned the provider to unavailable.
  markUnavailable(evidence: ProviderUnavailabilityEvidence): boolean;
  // Snapshot in a stable, caller-provided provider order.
  snapshot(order: string[]): CouncilProviderAvailabilityEntry[];
};

export function createProviderAvailabilityRegistry(): ProviderAvailabilityRegistry {
  const states = new Map<string, ProviderAvailabilityState>();
  const evidence = new Map<string, ProviderUnavailabilityEvidence>();

  return {
    get: (provider) => states.get(provider) ?? 'unknown',
    isUnavailable: (provider) => states.get(provider) === 'unavailable',
    evidenceFor: (provider) => evidence.get(provider),
    markReady: (provider) => {
      // Monotonic: unavailable never transitions back to ready this run.
      if (states.get(provider) === 'unavailable') {
        return;
      }
      states.set(provider, 'ready');
    },
    markUnknown: (provider) => {
      // Never downgrade an already-known state to unknown.
      if (states.has(provider)) {
        return;
      }
      states.set(provider, 'unknown');
    },
    markUnavailable: (ev) => {
      if (states.get(ev.provider) === 'unavailable') {
        return false;
      }
      states.set(ev.provider, 'unavailable');
      evidence.set(ev.provider, ev);
      return true;
    },
    snapshot: (order) =>
      order.map((provider) => {
        const state = states.get(provider) ?? 'unknown';
        const ev = evidence.get(provider);
        return state === 'unavailable' && ev ? { provider, state, evidence: ev } : { provider, state };
      }),
  };
}

// Classify a readiness status into a run availability state. 'ready' is
// ready; 'unknown' (or absent) remains executable; every other non-ready
// readiness status is a structured unavailability. This mirrors the readiness
// taxonomy already used per-seat and introduces no second, contradictory
// list.
export function classifyReadinessState(status: string | undefined): ProviderAvailabilityState {
  if (status === 'ready') {
    return 'ready';
  }

  if (status === undefined || status === 'unknown') {
    return 'unknown';
  }

  return 'unavailable';
}

// The distinct providers that may appear anywhere in the Formation's
// effective provider preferences, in first-seen order. Preflight need not
// inspect providers that cannot appear in any seat's chain.
export function relevantProviders(chains: readonly (readonly string[])[]): string[] {
  const seen = new Set<string>();
  const order: string[] = [];

  for (const chain of chains) {
    for (const provider of chain) {
      if (!seen.has(provider)) {
        seen.add(provider);
        order.push(provider);
      }
    }
  }

  return order;
}

// Derive the effective execution chain: the configured chain minus providers
// already established unavailable for this run, preserving configured order.
export function deriveEffectiveChain(
  configuredChain: readonly string[],
  registry: ProviderAvailabilityRegistry,
): string[] {
  return configuredChain.filter((provider) => !registry.isUnavailable(provider));
}
