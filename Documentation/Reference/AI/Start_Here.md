---
Document ID: START-HERE
Document Title: Start Here
Version: v0.2.0
Revision Date: 2026-07-10
Status: Authoritative Entry Point
Audience: AI
Purpose: AI-oriented entry point for navigating, understanding, and using the Maestriss documentation library.
Scope: Defines documentation categories, source-of-truth hierarchy, reading paths, repository areas, verification rules, and safe contribution rules.
Related Documents:
  - ../Human/Start_Here.md
  - Web_AI_Prompt.md
  - Web_AI_Bootstrap.md
  - VSC_AI_Prompt.md
  - VSC_AI_Bootstrap.md
Related Modules: Repository-wide orientation; no single source module.
Canonical Concepts Covered: Documentation hierarchy, source-of-truth hierarchy, reading paths, repository overview, contributor workflow, AI guidance.
Current Implementation Status: Documentation entry point; source code remains authoritative for current implemented behavior.
---
# Start Here

## 1. Welcome

### Purpose

`Start_Here.md` is the documentation-library entry point.

`Start_Here.md` does not fully explain Maestriss.

`Start_Here.md` explains how to navigate, verify, and use the Maestriss documentation system.

### Canonical AI Onboarding Rule

AI onboarding is split into two role-specific generated pairs:

```text
Documentation/Reference/AI/Web_AI_Prompt.md
Documentation/Reference/AI/Web_AI_Bootstrap.md
Documentation/Reference/AI/VSC_AI_Prompt.md
Documentation/Reference/AI/VSC_AI_Bootstrap.md
```

Use `Web_AI_Prompt.md` and `Web_AI_Bootstrap.md` for the Commander-in-Chief (high-level project AI): whole-project comprehension, architecture, product strategy, prioritization, design review, project history, and delegation of implementation work. The Commander does not normally perform repository implementation itself.

Use `VSC_AI_Prompt.md` and `VSC_AI_Bootstrap.md` for VS Code or repository-attached engineer AIs: local source inspection, implementation, verification, and reporting.

These generated files guide reasoning and procedure. They do not replace repository source code or the authoritative Engineering Library.

Older bootstrap, navigation, prompt, and AI session documents are redirects or historical artifacts.

### Institutional Memory Rule

The Maestriss documentation library is long-term institutional memory.

Conversation history is not authoritative project memory.

Reference documents are maintained project memory.

### Edition Rule

The Maestriss reference library has two parallel editions:

| Edition | Path | Primary Audience | Optimization |
| --- | --- | --- | --- |
| Human | `Documentation/Reference/Human/` | Human engineers and maintainers | Comprehension, rationale, narrative flow |
| AI | `Documentation/Reference/AI/` | AI assistants and code agents | Deterministic interpretation, retrieval, machine reasoning |

Both editions SHALL represent the same engineering truth.

## 2. What Is Maestriss?

### Definition

Maestriss is a software project for orchestrating conversations among multiple independent AI systems.

### Purpose

Maestriss treats AI systems as participants that can contribute, challenge, refine, and synthesize work.

### Major Surfaces

| Surface | Current Role | Current Status |
| --- | --- | --- |
| Maestriss Studio | Graphical configuration and export application | Implemented; not directly integrated with native runner |
| Native Runner | Browser automation execution engine | Current operational execution engine |
| Automa Exporter | Studio-side export path for Automa workflow artifacts | Implemented as alternate execution path |

### Constraint

Do not assume Studio-to-runner live execution exists. Current Studio-to-runner live integration is future work unless source code proves otherwise.

## 3. Documentation Philosophy

### Documentation Categories

| Category | Path | Authority | Use |
| --- | --- | --- | --- |
| Reference | `Documentation/Reference/` | Architecture, terminology, design intent, operations, standards | Permanent engineering knowledge |
| Handoffs | `Documentation/Handoffs/` | Milestone-specific status | Current-state onboarding and historical milestones |
| Reviews | `Documentation/Reviews/` | Dated audit evidence | Reconciliation findings and critiques |
| Historical records | Commit history, older handoffs, strategy notes | Historical context | Understand why decisions were made |
| Code | Repository source files | Current implemented behavior | Verify actual behavior |

