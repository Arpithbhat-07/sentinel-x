import React, { useState, useEffect } from 'react';
import {
  Shield,
  Activity,
  Radio,
  Clock,
  Eye,
  AlertTriangle,
  CheckCircle,
  FileCheck,
  Send,
  PlusCircle,
  HelpCircle,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { ExerciseWebSocket } from '../services/websocket';
import { Exercise, Decision, CommunicationMessage, InformationReport, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { TacticalMap } from '../components/TacticalMap';
import { DegradedMessageFeed } from '../components/DegradedMessageFeed';
import { DecisionModal } from '../components/DecisionModal';
import { RoleBadge } from '../components/RoleBadge';
import { DegradationStatusBanner } from '../components/DegradationStatusBanner';
import { InformationAsymmetryCard } from '../components/InformationAsymmetryCard';

interface TraineeViewProps {
  exerciseId: string;
  onNavigate: (tab: string, param?: string) => void;
}

export const TraineeView: React.FC<TraineeViewProps> = ({ exerciseId, onNavigate }) => {
  const { user, currentRole } = useAuth();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [messages, setMessages] = useState<CommunicationMessage[]>([]);
  const [reports, setReports] = useState<InformationReport[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  
  // Real-time telemetry
  const [elapsedSec, setElapsedSec] = useState(0);
  const [commsReliability, setCommsReliability] = useState(1.0);
  const [messageDelaySec, setMessageDelaySec] = useState(0.0);
  const [dropoutRate, setDropoutRate] = useState(0.0);
  const [activeDisruptions, setActiveDisruptions] = useState<string[]>([]);
  const [onlineParticipants, setOnlineParticipants] = useState<any[]>([]);
  const [transmissionAlert, setTransmissionAlert] = useState<{ type: 'DELAY' | 'DROP'; text: string } | null>(null);
  const [wsClient, setWsClient] = useState<ExerciseWebSocket | null>(null);

  // Modals
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // New report form state
  const [reportTitle, setReportTitle] = useState('');
  const [reportObservation, setReportObservation] = useState('');
  const [reportSector, setReportSector] = useState('Sector Bravo');
  const [reportConfidence, setReportConfidence] = useState(75);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const fetchTraineeState = async () => {
    try {
      const [ex, msgList, repList, decList] = await Promise.all([
        api.getExercise(exerciseId),
        api.getMessages(exerciseId, currentRole).catch(() => []),
        api.getReports(exerciseId, currentRole).catch(() => []),
        api.getDecisions(exerciseId).catch(() => [])
      ]);
      setExercise(ex);
      setMessages(msgList);
      setReports(repList);
      setDecisions(decList);
      setElapsedSec(ex.elapsed_seconds);
      setCommsReliability(ex.comms_reliability);
      setMessageDelaySec(ex.message_delay_sec);
      setDropoutRate(ex.dropout_rate);
      setActiveDisruptions(ex.active_disruptions || []);
    } catch (e) {
      console.error('Failed to load trainee situation:', e);
    }
  };

  useEffect(() => {
    fetchTraineeState();

    const ws = new ExerciseWebSocket(
      exerciseId,
      currentRole,
      user?.id || 'trainee-id',
      user?.full_name || `${currentRole} Operator`
    );
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
      if (data.recent_reports && data.recent_reports.length > 0) {
        setReports(data.recent_reports);
      }
      if (data.decisions && data.decisions.length > 0) {
        setDecisions(data.decisions);
      }
    });

    ws.on('PARTICIPANT_JOINED', (data) => {
      if (data.online_participants) {
        setOnlineParticipants(data.online_participants);
      }
    });

    ws.on('PARTICIPANT_LEFT', (data) => {
      if (data.online_participants) {
        setOnlineParticipants(data.online_participants);
      }
    });

    ws.on('TICK', (data) => {
      setElapsedSec(data.elapsed_seconds);
      setCommsReliability(data.comms_reliability);
      setMessageDelaySec(data.message_delay_sec);
      setDropoutRate(data.dropout_rate);
      setActiveDisruptions(data.active_disruptions || []);
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
      if (data.sender_role === currentRole) {
        setTransmissionAlert({
          type: 'DELAY',
          text: `TRANSMISSION BUFFERED: In transit with simulated ${data.delay_seconds}s delay (ETA: ${data.eta_seconds}s)`
        });
        setTimeout(() => setTransmissionAlert(null), 6000);
      }
    });

    ws.on('MESSAGE_DROPPED', (data) => {
      if (data.sender_role === currentRole) {
        setTransmissionAlert({
          type: 'DROP',
          text: `TRANSMISSION FAILED: Electronic warfare interference caused packet dropout`
        });
        setTimeout(() => setTransmissionAlert(null), 6000);
      }
    });

    ws.on('MESSAGE_DELIVERED', (data) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === data.id ? { ...m, status: 'DELIVERED', delivered_content: data.content } : m))
      );
    });

    ws.on('REPORT_RECEIVED', (data) => {
      setReports((prev) => [
        ...prev,
        {
          id: data.id,
          exercise_id: exerciseId,
          source_name: data.source_name,
          visible_to_role: 'ALL',
          title: data.title,
          observation: data.observation,
          sector: data.sector,
          confidence_level: data.confidence_level,
          freshness_seconds: 0,
          verification_status: data.verification_status,
          coordinate_x: data.coordinate_x || 50.0,
          coordinate_y: data.coordinate_y || 50.0,
          timestamp: data.timestamp
        }
      ]);
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
          response_time_seconds: 0,
          created_at: data.created_at
        }
      ]);
    });

    ws.on('DISRUPTION_TRIGGERED', (data) => {
      setCommsReliability(data.comms_reliability);
      setMessageDelaySec(data.message_delay_sec);
      setDropoutRate(data.dropout_rate);
      setActiveDisruptions(data.active_disruptions || []);
    });

    ws.on('EXERCISE_STATUS_CHANGED', (data) => {
      setExercise((prev) => (prev ? { ...prev, status: data.status } : prev));
    });

    setWsClient(ws);

    return () => {
      ws.disconnect();
    };
  }, [exerciseId, currentRole]);

  const handleDecisionSubmit = async (decData: any) => {
    await api.submitDecision(exerciseId, decData, currentRole);
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTitle.trim() || !reportObservation.trim()) return;

    setIsSubmittingReport(true);
    try {
      await api.createReport(
        exerciseId,
        {
          source_name: `${currentRole} Sweep`,
          visible_to_role: 'ALL',
          title: reportTitle.trim(),
          observation: reportObservation.trim(),
          sector: reportSector,
          confidence_level: reportConfidence,
          verification_status: reportConfidence > 85 ? 'VERIFIED' : 'UNCONFIRMED'
        },
        currentRole
      );
      setReportTitle('');
      setReportObservation('');
      setIsReportModalOpen(false);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-5">
      {/* Top Situation Room Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <Radio className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-white tracking-wide">
                {exercise?.scenario?.name || 'Tactical Situation'}
              </span>
              <RoleBadge role={currentRole} size="sm" />
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Room: <span className="font-mono text-sky-300 font-semibold">{exercise?.code}</span> | Role perspective filtering active
            </p>
          </div>
        </div>

        {/* Live Status and Trainee Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-950 border border-slate-800 px-3.5 py-1.5 rounded-lg flex items-center gap-2 font-mono text-xs">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-bold text-white text-sm tracking-wider">{formatTimer(elapsedSec)}</span>
          </div>

          {(currentRole === 'Recon Officer' || currentRole === 'Field Unit') && (
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>SUBMIT INTEL REPORT</span>
            </button>
          )}

          <button
            onClick={() => setIsDecisionModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-colors uppercase shadow-lg shadow-sky-950 tracking-wider"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>MAKE COMMAND DECISION</span>
          </button>
        </div>
      </div>

      {/* Real-time Transmission Failure / Delay Alert Banner */}
      {transmissionAlert && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs font-mono animate-in fade-in duration-200 ${
            transmissionAlert.type === 'DROP'
              ? 'bg-rose-950/90 border-rose-500/70 text-rose-200 shadow-lg shadow-rose-950/50'
              : 'bg-amber-950/90 border-amber-500/70 text-amber-200 shadow-lg shadow-amber-950/50'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{transmissionAlert.text}</span>
          </div>
          <button
            onClick={() => setTransmissionAlert(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded bg-slate-900 border border-slate-700"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Real-Time Multiplayer Presence Strip (Section 23) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold uppercase text-slate-400">
            Multi-Domain Team Presence:
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
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono text-[11px] transition-all ${
                  isOnline
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-950 border-slate-800/80 text-slate-500'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                  }`}
                />
                <span className="font-medium">{roleName}</span>
                <span className={`text-[9px] font-bold ${isOnline ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {isOnline ? '●' : '○'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 6: Visually Obvious Communication Degradation Status Banner */}
      <DegradationStatusBanner
        reliability={commsReliability}
        latencySec={messageDelaySec}
        dropoutRate={dropoutRate}
        activeDisruptions={activeDisruptions}
      />

      {/* Section 7: Information Asymmetry Trainee Perspective Card */}
      <InformationAsymmetryCard
        currentRole={currentRole}
        isInstructorView={false}
        reports={reports}
      />

      {/* Trainee Workspace Layout: Left Map & Reports, Right Comms & Decisions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (7 cols): Tactical Map & Intelligence Reports */}
        <div className="lg:col-span-7 space-y-4">
          <TacticalMap
            currentRole={currentRole}
            commsReliability={commsReliability}
            activeDisruptions={activeDisruptions}
            reports={reports}
          />

          {/* Section 15: Intelligence Reports Feed with Confidence & Verification Status */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-sky-400" />
                <h3 className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Operational Intelligence Feed ({reports.length})
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500">INFORMATION ASYMMETRY ACTIVE</span>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {reports.length === 0 ? (
                <div className="text-center py-6 text-xs font-mono text-slate-500">
                  No intelligence reports received yet for your sector.
                </div>
              ) : (
                reports.map((rep) => {
                  const isConflicting = rep.verification_status === 'CONFLICTING';
                  return (
                    <div
                      key={rep.id}
                      className={`p-3 rounded-lg border text-xs font-sans space-y-1.5 transition-all ${
                        isConflicting
                          ? 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-100">{rep.title}</span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                              isConflicting
                                ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                                : 'bg-slate-800 text-sky-300 border border-sky-500/30'
                            }`}
                          >
                            {rep.verification_status}
                          </span>
                          <span className="text-xs font-mono font-bold text-amber-400">
                            {rep.confidence_level}% conf
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed font-sans">{rep.observation}</p>

                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-900">
                        <span>Source: <strong className="text-slate-400">{rep.source_name}</strong></span>
                        <span>Sector: <strong className="text-slate-400">{rep.sector}</strong></span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Live C2 Channel & Decision Stream */}
        <div className="lg:col-span-5 space-y-4 flex flex-col h-full">
          {/* Degraded C2 Feed */}
          <div className="h-[380px]">
            <DegradedMessageFeed
              messages={messages}
              currentRole={currentRole}
              currentDisplayName={user?.full_name || `${currentRole} Operator`}
              onSendMessage={async (rec, content) => {
                await api.sendMessage(
                  exerciseId,
                  rec,
                  content,
                  currentRole,
                  user?.full_name || `${currentRole} Operator`
                );
              }}
              commsReliability={commsReliability}
              messageDelaySec={messageDelaySec}
            />
          </div>

          {/* Logged Decisions Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex-1 flex flex-col max-h-[300px]">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Team Decisions Log ({decisions.length})
                </h3>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pt-3 pr-1 text-xs">
              {decisions.length === 0 ? (
                <div className="text-center py-6 text-xs font-mono text-slate-500">
                  No command decisions logged yet.
                </div>
              ) : (
                decisions.map((dec) => (
                  <div key={dec.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-sans space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <RoleBadge role={dec.participant_role} size="sm" />
                        <span className="font-mono font-bold text-sky-400">{dec.decision_type}</span>
                      </div>
                      <span className="font-mono text-[11px] text-emerald-400 font-semibold">{dec.confidence_score}%</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">Target: {dec.action_target}</div>
                    <p className="text-[11px] text-slate-400 italic">"{dec.rationale}"</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mandatory Decision Rationale Modal */}
      <DecisionModal
        isOpen={isDecisionModalOpen}
        onClose={() => setIsDecisionModalOpen(false)}
        onSubmit={handleDecisionSubmit}
        role={currentRole}
      />

      {/* Intel Report Submission Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-5 py-4 bg-slate-950 border-b border-slate-800">
              <h3 className="text-sm font-bold font-mono text-slate-100 uppercase">
                Submit Tactical Report ({currentRole})
              </h3>
              <button onClick={() => setIsReportModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="p-5 space-y-3 text-xs font-sans">
              <div>
                <label className="block text-slate-300 font-mono text-[11px] uppercase mb-1">Observation Title</label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="e.g. Ground Observation: Sector Bravo Defile"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-mono text-[11px] uppercase mb-1">Target Sector</label>
                <select
                  value={reportSector}
                  onChange={(e) => setReportSector(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                >
                  <option value="Sector Bravo">Sector Bravo</option>
                  <option value="Sector Alpha">Sector Alpha</option>
                  <option value="Sector Charlie">Sector Charlie</option>
                  <option value="Sector Delta">Sector Delta</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-mono text-[11px] uppercase mb-1">Observation Details</label>
                <textarea
                  value={reportObservation}
                  onChange={(e) => setReportObservation(e.target.value)}
                  placeholder="Detail visible signatures, lack of activity, or electronic readings..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 leading-relaxed"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between font-mono text-[11px] text-slate-300 mb-1">
                  <span>Confidence Level:</span>
                  <span className="text-amber-400 font-bold">{reportConfidence}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={reportConfidence}
                  onChange={(e) => setReportConfidence(parseInt(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-mono text-xs"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold uppercase"
                >
                  SUBMIT REPORT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
