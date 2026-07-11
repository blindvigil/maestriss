---
Document ID: REF-05
Document Title: Response Detection and Filtering Philosophy
Version: v0.2.0
Revision Date: 2026-07-10
Status: Authoritative Reference
Audience: Human
Purpose: Human-oriented edition of the Maestriss engineering reference for Response Detection and Filtering Philosophy.
Scope: Same engineering truth as the corresponding AI edition; optimized for comprehension, rationale, and maintainable human reading.
Related Documents:
  - ../AI/05 - Response Detection and Filtering Philosophy.md
Related Modules: See document body for relevant source paths and modules.
Canonical Concepts Covered: See document body.
Current Implementation Status: See document body; source code remains authoritative for current implemented behavior.
---
# Response Detection and Filtering Philosophy

## Table of Contents

1. [Purpose](#purpose)
2. [The Nature of the Problem](#the-nature-of-the-problem)
3. [Fundamental Philosophy](#fundamental-philosophy)
4. [Candidate Discovery](#candidate-discovery)
5. [Candidate Cleaning](#candidate-cleaning)
6. [Candidate Filtering](#candidate-filtering)
7. [Geometry](#geometry)
8. [Candidate Scoring](#candidate-scoring)
9. [False Positives](#false-positives)
10. [False Negatives](#false-negatives)
11. [Provider Specialization](#provider-specialization)
12. [Waiting Philosophy](#waiting-philosophy)
13. [Diagnostics](#diagnostics)
14. [Regression Philosophy](#regression-philosophy)
15. [Future Evolution](#future-evolution)
16. [Response Detection Constitution](#response-detection-constitution)

## Purpose

Response detection is one of the hardest problems in Maestriss because AI websites are not response APIs. They are dynamic human-facing applications. The answer is visible somewhere on the page, but it is usually surrounded by prompts, navigation, menus, status labels, source panels, feedback controls, disclaimers, suggested follow-ups, old messages, and duplicated parent containers.

Maestriss must determine what the AI actually said. This is a distinct architectural responsibility. It is not enough to submit a prompt and read the page. The framework must observe the page, discover possible response candidates, clean their text, reject non-answers, score valid candidates, wait until the answer is complete, and return only the participant's response.

Response detection deserves its own architectural subsystem because mistakes here directly corrupt the value of the system. A prompt may be submitted correctly. A provider may generate correctly. The browser may behave correctly. But if Maestriss extracts a toolbar label, a prompt echo, a disclaimer, an old answer, or a parent container full of UI text, the request has failed.

Extraction is fundamentally different from submitting prompts. Submission is an action. Extraction is interpretation. Submission can often be verified by observing a cleared composer, a user message, or a generating state. Extraction requires deciding which visible or hidden text among many candidates is the answer. It is a classification problem performed against an unstable external interface.

## The Nature of the Problem

AI websites are difficult to automate because they are optimized for human interaction rather than machine extraction. Their internal structure can change without notice. Their DOM is often deeply nested. Their CSS classes may be generated or obfuscated. Their visible text may be duplicated for accessibility, animation, measurement, or layout.

HTML changes frequently. Providers can rename elements, alter nesting, move response containers, add wrappers, remove attributes, or change role annotations. A selector that works today can fail tomorrow without the visible product looking meaningfully different to a human.

CSS changes frequently. Class names are often unreliable as long-term contracts. Some providers use generated class names. Others change layout classes during redesigns. A detector that depends entirely on CSS classes will eventually become fragile.

Rendering is dynamic. Responses may stream into the page incrementally. Containers may appear before text is complete. Action buttons may render after the response. Disclaimers may appear below or inside response regions. Suggested prompts may be added after completion. The page can look different at different moments during the same response.

Multiple messages may exist simultaneously. A conversation page can contain old prompts, old responses, the current prompt, the current response, follow-up suggestions, and conversation titles derived from earlier prompts. The detector must choose the correct current answer, not merely any plausible answer.

Nested containers complicate extraction. The same answer may appear in a small child element, a message container, a transcript container, and a page-level container. Larger containers often include extra UI text. The best answer is usually the smallest valid candidate, not the largest visible block.

Shadow DOM and custom components can hide ordinary structure. Some providers wrap inputs, buttons, and response content in custom elements or framework-generated components. A detector must be prepared to use visible behavior, geometry, and text evidence rather than relying only on clean semantic markup.

Virtualized content can remove or recycle DOM nodes. Pages may only keep visible portions of a transcript in the DOM. The detector must work with the current visible page state and should not assume that all conversation history is available.

Selector-based extraction alone is insufficient. Selectors are useful for candidate discovery, but they are not enough for correctness. A selector can match prompts, parents, old messages, feedback panels, or unrelated page chrome. Maestriss therefore treats selectors as evidence sources, not final answers.

## Fundamental Philosophy

The first principle of response detection is to observe rather than assume. The detector must look at the live page state and decide based on evidence. It should not assume that a provider's answer is always in the same selector, at the same x-coordinate, or below the same parent. It should observe visible text, geometry, hierarchy, status indicators, and provider-specific markers.

Observation means gathering enough information before deciding. A good detector does not immediately return the first matching element. It collects candidates, cleans them, rejects known non-answers, scores the remaining candidates, and reports its reasoning. This makes the system more resilient and makes failures easier to diagnose.

The second principle is to prefer evidence over selectors. Selectors are still valuable, especially when they identify likely response regions. But a selector is only one signal. A candidate's text, visibility, geometry, relation to the composer, relation to assistant action controls, and cleaned content may be stronger evidence than the selector that found it.

Evidence-based detection survives provider changes better than selector-only detection. If a provider changes class names but the answer remains a visible central text block near assistant controls, a resilient detector can still find it. If a provider moves a response from a paragraph to a span, candidate discovery and scoring can adapt.

The third principle is to prefer the smallest correct answer. Parent containers are attractive because they often contain the answer, but they also contain everything around the answer. They may include prompt echoes, thinking labels, feedback text, source headings, and hidden accessibility text. Smaller valid child candidates usually represent the actual response more accurately.

Smallest correct answer does not mean shortest text blindly wins. It means the detector should prefer focused answer content over broad containers when both contain the same answer. A short toolbar label is not a valid answer. A short exact response can be valid. The distinction comes from cleaning, filtering, prompt rejection, and candidate scoring.

The fourth principle is to treat every provider independently. Providers share broad patterns, but their details differ enough that a universal detector becomes either too permissive or too brittle. Provider-specific filters are not a failure of abstraction. They are an acknowledgement that each provider is a different product.

Provider independence keeps quirks isolated. If one provider emits a static status label that looks like a stop control, that rule should not affect other providers. If another provider prefixes accessible answer text with a provider-specific phrase, that cleanup belongs to that provider's filter.

The fifth principle is to never trust page structure completely. A page may expose useful semantic elements, but the detector should still verify that the selected text is not a prompt, not chrome, not a parent container, and not an old message. Markup is evidence, not authority.

The sixth principle is to prefer resilient heuristics. A resilient heuristic uses several weak signals together rather than one brittle signal alone. Visibility, cleaned text, geometry, hierarchy, prompt comparison, status detection, and provider-specific rejection rules together produce better behavior than any single selector.

The seventh principle is permanent learning through regressions. Every extraction bug teaches the system something. A false positive, false negative, geometry failure, cleaning failure, or status-label confusion should become a regression test when practical. The detector should improve permanently as edge cases are discovered.

## Candidate Discovery

Candidate discovery is the first phase of response detection. Its purpose is to gather possible answer elements from the page before making a final decision.

Discovery uses DOM scanning. A detector searches through provider-specific selectors, semantic elements, message-like containers, markdown or prose regions, article regions, central visible text blocks, and fallback text nodes where appropriate. The exact set of selectors differs by provider.

Only visible elements should normally be considered. Hidden elements often contain duplicate text, accessibility-only labels, stale state, templates, or measurement content. Visibility checks should consider bounding rectangles, display, visibility, and opacity.

Text extraction must be careful. The detector should remove child controls such as buttons, menus, SVGs, toolbars, source cards, feedback controls, hidden nodes, composer fields, and navigation before reading a candidate's text. Otherwise a valid answer container may be polluted by surrounding UI.

Geometry is collected during discovery. Each candidate should carry its bounding rectangle: x, y, width, height, top, bottom, and sometimes area. Geometry becomes important during filtering, scoring, and diagnostics.

Content hierarchy is also important. A candidate may be a child answer node, a message container, a transcript container, or a page-level container. Discovery should not discard parent candidates too early, because parents can provide useful diagnostics. Filtering and scoring decide which candidates are valid.

Discovery intentionally finds many candidates rather than immediately selecting one. This is deliberate. A broad candidate set allows the detector to compare candidates, identify smaller valid children, reject parents with evidence, and log why alternatives were rejected. Immediate selection is fast but fragile.

## Candidate Cleaning

Raw DOM text is almost never correct. It often contains duplicated whitespace, hidden labels, prompt echoes, status text, controls, disclaimers, source headings, feedback labels, and provider-specific accessibility prefixes.

Whitespace normalization is the baseline cleaning step. Browser text can contain irregular spaces, newlines, tabs, and layout-driven breaks. Normalization makes comparison and filtering reliable.

Duplicate removal prevents repeated lines from leaking into final answers. Duplicates often appear because the same text exists in nested containers, accessibility mirrors, or parent and child elements.

Prompt echo removal is required because user prompts frequently appear in the conversation. The submitted prompt is never the assistant response. A detector should compare candidates against the submitted prompt and reject prompt-only candidates.

Status removal eliminates transient or static provider state. Examples include thinking labels, loading labels, generating labels, stopped labels, transcription labels, and responding indicators. Status text may be useful for waiting, but it should not become the response.

UI chrome removal strips navigation, menus, buttons, source labels, feedback controls, account controls, and other application text. Provider-specific chrome lists are necessary because each provider uses different labels.

Streaming cleanup handles partial or transient response text. While a response is streaming, the detector may see incomplete text, thinking labels, or changing containers. Cleaning should preserve valid content while excluding streaming artifacts.

Cleaning happens before scoring because raw text can mislead scoring. A parent container may look large and content-rich before cleaning but become empty afterward. A candidate with a transient prefix may look invalid before cleaning but become valid afterward. Scoring should operate on cleaned response candidates whenever possible.

## Candidate Filtering

Filtering exists to remove candidates that are not assistant responses. It is the main defense against false positives.

Common rejected candidates include navigation, headers, footers, sidebars, buttons, menus, conversation history, conversation lists, toolbars, cookie banners, search overlays, source cards, feedback panels, login screens, marketing content, prompts, and static status text.

Navigation and headers often contain provider names, product tabs, settings, account controls, and search fields. These are page chrome, not responses.

Buttons and toolbars often contain useful-looking words such as copy, share, retry, regenerate, stop, edit, or feedback. These controls should not be returned as response text.

History and conversation lists can contain previous prompts or generated conversation titles. They may resemble answers, but they are not the current participant response.

Cookie banners and overlays can dominate page text. A detector should reject them and surface blocking overlays as readiness or session issues when they prevent interaction.

Search overlays and follow-up suggestion chips can contain natural-language text. They are especially dangerous because they may look like answer content. Filtering must distinguish suggestions from generated responses.

Filtering is provider-specific because providers use different labels, layouts, disclaimers, and status text. A universal chrome list is useful only at the margins. Reliable filtering requires provider-specific knowledge.

Filtering should produce rejection reasons. A candidate rejected as `submitted-prompt-only` is different from one rejected as `known-provider-chrome`, `navigation-container`, `composer`, `button-or-toolbar`, `giant-page-container`, or `smaller-valid-child-exists`. These reasons make failures diagnosable.

## Geometry

Geometry became an important signal because AI websites are visual products. The DOM may be unstable, but visible layout often preserves meaningful relationships: prompts appear in one region, answers in another, composers near the bottom, sidebars along the edge, and action buttons near assistant messages.

Bounding rectangles provide the basic geometry. A candidate's x-position, y-position, width, height, bottom, and area help classify it. These values reveal whether the candidate is a tiny toolbar label, a sidebar, a normal answer block, or a giant page container.

Size matters. Very large containers are often transcript or page parents. Very small candidates may be buttons or isolated labels. But size must be interpreted carefully. A valid short answer can have small height and short text. A valid answer in a narrow viewport may have a width that previously looked suspicious.

Position matters. A candidate in a left navigation rail is less likely to be an answer. A candidate near the composer may be an input or suggested prompt. A candidate in the central conversation column is more likely to be relevant. But position must not be treated as an absolute rule, because responsive layouts and viewport size can shift valid content.

Overlapping regions matter. Candidates inside a composer, button, toolbar, sidebar, header, or footer should generally be rejected. Candidates near assistant action controls may receive positive evidence, depending on the provider.

Parent size and child size matter together. A parent container may contain the same cleaned answer as a smaller child. In that case, the smaller child is usually the correct extraction target. The parent should be rejected because it is less precise.

Geometry often survives UI redesigns better than selectors because visual relationships remain even when class names change. Providers may rename CSS classes, but answers still need to be displayed in readable regions. Geometry helps detect those regions.

Geometry is evidence, not dogma. A candidate should not be rejected merely because it is left-aligned, narrow, wide, short, or near a coordinate that was previously unexpected. Geometry rules must be grounded in stronger evidence such as enormous height, sidebar overlap, composer overlap, or the existence of a smaller valid child.

## Candidate Scoring

Candidate scoring evaluates multiple valid candidates and selects the best response. It is necessary because discovery intentionally gathers many possibilities.

Text quality is a primary signal. A candidate with cleaned answer text is better than one that becomes empty after cleaning. A candidate that matches the submitted prompt should be rejected. A candidate containing only status text should be rejected. A candidate with focused answer text should score higher than one with mixed UI text.

Geometry contributes to scoring. Focused answer-sized elements are preferred over giant page containers. Candidates inside excluded regions lose. Candidates that align with the conversation area may gain evidence. Candidates with a smaller valid child may be rejected as parents.

Visibility is required. Hidden or zero-size elements should not be selected. Visible text is the contract the user can inspect.

Parent-child relationships are central. If a parent and child contain the same cleaned answer, the child is usually the better answer. If a parent contains multiple sections and a child contains only the response, the parent should lose.

Assistant proximity can help. Some providers render action buttons such as copy, retry, share, thumbs up, or feedback near assistant messages. Proximity to these controls can provide positive evidence. This signal is provider-specific and should not override stronger evidence.

Provider heuristics refine scoring. Some providers place prompts on one side and responses on another. Some provide role attributes or test IDs. Some expose answer text through spans, markdown containers, or article-like regions. Scoring should incorporate these signals when they are reliable.

Scoring is preferable to assuming a single selector because no selector remains correct across all provider states. Scoring allows the detector to adapt to layout changes, nested structures, streaming states, and provider-specific quirks while still making a deterministic selection.

## False Positives

False positives occur when the detector returns text that is not the current assistant answer. They are especially dangerous because they can look like successful automation while corrupting the result.

User prompts are common false positives. The submitted prompt appears in the conversation and may be short, central, and visible. Prompt comparison is mandatory.

History items and conversation titles are common false positives. They often contain natural language derived from prompts or previous answers. They should be rejected through region, hierarchy, and provider-specific chrome detection.

Navigation and headers can contain provider names, product modes, or tabs. They are usually visible and stable, but they are not answers.

Cookie banners and modal text can dominate the page and contain complete prose. They should be detected as blocking UI or rejected as chrome.

Status messages such as thinking, loading, searching, responding, stopped, transcribing, or generating can be mistaken for answers. The detector must distinguish active status signals used for waiting from response text used for extraction.

Toolbars and action buttons can contain labels that look meaningful. Copy, retry, regenerate, share, feedback, helpful, and not helpful are controls, not answers.

Marketing content and provider splash screens can appear when a session is not ready. These should be handled as readiness or session-integrity failures, not extracted.

Suggested prompts and follow-up chips are dangerous because they are natural language and often appear near the response. They should be rejected through provider-specific region, geometry, and chrome rules.

False positives are more dangerous than missed detections because they produce wrong answers with apparent success. A missed detection fails visibly and can be diagnosed. A false positive may silently poison a workflow. Maestriss should therefore be conservative when confidence is low.

## False Negatives

False negatives occur when the detector rejects the legitimate response. They are common when assumptions become too strict.

Overly strict geometry can reject valid answers. A response may appear near the left edge in a narrow viewport, have a width that resembles a parent container, or have a very short height. Geometry rules must account for responsive layouts.

Provider redesigns can move answers into new containers. A detector that depends on one selector may miss the new layout. Broad discovery and candidate scoring reduce this risk.

Streaming can cause false negatives if the detector expects complete text too early. During generation, text may be partial, status labels may be present, and response containers may still be changing. Waiting and extraction must coordinate.

Unexpected layouts can expose answers in spans, divs, markdown nodes, accessibility text, or central fallback blocks. Discovery should include enough candidate sources to find visible answers even when the preferred selector fails.

Reducing false negatives without increasing false positives requires layered evidence. The system should expand discovery broadly, then filter carefully. It should clean before rejecting. It should avoid brittle coordinate rules. It should prefer smaller valid children. It should log rejected candidates so false negatives can become regressions.

## Provider Specialization

Every provider has its own filtering rules because every provider has its own interface and failure modes.

ChatGPT has its own composer behavior, message layout, response structure, and action controls. Its detector must distinguish generated responses from prompt text, controls, and conversation chrome.

Claude has provider-specific thinking labels, accessibility phrasing, composer behavior, and geometry edge cases. Its filtering must strip transient thinking prefixes and preserve short valid answers even in narrow layouts.

DeepSeek has its own readiness behavior, response containers, controls, and status labels. Its detector must respect the provider's layout rather than inheriting assumptions from other drivers.

Gemini has distinct conversation text, provider chrome, accessibility labels, and geometry behavior. Its detector must reject shell text and prompt bubbles while accepting valid central response candidates.

Google AI Mode has search-mode URLs, AI Mode state, response blocks mixed with search-like UI, status labels, feedback text, and follow-up composers. Its detector must preserve AI Mode integrity and avoid extracting ordinary search content or suggestion text.

Grok has its own response layout, thinking/status behavior, and page controls. Its detector must treat those behaviors as provider-specific evidence.

Copilot has static status labels that can resemble active controls. Its detector must distinguish static completion text from active stop controls and must avoid treating provider chrome as responses.

Perplexity includes answer text, source-oriented UI, citations, related content, and follow-up surfaces. Its detector must separate the answer from research interface elements.

Reka has its own composer, response containers, controls, and extraction rules. Its driver and filters preserve knowledge specific to that product surface.

A universal detector was intentionally abandoned because provider differences are too significant. Shared principles exist, but universal extraction logic becomes either too broad to be safe or too narrow to be useful. Maestriss instead uses a shared philosophy with provider-specific implementations.

## Waiting Philosophy

Waiting and extraction are linked. `waitForCompletion()` must know whether a response is present and whether it is still changing. `extractResponse()` must use the same response detection logic so that the text waited on is the text returned.

Streaming responses require stability timers. A provider may display partial text long before generation is complete. The detector should observe the selected cleaned response over time and require it to remain unchanged for a provider-appropriate duration.

Generation indicators are provider-specific. Some providers expose stop buttons. Some expose responding labels. Some expose progress bars, aria-busy elements, loading indicators, or streaming attributes. These signals must be interpreted in provider context.

Stop buttons are useful only when active. Static text that says generation has stopped is not an active stop control. A detector should count visible enabled controls labeled stop or stop generating, not historical text or inactive labels.

Provider-specific completion signals matter. Some providers clear the composer. Some show action buttons after completion. Some remove a stop control. Some show a ready message. Some simply stabilize response text. The driver should combine these signals thoughtfully.

Completion and extraction should share detection logic because separate detectors drift. If waiting uses one detector and extraction uses another, the system can wait for one text and return another. A shared detector keeps lifecycle behavior coherent.

False completion is a major risk. The driver must not declare completion because no stop control is visible if no valid response exists. It must not complete on a prompt echo or status label. It must not ignore active generation indicators.

## Diagnostics

Diagnostics are essential architecture. Response detection without diagnostics is guesswork.

Candidate previews show what text the detector considered. They make it possible to see whether the answer was absent, rejected, polluted with chrome, or present but outscored.

Geometry dumps show where candidates appeared. A log such as `x=300 y=198 width=79 height=20` is often enough to identify a visible answer block, prompt bubble, sidebar item, or parent container.

Rejection reasons explain detector decisions. They should distinguish submitted prompts, known chrome, empty-after-clean candidates, navigation containers, button or toolbar text, composer text, giant parents, and smaller valid child cases.

The selected candidate must be logged. A selected preview, cleaned response length, raw length, and geometry provide direct evidence of what the system returned.

Screenshots capture the human-visible state. They are vital when the answer is visible but extraction fails, or when the provider is on an unexpected surface.

HTML capture preserves the DOM. It enables later inspection of selectors, nested structure, hidden text, accessibility attributes, and provider-specific markup.

Response length and stable timers help explain waiting behavior. They show whether text was present, changing, stable, or blocked by active generation indicators.

Diagnostics are not debugging extras. They are part of the response detection subsystem. They make live failures actionable and allow future engineers to convert failures into regressions.

## Regression Philosophy

Every filtering bug should permanently improve the detector. If a real response is rejected, the system should learn why. If a false positive is returned, the system should learn how to reject it. If a provider changes geometry, the system should preserve the lesson.

Provider-specific regression tests preserve provider-specific knowledge. A status label discovered in one provider should be tested in that provider's filter. A geometry edge case from another provider should be captured there.

Cleaning regressions ensure that valid answer text survives noise. Examples include stripping thinking prefixes, removing accessibility prefixes, trimming provider disclaimers, and preserving valid short answers.

Candidate regressions ensure that known non-answers are rejected. Examples include prompts, history labels, source headings, feedback controls, suggested prompts, status labels, and shell text.

Geometry regressions ensure that layout assumptions remain correct. If a valid answer appears at a narrow width, near the left edge, or inside a previously unexpected container, that should become a test. If a giant parent contains the same answer as a smaller child, the parent should lose.

Discovered edge cases become permanent knowledge. The codebase should not rely on memory, comments alone, or one-off fixes. Regression tests make provider behavior part of the system's durable architecture.

## Future Evolution

Response detection should evolve incrementally. New heuristics should strengthen the system without making it brittle. A heuristic should be added because diagnostics revealed a real pattern, not because it seems clever in isolation.

Improvements should be measurable. A change should make a known failure pass, reduce a known false positive, improve diagnostics, or generalize a pattern safely. When practical, the improvement should include a regression.

The system should continue to separate shared philosophy from provider-specific implementation. Shared concepts such as candidate discovery, cleaning, filtering, geometry, scoring, stability, and diagnostics should guide all drivers. Provider-specific rules should remain isolated.

New browser capabilities may improve detection. Better accessibility inspection, visual region detection, or richer artifact analysis may eventually provide stronger evidence. These improvements should complement the existing architecture rather than replacing its core principles.

Future detectors should remain explainable. A more advanced detector is only useful if it can still report what it saw, what it selected, what it rejected, and why.

## Response Detection Constitution

The response is what the participant said, not what the page contains.

Selectors discover candidates; they do not prove answers.

Observe the live page before deciding.

Prefer evidence over assumptions.

Clean before scoring.

Reject the submitted prompt.

Reject provider chrome.

Reject status text as response text.

Do not confuse active generation controls with static historical labels.

Prefer the smallest correct answer over larger parent containers.

Use geometry as evidence, not as dogma.

Visible focused answer text is stronger evidence than broad page text.

Every provider needs provider-specific filtering.

Universal response extraction is not the architecture.

Waiting and extraction must share detection logic.

False positives are more dangerous than missed detections.

False negatives should become regressions.

Diagnostics are part of the detector, not an afterthought.

Every discovered edge case should become permanent knowledge.

Future improvements must remain explainable, measurable, and maintainable.
