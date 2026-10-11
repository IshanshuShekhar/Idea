import React from 'react';
import { Provenance, PROVENANCE_LABELS } from '@educaro/shared';
import { CheckCircle2, User, Sparkles, Bot } from 'lucide-react';

interface ProvenanceBadgeProps {
  provenance: Provenance;
  sourceText?: string;
  confidence?: number;
  className?: string;
}

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({
  provenance,
  sourceText,
  confidence,
  className = '',
}) => {
  const meta = PROVENANCE_LABELS[provenance];

  const getIcon = () => {
    switch (provenance) {
      case Provenance.VERIFIED:
        return <CheckCircle2 className="w-3.5 h-3.5 text-educaro-accent" />;
      case Provenance.APPLICANT_PROVIDED:
        return <User className="w-3.5 h-3.5 text-educaro-accent" />;
      case Provenance.AI_EXTRACTED:
        return <Bot className="w-3.5 h-3.5 text-educaro-accent" />;
      case Provenance.AI_GENERATED:
        return <Sparkles className="w-3.5 h-3.5 text-educaro-accent" />;
    }
  };

  const getStyle = () => {
    return 'bg-educaro-icon text-educaro-accent border-educaro-accent/20';
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStyle()} ${className}`}
      title={sourceText || meta.description}
    >
      {getIcon()}
      <span>{meta.label}</span>
      {typeof confidence === 'number' && (
        <span className="opacity-75 font-mono">
          ({Math.round(confidence * 100)}%)
        </span>
      )}
    </span>
  );
};
