# Maestriss Engineering Reference Library

## Purpose

The Maestriss Engineering Reference Library is published in two parallel editions:

- `Human/` contains the human-oriented edition.
- `AI/` contains the AI-oriented edition.

Both editions represent the same engineering knowledge. The difference is presentation, not authority.

The broader documentation navigation and governance model is defined in:

```text
../Knowledge_System_Guide.md
```

Use that guide for glossary-level terminology, concept ownership, reading maps, code-to-documentation mapping, Human/AI synchronization rules, and documentation maintenance standards.

Start with `Start_Here.md` in the edition appropriate to the reader:

- Human readers: `Human/Start_Here.md`
- AI readers in all access modes: `AI/AI_Prompt.md`, then `AI/AI_Bootstrap.md`, then `AI/Start_Here.md`

`Start_Here.md` is intentionally unnumbered. It is the entrance to the library rather than part of the numbered reference sequence.

## Edition Model

The Human edition is optimized for comprehension, narrative flow, rationale, history, and maintainable prose. Human engineers, architects, auditors, technical managers, and future maintainers should normally begin there.

The AI edition is optimized for deterministic interpretation, retrieval, stable terminology, explicit metadata, semantic tagging, and machine reasoning. AI assistants, code agents, repository analyzers, and autonomous engineering systems should normally begin there.

Both editions use identical document numbering and filenames. For example:

```text
Human/03 - Driver Lifecycle Specification.md
AI/03 - Driver Lifecycle Specification.md
```

These two files are companion editions of the same engineering reference.

## Source-of-Truth Rules

Source code remains authoritative for current implemented behavior.

Reference documents remain authoritative for architecture, terminology, engineering philosophy, intended design, operational standards, and documented status.

Review documents are dated audit artifacts. Review findings may already be resolved by later commits.

Handoff documents are milestone snapshots. Handoff documents are accurate for their date and may be superseded by later code, references, or handoffs.

## Recommended Entry Points

Human readers should start with:

```text
Human/Start_Here.md
Human/02 - System Architecture.md
Human/03 - Driver Lifecycle Specification.md
Human/01 - Design Philosophies and Tenets.md
```

AI readers should start with:

```text
AI/AI_Prompt.md
AI/AI_Bootstrap.md
AI/Start_Here.md
AI/02 - System Architecture.md
AI/03 - Driver Lifecycle Specification.md
AI/01 - Design Philosophies and Tenets.md
```

Both audiences should also read the most recent milestone handoff in `Documentation/Handoffs/`.

## Maintenance Rule

When engineering truth changes, update both editions together. Do not allow the Human edition and AI edition to diverge in facts, scope, maturity labels, or architectural claims.
