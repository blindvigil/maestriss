export type SessionStatus = 'Completed' | 'Failed' | 'Draft' | 'In Progress';

export type SessionContribution = {
  id: string;
  participantName: string;
  profileName: string;
  summary: string;
  lengthEstimate: string;
};

export type SessionHistoryItem = {
  id: string;
  title: string;
  originalPrompt: string;
  startedAt: string;
  participantOrder: string[];
  finalEditor: string;
  profile: string;
  status: SessionStatus;
  duration: string;
  contributionCount: number;
  lengthEstimate: string;
  contributions: SessionContribution[];
  finalAnswerPlaceholder: string;
};

export type SessionFilters = {
  status: SessionStatus | 'All';
  finalEditor: string;
  profile: string;
};
