# Reconciliation Report — Planning_and_Reference Docs vs Code

**Date:** 2026-07-10
**Scope:** All 14 documents in `Planning_and_Reference/` reconciled against the full codebase (`runner/` native runner, `src/` Maestriss Studio, `docs/`, scripts, package manifests, and git history).
**Method:** Five parallel audit passes, each reading its assigned documents in full and verifying every concrete, checkable claim against the code, with cross-corroboration between passes. File and line references below point at the code as of commit `ef75869`.

---

## Executive Summary

The documentation is unusually good. The lifecycle vocabulary (`waitForReady` → `pastePrompt` → `submitPrompt` → `waitForCompletion` → `extractResponse`), the HTTP endpoint list, the driver roster, the diagnostics vocabulary (`candidateCount`, `stableMs`, `stopVisible`, `selectedPreview`, rejected-candidate reasons), the participant URLs, the filter/assertion structure, and the restart script description all match the code — often verbatim. Doc 10's "Current State" section is accurate in every specific it asserts.

The problems cluster into eight themes rather than scattered errors:

1. **ChatGPT and Perplexity are documented above their actual maturity.** Three docs describe filtering/regression coverage for them that does not exist.
2. **"Submission must be verified" is a stated constitutional rule that Gemini and ChatGPT do not follow.**
3. **"Geometry is evidence, not dogma" is contradicted by hard absolute-coordinate cutoffs in four drivers.**
4. **The docs describe CDP-attach as the browser model; the code's default is a Playwright-launched persistent Chromium profile.** Two different modes, two different profiles, and the runbook's install steps only work for one of them.
5. **The `/health` endpoint hardcodes `connected: true`** — the "health reports browser connection state" claim in two docs cannot be true.
6. **The entire Maestriss Studio half of the repository (and the Automa exporter) is invisible in the architecture docs**, and Studio↔runner integration is zero, not "not yet fully integrated."
7. **The Project Journal (doc 11) contains dating and self-description errors**, including describing the doc series as "01 through 11" in the same commit that created docs 12–14, and dating Gemini filter work a day before any committed evidence.
8. **The Operational Runbook omits operationally critical facts**, including that `restart-runner.ps1` force-kills *all* Chrome processes on the machine, and that a fresh install following only the runbook fails (missing `npx playwright install chromium`).

Below: detailed inconsistencies per document, then consolidated questions, suggestions, and a summary of what checked out.

---

## Part 1 — Inconsistencies by Theme

### Theme 1: ChatGPT and Perplexity documented above actual maturity — MAJOR

Found independently by three audit passes.

| Doc claim | Reality |
|---|---|
| Doc 07 Maturity table: ChatGPT "Filtering: Active"; doc 11 Participant Status repeats it | There is no `chatgptFiltering.ts`, no `chatgptFilterAssertions.ts`, and no `test:chatgpt-filter` script. Extraction is `latestAssistantText` (`runner/src/drivers/chatgptDriver.ts:141-160`) — bottom-most visible element matching assistant selectors, `.trim()` only. No prompt-echo rejection, no chrome filtering, no cleaning. |
| Doc 05 "Provider Specialization": ChatGPT's detector "must distinguish generated responses from prompt text, controls, and conversation chrome" (present tense, same register as providers that really have filters) | None of that distinguishing exists; the only mitigation is the `[data-message-author-role="assistant"]` selector. A prompt echo rendered as the bottom-most markdown block would be returned as the answer — doc 05 calls prompt-echo rejection "mandatory." |
| Doc 06 "Provider Regression Tests": "Every provider maintains its own regression suite" | Only 7 of 9 do (`runner/package.json:10-16`): reka, deepseek, grok, copilot, claude, gemini, google. ChatGPT and Perplexity have none. |
| Doc 09: "Every provider should have its own filter assertions when it has nontrivial response detection" | Perplexity *has* nontrivial detection — inline `cleanPerplexityText` and candidate scoring (`perplexityDriver.ts:88-111, 340-428`) — but it is not extracted into a testable module and has no assertions. It is the only provider meeting the stated condition without meeting the stated consequence. |

### Theme 2: Submission verification rule violated by two drivers — MAJOR

Doc 07's Driver Constitution ("Drivers must verify submission") and doc 03's `submitPrompt` spec are contradicted by:

