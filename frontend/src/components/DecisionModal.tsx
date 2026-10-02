import React, { useState } from 'react';
import { CheckCircle, X, Shield, AlertTriangle } from 'lucide-react';
import { UserRole } from '../types';

interface DecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (decision: {
    decision_type: string;
    action_target: string;
    rationale: string;
    confidence_score: number;
  }) => Promise<void>;
  role: UserRole;
}

export const DecisionModal: React.FC<DecisionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  role
}) => {
  const [decisionType, setDecisionType] = useState('HOLD');
  const [actionTarget, setActionTarget] = useState('Sector Bravo Perimeter');
  const [rationale, setRationale] = useState('');
  const [confidence, setConfidence] = useState(75);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  if (!isOpen) return null;

  const decisionOptions = [
    { value: 'HOLD', label: 'Hold Position', desc: 'Maintain current perimeter pending information verification' },
    { value: 'REQUEST_VERIFICATION', label: 'Request Verification', desc: 'Task secondary sensor or ground sweep to resolve conflicting telemetry' },
    { value: 'CHANGE_ROUTE', label: 'Change Route / Bypass', desc: 'Reroute around contested/uncertain sector to avoid entrapment' },
    { value: 'REPOSITION', label: 'Reposition Unit', desc: 'Shift unit to defensive covered terrain' },
    { value: 'ESCALATE', label: 'Escalate to HQ Verification', desc: 'Escalate anomalous readings to operational command' },
    { value: 'MAINTAIN_PLAN', label: 'Maintain Current Plan', desc: 'Proceed with baseline mission objectives despite ambient interference' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rationale.trim()) {
      setValidationError('Mandatory rationale missing. Explain why this decision was taken.');
      return;
    }
    if (rationale.trim().length < 8) {
      setValidationError('Substantive operational rationale required (minimum 8 characters).');
      return;
    }
    setValidationError('');

    setIsSubmitting(true);
    try {
      await onSubmit({
        decision_type: decisionType,
        action_target: actionTarget,
        rationale: rationale.trim(),
        confidence_score: confidence
      });
      setRationale('');
      onClose();
    } catch (err) {
      console.error('Failed to submit decision:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono tracking-wider text-slate-100 uppercase">
                Submit Command Decision
              </h3>
              <p className="text-[11px] text-slate-400 font-sans">
                Training evaluation logs decision rationale & subjective confidence
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          {/* Decision Type */}
          <div>
            <label className="block text-slate-300 font-mono font-medium mb-1.5 uppercase tracking-wide">
              1. Tactical Decision Type
            </label>
            <select
              value={decisionType}
              onChange={(e) => setDecisionType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
            >
              {decisionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — {opt.desc}
                </option>
              ))}
            </select>
          </div>

          {/* Action Target */}
          <div>
            <label className="block text-slate-300 font-mono font-medium mb-1.5 uppercase tracking-wide">
              2. Target Sector / Unit
            </label>
            <input
              type="text"
              value={actionTarget}
              onChange={(e) => setActionTarget(e.target.value)}
              placeholder="e.g. Sector Bravo Tree Line / Vanguard-3"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-sky-500 font-sans"
              required
            />
          </div>

          {/* Rationale (Mandatory) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-slate-300 font-mono font-medium uppercase tracking-wide">
                3. Decision Rationale <span className="text-amber-400 font-sans">*Mandatory</span>
              </label>
              <span className="text-[11px] text-slate-500 font-mono">
                {rationale.trim().split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
            {validationError && (
              <div className="mb-2 p-2 rounded bg-rose-950/80 border border-rose-500/50 text-rose-300 font-mono text-[11px] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Explicitly state why this decision was made: e.g., 'Conflicting reports between Recon thermal (68%) and Ground visual require verification before advancing...'"
              rows={3}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-100 text-xs focus:outline-none focus:border-sky-500 font-sans leading-relaxed"
              required
            />
          </div>

          {/* Confidence Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 font-mono font-medium uppercase tracking-wide">
                4. Operator Confidence Level
              </label>
              <span className="font-mono text-sky-400 font-bold">{confidence}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={confidence}
              onChange={(e) => setConfidence(parseInt(e.target.value))}
              className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>Low (High Uncertainty)</span>
              <span>Moderate</span>
              <span>High (Absolute Certainty)</span>
            </div>
          </div>

          {/* Footer Actions */}
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
              disabled={!rationale.trim() || isSubmitting}
              className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-mono text-xs font-bold tracking-wider flex items-center gap-1.5 transition-colors uppercase shadow-lg shadow-sky-900/30"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>LOG DECISION</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
