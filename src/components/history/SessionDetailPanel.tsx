import { GitBranch } from 'lucide-react';
import type { SessionHistoryItem } from '../../types/session';
import './SessionDetailPanel.css';

type SessionDetailPanelProps = {
  session: SessionHistoryItem | undefined;
};

export function SessionDetailPanel({ session }: SessionDetailPanelProps) {
  if (!session) {
    return (
      <aside className="session-detail-panel session-detail-panel--empty">
        <GitBranch size={22} aria-hidden="true" />
        <p>Select a session to inspect its prompt, participant flow, contributions, and final answer.</p>
      </aside>
    );
  }

  return (
    <aside className="session-detail-panel" aria-label={`${session.title} details`}>
      <div className="session-detail-panel__header">
        <p className="eyebrow">Session Detail</p>
        <h3>{session.title}</h3>
        <span className="session-detail-panel__status" data-status={session.status}>
          {session.status}
        </span>
      </div>

      <section>
        <h4>Original Prompt</h4>
        <p>{session.originalPrompt}</p>
      </section>

      <section>
        <h4>Participant Order</h4>
        <div className="session-detail-panel__order">
          {session.participantOrder.map((participant, index) => (
            <span key={`${participant}-${index}`}>
              {index + 1}. {participant}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h4>Contributions</h4>
        <div className="session-detail-panel__contributions">
          {session.contributions.length > 0 ? (
            session.contributions.map((contribution) => (
              <article key={contribution.id}>
                <strong>{contribution.participantName}</strong>
                <span>
                  {contribution.profileName} · {contribution.lengthEstimate}
                </span>
                <p>{contribution.summary}</p>
              </article>
            ))
          ) : (
            <p>No contributions captured yet.</p>
          )}
        </div>
      </section>

      <section>
        <h4>Final Synthesized Answer</h4>
        <p>{session.finalAnswerPlaceholder}</p>
      </section>

      <section>
        <h4>Session Metadata</h4>
        <dl>
          <div>
            <dt>Date/time</dt>
            <dd>
              {new Intl.DateTimeFormat(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(session.startedAt))}
            </dd>
          </div>
          <div>
            <dt>Final editor</dt>
            <dd>{session.finalEditor}</dd>
          </div>
          <div>
            <dt>Profile</dt>
            <dd>{session.profile}</dd>
          </div>
          <div>
            <dt>Duration</dt>
            <dd>{session.duration}</dd>
          </div>
          <div>
            <dt>Length estimate</dt>
            <dd>{session.lengthEstimate}</dd>
          </div>
        </dl>
      </section>
    </aside>
  );
}
