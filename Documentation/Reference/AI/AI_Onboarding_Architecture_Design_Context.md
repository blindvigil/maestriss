---
Document ID: AI-ONBOARDING-DESIGN-CONTEXT
Document Title: AI Onboarding Architecture Design Context
Status: Historical Design Context
Audience: AI
Authority: Non-authoritative
Purpose: Preserve the reasoning that led to the current AI onboarding architecture so future AI systems can interpret it correctly without treating this document as current engineering truth.
Canonical Sources:
  - Documentation/Reference/AI/Web_AI_Prompt.md
  - Documentation/Reference/AI/Web_AI_Bootstrap.md
  - Documentation/Reference/AI/VSC_AI_Prompt.md
  - Documentation/Reference/AI/VSC_AI_Bootstrap.md
  - Documentation/Reference/AI/Start_Here.md
  - Documentation/Knowledge_System_Guide.md
  - MANIFESTO.md
  - Current source code
Maintenance Rule: Update only when the onboarding architecture itself changes materially.
---

# AI Onboarding Architecture Design Context

## 1. Read This Document Correctly

This document records the design reasoning that led to the current AI onboarding model.

The current implementation has evolved into two role-specific generated onboarding pairs:

- `Web_AI_Prompt.md` and `Web_AI_Bootstrap.md` for high-level project AI sessions.
- `VSC_AI_Prompt.md` and `VSC_AI_Bootstrap.md` for VS Code or repository-attached engineer AI sessions.

The older discussion in this document about `Web_AI_Prompt.md` and `Web_AI_Bootstrap.md` remains useful as historical rationale for generated onboarding artifacts, but it should not be read as limiting the architecture to only one pair.

It is not:

- the canonical bootstrap procedure;
- the canonical AI prompt;
- a current architecture specification;
- a substitute for the Engineering Library;
- a substitute for source code;
- a current project-status report.

Use it to understand why the onboarding system is structured as it is.

For current truth, follow the active onboarding path and source-of-truth hierarchy.

## 2. Problem Being Solved

The project accumulated onboarding, bootstrap, navigation, and AI-orientation material across multiple locations and formats.

Examples included:

- `Start_Here.md`;
- session bootstrap documents;
- web-AI bootstrap prompts;
- navigation guides;
- `.txt` bootstrap files;
- README files;
- handoffs;
- reviews;
- the Knowledge System Guide;
- the repository manifesto.

This created several risks:

- duplicated onboarding logic;
- contradictory instructions;
- stale guidance;
- multiple competing entry points;
- uncertainty about which file was authoritative;
- repeated project summaries that could drift;
- excessive token use;
- web AIs falsely claiming repository understanding;
- generated onboarding material becoming mistaken for engineering truth.

The desired outcome was one obvious onboarding path with strict separation of responsibilities.

## 3. Core Three-Part Model

The onboarding architecture was deliberately separated into three layers.

### 3.1 `Web_AI_Prompt.md` - How To Think

`Web_AI_Prompt.md` configures the AI's reasoning discipline before repository learning begins.

It should define:

- how to interpret evidence;
- how to handle uncertainty;
- how to distinguish fact from inference;
- how to respect architecture;
- how to report confidence;
- how to detect source conflicts;
- how to avoid terminology drift;
- how to avoid hallucination;
- how to behave when access is incomplete.

It should not attempt to teach the full repository.

Its role is behavioral and epistemic.

### 3.2 `Web_AI_Bootstrap.md` - How To Learn

`Web_AI_Bootstrap.md` is the procedural boot sequence.

It should define:

- where to begin;
- what to read;
- what to verify;
- how to select a task-specific reading path;
- how to inspect source code;
- how to reconcile documentation with implementation;
- when to stop;
- when to continue in degraded mode;
- how to calculate and report confidence;
- how to determine readiness.

Its role is operational.

### 3.3 Engineering Library - What Is True

The Engineering Library contains the durable project knowledge.

It owns:

- architecture;
- terminology;
- engineering philosophy;
- operational standards;
- documented implementation state;
- current and planned boundaries;
- project-specific knowledge.

The Prompt and Bootstrap must never become competing sources of truth.

## 4. Authority Model

The intended authority relationship is:

```text
Current source code
        |
        v
Authoritative Engineering Library
        |
        v
Current handoff and status artifacts
        |
        v
Generated Web_AI_Prompt.md
        |
        v
Procedural Web_AI_Bootstrap.md
        |
        v
Historical reviews and prior onboarding artifacts
        |
        v
Conversation
```

Interpretation notes:

- Source code is authoritative for current implemented behavior.
- Reference documentation is authoritative for architecture, terminology, intent, standards, and documented project knowledge.
- Handoffs are milestone snapshots.
- Reviews are dated evidence and may describe problems that were later fixed.
- Generated onboarding files are not authoritative for project facts.
- Conversation is not durable project memory.

