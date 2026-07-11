---
Document ID: REF-16
Document Title: AI Session Bootstrap
Version: v0.2.0
Revision Date: 2026-07-10
Status: Authoritative Reference
Audience: AI
Purpose: AI-optimized edition of the Maestriss engineering reference for AI Session Bootstrap.
Scope: Same engineering truth as the corresponding Human edition; optimized for deterministic interpretation, retrieval, and machine reasoning.
Related Documents:
  - ../Human/16 - AI Session Bootstrap.md
Related Modules: See Canonical Source Content and referenced source paths.
Canonical Concepts Covered: Same as the Human edition.
Current Implementation Status: See Canonical Source Content; source code remains authoritative for current implemented behavior.
---
# AI Session Bootstrap

## AI Edition Contract

| Field | Value |
| --- | --- |
| Canonical Document ID | REF-16 |
| Canonical Title | AI Session Bootstrap |
| Companion Human Edition | ../Human/16 - AI Session Bootstrap.md |
| Authority Level | Authoritative reference for architecture, terminology, philosophy, operations, and documented status. |
| Source-of-Truth Rule | Source code is authoritative for current implemented behavior. Reference documents are authoritative for architecture, terminology, and intended design. |
| Equivalence Rule | This AI edition and the companion Human edition SHALL communicate the same engineering truth. Presentation may differ; facts must not differ. |
| Interpretation Mode | Deterministic, explicit, retrieval-oriented, and machine-reasonable. |

## Semantic Tags

Use these tags when interpreting statements in this document:

| Tag | Meaning |
| --- | --- |
| CURRENT | Describes behavior or structure implemented in the repository at the documented revision. |
| VERIFIED | Describes behavior validated by source inspection, build output, tests, or committed audit evidence. |
| PLANNED | Describes intended architecture or work not yet implemented. |
| FUTURE | Describes long-term direction or possibility, not a current requirement. |
| HISTORICAL | Describes project history, milestone context, or prior decision rationale. |
| NORMATIVE | Defines a rule, invariant, standard, or required project practice. |
| INFORMATIVE | Explains motivation, rationale, examples, or commentary. |

## AI Reading Rules

1. Treat the companion Human edition as semantically equivalent.
2. Do not infer implemented behavior from aspirational or future-oriented language.
3. Verify current behavior against source files before modifying code.
4. Preserve provider-specific boundaries: server owns orchestration; drivers own provider behavior.
5. Preserve documentation boundaries: Reference is authoritative for design; Reviews are dated audits; Handoffs are milestone snapshots.
6. Report doc-vs-code conflicts explicitly.
7. Do not collapse CURRENT, PLANNED, FUTURE, HISTORICAL, NORMATIVE, and INFORMATIVE statements into one category.

## Canonical Source Content

The following source content is the canonical knowledge body for this document. It is preserved from the Human edition to maintain exact semantic equivalence. Use the metadata, semantic tags, and AI reading rules above to interpret it deterministically.
# AI Session Bootstrap

## Purpose

This document lets any new AI session (ChatGPT, Claude, Codex, Gemini, VS Code agents, or others) become productive on Maestriss without access to prior conversations. It defines what to read, in what order, what is authoritative, and what an assistant must do before changing anything. The reusable prompt at the end can be pasted verbatim into a new conversation.

## What Maestriss Is

Maestriss orchestrates multiple independent web AI providers — ChatGPT, Claude, DeepSeek, Gemini, Google AI Mode, Grok, Copilot, Perplexity, and Reka — through browser automation, treating each provider as a "participant" in multi-AI workflows. Providers are operated through their real web interfaces (user-owned sessions, persistent browser profiles), not their APIs. The long-term goal is a configurable orchestration platform (Maestriss Studio) on top of a reliable execution engine (the native runner).

## Repository Components

| Path | Component | State |
| --- | --- | --- |
| `src/` | Maestriss Studio: React/TypeScript/Vite UI for workflows, participants, profiles, prompts, exports. | UI implemented; NOT connected to the runner (file export only; sessions page uses mock data). |
| `src/exporters/automa/` | Automa exporter: generates Automa workflow JSON from Studio configuration. | Working export path, sibling to the runner. |
| `runner/` | Native runner: Node + Playwright CLI and HTTP server (`127.0.0.1:4137`) that drives live provider tabs. | The operational core. All driver engineering lives here. |
| `docs/` | Strategy notes (`automa-export-strategy.md`, `native-runner-strategy.md`). | Background rationale. |
| `Documentation/` | The knowledge library (see hierarchy below). | Maintained. |

