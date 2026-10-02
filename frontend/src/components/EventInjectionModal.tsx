import React, { useState } from 'react';
import { Zap, X, AlertTriangle, Radio, ShieldX, EyeOff, Activity, RefreshCw } from 'lucide-react';

interface EventInjectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInject: (eventData: any) => Promise<void>;
}

export const EventInjectionModal: React.FC<EventInjectionModalProps> = ({
  isOpen,
  onClose,
  onInject
}) => {
  const [eventType, setEventType] = useState('COMMS_DELAY');
  const [targetRole, setTargetRole] = useState('ALL');
  const [title, setTitle] = useState('RF Jitter & Multipath Interference');
  const [description, setDescription] = useState('Atmospheric attenuation elevating link latency to 12 seconds.');
  const [delaySec, setDelaySec] = useState(12.0);
  const [dropoutProb, setDropoutProb] = useState(0.25);
  const [reliabilityImpact, setReliabilityImpact] = useState(0.40);
  const [sector, setSector] = useState('Sector Bravo');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const presets = [
    {
      id: 'COMMS_DELAY',
      title: 'Communication Delay',
      desc: 'Introduce severe latency across team transmissions',
      icon: Radio,
      defaultTitle: 'Directional Buffer Saturation',
      defaultDesc: 'Message delivery delay increased to 12 seconds.',
      delay: 12.0,
      dropout: 0.10,
      impact: 0.40
    },
    {
      id: 'DROPOUT',
      title: 'Message Dropout Surge',
      desc: 'Induce high packet loss causing messages to disappear in transit',
      icon: ShieldX,
      defaultTitle: 'Heavy Electronic Attenuation',
      defaultDesc: 'Packet loss increased to 60%. Critical messages dropping.',
      delay: 4.0,
      dropout: 0.60,
      impact: 0.65
    },
    {
      id: 'CONFLICT',
      title: 'Conflicting Report',
      desc: 'Generate contradictory intelligence observation to test deconfliction',
      icon: AlertTriangle,
      defaultTitle: 'Contradictory Telemetry Injected',
      defaultDesc: 'Opposing ground vs sensor observations generated for designated sector.',
      delay: 2.0,
      dropout: 0.05,
      impact: 0.20
    },
    {
      id: 'FEED_OFFLINE',
      title: 'Sensor Feed Offline',
      desc: 'Disconnect primary reconnaissance telemetry stream',
      icon: EyeOff,
      defaultTitle: 'Forward Surveillance Array Offline',
      defaultDesc: 'Primary electro-optical radar feed lost signal.',
      delay: 0.0,
      dropout: 0.30,
      impact: 0.50
    },
    {
      id: 'NETWORK_DEGRADE',
      title: 'Multi-Domain EW Jamming',
      desc: 'Compound disruption: simultaneous latency, jitter, and word corruption',
      icon: Activity,
      defaultTitle: 'Multi-Domain Countermeasures',
      defaultDesc: 'Compound electronic warfare attack affecting all RF channels.',
      delay: 15.0,
      dropout: 0.45,
      impact: 0.70
    },
    {
      id: 'RECOVERY',
      title: 'Restore Channel Link',
      desc: 'Return communication reliability to nominal 90% operating state',
      icon: RefreshCw,
      defaultTitle: 'Secondary Relay Operational',
      defaultDesc: 'Signal channels restored. Latency reduced to normal baseline.',
      delay: 1.0,
      dropout: 0.05,
      impact: 0.0
    }
  ];

  const handleSelectPreset = (p: typeof presets[0]) => {
    setEventType(p.id);
    setTitle(p.defaultTitle);
    setDescription(p.defaultDesc);
    setDelaySec(p.delay);
    setDropoutProb(p.dropout);
    setReliabilityImpact(p.impact);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onInject({
        event_type: eventType,
        target_role: targetRole,
        title,
        description,
        delay_seconds: delaySec,
        dropout_probability: dropoutProb,
        reliability_impact: reliabilityImpact,
        sector
      });
      onClose();
    } catch (err) {
      console.error('Failed to inject disruption:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono tracking-wider text-slate-100 uppercase">
                Instructor Event Injection Panel
              </h3>
              <p className="text-[11px] text-slate-400 font-sans">
                Real-time mid-exercise disruption controller
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset Selector Grid */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/40">
          <label className="block text-slate-400 font-mono text-[11px] uppercase tracking-wide mb-2">
            Select Disruption Vector:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {presets.map((p) => {
              const Icon = p.icon;
              const isSelected = eventType === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'bg-amber-950/40 border-amber-500/60 text-amber-300 shadow-md shadow-amber-950/20'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span className="font-mono font-bold text-[11px] leading-tight">{p.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 line-clamp-2 leading-snug">{p.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detailed Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs font-sans">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-mono mb-1 uppercase tracking-wide text-[11px]">
                Target Recipient / Channel
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">ALL Trainees (Global)</option>
                <option value="Commander">Commander Only</option>
                <option value="Recon Officer">Recon Officer Only</option>
                <option value="Field Unit">Field Unit Only</option>
                <option value="Communications Officer">Communications Officer</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-mono mb-1 uppercase tracking-wide text-[11px]">
                Affected Sector
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="Sector Bravo">Sector Bravo</option>
                <option value="Sector Alpha">Sector Alpha</option>
                <option value="Sector Charlie">Sector Charlie</option>
                <option value="Sector Delta">Sector Delta</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between font-mono mb-1 text-[11px]">
                <span className="text-slate-300">Added Delay:</span>
                <span className="text-amber-400 font-bold">{delaySec}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={delaySec}
                onChange={(e) => setDelaySec(parseFloat(e.target.value))}
                className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between font-mono mb-1 text-[11px]">
                <span className="text-slate-300">Packet Dropout:</span>
                <span className="text-rose-400 font-bold">{Math.round(dropoutProb * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.9"
                step="0.05"
                value={dropoutProb}
                onChange={(e) => setDropoutProb(parseFloat(e.target.value))}
                className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-mono mb-1 uppercase tracking-wide text-[11px]">
              Event Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs font-mono focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-mono mb-1 uppercase tracking-wide text-[11px]">
              Event Operational Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs font-sans focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-mono text-xs font-bold tracking-wider flex items-center gap-1.5 transition-colors uppercase shadow-lg shadow-amber-900/30"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>INJECT DISRUPTION NOW</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
