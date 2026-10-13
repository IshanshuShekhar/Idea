import React, { useState } from 'react';
import { useJourney } from '../context/JourneyContext';
import { X, Activity, ChevronDown, ChevronRight, Clock, CheckCircle, Terminal } from 'lucide-react';
import { AgentEvent } from '@educaro/shared';

interface AgentTracePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgentTracePanel: React.FC<AgentTracePanelProps> = ({ isOpen, onClose }) => {
  const { agentEvents, refreshJourney } = useJourney();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getAgentColor = (agent: string) => {
    if (agent.includes('Profile') || agent.includes('Intake')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (agent.includes('Extraction')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (agent.includes('Consistency')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (agent.includes('Qualification')) return 'badge-soft';
    if (agent.includes('CV')) return 'bg-purple-50 text-purple-700 border-purple-200';
    return 'bg-gray-100 text-gray-800 border-border';
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white shadow-2xl border-l border-border flex flex-col text-gray-900 transition-transform duration-300 ease-in-out">
      {/* Header */}
      <div className="p-4 bg-white border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg btn-brand text-white flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              Agent Orchestration Trace
              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full badge-soft">
                Live Feed
              </span>
            </h2>
            <p className="text-[11px] text-gray-600">Real-time audit log of agent calls and tool invocations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshJourney}
            className="p-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            title="Refresh events"
          >
            Refresh
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {agentEvents.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No agent actions recorded yet.</p>
            <p className="text-xs mt-1">Actions performed by Profile System, Extraction, Consistency, and Qualification services will appear here live.</p>
          </div>
        ) : (
          agentEvents.map((evt) => {
            const isExpanded = expandedId === evt.id;
            return (
              <div
                key={evt.id}
                className="bg-gray-50 rounded-xl border border-border p-3 text-xs shadow-xs transition-all hover:border-brand"
              >
                {/* Event Top Bar */}
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => toggleExpand(evt.id)}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full font-semibold border text-[11px] ${getAgentColor(evt.agent)}`}>
                      {evt.agent}
                    </span>
                    <span className="text-gray-400 font-mono">→</span>
                    <span className="font-mono text-gray-900 font-medium bg-white border border-border px-1.5 py-0.5 rounded text-[11px]">
                      {evt.tool}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    {evt.durationMs !== undefined && (
                      <span className="flex items-center gap-1 font-mono text-[10px]">
                        <Clock className="w-3 h-3" />
                        {evt.durationMs}ms
                      </span>
                    )}
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {/* Reason / Why */}
                {evt.reason && (
                  <div className="mt-2 text-gray-900 text-[12px] bg-white p-2 rounded-lg border border-border">
                    <span className="font-semibold text-gray-500 text-[10px] uppercase tracking-wider block mb-0.5">
                      Agent Rationale / Why:
                    </span>
                    {evt.reason}
                  </div>
                )}

                {/* Confidence */}
                {evt.confidence !== undefined && (
                  <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-brand" />
                      Confidence: {(evt.confidence * 100).toFixed(0)}%
                    </span>
                    <span className="text-[10px]">
                      {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                )}

                {/* Expanded Details: Input & Output */}
                {isExpanded && (
                  <div className="mt-3 pt-2 border-t border-border space-y-2 font-mono text-[11px]">
                    <div>
                      <span className="text-gray-500 font-semibold text-[10px] uppercase">Input Payload:</span>
                      <pre className="mt-1 p-2 rounded bg-gray-100 text-gray-900 border border-border overflow-x-auto whitespace-pre-wrap">
                        {typeof evt.input === 'string' ? evt.input : JSON.stringify(evt.input, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <span className="text-gray-500 font-semibold text-[10px] uppercase">Output Result:</span>
                      <pre className="mt-1 p-2 rounded bg-gray-100 text-gray-900 border border-border overflow-x-auto whitespace-pre-wrap">
                        {typeof evt.output === 'string' ? evt.output : JSON.stringify(evt.output, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-gray-50 border-t border-border text-center text-[11px] text-gray-500">
        Every state change is audited & strictly labeled with provenance
      </div>
    </div>
  );
};