### Documentation Invariant

Reference, Handoffs, Reviews, historical records, and code have different authority levels.

Do not collapse these categories.

## 4. Source Of Truth

### Hierarchy

| Rank | Source | Authoritative For |
| --- | --- | --- |
| 1 | Repository code | Current implemented behavior |
| 2 | Reference documents | Architecture, terminology, engineering philosophy, intended design, operational standards, documented status |
| 3 | Handoffs | Project state at a specific milestone date |
| 4 | Reviews | Dated findings and audit evidence |
| 5 | Conversation | Current instructions and intent only |

### Conflict Rule

If code and documentation conflict:

1. Identify the conflict explicitly.
2. State what the code currently does.
3. State what the documentation claims.
4. Determine whether code, documentation, or both should be updated.
5. Do not silently choose one source.

### Interpretation Rule

Do not infer implemented behavior from planned, future, deferred, aspirational, or normative language.

## 5. Documentation Structure

### Current Layout

```text
Documentation/
  Reference/
    README.md
    Human/
      Start_Here.md
      01 - Design Philosophies and Tenets.md
      ...
      16 - AI Session Bootstrap.md
    AI/
      Start_Here.md
      Web_AI_Prompt.md
      Web_AI_Bootstrap.md
      01 - Design Philosophies and Tenets.md
      ...
      16 - AI Session Bootstrap.md
  Handoffs/
    2026-07-10 - Native Runner Foundation Milestone.md
    2026-07-14 - Council System and Live Doctrine Execution.md
    2026-07-15 - OpenAI API Council Execution.md
  Reviews/
    Reconciliation Report - Docs vs Code (2026-07-10).md
```

### Correspondence Rule

For each numbered Human document, the AI edition has the same filename and number.

Example:

| Human Document | AI Document |
| --- | --- |
| `Human/07 - Participant Driver Reference.md` | `AI/07 - Participant Driver Reference.md` |

### Entry-Point Rule

`Start_Here.md` is unnumbered.

`Start_Here.md` is the entrance to the reference library.

`Start_Here.md` is not document zero.

## 6. Reading Paths

### New Contributor Path

1. `AI/Start_Here.md`
2. Newest file in `Documentation/Handoffs/`
3. `AI/02 - System Architecture.md`
4. `AI/03 - Driver Lifecycle Specification.md`
5. `AI/01 - Design Philosophies and Tenets.md`
6. `AI/11 - Project Status and Development Journal.md`

### Architecture Path

1. `AI/02 - System Architecture.md`
2. `AI/04 - Browser and Tab Management.md`
3. `AI/08 - Browser Automation Architecture.md`
4. `AI/10 - Future Roadmap and Vision.md`
5. `AI/15 - Engineering Notes and Design Commentary.md`

### Participant Driver Path

1. `AI/03 - Driver Lifecycle Specification.md`
2. `AI/05 - Response Detection and Filtering Philosophy.md`
3. `AI/07 - Participant Driver Reference.md`
4. `AI/09 - Testing, Validation, and Diagnostics.md`
5. Relevant `runner/src/drivers/` files

### Browser Automation Path

1. `AI/04 - Browser and Tab Management.md`
2. `AI/08 - Browser Automation Architecture.md`
3. `AI/14 - Operational Runbook.md`
4. `runner/src/server.ts`
5. `runner/src/runner.ts`
6. `runner/restart-runner.ps1`

### Testing Path

1. `AI/06 - Testing and Regression Philosophy.md`
2. `AI/09 - Testing, Validation, and Diagnostics.md`
3. Provider-specific `*FilterAssertions.ts` files in `runner/src/`
4. `runner/package.json`

### Studio Path

