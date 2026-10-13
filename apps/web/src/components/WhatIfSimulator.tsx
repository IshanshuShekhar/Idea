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
    <div className="rounded-3xl border-2 border-dashed border-brand/30 bg-white p-6 sm:p-8 shadow-xs space-y-6 transition-all">
      
      {/* Header with clear Hypothetical / Simulated Framing */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl btn-brand text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-900">
                Try a Scenario: What-If Simulator
              </h3>
              <span className="badge-warning text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5">
                Simulated Scenario
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              Explore how reaching a higher German CEFR level instantly upgrades your admission & visa outcome
            </p>
          </div>
        </div>

        <div className="text-[11px] font-medium text-gray-700 flex items-center gap-1.5 self-start sm:self-auto bg-gray-50 px-3 py-1.5 rounded-full border border-border">
          <Info className="w-3.5 h-3.5 text-brand" />
          <span>Your actual profile: <strong>{actualEvaluation.actualGermanLevel || 'A1 / Unassessed'}</strong></span>
        </div>
      </div>

      {/* Control: German Level Selector / Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-gray-900">
            Select a hypothetical German level to test:
          </span>
          <span className="text-gray-600 text-[11px]">
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
                    ? 'btn-brand text-white border-brand shadow-sm'
                    : 'bg-white text-gray-900 border-border hover:bg-gray-50'
                }`}
              >
                <span className="text-sm font-extrabold">{lvl}</span>
                <span className={`text-[10px] font-medium tracking-tight ${isSelected ? 'text-white/90' : 'text-gray-500'}`}>
                  {lvl === CEFRLevel.A1 && 'Beginner'}
                  {lvl === CEFRLevel.A2 && 'Elementary'}
                  {lvl === CEFRLevel.B1 && 'Intermediate (Visa)'}
                  {lvl === CEFRLevel.B2 && 'Fluent (Uni)'}
                </span>
                {isActual && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'badge-soft'}`}>
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
          <div className="flex justify-between text-[10px] text-gray-600 mt-1 font-medium">
            <span>A1 (Foundation)</span>
            <span>A2 (Everyday)</span>
            <span className="font-bold text-brand">B1 (Opportunity / Ausbildung)</span>
            <span>B2 (Direct University)</span>
          </div>
        </div>
      </div>

      {/* Instant Diff Summary Banner */}
      <div className={`p-4 rounded-2xl border transition-all ${
        isStatusUpgraded
          ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
          : reqDelta > 0
          ? 'bg-blue-50 border-blue-200 text-blue-950'
          : 'bg-gray-50 border-border text-gray-900'
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

          <div className="flex items-center gap-3 shrink-0 bg-white/90 px-3.5 py-2 rounded-xl border border-border">
            <div>
              <span className="text-[9px] uppercase font-bold text-gray-500 block">Eligibility Score</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm line-through text-gray-400">{actualEvaluation.scorePct}%</span>
                <ArrowRight className="w-3 h-3 text-brand" />
                <span className="text-base font-extrabold text-gray-900">{simEval.scorePct}%</span>
              </div>
            </div>
            <div className="h-7 w-px bg-border" />
            <div>
              <span className="text-[9px] uppercase font-bold text-gray-500 block">Simulated Status</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                simEval.status === QualificationStatus.ELIGIBLE
                  ? 'badge-soft'
                  : 'badge-warning'
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
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Met in this scenario ({simEval.passedCriteria.length})</span>
            </span>
            <div className="space-y-2">
              {simEval.passedCriteria.map((crit, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-white border border-border text-xs text-gray-900 flex items-start gap-2 shadow-2xs"
                >
                  <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                  <span className="leading-relaxed">{crit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Simulated Outstanding Requirements */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>Still required ({simEval.missingRequirements.length})</span>
            </span>
            <div className="space-y-2">
              {simEval.missingRequirements.length === 0 ? (
                <div className="p-4 rounded-xl badge-soft text-xs">
                  ✓ All requirements satisfied in this scenario! You would be ready for unconditional submission.
                </div>
              ) : (
                simEval.missingRequirements.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-xl bg-white border border-border text-xs space-y-1 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-gray-900">{req.title}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        req.severity === 'BLOCKING'
                          ? 'badge-critical'
                          : 'badge-soft'
                      }`}>
                        {req.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600">{req.description}</p>
                    <p className="text-[11px] font-medium text-emerald-700 pt-0.5">
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
