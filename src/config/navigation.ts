import {
  Activity,
  BookOpen,
  Bot,
  FileDown,
  GitBranch,
  History,
  LayoutDashboard,
  MessageSquareText,
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
  { key: 'roles', label: 'Role Grimoire', icon: BookOpen },
  { key: 'prompts', label: 'Prompt Designer', icon: MessageSquareText },
  { key: 'workflow', label: 'Workflow', icon: GitBranch },
  { key: 'drivers', label: 'Drivers', icon: Activity },
  { key: 'history', label: 'Sessions', icon: History },
  { key: 'export', label: 'Export', icon: FileDown },
  { key: 'settings', label: 'Settings', icon: Settings },
];