1. `AI/02 - System Architecture.md`
2. `AI/10 - Future Roadmap and Vision.md`
3. `AI/13 - Prompt Engineering and AI Collaboration.md`
4. `src/`
5. `src/exporters/automa/`
6. `docs/automa-export-strategy.md`

### Native Runner Path

1. `AI/03 - Driver Lifecycle Specification.md`
2. `AI/04 - Browser and Tab Management.md`
3. `AI/07 - Participant Driver Reference.md`
4. `AI/14 - Operational Runbook.md`
5. `runner/README.md`
6. `runner/src/server.ts`

### Documentation Work Path

1. `AI/Start_Here.md`
2. `Documentation/Reference/README.md`
3. `AI/12 - Development Workflow and Engineering Standards.md`
4. `AI/13 - Prompt Engineering and AI Collaboration.md`
5. `AI/15 - Engineering Notes and Design Commentary.md`

### Bug Fixing Path

1. Newest handoff
2. Relevant task-specific path
3. Relevant source files
4. Relevant regression assertions
5. `AI/09 - Testing, Validation, and Diagnostics.md`

### Planning And Roadmap Path

1. `AI/10 - Future Roadmap and Vision.md`
2. `AI/11 - Project Status and Development Journal.md`
3. `AI/15 - Engineering Notes and Design Commentary.md`
4. Newest handoff

### AI Onboarding Path

1. Choose the role-specific pair:
   - High-level project AI: `AI/Web_AI_Prompt.md`, then `AI/Web_AI_Bootstrap.md`
   - VS Code engineer: `AI/VSC_AI_Prompt.md`, then `AI/VSC_AI_Bootstrap.md`
2. `AI/Start_Here.md`
3. Newest handoff
4. `AI/02 - System Architecture.md`
5. `AI/03 - Driver Lifecycle Specification.md`
6. `AI/01 - Design Philosophies and Tenets.md`
7. `AI/11 - Project Status and Development Journal.md`

## 7. Repository Overview

| Area | Path | Purpose |
| --- | --- | --- |
| Runner | `runner/` | Native browser automation engine, CLI, server, participant drivers, filters, diagnostics, regression assertions |
| Studio | `src/` | React graphical application for configuration, participants, prompts, profiles, sessions, exports |
| Documentation | `Documentation/` | Reference editions, handoffs, reviews, onboarding guidance |
| Exports | `src/exporters/` | Export implementations, including Automa workflow export |
| Reference fixtures | `src/reference/` | Supporting fixture material for exporter/schema reference |
| Scripts | package scripts and `runner/restart-runner.ps1` | Build, run, test, restart, and operational helper commands |

### Non-Goal

Do not treat this section as a directory dump.

Use this section to identify responsibility areas.

## 8. Current Project State

### Current-State Discovery Algorithm

1. Run or inspect `git log`.
2. Read newest file in `Documentation/Handoffs/`.
3. Read `AI/11 - Project Status and Development Journal.md`.
4. Verify important claims against source code.
5. Treat `Documentation/Reviews/` as dated audit evidence.

### Current-State Constraints

| Claim | Status |
| --- | --- |
| Native runner is operational execution engine | Current |
| Studio configures and exports | Current |
| Studio directly executes live runner workflows | Not current; future integration |
| Reviews are automatically current | False |

## 9. Working Effectively

### Required Work Pattern

1. Read relevant documentation first.
2. Identify whether task concerns current implementation, planned architecture, documentation, or operations.
3. Verify current behavior against code.
4. Make focused changes.
5. Run appropriate tests.
6. Update documentation if engineering truth changes.
7. Report commands, results, skipped checks, and risks.

### Boundary Rules

| Concern | Owner |
| --- | --- |
| Provider-specific quirks | Provider driver/filtering module |
| Shared lifecycle | Runner/server infrastructure |
| Current implemented behavior | Source code |
| Architecture and terminology | Reference documents |
| Milestone state | Handoff documents |
| Audit findings | Review documents |

### Safety Rules

