import { ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import './FeatureCard.css';

type FeatureCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <article className="feature-card">
      <div className="feature-card__icon">
        <Icon size={20} aria-hidden="true" />
      </div>
      <div className="feature-card__content">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <ArrowRight className="feature-card__arrow" size={18} aria-hidden="true" />
    </article>
  );
}