- **Gemini** — `submitPrompt` (`runner/src/drivers/geminiDriver.ts:547-558`) performs no verification at all: the button-click path returns immediately on click; the keyboard path waits 500 ms and unconditionally logs success. Doc 07's Gemini section explicitly says "Submission is verified through prompt acceptance, generation state, and response changes where available" — it is not. The maturity table rates Gemini Submission "Established."
- **ChatGPT** — the primary strategy `clickEnabledSendButton` returns with no verification (`chatgptDriver.ts:295-299`); only the keyboard fallback checks `hasStopControl`, and the final event-dispatch fallback succeeds if the events merely dispatched (`chatgptDriver.ts:306-315`).

By contrast, Claude, Google, Copilot, DeepSeek, and Perplexity all genuinely verify (composer cleared / generation started / user message appeared), exactly as documented.

### Theme 3: "Geometry is evidence, not dogma" vs hard coordinate cutoffs — MAJOR (as a doc/code tension)

Doc 01 (Guiding Principles), doc 03 (contract), doc 05 ("A candidate should not be rejected merely because it is left-aligned, narrow... rules must be grounded in stronger evidence"), and doc 07 all state coordinate-flexibility as a system-wide rule. Four drivers enforce exactly the forbidden pattern — rejection on absolute position alone, with no corroborating evidence:

- Gemini: rejects `left < 150` as `outside-central-response-column`, plus `width < 100 || width > 900` (`geminiFiltering.ts:104-116`, `geminiDriver.ts:198-211`)
- Grok: rejects `x < 120` and `width < 100 || width > 900` (`grokFiltering.ts:147-159`)
- DeepSeek: rejects `left < 250` as `left-sidebar-region` (`deepseekDriver.ts:329`)
- Copilot: requires `left >= 120` (`copilotDriver.ts:404`)

Only Claude follows the documented philosophy (no absolute left cutoff — `claudeFiltering.ts:125-158`), which is telling since the doc's "lessons learned" narrative about narrow-viewport rejection was a Claude incident. Either the constitution needs an "except where the provider layout makes an absolute band safe" carve-out or these four drivers need corroborating conditions.

### Theme 4: Browser mode — docs describe CDP-only; the code default is persistent-profile — MAJOR

- The runner's default (no flags) is `chromium.launchPersistentContext(runner/.user-data)` — Playwright's bundled Chromium, no debugging port, mode `persistent-profile` (`runner/src/server.ts:438-452`, `runner/src/index.ts:19,31`). CDP attach happens only with `--connect-cdp` (`server.ts:454-468`), which is what `restart-runner.ps1` uses (port 9222, profile `%LOCALAPPDATA%\MaestrissChromeProfile`).
- Doc 08 ("Chrome is started with a remote debugging port and a dedicated persistent profile"; "CDP-connected persistent browsers are the normal operating model") never mentions the default launch mode at all. Doc 14's installation section says Chrome is required "for normal operation" — it is only required for the CDP path or `--channel chrome`.
- The two modes use **different persistent profiles** (`runner/.user-data` vs `%LOCALAPPDATA%\MaestrissChromeProfile`), meaning logins do not carry between them; the docs treat "the dedicated profile" as one thing.
- Doc 14's install steps omit `npx playwright install chromium` (which `runner/README.md:12` requires) — a fresh install following only the runbook fails in the default mode.
- Doc 02 line 156 gets this right ("whether it launches a persistent browser profile or connects... over CDP"), so this is doc 08/14 drift, not a universal error.
- Minor related: doc 08 says "Chrome" throughout, but the channel is `chromium | chrome | msedge` with `chromium` default (`index.ts:31,42-43`); msedge support is documented nowhere. Doc 04's "Future Browser Support" lists Edge and remote CDP endpoints as future — both are already implemented.

### Theme 5: Health endpoint cannot report disconnection — MINOR but contradicts two docs

Doc 08 ("Health checks expose... connection state") and doc 14 ("health output reports a connected browser") describe a live signal. Both `/health` handlers hardcode `connected: true` (`runner/src/server.ts:1046, 1087-1088`). A dead browser surfaces only as a 500 when `listParticipantPages` throws. Also ambiguous: `participantCount` in health is the count of currently *matched tabs*, not configured participants.

