import React, { useState, useEffect } from 'react';
import { Shield, Play, Plus, Clock, AlertTriangle, Layers, Radio, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { Scenario } from '../types';

interface ScenariosProps {
  onNavigate: (tab: string, param?: string) => void;
  onCreateExercise: (scenarioId: string) => Promise<void>;
}

export const Scenarios: React.FC<ScenariosProps> = ({ onNavigate, onCreateExercise }) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const loadScenarios = async () => {
    try {
      const list = await api.getScenarios();
      setScenarios(list);
      if (list.length > 0 && !selectedScenario) {
        setSelectedScenario(list[0]);
      }
    } catch (e) {
      console.error('Failed to load scenarios:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScenarios();
  }, []);

  const handleLaunch = async (scenId: string) => {
    setIsCreating(true);
    try {
      await onCreateExercise(scenId);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-5 h-5 text-sky-400" />
            Tactical Scenario Catalog
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Fictional multi-domain training scenarios designed to evaluate decision-making under uncertainty and degraded C2 links.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('builder')}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-sky-950"
          >
            <Plus className="w-4 h-4" />
            <span>NEW SCENARIO BUILDER</span>
          </button>
        </div>
      </div>

      {/* Main Catalog View: Scenario Cards Grid + Inspection Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scenarios List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scenarios.map((scen) => {
              const isSelected = selectedScenario?.id === scen.id;
              const isTemplate = scen.is_template;

              return (
                <div
                  key={scen.id}
                  onClick={() => setSelectedScenario(scen)}
                  className={`p-5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-900 border-sky-500/80 shadow-lg shadow-sky-950/30 ring-1 ring-sky-500/50'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-sky-400 font-bold">{scen.code}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase ${
                          scen.difficulty === 'Advanced'
                            ? 'bg-rose-950/80 border border-rose-500/40 text-rose-300'
                            : 'bg-amber-950/80 border border-amber-500/40 text-amber-300'
                        }`}
                      >
                        {scen.difficulty}
                      </span>
                    </div>

                    <h3 className="font-mono font-bold text-sm text-slate-100">{scen.name}</h3>

                    <p className="text-xs text-slate-400 font-sans line-clamp-3 leading-relaxed">
                      {scen.description}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {scen.duration_minutes} Minutes
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-slate-500" />
                        {scen.timed_events?.length || 0} Timed Events
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between mt-4">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      {isTemplate ? 'Built-in Template' : 'Custom Generated'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLaunch(scen.id);
                      }}
                      disabled={isCreating}
                      className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>INITIALIZE</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Scenario Detailed Inspection Column */}
        {selectedScenario && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
            <div className="border-b border-slate-800 pb-3">
              <span className="font-mono text-xs text-sky-400 font-bold uppercase">{selectedScenario.code}</span>
              <h2 className="text-base font-bold font-mono text-white mt-1">{selectedScenario.name}</h2>
              <p className="text-xs text-slate-400 font-sans mt-2 leading-relaxed">
                {selectedScenario.description}
              </p>
            </div>

            {/* Timed Events Schedule preview */}
            <div>
              <h4 className="font-mono text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                Degradation Sequence Timeline
              </h4>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {(selectedScenario.timed_events || []).map((evt, idx) => (
                  <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs font-mono">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-sky-400 font-bold">
                        T+{Math.floor(evt.scheduled_second / 60).toString().padStart(2, '0')}:
                        {(evt.scheduled_second % 60).toString().padStart(2, '0')}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-300">
                        {evt.event_type}
                      </span>
                    </div>
                    <div className="font-sans font-medium text-slate-200 mt-1">{evt.title}</div>
                    <div className="text-[11px] text-slate-400 font-sans mt-0.5 line-clamp-1">{evt.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Operational Objectives */}
            {selectedScenario.objectives && selectedScenario.objectives.length > 0 && (
              <div>
                <h4 className="font-mono text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Primary Objectives
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-300 font-sans">
                  {selectedScenario.objectives.map((obj, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-400 font-mono font-bold">›</span>
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Launch Action */}
            <div className="pt-3 border-t border-slate-800">
              <button
                onClick={() => handleLaunch(selectedScenario.id)}
                disabled={isCreating}
                className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 transition-colors uppercase shadow-lg shadow-sky-950"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>START EXERCISE FROM THIS SCENARIO</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
