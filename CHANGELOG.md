# Changelog

All notable changes to Maestriss are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Maestriss follows Semantic Versioning 2.0.0 with the pre-1.0 interpretation defined in `Documentation/Reference/Human/12 - Development Workflow and Engineering Standards.md` (Versioning and Release Policy). Studio, the Native Runner, the Automa exporter, participant drivers, and the Engineering Library ship as one Maestriss release train under one canonical version, owned by the root `package.json`.

Ordinary development accumulates under `Unreleased`. Entries move into a dated release section only when a release is approved by a human, and Git tags (`vMAJOR.MINOR.PATCH`) are created only for approved release commits.

## [Unreleased]

### Added

- Shared Council orchestration contract (`shared/council/`, Council Slice 1): canonical provider registry adopting the runner's execution-verified identities (the runner roster now re-exports it with no behavioral change), a six-role library (Lantern Bearer, Inquisitor, Rival, Wild Mage, Magistrate, Royal Scribe) with refusal-safe provider-facing framings, three deterministic preset factories (Council of X, Trial by Fire, The Editorial Court), the versioned Council Configuration schema (`schemaVersion: 1`) with a deterministic validator, council rules, behavioral variables, input/output/failure-policy vocabularies, prompt budgets, and a deterministic prompt-composition pipeline — all covered by `npm run test:council` (126 browser-free assertions). No live council execution exists yet.
- Dedicated Perplexity response-filtering module (`runner/src/drivers/perplexityFiltering.ts`) with a deterministic assertion suite (`npm run test:perplexity-filter`), completing dedicated filter coverage for all nine providers.
- Sequential multi-provider baton test (`npm run dev -- baton-test [--seed <value>] [--skip-unavailable]`): sends a deterministic seed through all nine participants in a fixed order over the normal `/ask` lifecycle, requiring each provider to return exactly the previous provider's actual extracted output plus its own token. Fails immediately on any wrong, stale, or unavailable-provider result; `--skip-unavailable` skips not-ready providers before their ask and reports `PARTIAL` instead of `PASS`. Orchestration logic lives in `runner/src/batonTest.ts` with a browser-free deterministic assertion suite (`npm run test:baton`).

### Changed

- Runner build output now emits under `dist/runner/src` and `dist/shared` because the runner compiles the shared council module; `npm start` points at the new entry path, and the runner CLI resolves its package root by walking up to the nearest `package.json` instead of assuming a fixed compiled depth.

### Removed

- Dormant graph-based workflow scaffolding: the unused `WorkflowDefinition`/`WorkflowNode`/`WorkflowEdge` types and `runner/workflows/google-chatgpt.workflow.json`, retired in favor of the shared Council Configuration model after a repository-wide reference check confirmed no consumer.

### Fixed

- DeepSeek response detection no longer rejects valid answers in narrow/responsive layouts (live baton stall: the correct answer at x=20 was rejected as `left-sidebar-region` by an absolute `left < 250` cutoff for over 100 seconds). Geometry rules are now composer-relative — only candidates entirely left of the composer column are rejected geometrically, the transcript width cap is measured against the composer width, and structural sidebar ancestry rejection is unchanged — with the rules extracted to `deepSeekGeometryRejectionReason` in `runner/src/drivers/deepseekFiltering.ts` and geometry assertions (including the exact live fixture) added to `npm run test:deepseek-filter`.
- Reka response extraction no longer returns a transcript-level parent containing the submitted prompt plus the answer (live baton false positive with long prompts; the prompt-only guard capped at 120+80 characters). Detection now prefers Reka's semantic assistant-answer containers (`div.prose.prose-chat` markdown nodes) over broad page-wide containers, structurally rejects the `justify-end` user-prompt bubble, and rejects any candidate containing the full submitted prompt, with candidate selection extracted into testable functions in `runner/src/drivers/rekaFiltering.ts` and response-selection assertions added to `npm run test:reka-filter`.
- Copilot readiness now classifies the Microsoft 365 `/chat/blocked` page ("Copilot Chat isn't available") as an explicit `provider-blocked` status with a diagnostic note, instead of the generic `unknown`/no-composer result.
- Reka submission no longer hard-fails on long multiline prompts (live baton failure: expanded composer pushed the send button outside the geometric composer box, zero candidates, and the failure fired before any keyboard fallback). Submit-control discovery now uses structural evidence first — the send button shares the composer's `<form>` (lucide-send icon) — with geometry as supporting evidence only (`runner/src/drivers/rekaSubmitTargets.ts`), and a missing clickable target no longer prevents verified keyboard submit strategies from running. Deterministic submit-target assertions were added to `npm run test:reka-filter`, including a fixture shaped on the saved failure DOM.
- Perplexity response extraction no longer returns a transcript-level parent containing the submitted prompt plus the answer (live baton false positive with long prompts). Detection now prefers Perplexity's stable semantic answer containers (`[id^="markdown-content-"]`, prose/markdown nodes) over `main`/`article` fallbacks, structurally rejects the `group/query` prompt container, and rejects any candidate containing the full submitted prompt.

