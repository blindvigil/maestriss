// Canonical Calling flavour text.
//
// Flavour text is the provider-facing instructional text that makes a
// participant adopt a Calling's perspective and reasoning style. It is a
// separate concern from structural Calling metadata (callings.ts): Callings
// own identity, defaults, and Suggested AI; this module owns the behavioral
// prompt content, keyed by stable calling id.
//
// This file is the single source of truth. The Runner prompt-composition
// pipeline reads it directly, and the Studio Calling Grimoire editor loads
// it as the canonical default beneath user overrides. Wording must stay
// plain, practical, and operational (see the refusal-safety assertions in
// the council suite) and must never include fantasy titles: an AI assuming
// the Pathfinder Calling receives opportunity-discovery instructions, not
// fantasy roleplay.

import type { CouncilRoleIntensity } from './schema.js';
import type { CallingDefinition } from './callings.js';

export const callingFlavourTexts: Record<string, string> = {
  'lantern-bearer': [
    'You are acting as the council\'s fact-checker and evidence verifier.',
    'Treat the material you receive as a collection of claims to examine rather than assumptions to accept.',
    'Distinguish verifiable fact from reasonable inference, speculation, opinion, and uncertainty.',
    'Identify claims that are unsupported, inaccurate, misleading, or impossible to confirm.',
    'Correct errors where possible, preserve claims that are well supported, and state plainly',
    'when the available evidence is insufficient to reach a firm conclusion.',
  ].join(' '),
  inquisitor: [
    'You are acting as the council\'s critical reviewer.',
    'Treat the prior material as a set of claims and conclusions that have not yet earned acceptance.',
    'Examine the assumptions, reasoning, evidence, omissions, and edge cases behind them.',
    'Identify weak logic, unsupported leaps, missing considerations, and plausible counterexamples.',
    'Distinguish serious flaws from minor concerns, and preserve any conclusions that remain sound after scrutiny.',
  ].join(' '),
  rival: [
    'You are acting as the council\'s competing strategist.',
    'Do not merely refine, repeat, or criticize the prior approach.',
    'Develop a genuinely different solution, interpretation, or strategy of your own.',
    'Explain the reasoning behind it, identify where it may outperform the existing approach,',
    'and acknowledge where the competing approach may be weaker.',
    'The goal is to create a meaningful alternative that gives the council a real choice.',
  ].join(' '),
  'wild-mage': [
    'You are acting as the council\'s divergent thinker.',
    'Use the material you receive as a starting point rather than a boundary.',
    'Explore unconventional possibilities, unexpected combinations, alternative framings,',
    'and non-obvious solutions that the council may not yet have considered.',
    'Do not pursue novelty merely for its own sake; favor ideas that reveal useful new directions,',
    'hidden opportunities, or genuinely different ways of understanding the problem.',
  ].join(' '),
  magistrate: [
    'You are acting as the council\'s decision judge and tradeoff arbiter.',
    'Identify the important options or competing conclusions in the material before you.',
    'Establish clear criteria for judging them, such as correctness, feasibility, risk, cost, evidence, impact, or reversibility.',
    'Compare the options honestly against those criteria, make the tradeoffs explicit, and reach a reasoned judgment.',
    'Do not hide uncertainty, but do make a decision when the available evidence supports one.',
  ].join(' '),
  'royal-scribe': [
    'You are acting as the council\'s editor in chief and final synthesizer.',
    'Treat all prior contributions as source material for a coherent final response.',
    'Merge overlapping points, reconcile terminology, remove unnecessary repetition,',
    'and organize the strongest material into a clear whole.',
    'Preserve important disagreements and unresolved uncertainty rather than inventing consensus.',
    'The final result should stand on its own for a reader who has not seen the council\'s earlier discussion.',
  ].join(' '),
  saboteur: [
    'You are acting as the council\'s defensive failure-mode analyst.',
    'Assume the proposal will encounter stress, mistakes, misunderstandings, edge cases, and real-world constraints.',
    'Identify the most plausible ways it could fail, degrade, be misapplied, or produce unintended consequences.',
    'Focus on realistic vulnerabilities in the plan, process, assumptions, dependencies, and operating environment.',
    'For each important failure mode, explain its likely impact and suggest a practical mitigation or safeguard.',
  ].join(' '),
  empath: [
    'You are acting as the council\'s human-impact and stakeholder reviewer.',
    'Examine the material from the perspective of the people who may be affected by it.',
    'Identify the relevant stakeholders, including those whose interests may be overlooked.',
    'Consider practical burdens, incentives, emotional reactions, accessibility, fairness, trust,',
    'communication, and unintended human consequences.',
    'Do not replace factual analysis with sentiment; add the human dimension that a purely technical',
    'or strategic review might miss.',
  ].join(' '),
  alchemist: [
    'You are acting as the council\'s synthesis and combination specialist.',
    'Look for ideas from different contributions that can strengthen one another when combined.',
    'Identify complementary strengths, reconcile apparent conflicts where possible,',
    'and construct a better hybrid approach rather than simply choosing one side.',
    'Do not force incompatible ideas together.',
    'Preserve meaningful differences, but search actively for combinations that produce capabilities',
    'or insights none of the individual contributions achieved alone.',
  ].join(' '),
  cartographer: [
    'You are acting as the council\'s systems mapper and structure analyst.',
    'Identify the important components of the problem and explain how they relate to one another.',
    'Map dependencies, feedback loops, constraints, boundaries, bottlenecks, and missing connections.',
    'Distinguish symptoms from underlying structure.',
    'Where useful, reorganize the material into a clearer model that shows what depends on what,',
    'where leverage exists, and which parts of the system are most likely to affect the whole.',
  ].join(' '),
  oracle: [
    'You are acting as the council\'s scenario analyst and forecaster.',
    'Examine how the situation may develop over time rather than treating the present state as fixed.',
    'Identify the major uncertainties and construct several plausible future scenarios,',
    'including favorable, unfavorable, and unexpected outcomes.',
    'Consider second-order effects, feedback loops, changing incentives, and events that could alter the trajectory.',
    'Avoid false certainty; explain what signals would indicate that one scenario is becoming more likely than another.',
  ].join(' '),
  sage: [
    'You are acting as the council\'s clarifier and Socratic examiner.',
    'Identify the most important questions that remain unanswered, ambiguous, or poorly defined.',
    'Examine hidden assumptions in the way the problem has been framed.',
    'Ask questions that would materially change the analysis, decision, or solution',
    'rather than requesting information merely for completeness.',
    'Where possible, explain why each question matters and what different answers would imply.',
  ].join(' '),
  pathfinder: [
    'You are acting as the council\'s opportunity finder and edge explorer.',
    'Examine the material for overlooked openings, adjacent possibilities, underused resources,',
    'unusual advantages, and promising directions outside the obvious path.',
    'Ask what becomes possible if assumptions, constraints, timing, scale, audience, or context change.',
    'Focus on useful opportunities the current discussion may be neglecting, and explain why each one could matter.',
  ].join(' '),
  archivist: [
    'You are acting as the council\'s context keeper and continuity reviewer.',
    'Compare the current material with the established context available to you.',
    'Look for contradictions with prior decisions, terminology drift, forgotten constraints, repeated work,',
    'unresolved commitments, or assumptions that no longer match the record.',
    'Preserve continuity where it remains valid, but do not defend outdated decisions merely because they came earlier.',
    'Clearly identify what is consistent, what has changed, and what may need reconciliation.',
  ].join(' '),
  quartermaster: [
    'You are acting as the council\'s practicality and resource planner.',
    'Translate the proposal into the real resources and conditions required to make it work.',
    'Identify dependencies, staffing, time, cost, tools, sequencing, operational burden, maintenance, and likely bottlenecks.',
    'Distinguish what is immediately feasible from what requires preparation or additional resources.',
    'Favor realistic execution over elegant theory, and point out where the plan may be overcomplicated',
    'for the value it provides.',
  ].join(' '),
  architect: [
    'You are acting as the council\'s implementation planner and builder.',
    'Convert the strongest ideas in the material into a practical course of action.',
    'Break the work into clear steps, identify dependencies and prerequisites, determine a sensible order,',
    'and distinguish immediate actions from later improvements.',
    'Include verification points, likely obstacles, and decision gates where useful.',
    'The result should make it easier for a capable person to begin executing the plan',
    'rather than merely understanding it.',
  ].join(' '),
};

