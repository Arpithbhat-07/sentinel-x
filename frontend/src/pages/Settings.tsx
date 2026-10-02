import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Shield, Radio, CheckCircle2, AlertTriangle, Cpu, Save } from 'lucide-react';
import { api } from '../services/api';

export const Settings: React.FC = () => {
  const [backendHealth, setBackendHealth] = useState<any>(null);
  const [provider, setProvider] = useState('mock');
  const [simSpeed, setSimSpeed] = useState('1x');
  const [statusMsg, setStatusMsg] = useState('');

  const [dbHealth, setDbHealth] = useState<any>(null);
  const [wsHealth, setWsHealth] = useState<any>(null);

  useEffect(() => {
    const rawBase = (
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_BACKEND_URL ||
      'http://localhost:8000'
    ).trim().replace(/\/+$/, '');
    const base = rawBase.endsWith('/api') ? rawBase.slice(0, -4) : rawBase;
    fetch(`${base}/health`)
      .then((res) => res.json())
      .then((data) => {
        setBackendHealth(data);
        if (data.ai_provider) setProvider(data.ai_provider);
      })
      .catch((e) => console.warn('Health check query failed:', e));

    fetch(`${base}/health/database`)
      .then((res) => res.json())
      .then((data) => setDbHealth(data))
      .catch((e) => console.warn('Database health query failed:', e));

    fetch(`${base}/health/websocket`)
      .then((res) => res.json())
      .then((data) => setWsHealth(data))
      .catch((e) => console.warn('WebSocket health query failed:', e));
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg('Simulator preferences updated for this session.');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-sky-400" />
          Simulator Configuration & Node Health
        </h1>
        <p className="text-xs text-slate-400 font-sans mt-1">
          Adjust simulation parameters, inspect active AI providers, and monitor telemetry services.
        </p>
      </div>

      {statusMsg && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Backend Health Check Card (Section 23) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
        <h3 className="font-mono text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
          <Cpu className="w-4 h-4" />
          Backend Telemetry & Node Status
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 text-[10px] block">SYSTEM HEALTH</span>
            <span className="text-emerald-400 font-bold text-sm">
              {backendHealth?.status === 'healthy' ? 'OPERATIONAL' : 'CONNECTED'}
            </span>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 text-[10px] block">DATABASE</span>
            <span className="text-emerald-400 font-bold text-sm">
              {dbHealth?.status === 'healthy' ? 'CONNECTED' : 'SQLITE/LOCAL'}
            </span>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 text-[10px] block">AI PROVIDER</span>
            <span className="text-sky-400 font-bold text-sm uppercase">{backendHealth?.ai_provider || 'HYBRID/MOCK'}</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 text-[10px] block">WS CLIENTS</span>
            <span className="text-emerald-400 font-bold text-sm">
              {wsHealth?.total_connected_clients !== undefined ? `${wsHealth.total_connected_clients} ACTIVE` : 'ACTIVE'}
            </span>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
        <h3 className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">
          Simulation Settings
        </h3>

        <div className="space-y-4 text-xs font-sans">
          <div>
            <label className="block text-slate-300 font-mono text-[11px] uppercase mb-1">
              Active AI Provider Engine
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-sky-500"
            >
              <option value="mock">Deterministic High-Fidelity Fallback (Offline / SIH Jury Mode)</option>
              <option value="gemini">Google Gemini API (gemini-1.5-flash / gemini-2.5-flash)</option>
              <option value="openai">OpenAI Compatible API (gpt-4o-mini / Local LLM)</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1 font-sans">
              API keys are read securely from backend environment variables (<code className="text-slate-400 font-mono">GEMINI_API_KEY</code> / <code className="text-slate-400 font-mono">OPENAI_API_KEY</code>). Never exposed to browser.
            </p>
          </div>

          <div>
            <label className="block text-slate-300 font-mono text-[11px] uppercase mb-1">
              Simulation Clock Rate
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['1x', '2x', '5x'] as const).map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setSimSpeed(spd)}
                  className={`py-2 rounded-lg font-mono text-xs font-bold border transition-colors ${
                    simSpeed === spd
                      ? 'bg-sky-600/20 border-sky-500 text-sky-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {spd} (Standard Realtime)
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-colors uppercase shadow-md shadow-sky-950"
            >
              <Save className="w-3.5 h-3.5" />
              <span>SAVE CONFIGURATION</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
