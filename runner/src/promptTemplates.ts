import type { PromptTemplate } from './types.js';

export const promptTemplates: PromptTemplate[] = [
  {
    id: 'critique-factual-accuracy',
    name: 'Critique factual accuracy',
    description: 'Ask the next participant to evaluate and improve the previous answer for factual accuracy.',
    template: [
      'Original question:',
      '{{question}}',
      '',
      '{{previousParticipant}} answered:',
      '',
      '{{previousAnswer}}',
      '',
      '{{citationsSection}}',
      'Please critique the factual accuracy of the answer above, identify unsupported or questionable claims, and provide an improved response.',
    ].join('\n'),
  },
];

export function getPromptTemplate(id: string) {
  return promptTemplates.find((template) => template.id === id);
}
