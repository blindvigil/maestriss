import {
  Archive,
  BookOpen,
  Compass,
  Eye,
  Feather,
  FlaskConical,
  Hammer,
  HeartHandshake,
  Lamp,
  Map,
  MessageCircleQuestion,
  Package,
  Scale,
  ShieldAlert,
  ShieldQuestion,
  Swords,
  Wand2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CallingDefinition } from '../../../shared/council/index.js';
import './CallingGrimoireList.css';

// Unknown/future Callings fall back to BookOpen; no Calling-specific UI branches.
const callingIcons: Record<string, LucideIcon> = {
  'lantern-bearer': Lamp,
  inquisitor: ShieldQuestion,
  rival: Swords,
  'wild-mage': Wand2,
  magistrate: Scale,
  'royal-scribe': Feather,
  saboteur: ShieldAlert,
  empath: HeartHandshake,
  alchemist: FlaskConical,
  cartographer: Map,
  oracle: Eye,
  sage: MessageCircleQuestion,
  pathfinder: Compass,
  archivist: Archive,
  quartermaster: Package,
  architect: Hammer,
};

type CallingGrimoireListProps = {
  callings: CallingDefinition[];
  selectedCallingId: string;
  customizedCallingIds: Set<string>;
  onSelect: (callingId: string) => void;
};

export function CallingGrimoireList({
  callings,
  selectedCallingId,
  customizedCallingIds,
  onSelect,
}: CallingGrimoireListProps) {
  return (
    <aside className="calling-grimoire-list" aria-label="Council Callings">
      {callings.map((calling) => {
        const Icon = callingIcons[calling.id] ?? BookOpen;

        return (
          <button
            className="calling-grimoire-list__item"
            data-selected={calling.id === selectedCallingId}
            key={calling.id}
            onClick={() => onSelect(calling.id)}
            type="button"
          >
            <span className="calling-grimoire-list__icon">
              <Icon size={18} aria-hidden="true" />
            </span>
            <span className="calling-grimoire-list__titles">
              <strong>{calling.fantasyTitle}</strong>
              <span>{calling.practicalTitle}</span>
            </span>
            {customizedCallingIds.has(calling.id) && (
              <span className="calling-grimoire-list__badge">Customized</span>
            )}
          </button>
        );
      })}
    </aside>
  );
}
