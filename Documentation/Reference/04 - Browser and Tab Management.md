# Browser and Tab Management

## Table of Contents

1. [Purpose](#purpose)
2. [Browser Architecture](#browser-architecture)
3. [Persistent Browser Philosophy](#persistent-browser-philosophy)
4. [Chrome DevTools Protocol](#chrome-devtools-protocol)
5. [Participant Tabs](#participant-tabs)
6. [Tab Discovery](#tab-discovery)
7. [Tab Reuse](#tab-reuse)
8. [Opening New Participants](#opening-new-participants)
9. [Tab Focus](#tab-focus)
10. [Startup Behavior](#startup-behavior)
11. [Blank Tab Cleanup](#blank-tab-cleanup)
12. [Browser Recovery](#browser-recovery)
13. [Authentication](#authentication)
14. [Session Integrity](#session-integrity)
15. [Browser Diagnostics](#browser-diagnostics)
16. [Future Browser Support](#future-browser-support)
17. [Browser Management Principles](#browser-management-principles)

## Purpose

Browser management is one of the core responsibilities of the Maestriss framework because every participant is operated through a live web product. The browser is not a passive implementation detail. It is the runtime environment that contains provider sessions, authenticated accounts, conversation state, provider modes, tab history, visible UI, and the DOM surfaces that drivers must operate.

Browser behavior directly affects reliability. If the wrong tab is selected, a driver may submit to the wrong provider. If a tab is duplicated unnecessarily, the user may lose track of which conversation is active. If a provider redirects out of an expected mode, extraction may become invalid. If the browser session is not persistent, the system may repeatedly encounter login pages, onboarding flows, or security checks.

Browser behavior also affects speed. Reusing an existing browser and provider tabs avoids repeated launches, repeated logins, repeated page loads, and repeated provider initialization. A long-running browser allows Maestriss to behave like a careful human operator who keeps important workspaces open rather than starting from scratch for every request.

Browser behavior affects user experience. Users should be able to watch Maestriss operate participants, see the active tab come forward, understand which provider is being used, and diagnose provider-side problems visually. Browser and tab management therefore belongs to the framework as a first-class architectural concern.

Browser management belongs to shared infrastructure rather than individual drivers. Drivers should interact with the provider page they are given. They should not own browser startup, global tab discovery, tab reuse, focus policy, participant page resolution, or startup cleanup. Centralizing browser management keeps the system predictable and prevents provider-specific drivers from creating inconsistent browser behavior.

## Browser Architecture

Maestriss uses a shared browser architecture centered on a long-running persistent browser session controlled through Playwright. The runner either launches a Playwright-managed persistent Chromium profile or connects to an externally started Chrome instance through Chrome DevTools Protocol. In both modes, the runner enumerates pages, resolves participant tabs, and delegates provider-specific interaction to drivers.

```text
                         +--------------------+
                         | Runner / Server    |
                         +---------+----------+
                                   |
                                   | Playwright control
                                   v
                         +---------+----------+
                         | Persistent Browser |
                         | Profile           |
                         +---------+----------+
                                   |
                  +----------------+----------------+
                  |                |                |
                  v                v                v
          +-------+------+ +-------+------+ +-------+------+
          | Participant  | | Participant  | | Participant  |
          | Tab          | | Tab          | | Tab          |
          +-------+------+ +-------+------+ +-------+------+
                  |                |                |
                  v                v                v
          +-------+------+ +-------+------+ +-------+------+
          | Provider     | | Provider     | | Provider     |
          | Driver       | | Driver       | | Driver       |
          +--------------+ +--------------+ +--------------+
```

Playwright provides the browser automation API used by drivers and shared infrastructure. In CDP mode, Chrome DevTools Protocol provides the connection channel to an externally started Chrome instance. Through Playwright, Maestriss can enumerate pages, navigate tabs, evaluate JavaScript, inspect the DOM, capture screenshots, save HTML, focus tabs, and synthesize mouse or keyboard interaction.

The persistent browser profile stores session state. Cookies, logins, provider preferences, account state, and conversation continuity live in the profile. This allows Maestriss to operate providers in the same way a user operates them across requests.

The architecture uses a single long-running browser session rather than one browser per request. This design reduces overhead, preserves authentication, improves observability, and keeps the participant model stable.

The browser connection is shared by the runner server. Drivers receive page objects that have already been resolved. They do not create independent browser connections.

Participant tabs are long-lived browser pages associated with registered participants. Each tab belongs to one participant surface and is reused when safe.

Drivers interact with participant tabs through the page object supplied by the framework. They implement provider-specific DOM interaction, while the framework owns browser lifecycle and tab management.

The runner coordinates browser startup and server connection. It may launch its own persistent Chromium profile, or it may connect to an externally started Chrome instance over CDP. The restart workflow provides a predictable CDP-mode development path for refreshing Chrome and the runner together.

This architecture was chosen because it aligns with the product reality of independent AI systems: they are web applications with session state, changing interfaces, and visible user workflows. Maestriss must manage the browser as a durable operating environment.

## Persistent Browser Philosophy

The browser remains open across requests because provider sessions are valuable state. A persistent browser lets Maestriss work with established accounts, completed logins, provider settings, conversation history, and current participant pages.

Remaining authenticated is essential. Many providers require interactive login, account selection, security checks, or region-specific availability. Requiring Maestriss to authenticate programmatically on every request would be brittle, intrusive, and outside the proper responsibility of the framework.

Persistent sessions avoid repeated logins. The user can authenticate manually once, and Maestriss can reuse that authenticated state through the browser profile. This makes the system more practical and less likely to trigger provider security friction.

Preserving conversations is also important. Some workflows benefit from continuity within a participant tab. Even when a workflow treats each ask as independent, the visible conversation history provides useful context for debugging and inspection.

Reducing startup time improves responsiveness. Starting a browser, loading every provider, and passing through account checks for every request would make Maestriss slow and unpleasant to use. A persistent browser keeps the system warm.

Provider state continuity improves reliability. Providers often use account-local settings, product modes, onboarding states, and cached UI resources. Reusing the browser keeps those states stable across requests.

Ephemeral browser instances were rejected because they break the participant model. They discard authenticated sessions, increase login friction, slow every request, hide continuity, and turn each ask into a cold-start integration test. Maestriss is designed to orchestrate a living workspace, not a disposable browser sandbox for every operation.

## Chrome DevTools Protocol

Chrome DevTools Protocol is the browser connection layer used when Maestriss attaches to an externally started Chrome process. It allows the runner to operate existing Chrome pages through Playwright while preserving a dedicated Chrome profile.

CDP mode is the standard watched-development path used by `restart-runner.ps1`. That script launches installed Chrome with `--remote-debugging-port=9222` and `--user-data-dir=%LOCALAPPDATA%\MaestrissChromeProfile`, then starts the runner with `--connect-cdp http://127.0.0.1:9222`.

The runner also supports persistent-profile mode without CDP. In that mode, `npm run dev -- serve` launches a Playwright-managed Chromium profile under `runner/.user-data`. This mode is useful for direct runner operation, but it uses a different profile from the CDP restart script.

Browser automation fulfills several responsibilities. It allows the framework to enumerate open pages, identify participant tabs, navigate pages, inspect URLs and titles, execute browser-side JavaScript, interact with the DOM, capture screenshots, save HTML, bring pages to the foreground, synthesize mouse clicks, send keyboard input, and work with clipboard-driven or event-driven provider interaction.

Page enumeration is required for tab discovery and reuse. The framework must know which tabs are already open before deciding whether to open a new participant page.

Tab control is required for navigation, focus, and recovery. Maestriss must be able to reuse an existing provider tab, navigate it to the correct surface when appropriate, and bring it forward for user visibility.

DOM access is required for drivers to locate composers, buttons, response candidates, status indicators, and provider-specific UI. Provider pages do not expose a stable response API through the browser, so DOM inspection is central to automation.

JavaScript evaluation is required for complex detection. Many tasks are easier and more reliable inside the browser context: visible element filtering, geometry measurement, text extraction, candidate scoring, stop-control detection, and response diagnostics.

Screenshots and HTML capture are required for diagnostics. When automation fails, maintainers need both the visible page and the DOM state to understand what happened.

Focus, mouse, keyboard, and clipboard control allow Maestriss to behave like a careful human user. Some providers respond best to keyboard input. Some require clicking a specific send button. Some require focus-sensitive input behavior.

Playwright and CDP-capable browser control are preferred over less capable automation techniques because Maestriss needs full browser observability and control. Simple HTTP requests cannot operate authenticated web applications as products. Basic UI scripting cannot reliably inspect DOM state, capture artifacts, or coordinate multiple tabs.

## Participant Tabs

The participant tab model is central to Maestriss. Each AI participant is expected to have one long-lived browser tab representing that provider's active web surface.

Creation occurs when no suitable reusable tab exists. The participant manager opens the participant's preferred URL and waits for the browser to load enough for later driver readiness checks.

Reuse occurs when an existing tab matches the participant. Reuse is preferred because it preserves authentication, provider state, and user-visible continuity.

Identification is based on participant metadata and provider-specific matching rules. A participant may be identified by hostname, URL path, product mode, or known valid aliases. Matching must be precise enough to avoid confusing related but distinct provider surfaces.

Recovery may involve navigating a reusable tab back to the correct provider surface, reopening a missing tab, or reporting that manual intervention is required. Recovery should be conservative and should not destroy useful participant state unnecessarily.

Replacement may be appropriate when a tab is closed, crashed, navigated to an unrelated site, or no longer represents the participant. Replacement should happen through the shared participant manager, not through ad hoc driver logic.

Conversations should remain inside dedicated participant tabs because that keeps state observable and predictable. A dedicated tab provides a stable place for the provider session, visible history, and future follow-up interactions. It also prevents workflows from scattering provider interactions across unrelated pages.

## Tab Discovery

Tab discovery is the process of determining which open browser pages correspond to registered participants. It is performed by shared infrastructure using participant metadata and provider-specific matching rules where necessary.

URLs are the primary discovery signal. Hostnames, paths, search parameters, and known mode indicators can identify participant pages. Some providers have straightforward URLs. Others have multiple valid surfaces or redirect through product-specific modes.

Titles may provide supplementary information, but they should not be the only discovery signal. Titles can change with conversation state, localization, provider updates, or loading status.

Participant metadata provides the expected identity. Each participant has an identifier, display name, and preferred URL. The resolver uses this metadata to decide what to look for and what to open when no tab is found.

Provider aliases may be required. Some providers operate across multiple hostnames or product URLs. A participant may be valid on more than one URL pattern. These aliases should be handled deliberately so that tab discovery is flexible without becoming overly broad.

Redirect handling is part of discovery. Providers may redirect from a preferred URL to a canonical app URL, a mode-specific URL, an account page, or a login page. The resolver and driver must distinguish valid redirects from invalid surfaces.

Discovery must tolerate provider UI changes because URLs and page structures can evolve. Matching should avoid relying on fragile details when stable signals exist. At the same time, matching must remain narrow enough to avoid false ownership of unrelated tabs.

## Tab Reuse

Tab reuse is the default philosophy for participant pages. If a suitable participant tab already exists, Maestriss should reuse it rather than opening a duplicate.

Reuse preserves conversation continuity. A participant tab contains the visible transcript and current provider state. Reusing that tab makes consecutive asks and debugging more coherent.

Reuse lowers latency. Existing tabs are already loaded, authenticated, and initialized. A reused tab avoids the cost of opening a new page and waiting through provider startup.

Reuse reduces authentication prompts. Providers are less likely to challenge an already established session than a new cold page.

Reuse preserves stable provider state. Provider modes, account settings, onboarding completion, and conversation surfaces remain available across requests.

Reuse should be abandoned when the tab is closed, crashed, clearly unrelated, stuck on an unrecoverable invalid surface, or no longer safe to operate. A tab should also be replaced when it cannot be navigated back to the required participant surface without user intervention.

Reuse should not mean blindly trusting the tab. Drivers must still verify readiness, expected mode, composer availability, and session integrity before operating.

## Opening New Participants

A new participant is opened when discovery finds no suitable reusable tab. The framework creates a browser page and navigates it to the participant's preferred URL.

Navigation is the first step, not the final readiness guarantee. A successful navigation means the page loaded, not that the provider is authenticated, ready, or in the correct mode. Driver readiness checks must still run before prompt entry.

Startup waits should allow the page to reach a meaningful loaded state. The browser layer can wait for basic load events, while drivers perform provider-specific readiness checks.

Authentication may interrupt opening. If a provider redirects to login or account selection, the driver or inspection tooling should surface that state. The framework does not manage credentials.

Provider redirects are expected. A preferred URL may redirect to a canonical product URL, a conversation URL, or a mode-specific URL. Valid redirects should be accepted. Invalid redirects should be detected before submission.

Verification happens through the driver lifecycle. Opening a tab only provides a page. `waitForReady()` determines whether that page is usable.

Failures should be handled with clear diagnostics. If navigation fails, the browser disconnects, the provider blocks access, or the expected surface is unavailable, the framework should report the failure and save artifacts where useful.

## Tab Focus

Participant tabs are intentionally brought to the foreground when Maestriss begins working with them. This behavior is part of the user experience, not merely a debugging convenience.

User visibility matters. Maestriss is coordinating external AI systems through visible browser products. Bringing the active tab forward lets the user see which participant is being used, watch the prompt appear, observe submission, and see response generation.

Focus improves debugging. When a provider changes layout, redirects, shows a login page, or blocks interaction, the visible tab often reveals the problem immediately.

Focus increases confidence. Users can watch the automation behave like a careful human operator. This makes the system feel transparent rather than mysterious.

Focus supports demonstrations. Maestriss can show the orchestration process in real time, which is especially useful when explaining how multiple participants are coordinated.

Focus also helps with providers whose interaction behavior depends on active page state. While drivers should not rely on focus as their only correctness mechanism, bringing the tab forward reduces surprises.

Focus behavior is optional. The framework supports disabling active tab focusing for workflows where background operation is preferred. The default behavior remains focused operation because watched execution is valuable during development and normal use.

Focus belongs to shared orchestration. Drivers should not implement independent tab focusing. The framework brings the participant page forward after resolution and before provider-specific interaction begins.

## Startup Behavior

Startup establishes the browser environment and participant workspace.

The runner establishes a browser session before participant pages can be enumerated or controlled. In persistent-profile mode, the runner launches Chromium and creates the browser context. In CDP mode, it connects to the configured debugging endpoint for an already running Chrome instance.

The framework finds existing browser pages after connection. It uses participant metadata and matching rules to determine which participant tabs are already present.

Configured participants are loaded or reused. Missing participants may be opened at startup so the browser workspace contains the expected set of provider tabs.

Tab reuse applies during startup. Existing valid participant tabs should be preserved rather than replaced. This avoids destroying useful session or conversation state.

Missing tabs are opened through the participant manager. The framework navigates to the preferred URL and allows later driver readiness checks to confirm usability.

Startup blank tabs are closed after participant pages are established. This keeps the browser workspace clean and prevents unrelated blank pages from interfering with discovery or user experience.

Startup verification should report the browser mode, connection state, and participant tab count. Logs should make it clear whether the browser connected successfully and how many participant tabs are currently matched.

## Blank Tab Cleanup

Blank startup tabs appear because browsers often open a default empty page or new-tab page when launched. These pages are not participants and should not remain in the workspace if they are merely startup artifacts.

Common blank or startup pages include:

- `about:blank`
- `chrome://newtab/`
- `chrome://new-tab-page/`
- `edge://newtab/`

Blank tab cleanup identifies pages with these startup URLs and closes them only when they are not part of the participant set.

Cleanup is conservative because the browser may contain user state that Maestriss should not disturb. The framework should close only pages it can confidently identify as irrelevant startup blanks.

The framework should never close active provider tabs, tabs that may contain user work, tabs that match participants, tabs with nonblank web URLs, login pages that belong to a provider flow, or diagnostic pages that a user may be inspecting.

Conservative cleanup preserves trust. Maestriss should keep the workspace tidy without surprising the user by closing meaningful browser content.

## Browser Recovery

Browser recovery covers failures in the shared browser environment.

Expected browser failures include the browser being closed, the CDP connection disconnecting, a tab crashing, a provider tab being closed manually, a participant tab navigating to an invalid page, or a navigation failing.

If the browser is closed or CDP disconnects, the runner cannot reliably continue active browser automation. The system should report the disconnected state and require the browser connection to be reestablished through the normal startup or restart path.

If a tab crashes or disappears, the participant manager may recreate it when a request needs that participant. Recreating a missing participant tab is appropriate because the framework owns participant page availability.

If a provider tab is missing, it can be reopened from participant metadata. The new tab will still require provider-specific readiness checks and may require manual authentication if session state is unavailable.

If navigation fails, the framework should report the failure and avoid continuing into driver interaction unless the page can be safely recovered.

Automatic recreation is appropriate for missing blank pages, missing participant tabs, or provider tabs that can be safely navigated back to their preferred surfaces.

User intervention is required for authentication, provider security verification, account access problems, unavailable provider modes, rate limits, or manual browser repair after a disconnected session.

Recovery should never pretend that an invalid page is valid. If a provider is unavailable or the session is not usable, Maestriss should fail clearly.

## Authentication

Maestriss assumes persistent authenticated sessions. Authentication is performed by the user in the browser and preserved by the persistent profile.

Manual initial login is the correct authentication model. Users authenticate directly with each provider in the browser. This keeps credentials outside Maestriss and respects provider-specific login flows, multi-factor authentication, account selection, and security policies.

Persistent profiles preserve login state. Once a user has authenticated, the browser profile stores the provider session. Maestriss can then reuse that session across requests.

Provider-specific authentication remains provider-specific. Each provider may show different login pages, account prompts, security checks, or expired-session behavior. Drivers and inspection tooling should detect these states when possible and surface them clearly.

Session reuse is essential for practical operation. Without reuse, every request could encounter authentication barriers. Persistent sessions allow Maestriss to focus on orchestration rather than credential management.

Credentials are not managed by Maestriss. The framework should not store provider passwords, automate credential entry, or attempt to bypass provider security. Authentication remains a browser-session concern controlled by the user.

## Session Integrity

Session integrity means that a participant tab still represents a usable provider session.

The framework and drivers determine session integrity through observable signals: current URL, provider mode, page title, visible login forms, composer availability, provider shell presence, expected conversation surface, and absence of blocking security or onboarding screens.

Unexpected redirects can indicate loss of session integrity. A provider may redirect to login, account selection, a marketing page, an ordinary search page, or an unavailable-mode page. Drivers must verify that the expected surface is active before submitting prompts.

Login pages indicate that manual authentication is required. The framework should not proceed with prompt submission on login screens.

Expired sessions may appear as login prompts, error banners, disabled composers, or redirects. Drivers should fail clearly when they can detect these states.

Provider splash screens and onboarding screens may block the real composer. If they can be safely dismissed, a driver may do so. If not, the failure should be reported with diagnostics.

Recovery expectations are conservative. The framework may navigate a tab back to the preferred participant URL when safe. It should not assume that navigation restored session integrity. Drivers must still verify readiness.

## Browser Diagnostics

Browser-level diagnostics explain the state of the browser and participant tabs independently from provider-specific driver behavior.

Startup logs should report CDP connection attempts, browser connection success, participant loading, blank tab cleanup, and participant tab count.

Participant discovery logs should identify whether a participant tab was reused or opened. These logs show whether the framework selected an existing page or created a new one.

Tab reuse logs make request behavior understandable. A sequence such as "Opening Google...", "Reusing Google...", and "Brought Google tab to front" tells the user exactly what the browser layer did before driver interaction began.

Focus event logs confirm that the active participant tab was brought forward. Focus failures should be warnings rather than ask-breaking errors because focusing is useful UI behavior but not always essential to request execution.

Navigation logs should identify important provider target URLs, fallback URLs, redirects, or mode checks when those operations are part of participant resolution or readiness.

Connection logs report whether the runner is connected to the browser, which browser mode, browser channel, or CDP endpoint is being used, and whether the server is listening.

Browser diagnostics are separate from driver diagnostics because they answer different questions. Browser diagnostics explain tab and session management. Driver diagnostics explain provider-specific interaction inside a page. Keeping them distinct makes failures easier to locate.

## Future Browser Support

The browser architecture should allow future expansion without changing the participant driver contract.

Microsoft Edge is already selectable as a Chromium-family browser channel through runner options, and other Chromium variants may be supportable through the same Playwright and CDP-oriented abstraction. Browser channel selection should remain a runner or browser-manager concern, not a driver concern.

Remote browsers may be supported through CDP endpoints. The same architecture can apply if the runner connects to a browser running elsewhere, provided the browser exposes the required control and session behavior. The current local runner already accepts a CDP endpoint, but distributed remote-browser operation remains future work.

Headless execution may be possible for some workflows, but it must preserve the same lifecycle guarantees. Headless mode should not weaken diagnostics, readiness checks, response detection, or session integrity. Because Maestriss values user visibility, headed operation remains central to the current experience.

Playwright abstraction should continue to shield drivers from low-level browser connection details. Drivers should receive page objects and operate provider surfaces. They should not need to know whether the page came from local Chrome, Edge, a remote CDP endpoint, or another compatible Chromium environment.

Future browser support should preserve persistent sessions, shared browser connection, participant tab reuse, active tab focus when available, conservative cleanup, and diagnostic artifact capture. These are architectural principles, not incidental implementation details.

## Browser Management Principles

The browser is shared infrastructure.

Drivers operate pages; they do not own browser lifecycle.

The browser should remain open across requests.

Persistent profiles preserve authentication and provider state.

Each participant should have one long-lived tab when possible.

Existing participant tabs should be reused when safe.

Duplicate participant tabs should be avoided.

Tab discovery must be precise enough to prevent false ownership.

Provider redirects must be verified before interaction.

Opening a page is not the same as readiness.

Active participant focusing is a user experience feature.

Blank tab cleanup must be conservative.

Authentication belongs to the user's browser session, not to Maestriss credential management.

Session integrity must be observed before prompt submission.

Browser diagnostics and driver diagnostics serve different purposes.

Browser recovery should recreate safe framework-owned state and surface user-owned problems clearly.

Future browser support must preserve the existing lifecycle, tab model, and diagnostic standards.