## Documentation Hierarchy and Source-of-Truth Rules

- **Code is authoritative for current implemented behavior.** If a doc and the code disagree about what the system does today, the code wins.
- **`Documentation/Reference/` (docs 01–16) is authoritative for architecture, terminology, and intended design.** It defines what things are called, why they are shaped that way, and what the system should do.
- **`Documentation/Reviews/` contains audits and reconciliation findings.** Findings are dated evidence; some may already be resolved by later commits. Never treat a review finding as current without checking the code and git log.
- **`Documentation/Handoffs/` describes the project at specific historical milestones.** Accurate for its date; superseded by later handoffs and by code.
- Documentation must clearly distinguish **current**, **planned**, and **aspirational** behavior. When writing docs, label which one you mean.
- **An AI must report doc-vs-code conflicts rather than silently choosing one side.** Describe the conflict, state which source you followed and why, and flag it for the maintainer.

## Required Reading Order

1. `README.txt` (root) — quickstart and map.
2. The most recent file in `Documentation/Handoffs/` — where the project actually stands.
3. [02 - System Architecture.md](02%20-%20System%20Architecture.md) — components, execution flow, Studio/runner/exporter relationship.
4. [03 - Driver Lifecycle Specification.md](03%20-%20Driver%20Lifecycle%20Specification.md) — the contract: `waitForReady → pastePrompt → submitPrompt → waitForCompletion → extractResponse`.
5. [01 - Design Philosophies and Tenets.md](01%20-%20Design%20Philosophies%20and%20Tenets.md) — the constitution: reliability over cleverness, observation over assumption, geometry is evidence not dogma.
6. `Documentation/Reviews/Reconciliation Report - Docs vs Code (2026-07-10).md` — known doc-vs-code gaps (check git log for fixes since).

## Task-Specific Reading Paths

- **Driver work (fixing or adding a provider):** 03, [07 - Participant Driver Reference.md](07%20-%20Participant%20Driver%20Reference.md), [05 - Response Detection and Filtering Philosophy.md](05%20-%20Response%20Detection%20and%20Filtering%20Philosophy.md), then read one mature driver trio end-to-end: `runner/src/drivers/claudeDriver.ts` + `claudeFiltering.ts` + `runner/src/claudeFilterAssertions.ts` (the exemplar), plus `drivers/base.ts` and `drivers/index.ts`.
- **Server/orchestration work:** 02, `runner/src/server.ts` (queue, timeouts, security gate, endpoints), `runner/src/runner.ts` (tab discovery/reuse), `runner/src/participants.ts`.
- **Browser/session/tab issues:** [04 - Browser and Tab Management.md](04%20-%20Browser%20and%20Tab%20Management.md), [08 - Browser Automation Architecture.md](08%20-%20Browser%20Automation%20Architecture.md), `runner/restart-runner.ps1`.
- **Testing/diagnostics:** [06 - Testing and Regression Philosophy.md](06%20-%20Testing%20and%20Regression%20Philosophy.md), [09 - Testing, Validation, and Diagnostics.md](09%20-%20Testing,%20Validation,%20and%20Diagnostics.md), the `*FilterAssertions.ts` files, `runner/src/inspector.ts`.
- **Operations/troubleshooting:** [14 - Operational Runbook.md](14%20-%20Operational%20Runbook.md), `runner/README.md`.
- **Studio/UI work:** `src/App.tsx`, `src/context/ProjectContext.tsx`, `src/pages/`, `src/exporters/automa/generateAutomaWorkflow.ts`.
- **Planning/status questions:** [11 - Project Status and Development Journal.md](11%20-%20Project%20Status%20and%20Development%20Journal.md), [10 - Future Roadmap and Vision.md](10%20-%20Future%20Roadmap%20and%20Vision.md), [15 - Engineering Notes and Design Commentary.md](15%20-%20Engineering%20Notes%20and%20Design%20Commentary.md).

## Verifying Documentation Claims Against Code

Before relying on a documented behavior, verify it: find the file and function that implements it, and confirm names, values (ports, timeouts, selectors, URLs), and control flow. Prefer greppable anchors: participant roster in `runner/src/participants.ts`, driver registry in `runner/src/drivers/index.ts`, endpoints and timeouts in `runner/src/server.ts`, CLI in `runner/src/index.ts`. Check `git log` for changes newer than the doc's date. Docs describe intent with "should"; do not read "should" as "does."

