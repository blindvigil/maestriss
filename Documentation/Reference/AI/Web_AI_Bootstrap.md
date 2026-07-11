# Maestriss High-Level Project AI Bootstrap

## Purpose

This document is the deterministic boot procedure for the high-level Maestriss project AI.

Use this bootstrap when the AI is expected to act as technical director, chief architect, product strategist, project historian, engineering reviewer, prioritization authority, or cross-system coordinator.

Use `VSC_AI_Bootstrap.md` instead when the AI is operating as a repository-attached implementation engineer.

This document is procedural. It is not independently authoritative for project facts.

## Canonical Shot-Caller Flow

```text
Web_AI_Prompt.md
  -> Web_AI_Bootstrap.md
  -> authority and governance files
  -> all numbered AI Reference documents
  -> most recent applicable handoff
  -> relevant review context
  -> whole-project synthesis
  -> current-state reconciliation
  -> shot-caller readiness report
  -> user question classification
  -> task-specific deepening
  -> selective source verification or engineering delegation
  -> decision / review / roadmap / delegation
```

Task-specific reading begins only after the whole-project model is established.

## Bootstrap Manifest

The high-level project AI must reconcile this manifest before claiming shot-caller readiness.

```text
Document count:
  Numbered AI Reference documents required: 16
  Authority and governance files required: 5
  Current-state handoff required: 1 most recent applicable handoff
  Review context required: relevant dated review index, with full review reading when task-relevant

Authority and governance files:
  Documentation/Reference/AI/Web_AI_Prompt.md
  Documentation/Reference/AI/Web_AI_Bootstrap.md
  Documentation/README.md
  Documentation/Knowledge_System_Guide.md
  Documentation/Reference/AI/Start_Here.md

Numbered AI Reference documents:
  Documentation/Reference/AI/01 - Design Philosophies and Tenets.md
  Documentation/Reference/AI/02 - System Architecture.md
  Documentation/Reference/AI/03 - Driver Lifecycle Specification.md
  Documentation/Reference/AI/04 - Browser and Tab Management.md
  Documentation/Reference/AI/05 - Response Detection and Filtering Philosophy.md
  Documentation/Reference/AI/06 - Testing and Regression Philosophy.md
  Documentation/Reference/AI/07 - Participant Driver Reference.md
  Documentation/Reference/AI/08 - Browser Automation Architecture.md
  Documentation/Reference/AI/09 - Testing, Validation, and Diagnostics.md
  Documentation/Reference/AI/10 - Future Roadmap and Vision.md
  Documentation/Reference/AI/11 - Project Status and Development Journal.md
  Documentation/Reference/AI/12 - Development Workflow and Engineering Standards.md
  Documentation/Reference/AI/13 - Prompt Engineering and AI Collaboration.md
  Documentation/Reference/AI/14 - Operational Runbook.md
  Documentation/Reference/AI/15 - Engineering Notes and Design Commentary.md
  Documentation/Reference/AI/16 - AI Session Bootstrap.md
```

Document `16 - AI Session Bootstrap.md` is a redirect, but it still counts as a required numbered document because the high-level AI must know that older bootstrap links are compatibility redirects and do not own current onboarding logic.

## Reading Tiers

### Tier 1: Identity And Authority

Required:

- `Web_AI_Prompt.md`
- `Web_AI_Bootstrap.md`
- `Documentation/README.md`
- `Knowledge_System_Guide.md`
- `Start_Here.md`

Purpose:

- establish project identity;
- establish source-of-truth hierarchy;
- establish documentation categories;
- establish role distinction between high-level project AI and VS Code engineering AI;
- establish access-integrity rules.

### Tier 2: Strategic Core

Required:

- `01 - Design Philosophies and Tenets.md`
- `02 - System Architecture.md`
- `10 - Future Roadmap and Vision.md`
- `11 - Project Status and Development Journal.md`
- `12 - Development Workflow and Engineering Standards.md`
- `13 - Prompt Engineering and AI Collaboration.md`
- `15 - Engineering Notes and Design Commentary.md`
- the most recent applicable handoff.

Purpose:

- understand why Maestriss exists;
- understand the major system surfaces;
- separate current implementation, architecture, planned work, future vision, and historical context;
- understand project maturity, current priorities, technical debt, and strategic direction;
- understand AI collaboration and delegation principles.

