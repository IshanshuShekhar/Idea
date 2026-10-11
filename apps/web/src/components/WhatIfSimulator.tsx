import React, { useState } from 'react';
import { CEFRLevel, QualificationEvaluation, QualificationStatus } from '@educaro/shared';
import { Sparkles, CheckCircle2, AlertCircle, ArrowRight, Info, ShieldCheck } from 'lucide-react';

interface WhatIfSimulatorProps {
  actualEvaluation: QualificationEvaluation;
  onSimulateViaApi?: (level: CEFRLevel) => Promise<any>;
}

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({
  actualEvaluation,
}) => {
  // Determine baseline German level
  const baselineLevelStr = (actualEvaluation.actualGermanLevel || actualEvaluation.germanReadiness?.currentLevel || 'A1').toUpperCase();
  const getInitialLevel = (): CEFRLevel => {
    if (baselineLevelStr.includes('B2')) return CEFRLevel.B2;
    if (baselineLevelStr.includes('B1')) return CEFRLevel.B1;
    if (baselineLevelStr.includes('A2')) return CEFRLevel.A2;
    return CEFRLevel.A1;
  };

  const baselineLevel = getInitialLevel();
  const [simulatedLevel, setSimulatedLevel] = useState<CEFRLevel>(CEFRLevel.B1);

  // Retrieve simulated evaluation instantly from precomputed map or generate deterministic fallback
  const getSimulatedEvaluation = (level: CEFRLevel): QualificationEvaluation => {
    if (actualEvaluation.simulations && actualEvaluation.simulations[level]) {
      return actualEvaluation.simulations[level];
    }
    return actualEvaluation;
  };

  const simEval = getSimulatedEvaluation(simulatedLevel);

  // Compute deterministic diffs vs actual evaluation
  const isBaseline = simulatedLevel === baselineLevel && actualEvaluation.needsGermanSupport;
  const isStatusUpgraded = actualEvaluation.status !== QualificationStatus.ELIGIBLE && simEval.status === QualificationStatus.ELIGIBLE;
  const statusChanged = actualEvaluation.status !== simEval.status;
  const reqDelta = actualEvaluation.missingRequirements.length - simEval.missingRequirements.length;
  const scoreDelta = simEval.scorePct - actualEvaluation.scorePct;

  const actualStatusLabel = actualEvaluation.status === QualificationStatus.ELIGIBLE ? 'Fully Qualified' : 'Qualified with conditions';
  const simStatusLabel = simEval.status === QualificationStatus.ELIGIBLE ? 'Fully Qualified' : 'Qualified with conditions';

  // Construct short summary text as required by PRD & spec
  let diffSummary = `At ${simulatedLevel}: `;
  if (statusChanged) {
    diffSummary += `qualification status changes from '${actualStatusLabel}' to '${simStatusLabel}'`;
  } else {
    diffSummary += `qualification status remains '${simStatusLabel}'`;
  }

  if (reqDelta > 0) {
    diffSummary += `; ${reqDelta} fewer outstanding requirement (${simulatedLevel} language proficiency satisfied).`;
  } else if (reqDelta === 0 && !actualEvaluation.needsGermanSupport) {
    diffSummary += `; German requirement was already fulfilled.`;
  } else {
    diffSummary += `; German learning timeline adjusted for ${simulatedLevel}.`;
  }

  const cefrLevels: CEFRLevel[] = [CEFRLevel.A1, CEFRLevel.A2, CEFRLevel.B1, CEFRLevel.B2];

  return (
    <div className="rounded-3xl border-2 border-dashed border-educaro-accent/40 bg-educaro-main p-6 sm:p-8 shadow-xs space-y-6 transition-all">
      
      {/* Header with clear Hypothetical / Simulated Framing */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-educaro-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-educaro-accent text-black flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-amber-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-educaro-primary">
                Try a Scenario: What-If Simulator
              </h3>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-educaro-accent/20">
                Simulated Scenario
              </span>
            </div>
            <p className="text-xs text-educaro-muted mt-0.5">
              Explore how reaching a higher German CEFR level instantly upgrades your admission & visa outcome
            </p>
          </div>
        </div>

        <div className="text-[11px] font-medium text-educaro-muted flex items-center gap-1.5 self-start sm:self-auto bg-educaro-secondary px-3 py-1.5 rounded-full border border-educaro-border">
          <Info className="w-3.5 h-3.5 text-educaro-accent" />
          <span>Your actual profile: <strong>{actualEvaluation.actualGermanLevel || 'A1 / Unassessed'}</strong></span>
        </div>
      </div>

      {/* Control: German Level Selector / Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-educaro-primary">
            Select a hypothetical German level to test:
          </span>
          <span className="text-educaro-muted text-[11px]">
            Instant deterministic rules calculation (0ms)
          </span>
        </div>

        {/* Level Buttons */}
        <div className="grid grid-cols-4 gap-2.5">
          {cefrLevels.map((lvl) => {
            const isSelected = simulatedLevel === lvl;
            const isActual = baselineLevel === lvl;

            return (
              <button
                key={lvl}
                type="button"
                onClick={() => setSimulatedLevel(lvl)}
                className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 border ${
                  isSelected
                    ? 'bg-educaro-accent text-black border-educaro-accent shadow-sm'
                    : 'bg-educaro-main text-educaro-primary border-educaro-border hover:bg-educaro-secondary'
                }`}
              >
                <span className="text-sm font-extrabold">{lvl}</span>
                <span className={`text-[10px] font-medium tracking-tight ${isSelected ? 'text-white/80' : 'text-educaro-muted'}`}>
                  {lvl === CEFRLevel.A1 && 'Beginner'}
                  {lvl === CEFRLevel.A2 && 'Elementary'}
                  {lvl === CEFRLevel.B1 && 'Intermediate (Visa)'}
                  {lvl === CEFRLevel.B2 && 'Fluent (Uni)'}
                </span>
                {isActual && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-[#E5E7EB] text-educaro-primary'}`}>
                    Current
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Interactive Range Slider */}
        <div className="pt-2">
          <input
            type="range"
            min={0}
            max={3}
            step={1}
            value={cefrLevels.indexOf(simulatedLevel)}
            onChange={(e) => setSimulatedLevel(cefrLevels[parseInt(e.target.value, 10)])}
            className="w-full accent-[#15803D] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-educaro-muted mt-1 font-medium">
            <span>A1 (Foundation)</span>
            <span>A2 (Everyday)</span>
            <span className="font-bold text-educaro-accent">B1 (Opportunity / Ausbildung)</span>
            <span>B2 (Direct University)</span>
          </div>
        </div>
      </div>

      {/* Instant Diff Summary Banner */}
      <div className={`p-4 rounded-2xl border transition-all ${
        isStatusUpgraded
          ? 'bg-educaro-icon/70 border-educaro-accent/30 text-emerald-950'
          : reqDelta > 0
          ? 'bg-educaro-icon/70 border-educaro-accent/20 text-blue-950'
          : 'bg-educaro-main border-educaro-border text-educaro-primary'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/80 border border-current text-xs">
                {isStatusUpgraded ? '★ Upgrade Unlocked' : 'Scenario Diff'}
              </span>
              <span className="text-xs font-bold">
                {diffSummary}
              </span>
            </div>
            <p className="text-[11px] opacity-80 leading-relaxed">
              {simulatedLevel === CEFRLevel.B1 || simulatedLevel === CEFRLevel.B2
                ? 'Meeting the B1 threshold satisfies the German Residence Act language bar and removes the German language gap blocker from your university/Ausbildung file.'
                : 'Current German level requires attending preparatory language tracks prior to visa interview.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 bg-white/70 px-3.5 py-2 rounded-xl border border-current/20">
            <div>
              <span className="text-[9px] uppercase font-bold text-educaro-muted block">Eligibility Score</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm line-through text-educaro-muted">{actualEvaluation.scorePct}%</span>
                <ArrowRight className="w-3 h-3 text-educaro-accent" />
                <span className="text-base font-extrabold text-educaro-primary">{simEval.scorePct}%</span>
              </div>
            </div>
            <div className="h-7 w-px bg-[#E5E7EB]" />
            <div>
              <span className="text-[9px] uppercase font-bold text-educaro-muted block">Simulated Status</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                simEval.status === QualificationStatus.ELIGIBLE
                  ? 'bg-emerald-100 text-educaro-accent'
                  : 'bg-amber-100 text-educaro-accent'
              }`}>
                {simStatusLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Reused Checklist: Simulated Met vs Outstanding Requirements */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-educaro-muted">
            Projected Requirements Checklist at German {simulatedLevel}
          </h4>
          <span className="text-[10px] font-semibold text-educaro-muted">
            {simEval.passedCriteria.length} Met • {simEval.missingRequirements.length} Outstanding
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Simulated Met Requirements */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-educaro-accent flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-educaro-accent" />
              <span>Met in this scenario ({simEval.passedCriteria.length})</span>
            </span>
            <div className="space-y-2">
              {simEval.passedCriteria.map((crit, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-white border border-educaro-border text-xs text-educaro-primary flex items-start gap-2 shadow-2xs"
                >
                  <span className="text-educaro-accent font-bold mt-0.5">✓</span>
                  <span className="leading-relaxed">{crit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Simulated Outstanding Requirements */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-educaro-accent flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Still required ({simEval.missingRequirements.length})</span>
            </span>
            <div className="space-y-2">
              {simEval.missingRequirements.length === 0 ? (
                <div className="p-4 rounded-xl bg-educaro-icon border border-educaro-accent/20 text-xs text-educaro-accent">
                  ✓ All requirements satisfied in this scenario! You would be ready for unconditional submission.
                </div>
              ) : (
                simEval.missingRequirements.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-xl bg-white border border-educaro-border text-xs space-y-1 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-educaro-primary">{req.title}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        req.severity === 'BLOCKING'
                          ? 'bg-rose-100 text-educaro-accent'
                          : 'bg-blue-100 text-educaro-accent'
                      }`}>
                        {req.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-educaro-muted">{req.description}</p>
                    <p className="text-[11px] font-medium text-educaro-accent pt-0.5">
                      Action: {req.actionableStep}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Clear Disclaimer */}
      <div className="pt-2 border-t border-educaro-border flex items-center justify-between text-[11px] text-educaro-muted">
        <span>
          * Note: Simulated scenarios run the exact deterministic immigration engine without changing your official verified records.
        </span>
        <span className="font-semibold text-educaro-accent">
          EduRoute Deterministic Simulator v2.4
        </span>
      </div>

    </div>
  );
};
