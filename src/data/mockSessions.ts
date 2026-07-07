import type { SessionHistoryItem } from '../types/session';

export const mockSessions: SessionHistoryItem[] = [
  {
    id: 'session-council-draft',
    title: 'Council Draft: Product Strategy Memo',
    originalPrompt:
      'Review this product strategy memo and produce a sharper recommendation for the next planning cycle.',
    startedAt: '2026-07-07T09:18:00-07:00',
    participantOrder: ['Google', 'Perplexity', 'ChatGPT', 'Gemini', 'Claude'],
    finalEditor: 'Claude',
    profile: 'Peer Review',
    status: 'Completed',
    duration: '7m 42s',
    contributionCount: 5,
    lengthEstimate: '~4.8k tokens',
    contributions: [
      {
        id: 'c-google',
        participantName: 'Google',
        profileName: 'Researcher',
        summary: 'Grounded the memo in market context and flagged assumptions needing evidence.',
        lengthEstimate: '~820 tokens',
      },
      {
        id: 'c-perplexity',
        participantName: 'Perplexity',
        profileName: 'Researcher',
        summary: 'Added source-oriented questions and competitive comparison points.',
        lengthEstimate: '~910 tokens',
      },
      {
        id: 'c-chatgpt',
        participantName: 'ChatGPT',
        profileName: 'Peer Review',
        summary: 'Reorganized the argument and corrected vague success criteria.',
        lengthEstimate: '~1.1k tokens',
      },
      {
        id: 'c-gemini',
        participantName: 'Gemini',
        profileName: "Devil's Advocate",
        summary: 'Challenged the rollout timeline and surfaced adoption risks.',
        lengthEstimate: '~960 tokens',
      },
      {
        id: 'c-claude',
        participantName: 'Claude',
        profileName: 'Editor-in-Chief',
        summary: 'Synthesized the roundtable into a polished executive recommendation.',
        lengthEstimate: '~1k tokens',
      },
    ],
    finalAnswerPlaceholder:
      'Final synthesized answer placeholder: a concise recommendation, key risks, and next-step plan would appear here.',
  },
  {
    id: 'session-technical-review',
    title: 'Technical Review: Browser Driver Plan',
    originalPrompt:
      'Evaluate the proposed browser driver architecture for reliability, selector strategy, and failure recovery.',
    startedAt: '2026-07-06T16:04:00-07:00',
    participantOrder: ['Google', 'DeepSeek', 'Copilot', 'Grok', 'Claude'],
    finalEditor: 'Claude',
    profile: 'Technical Reviewer',
    status: 'Completed',
    duration: '5m 19s',
    contributionCount: 5,
    lengthEstimate: '~3.9k tokens',
    contributions: [
      {
        id: 'c-deepseek',
        participantName: 'DeepSeek',
        profileName: 'Technical Reviewer',
        summary: 'Identified selector brittleness and suggested driver-level retries.',
        lengthEstimate: '~1k tokens',
      },
      {
        id: 'c-copilot',
        participantName: 'Copilot',
        profileName: 'Technical Reviewer',
        summary: 'Added implementation concerns around timeouts and local state transitions.',
        lengthEstimate: '~780 tokens',
      },
      {
        id: 'c-grok',
        participantName: 'Grok',
        profileName: 'Skeptic',
        summary: 'Stress-tested assumptions about web UI stability and auth boundaries.',
        lengthEstimate: '~840 tokens',
      },
    ],
    finalAnswerPlaceholder:
      'Final synthesized answer placeholder: architecture risks, reliability recommendations, and next experiments would appear here.',
  },
  {
    id: 'session-explainer-draft',
    title: 'Explainer Draft: Maestriss Workflow',
    originalPrompt:
      'Explain Maestriss to a non-technical collaborator and show why roundtable orchestration is useful.',
    startedAt: '2026-07-05T11:42:00-07:00',
    participantOrder: ['Google', 'ChatGPT', 'Reka Chat', 'Claude'],
    finalEditor: 'Claude',
    profile: 'Explainer',
    status: 'Draft',
    duration: 'Not run',
    contributionCount: 0,
    lengthEstimate: 'Pending',
    contributions: [],
    finalAnswerPlaceholder:
      'Draft session placeholder: no synthesized answer has been generated yet.',
  },
  {
    id: 'session-market-scan',
    title: 'Market Scan: AI Research Assistants',
    originalPrompt:
      'Compare current AI research assistants and identify where Maestriss should differentiate.',
    startedAt: '2026-07-07T10:31:00-07:00',
    participantOrder: ['Google', 'Perplexity', 'Gemini', 'Claude'],
    finalEditor: 'Claude',
    profile: 'Researcher',
    status: 'In Progress',
    duration: '2m 08s',
    contributionCount: 2,
    lengthEstimate: '~1.7k tokens so far',
    contributions: [
      {
        id: 'c-market-google',
        participantName: 'Google',
        profileName: 'Researcher',
        summary: 'Collected broad search context and category language.',
        lengthEstimate: '~760 tokens',
      },
      {
        id: 'c-market-perplexity',
        participantName: 'Perplexity',
        profileName: 'Researcher',
        summary: 'Added source-oriented differentiation notes.',
        lengthEstimate: '~940 tokens',
      },
    ],
    finalAnswerPlaceholder:
      'In-progress placeholder: final synthesis will appear after the remaining participants complete.',
  },
  {
    id: 'session-failed-critique',
    title: 'Failed Session: Policy Critique',
    originalPrompt:
      'Critique the internal policy draft for contradictions, ambiguity, and missing stakeholder impacts.',
    startedAt: '2026-07-04T14:12:00-07:00',
    participantOrder: ['Google', 'Grok', 'Claude'],
    finalEditor: 'Claude',
    profile: 'Skeptic',
    status: 'Failed',
    duration: '1m 03s',
    contributionCount: 1,
    lengthEstimate: '~640 tokens before failure',
    contributions: [
      {
        id: 'c-failed-google',
        participantName: 'Google',
        profileName: 'Researcher',
        summary: 'Initial context pass completed before the session stopped.',
        lengthEstimate: '~640 tokens',
      },
    ],
    finalAnswerPlaceholder:
      'Failed session placeholder: no final synthesis was produced.',
  },
];
