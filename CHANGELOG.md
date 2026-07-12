# Changelog

All notable changes to Maestriss are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Maestriss follows Semantic Versioning 2.0.0 with the pre-1.0 interpretation defined in `Documentation/Reference/Human/12 - Development Workflow and Engineering Standards.md` (Versioning and Release Policy). Studio, the Native Runner, the Automa exporter, participant drivers, and the Engineering Library ship as one Maestriss release train under one canonical version, owned by the root `package.json`.

Ordinary development accumulates under `Unreleased`. Entries move into a dated release section only when a release is approved by a human, and Git tags (`vMAJOR.MINOR.PATCH`) are created only for approved release commits.

## [Unreleased]

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
