# Maestriss Native Runner Proof of Concept

This folder is a standalone Node/TypeScript scaffold for a future Maestriss native runner.

It is not wired into the React app yet. The goal is to explore a Playwright-based execution path without depending on Automa drawflow JSON as the long-term runner format.

## Install

```bash
cd runner
npm install
npx playwright install chromium
```

## Build

```bash
npm run build
```

## Run

Terminal 1 starts the long-running runner service:

```bash
npm run dev -- serve
```

Terminal 2 sends requests to the already-running service:

```bash
npm run dev -- health
npm run dev -- ask chatgpt "test"
npm run dev -- ask google "test"
npm run dev -- ask perplexity "test"
npm run dev -- ask reka "test"
npm run dev -- ask deepseek "test"
npm run dev -- ask grok "test"
npm run dev -- ask copilot "test"
npm run dev -- chain google chatgpt "Tell me about reforestation and what hopes we have"
npm run dev -- run-random "Tell me about reforestation and what hopes we have"
```

`npm run dev -- serve` launches Chromium in headed mode with a persistent user data directory at `runner/.user-data`, prepares all Maestriss participant tabs, starts an HTTP server on `http://127.0.0.1:4137`, and keeps the browser open.

The `ask` and `inspect` commands do not launch a browser. They call the local runner service. If the service is not running, they print:

```text
Maestriss Runner is not running. Start it with:
npm run dev -- serve
```

Use the opened browser to log in to each service. The persistent profile keeps those logins between runs.

## Runner Service

The daemon exposes local HTTP endpoints:

```text
GET  /health
POST /ask
POST /chain
POST /inspect
POST /run-random
```

`POST /ask` expects:

```json
{
  "participant": "google",
  "prompt": "..."
}
```

`POST /inspect` expects:

```json
{
  "participant": "claude"
}
```

`POST /chain` expects:

```json
{
  "from": "google",
  "to": "chatgpt",
  "prompt": "Tell me about reforestation and what hopes we have"
}
```

`POST /run-random` expects:

```json
{
  "prompt": "Tell me about reforestation and what hopes we have"
}
```

Keep the service running while testing drivers. Stop it with `Ctrl+C`; the runner closes the Playwright browser context gracefully.

## Browser Channel

The runner defaults to Playwright's bundled Chromium:

```bash
npm run dev -- serve
```

Some providers, especially Claude behind Cloudflare, may reject bundled Playwright Chromium even after manual verification. You can try an installed browser channel instead:

```bash
npm run dev -- serve --channel chrome
npm run dev -- serve --channel msedge
```

Supported channels are `chromium`, `chrome`, and `msedge`. All channels use the same persistent profile directory at `runner/.user-data` by default.

## CDP Attach Mode

If providers reject Playwright-managed Chromium with Cloudflare or security verification, run Maestriss against a normal Chrome or Edge window launched manually with remote debugging.

1. Close all Chrome windows.
2. Start Chrome manually with remote debugging:

```powershell
chrome.exe --remote-debugging-port=9222 --user-data-dir="%LOCALAPPDATA%\MaestrissChromeProfile" --no-first-run --disable-session-crashed-bubble --disable-infobars --restore-last-session=false
```

3. Log into providers normally in that Chrome window.
4. Start the runner attached to that browser:

```bash
npm run dev -- serve --connect-cdp http://127.0.0.1:9222
```

Edge works the same way:

```powershell
msedge.exe --remote-debugging-port=9222 --user-data-dir="%LOCALAPPDATA%\MaestrissEdgeProfile" --no-first-run --disable-session-crashed-bubble --disable-infobars --restore-last-session=false
```

In CDP mode, the runner uses the browser's existing context and tabs. It does not use `runner/.user-data`.

If you use a PowerShell reset/start script, launch Chrome with the same restore-suppression flags:

```powershell
Start-Process `
    -FilePath $Chrome `
    -ArgumentList "--remote-debugging-port=9222 --user-data-dir=`"$Profile`" --no-first-run --disable-session-crashed-bubble --disable-infobars --restore-last-session=false"
