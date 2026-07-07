import type { PromptTemplate } from '../../types/prompt';
import './PromptPreviewPanel.css';

type PromptPreviewPanelProps = {
  template: PromptTemplate;
  previewText: string;
};

export function PromptPreviewPanel({ template, previewText }: PromptPreviewPanelProps) {
  return (
    <aside className="prompt-preview-panel" aria-label={`${template.name} live preview`}>
      <div className="prompt-preview-panel__header">
        <p className="eyebrow">Live Preview</p>
        <h3>{template.name}</h3>
        <p>Variables are rendered with sample Maestriss session values.</p>
      </div>

      <pre>{previewText}</pre>
    </aside>
  );
}
