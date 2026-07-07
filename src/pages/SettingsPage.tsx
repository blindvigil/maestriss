import { RotateCcw, Save, Settings as SettingsIcon } from 'lucide-react';
import { SettingsField } from '../components/settings/SettingsField';
import { SettingsSection } from '../components/settings/SettingsSection';
import { SettingsToggle } from '../components/settings/SettingsToggle';
import { useProject } from '../context/ProjectContext';
import type { AppSettings, AccentStyle, ExportFormat, ThemePreference } from '../types/settings';
import { createDefaultSettings } from '../utils/settings';
import './SettingsPage.css';

const themeOptions: ThemePreference[] = ['Dark', 'System', 'Light'];
const accentStyleOptions: AccentStyle[] = ['Teal', 'Blue', 'Violet', 'Amber'];
const exportFormatOptions: ExportFormat[] = ['Markdown', 'JSON', 'HTML'];

export function SettingsPage() {
  const { project, updateProject } = useProject();
  const { participants, settings } = project;
  const profiles = project.profiles.items;

  const updateSettings = (updates: Partial<AppSettings>) => {
    updateProject((currentProject) => ({
      ...currentProject,
      metadata: {
        ...currentProject.metadata,
        projectName: updates.appName ?? currentProject.metadata.projectName,
      },
      workflow: {
        ...currentProject.workflow,
        firstParticipant:
          updates.defaultFirstParticipant ?? currentProject.workflow.firstParticipant,
        finalEditor: updates.defaultFinalEditor ?? currentProject.workflow.finalEditor,
        randomizeMiddleParticipants:
          updates.randomizeMiddleParticipants ??
          currentProject.workflow.randomizeMiddleParticipants,
      },
      settings: {
        ...currentProject.settings,
        ...updates,
      },
    }));
  };

  const handleSaveSettings = () => {
    updateSettings({ appName: settings.appName.trim() || 'Maestriss Studio' });
  };

  const handleResetDefaults = () => {
    const defaultSettings = createDefaultSettings();

    updateProject((currentProject) => ({
      ...currentProject,
      metadata: {
        ...currentProject.metadata,
        projectName: defaultSettings.appName,
      },
      workflow: {
        ...currentProject.workflow,
        firstParticipant: defaultSettings.defaultFirstParticipant,
        finalEditor: defaultSettings.defaultFinalEditor,
        randomizeMiddleParticipants: defaultSettings.randomizeMiddleParticipants,
      },
      settings: defaultSettings,
    }));
  };

  return (
    <section className="settings-page" aria-labelledby="settings-title">
      <div className="settings-page__hero">
        <div className="settings-page__intro">
          <p className="eyebrow">Studio Preferences</p>
          <h2 id="settings-title">Settings</h2>
          <p>
            Tune Maestriss defaults for the application, orchestration behavior, automation timing,
            and export shape. These controls are local UI state for now.
          </p>
        </div>
        <div className="settings-page__actions">
          <button className="settings-page__button" onClick={handleResetDefaults} type="button">
            <RotateCcw size={16} aria-hidden="true" />
            <span>Reset Defaults</span>
          </button>
          <button
            className="settings-page__button settings-page__button--primary"
            onClick={handleSaveSettings}
            type="button"
          >
            <Save size={16} aria-hidden="true" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      <div className="settings-page__summary" aria-label="Settings summary">
        <div>
          <SettingsIcon size={18} aria-hidden="true" />
          <span>{settings.appName}</span>
        </div>
        <div>
          <span>{settings.theme} theme</span>
        </div>
        <div>
          <span>{settings.defaultExportFormat} exports</span>
        </div>
      </div>

      <div className="settings-page__grid">
        <SettingsSection
          description="Application-wide naming, theme, accent, and density preferences."
          title="Application"
        >
          <SettingsField label="App name">
            <input
              onChange={(event) => updateSettings({ appName: event.target.value })}
              value={settings.appName}
            />
          </SettingsField>
          <SettingsField label="Theme">
            <select
              onChange={(event) =>
                updateSettings({ theme: event.target.value as ThemePreference })
              }
              value={settings.theme}
            >
              {themeOptions.map((theme) => (
                <option key={theme} value={theme}>
                  {theme}
                </option>
              ))}
            </select>
          </SettingsField>
          <SettingsField label="Accent style">
            <select
              onChange={(event) =>
                updateSettings({ accentStyle: event.target.value as AccentStyle })
              }
              value={settings.accentStyle}
            >
              {accentStyleOptions.map((accentStyle) => (
                <option key={accentStyle} value={accentStyle}>
                  {accentStyle}
                </option>
              ))}
            </select>
          </SettingsField>
          <SettingsToggle
            checked={settings.compactMode}
            label="Compact mode"
            onChange={(compactMode) => updateSettings({ compactMode })}
          />
        </SettingsSection>

        <SettingsSection
          description="Default participants, profile, and ordering rules for new sessions."
          title="Defaults"
        >
          <SettingsField label="Default first participant">
            <select
              onChange={(event) => updateSettings({ defaultFirstParticipant: event.target.value })}
              value={settings.defaultFirstParticipant}
            >
              {participants.map((participant) => (
                <option key={participant.id} value={participant.name}>
                  {participant.name}
                </option>
              ))}
            </select>
          </SettingsField>
          <SettingsField label="Default final editor">
            <select
              onChange={(event) => updateSettings({ defaultFinalEditor: event.target.value })}
              value={settings.defaultFinalEditor}
            >
              {participants.map((participant) => (
                <option key={participant.id} value={participant.name}>
                  {participant.name}
                </option>
              ))}
            </select>
          </SettingsField>
          <SettingsField label="Default profile">
            <select
              onChange={(event) => updateSettings({ defaultProfile: event.target.value })}
              value={settings.defaultProfile}
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.name}>
                  {profile.name}
                </option>
              ))}
            </select>
          </SettingsField>
          <SettingsToggle
            checked={settings.randomizeMiddleParticipants}
            label="Randomize middle participants"
            onChange={(randomizeMiddleParticipants) =>
              updateSettings({ randomizeMiddleParticipants })
            }
          />
          <SettingsToggle
            checked={settings.requireFinalSynthesis}
            label="Require final synthesis"
            onChange={(requireFinalSynthesis) => updateSettings({ requireFinalSynthesis })}
          />
        </SettingsSection>

        <SettingsSection
          description="Timing and retry behavior for future browser automation."
          title="Automation"
        >
          <SettingsField label="Default max wait seconds">
            <input
              min={1}
              onChange={(event) =>
                updateSettings({ defaultMaxWaitSeconds: Number(event.target.value) })
              }
              type="number"
              value={settings.defaultMaxWaitSeconds}
            />
          </SettingsField>
          <SettingsField label="Response stability seconds">
            <input
              min={1}
              onChange={(event) =>
                updateSettings({ responseStabilitySeconds: Number(event.target.value) })
              }
              type="number"
              value={settings.responseStabilitySeconds}
            />
          </SettingsField>
          <SettingsToggle
            checked={settings.retryFailedParticipant}
            label="Retry failed participant"
            onChange={(retryFailedParticipant) => updateSettings({ retryFailedParticipant })}
          />
          <SettingsToggle
            checked={settings.copyFinalTranscriptToClipboard}
            label="Copy final transcript to clipboard"
            onChange={(copyFinalTranscriptToClipboard) =>
              updateSettings({ copyFinalTranscriptToClipboard })
            }
          />
        </SettingsSection>

        <SettingsSection
          description="Default export format and transcript detail for future session exports."
          title="Export"
        >
          <SettingsField label="Default export format">
            <select
              onChange={(event) =>
                updateSettings({ defaultExportFormat: event.target.value as ExportFormat })
              }
              value={settings.defaultExportFormat}
            >
              {exportFormatOptions.map((exportFormat) => (
                <option key={exportFormat} value={exportFormat}>
                  {exportFormat}
                </option>
              ))}
            </select>
          </SettingsField>
          <SettingsToggle
            checked={settings.includeMetadata}
            label="Include metadata"
            onChange={(includeMetadata) => updateSettings({ includeMetadata })}
          />
          <SettingsToggle
            checked={settings.includeIntermediateContributions}
            label="Include intermediate contributions"
            onChange={(includeIntermediateContributions) =>
              updateSettings({ includeIntermediateContributions })
            }
          />
        </SettingsSection>
      </div>
    </section>
  );
}
