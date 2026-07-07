import {
  Bot,
  Dice5,
  FileSliders,
  GitBranch,
  History,
  PenLine,
  Plus,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { FeatureCard } from '../components/ui/FeatureCard';
import { MetricPanel } from '../components/ui/MetricPanel';
import './DashboardPage.css';

const summaryItems = [
  { label: 'Project Name', value: 'Maestriss Studio', icon: Sparkles },
  { label: 'Workflow Name', value: 'Council Draft', icon: GitBranch },
  { label: 'AI Participants', value: '4 configured', icon: UsersRound },
  { label: 'Final Editor', value: 'Synthesis Lead', icon: PenLine },
  { label: 'Randomization', value: 'Enabled', icon: Dice5 },
];

const cards = [
  {
    title: 'Participants',
    description: 'Define the AI systems that join a session and assign their responsibilities.',
    icon: Bot,
  },
  {
    title: 'Profiles',
    description: 'Shape reusable voices, review stances, and working styles for each contributor.',
    icon: FileSliders,
  },
  {
    title: 'Workflow Designer',
    description: 'Arrange critique, revision, arbitration, and synthesis stages into repeatable flows.',
    icon: GitBranch,
  },
  {
    title: 'Recent Runs',
    description: 'Review completed orchestration sessions and inspect the decisions behind the result.',
    icon: History,
  },
];

export function DashboardPage() {
  return (
    <section className="dashboard-page" aria-labelledby="dashboard-title">
      <div className="dashboard-page__hero">
        <div className="dashboard-page__intro">
          <p className="eyebrow">Studio Overview</p>
          <h2 id="dashboard-title">Build a council of intelligences for every serious question.</h2>
          <p>
            Configure participants, design workflows, and prepare structured runs where models challenge,
            refine, and synthesize each other.
          </p>
        </div>
        <button className="dashboard-page__primary-action" type="button">
          <Plus size={18} aria-hidden="true" />
          <span>Create New Workflow</span>
        </button>
      </div>

      <div className="dashboard-page__metrics" aria-label="Current project summary">
        {summaryItems.map((item) => (
          <MetricPanel key={item.label} {...item} />
        ))}
      </div>

      <div className="dashboard-page__cards">
        {cards.map((card) => (
          <FeatureCard key={card.title} {...card} />
        ))}
      </div>
    </section>
  );
}
