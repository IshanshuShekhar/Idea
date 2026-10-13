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
      <div className="bg-white rounded-2xl border border-border max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 bg-rose-50 border-b border-rose-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-rose-950">Consistency Agent Detected a Conflict</h3>
              <span className="badge-critical uppercase text-[10px]">
                {discrepancy.severity}
              </span>
            </div>
            <p className="text-xs text-rose-800">Field in question: {discrepancy.fieldLabel}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          
          {/* Conflicting Sources Comparison */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-gray-50 border border-border">
              <span className="text-[10px] font-bold text-gray-500 uppercase block">
                Source A: {discrepancy.sourceA.sourceName}
              </span>
              <span className="text-base font-extrabold text-gray-900 mt-1 block">
                {discrepancy.sourceA.value}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                Source B: {discrepancy.sourceB.sourceName}
              </span>
              <span className="text-base font-extrabold text-emerald-950 mt-1 block">
                {discrepancy.sourceB.value}
              </span>
            </div>
          </div>

          {/* Targeted Clarifying Question */}
          <div className="p-3.5 bg-gray-50 rounded-xl border border-border text-xs text-gray-900">
            <p className="font-semibold mb-1 flex items-center gap-1.5 text-emerald-800">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              Agent Clarification Query:
            </p>
            <p className="leading-relaxed text-gray-800">{discrepancy.clarifyingQuestion}</p>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
              Select Correct Verified Information:
            </span>

            {discrepancy.suggestedOptions.map((opt, idx) => (
              <label
                key={idx}
                className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  selectedValue === opt
                    ? 'bg-emerald-50 border-brand font-medium shadow-xs'
                    : 'bg-white border-border hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="discrepancy-opt"
                  checked={selectedValue === opt}
                  onChange={() => setSelectedValue(opt)}
                  className="mt-0.5 text-brand focus:ring-brand"
                />
                <span className="text-gray-900">{opt}</span>
              </label>
            ))}

            <label
              className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                selectedValue === '__CUSTOM__'
                  ? 'bg-emerald-50 border-brand font-medium shadow-xs'
                  : 'bg-white border-border hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="discrepancy-opt"
                checked={selectedValue === '__CUSTOM__'}
                onChange={() => setSelectedValue('__CUSTOM__')}
                className="mt-0.5 text-brand focus:ring-brand"
              />
              <span className="text-gray-900">Specify another year / note</span>
            </label>

            {selectedValue === '__CUSTOM__' && (
              <input
                type="text"
                placeholder="e.g. 2023 (explain reason)"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand"
              />
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-border flex items-center justify-between">
          <p className="text-[11px] text-gray-600">
            Rules require verified data before final visa assessment
          </p>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn-brand text-white text-xs"
          >
            <span>{isSubmitting ? 'Resolving...' : 'Confirm & Update Profile'}</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