### Theme 6: The Studio half of the repo is invisible in the docs — MAJOR (completeness)

- Doc 02 ("System Architecture") and doc 08 describe only the native runner. The Vite React studio (`src/` — 9 implemented pages, ProjectContext, profile/prompt/participant editors), the Automa exporter (`src/exporters/automa/`), the four export formats (`src/config/exportFormats.ts`), and the strategy docs (`docs/automa-export-strategy.md`, `docs/native-runner-strategy.md` — which describe a deliberate pluggable Automa-exporter/native-runner dual architecture) appear in none of the 14 reference docs' architecture sections. Doc 11's milestone table likewise has no Studio row despite Studio being roughly half the codebase.
- Doc 11's technical-debt line "Studio and runner are not yet fully integrated" overstates the current state: integration is zero. Nothing in `src/` references the runner (no fetch/localhost/4137 anywhere); `runner/README.md:5` says "It is not wired into the React app yet"; SessionsPage renders hardcoded `src/data/mockSessions.ts`. Doc 14's system diagram showing `Studio UI → Runner CLI/Server` is aspirational.
- **Roster divergence between the two halves:** runner Copilot targets `https://m365.cloud.microsoft/chat/` (`runner/src/participants.ts:36`) while Studio defaults use `copilot.microsoft.com` (`src/data/defaultParticipants.ts:59-65`); runner's Reka id is `reka` vs Studio's `reka-chat`. The docs document only the runner values and never mention that two rosters exist.
- **Two incompatible prompt-template systems:** runner (`runner/src/promptTemplates.ts`, variables `{{question}}`, `{{previousParticipant}}`, `{{previousAnswer}}`, `{{citationsSection}}`) vs Studio (`src/utils/prompts.ts` + `src/config/promptVariables.ts`, variables `{{originalPrompt}}`, `{{roundtableTranscript}}`, `{{participantName}}`, ...). No doc mentions that these vocabularies differ or will need unification.

### Theme 7: Project Journal (doc 11) dating and self-description errors — MAJOR

Git baseline: exactly 4 commits — `a27c4b2` (07-07, Vite skeleton), `5f2be43` (07-07, Studio workflows), `ac0b441` (07-09, native runner), `ef75869` (07-10, all 14 docs + driver hardening).

- Doc 11 line 57 says "Documents 01 through 11 now define..." and the Documentation Progress table has rows only for 01–11 — yet docs 12, 13, and 14 were created in the *same commit* as doc 11. The journal is wrong about its own series at the moment of creation.
- Multiple journal rows date **Gemini filter assertions and detector hardening to 2026-07-09** (Testing History line 332, Regression History line 213, Recent Development Summary lines 127–135), but `geminiFiltering.ts`, `geminiFilterAssertions.ts`, and `test:gemini-filter` all first appear in `ef75869` (07-10). `git show ac0b441:runner/package.json` confirms only reka/deepseek/grok/copilot filter scripts existed on 07-09.
- "Focus active participant tabs by default" is dated 07-09, but `page.bringToFront()` first appears in `ef75869` (07-10).
- Testing History says Claude assertions were "Expanded" on 07-10; `claudeFilterAssertions.ts` is a brand-new file in that commit (added, not expanded).
- Major Engineering Decisions dates foundational choices (browser automation, per-provider drivers) to 07-10, but the architecture embodying them landed 07-09 (`ac0b441`) and the direction dates to 07-07 (`5f2be43`). The dates read as "date written down," not "date decided."
- (Correctly dated, for contrast: the Copilot "Stopped generating" regression really is in `ac0b441`/07-09, and the Claude/Google 07-10 entries match.)

### Theme 8: Operational Runbook (doc 14) omits critical operational facts — MAJOR