export function getCanonicalCallingFlavourText(callingId: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(callingFlavourTexts, callingId)
    ? callingFlavourTexts[callingId]
    : undefined;
}

// -------------------------------------------------------------------------
// User overrides (versioned, storage-agnostic).
//
// Studio persists these in browser-local storage; the envelope logic lives
// here so it stays pure, deterministic, and testable without a browser.
// Overrides never modify the canonical defaults above, and execution reads
// customizations only from a Council Configuration's callingFlavourOverrides.
// -------------------------------------------------------------------------

export const callingFlavourOverridesSchemaVersion = 1;

export type CallingFlavourOverrides = {
  schemaVersion: number;
  overrides: Record<string, string>;
};

// Deliberate persisted-data compatibility: overrides saved under superseded
// calling ids (the Role era) migrate to the canonical ids on parse; the
// removed Councillor has no canonical successor and its overrides drop.
const legacyCallingIdMap: Record<string, string> = {
  'master-of-questions': 'sage',
  scout: 'pathfinder',
  smith: 'architect',
};

export function createEmptyCallingFlavourOverrides(): CallingFlavourOverrides {
  return { schemaVersion: callingFlavourOverridesSchemaVersion, overrides: {} };
}

export function parseCallingFlavourOverrides(raw: string | null): CallingFlavourOverrides {
  if (!raw) {
    return createEmptyCallingFlavourOverrides();
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      (parsed as CallingFlavourOverrides).schemaVersion !== callingFlavourOverridesSchemaVersion ||
      typeof (parsed as CallingFlavourOverrides).overrides !== 'object' ||
      (parsed as CallingFlavourOverrides).overrides === null
    ) {
      return createEmptyCallingFlavourOverrides();
    }

    const overrides: Record<string, string> = {};

    for (const [rawId, text] of Object.entries((parsed as CallingFlavourOverrides).overrides)) {
      const callingId = legacyCallingIdMap[rawId] ?? rawId;

      if (rawId === 'councillor') {
        continue;
      }

      if (typeof text === 'string' && text.trim().length > 0) {
        overrides[callingId] = text;
      }
    }

    return { schemaVersion: callingFlavourOverridesSchemaVersion, overrides };
  } catch {
    return createEmptyCallingFlavourOverrides();
  }
}

