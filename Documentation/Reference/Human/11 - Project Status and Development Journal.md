---
Document ID: REF-11
Document Title: Project Status and Development Journal
Version: v0.2.0
Revision Date: 2026-07-10
Status: Authoritative Reference
Audience: Human
Purpose: Human-oriented edition of the Maestriss engineering reference for Project Status and Development Journal.
Scope: Same engineering truth as the corresponding AI edition; optimized for comprehension, rationale, and maintainable human reading.
Related Documents:
  - ../AI/11 - Project Status and Development Journal.md
Related Modules: See document body for relevant source paths and modules.
Canonical Concepts Covered: See document body.
Current Implementation Status: See document body; source code remains authoritative for current implemented behavior.
---
# Project Status and Development Journal

## Table of Contents

1. [Purpose](#purpose)
2. [Current Project Snapshot](#current-project-snapshot)
3. [Current Milestones](#current-milestones)
4. [Participant Status](#participant-status)
5. [Recent Development Summary](#recent-development-summary)
6. [Major Engineering Decisions](#major-engineering-decisions)
7. [Outstanding Work](#outstanding-work)
8. [Known Issues](#known-issues)
9. [Regression History](#regression-history)
10. [Driver Evolution](#driver-evolution)
11. [Testing History](#testing-history)
12. [Documentation Progress](#documentation-progress)
13. [Future Development Queue](#future-development-queue)
14. [Technical Debt](#technical-debt)
15. [Lessons Learned](#lessons-learned)
16. [Release History](#release-history)
17. [Current Priorities](#current-priorities)
18. [Daily Development Log](#daily-development-log)
19. [Health Dashboard](#health-dashboard)
20. [Project Constitution](#project-constitution)

## Purpose

This document is the living engineering journal and current status reference for Maestriss. It is intended to be updated continuously throughout the lifetime of the project.

The architectural reference documents describe stable principles, architecture, browser management, driver lifecycle, testing philosophy, and long-term vision. This document serves a different purpose. It records the current state of the project as it exists now and preserves the recent engineering history needed to continue development efficiently.

This should be the first document an engineer reads before beginning a development session. It should answer practical questions:

- What works?
- What does not work?
- What changed recently?
- What should be worked on next?
- What decisions were made?
- Why were those decisions made?

The document should remain concise enough to read quickly, but detailed enough to preserve important engineering context. It is acceptable for it to grow over time, provided new entries are organized chronologically and old information is reviewed periodically.

## Current Project Snapshot

This section is intended to be updated frequently.

**Last Updated:** 2026-07-11

**Overall Maturity:** Active development. The core architecture, runner, browser automation model, participant drivers, response filtering strategy, diagnostics, and reference documentation are established. The project is not yet a finished product, but its foundational engineering direction is clear.

**Current Architecture:** Maestriss uses a React/TypeScript/Vite Studio application and a native runner built around Playwright, Chrome DevTools Protocol, persistent browser profiles, participant tabs, provider-specific drivers, shared orchestration, diagnostics, and regression tests.

**Automation Status:** Browser automation is operational across the supported participant set. Drivers exist for ChatGPT, Claude, DeepSeek, Gemini, Google AI Mode, Grok, Copilot, Perplexity, and Reka Chat. Driver maturity varies by provider.

**Testing Status:** Build verification is active. Provider-specific filter and regression tests exist for several drivers, with Perplexity still needing fuller dedicated filter assertion coverage. Live smoke tests are used to validate exact-answer asks against provider pages.

**Documentation Status:** The Documentation/Reference series is substantially developed. Documents 01 through 16 define design philosophy, system architecture, driver lifecycle, browser management, response detection, testing, participant drivers, browser automation, diagnostics, future vision, project status, engineering standards, AI collaboration, operations, engineering commentary, and redirect compatibility for older AI onboarding links. The AI onboarding artifacts are role-specific: `Web_AI_Prompt.md` and `Web_AI_Bootstrap.md` serve high-level project AI sessions, while `VSC_AI_Prompt.md` and `VSC_AI_Bootstrap.md` serve VS Code or repository-attached engineer AI sessions. These files are generated, non-authoritative guides for reasoning and boot procedure. New contributors should begin with `Start_Here.md` after selecting the appropriate role-specific onboarding pair. Milestone state transfers live in `Documentation/Handoffs/`; the current milestone is `2026-07-10 - Native Runner Foundation Milestone.md`.

**Known Stability:** The core runner and several drivers are stable enough for continued development and smoke testing. Provider UI changes remain the primary ongoing risk.

**Overall Readiness:** Maestriss is ready for continued driver hardening, workflow expansion, Studio integration, regression growth, and structured orchestration work.

## Current Milestones

| Milestone | Status | Completed | Notes |
| --- | --- | --- | --- |
| Runner Architecture | Active | Substantially | Server, CLI, browser session, request lifecycle, health checks, and cancellation foundation exist. |
| Participant Drivers | Active | Partially | Nine supported participants have drivers; maturity varies by provider. |
| Shared Driver Framework | Active | Substantially | Common lifecycle exists; continued extraction of safe shared helpers is expected. |
| Browser Session Support | Active | Substantially | CDP-attached Chrome and Playwright-managed persistent Chromium modes are implemented. |
| Regression Testing | Active | Partially | Provider filter assertions exist for several drivers; expansion should continue. |
| Diagnostics | Active | Substantially | Candidate diagnostics, geometry, screenshots, HTML artifacts, and lifecycle logs exist. |
| Browser Automation | Active | Substantially | Tab reuse, tab focus, participant opening, and browser diagnostics are implemented. |
| Documentation | Active | Substantially | Core reference series is in place and should be maintained. |
| Roundtable Engine | Planned | No | Future orchestration layer for multi-participant dialogue. |
| Prompt Pipeline | Planned | No | Future structured prompt construction and transformation pipeline. |

## Participant Status

| Participant | Submission | Completion Detection | Extraction | Filtering | Diagnostics | Overall Stability | Known Issues | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ChatGPT | Active | Active | Active | Established | Active | Active | Provider UI changes remain possible; live submission and extraction smoke testing remains important. | Dedicated assertions cover response filtering, browser-script validity, and submission-evidence rules; live exact-answer validation passed on 2026-07-11. |
| Claude | Established | Established | Established | Established | Established | Established | Narrow viewport geometry required regression hardening. | Strong diagnostics and regression coverage. |
| DeepSeek | Established | Active | Active | Established | Active | Active | Continued live validation needed. | Overlay handling and geometry diagnostics are important. |
| Gemini | Active | Established | Established | Established | Established | Established | Submission verification should continue to be strengthened; response structure must remain preferred over brittle layout assumptions. | Dedicated detector and filter regressions exist; live exact-answer validation passed on 2026-07-11 after structural response detection hardening. |
| Google AI Mode | Established | Established | Established | Established | Established | Established | Must remain in AI Mode; ordinary search extraction is invalid. | Consecutive exact-answer smoke tests have passed. |
| Grok | Established | Active | Active | Established | Active | Active | Capacity/runtime states require continued attention. | Overlay and runtime diagnostics are important. |
| Copilot | Established | Established | Established | Established | Established | Active | Static status text must not be treated as active stop controls; Microsoft 365 can externally block the chat surface, leaving no composer. | Stop detection is regression-backed. On 2026-07-11, Copilot was unavailable at `/chat/blocked` and was not counted as a live pass. |
| Perplexity | Active | Active | Active | Active | Active | Active | Overlay behavior can affect submission; filtering is inline rather than a dedicated assertion-backed module. | Source-oriented UI requires careful filtering. |
| Reka Chat | Established | Active | Active | Established | Established | Active | Coordinate submission remains an important area to monitor; polling diagnostics can briefly surface stale-looking content before final extraction. | Detailed coordinate and event diagnostics exist; live exact-answer validation passed on 2026-07-11. |
| Future Participant | Planned | Planned | Planned | Planned | Planned | Planned | To be defined. | Add new participants here as they are introduced. |

## Recent Development Summary

Entries should be added chronologically, newest at the top.

### 2026-07-13

**Area:** Council Flavour-Override Integration

**Summary:** Integrated editable role flavour text into the Council configuration contract. `CouncilConfiguration` gains an optional compact `roleFlavourOverrides` record (customized roles only, validated against the role library), effective role framing resolves council override first and canonical text otherwise, preset factories accept overrides as a build option, and the Role Grimoire projects its browser-local edits into that portable shape via a shared converter plus a copy-as-JSON control. Light role intensity remains the fixed one-liner regardless of overrides.

**Outcome:** Council suite grew to 171 assertions (override validation, resolution precedence, preset embedding/compactness, envelope-to-record conversion); runner and Studio builds pass and prompts without overrides remain byte-identical. Execution never reads browser-local state — customizations take effect only through a configuration's `roleFlavourOverrides`.

**Lessons Learned:** Keeping the portable execution shape (a plain record) distinct from the editing envelope (versioned localStorage document), with one shared resolution core underneath, gives portability without duplicating canonical text into every configuration.

### 2026-07-13

**Area:** Council Role Flavour Text and Role Grimoire

**Summary:** Separated council role flavour text (the provider-facing behavioral prompt content) from structural role metadata. `shared/council/roleFlavourText.ts` is now the single canonical source, keyed by stable role id, consumed by the Runner prompt-composition pipeline and by a new Studio "Role Grimoire" page that lists every role (fantasy title with the practical title always visible), edits its flavour text, previews the exact provider-facing instruction at full and light intensity through the same shared rendering function composition uses, and saves edits as versioned local-browser overrides with revert-to-canonical.

**Outcome:** Composed prompts are byte-identical to before the refactor (the locked prompt snapshot passed unchanged). The council suite grew to 158 assertions, adding role/flavour bijection, override immutability, revert semantics, and versioned persistence parsing; runner and Studio builds pass, with Studio consuming `shared/council/` for the first time. Local overrides do not affect Runner execution yet — the Runner uses canonical text only until Council Scroll embedding.

**Lessons Learned:** Keeping the override envelope pure and storage-agnostic in shared code lets browser persistence be tested deterministically from the runner suite; only trivial localStorage I/O lives in Studio. Migrating prompt text between modules is safest under an exact-prompt snapshot assertion that must not change.

### 2026-07-13

**Area:** Council Architecture (Slice 1)

**Summary:** Implemented the shared council orchestration contract in `shared/council/`: the canonical provider registry (the runner's execution-verified identities become the single roster source), a six-role library with practical provider-facing framings, three deterministic preset factories (Council of X, Trial by Fire, The Editorial Court), the versioned Council Configuration schema (`schemaVersion: 1`) with a deterministic validator, council rules, behavioral variables, input/output/failure-policy vocabularies, prompt budgets, and the deterministic prompt-composition pipeline. The runner's participant roster now re-exports the shared registry with no behavioral change, and the dormant `WorkflowDefinition` graph types plus the sample workflow JSON were retired after a repository-wide reference check confirmed they had no consumer.

**Outcome:** `npm run test:council` (126 deterministic assertions), the runner build (now emitting `dist/runner/src` and `dist/shared`), the root build, all nine provider filter suites, the baton suite, and the version verifier pass. No live council execution exists yet; execution, persisted run records, Studio vocabulary migration, and the graphical Council Composer are later slices.

**Lessons Learned:** Compiled-entry depth assumptions (`dist/index.js`) break when a build gains a second source root; resolving the runner package root by walking up to the nearest `package.json` made the CLI location-independent. The refusal-safe wording discipline learned from the live baton refusal is now enforced by assertions over every provider-facing council sentence rather than by convention.

### 2026-07-11

**Area:** Release Validation

**Summary:** Prepared the accepted reliability, regression, onboarding, and versioning work for Maestriss v0.2.1. Live exact-answer validation returned the requested answer for ChatGPT, Claude, Gemini, Google AI Mode, DeepSeek, Grok, Perplexity, and Reka.

**Outcome:** Eight live providers passed exact-answer smoke validation. Copilot was externally unavailable at the Microsoft 365 `/chat/blocked` surface, showed no composer, and is not counted as a pass. ChatGPT, Claude, and Gemini live regressions were fixed and confirmed before release preparation.

**Lessons Learned:** Live validation should distinguish Maestriss driver failures from external provider/session availability. Provider-unavailable page text should not be allowed to masquerade as a successful answer in future Copilot hardening, and Reka's stale-looking wait diagnostics deserve a focused follow-up if they recur.

### 2026-07-11

**Area:** Versioning and Release System

**Summary:** Established the Maestriss versioning and release policy: Semantic Versioning 2.0.0 with a documented pre-1.0 interpretation, the root `package.json` as the single canonical version owner, one release train for Studio, Native Runner, Automa exporter, drivers, and the Engineering Library, a Keep-a-Changelog `CHANGELOG.md`, a read-only version verifier with deterministic fixture assertions, and a local-only runner `version` CLI command. Stale lockfile version fields were reconciled from 0.1.0 to 0.2.0.

**Outcome:** `npm run verify:version`, `npm run test:version-verifier`, runner build, and `npm run dev -- version` all pass. The normative policy lives in Reference document 12 (Versioning and Release Policy); document metadata `Version:` fields are defined as per-document revision identifiers independent of the release version.

**Lessons Learned:** Version surfaces drift silently when nothing reconciles them mechanically — both lockfiles still carried 0.1.0 from before the v0.2.0 release. A small deterministic verifier makes every version display derive from or reconcile with one canonical owner.

### 2026-07-11

**Area:** ChatGPT Driver

**Summary:** Hardened ChatGPT submission verification so click, keyboard Enter, and event-based Enter strategies must produce accepted-submission evidence before the driver returns success.

**Outcome:** ChatGPT submission now observes composer clearing, prompt-visible-as-user-message state, stop-control visibility, or assistant response candidate change. Deterministic ChatGPT assertions include submission-evidence cases and runner build verification passes.

**Lessons Learned:** Provider-local submission logic should follow the same evidence standard as mature drivers: a click or keypress is only an attempt, not proof that the provider accepted the prompt.

### 2026-07-11

**Area:** ChatGPT Driver

**Summary:** Added a dedicated ChatGPT response-filtering module and deterministic filter assertion suite, then wired ChatGPT extraction through provider-specific cleaning, prompt rejection, chrome rejection, and parent-container geometry checks.

**Outcome:** ChatGPT now has provider-specific deterministic response-filter coverage. Runner build verification and the new ChatGPT filter assertion script pass.

**Lessons Learned:** Even baseline drivers benefit from explicit provider-local filtering because selector-only extraction cannot encode prompt rejection, chrome cleanup, or parent-container rejection as durable project knowledge.

### 2026-07-10

**Area:** Reference Documentation

**Summary:** Created the core reference document series (now housed in `Documentation/Reference/`) covering design philosophy, system architecture, driver lifecycle, browser management, response detection, testing, participant drivers, browser automation, diagnostics, future roadmap, and this project journal.

**Outcome:** Future engineers now have a durable project knowledge base before entering the source code.

**Lessons Learned:** Permanent documentation reduces reliance on memory and preserves architectural intent.

### 2026-07-10

**Area:** Google AI Mode Driver

**Summary:** Hardened Google AI Mode opening, composer handling, prompt verification, submission verification, AI Mode preservation, response detection, filtering, and diagnostics.

**Outcome:** Consecutive exact-answer Google smoke tests returned `Google OK`.

**Lessons Learned:** AI Mode extraction requires dedicated detection and must not rely on ordinary Google Search text.

### 2026-07-10

**Area:** Claude Driver

**Summary:** Fixed response geometry regression where valid Claude answers in a narrow viewport were incorrectly rejected as page or transcript parent containers.

**Outcome:** Claude filter tests and build verification passed.

**Lessons Learned:** Geometry is evidence, not dogma. Parent rejection should rely on stronger evidence such as size, chrome, prompt content, or smaller valid child candidates.

### 2026-07-10

**Area:** Gemini Driver

**Summary:** Improved Gemini response diagnostics, candidate geometry handling, cleaning, and browser-evaluated detector safety.

**Outcome:** Gemini filter tests and build verification passed after detector hardening.

**Lessons Learned:** Browser-evaluated detector code must avoid transformed runtime artifacts and should emit structured candidate diagnostics.

### 2026-07-10

**Area:** Runner Browser Experience

**Summary:** Added active participant tab focusing and polished participant-opening logs.

**Outcome:** Users can watch participant tabs become active as asks execute.

**Lessons Learned:** Browser visibility is a user experience feature and a debugging feature.

## Major Engineering Decisions

| Decision | Date | Reason | Alternatives Considered | Expected Benefits | Future Review Needed |
| --- | --- | --- | --- | --- | --- |
| Use browser automation as the primary provider interaction model. | 2026-07-10 | Providers expose important behavior through web products and persistent user sessions. | API-only integration. | Provider independence, human visibility, access to real product surfaces. | Review when API support becomes broad and equivalent. |
| Use provider-specific participant drivers behind a common lifecycle. | 2026-07-10 | Provider interfaces differ too much for a single generic driver. | Universal driver. | Isolation of quirks, maintainable specialization, shared orchestration. | Review only if a truly common provider protocol emerges. |
| Keep browser lifecycle in shared infrastructure. | 2026-07-10 | Drivers should not duplicate tab management or browser ownership. | Driver-owned browser management. | Consistent tab reuse, focus, startup, diagnostics. | Continue enforcing as new drivers are added. |
| Use candidate-based response detection and filtering. | 2026-07-10 | AI websites contain many plausible text nodes. | Single-selector extraction. | Better false-positive and false-negative control. | Continue improving with provider evidence. |
| Treat diagnostics as first-class architecture. | 2026-07-10 | Browser automation failures require evidence. | Minimal logging. | Faster debugging, safer maintenance, better regressions. | Expand structured diagnostics over time. |
| Convert discovered bugs into regressions where practical. | 2026-07-10 | Provider edge cases recur unless preserved. | Manual memory or comments only. | Permanent project knowledge. | Continue expanding test coverage. |
| Focus active participant tabs by default. | 2026-07-10 | Users benefit from watching prompts, submissions, and responses. | Background-only execution. | Transparency, debugging, confidence. | Review for parallel execution workflows. |

## Outstanding Work

### Critical

| Description | Priority | Estimated Effort | Dependencies | Notes |
| --- | --- | --- | --- | --- |
| Keep provider smoke tests passing after driver changes. | Critical | Ongoing | Active browser sessions and provider availability. | Smoke tests are the fastest signal of live driver health. |

### High Priority

| Description | Priority | Estimated Effort | Dependencies | Notes |
| --- | --- | --- | --- | --- |
| Expand filter regression coverage for every provider. | High | Medium | Existing provider filters. | Each driver should have acceptance, rejection, cleanup, and geometry cases where relevant. |
| Normalize diagnostics across drivers. | High | Medium | Existing logging patterns. | Logs should use consistent terminology and lifecycle step names. |
| Continue hardening active drivers with live smoke tests. | High | Ongoing | Browser availability and provider sessions. | Prioritize providers with weaker maturity. |

### Medium Priority

| Description | Priority | Estimated Effort | Dependencies | Notes |
| --- | --- | --- | --- | --- |
| Build richer provider health checks. | Medium | Medium | Driver readiness logic. | Health checks should detect readiness before workflow execution. |
| Improve run history and workflow visibility in Studio. | Medium | Large | Studio UI and runner API design. | Connect graphical configuration to native runner state. |
| Define prompt pipeline architecture. | Medium | Medium | Workflow model. | Needed before advanced orchestration. |

### Low Priority

| Description | Priority | Estimated Effort | Dependencies | Notes |
| --- | --- | --- | --- | --- |
| Add structured metrics collection. | Low | Medium | Logging and run history. | Useful after driver stability improves. |
| Add richer artifact indexing. | Low | Medium | Debug artifact conventions. | Helps long-term diagnostics. |

### Future Ideas

| Description | Priority | Estimated Effort | Dependencies | Notes |
| --- | --- | --- | --- | --- |
| Parallel participant execution. | Future | Large | Concurrency model, focus policy, workflow engine. | Should follow driver stabilization. |
| Plugin architecture. | Future | Large | Stable core interfaces. | Needs careful boundary design. |
| Remote browser execution. | Future | Large | Browser abstraction and security model. | Long-term deployment option. |

## Known Issues

| Issue | Severity | Affected Components | Current Understanding | Temporary Workaround | Permanent Fix | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Provider UI changes can break drivers. | High | All drivers | External websites are unstable integration surfaces. | Use smoke tests and diagnostics to identify changes. | Continue adding resilient detection and regressions. | Ongoing |
| Authentication state can expire. | Medium | Browser sessions, all providers | Maestriss relies on persistent user-authenticated browser sessions. | User manually reauthenticates in browser. | Better health checks and clearer login diagnostics. | Ongoing |
| Driver maturity is uneven. | Medium | Participant drivers | Some drivers have deeper diagnostics and regression coverage than others. | Prioritize live smoke testing before workflows. | Expand provider-specific tests and diagnostics. | Ongoing |
| Parallel execution is not yet a primary workflow. | Low | Orchestration | Current workflows are primarily sequential. | Use sequential workflows. | Design concurrency model. | Planned |

## Regression History

| Date | Component | Problem | Root Cause | Resolution | Regression Test Added | Lessons Learned |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-07-10 | Claude filtering | Valid `Claude OK` answer rejected in narrow viewport. | Width and x-position geometry assumptions were too strict. | Accepted narrow valid child candidates and rejected parents using stronger evidence. | Yes | Geometry is evidence, not dogma. |
| 2026-07-10 | Google AI Mode filtering | Google returned visible answer but extraction selected chrome or old text. | AI Mode response candidates were mixed with search UI, feedback, and suggestions. | Added dedicated AI Mode detector, cleaning, scoring, and filter assertions. | Yes | Exact-answer smoke tests expose full lifecycle failures. |
| 2026-07-10 | Gemini detector | Browser-evaluated detector failed or lacked useful diagnostics. | Browser-side evaluate logic and candidate selection were insufficiently robust. | Added safe detector script, diagnostics, geometry fixes, and filter assertions. | Yes | Detector code must be safe inside browser context. |
| 2026-07-09 | Copilot wait logic | Static stopped-generation text blocked completion. | Static status text was treated like an active stop control. | Count only active clickable stop controls. | Yes | Active controls and historical labels are different signals. |

## Driver Evolution

### ChatGPT

**Major Milestones:** Implemented core lifecycle with composer discovery, paste verification, verified send-button and keyboard submission, stop-aware completion, extraction, dedicated ChatGPT filtering, and provider-specific filter assertions.

**Important Fixes:** Added provider-specific cleaning, prompt rejection, chrome rejection, parent-container geometry rejection, short-answer acceptance regressions, and deterministic submission-evidence assertions.

**Architecture Improvements:** Uses common driver lifecycle and structured participant response path while keeping ChatGPT response-filtering and submission-evidence behavior isolated in provider-specific code.

**Lessons Learned:** ChatGPT remains a useful baseline driver but still requires live validation because UI changes can affect composer and message layout.

**Future Work:** Continue smoke testing after provider UI changes and refine submit evidence if ChatGPT changes composer or message layout.

### Claude

**Major Milestones:** Implemented robust composer discovery, coordinate-aware submission, stop and responding diagnostics, response candidate detection, and provider-specific filtering.

**Important Fixes:** Added transient thinking cleanup and narrow-viewport geometry regression fix.

**Architecture Improvements:** Strong structured diagnostics around composer boxes, submit candidates, response candidates, and rejection reasons.

**Lessons Learned:** Claude response containers can shift significantly with viewport size; smaller valid child candidates should win.

**Future Work:** Continue smoke testing after provider UI changes.

### DeepSeek

**Major Milestones:** Implemented overlay handling, composer discovery, coordinate-aware submission, response filtering, and diagnostics.

**Important Fixes:** Provider-specific chrome and sidebar filtering.

**Architecture Improvements:** Uses geometry and provider-specific submission diagnostics.

**Lessons Learned:** Blocking overlays and sidebars are important false-positive risks.

**Future Work:** Increase filter and geometry regression coverage.

### Gemini

**Major Milestones:** Implemented safe shared detector, response diagnostics, Gemini-specific filtering, and geometry handling.

**Important Fixes:** Accepted central response candidates that were previously rejected by geometry assumptions.

**Architecture Improvements:** Wait and extraction share a safe detector.

**Lessons Learned:** Google product surfaces can include substantial chrome that must be rejected without losing valid short answers.

**Future Work:** Continue hardening against layout changes.

### Google AI Mode

**Major Milestones:** Implemented AI Mode entry, AI Mode preservation, follow-up composer support, dedicated detector, cleaning, and consecutive smoke validation.

**Important Fixes:** Prevented ordinary Google Search extraction, handled feedback suffixes, and accepted focused `Google OK` candidates.

**Architecture Improvements:** Strong AI Mode diagnostics and provider-specific filter assertions.

**Lessons Learned:** Mode integrity is as important as response extraction.

**Future Work:** Add broader non-exact-answer smoke coverage when appropriate.

### Grok

**Major Milestones:** Implemented overlay handling, runtime/capacity detection, coordinate-aware submission, and filtering.

**Important Fixes:** Provider-specific filtering for status, upgrade, and runtime text.

**Architecture Improvements:** Diagnostics include provider runtime signals.

**Lessons Learned:** Provider availability and capacity states must be treated as first-class failure modes.

**Future Work:** Continue regression expansion around runtime and capacity cases.

### Copilot

**Major Milestones:** Implemented Microsoft 365 Copilot support, composer handling, submission fallbacks, active stop-control detection, and filtering.

**Important Fixes:** Static `Stopped generating` text no longer blocks completion.

**Architecture Improvements:** Stop candidate logging and static-status rejection.

**Lessons Learned:** Static page text must not be confused with active controls.

**Future Work:** Monitor changes between personal and work Copilot surfaces.

### Perplexity

**Major Milestones:** Implemented composer discovery, overlay-aware submission, completion detection, source-oriented extraction, and diagnostics.

**Important Fixes:** Source and related-content filtering.

**Architecture Improvements:** Live debug artifacts for empty response detection.

**Lessons Learned:** Research-oriented UI creates many non-answer candidates.

**Future Work:** Expand filter regressions and smoke validation.

### Reka Chat

**Major Milestones:** Implemented contenteditable composer support, DOM event prompt entry, coordinate submission, response detection, and detailed diagnostics.

**Important Fixes:** Coordinate click diagnostics and composer event sequencing.

**Architecture Improvements:** Strong debugging output for submit target selection.

**Lessons Learned:** Some providers require low-level input and coordinate strategies, but verification remains mandatory.

**Future Work:** Continue hardening coordinate submission and response extraction.

## Testing History

| Date | Area | Milestone | Notes |
| --- | --- | --- | --- |
| 2026-07-11 | ChatGPT | Added ChatGPT filter assertions. | Covered acceptance, prompt rejection, chrome cleanup, status labels, short answers, and parent-container geometry behavior. |
| 2026-07-10 | Google | Added Google filter assertions. | Covered acceptance, rejection, cleanup, chrome, status labels, and geometry behavior. |
| 2026-07-10 | Claude | Expanded Claude filter assertions. | Covered transient thinking labels, accessibility prefixes, prompt rejection, and geometry regression. |
| 2026-07-10 | Gemini | Added Gemini filter assertions. | Covered shell text, prompt rejection, accessibility prefixes, and geometry. |
| 2026-07-09 | Copilot | Added Copilot stopped-generation regression. | Protected completion logic from static status text. |
| 2026-07-09 | Build | Continued TypeScript build verification. | `npm run build` remains the baseline static verification. |

## Documentation Progress

| Document | Status | Last Reviewed | Needs Update | Notes |
| --- | --- | --- | --- | --- |
| 01 - Design Philosophies and Tenets.md | Complete | 2026-07-10 | Periodic | Foundational design philosophy. |
| 02 - System Architecture.md | Complete | 2026-07-10 | Periodic | Canonical architecture overview. |
| 03 - Driver Lifecycle Specification.md | Complete | 2026-07-10 | Periodic | Driver contract reference. |
| 04 - Browser and Tab Management.md | Complete | 2026-07-10 | Periodic | Browser/session/tab architecture. |
| 05 - Response Detection and Filtering Philosophy.md | Complete | 2026-07-10 | Periodic | Canonical response detection reference. |
| 06 - Testing and Regression Philosophy.md | Complete | 2026-07-10 | Periodic | Testing philosophy reference. |
| 07 - Participant Driver Reference.md | Complete | 2026-07-10 | Frequent | Should update when drivers change. |
| 08 - Browser Automation Architecture.md | Complete | 2026-07-10 | Periodic | Browser automation reference. |
| 09 - Testing, Validation, and Diagnostics.md | Complete | 2026-07-10 | Periodic | QA and diagnostics reference. |
| 10 - Future Roadmap and Vision.md | Complete | 2026-07-10 | Periodic | Strategic roadmap. |
| 11 - Project Status and Development Journal.md | Active | 2026-07-10 | Continuous | Living status document. |
| 12 - Development Workflow and Engineering Standards.md | Complete | 2026-07-10 | Periodic | Engineering workflow and standards reference. |
| 13 - Prompt Engineering and AI Collaboration.md | Complete | 2026-07-10 | Periodic | AI collaboration and prompt reference. |
| 14 - Operational Runbook.md | Complete | 2026-07-10 | Frequent | Operational procedures and troubleshooting reference. |
| 15 - Engineering Notes and Design Commentary.md | Complete | 2026-07-10 | Periodic | Engineering commentary and assessment. |
| Start_Here.md | Complete | 2026-07-10 | Frequent | Permanent documentation-library entry point for all contributors. |
| 16 - AI Session Bootstrap.md | Redirect | 2026-07-10 | Rare | Compatibility redirect to role-specific onboarding artifacts; do not maintain onboarding logic here. |
| Web_AI_Prompt.md | Generated Artifact | 2026-07-10 | Frequent | Non-authoritative operating prompt for high-level project AI sessions. |
| Web_AI_Bootstrap.md | Generated Artifact | 2026-07-10 | Frequent | Non-authoritative procedural boot sequence for high-level project AI sessions. |
| VSC_AI_Prompt.md | Generated Artifact | 2026-07-10 | Frequent | Non-authoritative operating prompt for VS Code or repository-attached engineer AI sessions. |
| VSC_AI_Bootstrap.md | Generated Artifact | 2026-07-10 | Frequent | Non-authoritative procedural boot sequence for VS Code or repository-attached engineer AI sessions. |

Milestone handoffs are tracked separately in `Documentation/Handoffs/` (current: `2026-07-10 - Native Runner Foundation Milestone.md`). Audits and reconciliation findings live in `Documentation/Reviews/`.

## Future Development Queue

### Near-Term

- Keep exact-answer smoke tests passing across all participants.
- Expand provider filter assertions.
- Normalize driver diagnostics.
- Improve provider health checks.
- Connect Studio UI more deeply to runner status and configuration.

### Medium-Term

- Build a configurable workflow engine.
- Add richer run history and inspection.
- Implement prompt pipeline architecture.
- Add structured provider health dashboard.
- Improve automated recovery for safe known failures.

### Long-Term

- Add parallel participant execution.
- Support multiple browser profiles.
- Support remote browser execution.
- Add plugin architecture.
- Add persistent project memory.

### Research

- Investigate accessibility-tree response detection.
- Investigate visual recognition for composer and response regions.
- Investigate adaptive selector learning with explicit diagnostics.

### Experimental

- AI council workflows.
- Moderator-driven roundtables.
- Weighted consensus workflows.
- Distributed runner pools.

## Technical Debt

| Description | Reason | Impact | Risk | Suggested Resolution | Priority |
| --- | --- | --- | --- | --- | --- |
| Driver diagnostics are not fully uniform. | Drivers matured at different times. | Harder cross-provider debugging. | Medium | Define common diagnostic vocabulary and retrofit providers incrementally. | High |
| Some providers have less regression coverage than others. | Regressions were added as bugs were discovered. | Known edge cases may be unevenly protected. | Medium | Add acceptance, rejection, cleanup, and geometry cases for every provider. | High |
| Workflow architecture is still early. | Driver and browser foundations came first. | Advanced orchestration is limited. | Medium | Design workflow engine after driver stability. | Medium |
| Studio and runner are not directly integrated yet. | Runner development advanced quickly and currently operates through CLI/server paths. | UI cannot yet launch native runner workflows or display live runner state directly. | Medium | Expose runner state and configuration through Studio. | Medium |
| Debug artifacts may need indexing. | Artifact capture exists before artifact management. | Long-term artifact browsing may become difficult. | Low | Add artifact metadata and run IDs. | Low |

## Lessons Learned

### Geometry Is Evidence, Not Dogma

**Situation:** Valid response candidates were rejected because viewport geometry changed.

**Observation:** Coordinates and widths can shift with responsive layouts.

**Conclusion:** Geometry rules must rely on stronger evidence than static thresholds.

**Engineering Principle:** Use geometry to inform decisions, not to replace validation.

### Static Text Is Not an Active Control

**Situation:** Static provider status text blocked completion.

**Observation:** Historical labels can resemble active stop controls.

**Conclusion:** Only active visible clickable controls should count as active stop signals.

**Engineering Principle:** Distinguish state from text.

### Exact-Answer Smoke Tests Are Powerful

**Situation:** Simple provider smoke tests exposed full lifecycle failures.

**Observation:** A prompt such as `Say exactly: Google OK` validates paste, submit, wait, extraction, and filtering.

**Conclusion:** Smoke tests should remain part of driver validation.

**Engineering Principle:** Simple tests can exercise complex systems when the expected result is unambiguous.

### Diagnostics Are Architecture

**Situation:** Provider extraction bugs were difficult until candidate diagnostics were added.

**Observation:** Candidate counts, geometry, previews, and rejection reasons made failures obvious.

**Conclusion:** Diagnostics must be designed, not improvised.

**Engineering Principle:** A system that explains failures is easier to improve.

## Release History

| Version | Date | Major Features | Important Fixes | Known Issues | Notes |
| --- | --- | --- | --- | --- | --- |
| v0.2.1 | 2026-07-11 | Role-specific AI onboarding/bootstrap redesign; ChatGPT filtering and submission verification; versioning and release verifier foundation. | ChatGPT browser-evaluation regression; Claude parent-container false-negative; Gemini structural/mobile response detection. | Copilot can be externally unavailable at Microsoft 365 `/chat/blocked`; Reka wait diagnostics may briefly select stale-looking content before final extraction. | Eight live exact-answer provider passes confirmed; Copilot unavailable externally and not counted as a pass. |
| v0.2.0 "Documented Foundation" | 2026-07-10 | Documentation reorganized into Documentation/Reference and Documentation/Reviews; docs-vs-code reconciliation audit; root README.txt and bootstrap.txt onboarding. | Stale documentation path references updated. | Doc-vs-code gaps catalogued in the reconciliation report remain open. | First named milestone version. |
| Unreleased Development | 2026-07-10 | Runner, participant drivers, browser automation, diagnostics, filter tests, Documentation/Reference documents. | Google AI Mode, Claude geometry, Gemini detector, Copilot stop logic. | Provider UI changes remain ongoing risk. | Active development state before formal release versioning. |

## Current Priorities

If an engineer had only one day to contribute, the highest-value work would be:

1. Run exact-answer smoke tests across all supported participants and update this journal with results.
2. Add or expand provider-specific filter regressions for any driver with weak coverage.
3. Normalize diagnostics for the least mature driver.
4. Improve runner-to-Studio visibility for participant status and run history.
5. Update this document with any new findings before ending the session.

## Daily Development Log

Add new entries at the top of this section.

### Template

**Date:** YYYY-MM-DD

**Work Completed:** Describe the completed work in complete prose.

**Problems Encountered:** Describe failures, confusion, provider changes, broken tests, or architectural concerns.

**Solutions:** Describe the fix or mitigation.

**Next Steps:** Describe the next recommended work.

### 2026-07-10

**Work Completed:** Created the initial living project status and development journal.

**Problems Encountered:** The project had substantial architecture and driver knowledge distributed across implementation work and reference documents, but no single living status document.

**Solutions:** Established milestone, participant, decision, issue, regression, testing, documentation, debt, lesson, release, priority, and daily-log sections.

**Next Steps:** Keep this document updated after every meaningful development session.

## Health Dashboard

Maturity scale:

- **1 - Early:** Conceptual or newly started.
- **2 - Developing:** Implemented in part; significant hardening required.
- **3 - Active:** Operational; continued validation needed.
- **4 - Established:** Reliable with diagnostics and regression support.
- **5 - Mature:** Stable over time with broad validation and maintenance history.

| Area | Maturity | Notes |
| --- | --- | --- |
| Architecture | 4 - Established | Core architecture and reference documents are in place. |
| Automation | 4 - Established | Browser automation works across supported participants; provider changes remain risk. |
| Drivers | 3 - Active | All current participants have drivers; maturity varies. |
| Testing | 3 - Active | Build and multiple filter suites exist; coverage should expand. |
| Diagnostics | 4 - Established | Strong diagnostics exist, though uniformity can improve. |
| Documentation | 4 - Established | Core reference series exists and should be maintained. |
| Maintainability | 3 - Active | Modular design is strong; technical debt remains manageable. |
| Performance | 3 - Active | Persistent browser reuse helps; parallelism and optimization are future work. |
| Reliability | 3 - Active | Exact-answer smoke tests and regressions support reliability; providers remain moving targets. |
| Overall | 3 - Active | Strong foundation; continued hardening and integration needed. |

## Project Constitution

Maestriss should improve continuously through small, disciplined changes.

Software quality comes from sustained maintenance, not occasional massive rewrites.

Every development session should leave the project easier to understand or more reliable.

Every difficult bug should become a lesson, diagnostic, regression, or documented issue.

This journal should remain current.

Architecture should guide development, but evidence should guide priorities.

Drivers should remain isolated and provider-specific.

Shared infrastructure should remain disciplined and reusable.

Diagnostics should remain a first-class feature.

Testing should grow with the project.

Known issues should be documented until resolved.

Technical debt should be recorded honestly.

Reference documents should be reviewed as architecture changes.

Future maintainers should be able to understand the project's current state before opening the source code.

Maestriss should become more reliable, more observable, and more maintainable with every development cycle.
