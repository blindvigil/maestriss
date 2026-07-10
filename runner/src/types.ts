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

export type WorkflowNode = {
  id: string;
  participant: string;
};

export type WorkflowEdge = {
  id: string;
  from: string;
  to: string;
  promptTemplate: string;
};

export type WorkflowDefinition = {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};
