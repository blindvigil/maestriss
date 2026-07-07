import { Copy, Download, Eye, FileJson } from 'lucide-react';
import type { SessionHistoryItem } from '../../types/session';
import './SessionCard.css';

type SessionCardProps = {
  session: SessionHistoryItem;
  selected: boolean;
  onView: (id: string) => void;
  onDuplicate: (id: string) => void;
  onExport: (id: string, format: 'Markdown' | 'JSON') => void;
};

export function SessionCard({
  session,
  selected,
  onView,
  onDuplicate,
  onExport,
}: SessionCardProps) {
  return (
    <article className="session-card" data-selected={selected}>
      <div className="session-card__header">
        <div>
          <span className="session-card__status" data-status={session.status}>
            {session.status}
          </span>
          <h3>{session.title}</h3>
          <p>{session.originalPrompt}</p>
        </div>
        <time dateTime={session.startedAt}>
          {new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date(session.startedAt))}
        </time>
      </div>

      <div className="session-card__meta">
        <span>Final editor: {session.finalEditor}</span>
        <span>Profile: {session.profile}</span>
        <span>Duration: {session.duration}</span>
        <span>{session.contributionCount} contributions</span>
        <span>{session.lengthEstimate}</span>
      </div>

      <div className="session-card__order" aria-label="Participant order">
        {session.participantOrder.map((participant) => (
          <span key={participant}>{participant}</span>
        ))}
      </div>

      <div className="session-card__actions">
        <button onClick={() => onView(session.id)} type="button">
          <Eye size={16} aria-hidden="true" />
          <span>View Session</span>
        </button>
        <button onClick={() => onDuplicate(session.id)} type="button">
          <Copy size={16} aria-hidden="true" />
          <span>Duplicate Session</span>
        </button>
        <button onClick={() => onExport(session.id, 'Markdown')} type="button">
          <Download size={16} aria-hidden="true" />
          <span>Export Markdown</span>
        </button>
        <button onClick={() => onExport(session.id, 'JSON')} type="button">
          <FileJson size={16} aria-hidden="true" />
          <span>Export JSON</span>
        </button>
      </div>
    </article>
  );
}
