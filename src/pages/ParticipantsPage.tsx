import { Plus, RotateCcw, UsersRound } from 'lucide-react';
import { useMemo } from 'react';
import { ParticipantCard } from '../components/participants/ParticipantCard';
import { participantPositionDetails } from '../config/participantPositions';
import { useProject } from '../context/ProjectContext';
import type { Participant, ParticipantPosition } from '../types/participant';
import { createDefaultParticipants, createParticipant } from '../utils/participants';

import './ParticipantsPage.css';

function getWorkflowOrder(participants: Participant[]) {
  return [
    ...participants.filter((participant) => participant.position === 'first'),
    ...participants.filter((participant) => participant.position === 'standard'),
    ...participants.filter((participant) => participant.position === 'final'),
  ].map((participant) => participant.name);
}

export function ParticipantsPage() {
  const { project, updateProject } = useProject();
  const { participants } = project;

  const enabledCount = useMemo(
    () => participants.filter((participant) => participant.enabled).length,
    [participants],
  );

  const fixedFirstCount = useMemo(
    () => participants.filter((participant) => participant.position === 'first').length,
    [participants],
  );

  const randomizedMiddleCount = useMemo(
    () => participants.filter((participant) => participant.position === 'standard').length,
    [participants],
  );

  const finalEditor = participants.find((participant) => participant.position === 'final');

  const handleAddParticipant = () => {
    updateProject((currentProject) => ({
      ...currentProject,
      ...(() => {
        const nextParticipants = [
          ...currentProject.participants,
          createParticipant(currentProject.participants.length + 1),
        ];

        return {
          participants: nextParticipants,
          workflow: {
            ...currentProject.workflow,
            currentOrder: getWorkflowOrder(nextParticipants),
          },
        };
      })(),
    }));
  };

  const handleResetDefaults = () => {
    const defaultParticipants = createDefaultParticipants();

    updateProject((currentProject) => ({
      ...currentProject,
      participants: defaultParticipants,
      workflow: {
        ...currentProject.workflow,
        firstParticipant:
          defaultParticipants.find((participant) => participant.position === 'first')?.name ??
          currentProject.workflow.firstParticipant,
        finalEditor:
          defaultParticipants.find((participant) => participant.position === 'final')?.name ??
          currentProject.workflow.finalEditor,
        currentOrder: getWorkflowOrder(defaultParticipants),
      },
    }));
  };

  const handleToggleEnabled = (id: string) => {
    updateProject((currentProject) => ({
      ...currentProject,
      participants: currentProject.participants.map((participant) =>
        participant.id === id ? { ...participant, enabled: !participant.enabled } : participant,
      ),
    }));
  };

  const handlePositionChange = (id: string, position: ParticipantPosition) => {
    updateProject((currentProject) => ({
      ...currentProject,
      ...(() => {
        const nextParticipants = currentProject.participants.map((participant) =>
          participant.id === id ? { ...participant, position } : participant,
        );

        return {
          participants: nextParticipants,
          workflow: {
            ...currentProject.workflow,
            firstParticipant:
              nextParticipants.find((participant) => participant.position === 'first')?.name ??
              currentProject.workflow.firstParticipant,
            finalEditor:
              nextParticipants.find((participant) => participant.position === 'final')?.name ??
              currentProject.workflow.finalEditor,
            currentOrder: getWorkflowOrder(nextParticipants),
          },
        };
      })(),
    }));
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
          <span>
            {fixedFirstCount} {participantPositionDetails.first.toLowerCase()}
          </span>
        </div>
        <div>
          <span>
            {randomizedMiddleCount} {participantPositionDetails.standard.toLowerCase()}
          </span>
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
