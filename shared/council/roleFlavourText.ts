// Canonical council role flavour text.
//
// Flavour text is the provider-facing instructional text that makes a
// participant adopt a role's perspective and reasoning style. It is a
// separate concern from structural role metadata (roles.ts): roles own
// identity, defaults, and affinity; this module owns the behavioral prompt
// content, keyed by stable role id.
//
// This file is the single source of truth. The Runner prompt-composition
// pipeline reads it directly, and the Studio Role Grimoire editor loads it
// as the canonical default beneath user overrides. Wording must stay plain,
// constructive, and benign (see the refusal-safety assertions in the
// council suite) and must never include fantasy titles.

import type { CouncilRoleIntensity } from './schema.js';
import type { RoleDefinition } from './roles.js';

export const roleFlavourTexts: Record<string, string> = {
  'lantern-bearer': [
    'You are acting as the council\'s fact-checker.',
    'Treat the material you receive as a set of claims to examine.',
    'Separate what is verifiable fact, what is reasonable inference, and what is speculation or opinion.',
    'Correct claims that are unsupported or wrong, and say plainly when something cannot be confirmed.',
  ].join(' '),
  inquisitor: [
    'You are acting as the council\'s critical reviewer.',
    'Treat the prior material as claims that have not yet earned acceptance.',
    'Identify weak assumptions, unsupported leaps, missing considerations, and plausible counterexamples.',
    'Keep what survives scrutiny and say why it survives.',
  ].join(' '),
  rival: [
    'You are acting as the council\'s competing strategist.',
    'Do not simply critique the prior material.',
    'Produce a genuinely different solution or interpretation of your own,',
    'then compare the two approaches and explain where each one is stronger or weaker.',
  ].join(' '),
  'wild-mage': [
    'You are acting as the council\'s divergent thinker.',
    'Use the prior material as a starting point rather than a boundary.',
    'Contribute unconventional possibilities, unexpected combinations, and non-obvious alternatives',
    'that the council has not yet considered.',
  ].join(' '),
  magistrate: [
    'You are acting as the council\'s decision judge.',
    'Weigh the competing contributions against explicit criteria such as correctness, feasibility, risk, and cost.',
    'State the criteria you are using, compare the options against them,',
    'and be explicit about the tradeoffs behind your judgment.',
  ].join(' '),
  'royal-scribe': [
    'You are acting as the council\'s editor in chief.',
    'Treat all prior contributions as source material for a final document.',
    'Merge overlapping points, reconcile terminology, and preserve important disagreement',
    'rather than inventing consensus.',
  ].join(' '),
};

export function getCanonicalRoleFlavourText(roleId: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(roleFlavourTexts, roleId)
    ? roleFlavourTexts[roleId]
    : undefined;
}

// -------------------------------------------------------------------------
// User overrides (versioned, storage-agnostic).
//
// Studio persists these in browser-local storage; the envelope logic lives
// here so it stays pure, deterministic, and testable without a browser.
// Overrides never modify the canonical defaults above, and the Runner uses
// canonical text only until a future slice carries customized flavour text
// inside Council Configurations.
// -------------------------------------------------------------------------

export const roleFlavourOverridesSchemaVersion = 1;

export type RoleFlavourOverrides = {
  schemaVersion: number;
  overrides: Record<string, string>;
};

export function createEmptyRoleFlavourOverrides(): RoleFlavourOverrides {
  return { schemaVersion: roleFlavourOverridesSchemaVersion, overrides: {} };
}

export function parseRoleFlavourOverrides(raw: string | null): RoleFlavourOverrides {
  if (!raw) {
    return createEmptyRoleFlavourOverrides();
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      (parsed as RoleFlavourOverrides).schemaVersion !== roleFlavourOverridesSchemaVersion ||
      typeof (parsed as RoleFlavourOverrides).overrides !== 'object' ||
      (parsed as RoleFlavourOverrides).overrides === null
    ) {
      return createEmptyRoleFlavourOverrides();
    }

    const overrides: Record<string, string> = {};

    for (const [roleId, text] of Object.entries((parsed as RoleFlavourOverrides).overrides)) {
      if (typeof text === 'string' && text.trim().length > 0) {
        overrides[roleId] = text;
      }
    }

    return { schemaVersion: roleFlavourOverridesSchemaVersion, overrides };
  } catch {
    return createEmptyRoleFlavourOverrides();
  }
}

export function serializeRoleFlavourOverrides(overrides: RoleFlavourOverrides): string {
  return JSON.stringify(overrides);
}

// Immutable update. Setting a role's text back to its canonical default (or
// to blank) removes the override so "customized" always means "differs from
// canonical".
export function setRoleFlavourOverride(
  current: RoleFlavourOverrides,
  roleId: string,
  text: string,
): RoleFlavourOverrides {
  const next: Record<string, string> = { ...current.overrides };

  if (text.trim().length === 0 || text === getCanonicalRoleFlavourText(roleId)) {
    delete next[roleId];
  } else {
    next[roleId] = text;
  }

  return { schemaVersion: roleFlavourOverridesSchemaVersion, overrides: next };
}

export function clearRoleFlavourOverride(
  current: RoleFlavourOverrides,
  roleId: string,
): RoleFlavourOverrides {
  const next: Record<string, string> = { ...current.overrides };
  delete next[roleId];
  return { schemaVersion: roleFlavourOverridesSchemaVersion, overrides: next };
}

// Council-shaped overrides: the compact record carried by a Council
// Configuration (`roleFlavourOverrides`), holding only explicitly
// customized roles. This is the portable execution contract; the versioned
// envelope above is only the Studio editing convenience around it.
export function resolveCouncilRoleFlavourText(
  roleId: string,
  councilOverrides?: Record<string, string>,
): string | undefined {
  const override = councilOverrides?.[roleId];

  if (typeof override === 'string' && override.trim().length > 0) {
    return override;
  }

  return getCanonicalRoleFlavourText(roleId);
}

export function resolveRoleFlavourText(
  roleId: string,
  overrides?: RoleFlavourOverrides,
): string | undefined {
  return resolveCouncilRoleFlavourText(roleId, overrides?.overrides);
}

// Projects the Studio editing envelope into the compact council-record
// shape. Returns undefined when nothing is customized so Council
// Configurations never carry an empty (or canonical-duplicating) block.
export function toCouncilRoleFlavourOverrides(
  overrides: RoleFlavourOverrides,
): Record<string, string> | undefined {
  const entries = Object.entries(overrides.overrides)
    .filter(([roleId, text]) =>
      typeof text === 'string' &&
      text.trim().length > 0 &&
      text !== getCanonicalRoleFlavourText(roleId));

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
}

// Renders the role-framing prompt section. Full intensity injects the
// resolved flavour text (council override first, canonical otherwise);
// light intensity stays the deterministic one-line perspective derived
// from the practical title regardless of overrides.
export function renderRoleFraming(
  role: RoleDefinition,
  intensity: CouncilRoleIntensity,
  councilOverrides?: Record<string, string>,
): string {
  if (intensity === 'light') {
    return `Approach this from the perspective of a ${role.practicalTitle}.`;
  }

  const flavour = resolveCouncilRoleFlavourText(role.id, councilOverrides);

  if (!flavour) {
    throw new Error(`No canonical flavour text exists for role "${role.id}".`);
  }

  return flavour;
}
