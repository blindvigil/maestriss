import type { Page } from 'playwright';
import type { RunnerParticipant } from '../participants.js';
import type { ParticipantResponse } from '../types.js';

export type DriverAskOptions = {
  debugClick?: boolean;
};

export type ParticipantDriver = {
  name: string;
  status?: 'ready' | 'blocked-by-security-verification';
  matchParticipant: (participant: RunnerParticipant) => boolean;
  waitForReady: (page: Page) => Promise<void>;
  pastePrompt?: (page: Page, prompt: string) => Promise<void>;
  submitPrompt?: (page: Page, options?: DriverAskOptions) => Promise<void>;
  waitForCompletion?: (page: Page) => Promise<void>;
  extractResponse: (page: Page) => Promise<string>;
  extractParticipantResponse?: (
    page: Page,
    context: {
      question: string;
      elapsedSeconds: number;
    },
  ) => Promise<ParticipantResponse>;
  extractNormalizedResponse?: (
    page: Page,
    context: {
      question: string;
      elapsedSeconds: number;
    },
  ) => Promise<ParticipantResponse>;
};
