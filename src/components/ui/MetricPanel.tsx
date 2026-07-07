import type { LucideIcon } from 'lucide-react';
import './MetricPanel.css';

type MetricPanelProps = {
  icon: LucideIcon;
  label: string;
  value: string;
};

export function MetricPanel({ icon: Icon, label, value }: MetricPanelProps) {
  return (
    <div className="metric-panel">
      <div className="metric-panel__icon">
        <Icon size={17} aria-hidden="true" />
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
