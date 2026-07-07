import type { Participant } from '../../types/participant';
import './WorkflowSection.css';

type WorkflowSectionProps = {
  title: string;
  description: string;
  participants: Participant[];
  randomized?: boolean;
};

export function WorkflowSection({
  title,
  description,
  participants,
  randomized = false,
}: WorkflowSectionProps) {
  return (
    <section className="workflow-section" aria-label={title}>
      <div className="workflow-section__header">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        {randomized && <span>Randomized</span>}
      </div>

      <div className="workflow-section__list">
        {participants.length > 0 ? (
          participants.map((participant) => (
            <article className="workflow-section__participant" key={participant.id}>
              <div>
                <strong>{participant.name}</strong>
                <span>{participant.provider}</span>
              </div>
              <p>{participant.role}</p>
            </article>
          ))
        ) : (
          <p className="workflow-section__empty">No enabled participants assigned.</p>
        )}
      </div>
    </section>
  );
}
