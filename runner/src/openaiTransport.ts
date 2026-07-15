// Shared OpenAI Responses API transport.
//
// One place owns the OpenAI client construction, the Responses API call, the
// official response-shape text extraction, and the structured failure
// classification. Both the isolated live smoke test (`openaiApiSmokeTest.ts`)
// and Council API execution consume this module, so credential handling and
// error classification are never duplicated.
//
// Key hygiene: OPENAI_API_KEY is read from the environment and used only to
// construct the SDK client. It is never printed, logged, persisted, written to
// configuration or debug artifacts, or included in any error output.
//
// Transport, not composition: this module only sends an already-composed
// prompt string and returns the response text. It never composes, rewrites,
// truncates, or summarizes prompts or responses.

import OpenAI from 'openai';
import type { ParticipantRunResponse } from './types.js';

// The initial transport-test model: a currently supported, small, low-cost
// general-purpose text model fully supported by the Responses API and the
// official openai Node SDK. Native model-parameter mapping is future work.
export const OPENAI_DEFAULT_MODEL = 'gpt-4o-mini';
export const OPENAI_PROVIDER_FAMILY = 'openai';

// A stable execution-mind id for an OpenAI API model, distinct from the
// canonical browser provider ids (e.g. 'chatgpt'). Keeping the API mind id
// separate is what lets one provider family carry multiple models/transports
// later without conflating transport with Mind identity.
export function openAiMindId(model: string): string {
  return `openai-${model}`;
}

// Structured OpenAI failure categories, classified from SDK/API structured
// fields only (never arbitrary prose).
export type OpenAiFailureCategory =
  | 'missing-api-key'
  | 'authentication-failure'
  | 'billing-or-quota-failure'
  | 'rate-limit'
  | 'network-or-availability-failure'
  | 'malformed-api-response';

export type OpenAiCallResult =
  | { ok: true; text: string }
  | { ok: false; category: OpenAiFailureCategory; message?: string; detail?: Record<string, unknown> };

// A single injectable OpenAI request: takes the exact composed input and
// returns a structured result. The real implementation wraps the SDK; tests
// inject a deterministic fake so no network or SDK is required.
export type OpenAiCaller = (input: string) => Promise<OpenAiCallResult>;

// Read OPENAI_API_KEY without ever exposing its value. Returns undefined when
// absent or blank.
export function readOpenAiKey(): string | undefined {
  const key = process.env.OPENAI_API_KEY;
  return key && key.trim().length > 0 ? key : undefined;
}

// Extract the assistant text using the official Responses API response shape:
// prefer the SDK's aggregated `output_text`, otherwise walk the structured
// `output` items for `output_text` content. No free-text/prose parsing.
export function extractResponseText(response: OpenAI.Responses.Response): string | undefined {
  if (typeof response.output_text === 'string' && response.output_text.length > 0) {
    return response.output_text;
  }

  const parts: string[] = [];

  for (const item of response.output ?? []) {
    if (item.type === 'message') {
      for (const content of item.content ?? []) {
        if (content.type === 'output_text' && typeof content.text === 'string') {
          parts.push(content.text);
        }
      }
    }
  }

  return parts.length > 0 ? parts.join('') : undefined;
}

