# Handoff: OpenAI API Council Execution

**Date:** 2026-07-15
**Version:** 0.2.1 (canonical `package.json`; newest tag is `v0.2.0` — `v0.2.1` not yet created; tag only with human approval)
**Branch / revision:** `master` @ `8ddadf7`
**Audience:** Any future human or AI session picking up Maestriss without prior conversation context. This is the fastest accurate path to current state; it supersedes the 2026-07-14 handoff for current-state purposes (that handoff remains historically accurate for its own date).
**Status labels:** `[IMPLEMENTED]` working now · `[LIVE-VERIFIED]` proven by a real run · `[LIMITATION]` known gap · `[PROPOSED]` designed, not approved, not built · `[FUTURE]` direction, not started.

## Milestone Purpose

This handoff closes the phase in which Maestriss crossed from **browser-only** Council execution into **direct API** Council execution, and records the first live all-OpenAI Council run together with the defect that run exposed.

Everything described in the 2026-07-14 handoff as `[UNCOMMITTED]` is now committed. The worktree is clean.

## Critical First Facts

1. **Maestriss now has two execution transports.** The Native Runner browser path (`/ask`) remains the default and is not deprecated. The OpenAI Responses API is the first direct API transport. API execution is an *additional* transport, never a reason to remove provider-specific browser drivers.
2. **The current highest-priority defect is the response-boundary problem** (see below). Resume there before further transport expansion.
3. **Do not treat the proposed three-layer response-boundary design as implemented.** It is `[PROPOSED]` only.
4. **Credentials:** the OpenAI key is supplied only through the `OPENAI_API_KEY` environment variable. It is never stored, printed, or committed by Maestriss.

## What Exists Now

- `[IMPLEMENTED]` Nine-provider Native Runner (browser transport): `/ask` lifecycle, readiness, cancellation, diagnostics, per-provider filter suites, sequential baton test.
- `[IMPLEMENTED]` Council system: shared contract (`shared/council/`), 16 canonical Callings, 16 built-in Doctrines, six cognitive stats, deterministic prompt composition, live Doctrine execution (`runner/src/councilExecution.ts`), operator CLI (`runner/src/councilCliFormat.ts`).
- `[IMPLEMENTED]` Canonical per-Seat response-length target (`maxResponseChars`, default 1024) — **prompt-side advisory only**; see the defect below.
- `[IMPLEMENTED]` Deterministic, availability-scoped provider fallback per Seat (Preferred Mind + ordered fallback chain, at most five choices). Fallback never changes the Seat's Calling, cognitive identity, or composed prompt.
- `[IMPLEMENTED]` Run-scoped provider availability memory (`runner/src/councilAvailability.ts`): a fresh-per-run, never-persisted registry (`unknown`/`ready`/`unavailable`) with structured evidence. A Mind established unavailable is skipped on later Seats with no re-check, no ask, no retry consumed.
- `[IMPLEMENTED]` OpenAI Responses API transport (`runner/src/openaiTransport.ts`, official `openai` Node SDK, model `gpt-4o-mini`), plus a run-level CLI execution override (`--mind openai-api`) that forces every Seat through the API.
- `[IMPLEMENTED]` Isolated live smoke test `npm run test:openai-api` (exact-response validation; excluded from all deterministic suites) and a deterministic, network-free transport suite `npm run test:openai-transport`.

## First Live All-OpenAI Council Run `[LIVE-VERIFIED]`

Observed live on 2026-07-15 (operator-run; Council run state is in-memory only, so this record is the evidence):

- Doctrine: **Dream Lab**, 7 Seats
- Result: **7 passed, 0 skipped, 0 failed**, 7 successful contributions
- Duration: approximately **63 seconds**
- Every Seat executed through the **OpenAI API / gpt-4o-mini**
- The browser Runner service was **not required**

