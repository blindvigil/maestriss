import './PlaceholderPage.css';

type PlaceholderPageProps = {
  title: string;
};

const pageDescriptions: Record<string, string> = {
  Participants: 'Manage the AI systems available to Maestriss workflows.',
  Profiles: 'Create reusable behavioral profiles for participants and editorial roles.',
  Workflow: 'Design the sequence of conversation stages and synthesis steps.',
  Drivers: 'Configure model providers, local runtimes, and execution settings.',
  'Run History': 'Inspect previous orchestration runs and compare outcomes.',
  Settings: 'Adjust studio preferences and application-level configuration.',
};

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <section className="placeholder-page" aria-labelledby="placeholder-title">
      <p className="eyebrow">Workspace</p>
      <h2 id="placeholder-title">{title}</h2>
      <p>{pageDescriptions[title]}</p>
      <div className="placeholder-page__panel">
        <span>Ready for implementation</span>
      </div>
    </section>
  );
}
