import type { ExportDefinition } from '../types/export';

export const exportDefinitions: ExportDefinition[] = [
  {
    format: 'project-json',
    label: 'Project JSON',
    description: 'Full formatted MaestrissProject object.',
    fileExtension: 'json',
    mimeType: 'application/json',
  },
  {
    format: 'prompt-pack-markdown',
    label: 'Prompt Pack Markdown',
    description: 'All prompt templates with variables and template text.',
    fileExtension: 'md',
    mimeType: 'text/markdown',
  },
  {
    format: 'session-transcript-markdown',
    label: 'Session Transcript Markdown',
    description: 'Selected session metadata, transcript, and final answer placeholder.',
    fileExtension: 'md',
    mimeType: 'text/markdown',
  },
  {
    format: 'automa-workflow-json',
    label: 'Automa Workflow JSON',
    description: 'First-pass Automa 1.30.01 workflow JSON generated from the project model.',
    fileExtension: 'json',
    mimeType: 'application/json',
  },
];
