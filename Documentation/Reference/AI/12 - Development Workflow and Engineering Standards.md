---
Document ID: REF-12
Document Title: Development Workflow and Engineering Standards
Version: v0.2.0
Revision Date: 2026-07-10
Status: Authoritative Reference
Audience: AI
Purpose: AI-optimized edition of the Maestriss engineering reference for Development Workflow and Engineering Standards.
Scope: Same engineering truth as the corresponding Human edition; optimized for deterministic interpretation, retrieval, and machine reasoning.
Related Documents:
  - ../Human/12 - Development Workflow and Engineering Standards.md
Related Modules: See Canonical Source Content and referenced source paths.
Canonical Concepts Covered: Same as the Human edition.
Current Implementation Status: See Canonical Source Content; source code remains authoritative for current implemented behavior.
---
# Development Workflow and Engineering Standards

## AI Edition Contract

| Field | Value |
| --- | --- |
| Canonical Document ID | REF-12 |
| Canonical Title | Development Workflow and Engineering Standards |
| Companion Human Edition | ../Human/12 - Development Workflow and Engineering Standards.md |
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
# Development Workflow and Engineering Standards

## Table of Contents

1. [Purpose](#purpose)
2. [Engineering Philosophy](#engineering-philosophy)
3. [Development Cycle](#development-cycle)
4. [Before Writing Code](#before-writing-code)
5. [Making Changes](#making-changes)
6. [Debugging Workflow](#debugging-workflow)
7. [Browser Automation Workflow](#browser-automation-workflow)
8. [Driver Development Workflow](#driver-development-workflow)
9. [Testing Workflow](#testing-workflow)
10. [Logging Standards](#logging-standards)
11. [Documentation Workflow](#documentation-workflow)
12. [Code Quality Standards](#code-quality-standards)
13. [Regression Philosophy](#regression-philosophy)
14. [Refactoring Guidelines](#refactoring-guidelines)
15. [Reviewing Changes](#reviewing-changes)
16. [AI-Assisted Development](#ai-assisted-development)
17. [Engineering Anti-Patterns](#engineering-anti-patterns)
18. [Continuous Improvement](#continuous-improvement)
19. [Engineering Constitution](#engineering-constitution)

## Purpose

Disciplined engineering processes matter because Maestriss is a long-lived automation and orchestration system built on top of changing external provider interfaces. The project must remain understandable, testable, observable, and extensible as drivers, workflows, browser behavior, and user-facing capabilities grow.

Maestriss is expected to live for many years. Over that lifespan, engineers will add providers, fix regressions, improve browser automation, expand Studio, refine orchestration, and respond to provider UI changes. Without consistent engineering practices, the system will accumulate hidden assumptions, duplicated patterns, and fragile fixes.

Consistency of engineering is more valuable than clever implementations. A clever fix that cannot be diagnosed, tested, or understood later weakens the project. A clear, incremental, well-documented fix strengthens it. Maestriss should prefer durable engineering habits over impressive local shortcuts.

Future contributors should follow proven workflows instead of inventing new ones for every task. The workflows in this document exist because they match the nature of the project: observable browser behavior, provider-specific drivers, response filtering, diagnostics, and regression-driven improvement. Contributors should refine these practices when evidence demands it, but should not bypass them casually.

## Engineering Philosophy

Maestriss development is based on small incremental improvements. Each change should have a clear purpose, limited scope, and verifiable outcome. Incremental work is easier to review, easier to test, easier to revert, and easier to understand months later.

Evidence is preferred over assumptions. Provider websites change, browser behavior varies, and automation can fail silently. Engineering decisions should be based on logs, screenshots, HTML snapshots, candidate diagnostics, geometry, smoke tests, and observed runtime behavior.

Observable behavior matters more than theoretical correctness. A driver is correct only when it operates the live provider page reliably. A response detector is correct only when it extracts the actual answer and rejects non-answers. A workflow is correct only when the system can show what happened.

Repeatable engineering is essential. A fix should be validated by repeatable tests, repeatable smoke checks, or repeatable diagnostic procedures. One successful manual run is useful evidence, but permanent confidence comes from repeatable verification.

High visibility is part of the system design. Logs, active-tab focusing, debug artifacts, and health output allow engineers and users to see what Maestriss is doing. Development should preserve and improve that visibility.

Maintainability is paramount. Code should be readable, modular, consistent, and aligned with the architecture. Future contributors should be able to modify a driver, filter, or workflow without rediscovering hidden intent.

Documentation-first thinking means important decisions, lessons, and architecture should be captured in permanent references. Documentation is not separate from engineering. It is how the project preserves knowledge.

Reliability is more important than cleverness. Maestriss should do the simple correct thing, verify it, and explain it. Cleverness is acceptable only when it improves reliability without reducing clarity.

## Development Cycle

The preferred development cycle is:

```text
Understand the problem
   |
   v
Observe runtime behavior
   |
   v
Collect diagnostics
   |
   v
Identify root cause
   |
   v
Design solution
   |
   v
Implement incrementally
   |
   v
Smoke test
   |
   v
Regression test
   |
   v
Review logs
   |
   v
Document
   |
   v
Commit
```

Understanding the problem comes first. The engineer should determine what failed, which component is responsible, and what success should look like.

Runtime behavior should be observed before changing code. Browser automation problems often look different in the browser than they do in code.

Diagnostics should be collected. Logs, screenshots, HTML artifacts, candidate dumps, geometry, response previews, and timing information reveal the actual failure.

Root cause should be identified before implementation begins. A symptom may be an empty response, but the root cause may be composer failure, submit failure, completion timing, over-aggressive filtering, or wrong participant resolution.

The solution should be designed with architecture in mind. The fix should go in the correct layer: shared infrastructure, driver, filter, test, documentation, or UI.

Implementation should be incremental. Small changes reduce risk and make validation straightforward.

Smoke tests should validate live behavior when browser or provider interaction is affected.

Regression tests should preserve discovered bugs when the behavior can be represented deterministically.

Logs should be reviewed after testing. A request can return the expected answer for the wrong reason. Logs confirm whether the lifecycle behaved correctly.

Documentation should be updated when architecture, workflow, driver behavior, known issues, or lessons change.

Commits should capture coherent units of work after validation.

## Before Writing Code

Implementation should not begin from assumptions. Before writing code, the engineer should understand the problem and collect available evidence.

The issue should be reproduced when practical. Reproduction clarifies whether the failure is current, intermittent, provider-specific, environment-specific, or already resolved.

Logs should be reviewed. The lifecycle stage, participant, URL, composer strategy, submit strategy, response diagnostics, rejection reasons, and artifacts often identify the failure.

Screenshots should be inspected when browser state matters. A screenshot can reveal a login page, overlay, wrong provider mode, visible answer, hidden composer, or provider error.

HTML dumps should be inspected when DOM structure matters. They can reveal changed selectors, hidden text, accessibility labels, new wrappers, or missing containers.

Existing diagnostics should be used before adding new ones. The project already emits many useful signals. If those signals are insufficient, improving diagnostics may be part of the fix.

Existing tests should be checked. A failing or missing regression indicates where permanent coverage should be added.

Existing documentation should be read when the change touches architecture, driver lifecycle, browser behavior, response detection, testing, or project status.

Coding from assumptions creates fragile fixes. Browser automation must be grounded in observable reality.

## Making Changes

Preferred implementation practice is small, single-purpose change sets.

Small commits make engineering history readable. Each commit should represent a coherent fix, feature, or document update.

Single-purpose changes are easier to validate. A driver extraction fix should not be mixed with unrelated UI refactoring. A browser lifecycle change should not be bundled with documentation formatting unless the documentation directly describes it.

Scope should be minimal. Change the layer responsible for the behavior. Do not alter unrelated providers when fixing one provider. Do not move logic into shared infrastructure unless it is genuinely shared.

Unrelated refactoring should be avoided during bug fixes. Refactoring has value, but mixing it with behavior changes makes review and regression analysis harder.

Compatibility should be maintained where practical. Existing driver contracts, CLI commands, test scripts, and documentation conventions should remain stable unless there is a deliberate reason to change them.

Diagnostics should be improved when appropriate. If a bug was hard to diagnose, the fix should often include better logs or artifacts.

Existing behavior should be preserved unless intentionally changed. A fix for one provider should not weaken another provider. A new helper should not erase provider-specific behavior.

Incremental work is easier to validate because each change has a smaller blast radius and clearer success criteria.

## Debugging Workflow

Debugging is an engineering activity, not trial and error.

The process begins with observation. The engineer should inspect logs, browser state, artifacts, and tests before guessing.

Instrumentation should be added when existing evidence is insufficient. Instrumentation may include candidate dumps, geometry logs, submit strategy details, timing logs, or additional screenshots.

Verification should follow every hypothesis. If the hypothesis is that a button click failed, verify composer clearing, generation state, or response change. If the hypothesis is that filtering rejected the answer, inspect raw and cleaned text.

The process repeats until the root cause is understood and the fix is verified.

Logging should be added deliberately. Logs should answer a real question and use stable terminology. Noisy logs that obscure the lifecycle should be avoided.

Expected behavior should be compared to actual behavior. The gap between them is the bug.

Guess-driven debugging is dangerous because it can produce fixes that work once but fail under a slightly different provider state.

## Browser Automation Workflow

Browser automation work should always be evidence-driven.

The browser should be observed directly. The visible page often reveals whether the participant is logged in, blocked, redirected, generating, or displaying the answer.

The DOM should be inspected when selectors or response detection fail. DOM structure explains what automation can see.

Geometry should be collected for composers, buttons, response candidates, overlays, and parent containers. Geometry often explains why the visible answer was rejected or why a click missed.

Candidates should be ranked explicitly. The detector should explain what it considered, what it selected, and what it rejected.

Actions should be verified. Paste, submit, generation, completion, and extraction each require observable evidence.

Outcomes should be validated against the user-visible page. If the browser visibly shows a response but extraction fails, the detector needs improvement. If the browser does not show submission, the submit path needs improvement.

Diagnostics should improve when the browser reveals a new failure mode.

Regression tests should be added when the failure can be represented deterministically.

## Driver Development Workflow

Participant drivers mature through iteration. A driver begins as provider-specific automation and becomes robust through diagnostics, smoke tests, regressions, and live failures.

The lifecycle should be implemented fully: readiness, prompt paste, submission, completion waiting, response extraction, and structured response return.

Diagnostics should be added from the beginning. A driver without diagnostics is difficult to maintain.

Submission must be validated. The driver should prove that the prompt was accepted through provider-specific evidence.

Completion must be validated. The driver should distinguish active generation from historical labels and static status text.

Extraction must be validated. The driver should select the assistant answer, not the prompt, chrome, suggestion cards, or stale text.

Filter tests should be added for provider-specific response cleaning and rejection behavior.

Regression tests should be added for discovered bugs.

Driver behavior should be documented in the participant driver reference and project journal when meaningful changes occur.

Drivers mature through repeated observation, targeted fixes, and permanent regression coverage.

## Testing Workflow

Testing should match the risk of the change.

Smoke tests are appropriate for live provider behavior. They verify the full lifecycle against the actual provider page.

Regression tests are appropriate when a discovered bug can be represented as a deterministic input and expected output.

Filter tests are appropriate for response cleaning, prompt rejection, shell text rejection, geometry behavior, and false-positive or false-negative prevention.

Full build verification is required after significant TypeScript changes. The build confirms structural coherence.

Manual validation is appropriate for new providers, major UI changes, authentication issues, visual browser behavior, and failure modes that cannot yet be automated.

Cross-provider validation is appropriate when shared infrastructure changes may affect more than one driver.

Testing should be viewed as layered evidence. No single test type proves everything. Confidence comes from combining build verification, deterministic tests, smoke tests, logs, and manual observation where needed.

## Logging Standards

Logs should be consistent, clear, human-readable, and actionable.

Consistency allows maintainers to compare behavior across providers. Common lifecycle stages should use common terms.

Clarity matters more than volume. Logs should explain important decisions and state transitions without overwhelming the main flow.

Human readability is required. Logs are an engineering interface.

Stable wording helps future maintainers search logs and recognize patterns.

Diagnostics should be meaningful. A log should answer a question: which composer was found, which submit strategy was used, which response candidate was selected, why a candidate was rejected, or why a request timed out.

Noise should be minimized. Repetitive polling logs should be periodic unless trace-level debugging is explicitly needed.

Failures should be actionable. An error should identify the stage, provider, and evidence when possible.

Logs should assist future debugging. A log line written today may be read months later by someone who did not implement the feature.

## Documentation Workflow

Documentation should evolve alongside code.

Architecture documents should be updated when system boundaries, lifecycle contracts, browser strategy, driver architecture, response detection, testing philosophy, or roadmap direction changes.

Reference updates should be made when provider behavior or driver maturity materially changes.

The development journal should be updated after meaningful development sessions. It should record recent work, known issues, decisions, regressions, and next steps.

Decision recording is important. Major engineering decisions should include reason, alternatives, benefits, and future review conditions.

Lessons learned should be captured when a failure reveals a durable principle.

Documentation prevents rediscovery. Future engineers should not need to infer architecture from source code alone.

## Code Quality Standards

Readable code is mandatory. Maestriss is a long-lived system, and future maintainers must understand the code quickly.

Naming should be clear and consistent. Function names should describe lifecycle responsibility or provider-specific behavior directly.

Modularity should preserve ownership boundaries. Shared infrastructure should remain shared. Provider-specific behavior should remain in drivers and filters.

Single responsibility is expected. Each function, module, and driver method should have a clear purpose.

Duplication should be reduced when it creates maintenance risk. Duplication that reflects real provider differences may be acceptable; duplication of shared lifecycle behavior is not.

Abstractions should be clear and earned. A new abstraction should emerge from repeated need and should not hide important provider-specific behavior.

Maintainability is paramount because provider surfaces change. Clear code is easier to adapt when the external interface moves.

## Regression Philosophy

Every significant bug should ideally produce improved diagnostics, improved tests, improved documentation, or improved architecture.

Improved diagnostics ensure that the next similar failure is easier to understand.

Improved tests prevent the bug from returning silently.

Improved documentation preserves the lesson for future contributors.

Improved architecture addresses repeated patterns rather than one-off symptoms.

The system should become stronger after every failure. A bug that leaves no permanent improvement is likely to recur.

## Refactoring Guidelines

Safe refactoring preserves behavior while improving structure.

Refactoring should happen in small steps. Each step should be easy to validate.

Behavior preservation must be confirmed through tests, smoke checks, or careful log review.

Speculative redesign should be avoided. Refactoring should solve a real maintainability, duplication, clarity, or architectural problem.

Clarity is a valid reason to refactor when the existing code is hard to understand and the change can be validated.

Duplication reduction is appropriate when duplicated logic represents the same responsibility. It is not appropriate when duplication reflects provider-specific differences.

Refactoring is appropriate when it makes future changes safer, easier to test, or easier to diagnose.

## Reviewing Changes

Engineering work should be reviewed for more than immediate correctness.

Architecture should be reviewed. The change should belong in the correct layer.

Maintainability should be reviewed. Future engineers should be able to understand and modify the change.

Diagnostics should be reviewed. A new failure path should not be silent.

Testing should be reviewed. The validation should match the risk of the change.

Backward compatibility should be reviewed. Existing commands, driver contracts, tests, and workflows should not break unintentionally.

Documentation should be reviewed. Important changes should be reflected in reference documents or the development journal.

Correctness alone is insufficient because an unmaintainable correct fix can become a future liability.

## AI-Assisted Development

AI can participate productively in Maestriss development when guided by engineering discipline.

AI can help with planning by outlining implementation steps, identifying affected modules, and suggesting test coverage.

AI can generate code, but generated code must still follow project architecture, be reviewed, and be validated.

AI can assist debugging by reading logs, comparing expected and actual behavior, and proposing hypotheses. Hypotheses must be tested against runtime evidence.

AI can produce documentation, especially when the architecture and facts are clear.

AI can assist architecture review by checking whether a proposed change violates boundaries or duplicates responsibilities.

AI can help design regressions by converting observed bugs into deterministic cases.

AI can refine prompts for participants, workflows, tests, and diagnostics.

AI augments engineering judgment rather than replacing it. Human or AI contributors must still observe, verify, test, and document.

## Engineering Anti-Patterns

Large untested rewrites should be avoided. They are difficult to validate and often hide regressions.

Hidden behavior should be avoided. Important actions should be logged or otherwise observable.

Magic constants should be avoided unless justified and documented through context or tests. Browser geometry constants are especially risky.

Silent failures are unacceptable. If the system cannot verify an action, it should fail with diagnostics.

Copy/paste architecture should be avoided. Shared lifecycle behavior should not be duplicated across drivers.

Guess-driven debugging should be avoided. Fixes should be based on evidence.

Skipping validation should be avoided. Unverified paste, submit, completion, or extraction creates hidden failures.

Insufficient diagnostics should be treated as technical debt.

Overly broad shared abstractions should be avoided. They can erase provider-specific behavior and create cross-provider regressions.

Provider-specific fixes should not be hidden in unrelated layers.

## Continuous Improvement

Engineering processes should improve as the project matures.

Diagnostics should improve after difficult failures.

Testing should improve as new edge cases are discovered.

Documentation should improve as architecture evolves.

Architecture should improve when repeated patterns reveal better boundaries.

Engineers should continuously refine both the software and the development process itself. Maestriss should become easier to maintain as it becomes more capable.

Continuous improvement should be incremental, evidence-based, and documented.

## Engineering Constitution

Develop Maestriss through small, verifiable improvements.

Prefer evidence over assumptions.

Observe runtime behavior before changing code.

Verify every meaningful browser action.

Keep provider-specific behavior in provider drivers.

Keep shared lifecycle behavior in shared infrastructure.

Make failures observable.

Improve diagnostics after difficult bugs.

Turn significant bugs into regressions when practical.

Preserve existing behavior unless intentionally changing it.

Avoid unrelated refactoring during focused fixes.

Review logs after smoke tests.

Update documentation when architecture or status changes.

Value maintainability over cleverness.

Use AI as an engineering assistant, not a substitute for validation.

Avoid massive speculative rewrites.

Let the project grow through disciplined, incremental refinement.

Leave the codebase clearer, safer, or better documented after every development session.
