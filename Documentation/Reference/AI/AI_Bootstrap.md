# Maestriss AI Bootstrap

## Purpose

This document is the deterministic boot procedure for AI assistants working on Maestriss.

There are exactly two canonical AI onboarding artifacts:

```text
Documentation/Reference/AI/AI_Prompt.md
Documentation/Reference/AI/AI_Bootstrap.md
```

`AI_Prompt.md` teaches how to think.

`AI_Bootstrap.md` teaches how to acquire and verify knowledge.

The Engineering Library teaches what is true.

This document is procedural. It is not independently authoritative for project facts.

## Canonical Flow

```text
AI_Prompt.md
  -> AI_Bootstrap.md
  -> Start_Here.md
  -> task-specific Engineering Library path
  -> task-relevant source code, tests, scripts, diagnostics
  -> reconciliation
  -> confidence assessment
  -> bootstrap report
  -> gated task work
```

No README, redirect, handoff, review, navigation guide, environment-specific file, or historical context document may define a competing active onboarding path.

## Access Modes

All access modes use the same canonical prompt and bootstrap. Capability changes evidence collection, verification, confidence, and permitted task scope.

| Access Mode | Capabilities | Evidence Expectations |
| --- | --- | --- |
| Repository-attached agent with filesystem and shell access | Can inspect local files, git state, scripts, tests, diagnostics, and sometimes run commands | Enumerate files read, commands inspected or run, current branch/revision, worktree state, and verification results |
| GitHub-connected AI with repository file access | Can inspect repository files through a connector or GitHub interface | Distinguish connector access from local filesystem access; identify branch/revision when possible |
| Web AI with direct URL access | Can open repository URLs but may not reliably recurse folders or run commands | List exact URLs/files opened; never claim recursive folder reading from a directory page |
| AI receiving pasted or uploaded files only | Can inspect only supplied text or files | List supplied files/snippets; identify missing repository areas and constrain conclusions |

Repository access is not required for every task. Current-implementation claims, code changes, operational recommendations, and maturity claims require task-relevant implementation evidence. Documentation-only analysis may proceed from authoritative documentation when implementation evidence is not relevant, provided the scope and uncertainty are stated.

## Inputs

Required inputs:

- `Documentation/Reference/AI/AI_Prompt.md` or its full pasted contents;
- this file or its full pasted contents;
- `Documentation/Reference/AI/Start_Here.md` or access to retrieve it;
- task statement;
- enough repository, documentation, or pasted-file evidence to support the requested task.

Optional inputs:

- local filesystem access;
- shell access;
- GitHub connector access;
- direct URL access;
- git metadata;
- build/test capability;
- browser/live-provider access;
- historical handoffs and reviews.

## Output

Before substantive work, produce a bootstrap report containing:

- project identified;
- access mode;
- repository and revision inspected, if available;
- prompt generation metadata;
- bootstrap version or file date if available;
- prompt source mismatch or match status;
- authoritative files read;
- task-specific files read;
- source files inspected;
- tests, scripts, package commands, or diagnostics inspected;
- inaccessible evidence;
- full-file versus snippet access;
- connector, browser, filesystem, pasted, or uploaded access distinctions;
- architecture summary;
- current-state summary;
- terminology confirmed;
- documentation/code conflicts;
- assumptions;
- confidence level;
- readiness status;
- permitted task scope;
- next evidence required, if any.

## Readiness States

| State | Meaning |
| --- | --- |
| Hard Failure | Required identity, authority, or task-relevant confidence is missing. Stop. |
| Degraded Readiness | Enough evidence exists for limited work, but important task-relevant evidence is unavailable. Proceed only within stated scope. |
| Engineering Ready | Required evidence for the requested task has been inspected and no blocking conflicts remain. |

## Confidence Levels

