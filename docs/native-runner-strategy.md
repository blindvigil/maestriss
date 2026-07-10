# Native Runner Strategy

Maestriss should keep the Automa exporter as an export and prototyping target, but it should not depend on Automa as the long-term execution engine.

Automa has been useful for validating the orchestration shape: participant order, prompt handoff, tab switching, wait conditions, and transcript extraction. Its drawflow JSON format is a practical bridge for early experiments, but it is not the best foundation for reliable production runs.

## Long-Term Direction

The long-term Maestriss runner should use Playwright, or a similar browser automation layer, to execute workflows directly.

This native runner path should control browser contexts, pages, waits, retries, logging, and extraction without translating everything into Automa blocks first.

## Benefits

A native runner gives Maestriss:

- Direct browser and page control
- Reliable wait conditions
- Better selectors and page-specific logic
- Screenshot and debug artifact support
- Structured logs for each participant step
- Easier retries and recovery
- No drawflow JSON limitations

## Pluggable Execution Architecture

The execution/export architecture should stay pluggable:

- Automa exporter: useful for export, inspection, and early workflow prototyping
- Playwright runner: native browser execution path for Maestriss-controlled runs
- Future API runner: direct model/provider APIs where browser automation is unnecessary

The UI should eventually treat these as execution targets. A project can be exported to Automa, run locally through Playwright, or routed through a future API backend without rewriting the core participant, prompt, workflow, and transcript concepts.

## Near-Term Scope

The first native runner should remain a proof of concept:

- Open configured participant pages
- Paste a prompt into one participant
- Submit the prompt
- Wait for completion using participant-specific logic
- Extract the response
- Emit structured logs

It should not be wired into the React app until the runner API, logs, and failure model are clearer.
