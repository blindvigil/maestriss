import { useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { navigationItems } from './config/navigation';
import { DashboardPage } from './pages/DashboardPage';
import { ParticipantsPage } from './pages/ParticipantsPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import type { NavigationKey } from './types/navigation';

const pageTitles: Record<NavigationKey, string> = {
  dashboard: 'Dashboard',
  participants: 'Participants',
  profiles: 'Profiles',
  workflow: 'Workflow',
  drivers: 'Drivers',
  history: 'Run History',
  settings: 'Settings',
};

export function App() {
  const [activePage, setActivePage] = useState<NavigationKey>('dashboard');

  const activeNavigationItem = navigationItems.find((item) => item.key === activePage);
  const activeTitle = activeNavigationItem?.label ?? pageTitles[activePage];

  const renderPage = () => {
    if (activePage === 'dashboard') {
      return <DashboardPage />;
    }

    if (activePage === 'participants') {
      return <ParticipantsPage />;
    }

    return <PlaceholderPage title={activeTitle} />;
  };

  return (
    <AppShell activePage={activePage} onNavigate={setActivePage}>
      {renderPage()}
    </AppShell>
  );
}
