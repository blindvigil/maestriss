import { exportDefinitions } from '../config/exportFormats';
import { generateAutomaWorkflow } from '../exporters/automa';
import type { ExportArtifact, ExportFormat } from '../types/export';
import type { MaestrissProject } from '../types/project';
import type { SessionHistoryItem } from '../types/session';

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function getSelectedSession(project: MaestrissProject) {
  return (
    project.sessions.items.find(
      (session) => session.id === project.sessions.selectedSessionId,
    ) ?? project.sessions.items[0]
  );
}

function formatMarkdownList(items: string[]) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '- None';
}

function createPromptPackMarkdown(project: MaestrissProject) {
  return `# ${project.metadata.projectName} Prompt Pack

Workflow: ${project.metadata.workflowName}
Version: ${project.metadata.version}
Modified: ${project.metadata.modified}

${project.prompts.templates
  .map(
    (template) => `## ${template.name}

${template.description}

### Variables
${formatMarkdownList(template.availableVariables.map((variable) => `{{${variable}}}`))}

### Template
\`\`\`text
${template.templateText}
\`\`\``,
  )
  .join('\n\n')}`;
}

function createSessionTranscriptMarkdown(project: MaestrissProject, session: SessionHistoryItem | undefined) {
  if (!session) {
    return `# ${project.metadata.projectName} Session Transcript

No selected session is available.`;
  }

  return `# ${session.title}

## Metadata
- Project: ${project.metadata.projectName}
- Workflow: ${project.metadata.workflowName}
- Status: ${session.status}
- Date/time: ${session.startedAt}
- Final editor: ${session.finalEditor}
- Profile: ${session.profile}
- Duration: ${session.duration}
- Contributions: ${session.contributionCount}
- Length estimate: ${session.lengthEstimate}

## Original Prompt
${session.originalPrompt}

## Participant Order
${formatMarkdownList(session.participantOrder)}

## Contributions
${session.contributions.length > 0
  ? session.contributions
      .map(
        (contribution) => `### ${contribution.participantName}

- Profile: ${contribution.profileName}
- Length estimate: ${contribution.lengthEstimate}

${contribution.summary}`,
      )
      .join('\n\n')
  : 'No contributions captured yet.'}

## Final Synthesized Answer
${session.finalAnswerPlaceholder}`;
}

export function createExportArtifact(
  project: MaestrissProject,
  format: ExportFormat,
): ExportArtifact {
  const definition = exportDefinitions.find((item) => item.format === format) ?? exportDefinitions[0];
  const projectSlug = slugify(project.metadata.projectName) || 'maestriss-project';
  const selectedSession = getSelectedSession(project);
  const sessionSlug = selectedSession ? slugify(selectedSession.title) : 'session';

  if (format === 'project-json') {
    return {
      filename: `${projectSlug}.json`,
      content: JSON.stringify(project, null, 2),
      mimeType: definition.mimeType,
    };
  }

  if (format === 'prompt-pack-markdown') {
    return {
      filename: `${projectSlug}-prompt-pack.md`,
      content: createPromptPackMarkdown(project),
      mimeType: definition.mimeType,
    };
  }

  if (format === 'session-transcript-markdown') {
    return {
      filename: `${sessionSlug}-transcript.md`,
      content: createSessionTranscriptMarkdown(project, selectedSession),
      mimeType: definition.mimeType,
    };
  }

  return {
    filename: `${projectSlug}-automa-workflow.json`,
    content: JSON.stringify(generateAutomaWorkflow(project), null, 2),
    mimeType: definition.mimeType,
  };
}

export function downloadTextFile(artifact: ExportArtifact) {
  const blob = new Blob([artifact.content], { type: artifact.mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = artifact.filename;
  link.click();
  URL.revokeObjectURL(url);
}
