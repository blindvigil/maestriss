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
  createSmartWaitScript,
  createSubmitScript,
} from './scripts';
import type {
  AutomaNode,
  AutomaParticipantStep,
  AutomaSmartWaitConfig,
  AutomaSmartWaitDriver,
  AutomaWorkflow,
} from './types';

function getTemplate(project: MaestrissProject, id: PromptTemplate['id']) {
  return (
    project.prompts.templates.find((template) => template.id === id) ??
    project.prompts.templates[0]
  );
}

const defaultParticipantMatchPatterns: Record<string, string> = {
  chatgpt: 'https://chatgpt.com/*',
  claude: 'https://claude.ai/*',
  deepseek: 'https://chat.deepseek.com/*',
  gemini: 'https://gemini.google.com/*',
  grok: 'https://grok.com/*',
  copilot: 'https://copilot.microsoft.com/*',
  perplexity: 'https://www.perplexity.ai/*',
  'reka-chat': 'https://app.reka.ai/*',
  google: 'https://www.google.com/*',
};

function getSmartWaitDriver(participant: Participant): AutomaSmartWaitDriver {
  const identity = `${participant.id} ${participant.name} ${participant.provider}`.toLowerCase();

  if (identity.includes('chatgpt')) {
    return 'chatgpt';
  }

  if (identity.includes('claude')) {
    return 'claude';
  }

  if (identity.includes('perplexity')) {
    return 'perplexity';
  }

  if (identity.includes('gemini')) {
    return 'gemini';
  }

  if (identity.includes('copilot')) {
    return 'copilot';
  }

  if (identity.includes('grok')) {
    return 'grok';
  }

  if (identity.includes('deepseek')) {
    return 'deepseek';
  }

  if (identity.includes('reka')) {
    return 'reka';
  }

  if (identity.includes('google')) {
    return 'google';
  }

  return 'generic';
}

