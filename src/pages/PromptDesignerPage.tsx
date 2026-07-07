import { Braces, MessageSquareText } from 'lucide-react';
import { useMemo } from 'react';
import { PromptPreviewPanel } from '../components/prompts/PromptPreviewPanel';
import { PromptTemplateEditor } from '../components/prompts/PromptTemplateEditor';
import { PromptTemplateSelector } from '../components/prompts/PromptTemplateSelector';
import { useProject } from '../context/ProjectContext';
import type { PromptTemplateType } from '../types/prompt';
import { renderPromptPreview } from '../utils/prompts';
import './PromptDesignerPage.css';

export function PromptDesignerPage() {
  const { project, updateProject } = useProject();
  const { templates, selectedTemplateId } = project.prompts;
  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ?? templates[0];

  const previewText = useMemo(
    () => renderPromptPreview(selectedTemplate?.templateText ?? ''),
    [selectedTemplate],
  );

  const handleTemplateSelect = (templateId: PromptTemplateType) => {
    updateProject((currentProject) => ({
      ...currentProject,
      prompts: {
        ...currentProject.prompts,
        selectedTemplateId: templateId,
      },
    }));
  };

  const handleTemplateTextChange = (templateText: string) => {
    if (!selectedTemplate) {
      return;
    }

    updateProject((currentProject) => ({
      ...currentProject,
      prompts: {
        ...currentProject.prompts,
        templates: currentProject.prompts.templates.map((template) =>
          template.id === selectedTemplate.id ? { ...template, templateText } : template,
        ),
      },
    }));
  };

  return (
    <section className="prompt-designer-page" aria-labelledby="prompt-designer-title">
      <div className="prompt-designer-page__hero">
        <div className="prompt-designer-page__intro">
          <p className="eyebrow">Prompt System</p>
          <h2 id="prompt-designer-title">Prompt Designer</h2>
          <p>
            Edit the reusable prompt templates that guide middle contributors, final synthesis, and
            contribution extraction inside a Maestriss session.
          </p>
        </div>
        <div className="prompt-designer-page__notice">
          <MessageSquareText size={18} aria-hidden="true" />
          <span>{templates.length} templates</span>
        </div>
      </div>

      <div className="prompt-designer-page__summary" aria-label="Prompt designer summary">
        <div>
          <Braces size={18} aria-hidden="true" />
          <span>Variables supported</span>
        </div>
        <div>
          <span>Selected: {selectedTemplate?.name ?? 'None'}</span>
        </div>
        <div>
          <span>Stored in project.prompts</span>
        </div>
      </div>

      {selectedTemplate && (
        <div className="prompt-designer-page__workspace">
          <PromptTemplateSelector
            onSelect={handleTemplateSelect}
            selectedTemplateId={selectedTemplate.id}
            templates={templates}
          />
          <PromptTemplateEditor
            onTemplateTextChange={handleTemplateTextChange}
            template={selectedTemplate}
          />
          <PromptPreviewPanel previewText={previewText} template={selectedTemplate} />
        </div>
      )}
    </section>
  );
}