| Level | Use When |
| --- | --- |
| Insufficient | Required project identity, authority, task-relevant repository evidence, or source-of-truth hierarchy cannot be established. |
| Low | Some evidence exists, but major task-relevant files, docs, or code are unavailable. |
| Moderate | Core authority files and task-relevant sources were inspected, but some tests, diagnostics, revision data, or optional context are missing. |
| High | Required authority files, current source, and relevant tests or diagnostics were inspected with no unresolved blocking conflicts. |

Do not assign numerical confidence. Explain the confidence level in evidence terms.

## Hard Failure Conditions

Stop only when the failure is relevant to the requested task.

Hard-fail if any of these are true:

- project identity cannot be established;
- the canonical authority model cannot be located, supplied, or reconciled;
- `AI_Prompt.md` or `AI_Bootstrap.md` is broken or inaccessible for an onboarding task;
- mandatory authority files conflict irreconcilably for the requested task;
- the AI cannot determine which information is authoritative;
- a requested implementation claim or code change requires source evidence that is unavailable;
- confidence is insufficient for the requested task.

Do not hard-fail merely because complete source access is unavailable when the task can be performed honestly from authoritative documentation or supplied files.

## Degraded Readiness Conditions

Use degraded readiness when missing evidence limits, but does not invalidate, the requested task.

Examples:

- optional source files are unavailable;
- historical files cannot be accessed;
- nonessential tests cannot be run;
- repository access is read-only;
- task-irrelevant documents are inaccessible;
- live operational verification is unavailable;
- git revision is unknown but current files are available;
- only snippets are available, but the task is explicitly limited to those snippets.

In degraded mode:

1. identify exactly what is unavailable;
2. state why the missing evidence is not blocking for the requested task;
3. state which conclusions remain supported;
4. state which conclusions cannot be verified;
5. constrain the permitted task scope;
6. request missing evidence when necessary;
7. never claim full readiness.

## Access-Integrity Checks

At every level:

- enumerate files successfully read;
- list inaccessible files;
- distinguish full-file access from snippets;
- distinguish connector access from ordinary web browsing;
- distinguish direct repository access from search-engine results;
- distinguish inspected code from documentation claims;
- distinguish user-pasted material from repository-verified material;
- never infer that a folder was recursively read merely because its page opened.

Folder-level access is not recursive evidence unless the file list was actually enumerated and the needed files were opened.

## Bootstrap Levels

### Level 0: Prompt Loaded

Entry conditions:

- The AI has received `AI_Prompt.md`, a link to it, or equivalent user instruction to bootstrap.

Required actions:

- Recognize `AI_Prompt.md` as generated and non-authoritative.
- Identify whether the prompt was received as full pasted text, a snippet, a file, or a link.
- Identify the need to inspect authoritative sources.

Required evidence:

- prompt text, prompt link, uploaded prompt file, or user-provided equivalent.

Outputs:

- initial access mode;
- prompt access type;
- intent to bootstrap before task work.

Completion criteria:

- The AI accepts the source-of-truth hierarchy and proceeds to repository identification.

Failure conditions:

- The prompt contradicts the repository's authoritative source hierarchy and cannot be reconciled for the requested task.

Next state:

- Level 1.

### Level 1: Repository Identified

Entry conditions:

- Level 0 complete.

Required actions:

- Locate the repository, supplied repository files, or public repository URL.
- Verify repository URL when possible:

```text
https://github.com/blindvigil/maestriss
```

- Identify branch and revision when possible.
- Identify access mode.

Required evidence:

- repository root, file tree, URL, connector result, pasted file set, uploaded file set, or git metadata.

Outputs:

- repository access status;
- branch/revision status;
- access mode;
- missing-access list, if any.

Completion criteria:

- Project identity and available repository scope are known.

Failure conditions:

- Project identity cannot be established for the requested task.

Next state:

- Level 2.

### Level 2: Knowledge System Located

Entry conditions:

- Level 1 complete.

Required actions:

- Locate or request:

```text
Documentation/
Documentation/README.md
Documentation/Knowledge_System_Guide.md
Documentation/Reference/AI/
```

Required evidence:

- file presence, opened URL, connector result, uploaded file, pasted file, or explicit absence.

