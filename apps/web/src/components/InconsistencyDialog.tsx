import React, { useState } from 'react';
import { DiscrepancyItem } from '@educaro/shared';
import { AlertTriangle, CheckCircle, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';

interface InconsistencyDialogProps {
  discrepancy: DiscrepancyItem;
  onResolve: (discrepancyId: string, resolvedValue: string) => Promise<void>;
  onClose?: () => void;
}

export const InconsistencyDialog: React.FC<InconsistencyDialogProps> = ({
  discrepancy,
  onResolve,
  onClose,
}) => {
  const [selectedValue, setSelectedValue] = useState<string>(discrepancy.suggestedOptions[0] || '');
  const [customValue, setCustomValue] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const finalVal = selectedValue === '__CUSTOM__' ? customValue : selectedValue;
      // Extract the actual value or year if formatted like "2022 (As stated on...)"
      const cleanVal = finalVal.split(' ')[0];
      await onResolve(discrepancy.id, cleanVal || finalVal);
      if (onClose) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-educaro-main rounded-2xl border border-educaro-accent/20 max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 bg-educaro-icon border-b border-educaro-accent/20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 border border-educaro-accent/20 flex items-center justify-center text-educaro-accent shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-educaro-primary">Consistency Agent Detected a Conflict</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-200 text-educaro-accent font-semibold uppercase">
                {discrepancy.severity}
              </span>
            </div>
            <p className="text-xs text-educaro-muted">Field in question: {discrepancy.fieldLabel}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          
          {/* Conflicting Sources Comparison */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-educaro-main border border-educaro-border">
              <span className="text-[10px] font-bold text-educaro-muted uppercase block">
                Source A: {discrepancy.sourceA.sourceName}
              </span>
              <span className="text-base font-extrabold text-educaro-primary mt-1 block">
                {discrepancy.sourceA.value}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-educaro-icon border border-educaro-accent/20">
              <span className="text-[10px] font-bold text-educaro-accent uppercase block">
                Source B: {discrepancy.sourceB.sourceName}
              </span>
              <span className="text-base font-extrabold text-educaro-accent mt-1 block">
                {discrepancy.sourceB.value}
              </span>
            </div>
          </div>

          {/* Targeted Clarifying Question */}
          <div className="p-3.5 bg-educaro-main rounded-xl border border-educaro-border text-xs text-educaro-primary">
            <p className="font-semibold mb-1 flex items-center gap-1.5 text-educaro-accent">
              <Sparkles className="w-4 h-4 text-educaro-accent" />
              Agent Clarification Query:
            </p>
            <p className="leading-relaxed text-educaro-primary">{discrepancy.clarifyingQuestion}</p>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-educaro-muted uppercase tracking-wider block">
              Select Correct Verified Information:
            </span>

            {discrepancy.suggestedOptions.map((opt, idx) => (
              <label
                key={idx}
                className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  selectedValue === opt
                    ? 'bg-educaro-icon border-educaro-accent font-medium shadow-xs'
                    : 'bg-educaro-main border-educaro-border hover:bg-educaro-secondary'
                }`}
              >
                <input
                  type="radio"
                  name="discrepancy-opt"
                  checked={selectedValue === opt}
                  onChange={() => setSelectedValue(opt)}
                  className="mt-0.5 text-educaro-accent focus:ring-educaro-accent"
                />
                <span className="text-educaro-primary">{opt}</span>
              </label>
            ))}

            <label
              className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                selectedValue === '__CUSTOM__'
                  ? 'bg-educaro-icon border-educaro-accent font-medium shadow-xs'
                  : 'bg-educaro-main border-educaro-border hover:bg-educaro-secondary'
              }`}
            >
              <input
                type="radio"
                name="discrepancy-opt"
                checked={selectedValue === '__CUSTOM__'}
                onChange={() => setSelectedValue('__CUSTOM__')}
                className="mt-0.5 text-educaro-accent focus:ring-educaro-accent"
              />
              <span className="text-educaro-primary">Specify another year / note</span>
            </label>

            {selectedValue === '__CUSTOM__' && (
              <input
                type="text"
                placeholder="e.g. 2023 (explain reason)"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-educaro-accent bg-white text-educaro-primary focus:outline-none"
              />
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-educaro-main border-t border-educaro-border flex items-center justify-between">
          <p className="text-[11px] text-educaro-muted">
            Rules require verified data before final visa assessment
          </p>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-educaro-accent text-black hover:bg-educaro-accentHover shadow-xs transition-colors"
          >
            <span>{isSubmitting ? 'Resolving...' : 'Confirm & Update Profile'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
