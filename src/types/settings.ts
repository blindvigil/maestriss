export type ThemePreference = 'Dark' | 'System' | 'Light';
export type AccentStyle = 'Teal' | 'Blue' | 'Violet' | 'Amber';
export type ExportFormat = 'Markdown' | 'JSON' | 'HTML';

export type AppSettings = {
  appName: string;
  theme: ThemePreference;
  accentStyle: AccentStyle;
  compactMode: boolean;
  defaultFirstParticipant: string;
  defaultFinalEditor: string;
  defaultProfile: string;
  randomizeMiddleParticipants: boolean;
  requireFinalSynthesis: boolean;
  defaultMaxWaitSeconds: number;
  responseStabilitySeconds: number;
  retryFailedParticipant: boolean;
  copyFinalTranscriptToClipboard: boolean;
  defaultExportFormat: ExportFormat;
  includeMetadata: boolean;
  includeIntermediateContributions: boolean;
};
