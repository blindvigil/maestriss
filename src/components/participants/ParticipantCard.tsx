import { Check, GripVertical, ToggleLeft, ToggleRight } from 'lucide-react';
import { participantPositionOptions } from '../../config/participantPositions';
import type { Participant, ParticipantPosition } from '../../types/participant';
import './ParticipantCard.css';

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
  const selectedPosition = participantPositionOptions.find(
    (option) => option.value === participant.position,
  );

  return (
    <article className="participant-card">
      <div className="participant-card__identity">
        <div className="participant-card__drag" aria-hidden="true">
          <GripVertical size={16} />
        </div>
        <div>
          <h3>{participant.name}</h3>
          <span>Provider/Site</span>
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

        <div className="participant-card__position-group">
          <span>Position</span>
          <div className="participant-card__position" aria-label={`${participant.name} position`}>
            {participantPositionOptions.map((position) => {
              const isSelected = participant.position === position.value;

              return (
                <button
                  aria-pressed={isSelected}
                  className="participant-card__position-option"
                  data-selected={isSelected}
                  key={position.value}
                  onClick={() => onPositionChange(participant.id, position.value)}
                  title={position.detail}
                  type="button"
                >
                  {isSelected && <Check size={13} aria-hidden="true" />}
                  <span>{position.label}</span>
                </button>
              );
            })}
          </div>
          <strong>{selectedPosition?.detail}</strong>
        </div>
      </div>
    </article>
  );
}