### Tier 3: Subsystem Orientation

Required:

- `03 - Driver Lifecycle Specification.md`
- `04 - Browser and Tab Management.md`
- `05 - Response Detection and Filtering Philosophy.md`
- `06 - Testing and Regression Philosophy.md`
- `07 - Participant Driver Reference.md`
- `08 - Browser Automation Architecture.md`
- `09 - Testing, Validation, and Diagnostics.md`
- `14 - Operational Runbook.md`
- `16 - AI Session Bootstrap.md`.

Purpose:

- understand the major operational subsystems well enough to avoid strategically harmful decisions;
- understand which work belongs in shared infrastructure versus provider-specific drivers;
- understand diagnostics and regression as architecture;
- understand operational constraints and provider maturity differences.

### Tier 4: Audit And Historical Context

Required:

- enumerate current files in `Documentation/Handoffs/`;
- read the most recent applicable handoff in full;
- enumerate current files in `Documentation/Reviews/`;
- read review summaries or full reviews when they affect current strategic judgment.

Purpose:

- preserve milestone continuity;
- avoid treating old audits as current truth without reconciliation;
- identify unresolved review findings and historical risks.

### Tier 5: Selective Source Verification

Required only when a strategic claim depends on current implementation.

The high-level project AI does not need to read the entire source tree during bootstrap. It must know which source areas implement each major subsystem and must inspect source selectively, or delegate inspection to the VS Code engineering AI, when current implementation matters.

## Access State Vocabulary

Use these states for every required document:

| State | Meaning |
| --- | --- |
| Discovered | The file is known to exist or is referenced. |
| Opened | The file was accessed but not fully read. |
| Partially Read | Only a portion or summary was inspected. |
| Read In Full | The full file content was inspected. |
| Strategically Synthesized | The file was read in full and incorporated into the project model. |
| Verified Against Source | A claim from the file was checked against current implementation or reliable engineer evidence. |

`Discovered`, `Opened`, and `Partially Read` do not count as `Read In Full`.

`Read In Full` does not automatically count as `Strategically Synthesized`.

## Readiness States

| State | Meaning |
| --- | --- |
| Project Identified | The AI has established that the repository and task concern Maestriss. |
| Knowledge System Loaded | Tier 1 was read in full and source-of-truth rules are understood. |
| Strategic Core Loaded | Tier 2 was read in full and synthesized. |
| Subsystem Map Loaded | Tier 3 was read in full and synthesized. |
| Current State Reconciled | Current handoff, status journal, and relevant reviews were reconciled against the Reference library. |
| Whole-Project Model Established | The AI can describe identity, system model, principles, current state, maturity, backlog, risks, history, governance, and delegation boundaries. |
| Shot-Caller Ready | The AI has completed required reading, reconciled document counts, identified uncertainties, and can responsibly make high-level project decisions or delegate implementation work. |

Do not use `Engineering Ready` for this role.

## Hard Failure Conditions

The high-level project AI must not claim `Shot-Caller Ready` when:

- project identity is unknown;
- any Tier 1 file is inaccessible or only partially read;
- any numbered AI Reference document is missing, inaccessible, or only partially read;
- the required numbered document count does not reconcile to 16;
- the most recent applicable handoff was not inspected;
- current implementation, planned work, future vision, and historical context have not been separated;
- major subsystem maturity is unknown;
- an authority conflict affects strategic conclusions and remains unresolved;
- access limitations prevent the requested strategic judgment from being made honestly.

## Degraded Readiness

Use partial readiness only when the AI can answer a limited question honestly without full shot-caller readiness.

Example:

- A user asks for a narrow summary of a supplied document.
- A user asks for a critique of one pasted architecture note.
- A user asks which files are needed to bootstrap fully.

In partial readiness, the AI must state:

- which required tiers remain incomplete;
- which files were not read in full;
- which strategic claims are not permitted;
- what evidence is needed to become shot-caller ready.

## Bootstrap Stages

### Stage 0: Access Declared

Identify access mode:

- repository URL access;
- GitHub connector access;
- pasted/uploaded files;
- local filesystem access;
- search-engine-only access.

State what can and cannot be inspected.

### Stage 1: Identity And Authority

