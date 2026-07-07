import type { PromptVariable } from '../types/prompt';

export const promptVariables: PromptVariable[] = [
  'participantName',
  'previousParticipantName',
  'nextParticipantName',
  'originalPrompt',
  'roundtableTranscript',
  'currentOrder',
  'profileInstructions',
  'sessionTitle',
];

export const promptVariableTokens: Record<PromptVariable, string> = {
  participantName: '{{participantName}}',
  previousParticipantName: '{{previousParticipantName}}',
  nextParticipantName: '{{nextParticipantName}}',
  originalPrompt: '{{originalPrompt}}',
  roundtableTranscript: '{{roundtableTranscript}}',
  currentOrder: '{{currentOrder}}',
  profileInstructions: '{{profileInstructions}}',
  sessionTitle: '{{sessionTitle}}',
};

export const promptVariablePreviewValues: Record<PromptVariable, string> = {
  participantName: 'ChatGPT',
  previousParticipantName: 'Google',
  nextParticipantName: 'Gemini',
  originalPrompt:
    'Assess the strategy memo and produce a sharper recommendation for the planning council.',
  roundtableTranscript:
    'Google: The proposal needs stronger evidence for market timing.\nPerplexity: Add source-backed comparison points before committing to the rollout.',
  currentOrder: 'Google -> ChatGPT -> Gemini -> Claude',
  profileInstructions:
    'Review politely, correct errors, add missing context, and avoid repetition unless refining or correcting a point.',
  sessionTitle: 'Council Draft: Product Strategy Memo',
};
