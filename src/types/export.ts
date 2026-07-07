export type ExportFormat =
  | 'project-json'
  | 'prompt-pack-markdown'
  | 'session-transcript-markdown'
  | 'automa-workflow-json';

export type ExportDefinition = {
  format: ExportFormat;
  label: string;
  description: string;
  fileExtension: 'json' | 'md';
  mimeType: string;
};

export type ExportArtifact = {
  filename: string;
  content: string;
  mimeType: string;
};
