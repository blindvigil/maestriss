import { promptVariableTokens } from '../../config/promptVariables';
import type { PromptTemplate } from '../../types/prompt';
import './PromptTemplateEditor.css';

type PromptTemplateEditorProps = {
  template: PromptTemplate;
  onTemplateTextChange: (templateText: string) => void;
};

export function PromptTemplateEditor({
  template,
  onTemplateTextChange,
}: PromptTemplateEditorProps) {
  return (
    <section className="prompt-template-editor" aria-labelledby="prompt-template-editor-title">
      <div className="prompt-template-editor__header">
        <p className="eyebrow">Template Editor</p>
        <h3 id="prompt-template-editor-title">{template.name}</h3>
        <p>{template.description}</p>
      </div>

      <label className="prompt-template-editor__textarea">
        <span>Editable Template Text</span>
        <textarea
          onChange={(event) => onTemplateTextChange(event.target.value)}
          spellCheck="true"
          value={template.templateText}
        />
      </label>

      <div className="prompt-template-editor__variables" aria-label="Available variables">
        <span>Available Variables</span>
        <div>
          {template.availableVariables.map((variable) => (
            <code key={variable}>{promptVariableTokens[variable]}</code>
          ))}
        </div>
      </div>
    </section>
  );
}