- **`restart-runner.ps1` force-kills ALL `chrome.exe` processes on the machine** (`Get-Process chrome` + `taskkill /F /IM chrome.exe`, `restart-runner.ps1:18-23`), destroying any personal Chrome windows — the runbook describes it as only stopping stale runner processes and starting Chrome. It also silently rewrites the profile's `Default\Preferences` (`exit_type` → `Normal`, lines 34-44); neither side effect is documented.
- The runbook contains **zero concrete operational values**: no server address (`127.0.0.1:4137`), no CDP port (9222), no flag names (`--connect-cdp`), no profile paths, no script filename, no debug-artifact directory (`runner/debug/`), no CLI command names (`cancel-all`, `check-providers`). An operator cannot execute the runbook without also reading the README and source.
- The **manual security-verification gate** is absent from the runbook and from both lifecycle diagrams (docs 02, 08): between focus and `waitForReady`, the server blocks on *Enter pressed in the runner's terminal stdin* (`runner/src/security.ts:22-60`, `server.ts:594-606`), with a Claude-specific limit of 2 attempts (`server.ts:101-103`). An operator driving via HTTP would see a silent hang.
- Per-participant HTTP timeouts (Claude 255 s, ChatGPT 135 s, Gemini/DeepSeek 225 s, default 195 s — `server.ts:196-208`) and the single-queue serialization of all endpoints except `/health` and `/cancel-all` (`server.ts:1036-1076`), including the `participant-busy` rejection, are undocumented.

---

## Part 2 — Additional Per-Document Findings

### Doc 02 — System Architecture

- "Running development smoke tests through npm scripts": no smoke npm scripts exist (grep "smoke" in code: zero hits); smoke testing is manual `npm run dev -- ask ...` per the README. — minor
- "Chained workflows" (plural, general): `/chain` hard-throws unless `from === 'google' && to === 'chatgpt'` — "Proof-of-concept chain only supports google -> chatgpt" (`server.ts:952-978`). Neither doc 02 nor 08 mentions the PoC restriction. — minor/major depending on reader expectations
- Cancellation is described generally, but only `/ask` requests are registered with AbortControllers; `/chain` and `/run-random` work cannot be cancelled by `/cancel-all` and doesn't appear in health's `activeRequestIds` (`server.ts:849, 905, 926, 964-967, 1153-1160`). — minor
- "Server owns orchestration; drivers own provider behavior... adding a provider should not require altering the request lifecycle": the shared server hardcodes provider-specific logic — Claude security attempt limit (`server.ts:101-103`), per-provider timeouts (`:196-208`), a Reka-specific error branch (`:631-644`), google-first/chatgpt-final random-workflow topology with a fixed 6-name middle list (`:810-834`), and a hardcoded 9-name required-driver list (`drivers/index.ts:39-49`). Adding a provider requires editing server.ts and drivers/index.ts. — minor (principle vs practice)
- "Citations where applicable": the field exists (`types.ts:11`) but every driver returns `citations: []` unconditionally; no extraction is implemented anywhere, including Perplexity/Google. — minor
- Diagram shows a "Participant Manager" component; no module by that name exists (it is `participants.ts` + free functions in `runner.ts:92-169`). — minor
- CLI list omits `check-providers`. — minor
- "Geometry tests" as a named test category: geometry cases live inside filter-assertion files; no standalone geometry tests. — minor

### Doc 03 — Driver Lifecycle Specification

- The `ParticipantDriver` interface makes `pastePrompt`/`submitPrompt`/`waitForCompletion` **optional** (`base.ts:9-32`); ask-capability is enforced separately at startup (`drivers/index.ts:38-63`). The docs never mention `matchParticipant`, `extractParticipantResponse`, `extractNormalizedResponse`, or `DriverAskOptions.debugClick`. — minor
- `base.ts:11` declares `status?: 'ready' | 'blocked-by-security-verification'` — set and read nowhere in the codebase. Dead field or planned surface? — minor
- "A generic driver cannot reliably encode these differences": `createGenericAiDriver` (`genericAiDriver.ts:264-401`) in fact supplies the full lifecycle scaffold for Grok, DeepSeek, and Copilot, with driver-specific overrides layered on. This shared layer — arguably the docs' own "deliberately introduced shared abstraction" — is invisible in docs 03 and 07. (One audit pass initially flagged it as dead code; it is not — it is a consumed factory.) — minor
- `waitForReady` spec says drivers "must not assume the account is authenticated," but no driver detects login state; composer visibility is the only proxy, and most drivers' `waitForReady` is just `domcontentloaded` + composer-visible. Framework-level login detection (`hasVisibleLoginForm`, `isLoginUrl`, `server.ts:272-302`) is consulted only by `/providers/status` and run-random exclusion — the `/ask` path performs no logged-out check (relevant also to doc 04's "should not proceed with prompt submission on login screens"). — minor
- Hard timeout and stability constants are nowhere documented (ChatGPT 120 s / Claude 240 s / others 180 s; stability 4–5 s), despite doc 03 requiring explicit timeout behavior. — minor

