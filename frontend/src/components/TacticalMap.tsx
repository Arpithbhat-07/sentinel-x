import React, { useState } from 'react';
import { Shield, Eye, Radio, Crosshair, AlertTriangle, Layers, Navigation, HelpCircle } from 'lucide-react';
import { UserRole } from '../types';

interface TacticalMapProps {
  currentRole: UserRole;
  commsReliability: number;
  activeDisruptions: string[];
  reports?: any[];
  onSelectSector?: (sectorName: string) => void;
}

export const TacticalMap: React.FC<TacticalMapProps> = ({
  currentRole,
  commsReliability,
  activeDisruptions,
  reports = [],
  onSelectSector
}) => {
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [filterLayer, setFilterLayer] = useState<'all' | 'sectors' | 'units' | 'intel'>('all');

  const sectors = [
    { id: 'alpha', name: 'Sector Alpha', x: 22, y: 25, r: 18, status: 'SECURE', desc: 'Forward staging base & logistics corridor.' },
    { id: 'bravo', name: 'Sector Bravo', x: 68, y: 35, r: 22, status: 'CONTESTED_INTEL', desc: 'Ambiguous sector. Conflicting thermal vs ground reports.' },
    { id: 'charlie', name: 'Sector Charlie', x: 38, y: 72, r: 20, status: 'UNKNOWN', desc: 'Unsurveyed terrain defile. High electronic attenuation.' },
    { id: 'delta', name: 'Sector Delta', x: 82, y: 78, r: 16, status: 'OBJECTIVE', desc: 'Objective Apex designated rendezvous corridor.' }
  ];

  const landmarks = [
    { name: 'Forward Base Zenith', x: 14, y: 18, type: 'BASE' },
    { name: 'Ridge 7', x: 44, y: 36, type: 'TERRAIN' },
    { name: 'Checkpoint Orion', x: 50, y: 30, type: 'CHECKPOINT' },
    { name: 'Valley North', x: 56, y: 62, type: 'TERRAIN' },
    { name: 'Objective Apex', x: 84, y: 82, type: 'OBJECTIVE' }
  ];

  const units = [
    { id: 'u-cmd', name: 'Overwatch Alpha', role: 'Commander', x: 18, y: 22, status: 'ACTIVE', callsign: 'CMD-1' },
    { id: 'u-rec', name: 'Ghost Eye-1', role: 'Recon Officer', x: 44, y: 40, status: 'OBSERVATION', callsign: 'REC-2' },
    { id: 'u-fld', name: 'Vanguard-3', role: 'Field Unit', x: 48, y: 32, status: 'HOLDING', callsign: 'FLD-3' },
    { id: 'u-com', name: 'Relay Hub-6', role: 'Communications Officer', x: 22, y: 28, status: 'ONLINE', callsign: 'COM-4' }
  ];

  const isDegraded = commsReliability < 0.65;
  const hasConflict = activeDisruptions.some(d => d.toLowerCase().includes('conflict'));

  return (
    <div className="relative w-full h-[480px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col shadow-2xl">
      {/* Top Map HUD Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-slate-800/80 backdrop-blur z-20 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isDegraded ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isDegraded ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
            </span>
            <span className="font-mono font-bold tracking-wider text-slate-200 uppercase">
              GRID: SYNTHETIC OPERATIONAL THEATER
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="font-mono text-slate-400">DATUM: WGS-84 (SIM)</span>
          <span className="text-slate-600">|</span>
          <span className="font-mono text-slate-400">RESOLUTION: 1:25,000</span>
        </div>

        {/* Layer Filters */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-mono mr-1">LAYERS:</span>
          {(['all', 'sectors', 'units', 'intel'] as const).map(layer => (
            <button
              key={layer}
              onClick={() => setFilterLayer(layer)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors uppercase ${
                filterLayer === layer
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'bg-slate-800/50 text-slate-400 hover:text-slate-200'
              }`}
            >
              {layer}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Tactical Canvas Area */}
      <div className="relative flex-1 tactical-grid overflow-hidden">
        {/* Subtle Scanline Overlay */}
        <div className="absolute inset-0 tactical-scanlines z-10"></div>

        {/* RF Jamming / Electromagnetic Noise Simulation Overlay */}
        {isDegraded && (
          <div
            className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-1000"
            style={{
              background: `radial-gradient(circle at 65% 35%, rgba(245, 158, 11, ${0.15 * (1 - commsReliability)}) 0%, transparent 60%)`,
              backdropFilter: commsReliability < 0.3 ? 'blur(1px)' : 'none'
            }}
          >
            <div className="absolute top-4 right-4 bg-amber-950/80 border border-amber-500/40 px-3 py-1.5 rounded-lg text-amber-300 text-xs font-mono flex items-center gap-2 backdrop-blur">
              <AlertTriangle className="w-3.5 h-3.5 animate-pulse text-amber-400" />
              <span>RF INTERFERENCE ATTENUATION ACTIVE</span>
            </div>
          </div>
        )}

        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Defile / Route Lines */}
          <path
            d="M 18,22 Q 40,30 48,32 T 84,82"
            fill="none"
            stroke="rgba(56, 189, 248, 0.25)"
            strokeWidth="0.6"
            strokeDasharray="1.5, 1.5"
          />

          {/* Sector Zones */}
          {(filterLayer === 'all' || filterLayer === 'sectors') &&
            sectors.map(sec => {
              const isContested = sec.status === 'CONTESTED_INTEL' || (sec.name === 'Sector Bravo' && hasConflict);
              return (
                <g
                  key={sec.id}
                  className="cursor-pointer transition-all duration-300 hover:opacity-100"
                  onClick={() => {
                    setSelectedEntity({ type: 'sector', data: sec });
                    onSelectSector?.(sec.name);
                  }}
                >
                  <circle
                    cx={sec.x}
                    cy={sec.y}
                    r={sec.r}
                    fill={isContested ? 'rgba(239, 68, 68, 0.08)' : 'rgba(30, 41, 59, 0.2)'}
                    stroke={isContested ? 'rgba(239, 68, 68, 0.6)' : 'rgba(71, 85, 105, 0.4)'}
                    strokeWidth="0.5"
                    strokeDasharray={isContested ? '1, 1' : 'none'}
                    className={isContested ? 'animate-pulse' : ''}
                  />
                  <text
                    x={sec.x}
                    y={sec.y - sec.r + 3.5}
                    textAnchor="middle"
                    fill={isContested ? '#F87171' : '#94A3B8'}
                    fontSize="2.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                    letterSpacing="0.05em"
                  >
                    {sec.name.toUpperCase()}
                  </text>
                  {isContested && (
                    <text
                      x={sec.x}
                      y={sec.y + 1}
                      textAnchor="middle"
                      fill="#EF4444"
                      fontSize="2"
                      fontFamily="monospace"
                    >
                      [ CONFLICTED INTEL ]
                    </text>
                  )}
                </g>
              );
            })}

          {/* Landmarks */}
          {landmarks.map((lm, idx) => (
            <g key={idx} className="cursor-pointer" onClick={() => setSelectedEntity({ type: 'landmark', data: lm })}>
              <rect
                x={lm.x - 1}
                y={lm.y - 1}
                width="2"
                height="2"
                fill="#334155"
                stroke="#64748B"
                strokeWidth="0.3"
                transform={`rotate(45, ${lm.x}, ${lm.y})`}
              />
              <text
                x={lm.x}
                y={lm.y + 3.5}
                textAnchor="middle"
                fill="#64748B"
                fontSize="1.8"
                fontFamily="monospace"
              >
                {lm.name}
              </text>
            </g>
          ))}

          {/* Reports Overlay (Unknown objects / Observations) */}
          {(filterLayer === 'all' || filterLayer === 'intel') &&
            reports.map((rep, idx) => {
              const isConflicting = rep.verification_status === 'CONFLICTING';
              return (
                <g
                  key={rep.id || idx}
                  className="cursor-pointer"
                  onClick={() => setSelectedEntity({ type: 'report', data: rep })}
                >
                  <circle
                    cx={rep.coordinate_x || 50}
                    cy={rep.coordinate_y || 50}
                    r="2.5"
                    fill={isConflicting ? 'rgba(239, 68, 68, 0.4)' : 'rgba(56, 189, 248, 0.3)'}
                    stroke={isConflicting ? '#EF4444' : '#38BDF8'}
                    strokeWidth="0.4"
                    strokeDasharray="0.8, 0.8"
                  />
                  <text
                    x={rep.coordinate_x || 50}
                    y={(rep.coordinate_y || 50) - 3}
                    textAnchor="middle"
                    fill={isConflicting ? '#FCA5A5' : '#7DD3FC'}
                    fontSize="1.8"
                    fontFamily="monospace"
                  >
                    ? {rep.confidence_level}% conf
                  </text>
                </g>
              );
            })}

          {/* Units */}
          {(filterLayer === 'all' || filterLayer === 'units') &&
            units.map(unit => {
              const isCurrent = unit.role === currentRole;
              return (
                <g
                  key={unit.id}
                  className="cursor-pointer group"
                  onClick={() => setSelectedEntity({ type: 'unit', data: unit })}
                >
                  {/* Radar ping ring around current trainee's unit */}
                  {isCurrent && (
                    <circle
                      cx={unit.x}
                      cy={unit.y}
                      r="4"
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="0.4"
                      className="animate-ping opacity-60"
                    />
                  )}
                  <circle
                    cx={unit.x}
                    cy={unit.y}
                    r="2.2"
                    fill={isCurrent ? '#0284C7' : '#1E293B'}
                    stroke={isCurrent ? '#38BDF8' : '#64748B'}
                    strokeWidth="0.6"
                  />
                  <text
                    x={unit.x}
                    y={unit.y + 0.7}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="1.6"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {unit.callsign.slice(0, 3)}
                  </text>
                  <text
                    x={unit.x}
                    y={unit.y - 3.2}
                    textAnchor="middle"
                    fill={isCurrent ? '#38BDF8' : '#CBD5E1'}
                    fontSize="2"
                    fontFamily="monospace"
                    fontWeight={isCurrent ? 'bold' : 'normal'}
                  >
                    {unit.name}
                  </text>
                </g>
              );
            })}
        </svg>

        {/* Selected Entity Info Callout Box */}
        {selectedEntity && (
          <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-700 p-3 rounded-lg max-w-xs shadow-xl backdrop-blur z-20 text-xs">
            <div className="flex items-center justify-between mb-1.5 border-b border-slate-800 pb-1">
              <span className="font-mono font-bold text-sky-400 uppercase tracking-wide">
                {selectedEntity.type}: {selectedEntity.data.name || selectedEntity.data.title}
              </span>
              <button
                onClick={() => setSelectedEntity(null)}
                className="text-slate-400 hover:text-slate-200 text-xs font-mono ml-2"
              >
                ✕
              </button>
            </div>
            {selectedEntity.type === 'unit' && (
              <div className="space-y-1 font-mono text-slate-300">
                <p>Role: <span className="text-white font-medium">{selectedEntity.data.role}</span></p>
                <p>Status: <span className="text-emerald-400">{selectedEntity.data.status}</span></p>
                <p>Grid: [{selectedEntity.data.x}, {selectedEntity.data.y}]</p>
              </div>
            )}
            {selectedEntity.type === 'sector' && (
              <div className="space-y-1 font-mono text-slate-300">
                <p>Condition: <span className={selectedEntity.data.status.includes('CONTESTED') ? 'text-rose-400' : 'text-emerald-400'}>{selectedEntity.data.status}</span></p>
                <p className="text-[11px] text-slate-400">{selectedEntity.data.desc}</p>
              </div>
            )}
            {selectedEntity.type === 'report' && (
              <div className="space-y-1 font-mono text-slate-300">
                <p>Source: <span className="text-white">{selectedEntity.data.source_name}</span></p>
                <p>Confidence: <span className="text-amber-400">{selectedEntity.data.confidence_level}%</span></p>
                <p>Status: <span className={selectedEntity.data.verification_status === 'CONFLICTING' ? 'text-rose-400' : 'text-slate-300'}>{selectedEntity.data.verification_status}</span></p>
                <p className="text-[11px] text-slate-400 italic">"{selectedEntity.data.observation}"</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Map Legend */}
      <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span> Friendly Unit
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-dashed border-rose-500 bg-rose-500/30 inline-block"></span> Unverified / Contested
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rotate-45 bg-slate-600 inline-block"></span> Checkpoint / Terrain
          </span>
        </div>
        <div className="text-slate-500">
          Role Perspective: <span className="text-sky-300 font-bold">{currentRole}</span>
        </div>
      </div>
    </div>
  );
};
