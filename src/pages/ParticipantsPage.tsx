import { Plus, RotateCcw, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ParticipantCard } from '../components/participants/ParticipantCard';
import { defaultParticipants } from '../data/defaultParticipants';
import type { Participant, ParticipantPosition } from '../types/participant';
import './ParticipantsPage.css';

function createDefaultParticipants() {
  return defaultParticipants.map((participant) => ({ ...participant }));
}

function createParticipant(index: number): Participant {
  return {
    id: `custom-${Date.now()}-${index}`,
    name: `New Participant ${index}`,
    provider: 'custom.ai',
    role: 'Custom participant awaiting configuration',
    urlPattern: 'https://custom.ai/?q={prompt}',
    enabled: true,
    position: 'standard',
  };
}

export function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>(() => createDefaultParticipants());

  const enabledCount = useMemo(
    () => participants.filter((participant) => participant.enabled).length,
    [participants],
  );

  const fixedFirstCount = useMemo(
    () => participants.filter((participant) => participant.position === 'first').length,
    [participants],
  );

  const finalEditor = participants.find((participant) => participant.position === 'final');

  const handleAddParticipant = () => {
    setParticipants((current) => [...current, createParticipant(current.length + 1)]);
  };

  const handleResetDefaults = () => {
    setParticipants(createDefaultParticipants());
  };

  const handleToggleEnabled = (id: string) => {
    setParticipants((current) =>
      current.map((participant) =>
        participant.id === id ? { ...participant, enabled: !participant.enabled } : participant,
      ),
    );
  };

  const handlePositionChange = (id: string, position: ParticipantPosition) => {
    setParticipants((current) =>
      current.map((participant) =>
        participant.id === id ? { ...participant, position } : participant,
      ),
    );
  };

  return (
    <section className="participants-page" aria-labelledby="participants-title">
      <div className="participants-page__header">
        <div className="participants-page__intro">
          <p className="eyebrow">Orchestration Roster</p>
          <h2 id="participants-title">Participants</h2>
          <p>
            Choose which AI systems join each run, then decide who opens the process, who works in the
            randomized middle, and who performs the final editorial pass.
          </p>
        </div>
        <div className="participants-page__actions">
          <button className="participants-page__button" onClick={handleResetDefaults} type="button">
            <RotateCcw size={16} aria-hidden="true" />
            <span>Reset Defaults</span>
          </button>
          <button
            className="participants-page__button participants-page__button--primary"
            onClick={handleAddParticipant}
            type="button"
          >
            <Plus size={16} aria-hidden="true" />
            <span>Add Participant</span>
          </button>
        </div>
      </div>

      <div className="participants-page__summary" aria-label="Participant summary">
        <div>
          <UsersRound size={18} aria-hidden="true" />
          <span>{enabledCount} enabled</span>
        </div>
        <div>
          <span>{fixedFirstCount} fixed first</span>
        </div>
        <div>
          <span>Final editor: {finalEditor?.name ?? 'Not assigned'}</span>
        </div>
      </div>

      <div className="participants-page__list" aria-label="Configured participants">
        {participants.map((participant) => (
          <ParticipantCard
            key={participant.id}
            participant={participant}
            onPositionChange={handlePositionChange}
            onToggleEnabled={handleToggleEnabled}
          />
        ))}
      </div>
    </section>
  );
}
