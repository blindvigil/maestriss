import type { DriverConfig } from '../../types/driver';
import type { Participant } from '../../types/participant';
import type { PromptTemplate } from '../../types/prompt';
import type { MaestrissProject } from '../../types/project';
import {
  createActiveTabNode,
  createDelayNode,
  createEdge,
  createJavaScriptNode,
  createSwitchTabNode,
  createTriggerNode,
} from './nodeFactory';
import {
  createExtractScript,
  createFinalCopyScript,
  createInitializeScript,
  createPastePromptScript,
  createSubmitScript,
} from './scripts';
import type { AutomaNode, AutomaParticipantStep, AutomaWorkflow } from './types';

function getTemplate(project: MaestrissProject, id: PromptTemplate['id']) {
  return (
    project.prompts.templates.find((template) => template.id === id) ??
    project.prompts.templates[0]
  );
}

function getDriver(project: MaestrissProject, participant: Participant) {
  return project.drivers.find((driver) => driver.participantId === participant.id);
}

function getMatchPattern(participant: Participant, driver: DriverConfig | undefined) {
  const pattern = driver?.urlPattern || participant.urlPattern;

  try {
    const url = new URL(pattern);
    return `*://${url.hostname}/*`;
  } catch {
    return `*://${participant.provider}/*`;
  }
}

function createParticipantSteps(project: MaestrissProject): AutomaParticipantStep[] {
  const participantsByName = new Map(
    project.participants
      .filter((participant) => participant.enabled)
      .map((participant) => [participant.name, participant]),
  );
  const orderedParticipants = project.workflow.currentOrder
    .map((participantName) => participantsByName.get(participantName))
    .filter((participant): participant is Participant => Boolean(participant));
  const missingParticipants = project.participants.filter(
    (participant) =>
      participant.enabled &&
      !orderedParticipants.some((orderedParticipant) => orderedParticipant.id === participant.id),
  );

  return [...orderedParticipants, ...missingParticipants].map((participant) => {
    const driver = getDriver(project, participant);

    return {
      id: participant.id,
      name: participant.name,
      provider: participant.provider,
      urlPattern: driver?.urlPattern || participant.urlPattern,
      matchPattern: getMatchPattern(participant, driver),
      tabTitle: participant.name,
      profileInstructions: participant.role,
      isFinalEditor: participant.name === project.workflow.finalEditor || participant.position === 'final',
    };
  });
}

function getSelectedSessionTitle(project: MaestrissProject) {
  return (
    project.sessions.items.find(
      (session) => session.id === project.sessions.selectedSessionId,
    )?.title ?? project.metadata.workflowName
  );
}

function addLinearEdge(nodes: AutomaNode[], edges: AutomaWorkflow['drawflow']['edges']) {
  if (nodes.length < 2) {
    return;
  }

  const source = nodes[nodes.length - 2];
  const target = nodes[nodes.length - 1];
  edges.push(createEdge(source.id, target.id));
}

export function generateAutomaWorkflow(project: MaestrissProject): AutomaWorkflow {
  const steps = createParticipantSteps(project);
  const middleTemplate = getTemplate(project, 'middle-participant');
  const finalEditorTemplate = getTemplate(project, 'final-editor');
  const extractionTemplate = getTemplate(project, 'contribution-extraction');
  const nodes: AutomaNode[] = [];
  const edges: AutomaWorkflow['drawflow']['edges'] = [];
  const currentOrder = steps.map((step) => step.name);
  const sessionTitle = getSelectedSessionTitle(project);

  nodes.push(
    createTriggerNode(
      'trig001',
      0,
      0,
      'Manual start for generated Maestriss Automa workflow. Open participant tabs before running.',
    ),
  );
  nodes.push(
    createJavaScriptNode(
      'init001',
      0,
      140,
      'Initialize original prompt and rolling transcript',
      createInitializeScript(project.metadata.projectName),
      20000,
    ),
  );
  addLinearEdge(nodes, edges);

  steps.forEach((step, index) => {
    const columnX = 340 + index * 360;
    const indexLabel = String(index + 1).padStart(2, '0');
    const previousStep = steps[index - 1];
    const nextStep = steps[index + 1];
    const template = step.isFinalEditor ? finalEditorTemplate : middleTemplate;

    nodes.push(
      createSwitchTabNode(
        `switch_${indexLabel}`,
        columnX,
        0,
        step.tabTitle,
        step.matchPattern,
      ),
    );
    addLinearEdge(nodes, edges);

    nodes.push(createActiveTabNode(`act_${indexLabel}`, columnX, 120, step.name));
    addLinearEdge(nodes, edges);

    nodes.push(
      createJavaScriptNode(
        `paste_${indexLabel}`,
        columnX,
        250,
        `Paste Maestriss prompt into ${step.name}`,
        createPastePromptScript(step, previousStep, nextStep, template, sessionTitle, currentOrder),
        30000,
      ),
    );
    addLinearEdge(nodes, edges);

    nodes.push(
      createDelayNode(
        `submitdelay_${indexLabel}`,
        columnX,
        410,
        `Small pause before submitting ${step.name}`,
        '1000',
      ),
    );
    addLinearEdge(nodes, edges);

    nodes.push(
      createJavaScriptNode(
        `submit_${indexLabel}`,
        columnX,
        520,
        `Submit ${step.name} prompt`,
        createSubmitScript(step.name),
        20000,
      ),
    );
    addLinearEdge(nodes, edges);

    nodes.push(
      createDelayNode(
        `wait_${indexLabel}`,
        columnX,
        680,
        `Wait for ${step.name} response`,
        String(project.settings.defaultMaxWaitSeconds * 1000),
      ),
    );
    addLinearEdge(nodes, edges);

    nodes.push(
      createJavaScriptNode(
        `extract_${indexLabel}`,
        columnX,
        820,
        `Extract and append ${step.name} contribution`,
        createExtractScript(step.name, extractionTemplate.templateText),
        30000,
      ),
    );
    addLinearEdge(nodes, edges);
  });

  nodes.push(
    createJavaScriptNode(
      'finalcopy',
      340 + steps.length * 360,
      250,
      'Copy final rolling transcript',
      createFinalCopyScript(),
      20000,
    ),
  );
  addLinearEdge(nodes, edges);

  return {
    extVersion: '1.30.01',
    icon: 'riGlobalLine',
    table: [],
    version: '1.30.01',
    settings: {},
    globalData: '',
    includedWorkflows: {},
    name: `${project.metadata.projectName} - ${project.metadata.workflowName}`,
    description:
      'Generated by Maestriss. First-pass Automa 1.30.01 workflow export; review selectors and waits before running.',
    drawflow: {
      nodes,
      edges,
    },
  };
}
