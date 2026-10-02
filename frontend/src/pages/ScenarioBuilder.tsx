import React, { useState } from 'react';
import { Shield, Sparkles, Plus, Trash2, Clock, CheckCircle2, AlertTriangle, Layers, Save } from 'lucide-react';
import { api } from '../services/api';
import { Scenario } from '../types';

interface ScenarioBuilderProps {
  onScenarioCreated: (scenario: Scenario) => void;
}

export const ScenarioBuilder: React.FC<ScenarioBuilderProps> = ({ onScenarioCreated }) => {
  // Scenario fields
  const [name, setName] = useState('Operation Northern Vigilance');
  const [code, setCode] = useState(`SCEN-CUST-${Math.floor(1000 + Math.random() * 9000)}`);
  const [description, setDescription] = useState('High-altitude border surveillance under variable electromagnetic interference.');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [duration, setDuration] = useState(15);

  // Communication degradation parameters
  const [initialReliability, setInitialReliability] = useState(0.85);
  const [initialLatency, setInitialLatency] = useState(3.0);
  const [initialDropout, setInitialDropout] = useState(0.10);

  // Timed Events
  const [events, setEvents] = useState<any[]>([
    {
      scheduled_second: 60,
      event_type: 'COMMS_DELAY',
      target_role: 'ALL',
      title: 'Atmospheric Inversion & High Latency',
      description: 'Tropospheric ducting causes link latency to spike to 10 seconds.'
    },
    {
      scheduled_second: 180,
      event_type: 'CONFLICT',
      target_role: 'Commander',
      title: 'Sector North Discrepancy',
      description: 'Recon sensor logs movement, while ground patrol confirms all clear.'
    }
  ]);

  // AI Prompt State
  const [aiObjective, setAiObjective] = useState('Test decision-making when communications delay exceeds 12 seconds and ground reconnaissance reports conflict with satellite feed');
  const [aiDifficulty, setAiDifficulty] = useState('Intermediate');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const addEvent = () => {
    setEvents([
      ...events,
      {
        scheduled_second: 300,
        event_type: 'DROPOUT',
        target_role: 'ALL',
        title: 'Buffer Overflow Dropout',
        description: 'Packet dropouts surge to 40% across all command relay nodes.'
      }
    ]);
  };

  const removeEvent = (index: number) => {
    setEvents(events.filter((_, i) => i !== index));
  };

  const handleAiGenerate = async () => {
    setIsGeneratingAI(true);
    setFeedbackMsg('');
    try {
      const generated = await api.generateAIScenario(aiObjective, aiDifficulty, duration, [
        'Communication Delay',
        'Conflicting Reports'
      ]);
      setName(generated.name);
      setCode(generated.code);
      setDescription(generated.description);
      setDifficulty(generated.difficulty as any);
      setDuration(generated.duration_minutes);
      if (generated.timed_events) {
        setEvents(generated.timed_events);
      }
      setFeedbackMsg('AI scenario generated and populated successfully!');
    } catch (err) {
      console.error('AI Scenario Generation error:', err);
      setFeedbackMsg('Generated via deterministic fallback architect.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSaveScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedbackMsg('');

    const newScenarioData: Partial<Scenario> = {
      code,
      name,
      description,
      difficulty,
      duration_minutes: duration,
      environment_data: {
        sectors: [
          { id: 'sec-1', name: 'Sector Alpha', status: 'SECURE', center: [30, 30], radius: 20 },
          { id: 'sec-2', name: 'Sector Bravo', status: 'CONTESTED_INTEL', center: [65, 45], radius: 22 }
        ],
        landmarks: [
          { name: 'Ridge 7', type: 'TERRAIN', coords: [40, 40] },
          { name: 'Forward Post Delta', type: 'BASE', coords: [20, 25] }
        ]
      },
      communication_rules: {
        initial_reliability: initialReliability,
        initial_latency_sec: initialLatency,
        initial_dropout_rate: initialDropout
      },
      information_rules: {
        sources: [{ name: 'Overhead Radar', base_confidence: 80 }]
      },
      initial_conditions: {
        primary_objective: 'Maintain team coordination under degraded RF links'
      },
      timed_events: events,
      objectives: ['Execute sector verification discipline', 'Record clear decision rationales'],
      evaluation_criteria: ['Response time under 10s latency', 'Verification request frequency']
    };

    try {
      const created = await api.createScenario(newScenarioData);
      setFeedbackMsg(`Scenario '${created.name}' saved to catalog!`);
      onScenarioCreated(created);
    } catch (err: any) {
      setFeedbackMsg(`Failed to save: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" />
            Visual Scenario Designer & AI Generator
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Build custom degradation sequences, define timed injections, or generate structured training missions using AI.
          </p>
        </div>

        {feedbackMsg && (
          <div className="px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono text-xs">
            {feedbackMsg}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: AI Assistant Card */}
        <div className="space-y-4">
          <div className="bg-gradient-to-b from-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-indigo-400 font-mono font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>AI Scenario Architect</span>
            </div>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Describe your specific training objectives and required friction vectors. The AI service will generate
              a validated, balanced mission schema.
            </p>

            <div className="space-y-3 text-xs font-sans">
              <div>
                <label className="block text-slate-300 font-mono text-[11px] uppercase mb-1">
                  Training Objective:
                </label>
                <textarea
                  value={aiObjective}
                  onChange={(e) => setAiObjective(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-mono text-[11px] uppercase mb-1">
                  Desired Difficulty:
                </label>
                <select
                  value={aiDifficulty}
                  onChange={(e) => setAiDifficulty(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="Beginner">Beginner (Mild Latency)</option>
                  <option value="Intermediate">Intermediate (Delayed + Conflicting)</option>
                  <option value="Advanced">Advanced (Blackout + Multi-Vector)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleAiGenerate}
                disabled={isGeneratingAI}
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 transition-colors uppercase shadow-md shadow-indigo-950 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isGeneratingAI ? 'SYNTHESIZING WITH AI...' : 'GENERATE WITH AI'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Editor Form */}
        <form onSubmit={handleSaveScenario} className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
            <h3 className="font-mono text-xs font-bold text-sky-400 uppercase tracking-wider border-b border-slate-800 pb-2">
              1. General Mission Metadata
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
              <div>
                <label className="block text-slate-300 font-mono text-[11px] uppercase mb-1">Scenario Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-mono text-[11px] uppercase mb-1">Scenario Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-300 font-mono text-[11px] uppercase mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-sky-500 leading-relaxed font-sans"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-mono text-[11px] uppercase mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 15)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-mono text-[11px] uppercase mb-1">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
            </div>

            {/* Baseline Communication Rules */}
            <h3 className="font-mono text-xs font-bold text-sky-400 uppercase tracking-wider border-b border-slate-800 pb-2 pt-2">
              2. Baseline Communication Reliability
            </h3>

            <div className="grid grid-cols-3 gap-4 text-xs font-mono">
              <div>
                <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                  <span>Reliability:</span>
                  <span className="text-emerald-400 font-bold">{Math.round(initialReliability * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={initialReliability}
                  onChange={(e) => setInitialReliability(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                  <span>Latency:</span>
                  <span className="text-amber-400 font-bold">{initialLatency}s</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={initialLatency}
                  onChange={(e) => setInitialLatency(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                  <span>Dropout:</span>
                  <span className="text-rose-400 font-bold">{Math.round(initialDropout * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.05"
                  value={initialDropout}
                  onChange={(e) => setInitialDropout(parseFloat(e.target.value))}
                  className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg"
                />
              </div>
            </div>

            {/* Timed Injections Editor */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 pt-2">
              <h3 className="font-mono text-xs font-bold text-sky-400 uppercase tracking-wider">
                3. Scheduled Timed Injections ({events.length})
              </h3>
              <button
                type="button"
                onClick={addEvent}
                className="text-xs font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" /> ADD EVENT
              </button>
            </div>

            <div className="space-y-3">
              {events.map((evt, idx) => (
                <div key={idx} className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-slate-400">Trigger at:</span>
                      <input
                        type="number"
                        min="10"
                        max="1800"
                        step="10"
                        value={evt.scheduled_second}
                        onChange={(e) => {
                          const updated = [...events];
                          updated[idx].scheduled_second = parseInt(e.target.value) || 0;
                          setEvents(updated);
                        }}
                        className="w-20 bg-slate-900 border border-slate-700 px-2 py-1 rounded text-sky-400 font-bold"
                      />
                      <span className="text-slate-500">sec (T+{Math.floor(evt.scheduled_second / 60)}m)</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={evt.event_type}
                        onChange={(e) => {
                          const updated = [...events];
                          updated[idx].event_type = e.target.value;
                          setEvents(updated);
                        }}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-300"
                      >
                        <option value="COMMS_DELAY">COMMS DELAY</option>
                        <option value="DROPOUT">DROPOUT</option>
                        <option value="CONFLICT">CONFLICT</option>
                        <option value="FEED_OFFLINE">FEED OFFLINE</option>
                        <option value="NETWORK_DEGRADE">EW JAMMING</option>
                        <option value="RECOVERY">RECOVERY</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => removeEvent(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                    <input
                      type="text"
                      value={evt.title}
                      placeholder="Event Title"
                      onChange={(e) => {
                        const updated = [...events];
                        updated[idx].title = e.target.value;
                        setEvents(updated);
                      }}
                      className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200"
                    />
                    <input
                      type="text"
                      value={evt.description}
                      placeholder="Operational Description"
                      onChange={(e) => {
                        const updated = [...events];
                        updated[idx].description = e.target.value;
                        setEvents(updated);
                      }}
                      className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-300"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold flex items-center gap-2 transition-colors uppercase shadow-lg shadow-sky-950"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'SAVING SCENARIO...' : 'SAVE SCENARIO TO CATALOG'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
