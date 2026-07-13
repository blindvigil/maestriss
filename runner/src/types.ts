export type Citation = {
  title?: string;
  url?: string;
  snippet?: string;
};

export type ParticipantResponse = {
  participant: string;
  question: string;
  answer: string;
  citations: Citation[];
  elapsedSeconds: number;
  rawText: string;
  cleanedText: string;
  rawHtml?: string;
};

export type ParticipantErrorResponse = ParticipantResponse & {
  status: 'failed' | 'skipped';
  error: string;
  reason?: string;
};

export type ParticipantRunResponse = ParticipantResponse | ParticipantErrorResponse;

export type PromptTemplate = {
  id: string;
  name: string;
  description?: string;
  template: string;
};

// The dormant WorkflowDefinition/WorkflowNode/WorkflowEdge graph types and
// the sample workflow JSON were retired in favor of the shared Council
// Configuration model (shared/council/): a repository-wide reference check
// confirmed nothing consumed them.
