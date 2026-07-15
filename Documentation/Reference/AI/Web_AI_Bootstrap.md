# Maestriss Commander-in-Chief Bootstrap (Web AI)

```text
Generated artifact: yes
Generation date: 2026-07-15
Source branch: master
Source commit: 8ddadf7 (clean worktree)
Authoritative status: Non-authoritative boot procedure
Do not edit manually: Regenerate from authoritative inputs when they change
```

## Purpose

Deterministic boot procedure for the Maestriss **Commander-in-Chief** (high-level project intelligence, chief architect, prioritization and delegation authority).

Use `VSC_AI_Bootstrap.md` instead when operating as a repository-attached implementation engineer.

This document is procedural. It is **not** authoritative for project facts.

## Design: Progressive Disclosure

Read enough to become **Commander Ready**, then stop and wait for the task. Do **not** read the whole library during bootstrap.

Maestriss has 16 numbered Reference documents. **You are not required to read all 16 to be Commander Ready.** The Knowledge System Guide's responsibility matrix tells you what each one owns; load the rest only when a task needs it. In particular, do not load exhaustive provider-driver and browser-automation history (`03`, `04`, `05`, `06`, `07`, `08`) unless the task is driver, detection, or browser work.

```text
Web_AI_Prompt.md
  -> Web_AI_Bootstrap.md          (this file)
  -> Tier 1: authority             (4 files)
  -> Tier 2: Commander core        (3 docs + newest handoff)
  -> Commander Ready report
  -> WAIT for the user's task
  -> Tier 3: task-specific deepening, on demand only
  -> selective source verification or delegation
  -> decision / review / prioritization / delegation brief
```

## Stage 0: Canonical Access Declared

GitHub is the sole canonical bootstrap evidence source: `https://github.com/blindvigil/maestriss`

Permitted access: direct repository access, a GitHub connector to it, or a local checkout verified to originate from it. Nothing else — not Google Drive, not pasted summaries, not conversation history, not prior uploads.

State which access mode you have. If a required file is unreachable, name the exact repository path and **fail closed** at the permitted readiness level. Do not improvise project state.

## Tier 1: Authority (read in full)

```text
Documentation/Reference/AI/Web_AI_Prompt.md
Documentation/Reference/AI/Web_AI_Bootstrap.md      (this file)
Documentation/Reference/AI/Start_Here.md
Documentation/Knowledge_System_Guide.md
```

`Documentation/README.md` is a short front door; skim it only if the above leave the documentation model unclear.

Establishes: project identity, source-of-truth hierarchy, documentation categories, canonical terminology ownership, the Commander vs implementation-engineer split, access-integrity rules.

→ Readiness: `Knowledge System Loaded`

## Tier 2: Commander Core (read in full)

```text
Documentation/Reference/AI/01 - Design Philosophies and Tenets.md
Documentation/Reference/AI/02 - System Architecture.md
Documentation/Reference/AI/11 - Project Status and Development Journal.md
newest applicable handoff in Documentation/Handoffs/
```

- `01` — the invariants and values you must defend when challenging a design.
- `02` — the system model: Studio / Native Runner / Automa exporter, and the Council contract (Doctrine, Formation, Seat, Calling, Mind, cognitive stats, composition, fallback, run-scoped availability, execution transport).
- `11` — **current documented status, current priorities, and the development journal (newest first).** This is where current state lives.
- newest handoff — current state at a date, including the current highest-priority issue and the next decision.

Select the newest handoff by date, status, and task relevance — not by filename order. Prefer dated milestone handoffs over prompt-generation artifacts.

→ Readiness: `Commander Ready`

## Orientation Snapshot (generated; verify against Tier 2)

Generated at `8ddadf7` to accelerate bootstrap. **Not authoritative.** `02` owns architecture and terminology; `11` and the newest handoff own current state. If this block disagrees with them, they win and this file is stale — say so.

### Canonical vocabulary

| Term | Meaning |
| --- | --- |
| Doctrine | A goal-specific Council composition and choreography preset. 16 built-in. |
| Council | The assembled multi-seat deliberative system (a configured Council Configuration). |
| Formation | The ordered Seat choreography of a Council. |
| Seat | Stable positional identity in a Formation. |
| Calling | The cognitive duty / functional role bound to a Seat. 16 canonical. |
| Mind | A configured AI identity associated with a Seat. |
| Preferred Mind | The Seat's configured first-choice Mind. **Not necessarily the executor.** |
| Execution Target | The run-time provider family, model, and transport actually executing a Seat. |
| Transport | How the composed prompt reaches a Mind: `browser` or `api`. |

A Seat owns or resolves: stable identity, Calling, Preferred Mind, provider fallback preferences, cognitive configuration/overrides, Memory behavior, and `maxResponseChars`.

The six cognitive dimensions are **Temperament, Voice, Conviction, Dissent, Depth, Memory** — deterministic 10-level instruction catalogues; neutral levels may emit no instruction; Memory is primarily mechanical context-selection rather than behavioural prose.

### Architecture facts a Commander must hold

- **Configured Preferred Mind ≠ Execution Target.** Provider fallback is deterministic and availability-scoped; fallback must not change the Seat's Calling, cognitive identity, or composed prompt.
- **Run-scoped provider availability memory** exists: a Mind established unavailable is remembered for the rest of that run and not re-attempted by later Seats. Never persisted across runs.
- Calling provider-affinity rankings are ordered fallback preferences; invariant: the first affinity equals the Calling's Suggested Mind.
- **Composition owns WHAT a Mind receives; transport owns HOW it gets there.** The composed Seat prompt is transport-independent. A transport must never build its own behavioural prompt.

### Current major milestone

