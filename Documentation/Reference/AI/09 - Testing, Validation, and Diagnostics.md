---
Document ID: REF-09
Document Title: Testing, Validation, and Diagnostics
Version: v0.2.0
Revision Date: 2026-07-10
Status: Authoritative Reference
Audience: AI
Purpose: AI-optimized edition of the Maestriss engineering reference for Testing, Validation, and Diagnostics.
Scope: Same engineering truth as the corresponding Human edition; optimized for deterministic interpretation, retrieval, and machine reasoning.
Related Documents:
  - ../Human/09 - Testing, Validation, and Diagnostics.md
Related Modules: See Canonical Source Content and referenced source paths.
Canonical Concepts Covered: Same as the Human edition.
Current Implementation Status: See Canonical Source Content; source code remains authoritative for current implemented behavior.
---
# Testing, Validation, and Diagnostics

## AI Edition Contract

| Field | Value |
| --- | --- |
| Canonical Document ID | REF-09 |
| Canonical Title | Testing, Validation, and Diagnostics |
| Companion Human Edition | ../Human/09 - Testing, Validation, and Diagnostics.md |
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
# Testing, Validation, and Diagnostics

## Table of Contents

1. [Purpose](#purpose)
2. [Engineering Philosophy](#engineering-philosophy)
3. [Validation Philosophy](#validation-philosophy)
4. [Smoke Testing](#smoke-testing)
5. [Regression Tests](#regression-tests)
6. [Filter Tests](#filter-tests)
7. [Runtime Diagnostics](#runtime-diagnostics)
8. [Geometry Diagnostics](#geometry-diagnostics)
9. [Candidate Ranking Diagnostics](#candidate-ranking-diagnostics)
10. [Submission Diagnostics](#submission-diagnostics)
11. [Completion Diagnostics](#completion-diagnostics)
12. [Extraction Diagnostics](#extraction-diagnostics)
13. [Failure Snapshots](#failure-snapshots)
14. [Logging Standards](#logging-standards)
15. [Debug Modes](#debug-modes)
16. [Common Failure Categories](#common-failure-categories)
17. [Automated Health Checks](#automated-health-checks)
18. [Reliability Metrics](#reliability-metrics)
19. [Continuous Improvement](#continuous-improvement)
20. [Testing Workflow](#testing-workflow)
21. [Engineering Rules](#engineering-rules)
22. [Long-Term Vision](#long-term-vision)
23. [Testing Constitution](#testing-constitution)

## Purpose

Testing and diagnostics in Maestriss exist to make browser automation reliable, explainable, and maintainable. The project operates through live AI provider websites, and those websites are external systems that can change without warning. A quality strategy based only on code correctness is insufficient. Maestriss must continuously validate what the browser actually did and what the page actually contains.

Browser automation is fundamentally probabilistic rather than purely deterministic because the system does not control the target interfaces. Providers can change markup, layout, timing, labels, authentication flows, response containers, and streaming behavior. Network conditions, browser state, account state, and provider availability also influence outcomes. Maestriss reduces uncertainty through observation, verification, diagnostics, and regression testing.

Every failure should become easier to diagnose than the previous one. A difficult failure should leave behind better logs, stronger artifacts, clearer rejection reasons, improved tests, and more precise recovery behavior. The system should accumulate diagnostic intelligence over time.

Debugging capability is a first-class feature of Maestriss. It is not an afterthought. Logs, screenshots, HTML snapshots, candidate dumps, geometry, timing data, and structured errors are part of the engineering architecture. They allow future maintainers to understand failures without stepping through the code or reproducing fragile provider states.

## Engineering Philosophy

The engineering loop for Maestriss is:

```text
Observe
   |
   v
Understand
   |
   v
Instrument
   |
   v
Verify
   |
   v
Automate
   |
   v
Repeat
```

Observation comes first. The system must inspect the live browser state, visible page, DOM structure, candidate text, geometry, and provider indicators before deciding what happened. Browser automation fails when it assumes that a page is ready, a prompt was entered, or a response was complete without observation.

Understanding follows observation. A failure should be classified: wrong page, missing composer, blocked overlay, failed paste, failed submission, active generation, bad extraction, filter rejection, provider error, or browser issue. Clear classification prevents broad fixes that solve one symptom while introducing another.

Instrumentation converts understanding into repeatable visibility. Once a failure mode is understood, the system should log the relevant state, save useful artifacts, and expose diagnostics that make the same failure easier to identify later.

Verification turns automation from hope into evidence. Every major action should be followed by a check that proves it achieved the intended state.

Automation should encode verified behavior. A fix should not merely depend on timing luck or a hidden assumption. It should be based on observed provider behavior and should fail clearly when the behavior is absent.

Repetition is how Maestriss improves. Each bug strengthens the system through better diagnostics, better filters, better tests, or better recovery.

Assumptions are dangerous in browser automation because the target surface is outside the project's control. A selector may change. A button may become disabled. A prompt may paste into a stale composer. A provider may redirect. A response may be visible but nested in an unexpected element. Engineering decisions should always be based on observable runtime behavior.

## Validation Philosophy

Validation is layered. A successful request is not one event; it is a sequence of independently verified states.

```text
Page loaded
   |
Correct participant
   |
Correct URL or provider mode
   |
Composer found
   |
Prompt pasted
   |
Paste verified
   |
Submit verified
   |
Generation detected
   |
Completion detected
   |
Response extracted
   |
Response cleaned
   |
Final response validated
```

The page must load, but load state alone is not enough. The provider may still show a login page, overlay, splash screen, unavailable mode, or ordinary search page.

The participant must be correct. A driver should never operate a tab belonging to another provider or another product surface.

The URL or provider mode must be valid. Some providers have specific modes that must be preserved throughout the request.

The composer must be found and verified as the real editable control. Hidden, stale, or unrelated fields must be rejected.

The prompt must be pasted and then verified. A fill operation or keyboard event does not prove that the provider accepted text.

Submission must be verified through observable state: composer clearing, prompt appearing as a user message, generation starting, response changing, stop control appearing, or valid navigation.

Generation must be detected when possible. A provider that never begins generation should fail differently from one that generates but cannot be extracted.

Completion must be detected using provider-specific evidence, such as stable text, inactive stop controls, no responding indicator, or a completed response candidate.

Response extraction must select the provider's answer, not the prompt or page chrome.

Response cleaning must preserve answer text while removing non-answer UI.

Final response validation ensures the result is nonempty, not a prompt echo, not shell text, and suitable for return.

Skipping validation creates hidden failures. A hidden failure may return incorrect text with apparent success. Maestriss should either prove each step or fail with diagnostics.

## Smoke Testing

Smoke tests verify the live end-to-end behavior of a participant driver. They are intentionally simple and should be easy to interpret.

Every participant should support a prompt of the form:

```text
Say exactly: <Provider> OK
```

The purpose of this prompt is to test automation, not model quality. The expected response is short and unambiguous.

A smoke test verifies navigation or tab reuse, prompt paste, submission, generation, extraction, cleaning, and end-to-end response return. It exercises the full driver lifecycle through the real runner path.

A successful smoke test means the driver can operate the current live provider surface under the current browser session. It does not prove the driver will survive all future provider changes, but it provides essential runtime confidence.

Smoke tests detect regressions quickly. If a provider changes its composer, send button, response layout, stop indicator, or chrome text, the simple exact-answer prompt often fails in a way that reveals the broken stage.

Consecutive smoke tests are valuable when validating tab reuse and follow-up composers. A first ask may work on a landing page while a second ask fails on an existing conversation page. Both states matter.

### Sequential Baton Test

The sequential baton test is the validation level above independent exact-answer smoke tests. It sends a deterministic seed value (`MAESTRISS` by default) through every configured participant in a fixed order (ChatGPT, Claude, Gemini, Google, DeepSeek, Grok, Copilot, Perplexity, Reka). Each participant is instructed to return exactly the baton value it received plus its own token (for example `-CLAUDE`), and the actual cleaned answer extracted from each provider becomes the value supplied to the next provider. Expected values are computed for verification only; they are never substituted for provider output.

A stage passes only when the actual extracted answer exactly matches the expected transformation, with outer whitespace trimmed per the normal response contract. Any mismatch — including a stale earlier answer, an unchanged baton, or a future baton not derived from the actual input — fails the stage and stops the chain. Failed runs report stage number, participant, input, expected, and actual values, plus a failure category when available.

Run it against a live runner service with:

```text
npm run dev -- baton-test
npm run dev -- baton-test --seed MAESTRISS
npm run dev -- baton-test --skip-unavailable
```

With `--skip-unavailable`, a participant whose readiness status is not `ready` at run start is skipped before its ask, its token is omitted from the expected baton, and the overall result is `PARTIAL` rather than `PASS`. Skip mode never hides extraction, submission, timeout, or wrong-answer failures; those still fail the run. A full `PASS` requires every configured participant to return the exact transformation.

The chain orchestration itself is covered by a deterministic assertion suite (`npm run test:baton`, `runner/src/batonTestAssertions.ts`) that uses injected synthetic ask functions and requires no browser or network access. The live command exercises the normal `/ask` lifecycle for every stage.

## Regression Tests

Regression tests preserve lessons learned from failures. Every discovered bug should ideally become a permanent regression test.

A regression test represents accumulated engineering knowledge. It documents that a specific behavior has occurred before and must remain handled. This is especially important when provider behavior is unintuitive or easy to forget.

Regression tests prevent future regressions by making the known failure mode part of routine validation. A future change that reintroduces the bug should fail deterministically.

The regression suite should grow over time. Growth is not a sign of fragility; it is evidence that the project is learning. Each real failure can become a stronger rule, cleaner filter, better diagnostic, or safer lifecycle check.

Regression tests should be precise. They should capture the behavior that matters without overfitting to incidental implementation details. The best regression tests explain why a case should be accepted, rejected, or cleaned.

The shared council orchestration contract has its own deterministic suite (`npm run test:council`, `runner/src/councilAssertions.ts`): canonical provider-registry equivalence, schema validation accept/reject cases, Doctrine and Formation invariants, Calling metadata and refusal-safety wording checks, Calling/flavour-text bijection and override-envelope semantics (immutable edits, revert, versioned persistence parsing, legacy calling-id migration), council-level `callingFlavourOverrides` validation and resolution precedence, and prompt-composition behavior including input policies, budgets, exact truncation and omission notices, precedence, and a locked full-prompt snapshot. The Council execution engine has a second deterministic suite (`npm run test:council-execution`, `runner/src/councilExecutionAssertions.ts`) that runs the real engine over injected fake asks, following the baton assertion architecture: Formation-order execution, exact composed-prompt transmission, every input policy, flavour-override effect on the sent prompt, halt/retry-once/skip-and-record semantics, readiness gating, provider preference chains and fallback (availability-only eligibility, exact prompt reuse across providers, retry-budget preservation, chain exhaustion, structured selection records), PASS/PARTIAL/FAIL classification, configuration immutability, determinism, and Crown Council vote-aggregation honesty.  A third deterministic suite (`npm run test:cognitive-stats`, `runner/src/cognitiveStatsAssertions.ts`) covers the six cognitive stats: the canonical vocabulary and ten exact levels, provider/Calling/seat data shapes, the seat > Calling > provider > neutral resolution precedence, the locked instruction catalog, sparse guidance injection, mechanical Memory exposure versus input-policy eligibility (including the Memory-5 preserves-legacy-behavior regression), the responseLength/dissent migration, the approved Doctrine choreography overrides, and exact sparse and deviating prompt snapshots. A fourth deterministic suite (`npm run test:council-cli`, `runner/src/councilCliFormatAssertions.ts`) drives the Council CLI reporter through the real engine with fake asks and an injected clock, asserting the operator output: pre-run header and Formation, seat progress blocks, cognitive-stat display, input-policy explanations, context-flow diagnostics (Memory-excluded versus budget-omitted versus truncated), retry/skip/halt decisions, provider fallback transitions and chain-exhaustion output (including the prompt-identity reuse proof in verbose mode), running and final summaries, verbose composition diagnostics, prompt privacy in normal mode, and heartbeat stop behavior. The four suites are separate commands so contract, execution-engine, cognitive-stat, and operator-output regressions stay separately attributable. None requires a browser, runner service, or network access.

## Filter Tests

Response-filter regression tests are deterministic tests for provider-specific extraction behavior. They validate how raw candidate text becomes accepted response text or rejected non-answer text.

Every provider should have its own filter assertions when it has nontrivial response detection. Provider-specific tests preserve provider-specific behavior without contaminating other drivers. All nine providers now have dedicated assertion scripts; Perplexity's (`npm run test:perplexity-filter`) was added after a live transcript-extraction false positive in which a prompt-plus-answer parent container was selected over the answer-only node.

Filter tests should cover prompt echoes. The submitted user prompt appears in the conversation and must not be returned as the assistant response.

Sidebar text should be rejected. Navigation, history, settings, and conversation lists can contain natural-language text that resembles answers.

Navigation and headers should be rejected because they are page chrome.

Cookie banners should be rejected or treated as blocking UI, not response text.

Conversation history should be rejected when it is not the current answer.

Marketing text, upgrade prompts, capacity notices, and provider splash text should not be extracted as answers.

Loading indicators, thinking indicators, searching labels, responding labels, and transcription labels should be removed or rejected according to provider behavior.

Suggestion cards and follow-up prompts must be rejected because they are not the answer to the submitted prompt.

Shell chrome such as copy, share, retry, regenerate, feedback, sources, and related controls should be rejected.

Filtering should be deterministic. Given the same text and geometry, the filter should produce the same result every time. Determinism makes regressions reliable and debugging tractable.

## Runtime Diagnostics

Runtime diagnostics describe what Maestriss observed while operating the browser.

The current participant should be logged so multi-provider workflows remain understandable.

The current lifecycle stage should be logged. A failure during readiness requires different action than a failure during extraction.

URLs should be logged when they affect correctness, such as provider mode, redirects, or invalid surfaces.

Candidate counts show whether the detector saw possible response elements.

Bounding rectangles describe where composers, buttons, candidates, and selected elements appeared.

The chosen element should be logged with selector or descriptor when available, geometry, and preview text.

Rejected elements should be logged with rejection reasons. This makes false positives and false negatives diagnosable.

Geometry should be included when visual relationships matter.

Preview text should be short enough to read but long enough to identify the candidate.

Timing should be logged for waits, stability timers, retries, and timeouts.

Diagnostics should make failures understandable without stepping through code. A maintainer should be able to read the logs and identify the failed assumption.

## Geometry Diagnostics

Geometry diagnostics capture the visual facts of browser automation.

Bounding boxes identify the location and size of important elements. They are essential for composers, send buttons, stop controls, selected candidates, and rejected candidates.

Center coordinates are used for coordinate-based clicks. Logs should show where the click occurred and why that point was chosen.

Dimensions help identify giant parent containers, tiny toolbar labels, sidebar rails, normal response blocks, and valid short answers.

Visibility must be reported or implied through candidate inclusion. Hidden elements should not normally be selected.

Viewport position matters because responsive layouts shift elements. A valid response may appear in a different location after a provider redesign or browser window change.

Candidate ranking often depends on geometry. Geometry explains why a child beat a parent, why a sidebar was rejected, or why a button was chosen.

Geometry often reveals problems selectors cannot. A selector may match both a response and a parent transcript. Geometry shows which one is focused answer text and which one is an oversized container.

## Candidate Ranking Diagnostics

Candidate ranking diagnostics explain how the system chose one element from many.

The candidate list should include enough information to understand alternatives. This may include preview text, cleaned length, geometry, selector, descriptor, and ranking evidence.

Scores or ranking reasons should be reported when a scoring model exists. Even without numeric scores, logs should show why a candidate was selected over others.

Selection reason is important. A candidate may win because it is the smallest valid child, has assistant-action proximity, contains the expected answer, has clean text, or appears in the current response region.

Rejected candidates should include reasons. Common reasons include submitted prompt, known chrome, empty after cleaning, sidebar, composer, toolbar, giant parent, smaller valid child, or status text.

Alternative candidates are valuable diagnostics. If the selected candidate is wrong, alternatives often show the correct answer and reveal why scoring failed.

Candidate ranking is essential for maintaining submit and extraction reliability because modern AI pages contain many plausible text nodes. Without ranking diagnostics, extraction bugs become guesswork.

## Submission Diagnostics

Prompt submission must leave evidence.

The driver should log that the composer was located, including selector and strategy.

Paste success should be logged after verification, not merely after an input attempt.

The selected submit control should be described. This may include label, selector, class snippet, geometry, or relation to the composer.

Click coordinates should be logged when coordinate submission is used.

Fallbacks attempted should be logged in order. The logs should show whether the driver used DOM click, coordinate click, Enter, Ctrl+Enter, Meta+Enter, or event simulation.

Composer clearing is a strong submission signal and should be reported when used.

Generation started should be reported when stop controls, responding indicators, or candidate changes indicate activity.

Response changed should be reported when the response detector sees a change after submission.

Submission failures should never be silent. If submission cannot be verified, the driver should save diagnostics and fail clearly.

## Completion Diagnostics

Completion detection is often the hardest problem in browser automation because responses stream, indicators vary, and static text can resemble active state.

Stable text should be logged through response length and stable duration. This shows whether the answer is still changing.

Stop indicators should be logged, including whether they are active controls or static labels.

Thinking indicators should be logged when they affect waiting.

Generation indicators such as responding labels, progress elements, aria-busy state, or loading text should be recorded when used.

Polling intervals should be reasonable and logs should be periodic. The system should not flood logs every poll, but it should provide progress during long waits.

Timeouts should include the last observed response length, selected preview, stop state, generating state, and candidate count.

Candidate previews during waiting help identify whether the system is waiting on the right text.

Completion diagnostics are essential because premature completion returns partial answers, while missed completion causes unnecessary timeouts.

## Extraction Diagnostics

Extraction diagnostics explain how Maestriss determined what the AI said.

Candidate discovery should report how many possible response elements were found.

Cleaning should report raw extracted length, cleaned length, and final response length where available.

Filtering should report rejection reasons for representative candidates.

Prompt rejection should be explicit. If a candidate is rejected because it matches the submitted prompt, the logs should say so.

Sidebar rejection should be explicit when geometry or hierarchy indicates navigation or history.

Preview logging should show selected and rejected candidates in readable form.

Response length is a useful validation signal. A zero-length cleaned response indicates either no answer or over-aggressive cleaning.

The accepted candidate should be logged with preview and geometry.

Rejected candidates should be logged enough to reveal whether the correct answer was present but rejected.

Extraction diagnostics dramatically reduce debugging time because they expose the detector's reasoning directly.

## Failure Snapshots

Failure snapshots preserve evidence after a live browser state changes.

Screenshots capture what a human would have seen. They are essential when the answer is visible but not extracted, when a modal blocks the page, or when a provider redirects unexpectedly.

HTML dumps capture the DOM. They allow later inspection of selectors, hidden text, accessibility attributes, and nested structure.

Timing should be associated with snapshots. A snapshot taken during generation differs from one taken after timeout.

File naming should identify the provider and failure type. Names such as composer-not-found, submit-failed, live-debug, and response-not-found are useful because they describe the stage.

Storage should be predictable. Debug artifacts should be saved in the runner debug area so maintainers can find them quickly.

Automatic capture should occur for failures that cannot be diagnosed from logs alone. Manual capture should not be required for routine driver failures.

Failures should always leave evidence behind when practical. A failure without artifacts is harder to understand and easier to repeat.

## Logging Standards

Logs should be human-readable. They are read by maintainers during live runs and after failures.

Consistent wording matters. Similar lifecycle events should use similar language across providers.

Stable terminology matters. Terms such as composer, paste verified, submit strategy, wait, response length, stableMs, stopVisible, candidateCount, selected preview, and rejected reason should be used consistently.

Step names should match the driver lifecycle: waitForReady, pastePrompt, submitPrompt, waitForCompletion, extractResponse.

Warnings should indicate recoverable or nonfatal problems, such as failing to bring a tab to front.

Errors should identify the failed stage and provider condition when possible.

Success messages should confirm meaningful verification, not merely attempted actions.

Debug output should be detailed enough for maintainers but should not obscure the main lifecycle flow.

Logs should be understandable months later. A future engineer should not need the original author present to interpret them.

## Debug Modes

Maestriss should support different levels of diagnostic detail as the project matures.

Normal mode should show the main lifecycle: participant opening, tab reuse, focus, readiness, paste, submit, wait, extraction, and completion or failure.

Verbose mode should include provider-specific details such as composer selectors, submit strategy, response length, stable timing, stop visibility, candidate count, and selected previews.

Developer mode should include deeper diagnostics such as candidate lists, rejected candidates, bounding boxes, button candidates, fallback attempts, and artifact paths.

Trace mode should include highly detailed polling, DOM-evaluation blocks, event sequences, and expanded candidate ranking. Trace mode should be used sparingly because it can produce large logs.

Each level should add information without changing behavior. Debug modes should make the system more observable, not less deterministic.

## Common Failure Categories

Page not loaded failures occur when the browser cannot reach or initialize the provider page. Diagnostics should include URL, title, load state, and screenshot.

Authentication failures occur when the provider requires login, account selection, or security verification. Diagnostics should surface the visible state and avoid credential automation.

Overlay blocking failures occur when modals, banners, splash screens, or dialogs prevent interaction. Diagnostics should capture the overlay and whether dismissal was attempted.

Composer not found failures occur when the driver cannot identify the real input surface. Diagnostics should include editable candidate counts, URL, title, screenshot, and HTML.

Paste failures occur when the prompt does not appear in the composer after input. Diagnostics should include composer strategy, prompt length, composer text, and artifact paths.

Submit failures occur when the prompt is entered but not accepted. Diagnostics should include selected submit control, fallbacks attempted, composer clearing state, generation state, and response changes.

Generation failures occur when submission appears accepted but the provider does not begin responding. Diagnostics should show generation indicators and provider error text.

Timeout failures occur when completion is not detected in time. Diagnostics should include response length, stable time, stop indicators, generating indicators, and candidate previews.

Extraction failures occur when no valid response is found. Diagnostics should include candidate dumps, rejected reasons, screenshot, HTML, and cleaned lengths.

Filtering failures occur when a valid response is rejected or a false positive is accepted. Diagnostics should show raw text, cleaned text, rejection reason, and filter behavior.

Provider UI changes usually surface as composer, submit, wait, or extraction failures. Diagnostics should identify the changed surface.

Network issues may appear as load failures, stalled generation, or provider error states. Diagnostics should separate browser connectivity from provider response behavior.

Rate limiting should be reported as provider state when detected. It should not be treated as an extraction failure.

## Automated Health Checks

Health checks improve reliability by detecting problems before workflows begin.

Browser connection health confirms that the runner's browser session is currently usable. In CDP mode this means the runner can communicate with the attached Chrome instance; in persistent-profile mode it means the Playwright-managed browser context remains usable.

Participant availability checks whether expected participant tabs exist or can be opened.

Tab validity checks whether a tab still matches the participant's expected provider surface.

Authentication health can detect obvious login or blocked states when provider signals are visible.

Page readiness health can detect whether a provider appears usable before a request begins.

Health checks should not replace driver readiness. They provide early warning and status visibility. The driver must still validate the page during the request lifecycle.

Automated health checks help users choose participants, avoid known-bad workflows, and diagnose environment problems quickly.

## Reliability Metrics

Useful engineering metrics help guide development.

Successful submissions measure how often prompts are accepted after paste.

Submission retries measure how often fallback strategies are required. Rising retries may indicate provider UI changes.

Average completion time helps identify provider slowdowns, wait-loop issues, or performance regressions.

Extraction success rate measures how often the detector returns a valid response after generation.

Driver stability can be tracked by provider over time. This helps prioritize hardening work.

Regression count shows accumulated project knowledge. Growth is expected as the project learns.

Failure frequency by category helps identify the most valuable improvements.

Metrics should guide development, not become vanity numbers. Reliability metrics are useful when they lead to clearer fixes, better tests, or better diagnostics.

## Continuous Improvement

Diagnostics should evolve continuously.

Every bug should ideally produce better logging. If a failure was hard to understand, the next similar failure should be easier.

Every bug should ideally produce better filtering. If a response was wrongly accepted or rejected, the filter should learn the pattern.

Every bug should ideally produce better tests. If the behavior can be represented deterministically, it should become a regression.

Every bug should ideally produce better diagnostics. The system should capture the relevant evidence automatically.

Every bug should ideally produce better recovery when safe. If a failure has a clear safe recovery path, the system can eventually automate it.

The diagnostic system should continuously improve because provider behavior continuously changes. Static diagnostics decay; living diagnostics learn.

## Testing Workflow

The recommended engineering workflow is:

```text
Implement
   |
   v
Smoke test
   |
   v
Regression test
   |
   v
Run build
   |
   v
Verify diagnostics
   |
   v
Review logs
   |
   v
Capture failures
   |
   v
Fix
   |
   v
Repeat
```

Implementation should be scoped and aligned with existing architecture.

Smoke testing verifies live behavior when browser or provider interaction is involved.

Regression testing preserves any discovered edge case.

Build verification ensures the TypeScript project remains coherent.

Diagnostics should be reviewed to ensure the system explains its behavior.

Logs should be read, not ignored. They reveal whether the system succeeded for the right reasons.

Failures should be captured through artifacts and converted into fixes.

The loop repeats until the behavior is verified and understandable. This workflow produces reliable software because it combines live validation, deterministic tests, static checks, and diagnostic review.

## Engineering Rules

Never trust a single signal.

Always verify user-visible behavior.

Capture failures automatically when practical.

Prefer observable evidence over assumptions.

Turn bugs into regression tests.

Improve diagnostics after every difficult failure.

Prefer maintainability over cleverness.

Do not hide failures behind silent retries.

Do not return unverified responses.

Do not submit into unverified provider surfaces.

Do not treat provider chrome as answer text.

Do not treat static historical labels as active controls.

Use geometry as evidence, not dogma.

Keep provider-specific diagnostics inside provider drivers.

Keep shared lifecycle diagnostics in shared infrastructure.

## Long-Term Vision

The long-term vision is for Maestriss diagnostics to make nearly every browser automation failure understandable within minutes.

Future contributors should spend their time fixing problems rather than discovering what happened. The system should tell them the participant, stage, URL, selector, candidate, geometry, timing, failure category, and artifact location.

As the project matures, diagnostics should become more structured, searchable, and comparable across runs. Logs and artifacts should support both immediate debugging and longer-term reliability analysis.

The testing system should become a durable memory of provider behavior. Each edge case captured today should prevent wasted time tomorrow.

Quality assurance should remain integrated with development. Testing, validation, and diagnostics are not separate phases; they are part of how Maestriss is engineered.

## Testing Constitution

Testing exists to create confidence in real behavior.

Validation must be layered.

Every major operation must be independently verified.

Browser automation failures must leave evidence.

Diagnostics are a first-class feature.

Logs must be readable and durable.

Screenshots and HTML snapshots are essential failure artifacts.

Candidate diagnostics are required for response extraction.

Geometry diagnostics are required when visual layout affects behavior.

Submission must never fail silently.

Completion must be based on observed provider state.

Extraction must explain what was selected and what was rejected.

Smoke tests prove live provider lifecycles.

Regression tests preserve discovered knowledge.

Filter tests protect response correctness.

Health checks improve readiness but do not replace driver validation.

Metrics should guide reliability work.

Every difficult failure should improve diagnostics.

Every repeated bug indicates missing regression coverage.

Maestriss should become easier to debug as it becomes more capable.
