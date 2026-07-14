# Maestriss Knowledge System Guide

## Table of Contents

1. [Purpose](#purpose)
2. [Documentation Architecture](#documentation-architecture)
3. [Dependency Diagram](#dependency-diagram)
4. [Documentation Category Responsibilities](#documentation-category-responsibilities)
5. [Core Terminology](#core-terminology)
6. [Master Concept Index](#master-concept-index)
7. [Document Responsibility Matrix](#document-responsibility-matrix)
8. [Code-to-Documentation Map](#code-to-documentation-map)
9. [Reading Maps](#reading-maps)
10. [Human and AI Edition Synchronization](#human-and-ai-edition-synchronization)
11. [Cross-Reference Standards](#cross-reference-standards)
12. [Editorial Standards](#editorial-standards)
13. [Versioning and Maintenance Strategy](#versioning-and-maintenance-strategy)
14. [Documentation Growth Rule](#documentation-growth-rule)
15. [Infrastructure Decisions](#infrastructure-decisions)
16. [Recommended Implementation Order](#recommended-implementation-order)
17. [Permanent Reference vs Governance Artifacts](#permanent-reference-vs-governance-artifacts)
18. [Simplification Opportunities](#simplification-opportunities)

## Purpose

This guide is the operating system for the Maestriss documentation library.

The Reference library preserves the engineering memory of Maestriss. This guide explains how that memory is organized, discovered, maintained, cross-referenced, synchronized, and verified.

This guide exists so a future human engineer or AI assistant can answer these questions without guessing:

- What document owns this concept?
- Where should this information be edited?
- Where is this implemented?
- What should be read for this task?
- What terminology is authoritative?
- Which documents must remain synchronized?
- How should documentation changes be governed?

This guide deliberately does not replace the numbered Reference documents. It is a navigation and governance layer around them.

## Documentation Architecture

The Maestriss documentation system has five authority layers:

1. Repository code
2. Reference documents
3. Handoff documents
4. Review documents
5. Conversation and active instructions

These layers must not be collapsed. They answer different questions.

Repository code answers what the system currently does.

Reference documents answer what the architecture means, how the project should be reasoned about, what terminology is authoritative, and what standards govern future changes.

Handoff documents answer what was true at a milestone.

Review documents answer what an audit or editorial review found at a point in time.

Conversation answers what the user is asking for now, but conversation is not durable project memory.

The larger project now has three primary pillars:

```text
                    Maestriss

          +-------------+-------------+
          |             |             |
          v             v             v
   Native Runner      Studio    Knowledge System
          |             |             |
          +-------------+-------------+
                        |
                        v
             Human + AI Documentation
```

The Knowledge System is not merely support material. It is one of the primary components of the project because it preserves the rules, terminology, memory, and verification discipline that make future human and AI maintenance possible.

## Dependency Diagram

```text
                               Conversation
                                    |
                                    v
                             Active Work Item
                                    |
                                    v
Repository Code  <------ verifies ------  Reference Library
      |                                      |
      |                                      +-- Human Edition
      |                                      |
      |                                      +-- AI Edition
      |
      +------ current behavior                   |
                                                v
                                      Knowledge System Guide
                                                |
                         +----------------------+----------------------+
                         |                                             |
                         v                                             v
                    Handoffs                                      Reviews
               milestone state                              dated audit evidence
```

### Category Relationship

```text
Documentation/
  README.md                         front door
  Knowledge_System_Guide.md         navigation and governance
  Reference/                        permanent engineering memory
    Human/                          human-oriented edition
    AI/                             AI-oriented edition
  Handoffs/                         milestone continuity
  Reviews/                          dated audits and critiques
```

## Documentation Category Responsibilities

| Category | Owns | Does Not Own |
| --- | --- | --- |
| `Documentation/README.md` | Top-level orientation and source-of-truth summary | Detailed engineering explanations |
| `Knowledge_System_Guide.md` | Navigation, terminology, concept ownership, reading maps, governance, synchronization rules | Provider implementation details, operational procedures, current code behavior |
| `Reference/README.md` | Reference edition model and entry points | Root-level governance for all documentation categories |
| `Reference/Human/` | Human-oriented permanent engineering memory | AI-specific deterministic onboarding mechanics |
| `Reference/AI/` | AI-oriented permanent engineering memory | A separate factual truth from the Human edition |
| `Handoffs/` | Milestone snapshots and onboarding continuity | Permanent architecture or current implementation guarantees |
| `Reviews/` | Dated audit findings, editorial critique, reconciliation evidence | Current truth unless verified against later code and references |

## Core Terminology

This glossary defines project terms at the documentation-system level. Detailed engineering definitions remain in the authoritative Reference documents.

| Term | Meaning | Authoritative Home |
| --- | --- | --- |
| AI edition | The AI-oriented copy of the permanent Reference library, optimized for deterministic interpretation and verification. | `Reference/AI/Start_Here.md` |
| High-level project AI prompt | Generated operating prompt for shot-caller AIs focused on whole-project comprehension, strategy, architecture, prioritization, review, and delegation. | `Reference/AI/Web_AI_Prompt.md` |
| High-level project AI bootstrap | Generated procedural boot sequence for shot-caller AIs acquiring full project context before strategic decisions. | `Reference/AI/Web_AI_Bootstrap.md` |
| VS Code engineer prompt | Generated operating prompt for repository-attached engineer AIs with direct code access. | `Reference/AI/VSC_AI_Prompt.md` |
| VS Code engineer bootstrap | Generated procedural boot sequence for repository-attached engineer AIs inspecting, editing, verifying, and reporting local work. | `Reference/AI/VSC_AI_Bootstrap.md` |
| Architecture | The intended structure, boundaries, and design principles of the system. | `Reference/Human/02 - System Architecture.md` and AI companion |
| Automa exporter | Studio-side path for exporting workflows to Automa artifacts. | `Reference/Human/02 - System Architecture.md` and AI companion |
| Browser automation | The Playwright/browser infrastructure used by the Native Runner to operate provider websites. | `Reference/Human/08 - Browser Automation Architecture.md` and AI companion |
| Candidate | A possible response element discovered during response detection. | `Reference/Human/05 - Response Detection and Filtering Philosophy.md` and AI companion |
| CDP mode | Execution mode that connects to an existing browser through Chrome DevTools Protocol. | `Reference/Human/04 - Browser and Tab Management.md` and AI companion |
| Conversation | Current user instructions or assistant discussion. It is not durable project memory. | `Reference/Human/Start_Here.md` and AI companion |
| Council Configuration | Versioned shared configuration document (fantasy name: Council Scroll) defining a Council: ordered seats (stages), providers, Callings, rules, variables, budgets, and policies. | `Reference/Human/02 - System Architecture.md` and AI companion |
| Doctrine | Built-in cognitive workflow that provides a default Formation and deterministically builds an editable Council Configuration; duplicate Callings and duplicate providers across seats are valid. A user-created Council is a saved configuration under the same schema. | `Reference/Human/02 - System Architecture.md` and AI companion |
| Formation | The ordered composition of seats provided by a Doctrine; each seat assigns a Calling and a provider (AI). | `Reference/Human/02 - System Architecture.md` and AI companion |
| Calling | Reusable behavioral lens assigned to a seat in a Formation, pairing a fantasy presentation title with a practical provider-facing framing; carries advisory Suggested AI metadata. | `Reference/Human/02 - System Architecture.md` and AI companion |
| Calling flavour text | Provider-facing instructional text that gives a Calling its perspective; canonical source is `shared/council/callingFlavourText.ts`, edited in Studio's Calling Grimoire as versioned local-browser overrides and carried portably in a Council Configuration's compact `callingFlavourOverrides` record. | `Reference/Human/02 - System Architecture.md` and AI companion |
| Cognitive stats | The six ten-level (0–9, 5 neutral) Maestriss behavioral dimensions — Temperament, Voice, Conviction, Dissent, Depth, Memory — resolved per seat (seat override > Calling default > provider default > neutral) and expressed through sparse deterministic provider-facing guidance plus mechanical Memory exposure; product concepts, not provider API parameters. | `Reference/Human/02 - System Architecture.md` and AI companion |
| Driver | Provider-specific automation implementation for a participant. | `Reference/Human/03 - Driver Lifecycle Specification.md` and AI companion |
| Handoff | A dated milestone state document used for continuity. | `Documentation/Handoffs/` |
| Human edition | The human-oriented copy of the permanent Reference library, optimized for comprehension and narrative flow. | `Reference/Human/Start_Here.md` |
| Maestriss Studio | Graphical configuration and export application. | `Reference/Human/02 - System Architecture.md` and AI companion |
| Native Runner | Browser automation execution engine for native participant execution. | `Reference/Human/02 - System Architecture.md` and AI companion |
| Participant | An independent AI system or provider that Maestriss can orchestrate. | `Reference/Human/07 - Participant Driver Reference.md` and AI companion |
| Persistent-profile mode | Execution mode using a managed browser profile for local session continuity. | `Reference/Human/04 - Browser and Tab Management.md` and AI companion |
| Reference document | Permanent engineering memory. | `Documentation/Reference/README.md` |
| Review | Dated audit or critique artifact. | `Documentation/Reviews/` |
| Source of truth | The source category authoritative for a given claim. | `Reference/Human/Start_Here.md` and AI companion |

## Master Concept Index

Use this index to determine where concepts are owned and what code should be checked when implementation behavior matters.

| Concept | Authoritative Document | Verify Against |
| --- | --- | --- |
| AI onboarding | `Reference/AI/Web_AI_Prompt.md`, `Reference/AI/Web_AI_Bootstrap.md`, `Reference/AI/VSC_AI_Prompt.md`, `Reference/AI/VSC_AI_Bootstrap.md` | Current source code and authoritative Engineering Library remain sources of truth |
| Architecture overview | `02 - System Architecture.md` | `src/`, `runner/`, `docs/automa-export-strategy.md` |
| Automa export path | `02 - System Architecture.md` | `src/exporters/automa/` |
| Browser lifecycle | `04 - Browser and Tab Management.md` | `runner/src/server.ts`, `runner/src/runner.ts`, `runner/restart-runner.ps1` |
| Browser automation infrastructure | `08 - Browser Automation Architecture.md` | `runner/src/` |
| Code review standards | `12 - Development Workflow and Engineering Standards.md` | Repository conventions and current diff |
| Cognitive stats | `02 - System Architecture.md` | `shared/council/cognitiveStats.ts`, `shared/council/cognitiveGuidance.ts`, `runner/src/cognitiveStatsAssertions.ts` |
| Council orchestration contract | `02 - System Architecture.md` | `shared/council/`, `runner/src/councilAssertions.ts` |
| Current maturity | `11 - Project Status and Development Journal.md` | Code, test scripts, latest handoff |
| Diagnostics | `09 - Testing, Validation, and Diagnostics.md` | `runner/debug/`, provider tests, runtime logs |
| Documentation source-of-truth rules | `Start_Here.md`, `Reference/README.md`, this guide | Documentation structure and current files |
| Driver contract | `03 - Driver Lifecycle Specification.md` | `runner/src/drivers/`, shared runner orchestration |
| Driver-specific behavior | `07 - Participant Driver Reference.md` | Relevant driver file and filter assertions |
| Engineering philosophy | `01 - Design Philosophies and Tenets.md` | Architectural patterns across code and docs |
| Future direction | `10 - Future Roadmap and Vision.md` | Current roadmap and explicit future markers |
| Operational commands | `14 - Operational Runbook.md` | `package.json`, `runner/package.json`, scripts |
| Prompt and AI collaboration standards | `13 - Prompt Engineering and AI Collaboration.md` | Handoff prompts and AI bootstrap docs |
| Provider maturity | `07 - Participant Driver Reference.md`, `11 - Project Status and Development Journal.md` | Driver files, tests, live smoke evidence |
| Regression philosophy | `06 - Testing and Regression Philosophy.md` | Provider assertion tests and test scripts |
| Response detection | `05 - Response Detection and Filtering Philosophy.md` | Provider detectors, extraction code, filter assertions |
| Testing procedures | `09 - Testing, Validation, and Diagnostics.md` | `runner/package.json`, test files |
| Versioning and release policy | `12 - Development Workflow and Engineering Standards.md` | Root `package.json` (canonical version owner), `runner/package.json`, lockfiles, `CHANGELOG.md`, `scripts/verify-version.mjs`, Git tags |
| Workflow standards | `12 - Development Workflow and Engineering Standards.md` | Repository practices and commits |

## Document Responsibility Matrix

| Document | Owns | Deliberately Does Not Own |
| --- | --- | --- |
| `Start_Here.md` | Entry path, documentation hierarchy, source-of-truth rules, reading paths | Detailed architecture, provider behavior, operations |
| `01 - Design Philosophies and Tenets.md` | Permanent engineering values and decision principles | Runtime procedures or provider-specific implementation |
| `02 - System Architecture.md` | System surfaces, major boundaries, Studio/Runner/Automa relationship | Low-level driver mechanics |
| `03 - Driver Lifecycle Specification.md` | Driver lifecycle contract and required phases | Provider-specific quirks except as examples |
| `04 - Browser and Tab Management.md` | Browser execution modes, tabs, profiles, CDP, readiness of browser environment | Full automation architecture or response filtering theory |
| `05 - Response Detection and Filtering Philosophy.md` | Detection philosophy, candidates, cleaning, filtering, geometry, false positives/negatives | Individual provider maturity tables |
| `06 - Testing and Regression Philosophy.md` | Why regressions exist and how bugs become permanent knowledge | Full command runbook |
| `07 - Participant Driver Reference.md` | Provider-specific driver behavior, maturity, quirks, current participant reference | General response detection theory |
| `08 - Browser Automation Architecture.md` | Shared automation infrastructure, orchestration patterns, common services | Per-tab operational runbook details |
| `09 - Testing, Validation, and Diagnostics.md` | Practical validation, diagnostic artifacts, test categories, expected evidence | Philosophical justification for testing |
| `10 - Future Roadmap and Vision.md` | Planned evolution and long-term direction | Current implementation claims unless explicitly marked |
| `11 - Project Status and Development Journal.md` | Current documented status and development history | Permanent philosophy or normative standards |
| `12 - Development Workflow and Engineering Standards.md` | Engineering practices, change discipline, review behavior, versioning and release policy | Provider-specific driver rules; release history itself (owned by `CHANGELOG.md`) |
| `13 - Prompt Engineering and AI Collaboration.md` | AI collaboration standards and prompt discipline | General user-facing product UX |
| `14 - Operational Runbook.md` | Day-to-day operating procedures and troubleshooting | Architectural philosophy |
| `15 - Engineering Notes and Design Commentary.md` | Commentary, design reflections, contextual reasoning | Normative specifications unless promoted elsewhere |
| `16 - AI Session Bootstrap.md` | Redirect compatibility for older AI session bootstrap links | Onboarding logic or project facts |
| `Web_AI_Prompt.md` | Generated non-authoritative prompt for high-level project AIs; teaches whole-project reasoning, strategy, prioritization, review, and delegation discipline | Procedural local implementation workflow or project facts owned by source code and Reference documents |
| `Web_AI_Bootstrap.md` | Generated non-authoritative procedural boot sequence for high-level project AIs, whole-project reading gates, confidence model, and shot-caller bootstrap report requirements | Local editing workflow or engineering truth owned by source code and numbered Reference documents |
| `VSC_AI_Prompt.md` | Generated non-authoritative prompt for repository-attached engineer AIs; teaches local implementation and verification discipline | Project facts owned by source code and Reference documents |
| `VSC_AI_Bootstrap.md` | Generated non-authoritative procedural boot sequence for repository-attached engineer AIs | Engineering truth owned by source code and numbered Reference documents |

## Code-to-Documentation Map

| Code Area | Primary Documentation | Secondary Documentation |
| --- | --- | --- |
| `src/` | `02 - System Architecture.md` | `10 - Future Roadmap and Vision.md`, `12 - Development Workflow and Engineering Standards.md` |
| `src/exporters/automa/` | `02 - System Architecture.md` | `10 - Future Roadmap and Vision.md` |
| `runner/` | `03 - Driver Lifecycle Specification.md`, `08 - Browser Automation Architecture.md` | `14 - Operational Runbook.md` |
| `runner/src/drivers/` | `07 - Participant Driver Reference.md` | `03 - Driver Lifecycle Specification.md`, `05 - Response Detection and Filtering Philosophy.md` |
| `runner/src/server.ts` | `04 - Browser and Tab Management.md`, `08 - Browser Automation Architecture.md` | `14 - Operational Runbook.md` |
| `runner/src/runner.ts` | `03 - Driver Lifecycle Specification.md`, `08 - Browser Automation Architecture.md` | `09 - Testing, Validation, and Diagnostics.md` |
| `runner/restart-runner.ps1` | `14 - Operational Runbook.md` | `04 - Browser and Tab Management.md` |
| `shared/council/` | `02 - System Architecture.md` | `09 - Testing, Validation, and Diagnostics.md`, `10 - Future Roadmap and Vision.md` |
| Provider filter assertion files | `05 - Response Detection and Filtering Philosophy.md`, `09 - Testing, Validation, and Diagnostics.md` | `07 - Participant Driver Reference.md` |
| `Documentation/Handoffs/` | `Web_AI_Bootstrap_Prompt.md` and dated handoff files | `Start_Here.md`, `Web_AI_Prompt.md`, `Web_AI_Bootstrap.md`, this guide |
| `Documentation/Reviews/` | This guide | `Start_Here.md` |

## Reading Maps

### New Human Maintainer

1. `Documentation/README.md`
2. `Reference/Human/Start_Here.md`
3. Latest file in `Handoffs/`
4. `Reference/Human/02 - System Architecture.md`
5. `Reference/Human/03 - Driver Lifecycle Specification.md`
6. `Reference/Human/14 - Operational Runbook.md`

### New AI Assistant

1. `Documentation/README.md`
2. Choose the role-specific onboarding pair:
   - High-level project AI: `Reference/AI/Web_AI_Prompt.md`, then `Reference/AI/Web_AI_Bootstrap.md`
   - VS Code engineer: `Reference/AI/VSC_AI_Prompt.md`, then `Reference/AI/VSC_AI_Bootstrap.md`
4. `Reference/AI/Start_Here.md`
5. Latest file in `Handoffs/`
6. Task-specific reading path from the selected bootstrap
7. Verify relevant claims against code before acting

### Repository-Attached AI Assistant

1. `Documentation/README.md`
2. `Reference/AI/VSC_AI_Prompt.md`
3. `Reference/AI/VSC_AI_Bootstrap.md`
4. `Reference/AI/Start_Here.md`
5. Most recent applicable file in `Handoffs/`
6. Task-specific reading path from `Reference/AI/VSC_AI_Bootstrap.md`
7. Inspect task-relevant source code, scripts, tests, and git state before acting

### Driver Maintainer

1. `03 - Driver Lifecycle Specification.md`
2. `05 - Response Detection and Filtering Philosophy.md`
3. `07 - Participant Driver Reference.md`
4. `09 - Testing, Validation, and Diagnostics.md`
5. Relevant files in `runner/src/drivers/`

### Response Detection Maintainer

1. `05 - Response Detection and Filtering Philosophy.md`
2. `07 - Participant Driver Reference.md`
3. `09 - Testing, Validation, and Diagnostics.md`
4. Provider detector and filter assertion files

### Browser Automation Maintainer

1. `04 - Browser and Tab Management.md`
2. `08 - Browser Automation Architecture.md`
3. `14 - Operational Runbook.md`
4. `runner/src/server.ts`
5. `runner/src/runner.ts`
6. `runner/restart-runner.ps1`

### Studio Maintainer

1. `02 - System Architecture.md`
2. `10 - Future Roadmap and Vision.md`
3. `12 - Development Workflow and Engineering Standards.md`
4. `src/`
5. `src/exporters/automa/`

### Documentation Maintainer

1. `Documentation/README.md`
2. This guide
3. `Reference/README.md`
4. `Reference/Human/Start_Here.md`
5. `Reference/AI/Start_Here.md`
6. Document pair being edited

### Project Auditor

1. `Documentation/README.md`
2. `Reference/README.md`
3. `Reference/Human/Start_Here.md` or `Reference/AI/Start_Here.md`
4. Latest handoff
5. Relevant reviews
6. Code areas claimed by the documents under audit

## Human and AI Edition Synchronization

The Human and AI editions must remain factually synchronized.

They may differ in presentation, metadata, phrasing, density, and onboarding mechanics. They must not differ in facts, maturity claims, source-of-truth rules, architecture boundaries, current implementation status, or operational requirements.

### Synchronization Checklist

When editing a Human or AI reference document:

1. Identify the companion document in the other edition.
2. Determine whether the change affects fact, status, architecture, terminology, procedure, or only presentation.
3. If the change affects fact, status, architecture, terminology, or procedure, update both editions.
4. Verify maturity labels against current code and tests when relevant.
5. Verify operational procedures against scripts or package commands when relevant.
6. Preserve AI metadata in the AI edition.
7. Preserve human-readable narrative flow in the Human edition.
8. Check `Start_Here.md` if reading paths or source-of-truth rules changed.
9. Check this guide if concept ownership or terminology changed.
10. Record significant changes in the appropriate handoff or status document when the project state changes.

### Allowed Differences

| Difference | Allowed? | Notes |
| --- | --- | --- |
| AI metadata front matter | Yes | Required in AI edition. |
| More deterministic AI wording | Yes | Appropriate for AI edition. |
| More narrative explanation | Yes | Appropriate for Human edition. |
| Different maturity claims | No | Must be synchronized. |
| Different architecture boundaries | No | Must be synchronized. |
| Different current implementation claims | No | Must be synchronized and verified against code. |
| Different source-of-truth hierarchy | No | Must be identical in meaning. |

## Cross-Reference Standards

Cross-references should clarify ownership, not create circular reading traps.

### Required Cross-Reference Pattern

When a document mentions a concept owned elsewhere, it should either:

- summarize the concept briefly and link to the authoritative document, or
- state that the other document owns the detail.

### Avoid

- Repeating detailed procedures in multiple documents.
- Creating competing definitions.
- Referring to reviews as current truth without checking later changes.
- Referring to handoffs as permanent architecture.
- Using future-roadmap language as evidence of implemented behavior.

### Recommended Reference Forms

Use stable relative paths where practical:

```text
Reference/Human/05 - Response Detection and Filtering Philosophy.md
Reference/AI/05 - Response Detection and Filtering Philosophy.md
```

Use code paths when verification is required:

```text
runner/src/drivers/
runner/src/server.ts
runner/package.json
```

## Editorial Standards

### Voice

Documentation should be professional, direct, and durable. It should avoid conversational residue and avoid claims that depend on unstated context.

### Current vs Future

Every document that discusses both current implementation and future vision should separate them clearly.

Preferred labels:

- Current implementation
- Architecture
- Planned work
- Future vision
- Historical context

### Claims

Implementation claims must be verifiable against code.

Architecture claims must be consistent with the Reference library.

Operational claims must be verifiable against scripts, commands, or observed runner behavior.

Maturity claims must be conservative.

### Duplication

Repeat safety-critical rules when helpful.

Do not repeat detailed specifications unless the repeated text is intentionally maintained in both Human and AI editions.

Use this rule:

```text
Repeat rules. Cross-reference specifications.
```

## Versioning and Maintenance Strategy

The documentation library should evolve through controlled maintenance, not uncontrolled document growth.

The Knowledge System milestone is considered complete when this guide, the root documentation entry point, the Reference library, the Handoffs, and the Reviews together allow a maintainer to determine what to read, where a concept is owned, what code verifies a claim, and how documentation changes should be governed.

After that point, documentation should mostly evolve rather than multiply.

### Routine Maintenance

Update documentation when:

- code behavior changes,
- provider maturity changes,
- operational commands change,
- architecture boundaries change,
- onboarding paths change,
- source-of-truth rules change,
- terminology changes,
- a review identifies a verified discrepancy.

### Review Artifacts

Reviews are dated evidence. They may be superseded.

When a review finding is resolved, either:

- update the relevant Reference document, or
- record the resolution in a later handoff or review.

Do not edit an old review to pretend it always reflected the later state.

### Handoff Artifacts

Handoffs are milestone snapshots. They should remain historically accurate.

New handoffs should state:

- date,
- milestone,
- current implementation state,
- important commits,
- known limitations,
- recommended next reading,
- unresolved risks.

## Documentation Growth Rule

No new permanent Reference document should be created until its ownership is explicitly defined in this guide.

Before creating a new permanent document, answer these questions:

1. Why does this document exist?
2. Who is it for?
3. What does it own?
4. What does it deliberately not own?
5. Which existing documents point to it?
6. Which documents depend on it?
7. Which code areas verify it?
8. Could this information belong inside an existing document instead?
9. Does this document reduce confusion more than it increases navigation burden?

If the document cannot answer these questions, it should not be created.

This rule is not intended to slow the project down. It is intended to prevent documentation sprawl and protect the library's usefulness. A knowledge system becomes less useful when every insight becomes a new file. New permanent documents should be rare, deliberate, and clearly owned.

### Allowed Without Prior Ownership Expansion

The following may be created without adding a new permanent ownership entry first:

- dated handoffs,
- dated reviews,
- temporary audit notes,
- generated artifacts,
- task-specific reports,
- prompt drafts,
- diagrams that are attached to an already-owned document.

These artifacts should still be clearly labeled and placed in the correct category.

### Required For Permanent Additions

Before adding a new permanent Reference document, update this guide with:

- its title,
- its audience,
- its ownership boundary,
- its non-ownership boundary,
- its relationship to existing documents,
- its verification sources,
- its synchronization requirements if it belongs in both Human and AI editions.

## Infrastructure Decisions

This section explains which proposed infrastructure components were created, consolidated, or deferred.

### Created: Root Documentation README

Path:

```text
Documentation/README.md
```

Why it exists: The documentation folder needed a front door above the Reference library.

Who it is for: Humans, AI assistants, auditors, and any reader entering through the repository root.

What it owns: Top-level orientation, category map, source-of-truth summary, and pointer to this guide.

What it does not own: Detailed engineering content, implementation behavior, provider details, or operations.

Where it fits: It sits above `Reference/`, `Handoffs/`, and `Reviews/`.

### Created: Knowledge System Guide

Path:

```text
Documentation/Knowledge_System_Guide.md
```

Why it exists: The library needed one consolidated operating system for navigation, ownership, terminology, maps, synchronization, and governance.

Who it is for: Documentation maintainers, future engineers, AI assistants, reviewers, and auditors.

What it owns: Glossary-level terminology, concept index, responsibility matrix, code-to-document map, reading maps, Human/AI synchronization rules, cross-reference standards, editorial standards, versioning strategy, and implementation order.

What it does not own: The engineering content already owned by the numbered Reference documents.

Where it fits: It is a governance and navigation artifact at the root of `Documentation/`.

### Not Created Separately: Glossary

A separate glossary was not created because the current terminology set is still small enough to live in this guide. Splitting it now would add another entry point without enough benefit.

If terminology grows substantially, the glossary can be split out later.

### Not Created Separately: Master Concept Index

The concept index was included in this guide to avoid creating a standalone index before the navigation system has stabilized.

If the index becomes too large, it should become its own artifact.

### Not Created Separately: Reading Maps

Reading maps were included in this guide because they are part of the same navigation layer as concept ownership and category responsibility.

### Not Created Separately: Document Responsibility Matrix

The responsibility matrix was included here because it is governance infrastructure, not engineering reference content.

### Not Created Separately: Code-to-Documentation Map

The code-to-documentation map was included here because it belongs with verification and source-of-truth navigation.

### Not Created Separately: Diagram Catalog

A separate diagram catalog was deferred. The current library does not yet have enough durable diagrams to justify a catalog file. This guide defines the need and the dependency diagrams needed first.

### Not Created Separately: Documentation Style Guide

A separate style guide was deferred. The current editorial standards are concise enough to live here.

### Not Created Separately: Documentation Maintenance Guide

A separate maintenance guide was deferred. The maintenance strategy and synchronization checklist are consolidated here.

### Not Created Separately: Governance Guide

This guide is the governance guide. Creating a second governance document would duplicate authority.

## Recommended Implementation Order

1. Use `Documentation/README.md` as the root entry point.
2. Use this guide as the central documentation operating system.
3. Keep the numbered Reference documents stable and avoid adding new ones unless they own enduring engineering knowledge.
4. When editing Reference documents, update Human and AI editions together.
5. When a concept grows beyond this guide, split it only if the split improves navigation.
6. Add diagrams to the authoritative documents first.
7. Create a separate diagram catalog only after diagrams become numerous enough to need indexing.
8. Periodically audit the concept index against the Reference library and code.

## Permanent Reference vs Governance Artifacts

### Should Become or Remain Permanent Reference Documents

The sixteen numbered Reference documents should remain the permanent engineering memory of Maestriss.

New permanent Reference documents should be rare. A new Reference document is justified only when it owns a durable engineering domain that does not naturally belong in the existing sixteen documents.

### Should Remain Navigation or Governance Artifacts

The following should remain outside the numbered Reference sequence:

- `Documentation/README.md`
- `Documentation/Knowledge_System_Guide.md`
- Review reports
- Handoff documents
- Bootstrap prompts
- Future indexes, if they are navigation-only
- Future diagram catalogs, if they only index diagrams owned elsewhere

This distinction prevents navigation infrastructure from being mistaken for engineering architecture.

## Simplification Opportunities

The library should simplify by strengthening navigation, not by deleting useful memory.

Recommended simplifications:

1. Treat this guide as the single home for glossary, concept index, responsibility matrix, reading maps, and synchronization rules until one of those sections becomes too large.
2. Keep prompt artifacts clearly labeled as onboarding tools rather than milestone handoffs.
3. Avoid creating a new Reference document for every documentation concern.
4. Use cross-references instead of copying long procedures into multiple documents.
5. Keep reviews dated and do not retrofit them into current truth.
6. Keep handoffs historical and do not use them as replacements for maintained Reference documents.

The library should grow by becoming easier to navigate, easier to verify, and harder to misinterpret.
