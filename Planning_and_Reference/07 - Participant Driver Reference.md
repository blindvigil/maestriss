# Participant Driver Reference

## Table of Contents

1. [Purpose](#purpose)
2. [Driver Responsibilities](#driver-responsibilities)
3. [Standard Driver Lifecycle](#standard-driver-lifecycle)
4. [Shared Driver Interface](#shared-driver-interface)
5. [ChatGPT Driver](#chatgpt-driver)
6. [Claude Driver](#claude-driver)
7. [Gemini Driver](#gemini-driver)
8. [Google AI Mode Driver](#google-ai-mode-driver)
9. [DeepSeek Driver](#deepseek-driver)
10. [Grok Driver](#grok-driver)
11. [Copilot Driver](#copilot-driver)
12. [Perplexity Driver](#perplexity-driver)
13. [Reka Driver](#reka-driver)
14. [Shared Submission Strategies](#shared-submission-strategies)
15. [Response Detection Philosophy](#response-detection-philosophy)
16. [Response Cleaning Philosophy](#response-cleaning-philosophy)
17. [Geometry-Based Filtering](#geometry-based-filtering)
18. [Diagnostics](#diagnostics)
19. [Driver Design Rules](#driver-design-rules)
20. [Adding a New Participant](#adding-a-new-participant)
21. [Current Maturity Assessment](#current-maturity-assessment)
22. [Long-Term Vision](#long-term-vision)
23. [Driver Constitution](#driver-constitution)

## Purpose

Participant drivers are the provider-specific automation components that allow Maestriss to operate independent AI systems through a common framework. Each driver translates the standard Maestriss lifecycle into the concrete actions required by one provider's website.

Every supported AI provider offers some form of chat interface, but the similarity is superficial. Providers differ in URL structure, authentication flow, composer implementation, submission controls, response layout, streaming behavior, stop controls, page chrome, source panels, overlays, and failure modes. A driver exists because these details matter.

Maestriss does not rely entirely on generic browser automation because generic automation cannot reliably handle provider-specific behavior. A generic script can look for an editable field and press Enter, but it cannot know whether that field is the correct composer, whether the prompt was accepted, whether the page is in the required mode, whether a stop label is active or historical, or whether a visible text block is the assistant answer rather than a toolbar or prompt echo.

Drivers isolate provider-specific behavior while exposing a common interface to the rest of the system. The runner and server should not need to understand how Claude submits, how Google AI Mode transitions URLs, how Copilot distinguishes personal and work modes, or how Reka dispatches input events. The driver owns those details. The framework calls the same lifecycle methods for every participant.

## Driver Responsibilities

Every participant driver is responsible for provider-specific interaction with its assigned website.

The framework resolves and acquires participant tabs through shared infrastructure, but each driver is responsible for matching the participant it supports and validating that the page it receives is usable for that provider. The driver must not blindly trust that a URL match is enough.

Drivers wait until the page is ready. Readiness includes provider-specific conditions such as expected mode, visible composer, absence of blocking overlays, and authenticated session state. A loaded page is not necessarily a ready page.

Drivers operate under the assumption that authentication is handled by the persistent browser profile. They should detect obvious login or blocking states where possible, but they should not manage credentials.

Drivers handle provider-specific overlays when safe. Some overlays can be dismissed. Others should be reported as blocking conditions. Overlay handling belongs in the driver because each provider presents different modal structures and consequences.

Drivers find the composer. This may be a textarea, input, contenteditable region, role-based textbox, ProseMirror editor, or custom editor. The driver must locate the real active composer, not a hidden or stale field.

Drivers paste prompts and verify the paste. A driver must confirm that the prompt text is present after entry. Prompt entry cannot be assumed merely because a fill, keypress, or paste operation completed.

Drivers submit prompts through provider-appropriate techniques. A driver may use DOM clicks, coordinate clicks, keyboard Enter, Ctrl+Enter, Meta+Enter, pointer events, mouse events, form semantics, or fallback chains. Submission must be verified.

Drivers wait for generation. They observe provider-specific stop controls, responding indicators, generating labels, stability timers, response candidates, and completion signals.

Drivers extract responses. Extraction is candidate-based and provider-specific. The driver must distinguish the answer from prompts, page chrome, history, suggestions, source panels, action buttons, and parent containers.

Drivers clean extracted text. Cleaning removes provider-specific status labels, transient thinking text, accessibility prefixes, UI chrome, prompt echoes, duplicated lines, and attached disclaimers while preserving the assistant's answer.

Drivers provide diagnostics. They should log composer strategy, submit strategy, candidate count, selected candidate, bounding boxes, rejection reasons, response previews, timing, stop state, screenshots, and HTML snapshots where appropriate.

Drivers report failures gracefully. A driver should fail clearly when the composer is missing, paste verification fails, submission cannot be proven, completion times out, the provider UI changes, or extraction cannot identify a valid answer.

These responsibilities remain inside the driver layer because only the driver knows the provider's interface. Shared infrastructure provides the lifecycle and browser context; the driver provides provider knowledge.

## Standard Driver Lifecycle

Every driver participates in the same standard lifecycle.

```text
Locate participant tab
    |
    v
Bring tab to front
    |
    v
waitForReady()
    |
    v
Dismiss provider-specific overlays
    |
    v
Locate composer
    |
    v
pastePrompt()
    |
    v
Verify paste
    |
    v
submitPrompt()
    |
    v
Verify submission
    |
    v
waitForCompletion()
    |
    v
extractResponse()
    |
    v
Clean response
    |
    v
Return response
```

Participant tab location and foregrounding are shared framework responsibilities. The driver begins provider-specific work once it receives the page.

`waitForReady()` ensures the provider page is usable. It may verify load state, mode, authentication surface, composer availability, and absence of blocking UI.

Overlay dismissal may occur during readiness or prompt preparation. It must be provider-specific and conservative.

Composer location finds the actual input surface. The driver records the selector and strategy so failures can be diagnosed.

`pastePrompt()` places text in the composer and verifies it. The driver must not proceed if the prompt is not present.

`submitPrompt()` sends the prompt and verifies the provider accepted it. Submission verification may include composer clearing, user-message appearance, active generation, response candidate changes, or URL changes.

`waitForCompletion()` observes generation until a stable completed response exists and no active provider-specific generating signal remains.

`extractResponse()` discovers, filters, scores, cleans, and returns the assistant answer.

## Shared Driver Interface

Every driver exposes the same conceptual interface to the framework: participant matching, readiness, prompt entry, submission, completion waiting, and response extraction.

Consistency is important because the server can orchestrate all participants without knowing provider internals. The framework should not need separate orchestration branches for every provider.

The rest of Maestriss should never need to know provider-specific implementation details. It should not know which provider uses ProseMirror, which provider needs a coordinate click, which provider uses AI Mode URLs, or which provider emits a specific thinking label. Those details are encapsulated by the driver.

The shared interface allows the framework to support individual asks, chained workflows, random workflows, inspection, cancellation, diagnostics, and response normalization uniformly across participants.

## ChatGPT Driver

The ChatGPT participant uses the typical URL `https://chatgpt.com/`.

Composer discovery searches common editable surfaces such as textareas, contenteditable regions, and role-based textboxes. The driver records the selector and composer strategy when a composer is found.

Submission begins with an enabled send-button strategy where available. Keyboard Enter and event-based Enter fallbacks are available when direct button interaction does not complete the action.

Completion detection uses response stability, composer readiness, and stop-control state. The driver avoids treating an in-progress response as complete while an active stop control remains visible.

Response extraction uses the provider's visible conversation text and filters response content from surrounding UI. It returns normalized participant output when the structured extraction method is available.

Known UI characteristics include contenteditable-style composers, visible send controls, stop controls during generation, and action controls around responses.

Known quirks include the need to verify composer text after input and to avoid relying on a single submission method.

Diagnostics include composer selector, composer strategy, paste verification, submission strategy, completion state, and extraction output.

Current stability is established at the driver lifecycle level with live smoke validation available through exact-answer prompts.

Future considerations include preserving robustness as ChatGPT changes composer structure, message layout, or stop-control behavior.

## Claude Driver

The Claude participant uses the typical URL `https://claude.ai/new`.

Claude uses contenteditable and ProseMirror-style composer surfaces. The driver searches provider-specific composer selectors and verifies pasted prompt text.

Claude submission is coordinate-aware. The driver identifies buttons near the composer, logs composer and button bounding boxes, selects the most likely send control, and verifies submission through composer clearing, generation start, or response changes. Fallbacks include forced coordinate clicks and keyboard strategies.

Claude exposes thinking and responding indicators. The driver distinguishes transient thinking labels from valid response text and removes prefixes such as thought-duration labels or provider accessibility response prefixes.

Completion detection uses shared Claude diagnostics, active stop-control detection, responding-visible state, response length, and stability timing.

Response extraction is candidate-based. It collects visible candidates, cleans transient labels, rejects prompts and page chrome, uses geometry as evidence, and prefers smaller valid child candidates over transcript parents.

Filtering is provider-specific. Claude filtering rejects shell text, transient status text, submitted prompts, and parent containers when a smaller valid child contains the same cleaned answer.

Diagnostics are detailed. The driver logs composer boxes, candidate send buttons, selected submission control, submit verification state, response candidate counts, selected previews, rejected candidates, stop candidates, and responding state.

Lessons learned include that viewport geometry must not be treated as a brittle absolute rule. A valid Claude answer can appear near the left edge in a narrow viewport and still be correct.

Current stability is active and regression-backed. Claude has provider-specific filter assertions for transient labels, prompt rejection, geometry regression, and parent-container rejection.

## Gemini Driver

The Gemini participant uses the typical URL `https://gemini.google.com/app`.

Gemini's conversation layout includes prompt bubbles, assistant response content, provider chrome, action controls, and notebook-related UI. The driver must distinguish the assistant answer from surrounding Google and Gemini interface text.

Composer behavior is contenteditable-oriented. The driver locates the visible composer, verifies pasted prompt text, and submits through the provider's send mechanism.

Submission is verified through prompt acceptance, generation state, and response changes where available.

Notebook UI and Gemini application chrome introduce false-positive risk. Text such as notebook labels, conversation headers, user prompts, and provider disclaimers must be filtered.

Response filtering is provider-specific. Gemini cleaning removes shell text, prompt echoes, provider disclaimers, accessibility prefixes, and thinking or status labels. It accepts short valid answers.

Conversation chrome is a major extraction challenge. The detector gathers candidates, evaluates geometry, rejects sidebars and page containers, and accepts central valid response children.

Known extraction challenges include avoiding prompt bubbles, rejecting parent containers, tolerating central response columns that begin farther left than expected, and avoiding browser-evaluation transformations that introduce unsupported browser-context references.

Diagnostics include response length, stability timing, stop visibility, candidate count, selected preview, geometry, rejected candidate reasons, stop candidates, and debug artifacts when no response is found.

Current stability is regression-backed with dedicated Gemini filter assertions covering chrome rejection, geometry, accessibility prefixes, and valid short answers.

## Google AI Mode Driver

The Google participant uses the typical URL `https://www.google.com/ai`.

The driver requires Google AI Mode, not ordinary Google Search. It recognizes AI Mode through `/ai`, `udm=50`, and visible AI Mode shell evidence. If necessary, it can transition through the AI Mode fallback search URL.

Google AI Mode may change URLs during submission. A request can begin on `/ai` and transition to a `search` URL with `udm=50`. This transition is valid when AI Mode remains active. Ordinary search results must not be treated as AI Mode responses.

Prompt submission supports both the initial AI Mode landing composer and the follow-up composer on an existing AI Mode conversation page. The driver locates textarea-style composers with AI Mode placeholders, verifies prompt text, and submits through a nearby send button or fallback keyboard strategy.

Response extraction uses a dedicated AI Mode detector. It scans visible candidates, cleans provider chrome, rejects ordinary search UI, rejects prompt echoes, handles feedback text, and selects focused answer candidates.

Cleaning removes AI Mode chrome, status labels, search UI, feedback text, disclaimers, prompt echoes, and duplicated lines while preserving short exact answers.

Failure modes include AI Mode unavailable, redirecting to ordinary search, composer not found, submission not accepted, no valid response candidate, and extraction polluted by Google search or feedback UI.

Diagnostics include AI Mode target URL, AI Mode detected state, composer selector, composer strategy, prompt length, paste verification, submit strategy, response length, stable timing, stop visibility, generating visibility, candidate count, selected preview, selected geometry, rejected candidates, screenshots, and HTML artifacts.

Current stability is established for repeated exact-answer smoke tests and supported by provider-specific filter assertions.

## DeepSeek Driver

The DeepSeek participant uses the typical URL `https://chat.deepseek.com/`.

DeepSeek includes overlay handling. The driver detects blocking overlays and dismisses them when appropriate before interaction.

Submission is coordinate-aware. The driver identifies controls near the composer, evaluates button candidates, and uses provider-appropriate click behavior. It verifies submission through composer clearing, generation state, or response changes.

Sidebar history and provider navigation introduce false-positive risk. The detector must reject sidebar history, navigation text, prompt echoes, and provider chrome.

Response detection uses candidate scanning, geometry, stop-control or generating indicators, and provider-specific filtering.

Filtering rejects known DeepSeek chrome, prompt text, controls, sidebars, and non-answer UI while accepting valid response content.

Geometry heuristics help distinguish central response content from navigation and parent containers. As with all providers, geometry is evidence rather than an absolute contract.

Diagnostics include overlay detection, overlay dismissal, composer strategy, candidate buttons, submit state, response candidate previews, rejected candidates, stop state, and debug artifacts.

Current stability is regression-backed through DeepSeek filter assertions and implemented lifecycle diagnostics.

## Grok Driver

The Grok participant uses the typical URL `https://grok.com/`.

Grok includes overlay handling for modal or blocking UI. The driver detects overlays and clears them when safe.

Search overlays can interfere with interaction. The driver must distinguish the real prompt composer from search or modal inputs.

Submission is coordinate-aware and uses provider-specific control discovery. The driver can select controls near the composer and verify submission state.

Generation detection includes stop, loading, thinking, responding, and runtime-state signals where visible. The driver also detects provider runtime errors when they appear in the page.

Capacity detection is part of Grok-specific robustness. Provider capacity or rate-limit messages should be reported as provider failures rather than treated as ordinary responses.

Filtering removes Grok shell text, status labels, prompt echoes, suggestions, upgrade or capacity messaging, and provider chrome.

Diagnostics include overlay state, selected submit controls, coordinate information, runtime or capacity signals, response candidates, selected preview, rejection reasons, and completion timing.

Current stability is active and regression-backed through Grok filtering assertions and driver diagnostics.

## Copilot Driver

The Copilot participant uses the typical URL `https://m365.cloud.microsoft/chat/`.

Copilot may involve Microsoft 365 entry surfaces and related Copilot URLs. The resolver and driver account for valid Copilot surfaces rather than assuming a single simple host.

Personal versus work modes can affect the visible product surface. The driver must operate the active configured surface and avoid confusing unrelated Microsoft pages with the intended Copilot chat.

Splash pages or entry screens may appear before the real composer. The driver readiness and composer discovery logic must handle provider-specific startup surfaces.

Prompt submission uses composer discovery, prompt verification, DOM click near the composer, coordinate-click fallback, and keyboard Enter fallback where appropriate.

Stop detection is provider-specific. Copilot can expose static text that resembles a stop state. The driver counts only active clickable stop controls labeled stop or stop generating and does not treat static "Stopped generating" text as active generation.

Response extraction uses Copilot-specific diagnostics and filtering. It rejects shell text, prompt echoes, static status labels, and parent containers while accepting short valid responses.

Filtering is provider-specific and includes explicit handling of stopped-generation text, shell labels, and prompt rejection.

Diagnostics include composer clearing, generation visibility, submit strategies, coordinate clicks, response length, stability timing, stop candidates, candidate count, selected preview, and extraction output.

Current stability is regression-backed through Copilot filter assertions and implemented stop-control diagnostics.

## Perplexity Driver

The Perplexity participant uses the typical URL `https://www.perplexity.ai/`.

Composer discovery searches common editable surfaces and verifies prompt entry. The driver handles provider-specific overlays that can block submission.

Submission prefers a composer-associated send control when available. If overlays remain or button interaction is blocked, keyboard Enter fallback is used according to provider behavior.

Completion detection uses stop-control state, response stability, candidate diagnostics, and response length. The driver saves debug artifacts when no valid answer appears after waiting.

Extraction separates answer text from Perplexity's source-oriented interface, related content, follow-up surfaces, and controls.

Filtering removes source labels, related prompts, controls, sign-in or upgrade UI, URLs where inappropriate, and other non-answer text.

Diagnostics include overlay detection, composer strategy, paste verification, submit strategy, stop visibility, candidate count, top candidate lengths, selected preview, live debug artifacts, and response-not-found artifacts.

Current stability is active with provider-specific driver diagnostics and filtering behavior.

## Reka Driver

The Reka participant uses the typical URL `https://app.reka.ai/chat?utm_source=copilot.com`.

Reka uses contenteditable and composer-like input surfaces. The driver searches textareas, contenteditable regions, role textboxes, ProseMirror-like editors, and provider-specific composer selectors.

Coordinate submission is central to the Reka driver. The driver identifies the composer box, finds overlapping or adjacent send controls, logs candidate buttons, and uses coordinate mouse clicks when required.

The driver uses a DOM event sequence for prompt entry when necessary. It can dispatch input, change, and composition events to ensure the provider recognizes entered text.

Response detection is candidate-based and provider-specific. The detector considers visible text, composer overlap, sidebars, controls, parent containers, and response candidates.

Filtering removes known Reka chrome, prompt echoes, URLs, controls, and non-answer UI. It preserves valid response text.

Diagnostics are extensive. The driver logs evaluate blocks, composer text, composer boxes, candidate buttons, selected submit control, coordinate click positions, screenshots after coordinate clicks, submit state, response candidate lengths, top previews, rejected candidates, and stop state.

Current stability is active and regression-backed through Reka filtering assertions and detailed driver diagnostics.

## Shared Submission Strategies

Different providers require different submission methods because their websites implement chat input differently.

DOM click is preferred when a real enabled send button can be identified reliably. It is precise and maps well to user intent.

Coordinate click is used when the visible submit control is difficult to target through stable selectors or when provider structure makes DOM selection unreliable. Coordinate clicks require careful bounding-box diagnostics and verification.

Keyboard Enter is useful for providers that submit from the composer using normal chat behavior. It is also a common fallback when button interaction fails.

Ctrl+Enter and Meta+Enter are provider-specific fallbacks for interfaces that use modified keyboard submission or distinguish between new lines and send actions.

Pointer and mouse events may be required when providers rely on event sequences beyond a simple click.

Form submission may be appropriate when the provider uses standard form semantics, but it must be verified like any other strategy.

Fallback chains are ordered from most precise to least invasive. A driver should try the strategy most clearly associated with the provider's visible send control before broader fallbacks.

Submission verification is always required. A click or keypress is not proof that the provider accepted the prompt. The driver must observe composer clearing, user-message appearance, generation start, response change, stop-control appearance, or another provider-specific success signal.

## Response Detection Philosophy

Maestriss determines completion by observing the provider's live state and selected response candidate over time.

Stable text is a core signal. A response should generally remain unchanged for a provider-appropriate stability window before extraction.

Generation indicators are provider-specific. Some providers show stop buttons, some show responding labels, some expose aria-busy or progress indicators, and some only change the response text.

Stop buttons are useful only when active. Static historical labels should not block completion forever.

Response length is useful but not sufficient. Short valid answers must be accepted. Empty or chrome-only candidates must be rejected.

Candidate selection during waiting should match candidate selection during extraction. Waiting for one text and extracting another creates lifecycle inconsistency.

Provider-specific heuristics are necessary because providers stream, stop, and display completion differently.

Completion detection is more difficult than submission because submission is a discrete action while completion is a changing state. The driver must decide when the response has finished, not merely when something appeared.

## Response Cleaning Philosophy

Provider responses require cleaning because raw page text includes application UI.

Navigation, headers, and sidebars must be removed because they are page structure, not assistant output.

History and conversation lists must be rejected because they can contain old prompts, old answers, or generated titles.

Prompt echoes must be rejected because the user's message appears in the same conversation.

Cookie banners, login surfaces, and overlays should not be extracted as answers. They usually indicate readiness or session problems.

Suggestions and follow-up prompts must be rejected because they are not the provider's answer to the submitted prompt.

Marketing, upgrade prompts, capacity messages, and provider splash text must be filtered or reported as provider state.

Conversation chrome such as sources, feedback, copy buttons, share controls, retry controls, and disclaimers must be removed when they are not part of the answer.

The goal is preserving only the assistant's answer. Cleaning should not rewrite, summarize, improve, or reinterpret the response.

## Geometry-Based Filtering

Geometry is essential because AI websites are visual interfaces. Bounding rectangles reveal relationships that selectors often hide.

Bounding rectangles identify where a candidate appears and how large it is. These measurements help separate answer text from sidebars, prompt bubbles, composers, toolbars, and page parents.

Central content is often more likely to be response content than navigation rails or account controls. This is a useful signal, not an absolute rule.

Sidebar exclusion prevents history, settings, and navigation text from being returned as responses.

Parent containers often contain the answer plus unrelated text. Large wrapper rejection protects extraction from transcript-level or page-level candidates.

Candidate ranking uses geometry to prefer focused child answers over giant parents. If a smaller valid child contains the same cleaned answer, the parent should lose.

Geometry often provides more stable signals than CSS class names because providers may redesign markup while preserving visible layout relationships.

Geometry must remain flexible. Viewports change, responsive layouts shift, and valid answers may appear in narrower or more left-aligned regions than expected.

## Diagnostics

Every driver should emit diagnostics that make failures understandable without stepping through code.

The current step should be logged so maintainers know whether the failure occurred during readiness, paste, submit, completion, or extraction.

Candidate count shows whether the detector saw possible answers.

The selected candidate should be logged with preview text and geometry.

Bounding boxes should be logged for composers, buttons, selected candidates, and rejected candidates when geometry affects behavior.

Preview text should be short, readable, and sufficient to identify the candidate.

Reasons for rejection should be explicit. Examples include submitted prompt, known chrome, sidebar container, composer text, parent container, no cleaned text, or smaller valid child.

Submission verification should log which strategy was attempted and what evidence proved or failed to prove submission.

Completion timing should log response length, stable time, stop visibility, responding visibility, generating state, and timeout progress.

Screenshots and HTML snapshots should be saved for failures that cannot be understood from logs alone.

Runtime errors, capacity messages, provider unavailable states, login pages, and mode failures should be surfaced clearly.

## Driver Design Rules

Drivers should own provider-specific behavior.

Drivers should avoid assumptions about unrelated providers.

Drivers should not duplicate shared browser lifecycle, participant resolution, tab focus, request routing, or cancellation logic.

Failures should be informative. A driver should identify the failed stage and preserve diagnostics.

Fallbacks should be ordered from least invasive to most invasive.

Submission should always be verified.

Extraction should prioritize correctness over speed.

Filtering should reject false positives aggressively.

Short valid answers must remain valid.

Geometry should be evidence, not dogma.

Provider quirks should remain isolated unless a shared abstraction is intentionally created.

Every discovered bug should become a regression when practical.

## Adding a New Participant

Adding a new participant begins with research. The maintainer should manually inspect the provider's URL, login behavior, composer, submission mechanism, response layout, stop controls, status labels, overlays, and failure states.

The participant should be registered with a stable identifier, display name, and preferred URL.

A new driver should be created and registered with the driver index. It should implement the standard lifecycle: readiness, prompt paste, submission, completion waiting, response extraction, and structured response return.

Filtering should be implemented as provider-specific logic. If the provider has meaningful chrome, status labels, accessibility prefixes, or geometry behavior, a dedicated filtering module should be created.

Diagnostics should be included from the beginning. A new driver without good diagnostics is difficult to maintain.

Regression tests should be added as soon as provider behavior is understood. At minimum, the provider should have acceptance, rejection, and cleanup cases when nontrivial filtering exists.

Smoke tests should validate the live lifecycle with a simple exact-answer prompt.

Behavior should be documented when the provider introduces new patterns or notable quirks.

Stability should be validated through build verification, provider filter tests, and live smoke testing.

New participants should conform to the existing architecture so that the framework grows by extension rather than redesign.

## Current Maturity Assessment

The following table describes the current maturity of supported participant drivers. These maturity levels describe the engineering posture of the integration rather than a guarantee that external provider pages will never change.

Maturity levels:

- **Established** means the area has a full lifecycle implementation with meaningful diagnostics and regression coverage where applicable.
- **Active** means the area is implemented and operational, with diagnostics present, but continued live validation remains important as the provider evolves.
- **Developing** means the area exists but should be treated as a focus for additional hardening when new failures are observed.

| Participant | Submission | Completion Detection | Extraction | Filtering | Diagnostics | Overall Stability |
| --- | --- | --- | --- | --- | --- | --- |
| ChatGPT | Established | Active | Active | Active | Active | Active |
| Claude | Established | Established | Established | Established | Established | Established |
| Gemini | Established | Established | Established | Established | Established | Established |
| Google AI Mode | Established | Established | Established | Established | Established | Established |
| DeepSeek | Established | Active | Active | Established | Active | Active |
| Grok | Established | Active | Active | Established | Active | Active |
| Copilot | Established | Established | Established | Established | Established | Established |
| Perplexity | Active | Active | Active | Active | Active | Active |
| Reka | Established | Active | Active | Established | Established | Active |

The table should be updated when provider behavior, diagnostics, regression coverage, or live smoke performance materially changes.

## Long-Term Vision

Participant drivers should evolve continuously as providers evolve. No driver should be considered permanently finished. Provider websites change, and Maestriss should convert those changes into stronger drivers, filters, diagnostics, and regressions.

Drivers should become increasingly resilient while remaining isolated from one another. A fix for one provider should not destabilize another. A shared helper should emerge only when multiple providers reveal the same durable pattern.

The long-term goal is a driver set where every participant has clear lifecycle behavior, robust prompt submission, reliable completion detection, precise extraction, provider-specific filtering, useful diagnostics, and regression coverage that captures discovered edge cases.

As Maestriss adds participants, the driver architecture should remain stable. New providers should fit into the existing lifecycle rather than requiring a new orchestration model.

## Driver Constitution

Every participant owns its own driver.

Drivers implement provider-specific behavior behind a common lifecycle.

Shared infrastructure owns browser lifecycle, participant resolution, tab reuse, tab focus, request orchestration, and cancellation.

Drivers must verify readiness before interaction.

Drivers must verify prompt paste.

Drivers must verify submission.

Drivers must wait for provider-specific completion.

Drivers must extract the assistant answer, not page text in general.

Drivers must clean provider chrome without rewriting the answer.

Drivers must reject prompt echoes, sidebars, toolbars, status labels, and false positives.

Drivers must preserve valid short answers.

Drivers must use diagnostics to explain decisions.

Drivers must save artifacts when failures require visual or DOM evidence.

Drivers must keep provider quirks isolated.

Drivers must prefer correctness over speed.

Drivers must convert discovered edge cases into regressions when practical.

New participant implementations must conform to the existing lifecycle and architecture.
