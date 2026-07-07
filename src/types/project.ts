import type { DriverConfig } from './driver';
import type { Participant } from './participant';
import type { PromptTemplate, PromptTemplateType } from './prompt';
import type { Profile } from './profile';
import type { SessionHistoryItem } from './session';
import type { AppSettings } from './settings';

export type ProjectMetadata = {
  projectName: string;
  workflowName: string;
  created: string;
  modified: string;
  version: string;
};

export type ProjectWorkflow = {
  firstParticipant: string;
  finalEditor: string;
  randomizeMiddleParticipants: boolean;
  currentOrder: string[];
};

export type ProjectProfiles = {
  items: Profile[];
  selectedProfileId: string;
};

export type ProjectPrompts = {
  templates: PromptTemplate[];
  selectedTemplateId: PromptTemplateType;
};

export type ProjectSessions = {
  items: SessionHistoryItem[];
  selectedSessionId: string;
};

export type MaestrissProject = {
  metadata: ProjectMetadata;
  participants: Participant[];
  workflow: ProjectWorkflow;
  profiles: ProjectProfiles;
  drivers: DriverConfig[];
  prompts: ProjectPrompts;
  sessions: ProjectSessions;
  settings: AppSettings;
};
