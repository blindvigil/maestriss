import { Check, GripVertical, ToggleLeft, ToggleRight } from 'lucide-react';
import type { Participant, ParticipantPosition } from '../../types/participant';
import './ParticipantCard.css';

const positionLabels: Record<ParticipantPosition, string> = {
  first: 'First',
  standard: 'Standard',
  final: 'Final',
};

type ParticipantCardProps = {
  participant: Participant;
  onPositionChange: (id: string, position: ParticipantPosition) => void;
  onToggleEnabled: (id: string) => void;
};

export function ParticipantCard({
  participant,
  onPositionChange,
  onToggleEnabled,
}: ParticipantCardProps) {
  const ToggleIcon = participant.enabled ? ToggleRight : ToggleLeft;

  return (
    <article className="participant-card">
      <div className="participant-card__identity">
        <div className="participant-card__drag" aria-hidden="true">
          <GripVertical size={16} />
        </div>
        <div>
          <h3>{participant.name}</h3>
          <p>{participant.provider}</p>
        </div>
      </div>

      <div className="participant-card__detail participant-card__detail--role">
        <span>Role</span>
        <strong>{participant.role}</strong>
      </div>

      <div className="participant-card__detail">
        <span>URL Pattern</span>
        <code>{participant.urlPattern}</code>
      </div>

      <div className="participant-card__controls">
        <button
          className="participant-card__toggle"
          data-enabled={participant.enabled}
          onClick={() => onToggleEnabled(participant.id)}
          type="button"
        >
          <ToggleIcon size={24} aria-hidden="true" />
          <span>{participant.enabled ? 'Enabled' : 'Disabled'}</span>
        </button>

        <div className="participant-card__position" aria-label={`${participant.name} position`}>
          {(Object.keys(positionLabels) as ParticipantPosition[]).map((position) => {
            const isSelected = participant.position === position;

            return (
              <button
                aria-pressed={isSelected}
                className="participant-card__position-option"
                data-selected={isSelected}
                key={position}
                onClick={() => onPositionChange(participant.id, position)}
                type="button"
              >
                {isSelected && <Check size={13} aria-hidden="true" />}
                <span>{positionLabels[position]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
}
