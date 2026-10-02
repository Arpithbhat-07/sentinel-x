import React, { useState } from 'react';
import { Send, Clock, AlertOctagon, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';
import { CommunicationMessage, UserRole } from '../types';
import { RoleBadge } from './RoleBadge';

interface DegradedMessageFeedProps {
  messages: CommunicationMessage[];
  currentRole: UserRole;
  currentDisplayName: string;
  onSendMessage: (recipientRole: string, content: string) => Promise<void>;
  commsReliability: number;
  messageDelaySec: number;
}

export const DegradedMessageFeed: React.FC<DegradedMessageFeedProps> = ({
  messages,
  currentRole,
  currentDisplayName,
  onSendMessage,
  commsReliability,
  messageDelaySec
}) => {
  const [recipient, setRecipient] = useState<string>('ALL');
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(recipient, content.trim());
      setContent('');
    } catch (err) {
      console.error('Failed to send tactical message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const getStatusBadge = (msg: CommunicationMessage) => {
    switch (msg.status) {
      case 'DROPPED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-rose-300">
            <AlertOctagon className="w-3 h-3 text-rose-400" /> DROPPED
          </span>
        );
      case 'CORRUPTED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300">
            <ShieldAlert className="w-3 h-3 text-amber-400" /> CORRUPTED
          </span>
        );
      case 'DELAYED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-yellow-950/80 border border-yellow-500/40 text-yellow-300">
            <Clock className="w-3 h-3 text-yellow-400" /> +{msg.delay_seconds}s DELAY
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> DELIVERED
          </span>
        );
    }
  };

  const quickTransmissions = [
    'Request verification on Sector Bravo ground readings.',
    'Local sector clear. Confirmed zero anomalous activity.',
    'Signal jitter elevated. Switching to directional microwave link.',
    'Hold position. Stand by for command resolution.'
  ];

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-sky-400 font-mono font-bold text-sm tracking-wider uppercase">
            Tactical C2 Channel
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            [RELIABILITY: {Math.round(commsReliability * 100)}% | JITTER: {messageDelaySec}s]
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs font-mono py-12">
            <p>NO TRANSMISSIONS LOGGED</p>
            <p className="text-[11px] text-slate-600 mt-1">Send a message or wait for incoming peer reports</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.sender_role === currentRole;
            const textToDisplay = msg.delivered_content || msg.original_content;
            const isDropped = msg.status === 'DROPPED';

            return (
              <div
                key={msg.id}
                className={`p-3 rounded-lg border transition-all text-xs font-mono ${
                  isDropped
                    ? 'bg-rose-950/20 border-rose-900/40 text-rose-300'
                    : isSelf
                    ? 'bg-sky-950/20 border-sky-800/40 text-slate-200'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <RoleBadge role={msg.sender_role} size="sm" />
                    <span className="text-slate-400 font-sans font-medium text-[11px]">{msg.sender_name}</span>
                    <span className="text-slate-600">→</span>
                    <span className="text-[11px] text-sky-400 font-mono">[{msg.recipient_role}]</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(msg)}
                    <span className="text-[10px] text-slate-500">
                      {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className={`mt-1 text-slate-200 font-sans text-xs leading-relaxed ${isDropped ? 'line-through text-rose-400/80 italic' : ''}`}>
                  {textToDisplay}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Transmission Buttons */}
      <div className="px-3 pt-2 pb-1 bg-slate-900/50 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px]">
        <span className="text-slate-500 font-mono whitespace-nowrap">QUICK:</span>
        {quickTransmissions.map((qt, i) => (
          <button
            key={i}
            onClick={() => setContent(qt)}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-sans whitespace-nowrap text-[11px] border border-slate-700/60 transition-colors"
          >
            {qt.length > 28 ? qt.slice(0, 28) + '...' : qt}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
        <select
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
        >
          <option value="ALL">ALL (Broadcast)</option>
          <option value="Instructor">Instructor</option>
          <option value="Commander">Commander</option>
          <option value="Recon Officer">Recon Officer</option>
          <option value="Field Unit">Field Unit</option>
          <option value="Communications Officer">Comms Officer</option>
        </select>

        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Transmit message as ${currentRole}...`}
          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-sans text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
        />

        <button
          type="submit"
          disabled={!content.trim() || isSending}
          className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg font-mono text-xs flex items-center gap-1.5 transition-colors font-medium whitespace-nowrap"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isSending ? 'SENDING...' : 'TRANSMIT'}</span>
        </button>
      </form>
    </div>
  );
};
