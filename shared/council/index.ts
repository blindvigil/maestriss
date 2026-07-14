// Shared Maestriss Council vocabulary and pure logic.
//
// Consumed by both the Runner (execution) and Studio (configuration UI).
// Plain TypeScript only: no React, no Playwright, no browser APIs, no
// runner-runtime dependencies.
//
// Canonical domain vocabulary: a Doctrine defines a Council's cognitive
// workflow and provides a default Formation (ordered seats); each seat is
// assigned a Calling and a provider (AI); the configured whole is a Council.

export * from './providers.js';
export * from './cognitiveStats.js';
export * from './cognitiveGuidance.js';
export * from './cognitiveStatDescriptors.js';
export * from './callingFlavourText.js';
export * from './callings.js';
export * from './schema.js';
export * from './doctrines.js';
export * from './promptComposition.js';
