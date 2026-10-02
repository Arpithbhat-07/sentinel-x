import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, Radio, RefreshCw, XCircle } from 'lucide-react';

interface DegradationStatusBannerProps {
  reliability: number; // 0.0 to 1.0
  latencySec: number;
  dropoutRate: number;
  activeDisruptions: string[];
}

export const DegradationStatusBanner: React.FC<DegradationStatusBannerProps> = ({
  reliability,
  latencySec,
  dropoutRate,
  activeDisruptions
}) => {
  const percent = Math.round(reliability * 100);

  // Generate ASCII block progress bar (Section 6 requirement)
  const totalBlocks = 18;
  const filledBlocks = Math.round((percent / 100) * totalBlocks);
  const emptyBlocks = totalBlocks - filledBlocks;
  const asciiBar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

  const isBlackout = percent < 30 || dropoutRate >= 0.8;
  const isRecovering = activeDisruptions.some(d => d.toLowerCase().includes('restored') || d.toLowerCase().includes('secondary'));
  const isDegraded = !isBlackout && (percent < 85 || latencySec > 3 || dropoutRate > 0.1);
  const isNormal = !isBlackout && !isDegraded && !isRecovering;

  let stateConfig = {
    bg: 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300',
    title: 'LINK STABLE',
    badge: 'NORMAL OPERATIONAL C2',
    icon: CheckCircle2,
    accentColor: 'text-emerald-400',
    barColor: 'bg-emerald-500'
  };

  if (isBlackout) {
    stateConfig = {
      bg: 'bg-rose-950/70 border-rose-500 text-rose-200 animate-pulse',
      title: 'LINK UNAVAILABLE / BLACKOUT',
      badge: '✕ CRITICAL RF INTERFERENCE',
      icon: XCircle,
      accentColor: 'text-rose-400',
      barColor: 'bg-rose-500'
    };
  } else if (isRecovering) {
    stateConfig = {
      bg: 'bg-cyan-950/50 border-cyan-500/60 text-cyan-200',
      title: 'RECOVERING SECONDARY LINK',
      badge: '↻ DIRECTIONAL RELAY ONLINE',
      icon: RefreshCw,
      accentColor: 'text-cyan-400',
      barColor: 'bg-cyan-400'
    };
  } else if (isDegraded) {
    stateConfig = {
      bg: 'bg-amber-950/60 border-amber-500 text-amber-200',
      title: 'DEGRADED C2 LINK',
      badge: '⚠ JAMMING & LATENCY ACTIVE',
      icon: AlertTriangle,
      accentColor: 'text-amber-400',
      barColor: 'bg-amber-500'
    };
  }

  const Icon = stateConfig.icon;

  return (
    <div className={`rounded-xl border p-4 shadow-2xl transition-all duration-500 ${stateConfig.bg}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* State Banner & ASCII Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <Icon className={`w-5 h-5 ${stateConfig.accentColor} animate-bounce`} />
            <span className="font-mono font-black text-sm uppercase tracking-wider text-white">
              COMMUNICATION STATUS: {stateConfig.title}
            </span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-black/40 border border-current font-bold uppercase">
              {percent}% CARRIER INTEGRITY
            </span>
          </div>

          {/* Graphical Progress Bar + ASCII Block representation */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs tracking-tight text-white/90 select-none hidden sm:inline-block">
              {asciiBar}
            </span>
            <div className="w-48 sm:w-64 bg-black/50 h-2.5 rounded-full overflow-hidden border border-white/10">
              <div
                className={`h-full transition-all duration-700 ${stateConfig.barColor}`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="font-mono font-bold text-xs text-white">
              {percent}%
            </span>
          </div>
        </div>

        {/* Diagnostic Telemetry Readout */}
        <div className="flex items-center gap-4 text-xs font-mono bg-black/40 px-3.5 py-2 rounded-lg border border-white/10">
          <div>
            <span className="text-white/60 text-[10px] block">INDUCED DELAY</span>
            <span className="font-bold text-amber-300">+{latencySec}s</span>
          </div>
          <div className="w-px h-6 bg-white/10"></div>
          <div>
            <span className="text-white/60 text-[10px] block">PACKET LOSS</span>
            <span className="font-bold text-rose-300">{Math.round(dropoutRate * 100)}%</span>
          </div>
          <div className="w-px h-6 bg-white/10"></div>
          <div>
            <span className="text-white/60 text-[10px] block">LINK CHANNEL</span>
            <span className="font-bold text-sky-300">{isRecovering ? 'MICROWAVE' : 'UHF TACTICAL'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
