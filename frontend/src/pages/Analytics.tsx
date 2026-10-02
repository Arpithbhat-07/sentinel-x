import React from 'react';
import { BarChart2, TrendingUp, Shield, Activity, Users, Award } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

export const Analytics: React.FC = () => {
  const historicalTrend = [
    { exercise: 'EX-01', latency: 14.2, verificationRate: 60, packetLoss: 35 },
    { exercise: 'EX-02', latency: 12.0, verificationRate: 68, packetLoss: 40 },
    { exercise: 'EX-03', latency: 9.5, verificationRate: 75, packetLoss: 30 },
    { exercise: 'EX-04', latency: 8.1, verificationRate: 84, packetLoss: 50 },
    { exercise: 'EX-05', latency: 7.2, verificationRate: 91, packetLoss: 45 }
  ];

  const roleAdaptability = [
    { role: 'Commander', avgResponseSec: 9.4, rationaleQuality: 92, verifiedRate: 88 },
    { role: 'Recon Officer', avgResponseSec: 5.1, rationaleQuality: 85, verifiedRate: 94 },
    { role: 'Field Unit', avgResponseSec: 6.8, rationaleQuality: 78, verifiedRate: 82 },
    { role: 'Comms Officer', avgResponseSec: 4.2, rationaleQuality: 89, verifiedRate: 90 }
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-sky-400" />
          Aggregate Training Analytics & Decision Trends
        </h1>
        <p className="text-xs text-slate-400 font-sans mt-1">
          Longitudinal observable behavioral progression across simulated degraded communication exercises.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Avg Decision Latency</span>
          <div className="text-2xl font-black font-mono text-sky-400 mt-1">8.2s</div>
          <p className="text-[10px] font-mono text-emerald-400 mt-1">↓ 42% latency reduction over 5 runs</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Verification Discipline</span>
          <div className="text-2xl font-black font-mono text-emerald-400 mt-1">86.4%</div>
          <p className="text-[10px] font-mono text-emerald-400 mt-1">↑ Pre-action cross check rate</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Transmission Economy</span>
          <div className="text-2xl font-black font-mono text-amber-400 mt-1">94.1%</div>
          <p className="text-[10px] font-mono text-slate-400 mt-1">Concise messaging compliance</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Blackout Adaptation</span>
          <div className="text-2xl font-black font-mono text-purple-400 mt-1">TIER-1</div>
          <p className="text-[10px] font-mono text-purple-400 mt-1">Autonomous protocol activation</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
          <h3 className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider">
            Verification Rate vs Average Latency Over Exercises
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="exercise" stroke="#64748B" fontSize={11} fontFamily="monospace" />
                <YAxis stroke="#64748B" fontSize={11} fontFamily="monospace" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Line type="monotone" dataKey="verificationRate" stroke="#10B981" strokeWidth={2} name="Verification Rate %" />
                <Line type="monotone" dataKey="latency" stroke="#F59E0B" strokeWidth={2} name="Decision Latency (s)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
          <h3 className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider">
            Cross-Role Decision Latency & Verification Rate
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roleAdaptability}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="role" stroke="#64748B" fontSize={10} fontFamily="monospace" />
                <YAxis stroke="#64748B" fontSize={11} fontFamily="monospace" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="verifiedRate" fill="#38BDF8" name="Verified Rate %" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avgResponseSec" fill="#A855F7" name="Avg Response Time (s)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
