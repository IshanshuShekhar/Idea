import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { WORKFLOW_STEPS } from '@educaro/shared';

interface StepHeaderProps {
  currentStepIndex: number; // 1-indexed (e.g. 1 to 10)
  totalSteps?: number;
  stepTitle: string;
  stepSubtitle?: string;
  backRoute?: string;
  nextRoute?: string;
  canContinue?: boolean;
  onContinue?: () => void;
  continueLabel?: string;
  showPrimaryButton?: boolean;
}

export const StepHeader: React.FC<StepHeaderProps> = ({
  currentStepIndex,
  totalSteps = 10,
  stepTitle,
  stepSubtitle,
  backRoute,
  nextRoute,
  canContinue = true,
  onContinue,
  continueLabel = 'Continue →',
  showPrimaryButton = true,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backRoute) {
      navigate(backRoute);
    } else {
      navigate(-1);
    }
  };

  const handleNext = () => {
    if (onContinue) {
      onContinue();
    } else if (nextRoute) {
      navigate(nextRoute);
    }
  };

  return (
    <div className="w-full bg-white border-b border-border py-4 px-4 sm:px-6 lg:px-8 shadow-xs">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left: Back button + Step info */}
        <div className="flex items-center gap-3">
          {backRoute && (
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 border border-border transition-colors shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="badge-soft normal-case text-xs">
                Step {currentStepIndex} of {totalSteps}
              </span>
              <h1 className="text-base sm:text-lg font-bold text-gray-900">{stepTitle}</h1>
            </div>
            {stepSubtitle && (
              <p className="text-xs text-gray-600 mt-0.5">{stepSubtitle}</p>
            )}
          </div>
        </div>

        {/* Right: Steps tracker pills + Primary Continue button */}
        <div className="flex items-center gap-4 justify-between md:justify-end">
          {/* Step dots / indicators for the 10 workflow steps */}
          <div className="hidden sm:flex items-center gap-1.5">
            {WORKFLOW_STEPS.map((s) => {
              const isDone = s.order < currentStepIndex;
              const isCurrent = s.order === currentStepIndex;
              return (
                <div
                  key={s.id}
                  className={`h-2 rounded-full transition-all ${
                    isCurrent
                      ? 'w-5 bg-brand'
                      : isDone
                      ? 'w-2 bg-emerald-600'
                      : 'w-2 bg-gray-200'
                  }`}
                  title={`${s.order}. ${s.shortTitle}`}
                />
              );
            })}
          </div>

          {/* Primary Forward-Navigation Action */}
          {showPrimaryButton && (nextRoute || onContinue) && (
            <button
              onClick={handleNext}
              disabled={!canContinue}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold shadow-xs transition-all ${
                canContinue
                  ? 'btn-brand text-white hover:opacity-95'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
              }`}
            >
              <span>{continueLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
export default StepHeader;
