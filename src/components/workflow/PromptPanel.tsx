import type { PromptPreview } from '../../types/workflow';
import './PromptPanel.css';

type PromptPanelProps = PromptPreview;

export function PromptPanel({ eyebrow, title, body }: PromptPanelProps) {
  return (
    <article className="prompt-panel">
      <span>{eyebrow}</span>
      <h3>{title}</h3>
      <pre>{body}</pre>
    </article>
  );
}
