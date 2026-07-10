export function normalizeCopilotCandidateText(text: string) {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function isCopilotShellOrStatusText(text: string) {
  const normalized = normalizeCopilotCandidateText(text);

  return normalized.length === 0 ||
    normalized === 'new chat' ||
    normalized === 'search' ||
    normalized === 'library' ||
    normalized === 'stopped generating' ||
    normalized === 'copilot said:' ||
    normalized.includes('new chatsearchlibrary') ||
    normalized.includes('what can i help with?') ||
    normalized.includes('drop your files here') ||
    normalized.includes('message copilot') ||
    normalized.includes('copilot is an ai and may make mistakes') ||
    normalized.includes('copilot can make mistakes') ||
    normalized.includes('terms') && normalized.includes('privacy') ||
    normalized.includes('microsoft 365 copilot');
}

export function isCopilotPromptOnly(text: string, promptNeedle = '') {
  if (!promptNeedle) {
    return false;
  }

  const normalized = normalizeCopilotCandidateText(text);
  const normalizedPrompt = normalizeCopilotCandidateText(promptNeedle);

  return normalized === normalizedPrompt ||
    (normalized.includes(normalizedPrompt) && normalized.length <= normalizedPrompt.length + 160);
}

export function evaluateCopilotCandidateText(text: string, promptNeedle = '') {
  if (isCopilotShellOrStatusText(text)) {
    return {
      accepted: false,
      reason: 'copilot-shell-or-status-text',
    };
  }

  if (isCopilotPromptOnly(text, promptNeedle)) {
    return {
      accepted: false,
      reason: 'submitted-prompt-only',
    };
  }

  return {
    accepted: true,
  };
}
