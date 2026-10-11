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

  React.useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      refreshJourney();
    }, 2500);
    return () => clearInterval(interval);
  }, [isOpen, refreshJourney]);

  if (!isOpen) return null;

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getAgentColor = (agent: string) => {
    if (agent.includes('Intake')) return 'bg-blue-100 text-educaro-accent border-blue-200';
    if (agent.includes('Extraction')) return 'bg-amber-100 text-educaro-accent border-educaro-accent/20';
    if (agent.includes('Consistency')) return 'bg-rose-100 text-educaro-accent border-educaro-accent/20';
    if (agent.includes('Qualification')) return 'bg-emerald-100 text-educaro-accent border-educaro-accent/20';
    if (agent.includes('CV')) return 'bg-purple-100 text-educaro-accent border-purple-200';
    return 'bg-educaro-icon text-educaro-primary border-educaro-border';
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-educaro-main shadow-2xl border-l border-educaro-border flex flex-col transition-transform duration-300 ease-in-out">
      {/* Header */}
      <div className="p-4 bg-educaro-main border-b border-educaro-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-educaro-accent text-black flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-educaro-primary flex items-center gap-2">
              Agent Orchestration Trace
              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-educaro-icon text-educaro-muted border border-educaro-border">
                Live Feed
              </span>
            </h2>
            <p className="text-[11px] text-educaro-muted">Real-time audit log of agent calls and tool invocations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshJourney}
            className="p-1.5 text-xs text-educaro-muted hover:text-educaro-primary hover:bg-educaro-secondary rounded transition-colors"
            title="Refresh events"
          >
            Refresh
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-educaro-muted hover:text-educaro-primary hover:bg-educaro-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {agentEvents.length === 0 ? (
          <div className="p-8 text-center text-educaro-muted text-sm">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No agent actions recorded yet.</p>
            <p className="text-xs mt-1">Actions performed by Intake, Extraction, Consistency, and Qualification agents will appear here live.</p>
          </div>
        ) : (
          agentEvents.map((evt) => {
            const isExpanded = expandedId === evt.id;
            return (
              <div
                key={evt.id}
                className="bg-educaro-main rounded-xl border border-educaro-border p-3 text-xs shadow-xs transition-all hover:border-educaro-accent"
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
                    <span className="text-educaro-muted font-mono">→</span>
                    <span className="font-mono text-educaro-primary font-medium bg-educaro-icon px-1.5 py-0.5 rounded text-[11px]">
                      {evt.tool}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-educaro-muted">
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
                  <div className="mt-2 text-educaro-primary text-[12px] bg-educaro-main p-2 rounded-lg border border-educaro-border/60">
                    <span className="font-semibold text-educaro-muted text-[10px] uppercase tracking-wider block mb-0.5">
                      Agent Rationale / Why:
                    </span>
                    {evt.reason}
                  </div>
                )}

                {/* Confidence */}
                {evt.confidence !== undefined && (
                  <div className="mt-2 flex items-center justify-between text-[11px] text-educaro-muted">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-educaro-accent" />
                      Confidence: {(evt.confidence * 100).toFixed(0)}%
                    </span>
                    <span className="text-[10px]">
                      {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                )}

                {/* Expanded Details: Input & Output */}
                {isExpanded && (
                  <div className="mt-3 pt-2 border-t border-educaro-border space-y-2 font-mono text-[11px]">
                    <div>
                      <span className="text-educaro-muted font-semibold text-[10px] uppercase">Input Payload:</span>
                      <pre className="mt-1 p-2 rounded bg-educaro-secondary text-educaro-primary overflow-x-auto whitespace-pre-wrap">
                        {typeof evt.input === 'string' ? evt.input : JSON.stringify(evt.input, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <span className="text-educaro-muted font-semibold text-[10px] uppercase">Output Result:</span>
                      <pre className="mt-1 p-2 rounded bg-educaro-secondary text-educaro-primary overflow-x-auto whitespace-pre-wrap">
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
      <div className="p-3 bg-educaro-main border-t border-educaro-border text-center text-[11px] text-educaro-muted">
        Every state change is audited & strictly labeled with provenance
      </div>
    </div>
  );
};
