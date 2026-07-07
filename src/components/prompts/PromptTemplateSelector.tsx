import type { PromptTemplate, PromptTemplateType } from '../../types/prompt';
import './PromptTemplateSelector.css';

type PromptTemplateSelectorProps = {
  templates: PromptTemplate[];
  selectedTemplateId: PromptTemplateType;
  onSelect: (templateId: PromptTemplateType) => void;
};

export function PromptTemplateSelector({
  templates,
  selectedTemplateId,
  onSelect,
}: PromptTemplateSelectorProps) {
  return (
    <aside className="prompt-template-selector" aria-label="Prompt templates">
      {templates.map((template) => (
        <button
          className="prompt-template-selector__item"
          data-selected={template.id === selectedTemplateId}
          key={template.id}
          onClick={() => onSelect(template.id)}
          type="button"
        >
          <span>{template.name}</span>
          <strong>{template.description}</strong>
        </button>
      ))}
    </aside>
  );
}
