import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  Download,
  Share2,
  Clock,
  Shield,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Printer,
  ChevronRight,
  Layers,
  Database
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { api } from '../services/api';
import { AARReport } from '../types';
import { RoleBadge } from '../components/RoleBadge';

interface AARReportViewProps {
  exerciseId: string;
  onNavigate?: (tab: string, param?: string) => void;
}

export const AARReportView: React.FC<AARReportViewProps> = ({ exerciseId }) => {
  const [aar, setAar] = useState<AARReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);

  const loadAAR = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAAR(exerciseId);
      setAar(data);
      if (data.ai_analysis) {
        setAiAnalysis(data.ai_analysis);
      }
    } catch (e) {
      console.error('Failed to load AAR:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAAR();
  }, [exerciseId]);

  const handleTriggerAI = async () => {
    setIsGeneratingAI(true);
    try {
      const res = await api.analyzeAARWithAI(exerciseId);
      setAiAnalysis(res);
    } catch (e) {
      console.error('Failed to run AI AAR analysis:', e);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    try {
      await api.downloadAARPDF(exerciseId);
    } catch (err) {
      console.warn('PDF download endpoint failed or unavailable, falling back to print dialog:', err);
      window.print();
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportData = () => {
    if (!aar) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(aar, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `sentinel_x_aar_${aar.exercise_id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Historical resilience progression
  const resilienceChartData = [
    { time: '00:00', reliability: 100, latency: 1, dropout: 0 },
    { time: '01:00', reliability: 95, latency: 2, dropout: 5 },
    { time: '01:45', reliability: 60, latency: 12, dropout: 25 },
    { time: '02:30', reliability: 45, latency: 15, dropout: 40 },
    { time: '03:15', reliability: 15, latency: 25, dropout: 85 },
    { time: '03:45', reliability: 85, latency: 4, dropout: 5 },
    { time: '04:30', reliability: 90, latency: 2, dropout: 5 }
  ];

  const verificationDonutData = [
    { name: 'Verified Decisions', value: aar?.decision_quality_metrics?.verification_discipline_rate || 75, color: '#10B981' },
    { name: 'Direct Maneuvers', value: 100 - (aar?.decision_quality_metrics?.verification_discipline_rate || 75), color: '#38BDF8' }
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 font-mono text-xs space-y-3">
        <Activity className="w-8 h-8 text-sky-400 animate-spin" />
        <p>GENERATING AFTER ACTION REVIEW (AAR)...</p>
      </div>
    );
  }

  if (!aar) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center space-y-3">
        <FileText className="w-8 h-8 text-slate-500 mx-auto" />
        <h3 className="font-mono text-sm font-bold text-slate-200">No AAR Report Generated</h3>
        <p className="text-xs text-slate-400 font-sans max-w-sm mx-auto">
          Start an exercise or end an active simulation to compile operational behavioral analytics.
        </p>
      </div>
    );
  }

  const decisionsList = aar.decisions || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 print:bg-white print:text-black">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-sky-400 font-bold uppercase tracking-wider">
              AFTER ACTION REVIEW
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
              OFFICIALLY LOGGED
            </span>
          </div>
          <h1 className="text-2xl font-bold font-mono text-white tracking-tight mt-1">
            Exercise Performance & Behavioral Analysis
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Mission Evaluation: Communication Degradation & Information Asymmetry Dynamics (SIH PS 26248)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleTriggerAI}
            disabled={isGeneratingAI}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-colors uppercase shadow-md shadow-indigo-950 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isGeneratingAI ? 'ANALYZING...' : 'RE-RUN AI ANALYSIS'}</span>
          </button>

          <button
            onClick={handleExportData}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <Database className="w-3.5 h-3.5 text-sky-400" />
            <span>EXPORT DATA (JSON)</span>
          </button>

          <button
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-colors uppercase shadow-md shadow-sky-950 disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isExportingPDF ? 'GENERATING PDF...' : 'EXPORT AAR PDF'}</span>
          </button>
        </div>
      </div>

      {/* 0. Exercise Overview Banner (Section 12) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
        <div>
          <span className="text-slate-500 text-[10px] block uppercase">EXERCISE IDENTIFIER</span>
          <span className="font-bold text-sky-400 text-sm">{aar.exercise_metadata?.code || 'SNTL-4821'}</span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] block uppercase">MISSION SCENARIO</span>
          <span className="font-bold text-slate-200">{aar.exercise_metadata?.scenario_name || 'Operation Sentinel'}</span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] block uppercase">EXERCISE DURATION</span>
          <span className="font-bold text-slate-200">{aar.exercise_metadata?.duration_seconds || 180}s elapsed</span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] block uppercase">OPERATIONAL ROLES</span>
          <span className="font-bold text-emerald-400">4 Active Participants</span>
        </div>
      </div>

      {/* 1. Executive Summary (Section 20) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-3">
        <h3 className="font-mono text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4 text-sky-400" />
          1. Operational Executive Summary
        </h3>
        <p className="text-sm text-slate-200 font-sans leading-relaxed">
          {aar.executive_summary}
        </p>
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-2 border-t border-slate-800">
          <span>Decisions Logged: <strong className="text-white">{aar.decision_quality_metrics?.total_decisions || decisionsList.length || 2}</strong></span>
          <span>•</span>
          <span>Transmissions Exchanged: <strong className="text-white">{aar.resilience_metrics?.total_transmissions || 8}</strong></span>
          <span>•</span>
          <span>Packet Delivery Rate: <strong className="text-emerald-400">{aar.resilience_metrics?.delivery_rate_percent || 85}%</strong></span>
          <span>•</span>
          <span>Resilience Tier: <strong className="text-sky-400">{aar.resilience_metrics?.resilience_tier || 'HIGH'}</strong></span>
        </div>
      </div>

      {/* 2. Visual Charts: Communication Resilience & Verification Discipline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Communication Resilience Timeline (Area Chart) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider">
              2. Communication Resilience Index (Carrier Reliability vs Induced Latency)
            </h3>
            <span className="text-[11px] font-mono text-slate-400">NORMAL → DEGRADED → BLACKOUT → RECOVERY</span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={resilienceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="relGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="time" stroke="#64748B" fontSize={11} fontFamily="monospace" />
                <YAxis stroke="#64748B" fontSize={11} fontFamily="monospace" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Area type="monotone" dataKey="reliability" stroke="#38BDF8" strokeWidth={2} fillOpacity={1} fill="url(#relGrad)" name="Reliability %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Verification Discipline Donut */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3 flex flex-col justify-between">
          <div>
            <h3 className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider">
              Verification Discipline Ratio
            </h3>
            <p className="text-[11px] text-slate-400 font-sans mt-1">
              Observable behavior: ratio of cross-checks initiated before committing unit movement.
            </p>
          </div>

          <div className="h-44 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={verificationDonutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {verificationDonutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1 font-mono text-[11px] border-t border-slate-800 pt-2">
            <div className="flex justify-between text-emerald-400">
              <span>Verification Discipline:</span>
              <span className="font-bold">{aar.decision_quality_metrics?.verification_discipline_rate || 80}%</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Uncertainty Awareness:</span>
              <span className="text-white font-bold">{aar.decision_quality_metrics?.uncertainty_awareness_index || 'STRONG'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Decision Timeline Table with Mandatory Rationale & Confidence (Section 12) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h3 className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider">
              3. Participant Decision Timeline (With Rationale & Subjective Confidence)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500 uppercase">MANDATORY RATIONALE AUDIT</span>
        </div>

        {decisionsList.length === 0 ? (
          <div className="text-center py-6 text-xs font-mono text-slate-500">
            No command decisions recorded for this exercise.
          </div>
        ) : (
          <div className="space-y-3">
            {decisionsList.map((dec, idx) => (
              <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <RoleBadge role={dec.role} size="sm" />
                    <span className="font-mono font-bold text-sky-400 uppercase text-xs">
                      {dec.type}
                    </span>
                    <span className="text-slate-500 text-xs font-mono">→</span>
                    <span className="text-slate-200 text-xs font-mono font-medium">{dec.target}</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-amber-400 font-bold">{dec.confidence}% Confidence</span>
                    <span className="text-slate-500">
                      T+{Math.floor(dec.response_time_seconds || 0)}s
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 text-xs font-sans text-slate-300 leading-relaxed italic">
                  "{dec.rationale}"
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Individual Trainee Performance Breakdown (Section 20) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <h3 className="font-mono text-xs font-bold text-sky-400 uppercase tracking-wider">
          4. Individual Role Behavioral Metrics
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(aar.individual_metrics || {}).map(([role, metrics]: [string, any]) => (
            <div key={role} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <RoleBadge role={role} size="sm" />
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400">
                  {metrics.compliance_rating || 'HIGH'}
                </span>
              </div>

              <div className="space-y-1.5 font-mono text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Decisions Logged:</span>
                  <span className="text-white font-bold">{metrics.decisions_count}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Transmissions Sent:</span>
                  <span className="text-white font-bold">{metrics.messages_sent}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Avg Rationale Conf:</span>
                  <span className="text-amber-400 font-bold">{metrics.average_confidence}%</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Verification Checks:</span>
                  <span className="text-emerald-400 font-bold">{metrics.verification_requests || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. AI-Generated Performance & Training Recommendations (Section 20 & 23) */}
      {aiAnalysis && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/30 rounded-xl p-6 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3">
            <div className="flex items-center gap-2 text-indigo-400 font-mono font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>5. AI-Assisted Behavioral Evaluation (Objective Recorded Evidence)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 border border-indigo-500/40 text-indigo-300">
              AI-GENERATED OBSERVATIONS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-sans">
            {/* Strengths */}
            <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <h4 className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Observed Behavioral Strengths
              </h4>
              <ul className="space-y-1.5 text-slate-300">
                {(aiAnalysis.observed_strengths || []).map((s: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold font-mono">›</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Challenges */}
            <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <h4 className="font-mono text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Observed Frictional Challenges
              </h4>
              <ul className="space-y-1.5 text-slate-300">
                {(aiAnalysis.observed_challenges || []).map((c: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold font-mono">›</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Decision & Communication Patterns */}
          <div className="space-y-2 text-xs font-sans bg-slate-950/40 p-4 rounded-xl border border-slate-800">
            <h4 className="font-mono text-xs font-bold text-sky-400 uppercase tracking-wider">
              Decision & Adaptation Patterns Under Latency
            </h4>
            <p className="text-slate-300 leading-relaxed">
              {aiAnalysis.decision_patterns}
            </p>
          </div>

          {/* Suggested Training Focus */}
          <div className="space-y-2 text-xs font-sans bg-slate-950/40 p-4 rounded-xl border border-slate-800">
            <h4 className="font-mono text-xs font-bold text-purple-400 uppercase tracking-wider">
              Recommended Training Focus for Next Exercise
            </h4>
            <ul className="space-y-1.5 text-slate-300">
              {(aiAnalysis.suggested_training_focus || []).map((f: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-purple-400 font-bold font-mono">›</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 6. Chronological Exercise Event Timeline (Section 20) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <h3 className="font-mono text-xs font-bold text-sky-400 uppercase tracking-wider">
          6. Chronological Exercise Event Timeline
        </h3>

        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {(aar.timeline_data || []).map((evt: any, i: number) => (
            <div key={i} className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-slate-500 font-mono text-[11px] whitespace-nowrap">
                  {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <RoleBadge role={evt.actor} size="sm" />
                <span className="font-sans text-slate-200 line-clamp-1">{evt.title}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 font-mono whitespace-nowrap uppercase">
                {evt.type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
