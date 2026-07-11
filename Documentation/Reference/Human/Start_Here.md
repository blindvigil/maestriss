---
Document ID: START-HERE
Document Title: Start Here
Version: v0.2.0
Revision Date: 2026-07-10
Status: Authoritative Entry Point
Audience: Human
Purpose: Human-oriented entry point for navigating, understanding, and using the Maestriss documentation library.
Scope: Explains documentation categories, source-of-truth rules, reading paths, repository areas, and safe contribution practices.
Related Documents:
  - ../AI/Start_Here.md
  - ../AI/Web_AI_Prompt.md
  - ../AI/Web_AI_Bootstrap.md
  - ../AI/VSC_AI_Prompt.md
  - ../AI/VSC_AI_Bootstrap.md
Related Modules: Repository-wide orientation; no single source module.
Canonical Concepts Covered: Documentation hierarchy, source-of-truth hierarchy, reading paths, repository overview, contributor workflow, AI guidance.
Current Implementation Status: Documentation entry point; source code remains authoritative for current implemented behavior.
---
# Start Here

## Welcome

Welcome to Maestriss. This document is the front door to the project's documentation library. It does not try to explain every subsystem. Its job is to help you understand what documentation exists, which documents matter for your task, and how to avoid making incorrect assumptions before you work.

Maestriss is a young project with unusually deep documentation for its age because the work depends on accumulated engineering knowledge. Browser automation, participant drivers, response extraction, provider-specific filtering, and AI collaboration all have failure modes that are easy to forget and expensive to rediscover. The documentation library exists to preserve those lessons as long-term institutional memory.

The library is organized for two audiences. Human readers get a prose-first edition that explains context, rationale, and tradeoffs. AI readers get a parallel edition optimized for deterministic interpretation and retrieval. Both editions describe the same engineering truth.

After reading this document, you should know where to go next, what is authoritative, what is historical, and how to verify what you read.

AI onboarding is now split into two role-specific generated pairs:

```text
Documentation/Reference/AI/Web_AI_Prompt.md
Documentation/Reference/AI/Web_AI_Bootstrap.md
Documentation/Reference/AI/VSC_AI_Prompt.md
Documentation/Reference/AI/VSC_AI_Bootstrap.md
```

Use `Web_AI_Prompt.md` and `Web_AI_Bootstrap.md` for high-level project AIs: whole-project comprehension, strategy, planning, architecture, prioritization, review, critique, and implementation handoff.

Use `VSC_AI_Prompt.md` and `VSC_AI_Bootstrap.md` for VS Code or repository-attached engineer AIs: local source inspection, implementation, verification, and reporting.

These files guide reasoning and procedure. They do not replace repository source code or the authoritative Engineering Library.

Older bootstrap, navigation, prompt, and AI session documents are redirects or historical artifacts.

## What Is Maestriss?

Maestriss is a software project for orchestrating conversations among multiple independent AI systems. Instead of treating one AI as the whole answer, Maestriss treats AI systems as participants that can contribute, challenge, refine, and synthesize work.

At a high level, the project has three important surfaces:

- **Maestriss Studio:** the React, TypeScript, and Vite graphical application for configuring participants, workflows, profiles, prompts, and exports.
- **Native Runner:** the Node, TypeScript, and Playwright automation service that operates live AI provider websites through browser automation.
- **Automa Exporter:** a Studio-side export path that creates Automa-compatible workflow artifacts as an alternate execution route.

The current implementation and the long-term vision are not identical. Studio exists and exports workflows, but it is not yet directly integrated with the native runner for live execution. The native runner is currently the operational execution engine.

## Documentation Philosophy

The documentation library is intentionally divided by purpose. Not every document should be read the same way.

**Reference documents** live in `Documentation/Reference/`. They are the permanent engineering reference library. Use them for architecture, terminology, lifecycle contracts, design philosophy, testing philosophy, operations, and long-term engineering standards.

**Handoffs** live in `Documentation/Handoffs/`. They are milestone snapshots. A handoff tells you where the project stood at a particular point in time, what was known, what was deferred, and what should come next. Always read the newest handoff before starting substantial work.

**Reviews** live in `Documentation/Reviews/`. They are audits, reconciliation reports, and dated critiques. Reviews are valuable evidence, but they are not automatically current. A review may identify a problem that was fixed later.

**Historical records** include older handoffs, reviews, strategy notes, commit history, and dated project commentary. They explain how the project got here. They should not override current code.

**Code** is the implementation. It is the final authority for what the software currently does.

This division lets the project keep stable engineering knowledge, current project state, historical audit trails, and implementation behavior distinct.

## Source Of Truth

Use this hierarchy whenever sources disagree:

