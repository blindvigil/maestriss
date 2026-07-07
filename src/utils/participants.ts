import { defaultParticipants } from '../data/defaultParticipants';
import type { Participant } from '../types/participant';

export function createDefaultParticipants(): Participant[] {
  return defaultParticipants.map((participant) => ({ ...participant }));
}

export function createParticipant(index: number): Participant {
  return {
    id: `custom-${Date.now()}-${index}`,
    name: `New Participant ${index}`,
    provider: 'custom.ai',
    role: 'Custom participant awaiting configuration',
    urlPattern: 'https://custom.ai/?q={prompt}',
    enabled: true,
    position: 'standard',
  };
}
