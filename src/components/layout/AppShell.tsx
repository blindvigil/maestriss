import type { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import type { NavigationKey } from '../../types/navigation';
import './AppShell.css';

type AppShellProps = {
  activePage: NavigationKey;
  onNavigate: (page: NavigationKey) => void;
  children: ReactNode;
};

export function AppShell({ activePage, onNavigate, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <Header />
      <div className="app-shell__body">
        <Sidebar activePage={activePage} onNavigate={onNavigate} />
        <main className="app-shell__main">{children}</main>
      </div>
    </div>
  );
}