### Doc 04 — Browser and Tab Management

- Blank-tab cleanup list omits `edge://new-tab-page` and the second rule (title exactly "New Tab" + `chrome://` URL) (`server.ts:478-506`). — minor
- "Titles... should not be the only discovery signal" implies titles participate in discovery; discovery is URL-only (`runner.ts:40-64`). — minor
- Crash detection / tab replacement described ("may recreate") does not exist; the only recovery is open-if-missing plus Google navigate-back-to-AI-mode. A tab navigated off-host is silently abandoned and a duplicate opened. — minor
- "Missing participants may be opened at startup": startup unconditionally opens/reuses all 9 (`server.ts:1022`). — minor
- "Future Browser Support" understates the present: `--channel msedge` and `--connect-cdp <url>` are implemented today. — minor

### Doc 07 — Participant Driver Reference

- **Internal contradiction:** line 339 says fallbacks are ordered "most precise to least invasive"; line 433 says "least invasive to most invasive." — needs one rule
- DeepSeek: `deepSeekHistoryMarkers` (`deepseekFiltering.ts:6-16`) rejects the *entire selected answer* if it contains `today`, `7 days`, `30 days`, `2026-`, `2025-`, or personal chat-history titles (`linear algebra`, `roundtable`, `xcitium`, `datto`). Any valid answer containing the word "today" or a date is rejected (`deepseekDriver.ts:692, 740, 747`) — contradicting both the doc's DeepSeek description and the "short valid answers must remain valid" rule. Similar personal literal: `'evan fabri'` in `rekaFiltering.ts:38,48`. — major
- Reka: doc frames coordinate clicking as the central submission mechanism; in code it is the *last* fallback (keyboard Enter first, coordinate `mouse.click` last — `rekaDriver.ts:1082-1149`), though coordinate-target discovery is mandatory (throws if not found). — minor
- Copilot: doc says the driver handles splash/entry screens; Copilot has no custom `waitForReady` (inherits generic `domcontentloaded` + composer). — minor
- Stop-control strictness is claimed generally, but only Claude/Gemini/Copilot/Google restrict to enabled controls with exact labels; the generic helper, ChatGPT, and Perplexity substring-match any visible element containing "stop" — which *would* match static "Stopped generating" text, the exact failure doc 03 warns about (`genericAiDriver.ts:120-138`, `chatgptDriver.ts:85-103`, `perplexityDriver.ts:281-299`). — minor
- Diagnostics constitution says drivers must save artifacts on failure; ChatGPT and Copilot throw bare errors with no HTML/screenshot on submit failure or completion timeout (`chatgptDriver.ts:317,347`; `copilotDriver.ts:476,519`), despite Copilot's Diagnostics being rated "Established." — minor
- Polling-log throttling ("log concise progress periodically rather than flooding every polling iteration"): Grok and Copilot log full diagnostics every 500 ms poll (`grokDriver.ts:1001-1015`, `copilotDriver.ts:500-506`); others correctly throttle at 5 s. — minor
- Leftover debug trap: Grok hard-codes the smoke needle `'grok ok'` and throws `grok-extraction-debug-stop` mid-wait (`grokDriver.ts:659-662, 1017-1020`). Related fixture drift: doc 06 lists the smoke phrase `Say exactly: Grok OK`, while `grokFiltering.ts:167` hard-rejects the *different* phrase `'say exactly: grok is ok'`. — minor but ship-blocking-ish for Grok smoke runs
- Google's 12,000-char answer cap + truncation notice (`googleDriver.ts:16-17, 48-55`) is user-visible behavior documented nowhere. — minor

### Doc 05 — Response Detection and Filtering Philosophy

- Two of the seven quoted rejection-reason strings don't exist verbatim: `known-provider-chrome` is actually per-provider (`known-claude-chrome`, `known-gemini-chrome`, ...), and `smaller-valid-child-exists` is actually `page-or-transcript-parent-container` / `duplicated-parent-container`. The other five are real. — minor

### Docs 06 & 09 — Testing / Diagnostics

