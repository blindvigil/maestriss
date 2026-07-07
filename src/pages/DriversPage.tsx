import { Activity, RotateCcw } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { DriverCard } from '../components/drivers/DriverCard';
import { useProject } from '../context/ProjectContext';
import type { DriverConfig } from '../types/driver';
import type { Participant } from '../types/participant';
import {
  createDriverConfig,
  createDefaultDriverConfigs,
  reconcileDriverConfigs,
} from '../utils/drivers';
import './DriversPage.css';

export function DriversPage() {
  const { project, updateProject } = useProject();
  const { participants } = project;
  const driverConfigs = project.drivers;

  const participantSignature = participants
    .map((participant) => `${participant.id}:${participant.urlPattern}`)
    .join('|');

  useEffect(() => {
    const reconciledConfigs = reconcileDriverConfigs(participants, driverConfigs);

    if (
      reconciledConfigs.length !== driverConfigs.length ||
      reconciledConfigs.some((config, index) => config.participantId !== driverConfigs[index]?.participantId)
    ) {
      updateProject((currentProject) => ({
        ...currentProject,
        drivers: reconciledConfigs,
      }));
    }
  }, [participantSignature, driverConfigs, participants]);

  const readyCount = useMemo(
    () => driverConfigs.filter((config) => config.health === 'ready').length,
    [driverConfigs],
  );

  const handleDriverChange = (updatedConfig: DriverConfig) => {
    updateProject((currentProject) => ({
      ...currentProject,
      drivers: reconcileDriverConfigs(currentProject.participants, currentProject.drivers).map(
        (config) =>
          config.participantId === updatedConfig.participantId ? updatedConfig : config,
      ),
    }));
  };

  const handleResetDriver = (participant: Participant) => {
    updateProject((currentProject) => ({
      ...currentProject,
      drivers: reconcileDriverConfigs(currentProject.participants, currentProject.drivers).map(
        (config) =>
          config.participantId === participant.id ? createDriverConfig(participant) : config,
      ),
    }));
  };

  const handleTestDriver = (participantId: string) => {
    updateProject((currentProject) => ({
      ...currentProject,
      drivers: reconcileDriverConfigs(currentProject.participants, currentProject.drivers).map(
        (config) =>
          config.participantId === participantId ? { ...config, health: 'ready' } : config,
      ),
    }));
  };

  const handleResetAll = () => {
    updateProject((currentProject) => ({
      ...currentProject,
      drivers: createDefaultDriverConfigs(currentProject.participants),
    }));
  };

  const reconciledConfigs = reconcileDriverConfigs(participants, driverConfigs);

  return (
    <section className="drivers-page" aria-labelledby="drivers-title">
      <div className="drivers-page__hero">
        <div className="drivers-page__intro">
          <p className="eyebrow">Interface Drivers</p>
          <h2 id="drivers-title">Drivers</h2>
          <p>
            Configure how Maestriss would target each participant web interface. This is setup only:
            no browser automation runs from this page yet.
          </p>
        </div>
        <button className="drivers-page__button" onClick={handleResetAll} type="button">
          <RotateCcw size={16} aria-hidden="true" />
          <span>Reset All Drivers</span>
        </button>
      </div>

      <div className="drivers-page__summary" aria-label="Driver summary">
        <div>
          <Activity size={18} aria-hidden="true" />
          <span>{participants.length} participant drivers</span>
        </div>
        <div>
          <span>{readyCount} ready</span>
        </div>
        <div>
          <span>Configuration only</span>
        </div>
      </div>

      <div className="drivers-page__list" aria-label="Driver configurations">
        {participants.map((participant) => {
          const config =
            reconciledConfigs.find((driverConfig) => driverConfig.participantId === participant.id) ??
            createDriverConfig(participant);

          return (
            <DriverCard
              config={config}
              key={participant.id}
              onChange={handleDriverChange}
              onReset={handleResetDriver}
              onTest={handleTestDriver}
              participant={participant}
            />
          );
        })}
      </div>
    </section>
  );
}
