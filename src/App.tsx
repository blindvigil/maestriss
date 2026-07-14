import { useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { navigationItems } from './config/navigation';
import { ProjectProvider } from './context/ProjectContext';
import { DashboardPage } from './pages/DashboardPage';
import { DriversPage } from './pages/DriversPage';
import { ExportPage } from './pages/ExportPage';
import { ParticipantsPage } from './pages/ParticipantsPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { PromptDesignerPage } from './pages/PromptDesignerPage';
import { ProfilesPage } from './pages/ProfilesPage';
import { RoleGrimoirePage } from './pages/RoleGrimoirePage';
import { SessionsPage } from './pages/SessionsPage';
import { SettingsPage } from './pages/SettingsPage';
import { WorkflowPage } from './pages/WorkflowPage';
import type { NavigationKey } from './types/navigation';

const pageTitles: Record<NavigationKey, string> = {
  dashboard: 'Dashboard',
  participants: 'Participants',
  profiles: 'Profiles',
  roles: 'Role Grimoire',
  prompts: 'Prompt Designer',
  workflow: 'Workflow',
  drivers: 'Drivers',
  history: 'Sessions',
  export: 'Export',
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

    if (activePage === 'profiles') {
      return <ProfilesPage />;
    }

    if (activePage === 'roles') {
      return <RoleGrimoirePage />;
    }

    if (activePage === 'prompts') {
      return <PromptDesignerPage />;
    }

    if (activePage === 'workflow') {
      return <WorkflowPage />;
    }

    if (activePage === 'drivers') {
      return <DriversPage />;
    }

    if (activePage === 'history') {
      return <SessionsPage />;
    }

    if (activePage === 'export') {
      return <ExportPage />;
    }

    if (activePage === 'settings') {
      return <SettingsPage />;
    }

    return <PlaceholderPage title={activeTitle} />;
  };

  return (
    <ProjectProvider>
      <AppShell activePage={activePage} onNavigate={setActivePage}>
        {renderPage()}
      </AppShell>
    </ProjectProvider>
  );
}