1. **Repository code** is authoritative for current implemented behavior.
2. **Reference documents** are authoritative for architecture, terminology, engineering philosophy, intended design, operational standards, and documented status.
3. **Handoffs** are authoritative for the milestone date they describe.
4. **Reviews** are dated evidence and must be checked against current code and git history.
5. **Conversation text** is useful for current intent, but it is not durable project truth.

If code and documentation conflict, do not silently choose whichever is convenient. Identify the conflict. State what the code currently does. State what the documentation claims. Then decide whether code, documentation, or both should be updated.

The most common source-of-truth mistake is reading a planned architecture statement as if it were implemented behavior. Maestriss documents both the current system and the intended system. Pay attention to words such as current, planned, future, deferred, implemented, limitation, and historical.

## Documentation Structure

The current documentation layout is:

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
  Reviews/
    Reconciliation Report - Docs vs Code (2026-07-10).md
```

`Human/` and `AI/` are parallel editions. The filenames and numbering match wherever practical. If you are reading `Human/07 - Participant Driver Reference.md`, the corresponding AI edition is `AI/07 - Participant Driver Reference.md`.

`Start_Here.md` is intentionally unnumbered. It is not document zero. It is the entrance to the library.

## Reading Paths

### New Contributor

Start here, then read:

1. Newest file in `Documentation/Handoffs/`
2. `Human/02 - System Architecture.md`
3. `Human/03 - Driver Lifecycle Specification.md`
4. `Human/01 - Design Philosophies and Tenets.md`
5. `Human/11 - Project Status and Development Journal.md`

This path gives you the current state, the system map, the core lifecycle, the design philosophy, and the active project status.

### Architecture

Read:

1. `Human/02 - System Architecture.md`
2. `Human/04 - Browser and Tab Management.md`
3. `Human/08 - Browser Automation Architecture.md`
4. `Human/10 - Future Roadmap and Vision.md`
5. `Human/15 - Engineering Notes and Design Commentary.md`

Use this path when you need to understand the shape of the system and why it is shaped that way.

### Participant Drivers

Read:

1. `Human/03 - Driver Lifecycle Specification.md`
2. `Human/05 - Response Detection and Filtering Philosophy.md`
3. `Human/07 - Participant Driver Reference.md`
4. `Human/09 - Testing, Validation, and Diagnostics.md`
5. The relevant files in `runner/src/drivers/`

Claude is the strongest current exemplar for a mature driver pattern.

### Browser Automation

Read:

1. `Human/04 - Browser and Tab Management.md`
2. `Human/08 - Browser Automation Architecture.md`
3. `Human/14 - Operational Runbook.md`
4. `runner/src/server.ts`
5. `runner/src/runner.ts`
6. `runner/restart-runner.ps1`

Use this path for tab reuse, browser profiles, CDP mode, persistent-profile mode, focusing, startup, recovery, and operational behavior.

### Testing

Read:

1. `Human/06 - Testing and Regression Philosophy.md`
2. `Human/09 - Testing, Validation, and Diagnostics.md`
3. Provider-specific `*FilterAssertions.ts` files in `runner/src/`
4. `runner/package.json`

Remember that not every provider has equal regression coverage yet. ChatGPT and Perplexity are known coverage gaps.

### Studio

Read:

1. `Human/02 - System Architecture.md`
2. `Human/10 - Future Roadmap and Vision.md`
3. `Human/13 - Prompt Engineering and AI Collaboration.md`
4. `src/`
5. `src/exporters/automa/`
6. `docs/automa-export-strategy.md`

Studio currently configures and exports. Direct Studio-to-runner live orchestration is future work.

### Native Runner

Read:

1. `Human/03 - Driver Lifecycle Specification.md`
2. `Human/04 - Browser and Tab Management.md`
3. `Human/07 - Participant Driver Reference.md`
4. `Human/14 - Operational Runbook.md`
5. `runner/README.md`
6. `runner/src/server.ts`

Use this path for live execution, asks, provider status, driver behavior, diagnostics, and run operations.

### Documentation Work

Read:

1. This document
2. `Documentation/Reference/README.md`
3. `Human/12 - Development Workflow and Engineering Standards.md`
4. `Human/13 - Prompt Engineering and AI Collaboration.md`
5. `Human/15 - Engineering Notes and Design Commentary.md`

When engineering truth changes, update both Human and AI editions together.

### Bug Fixing

Read:

1. Newest handoff
2. The relevant task-specific path above
3. Relevant source files
4. Relevant regression assertions
5. `Human/09 - Testing, Validation, and Diagnostics.md`

For provider bugs, preserve the rule: provider quirks belong in provider drivers and filters; shared lifecycle belongs in runner/server infrastructure.

### Planning And Roadmap

Read:

1. `Human/10 - Future Roadmap and Vision.md`
2. `Human/11 - Project Status and Development Journal.md`
3. `Human/15 - Engineering Notes and Design Commentary.md`
4. Newest handoff

Use this path to separate current implementation from planned architecture and future ideas.

### AI Onboarding

AI assistants should begin with:

1. Choose the role-specific pair:
   - High-level project AI: `AI/Web_AI_Prompt.md`, then `AI/Web_AI_Bootstrap.md`
   - VS Code engineer: `AI/VSC_AI_Prompt.md`, then `AI/VSC_AI_Bootstrap.md`
2. `AI/Start_Here.md`
3. Newest handoff
4. `AI/02 - System Architecture.md`
5. `AI/03 - Driver Lifecycle Specification.md`
6. `AI/01 - Design Philosophies and Tenets.md`
8. `AI/11 - Project Status and Development Journal.md`

## Repository Overview

**Runner** lives in `runner/`. It is the native browser automation engine. It contains the CLI, local server, Playwright browser session management, participant registry, drivers, filtering helpers, diagnostics, and filter regression assertions.

**Studio** lives in `src/`. It is the graphical React application for configuring Maestriss projects. It includes pages, components, project context, prompt tools, participant data, session views, and export flows.

**Documentation** lives in `Documentation/`. It contains the reference library, handoffs, reviews, and onboarding guidance.

**Exports** live primarily under `src/exporters/`. The Automa exporter creates Automa-compatible workflow artifacts from Studio configuration.

**Assets and reference fixtures** live where they support the app or exporter, such as `src/reference/`. They should be treated as supporting material, not as runtime architecture.

**Scripts** include project package scripts and runner-specific helper scripts such as `runner/restart-runner.ps1`. Scripts can have operational side effects, so read the runbook before using them.

## Current Project State

The latest handoff document represents the most recent milestone snapshot. Read it before relying on older status statements.

To determine current project state:

1. Check `git log`.
2. Read the newest file in `Documentation/Handoffs/`.
3. Read `Human/11 - Project Status and Development Journal.md`.
4. Verify any important claim against source code.
5. Treat reviews as dated audits, not automatically current truth.

At this stage, the native runner is the operational execution engine. Studio exists and exports workflows, but direct Studio-to-runner live execution is not yet implemented.

## Working Effectively

Read before modifying. Maestriss has accumulated important design constraints, especially around provider-specific drivers, response detection, browser modes, diagnostics, and documentation maintenance.

Understand the boundary of your task. A focused driver fix should not become a framework redesign. A documentation correction should not silently change architecture. A UI improvement should not assume runner integration that does not exist.

Verify against code. Documentation explains the architecture and intent, but code determines current behavior.

Run appropriate tests. For runner changes, use `cd runner && npm run build` and the relevant filter assertion scripts. For Studio changes, use the root build. For provider behavior, use exact-answer smoke tests when live browser access is available.

Update documentation when behavior changes. If you alter engineering truth, update both Human and AI reference editions where relevant.

Prefer evidence over assumptions. In code, that means observable state. In documentation, that means source paths, current handoffs, and verified implementation behavior.

Avoid broad refactors without justification. Maestriss is still growing; disciplined incremental changes are safer than sweeping rewrites.

## AI Guidance

Repository-aware AI assistants should read the AI edition first and verify claims directly against files. They should use `rg`, source inspection, builds, and targeted tests before making claims about current behavior.

Web-based AI assistants should use the public repository when available. If repository access is unavailable, they should ask the user to paste the relevant reference sections, newest handoff, and source files. They should state clearly which claims they could not verify.

AI assistants must distinguish implemented behavior from planned architecture. Words such as should, future, planned, deferred, and long-term are not proof that code exists.

When documentation and code conflict, AI assistants should report the conflict explicitly. Do not hide the conflict by rewriting the user's request or choosing whichever source seems more convenient.

## Common Mistakes

- Reading only review documents and assuming every finding is still open.
- Assuming documentation overrides source code for current behavior.
- Treating planned features as implemented features.
- Ignoring the newest handoff.
- Skipping verification against source files.
- Changing architecture before understanding design philosophy.
- Putting provider-specific quirks into shared orchestration.
- Applying one provider's filtering rule to all providers.
- Forgetting that Human and AI reference editions must remain factually equivalent.
- Updating one reference edition but not the other.
- Running operational scripts without reading the runbook.
- Assuming Studio is already connected to the native runner.

## Quick Reference

| Need To Understand | Read |
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

## Success Criteria

After using this document, a new contributor should know what Maestriss is, how the documentation is organized, what to read next, how to verify information, where authoritative information lives, and how to contribute safely.

This document succeeds when it prevents the most expensive early mistakes: assuming before reading, treating future plans as current behavior, relying on stale audits, and changing code without understanding the architecture.
