import React, { useState, useEffect } from 'react';
import { Users, Play, Copy, Check, Radio, LogIn, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { Exercise, Participant, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from '../components/RoleBadge';

interface ExerciseLobbyProps {
  exerciseId?: string;
  onStartExercise: (exerciseId: string) => Promise<void>;
  onJoinSession: (exerciseId: string) => void;
  onNavigate: (tab: string, param?: string) => void;
}

export const ExerciseLobby: React.FC<ExerciseLobbyProps> = ({
  exerciseId,
  onStartExercise,
  onJoinSession,
  onNavigate
}) => {
  const { user, currentRole } = useAuth();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadExerciseDetails = async (idOrCode: string) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await api.getExercise(idOrCode);
      setExercise(data);
    } catch (e: any) {
      setErrorMessage(e.message || 'Exercise not found.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (exerciseId) {
      loadExerciseDetails(exerciseId);
      const poll = setInterval(() => loadExerciseDetails(exerciseId), 4000);
      return () => clearInterval(poll);
    }
  }, [exerciseId]);

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    await loadExerciseDetails(joinCodeInput.trim().toUpperCase());
  };

  const copyCode = () => {
    if (!exercise) return;
    navigator.clipboard.writeText(exercise.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleStart = async () => {
    if (!exercise) return;
    setIsStarting(true);
    try {
      await onStartExercise(exercise.id);
    } finally {
      setIsStarting(false);
    }
  };

  const standardRoles: { role: UserRole; title: string; desc: string }[] = [
    { role: 'Commander', title: 'Taskforce Commander', desc: 'Overall mission management, task allocation, final decisions & rationale.' },
    { role: 'Recon Officer', title: 'Reconnaissance Lead', desc: 'Surveillance telemetry, sensor confidence rating, anomaly reporting.' },
    { role: 'Field Unit', title: 'Ground Field Unit', desc: 'Direct observation, local sector status, ground verification checks.' },
    { role: 'Communications Officer', title: 'Signal & C2 Officer', desc: 'Monitors RF interference, jitter, relay switching, and link status.' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-400" />
            Exercise Deployment Lobby
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Synchronize trainees into operational roles before initiating degraded C2 scenario.
          </p>
        </div>
      </div>

      {/* Code Finder & Join Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
        <form onSubmit={handleJoinByCode} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value)}
              placeholder="ENTER ROOM CODE (e.g. SNTL-4821)..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-xs font-mono text-slate-100 uppercase tracking-widest placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !joinCodeInput.trim()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 transition-colors uppercase whitespace-nowrap"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>FIND & JOIN ROOM</span>
          </button>
        </form>
        {errorMessage && (
          <p className="text-xs text-rose-400 font-mono mt-2">{errorMessage}</p>
        )}
      </div>

      {/* Active Room Card */}
      {exercise ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl space-y-6">
          {/* Top Room Banner */}
          <div className="bg-slate-950 p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                ACTIVE EXERCISE ROOM
              </span>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-3xl font-black font-mono text-sky-400 tracking-wider">
                  {exercise.code}
                </span>
                <button
                  onClick={copyCode}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1 transition-colors border border-slate-700"
                  title="Copy room code"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'COPIED' : 'COPY'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-300 font-sans mt-2">
                Scenario: <span className="font-semibold text-white">{exercise.scenario?.name || 'Tactical Mission'}</span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <span
                className={`px-3 py-1 rounded-md text-xs font-mono uppercase font-bold ${
                  exercise.status === 'RUNNING'
                    ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-400'
                    : 'bg-amber-950/80 border border-amber-500/40 text-amber-400'
                }`}
              >
                STATUS: {exercise.status}
              </span>

              {currentRole === 'Instructor' ? (
                exercise.status === 'PENDING' ? (
                  <button
                    onClick={handleStart}
                    disabled={isStarting}
                    className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center gap-2 transition-colors uppercase shadow-lg shadow-emerald-950"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{isStarting ? 'INITIALIZING...' : 'START EXERCISE FOR ALL'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onNavigate('monitor', exercise.id)}
                    className="px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold flex items-center gap-2 transition-colors uppercase"
                  >
                    <span>ENTER LIVE MONITOR →</span>
                  </button>
                )
              ) : (
                <button
                  onClick={() => onNavigate('trainee_view', exercise.id)}
                  className="px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold flex items-center gap-2 transition-colors uppercase"
                >
                  <span>ENTER SITUATION ROOM →</span>
                </button>
              )}
            </div>
          </div>

          {/* Connected Participants Matrix */}
          <div className="px-6 pb-6 space-y-4">
            <h3 className="text-xs font-mono font-bold tracking-wider text-slate-300 uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Operational Trainee Roster
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {standardRoles.map((item) => {
                const assigned = exercise.participants?.find((p) => p.role === item.role);
                const isOnline = !!assigned;

                return (
                  <div
                    key={item.role}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <RoleBadge role={item.role} size="sm" />
                        <span className="text-xs font-mono font-bold text-slate-200">{item.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                        {item.desc}
                      </p>
                      <div className="text-[11px] font-mono text-slate-400 pt-1">
                        Operator: <span className="text-slate-200">{assigned?.display_name || 'Autonomous Agent'}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        {isOnline ? (assigned?.is_simulated ? 'SIMULATED' : 'ONLINE') : 'READY'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-10 text-center space-y-3">
          <Radio className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="font-mono text-sm font-bold text-slate-300 uppercase">No Room Selected</h3>
          <p className="text-xs text-slate-500 font-sans max-w-sm mx-auto">
            Enter a room code above or launch the default demonstration exercise to initialize the operational environment.
          </p>
        </div>
      )}
    </div>
  );
};
