import { Zap, Network, Activity, Shield, Gamepad2, Cpu, Package, type LucideIcon } from 'lucide-react';

export const SUPER_PAGE_ICONS: Record<string, LucideIcon> = {
  Zap, Network, Activity, Shield, Gamepad2, Cpu, Package,
};

export function resolveSuperPageIcon(name: string): LucideIcon {
  return SUPER_PAGE_ICONS[name] || Package;
}

export interface SuperPageDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  featureIds: string[];
  combinedBackendEndpoints: string[];
  color: string;
  standalone: boolean;
}

export const SUPER_PAGES: SuperPageDefinition[] = [
  {
    id: 'performance-suite',
    name: 'Performance Suite',
    description: 'Complete performance tuning toolkit',
    icon: 'Zap',
    featureIds: ['auto-tweaker', 'fps-booster', 'general-tweaks', 'advanced-tweaks', 'game-profiles'],
    combinedBackendEndpoints: [],
    color: '#0ea5e9',
    standalone: true,
  },
  {
    id: 'network-tools',
    name: 'Network Tools',
    description: 'Network optimization and analysis',
    icon: 'Network',
    featureIds: ['networking', 'network-optimizer', 'latency-monitor', 'wifi-analyzer', 'network-speed'],
    combinedBackendEndpoints: [],
    color: '#06b6d4',
    standalone: true,
  },
  {
    id: 'system-analyzer',
    name: 'System Analyzer',
    description: 'Deep system analysis and diagnostics',
    icon: 'Activity',
    featureIds: ['dashboard', 'benchmark', 'disk-analyzer', 'process-manager', 'display'],
    combinedBackendEndpoints: [],
    color: '#22d3ee',
    standalone: true,
  },
  {
    id: 'privacy-kit',
    name: 'Privacy Kit',
    description: 'Privacy and security tools',
    icon: 'Shield',
    featureIds: ['debloating', 'privacy', 'rollback', 'startup-manager'],
    combinedBackendEndpoints: [],
    color: '#10b981',
    standalone: true,
  },
  {
    id: 'gaming-hub',
    name: 'Gaming Hub',
    description: 'Complete gaming optimization',
    icon: 'Gamepad2',
    featureIds: ['game-booster', 'game-profiles', 'game-predict', 'fps-booster', 'input-delay', 'macro-tools'],
    combinedBackendEndpoints: [],
    color: '#d6d1ca',
    standalone: true,
  },
  {
    id: 'bios-toolkit',
    name: 'BIOS Toolkit',
    description: 'Advanced BIOS management',
    icon: 'Cpu',
    featureIds: ['bios', 'advanced-tweaks', 'rollback'],
    combinedBackendEndpoints: [],
    color: '#8b5cf6',
    standalone: true,
  },
];
