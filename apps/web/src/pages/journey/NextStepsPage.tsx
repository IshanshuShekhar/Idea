import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { StepHeader } from '../../components/StepHeader';
import { PaymentModal } from '../../components/PaymentModal';
import { AgentTracePanel } from '../../components/AgentTracePanel';
import { useAuth } from '../../context/AuthContext';
import { useJourney } from '../../context/JourneyContext';
import { ShieldCheck, Calendar, ArrowRight, UserCheck, CheckCircle2, Sparkles, PhoneCall , Compass, ExternalLink } from 'lucide-react';

export const NextStepsPage: React.FC = () => {
  const { user } = useAuth();
  const { entitlements, refreshJourney } = useJourney();
  const navigate = useNavigate();

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isTraceOpen, setIsTraceOpen] = useState(false);


  const isPriorityUnlocked =
    entitlements.includes('EDUCARO_PREMIUM') ||
    entitlements.includes('PRIORITY_APS_CONSULTANT_REVIEW') ||
    entitlements.includes('CONSULTANT_REVIEW');

  return (
    <div className="min-h-screen bg-educaro-secondary flex flex-col text-gray-900">
      <Navbar onToggleTracePanel={() => setIsTraceOpen(!isTraceOpen)} isTraceOpen={isTraceOpen} />

      <StepHeader
        currentStepIndex={9}
        totalSteps={9}
        stepTitle="Premium & Advisor Handoff"
        stepSubtitle="Unlock priority fast-tracking or book a 1-on-1 strategy call with an expert."
        backRoute="/journey/payment"
        nextRoute="/"
        continueLabel="Return Home"
      />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        
        {/* Congratulations Banner */}
        <div className="bg-white rounded-[24px] border border-border p-10 shadow-elevated-rest text-center max-w-3xl mx-auto animate-fade-in-up">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-brand flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
            You have entered Premium
          </h2>
        </div>

        {/* Action Pathways Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6 animate-fade-in-up-1">
          
          {/* Card 1: 1-on-1 Consultant Referral */}
          <div className="premium-card p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Educaro Senior Advisor Consultation</h3>
                  <p className="text-[11px] text-gray-600">Free 1-on-1 strategy video call</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed mb-4">
                Our Frankfurt & Bangalore advisors will review your qualification report, confirm tuition-free university shortlist, and outline visa timelines.
              </p>
              <div className="space-y-1.5 text-xs text-gray-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-brand font-bold">✓</span>
                  <span>Pre-digested AI summary shared with advisor</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-brand font-bold">✓</span>
                  <span>Zero repetition of entered information</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <button
                onClick={() => navigate('/consultant')}
                className="btn-brand text-white w-full py-3 px-4 text-xs font-semibold flex justify-center items-center gap-2"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Book Advisor Call on Consultant Page →</span>
              </button>
            </div>
          </div>

          {/* Card 2: Priority APS Fast-Track */}
          <div className="premium-card p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900">Priority APS Verification</h3>
                    <span className="badge-soft text-[10px]">
                      ₹1100
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600">Expedited German Academic Evaluation</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed mb-4">
                Fast-track your mandatory APS India certificate verification with dedicated document notarization checks and verified tracking.
              </p>
              <div className="space-y-1.5 text-xs text-gray-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-brand font-bold">✓</span>
                  <span>Persistent entitlement tied to account</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-brand font-bold">✓</span>
                  <span>Direct Indian UPI & Dynamic QR payment</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              {isPriorityUnlocked ? (
                <div className="p-3 badge-soft rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Educaro Premium Active (90 Days)</span>
                </div>
              ) : (
                <button
                  onClick={() => navigate('/checkout')}
                  className="btn-brand text-white w-full py-3.5 px-4 text-xs sm:text-sm font-bold"
                >
                  Unlock Educaro Premium via UPI / QR →
                </button>
              )}
            </div>
          </div>

          {/* Card 3: German Learning Path */}
          <div className="premium-card p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">German Learning Path</h3>
                  <p className="text-[11px] text-gray-600">Guided language readiness</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed mb-4">
                Access curated, free official German courses (like DW's Nicos Weg) and track your CEFR readiness based on your target pathway.
              </p>
              <div className="space-y-1.5 text-xs text-gray-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-brand font-bold">✓</span>
                  <span>Direct links to A1-B2 Goethe content</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-brand font-bold">✓</span>
                  <span>AI-estimated completion timeline</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/journey/german-learning-path')}
                  className="btn-brand text-white w-full py-2.5 px-4 text-xs font-bold flex justify-center items-center gap-2 mb-1"
                >
                  <Compass className="w-4 h-4" />
                  <span>View Your Learning Path</span>
                </button>
                <a
                  href="https://learngerman.dw.com/en/nicos-weg/c-36519789"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost-brand text-xs w-full py-2.5 px-4 flex justify-center items-center gap-2"
                >
                  <span>Launch Nicos Weg (DW)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <a
                  href="https://www.testdaf.de/de/teilnehmende/vorbereitung/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost-brand text-xs w-full py-2.5 px-4 flex justify-center items-center gap-2"
                >
                  <span>TestDaF Preparation</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>


        </div>

        {/* View Full Consolidated Profile Link */}
        <div className="bg-white rounded-2xl border border-border p-6 flex items-center justify-between shadow-xs">
          <div>
            <h4 className="text-sm font-bold text-gray-900">Consolidated Candidate Details & Audit</h4>
            <p className="text-xs text-gray-600">
              Audit all profile fields with provenance tags, inline editing, and consultant lead scoring.
            </p>
          </div>
          <button
            onClick={() => navigate('/candidate-details')}
            className="btn-brand text-white text-xs inline-flex items-center gap-1.5"
          >
            <span>Open Candidate Details</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>

      </main>

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => {
          setIsPaymentOpen(false);
          refreshJourney();
        }}
      />

      <AgentTracePanel isOpen={isTraceOpen} onClose={() => setIsTraceOpen(false)} />
    </div>
  );
};
