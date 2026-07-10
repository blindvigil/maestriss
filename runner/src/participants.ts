export type RunnerParticipant = {
  id: string;
  name: string;
  url: string;
};

export const participants: RunnerParticipant[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chatgpt.com/',
  },
  {
    id: 'claude',
    name: 'Claude',
    url: 'https://claude.ai/new',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    url: 'https://chat.deepseek.com/',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    url: 'https://gemini.google.com/app',
  },
  {
    id: 'grok',
    name: 'Grok',
    url: 'https://grok.com/',
  },
  {
    id: 'copilot',
    name: 'Copilot',
    url: 'https://m365.cloud.microsoft/chat/',
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    url: 'https://www.perplexity.ai/',
  },
  {
    id: 'reka',
    name: 'Reka Chat',
    url: 'https://app.reka.ai/chat?utm_source=copilot.com',
  },
  {
    id: 'google',
    name: 'Google',
    url: 'https://www.google.com/ai',
  },
];