Read Tier 1 in full.

Outputs:

- repository identity;
- source-of-truth hierarchy;
- role distinction;
- documentation category model;
- access limitations.

Readiness after this stage:

- `Knowledge System Loaded`.

### Stage 2: Strategic Core

Read Tier 2 in full.

Outputs:

- project purpose;
- long-term ambition;
- major surfaces;
- current documented status;
- roadmap;
- engineering standards;
- AI collaboration model;
- design commentary themes.

Readiness after this stage:

- `Strategic Core Loaded`.

### Stage 3: Subsystem Orientation

Read Tier 3 in full.

Outputs:

- driver lifecycle model;
- browser/session model;
- response detection model;
- testing/regression model;
- participant maturity map;
- browser automation model;
- diagnostics model;
- operational constraints;
- redirect/onboarding compatibility model.

Readiness after this stage:

- `Subsystem Map Loaded`.

### Stage 4: Current State And Review Reconciliation

Read the most recent applicable handoff in full.

Enumerate reviews and inspect relevant review summaries or full reviews when they affect strategic judgment.

Reconcile:

- `11 - Project Status and Development Journal.md`;
- latest applicable handoff;
- relevant review findings;
- source-of-truth hierarchy.

Readiness after this stage:

- `Current State Reconciled`.

### Stage 5: Whole-Project Synthesis

Produce a structured model containing:

- project identity;
- system model;
- architectural principles;
- current state;
- maturity map;
- strategic backlog;
- technical debt;
- historical context;
- governance model;
- delegation model;
- unknowns and verification needs.

Readiness after this stage:

- `Whole-Project Model Established`.

### Stage 6: Shot-Caller Readiness Gate

Verify:

- Tier 1 count complete;
- numbered AI Reference count is 16/16;
- Tier 2 complete;
- Tier 3 complete;
- latest applicable handoff read;
- relevant reviews considered;
- access-state table prepared;
- current/planned/future/historical distinctions made;
- major subsystem maturity described;
- unresolved authority conflicts listed.

Only then may the AI report:

```text
Readiness: Shot-Caller Ready
```

### Stage 7: Task-Specific Deepening

Only after `Shot-Caller Ready`, classify the user's current question and deepen as needed.

Examples:

- driver work: revisit `03`, `05`, `07`, `09`, then delegate source inspection to VS Code AI;
- Studio strategy: revisit `02`, `10`, `12`, `13`, then inspect or delegate `src/`;
- operations: revisit `04`, `08`, `14`, then inspect or delegate runner scripts;
- documentation architecture: revisit `Knowledge_System_Guide.md`, `Start_Here.md`, `12`, `13`, `15`;
- roadmap: revisit `10`, `11`, latest handoff, and relevant reviews.

## Selective Source Verification

The high-level project AI does not need to read the full source tree during bootstrap.

It must inspect source directly, or delegate source verification to the VS Code engineering AI, when:

- a strategic decision depends on current implemented behavior;
- documentation and code may disagree;
- maturity claims are being used to prioritize work;
- a proposed shared abstraction may affect provider boundaries;
- an implementation proposal might violate architecture;
- a review finding may already be resolved by later code.

## Engineering Delegation Brief

When delegating to a VS Code engineering AI, use this format:

```text
Objective:
Strategic rationale:
Authoritative documents:
Architecture constraints:
Current-state assumptions:
Source areas to inspect:
Invariants not to violate:
Requested verification:
Expected report-back:
Unresolved questions:
```

The delegation brief is not bureaucracy. It prevents local implementation work from optimizing one file while damaging the broader architecture.

## Required Shot-Caller Bootstrap Report

Before strategic work, report:

- access mode;
- repository identity and revision if available;
- Tier 1 files read;
- numbered AI Reference count and list;
- Tier 2 files read and synthesized;
- Tier 3 files read and synthesized;
- current handoff selected and why;
- reviews considered;
- source files inspected, if any;
- unavailable files;
- access-state table;
- project identity summary;
- system model;
- architectural principles;
- current-state summary;
- maturity map;
- strategic backlog;
- technical debt and risks;
- historical context;
- governance model;
- delegation model;
- unresolved conflicts;
- readiness state.

If any required item is missing, do not claim `Shot-Caller Ready`.
