import type { ParticipantPosition, ParticipantPositionOption } from '../types/participant';

export const participantPositionOptions: ParticipantPositionOption[] = [
  {
    value: 'first',
    label: 'First',
    detail: 'Fixed first',
  },
  {
    value: 'standard',
    label: 'Standard',
    detail: 'Randomized middle',
  },
  {
    value: 'final',
    label: 'Final',
    detail: 'Fixed final editor',
  },
];

export const participantPositionDetails: Record<ParticipantPosition, string> =
  participantPositionOptions.reduce(
    (details, option) => ({
      ...details,
      [option.value]: option.detail,
    }),
    {} as Record<ParticipantPosition, string>,
  );
