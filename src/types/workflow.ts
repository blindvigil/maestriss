import type { Participant } from './participant';

export type WorkflowGroup = {
  title: string;
  description: string;
  participants: Participant[];
};

export type PromptPreview = {
  title: string;
  eyebrow: string;
  body: string;
};
