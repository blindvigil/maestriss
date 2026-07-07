import type { ReactNode } from 'react';
import './SettingsSection.css';

type SettingsSectionProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section className="settings-section" aria-label={title}>
      <div className="settings-section__header">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="settings-section__controls">{children}</div>
    </section>
  );
}