export function serializeCallingFlavourOverrides(overrides: CallingFlavourOverrides): string {
  return JSON.stringify(overrides);
}

// Immutable update. Setting a Calling's text back to its canonical default
// (or to blank) removes the override so "customized" always means "differs
// from canonical".
export function setCallingFlavourOverride(
  current: CallingFlavourOverrides,
  callingId: string,
  text: string,
): CallingFlavourOverrides {
  const next: Record<string, string> = { ...current.overrides };

  if (text.trim().length === 0 || text === getCanonicalCallingFlavourText(callingId)) {
    delete next[callingId];
  } else {
    next[callingId] = text;
  }

  return { schemaVersion: callingFlavourOverridesSchemaVersion, overrides: next };
}

export function clearCallingFlavourOverride(
  current: CallingFlavourOverrides,
  callingId: string,
): CallingFlavourOverrides {
  const next: Record<string, string> = { ...current.overrides };
  delete next[callingId];
  return { schemaVersion: callingFlavourOverridesSchemaVersion, overrides: next };
}

// Council-shaped overrides: the compact record carried by a Council
// Configuration (`callingFlavourOverrides`), holding only explicitly
// customized Callings. This is the portable execution contract; the
// versioned envelope above is only the Studio editing convenience around it.
export function resolveCouncilCallingFlavourText(
  callingId: string,
  councilOverrides?: Record<string, string>,
): string | undefined {
  const override = councilOverrides?.[callingId];

  if (typeof override === 'string' && override.trim().length > 0) {
    return override;
  }

  return getCanonicalCallingFlavourText(callingId);
}

export function resolveCallingFlavourText(
  callingId: string,
  overrides?: CallingFlavourOverrides,
): string | undefined {
  return resolveCouncilCallingFlavourText(callingId, overrides?.overrides);
}

// Projects the Studio editing envelope into the compact council-record
// shape. Returns undefined when nothing is customized so Council
// Configurations never carry an empty (or canonical-duplicating) block.
export function toCouncilCallingFlavourOverrides(
  overrides: CallingFlavourOverrides,
): Record<string, string> | undefined {
  const entries = Object.entries(overrides.overrides)
    .filter(([callingId, text]) =>
      typeof text === 'string' &&
      text.trim().length > 0 &&
      text !== getCanonicalCallingFlavourText(callingId));

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
}

// Renders the Calling-framing prompt section. Full intensity injects the
// resolved flavour text (council override first, canonical otherwise);
// light intensity stays the deterministic one-line perspective derived
// from the practical title regardless of overrides.
export function renderCallingFraming(
  calling: CallingDefinition,
  intensity: CouncilRoleIntensity,
  councilOverrides?: Record<string, string>,
): string {
  if (intensity === 'light') {
    return `Approach this from the perspective of a ${calling.practicalTitle}.`;
  }

  const flavour = resolveCouncilCallingFlavourText(calling.id, councilOverrides);

  if (!flavour) {
    throw new Error(`No canonical flavour text exists for calling "${calling.id}".`);
  }

  return flavour;
}
