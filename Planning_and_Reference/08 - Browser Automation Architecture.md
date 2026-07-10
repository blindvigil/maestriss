# Browser Automation Architecture

## Table of Contents

1. [Purpose](#purpose)
2. [High-Level Architecture](#high-level-architecture)
3. [Browser Lifecycle](#browser-lifecycle)
4. [Browser Execution Modes](#browser-execution-modes)
5. [Chrome Profile Strategy](#chrome-profile-strategy)
6. [Browser Startup](#browser-startup)
7. [Runner Lifecycle](#runner-lifecycle)
8. [Participant Discovery](#participant-discovery)
9. [Tab Management](#tab-management)
10. [Bringing Tabs to the Front](#bringing-tabs-to-the-front)
11. [Navigation Philosophy](#navigation-philosophy)
12. [DOM Interaction Philosophy](#dom-interaction-philosophy)
13. [Coordinate-Based Automation](#coordinate-based-automation)
14. [Event Simulation](#event-simulation)
15. [Verification Philosophy](#verification-philosophy)
16. [Wait Strategies](#wait-strategies)
17. [Diagnostics](#diagnostics)
18. [Failure Recovery](#failure-recovery)
19. [Performance Philosophy](#performance-philosophy)
20. [Browser Safety](#browser-safety)
21. [Extensibility](#extensibility)
22. [Engineering Guidelines](#engineering-guidelines)
23. [Future Directions](#future-directions)
24. [Browser Automation Constitution](#browser-automation-constitution)

## Purpose

The browser automation layer exists to operate modern AI websites as live participant interfaces. It provides the mechanism by which Maestriss can coordinate independent AI systems through their public user-facing products while preserving session state, provider-specific behavior, and user visibility.

Browser automation exists because Maestriss is not only an API caller. Its purpose is to orchestrate independent AI systems as participants. Many providers expose important capabilities, account states, product modes, conversation behaviors, and current user experiences through their websites. Browser automation allows Maestriss to work with those real surfaces.

APIs alone are insufficient for the project because APIs do not necessarily expose the same products, modes, policies, tools, account features, or user experiences as provider websites. APIs also differ dramatically across providers. Some providers may expose stable APIs, others may not expose the required capability, and others may expose a different product than the public web interface. Maestriss must be able to coordinate providers without requiring all of them to offer equivalent programmatic contracts.

The system intentionally interacts with public user interfaces because the browser is the common operational environment shared by all participants. A user can authenticate, inspect, intervene, and observe. The same interface that a human uses becomes the surface that Maestriss automates carefully and transparently.

Portability matters. Browser automation allows Maestriss to support providers with different backend APIs or no suitable API at all. Provider independence matters because each participant can be integrated through its own website and driver without requiring the entire framework to adopt one provider's integration model. Human equivalence matters because automation should behave like a careful user: focus the tab, type into the composer, submit deliberately, watch generation, and extract the answer. Resilience matters because the browser layer can observe, diagnose, and recover from real interface changes.

## High-Level Architecture

Maestriss browser automation is layered. Each layer owns a distinct responsibility and should not absorb responsibilities from adjacent layers.

```text
CLI
 |
 v
Runner
 |
 v
Server
 |
 v
Playwright
 |
 v
Chrome DevTools Protocol
 |
 v
Persistent Browser Session
 |
 v
Participant Tabs
 |
 v
AI Websites
```

The CLI is the command interface. It starts the server, sends ask requests, runs workflows, checks health, cancels requests, and prints responses.

The runner owns command execution and process-level configuration. It determines browser channel, CDP endpoint, focus behavior, runner root, and user data directory. It can operate as a server or as a client of the local server.

The server owns orchestration. It accepts requests, resolves participants, manages active request state, handles cancellation, focuses participant tabs, dispatches drivers, collects responses, and returns structured results.

Playwright is the automation library used by the runner. It provides page objects, locators, navigation, evaluation, mouse input, keyboard input, screenshots, and browser-context operations.

Chrome DevTools Protocol is the connection layer when Playwright attaches to an externally started Chrome instance. The runner can also launch a Playwright-managed persistent Chromium profile without CDP.

The persistent browser session is the live browser environment. It contains the profile, authenticated provider sessions, participant tabs, conversations, cookies, and visible UI.

Participant tabs are long-lived pages associated with configured AI participants. Each tab is the operational workspace for one provider.

AI websites are the external provider products. They are dynamic, changing, human-facing applications that drivers operate through the browser.

## Browser Lifecycle

The browser lifecycle begins with establishing a persistent browser session. In CDP mode, Chrome is started with a remote debugging port and a dedicated persistent profile. In persistent-profile mode, the runner launches a Playwright-managed Chromium context using `runner/.user-data`.

Remote debugging exposes the CDP endpoint that the runner uses to connect to an existing Chrome process. Without this endpoint, CDP mode cannot enumerate tabs or control pages in the existing browser.

Profile loading initializes the persistent browser state. Cookies, logins, provider sessions, preferences, and conversation continuity are restored from the dedicated profile.

Runner startup begins the Maestriss runtime. The runner creates the server, connects to the browser, discovers pages, opens missing participant tabs, cleans blank startup tabs, and begins listening for requests.

Browser session creation attaches the automation layer to the browser. CDP mode allows Playwright to operate an existing Chrome instance. Persistent-profile mode creates the browser context directly through Playwright.

Participant discovery identifies which open tabs belong to configured participants. Discovery occurs during startup and during request processing.

Normal operation consists of receiving requests, resolving participant tabs, focusing active tabs, invoking drivers, waiting for responses, extracting text, and returning results.

Graceful shutdown should allow the runner to stop without corrupting browser state. The browser may remain open so the persistent session can continue to be inspected or reused.

Unexpected termination can occur if the runner crashes, Chrome closes, the CDP connection drops, or a tab crashes. The system should surface the failure clearly and allow restart.

Restart reestablishes a clean runtime. The standard restart script uses CDP mode: it stops old runner processes, closes Chrome, force-kills remaining Chrome processes if needed, starts Chrome with the persistent profile and CDP port, connects the runner, closes startup blank tabs, and restores participant availability.

Each stage exists to make browser automation repeatable. A predictable lifecycle reduces hidden state, preserves sessions, and makes failures diagnosable.

## Browser Execution Modes

Maestriss supports two browser execution modes. Both are built around persistent visible browser state because the browser is a durable workspace, not a disposable test fixture.

In CDP mode, Maestriss connects to an existing Chrome browser over Chrome DevTools Protocol. This is the mode used by `restart-runner.ps1`. It uses installed Chrome, remote debugging port `9222`, and the dedicated profile `%LOCALAPPDATA%\MaestrissChromeProfile`.

In persistent-profile mode, Maestriss launches a Playwright-managed Chromium browser context directly. This is the default server mode when no `--connect-cdp` flag is provided. It uses the profile directory `runner/.user-data`.

These modes use different profiles. Authentication and provider state established in one mode do not automatically transfer to the other.

Persistent logins are the primary benefit. Providers often require account authentication, multi-factor verification, account selection, or security checks. A persistent browser allows the user to authenticate manually and lets Maestriss reuse the authenticated session.

Cookies and sessions remain intact. Provider trust often depends on the continuity of browser state. A known browser profile is less disruptive than repeated cold launches.

Provider trust is improved by continuity. Repeated temporary browsers can resemble suspicious activity and may trigger extra verification. A stable profile behaves more like normal human usage.

Human visibility is preserved. The user can see the browser, inspect participant tabs, complete manual provider steps, and watch automation execute.

Debugging is easier with a visible, persistent browser. When something fails, the user and maintainer can inspect the exact page state rather than trying to reconstruct it from a closed temporary browser.

Manual intervention is possible. Login, security verification, provider onboarding, account selection, and unexpected modals can be resolved directly in the browser.

Recovery after crashes is more practical. The restart path reconnects to a known profile and restores the participant workspace rather than rebuilding everything from scratch.

Launching disposable temporary browser instances was rejected as the primary architecture because it discards authentication, slows requests, creates repeated provider startup friction, hides state from the user, and weakens the participant-tab model. A Playwright-launched persistent profile remains compatible with the architecture because it preserves profile state and participant tabs.

## Chrome Profile Strategy

Maestriss uses dedicated persistent browser profiles for automation. CDP mode uses a dedicated Chrome profile. Persistent-profile mode uses a Playwright Chromium profile under the runner directory. The profile isolates Maestriss provider sessions from unrelated browser activity while preserving state across requests and restarts.

The dedicated profile stores authentication state. Users log in manually to providers within this profile. Maestriss does not manage credentials.

Cookie preservation is essential. Cookies and local storage often determine whether a provider session remains usable. Losing them would reintroduce login and onboarding friction.

Browser settings can also matter. Provider permissions, language, accessibility settings, and site-specific states may influence behavior. A persistent profile keeps these stable.

Provider trust benefits from a consistent profile. Providers can see continuity rather than a new browser identity for every request.

Security considerations are important. The profile contains authenticated sessions and should be treated as sensitive local state. Maestriss should not copy, expose, or manipulate credentials. Users remain responsible for provider account access.

Recovery after profile corruption may require recreating the profile and manually logging in again. This is a user-visible recovery operation because the profile contains account state.

Maestriss should never depend on temporary profiles for normal operation. Temporary profiles are useful for isolated experiments, but they undermine the reliability, speed, and human-equivalence goals of the framework.

## Browser Startup

Browser startup prepares the persistent browser session for automation. In CDP mode, Chrome is launched with a remote debugging port so the runner can connect through CDP. In persistent-profile mode, the runner launches Chromium through Playwright.

The remote debugging port is the control endpoint for CDP mode. The runner uses it to attach to Chrome, enumerate pages, and create or reuse tabs.

Command-line arguments configure Chrome for reliable CDP-mode automation. They define the user data directory, suppress first-run friction, avoid default-browser prompts, reduce crash-restore interruptions, and open a predictable startup page.

Restore suppression matters because Chrome may otherwise show crash recovery prompts or restore bubbles. These prompts can interfere with participant tabs and automation visibility.

Profile selection ensures that Maestriss uses the dedicated persistent profile rather than an arbitrary user profile or a temporary automation profile.

Window management matters because Maestriss is intended to be visible. The browser should be available for users to watch, inspect, and intervene.

New-tab cleanup removes irrelevant startup pages such as blank tabs or new-tab pages after participant tabs are established. Cleanup keeps the workspace focused.

Participant restoration opens or reuses configured provider tabs. Startup should leave the browser with the expected participant workspace.

Startup reliability matters because every request depends on the browser foundation. If startup is inconsistent, all driver behavior becomes harder to trust.

## Runner Lifecycle

The runner is the executable automation service for Maestriss.

Server creation initializes the local service that receives requests. The server connects to the browser, prepares participant state, and exposes endpoints for asks, health checks, provider status, inspection, cancellation, chains, and random workflows.

Request handling is centralized. The server accepts requests, validates input, manages active request state, resolves participants, invokes drivers, and returns structured responses.

Health checks expose the browser mode, browser channel, connection state, focus setting, participant count, and active request identifiers. Health output allows tooling and users to understand runtime status.

Driver dispatch maps requested participants to registered drivers. The server calls the standard driver lifecycle without needing provider-specific knowledge.

Logging records lifecycle stages and significant decisions. Runner logs show participant opening, tab reuse, focusing, wait stages, prompt paste, submission, completion, extraction, and failures.

Shutdown should leave the system in a recoverable state. The browser may remain open, and the runner can be restarted against the same persistent profile.

Restart is the normal recovery mechanism during development and after browser or runner state becomes stale. It refreshes the runner service while preserving provider sessions through the browser profile.

Error handling belongs to the runner and drivers together. The server handles orchestration errors, cancellation, and response serialization. Drivers handle provider-specific failures and diagnostics.

## Participant Discovery

Participant discovery locates the browser tab corresponding to a configured participant.

Known URLs provide the primary discovery signal. Each participant has a preferred URL. Some providers also have accepted aliases, redirects, or mode-specific URLs.

Domain matching must be precise. Large domains may host multiple products. Matching must avoid assigning the wrong provider to a participant.

URL normalization helps compare pages consistently. Protocol, host, path, and search parameters may all matter depending on the provider.

Reuse is preferred when a matching tab exists. The participant manager returns an existing page instead of opening a duplicate.

Missing tabs are created through shared infrastructure. The framework navigates to the participant's preferred URL and lets the driver verify provider readiness later.

Validation remains necessary after discovery. A matching URL does not prove that the page is authenticated, ready, or in the correct mode. Drivers must verify readiness.

Recovery may navigate a reusable provider tab back to the correct surface when safe, or open a replacement when the tab is missing.

Participant discovery must be deterministic. The same browser state should produce the same participant-page selection. Nondeterministic discovery leads to duplicate tabs, wrong-provider automation, and difficult debugging.

## Tab Management

Tab management preserves the browser workspace.

Existing participant tabs should be reused when safe. Reuse preserves authentication, provider state, conversation continuity, and user orientation.

Duplicate tabs should be avoided. Duplicate participant tabs create ambiguity about which conversation is active and increase the risk of extracting from the wrong page.

New tabs are opened only when no suitable reusable tab exists. Opening is centralized in the framework rather than performed independently by drivers.

Blank tabs are closed conservatively. Startup pages such as `about:blank` or browser new-tab pages are removed when they are clearly irrelevant.

Unrelated user tabs must be left untouched. Maestriss should not close, navigate, focus unnecessarily, or extract from tabs that do not belong to configured participants.

Participant ownership is determined by metadata and matching rules. A tab belongs to one participant when it matches that participant's expected surface.

Browser state should remain stable across runs because Maestriss is a long-lived workspace. Stability improves user trust, driver reliability, and debugging.

## Bringing Tabs to the Front

Maestriss brings the active participant tab to the front with `page.bringToFront()` when focus is enabled.

User visibility is the primary reason. The user can see which participant is active and watch the prompt paste, submission, and response generation.

Debugging improves when the active tab is visible. Login pages, provider errors, mode changes, overlays, and broken composers are often immediately obvious.

Watching automation execute builds confidence. It shows that Maestriss is operating real provider interfaces rather than silently manipulating hidden state.

Chain execution benefits from focus because each participant tab becomes visible as its turn begins. This makes multi-provider workflows easier to follow.

Failure handling treats focusing as useful but nonessential. If focusing fails, the ask should generally continue. A warning is appropriate because focus failure should not invalidate provider interaction by itself.

Visual feedback improves maintainability because it aligns logs with visible browser state. When logs say a participant is active, the browser shows the same participant.

## Navigation Philosophy

Navigation should be conservative. Reloading or navigating provider tabs unnecessarily destroys useful state and increases the chance of provider friction.

Unnecessary reloads should be avoided. If a tab is already in the correct provider mode and usable state, the driver should use it.

Conversations should be reused when safe. Existing conversation pages can provide follow-up composers and visible continuity. Drivers must know how to operate both initial and follow-up states when a provider supports them.

Navigation should occur only when required. Examples include opening a missing participant, correcting a normal provider page to a required mode, or recovering a tab that is clearly on the wrong surface.

Provider state should be preserved. Account state, mode selection, conversation continuity, and provider initialization are valuable.

Incorrect pages should be recovered when safe. If a provider tab is on a generic homepage but the participant requires a specific product mode, the framework or driver may navigate to the correct target. If the page is a login or security screen, user intervention may be required.

The tradeoff is between freshness and continuity. Reloading can recover stale state, but it can also lose context or trigger friction. Maestriss prefers continuity unless evidence shows recovery is needed.

## DOM Interaction Philosophy

Automation should begin with the least fragile technique that can be verified.

Semantic controls are preferred. Buttons with accessible labels, textboxes with roles, and form-associated controls provide clearer intent than arbitrary coordinates.

Visible controls are preferred over hidden or synthetic elements. The automation should interact with what a human could reasonably see and use.

DOM events may be appropriate when a provider requires input, change, composition, or pointer sequences to recognize interaction.

Keyboard input is appropriate for composer entry and submission when the provider supports it. It often behaves like human interaction and can trigger provider event handlers naturally.

Coordinate clicking is a fallback when stable selectors are insufficient but the visible control can be identified by geometry. It should be supported by bounding-box diagnostics.

Raw mouse events may be needed when ordinary DOM clicks do not trigger provider behavior. They should be used carefully and verified.

Automation should begin with the least fragile technique because fragile interactions are harder to maintain. More invasive strategies should be fallbacks, not defaults, unless provider behavior proves they are the most reliable path.

## Coordinate-Based Automation

Coordinate automation clicks based on visual geometry rather than a stable selector.

Bounding rectangles are the foundation. The driver identifies the composer, nearby controls, candidate buttons, and target centers through measured rectangles.

Center clicks are usually preferred because they target the visible control area. A click should be placed inside the button or actionable region, not on an edge or overlapping element.

Visibility must be verified. A coordinate target is valid only if the element is visible, enabled, and associated with the intended provider action.

Scrolling may be required when controls are outside the current viewport, but scrolling should be deliberate and logged.

Coordinate clicking is a fallback because it depends on layout. Layout can change with viewport size, responsive design, zoom, overlays, and provider redesigns.

Verification is mandatory after coordinate clicks. A coordinate click is not proof of submission. The driver must observe composer clearing, generation start, response change, or another provider-specific success signal.

## Event Simulation

Event simulation is used when provider websites depend on browser events beyond simple value assignment.

Focus events ensure the correct element is active. Many providers attach behavior to focus state.

Input events notify frameworks that the composer value changed. Without input events, a provider may not enable its send button or store the prompt in application state.

Change events may be required by form-like components that commit values on change.

Pointer events simulate lower-level interaction sequences for controls that respond to pointer behavior.

Mouse events simulate user clicks when DOM click methods are insufficient.

Keyboard events can trigger Enter submission, shortcuts, and editor behavior. Some providers require real keypress sequences rather than direct DOM manipulation.

Submit events may apply when the provider uses form semantics, but they must be used carefully because many modern chat interfaces do not rely on standard form submission.

Each event type is appropriate only when it matches the provider's behavior. Event simulation should not be used as a substitute for understanding or verification.

## Verification Philosophy

Every action must be verified because browser automation can fail silently.

Paste verification confirms that the prompt text is present in the intended composer. Without verification, Maestriss may submit an empty prompt, a stale prompt, or text into the wrong field.

Submission verification confirms that the provider accepted the prompt. Evidence may include composer clearing, prompt appearing as a user message, generation beginning, stop control appearance, response candidate change, or valid navigation.

Generation verification confirms that the provider is working or has worked on the request. It helps distinguish successful submission from a no-op.

Completion verification confirms that the response is stable and no active generation indicator remains.

Extraction verification confirms that the selected text is a valid answer rather than prompt echo, UI chrome, status text, or unrelated content.

Silent failures are unacceptable because they produce misleading results. The system should either verify success or fail with diagnostics.

## Wait Strategies

Waits should rely on UI state rather than arbitrary delays. Fixed sleeps are sometimes useful as small settling periods, but they should not be the primary correctness mechanism.

Polling is the standard approach for dynamic provider state. The driver repeatedly observes response candidates, generation indicators, stop controls, and stability timing.

Stable text indicates that streaming has likely completed. The driver tracks selected cleaned response text and requires it to remain unchanged for an appropriate interval.

Generation indicators provide provider-specific state. Stop buttons, responding labels, progress bars, aria-busy attributes, loading indicators, and changing response candidates can all inform waiting.

Network independence is important. AI websites may use websockets, streaming fetches, background requests, or long-lived connections. Network idle is not a reliable completion signal for generation.

Provider independence matters because completion signals differ. Each driver should use signals appropriate to its provider while following shared lifecycle principles.

Timeouts prevent infinite waits. A timeout should produce diagnostics that explain what the driver saw during the wait.

Recovery during waits may include retrying after navigation-related evaluation errors or saving live debug artifacts when no valid response appears.

## Diagnostics

Diagnostics should allow nearly every failure to be understood afterward.

The current step should be logged. A maintainer should know whether failure occurred during browser connection, participant resolution, readiness, paste, submit, completion, or extraction.

The current participant should be logged. Multi-provider workflows require clear participant context.

Candidate counts show whether detectors saw possible response elements.

Geometry and bounding boxes reveal where composers, buttons, selected candidates, and rejected candidates appeared.

The selected element should be described by preview text, selector or descriptor where available, and bounding box.

Rejected elements should include reasons. Rejection reasons make false positives and false negatives diagnosable.

Timing should be logged for waits, stable timers, timeouts, and long-running stages.

Screenshots capture the visible browser state.

HTML snapshots preserve the DOM for later inspection.

Debug logs should be human-readable and concise enough to follow during live operation.

Diagnostics are architectural infrastructure. They are not optional development noise.

## Failure Recovery

Recovery begins with clear classification. A browser failure, tab failure, provider failure, driver failure, and extraction failure require different responses.

Retries are appropriate for transient conditions such as destroyed execution contexts during navigation, stale element handles, or a failed first submission strategy followed by a verifiable fallback.

Fallback chains are appropriate when providers support multiple interaction paths. A driver may try DOM click, coordinate click, keyboard Enter, and modified keyboard submission in a deterministic order.

Driver recovery handles provider-specific states such as overlays, splash screens, wrong modes, missing composers, or static status labels.

Browser recovery handles disconnected CDP sessions, closed browsers, crashed tabs, missing participant tabs, and startup cleanup.

Tab recreation is appropriate when a participant tab is missing or unrecoverably invalid. It should be performed by shared infrastructure.

Session recovery often requires user intervention. Authentication, multi-factor prompts, provider security checks, account locks, and unavailable provider modes should not be bypassed by Maestriss.

Escalation philosophy is conservative. The system should recover automatically when it can do so safely and visibly. It should stop and ask for user action when continuing would risk wrong submissions, wrong extraction, or credential misuse.

## Performance Philosophy

Maestriss should be fast enough, but reliability comes first.

Reusing existing browser state is the largest performance win. Persistent profiles and participant tabs avoid repeated login, loading, and initialization.

Unnecessary reloads should be avoided because they cost time and can destabilize provider state.

Unnecessary DOM work should be avoided where practical, but detectors should still gather enough evidence to be correct. A fast wrong extraction is not useful.

Polling intervals should balance responsiveness and browser load. Logs should be periodic rather than emitted on every poll when nothing changes.

Correctness is preferred over raw speed. The system should wait for stable text, verify submission, and produce diagnostics even if that costs a small amount of time.

## Browser Safety

Browser safety protects user state and provider sessions.

Maestriss should not interfere with unrelated user tabs. It should only operate tabs that match configured participants.

The framework should not destroy unrelated state. It should close only confidently identified blank startup tabs and should leave meaningful pages alone.

Accidental navigation must be avoided. A driver should not navigate away from a valid conversation without a clear reason.

Authenticated sessions must be protected. Maestriss should use the browser session but should not extract credentials, store passwords, or automate credential entry.

Recovery should be graceful. When the system cannot safely continue, it should fail clearly and preserve diagnostics rather than taking risky corrective action.

## Extensibility

The browser architecture should support future growth without major redesign.

More participants should fit into the existing participant-tab and driver model.

Multiple browser engines may be possible if they preserve the required automation features. Any future engine must support persistent sessions, page enumeration, DOM evaluation, screenshots, input simulation, and diagnostics.

Parallel execution may require multiple tabs active at once, stronger request isolation, and careful focus policy. The current architecture should evolve without abandoning lifecycle verification.

Multiple Chrome profiles could support separate user contexts or provider account sets. Profile selection should remain a browser-management responsibility.

Remote execution could connect the runner to a browser on another machine through a compatible control endpoint. The same principles of persistent state, participant tabs, and diagnostics should apply.

Headless support may be useful for some environments, but it must not weaken visibility-oriented diagnostics. Screenshots, HTML capture, and state verification remain mandatory.

The architecture should evolve by extending browser management, not by moving browser lifecycle into drivers.

## Engineering Guidelines

Never depend on fragile CSS alone.

Verify every interaction.

Prefer semantic selectors when they are reliable.

Prefer visible controls over hidden structures.

Use coordinate clicks only when stronger techniques are insufficient.

Log important decisions.

Fail loudly when correctness cannot be verified.

Recover automatically when recovery is safe.

Require user intervention for authentication and provider security barriers.

Keep provider-specific logic out of the browser layer.

Keep browser lifecycle out of provider drivers.

Preserve user state.

Avoid duplicate participant tabs.

Do not extract from the wrong provider surface.

Save artifacts when failures are not self-explanatory.

## Future Directions

Future improvements may strengthen browser automation without changing its core principles.

Visual recognition may help identify response regions, buttons, or provider states when DOM signals are weak.

Accessibility-tree navigation may provide more stable semantic information than raw DOM selectors for some providers.

Machine-learning assisted element detection may help rank candidates or identify provider UI roles, provided decisions remain diagnosable.

Adaptive selector learning may allow drivers to record successful selectors or element patterns, but such learning must remain controlled and inspectable.

Parallel orchestration may allow multiple participant tabs to work at once. This will require careful request isolation, focus behavior, and concurrency control.

Cross-machine execution may allow browser sessions to run on dedicated machines while the Maestriss interface runs elsewhere.

Cloud execution may support managed browser pools, though authentication, security, and user visibility must be treated carefully.

Distributed participant pools may allow workflows to coordinate multiple browsers or profiles. The same lifecycle and diagnostic standards should apply.

These are future possibilities, not commitments. Any future direction must preserve reliability, verification, diagnostics, and provider independence.

## Browser Automation Constitution

The browser is a durable participant workspace.

Maestriss automates public provider interfaces deliberately and visibly.

APIs are useful but not sufficient for the Maestriss architecture.

Persistent visible browser sessions are the normal operating model. CDP-attached Chrome is the standard restart-script path; Playwright-managed persistent Chromium is also supported.

Provider sessions belong in persistent browser profiles.

Drivers operate pages; they do not own browser lifecycle.

The framework resolves and manages participant tabs.

Existing participant tabs should be reused when safe.

Unrelated user tabs must not be disturbed.

The active participant tab should be visible when focus is enabled.

Navigation should be conservative.

Semantic interaction is preferred over fragile interaction.

Coordinate interaction is a fallback and must be verified.

Every paste, submit, wait, and extraction must be verified.

Waits should observe UI state rather than rely on arbitrary delays.

Diagnostics are required for maintainable automation.

Failures should be clear, recoverable when safe, and artifact-backed when needed.

Reliability takes priority over raw speed.

Browser safety protects user trust.

Future browser support must preserve the existing lifecycle, verification standards, and diagnostic discipline.