- Doc 09's four-tier debug system (normal/verbose/developer/trace) doesn't exist; the only switch is a client-side `--verbose` affecting output printing of two CLI commands (`index.ts:63-64, 327, 358`). Driver diagnostics are unconditional. — minor (framed "as the project matures," but reads as spec)
- Doc 09's Reliability Metrics (success rates, retry counts, failure frequency) — nothing is counted or persisted anywhere. — minor
- The testing pyramid's smoke and end-to-end layers have no automated harness — only the 7 filter scripts and `tsc` build are runnable checks. — minor
- Assertion-suite coverage is uneven vs the stated shape (acceptance/rejection/cleanup/geometry): claude/gemini/google have all four; copilot lacks geometry; grok lacks cleaning; deepseek and reka have only accept/reject cases with no reason assertions and no prompt needles. — minor

### Docs 10, 12, 13

- Doc 12's small-commit standard ("a driver extraction fix should not be mixed with unrelated UI refactoring") has never been practiced: all 4 commits are omnibus (`ef75869`: 35 files, +11,157; `ac0b441`: 44 files, +11,217). If the standard is prospective, it should say so. — minor
- Doc 10 lists "automatic provider health monitoring" as medium-term future, but `check-providers` → `/providers/status` already reports per-participant status today. Presumably the roadmap means *richer* checks (login state, composer availability) — worth clarifying. — minor
- Docs 10, 12, 13 otherwise contain almost no falsifiable done-claims and are correctly framed as vision/process; doc 10's Current State section is accurate in every specific.

### Code-adjacent (outside Planning_and_Reference, flagged in passing)

- `runner/README.md:238-244` documents a `--skip-blocked` flag that is not parsed anywhere (`index.ts:29-88, 157-159`); as written, `--skip-blocked` would be **joined into the prompt text** sent to the provider. — major for the README
- `runner/src/types.ts:33-51` defines `WorkflowNode`/`WorkflowEdge`/`WorkflowDefinition`, and `runner/workflows/google-chatgpt.workflow.json` exists — but nothing in `runner/src` reads either. Planned engine or dead scaffolding?

---

## Part 3 — Questions for the Author

**Architecture & scope**
1. Are docs 02/08 intentionally scoped to the native runner only? If so, neither says so, and no doc covers the Studio + Automa exporter architecture (the `docs/*-strategy.md` files describe a deliberate dual-adapter design that the reference series never mentions). If not, the Studio layer is missing from the System Architecture.
2. Which browser mode is the intended "normal operating model" — CDP-attach via `restart-runner.ps1` (real Chrome, profile `%LOCALAPPDATA%\MaestrissChromeProfile`) or the code-default persistent-profile launch (bundled Chromium, `runner/.user-data`)? They use different profiles, so logins don't transfer; docs 08 and 14 canonize one, the code defaults to the other.
3. Which participant roster is authoritative — `runner/src/participants.ts` (Copilot = m365.cloud.microsoft/chat, id `reka`) or `src/data/defaultParticipants.ts` (Copilot = copilot.microsoft.com, id `reka-chat`)?
4. Is the unused `WorkflowDefinition` type + `google-chatgpt.workflow.json` a planned JSON workflow engine (which would eventually generalize the PoC `/chain`), or scaffolding to remove?
5. Is Reka's preferred URL parameter `?utm_source=copilot.com` (`participants.ts:46`) intentional?

**Drivers & filtering**
6. Is ChatGPT "Filtering: Active" intentional on the theory that `[data-message-author-role="assistant"]` is trustworthy, or is the ChatGPT filter module simply backlog? Nothing marks ChatGPT as an exception.
7. Should Perplexity's inline filtering be extracted into `perplexityFiltering.ts` + assertions, per doc 09's own rule?
8. Are the hard coordinate cutoffs in Gemini/Grok/DeepSeek/Copilot accepted deliberate exceptions to "geometry is evidence, not dogma," or drift that should gain corroborating conditions?
9. Are `deepSeekHistoryMarkers`' personal chat titles and generic markers (`today`, `2025-`) a temporary hack pending sidebar-scoped rejection, or intended to stay? Same for `'evan fabri'` in `rekaFiltering.ts`.
10. Doc 07's two contradictory fallback-ordering rules (line 339 vs 433) — which is intended?
11. Does "Established" in the maturity table require *verified* submission? Gemini (no verification) and ChatGPT (primary path unverified) both carry that rating.
12. Is Grok's `grok-extraction-debug-stop` trap (`grokDriver.ts:659-662, 1017-1020`) leftover debug tooling? And which Grok smoke phrase is canonical — `Say exactly: Grok OK` (doc 06) or `say exactly: grok is ok` (`grokFiltering.ts:167`)?
13. Is `ParticipantDriver.status` (`base.ts:11`) dead, or the planned surface for reporting security-verification blocks?

