import type { AutomaEdge, AutomaNode, AutomaNodeLabel } from './types';

function createNode(
  id: string,
  label: AutomaNodeLabel,
  type: AutomaNode['type'],
  x: number,
  y: number,
  data: Record<string, unknown>,
): AutomaNode {
  return {
    id,
    type,
    initialized: false,
    position: { x, y },
    data,
    label,
  };
}

export function createTriggerNode(id: string, x: number, y: number, description: string) {
  return createNode(id, 'trigger', 'BlockBasic', x, y, {
    activeInInput: false,
    contextMenuName: '',
    contextTypes: [],
    date: '',
    days: [],
    delay: 5,
    description,
    disableBlock: false,
    interval: 60,
    isUrlRegex: false,
    observeElement: {
      baseElOptions: {
        attributeFilter: [],
        attributes: false,
        characterData: false,
        childList: true,
        subtree: false,
      },
      baseSelector: '',
      matchPattern: '',
      selector: '',
      targetOptions: {
        attributeFilter: [],
        attributes: false,
        characterData: false,
        childList: true,
        subtree: false,
      },
    },
    parameters: [],
    preferParamsInTab: false,
    shortcut: '',
    time: '00:00',
    type: 'manual',
    url: '',
  });
}

export function createSwitchTabNode(
  id: string,
  x: number,
  y: number,
  tabTitle: string,
  matchPattern: string,
) {
  return createNode(id, 'switch-tab', 'BlockBasic', x, y, {
    activeTab: true,
    createIfNoMatch: false,
    description: `Switch to ${tabTitle} tab by URL match pattern`,
    disableBlock: false,
    findTabBy: 'match-patterns',
    matchPattern,
    tabIndex: 0,
    tabTitle,
    url: '',
  });
}

export function createActiveTabNode(
  id: string,
  x: number,
  y: number,
  participantName: string,
  description = `Attach to ${participantName} tab`,
) {
  return createNode(id, 'active-tab', 'BlockBasic', x, y, {
    description,
    disableBlock: false,
  });
}

export function createJavaScriptNode(
  id: string,
  x: number,
  y: number,
  description: string,
  code: string,
  timeout = 30000,
) {
  return createNode(id, 'javascript-code', 'BlockBasic', x, y, {
    code,
    context: 'website',
    description,
    disableBlock: false,
    everyNewTab: false,
    execContext: 'popup',
    preloadScripts: [],
    runBeforeLoad: false,
    timeout,
  });
}

export function createDelayNode(id: string, x: number, y: number, description: string, time: string) {
  return createNode(id, 'delay', 'BlockDelay', x, y, {
    disableBlock: false,
    time,
    description,
  });
}

export function createEdge(source: string, target: string): AutomaEdge {
  return {
    data: {},
    id: `vueflow__edge-${source}-${target}`,
    label: '',
    markerEnd: 'arrowclosed',
    selectable: true,
    source,
    sourceHandle: `${source}-output-1`,
    target,
    targetHandle: `${target}-input-1`,
    type: 'custom',
    updatable: true,
  };
}
