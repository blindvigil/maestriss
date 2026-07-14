---
Document ID: REF-02
Document Title: System Architecture
Version: v0.2.0
Revision Date: 2026-07-10
Status: Authoritative Reference
Audience: Human
Purpose: Human-oriented edition of the Maestriss engineering reference for System Architecture.
Scope: Same engineering truth as the corresponding AI edition; optimized for comprehension, rationale, and maintainable human reading.
Related Documents:
  - ../AI/02 - System Architecture.md
Related Modules: See document body for relevant source paths and modules.
Canonical Concepts Covered: See document body.
Current Implementation Status: See document body; source code remains authoritative for current implemented behavior.
---
# System Architecture

## Table of Contents

1. [Purpose](#purpose)
2. [High-Level Architecture](#high-level-architecture)
3. [Studio, Native Runner, and Automa Exporter](#studio-native-runner-and-automa-exporter)
4. [Overall Execution Flow](#overall-execution-flow)
5. [Shared Infrastructure](#shared-infrastructure)
6. [Driver Layer](#driver-layer)
7. [Browser Layer](#browser-layer)
8. [Participant Layer](#participant-layer)
9. [Request Processing Pipeline](#request-processing-pipeline)
10. [Diagnostics Architecture](#diagnostics-architecture)
11. [Testing Architecture](#testing-architecture)
12. [Error Handling Architecture](#error-handling-architecture)
13. [Extensibility](#extensibility)
14. [Architectural Principles](#architectural-principles)

## Purpose

Maestriss is an orchestration system for coordinating independent AI systems through a shared browser automation framework. Its architecture exists to make many different provider interfaces behave as reliable participants in a common workflow without pretending that those providers are identical.

At a high level, Maestriss accepts a request, resolves the intended participant, locates or opens the participant's browser tab, focuses that tab when configured to do so, delegates provider-specific interaction to a driver, waits for completion, extracts the response, cleans the response, and returns structured output. The same framework supports individual asks, chained workflows, random workflows, provider inspection, health checks, and regression-driven development.

The system is built around a clear separation of responsibilities. Shared infrastructure owns the lifecycle that is common to all participants. Drivers own the provider-specific details required to operate a particular web interface. Filtering modules own durable knowledge about provider-specific response text, shell text, status labels, and geometry regressions. Diagnostics and tests convert live failures into permanent project knowledge.

The architecture is intentionally browser-centered. Providers are operated through their web products using Chrome DevTools Protocol, persistent browser state, and Playwright automation. This allows Maestriss to coordinate real participant sessions while preserving user-visible behavior and provider-specific product capabilities.

## High-Level Architecture

Maestriss is composed of cooperating subsystems. Each subsystem has a narrow responsibility, and the boundaries between them are part of the architecture.

```text
                              +-------------------------+
                              | Reference Documentation |
                              +------------+------------+
                                           |
                                           v
+--------+       +--------+       +--------+--------+       +----------------+
|  CLI   +------>| Runner +------>| Runner Server  +------>| Browser Session|
+--------+       +--------+       +--------+--------+       +--------+-------+
                                           |                         |
                                           v                         v
                                  +--------+---------+      +--------+--------+
                                  | Participant      |      | Provider Tabs   |
                                  | Manager          |      | and Sessions    |
                                  +--------+---------+      +--------+--------+
                                           |                         ^
                                           v                         |
                                  +--------+---------+               |
                                  | Drivers          +---------------+
                                  +--------+---------+
                                           |
                                           v
                         +-----------------+------------------+
                         | Shared Driver Infrastructure       |
                         +-----------------+------------------+
                                           |
                         +-----------------+------------------+
                         |                                    |
                         v                                    v
              +----------+-----------+             +----------+-----------+
              | Response Filtering   |             | Diagnostics          |
              +----------+-----------+             +----------+-----------+
                         |                                    |
                         v                                    v
              +----------+-----------+             +----------+-----------+
              | Regression Tests     |             | Debug Artifacts      |
              +----------------------+             +----------------------+
```

The CLI is the command entry point for local operation. It accepts commands such as serving the runner, asking a participant, running a chain, running a random workflow, checking health, cancelling active requests, inspecting participants, and running development smoke tests through npm scripts.

The runner process contains the command-line entry point and starts or communicates with the runner server. It also defines runtime options such as browser channel, CDP connection, and active-tab focusing. When operating as a client, it sends HTTP requests to the local runner server. When operating as the server, it owns the browser session and request handling.

The runner server is the central orchestration layer. It exposes HTTP endpoints, manages active requests, owns cancellation, resolves participants, applies shared lifecycle behavior, focuses tabs, invokes drivers, collects responses, handles failures, and returns structured output.

The browser layer is the controlled browser environment. Maestriss can connect to an externally started Chrome instance over Chrome DevTools Protocol or launch a Playwright-managed persistent Chromium profile. The browser contains the real provider sessions, login state, user account state, and live participant interfaces.

The participant manager is responsible for registered participant metadata and page resolution. It knows which participants exist, what URL each participant prefers, and how existing tabs are matched or reused.

Drivers are provider-specific automation modules. Each driver knows how to interact with one provider's web surface. Drivers implement provider-specific readiness, composer discovery, prompt entry, submission, completion detection, response extraction, response cleaning, and diagnostics.

Shared driver infrastructure includes common lifecycle concepts, browser evaluation patterns, timeout handling, debug artifact creation, cancellation-safe execution, tab focusing, and common diagnostic shapes. These capabilities are shared where behavior is genuinely common.

Response filtering is the provider-specific layer that turns messy page text into a clean response. It rejects prompts, shell text, status labels, navigation, source cards, feedback controls, and known non-answer text. It also encodes regressions discovered during live development.

Diagnostics are a first-class subsystem. Logs, screenshots, saved HTML, candidate dumps, geometry dumps, rejected-candidate reasons, and provider-specific failure artifacts make browser automation maintainable.

Regression tests preserve discovered knowledge. Filter tests, geometry tests, smoke tests, and build verification prevent the system from forgetting known provider behaviors.

Reference documentation records architectural decisions, design philosophy, and system structure so future contributors can work from stable project knowledge rather than reconstructed context.

## Studio, Native Runner, and Automa Exporter

Maestriss currently contains three related but distinct implementation surfaces: Maestriss Studio, the native runner, and the Automa exporter.

Maestriss Studio is the React, TypeScript, and Vite graphical application. It contains the project configuration experience, participant and profile editing surfaces, workflow-oriented UI, run-history views, prompt templates, and export controls. It is the intended long-term configuration and operating surface for users.

The native runner is the Playwright-based automation service in `runner/`. It owns live browser execution today. It provides the CLI, local HTTP server, participant resolution, browser session management, driver invocation, response extraction, diagnostics, and smoke-testable ask workflows.

The Automa exporter is a Studio-side export adapter. It generates Automa workflow artifacts from Maestriss configuration and reference fixtures. It is not the same runtime as the native runner. Automa export support and native runner support should be treated as sibling execution paths that can share product concepts while maintaining separate implementation details.

Current integration is limited. The Studio application does not yet directly call the native runner server for live execution, provider health, run history, or participant status. The runner can be operated independently through its CLI and local server. Studio-to-runner integration is future work and should not be assumed by operators or engineers reading the current code.

The participant roster and prompt-template vocabulary have historically existed in more than one place. The runner's participant metadata now derives from the shared canonical provider registry in `shared/council/`; Studio still carries its own participant defaults, prompt-variable catalog, and exporter-oriented prompt construction. The remaining duplication is a known transitional state. Studio's planned migration onto the shared vocabulary should consolidate or explicitly map these concepts so configuration and execution remain consistent.

### Council Orchestration Contract

Maestriss defines a shared council orchestration contract in `shared/council/`: plain TypeScript consumed by both the Studio build and the runner build, with no React, Playwright, browser, or driver dependencies. It owns the canonical provider registry (the execution-verified runner identities), the sixteen-Calling library (`callings.ts`), the canonical Calling flavour-text library (`callingFlavourText.ts`), the six cognitive stats and their deterministic instruction catalog (`cognitiveStats.ts`, `cognitiveGuidance.ts`), the sixteen built-in Doctrines (`doctrines.ts`: Realm Summit, Dream Lab, Crucible, Imperial Court, Crown Council, Arcane Expedition, Scholar's Conclave, Grand Academy, Decision Chamber, Trial by Fire, War Room, Workshop, Oracle's Table, Creation Chamber, Socratic Circle, Grand Campaign), the versioned Council Configuration schema (`schemaVersion: 1`; fantasy name: Council Scroll), council rules, the remaining behavioral variables (Calling intensity and input mode), input/output/failure-policy vocabularies, prompt budgets, and the deterministic prompt-composition pipeline. Fantasy titles are presentation only; provider-facing prompt text uses practical, constructive wording and is covered by refusal-safety assertions.

Canonical vocabulary: a Doctrine defines the intended cognitive workflow and purpose of a Council and provides a default Formation; a Formation is the ordered composition of seats; each seat is assigned a Calling (the behavioral lens) and a provider (the AI that holds the seat); the configured whole is a Council. The same Calling may hold several seats, the same provider may hold several seats, Calling identity and provider identity are independent, and a Calling's Suggested AI plus its broader provider affinity are soft recommendations — never validity constraints, and never substituted for a Formation's assigned provider during execution. Built-in Doctrines are expert-designed, editable starting points that produce ordinary Council Configurations; a future user-created Council is simply a saved configuration under this same schema, typically authored by modifying a Doctrine's output. The superseded terms "preset" and "role" survive only in deliberately retained internal compatibility identifiers, not as product vocabulary.

Structural Calling metadata (ids, titles, descriptions, defaults, Suggested AI, affinity) is owned by `shared/council/callings.ts`; a Calling's Suggested AI is the single default best-fit provider (a soft recommendation, distinct from the broader ordered affinity list). The provider-facing Calling flavour text is owned separately by `shared/council/callingFlavourText.ts`, keyed by stable calling id. Effective Calling framing resolves in a fixed order: a configuration's own `callingFlavourOverrides` entry first, then the canonical library. A Council Configuration carries only explicitly customized Callings in that compact record — canonical defaults are never duplicated into configurations — so a saved configuration reproduces its customized behavior anywhere, and execution never depends on browser-local state. Studio's Calling Grimoire page edits flavour text against the canonical defaults: edits persist as versioned local-browser overrides for authoring convenience (deliberately under the legacy `maestriss.roleFlavourOverrides` storage key, with legacy calling ids migrated on parse), never modify the canonical source file, and take execution effect only when projected into a configuration's `callingFlavourOverrides` (the page provides that projection). Canonical text remains refusal-safety asserted; override wording is user-authored content and the author's responsibility, like custom rule text.

#### Cognitive Stats

Every Council seat resolves six canonical cognitive stats — Temperament (Precise ↔ Imaginative), Voice (Terse ↔ Expansive), Conviction (Adaptable ↔ Resolute), Dissent (Cooperative ↔ Adversarial), Depth (Swift ↔ Exhaustive), and Memory (Isolated ↔ Full Council). Each stat stores exactly one of ten deterministic levels, 0–9, where 0 is the strongest left extreme, 9 the strongest right extreme, and 5 is canonical neutral; arbitrary percentages are never stored. These are Maestriss behavioral dimensions, not provider API parameters: Temperament is not API temperature, Depth is not a reasoning-token budget, and Memory is not a native context window. Current execution drives provider web interfaces, so stats act only through deterministic provider-facing instructions and mechanical context exposure; a future API-backed execution layer may additionally map compatible stats onto native provider parameters, which is explicitly out of scope today.

Resolution uses exactly one pure shared function (`resolveCognitiveStats` in `shared/council/cognitiveStats.ts`) with a fixed four-layer precedence and no hidden layers: Formation seat override (`CouncilStage.cognitiveOverrides`) > Calling default (`CallingDefinition.cognitiveDefaults`, partial — only the dimensions that meaningfully define the Calling) > provider default (`providerCognitiveDefaults`, complete for all nine providers) > system neutral (all 5). Provider defaults are approved Maestriss product characterizations, not empirical claims about provider psychology; Google AI Mode deliberately uses neutral defaults. Suggested AI never participates in resolution — the provider assigned to the seat is authoritative. Approved choreography-sensitive seat overrides exist on Dream Lab's two Wild Mages, Trial by Fire's second Saboteur, Oracle's Table's second Oracle, Socratic Circle's second Sage, and every Crown Council Magistrate (Memory 0); Formations are otherwise deliberately not stat-tuned.

Cognitive guidance is a separate prompt layer from Calling flavour text: flavour text answers "what kind of thinker am I?" and remains independently editable canonical content, while guidance answers "how should I behave in this seat?" and is generated deterministically from a fixed, source-checked instruction catalog (`cognitiveGuidance.ts`, ten locked entries per prose stat). Injection is sparse: level 5 emits no instruction, only non-neutral resolved stats render a line in the "Cognitive guidance:" section (canonical order Temperament, Voice, Conviction, Dissent, Depth), an all-neutral seat renders no section at all, and raw stat numbers are never sent to a provider.

Memory is primarily mechanical. The input policy remains authoritative for eligibility and for original-request inclusion; the resolved Memory level only narrows how much eligible prior material is exposed and can never expand it (`independent-round` exposes zero at every level; `previous-only` never exceeds one; `last-n` never exceeds N). The deterministic mapping: 0 exposes nothing; 1–3 expose the newest eligible contribution at a quarter, half, and the normal per-contribution cap respectively; 4/6/7/8 expose up to the newest 2/3/4/6; 5 preserves current input-policy behavior exactly (regression-asserted); 9 exposes all eligible contributions within normal prompt budgets. Composition returns `resolvedCognitiveStats`, `eligibleContributionIds`, and `memorySelectedContributionIds` as diagnostic metadata for live Doctrine testing.

Migration: Voice is the canonical verbosity concept and Dissent the canonical challenge-posture concept; the superseded `responseLength` and three-level `dissent` variables were removed cleanly before any Council Scroll persistence shipped, with prior Doctrine dissent intent carried by Calling cognitive defaults and the approved seat overrides. Calling intensity (`roleIntensity`: full flavour text versus the light one-liner) and input mode remain deliberately separate from the cognitive stat model. The dedicated suite `npm run test:cognitive-stats` covers the vocabulary, defaults, resolution precedence, catalog, sparse injection, Memory mechanics, migration, Doctrine overrides, and exact prompt snapshots.

Crown Council is the one size-configurable Doctrine (2–12 seats, default 4). Equal deliberation is a Doctrine mechanic, not a Calling: every seat holds the Magistrate Calling, deliberates independently in one shared round, and default providers are distributed across seats in canonical registry order so no provider is senior to another. Explicit voting semantics (casting, tallying, persistence, ties, reporting) remain future execution work, and any future non-voting synthesis or tally stage will be modeled separately rather than consuming a voting seat; until then a Crown Council run has no consolidated final stage and its last output is an individual opinion, never reported as a collective verdict.

Live Council execution is owned by the Runner. `npm run dev -- council run --doctrine <id> (--prompt "text" | --prompt-file path) [--size N] [--verbose]` builds the selected Doctrine's configuration, validates it, prints the Doctrine, Purpose, and Formation, then executes seats sequentially in Formation order over the existing `/ask` lifecycle. The execution engine (`runner/src/councilExecution.ts`) uses the baton test's injected-ask architecture, so provider drivers, response extraction, cancellation, and timeout semantics are reused — never duplicated or bypassed. Each seat's prompt is composed by the shared pipeline against the real prior contributions selected by its input policy, and the exact provider-facing prompt is preserved verbatim on the in-memory seat record (`--verbose` prints it before sending). Failure policies execute as defined: halt stops immediately and preserves all real prior contributions; retry-once re-sends the same exact prompt one time and halts if the retry also fails; skip-and-record records the failure and continues without forwarding anything from the failed seat. A run classifies as PASS (every seat succeeded), PARTIAL (reached the end with at least one skipped or failed seat), or FAIL (halted before completion). Contributions are only ever actual extracted provider responses — nothing is fabricated, matching the baton philosophy. Run state is in-memory only; persisted Council Records are the next slice, and Studio does not yet trigger execution.

The earlier dormant graph-based workflow scaffolding (`WorkflowDefinition`, `WorkflowNode`, `WorkflowEdge`, and the sample workflow JSON) was retired in favor of this contract after a repository-wide reference check confirmed nothing consumed it.

```text
                         +----------------------+
                         | Maestriss Studio     |
                         | React / TS / Vite    |
                         +----------+-----------+
                                    |
                current export path | future live integration
                                    |
                 +------------------+------------------+
                 |                                     |
                 v                                     v
       +---------+----------+                +---------+----------+
       | Automa Exporter    |                | Native Runner      |
       | Workflow Artifacts |                | CLI / HTTP Server  |
       +--------------------+                +---------+----------+
                                                        |
                                                        v
                                             +----------+----------+
                                             | Playwright Browser |
                                             | Session + Drivers  |
                                             +--------------------+
```

## Overall Execution Flow

A request flows through the system in a fixed high-level lifecycle. The lifecycle is intentionally explicit because every stage has a distinct responsibility and failure mode.

```text
CLI command
    |
    v
Runner client
    |
    v
Runner server endpoint
    |
    v
Participant resolution
    |
    v
Browser tab reuse or creation
    |
    v
Active tab focus
    |
    v
Manual security verification gate
    |
    v
Provider driver
    |
    +--> waitForReady
    |
    +--> pastePrompt
    |
    +--> submitPrompt
    |
    +--> waitForCompletion
    |
    +--> extractResponse
    |
    v
Response filtering and normalization
    |
    v
Structured response returned to CLI
```

The CLI command begins the request. For an ask, the user specifies a participant and prompt. The CLI validates the command shape, constructs the request body, and sends it to the runner server.

The runner server receives the request and allocates request state. It assigns a request identifier, records the active request, prepares cancellation handling, and identifies the driver that matches the requested participant.

Participant resolution maps the requested participant to registered metadata and an existing or new browser page. The resolver prefers reusing an existing participant tab when possible. For participants with multiple valid URL forms, the resolver applies provider-specific matching and preference rules while still keeping the resolution logic centralized.

The browser tab is reused or opened. Reuse is preferred because provider sessions, conversation state, authentication, and account state live in the browser. Opening a new tab is reserved for cases where no suitable reusable tab exists.

The active participant tab is brought to the front when focus is enabled. This makes the runner observable to the user and helps reveal unexpected provider states such as login pages, redirects, security checks, or changed layouts.

Before driver interaction, the runner may pause for manual security verification when a participant appears blocked by a human-verification flow. The user resolves the challenge in the browser and confirms in the runner terminal. This protects the driver lifecycle from submitting into a blocked provider page.

The provider driver then owns the provider-specific interaction. The server invokes the driver's lifecycle methods in order. The driver waits for the interface to become usable, finds the composer, enters the prompt, verifies the prompt, submits it, waits for completion, extracts the response, and returns normalized output.

Response filtering occurs inside or adjacent to the driver. The filter removes provider shell text, status labels, prompts, source labels, feedback text, and transient thinking labels. It preserves valid response content and returns cleaned text.

The final response is returned to the runner server, then to the CLI. If the request fails, the server returns a structured failure where possible and saves diagnostic artifacts when useful.

## Shared Infrastructure

Shared infrastructure contains behavior that is common across participants and should remain consistent across the project.

Browser connection belongs in shared infrastructure because all providers use the same browser automation foundation. The runner server owns the browser session, whether it launches a persistent browser profile or connects to an existing Chrome instance over CDP. Drivers should not create their own browser sessions.

Participant resolution belongs in shared infrastructure because tab reuse, URL matching, and participant lookup are cross-provider concerns. Drivers should not independently scan all browser tabs and decide whether to open duplicates. Centralized resolution keeps tab behavior predictable.

Tab reuse belongs in shared infrastructure because it affects user experience, browser state, and provider sessions. Reusing tabs preserves login state and avoids unnecessary browser clutter. Provider-specific matching rules can exist, but the act of resolving and reusing pages remains a shared concern.

Tab focusing belongs in shared infrastructure because it is part of the common ask lifecycle. Every participant should inherit the same watched-operation behavior. Individual drivers should not implement their own unrelated focus routines.

Logging belongs primarily in shared infrastructure for lifecycle stages and in drivers for provider-specific details. The server logs request stages such as opening, reusing, focusing, waiting, pasting, submitting, waiting for completion, and extracting. Drivers log composer strategies, response candidates, stop controls, and provider-specific diagnostics.

Timeouts belong partly in shared infrastructure and partly in drivers. The server owns request-level cancellation and participant-level timeout policy. Drivers own provider-specific completion waits and polling logic because providers expose different generation states.

Clipboard and paste handling should be shared when the same technique applies across providers, but drivers must remain free to use provider-specific composer behavior. Some providers use textareas, some use contenteditable regions, some require keyboard sequences, and some need direct DOM interaction.

Diagnostics infrastructure is shared because every driver needs a reliable way to save HTML, screenshots, and failure artifacts. The details of what triggers an artifact may be provider-specific, but the artifact pattern should remain consistent.

Common abstractions exist to preserve lifecycle consistency. Participant drivers expose methods such as `waitForReady`, `pastePrompt`, `submitPrompt`, `waitForCompletion`, and `extractResponse`. These names define the contract between the server and the driver layer.

Shared infrastructure should not become a dumping ground. A helper belongs in shared infrastructure only when it represents genuinely common behavior. Provider-specific quirks should remain inside provider drivers and filters.

## Driver Layer

The driver layer is the provider-specific automation boundary. A driver represents the knowledge needed to operate one AI provider as a participant. This includes recognizing the participant, identifying its usable page, waiting for readiness, locating the prompt composer, submitting prompts, detecting active generation, extracting responses, cleaning response text, and producing diagnostics.

Every provider owns its own driver because each provider's web interface is different. Even when two providers appear similar, their DOM structure, labels, composer behavior, stop controls, response containers, account states, and failure modes differ. A single generic driver would either become too weak to be reliable or too complex to maintain.

Drivers inherit common behavior through the server lifecycle rather than through forced uniformity. The server always resolves the participant, focuses the tab, and calls the same sequence of driver methods. Inside those methods, the driver is free to implement provider-specific logic.

The balance between reuse and specialization is deliberate. Reuse belongs in lifecycle orchestration, diagnostics patterns, test structure, and stable helper functions. Specialization belongs in composer discovery, response detection, status detection, filtering, provider-specific URL handling, and geometry interpretation.

Provider quirks should remain isolated. If one provider emits a static label that resembles an active stop control, that rule should not affect other providers. If another provider exposes valid answers as small left-aligned text nodes in a narrow viewport, that geometry rule belongs to that provider's detector or filter.

Drivers should be easy to inspect. A future engineer should be able to open a driver and understand how it finds the composer, how it submits, how it waits, how it chooses a response candidate, and what debug artifacts it saves when things go wrong.

## Browser Layer

Maestriss uses Playwright as its browser automation layer. The runner supports two browser execution modes: a Playwright-managed persistent Chromium profile and a CDP-attached Chrome process. CDP mode allows the runner to connect to an existing Chrome process, preserve a dedicated Chrome user profile, and operate provider pages through Playwright.

The browser lifecycle is managed by the runner environment. In CDP mode, the restart script stops old runner processes, starts Chrome with a remote debugging port, uses a dedicated user data directory, suppresses crash-restore friction where practical, and starts the runner server connected to the CDP endpoint. In persistent-profile mode, the runner launches a Playwright Chromium context using the runner's local `.user-data` directory.

Persistent profiles are important because provider sessions depend on browser state. Login state, cookies, account preferences, provider onboarding, and security verification status often live inside the browser profile. Starting from a fresh anonymous browser for every request would be slower, more fragile, and less representative of real user operation.

Tab reuse is preferred over launching new tabs for every request. Reuse preserves conversation state when appropriate, avoids duplicate tabs, reduces startup overhead, and keeps the browser manageable. The participant resolver decides whether an existing tab is suitable.

Opening new participants is still necessary when no reusable page exists. At server startup, the runner can open configured participant pages. During requests, it can open a participant tab on demand. Opening is centralized so that drivers do not create unmanaged browser state.

Recovery from crashes is handled at the operational layer. The restart script cleans up old runner and Chrome state, launches Chrome with a known profile and CDP port, and starts the runner server. This provides a predictable recovery path during development and live testing, but it can close unrelated Chrome windows because it terminates remaining `chrome.exe` processes.

Focus management is part of the browser layer's user experience. Bringing the active participant tab to the front allows users to watch prompt entry and generation. It also makes failures easier to diagnose because the visible browser state matches the active participant.

Startup cleanup prevents blank or irrelevant startup tabs from becoming part of the participant set. The runner closes blank startup tabs after connecting to Chrome and opening participants, keeping the browser focused on configured provider tabs.

Browser reuse is preferred because Maestriss is orchestrating real participant products. Reusing the browser makes the runner behave more like a careful human operator using established sessions rather than a stateless script repeatedly opening disposable pages.

## Participant Layer

A participant is a registered AI system that Maestriss can orchestrate. It is not merely a URL and not merely a model name. It is the project-level representation of an independent provider surface.

Participants are registered with metadata that includes an identifier, display name, and preferred URL. The identifier is used for stable internal matching. The display name is used in logs and user-facing output. The preferred URL defines where Maestriss should open the participant when no suitable existing tab is available.

URLs are provider-specific. Some providers have a single stable URL. Others have multiple valid surfaces or redirect patterns. The participant layer records preferred URLs, while the resolver and drivers handle valid URL variants where needed.

Matching determines whether an existing browser tab belongs to a participant. Matching may be simple hostname comparison for some providers, or more specialized for providers with multiple valid domains or modes. Matching must avoid false ownership, such as confusing one provider hosted on a large domain with another provider on the same parent domain.

Identification is separate from driver selection. The participant registry defines configured participants. The driver registry defines automation capabilities. A driver matches the participant it can operate. This separation allows metadata and automation logic to evolve independently.

Future extensibility depends on this layer remaining simple and explicit. Adding a provider should require adding participant metadata and a driver, not redesigning the orchestration system.

## Request Processing Pipeline

The request processing pipeline defines how responsibility moves through the system.

The CLI owns command parsing and user-facing output. It does not own browser state or provider logic. It sends requests to the server and prints returned responses.

The server owns request orchestration. It validates request bodies, manages active requests, handles cancellation, resolves participants, focuses tabs, invokes drivers, catches failures, saves failure artifacts when appropriate, and serializes responses.

The participant resolver owns browser page selection. It decides whether to reuse a tab or open a new one. It applies participant-specific matching rules while preserving a consistent interface for the server.

The browser owns the live external state. It contains provider pages, account sessions, conversations, and visible UI. The runner observes and manipulates this state through Playwright.

The driver owns provider interaction. It waits for the provider to be ready, finds the composer, enters the prompt, verifies the paste, submits the prompt, waits for completion, extracts the response, and applies provider-specific filtering.

Filtering owns response normalization. It decides whether candidate text is a valid answer, shell text, a prompt, a status label, or a parent container. It cleans valid text without rewriting the answer.

Diagnostics own observability. They record what the system did and what it saw at each meaningful step. Diagnostics may be emitted by the server, the driver, or shared helpers.

The response object owns the final contract. It contains the participant, question, answer, timing, citations where applicable, raw text, cleaned text, and optional raw HTML. This object is the structured output of the pipeline.

## Diagnostics Architecture

Diagnostics are first-class architecture because Maestriss operates against changing external web interfaces. Without diagnostics, failures would be opaque. With diagnostics, every failure becomes a source of durable knowledge.

Logging is the primary real-time diagnostic channel. The server logs lifecycle stages. Drivers log provider-specific details such as composer selector, composer strategy, prompt length, paste verification, submit strategy, response length, stability timing, stop visibility, generating state, selected candidate preview, and rejected candidate reasons.

Screenshots capture what a human would see. They are especially important when visible text is not captured by a detector, when a page redirects unexpectedly, when a security challenge appears, or when a provider changes layout.

Debug HTML captures the DOM at the time of failure. It allows maintainers to inspect selectors, text structure, hidden elements, accessibility attributes, and provider-specific markup after the live page has changed.

Candidate dumps expose response detection decisions. A good candidate dump includes candidate count, selected text, selected geometry, candidate previews, and rejected candidates with reasons. This is essential for fixing false positives and false negatives.

Geometry dumps explain visual selection. Coordinates, width, height, and relative position help distinguish prompts, answers, parents, sidebars, composer regions, and toolbars. Geometry is recorded because browser automation works against visual products, not stable response APIs.

Failure artifacts are saved when meaningful recovery or diagnosis requires evidence. Examples include composer-not-found artifacts, submit-failed artifacts, response-not-found artifacts, and provider-mode-unavailable artifacts.

Diagnostics are not optional debugging noise. They are part of how the system remains maintainable as providers evolve.

## Testing Architecture

Testing is part of the architecture because each test preserves knowledge about provider behavior.

Smoke tests verify live end-to-end behavior. They run real asks against real provider tabs and confirm that the system can open or reuse the participant, paste, submit, wait, extract, and return a correct response. Smoke tests are especially important for browser automation because live provider pages are the ultimate integration surface.

Driver-specific filter tests verify deterministic response cleaning and candidate rejection behavior. These tests do not require live provider pages. They capture known accepted text, known rejected shell text, mixed cleanup cases, status labels, prompt rejection, and geometry regressions.

Regression tests encode discovered bugs. If a provider once returned a valid short answer that was rejected, the fix should add a regression. If a provider once exposed a valid answer at a surprising geometry, the fix should add a geometry assertion. If a provider once attached chrome text to a valid answer, the cleaner should be tested.

Build verification ensures the TypeScript project remains coherent. A passing build is required after driver and infrastructure changes because provider drivers are part of the same runtime.

Testing fits into the architecture by turning live discoveries into stable project knowledge. The project becomes more robust as the test suite grows around real failure modes.

## Error Handling Architecture

Failures move through the system according to ownership boundaries. A driver failure is raised by the driver and caught by the server. A browser failure may occur during page evaluation, navigation, tab interaction, or screenshot capture. A timeout may be triggered by server-level request policy or driver-level completion waiting. A provider failure may be caused by login state, rate limits, security verification, unavailable modes, changed layouts, or network behavior.

Driver failures should be specific when possible. Errors such as composer not found, submit failed, response not found, provider mode unavailable, or security verification blocked are more useful than generic failures. Specific errors help users and maintainers understand whether the problem is provider state, page structure, or Maestriss logic.

Browser failures should preserve context. If a page evaluation fails because of navigation or destroyed execution context, retrying may be appropriate. If a screenshot cannot be saved, the runner should continue to report the main failure. If the browser disconnects, the server should expose that state through health and operational logs.

Timeouts should be treated as diagnostic events. A timeout should save useful artifacts when possible and include logs that show whether the system saw candidates, stop controls, generating indicators, or stable text.

Provider failures should not be hidden. If a provider redirects to a normal search page instead of an AI mode, Maestriss should fail clearly rather than extracting unrelated page text. If a login page or security verification appears, the runner should report that state instead of pretending the participant is ready.

Unexpected layouts should improve the system. A layout change that breaks extraction should produce candidate diagnostics and artifacts. The resulting fix should update the driver, filter, or shared infrastructure and add a regression when practical.

Recovery philosophy is conservative. The runner should recover from transient browser evaluation issues, reuse existing tabs when safe, and continue an ask when nonessential UI behavior fails. It should not silently continue when the provider surface is wrong, the prompt was not submitted, or the response cannot be confidently identified.

## Extensibility

A new AI provider should fit into the existing architecture without redesigning the framework.

The existing parts should already provide command handling, server orchestration, browser connection, participant resolution, tab reuse, tab focusing, cancellation, logging, health reporting, debug artifact patterns, and build integration.

Adding a provider should begin with participant metadata: a stable identifier, display name, and preferred URL. The participant should then receive a driver registered with the driver index. The driver should implement the standard lifecycle methods expected by the server.

Provider-specific logic belongs inside the new driver. This includes URL variants, readiness checks, composer discovery, paste verification, submit strategy, completion detection, stop or generating indicators, response candidate detection, cleaning, and provider-specific artifacts.

Provider-specific filter logic should live in a dedicated filtering module when the behavior is nontrivial. That module should expose cleaning, shell/status recognition, prompt rejection, and geometry rejection helpers as needed. It should have a corresponding regression assertion file.

Shared infrastructure should be extended only when the new provider reveals a genuinely common need. For example, a new shared helper may be appropriate if several providers require the same safe page evaluation retry behavior or artifact saving pattern. A provider-specific workaround should not be promoted to shared infrastructure prematurely.

Adding a provider should not require changing unrelated drivers. It should not require altering the request lifecycle. It should not require duplicating server behavior. The framework should remain stable while the provider-specific driver captures the new surface.

## Architectural Principles

The server owns orchestration; drivers own provider behavior.

Participants are first-class project entities, not anonymous URLs.

The browser is shared infrastructure and should not be managed independently by drivers.

Existing participant tabs should be reused when safe.

Opening duplicate provider tabs is a failure of resolution unless explicitly intended.

The active participant can be focused by shared orchestration, not by individual drivers.

Every driver follows the same lifecycle contract.

Provider quirks belong in provider drivers and filters.

Shared helpers must represent genuinely shared behavior.

Response detection is candidate-based, diagnostic, and evidence-driven.

Filtering must preserve valid answers while rejecting provider chrome.

Geometry may guide detection but must not become a brittle assumption.

Failure artifacts are part of the architecture.

Logs must explain what the system saw and why it acted.

Regression tests preserve knowledge gained from real failures.

New providers should be added by extension, not redesign.

The architecture should become more reliable every time an edge case is discovered.
