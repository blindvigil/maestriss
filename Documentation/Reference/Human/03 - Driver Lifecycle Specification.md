---
Document ID: REF-03
Document Title: Driver Lifecycle Specification
Version: v0.2.0
Revision Date: 2026-07-10
Status: Authoritative Reference
Audience: Human
Purpose: Human-oriented edition of the Maestriss engineering reference for Driver Lifecycle Specification.
Scope: Same engineering truth as the corresponding AI edition; optimized for comprehension, rationale, and maintainable human reading.
Related Documents:
  - ../AI/03 - Driver Lifecycle Specification.md
Related Modules: See document body for relevant source paths and modules.
Canonical Concepts Covered: See document body.
Current Implementation Status: See document body; source code remains authoritative for current implemented behavior.
---
# Driver Lifecycle Specification

## Table of Contents

1. [Purpose](#purpose)
2. [Driver Responsibilities](#driver-responsibilities)
3. [Driver Lifecycle Overview](#driver-lifecycle-overview)
4. [waitForReady()](#waitforready)
5. [pastePrompt()](#pasteprompt)
6. [submitPrompt()](#submitprompt)
7. [waitForCompletion()](#waitforcompletion)
8. [extractResponse()](#extractresponse)
9. [Diagnostics](#diagnostics)
10. [Error Handling](#error-handling)
11. [Driver State](#driver-state)
12. [Interaction with Shared Infrastructure](#interaction-with-shared-infrastructure)
13. [Extending the Lifecycle](#extending-the-lifecycle)
14. [Driver Contract](#driver-contract)

## Purpose

A participant driver is the provider-specific automation unit that allows Maestriss to operate one independent AI system through its web interface. The driver knows how to interact with that provider's website as a careful human user would: wait until the interface is usable, locate the correct composer, enter a prompt, submit it, observe generation, detect completion, extract the answer, and return clean response text.

Every AI provider owns its own driver because every provider exposes a different web product. Providers differ in URL structure, authentication state, layout, composer implementation, keyboard behavior, send controls, response containers, streaming indicators, stop controls, accessibility labels, status text, and failure modes. A generic driver cannot reliably encode these differences without becoming brittle or unreadable.

Drivers share common infrastructure through the framework. The runner and server own request orchestration, participant resolution, browser connection, tab reuse, tab focusing, cancellation, lifecycle ordering, and request-level logging. A driver should not duplicate those responsibilities. Its job is to implement the provider-specific interaction contract for its own website.

This document defines the contractual lifecycle that every participant driver must implement. It is the permanent reference for current and future driver development.

## Driver Responsibilities

A driver is responsible for provider-specific browser interaction. It owns the knowledge of how one provider's website behaves and how Maestriss should operate that website safely.

The following responsibilities belong inside a driver:

- Recognizing whether the driver matches a registered participant.
- Waiting for the provider's page to be usable.
- Detecting whether the expected provider mode or product surface is active.
- Locating the provider's prompt composer.
- Entering prompt text into the composer.
- Verifying that prompt text was actually entered.
- Submitting the prompt using provider-appropriate techniques.
- Verifying that submission was accepted.
- Detecting active generation, responding states, stop controls, or provider-specific completion signals.
- Waiting until the response is complete and stable.
- Discovering response candidates from the page.
- Cleaning provider-specific response text.
- Rejecting provider-specific shell text, prompts, status labels, toolbars, disclaimers, source cards, and unrelated UI.
- Emitting provider-specific diagnostics.
- Saving provider-specific debug artifacts when failures require visual or DOM evidence.

Provider-specific behavior belongs in drivers. Examples include custom composer selectors, provider-specific send buttons, special URL modes, static labels that resemble active controls, accessibility prefixes, transient thinking labels, and geometry rules discovered from that provider's layout.

DOM interaction belongs in drivers because each provider exposes a different DOM. A driver may use Playwright locators, browser-side evaluation, keyboard input, DOM clicks, coordinate clicks, or provider-specific event sequences as required. The chosen technique must be verifiable and diagnosable.

Provider quirks belong in drivers or provider-specific filters. A quirk should not leak into unrelated drivers. If a quirk later proves to be common across multiple providers, it may be promoted to shared infrastructure deliberately.

Response detection belongs in drivers because response surfaces differ substantially between providers. The driver must know which candidate selectors are likely to contain answers, which visible regions belong to prompts or sidebars, which text labels are provider chrome, and how to score competing candidates.

Provider filtering belongs either in the driver or in a provider-specific filtering module used by the driver. Filtering logic should be deterministic and regression-tested when practical.

Provider diagnostics belong in drivers because only the driver knows which details are meaningful for that provider. For example, one provider may need stop-control diagnostics, another may need response geometry, another may need composer candidate counts, and another may need mode verification.

The following responsibilities do not belong inside a driver:

- Starting or owning the browser process.
- Managing Chrome DevTools Protocol connection.
- Creating independent browser contexts.
- Implementing request routing.
- Managing active request cancellation.
- Resolving participants globally.
- Opening duplicate provider tabs outside the participant manager.
- Implementing shared tab focusing.
- Reimplementing server health checks.
- Reimplementing generic request lifecycle orchestration.
- Handling unrelated providers.

Shared infrastructure remains outside drivers to keep behavior consistent across the system. If every driver independently opens tabs, focuses pages, manages timeouts, or handles cancellation, the framework becomes inconsistent and difficult to reason about. Drivers should specialize only where the provider requires specialization.

## Driver Lifecycle Overview

Every ask follows the same high-level lifecycle. The framework owns the outer lifecycle. The driver owns the provider-specific stages.

```text
Request
   |
   v
Resolve Participant
   |
   v
Acquire Browser Tab
   |
   v
Focus Active Tab
   |
   v
Driver.waitForReady()
   |
   v
Driver.pastePrompt()
   |
   v
Driver.submitPrompt()
   |
   v
Driver.waitForCompletion()
   |
   v
Driver.extractResponse()
   |
   v
Return Result
```

The request begins with a participant name and prompt. The server selects the matching participant and driver. The participant manager resolves an existing tab or opens a new one. The server focuses the active tab when configured to do so.

The driver lifecycle begins with `waitForReady()`. This stage establishes that the provider page is usable. The driver must not proceed to prompt entry until the page is in the correct state.

`pastePrompt()` enters the prompt into the correct provider composer and verifies that the text is present. It must not assume that a paste or fill operation succeeded.

`submitPrompt()` sends the prompt to the provider and verifies that submission was accepted. A button click or keypress alone is not sufficient evidence.

`waitForCompletion()` observes the provider until generation is complete. It must distinguish active generation from static historical text and must avoid both premature completion and infinite waiting.

`extractResponse()` selects and cleans the provider's answer. It must return the response, not the prompt, not provider chrome, not a toolbar, and not an unrelated older message.

The result is returned to the framework as structured participant output.

## waitForReady()

`waitForReady()` establishes that the provider page is ready for interaction. It is the driver's first lifecycle method and must protect later stages from operating on the wrong surface.

At minimum, readiness means that the page has loaded enough for meaningful interaction. The driver should wait for relevant browser load states when appropriate, but load state alone is not sufficient. A page can be loaded while still unusable because of authentication screens, blocking dialogs, unavailable modes, security checks, overlays, or missing composers.

`waitForReady()` should establish provider-specific conditions such as:

- The page is on an expected provider URL.
- The user is authenticated or the page is not blocked by a login screen.
- The expected product mode is active.
- The composer or conversation shell is present.
- Blocking dialogs are dismissed or detected.
- Cookie banners or one-time overlays are handled when safe.
- Security verification is surfaced clearly when manual action is required.

Some providers have multiple valid states. For example, a provider may have an initial landing composer and a follow-up composer on an existing conversation page. Both may be ready states if the driver knows how to operate them.

`waitForReady()` must never assume that a provider page is usable merely because the URL matches. It must not assume that the composer is present because it was present in a previous request. It must not assume that the account is authenticated. It must not assume that a redirect preserved the expected provider mode.

Timeout behavior should be explicit. If readiness cannot be established within the driver's expected window, the driver should fail with a clear error. When practical, it should save diagnostics showing the current URL, title, visible state, and relevant candidate counts.

Recovery should be conservative. It is appropriate to retry transient load-state checks or recover from navigation-related evaluation errors. It is not appropriate to submit into an unexpected surface or continue after the expected mode is unavailable.

## pastePrompt()

`pastePrompt()` must place the exact prompt text into the provider's real editable composer.

The first responsibility of `pastePrompt()` is composer discovery. A provider may use a textarea, input, contenteditable region, role-based textbox, searchbox, ProseMirror editor, or custom editable surface. A driver must search for the correct composer for the current provider state, not merely the first editable element on the page.

Composer discovery should reject hidden, stale, disabled, navigation, toolbar, or unrelated editable fields. When multiple candidates exist, the driver should prefer the one that matches provider-specific labels, placeholders, geometry, accessibility attributes, or known conversation layout.

Prompt entry may use different mechanisms depending on the provider. A driver may use Playwright fill operations, keyboard selection and typing, clipboard paste, direct DOM events, or provider-specific event sequences. The technique should match the provider's behavior and trigger the events required by the website.

Successful paste must always be verified. The driver should read the active composer after entry and confirm that the prompt text is present. Verification protects against focus failures, stale elements, blocked input, hidden composers, failed clipboard operations, and provider-side event handling quirks.

If verification fails, the driver may retry with a different safe strategy. Retry behavior should be limited and diagnosable. Repeated blind input attempts can corrupt the composer or submit unintended text.

`pastePrompt()` should log the composer selector or strategy, prompt length, whether the text appeared after paste, and whether paste verification succeeded. If no composer is found or verification fails, the driver should save debug HTML and a screenshot when practical.

## submitPrompt()

`submitPrompt()` must cause the provider to accept the prompt for generation. Submission is provider-specific and should be treated as a verified state transition, not a simple click.

Different providers require different submission techniques. Some providers accept a DOM click on an enabled send button. Some require a coordinate click because the visible control is difficult to select reliably. Some accept Enter. Some require Ctrl+Enter. Some require provider-specific event sequences or focus behavior before submission.

Multiple submission strategies may exist in a driver because provider interfaces can change between initial and follow-up states, between viewport sizes, or between account states. Strategies should be ordered from most precise to least invasive. A driver should prefer a clearly identified enabled send control over a broad coordinate click, and it should use keyboard fallbacks only when appropriate for that provider.

Submission must be verified. Evidence of successful submission may include:

- The composer cleared.
- The prompt appears as a user message.
- An active generating or responding state appears.
- A stop control becomes visible.
- A response candidate changes.
- The provider navigates to an expected conversation or result URL.

A click, keypress, or DOM event is not itself proof of submission. The driver must observe provider state after the action.

Fallback ordering should be deterministic. If the primary strategy fails to produce evidence, the driver may try a secondary strategy and verify again. Each strategy should be logged. If all strategies fail, the driver should save diagnostics and throw a provider-specific submit failure.

Submission should not proceed if the page is no longer in the expected provider mode. A driver must not submit into an ordinary search page, a login form, a stale hidden composer, or an unrelated input.

## waitForCompletion()

`waitForCompletion()` waits until the provider's response is complete and safe to extract.

Completion detection is fundamentally different across providers. Some providers stream text while showing a stop button. Some expose explicit responding indicators. Some change the composer state. Some show progress bars or aria-busy elements. Some leave historical status text in the transcript after generation has completed.

The driver must distinguish active generation from static text. A visible phrase such as "Stopped generating" may be historical status rather than an active stop control. A word such as "Searching" may appear in old transcript text and should not block completion forever. Only active controls, current progress indicators, or provider-specific live state should count as ongoing generation.

Stability timers are important. A response should generally be stable for a provider-appropriate duration before extraction. Stability means that the selected cleaned response text has not changed. This helps avoid extracting partial streamed output.

Timeouts protect the system from waiting forever. If completion cannot be established before the timeout, the driver should save response-not-found diagnostics and throw a clear error. The timeout log should show response length, stability duration, stop visibility, responding visibility, candidate count, and selected preview where available.

False completion must be avoided. A driver should not complete merely because a stop button is absent if no response is present and the provider still appears to be working. It should not complete on static chrome text. It should not complete on the submitted prompt.

Streaming providers require repeated observation. The driver should poll at a reasonable interval, update stability tracking when text changes, and log concise progress periodically rather than flooding every polling iteration.

Recovery is appropriate for transient page-evaluation failures caused by navigation or reloads. Recovery is not appropriate when the provider surface is wrong, the prompt was not submitted, or the page is blocked.

## extractResponse()

`extractResponse()` selects the provider's answer and returns clean response text. It is often the hardest lifecycle stage because web pages are not response APIs.

Extraction should use candidate discovery. The driver should gather likely answer elements from provider-specific selectors, semantic containers, markdown or prose regions, article-like blocks, visible central text blocks, and fallback text nodes when appropriate. It should not rely on broad document text as the primary extraction method.

Cleaning removes provider-specific noise. This includes prompt echoes, shell text, navigation labels, status text, transient thinking labels, accessibility prefixes, source labels, feedback controls, disclaimers, and duplicated UI text. Cleaning must preserve the provider's actual answer.

Geometry is useful evidence. A candidate's x-coordinate, y-coordinate, width, height, and relation to the composer or conversation column can help distinguish prompts, responses, sidebars, giant parents, and small answer children. Geometry must not be treated as a brittle absolute rule. A valid answer may appear near the left edge or in a narrower viewport.

Filtering rejects candidates that are not answers. Rejection reasons should be explicit: submitted prompt, known provider chrome, too short after cleaning, sidebar navigation, composer text, button or toolbar, giant page container, transcript parent, or smaller valid child exists.

Hierarchy matters. The correct answer is often a small child element inside a larger transcript or message container. Extraction should prefer the smallest correct answer rather than the largest visible container. Parent containers often include prompts, controls, citations, disclaimers, and duplicate text.

Response scoring chooses among valid candidates. Drivers should prefer candidates with strong answer evidence, focused cleaned text, useful assistant-action proximity where reliable, recent position when appropriate, and smaller valid child geometry. Scoring should be reflected in diagnostics.

Provider-specific filtering is required. Each provider has different shell text, status labels, accessibility prefixes, disclaimers, and response layout. Filters should be regression-tested when practical.

`extractResponse()` should return structured response data when the driver supports it, including raw text, cleaned text, elapsed time, citations if available, and optional raw HTML. If extraction cannot confidently identify a response, it should fail clearly rather than returning unrelated text.

## Diagnostics

Every lifecycle stage should leave useful evidence when it succeeds and when it fails.

`waitForReady()` should log provider mode, readiness state, URL checks, and any fallback navigation or blocking condition. If readiness fails, diagnostics should capture URL, title, visible page state, and relevant HTML or screenshot artifacts.

`pastePrompt()` should log the composer selector, composer strategy, prompt length, paste verification result, and any retry strategy. If composer discovery fails, it should log candidate counts and save a composer-not-found artifact.

`submitPrompt()` should log the submission strategy, selected button or key sequence, relevant bounding boxes, and verification evidence. If submission fails, it should save submit-failed HTML and screenshot artifacts.

`waitForCompletion()` should log response length, stable duration, stop visibility, responding visibility, generating indicators, candidate count, selected preview, and periodic progress. It should avoid logging every poll when nothing meaningful changes, but it should provide enough information to understand long waits.

`extractResponse()` should log selected candidate preview, selected geometry, candidate count, rejected candidates with reasons, raw extracted length, cleaned extracted length, and final response length. It should save response-not-found artifacts when no valid response can be identified.

Candidate counts and bounding boxes are especially important because provider websites are visual and dynamic. They explain what the driver saw, where it saw it, and why it accepted or rejected it.

HTML snapshots and screenshots are essential failure artifacts. HTML reveals selectors, text, accessibility attributes, and hidden structures. Screenshots reveal what a human would have seen.

Diagnostics must be human-readable. Future maintainers should be able to inspect logs and artifacts and understand the failure without reproducing the entire run.

## Error Handling

Every lifecycle stage has expected failure modes.

`waitForReady()` may fail because the page did not load, the user is not authenticated, the provider redirected to an unexpected surface, the expected mode is unavailable, a security check is active, or a blocking dialog prevents interaction.

`pastePrompt()` may fail because the composer is missing, disabled, hidden, stale, blocked by an overlay, or no longer the correct active input. It may also fail because the provider ignored the input method or did not fire required events.

`submitPrompt()` may fail because the send button is disabled, the wrong control was selected, keyboard submission is unsupported, the provider ignored the event, the prompt remained in the composer, or no generation state appeared.

`waitForCompletion()` may fail because the provider never responds, the response streams indefinitely, generation indicators remain active, a stop control never disappears, the page changes unexpectedly, the browser disconnects, or the provider enters an error state.

`extractResponse()` may fail because no valid answer candidate exists, the detector selects only provider chrome, the response is hidden in an unexpected layout, the page contains only the submitted prompt, or the provider changed its transcript structure.

Unexpected modals, rate limits, login screens, verification challenges, and provider outages should be surfaced clearly. A driver should not hide these failures behind generic timeouts when it can detect them.

Errors should be surfaced with enough detail to support action. The error message should identify the failed stage or provider condition. Diagnostics should preserve URL, screenshot, HTML, candidate dumps, and relevant geometry where practical.

Retries are appropriate for transient failures such as navigation-related page evaluation errors, temporarily stale elements, or one failed input strategy followed by a verified alternate strategy. Retries are not appropriate when the provider mode is wrong, the account is unauthenticated, the prompt cannot be verified, or submission cannot be proven.

Failures should stop immediately when continuing could produce incorrect behavior. A driver must not submit into the wrong page, extract ordinary search results as an AI response, or return a prompt echo as an answer.

## Driver State

A driver may maintain temporary state required to complete a request. Common examples include the submitted prompt, known composer information, selected prompt strategy, temporary diagnostics, and request-local response state.

State should be scoped carefully. Prompt state may be associated with the browser page for the duration of the request so that submission and extraction can compare response candidates against the submitted prompt. Cached selectors may be useful only if they are revalidated before use.

Temporary diagnostics may be accumulated during a request to explain submission, completion, or extraction. These diagnostics should not become hidden long-term state that changes future behavior unpredictably.

Drivers should not persist unsafe state between requests. They should not assume that a composer found in one request is still valid in the next request. They should not assume that a provider remained in the same mode after navigation. They should not use stale element handles across major page transitions. They should not let one request's prompt, candidate, or failure state contaminate another request.

Provider sessions persist in the browser, not in driver memory. The browser profile owns login state, cookies, and conversation state. Drivers should observe current browser state at the start of each lifecycle stage.

## Interaction with Shared Infrastructure

The driver lifecycle is a contract between provider-specific code and the framework.

The runner owns command-line operation. It parses commands, starts the server, sends client requests, and prints user-facing output.

The server owns orchestration. It receives requests, manages active request state, handles cancellation, resolves participants, focuses tabs, invokes driver lifecycle methods in order, captures failures, and returns structured responses.

The browser manager owns the browser connection. It connects to Chrome over CDP or starts the configured browser environment. It should not be duplicated by drivers.

Shared helpers own behavior that is genuinely common. This can include debug artifact saving, safe page evaluation patterns, generic lifecycle logging, cancellation wrappers, and common response shapes. Shared helpers should be used when they reduce duplication without hiding provider-specific behavior.

The participant manager owns participant metadata and page resolution. It decides which page belongs to which participant, whether to reuse a tab, and when to open a new page.

The driver owns interaction with its provider's website. It is called by the framework after the participant page has been resolved. The driver should operate only on the page it is given.

This separation exists so that the framework remains predictable and drivers remain focused. Shared infrastructure provides consistency. Drivers provide specialization. Neither should absorb the other's responsibilities.

## Extending the Lifecycle

The lifecycle may grow as Maestriss supports more provider capabilities. Extensions should preserve the existing contract and avoid breaking current drivers.

Authentication may become an explicit stage if the framework needs provider-aware login checks or manual verification workflows. Until then, authentication readiness remains part of `waitForReady()`.

Provider capability detection may become a formal stage if workflows need to know whether a provider supports search, files, images, long context, or specific modes. Capability detection should be read-only and should not duplicate prompt submission behavior.

Attachment upload may become a lifecycle stage before prompt submission. It should have the same standards as prompt paste: locate the correct control, perform the upload, verify the attachment, and produce diagnostics.

Image generation or multimodal workflows may add output-specific extraction stages. These should extend response extraction rather than bypassing the lifecycle. The driver should still verify readiness, prompt entry, submission, completion, and output detection.

Multi-turn conversations may add stateful workflow concepts above the driver layer. A driver may support follow-up composers, but orchestration of multi-turn strategy belongs in the framework or workflow layer.

Extensions should be backwards compatible. New optional methods may be added to the driver contract, but existing required methods should remain stable. A new stage should have a clear owner, clear diagnostics, and a migration path for existing drivers.

## Driver Contract

Every compliant Maestriss participant driver must provide the following guarantees.

The driver operates only on its own provider page.

The driver does not create independent browser sessions.

The driver does not duplicate participant resolution, tab reuse, or tab focusing.

The driver implements the standard lifecycle methods expected by the framework.

`waitForReady()` verifies that the provider page is usable before prompt entry.

`pastePrompt()` locates the real composer and verifies that the prompt text was entered.

`submitPrompt()` performs provider-appropriate submission and verifies that submission was accepted.

`waitForCompletion()` waits for a complete response using provider-specific generation and stability signals.

`extractResponse()` returns the provider's answer, not the prompt, provider chrome, stale text, or unrelated page content.

The driver rejects known provider shell text and status labels.

The driver preserves valid short answers.

The driver uses geometry as evidence, not as a brittle absolute rule.

The driver prefers focused valid answer candidates over large parent containers.

The driver emits human-readable diagnostics for significant lifecycle decisions.

The driver saves debug artifacts when failures cannot be understood from logs alone.

The driver surfaces failures clearly and stops when continuing would risk incorrect behavior.

The driver keeps provider quirks isolated unless a shared abstraction is deliberately introduced.

The driver avoids persistent request state that could contaminate future requests.

The driver adds or updates regression tests when a bug reveals durable provider knowledge.

This contract applies to all current and future participant drivers.
