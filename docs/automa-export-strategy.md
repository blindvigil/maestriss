# Automa Export Strategy

Automa is currently a prototype/export target for Maestriss. It gives us a practical bridge to browser-based orchestration while the product model, prompt system, and driver configuration are still evolving.

Maestriss should not depend on Automa long-term. The core application should continue to center on `MaestrissProject`, reusable prompt templates, participant drivers, sessions, and exporter/runner boundaries. Automa should be one output adapter, not the architecture.

For now, the exporter should generate Automa 1.30.01-compatible JSON. The first-pass generator should use real exported workflows only as reference fixtures for schema details such as:

- manual trigger blocks
- `switch-tab` blocks
- `active-tab` blocks
- `delay` blocks
- `drawflow.nodes` and `drawflow.edges`
- popup/page JavaScript execution context conventions

The exporter should not overfit to the old workflows. Their participant order, hardcoded prompt text, wait timing, and cleanup scripts are historical examples rather than product requirements.

The architecture should support future exporters and runners:

- Automa exporter
- Playwright runner
- Electron desktop runner
- API-based runner

The desired direction is a stable Maestriss orchestration model with multiple adapters. Each adapter should translate the central project into the shape required by its target runtime, while the UI and project data remain target-agnostic.
