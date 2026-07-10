import type { PromptTemplate } from '../../types/prompt';
import type { AutomaParticipantStep, AutomaSmartWaitConfig } from './types';

function toScriptString(value: unknown) {
  return JSON.stringify(value);
}

export function createInitializeScript(projectName: string) {
  return `(() => {
  const existing = automaRefData('variables', 'originalPrompt') || '';
  const seed = existing || '[Original prompt not captured - set originalPrompt before running ${projectName}]';
  automaSetVariable('originalPrompt', seed);
  automaSetVariable('roundtableTranscript', '====================\\nORIGINAL PROMPT\\n====================\\n\\n' + seed + '\\n');
  automaNextBlock();
})();`;
}

export function createPastePromptScript(
  step: AutomaParticipantStep,
  previousStep: AutomaParticipantStep | undefined,
  nextStep: AutomaParticipantStep | undefined,
  template: PromptTemplate,
  sessionTitle: string,
  currentOrder: string[],
) {
  return `(() => {
  const template = ${toScriptString(template.templateText)};
  const transcript = automaRefData('variables', 'roundtableTranscript') || '';
  const originalPrompt = automaRefData('variables', 'originalPrompt') || '';
  const values = {
    participantName: ${toScriptString(step.name)},
    previousParticipantName: ${toScriptString(previousStep?.name ?? 'None')},
    nextParticipantName: ${toScriptString(nextStep?.name ?? 'None')},
    originalPrompt,
    roundtableTranscript: transcript,
    currentOrder: ${toScriptString(currentOrder.join(' -> '))},
    profileInstructions: ${toScriptString(step.profileInstructions)},
    sessionTitle: ${toScriptString(sessionTitle)}
  };
  let prompt = template;
  for (const [key, value] of Object.entries(values)) {
    prompt = prompt.split('{{' + key + '}}').join(String(value));
  }

  function visible(el) {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 80 && rect.height > 15 && style.visibility !== 'hidden' && style.display !== 'none' && !el.disabled;
  }
  function setNativeValue(el, value) {
    const proto = Object.getPrototypeOf(el);
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  const candidates = [...document.querySelectorAll('textarea, div[contenteditable="true"], [role="textbox"], input[type="text"], input:not([type])')]
    .filter(visible)
    .sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom);
  const promptBox = candidates[0] || document.activeElement;
  if (!promptBox) throw new Error('Could not find prompt box on ${step.name}');
  promptBox.focus();
  if (promptBox.isContentEditable || promptBox.getAttribute('contenteditable') === 'true') {
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, prompt);
  } else {
    setNativeValue(promptBox, prompt);
  }
  automaNextBlock();
})();`;
}

export function createSubmitScript(participantName: string) {
  return `(() => {
  function visible(el) {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  }
  const labels = ['submit', 'send', 'ask', 'arrow'];
  const buttons = [...document.querySelectorAll('button, [role="button"]')].filter(visible);
  let button = buttons.find((candidate) => {
    const text = (candidate.innerText || '').toLowerCase();
    const aria = (candidate.getAttribute('aria-label') || '').toLowerCase();
    const title = (candidate.getAttribute('title') || '').toLowerCase();
    const combined = text + ' ' + aria + ' ' + title;
    return labels.some((label) => combined.includes(label)) && !candidate.disabled && candidate.getAttribute('aria-disabled') !== 'true';
  });
  if (!button) {
    button = buttons
      .filter((candidate) => !candidate.disabled && candidate.getAttribute('aria-disabled') !== 'true')
      .sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return (br.bottom - ar.bottom) || (br.right - ar.right);
      })[0];
  }
  if (button) button.click();
  else document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
  automaSetVariable('latestParticipant', ${toScriptString(participantName)});
  automaNextBlock();
})();`;
}

