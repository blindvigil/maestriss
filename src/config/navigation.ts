import {
  Activity,
  Bot,
  GitBranch,
  History,
  LayoutDashboard,
  Settings,
  SlidersHorizontal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { NavigationKey } from '../types/navigation';

export type NavigationItem = {
  key: NavigationKey;
  label: string;
  icon: LucideIcon;
};

export const navigationItems: NavigationItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'participants', label: 'Participants', icon: Bot },
  { key: 'profiles', label: 'Profiles', icon: SlidersHorizontal },
  { key: 'workflow', label: 'Workflow', icon: GitBranch },
  { key: 'drivers', label: 'Drivers', icon: Activity },
  { key: 'history', label: 'Run History', icon: History },
  { key: 'settings', label: 'Settings', icon: Settings },
];
