import type { DriverConfig } from '../types/driver';
import type { Participant } from '../types/participant';

export function createDriverConfig(participant: Participant): DriverConfig {
  return {
    participantId: participant.id,
    urlPattern: participant.urlPattern,
    inputStrategy: 'contenteditable',
    submitMethod: 'Enter',
    completionDetectionMethod: 'response text stable',
    extractionMethod: 'latest assistant message',
    cleanupRules:
      'Remove navigation, repeated prompt text, disclaimers unrelated to the answer, and empty UI labels before passing the contribution forward.',
    health: 'untested',
  };
}

export function createDefaultDriverConfigs(participants: Participant[]): DriverConfig[] {
  return participants.map((participant) => createDriverConfig(participant));
}

export function reconcileDriverConfigs(
  participants: Participant[],
  driverConfigs: DriverConfig[],
): DriverConfig[] {
  return participants.map((participant) => {
    const existingConfig = driverConfigs.find((config) => config.participantId === participant.id);

    return existingConfig ?? createDriverConfig(participant);
  });
}