Outputs:

- Knowledge System access status;
- full-file or partial-file status.

Completion criteria:

- Documentation entry points are found or missing files are named.

Failure conditions:

- The canonical documentation authority model is missing and cannot be supplied for a task that depends on project-wide documentation truth.

Next state:

- Level 3.

### Level 3: Canonical Prompt Verified

Entry conditions:

- Level 2 complete.

Required actions:

- Locate the repository copy of `Documentation/Reference/AI/AI_Prompt.md`.
- Compare project identity, generation metadata, source branch, source commit, and accessible version against the received prompt.
- If the prompt was received in full and matches the repository copy or source revision metadata, do not reread identical content unnecessarily.
- Read the repository copy only if the prompt was not already received in full, if metadata mismatches, or if verification requires it.
- Identify stale, partial, or mismatched prompt content explicitly.

Required evidence:

- received prompt metadata;
- repository prompt metadata, if accessible;
- mismatch or match status.

Outputs:

- prompt verification result;
- stale/mismatched prompt reconciliation, if needed.

Completion criteria:

- The AI can state whether the received prompt and repository prompt align closely enough for the requested task.

Failure conditions:

- The received prompt and repository prompt conflict in a way that breaks source-of-truth handling for the requested task and cannot be reconciled.

Next state:

- Level 4.

### Level 4: Mandatory Authority Files Read

Entry conditions:

- Level 3 complete.

Required actions:

Read, retrieve, or request:

1. `Documentation/Reference/AI/AI_Bootstrap.md`
2. `Documentation/README.md`
3. `Documentation/Knowledge_System_Guide.md`
4. `Documentation/Reference/AI/Start_Here.md`

Read `AI_Prompt.md` only if Level 3 determined that the received copy was partial, stale, mismatched, or unverified.

Required evidence:

- file contents inspected or explicit missing-file report;
- full-file or snippet status for each file.

Outputs:

- source-of-truth hierarchy;
- canonical onboarding path;
- documentation category model;
- access limitations.

Completion criteria:

- The AI can identify which sources are authoritative for project facts.

Failure conditions:

- source-of-truth hierarchy cannot be determined for the requested task;
- mandatory files conflict irreconcilably for the requested task.

Next state:

- Level 5.

### Level 5: Current State Established

Entry conditions:

- Level 4 complete.

Required actions:

- Read the most recent applicable handoff in `Documentation/Handoffs/`.
- Inspect git status/log when possible.
- Treat handoff content as dated, not automatically current.

Applicability is determined by:

- date;
- status;
- supersession metadata where present;
- current branch or release;
- task relevance.

Do not select a handoff solely through lexicographic filename order.

Required evidence:

- selected handoff name and date;
- reason it is applicable;
- git branch/revision when available.

Outputs:

- current-state summary;
- historical-vs-current caveats;
- handoff applicability rationale.

Completion criteria:

- The AI can distinguish milestone state from current source state.

Failure conditions:

- no current-state evidence is available and the requested task requires current-state claims.

Next state:

- Level 6.

### Level 6: Task Path Selected

Entry conditions:

- Level 5 complete.

Required actions:

- Classify the task.
- Select only the needed path below.

Task paths:

| Task Type | Required Documents | Source Areas |
| --- | --- | --- |
| Driver work | `03`, `05`, `07`, `09` | `runner/src/drivers/`, relevant filter assertions |
| Response detection | `05`, `07`, `09` | provider filtering modules, `runner/debug/` when available |
| Browser/CDP/tab work | `04`, `08`, `14` | `runner/src/server.ts`, `runner/src/runner.ts`, `runner/restart-runner.ps1` |
| Runner server/API | `02`, `03`, `08`, `14` | `runner/src/server.ts`, `runner/src/index.ts`, `runner/src/participants.ts` |
| Studio | `02`, `10`, `12` | `src/`, `src/context/`, `src/pages/`, `src/exporters/` |
| Automa export | `02`, `10`, strategy notes | `src/exporters/automa/`, `src/reference/` |
| Testing/diagnostics | `06`, `09`, `14` | `package.json`, `runner/package.json`, assertions, diagnostics |
| Documentation | `Documentation/README.md`, `Knowledge_System_Guide.md`, `Start_Here.md` | affected Human/AI document pair |
| AI onboarding architecture | `AI_Prompt.md`, `AI_Bootstrap.md`, `Start_Here.md`, `AI_Onboarding_Architecture_Design_Context.md` | redirects, README files, Knowledge System guide |
| Planning/architecture | `MANIFESTO.md`, `01`, `02`, `10`, `11`, `15` | relevant source areas for current-state claims |