What this proved: the transport architecture holds end-to-end. Composition stayed transport-independent (each Seat's cognitive stats resolved from its *configured* Preferred Mind, not the executor); configured Preferred Mind / run override / actual Execution Target were all reported truthfully; Memory, prompt-budget, and over-target diagnostics all behaved correctly against a real provider.

## Current Highest-Priority Defect `[LIMITATION]`

**`maxResponseChars` is advisory, not an enforced Council invariant.**

What works today: resolved Seat configuration, deterministic prompt guidance, CLI observability, and post-response measurement/warning.

What the live run exposed: `gpt-4o-mini` substantially and repeatedly exceeded the 1,024-character target despite explicit prompt guidance — observed later-Seat contributions of roughly 2,399 / 2,417 / 2,137 / 2,059 / 2,126 characters. The CLI correctly reported length, target, `Target exceeded: YES`, and the excess. **But the oversized contributions were admitted to Council memory in full**, consuming the 12,000-character prompt budget:

- Seat 6 (Alchemist): 5 contributions eligible, 5 Memory-selected, **only 2 included** after budget.
- Seat 7 (Royal Scribe): 6 eligible, 6 Memory-selected, **only 3 included** — Seats 1, 2, and 3 omitted.

The Royal Scribe was configured **Memory 9 / full eligible record** yet did not receive the full eligible record. Memory intent was silently defeated by unbounded contribution size.

**The next decision:** how should `maxResponseChars` become a hard end-to-end Council invariant rather than advisory guidance — before further transport expansion?

### Proposed direction `[PROPOSED]` — not approved, not implemented

A three-layer contract:

1. **Prompt guidance** — keep explicit response-length guidance; wording may need to be stronger than the current "approximately" phrasing.
2. **Transport-native output budget** — for API transports that support it, derive a conservative output-token budget from `maxResponseChars` (investigate OpenAI Responses `max_output_tokens` semantics). No fixed character-to-token ratio is exact; any mapping must be conservative, deterministic, documented, and tested.
3. **Council admission boundary** — no contribution admitted to Council memory silently exceeds its Seat's resolved `maxResponseChars`. Preserve the complete raw provider response for diagnostics; define a deterministic normalization/admission policy, preferring a safe sentence/paragraph boundary over arbitrary character cuts.

Proposed invariant: **no contribution admitted to Council memory exceeds its Seat's resolved `maxResponseChars`.**

The next Commander must inspect current code, reason about tradeoffs, and prepare the implementation brief. Do not document this as built.

## Quality Observation (single run — do not overstate)

The all-`gpt-4o-mini` Dream Lab run was operationally successful but intellectually repetitive: later contributions converged on adaptive frameworks, semantic/ML anchors, feedback loops, cross-provider heuristic learning, and multi-modal evidence, and the Royal Scribe largely re-synthesized themes already present. Calling flavour plus cognitive stats alone may not create sufficient perspective diversity when every Seat runs the same small model.

This is one run. It motivates future investigation of model diversity, mixed API transports, model selection by Calling, anti-repetition/novelty pressure, Doctrine choreography, and stronger Dissent / Calling-specific output contracts — **all subordinate to the response-boundary defect.**

## Why the API Transport Exists (browser context — do not regress)

Live browser Council runs surfaced a sustained class of failures: Grok account/plan gating chrome accepted as a successful response; long completed ChatGPT responses rejected by a 1,200-pixel size proxy; structured driver failure categories flattened into free text before fallback classification; Claude and Perplexity trapped in Cloudflare human-verification loops; Grok blocking sign-in; Copilot requiring a paid-plan upgrade; Google sign-in trouble. Browser-session and provider-account availability became a major operational constraint.

The Grok and ChatGPT detection regressions and structured ask-failure reason preservation are fixed and committed (`640ce0d`). Browser transport remains first-class.

## Recent Commits (verified against git)

```text
d82438d  feat: canonical role library and sixteen goal-specific council presets
aa1a98c  feat: council system with cognitive stats, live doctrine execution, and operator observability
e60bbc2  feat: deterministic provider fallback with per-seat Mind preference chains
640ce0d  fix: live-run response detection regressions
b89eba5  feat: canonical per-seat response-length target
473f691  feat: run-scoped provider availability memory for Council runs
755723d  test: add isolated OpenAI Responses API smoke test
8ddadf7  feat: add OpenAI API Council execution transport
```

## Operational Notes

Deterministic suites (browser-free, network-free):

```text
cd runner
npm run test:council            # shared contract
npm run test:cognitive-stats    # six cognitive stats
npm run test:council-execution  # execution engine
npm run test:council-cli        # operator output
npm run test:openai-transport   # OpenAI transport (injected caller)
npm run test:baton              # sequential baton
npm run audit:doctrine-memory   # Doctrine input-policy x Memory audit
```

Live, billed, excluded from every deterministic suite: `npm run test:openai-api`.

The all-OpenAI Council run (requires `OPENAI_API_KEY` in the environment; no browser Runner service needed):

```text
cd D:\Programming\Chatjects\Maestriss\runner
npm run dev -- council run --doctrine dream-lab --prompt-file .\test-prompts\response-detection.txt --mind openai-api --verbose
```

`OPENAI_API_KEY` set at Windows **user** scope is not visible to already-running terminals or editor processes; open a fresh terminal (or otherwise reload the environment) before an API run. Maestriss never stores the key.

## Next Steps

1. **Decide and brief the response-boundary invariant** (the defect above). This is the next priority.
2. `[FUTURE]` Persisted Council Records; mixed-transport routing (API + browser in one Council); model selection by Calling; Anthropic/other API transports; native inference-parameter mapping; Studio-triggered execution; Crown Council voting semantics.

## Where to Look

Reference doc `02` (architecture: Council contract, Seat model, fallback, run-scoped availability, execution transport), `11` (current status and journal, newest-first), `09` (suites), `14` (runbook, including OpenAI API execution mode). Onboarding pairs: `Web_AI_*` (Commander) and `VSC_AI_*` (implementation engineer).
