export type ParticipantPosition = 'first' | 'standard' | 'final';

export type Participant = {
  id: string;
  name: string;
  provider: string;
  role: string;
  urlPattern: string;
  enabled: boolean;
  position: ParticipantPosition;
};