export function createSmartWaitScript(config: AutomaSmartWaitConfig) {
  return `(() => {
  const config = ${toScriptString(config)};
  const startedAt = Date.now();
  const hardTimeoutMs = config.hardTimeoutSeconds * 1000;
  const requiredStableMs = config.stableTextSeconds * 1000;
  const pollMs = 500;
  let lastAssistantText = '';
  let stableSince = Date.now();
  let finished = false;
  let timer = 0;
  let safetyTimer = 0;
  let lastDebug = {
    generatingVisible: false,
    stopVisible: false,
    sendReady: false,
    stableForMs: 0,
    lastTextLength: 0
  };

  function visible(el) {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  }

  function elementText(el) {
    return [
      el.innerText,
      el.textContent,
      el.getAttribute('aria-label'),
      el.getAttribute('title'),
      el.getAttribute('data-testid')
    ].filter(Boolean).join(' ').toLowerCase();
  }

  function visibleControls() {
    return [...document.querySelectorAll('button, [role="button"], [aria-label], [title]')].filter(visible);
  }

  function matchesAny(text, indicators) {
    const normalized = String(text || '').toLowerCase();
    return indicators.some((indicator) => normalized.includes(String(indicator).toLowerCase()));
  }

  function hasVisibleIndicator(indicators) {
    if (!indicators.length) return false;
    return [...document.querySelectorAll('button, [role="button"], [aria-label], [title], [data-testid], [aria-live], [role="status"], span, div')]
      .filter(visible)
      .some((el) => matchesAny(elementText(el), indicators));
  }

  function hasStopControl() {
    return visibleControls().some((control) => matchesAny(elementText(control), config.stopIndicators));
  }

  function isEnabled(el) {
    return !el.disabled && el.getAttribute('aria-disabled') !== 'true' && !el.hasAttribute('disabled');
  }

  function composerRoot() {
    return document.querySelector('form[data-type="unified-composer"]') ||
      document.querySelector('[data-testid="composer"]') ||
      document.querySelector('[data-testid="chat-input"]')?.closest('form') ||
      document.querySelector('[contenteditable="true"]')?.closest('form') ||
      document.querySelector('form') ||
      document.querySelector('[contenteditable="true"]')?.parentElement;
  }

  function hasUsableComposer() {
    if (!config.requireSendReady && !config.sendReadyIndicators.length) return true;
    const root = composerRoot() || document;
    const editable = root.querySelector('[contenteditable="true"], textarea, input[type="text"], input:not([type])');
    const editableReady = editable && visible(editable) && !editable.hasAttribute('disabled') && editable.getAttribute('aria-disabled') !== 'true';
    const readyIndicatorVisible = hasVisibleIndicator(config.sendReadyIndicators);
    const sendReady = [...root.querySelectorAll('button, [role="button"], [aria-label], [title]')]
      .filter(visible)
      .some((control) => {
        const text = elementText(control);
        return isEnabled(control) && matchesAny(text, config.sendReadyIndicators);
      });

    return Boolean(readyIndicatorVisible || editableReady || sendReady || !config.requireSendReady);
  }

  function querySelectorAllSafe(selector) {
    try {
      return [...document.querySelectorAll(selector)];
    } catch (error) {
      return [];
    }
  }

  function inChromeOrSidebar(el) {
    return Boolean(el.closest('nav, aside, header, footer, [role="navigation"], [aria-label*="history" i], [class*="sidebar" i], [class*="history" i]'));
  }

  function responseCandidates() {
    const preferred = config.preferredResponseSelectors.flatMap(querySelectorAllSafe);
    const generic = [
      ...document.querySelectorAll('[data-message-author-role="assistant"]'),
      ...document.querySelectorAll('[data-testid*="assistant" i]'),
      ...document.querySelectorAll('[data-testid*="message" i]'),
      ...document.querySelectorAll('[data-testid*="answer" i]'),
      ...document.querySelectorAll('[class*="assistant" i]'),
      ...document.querySelectorAll('[class*="message" i]'),
      ...document.querySelectorAll('[class*="answer" i]'),
      ...document.querySelectorAll('[class*="response" i]'),
      ...document.querySelectorAll('[class*="markdown" i]'),
      ...document.querySelectorAll('[class*="prose" i]'),
      ...document.querySelectorAll('article'),
      ...document.querySelectorAll('main section')
    ];

    return [
      ...new Set([...preferred, ...generic])
    ].filter((candidate) => visible(candidate) && !inChromeOrSidebar(candidate));
  }

  function findLastAssistantMessage() {
    const candidates = responseCandidates()
      .filter((candidate) => {
        const text = (candidate.textContent || '').trim();
        const lowerText = text.toLowerCase();
        return text.length > 0 &&
          !matchesAny(lowerText, config.stopIndicators) &&
          !matchesAny(lowerText, config.respondingIndicators) &&
          !lowerText.startsWith('you ') &&
          !lowerText.startsWith('user ');
      })
      .sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom);

    return candidates[0] || null;
  }

  function getLastAssistantText() {
    const message = findLastAssistantMessage();
    return message ? (message.textContent || '').trim() : '';
  }

  function setDebug(status, generatingVisible, stopVisible, sendReady, stableForMs, lastTextLength) {
    automaSetVariable(config.statusVariablePrefix + 'WaitStatus', status);
    automaSetVariable(config.statusVariablePrefix + 'GeneratingVisible', String(generatingVisible));
    automaSetVariable(config.statusVariablePrefix + 'StopVisible', String(stopVisible));
    automaSetVariable(config.statusVariablePrefix + 'SendReady', String(sendReady));
    automaSetVariable(config.statusVariablePrefix + 'StableMs', String(stableForMs));
    automaSetVariable(config.statusVariablePrefix + 'LastTextLength', String(lastTextLength));
  }

  function finish(reason) {
    if (finished) return;
    finished = true;
    clearInterval(timer);
    clearTimeout(safetyTimer);
    setDebug(
      reason,
      lastDebug.generatingVisible,
      lastDebug.stopVisible,
      lastDebug.sendReady,
      lastDebug.stableForMs,
      lastDebug.lastTextLength
    );
    automaSetVariable(config.statusVariablePrefix + 'WaitFinishedAt', String(Date.now()));
    automaNextBlock();
  }

  timer = setInterval(() => {
    try {
      const now = Date.now();
      const currentText = getLastAssistantText();
      if (currentText !== lastAssistantText) {
        lastAssistantText = currentText;
        stableSince = now;
      }

      const stableForMs = now - stableSince;
      const generatingVisible = hasVisibleIndicator(config.respondingIndicators);
      const stopVisible = hasStopControl();
      const sendReady = hasUsableComposer();
      const textStable = currentText.length > 0 && stableForMs >= requiredStableMs;
      const generatingClear = !config.requireGeneratingClearance || !generatingVisible;
      lastDebug = {
        generatingVisible,
        stopVisible,
        sendReady,
        stableForMs,
        lastTextLength: currentText.length
      };

      const timedOut = now - startedAt >= hardTimeoutMs;
      const complete = !stopVisible && sendReady && textStable && generatingClear;
      setDebug(timedOut ? 'timeout' : complete ? 'complete' : 'waiting', generatingVisible, stopVisible, sendReady, stableForMs, currentText.length);

      if (timedOut) {
        finish('timeout');
      } else if (complete) {
        finish('complete');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      finish('error: ' + message);
    }
  }, pollMs);

  safetyTimer = setTimeout(() => {
    finish('safety-timeout');
  }, hardTimeoutMs + 10000);
})();`;
}