When sources disagree, report the disagreement explicitly.

Do not silently choose one.

## 5. Why the Prompt Should Not Be a Repository Summary

An earlier instinct was to make `Web_AI_Prompt.md` extremely long and pack it with as much project information as possible.

That approach was revised.

The stronger design is:

> Use as much space as durable reasoning value requires, but no more.

A large prompt that duplicates project facts creates these problems:

- expensive token use;
- stale embedded facts;
- duplicated architecture;
- conflict with the Engineering Library;
- false confidence before repository inspection;
- maintenance burden;
- reduced portability across AI systems.

The Prompt should therefore maximize engineering value per token, not raw length.

It should teach interpretation, not duplicate the repository.

## 6. Generated Artifact Principle

`Web_AI_Prompt.md` is best treated as a generated synthesis.

Its inputs may include:

- `MANIFESTO.md`;
- `Documentation/Knowledge_System_Guide.md`;
- authoritative AI Reference documents;
- engineering standards;
- canonical terminology;
- architecture references;
- the latest applicable handoff;
- current repository metadata.

Important constraints:

- it must identify itself as generated;
- it must identify the source commit or revision when possible;
- it must list its authoritative inputs;
- it must warn against manual drift;
- it must not become an independent source of truth;
- it must distinguish current manual generation from any future automation.

The repository's authoritative documents should be edited directly.

The Prompt should be regenerated from them.

## 7. Deterministic Bootstrap Principle

`Web_AI_Bootstrap.md` should resemble an engineering protocol more than explanatory prose.

Preferred structures include:

- ordered procedures;
- state transitions;
- verification gates;
- decision trees;
- entry conditions;
- exit criteria;
- explicit evidence requirements;
- required reports;
- failure modes;
- degraded modes.

The bootstrap process should be auditable.

A future AI should be able to state exactly:

- what it read;
- what it could not access;
- what it verified;
- what remains uncertain;
- why it believes it is ready;
- what scope of work is justified.

## 8. Bootstrap Levels

The exact names may evolve, but the intended progression is similar to:

```text
Level 0 - Prompt Loaded
Level 1 - Repository Identified
Level 2 - Knowledge System Located
Level 3 - Mandatory Authority Files Read
Level 4 - Documentation Model Understood
Level 5 - Architecture Reconciled
Level 6 - Task-Relevant Implementation Inspected
Level 7 - Confidence Assessed
Level 8 - Engineering Ready
```

Each level should define:

- entry conditions;
- required actions;
- required evidence;
- outputs;
- completion criteria;
- failure conditions;
- next state.

Bootstrap completion should be based on evidence rather than intuition.

## 9. Fail-Closed and Degraded Readiness

The bootstrap system should never silently continue through major uncertainty.

However, not every missing file should produce total failure.

Two states are required.

### 9.1 Hard Failure

Use hard failure when:

- project identity cannot be established;
- the repository cannot be located;
- the canonical documentation entry point is missing;
- mandatory authority files conflict irreconcilably;
- terminology cannot be reconciled;
- the source-of-truth hierarchy is unclear;
- a canonical bootstrap file is broken;
- confidence is too low for the requested task.

The AI must stop and report the problem.

### 9.2 Degraded Readiness

Use degraded readiness when:

- optional files are inaccessible;
- historical files cannot be read;
- live tests cannot be run;
- repository access is read-only;
- some task-irrelevant material is unavailable;
- operational verification is unavailable.

In degraded mode, the AI must:

- identify exactly what is unavailable;
- state what remains supported;
- state what cannot be verified;
- constrain the task scope;
- avoid claiming full readiness;
- request missing evidence when necessary.

## 10. Task-Specific Reading

A bootstrapper should not read every document for every task.

The intended model is:

```text
Prompt
  |
  v
Bootstrap
  |
  v
Start Here
  |
  v
Task-specific reading path
  |
  v
Task-relevant source code
  |
  v
Relevant tests, scripts, and diagnostics
```

This improves:

- token efficiency;
- retrieval precision;
- onboarding speed;
- confidence accuracy;
- relevance.

A documentation task, driver task, architecture task, operations task, or UI task may require different reading paths.

## 11. Confidence Reporting

The system should avoid fake numerical precision.

Recommended confidence levels:

- Insufficient
- Low
- Moderate
- High

Confidence should be based on:

- authoritative files successfully read;
- repository revision known or unknown;
- source code inspected;
- tests or diagnostics inspected;
- unresolved conflicts;
- inaccessible evidence;
- requested task scope.

The AI should explain the reason for the assigned confidence level.