// Map an SDK/API error onto a structured failure category using structured
// fields (error type, HTTP status, error code) only — never prose parsing.
export function classifyOpenAiError(error: unknown): {
  category: OpenAiFailureCategory;
  message: string;
  detail?: Record<string, unknown>;
} {
  if (error instanceof OpenAI.APIError) {
    const status = error.status;
    const code = typeof error.code === 'string' ? error.code : undefined;
    const type = typeof error.type === 'string' ? error.type : undefined;
    const detail = { status, code, type };

    if (error instanceof OpenAI.APIConnectionError || status === undefined) {
      return { category: 'network-or-availability-failure', message: 'Could not reach the OpenAI API.', detail };
    }

    if (status === 401 || error instanceof OpenAI.AuthenticationError) {
      return { category: 'authentication-failure', message: 'OpenAI API rejected the credentials.', detail };
    }

    if (code === 'insufficient_quota' || type === 'insufficient_quota' || (status === 403 && (code?.includes('billing') ?? false))) {
      return { category: 'billing-or-quota-failure', message: 'OpenAI account is out of quota or has a billing problem.', detail };
    }

    if (status === 429 || error instanceof OpenAI.RateLimitError) {
      return { category: 'rate-limit', message: 'OpenAI API rate limit hit.', detail };
    }

    if (status >= 500 || error instanceof OpenAI.InternalServerError) {
      return { category: 'network-or-availability-failure', message: 'OpenAI API returned a server error.', detail };
    }

    return { category: 'malformed-api-response', message: `OpenAI API request failed (HTTP ${status}).`, detail };
  }

  const message = error instanceof Error ? error.message : String(error);
  return { category: 'network-or-availability-failure', message: `Unexpected transport failure: ${message}` };
}

// Build the real OpenAI Responses caller. The client is constructed from the
// supplied key (never logged) and the call returns a structured result rather
// than throwing, so classification lives in one place.
export function createOpenAiResponsesCaller(params: { apiKey: string; model: string; client?: OpenAI }): OpenAiCaller {
  const client = params.client ?? new OpenAI({ apiKey: params.apiKey });

  return async (input) => {
    try {
      const response = await client.responses.create({ model: params.model, input });
      const text = extractResponseText(response);

      if (text === undefined) {
        return { category: 'malformed-api-response', message: 'The Responses API returned no output text.', ok: false };
      }

      return { ok: true, text };
    } catch (error) {
      const classified = classifyOpenAiError(error);
      return { ok: false, category: classified.category, message: classified.message, detail: classified.detail };
    }
  };
}

// Map an OpenAI failure category onto the Council ask-failure `reason`
// vocabulary. Availability categories deliberately use reasons that are in the
// canonical `providerUnavailableAskReasons` taxonomy, so the run-scoped
// circuit breaker and fallback treat them as provider unavailability. A
// malformed response is NOT an availability condition — it maps to a
// non-availability reason so the seat's failure policy owns it and it is never
// disguised as provider unavailability.
export function mapOpenAiCategoryToCouncilReason(category: OpenAiFailureCategory): string {
  switch (category) {
    case 'authentication-failure':
      return 'session-unavailable';
    case 'billing-or-quota-failure':
      return 'usage-limit';
    case 'rate-limit':
      return 'rate-limited';
    case 'network-or-availability-failure':
      return 'provider-unavailable';
    case 'missing-api-key':
      return 'session-unavailable';
    case 'malformed-api-response':
      return 'malformed-response';
  }
}

// Adapt an OpenAI caller into a Council ask function. The exact composed Seat
// prompt is sent unchanged; a successful response text becomes the seat's
// contribution verbatim (only outer whitespace is trimmed downstream by the
// engine, matching the existing contribution contract), and a structured
// failure becomes a normalized failed response carrying the mapped reason.
export function createOpenAiCouncilAsk(params: {
  caller: OpenAiCaller;
  mindId: string;
}): (mindId: string, prompt: string) => Promise<ParticipantRunResponse> {
  return async (_requestedMindId, prompt) => {
    const result = await params.caller(prompt);

    if (result.ok) {
      return {
        participant: params.mindId,
        question: prompt,
        answer: result.text,
        citations: [],
        elapsedSeconds: 0,
        rawText: result.text,
        cleanedText: result.text,
      };
    }

    return {
      participant: params.mindId,
      question: prompt,
      answer: '',
      citations: [],
      elapsedSeconds: 0,
      rawText: '',
      cleanedText: '',
      status: 'failed',
      reason: mapOpenAiCategoryToCouncilReason(result.category),
      error: result.message ?? result.category,
    };
  };
}
