---
Document ID: REF-14
Document Title: Operational Runbook
Version: v0.2.0
Revision Date: 2026-07-10
Status: Authoritative Reference
Audience: AI
Purpose: AI-optimized edition of the Maestriss engineering reference for Operational Runbook.
Scope: Same engineering truth as the corresponding Human edition; optimized for deterministic interpretation, retrieval, and machine reasoning.
Related Documents:
  - ../Human/14 - Operational Runbook.md
Related Modules: See Canonical Source Content and referenced source paths.
Canonical Concepts Covered: Same as the Human edition.
Current Implementation Status: See Canonical Source Content; source code remains authoritative for current implemented behavior.
---
# Operational Runbook

## AI Edition Contract

| Field | Value |
| --- | --- |
| Canonical Document ID | REF-14 |
| Canonical Title | Operational Runbook |
| Companion Human Edition | ../Human/14 - Operational Runbook.md |
| Authority Level | Authoritative reference for architecture, terminology, philosophy, operations, and documented status. |
| Source-of-Truth Rule | Source code is authoritative for current implemented behavior. Reference documents are authoritative for architecture, terminology, and intended design. |
| Equivalence Rule | This AI edition and the companion Human edition SHALL communicate the same engineering truth. Presentation may differ; facts must not differ. |
| Interpretation Mode | Deterministic, explicit, retrieval-oriented, and machine-reasonable. |

## Semantic Tags

Use these tags when interpreting statements in this document:

| Tag | Meaning |
| --- | --- |
| CURRENT | Describes behavior or structure implemented in the repository at the documented revision. |
| VERIFIED | Describes behavior validated by source inspection, build output, tests, or committed audit evidence. |
| PLANNED | Describes intended architecture or work not yet implemented. |
| FUTURE | Describes long-term direction or possibility, not a current requirement. |
| HISTORICAL | Describes project history, milestone context, or prior decision rationale. |
| NORMATIVE | Defines a rule, invariant, standard, or required project practice. |
| INFORMATIVE | Explains motivation, rationale, examples, or commentary. |

## AI Reading Rules

1. Treat the companion Human edition as semantically equivalent.
2. Do not infer implemented behavior from aspirational or future-oriented language.
3. Verify current behavior against source files before modifying code.
4. Preserve provider-specific boundaries: server owns orchestration; drivers own provider behavior.
5. Preserve documentation boundaries: Reference is authoritative for design; Reviews are dated audits; Handoffs are milestone snapshots.
6. Report doc-vs-code conflicts explicitly.
7. Do not collapse CURRENT, PLANNED, FUTURE, HISTORICAL, NORMATIVE, and INFORMATIVE statements into one category.

## Canonical Source Content

The following source content is the canonical knowledge body for this document. It is preserved from the Human edition to maintain exact semantic equivalence. Use the metadata, semantic tags, and AI reading rules above to interpret it deterministically.
# Operational Runbook

## Table of Contents

