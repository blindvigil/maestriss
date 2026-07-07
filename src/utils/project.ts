import { mockSessions } from '../data/mockSessions';
import type { MaestrissProject } from '../types/project';
import { createDefaultDriverConfigs } from './drivers';
import { createDefaultParticipants } from './participants';
import { createDefaultPromptTemplates } from './prompts';
import { createDefaultProfiles } from './profiles';
import { createDefaultSettings } from './settings';

export function createDefaultProject(): MaestrissProject {
  const now = new Date().toISOString();
  const participants = createDefaultParticipants();
  const profiles = createDefaultProfiles();

  return {
    metadata: {
      projectName: 'Maestriss Studio',
      workflowName: 'Council Draft',
      created: now,
      modified: now,
      version: '0.1.0',
    },
    participants,
    workflow: {
      firstParticipant: 'Google',
      finalEditor: 'Claude',
      randomizeMiddleParticipants: true,
      currentOrder: participants.map((participant) => participant.name),
    },
    profiles: {
      items: profiles,
      selectedProfileId: 'peer-review',
    },
    drivers: createDefaultDriverConfigs(participants),
    prompts: {
      templates: createDefaultPromptTemplates(),
      selectedTemplateId: 'middle-participant',
    },
    sessions: {
      items: mockSessions.map((session) => ({ ...session })),
      selectedSessionId: mockSessions[0]?.id ?? '',
    },
    settings: createDefaultSettings(),
  };
}
