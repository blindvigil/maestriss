export type AutomaNodeLabel =
  | 'trigger'
  | 'switch-tab'
  | 'active-tab'
  | 'javascript-code'
  | 'delay';

export type AutomaNode = {
  id: string;
  type: 'BlockBasic' | 'BlockDelay';
  initialized: false;
  position: {
    x: number;
    y: number;
  };
  data: Record<string, unknown>;
  label: AutomaNodeLabel;
};

export type AutomaEdge = {
  id: string;
  label: '';
  markerEnd: 'arrowclosed';
  selectable: true;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  type: 'custom';
  updatable: true;
  data: Record<string, never>;
};

export type AutomaWorkflow = {
  extVersion: '1.30.01';
  icon: 'riGlobalLine';
  table: unknown[];
  version: '1.30.01';
  settings: Record<string, unknown>;
  globalData: '';
  includedWorkflows: Record<string, unknown>;
  name: string;
  description: string;
  drawflow: {
    nodes: AutomaNode[];
    edges: AutomaEdge[];
  };
};

export type AutomaSmartWaitDriver =
  | 'chatgpt'
  | 'claude'
  | 'perplexity'
  | 'gemini'
  | 'copilot'
  | 'grok'
  | 'deepseek'
  | 'reka'
  | 'google'
  | 'generic';

export type AutomaWaitStrategy = 'smart-wait';

export type AutomaSmartWaitConfig = {
  waitStrategy: AutomaWaitStrategy;
  hardTimeoutSeconds: number;
  stableTextSeconds: number;
  statusVariablePrefix: string;
  stopIndicators: string[];
  respondingIndicators: string[];
  sendReadyIndicators: string[];
  preferredResponseSelectors: string[];
  requireSendReady: boolean;
  requireGeneratingClearance: boolean;
};

export type AutomaParticipantStep = {
  id: string;
  name: string;
  provider: string;
  urlPattern: string;
  matchPattern: string;
  tabTitle: string;
  profileInstructions: string;
  isFinalEditor: boolean;
  smartWaitDriver: AutomaSmartWaitDriver;
};
