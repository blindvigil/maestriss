import type { Citation, ParticipantResponse, PromptTemplate } from './types.js';

type TemplateVariables = {
  question: string;
  previousParticipant: string;
  previousAnswer: string;
  citationsSection: string;
};

function formatCitations(citations: Citation[]) {
  if (citations.length === 0) {
    return 'Previous answer citations: none provided.';
  }

  return [
    'Previous answer citations:',
    ...citations.map((citation, index) => {
      const title = citation.title ?? 'Untitled source';
      const url = citation.url ? ` ${citation.url}` : '';
      const snippet = citation.snippet ? ` - ${citation.snippet}` : '';
      return `${index + 1}. ${title}${url}${snippet}`;
    }),
  ].join('\n');
}

function interpolate(template: string, variables: TemplateVariables) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: keyof TemplateVariables) => (
    Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : ''
  ));
}

export function renderPromptTemplate(
  template: PromptTemplate,
  previousResponse: ParticipantResponse,
) {
  return interpolate(template.template, {
    question: previousResponse.question,
    previousParticipant: previousResponse.participant,
    previousAnswer: previousResponse.answer,
    citationsSection: formatCitations(previousResponse.citations),
  });
}