## [0.2.1] - 2026-07-11

### Added

- Dedicated ChatGPT response-filtering module (`runner/src/drivers/chatgptFiltering.ts`) with a deterministic assertion suite (`npm run test:chatgpt-filter`) covering response filtering, cleaning, geometry-based parent rejection, submission evidence, and browser-script validity.
- ChatGPT submission verification: click, keyboard Enter, and event-based Enter strategies must produce accepted-submission evidence (composer cleared, prompt visible as user message, stop control visible, or assistant response changed) before the driver reports success.
- Versioning and release system: canonical version ownership in the root `package.json`, this changelog, a read-only version verifier (`npm run verify:version`) with deterministic fixture-based assertions (`npm run test:version-verifier`), and a local-only `npm run dev -- version` runner CLI command.

### Changed

- AI onboarding redesigned into role-specific generated pairs: `Web_AI_Prompt.md`/`Web_AI_Bootstrap.md` for high-level project AIs and `VSC_AI_Prompt.md`/`VSC_AI_Bootstrap.md` for repository-attached engineer AIs.

### Fixed

- ChatGPT browser-evaluated detection scripts restored to valid standalone JavaScript (live `page.evaluate` SyntaxError during completion detection and extraction) and guarded against transpiler `__name` injection, with deterministic script-validity assertions.
- Claude response filtering no longer rejects a clean, short, visible answer as a parent container when its raw text already equals its cleaned text (live `Claude OK` false-negative), with a deterministic regression case for the exact live geometry.
- Gemini response detection now prefers observed structural response containers over brittle sidebar/history geometry, preserving live `Gemini OK` answers in the mobile/narrow layout while still rejecting navigation text.
- Live exact-answer validation passed for ChatGPT, Claude, Gemini, Google AI Mode, DeepSeek, Grok, Perplexity, and Reka. Copilot was externally unavailable on a Microsoft 365 blocked page and is not counted as a live pass.

## [0.2.0] - 2026-07-10

v0.2.0 "Documented Foundation" — first tagged release (`v0.2.0`, commit `d6eb1a8`). Earlier development (initial Studio skeleton through native-runner introduction) was untagged; see `Documentation/Handoffs/2026-07-10 - Native Runner Foundation Milestone.md` for the full milestone record.

### Added

- Native Runner: Node + TypeScript + Playwright engine with HTTP server (`/health`, `/providers/status`, `/ask`, `/inspect`, `/cancel-all`, `/chain`, `/run-random`) and CLI over one core.
- Nine participant drivers (ChatGPT, Claude, DeepSeek, Gemini, Google AI Mode, Grok, Copilot, Perplexity, Reka) with candidate-based extraction and logged rejection reasons.
- Two browser execution modes: persistent Playwright profile and CDP attach to an external Chrome (`runner/restart-runner.ps1`).
- Seven deterministic provider filter regression suites (claude, gemini, google, grok, copilot, deepseek, reka).
- Diagnostics vocabulary, failure artifacts in `runner/debug/`, and `inspect` tooling.
- Maestriss Studio (nine pages) with project JSON, prompt-pack, session-transcript, and Automa workflow exports.
- Documentation knowledge system: 16-document Reference library in Human and AI editions, Knowledge System Guide, handoffs, and reviews, plus a docs-vs-code reconciliation audit.
