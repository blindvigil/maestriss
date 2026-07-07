import type { PromptTemplate } from '../../types/prompt';
import type { AutomaParticipantStep } from './types';

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
