# Maestriss VS Code Engineer Bootstrap

## Purpose

This document is the deterministic boot procedure for VS Code extension AIs and repository-attached engineer agents working on Maestriss.

Use this bootstrap when the AI can directly inspect repository files and is expected to implement, verify, or review concrete changes.

Use `AI_Bootstrap.md` instead for high-level project AI sessions focused on strategy, architecture, review, prioritization, historical continuity, and implementation direction without local tool access.

This document is procedural. It is not independently authoritative for project facts.

## Canonical Engineer Flow

```text
VSCode_AI_Prompt.md
  -> VSCode_AI_Bootstrap.md
  -> Start_Here.md
  -> task-specific Engineering Library path
  -> task-relevant source code, tests, scripts, diagnostics
  -> reconciliation
  -> implementation or review
  -> verification
  -> engineer report
```

## Required Initial Checks

Before substantive work:

1. Identify repository root.
2. Inspect git branch and revision.
3. Inspect git status.
4. Identify untracked or dirty files.
5. Read the required onboarding and task-path documents.
6. Inspect task-relevant source before making claims about implementation.

Recommended local commands when available:

```text
git branch --show-current
git rev-parse --short HEAD
git status --short
git log --oneline -5
```

Do not use destructive git commands unless explicitly instructed.

## Output

Before substantive work, produce an engineer bootstrap report containing:

- project identified;
- repository root;
- branch and revision;
- worktree state;
- onboarding files read;
- task-specific documents read;
- source files inspected;
- tests, scripts, configs, diagnostics, or logs inspected;
- inaccessible files or blocked commands;
- documentation/code conflicts;
- task ownership boundary;
- intended change scope;
- verification plan;
- readiness status.

## Readiness States

| State | Meaning |
| --- | --- |
| Hard Failure | Required project identity, repository files, authority model, or task-relevant source evidence is missing. Stop. |
| Degraded Readiness | Enough evidence exists for limited local work, but important verification or optional evidence is unavailable. Proceed only within stated scope. |
| Engineering Ready | Task-relevant docs, source, scripts/tests/configs, and worktree state have been inspected with no blocking conflicts. |

## Bootstrap Levels

### Level 0: Engineer Role Confirmed

Required actions:

- Confirm this is a repository-attached session.
- Read or locate `VSCode_AI_Prompt.md`.
- Recognize generated onboarding files as non-authoritative.

Outputs:

- role confirmed;
- tool and filesystem access status.

### Level 1: Repository State Inspected

Required actions:

- Locate repository root.
- Inspect branch, revision, and worktree state.
- Identify untracked files and unrelated dirty files.

Outputs:

- repository root;
- branch/revision;
- status summary;
- files to avoid touching unless task-relevant.

### Level 2: Authority Model Read

Required actions:

Read:

```text
Documentation/README.md
Documentation/Knowledge_System_Guide.md
Documentation/Reference/AI/Start_Here.md
Documentation/Reference/AI/VSCode_AI_Prompt.md
Documentation/Reference/AI/VSCode_AI_Bootstrap.md
```

If the task concerns AI onboarding architecture, also inspect:

```text
Documentation/Reference/AI/AI_Prompt.md
Documentation/Reference/AI/AI_Bootstrap.md
Documentation/Reference/AI/AI_Onboarding_Architecture_Design_Context.md
```

Outputs:

- source-of-truth hierarchy;
- role distinction between high-level project AI and VS Code engineer;
- documentation category model.

### Level 3: Current State Established

Required actions:

- Read the most recent applicable handoff.
- Applicability is determined by date, status, supersession metadata where present, current branch/release, and task relevance.
- Do not select a handoff solely through lexicographic filename order.
- Treat reviews and handoffs as dated evidence, not current truth unless verified.

Outputs:

- selected handoff and rationale;
- current-state caveats.

### Level 4: Task Path Selected

Select the smallest sufficient task path.

| Task Type | Required Documents | Source Areas |
| --- | --- | --- |
| Driver work | `03`, `05`, `07`, `09` | `runner/src/drivers/`, relevant filter assertions |
| Response detection | `05`, `07`, `09` | provider detector/filter modules, `runner/debug/` if relevant |
| Browser/CDP/tab work | `04`, `08`, `14` | `runner/src/server.ts`, `runner/src/runner.ts`, `runner/restart-runner.ps1` |
| Runner server/API | `02`, `03`, `08`, `14` | `runner/src/server.ts`, `runner/src/index.ts`, `runner/src/participants.ts` |
| Studio | `02`, `10`, `12` | `src/`, `src/context/`, `src/pages/`, `src/exporters/` |
| Automa export | `02`, `10`, strategy notes | `src/exporters/automa/`, `src/reference/` |
| Testing/diagnostics | `06`, `09`, `14` | `package.json`, `runner/package.json`, assertions, diagnostics |
| Documentation | `Documentation/README.md`, `Knowledge_System_Guide.md`, `Start_Here.md` | affected Human/AI document pair |
| AI onboarding architecture | `AI_Prompt.md`, `AI_Bootstrap.md`, `VSCode_AI_Prompt.md`, `VSCode_AI_Bootstrap.md`, `AI_Onboarding_Architecture_Design_Context.md` | README files, Knowledge System guide |
| Planning/architecture | `MANIFESTO.md`, `01`, `02`, `10`, `11`, `15` | relevant source areas for current-state claims |

Outputs:

- selected docs;
- source inspection plan;
- verification plan.

### Level 5: Source Inspected

Required actions:

- Read task-relevant source files.
- Inspect relevant package scripts, configs, tests, diagnostics, logs, or generated artifacts.
- Verify command names before reporting them.

Current package-script names include:

Root:

```text
npm run build
npm run dev
npm run preview
```

Runner:

```text
npm run build
npm run start
npm run dev
npm run test:reka-filter
npm run test:deepseek-filter
npm run test:grok-filter
npm run test:copilot-filter
npm run test:claude-filter
npm run test:gemini-filter
npm run test:google-filter
```

Outputs:

- files inspected;
- implementation summary;
- command/test availability;
- unsupported claims list.

### Level 6: Reconciliation Complete

Required actions:

- Compare source, Reference docs, handoffs, reviews, and task instructions.
- Identify conflicts.
- Determine authority for each conflict.
- Separate current implementation, architecture, planned work, future vision, historical context, and recommendation.

Outputs:

- conflict report;
- resolved authority;
- remaining uncertainty.

### Level 7: Implementation Or Review Ready

Required actions:

- State intended change scope or review scope.
- Identify files likely to be edited or reviewed.
- Identify verification to run.
- State whether readiness is Engineering Ready, Degraded Readiness, or Hard Failure.

Completion criteria:

- The engineer bootstrap report is complete before edits or final review conclusions.

## Verification Discipline

Use focused verification. Do not run broad or slow commands unless they are justified by the task.

Common verification:

```text
npm run build
cd runner
npm run build
```

Provider filter tests:

```text
cd runner
npm run test:reka-filter
npm run test:deepseek-filter
npm run test:grok-filter
npm run test:copilot-filter
npm run test:claude-filter
npm run test:gemini-filter
npm run test:google-filter
```

Live smoke tests require real provider access and must not be reported as passed unless actually run.

## Engineer Report

After work, report:

- files changed;
- important implementation decisions;
- verification run and results;
- verification not run;
- residual risks;
- untracked or unrelated local files left alone.
