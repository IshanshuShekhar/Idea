import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { StepHeader } from '../../components/StepHeader';
import { WhatIfSimulator } from '../../components/WhatIfSimulator';
import { GermanReadinessTrack } from '../../components/GermanReadinessTrack';
import { AdvisorBookingModal } from '../../components/AdvisorBookingModal';
import { AgentTracePanel } from '../../components/AgentTracePanel';
import { useAuth } from '../../context/AuthContext';
import { useJourney } from '../../context/JourneyContext';
import {
  QualificationEvaluation,
  QualificationStatus,
  WhatIfCriteria,
  WhatIfResult,
} from '@educaro/shared';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  CreditCard,
  Sliders,
  ChevronRight,
  UserCheck,
} from 'lucide-react';

export const QualificationPage: React.FC = () => {
  const { user, token } = useAuth();
  const { entitlements, refreshJourney } = useJourney();
  const navigate = useNavigate();

  const [evaluation, setEvaluation] = useState<QualificationEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdvisorBookingOpen, setIsAdvisorBookingOpen] = useState(false);
  const [isTraceOpen, setIsTraceOpen] = useState(false);

  const handleAdvisorClick = async () => {
    setIsAdvisorBookingOpen(true);
  };

  const loadQualification = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/qualification/evaluate', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEvaluation(data);
      }
    } catch (err) {
      console.error('Failed to load qualification:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadQualification();
    }
  }, [token]);

  const handleSimulateWhatIf = async (criteria: WhatIfCriteria): Promise<WhatIfResult> => {
    const res = await fetch('/api/qualification/what-if', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(criteria),
    });
    if (!res.ok) throw new Error('Simulation failed');
    return res.json();
  };

  return (
    <div className="min-h-screen bg-educaro-main flex flex-col text-educaro-primary">
      <Navbar onToggleTracePanel={() => setIsTraceOpen(!isTraceOpen)} isTraceOpen={isTraceOpen} />

      <StepHeader
        currentStepIndex={4}
        totalSteps={8}
        stepTitle="Qualification Assessment"
        stepSubtitle="Deterministic evaluation against German immigration and university rules."
        backRoute="/journey/documents"
        nextRoute="/journey/recommendations"
        continueLabel="Continue to Recommendation →"
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {loading || !evaluation ? (
          <div className="bg-educaro-main rounded-3xl border border-educaro-border p-12 text-center">
            <div className="w-8 h-8 border-2 border-educaro-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <h3 className="text-sm font-bold text-educaro-primary">Running Deterministic Rules Engine...</h3>
            <p className="text-xs text-educaro-muted mt-1">Cross-referencing Anabin, APS, and KMK criteria</p>
          </div>
        ) : (
          <>
            {/* Primary Outcome Banner */}
            <div className="premium-card p-8 sm:p-10 animate-fade-in-up-1">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-educaro-border">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-educaro-icon text-educaro-accent border border-educaro-border">
                      Deterministic Evaluation Outcome
                    </span>
                    <span className="text-xs text-educaro-muted">Target Pathway: {evaluation.pathway}</span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-extrabold text-educaro-primary tracking-tight">
                    {evaluation.headline}
                  </h2>
                  <p className="text-xs sm:text-sm text-educaro-muted mt-2 max-w-3xl leading-relaxed">
                    {evaluation.summary}
                  </p>
                </div>

                {/* Score & Status Badge */}
                <div className="flex items-center gap-4 shrink-0 bg-educaro-main p-4 rounded-2xl border border-educaro-border">
                  <div className="text-center">
                    <span className="text-[10px] font-bold text-educaro-muted uppercase block">Eligibility Score</span>
                    <span className="text-3xl font-extrabold text-educaro-primary">{evaluation.scorePct}%</span>
                  </div>
                  <div className="h-10 w-px bg-[#E5E7EB]" />
                  <div>
                    <span className="text-[10px] font-bold text-educaro-muted uppercase block">Official Status</span>
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                      evaluation.status === QualificationStatus.ELIGIBLE
                        ? 'bg-emerald-100 text-educaro-accent'
                        : 'bg-amber-100 text-educaro-accent'
                    }`}>
                      {evaluation.status === QualificationStatus.ELIGIBLE ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-educaro-accent" />
                          <span>FULLY QUALIFIED</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>CONDITIONALLY QUALIFIED</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Criteria Breakdown Grid: Passed vs Outstanding */}
              <div className="grid grid-cols-1 gap-6 pt-6">
                
                {/* Passed Criteria */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-educaro-accent flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-educaro-accent" />
                    <span>Passed Immigration & Admission Criteria ({evaluation.passedCriteria.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {evaluation.passedCriteria.map((crit, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-educaro-main border border-educaro-border text-xs text-educaro-primary flex items-start gap-2"
                      >
                        <span className="text-educaro-accent font-bold mt-0.5">✓</span>
                        <span className="leading-relaxed">{crit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                </div>

              {/* Deterministic What-If Simulator (PRD Section 6 #5 - Placed directly near Outstanding Requirements) */}
              <div className="pt-6 border-t border-educaro-border">
                <WhatIfSimulator actualEvaluation={evaluation} />
              </div>

            </div>

            {/* German Learning Readiness Path (Section 8.1) */}
            {evaluation.germanReadiness && (
              <GermanReadinessTrack track={evaluation.germanReadiness} />
            )}

            {/* Consultant & Advisory Card */}
            <div className="premium-card bg-educaro-secondary p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 animate-fade-in-up-2">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-educaro-accent text-black">
                    Expert Support
                  </span>
                </div>
                <h3 className="text-lg font-bold text-educaro-primary">
                  {evaluation.recommendedService?.title || 'Educaro Consultant Consultation'}
                </h3>
                <p className="text-xs sm:text-sm text-educaro-muted max-w-2xl leading-relaxed">
                  {evaluation.recommendedService?.description || 'Book a 1-on-1 strategy call with an experienced Educaro advisor in Germany.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                <button
                  onClick={() => setIsAdvisorBookingOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-educaro-accent hover:bg-educaro-accentHover text-black text-xs sm:text-sm font-semibold shadow-xs transition-colors"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Book Advisor Call</span>
                </button>
              </div>
            </div>

            {/* Bottom Continue */}
            <div className="flex items-center justify-between pt-4 border-t border-educaro-border">
              <button
                onClick={() => navigate('/journey/documents')}
                className="text-xs text-educaro-muted hover:text-educaro-primary font-medium"
              >
                ← Back to Document Review
              </button>
              <button
                onClick={() => navigate('/journey/cv')}
                className="btn-primary-glow inline-flex items-center gap-2 px-8 py-4 rounded-full bg-educaro-accent text-black text-sm sm:text-base font-bold"
              >
                <span>Generate Official German CV (Lebenslauf)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

      </main>

      {/* Direct Advisor Booking Modal */}
      <AdvisorBookingModal
        isOpen={isAdvisorBookingOpen}
        onClose={() => setIsAdvisorBookingOpen(false)}
      />

      <AgentTracePanel isOpen={isTraceOpen} onClose={() => setIsTraceOpen(false)} />
    </div>
  );
};

