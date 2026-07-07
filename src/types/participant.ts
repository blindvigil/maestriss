export type ParticipantPosition = 'first' | 'standard' | 'final';

export type ParticipantPositionOption = {
  value: ParticipantPosition;
  label: string;
  detail: string;
};

export type Participant = {
  id: string;
  name: string;
  provider: string;
  role: string;
  urlPattern: string;
  enabled: boolean;
  position: ParticipantPosition;
};
