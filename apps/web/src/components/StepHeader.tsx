import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';

interface StepHeaderProps {
  currentStepIndex: number; // 1-indexed (e.g. 1 to 6)
  totalSteps?: number;
  stepTitle: string;
  stepSubtitle?: string;
  backRoute?: string;
  nextRoute?: string;
  canContinue?: boolean;
  onContinue?: () => void;
  continueLabel?: string;
}

export const StepHeader: React.FC<StepHeaderProps> = ({
  currentStepIndex,
  totalSteps = 8,
  stepTitle,
  stepSubtitle,
  backRoute,
  nextRoute,
  canContinue = true,
  onContinue,
  continueLabel = 'Continue →',
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

  const stepsList = [
    { num: 1, label: 'Home' },
    { num: 2, label: 'How It Works' },
    { num: 3, label: 'Documents' },
    { num: 4, label: 'Qualification' },
    { num: 5, label: 'Recommendation' },
    { num: 6, label: 'Candidate Details' },
    { num: 7, label: 'CV Generation' },
    { num: 8, label: 'Premium' },
  ];

  return (
    <div className="w-full bg-educaro-main border-b border-educaro-border py-4 px-4 sm:px-6 lg:px-8 shadow-xs">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Left: Back button + Step info */}
        <div className="flex items-center gap-3">
          {backRoute && (
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-educaro-main hover:bg-educaro-secondary text-xs font-medium text-educaro-primary border border-educaro-border transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-educaro-icon text-educaro-accent border border-educaro-border">
                Step {currentStepIndex} of {totalSteps}
              </span>
              <h1 className="text-base sm:text-lg font-bold text-educaro-primary">{stepTitle}</h1>
            </div>
            {stepSubtitle && (
              <p className="text-xs text-educaro-muted mt-0.5">{stepSubtitle}</p>
            )}
          </div>
        </div>

        {/* Right: Steps tracker pills + Continue button */}
        <div className="flex items-center gap-4 justify-between md:justify-end">
          {/* Step dots / indicators */}
          <div className="hidden sm:flex items-center gap-1.5">
            {stepsList.map((s) => {
              const isDone = s.num < currentStepIndex;
              const isCurrent = s.num === currentStepIndex;
              return (
                <div
                  key={s.num}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    isCurrent
                      ? 'w-6 bg-educaro-accent'
                      : isDone
                      ? 'bg-emerald-600'
                      : 'bg-[#E5E7EB]'
                  }`}
                  title={`${s.num}. ${s.label}`}
                />
              );
            })}
          </div>

          {/* Continue button */}
          {(nextRoute || onContinue) && (
            <button
              onClick={handleNext}
              disabled={!canContinue}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold shadow-xs transition-all ${
                canContinue
                  ? 'bg-educaro-accent text-black hover:bg-educaro-accentHover'
                  : 'bg-[#E5E7EB] text-educaro-muted cursor-not-allowed opacity-60'
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