**Operations**
14. Is killing all `chrome.exe` processes in `restart-runner.ps1` intentional (accepting collateral damage to personal Chrome), or should it be scoped to the Maestriss profile?
15. Should the runbook's smoke list carry a Claude caveat, given the 2-attempt security-verification cap and the README's description of Claude as frequently blocked?
16. Runbook hardcodes "Participant tab count: 9" — keep literal, or say "one per configured participant"?
17. Health `participantCount` — matched tabs or configured participants? Doc 08 just says "participant count."

**Journal & process**
18. Are Major Engineering Decisions / Regression History dates meant as decision dates or documentation dates? Several precede committed evidence (Gemini work dated 07-09, committed 07-10 — done in an uncommitted tree, or misdated?).
19. Is doc 12's small-commit standard prospective? If so, a one-line note ("history to date predates this standard") would resolve the contradiction with the four omnibus commits.
20. Are doc 09's four debug tiers and Reliability Metrics roadmap items that belong in doc 10, or specs that should have been implemented?

---

## Part 4 — Suggestions

### Documentation fixes (cheap, high value)
1. Add a "Scope" note to docs 02 and 08 (runner-only), or add the Studio/Automa-exporter layer to doc 02 as a sibling adapter path, cross-referencing `docs/automa-export-strategy.md`.
2. Update doc 11: "Documents 01 through 14," add Documentation Progress rows for 12–14, add a Maestriss Studio milestone row, correct the Gemini/tab-focus dates (or re-label the column "Recorded"), change "not yet fully integrated" to "not integrated (file export only)," and anchor journal rows to commit hashes to prevent future date drift.
3. Doc 08: document both browser modes, the two distinct profiles, and which is recommended; replace unconditional "Chrome" with the actual channel set.
4. Doc 14: add `npx playwright install chromium`; document the restart script's kill-all-Chrome and Preferences-rewrite side effects; add the concrete values (`127.0.0.1:4137`, port 9222, profile paths, `runner/debug/`, full CLI command list from `index.ts:404-414`, the HTTP endpoint list, per-participant timeouts, single-queue behavior, and the stdin security-verification pause).
5. Docs 02/08: document the security-verification gate in the lifecycle diagrams, the `/chain` PoC restriction, the fixed run-random topology, and that cancellation covers `/ask` only.
6. Doc 05: fix the two nonexistent rejection-reason strings (or mark the list illustrative).
7. Doc 07: resolve the fallback-ordering contradiction; document the `createGenericAiDriver` shared layer (used by Grok/DeepSeek/Copilot); reframe Reka coordinate clicking as final fallback; note the Google 12,000-char truncation; add explicit ChatGPT/Perplexity maturity caveats.
8. Docs 09/10: move debug tiers and reliability metrics into clearly-labeled future-work framing.
9. Doc 03: document the optional-method reality of the driver interface, `matchParticipant`/`extract*` methods, `debugClick`, and the timeout/stability constants.

