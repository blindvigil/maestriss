import { promptVariables, promptVariablePreviewValues, promptVariableTokens } from '../config/promptVariables';
import type { PromptTemplate } from '../types/prompt';

export function createDefaultPromptTemplates(): PromptTemplate[] {
  return [
    {
      id: 'middle-participant',
      name: 'Middle Participant Prompt',
      description:
        'Guides randomized middle participants to add a new roundtable contribution without repeating prior work.',
      availableVariables: promptVariables,
      templateText: `You are {{participantName}} in a Maestriss roundtable session.

Session: {{sessionTitle}}
Original prompt:
{{originalPrompt}}

Current participant order:
{{currentOrder}}

Previous participant: {{previousParticipantName}}
Next participant: {{nextParticipantName}}

Your profile instructions:
{{profileInstructions}}

Roundtable transcript so far:
{{roundtableTranscript}}

Evaluate the accuracy and reasoning of the discussion so far. Point out errors, omissions, weak assumptions, or unsupported claims. Add missing knowledge, perspectives, or evidence. Challenge conclusions you disagree with, expand strong ideas, and suggest better approaches where useful.

Avoid repeating points unless you are refining or correcting them. Respond only with your new contribution.`,
    },
    {
      id: 'final-editor',
      name: 'Final Editor Prompt',
      description:
        'Guides the final editor to synthesize the session into a polished answer for the human reader.',
      availableVariables: promptVariables,
      templateText: `You are {{participantName}}, the final editor for this Maestriss session.

Session: {{sessionTitle}}
Original prompt:
{{originalPrompt}}

Participant order:
{{currentOrder}}

Final editor profile instructions:
{{profileInstructions}}

Full roundtable transcript:
{{roundtableTranscript}}

Produce a finished response for the human reader. Synthesize the strongest ideas, correct factual errors, resolve disagreements where possible, and clearly distinguish facts from speculation. Preserve insightful observations, add important missing perspectives, and organize the answer naturally.

End with concise key takeaways.`,
    },
    {
      id: 'contribution-extraction',
      name: 'Contribution Extraction Instruction',
      description:
        'Keeps copied participant output focused on the new contribution rather than surrounding web UI text.',
      availableVariables: promptVariables,
      templateText:
        'Respond only with your new contribution. Do not repeat the transcript, the prompt, sidebar/history text, UI labels, source panels, or this instruction block.',
    },
  ];
}

export function renderPromptPreview(templateText: string) {
  return Object.entries(promptVariableTokens).reduce(
    (previewText, [variable, token]) =>
      previewText
        .split(token)
        .join(promptVariablePreviewValues[variable as keyof typeof promptVariableTokens]),
    templateText,
  );
}
