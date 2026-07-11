---
Document ID: REF-06
Document Title: Testing and Regression Philosophy
Version: v0.2.0
Revision Date: 2026-07-10
Status: Authoritative Reference
Audience: Human
Purpose: Human-oriented edition of the Maestriss engineering reference for Testing and Regression Philosophy.
Scope: Same engineering truth as the corresponding AI edition; optimized for comprehension, rationale, and maintainable human reading.
Related Documents:
  - ../AI/06 - Testing and Regression Philosophy.md
Related Modules: See document body for relevant source paths and modules.
Canonical Concepts Covered: See document body.
Current Implementation Status: See document body; source code remains authoritative for current implemented behavior.
---
# Testing and Regression Philosophy

## Table of Contents

1. [Purpose](#purpose)
2. [Quality Philosophy](#quality-philosophy)
3. [Testing Pyramid](#testing-pyramid)
4. [Build Verification](#build-verification)
5. [Smoke Tests](#smoke-tests)
6. [Response Filter Tests](#response-filter-tests)
7. [Regression Philosophy](#regression-philosophy)
8. [Provider Regression Tests](#provider-regression-tests)
9. [Manual Testing](#manual-testing)
10. [Diagnostics During Testing](#diagnostics-during-testing)
11. [Acceptance Criteria](#acceptance-criteria)
12. [Continuous Improvement](#continuous-improvement)
13. [Long-Term Vision](#long-term-vision)
14. [Testing Constitution](#testing-constitution)

## Purpose

Testing is one of the architectural pillars of Maestriss because the project operates against live, changing, external web interfaces. Maestriss does not control provider layouts, rendering behavior, response containers, login flows, status labels, or browser state. The test strategy exists to preserve confidence despite that external instability.

Browser automation is unusually vulnerable to regressions. A small change in a provider's DOM can break composer discovery. A new status label can be mistaken for a response. A viewport shift can invalidate geometry assumptions. A provider can add a feedback banner that pollutes extraction. A static label can be confused with an active control. These failures may appear without any change to Maestriss code.

Testing in Maestriss is therefore not a code-coverage exercise. It exists to increase confidence that the system still performs the real work: opening or reusing participant tabs, entering prompts, submitting them, waiting correctly, extracting the right answer, filtering page chrome, and returning structured responses. Coverage is useful only when it supports this operational confidence.

The test suite also serves as institutional memory. Every discovered provider behavior, false positive, false negative, geometry edge case, and cleaning rule should become durable knowledge when practical. Tests prevent the framework from forgetting hard-earned lessons.

## Quality Philosophy

Every discovered bug should permanently improve the framework. A bug is evidence that an assumption was incomplete. The correct response is not merely to make the immediate run pass, but to encode the lesson so the same class of failure is less likely to recur.

This philosophy is especially important in response detection. If a provider returns a valid short answer and the detector rejects it, that exact behavior should become a regression. If a provider exposes a static status label that resembles an active control, the distinction should become testable. If a response appears in a narrower viewport than expected, the geometry assumption should be corrected and preserved.

Confidence is earned through repeatable verification. A claim that a driver works should be supported by a build, deterministic filter tests, and live smoke tests when the behavior depends on real provider pages. Repeatability turns a successful manual observation into a reliable engineering signal.

Manual debugging should become automated testing whenever practical. Manual inspection is often necessary to understand a new provider behavior, but once the behavior is understood, the lesson should move into a regression test or reusable diagnostic. Manual effort should produce permanent leverage.

Regressions should be prevented rather than fixed twice. A bug that returns after being fixed represents a failure of memory. Regression tests exist to keep past failures from reappearing silently.

Tests should document behavior. A good test communicates what the system considers a valid response, what it rejects, what it cleans, and what geometry is acceptable. Future maintainers should be able to read a provider's regression tests and understand important provider-specific rules.

Tests should survive provider UI evolution when possible. The most durable tests assert behavior rather than incidental implementation details. A test should not require a specific internal function shape unless that function is itself part of the design. Tests should preserve the rule that matters.

## Testing Pyramid

Maestriss uses multiple layers of testing and validation. Each layer answers a different question.

```text
                 +------------------------+
                 | End-to-End Validation  |
                 +-----------+------------+
                             |
                 +-----------v------------+
                 | Driver Smoke Tests     |
                 +-----------+------------+
                             |
                 +-----------v------------+
                 | Regression Tests       |
                 +-----------+------------+
                             |
                 +-----------v------------+
                 | Response Filter Tests  |
                 +-----------+------------+
                             |
                 +-----------v------------+
                 | Unit-Level Assertions  |
                 +-----------+------------+
                             |
                 +-----------v------------+
                 | Build Verification     |
                 +------------------------+
```

Build verification confirms that the TypeScript project compiles and that the codebase is structurally coherent. It is the baseline layer.

Unit-level assertions validate small deterministic functions where those functions carry meaningful behavior. In Maestriss, many of these assertions appear as provider-specific filter assertions rather than broad generic unit tests.

Filtering tests validate candidate acceptance, rejection, cleanup, and geometry rules. They are central because response extraction failures often come from filtering logic.

Regression tests preserve discovered provider behaviors. They may overlap with filtering tests, geometry tests, or driver-specific assertions. Their defining feature is that they encode a bug that should not return.

Driver smoke tests validate the live lifecycle for a provider. A simple exact-answer prompt exercises readiness, paste, submit, wait, extraction, filtering, and response return.

Manual verification is used when automation cannot yet explain a new failure or when visual behavior must be inspected. It complements automated tests by discovering new facts.

End-to-end validation verifies larger workflows across multiple participants. It provides confidence that shared orchestration still works when several drivers and browser states interact.

These layers complement each other. Build verification catches structural errors. Filter tests catch deterministic extraction mistakes. Smoke tests catch live provider integration failures. Manual testing uncovers new behaviors. End-to-end validation confirms system-level cooperation.

## Build Verification

Every significant change should compile successfully. TypeScript compilation is the first gate that ensures the project remains internally consistent.

Build validation catches syntax errors, type mismatches, missing imports, invalid exports, incompatible function signatures, and structural mistakes introduced during changes. It is especially important when driver contracts, shared types, or provider response shapes are modified.

Dependency integrity is also indirectly checked by build verification. If a dependency is missing, incompatible, or incorrectly referenced, the build should fail before runtime.

Static verification is valuable because it is fast and deterministic. It can be run without live provider pages, browser state, authentication, or network interaction.

Compilation is only the first step. A successful build does not prove that a driver can find a composer, submit a prompt, detect completion, or extract the correct response from a live provider page. Build verification establishes that the code can run; it does not establish that the automation is correct.

## Smoke Tests

Smoke tests verify the live driver lifecycle. They use simple exact-answer prompts because the goal is not to evaluate provider intelligence; the goal is to verify automation.

Representative smoke prompts include:

- `Say exactly: ChatGPT OK`
- `Say exactly: Claude OK`
- `Say exactly: Gemini OK`
- `Say exactly: Google OK`
- `Say exactly: DeepSeek OK`
- `Say exactly: Grok OK`
- `Say exactly: Copilot OK`
- `Say exactly: Perplexity OK`
- `Say exactly: Reka OK`

These prompts are intentionally simple. If a provider returns the expected exact text, Maestriss can verify the entire lifecycle with minimal ambiguity. The driver must resolve the participant tab, wait for readiness, locate the composer, paste the prompt, verify paste, submit, wait for completion, extract the response, clean it, and return it.

Provider-specific smoke tests are essential because each driver interacts with a different live surface. A successful smoke test for one provider says little about another provider. Each provider must prove its own lifecycle.

Smoke tests also reveal browser and session problems. A failing smoke test may indicate an expired login, provider redesign, wrong URL mode, changed composer, failed submission, response detection regression, or browser connectivity issue.

Smoke tests should be run after significant driver changes, browser-management changes, response-detection changes, or provider-specific fixes. Consecutive smoke tests are valuable when validating follow-up composers or tab reuse behavior.

## Response Filter Tests

Provider-specific response filter tests exist because response extraction is the most failure-prone part of the system. Filters decide what text is an answer and what text is page chrome.

Candidate acceptance tests ensure that valid answers are accepted. They should include short valid answers, normal prose answers, and provider-specific valid forms.

Candidate rejection tests ensure that non-answers are rejected. These include submitted prompts, navigation labels, action buttons, source headings, status labels, feedback controls, provider disclaimers, and known shell text.

Cleaning tests ensure that valid answer text survives surrounding noise. Examples include removing transient thinking labels, stripping accessibility prefixes, trimming provider disclaimers, removing duplicated lines, and preserving exact short answers.

Geometry tests preserve layout lessons. They ensure that valid answers at discovered positions are accepted and that giant parent containers, sidebars, prompt bubbles, or transcript shells are rejected.

False-positive tests prevent the system from returning incorrect text. False-positive regressions are critical because they may otherwise appear as successful requests.

False-negative tests prevent the system from rejecting real answers. These tests protect against overly strict length, geometry, or selector assumptions.

Filter tests became critical to long-term stability because they are deterministic. Live provider pages change, but the discovered behavior can be captured in stable examples. This gives the project a reliable foundation even when smoke tests depend on external state.

## Regression Philosophy

The central regression philosophy is simple: every bug becomes a permanent regression test when practical.

Regressions represent accumulated engineering knowledge. A regression is not merely a test. It is a record of something real that broke the system. It says that Maestriss has encountered this edge case before and should not be surprised by it again.

Regression suites should continuously grow because the project continuously learns. Every provider interaction can reveal new details about layouts, status labels, response containers, browser behavior, or session state. When those details affect correctness, they should strengthen the test suite.

Deleting regressions should be extremely rare. A regression may be updated when the underlying behavior is intentionally redefined, but it should not be removed merely because it is inconvenient. Removing a regression discards project memory.

Regressions should be focused. A good regression captures the smallest durable behavior needed to prevent the bug from returning. It should not overfit to incidental details when a more meaningful assertion is available.

Regression tests should be named, organized, or structured so future maintainers can understand the behavior they protect. The test itself should explain the lesson.

## Provider Regression Tests

Every provider should maintain its own regression suite because provider behavior is distinct. The current project has provider-specific filter assertions for several drivers, while ChatGPT and Perplexity still need fuller dedicated assertion coverage. A regression discovered in one provider should not automatically become a rule for all providers.

Provider quirks belong in provider tests. One provider may emit thinking labels, another may use static stopped text, another may attach feedback disclaimers to the answer, and another may expose valid answers in narrow geometry. Each behavior should be preserved where it applies.

Provider evolution is expected. As providers redesign their interfaces, their regression suites should grow. The suite becomes a history of the provider's integration surface as observed by Maestriss.

Shared infrastructure can have shared tests when behavior is truly common. Browser connection, tab resolution, request lifecycle, and shared helpers may deserve framework-level validation. But provider response filtering should remain isolated unless a rule is intentionally shared.

Independent provider regressions prevent cross-contamination. A fix for one provider should not accidentally change the behavior of another. Provider-specific tests help ensure that specialization remains contained.

Provider regression suites should include acceptance, rejection, cleanup, and geometry cases where relevant. They should be run after changes to the provider driver, provider filter, shared response detection patterns, or orchestration that affects driver lifecycle.

## Manual Testing

Manual testing is appropriate when a behavior cannot yet be reduced to a deterministic test or when visual inspection is required to understand the provider state.

New providers require manual testing. Before a driver can be made robust, a maintainer must observe how the provider loads, where the composer lives, how submission works, how responses stream, what stop controls look like, and what page chrome surrounds answers.

Major UI redesigns require manual testing. When a provider changes its interface, diagnostics may show candidates and artifacts, but visual inspection often reveals the new structure fastest.

Authentication requires manual testing because Maestriss does not manage credentials. Users may need to log in, complete multi-factor authentication, select accounts, or clear provider security checks in the browser.

Visual verification is useful when the page visibly contains an answer but the detector fails. Screenshots can reveal whether the problem is selector coverage, geometry scoring, filtering, or session state.

New browser behavior may require manual testing. Changes to CDP connection, tab focusing, persistent profiles, startup cleanup, or browser recovery should be inspected in a real browser session.

Manual testing complements automated testing by discovering new facts. It should not replace automated tests once the relevant behavior is understood. The ideal outcome of manual testing is a code fix plus a regression.

## Diagnostics During Testing

Testing should produce useful diagnostics when failures occur. A failing test or smoke run should leave evidence that helps a maintainer understand what happened.

Logs should identify lifecycle stages, participant resolution, tab reuse, focus events, readiness, composer discovery, paste verification, submit strategy, completion state, extraction, and failure reasons.

Screenshots should be saved for failures that involve browser state, unexpected layout, missing composers, failed submission, or missing responses. A screenshot shows what a human would have seen.

HTML snapshots should be saved when DOM structure matters. They allow maintainers to inspect selectors, hidden text, accessibility labels, and provider-specific markup after the run.

Geometry dumps should include bounding boxes for selected and rejected candidates. Geometry is often the key to understanding why a candidate was accepted or rejected.

Candidate previews should show selected response text and rejected candidates. They reveal false positives, false negatives, prompt echoes, chrome pollution, and parent-container problems.

Timing information should show stability duration, response length, stop visibility, responding visibility, and timeout progress. This makes wait-loop failures actionable.

Failures should leave useful evidence because browser automation failures are often not reproducible in exactly the same state. The artifacts from the failing run may be the best available source of truth.

## Acceptance Criteria

A successful implementation should satisfy the relevant quality gates for its scope.

The build should pass. TypeScript compilation is the baseline requirement for any significant change.

The relevant regression suite should pass. If a change affects a provider filter, that provider's filter tests should pass. If a change affects shared infrastructure, broader tests and smoke validation may be required.

Smoke tests should pass when the change affects live provider behavior. A driver change is not fully validated until the provider can complete a live exact-answer ask.

Diagnostics should remain informative. A fix that removes useful logs, candidate reasons, geometry, or artifacts weakens the system even if the immediate test passes.

No architectural regressions should be introduced. Drivers should not start owning browser lifecycle. Shared infrastructure should not absorb provider-specific quirks without justification. Provider filters should not become universal rules accidentally.

Provider-specific behavior should be preserved. A fix for one provider should not break other providers. A general helper should be adopted only when it improves consistency without erasing necessary specialization.

Acceptance is proportional to risk. A small filter cleanup may require filter tests and build verification. A driver lifecycle change may require smoke tests. A shared browser-management change may require multiple provider smoke tests and manual inspection.

## Continuous Improvement

The test suite should become more comprehensive over time. Maestriss grows stronger as more provider behavior is captured.

Every newly discovered edge case should strengthen the project permanently. A false positive should become a rejection case. A false negative should become an acceptance case. A cleanup bug should become a cleaning case. A layout issue should become a geometry case.

Testing should become institutional memory for the framework. Future engineers should be able to understand provider behavior by reading tests and reference documents, not by rediscovering old failures.

Continuous improvement does not mean adding broad, unfocused tests. It means adding precise tests that preserve meaningful behavior. The suite should grow in clarity as well as size.

The project should prefer tests that explain why behavior matters. A regression without context is still useful, but a regression that clearly expresses the discovered rule is better.

## Long-Term Vision

Testing is part of feature development, not work performed afterward. A new provider is incomplete without validation.

Adding a new provider should naturally include live smoke tests that prove the lifecycle works. A provider should be able to answer a simple exact-answer prompt through the full runner path.

Adding a new provider should include filter tests. These tests should capture accepted responses, rejected chrome, cleanup rules, status labels, prompt rejection, and geometry assumptions as they are discovered.

Adding a new provider should include regression tests as soon as the first edge cases are found. The first version may be simple, but the suite should grow with live experience.

Adding a new provider should include documentation updates when the provider introduces new architecture, new shared helpers, or meaningful lifecycle behavior.

Adding a new provider should include diagnostics that make failures understandable. A provider without useful diagnostics is not maintainable.

The desired future is a project where every provider has a clear driver, clear tests, clear diagnostics, and clear documented behavior. The framework should become more reliable each time it is used.

## Testing Constitution

Testing exists to build confidence, not to decorate the codebase.

Every discovered bug should become permanent knowledge.

Regression tests are project memory.

Build verification is mandatory but not sufficient.

Smoke tests prove the live driver lifecycle.

Filter tests protect response correctness.

False positives must be treated as serious failures.

False negatives should become acceptance regressions.

Provider-specific behavior requires provider-specific tests.

Shared infrastructure should be validated without erasing provider specialization.

Manual testing is valuable when it produces durable knowledge.

Diagnostics are part of testability.

Failures should leave evidence.

Deleting regressions should be rare and deliberate.

Tests should document behavior.

Testing is part of feature development.

The test suite should grow as the project learns.

Maestriss should become harder to break every time a real edge case is discovered.
