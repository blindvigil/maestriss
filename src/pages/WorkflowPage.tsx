import { Dice5, GitBranch } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { PromptPanel } from '../components/workflow/PromptPanel';
import { RunFlow } from '../components/workflow/RunFlow';
import { WorkflowSection } from '../components/workflow/WorkflowSection';
import { useProject } from '../context/ProjectContext';
import type { Participant } from '../types/participant';
import type { PromptPreview, WorkflowGroup } from '../types/workflow';
import './WorkflowPage.css';

function shuffleParticipants(participants: Participant[]): Participant[] {
  const shuffled = [...participants];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function createHandoffPrompt(runOrder: Participant[]): PromptPreview {
  const currentParticipant = runOrder[0];
  const nextParticipant = runOrder[1];

  return {
    eyebrow: 'Prompt Preview',
    title: nextParticipant
      ? `${currentParticipant?.name ?? 'Maestriss'} to ${nextParticipant.name}`
      : 'Next Participant Handoff',
    body: nextParticipant
      ? `You are ${nextParticipant.name} from ${nextParticipant.provider}.

Review the previous participant's response, preserve the strongest findings, and add your own perspective.

Focus on your role:
${nextParticipant.role}

Return:
1. Agreements worth preserving
2. Corrections or gaps
3. A concise improved answer for the next participant`
      : 'Add at least two enabled participants to preview a handoff prompt.',
  };
}

function createFinalEditorPrompt(finalEditor: Participant | undefined, runOrder: Participant[]): PromptPreview {
  return {
    eyebrow: 'Final Editor Prompt',
    title: finalEditor ? `${finalEditor.name} synthesis pass` : 'Final synthesis pass',
    body: finalEditor
      ? `You are ${finalEditor.name}, the fixed final editor for this Maestriss run.

Synthesize the full chain of participant responses into one coherent final answer.

Run order:
${runOrder.map((participant, index) => `${index + 1}. ${participant.name}`).join('\n')}

Resolve conflicts, remove duplication, call out uncertainty, and produce the answer a thoughtful human editor would be comfortable publishing.`
      : 'Assign and enable a final editor to preview the synthesis prompt.',
  };
}

export function WorkflowPage() {
  const { project, updateProject } = useProject();
  const { participants } = project;

  const enabledParticipants = useMemo(
    () => participants.filter((participant) => participant.enabled),
    [participants],
  );

  const fixedFirstParticipants = useMemo(
    () => enabledParticipants.filter((participant) => participant.position === 'first'),
    [enabledParticipants],
  );

  const randomizedMiddleParticipants = useMemo(
    () => enabledParticipants.filter((participant) => participant.position === 'standard'),
    [enabledParticipants],
  );

  const finalEditors = useMemo(
    () => enabledParticipants.filter((participant) => participant.position === 'final'),
    [enabledParticipants],
  );

  const middleSignature = randomizedMiddleParticipants
    .map((participant) => `${participant.id}:${participant.enabled}:${participant.position}`)
    .join('|');

  useEffect(() => {
    const defaultOrder = [
      ...fixedFirstParticipants,
      ...randomizedMiddleParticipants,
      ...finalEditors,
    ].map((participant) => participant.name);

    if (defaultOrder.join('|') !== project.workflow.currentOrder.join('|')) {
      updateProject((currentProject) => ({
        ...currentProject,
        workflow: {
          ...currentProject.workflow,
          currentOrder: defaultOrder,
        },
      }));
    }
  }, [middleSignature]);

  const previewMiddleParticipants = useMemo(() => {
    const middleByName = new Map(
      randomizedMiddleParticipants.map((participant) => [participant.name, participant]),
    );
    const orderedMiddleParticipants = project.workflow.currentOrder
      .map((participantName) => middleByName.get(participantName))
      .filter((participant): participant is Participant => Boolean(participant));
    const missingMiddleParticipants = randomizedMiddleParticipants.filter(
      (participant) =>
        !orderedMiddleParticipants.some(
          (orderedParticipant) => orderedParticipant.id === participant.id,
        ),
    );

    return [...orderedMiddleParticipants, ...missingMiddleParticipants];
  }, [project.workflow.currentOrder, randomizedMiddleParticipants]);

  const previewRunOrder = useMemo(
    () => [...fixedFirstParticipants, ...previewMiddleParticipants, ...finalEditors],
    [finalEditors, fixedFirstParticipants, previewMiddleParticipants],
  );

  const workflowGroups: WorkflowGroup[] = [
    {
      title: 'Fixed First',
      description: 'Participants that always open the run and establish initial context.',
      participants: fixedFirstParticipants,
    },
    {
      title: 'Randomized Middle',
      description: 'Participants shuffled between the opening context and final edit.',
      participants: randomizedMiddleParticipants,
    },
    {
      title: 'Final Editor',
      description: 'Participants that synthesize the completed chain into the final answer.',
      participants: finalEditors,
    },
  ];

  const handoffPrompt = createHandoffPrompt(previewRunOrder);
  const finalEditorPrompt = createFinalEditorPrompt(finalEditors[0], previewRunOrder);

  const handlePreviewRandomizedRun = () => {
    const shuffledMiddleParticipants = shuffleParticipants(randomizedMiddleParticipants);

    updateProject((currentProject) => ({
      ...currentProject,
      workflow: {
        ...currentProject.workflow,
        currentOrder: [
          ...fixedFirstParticipants,
          ...shuffledMiddleParticipants,
          ...finalEditors,
        ].map((participant) => participant.name),
      },
    }));
  };

  return (
    <section className="workflow-page" aria-labelledby="workflow-title">
      <div className="workflow-page__hero">
        <div className="workflow-page__intro">
          <p className="eyebrow">Workflow Designer</p>
          <h2 id="workflow-title">Orchestration order</h2>
          <p>
            Preview how Maestriss will pass a prompt through fixed openers, randomized middle
            participants, and the final synthesis editor.
          </p>
        </div>
        <button
          className="workflow-page__primary-action"
          onClick={handlePreviewRandomizedRun}
          type="button"
        >
          <Dice5 size={18} aria-hidden="true" />
          <span>Preview Randomized Run</span>
        </button>
      </div>

      <div className="workflow-page__sections">
        {workflowGroups.map((group) => (
          <WorkflowSection
            key={group.title}
            randomized={group.title === 'Randomized Middle'}
            {...group}
          />
        ))}
      </div>

      <section className="workflow-page__flow-panel" aria-labelledby="run-order-title">
        <div className="workflow-page__panel-header">
          <div>
            <p className="eyebrow">Run Preview</p>
            <h3 id="run-order-title">Full run order</h3>
          </div>
          <GitBranch size={20} aria-hidden="true" />
        </div>
        <RunFlow participants={previewRunOrder} />
      </section>

      <div className="workflow-page__prompts">
        <PromptPanel {...handoffPrompt} />
        <PromptPanel {...finalEditorPrompt} />
      </div>
    </section>
  );
}
