# Automa Reference Fixtures

This folder contains real-world Automa workflow exports used as schema references while building the Maestriss Automa exporter.

These files are not runtime code. They should not be imported by the application bundle, mutated by UI logic, or treated as canonical product behavior.

Use them only to inspect practical Automa JSON details such as:

- top-level workflow metadata
- `drawflow.nodes` and `drawflow.edges`
- manual `trigger` blocks
- `switch-tab` and `active-tab` blocks
- `delay` blocks
- JavaScript block data shape
- VueFlow-style edge handles
- popup/page execution context conventions

The exporter should learn from these fixtures without overfitting to their exact participant order, prompt text, timing, or legacy workflow assumptions.