`AI_Onboarding_Architecture_Design_Context.md` is optional, historical, and non-authoritative. Read it only when the task concerns AI onboarding architecture, prompt/bootstrap design, or why the current onboarding model exists. It is not a third onboarding entry point.

Required evidence:

- selected path and reason.

Outputs:

- task-specific reading list;
- source inspection list.

Completion criteria:

- Scope is narrow enough to avoid unnecessary reading and broad enough to support the task.

Failure conditions:

- task cannot be classified and user clarification or more context is required.

Next state:

- Level 7.

### Level 7: Task-Relevant Implementation Inspected

Entry conditions:

- Level 6 complete.

Required actions:

- Inspect task-relevant source files when implementation matters and access allows.
- Inspect relevant scripts, tests, diagnostics, or configuration when they matter and access allows.
- Verify documented commands before naming them.

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

Required evidence:

- file paths inspected;
- package scripts checked when commands matter;
- tests/diagnostics checked when relevant;
- unavailable implementation evidence named.

Outputs:

- implementation summary;
- evidence list;
- unsupported claims list.

Completion criteria:

- Current implementation behavior relevant to the task is known or explicitly unavailable.

Failure conditions:

- task requires implementation facts but task-relevant source cannot be inspected or supplied.

Next state:

- Level 8.

### Level 8: Reconciliation Complete

Entry conditions:

- Level 7 complete.

Required actions:

- Compare source code, Reference docs, handoffs, reviews, and task instructions.
- Identify conflicts.
- Determine authority for each conflict.

Required evidence:

- conflicting files or claims, if any.

Outputs:

- conflict report;
- current vs architecture vs planned vs historical classification.

Completion criteria:

- No blocking unreconciled conflict remains for the requested task.

Failure conditions:

- mandatory authority files conflict irreconcilably for the requested task;
- the AI cannot determine which information is authoritative.

Next state:

- Level 9.

### Level 9: Confidence Assessed

Entry conditions:

- Level 8 complete.

Required actions:

- Assign confidence: Insufficient, Low, Moderate, or High.
- Justify confidence using evidence inspected and evidence missing.
- Decide readiness state.

Required evidence:

- authoritative files read;
- source files inspected;
- tests or diagnostics inspected or unavailable;
- unresolved conflicts;
- inaccessible evidence.

Outputs:

- confidence level;
- readiness state;
- permitted task scope.

Completion criteria:

- The AI knows whether it may proceed, proceed in degraded mode, or stop.

Failure conditions:

- confidence is insufficient for the requested task.

Next state:

- Level 10.

### Level 10: Engineering Ready

Entry conditions:

- Level 9 complete with Engineering Ready or Degraded Readiness.

Required actions:

- Produce the bootstrap report.
- Wait until the report is complete before substantive task work.

Required evidence:

- all prior level outputs.

Outputs:

- bootstrap report.

Completion criteria:

- The report includes project identity, access mode, repository/revision, prompt metadata, prompt match status, bootstrap file, documents read, source inspected, conflicts, inaccessible evidence, assumptions, confidence, readiness, scope, and next evidence required.

Failure conditions:

- the report cannot be produced honestly from available evidence.

Next state:

- Begin task only within the permitted scope.

## Verification Commands

Use only when relevant and available. Verify package scripts before naming commands as current.

Root build:

```text
npm run build
```

Runner build:

```text
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
