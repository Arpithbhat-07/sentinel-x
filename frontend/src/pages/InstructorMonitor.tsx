import React, { useState, useEffect } from 'react';
import {
  Activity,
  Play,
  Pause,
  Square,
  Zap,
  Radio,
  Clock,
  Shield,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  EyeOff,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { ExerciseWebSocket } from '../services/websocket';
import { Exercise, Decision, CommunicationMessage, UserRole } from '../types';
import { TacticalMap } from '../components/TacticalMap';
import { DegradedMessageFeed } from '../components/DegradedMessageFeed';
import { EventInjectionModal } from '../components/EventInjectionModal';
import { RoleBadge } from '../components/RoleBadge';
import { DegradationStatusBanner } from '../components/DegradationStatusBanner';
import { InformationAsymmetryCard } from '../components/InformationAsymmetryCard';

interface InstructorMonitorProps {
  exerciseId: string;
  onEndExercise: (exerciseId: string) => Promise<void>;
  onNavigate: (tab: string, param?: string) => void;
}

export const InstructorMonitor: React.FC<InstructorMonitorProps> = ({
  exerciseId,
  onEndExercise,
  onNavigate
}) => {
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [messages, setMessages] = useState<CommunicationMessage[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isInjectionOpen, setIsInjectionOpen] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  // Live telemetry state from WebSockets
  const [elapsedSec, setElapsedSec] = useState(0);
  const [commsReliability, setCommsReliability] = useState(1.0);
  const [messageDelaySec, setMessageDelaySec] = useState(0.0);
  const [dropoutRate, setDropoutRate] = useState(0.0);
  const [activeDisruptions, setActiveDisruptions] = useState<string[]>([]);
  const [onlineParticipants, setOnlineParticipants] = useState<any[]>([]);
  const [wsClient, setWsClient] = useState<ExerciseWebSocket | null>(null);

  const fetchFullState = async () => {
    try {
      const [ex, decList, msgList, logList] = await Promise.all([
        api.getExercise(exerciseId),
        api.getDecisions(exerciseId).catch(() => []),
        api.getMessages(exerciseId).catch(() => []),
        api.getExerciseLogs(exerciseId).catch(() => [])
      ]);
      setExercise(ex);
      setDecisions(decList);
      setMessages(msgList);
      setLogs(logList);
      setElapsedSec(ex.elapsed_seconds);
      setCommsReliability(ex.comms_reliability);
      setMessageDelaySec(ex.message_delay_sec);
      setDropoutRate(ex.dropout_rate);
      setActiveDisruptions(ex.active_disruptions || []);
    } catch (e) {
      console.error('Failed to fetch exercise full state:', e);
    }
  };

  useEffect(() => {
    fetchFullState();

    // Initialize real-time WebSocket connection with unique client ID
    const ws = new ExerciseWebSocket(exerciseId, 'Instructor', 'instructor-inst', 'Instructor Saxena');
    ws.connect();

    ws.on('STATE_SNAPSHOT', (data) => {
      if (data.exercise) {
        setExercise((prev) => ({ ...(prev || {}), ...data.exercise }));
        setElapsedSec(data.exercise.elapsed_seconds || 0);
        setCommsReliability(data.exercise.comms_reliability ?? 1.0);
        setMessageDelaySec(data.exercise.message_delay_sec ?? 0.0);
        setDropoutRate(data.exercise.dropout_rate ?? 0.0);
        setActiveDisruptions(data.exercise.active_disruptions || []);
      }
      if (data.online_participants) {
        setOnlineParticipants(data.online_participants);
      }
      if (data.recent_messages && data.recent_messages.length > 0) {
        setMessages(data.recent_messages);
      }
      if (data.decisions && data.decisions.length > 0) {
        setDecisions(data.decisions);
      }
    });

    ws.on('PARTICIPANT_JOINED', (data) => {
      if (data.online_participants) {
        setOnlineParticipants(data.online_participants);
      }
      setLogs((prev) => [
        {
          id: Math.random().toString(),
          actor_role: data.participant?.role || 'SYSTEM',
          event_type: 'PARTICIPANT_JOINED',
          message: `${data.participant?.display_name || 'Participant'} (${data.participant?.role}) connected`,
          created_at: new Date().toISOString()
        },
        ...prev
      ]);
    });

    ws.on('PARTICIPANT_LEFT', (data) => {
      if (data.online_participants) {
        setOnlineParticipants(data.online_participants);
      }
      setLogs((prev) => [
        {
          id: Math.random().toString(),
          actor_role: data.participant?.role || 'SYSTEM',
          event_type: 'PARTICIPANT_LEFT',
          message: `${data.participant?.display_name || 'Participant'} (${data.participant?.role}) disconnected`,
          created_at: new Date().toISOString()
        },
        ...prev
      ]);
    });

    ws.on('TICK', (data) => {
      setElapsedSec(data.elapsed_seconds);
      setCommsReliability(data.comms_reliability);
      setMessageDelaySec(data.message_delay_sec);
      setDropoutRate(data.dropout_rate);
      setActiveDisruptions(data.active_disruptions || []);
    });

    ws.on('DECISION_LOGGED', (data) => {
      setDecisions((prev) => [
        ...prev,
        {
          id: data.id,
          exercise_id: exerciseId,
          participant_role: data.participant_role,
          decision_type: data.decision_type,
          action_target: data.action_target,
          rationale: data.rationale,
          confidence_score: data.confidence_score,
          response_time_seconds: data.response_time_seconds || 0,
          created_at: data.created_at
        }
      ]);
      setLogs((prev) => [
        {
          id: Math.random().toString(),
          actor_role: data.participant_role,
          event_type: 'DECISION_LOGGED',
          message: `Decision logged: ${data.decision_type} on ${data.action_target} (${data.confidence_score}% conf)`,
          created_at: new Date().toISOString()
        },
        ...prev
      ]);
    });

    ws.on('MESSAGE_RECEIVED', (data) => {
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === data.id);
        if (exists) {
          return prev.map((m) => (m.id === data.id ? { ...m, ...data } : m));
        }
        return [
          ...prev,
          {
            id: data.id,
            exercise_id: exerciseId,
            sender_name: data.sender_name,
            sender_role: data.sender_role,
            recipient_role: data.recipient_role,
            original_content: data.content,
            delivered_content: data.content,
            status: data.status,
            delay_seconds: data.delay_seconds,
            sent_at: data.sent_at
          }
        ];
      });
    });

    ws.on('MESSAGE_DELAYED', (data) => {
      setLogs((prev) => [
        {
          id: Math.random().toString(),
          actor_role: 'SYSTEM',
          event_type: 'MESSAGE_DELAYED',
          message: `[DELAY QUEUE: ${data.delay_seconds}s] ${data.sender_role} -> ${data.recipient_role}: ETA ${data.eta_seconds}s`,
          created_at: new Date().toISOString()
        },
        ...prev
      ]);
    });

    ws.on('MESSAGE_DROPPED', (data) => {
      setLogs((prev) => [
        {
          id: Math.random().toString(),
          actor_role: 'SYSTEM',
          event_type: 'MESSAGE_DROPPED',
          message: `[TRANSMISSION DROPPED] ${data.sender_role} -> ${data.recipient_role}: "${(data.original_content || '').substring(0, 35)}..." lost to jamming`,
          created_at: new Date().toISOString()
        },
        ...prev
      ]);
    });

    ws.on('MESSAGE_DELIVERED', (data) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === data.id ? { ...m, status: 'DELIVERED', delivered_content: data.content } : m))
      );
    });

    ws.on('DISRUPTION_TRIGGERED', (data) => {
      setCommsReliability(data.comms_reliability);
      setMessageDelaySec(data.message_delay_sec);
      setDropoutRate(data.dropout_rate);
      setActiveDisruptions(data.active_disruptions || []);
      setLogs((prev) => [
        {
          id: Math.random().toString(),
          actor_role: 'INSTRUCTOR',
          event_type: `DISRUPTION_${data.event_type}`,
          message: `${data.title}: ${data.description}`,
          created_at: new Date().toISOString()
        },
        ...prev
      ]);
    });

    ws.on('EXERCISE_STATUS_CHANGED', (data) => {
      setExercise((prev) => (prev ? { ...prev, status: data.status } : prev));
    });

    setWsClient(ws);

    return () => {
      ws.disconnect();
    };
  }, [exerciseId]);

  const handlePauseResume = async () => {
    if (!exercise) return;
    if (exercise.status === 'RUNNING') {
      await api.pauseExercise(exercise.id);
      setExercise({ ...exercise, status: 'PAUSED' });
    } else {
      await api.resumeExercise(exercise.id);
      setExercise({ ...exercise, status: 'RUNNING' });
    }
  };

  const handleEnd = async () => {
    if (!exercise) return;
    setIsEnding(true);
    try {
      await onEndExercise(exercise.id);
      onNavigate('aar', exercise.id);
    } finally {
      setIsEnding(false);
    }
  };

  const handleInjectEvent = async (eventData: any) => {
    if (!exercise) return;
    await api.injectEvent(exercise.id, eventData);
    await fetchFullState();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Instructor Command Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-bold text-white tracking-wider">
              {exercise?.code || 'SNTL-EXERCISE'}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider ${
                exercise?.status === 'RUNNING'
                  ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-400'
                  : 'bg-amber-950 border border-amber-500/40 text-amber-400'
              }`}
            >
              {exercise?.status}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-sans">
            Scenario: <span className="text-slate-200 font-medium">{exercise?.scenario?.name || 'Operation Sentinel'}</span>
          </p>
        </div>

        {/* Real-time Clock & Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-lg flex items-center gap-2.5 font-mono">
            <Clock className="w-4 h-4 text-sky-400" />
            <span className="text-xl font-bold text-white tracking-widest">{formatTime(elapsedSec)}</span>
            <span className="text-[10px] text-slate-500 uppercase">ELAPSED</span>
          </div>

          <button
            onClick={handlePauseResume}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            {exercise?.status === 'RUNNING' ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>RESUME</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsInjectionOpen(true)}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-mono text-xs font-bold flex items-center gap-1.5 transition-colors uppercase shadow-md shadow-amber-950/30"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>INJECT DISRUPTION</span>
          </button>

          <button
            onClick={handleEnd}
            disabled={isEnding}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-colors uppercase shadow-md shadow-rose-950"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>{isEnding ? 'CLOSING...' : 'END & GENERATE AAR'}</span>
          </button>
        </div>
      </div>

      {/* Real-Time Multiplayer Presence Strip (Section 23) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold uppercase text-slate-400">
            Multi-Client Session Presence:
          </span>
          <span className="text-[11px] font-mono text-sky-400">
            ({onlineParticipants.length} Connected)
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {['Commander', 'Recon Officer', 'Field Unit', 'Communications Officer'].map((roleName) => {
            const isOnline = onlineParticipants.some((p: any) =>
              (p.role || '').toUpperCase().replace(/\s+/g, '_') === roleName.toUpperCase().replace(/\s+/g, '_')
            );
            return (
              <div
                key={roleName}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs transition-all ${
                  isOnline
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-950/50'
                    : 'bg-slate-950 border-slate-800/80 text-slate-500'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                  }`}
                />
                <span className="font-medium">{roleName}</span>
                <span className={`text-[10px] font-bold ${isOnline ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {isOnline ? '● ONLINE' : '○ OFFLINE'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 6: High-Impact Visual Degradation Status Banner */}
      <DegradationStatusBanner
        reliability={commsReliability}
        latencySec={messageDelaySec}
        dropoutRate={dropoutRate}
        activeDisruptions={activeDisruptions}
      />

      {/* Section 7: Information Asymmetry Comparison Matrix for Instructor Audit */}
      <InformationAsymmetryCard
        currentRole="Instructor"
        isInstructorView={true}
      />

      {/* Degradation Readout Telemetry Row (Section 44 UX Requirement) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Reliability Meter */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 uppercase">Comms Reliability</span>
            <span
              className={`font-bold ${
                commsReliability < 0.4 ? 'text-rose-400' : commsReliability < 0.7 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {Math.round(commsReliability * 100)}%
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ${
                commsReliability < 0.4 ? 'bg-rose-500' : commsReliability < 0.7 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.round(commsReliability * 100)}%` }}
            />
          </div>
          <p className="text-[11px] font-mono text-slate-500">
            {commsReliability < 0.5 ? '⚠ HIGH INTERFERENCE / BLACKOUT RISK' : 'NOMINAL CARRIER CHANNEL'}
          </p>
        </div>

        {/* Message Latency */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 uppercase">Induced Delay / Jitter</span>
            <span className="text-amber-400 font-bold">+{messageDelaySec}s</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-700"
              style={{ width: `${Math.min(100, (messageDelaySec / 20) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] font-mono text-slate-500">Buffer queue propagation latency</p>
        </div>

        {/* Dropout Probability */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 uppercase">Packet Dropout Rate</span>
            <span className="text-rose-400 font-bold">{Math.round(dropoutRate * 100)}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-500 transition-all duration-700"
              style={{ width: `${Math.round(dropoutRate * 100)}%` }}
            />
          </div>
          <p className="text-[11px] font-mono text-slate-500">Probability of dropped message transmissions</p>
        </div>
      </div>

      {/* Active Disruptions Badges */}
      {activeDisruptions.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-rose-950/20 border border-rose-900/50 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span className="text-xs font-mono text-slate-400 uppercase">ACTIVE DISRUPTIONS:</span>
          <div className="flex flex-wrap gap-1.5">
            {activeDisruptions.map((dis, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded text-[11px] font-mono bg-rose-950/80 border border-rose-500/40 text-rose-300 font-semibold uppercase"
              >
                {dis}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Dual Tactical Workspace: Tactical Map on Left, Real-Time Decisions & Comms on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tactical Map (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <TacticalMap
            currentRole="Instructor"
            commsReliability={commsReliability}
            activeDisruptions={activeDisruptions}
          />

          {/* Quick Disruption Buttons Row */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block">
              Quick Disruption Injections:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <button
                onClick={() =>
                  handleInjectEvent({
                    event_type: 'COMMS_DELAY',
                    target_role: 'ALL',
                    title: 'Directional Attenuation',
                    description: 'Link delay increased to 12 seconds.',
                    delay_seconds: 12.0,
                    reliability_impact: 0.45
                  })
                }
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-300 text-left transition-colors"
              >
                <div className="text-amber-400 font-bold">+12s LATENCY</div>
                <div className="text-[10px] text-slate-500">Buffer saturation</div>
              </button>

              <button
                onClick={() =>
                  handleInjectEvent({
                    event_type: 'DROPOUT',
                    target_role: 'ALL',
                    title: 'Heavy Electronic Interference',
                    description: 'Packet dropouts surge to 60%.',
                    dropout_probability: 0.60,
                    reliability_impact: 0.60
                  })
                }
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-rose-500/50 text-slate-300 text-left transition-colors"
              >
                <div className="text-rose-400 font-bold">60% DROPOUT</div>
                <div className="text-[10px] text-slate-500">Packet dropouts</div>
              </button>

              <button
                onClick={() =>
                  handleInjectEvent({
                    event_type: 'CONFLICT',
                    target_role: 'Commander',
                    title: 'Conflicting Sector Telemetry',
                    description: 'Injected contradictory ground vs recon reports for Sector Bravo.',
                    sector: 'Sector Bravo'
                  })
                }
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-sky-500/50 text-slate-300 text-left transition-colors"
              >
                <div className="text-sky-400 font-bold">INTEL CONFLICT</div>
                <div className="text-[10px] text-slate-500">Sector Bravo</div>
              </button>

              <button
                onClick={() =>
                  handleInjectEvent({
                    event_type: 'RECOVERY',
                    target_role: 'ALL',
                    title: 'Secondary Link Restored',
                    description: 'Relay online. Reliability returned to nominal 90% state.'
                  })
                }
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-slate-300 text-left transition-colors"
              >
                <div className="text-emerald-400 font-bold">RESTORE LINK</div>
                <div className="text-[10px] text-slate-500">Baseline recovery</div>
              </button>
            </div>
          </div>

          {/* Section 32: Authoritative Live Event Stream */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                  Authoritative Live Event Stream
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold">● REAL-TIME SYNC</span>
            </div>
            <div className="h-44 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
              {logs.length === 0 ? (
                <div className="text-slate-500 py-6 text-center text-xs">Awaiting simulation events...</div>
              ) : (
                logs.slice(0, 40).map((log, idx) => (
                  <div
                    key={log.id || idx}
                    className="p-2 rounded bg-slate-950/80 border border-slate-800/80 flex items-start gap-2"
                  >
                    <span className="text-slate-500 whitespace-nowrap text-[10px]">
                      {log.created_at ? new Date(log.created_at).toLocaleTimeString() : '--:--:--'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-sky-400 border border-slate-700 whitespace-nowrap">
                      {log.actor_role}
                    </span>
                    <span className="text-slate-300 text-xs font-sans flex-1 leading-tight">
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Decisions Stream & C2 Feed (5 cols) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col h-full">
          {/* Decisions Timeline (Section 17) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex-1 flex flex-col max-h-[340px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Live Trainee Decisions ({decisions.length})
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500">WITH RATIONALE & CONFIDENCE</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pt-3 pr-1">
              {decisions.length === 0 ? (
                <div className="text-center py-8 text-xs font-mono text-slate-500">
                  Awaiting trainee command decisions...
                </div>
              ) : (
                decisions.map((dec) => (
                  <div
                    key={dec.id}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-sans space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RoleBadge role={dec.participant_role} size="sm" />
                        <span className="font-mono font-bold text-sky-400 uppercase">{dec.decision_type}</span>
                      </div>
                      <span className="font-mono text-[11px] text-emerald-400 font-semibold">
                        {dec.confidence_score}% conf
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400">
                      Target: <span className="text-slate-200 font-medium">{dec.action_target}</span>
                    </div>

                    <p className="text-xs text-slate-300 font-sans italic bg-slate-900/60 p-2 rounded border border-slate-800/80 leading-relaxed">
                      "{dec.rationale}"
                    </p>

                    <div className="text-[10px] font-mono text-slate-500 flex justify-end">
                      Logged at {new Date(dec.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Degraded C2 Communication Channel */}
          <div className="h-[360px]">
            <DegradedMessageFeed
              messages={messages}
              currentRole="Instructor"
              currentDisplayName="Instructor Saxena"
              onSendMessage={async (rec, content) => {
                await api.sendMessage(exerciseId, rec, content, 'Instructor', 'Instructor Saxena');
              }}
              commsReliability={commsReliability}
              messageDelaySec={messageDelaySec}
            />
          </div>
        </div>
      </div>

      {/* Mid-Exercise Event Injection Modal */}
      <EventInjectionModal
        isOpen={isInjectionOpen}
        onClose={() => setIsInjectionOpen(false)}
        onInject={handleInjectEvent}
      />
    </div>
  );
};
