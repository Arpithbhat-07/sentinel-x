import React from 'react';
import { UserRole } from '../types';

interface RoleBadgeProps {
  role: UserRole | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'md', showIcon = true }) => {
  const getRoleStyle = (r: string) => {
    switch (r) {
      case 'Instructor':
        return {
          bg: 'bg-purple-950/60 border-purple-500/40 text-purple-300',
          dot: 'bg-purple-400',
          icon: '✦'
        };
      case 'Commander':
        return {
          bg: 'bg-sky-950/60 border-sky-500/40 text-sky-300',
          dot: 'bg-sky-400',
          icon: '★'
        };
      case 'Recon Officer':
        return {
          bg: 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300',
          dot: 'bg-emerald-400',
          icon: '◎'
        };
      case 'Field Unit':
        return {
          bg: 'bg-amber-950/60 border-amber-500/40 text-amber-300',
          dot: 'bg-amber-400',
          icon: '▲'
        };
      case 'Communications Officer':
        return {
          bg: 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300',
          dot: 'bg-cyan-400',
          icon: '⚡'
        };
      default:
        return {
          bg: 'bg-slate-900 border-slate-700 text-slate-300',
          dot: 'bg-slate-400',
          icon: '●'
        };
    }
  };

  const style = getRoleStyle(role);
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3.5 py-1.5'
  }[size];

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium border rounded-md uppercase tracking-wider ${style.bg} ${sizeClasses}`}>
      {showIcon && <span className="text-[11px] font-bold">{style.icon}</span>}
      <span>{role}</span>
    </span>
  );
};