## Before Modifying Code

1. Read the relevant task path above; do not code from the docs alone.
2. Follow the boundary rule: provider quirks belong in that provider's driver/filtering module; shared lifecycle belongs in server/runner. Never let one provider's fix distort another driver.
3. Verify state transitions — paste verified, submit verified, candidate-based extraction with logged rejection reasons. Never assume.
4. Preserve detection principles: short valid answers must not be rejected; prefer the smallest valid child over parent containers; static status text (e.g. "Stopped generating") is not an active control; reject prompt echoes.
5. Every bug fixed should leave behind a regression assertion or a better diagnostic.

## Testing and Reporting Expectations

- Build both halves: `npm run build` (root) and `cd runner && npm run build`. Both must pass before any change is considered done.
- Run the affected filter suites: `npm run test:<provider>-filter` in `runner/` (providers: reka, deepseek, grok, copilot, claude, gemini, google). ChatGPT and Perplexity have no filter suites yet.
- Live behavior is validated manually with exact-answer smoke prompts: `npm run dev -- ask <participant> "Say exactly: <Provider> OK"`. Debug artifacts land in `runner/debug/`.
- Report outcomes faithfully: exact commands run, pass/fail output, anything skipped, and any doc-vs-code conflict found. Update [11 - Project Status and Development Journal.md](11%20-%20Project%20Status%20and%20Development%20Journal.md) after significant work, and fix any reference doc your change invalidates.

## Guidance for Web-Based AIs (no repository access)

The repository is public at <https://github.com/blindvigil/maestriss>. If you can browse the web, read files there — raw contents are at `https://raw.githubusercontent.com/blindvigil/maestriss/master/<path>` (e.g. `.../master/runner/src/server.ts`), which is more reliable for fetching than the GitHub UI pages.

If you cannot inspect the repository at all, do not guess at code behavior. Ask the user to paste: the latest handoff from `Documentation/Handoffs/`, the relevant reference doc sections, and the specific source files named in the task paths above. State clearly which claims you could not verify. Produce advice conditioned on the pasted evidence, and flag where your knowledge depends on documents that may be stale.

## Guidance for VS Code / Repository-Access Agents

You can and must verify directly. Read the files, run the builds and filter tests, and use `git log`/`git diff` to date claims. Never state a behavior as current without a file path behind it. When you finish substantive work, leave the repository consistent: builds passing, affected assertions updated, journal entry added, and stale doc claims corrected or reported.

## Reusable New-Conversation Bootstrap Prompt

Paste the following into a new AI session (a plain-text copy is kept in `bootstrap.txt` at the repository root):

> You are joining Maestriss, a project that orchestrates multiple web AI providers (ChatGPT, Claude, DeepSeek, Gemini, Google AI Mode, Grok, Copilot, Perplexity, Reka) through browser automation, treating each provider as a participant in multi-AI workflows. Before proposing or making changes: (1) Read `Documentation/Reference/AI/16 - AI Session Bootstrap.md` in full and follow its reading order and rules. (2) Read the most recent file in `Documentation/Handoffs/` for current state. (3) Apply the source-of-truth rules: code is authoritative for current behavior; `Documentation/Reference/Human/` and `Documentation/Reference/AI/` are authoritative parallel editions for architecture and intent; `Documentation/Reviews/` findings may already be resolved; report doc-vs-code conflicts instead of silently picking a side. (4) Verify claims against `runner/src/` before relying on them, and check `git log` for anything newer than the docs. When ready, state: (a) the request lifecycle in one paragraph, (b) which providers have full filtering + regression coverage and which do not, (c) the two browser execution modes and their profiles. Then wait for the task.

## Onboarding Checklist

- [ ] Read `README.txt` and the latest handoff in `Documentation/Handoffs/`.
- [ ] Read docs 02, 03, 01; skim the task-specific path for your assignment.
- [ ] Read the reconciliation report; check `git log` for later fixes.
- [ ] Locate the code anchors: `server.ts`, `runner.ts`, `participants.ts`, `drivers/base.ts`, `drivers/index.ts`, one full driver trio.
- [ ] Run both builds and the seven filter suites; confirm green.
- [ ] Pass the self-check (lifecycle, coverage gaps, browser modes).
- [ ] During work: verify, don't assume; isolate provider quirks; add regressions; report conflicts.
- [ ] After work: builds green, assertions updated, journal updated, stale doc claims fixed or reported.