1. [Purpose](#purpose)
2. [Intended Audience](#intended-audience)
3. [System Overview](#system-overview)
4. [Directory Structure](#directory-structure)
5. [Installation](#installation)
6. [Initial Configuration](#initial-configuration)
7. [Chrome Configuration](#chrome-configuration)
8. [Starting Maestriss](#starting-maestriss)
9. [Normal Daily Workflow](#normal-daily-workflow)
10. [Restart Procedures](#restart-procedures)
11. [Smoke Testing](#smoke-testing)
12. [Regression Testing](#regression-testing)
13. [Operational Monitoring](#operational-monitoring)
14. [Diagnostics](#diagnostics)
15. [Troubleshooting Guide](#troubleshooting-guide)
16. [Common Recovery Procedures](#common-recovery-procedures)
17. [Provider Maintenance](#provider-maintenance)
18. [Updating Dependencies](#updating-dependencies)
19. [Backup Strategy](#backup-strategy)
20. [Disaster Recovery](#disaster-recovery)
21. [Performance Monitoring](#performance-monitoring)
22. [Security Considerations](#security-considerations)
23. [Release Checklist](#release-checklist)
24. [Maintenance Schedule](#maintenance-schedule)
25. [Operational Best Practices](#operational-best-practices)
26. [Frequently Asked Questions](#frequently-asked-questions)
27. [Future Operations](#future-operations)
28. [Runbook Constitution](#runbook-constitution)

## Purpose

This document is the operational handbook for Maestriss. It exists so a competent engineer can install, configure, operate, maintain, recover, troubleshoot, and extend the project without relying on tribal knowledge.

Maestriss combines a graphical Studio application, a native runner, browser automation, persistent provider sessions, participant drivers, response filtering, diagnostics, and regression tests. Operating the system successfully requires understanding how these parts behave together at runtime.

This runbook complements the architectural reference documents. The architecture documents explain why the system is designed as it is. This document explains how to operate that system safely and consistently.

The runbook is intended to be updated as operational practices mature. When a recovery procedure, smoke test, dependency update process, or troubleshooting pattern changes, this document should change with it.

## Intended Audience

This document is for developers, system administrators, future maintainers, AI assistants, and project successors responsible for running or maintaining Maestriss.

Readers are expected to understand basic command-line usage, Node-based development, browser concepts, Git, and general software troubleshooting. They do not need to know the entire Maestriss codebase before reading this document.

AI assistants working on Maestriss should read this document before performing operational work such as restarting the runner, interpreting smoke test failures, updating dependencies, or modifying driver diagnostics.

## System Overview

Maestriss is composed of several operational components:

```text
Studio UI
   |
   | current: configuration and export surface
   | future: direct runner integration
   v
Runner CLI / Server
   |
   v
Playwright
   |
   v
Chrome DevTools Protocol
   |
   v
Persistent Chrome Profile
   |
   v
Participant Tabs
   |
   v
AI Provider Websites
```

The Studio application is the graphical configuration and monitoring surface. It is built with React, TypeScript, and Vite.

The current Studio application is not yet wired directly into the native runner. It can manage project configuration and export-oriented workflows, while live browser automation is operated through the runner CLI and local runner server. Direct Studio-to-runner execution is a future integration goal, not a current operational dependency.

The Automa exporter is a separate Studio-side output path. It generates browser-automation workflow artifacts from Studio configuration. It is not the same runtime as the native Playwright runner, and operators should not assume that a runner driver change automatically changes exported Automa behavior.

The runner is the native automation service. It exposes commands, starts a local server, connects to Chrome, resolves participants, invokes drivers, and returns responses.

The server is the orchestration layer inside the runner. It handles ask requests, health checks, provider status checks, cancellation, chains, random workflows, and inspection.

Chrome is the persistent browser environment. It contains authenticated provider sessions, participant tabs, provider cookies, local storage, and visible conversations.

Drivers operate individual provider websites. Each participant has provider-specific driver logic for readiness, prompt entry, submission, completion detection, extraction, filtering, and diagnostics.

Reference documents preserve architecture, process, testing philosophy, and operational practices.

## Directory Structure

The repository is organized around Studio, runner, documentation, diagnostics, and configuration.

`runner/` contains the native runner, participant drivers, filtering modules, regression assertions, browser automation, server logic, and runner package configuration.

`runner/src/drivers/` contains provider-specific drivers and provider-specific filtering helpers. Driver code belongs here when it interacts with provider websites.

`runner/debug/` contains runtime diagnostic artifacts such as screenshots and HTML dumps. These files are operational evidence and may be cleaned periodically after they are no longer needed.

`Documentation/Reference/` contains the permanent reference documents and this operational runbook. These documents should be treated as project knowledge, not disposable notes. `Documentation/Reviews/` contains historical audits, reconciliations, and other working documents that are valuable historically but are not authoritative reference material. `Documentation/Handoffs/` contains dated milestone state transfers.

**Onboarding note:** New maintainers should start with `Documentation/Reference/Human/Start_Here.md`. Web AI commander sessions should start with `Documentation/Reference/AI/AI_Prompt.md`, then continue to `Documentation/Reference/AI/AI_Bootstrap.md` and `Documentation/Reference/AI/Start_Here.md`. VS Code or repository-attached engineer AI sessions should start with `Documentation/Reference/AI/VSCode_AI_Prompt.md`, then continue to `Documentation/Reference/AI/VSCode_AI_Bootstrap.md` and `Documentation/Reference/AI/Start_Here.md`. All readers should read the most recent milestone handoff in `Documentation/Handoffs/` for current project state before using this runbook for specific procedures.

`src/` contains the Maestriss Studio React application source.

`dist/` contains built Studio output when generated.

`node_modules/` contains installed dependencies and should be recreated through package installation rather than manually edited.

Configuration currently lives primarily in package scripts, runner options, participant metadata, browser profile configuration, and provider session state. As configuration expands, it should remain documented in this runbook and relevant architecture references.

## Installation

A new installation requires Node.js, npm, TypeScript tooling through project dependencies, Playwright, Chrome, and the Maestriss repository.

Install a current supported Node.js version suitable for the project dependencies. npm is used for dependency installation and script execution.

Clone or copy the repository to the target development directory.

Install dependencies at the repository root:

```text
npm install
```

Install runner dependencies if needed from the runner directory:

```text
cd runner
npm install
npx playwright install chromium
```

Chrome is required for the CDP-attached workflow used by `restart-runner.ps1`. The runner can also launch a Playwright-managed persistent Chromium profile when started without `--connect-cdp`; that default mode requires Playwright's Chromium browser to be installed through `npx playwright install chromium`.

Verify the Studio build from the repository root:

```text
npm run build
```

Verify the runner build:

```text
cd runner
npm run build
```

A successful installation has dependencies installed, builds passing, Chrome available, and the runner able to start and connect to Chrome.

## Initial Configuration

Initial configuration establishes the browser profile, provider sessions, and participant tabs.

Use a dedicated browser profile for Maestriss. The profile preserves cookies, authentication, provider sessions, and browser settings without mixing them with unrelated browsing.

There are two supported browser execution modes:

- **CDP mode:** `restart-runner.ps1` starts installed Chrome with remote debugging on port `9222` and profile `%LOCALAPPDATA%\MaestrissChromeProfile`, then starts the runner with `--connect-cdp http://127.0.0.1:9222`.
- **Persistent-profile mode:** `npm run dev -- serve` from `runner/` launches a Playwright-managed persistent Chromium context using `runner/.user-data`.

These modes use different profiles. Provider logins established in one profile do not automatically appear in the other.

When using CDP mode, start Chrome with remote debugging enabled. The runner connects to Chrome through the configured CDP endpoint.

Log in manually to each provider in the Maestriss Chrome profile. Maestriss does not manage provider credentials. Authentication remains a user-controlled browser session activity.

Open or allow the runner to open participant tabs for all configured providers. Each participant should have one long-lived tab when possible.

Environment variables should be documented whenever introduced. Provider authentication secrets should not be stored in repository files.

Participant metadata should remain explicit and version-controlled. URL changes should be treated as driver or participant configuration changes and validated with smoke tests.

Recommended configuration practice is to keep browser state persistent, project configuration explicit, and secrets outside the repository.

## Chrome Configuration

Chrome should be configured as a persistent, controllable browser workspace.

Use a dedicated profile. This prevents Maestriss automation from interfering with unrelated personal browsing state and preserves provider sessions between runs.

Enable remote debugging on a known port. The runner connects to this port over CDP.

The standard CDP endpoint is `http://127.0.0.1:9222`.

Preserve sessions. Cookies, local storage, and provider settings should remain intact across restarts.

Use restore suppression where practical. Browser restore prompts and crash bubbles can interfere with startup and participant discovery.

Startup flags should reduce first-run friction, default-browser prompts, crash-restore prompts, and startup blank tabs.

Browser updates should be applied deliberately. Chrome updates can change automation behavior, rendering, or security prompts. After browser updates, run smoke tests and review provider readiness.

Security matters. The Chrome profile contains authenticated provider sessions and should be treated as sensitive local state.

## Starting Maestriss

Normal startup begins with Chrome and then starts the runner server.

The restart script provides the standard watched development startup path:

```text
cd runner
.\restart-runner.ps1
```

The script clears the terminal, stops stale Maestriss runner Node processes, closes Chrome, force-kills remaining `chrome.exe` processes if they do not exit, patches the dedicated Chrome profile's Preferences file to suppress crash-restore prompts, starts Chrome with CDP on port `9222`, waits briefly, and starts the runner server connected to Chrome.

Because the script force-kills remaining `chrome.exe` processes, it can close unrelated personal Chrome windows. Operators should use the dedicated Maestriss Chrome profile and avoid keeping unrelated Chrome work open when running the full restart script.

Expected successful startup includes logs similar to:

```text
Starting Chrome (CDP)
Starting Maestriss Runner
Connecting to existing browser over CDP
Browser connected via CDP
Maestriss Runner listening on http://127.0.0.1:4137
Browser connected
Participant tab count: 9
```

After startup, verify health:

```text
cd runner
npm run dev -- health
```

Verify that the expected participant tabs exist and that the browser is visible and usable.

Successful CDP-mode startup means the runner is listening, CDP is connected, participant tabs are present, and health output reports a connected browser.

The local runner server listens on `http://127.0.0.1:4137`. Health output reports the browser mode, browser channel, whether the browser connection is currently usable, active tab focusing state, matched participant tab count, and active ask request identifiers.

## Normal Daily Workflow

A normal development day should follow a consistent operational flow.

Start the runner and browser using the standard restart procedure.

Verify runner health.

Be prepared for manual provider security verification. If a participant shows a security or human-verification page, the runner may pause and wait for confirmation in the runner terminal before continuing. Resolve the browser challenge manually, then press Enter in the runner terminal when prompted.

Run targeted smoke tests for any provider affected by recent work.

Develop in small increments.

Run filter tests or regression tests relevant to the change.

Run the runner build after TypeScript changes.

Review logs after live smoke tests. A passing response should still be checked for correct lifecycle behavior.

Commit coherent work after validation.

Shut down only when the browser and runner are no longer needed. The browser profile should remain intact.

Consistency improves reliability because it reduces unknown state and creates repeatable troubleshooting conditions.

## Restart Procedures

Use a runner restart when code changes affect the server, drivers, participant resolution, or browser interaction and the running server needs to reload code.

Use a Chrome restart when the browser is stale, disconnected, full of invalid tabs, or affected by crash-restore state.

Use a full restart when both runner and Chrome state may be stale. This is the standard recovery path during active driver development.

Use `.\restart-runner.ps1` for the full CDP-mode restart path. Use it deliberately because it closes Chrome processes on the machine before opening the dedicated Maestriss profile.

Use crash recovery when Chrome or the runner terminated unexpectedly. Restart Chrome with the persistent profile, reconnect the runner, and verify participant tabs.

Use stale browser recovery when provider pages stop responding correctly or CDP state appears inconsistent. Restarting Chrome is safer than continuing with uncertain state.

Restarting should preserve the dedicated browser profile. Do not delete the profile unless profile corruption or authentication reset is intentionally being handled.

## Smoke Testing

Routine smoke tests validate the live driver lifecycle.

Use exact-answer prompts:

```text
cd runner
npm run dev -- ask chatgpt "Say exactly: ChatGPT OK"
npm run dev -- ask claude "Say exactly: Claude OK"
npm run dev -- ask gemini "Say exactly: Gemini OK"
npm run dev -- ask google "Say exactly: Google OK"
npm run dev -- ask deepseek "Say exactly: DeepSeek OK"
npm run dev -- ask grok "Say exactly: Grok OK"
npm run dev -- ask copilot "Say exactly: Copilot OK"
npm run dev -- ask perplexity "Say exactly: Perplexity OK"
npm run dev -- ask reka "Say exactly: Reka OK"
```

Expected successful results are exact provider-specific OK responses, with no prompt echo, no provider chrome, and no unrelated page text.

Smoke tests verify navigation or tab reuse, paste, submit, generation, extraction, cleaning, and end-to-end success.

Run smoke tests after driver changes, browser automation changes, provider-specific fixes, Chrome updates, dependency updates, and before release candidates.

## Regression Testing

Regression tests preserve known behavior and discovered bug fixes.

Run provider filter tests after modifying response filtering, candidate selection, geometry logic, status handling, or prompt rejection:

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

Run build verification after TypeScript changes:

```text
cd runner
npm run build
```

Participant tests should be run when a driver changes. Shared infrastructure changes should trigger multiple provider smoke tests.

Regression suites should be executed before commits that change driver behavior, response filtering, diagnostics, or browser lifecycle.

## Operational Monitoring

Operational monitoring is the routine observation of system health.

Runner logs show startup, participant resolution, tab reuse, focus, lifecycle stages, diagnostics, and failures.

Browser state should be inspected visually when developing or troubleshooting. The active participant tab should match the current request.

Driver status can be inferred from smoke tests, provider status checks, logs, and health output.

Participant tabs should remain present and should not multiply unnecessarily.

Health checks should report a connected browser and expected participant count.

`participantCount` is the number of currently matched participant tabs, not the number of participants configured in source code. A configured set of nine participants can report a lower count when tabs are missing or not recognizable.

Performance should be monitored informally through startup time, ask duration, completion time, and repeated retries.

Operators should routinely observe whether the system is failing at browser connection, readiness, paste, submit, wait, extraction, filtering, or response return.

## Diagnostics

Diagnostics are the main operational evidence source.

Runtime logs show current participant, lifecycle stage, URL, composer strategy, submit strategy, response length, stable timers, stop indicators, candidate counts, and failures.

Screenshots capture visible browser state during failures.

HTML dumps capture DOM state and are useful for selector, layout, and hidden-text debugging.

Debug folders contain artifacts produced by drivers and shared failure handlers.

Geometry diagnostics record bounding boxes, coordinates, dimensions, candidate location, and selected target position.

Candidate rankings show selected candidates, rejected candidates, previews, and rejection reasons.

Use diagnostics to identify the failed lifecycle stage before changing code.

## Troubleshooting Guide

Troubleshooting should proceed from broad system state to specific driver behavior.

### Runner Won't Start

Check that dependencies are installed. Run the runner build. Verify the command is executed from `runner/`. Check whether another process already owns the server port.

### Browser Won't Connect

Verify Chrome is running with remote debugging enabled. Confirm the CDP endpoint is correct. Restart Chrome and runner using the standard restart procedure.

For CDP mode, confirm Chrome was launched with `--remote-debugging-port=9222` and the runner was started with `--connect-cdp http://127.0.0.1:9222`. For persistent-profile mode, confirm Playwright Chromium is installed.

### Participant Missing

Check participant tab count. Inspect browser tabs. Verify participant metadata. Reopen missing participant tabs through runner startup or an ask request.

### Authentication Expired

Bring the provider tab forward and log in manually. Do not attempt to automate credentials. Restart the request after authentication is restored.

### Composer Not Found

Inspect screenshot and HTML artifacts. Check whether the page is logged in, blocked by an overlay, in the wrong mode, or redesigned. Review editable candidate counts and composer selectors.

### Paste Failure

Review composer strategy and composer text after paste. Confirm the prompt was entered into the correct field. Check for stale composers, overlays, or provider event requirements.

### Submit Failure

Review selected submit control, click coordinates, fallback attempts, composer clearing, generation state, and response changes. Confirm the send control was enabled and near the composer.

### Completion Timeout

Review response length, stable timers, stop indicators, generating indicators, and candidate previews. Determine whether generation continued, the answer was present but rejected, or submission never started.

If the runner appears to hang before readiness, check the runner terminal for a manual security-verification prompt. HTTP clients cannot answer that prompt; the operator must use the terminal attached to the runner process.

### Extraction Failure

Inspect candidate dumps, selected preview, rejected candidates, geometry, raw text, cleaned text, screenshot, and HTML. Determine whether the answer was absent, rejected, polluted with chrome, or outscored by a false positive.

### Filtering Failure

Compare raw candidate text to cleaned text. Add or update provider-specific filter regressions. Avoid changing unrelated providers.

### Regression Failure

Identify whether the test reflects desired behavior. If yes, fix the code. If the intended behavior changed, update the test with a clear reason.

### Build Failure

Read the TypeScript error. Fix structural issues before live testing. Build failure must be resolved before treating runtime behavior as valid.

## Common Recovery Procedures

Restart the runner when code changes are not reflected or the server state is stale.

Restart Chrome when CDP is disconnected, tabs are crashed, the browser is unresponsive, or startup state is polluted.

Reconnect CDP by restarting the runner after confirming Chrome is running with the expected remote debugging port.

Reopen a participant by closing invalid duplicate tabs and allowing the runner to open the configured participant URL.

Refresh authentication by manually logging in through the provider tab.

Clear stale tabs conservatively. Close only tabs that are clearly duplicate, blank, crashed, or unrelated to active work.

Rebuild the project after dependency changes, TypeScript changes, or unexplained runtime behavior that may be caused by stale output.

Restore the profile only when the Chrome profile is corrupted or intentionally being reset. Profile restoration may require manual provider login.

## Provider Maintenance

Participant accounts require ongoing maintenance.

Authentication should be checked periodically. Providers may expire sessions or request reauthentication.

Cookies and local storage should be preserved unless intentionally resetting a provider session.

Session expiration should be handled through manual login and documented if it affects workflows.

Provider UI updates should be expected. When a UI changes, use diagnostics to update the relevant driver and regression tests.

Rate limits and capacity constraints should be treated as provider state. They should be logged and surfaced clearly.

Terms of service awareness matters. Maestriss operates provider web interfaces through user sessions. Operators should use the system responsibly and in accordance with provider terms.

## Updating Dependencies

Dependency updates should be deliberate.

Update Node only after confirming project compatibility.

Update Playwright carefully because browser automation behavior can change. Run build verification and smoke tests after updates.

Update Chrome deliberately. Chrome changes can affect CDP, rendering, input behavior, and provider session state.

Update packages through npm and review package lock changes.

Update TypeScript with build verification and attention to stricter type checks.

After dependency updates, run:

```text
cd runner
npm run build
npm run test:claude-filter
npm run test:gemini-filter
npm run test:google-filter
```

Then run targeted smoke tests for affected providers. Broader smoke testing is recommended after Playwright or Chrome updates.

## Backup Strategy

Backups should protect source code, documentation, configuration, and browser session state.

The repository should be backed up through Git and remote storage.

The `Documentation/` directory should be treated as critical project knowledge and included in repository backups.

Configuration files should be versioned when safe and excluded when they contain secrets.

Prompt libraries and regression tests should be backed up because they represent institutional knowledge.

The Chrome profile may be backed up periodically if preserving authenticated sessions is operationally important. Treat profile backups as sensitive because they may contain authenticated session data.

Backup frequency should match the pace of development. During active development, repository changes should be committed and pushed frequently. Profile backups can be less frequent and should be handled securely.

## Disaster Recovery

If the workstation is lost, recover the repository from Git or backup, reinstall dependencies, reinstall Chrome, recreate or restore the Chrome profile, and manually authenticate providers.

If the profile is corrupted, create a new dedicated profile and repeat provider logins. Run smoke tests after authentication is restored.

If the repository is lost, restore from remote Git or backup. Verify the Documentation/Reference documents, runner, Studio, tests, and package lock files are present.

If the browser is corrupted, reinstall or reset Chrome, recreate the dedicated profile, and reconnect the runner.

If authentication is lost, manually log in to each provider. Do not attempt to recover or automate credentials from Maestriss.

Recovery priorities are: source code, documentation, configuration, tests, browser profile, provider authentication, smoke validation.

## Performance Monitoring

Useful operational metrics include driver success rate, average completion time, browser startup time, smoke test success, regression status, and participant health.

Driver success rate reveals which providers need hardening.

Average completion time reveals provider latency, wait-loop inefficiency, or network problems.

Browser startup time reveals Chrome or profile problems.

Smoke test success is the fastest practical signal of end-to-end health.

Regression status shows whether known behavior remains protected.

Participant health reveals authentication, tab, and readiness problems.

Trends matter more than isolated measurements. Repeated slowdowns, rising retries, or frequent provider failures indicate maintenance priorities.

## Security Considerations

Credentials should not be stored in the repository.

Browser profiles contain sensitive session state. Protect them as authenticated user data.

Local storage and cookies may contain provider session tokens. Do not publish or share profile directories casually.

Authentication should remain manual and user-controlled.

Repository security matters because scripts and drivers operate an authenticated browser.

Secrets should be kept in environment variables or secure local stores when needed, never hardcoded.

Backups containing browser profiles should be encrypted or otherwise protected.

Operational best practice is to minimize credential handling inside Maestriss and rely on the browser profile for authenticated sessions.

## Release Checklist

Before a release or release-like checkpoint:

- Build passes at the root if Studio changes are included.
- Runner build passes.
- Relevant provider filter tests pass.
- Smoke tests pass for affected providers.
- Broad smoke tests pass when shared infrastructure changed.
- Documentation is updated.
- Development journal is updated.
- Known issues are reviewed.
- Debug artifacts from unrelated failures are cleaned or archived.
- Version or release marker is created if versioning is in use.
- Release notes summarize major features, important fixes, known issues, and operational notes.

Every release should follow a checklist because Maestriss depends on coordinated browser, runner, driver, testing, and documentation behavior.

## Maintenance Schedule

Daily during active development:

- Start runner cleanly.
- Verify health.
- Run targeted smoke tests.
- Review logs for changed behavior.
- Update the development journal after meaningful work.

Weekly:

- Run provider filter tests.
- Run runner build.
- Review known issues.
- Clean old debug artifacts that are no longer needed.

Monthly:

- Run broader smoke tests.
- Review documentation accuracy.
- Review technical debt.
- Check provider authentication health.

Quarterly:

- Review dependencies.
- Review browser and Chrome profile health.
- Review architecture references for drift.
- Review regression coverage gaps.

Annual:

- Review long-term roadmap.
- Reassess provider list and driver maturity.
- Review security and backup practices.

Preventative maintenance matters because provider automation decays when ignored.

## Operational Best Practices

Keep browser sessions healthy.

Never ignore failing smoke tests.

Document difficult bugs.

Prefer small changes.

Run builds frequently.

Keep diagnostics enabled.

Review the development journal before starting work.

Treat documentation as production code.

Use persistent profiles responsibly.

Avoid duplicate participant tabs.

Do not hide provider failures behind silent retries.

Preserve debug artifacts until the issue is understood.

Update regression tests when bugs are fixed.

## Frequently Asked Questions

### Why use browser automation and CDP?

Browser automation allows Maestriss to operate persistent visible provider sessions, enumerate pages, operate tabs, evaluate DOM state, capture screenshots, and preserve provider sessions. CDP mode adds the ability to attach to an externally started Chrome profile, which is the standard restart-script workflow.

### Why keep browser sessions alive?

Persistent sessions preserve authentication, cookies, provider state, conversation continuity, and user visibility. They reduce repeated login and startup friction.

### Why separate drivers?

Each provider has a different web interface, composer, submission behavior, response layout, status signals, and failure modes. Separate drivers isolate provider-specific behavior.

### Why are diagnostics so verbose?

Browser automation failures are difficult to understand without evidence. Detailed diagnostics make failures actionable and reduce debugging time.

### Why keep regression tests?

Regression tests preserve knowledge from past failures. They prevent the system from forgetting provider edge cases.

### Why maintain reference documents?

Reference documents preserve architectural intent, operational practices, lessons learned, and project state. They reduce dependency on memory and chat history.

## Future Operations

Future operations may include cloud execution, distributed orchestration, containerization, remote browser pools, multiple operators, and continuous integration.

Cloud execution could allow Maestriss to run in managed environments, but authentication, browser visibility, provider terms, and security must be addressed carefully.

Distributed orchestration could coordinate multiple runners, profiles, or machines.

Containerization may help with reproducibility, though persistent browser profiles and visible operation require careful design.

Remote browser pools could allow provider sessions to live on dedicated machines.

Multiple operators may require role-based practices, shared run history, and coordination around provider sessions.

Continuous integration can run build and deterministic regression tests. Live provider smoke tests may require separate controlled environments because they depend on browser sessions and provider accounts.

These are future operational improvements, not current requirements.

## Runbook Constitution

Operate Maestriss from evidence, not assumptions.

Keep the browser profile persistent and protected.

Use shared startup and restart procedures.

Verify health before serious work.

Run smoke tests after driver or browser changes.

Run regression tests after filtering or detection changes.

Do not ignore failing diagnostics.

Do not automate credentials.

Preserve user and provider session state.

Avoid duplicate participant tabs.

Prefer recovery procedures that are safe and observable.

Escalate to manual intervention when authentication, security, or provider policy requires it.

Back up source code, documentation, tests, and important configuration.

Treat reference documents as operational assets.

Update this runbook when operating procedures change.

Maestriss should become easier to operate as it becomes more capable.
