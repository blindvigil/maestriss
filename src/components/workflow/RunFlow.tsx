import { ArrowRight } from 'lucide-react';
import type { Participant } from '../../types/participant';
import './RunFlow.css';

type RunFlowProps = {
  participants: Participant[];
};

export function RunFlow({ participants }: RunFlowProps) {
  return (
    <div className="run-flow" aria-label="Preview run order">
      {participants.length > 0 ? (
        participants.map((participant, index) => (
          <div className="run-flow__step" key={participant.id}>
            <article>
              <span>{index + 1}</span>
              <strong>{participant.name}</strong>
            </article>
            {index < participants.length - 1 && <ArrowRight size={18} aria-hidden="true" />}
          </div>
        ))
      ) : (
        <p>No enabled participants available for this run.</p>
      )}
    </div>
  );
}