### Code fixes (each converts a doc claim from false to true)
10. Add submit verification to Gemini (mirror Google's before/after pattern, `googleDriver.ts:819-848`) and to ChatGPT's primary path — or downgrade their maturity ratings.
11. Build `chatgptFiltering.ts` + assertions (ChatGPT currently has zero prompt-echo protection, which doc 05 calls mandatory); extract Perplexity's inline filtering into a testable module + assertions.
12. Replace `deepSeekHistoryMarkers` whole-answer substring rejection with sidebar-scoped rejection (the DOM/geometry helper `insideSidebarOrHistory` already exists, `deepseekDriver.ts:266-280`); remove personal chat titles and generic words; remove `'evan fabri'` from `rekaFiltering.ts`.
13. Remove the Grok `grok-extraction-debug-stop` trap or gate it behind a debug flag; reconcile the Grok smoke phrase.
14. Fix `/health` to report real connection state (`browser.isConnected()` / probe `context.pages()`), or soften the docs.
15. Tighten the loose stop-control matchers (generic helper, ChatGPT, Perplexity) to enabled-control + exact-label, matching the four drivers that already do it right — this is the exact static-"Stopped generating" trap the docs warn about.
16. Add failure artifacts to ChatGPT and Copilot; throttle Grok/Copilot poll logging to the 5 s pattern.
17. Add an aggregate `test:filters` script chaining all seven assertion scripts (docs repeatedly treat "the filter tests" as one gate).
18. Fix or remove the README `--skip-blocked` claim — as documented it corrupts the prompt.
19. Sync the two participant rosters (Copilot URL, Reka id) or document the intentional difference.
20. Consider moving provider-specific server knobs (timeouts, security attempt limits, workflow roles) onto the driver/participant definitions so doc 02's "add a provider without touching the server" principle becomes true.

### Process
21. Bring deepseek/reka assertion suites up to the documented shape (reason assertions, prompt needles, at least one echo case each); add geometry cases to copilot and cleaning cases to grok where relevant.
22. Record as explicit technical debt: no lint config, no CI, no test framework — doc 12's verification standards currently rest on manual `npm run build` plus seven ad-hoc `tsx` scripts, none automatic.
23. Consider documenting the two prompt-template vocabularies (runner vs Studio) and the planned unification under the "Prompt Pipeline" milestone.

---

## Part 5 — What Checked Out (confirmed accurate)

To calibrate: the audits verified far more claims true than false. Highlights:

- **All 7 HTTP endpoints** exactly as doc 08 lists them; server on `127.0.0.1:4137` with the exact documented log line. All CLI commands exist (plus `check-providers`, which doc 02 omits).
- **Driver lifecycle contract and invocation order** exactly as documented, in `base.ts` and `server.ts:608-626`; response object shape (`participant/question/answer/citations/timing/rawText/cleanedText/rawHtml`) matches doc 02 verbatim.
- **All 9 participants/drivers and their preferred URLs** match doc 07 verbatim; startup asserts all 9 ask-capable.
- **Paste verification is universal** (shared `verifyPastedPrompt` with artifacts on failure) — "a paste is verified, never assumed" is true.
- **Claude, Google, Grok, Perplexity, Reka, DeepSeek, Copilot driver descriptions in doc 07 are substantially accurate** — submission fallback chains, overlay handling, terminal-error classification (Grok capacity/rate-limit), transient-prefix stripping (Claude), AI-Mode verification at every stage (Google), coordinate diagnostics (Reka), static-vs-active stop distinction (Copilot) all confirmed at the cited line numbers.
- **The 7 filter modules + 7 assertion suites + npm scripts** exist exactly as claimed; assertions are deterministic pure functions as doc 09 claims; `submitted-prompt-only` rejection exists in all 7; smallest-valid-child parent rejection implemented with regression coverage; diagnostics vocabulary (`stableMs`, `stopVisible`, `candidateCount`, `preview`, geometry format `x=.. y=.. width=.. height=..`) is used verbatim in code.
- **Tab management**: reuse-before-open, focus-with-warn-on-failure, blank-tab cleanup ordering, Google AI-mode tab preference, Copilot dual-domain matching, CDP-mode never closing the user's browser — all as documented.
- **Restart script core behavior** (Maestriss-only node kill filter, Chrome flags, 4 s wait, CDP serve) matches the runbook's description — apart from the undocumented kill-all-Chrome and Preferences rewrite noted above.
- **Inspector** capabilities (screenshot + HTML, composer outlining, candidate listing) match doc 09.
- **No credential automation and no environment variables exist** — consistent with the docs' authentication model (`process.env` appears nowhere in project code).
- **Doc 10's Current State, doc 11's Release History ("Unreleased"), and the "Roundtable Engine / Prompt Pipeline: Planned"** rows are accurate.

---

*Report generated by a five-pass parallel documentation audit (architecture, drivers, operations, filtering/testing, status/process), each pass reading its documents in full and verifying claims directly against source. Line numbers reference the working tree at commit `ef75869`.*
