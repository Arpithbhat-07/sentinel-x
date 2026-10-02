import React from 'react';
import { Shield, Radio, Activity, Play, ChevronDown, User, Sparkles, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { RoleBadge } from './RoleBadge';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onLaunchDemo: () => Promise<void>;
  isDemoLoading: boolean;
  activeExerciseCode?: string;
  isConnected?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onLaunchDemo,
  isDemoLoading,
  activeExerciseCode,
  isConnected = true
}) => {
  const { user, currentRole, switchRole } = useAuth();

  const roles: UserRole[] = [
    'Instructor',
    'Commander',
    'Recon Officer',
    'Field Unit',
    'Communications Officer'
  ];

  const instructorNav = [
    { id: 'dashboard', label: 'Overview' },
    { id: 'scenarios', label: 'Scenarios' },
    { id: 'builder', label: 'Scenario Builder' },
    { id: 'lobby', label: 'Lobby' },
    { id: 'monitor', label: 'Live Monitor' },
    { id: 'aar', label: 'AAR Reports' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'settings', label: 'Settings' }
  ];

  const traineeNav = [
    { id: 'trainee_view', label: 'My Situation Room' },
    { id: 'lobby', label: 'Exercise Lobby' },
    { id: 'aar', label: 'AAR Review' },
    { id: 'settings', label: 'Settings' }
  ];

  const navItems = currentRole === 'Instructor' ? instructorNav : traineeNav;

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 border-b border-slate-800 backdrop-blur-md">
      {/* Top Banner with System Status */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-slate-800/80 text-xs">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Shield className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <span className="font-mono text-base font-black tracking-wider text-white">
                SENTINEL<span className="text-sky-400">-X</span>
              </span>
              <span className="hidden md:inline-block ml-2 text-[11px] font-mono text-slate-400 uppercase tracking-widest border-l border-slate-700 pl-2">
                Multi-Domain Decision Training Platform
              </span>
            </div>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-4">
          {/* Active Exercise Indicator */}
          {activeExerciseCode && (
            <div className="hidden sm:flex items-center gap-2 bg-slate-900 border border-slate-700/80 px-2.5 py-1 rounded-md font-mono text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-400">EXERCISE:</span>
              <span className="text-sky-400 font-bold">{activeExerciseCode}</span>
            </div>
          )}

          {/* WebSocket Link Status */}
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
            <span>{isConnected ? 'NODE LINKED' : 'RECONNECTING'}</span>
          </div>

          {/* One-Click Demo Mode Button (SIH Jury Presentation Requirement) */}
          <button
            onClick={onLaunchDemo}
            disabled={isDemoLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-mono text-xs font-bold transition-all shadow-md shadow-sky-950 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isDemoLoading ? 'LAUNCHING...' : 'START DEMO EXERCISE'}</span>
          </button>

          {/* Quick Role Switcher */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
            <span className="text-slate-500 text-[11px] font-mono hidden lg:inline">ROLE:</span>
            <select
              value={currentRole}
              onChange={(e) => switchRole(e.target.value as UserRole)}
              className="bg-transparent text-xs font-mono text-slate-200 focus:outline-none cursor-pointer"
            >
              {roles.map((r) => (
                <option key={r} value={r} className="bg-slate-900 text-slate-200">
                  {r}
                </option>
              ))}
            </select>
            <RoleBadge role={currentRole} size="sm" showIcon={false} />
          </div>
        </div>
      </div>

      {/* Primary Navigation Bar */}
      <nav className="flex items-center px-6 overflow-x-auto text-xs font-mono">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`px-4 py-2.5 whitespace-nowrap font-medium transition-colors border-b-2 uppercase tracking-wider ${
                isActive
                  ? 'border-sky-400 text-sky-400 bg-sky-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Section 16: Disconnection & Reconnection Banner */}
      {!isConnected && (
        <div className="bg-amber-950/90 border-t border-b border-amber-500/50 py-1.5 px-6 flex items-center justify-between text-xs font-mono text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse flex-shrink-0" />
            <span>⚠ CONNECTION INTERRUPTED — Attempting to reconnect to tactical telemetry node...</span>
          </div>
          <span className="text-[11px] text-amber-400/80">RECONNECTING...</span>
        </div>
      )}
    </header>
  );
};
