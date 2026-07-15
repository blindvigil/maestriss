// Structured ask-failure category extraction.
//
// Drivers signal structured failure states by throwing errors whose message
// leads with a kebab-case category token, e.g.
//   "grok-account-or-plan-block: Sign up to continue..."
//   "grok-capacity-error: Please try again soon..."
// The server previously flattened the entire message into the normalized
// response's `reason` field, which meant structured categories (including
// the provider-availability taxonomy that drives Council fallback) could
// never match live (2026-07-14 live-run audit finding). This helper
// recovers the leading category token when present; free-text messages
// ("Timed out waiting for ChatGPT completion.") are left untouched.

const structuredReasonPattern = /^([a-z][a-z0-9]*(?:-[a-z0-9]+)+):\s/;

export function structuredAskFailureReason(message: string): string | undefined {
  return structuredReasonPattern.exec(message)?.[1];
}