function getMatchPattern(participant: Participant) {
  const defaultPattern = defaultParticipantMatchPatterns[participant.id];

  if (defaultPattern) {
    return defaultPattern;
  }

  try {
    const url = new URL(participant.urlPattern.replace(/\*$/, ''));
    return `${url.origin}/*`;
  } catch {
    return `https://${participant.provider}/*`;
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
    return {
      id: participant.id,
      name: participant.name,
      provider: participant.provider,
      urlPattern: participant.urlPattern,
      matchPattern: getMatchPattern(participant),
      tabTitle: participant.name,
      profileInstructions: participant.role,
      isFinalEditor: participant.name === project.workflow.finalEditor || participant.position === 'final',
      smartWaitDriver: getSmartWaitDriver(participant),
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

const commonStopIndicators = ['stop generating', 'stop'];
const commonSendReadyIndicators = [
  'send',
  'submit',
  'ask',
  'arrow',
  'send message',
  'prompt-button-send',
  'send-button',
];
const commonResponseSelectors = [
  '[data-message-author-role="assistant"]',
  '[data-testid*="assistant" i]',
  '[data-testid*="message" i]',
  '[class*="assistant" i]',
  '[class*="message" i]',
  '[class*="markdown" i]',
  '[class*="prose" i]',
  'article',
];

const smartWaitConfigs: Record<AutomaSmartWaitDriver, AutomaSmartWaitConfig> = {
  chatgpt: {
    waitStrategy: 'smart-wait',
    hardTimeoutSeconds: 90,
    stableTextSeconds: 4,
    statusVariablePrefix: 'chatgpt',
    stopIndicators: commonStopIndicators,
    respondingIndicators: ['generating', 'thinking', 'streaming'],
    sendReadyIndicators: commonSendReadyIndicators,
    preferredResponseSelectors: [
      '[data-message-author-role="assistant"]',
      '[data-testid*="conversation-turn"][data-testid*="assistant"]',
      '[class*="markdown"]',
      ...commonResponseSelectors,
    ],
    requireSendReady: true,
    requireGeneratingClearance: false,
  },
  claude: {
    waitStrategy: 'smart-wait',
    hardTimeoutSeconds: 240,
    stableTextSeconds: 6,
    statusVariablePrefix: 'claude',
    stopIndicators: commonStopIndicators,
    respondingIndicators: ['claude is responding'],
    sendReadyIndicators: commonSendReadyIndicators,
    preferredResponseSelectors: [
      '[data-is-streaming="false"]',
      '[class*="font-claude-message"]',
      '[class*="prose"]',
      ...commonResponseSelectors,
    ],
    requireSendReady: true,
    requireGeneratingClearance: false,
  },
  perplexity: {
    waitStrategy: 'smart-wait',
    hardTimeoutSeconds: 180,
    stableTextSeconds: 4,
    statusVariablePrefix: 'perplexity',
    stopIndicators: commonStopIndicators,
    respondingIndicators: ['generating', 'searching', 'loading', 'writing answer', 'answering'],
    sendReadyIndicators: commonSendReadyIndicators,
    preferredResponseSelectors: [
      '[data-testid*="answer" i]',
      '[class*="answer" i]',
      '[class*="prose"]',
      '[class*="markdown"]',
      'main article',
      'main section',
      ...commonResponseSelectors,
    ],
    requireSendReady: true,
    requireGeneratingClearance: false,
  },
  gemini: {
    waitStrategy: 'smart-wait',
    hardTimeoutSeconds: 210,
    stableTextSeconds: 5,
    statusVariablePrefix: 'gemini',
    stopIndicators: commonStopIndicators,
    respondingIndicators: ['generating', 'drafting', 'thinking', 'loading'],
    sendReadyIndicators: commonSendReadyIndicators,
    preferredResponseSelectors: [
      '[model-response]',
      '[class*="model-response"]',
      '[class*="response-container"]',
      '[class*="markdown"]',
      ...commonResponseSelectors,
    ],
    requireSendReady: true,
    requireGeneratingClearance: true,
  },
  copilot: {
    waitStrategy: 'smart-wait',
    hardTimeoutSeconds: 240,
    stableTextSeconds: 6,
    statusVariablePrefix: 'copilot',
    stopIndicators: commonStopIndicators,
    respondingIndicators: ['generating', 'thinking', 'searching', 'working', 'responding'],
    sendReadyIndicators: commonSendReadyIndicators,
    preferredResponseSelectors: [
      '[data-content="ai-message"]',
      '[class*="ac-container"]',
      '[class*="response"]',
      '[class*="markdown"]',
      ...commonResponseSelectors,
    ],
    requireSendReady: true,
    requireGeneratingClearance: true,
  },
  grok: {
    waitStrategy: 'smart-wait',
    hardTimeoutSeconds: 180,
    stableTextSeconds: 4,
    statusVariablePrefix: 'grok',
    stopIndicators: commonStopIndicators,
    respondingIndicators: ['thinking', 'generating', 'responding', 'loading'],
    sendReadyIndicators: commonSendReadyIndicators,
    preferredResponseSelectors: [
      '[class*="message"]',
      '[class*="response"]',
      '[class*="markdown"]',
      ...commonResponseSelectors,
    ],
    requireSendReady: true,
    requireGeneratingClearance: true,
  },
  deepseek: {
    waitStrategy: 'smart-wait',
    hardTimeoutSeconds: 210,
    stableTextSeconds: 5,
    statusVariablePrefix: 'deepseek',
    stopIndicators: ['stop generating', 'stop', 'continue'],
    respondingIndicators: ['generating', 'deepthink', 'thinking', 'reasoning', 'loading'],
    sendReadyIndicators: commonSendReadyIndicators,
    preferredResponseSelectors: [
      '[class*="message"]',
      '[class*="assistant"]',
      '[class*="markdown"]',
      ...commonResponseSelectors,
    ],
    requireSendReady: true,
    requireGeneratingClearance: true,
  },
  reka: {
    waitStrategy: 'smart-wait',
    hardTimeoutSeconds: 180,
    stableTextSeconds: 4,
    statusVariablePrefix: 'reka',
    stopIndicators: commonStopIndicators,
    respondingIndicators: ['generating', 'thinking', 'responding', 'loading'],
    sendReadyIndicators: commonSendReadyIndicators,
    preferredResponseSelectors: [
      '[class*="message"]',
      '[class*="assistant"]',
      '[class*="markdown"]',
      ...commonResponseSelectors,
    ],
    requireSendReady: true,
    requireGeneratingClearance: false,
  },
  google: {
    waitStrategy: 'smart-wait',
    hardTimeoutSeconds: 180,
    stableTextSeconds: 4,
    statusVariablePrefix: 'google',
    stopIndicators: [],
    respondingIndicators: ['loading', 'generating', 'searching'],
    sendReadyIndicators: ['ai mode response is ready'],
    preferredResponseSelectors: [
      '[data-attrid*="AI"]',
      '[class*="ai"]',
      '[class*="response"]',
      '[class*="answer"]',
      'main',
      ...commonResponseSelectors,
    ],
    requireSendReady: false,
    requireGeneratingClearance: false,
  },
  generic: {
    waitStrategy: 'smart-wait',
    hardTimeoutSeconds: 180,
    stableTextSeconds: 5,
    statusVariablePrefix: 'generic',
    stopIndicators: commonStopIndicators,
    respondingIndicators: ['generating', 'thinking', 'loading', 'responding'],
    sendReadyIndicators: commonSendReadyIndicators,
    preferredResponseSelectors: commonResponseSelectors,
    requireSendReady: true,
    requireGeneratingClearance: false,
  },
};

function createWaitNode(
  step: AutomaParticipantStep,
  indexLabel: string,
  columnX: number,
) {
  const config = smartWaitConfigs[step.smartWaitDriver];

  return createJavaScriptNode(
    `wait_${indexLabel}`,
    columnX,
    680,
    `Smart wait for ${step.name} generation to complete (${config.hardTimeoutSeconds}s hard timeout)`,
    createSmartWaitScript(config),
    (config.hardTimeoutSeconds + 10) * 1000,
  );
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
      'Manual start for generated Maestriss Automa workflow. Start on the first participant tab; later participant tabs should already be open.',
    ),
  );
  nodes.push(
    createActiveTabNode(
      'act_initial',
      0,
      120,
      'current active browser',
      'Attach to the currently active browser tab; this is assumed to be the first participant.',
    ),
  );
  addLinearEdge(nodes, edges);

  nodes.push(
    createJavaScriptNode(
      'init001',
      0,
      250,
      'Initialize original prompt and rolling transcript',
      createInitializeScript(project.metadata.projectName),
      20000,
    ),
  );
  addLinearEdge(nodes, edges);

  const firstStep = steps[0];

  if (firstStep) {
    // The startup participant is pre-answered, so no smart wait is generated before first extraction.
    nodes.push(
      createJavaScriptNode(
        'extract_01',
        0,
        410,
        `Extract ${firstStep.name} response from the active startup tab`,
        createExtractScript(firstStep.name, extractionTemplate.templateText),
        30000,
      ),
    );
    addLinearEdge(nodes, edges);
  }

  steps.forEach((step, index) => {
    if (index === 0) {
      return;
    }

    const columnX = 340 + (index - 1) * 360;
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
      createWaitNode(
        step,
        indexLabel,
        columnX,
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