```

The runner also closes blank startup tabs with `about:blank`, `chrome://newtab/`, or `edge://newtab/` after participant tabs are opened or reused. It does not close provider tabs or nonblank user-created tabs.

## Tab Reuse

The runner checks the existing pages in the persistent browser context before opening a participant. If a tab with a matching participant host is already open, it reuses that tab and prints `reused`. If no matching tab exists, it opens the configured participant URL and prints `opened`.

This keeps repeated `npm run dev` sessions from creating duplicate ChatGPT, Claude, Gemini, and other participant tabs.

## Google Ask Smoke Test

Run the Google AI Mode ask smoke test with:

```bash
npm run dev -- ask google "Tell me about reforestation and what hopes we have."
```

This sends a request to the running service. The service reuses the persistent browser session, enters the prompt in Google search, switches or navigates into AI Mode when needed, waits for `AI Mode response is ready` or stable AI response text, and returns the extracted AI answer.

Google extraction rejects the plain homepage and obvious navigation/footer chrome so that homepage text is not sent downstream.

## ChatGPT Ask Smoke Test

Run the first prompt automation smoke test with:

```bash
npm run dev -- ask chatgpt "Summarize why native browser control helps Maestriss."
```

This sends a request to the running service. The service reuses the persistent browser session, ensures the ChatGPT tab exists, pastes the prompt, submits it, waits until the latest assistant message is stable for 4 seconds with no Stop control visible and the composer ready again, and returns the extracted response.

You must be logged in to ChatGPT in the persistent browser profile before this command can complete successfully.

## Google To ChatGPT Chain Proof Of Concept

Run the first native two-step chain with:

```bash
npm run dev -- chain google chatgpt "Tell me about reforestation and what hopes we have"
```

This requires the runner service to be running. The service asks Google with the provided prompt, extracts the Google AI response, builds a simple handoff prompt beginning with `Please evaluate and improve the following response.`, sends that prompt to ChatGPT, and returns both the Google extracted response and ChatGPT response.

If Google already has a valid AI response loaded, you can omit the prompt:

```bash
npm run dev -- chain google chatgpt
```

The no-prompt form keeps the older proof-of-concept behavior and extracts the currently loaded Google AI response.

Claude is intentionally not included in this proof of concept.

## Random Workflow Smoke Test

Run a randomized workflow with:

```bash
npm run dev -- run-random "Tell me about reforestation and what hopes we have"
```

This requires the runner service to be running. The workflow fixes Google as the first participant, ChatGPT as the final participant, shuffles the middle participants each run, skips Claude by default, and records normalized error responses for providers whose drivers are not implemented yet.

## Sequential Baton Test

Run the deterministic multi-provider baton test with:

```bash
npm run dev -- baton-test
```

This requires the runner service to be running. The test sends the seed `MAESTRISS` through all nine participants in a fixed order (ChatGPT, Claude, Gemini, Google, DeepSeek, Grok, Copilot, Perplexity, Reka). Each participant must return exactly the baton it received plus its own token (for example `-CLAUDE`), and the actual extracted answer becomes the input to the next participant. A full pass ends with:

```text
MAESTRISS-CHATGPT-CLAUDE-GEMINI-GOOGLE-DEEPSEEK-GROK-COPILOT-PERPLEXITY-REKA
```

Any wrong, stale, or missing answer fails that stage immediately and stops the chain; no fabricated baton is ever forwarded. Options:

```bash
npm run dev -- baton-test --seed MAESTRISS
npm run dev -- baton-test --skip-unavailable
```

`--skip-unavailable` checks provider readiness once at run start, skips participants that are not `ready`, omits their tokens from the expected baton, and reports `PARTIAL` instead of `PASS`. It never hides submission, extraction, timeout, or wrong-answer failures.

The orchestration logic has a deterministic assertion suite that needs no browser or service:

```bash
npm run test:baton
```

## Claude Ask Smoke Test

Run the Claude prompt automation smoke test with:

```bash
npm run dev -- ask claude "Say exactly: Maestriss Claude runner test successful."
```

This sends a request to the running service. The service reuses the persistent browser session, ensures the Claude tab exists, pastes the prompt, submits it, waits for `Claude is responding` and Stop controls to clear while the latest assistant response is stable for 6 seconds, and returns the extracted response.

