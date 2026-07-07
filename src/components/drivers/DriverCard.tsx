import { RotateCcw, TestTube2 } from 'lucide-react';
import {
  completionDetectionOptions,
  extractionMethodOptions,
  inputStrategyOptions,
  submitMethodOptions,
} from '../../config/driverOptions';
import type {
  CompletionDetectionMethod,
  DriverConfig,
  ExtractionMethod,
  InputStrategy,
  SubmitMethod,
} from '../../types/driver';
import type { Participant } from '../../types/participant';
import './DriverCard.css';

type DriverCardProps = {
  participant: Participant;
  config: DriverConfig;
  onChange: (config: DriverConfig) => void;
  onReset: (participant: Participant) => void;
  onTest: (participantId: string) => void;
};

function formatLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function DriverCard({
  participant,
  config,
  onChange,
  onReset,
  onTest,
}: DriverCardProps) {
  const updateConfig = (updates: Partial<DriverConfig>) => {
    onChange({ ...config, ...updates, health: updates.health ?? 'needs review' });
  };

  return (
    <article className="driver-card">
      <div className="driver-card__header">
        <div>
          <span>Participant</span>
          <h3>{participant.name}</h3>
          <p>{participant.provider}</p>
        </div>
        <strong className="driver-card__health" data-health={config.health}>
          {formatLabel(config.health)}
        </strong>
      </div>

      <label className="driver-card__field driver-card__field--wide">
        <span>URL Pattern</span>
        <input
          onChange={(event) => updateConfig({ urlPattern: event.target.value })}
          value={config.urlPattern}
        />
      </label>

      <div className="driver-card__grid">
        <label className="driver-card__field">
          <span>Input Strategy</span>
          <select
            onChange={(event) =>
              updateConfig({ inputStrategy: event.target.value as InputStrategy })
            }
            value={config.inputStrategy}
          >
            {inputStrategyOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="driver-card__field">
          <span>Submit Method</span>
          <select
            onChange={(event) => updateConfig({ submitMethod: event.target.value as SubmitMethod })}
            value={config.submitMethod}
          >
            {submitMethodOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="driver-card__field">
          <span>Completion Detection</span>
          <select
            onChange={(event) =>
              updateConfig({
                completionDetectionMethod: event.target.value as CompletionDetectionMethod,
              })
            }
            value={config.completionDetectionMethod}
          >
            {completionDetectionOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="driver-card__field">
          <span>Extraction Method</span>
          <select
            onChange={(event) =>
              updateConfig({ extractionMethod: event.target.value as ExtractionMethod })
            }
            value={config.extractionMethod}
          >
            {extractionMethodOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="driver-card__field driver-card__field--wide">
        <span>Cleanup Rules</span>
        <textarea
          onChange={(event) => updateConfig({ cleanupRules: event.target.value })}
          value={config.cleanupRules}
        />
      </label>

      <div className="driver-card__actions">
        <button onClick={() => onReset(participant)} type="button">
          <RotateCcw size={16} aria-hidden="true" />
          <span>Reset Driver</span>
        </button>
        <button className="driver-card__test" onClick={() => onTest(participant.id)} type="button">
          <TestTube2 size={16} aria-hidden="true" />
          <span>Test Driver</span>
        </button>
      </div>
    </article>
  );
}
