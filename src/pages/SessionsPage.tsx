import { History, ListFilter } from 'lucide-react';
import { useMemo, useState } from 'react';
import { SessionDetailPanel } from '../components/history/SessionDetailPanel';
import { SessionCard } from '../components/history/SessionCard';
import { useProject } from '../context/ProjectContext';
import type { SessionFilters, SessionHistoryItem, SessionStatus } from '../types/session';
import './SessionsPage.css';

const statusOptions: Array<SessionStatus | 'All'> = [
  'All',
  'Completed',
  'Failed',
  'Draft',
  'In Progress',
];

function duplicateSession(session: SessionHistoryItem, index: number): SessionHistoryItem {
  return {
    ...session,
    id: `${session.id}-copy-${Date.now()}-${index}`,
    title: `${session.title} Copy`,
    status: 'Draft',
    duration: 'Not run',
    contributionCount: 0,
    lengthEstimate: 'Pending',
    contributions: [],
    finalAnswerPlaceholder:
      'Duplicated draft placeholder: run this orchestration to create a final answer.',
  };
}

export function SessionsPage() {
  const { project, updateProject } = useProject();
  const sessions = project.sessions.items;
  const selectedSessionId = project.sessions.selectedSessionId;
  const [filters, setFilters] = useState<SessionFilters>({
    status: 'All',
    finalEditor: 'All',
    profile: 'All',
  });
  const [exportNotice, setExportNotice] = useState('Exports are prepared as UI-only placeholders.');

  const finalEditorOptions = useMemo(
    () => ['All', ...Array.from(new Set(sessions.map((session) => session.finalEditor)))],
    [sessions],
  );

  const profileOptions = useMemo(
    () => ['All', ...Array.from(new Set(sessions.map((session) => session.profile)))],
    [sessions],
  );

  const filteredSessions = useMemo(
    () =>
      sessions.filter(
        (session) =>
          (filters.status === 'All' || session.status === filters.status) &&
          (filters.finalEditor === 'All' || session.finalEditor === filters.finalEditor) &&
          (filters.profile === 'All' || session.profile === filters.profile),
      ),
    [filters, sessions],
  );

  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ?? filteredSessions[0];

  const handleDuplicateSession = (id: string) => {
    const session = sessions.find((historySession) => historySession.id === id);

    if (!session) {
      return;
    }

    const duplicatedSession = duplicateSession(session, sessions.length + 1);
    updateProject((currentProject) => ({
      ...currentProject,
      sessions: {
        items: [duplicatedSession, ...currentProject.sessions.items],
        selectedSessionId: duplicatedSession.id,
      },
    }));
    setExportNotice(`${duplicatedSession.title} created as a draft.`);
  };

  const handleExport = (id: string, format: 'Markdown' | 'JSON') => {
    const session = sessions.find((historySession) => historySession.id === id);
    setExportNotice(`${format} export prepared for ${session?.title ?? 'selected session'} (UI only).`);
  };

  return (
    <section className="sessions-page" aria-labelledby="sessions-title">
      <div className="sessions-page__hero">
        <div className="sessions-page__intro">
          <p className="eyebrow">Session Archive</p>
          <h2 id="sessions-title">Sessions</h2>
          <p>
            Review previous Maestriss orchestration sessions, inspect participant contributions, and
            prepare placeholder exports while persistence is still offline.
          </p>
        </div>
        <div className="sessions-page__notice">
          <History size={18} aria-hidden="true" />
          <span>{sessions.length} mock sessions</span>
        </div>
      </div>

      <div className="sessions-page__filters" aria-label="Session filters">
        <div className="sessions-page__filter-heading">
          <ListFilter size={18} aria-hidden="true" />
          <span>Filters</span>
        </div>
        <label>
          <span>Status</span>
          <select
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value as SessionStatus | 'All',
              }))
            }
            value={filters.status}
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Final Editor</span>
          <select
            onChange={(event) =>
              setFilters((current) => ({ ...current, finalEditor: event.target.value }))
            }
            value={filters.finalEditor}
          >
            {finalEditorOptions.map((finalEditor) => (
              <option key={finalEditor} value={finalEditor}>
                {finalEditor}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Profile</span>
          <select
            onChange={(event) =>
              setFilters((current) => ({ ...current, profile: event.target.value }))
            }
            value={filters.profile}
          >
            {profileOptions.map((profile) => (
              <option key={profile} value={profile}>
                {profile}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="sessions-page__summary" aria-label="Session summary">
        <div>
          <span>{filteredSessions.length} visible</span>
        </div>
        <div>
          <span>{sessions.filter((session) => session.status === 'Completed').length} completed</span>
        </div>
        <div>
          <span>{exportNotice}</span>
        </div>
      </div>

      <div className="sessions-page__workspace">
        <div className="sessions-page__list" aria-label="Previous sessions">
          {filteredSessions.map((session) => (
            <SessionCard
              key={session.id}
              onDuplicate={handleDuplicateSession}
              onExport={handleExport}
              onView={(id) =>
                updateProject((currentProject) => ({
                  ...currentProject,
                  sessions: {
                    ...currentProject.sessions,
                    selectedSessionId: id,
                  },
                }))
              }
              selected={session.id === selectedSession?.id}
              session={session}
            />
          ))}
          {filteredSessions.length === 0 && (
            <div className="sessions-page__empty">
              <span>No sessions match the current filters.</span>
            </div>
          )}
        </div>

        <SessionDetailPanel session={selectedSession} />
      </div>
    </section>
  );
}
