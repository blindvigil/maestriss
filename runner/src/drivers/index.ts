import { chatgptDriver } from './chatgptDriver.js';
import { claudeDriver } from './claudeDriver.js';
import { copilotDriver } from './copilotDriver.js';
import { deepseekDriver } from './deepseekDriver.js';
import { geminiDriver } from './geminiDriver.js';
import { googleDriver } from './googleDriver.js';
import { grokDriver } from './grokDriver.js';
import { perplexityDriver } from './perplexityDriver.js';
import { rekaDriver } from './rekaDriver.js';
import type { ParticipantDriver } from './base.js';
import { participants } from '../participants.js';

export const participantDrivers: ParticipantDriver[] = [
  chatgptDriver,
  claudeDriver,
  copilotDriver,
  deepseekDriver,
  geminiDriver,
  googleDriver,
  grokDriver,
  perplexityDriver,
  rekaDriver,
];

export function getDriver(name: string): ParticipantDriver | undefined {
  const normalizedName = name.toLowerCase();
  const participant = participants.find((candidate) => (
    candidate.id === normalizedName ||
    candidate.name.toLowerCase() === normalizedName
  ));

  return participantDrivers.find((driver) => (
    driver.name.toLowerCase() === normalizedName ||
    Boolean(participant && driver.matchParticipant(participant))
  ));
}

export function assertAskCapableDriversResolve() {
  const requiredDrivers = [
    'chatgpt',
    'google',
    'gemini',
    'reka',
    'perplexity',
    'deepseek',
    'grok',
    'copilot',
    'claude',
  ];

  const missingDrivers = requiredDrivers.filter((name) => {
    const driver = getDriver(name);
    return !driver?.waitForReady ||
      !driver.pastePrompt ||
      !driver.submitPrompt ||
      !driver.waitForCompletion ||
      !driver.extractResponse;
  });

  if (missingDrivers.length > 0) {
    throw new Error(`Ask-capable driver registry assertion failed: ${missingDrivers.join(', ')}`);
  }
}
