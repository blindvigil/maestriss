MAESTRISS - orchestrates multiple web AI providers (ChatGPT, Claude, Gemini, Google AI Mode, Grok, Copilot, DeepSeek, Perplexity, Reka) via browser automation.

TWO PARTS
1) Studio (React UI): npm install; npm run dev
   Design workflows/prompts; export Automa JSON.
2) Native runner: cd runner; npm install; npx playwright install chromium
   Server:  npm run dev -- serve      (http://127.0.0.1:4137)
   Ask:     npm run dev -- ask claude "your prompt"
   Also: health, check-providers, chain, run-random, inspect, cancel-all
   CDP mode with real Chrome: runner\restart-runner.ps1
   (WARNING: script kills ALL Chrome processes)
   Log in to providers manually once; sessions persist.
   Tests: npm run test:<provider>-filter   Build check: npm run build

DOCS
Documentation\Reference\: permanent engineering reference library
  Human\: human-oriented edition (same document numbers and filenames)
  AI\: AI-oriented edition (same engineering truth, structured for reasoning)
  Start at Human\Start_Here.md or AI\Start_Here.md
Documentation\Handoffs\: milestone snapshots
Documentation\Reviews\: audits
docs\: strategy notes; runner\README.md: runner detail