You must be logged in to Claude in the persistent browser profile before this command can complete successfully.

### Claude Security Verification Limitation

Claude currently may loop Cloudflare security verification under Playwright, including when using installed Chrome or Edge channels. If Claude verification is detected twice in one run, the runner stops trying and prints:

```text
Claude is blocked by security verification in this browser profile.
Use manual mode, API mode, or remove Claude from this native run for now.
```

For now, treat Claude native automation as blocked when this happens. Use manual mode, API mode, or omit Claude from the run. The `--skip-blocked` flag is available so future chained runs can skip blocked participants gracefully:

```bash
npm run dev -- ask claude "test" --skip-blocked
```

The command is sent to the running service. In future chained runs, blocked participants can be omitted gracefully.

## Gemini Ask Smoke Test

Run the Gemini prompt automation smoke test with:

```bash
npm run dev -- ask gemini "Say exactly: Maestriss Gemini runner test successful."
```

This sends a request to the running service. The service reuses the persistent browser session, ensures the Gemini tab exists, pastes the prompt, submits it, waits until the latest response is stable with no Stop control visible and the composer ready again, and returns the extracted response.

You must be logged in to Gemini in the persistent browser profile before this command can complete successfully.

## Perplexity Ask Smoke Test

Run the Perplexity prompt automation smoke test with:

```bash
npm run dev -- ask perplexity "Say exactly: Maestriss Perplexity runner test successful."
```

The Perplexity driver supports composer paste, send button or Enter submission, stable-answer completion detection, and normalized response extraction.

## Reka Ask Smoke Test

Run the Reka prompt automation smoke test with:

```bash
npm run dev -- ask reka "Say exactly: Maestriss Reka runner test successful."
```

The Reka driver supports composer paste, send button or Enter submission, stable-answer completion detection, and normalized response extraction.

## DeepSeek Ask Smoke Test

Run the DeepSeek prompt automation smoke test with:

```bash
npm run dev -- ask deepseek "Say exactly: Maestriss DeepSeek runner test successful."
```

The DeepSeek driver supports composer paste, send button or Enter submission, stable-answer completion detection, and normalized response extraction.

## Grok Ask Smoke Test

Run the Grok prompt automation smoke test with:

```bash
npm run dev -- ask grok "Say exactly: Maestriss Grok runner test successful."
```

The Grok driver supports composer paste, send button or Enter submission, stable-answer completion detection, and normalized response extraction.

## Copilot Ask Smoke Test

Run the Copilot prompt automation smoke test with:

```bash
npm run dev -- ask copilot "Say exactly: Maestriss Copilot runner test successful."
```

The Copilot driver opens and reuses Microsoft 365 work chat at `https://m365.cloud.microsoft/chat/`. It also recognizes older `copilot.microsoft.com` tabs as Copilot, but prefers an existing M365 chat tab when one is available. The driver supports composer paste, verified send/coordinate submission, stable-answer completion detection, and normalized response extraction that rejects shell/composer text.

## Driver Inspector

Inspect a participant page while developing selectors:

```bash
npm run dev -- inspect claude
```

The inspector reuses or opens the participant tab, waits for `document.readyState === "complete"`, prints URL/title/readyState, counts common composer-related elements, lists visible button labels and placeholders, highlights candidate composer elements with a red outline, saves debug artifacts, prints the first three candidate composer `outerHTML` snippets, and keeps the browser open.

Debug artifacts are written to:

```text
runner/debug/<participant>.html
runner/debug/<participant>.png
```

## Security Verification

Some providers may show a Cloudflare or human verification page, especially in a fresh persistent profile. The runner detects common verification text such as `Just a moment`, `Verify you are human`, `Performing security verification`, and `Cloudflare`.

When detected during `ask` or `inspect`, the runner pauses and prints:

```text
Security verification detected for <participant>.
Complete it manually in the browser, then press Enter in the terminal to continue.
```

Complete the verification in the headed browser, then press Enter in the terminal. The runner reloads the page and continues once the verification page clears.

Prompt automation, selectors, retries, screenshots, structured logs, waits, and extraction will come later.
