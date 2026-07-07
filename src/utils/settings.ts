import type { AppSettings } from '../types/settings';

export function createDefaultSettings(): AppSettings {
  return {
    appName: 'Maestriss Studio',
    theme: 'Dark',
    accentStyle: 'Teal',
    compactMode: false,
    defaultFirstParticipant: 'Google',
    defaultFinalEditor: 'Claude',
    defaultProfile: 'Peer Review',
    randomizeMiddleParticipants: true,
    requireFinalSynthesis: true,
    defaultMaxWaitSeconds: 90,
    responseStabilitySeconds: 4,
    retryFailedParticipant: true,
    copyFinalTranscriptToClipboard: false,
    defaultExportFormat: 'Markdown',
    includeMetadata: true,
    includeIntermediateContributions: true,
  };
}