- Do not perform broad refactors without justification.
- Do not assume planned architecture is implemented.
- Do not apply one provider's filtering rule to every provider.
- Do not update only one reference edition when engineering truth changes.
- Do not run operational scripts without reading the runbook.

## 10. AI Guidance

### Repository-Aware AI

Repository-aware AI SHALL:

1. Read `Documentation/Reference/AI/VSC_AI_Prompt.md` when acting as an implementation agent.
2. Read `Documentation/Reference/AI/VSC_AI_Bootstrap.md` when acting as an implementation agent.
3. Read `Documentation/Reference/AI/Start_Here.md`.
4. Verify claims against source files.
5. Use `rg`, builds, and relevant tests where available.
6. Report doc-vs-code conflicts.

### Web-Based AI

Web-based AI SHOULD:

1. Read `Documentation/Reference/AI/Web_AI_Prompt.md`.
2. Read `Documentation/Reference/AI/Web_AI_Bootstrap.md`.
3. Use the public repository when available.
4. Request pasted documents and source files when repository access is unavailable.
5. State which claims cannot be verified.
6. Avoid guessing code behavior.

### Implementation-State Rule

AI assistants MUST distinguish:

- implemented behavior;
- partially implemented behavior;
- planned architecture;
- deferred work;
- future ideas;
- historical information;
- normative requirements;
- informative rationale.

## 11. Common Mistakes

| Mistake | Correction |
| --- | --- |
| Reading only reviews | Read newest handoff and reference docs; verify findings against code |
| Assuming documentation overrides code | Code controls current implemented behavior |
| Treating planned features as implemented | Check source files and status labels |
| Ignoring handoffs | Read newest handoff before substantial work |
| Skipping verification | Verify claims against source code |
| Changing architecture without context | Read design philosophy and architecture docs first |
| Putting provider quirks into server orchestration | Keep provider quirks in drivers/filters |
| Generalizing one provider's filter rule | Keep provider-specific evidence isolated |
| Updating one edition only | Update Human and AI editions together |
| Running scripts blindly | Read operational runbook first |
| Assuming Studio-runner integration exists | Verify in `src/` and runner API usage |

## 12. Quick Reference

| Need | Read |
| --- | --- |
| Documentation entry point | `Human/Start_Here.md` or `AI/Start_Here.md` |
| Latest project state | Newest file in `Documentation/Handoffs/` |
| Architecture | `02 - System Architecture.md` |
| Driver lifecycle | `03 - Driver Lifecycle Specification.md` |
| Response detection | `05 - Response Detection and Filtering Philosophy.md` |
| Participant drivers | `03`, `05`, `07`, `09` |
| Browser automation | `04`, `08`, `14` |
| Testing and diagnostics | `06`, `09` |
| Operations | `14 - Operational Runbook.md` |
| Roadmap | `10 - Future Roadmap and Vision.md` |
| Current status | `11 - Project Status and Development Journal.md` |
| Engineering workflow | `12 - Development Workflow and Engineering Standards.md` |
| AI collaboration | `13 - Prompt Engineering and AI Collaboration.md` |
| Design commentary | `15 - Engineering Notes and Design Commentary.md` |
| High-level project AI onboarding | `AI/Web_AI_Prompt.md` and `AI/Web_AI_Bootstrap.md` |
| VS Code AI onboarding | `AI/VSC_AI_Prompt.md` and `AI/VSC_AI_Bootstrap.md` |
| Audit findings | `Documentation/Reviews/` |

## 13. Success Criteria

After reading `Start_Here.md`, a contributor SHALL know:

- what Maestriss is;
- how the documentation is organized;
- which documents to read next;
- how to verify information;
- where authoritative information lives;
- how to distinguish current behavior from planned architecture;
- how to contribute safely.

### Completion Test

A new contributor can proceed when the contributor can answer:

1. What is the source-of-truth hierarchy?
2. Where is the newest milestone handoff?
3. Which edition should an AI read first?
4. Which docs explain architecture, drivers, testing, operations, and roadmap?
5. How should doc-vs-code conflicts be handled?
