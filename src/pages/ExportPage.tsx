import { Copy, Download, FileDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { exportDefinitions } from '../config/exportFormats';
import { useProject } from '../context/ProjectContext';
import type { ExportFormat } from '../types/export';
import { createExportArtifact, downloadTextFile } from '../utils/exports';
import './ExportPage.css';

export function ExportPage() {
  const { project } = useProject();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('project-json');
  const [copyStatus, setCopyStatus] = useState('Ready to export.');

  const selectedDefinition =
    exportDefinitions.find((definition) => definition.format === selectedFormat) ??
    exportDefinitions[0];

  const artifact = useMemo(
    () => createExportArtifact(project, selectedFormat),
    [project, selectedFormat],
  );

  const handleDownload = () => {
    downloadTextFile(artifact);
    setCopyStatus(`Downloaded ${artifact.filename}.`);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(artifact.content);
      setCopyStatus(`Copied ${selectedDefinition.label} to clipboard.`);
    } catch {
      setCopyStatus('Clipboard copy is unavailable in this browser context.');
    }
  };

  return (
    <section className="export-page" aria-labelledby="export-title">
      <div className="export-page__hero">
        <div className="export-page__intro">
          <p className="eyebrow">Project Output</p>
          <h2 id="export-title">Export</h2>
          <p>
            Generate downloadable project data, prompt packs, selected session transcripts, or a
            first-pass Automa workflow JSON from the current Maestriss project.
          </p>
        </div>
        <div className="export-page__notice">
          <FileDown size={18} aria-hidden="true" />
          <span>{selectedDefinition.label}</span>
        </div>
      </div>

      <div className="export-page__toolbar">
        <label>
          <span>Format</span>
          <select
            onChange={(event) => setSelectedFormat(event.target.value as ExportFormat)}
            value={selectedFormat}
          >
            {exportDefinitions.map((definition) => (
              <option key={definition.format} value={definition.format}>
                {definition.label}
              </option>
            ))}
          </select>
        </label>

        <div className="export-page__actions">
          <button onClick={handleCopy} type="button">
            <Copy size={16} aria-hidden="true" />
            <span>Copy to Clipboard</span>
          </button>
          <button className="export-page__button--primary" onClick={handleDownload} type="button">
            <Download size={16} aria-hidden="true" />
            <span>Download</span>
          </button>
        </div>
      </div>

      <div className="export-page__summary" aria-label="Export summary">
        <div>
          <span>{selectedDefinition.description}</span>
        </div>
        <div>
          <span>File: {artifact.filename}</span>
        </div>
        <div>
          <span>{copyStatus}</span>
        </div>
      </div>

      <section className="export-page__preview" aria-labelledby="export-preview-title">
        <div className="export-page__preview-header">
          <p className="eyebrow">Preview</p>
          <h3 id="export-preview-title">{selectedDefinition.label}</h3>
        </div>
        <pre>{artifact.content}</pre>
      </section>
    </section>
  );
}
