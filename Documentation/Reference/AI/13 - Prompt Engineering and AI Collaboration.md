---
Document ID: REF-13
Document Title: Prompt Engineering and AI Collaboration
Version: v0.2.0
Revision Date: 2026-07-10
Status: Authoritative Reference
Audience: AI
Purpose: AI-optimized edition of the Maestriss engineering reference for Prompt Engineering and AI Collaboration.
Scope: Same engineering truth as the corresponding Human edition; optimized for deterministic interpretation, retrieval, and machine reasoning.
Related Documents:
  - ../Human/13 - Prompt Engineering and AI Collaboration.md
Related Modules: See Canonical Source Content and referenced source paths.
Canonical Concepts Covered: Same as the Human edition.
Current Implementation Status: See Canonical Source Content; source code remains authoritative for current implemented behavior.
---
# Prompt Engineering and AI Collaboration

## AI Edition Contract

| Field | Value |
| --- | --- |
| Canonical Document ID | REF-13 |
| Canonical Title | Prompt Engineering and AI Collaboration |
| Companion Human Edition | ../Human/13 - Prompt Engineering and AI Collaboration.md |
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
# Prompt Engineering and AI Collaboration

## Table of Contents

1. [Purpose](#purpose)
2. [Philosophy](#philosophy)
3. [Roles of AI](#roles-of-ai)
4. [Context First](#context-first)
5. [Designing Before Coding](#designing-before-coding)
6. [Prompt Design Principles](#prompt-design-principles)
7. [Effective Prompt Patterns](#effective-prompt-patterns)
8. [Debugging Conversations](#debugging-conversations)
9. [Browser Automation Prompts](#browser-automation-prompts)
10. [Architecture Conversations](#architecture-conversations)
11. [AI Code Review](#ai-code-review)
12. [Multi-AI Collaboration](#multi-ai-collaboration)
13. [Iterative Development](#iterative-development)
14. [Prompt Libraries](#prompt-libraries)
15. [Engineering Conversations](#engineering-conversations)
16. [Common Prompting Mistakes](#common-prompting-mistakes)
17. [AI Limitations](#ai-limitations)
18. [Human Responsibilities](#human-responsibilities)
19. [Building Institutional Knowledge](#building-institutional-knowledge)
20. [Long-Term Vision](#long-term-vision)
21. [AI Collaboration Constitution](#ai-collaboration-constitution)

## Purpose

Prompt engineering deserves to be treated as an engineering discipline because the quality of AI-assisted work depends directly on the quality of the instructions, context, constraints, and review process used to produce it. In Maestriss, prompts are not casual messages. They are part of the engineering workflow.

Large language models should be treated as collaborators rather than simple code generators. A model can help reason about architecture, inspect logs, design tests, compare alternatives, review code, write documentation, and challenge assumptions. These activities require context and judgment. They are not equivalent to asking for isolated snippets of code.

The quality of engineering output depends heavily on the quality of the engineering conversation. A vague request often produces a vague solution. A request that includes architecture, constraints, diagnostics, expected behavior, and success criteria produces better engineering work. Conversation structure shapes solution quality.

Prompt design is an architectural skill. A good prompt establishes the problem boundary, identifies the relevant subsystem, names the constraints, defines success, and indicates the desired level of autonomy. It helps the AI reason inside the architecture rather than outside it.

## Philosophy

AI-assisted engineering in Maestriss should resemble collaboration with a senior engineer. The AI should be given enough context to understand the system, enough constraints to avoid unsafe changes, and enough evidence to diagnose problems correctly.

Context should be provided before requesting code. Maestriss has deliberate architecture: browser automation, participant drivers, response filtering, diagnostics, regression tests, and reference documents. AI assistance is strongest when it works within those boundaries.

Design should precede implementation. Before making significant changes, the engineer and AI should identify the responsible layer, expected behavior, likely failure modes, and validation plan. This reduces misplaced fixes and unnecessary rewrites.

Diagnosis should precede fixing. Browser automation failures often have misleading symptoms. An empty response may be a paste failure, submit failure, wait failure, extraction failure, or filtering failure. AI should help inspect evidence before proposing a fix.

Verification should precede trust. AI-generated code, reasoning, and documentation must be reviewed, tested, and validated. A plausible answer is not the same as a correct one.

Iteration should be preferred over rewriting. Maestriss should improve through focused changes, diagnostics, regressions, and documentation updates. Large speculative rewrites create risk and often erase hard-earned behavior.

Engineering conversations should resemble technical design reviews rather than one-shot requests. Good conversations ask why, compare tradeoffs, challenge assumptions, define validation, and document decisions.

## Roles of AI

AI systems can contribute in multiple engineering roles. The role should be explicit because each role has different expectations.

As an architect, AI can compare designs, identify boundaries, surface risks, and evaluate long-term maintainability. This role is appropriate before major subsystem changes.

As a programmer, AI can implement focused changes within existing patterns. This role is appropriate when the problem is understood and success criteria are clear.

As a debugger, AI can read logs, inspect diagnostics, form hypotheses, and design verification steps. This role is appropriate when runtime behavior differs from expected behavior.

As a reviewer, AI can examine code for bugs, architecture violations, missing tests, weak diagnostics, and maintainability risks. This role is appropriate before merging or after a significant change.

As a tester, AI can design regression cases, smoke tests, filter assertions, and validation plans. This role is appropriate after bugs, new drivers, or shared infrastructure changes.

As a documenter, AI can turn stable decisions, architecture, and lessons learned into durable reference material. This role is appropriate when knowledge should become permanent.

As a research assistant, AI can summarize provider behavior, compare approaches, or investigate general techniques. This role requires verification against primary sources or live evidence when accuracy matters.

As a technical writer, AI can polish documentation, create tables, write process references, and standardize terminology.

As a critic, AI can challenge assumptions, identify missing evidence, and ask whether a proposed fix belongs in the correct layer.

As a devil's advocate, AI can generate alternative failure explanations, stress-test architecture, and identify what could go wrong.

## Context First

Context is the single most important input to AI-assisted engineering. The AI performs dramatically better when it understands the architecture, current state, constraints, and evidence.

Architecture context tells the AI where changes belong. A bug in response filtering should usually be fixed in a provider filter or detector, not in browser startup or UI code. A tab reuse issue belongs in shared infrastructure, not in every driver.

Previous decisions prevent repeated debate. If the project has already chosen persistent browser profiles, provider-specific drivers, or candidate-based extraction, the AI should work from those decisions unless explicitly asked to revisit them.

Constraints prevent unsafe changes. Examples include not touching unrelated drivers, preserving browser sessions, avoiding duplicate tabs, keeping wait and extraction on a shared detector, or not changing provider submission logic during an extraction fix.

Known issues help the AI avoid rediscovery. If a provider has a known geometry regression, static status label, or mode requirement, that context shapes the correct fix.

Diagnostics provide the evidence needed for accurate reasoning. Logs, screenshots, HTML artifacts, candidate dumps, and test output are more reliable than guesses.

Existing code context ensures the AI follows established patterns. A solution should fit the repository, not an abstract ideal.

Long-term goals help prioritize maintainable solutions. Maestriss is a multi-year platform, so fixes should strengthen the system rather than merely pass one run.

## Designing Before Coding

Implementation should almost always begin with design. This does not require heavy process for small changes, but it does require understanding the problem before editing code.

The preferred workflow is:

```text
Understand
   |
   v
Discuss architecture
   |
   v
Challenge assumptions
   |
   v
Refine approach
   |
   v
Implement
   |
   v
Test
   |
   v
Review
```

Understanding means identifying what is broken or needed, what subsystem owns it, and what success looks like.

Architecture discussion determines where the change belongs and whether it should be provider-specific, shared infrastructure, UI, documentation, or tests.

Challenging assumptions prevents premature fixes. The apparent cause may not be the root cause.

Refining the approach keeps the solution scoped and testable.

Implementation should follow existing patterns and avoid unrelated changes.

Testing validates that the change works.

Review verifies that the solution is maintainable, observable, and architecturally correct.

This workflow reduces expensive rewrites because it prevents code from being written in the wrong layer or against the wrong assumption.

## Prompt Design Principles

Effective engineering prompts have a clear objective. They state what outcome is desired and what problem is being solved.

They include known constraints. Constraints might include affected directories, providers not to touch, commands to run, expected logs, or architectural boundaries.

They specify desired outputs. The prompt should say whether the expected result is code, a plan, diagnostics, tests, documentation, review findings, or a summary.

They define success criteria. Examples include a smoke test passing, a filter assertion being added, a build succeeding, or a reference document being created.

They describe existing behavior. This helps the AI reason from the current state rather than imagining a different system.

They describe expected behavior. The gap between existing and expected behavior is the engineering problem.

They state explicit assumptions when assumptions are unavoidable. This makes uncertainty visible.

Ambiguity should be minimized. A vague prompt forces the AI to invent missing context, which increases the chance of misplaced or overbroad changes.

## Effective Prompt Patterns

Reusable prompt patterns improve engineering consistency.

An architecture review prompt should include the proposed design, goals, constraints, affected subsystems, expected tradeoffs, and questions to answer.

Example pattern:

```text
Review this proposed Maestriss architecture change.
Focus on ownership boundaries, long-term maintainability, diagnostics, testing, and provider isolation.
Do not implement code.
Identify risks, alternatives, and recommended adjustments.
```

A bug investigation prompt should include observed behavior, expected behavior, logs, screenshots or artifacts, affected provider, recent changes, and commands already run.

A driver implementation prompt should include provider URL, composer behavior, submission behavior, completion signals, response layout, diagnostics requirements, and smoke test criteria.

A filtering improvement prompt should include raw extracted text, expected cleaned text, rejected candidates, geometry, prompt text, and required regression cases.

A regression design prompt should include the bug, root cause, desired permanent assertion, and provider-specific filter module.

A documentation generation prompt should include file path, audience, scope, tone, topics, and constraints about what not to mention.

A code review prompt should ask for findings first and focus on bugs, regressions, missing tests, diagnostics, and architectural violations.

A performance optimization prompt should include measured bottlenecks, correctness constraints, and verification requirements.

A testing strategy prompt should include the affected subsystem, risk level, existing tests, and desired confidence.

Reusable templates reduce variation and help future engineers ask for high-quality assistance.

## Debugging Conversations

AI should participate in debugging through disciplined evidence review.

The preferred workflow is:

```text
Observe
   |
   v
Collect evidence
   |
   v
Review diagnostics
   |
   v
Generate hypotheses
   |
   v
Test hypotheses
   |
   v
Identify root cause
   |
   v
Implement fix
   |
   v
Verify
```

Observation begins with the actual failure. What did the browser show? What did the logs say? What response was returned?

Evidence includes logs, screenshots, HTML snapshots, candidate diagnostics, geometry, test output, and commands.

Diagnostics should be reviewed before forming a fix. They often reveal that the failure occurred earlier than expected.

Hypotheses should be generated as possibilities, not conclusions. For example, a missing response might be a detector issue, a wait issue, or a submit issue.

Hypotheses should be tested through targeted inspection or instrumentation.

Root cause should be identified before implementation.

The fix should be scoped to the root cause and validated.

Guessing should never replace observation. Guess-driven debugging creates fragile fixes and hidden regressions.

## Browser Automation Prompts

Browser automation benefits from highly structured prompts because failures can occur at many layers.

DOM inspection prompts should include the current URL, visible page state, relevant HTML snippets, and what element must be found.

Geometry analysis prompts should include candidate bounding boxes, viewport dimensions, selected and rejected candidates, and expected visual target.

Candidate ranking prompts should include candidate lists, cleaned text, rejection reasons, and expected selected answer.

Submission strategy prompts should include composer details, button candidates, click coordinates, fallback strategies, and verification evidence.

Extraction strategy prompts should include raw text, visible answer, prompt text, provider chrome, candidate diagnostics, and desired cleaned response.

Filtering improvement prompts should include accepted cases, rejected cases, mixed cleanup cases, and geometry regressions.

Completion detection prompts should include response stability, stop controls, generating indicators, polling logs, and timeout behavior.

Overlay handling prompts should include screenshot evidence, modal text, dismiss controls, and whether the overlay blocks interaction.

Structured browser prompts help AI reason about the exact lifecycle stage instead of treating all browser failures as the same kind of bug.

## Architecture Conversations

Productive architecture discussions should precede major implementation.

Tradeoff analysis should compare reliability, maintainability, complexity, extensibility, diagnostics, performance, and user experience.

Alternative designs should be considered before choosing a path. The best design is often not the first one proposed.

Long-term maintainability should be explicit. A design that works once but is hard to extend is not a good fit for Maestriss.

Failure modes should be discussed. The architecture should explain what happens when providers change, browser state is invalid, or extraction fails.

Future extensibility should be considered without overengineering. A design should allow growth while solving the current problem.

Performance implications should be considered after correctness and reliability.

Architecture discussions should precede major implementation because misplaced architecture is expensive to undo.

## AI Code Review

AI code review should examine more than syntax.

Correctness review asks whether the code does what it claims under realistic runtime conditions.

Maintainability review asks whether future engineers can understand and modify the code.

Architecture review asks whether the change belongs in the correct layer and preserves subsystem boundaries.

Testing review asks whether the validation matches the risk and whether regressions were added where appropriate.

Diagnostics review asks whether failures will be understandable.

Performance review asks whether the change adds unnecessary cost or inefficient polling.

Documentation review asks whether permanent references or the development journal should be updated.

Future compatibility review asks whether the change is brittle against provider UI changes, browser changes, or workflow expansion.

Reviews should extend beyond syntax because syntactically valid code can still be architecturally wrong, untestable, or undiagnosable.

## Multi-AI Collaboration

Multiple AI systems can collaborate by providing independent reasoning and review.

Independent solutions can reveal different approaches to the same problem. Comparing them can expose assumptions.

Consensus can be useful when several systems independently converge on a similar conclusion. It should still be reviewed against evidence.

Disagreement is valuable. It can reveal hidden risks, ambiguous requirements, or alternative designs.

Cross-review allows one system to critique another's proposed implementation or architecture.

Alternative approaches can be explored before committing to code.

Architecture validation benefits from multiple perspectives because long-term maintainability often depends on tradeoffs.

Diversity often produces stronger engineering outcomes because different systems may notice different failure modes or design implications.

## Iterative Development

Iterative engineering is the preferred mode for Maestriss.

Small improvements reduce risk. They make it easier to validate behavior and isolate regressions.

Frequent testing catches problems early. A bug found immediately after a small change is easier to diagnose.

Continuous refinement allows the system to improve without disruptive rewrites.

Learning from failures is central. Each failure should teach the project something durable.

Avoiding rewrites preserves working behavior. Large speculative implementations often discard useful edge-case handling.

Iteration consistently outperforms large speculative implementations because Maestriss operates against changing external systems. Adaptability is more valuable than grand rewrites.

## Prompt Libraries

Reusable prompt libraries should be maintained as the project matures.

Driver prompts can standardize how new provider drivers are designed, implemented, tested, and documented.

Architecture prompts can guide design reviews, tradeoff analysis, and boundary checks.

Testing prompts can generate smoke plans, regression cases, and validation strategies.

Documentation prompts can preserve the style and structure of permanent reference documents.

Regression prompts can convert observed failures into deterministic tests.

Review prompts can standardize code review expectations.

Institutional knowledge should be preserved because good prompts encode the project's engineering process. Reusable prompts help future contributors work consistently.

## Engineering Conversations

Productive engineering conversations have recognizable characteristics.

They ask why. Understanding the reason behind a design prevents shallow implementation.

They challenge assumptions. Browser automation assumptions are often wrong.

They request tradeoffs. Every architecture choice has costs.

They explore alternatives before committing.

They validate understanding by restating the problem and expected outcome.

They summarize decisions so knowledge can be carried forward.

Conversation quality influences engineering quality because the conversation defines what the AI optimizes for. A careful conversation produces careful engineering.

## Common Prompting Mistakes

"Just fix it" is an anti-pattern. It hides context, scope, and success criteria.

Missing context leads to generic solutions that may not fit Maestriss architecture.

Large unrelated requests create risk. They are difficult to validate and often mix concerns.

Skipping diagnostics causes guess-driven fixes.

Jumping directly to implementation can place code in the wrong layer.

Requesting complete rewrites discards working behavior and regression knowledge.

Ignoring architecture produces solutions that may work locally but damage maintainability.

These mistakes reduce solution quality because they force AI to infer what should have been specified.

## AI Limitations

AI systems have real limitations.

Hallucinations can produce false facts, nonexistent APIs, or incorrect assumptions.

Incomplete context can lead to plausible but wrong solutions.

Changing provider knowledge is a major issue. AI may not know the current behavior of a live provider website.

Outdated assumptions can appear in suggestions about libraries, browser APIs, provider UI, or project state.

Overconfidence can make uncertain conclusions sound definitive.

Context window limitations can cause important earlier details to be lost or compressed.

Engineers should compensate by providing context, checking source code, using diagnostics, running tests, verifying outputs, and documenting confirmed decisions.

## Human Responsibilities

Human engineers retain final responsibility for Maestriss.

Architecture decisions require human judgment about project direction, maintainability, and tradeoffs.

Final judgment belongs to the engineer. AI suggestions must be evaluated.

Testing and validation remain required. A generated solution must pass the same engineering standards as any other solution.

Security decisions require careful human oversight, especially around browser sessions, authentication, credentials, and external integrations.

Project direction is a human responsibility. AI can advise, but humans decide priorities.

AI augments engineering rather than replacing engineering responsibility. The engineer remains accountable for what enters the project.

## Building Institutional Knowledge

Important conversations should become permanent knowledge.

Reference documents preserve stable architecture, philosophy, process, and lessons.

Regression tests preserve discovered bugs and provider behavior.

Design journals capture current status, decisions, known issues, and development priorities.

Architecture documents explain the system to future maintainers.

Lessons learned convert failures into engineering principles.

Engineering standards preserve how the project should be developed.

Discoveries should migrate from conversations into documentation because chat history is not a reliable long-term knowledge base. Permanent project files are.

## Long-Term Vision

AI-assisted software engineering should improve alongside Maestriss itself.

The project should continuously improve both its software and the way engineers collaborate with AI. Better prompts, better diagnostics, better reference documents, and better regression patterns should make future work easier.

The engineering process itself should evolve alongside the platform. As Maestriss develops orchestration features, it can also become a better environment for coordinating AI-assisted development.

Long term, Maestriss should demonstrate disciplined human-AI collaboration: transparent, evidence-based, iterative, documented, and reliable.

## AI Collaboration Constitution

AI is an engineering collaborator, not an unquestioned authority.

Provide context before requesting solutions.

Design before implementing.

Diagnose before fixing.

Verify before trusting.

Prefer iteration over rewriting.

Use AI to challenge assumptions.

Use AI to compare alternatives.

Use AI to improve diagnostics.

Use AI to design regressions.

Use AI to preserve documentation.

Never accept AI output without review.

Never let AI bypass tests.

Never let AI erase architecture boundaries.

Prompts should include objectives, constraints, evidence, and success criteria.

Important discoveries should become permanent project knowledge.

Human engineers remain responsible for final judgment.

The quality of the engineering conversation shapes the quality of the engineering result.

Maestriss should continuously improve how humans and AI collaborate to build reliable software.
