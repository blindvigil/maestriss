export type PromptTemplateType = 'middle-participant' | 'final-editor' | 'contribution-extraction';

export type PromptVariable =
  | 'participantName'
  | 'previousParticipantName'
  | 'nextParticipantName'
  | 'originalPrompt'
  | 'roundtableTranscript'
  | 'currentOrder'
  | 'profileInstructions'
  | 'sessionTitle';

export type PromptTemplate = {
  id: PromptTemplateType;
  name: string;
  description: string;
  templateText: string;
  availableVariables: PromptVariable[];
};