## 12. Required Bootstrap Report

Before beginning substantive project work, the AI should report:

- project identified;
- repository and revision inspected;
- Prompt version;
- Bootstrap version;
- authoritative files read;
- task-specific documents read;
- source files inspected;
- tests or diagnostics inspected;
- architecture summary;
- current-state summary;
- terminology confirmed;
- documentation/code conflicts;
- inaccessible evidence;
- assumptions;
- confidence level;
- readiness status;
- permitted task scope;
- next evidence required.

This report is a gate, not a formality.

## 13. Documentation Consolidation Rules

The project intentionally moved toward two canonical onboarding documents.

Other onboarding-related artifacts should be classified as one of:

- Authoritative Source
- Generated Artifact
- Canonical Procedure
- Redirect
- Historical
- Review Evidence
- Delete

Active onboarding logic should not be repeated across many files.

Redirects should be short and unambiguous.

Historical handoffs and reviews may retain old language, but they must not be mistaken for current onboarding instructions.

Useful `.txt` onboarding files should either be converted to Markdown, merged, archived, or removed.

## 14. Why One Obvious Entry Path Matters

Multiple entry points create uncertainty.

A fresh AI should not have to decide among:

- `Start_Here.md`;
- a web prompt;
- a session bootstrap;
- a navigation guide;
- a root bootstrap file;
- a handoff;
- a README.

The intended convergence is:

```text
Web_AI_Prompt.md
    |
    v
Web_AI_Bootstrap.md
    |
    v
Start_Here.md
    |
    v
Task-specific Engineering Library path
    |
    v
Task-relevant code and tests
```

This path should be reflected consistently in:

- README files;
- redirects;
- Start Here documents;
- the Knowledge System Guide;
- generated prompt metadata;
- any future onboarding tooling.

## 15. Human and AI Editions

The project uses parallel Human and AI reference editions.

They should represent the same engineering truth.

The difference is presentation:

- Human documents optimize for explanation, rationale, and narrative flow.
- AI documents optimize for deterministic interpretation, stable terminology, retrieval, metadata, explicit constraints, and machine reasoning.

An AI should normally use the AI edition first.

It may consult the Human edition for additional explanatory context.

Neither edition should drift in facts, maturity labels, or architecture.

## 16. Knowledge-System Principle

The documentation should evolve more often than it multiplies.

New permanent documents should not be created casually.

Before adding one, define:

- why it exists;
- what it owns;
- what it does not own;
- how it relates to existing documents;
- who should read it;
- whether the same information belongs in an existing authoritative document.

The Knowledge System is intended to prevent documentation sprawl.

## 17. Important Behavioral Rules for Future AI Systems

A future AI working in this repository should:

- state what it actually accessed;
- never claim to have read an entire folder without evidence;
- distinguish repository access from ordinary web access;
- distinguish direct file access from search-index visibility;
- verify implementation claims against code;
- avoid broad redesign without evidence;
- preserve established terminology;
- label assumptions;
- report conflicts;
- treat reviews as dated evidence;
- treat handoffs as milestone state;
- avoid treating generated prompts as authority;
- avoid updating only one documentation edition;
- avoid silently repairing ambiguity through invention.

## 18. Lessons From the Design Process

The following lessons motivated the final model:

1. A shared folder link is not a dependable bootstrap interface for every web AI.
2. Direct repository file access is more reliable than assuming folder enumeration.
3. An AI must list what it actually read.
4. A large prompt is not automatically a better prompt.
5. Project facts belong in authoritative project documents.
6. Behavioral rules belong in the Prompt.
7. Acquisition and verification procedures belong in the Bootstrap.
8. Current implementation must be verified against code.
9. Incomplete access should produce either hard failure or constrained degraded readiness.
10. Documentation architecture is part of the engineering system, not clerical support.

## 19. What This Document Does Not Prove

This document does not prove:

- that the current Prompt is fully synchronized;
- that Bootstrap automation exists;
- that every redirect has been updated;
- that all obsolete onboarding files have been removed;
- that every current repository path remains unchanged;
- that all listed bootstrap levels are implemented exactly as shown.

Verify those matters against the current repository.

## 20. Recommended Use

A bootstrapper may read this document after the canonical Prompt, Bootstrap, and Start Here files when it needs design rationale.

Do not place it ahead of the canonical onboarding path.

Recommended classification:

```text
Historical Design Context
Non-authoritative
AI-oriented
Onboarding architecture rationale
```

Its primary value is preserving intent so future maintainers do not collapse the system back into:

- one enormous project summary;
- many competing bootstrap files;
- a prompt that duplicates the Engineering Library;
- a procedure with no objective readiness gate;
- or an onboarding process that silently guesses through missing evidence.
