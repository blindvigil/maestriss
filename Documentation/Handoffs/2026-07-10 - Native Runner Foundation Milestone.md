# Handoff: Native Runner Foundation Milestone

**Date:** 2026-07-10
**Version:** v0.2.0 "Documented Foundation" (git tag `v0.2.0`, both `package.json` files at 0.2.0)
**Audience:** Any future human or AI session picking up Maestriss without prior conversation context.
**Status labels used below:** `[IMPLEMENTED]` working now · `[LIMITATION]` known gap in what exists · `[DEFERRED]` consciously postponed · `[FUTURE]` direction, not started.

## Milestone Purpose

This handoff closes the phase that took Maestriss from a UI prototype to a working nine-provider browser-automation engine with a permanent documentation library. It records what exists, what was learned, what was deliberately not built, and what should come next.

## Repository State and Commit History

| Commit | Date | Content |
| --- | --- | --- |
| `a27c4b2` | 2026-07-07 | Initial Vite React skeleton (Studio shell). |
| `5f2be43` | 2026-07-07 | Studio workflows, pages, Automa export strategy. |
| `ac0b441` | 2026-07-09 | Native runner introduced; Automa wait improvements. |
| `ef75869` | 2026-07-10 | Reference docs 01–14 (as `Planning_and_Reference/`); major driver hardening (Claude, Google, Gemini); claude/gemini/google filter suites. |
| `30cc6bc` | 2026-07-10 | Doc reconciliation fixes (dual browser modes, Studio/exporter section, security gate); code fixes: real `/health` connectivity, Grok debug-trap removal. |
| `2000002` | 2026-07-10 | Docs-vs-code reconciliation audit report committed. |
| `d6eb1a8` | 2026-07-10 | v0.2.0: docs reorganized into `Documentation/Reference` + `Documentation/Reviews`; root `README.txt`; `bootstrap.txt`. |

Single branch `master`; one tag `v0.2.0`; no remote configured at handoff time. No CI, no lint config, no test framework (tests are `tsx` scripts).

## Native Runner Architecture `[IMPLEMENTED]`

`runner/` is a Node + TypeScript + Playwright service with two faces over one core:

- **HTTP server** on `127.0.0.1:4137` (`runner/src/server.ts`): endpoints `GET /health`, `GET /providers/status`, `POST /ask`, `POST /inspect`, `POST /cancel-all`, `POST /chain`, `POST /run-random`.
- **CLI** (`runner/src/index.ts`): `serve`, `health`, `cancel-all`, `check-providers`, `ask`, `chain`, `run-random`, `inspect`; flags `--channel chromium|chrome|msedge`, `--connect-cdp <url>`, `--focus-tabs`/`--no-focus-tabs`, `--verbose`. The CLI commands other than `serve` are HTTP clients of a running server.
- **Participant registry** (`runner/src/participants.ts`): id, display name, preferred URL for each of the 9 participants.
- **Driver registry** (`runner/src/drivers/index.ts`): one driver per provider implementing the contract in `drivers/base.ts`; startup asserts all 9 are ask-capable.
- Response objects carry `participant, question, answer, citations, timing, rawText, cleanedText, rawHtml?`. `[LIMITATION]` `citations` is always `[]` — no extraction implemented for any provider.

## Browser Execution Modes `[IMPLEMENTED]`

Two modes, selected at launch (`server.ts` `browserMode: 'persistent-profile' | 'cdp'`):

