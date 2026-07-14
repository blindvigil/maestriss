# Handoff: Council System and Live Doctrine Execution

**Date:** 2026-07-14
**Version:** 0.2.1 (canonical `package.json`; tag `v0.2.1` not yet created — newest tag is `v0.2.0`; tag only with human approval)
**Audience:** Any future human or AI session picking up Maestriss without prior conversation context. Written by the outgoing repository-attached engineer AI for its successor.
**Status labels:** `[IMPLEMENTED]` working now · `[UNCOMMITTED]` verified in the worktree but not yet committed · `[LIMITATION]` known gap · `[DEFERRED]` consciously postponed · `[FUTURE]` direction, not started.

## Milestone Purpose

This handoff closes the phase that built the Council system on top of the proven nine-provider runner: the shared council contract, the canonical Doctrine/Calling vocabulary, the Studio Calling Grimoire, and the first live Doctrine execution engine on the Runner CLI. It also records, honestly, that a large verified body of this work sits **uncommitted** in the worktree at handoff time.

## Critical First Facts for the Next Session

1. **The worktree carries substantial uncommitted, fully verified work** on top of commit `d82438d` (`feat: canonical role library and sixteen goal-specific council presets`). The uncommitted set spans three logical slices, in this order: Suggested AI metadata per Calling; the canonical vocabulary migration (preset→Doctrine, role→Calling, Councillor removed, module/schema/Studio renames); and live Doctrine execution (`councilExecution.ts`, the `council run` CLI, `test:council-execution`, and all documentation in this handoff's period). **Do not commit anything unless the human explicitly instructs it.** When asked, prefer separate commits per logical slice.
2. **Never stage the local clutter:** `desktop.ini` files everywhere, `.agents/`, `.claude/`, `.tmp.driveupload/`, `runner/workflows/desktop.ini`. They are not project files.
3. **Commit style:** lowercase conventional prefix (`feat:`, `fix:`, `docs:`, `release:`), body in plain sentences, ending with `Co-Authored-By:` for the authoring AI.
4. **No live Doctrine run has been executed yet.** The deterministic suites all pass, but the first live `council run` (target: Dream Lab, see below) had not been performed when this handoff was written. Do not describe live Doctrine execution as live-validated until a real run exists.

## Canonical Council Vocabulary `[UNCOMMITTED]`

Doctrine → Formation → Seat → Council. A **Doctrine** defines a cognitive workflow and provides a default **Formation** (ordered seats); each **seat** assigns a **Calling** (behavioral lens) and a provider (AI); the configured whole is a **Council**. Exactly sixteen Callings (no Councillor — equal deliberation is a Doctrine mechanic, not a Calling) and exactly sixteen Doctrines. "Preset" and "role" are superseded terms surviving only in deliberately retained compatibility identifiers: the `maestriss.roleFlavourOverrides` localStorage key, parser-level legacy calling-id migration (`master-of-questions`→`sage`, `scout`→`pathfinder`, `smith`→`architect`, Councillor overrides dropped), and the internal `roleIntensity` variable name. Reference doc 02 (both editions) is the authoritative description.

## What Exists Now

- `[IMPLEMENTED]` Nine-provider Native Runner (`/ask` lifecycle, readiness, cancellation, diagnostics), sequential baton test, per-provider filter suites, versioning system. All committed through `d82438d`.
- `[UNCOMMITTED]` Shared council contract `shared/council/` (providers, callings, callingFlavourText, schema, doctrines, promptComposition) — pure TypeScript consumed by both builds.
- `[UNCOMMITTED]` Studio Calling Grimoire (`src/pages/CallingGrimoirePage.tsx`, `src/components/callings/`, `src/utils/callingFlavour.ts`; navigation key `callings`). Edits are local-browser overrides; execution reads only a configuration's embedded `callingFlavourOverrides`.
- `[UNCOMMITTED]` Live Doctrine execution: `runner/src/councilExecution.ts` (pure engine, injected ask — same architecture as `batonTest.ts`) plus the `council run` CLI in `runner/src/index.ts`. Sequential seats over `/ask`; halt / retry-once / skip-and-record; PASS / PARTIAL / FAIL; exact composed prompt preserved per seat (`--verbose` prints it); readiness snapshot gate; Crown Council honesty notice. In-memory state only.
- `[UNCOMMITTED]` Deterministic suites: `npm run test:council` (contract) and `npm run test:council-execution` (engine, 45 assertions). Both browser-free and green, alongside `test:baton`, both builds, and `verify:version`.

## Decisions the Next Session Should Not Re-litigate

- Formation seat assignment is authoritative at execution; a Calling's Suggested AI is advisory metadata only and is never substituted in.
- A failed retry-once retry **halts** (schema defines no alternative; safest reading). Deterministic composition/budget failures are never retried.
- Contributions are only ever actual extracted provider responses; skipped/failed seats forward nothing. This is the baton philosophy and it is enforced by assertions — do not weaken it to make runs look better.
- Crown Council: all seats are Magistrate peers in one independent round; no voting/tally exists; the last output is an individual opinion, never a "collective verdict".
- Provider-facing wording must stay plain and benign (a live Claude refusal was triggered by "token"/"verification" wording); refusal-safety assertions enforce this for council text.

## Known Gotchas (Hard-Won)

- PowerShell 5.1: `Set-Content -Encoding utf8` writes a BOM and `Get-Content -Raw` can mojibake UTF-8 em-dashes — use `[System.IO.File]::WriteAllText` with `UTF8Encoding($false)` for scripted doc edits, or the editor tools. The shell's working directory resets between tool calls.
- Runner build emits `dist/runner/src` + `dist/shared` (two source roots); the CLI resolves its package root by walking up to `package.json` — do not reintroduce fixed-depth assumptions.
- Test fixtures must not use ids that could become real (a fake 'saboteur' test id later became a real Calling).
- Historical journal/CHANGELOG-release entries keep the old vocabulary on purpose; only current-state text uses the canonical terms.

## Next Steps `[FUTURE]`

1. **First live Doctrine run** (human-triggered): `npm run dev -- serve`, then Dream Lab with the product owner's architecture-brainstorm prompt (see Reference doc 14, Live Council Execution). Report observed results honestly; tune v1 Formations afterward.
2. **Persisted Council Records** — the next vertical slice (run records with their own version; the exact composed prompts are already preserved in-memory to feed it).
3. Crown Council voting semantics; Studio participant-vocabulary migration (`reka-chat`→`reka`, Copilot URL); user-created saved Councils; Studio-triggered execution; graphical Council Composer.

## Where to Look

Reference docs 02 (architecture + council contract + execution), 09 (suites), 14 (runbook commands), 11 (journal, newest-first), `CHANGELOG.md` [Unreleased]. The onboarding pairs (`VSC_AI_*`, `Web_AI_*`) were refreshed on 2026-07-14.
