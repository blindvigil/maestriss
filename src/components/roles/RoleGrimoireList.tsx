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
  Users,
  Wand2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { RoleDefinition } from '../../../shared/council/index.js';
import './RoleGrimoireList.css';

// Unknown/future roles fall back to BookOpen; no role-specific UI branches.
const roleIcons: Record<string, LucideIcon> = {
  'lantern-bearer': Lamp,
  inquisitor: ShieldQuestion,
  rival: Swords,
  'wild-mage': Wand2,
  'royal-scribe': Feather,
  magistrate: Scale,
  empath: HeartHandshake,
  saboteur: ShieldAlert,
  cartographer: Map,
  archivist: Archive,
  alchemist: FlaskConical,
  scout: Compass,
  quartermaster: Package,
  oracle: Eye,
  'master-of-questions': MessageCircleQuestion,
  smith: Hammer,
  councillor: Users,
};

type RoleGrimoireListProps = {
  roles: RoleDefinition[];
  selectedRoleId: string;
  customizedRoleIds: Set<string>;
  onSelect: (roleId: string) => void;
};

export function RoleGrimoireList({
  roles,
  selectedRoleId,
  customizedRoleIds,
  onSelect,
}: RoleGrimoireListProps) {
  return (
    <aside className="role-grimoire-list" aria-label="Council roles">
      {roles.map((role) => {
        const Icon = roleIcons[role.id] ?? BookOpen;

        return (
          <button
            className="role-grimoire-list__item"
            data-selected={role.id === selectedRoleId}
            key={role.id}
            onClick={() => onSelect(role.id)}
            type="button"
          >
            <span className="role-grimoire-list__icon">
              <Icon size={18} aria-hidden="true" />
            </span>
            <span className="role-grimoire-list__titles">
              <strong>{role.fantasyTitle}</strong>
              <span>{role.practicalTitle}</span>
            </span>
            {customizedRoleIds.has(role.id) && (
              <span className="role-grimoire-list__badge">Customized</span>
            )}
          </button>
        );
      })}
    </aside>
  );
}
