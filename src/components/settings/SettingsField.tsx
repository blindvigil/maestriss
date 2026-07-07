import type { ReactNode } from 'react';
import './SettingsField.css';

type SettingsFieldProps = {
  label: string;
  children: ReactNode;
};

export function SettingsField({ label, children }: SettingsFieldProps) {
  return (
    <label className="settings-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
