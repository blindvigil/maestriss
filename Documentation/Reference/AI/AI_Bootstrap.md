# Maestriss Web AI Commander Bootstrap

## Purpose

This document is the deterministic boot procedure for web-based AI commanders working on Maestriss.

Use this bootstrap when the AI is primarily advising, planning, reviewing, critiquing, or directing implementation from a web session or other non-local environment.

Use `VSCode_AI_Bootstrap.md` instead when the AI has direct repository filesystem access and is expected to implement changes.

This document is procedural. It is not independently authoritative for project facts.

## Canonical Commander Flow

```text
AI_Prompt.md
  -> AI_Bootstrap.md
  -> Start_Here.md
  -> task-specific Engineering Library path
  -> accessible code, reviews, handoffs, or supplied evidence as needed
  -> reconciliation
  -> confidence assessment
  -> commander bootstrap report
  -> advice, review, plan, or implementation handoff
```

## Inputs

Required inputs:

- `Documentation/Reference/AI/AI_Prompt.md` or its full pasted contents;
- this file or its full pasted contents;
- `Documentation/Reference/AI/Start_Here.md` or access to retrieve it;
- task statement;
- enough documentation, repository, pasted, uploaded, or linked evidence to support the requested commander task.

Optional inputs:

- GitHub repository access;
- direct URL access;
- pasted or uploaded source files;
- current handoffs and reviews;
- engineer reports;
- code diffs;
- logs, screenshots, diagnostics, or build/test output.

## Output

Before substantive work, produce a commander bootstrap report containing:

- project identified;
- access mode;
- repository, branch, and revision inspected, if available;
- prompt generation metadata;
- bootstrap file inspected;
- authoritative files read;
- task-specific documents read;
- source files inspected, if any;
- supplied evidence inspected;
- inaccessible evidence;
- full-file versus snippet access;
- connector, browser, pasted, uploaded, or search-result distinctions;
- architecture summary;
- current-state summary;
- terminology confirmed;
- documentation/code conflicts;
- assumptions;
- confidence level;
- readiness status;
- permitted task scope;
- recommended next inspection for a repository-attached engineer AI, if implementation is needed.

## Readiness States

| State | Meaning |
| --- | --- |
| Hard Failure | Required identity, authority, or task-relevant confidence is missing. Stop. |
| Degraded Readiness | Enough evidence exists for limited advice or planning, but important task-relevant evidence is unavailable. Proceed only within stated scope. |
| Commander Ready | Required evidence for strategic, review, planning, or handoff work has been inspected and no blocking conflicts remain. |

## Access Integrity

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

Required actions:

- Recognize `AI_Prompt.md` as generated and non-authoritative.
- Identify whether the prompt was received as pasted text, upload, file, snippet, or link.
- Accept the commander role unless the user explicitly asks for local implementation and repository tools are available.

Outputs:

- prompt access type;
- commander role acknowledged;
- initial evidence limits.

### Level 1: Project Identity Established

Required actions:

- Establish that the project is Maestriss.
- Verify repository URL when possible:

```text
https://github.com/blindvigil/maestriss
```

- Identify accessible branch and revision when possible.

Failure condition:

- Hard-fail if project identity cannot be established for the requested task.

### Level 2: Authority Model Located

Required actions:

- Locate, read, or request:

```text
Documentation/README.md
Documentation/Knowledge_System_Guide.md
Documentation/Reference/AI/Start_Here.md
```

- Confirm the source-of-truth hierarchy.
- Confirm the distinction between web commander onboarding and VS Code engineer onboarding.

Failure condition:

- Hard-fail if the source-of-truth hierarchy cannot be established for a task that depends on project truth.

### Level 3: Current State Established

Required actions:

- Read the most recent applicable handoff when available.
- Applicability is determined by date, status, supersession metadata where present, branch/release relevance, and task relevance.
- Do not select a handoff solely through lexicographic filename order.
- Treat handoff content as dated, not automatically current.

Outputs:

- selected handoff and rationale;
- current-state caveats;
- known inaccessible current-state evidence.

### Level 4: Task Path Selected

Classify the task and select the smallest sufficient reading path.

| Task Type | Required Documents | Evidence to Request or Inspect |
| --- | --- | --- |
| Architecture review | `01`, `02`, `10`, `15` | Relevant code or implementation summaries when current behavior matters |
| Driver strategy | `03`, `05`, `07`, `09` | Relevant driver files or engineer report |
| Browser automation strategy | `04`, `08`, `14` | Runner code, scripts, logs, or engineer report |
| Response detection strategy | `05`, `07`, `09` | Candidate diagnostics, filter tests, provider code, or engineer report |
| Studio/product planning | `02`, `10`, `12`, `13` | `src/` evidence when implementation status matters |
| Documentation review | `Documentation/README.md`, `Knowledge_System_Guide.md`, `Start_Here.md` | Affected Human/AI doc pair |
| AI onboarding architecture | `AI_Prompt.md`, `AI_Bootstrap.md`, `VSCode_AI_Prompt.md`, `VSCode_AI_Bootstrap.md`, `AI_Onboarding_Architecture_Design_Context.md` | README files and Knowledge System guide |
| Code review | Relevant architecture docs plus supplied diff/files | Supplied code, repository files, tests, build output |
| Implementation handoff | Relevant architecture docs plus task area docs | File list, test list, risks, verification instructions |

`AI_Onboarding_Architecture_Design_Context.md` is optional, historical, and non-authoritative. Read it only when the task concerns AI onboarding architecture or why the current onboarding model exists.

### Level 5: Evidence Reconciled

Required actions:

- Compare accessible code, Reference docs, handoffs, reviews, and task instructions.
- Identify conflicts.
- Determine authority for each conflict.
- Separate current implementation, architecture, planned work, future vision, historical context, and recommendation.

Outputs:

- conflict report;
- category classification;
- unsupported claims list.

### Level 6: Confidence Assessed

Assign confidence:

| Level | Use When |
| --- | --- |
| Insufficient | Required identity, authority, or task evidence cannot be established. |
| Low | Some evidence exists, but major task-relevant sources are unavailable. |
| Moderate | Core documentation and some task evidence were inspected, but implementation verification is incomplete. |
| High | All task-relevant accessible docs and evidence were inspected with no unresolved blocking conflicts. |

Do not assign numerical confidence.

### Level 7: Commander Ready

Produce the commander bootstrap report before answering the task.

The report must state:

- what was read;
- what was inaccessible;
- what was verified;
- what remains uncertain;
- whether the AI is ready for commander work, degraded advice, or blocked;
- what a repository-attached engineer AI should inspect next if implementation is required.

## Failure And Degraded Readiness

Hard-fail only when the missing evidence is task-relevant and prevents honest work.

Use degraded readiness when missing evidence limits but does not invalidate the requested commander task.

Examples:

- planning can proceed from architecture docs while implementation details remain unverified;
- documentation review can proceed from supplied documents while code verification is deferred;
- implementation handoff can identify likely files and tests while requiring the engineer AI to verify them locally.

Do not claim full implementation certainty without inspected implementation evidence.
