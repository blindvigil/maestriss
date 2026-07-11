# Maestriss Documentation

## Purpose

This folder is the long-term engineering knowledge system for Maestriss.

It is not only a document collection. It is the project's institutional memory for architecture, implementation boundaries, operational practice, development standards, AI onboarding, reviews, and milestone state.

## Start Here

Use the reference edition appropriate to the reader:

- Human readers: `Reference/Human/Start_Here.md`
- Web AI commanders: `Reference/AI/AI_Prompt.md`, then `Reference/AI/AI_Bootstrap.md`
- VS Code engineer AIs: `Reference/AI/VSCode_AI_Prompt.md`, then `Reference/AI/VSCode_AI_Bootstrap.md`

Both editions represent the same engineering truth. They differ in presentation, not authority.

After reading the appropriate entry path, read the most recent milestone handoff in `Handoffs/`.

The canonical AI onboarding artifacts are role-specific:

```text
Reference/AI/AI_Prompt.md
Reference/AI/AI_Bootstrap.md
Reference/AI/VSCode_AI_Prompt.md
Reference/AI/VSCode_AI_Bootstrap.md
```

Repository-attached AI agents such as VS Code extensions should use:

```text
Reference/AI/VSCode_AI_Prompt.md
Reference/AI/VSCode_AI_Bootstrap.md
```

These artifacts are generated onboarding material. They guide AI reasoning and boot procedure, but they are not independent sources of engineering truth.

Older bootstrap, navigation, and AI session documents are redirects or historical artifacts.

## Documentation Operating System

The navigation, ownership, terminology, and maintenance rules for this library are defined in:

```text
Documentation/Knowledge_System_Guide.md
```

Use that guide to answer:

- What document owns this concept?
- Where should this information be edited?
- What should be read for a task?
- Which code areas verify a claim?
- What terminology is authoritative?
- Which documents must stay synchronized?

## Documentation Categories

| Category | Path | Purpose | Authority |
| --- | --- | --- | --- |
| Reference | `Reference/` | Permanent engineering memory | Architecture, terminology, philosophy, standards, operations, documented status |
| Handoffs | `Handoffs/` | Milestone continuity | Project state at a specific date |
| Reviews | `Reviews/` | Audit and critique | Dated findings that may be superseded by later changes |

## Source-of-Truth Hierarchy

| Rank | Source | Authoritative For |
| --- | --- | --- |
| 1 | Repository code | Current implemented behavior |
| 2 | Reference documents | Architecture, terminology, engineering philosophy, intended design, operational standards, documented status |
| 3 | Handoffs | Milestone state and onboarding continuity |
| 4 | Reviews | Dated audit evidence and editorial critique |
| 5 | Conversation | Current instructions and intent only |

When sources conflict, identify the conflict explicitly. Do not silently choose between them.

## Current Architecture

```text
Documentation/
  README.md
  Knowledge_System_Guide.md
  Reference/
    README.md
    Human/
    AI/
  Handoffs/
  Reviews/
```

`Reference/` is the permanent engineering library.

`Knowledge_System_Guide.md` is the governance and navigation layer around that library.

`Handoffs/` and `Reviews/` preserve historical and audit context without replacing current implementation or permanent reference truth.
