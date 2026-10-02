import React from 'react';
import { Eye, Shield, Check, X, Clock, HelpCircle, Layers, AlertCircle } from 'lucide-react';
import { UserRole } from '../types';
import { RoleBadge } from './RoleBadge';

interface InformationAsymmetryCardProps {
  currentRole: UserRole;
  isInstructorView?: boolean;
  reports?: any[];
}

export const InformationAsymmetryCard: React.FC<InformationAsymmetryCardProps> = ({
  currentRole,
  isInstructorView = false,
  reports = []
}) => {
  // Trainee perspective role definitions
  const rolePerspectiveMap: Record<UserRole, {
    availableSources: { name: string; available: boolean }[];
    confidence: number;
    primaryLens: string;
    unreliabilityWarning?: string;
  }> = {
    'Commander': {
      availableSources: [
        { name: 'Strategic Mission Directives', available: true },
        { name: 'Cross-Role Submissions Feed', available: true },
        { name: 'Synthetic Theater Grid Map', available: true },
        { name: 'Direct Field Tactical Sensors', available: false }
      ],
      confidence: 75,
      primaryLens: 'Synthesizes conflicting reports from Recon vs Field Unit to formulate orders.',
      unreliabilityWarning: 'Receives aggregated summaries with transmission delay. Sensor raw feed unavailable.'
    },
    'Recon Officer': {
      availableSources: [
        { name: 'Ghost Eye-1 Electro-Optical Radar', available: true },
        { name: 'Sector Bravo Long-Range Sweep', available: true },
        { name: 'Thermal Variance Analytics', available: true },
        { name: 'Commander Strategic Planning Lens', available: false }
      ],
      confidence: 68,
      primaryLens: 'High surveillance coverage; thermal signatures registered at 68% confidence.',
      unreliabilityWarning: 'Ambient heat refraction creates false positive risks in Sector Bravo tree line.'
    },
    'Field Unit': {
      availableSources: [
        { name: 'Direct Ground Visual Line-of-Sight', available: true },
        { name: 'Checkpoint Orion Perimeter Sweep', available: true },
        { name: 'Local Unit Defense Posture', available: true },
        { name: 'Wide-Area Overhead Radar Feed', available: false }
      ],
      confidence: 92,
      primaryLens: 'High local ground certainty (92% conf); zero signatures observed locally.',
      unreliabilityWarning: 'Limited to immediate visual horizon (~1.5km defile). Blind to northern approaches.'
    },
    'Communications Officer': {
      availableSources: [
        { name: 'RF Carrier Link Telemetry', available: true },
        { name: 'Packet Loss & Jitter Telemetry', available: true },
        { name: 'Microwave Secondary Relay Switch', available: true },
        { name: 'Ground Tactical Observations', available: false }
      ],
      confidence: 90,
      primaryLens: 'Monitors electromagnetic interference, channel health, and packet latency.',
      unreliabilityWarning: 'RF buffer saturation causes transient desynchronization during peak jamming.'
    },
    'Instructor': {
      availableSources: [
        { name: 'Global Ground Truth Operational Picture', available: true },
        { name: 'All Multi-Role Incoming & Outgoing Channels', available: true },
        { name: 'Disruption Injection Control Interface', available: true }
      ],
      confidence: 100,
      primaryLens: 'Omniscient operational oversight for evaluation and disruption scheduling.'
    }
  };

  const perspective = rolePerspectiveMap[currentRole] || rolePerspectiveMap['Commander'];

  if (isInstructorView) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <h3 className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider">
              Information Asymmetry Comparison Matrix (Instructor Audit)
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-purple-300">
            PS 26248 CORE AUDIT
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          {/* Commander Perspective */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sky-400 font-bold">COMMANDER</span>
              <span className="text-[10px] text-slate-400">75% Conf</span>
            </div>
            <p className="text-[11px] text-slate-300 font-sans">
              Sector Bravo Activity: <strong className="text-amber-400">AMBIGUOUS / PENDING</strong>
            </p>
            <p className="text-[10px] text-slate-500 italic">"Requires ground verification before advancing."</p>
          </div>

          {/* Recon Perspective */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 font-bold">RECON OFFICER</span>
              <span className="text-[10px] text-amber-400">68% Conf</span>
            </div>
            <p className="text-[11px] text-slate-300 font-sans">
              Sector Bravo Activity: <strong className="text-rose-400">SUSPECTED THERMAL</strong>
            </p>
            <p className="text-[10px] text-slate-500 italic">"Electro-optical sensor logged anomalous cluster."</p>
          </div>

          {/* Field Unit Perspective */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-amber-400 font-bold">FIELD UNIT</span>
              <span className="text-[10px] text-emerald-400">92% Conf</span>
            </div>
            <p className="text-[11px] text-slate-300 font-sans">
              Sector Bravo Activity: <strong className="text-emerald-400">ALL CLEAR / ZERO CONTACT</strong>
            </p>
            <p className="text-[10px] text-slate-500 italic">"Ground visual sweep negative."</p>
          </div>
        </div>
      </div>
    );
  }

  // Trainee View Card
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-sky-400" />
          <h3 className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider">
            Your Information Perspective
          </h3>
        </div>
        <RoleBadge role={currentRole} size="sm" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Available Sources */}
        <div className="space-y-1.5 font-mono">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-semibold">
            Operational Information Feeds:
          </span>
          <div className="space-y-1">
            {perspective.availableSources.map((src, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                {src.available ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <X className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                )}
                <span className={src.available ? 'text-slate-200' : 'text-slate-500 line-through'}>
                  {src.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Confidence & Asymmetry Lens */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-slate-400">Sensor Confidence:</span>
            <span className="font-bold text-amber-400 text-sm">{perspective.confidence}%</span>
          </div>

          <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
            {perspective.primaryLens}
          </p>

          {perspective.unreliabilityWarning && (
            <div className="pt-1.5 border-t border-slate-800 flex items-start gap-1.5 text-[10px] text-amber-400/90 font-mono">
              <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span>{perspective.unreliabilityWarning}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
