import { navigationItems } from '../../config/navigation';
import type { NavigationKey } from '../../types/navigation';
import './Sidebar.css';

type SidebarProps = {
  activePage: NavigationKey;
  onNavigate: (page: NavigationKey) => void;
};

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Primary">
      <nav className="sidebar__nav">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.key;

          return (
            <button
              className="sidebar__item"
              data-active={isActive}
              key={item.key}
              onClick={() => onNavigate(item.key)}
              type="button"
            >
              <Icon size={17} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