export function createExtractScript(participantName: string, extractionInstruction: string) {
  return `(async () => {
  const participantName = ${toScriptString(participantName)};
  const instruction = ${toScriptString(extractionInstruction)};
  const originalPrompt = automaRefData('variables', 'originalPrompt') || '';
  const uiExact = new Set([
    'New Chat', 'Sign In', 'Login', 'Sign up', 'Settings', 'Account', 'Copy', 'Copied',
    'Share', 'Like', 'Dislike', 'Sources', 'Search', 'Send', 'Submit', 'Stop generating',
    'Regenerate', 'Home', 'Library', 'Upgrade', 'Try Pro'
  ]);
  function cleanText(raw) {
    let text = String(raw || '').replace(/\\r/g, '\\n');
    let lines = text.split(/\\n+/).map((line) => line.trim()).filter(Boolean);
    lines = lines.filter((line) => !uiExact.has(line));
    text = lines.join('\\n');
    if (originalPrompt) text = text.split(originalPrompt).join('');
    text = text.split(instruction).join('');
    return text.replace(/\\n{3,}/g, '\\n\\n').trim();
  }
  const raw = document.body ? document.body.innerText : '';
  const latest = cleanText(raw) || '[No clean response text detected. Review this participant manually.]';
  let transcript = automaRefData('variables', 'roundtableTranscript') || '';
  transcript += '\\n\\n====================\\n' + participantName + '\\n====================\\n\\n' + latest + '\\n';
  automaSetVariable('latestResponse', latest);
  automaSetVariable('roundtableTranscript', transcript);
  try { await navigator.clipboard.writeText(transcript); } catch (error) {}
  automaNextBlock();
})();`;
}

export function createFinalCopyScript() {
  return `(async () => {
  const transcript = automaRefData('variables', 'roundtableTranscript') || '';
  try { await navigator.clipboard.writeText(transcript); } catch (error) {}
  automaSetVariable('finalTranscript', transcript);
  automaNextBlock();
})();`;
}
