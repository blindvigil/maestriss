import './SettingsToggle.css';

type SettingsToggleProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function SettingsToggle({ label, checked, onChange }: SettingsToggleProps) {
  return (
    <label className="settings-toggle">
      <span>{label}</span>
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}