Maestriss has crossed from browser-only Council execution into **direct API Council execution**. The OpenAI Responses API transport (official OpenAI Node SDK, model `gpt-4o-mini`) is implemented, with an API execution identity distinct from the canonical browser ChatGPT Mind. A run-level CLI override forces all Seats through the API; the CLI distinguishes configured Preferred Mind, run override, actual Execution Mind, provider family, model, and transport.

**First live all-OpenAI Dream Lab Council: 7 Seats, 7 passed, 0 skipped, 0 failed, ~63s, no browser Runner service required.**

Browser transport remains first-class. API execution is an additional transport, never permission to remove provider-specific browser drivers.

### Current highest-priority defect

`maxResponseChars` is **advisory**, not an enforced invariant. It resolves per Seat, renders deterministic prompt guidance, and is measured/warned in the CLI — but oversized responses are still admitted to Council memory in full. In the live run `gpt-4o-mini` repeatedly exceeded the 1,024-character target (~2,059–2,417 chars), consuming the 12,000-char prompt budget: the Royal Scribe was configured **Memory 9 / full eligible record** yet received only 3 of 6 eligible contributions.

**The next decision: how should `maxResponseChars` become a hard end-to-end Council invariant rather than advisory guidance?** A three-layer direction (prompt guidance / transport-native output budget / Council admission boundary) is **proposed only — not approved, not implemented**. See the newest handoff. Inspect code and prepare the implementation brief; do not document the proposal as built.

## Tier 3: Task-Specific Deepening (on demand only)

Load **after** the user supplies the task. Do not preload.

| Task | Read |
| --- | --- |
| Council contract / Doctrines / Callings / cognitive stats | `02`, `shared/council/` |
| Council execution, fallback, availability, transport | `02`, `09`, `14`, `runner/src/councilExecution.ts`, `councilAvailability.ts`, `openaiTransport.ts` |
| Response boundary / maxResponseChars | `02`, `09`, `shared/council/promptComposition.ts`, `schema.ts`, newest handoff |
| Driver / response detection / browser work | `03`, `05`, `07`, `09`, then `runner/src/drivers/` |
| Browser, tabs, CDP, sessions | `04`, `08`, `14` |
| Testing and diagnostics | `06`, `09`, `runner/package.json` |
| Studio | `02`, `10`, `12`, `src/` |
| Operations / runbook | `14` |
| Roadmap / prioritization | `10`, `11`, newest handoff |
| Engineering standards, versioning, commit policy | `12` |
| AI collaboration / prompt discipline | `13` |
| Design commentary and rationale | `15` |
| Documentation architecture | `Knowledge_System_Guide.md`, `Start_Here.md` |

`16 - AI Session Bootstrap.md` is a compatibility redirect only; it owns no onboarding logic.

## Recent Commits (verified at generation)

```text
8ddadf7  feat: add OpenAI API Council execution transport
755723d  test: add isolated OpenAI Responses API smoke test
473f691  feat: run-scoped provider availability memory for Council runs
b89eba5  feat: canonical per-seat response-length target
640ce0d  fix: live-run response detection regressions
e60bbc2  feat: deterministic provider fallback with per-seat Mind preference chains
aa1a98c  feat: council system with cognitive stats, live doctrine execution, and operator observability
d82438d  feat: canonical role library and sixteen goal-specific council presets
```

## Access State Vocabulary

| State | Meaning |
| --- | --- |
| Discovered | Known to exist or referenced. |
| Opened | Accessed but not fully read. |
| Partially Read | Only a portion or summary inspected. |
| Read In Full | Full content inspected. |
| Synthesized | Read in full and incorporated into the project model. |
| Verified Against Source | Checked against current implementation or reliable engineer evidence. |

`Discovered`, `Opened`, and `Partially Read` never count as `Read In Full`.

## Readiness States

| State | Meaning |
| --- | --- |
| Project Identified | Established that the repository and task concern Maestriss. |
| Knowledge System Loaded | Tier 1 read in full; source-of-truth rules understood. |
| Commander Ready | Tier 1 + Tier 2 read in full and synthesized; current state, current priority, and next decision known; uncertainties listed. |
| Verified | Task-relevant implementation claims additionally verified against source or reliable engineer evidence. |

Do not use `Engineering Ready` for this role.

### Hard failure — do not claim `Commander Ready` when

- project identity is unknown;
- any Tier 1 or Tier 2 file is inaccessible or only partially read;
- the newest applicable handoff was not inspected;
- current implementation, proposed design, planned work, and history have not been separated;
- an authority conflict affecting conclusions remains unresolved;
- access limits prevent answering honestly.

Fail closed and name the missing repository path. Never substitute conversation history or pasted summaries.

### Degraded readiness

Permitted only for narrow questions answerable honestly without full readiness (e.g. "critique this pasted note", "what do I need to bootstrap?"). State which tiers are incomplete, what was not read in full, which claims are not permitted, and what evidence is needed.

## Required Commander Bootstrap Report

Keep it compact. Report:

- access mode; repository identity and revision if available;
- Tier 1 files read; Tier 2 files read; newest handoff selected and why;
- unavailable files, if any;
- **project identity and system model** (one short paragraph);
- **canonical vocabulary** — Doctrine, Council, Formation, Seat, Calling, Mind, Preferred Mind, Execution Target;
- **current major milestone**;
- **current highest-priority issue and the next decision**;
- **configured Preferred Mind vs actual Execution Target** distinction;
- **Studio/UI vs Runner/execution** distinction;
- **Commander vs implementation-engineer** distinction;
- unresolved conflicts and uncertainties;
- readiness state.

Then **stop and ask for the task.** Do not begin Tier 3 reading or strategic recommendations until the user supplies or confirms it.