1. **Persistent-profile (default):** `chromium.launchPersistentContext` with Playwright's bundled Chromium and profile at `runner/.user-data`. Requires `npx playwright install chromium` once.
2. **CDP-attach:** `--connect-cdp http://127.0.0.1:9222` attaches to an externally started Chrome. `runner/restart-runner.ps1` automates this: stops Maestriss node processes, closes Chrome, launches Chrome with `--remote-debugging-port=9222` and profile `%LOCALAPPDATA%\MaestrissChromeProfile`, suppresses first-run/crash-restore friction (flags plus rewriting the profile's `Preferences` `exit_type`/`exited_cleanly`), then starts `serve --connect-cdp`. In CDP mode the runner never closes the user's browser on shutdown.

`[LIMITATION]` The two modes use **different profiles**, so provider logins do not transfer between them. `[LIMITATION]` The restart script force-kills **all** `chrome.exe` processes on the machine, including personal windows (documented in the runbook as of `30cc6bc`).

## Tabs: Reuse, Focus, Cleanup `[IMPLEMENTED]`

- Discovery is URL-based (`runner/src/runner.ts`): hostname matching, with provider-specific rules — Google requires the AI Mode surface (`/ai` path or `udm=50`) and a reused Google tab is navigated back to AI Mode if it drifted; Copilot matches both `m365.cloud.microsoft/chat` (preferred) and `copilot.microsoft.com`.
- Reuse-before-open: an existing matching tab is always preferred; otherwise a new tab opens at the participant's preferred URL. Startup opens/reuses all 9 participants.
- Active-participant focusing (`page.bringToFront()`) is on by default (`--no-focus-tabs` disables); focus failures warn and never fail an ask; focus is re-applied before submit.
- Blank-tab cleanup after startup closes `about:blank`, `chrome://newtab`, `chrome://new-tab-page`, `edge://newtab*`, `edge://new-tab-page`, and tabs titled exactly "New Tab" on `chrome://` URLs — never participant or content tabs.
- Restore-page friction is handled by the restart script's flags and Preferences rewrite (see above).
- `[LIMITATION]` No crash detection or tab replacement: a tab hijacked on the same hostname is reused as-is; a tab navigated off-host is abandoned (not closed) and a duplicate opened. `[LIMITATION]` The `/ask` path performs no login-screen check; a logged-out provider surfaces only as a driver readiness/timeout failure (framework login detection exists but only feeds `/providers/status` and run-random exclusion).

## Request Lifecycle `[IMPLEMENTED]`

`resolve tab → focus → manual security-verification gate → driver.waitForReady → driver.pastePrompt (verified by reading the composer back) → focus → driver.submitPrompt → driver.waitForCompletion (stability window + stop-control observation) → driver.extractResponse (candidate-based, logged rejection reasons)`. Failures save HTML + screenshot artifacts to `runner/debug/`.

**Queue and concurrency:** all endpoints except `/health` and `/cancel-all` run through a single serialized queue — one ask at a time; a concurrent ask for a busy participant returns a normalized `participant-busy` failure.

**Cancellation:** `/ask` requests register an AbortController and are cancellable via `/cancel-all`. `[LIMITATION]` `/chain` and `/run-random` internal asks are not registered and cannot be cancelled.

**Timeouts:** server-side per-participant ask timeouts — Claude 255 s, ChatGPT 135 s, Gemini/DeepSeek 225 s, default 195 s; driver-level completion timeouts — ChatGPT 120 s, Claude 240 s, others 180 s; stability windows 4–5 s.

**Security verification:** when a challenge page is detected (Cloudflare "Just a moment", "Verify you are human", etc.), the server pauses and waits for **Enter on the runner's terminal stdin** after the human resolves it; Claude is capped at 2 attempts, then the ask returns blocked. `[LIMITATION]` An operator driving purely over HTTP sees a hang with no UI signal during this gate.

**Workflows:** `/chain` is a proof-of-concept restricted to google→chatgpt. `/run-random` is implemented but with fixed topology: Google first, a shuffled ready-subset of {gemini, perplexity, grok, deepseek, copilot, reka} in the middle (readiness-gated via provider status), ChatGPT as final synthesizer, with a handoff prompt template and 4,000-char per-contribution cap. `[DEFERRED]` A general workflow engine — `WorkflowDefinition` types and `runner/workflows/google-chatgpt.workflow.json` exist but nothing reads them yet.

## The Nine Participant Drivers

Maturity is **not** uniform. Seven providers have dedicated filtering modules (`runner/src/drivers/<provider>Filtering.ts`) with regression suites; ChatGPT and Perplexity do not.

| Driver | Notable mechanics | Filtering / regressions |
| --- | --- | --- |
| **Claude** `[IMPLEMENTED]` | The exemplar. Coordinate-aware submission with full candidate scoring and verification (composer cleared / generation started / response changed); active-stop-only detection; "Thought for Ns"/"Claude responded:" prefix stripping; smallest-valid-child parent rejection; no absolute-left geometry rule. | Full module + suite incl. geometry regressions. |
| **Google AI Mode** `[IMPLEMENTED]` | AI-Mode detection (`/ai`, `udm=50`) verified at every lifecycle stage; tolerates mid-ask URL transitions; refuses non-Google pages; verified submit; 12,000-char answer cap with truncation notice. | Full module + suite. |
| **Gemini** `[IMPLEMENTED]` | Central-column candidate model; browser-eval `__name` guard. `[LIMITATION]` `submitPrompt` performs no verification (click-and-hope; keyboard path waits 500 ms and logs success). `[LIMITATION]` Hard geometry cutoffs (`left < 150` rejected). | Full module + suite. |
| **Grok** `[IMPLEMENTED]` | Overlay detection distinguishing search modals from cookie widgets; capacity/rate-limit/runtime errors classified as provider state (thrown as failures, never returned as answers) with prompt-echo guards. Debug trap removed in `30cc6bc`. `[LIMITATION]` Hard geometry cutoffs (`x < 120`); unthrottled 500 ms poll logging. | Full module + suite (terminal-error cases). |
| **Copilot** `[IMPLEMENTED]` | Dual-domain (m365 preferred); strict active-stop detection — static "Stopped generating" text correctly ignored. `[LIMITATION]` No splash/entry-screen handling despite doc claim; no failure artifacts; unthrottled poll logging; hard `left >= 120` rule. | Full module + suite (no geometry cases). |
| **DeepSeek** `[IMPLEMENTED]` | Overlay handling; coordinate-aware verified submit. `[LIMITATION]` `deepSeekHistoryMarkers` rejects any answer containing `today`, `7 days`, `30 days`, `2025-`, `2026-`, or personal chat-history titles (`linear algebra`, `roundtable`, `xcitium`, `datto`) — valid answers containing those strings are rejected; needs sidebar-scoped rejection instead. | Full module + minimal suite (3 cases, no reason assertions). |
| **Reka** `[IMPLEMENTED]` | ProseMirror composer; DOM event-dispatch prompt entry; coordinate submit-target discovery mandatory, but the coordinate mouse click is the *last* fallback (keyboard first); rich candidate-button diagnostics. `[LIMITATION]` `'evan fabri'` (personal account name) hardcoded in the filter; minimal suite. | Full module + minimal suite. |
| **ChatGPT** `[LIMITATION]` | Selector-based extraction only (`[data-message-author-role="assistant"]`, bottom-most, `.trim()`): no filtering module, no prompt-echo rejection, no cleaning, no regression suite, no failure artifacts; primary submit path unverified; loose stop matching (`includes('stop')`). | **None.** |
| **Perplexity** `[LIMITATION]` | Good inline detection (source/related/upgrade chrome rejection, URL stripping, candidate scoring, overlay dismissal, verified submit) — but inline in the driver, not extracted to a module, and untested. | **None** (inline only). |

Shared infrastructure: `createGenericAiDriver` (`genericAiDriver.ts`) supplies the lifecycle scaffold for Grok, DeepSeek, and Copilot; `pasteVerification.ts` gives every driver verified paste with failure artifacts.

## Testing Status

- `[IMPLEMENTED]` **Filter regression suites (deterministic):** 7 scripts, `npm run test:<provider>-filter` (reka, deepseek, grok, copilot, claude, gemini, google). **All 7 pass at this milestone** (verified 2026-07-10 at `d6eb1a8`). No aggregate script exists yet.
- `[IMPLEMENTED]` **Build verification:** root `npm run build` (tsc + vite) and `runner npm run build` (tsc) both pass at this milestone.
- **Smoke tests (manual, live):** per-provider exact-answer prompts (`ask <participant> "Say exactly: <Provider> OK"`) documented in `runner/README.md`. Recorded as passing for all nine providers during driver hardening (2026-07-09/10 journal entries); **not re-verified live at handoff time**. Claude is frequently blocked by security verification (2-attempt cap) — expect intermittent blocked results.
- `[DEFERRED]` No automated smoke/e2e harness, no CI, no reliability metrics, no debug verbosity tiers.

## Lessons Learned (the ones that changed the architecture)

1. **Geometry is evidence, not dogma.** A valid Claude answer was rejected purely for being left-aligned in a narrow viewport. Fix: rejection requires stronger evidence (giant containers, sidebar/composer overlap, smaller valid child). Now a constitutional rule — though four drivers still carry absolute-x cutoffs that predate it (see limitations).
2. **Static status text is not an active control.** Copilot's persistent "Stopped generating" label was mistaken for an active stop control, stalling completion detection. Fix: only visible, *enabled* buttons labeled exactly stop/stop-generating count. Regression-protected.
3. **Parent containers lose to smallest valid child.** Transcript-level parents duplicate child text plus chrome; candidate scoring prefers the smallest valid child (0.75 area ratio rule).
4. **Provider errors are provider state, not answers.** Grok capacity/rate-limit banners were being extracted as "responses." Fix: terminal-error classification with prompt-echo and position guards, thrown as failures.
5. **Paste and submit must be observed, not assumed.** Composer readback after paste (universal) and post-submit state observation (most drivers) catch silent failures that otherwise surface as timeouts.
6. **Google AI Mode changes URL mid-ask.** Every lifecycle stage re-verifies the surface instead of assuming the initial URL persists.
7. **Filters must never encode operator-specific data.** The DeepSeek history markers and Reka's hardcoded account name are the counterexample that proved the rule — they work on the author's machine and corrupt everyone else's. Flagged for replacement with structural (sidebar-scoped) rejection.

## Diagnostics `[IMPLEMENTED]`

Uniform vocabulary across drivers: `candidateCount`, `selectedPreview`, `selectedGeometry` (`x= y= width= height=`), `rejectedCandidates` with reasons, `stopVisible`, `generatingVisible`, `stableMs`, submit strategy logs, paste-verified logs. Failure artifacts (`<participant>-ask-failure`, `-submit-failed`, `-response-not-found`, `-paste-failure` HTML+PNG) land in `runner/debug/`. `POST /inspect` / `npm run dev -- inspect <participant>` saves a screenshot + HTML and reports composer/send/response candidates with red outlines.

## Studio, Runner, and Automa Exporter

- `[IMPLEMENTED]` Studio: 9 pages (dashboard, workflow, participants, profiles, prompt designer, drivers, sessions, export, settings), project state in `ProjectContext`, 4 export formats (project JSON, prompt-pack markdown, session-transcript markdown, Automa workflow JSON).
- `[IMPLEMENTED]` Automa exporter generates workflow JSON as a sibling execution path to the runner (see `docs/automa-export-strategy.md`).
- `[LIMITATION]` **Studio↔runner integration is zero.** Nothing in `src/` calls the runner; the sessions page renders mock data (`src/data/mockSessions.ts`).
- `[LIMITATION]` **Duplicated vocabularies:** the participant roster (Copilot URL and Reka id differ between `runner/src/participants.ts` and `src/data/defaultParticipants.ts`) and the prompt-template variable sets (runner: `{{question}}`, `{{previousAnswer}}`...; Studio: `{{originalPrompt}}`, `{{roundtableTranscript}}`...) exist in two incompatible copies. Acknowledged in doc 02 as a transitional state.

## Documentation Work in This Phase

- `[IMPLEMENTED]` 16-document reference library in `Documentation/Reference/` (philosophy, architecture, lifecycle, browser, detection, testing, drivers, automation, diagnostics, roadmap, journal, workflow standards, AI collaboration, runbook, commentary, AI bootstrap).
- `[IMPLEMENTED]` Docs-vs-code reconciliation audit (`Documentation/Reviews/Reconciliation Report - Docs vs Code (2026-07-10).md`): five parallel verification passes over all docs. Findings partially resolved the same day (`30cc6bc`: dual browser modes documented, Studio/exporter section added, kill-all-Chrome warning, security gate documented, real `/health` connectivity, Grok debug trap removed). **The report is a snapshot — treat unresolved findings as open only after checking git log.**
- `[IMPLEMENTED]` Onboarding: root `README.txt`, `bootstrap.txt`, doc 16, and this handoff.

## Important Decisions Made

- Browser automation over provider APIs (user-owned sessions, real product surfaces).
- One driver per provider + shared orchestration; provider quirks stay in the driver; the Claude driver is the pattern exemplar.
- Playwright with two browser modes rather than committing to CDP-only or launch-only.
- Candidate-based extraction with logged rejection reasons rather than single-selector extraction.
- Every bug becomes a regression assertion or diagnostic ("permanent knowledge" rule).
- Documentation split: Reference (authoritative) / Reviews (dated findings) / Handoffs (milestone snapshots); code is truth for current behavior.

## Deferred Work `[DEFERRED]`

- Studio↔runner live integration (health, asks, run history in the UI).
- General workflow engine (replace google→chatgpt PoC chain; consume `WorkflowDefinition`).
- ChatGPT and Perplexity filtering modules + regression suites.
- Submission verification for Gemini and ChatGPT's primary path.
- DeepSeek marker replacement and Reka personal-literal removal.
- Roster and prompt-template unification between Studio and runner.
- Citation extraction (field exists, always empty).
- Login-state detection in the `/ask` path; crash/tab-replacement recovery.
- Aggregate `test:filters` script; automated smoke harness; CI; lint; reliability metrics; debug verbosity tiers.
- `runner/README.md` documents a `--skip-blocked` flag that is **not implemented** (would be pasted into the prompt) — fix the README or implement the flag.

## Known Limitations Summary `[LIMITATION]`

Uneven driver maturity (see table); one-ask-at-a-time serialization; chain/run-random not cancellable; security gate requires terminal access; two disconnected browser profiles; restart script kills all Chrome; no automated live testing; provider UI changes remain the standing external risk.

## Recommended Next Phase `[FUTURE]`

1. **Close the driver-quality gaps** (highest value/effort ratio): ChatGPT + Perplexity filtering modules and suites; Gemini/ChatGPT submit verification; DeepSeek/Reka personal-data filter fixes. This makes the "every provider is first-class" doctrine true.
2. **Studio↔runner integration slice:** Studio calls `/health` and `/providers/status`, then `/ask`, replacing mock sessions — unifying the roster as a prerequisite.
3. **Workflow generalization:** consume `WorkflowDefinition` JSON to replace the hardcoded chain/run-random topologies.

## Exact Commands

```
# Install (once)
npm install                      # root (Studio)
cd runner && npm install && npx playwright install chromium

# Studio UI
npm run dev                      # from root

# Runner — default persistent-profile mode
cd runner
npm run dev -- serve             # server on http://127.0.0.1:4137

# Runner — CDP mode with real Chrome (WARNING: kills ALL Chrome processes)
powershell -ExecutionPolicy Bypass -File runner\restart-runner.ps1

# Health / provider readiness (server must be running)
npm run dev -- health
npm run dev -- check-providers

# Asks and workflows
npm run dev -- ask claude "Say exactly: Claude OK"
npm run dev -- chain google chatgpt "your question"
npm run dev -- run-random "your question"
npm run dev -- inspect gemini
npm run dev -- cancel-all

# Builds
npm run build                    # root: tsc -b && vite build
cd runner && npm run build       # tsc -p tsconfig.json

# Filter regression suites (all pass at this milestone)
npm run test:reka-filter && npm run test:deepseek-filter && npm run test:grok-filter && npm run test:copilot-filter && npm run test:claude-filter && npm run test:gemini-filter && npm run test:google-filter
```
