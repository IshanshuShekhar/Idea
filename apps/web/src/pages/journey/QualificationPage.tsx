import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { StepHeader } from '../../components/StepHeader';
import { AgentTracePanel } from '../../components/AgentTracePanel';
import { useAuth } from '../../context/AuthContext';
import {
  QualificationEvaluation,
  QualificationFactorScore,
  QualificationStatusTier,
  NextStepActionItem,
  Pathway,
} from '@educaro/shared';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileText,
  BookOpen,
  GraduationCap,
  Briefcase,
  Globe,
  Award,
  HelpCircle,
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
  Info,
} from 'lucide-react';

export const QualificationPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [evaluation, setEvaluation] = useState<QualificationEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTraceOpen, setIsTraceOpen] = useState(false);
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);

  const loadQualification = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const res = await fetch('/api/qualification/evaluate', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`Failed to calculate qualification score (HTTP ${res.status})`);
      }

      const data: QualificationEvaluation = await res.json();
      setEvaluation(data);
    } catch (err: any) {
      console.error('Failed to load qualification:', err);
      setError(err.message || 'Unable to load qualification evaluation');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadQualification();
    }
  }, [token]);

  // Color & Badge helpers for Status Tiers
  const getTierConfig = (tier?: QualificationStatusTier) => {
    switch (tier) {
      case 'STRONG_MATCH':
        return {
          label: 'Strong Match',
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-emerald-500/20',
          strokeColor: '#059669',
          progressBg: 'bg-emerald-500',
          icon: CheckCircle2,
          iconColor: 'text-emerald-600',
        };
      case 'GOOD_MATCH':
        return {
          label: 'Good Match',
          badgeClass: 'bg-teal-50 text-teal-800 border-teal-300 ring-teal-500/20',
          strokeColor: '#0d9488',
          progressBg: 'bg-teal-500',
          icon: CheckCircle2,
          iconColor: 'text-teal-600',
        };
      case 'CONDITIONAL_MATCH':
        return {
          label: 'Conditional Match',
          badgeClass: 'bg-amber-50 text-amber-900 border-amber-300 ring-amber-500/20',
          strokeColor: '#d97706',
          progressBg: 'bg-amber-500',
          icon: AlertCircle,
          iconColor: 'text-amber-600',
        };
      case 'ACTION_REQUIRED':
      default:
        return {
          label: 'Action Required',
          badgeClass: 'bg-rose-50 text-rose-900 border-rose-300 ring-rose-500/20',
          strokeColor: '#e11d48',
          progressBg: 'bg-rose-500',
          icon: AlertTriangle,
          iconColor: 'text-rose-600',
        };
    }
  };

  // Factor Status Badge helper
  const getFactorStatusConfig = (status: QualificationFactorScore['status']) => {
    switch (status) {
      case 'EXCEEDS_REQUIREMENT':
        return {
          label: 'Exceeds Requirement',
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          barColor: 'bg-emerald-500',
        };
      case 'GOOD_MATCH':
        return {
          label: 'Good Match',
          badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
          barColor: 'bg-teal-500',
        };
      case 'NEEDS_IMPROVEMENT':
        return {
          label: 'Needs Improvement',
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
          barColor: 'bg-amber-500',
        };
      case 'MISSING_REQUIREMENT':
      default:
        return {
          label: 'Missing Requirement',
          badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
          barColor: 'bg-rose-500',
        };
    }
  };

  // Pathway icon helper
  const getPathwayMeta = (pathway?: Pathway) => {
    switch (pathway) {
      case Pathway.AUSBILDUNG:
        return {
          label: 'Ausbildung (Dual Vocational Training)',
          icon: Briefcase,
          accent: 'text-amber-700 bg-amber-50 border-amber-200',
        };
      case Pathway.EMPLOYMENT:
        return {
          label: 'Direct Skilled Employment / EU Blue Card',
          icon: Award,
          accent: 'text-blue-700 bg-blue-50 border-blue-200',
        };
      case Pathway.STUDY:
      default:
        return {
          label: 'Higher Education (Master’s / Bachelor’s)',
          icon: GraduationCap,
          accent: 'text-teal-700 bg-teal-50 border-teal-200',
        };
    }
  };

  const tierConfig = getTierConfig(evaluation?.statusTier);
  const pathwayMeta = getPathwayMeta(evaluation?.pathway);

  // SVG circular gauge calculation
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const scorePct = evaluation ? Math.min(100, Math.max(0, evaluation.scorePct)) : 0;
  const strokeDashoffset = circumference - (scorePct / 100) * circumference;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 font-sans">
      <Navbar onToggleTracePanel={() => setIsTraceOpen(!isTraceOpen)} isTraceOpen={isTraceOpen} />

      {/* 1. Page Header (Title, Pathway, Step Navigation) */}
      <StepHeader
        currentStepIndex={4}
        totalSteps={10}
        stepTitle="Qualification Assessment"
        stepSubtitle="Deterministic scoring based on your saved Applicant Profile against German admission and visa criteria."
        backRoute="/journey/documents"
        nextRoute="/journey/recommendations"
        continueLabel="Continue to Recommendations"
      />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Loading State */}
        {loading ? (
          <div className="bg-white rounded-3xl border border-border p-16 text-center shadow-xs">
            <div className="w-12 h-12 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-base font-bold text-gray-900">Calculating Deterministic Qualification Score...</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              Analyzing your saved profile data against Bavarian Formula grade conversion, Anabin H+ institution status, and official German visa prerequisites.
            </p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-3xl border border-rose-200 p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Unable to Calculate Score</h3>
            <p className="text-xs text-gray-600 mt-1 max-w-md mx-auto">{error}</p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => loadQualification(true)}
                className="px-5 py-2.5 rounded-full bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 transition"
              >
                Retry Calculation
              </button>
              <Link
                to="/journey/details"
                className="px-5 py-2.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold hover:bg-teal-100 transition"
              >
                Update Profile Details
              </Link>
            </div>
          </div>
        ) : !evaluation ? (
          <div className="bg-white rounded-3xl border border-border p-12 text-center shadow-xs">
            <Info className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-900">No Profile Data Found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              We need your academic background and target pathway to compute an accurate qualification score.
            </p>
            <Link
              to="/journey/details"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition"
            >
              <span>Complete Applicant Profile</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <>
            {/* 2. Prominent Qualification Percentage Card */}
            <section className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-xs relative overflow-hidden">
              {/* Pathway Banner & Recalculate Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${pathwayMeta.accent}`}>
                    <pathwayMeta.icon className="w-3.5 h-3.5" />
                    <span>Target Pathway: {pathwayMeta.label}</span>
                  </span>
                  {evaluation.isProvisional && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Provisional Score</span>
                    </span>
                  )}
                </div>

                <button
                  onClick={() => loadQualification(true)}
                  disabled={refreshing}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-teal-700 transition self-start sm:self-auto"
                  title="Recalculate score from latest profile data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-600' : ''}`} />
                  <span>{refreshing ? 'Recalculating...' : 'Refresh Score'}</span>
                </button>
              </div>

              {/* Main Score & Readiness Display */}
              <div className="pt-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                {/* Left: Headline & Detailed Summary */}
                <div className="space-y-3 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Overall Qualification Status
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-snug">
                    {evaluation.headline}
                  </h2>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {evaluation.summary}
                  </p>

                  {/* Provisional Notice */}
                  {evaluation.isProvisional && (
                    <div className="mt-4 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="leading-relaxed">
                        <span className="font-bold">Notice:</span> Some important records (such as your final CGPA or verified degree documents) are missing or in draft status. Updating your profile in the next step will calibrate your verified percentage.
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Circular Progress Ring & Tier Badge */}
                <div className="shrink-0 flex flex-col items-center justify-center p-6 bg-slate-50/80 rounded-3xl border border-slate-200/80 min-w-[260px]">
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 130 130">
                      {/* Background Track */}
                      <circle
                        cx="65"
                        cy="65"
                        r={radius}
                        stroke="#e2e8f0"
                        strokeWidth="10"
                        fill="transparent"
                      />
                      {/* Animated Progress Stroke */}
                      <circle
                        cx="65"
                        cy="65"
                        r={radius}
                        stroke={tierConfig.strokeColor}
                        strokeWidth="10"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>

                    {/* Centered Score */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
                        {scorePct}%
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Out of 100
                      </span>
                    </div>
                  </div>

                  {/* Status Tier Badge */}
                  <div className="mt-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-xs ${tierConfig.badgeClass}`}>
                      <tierConfig.icon className={`w-3.5 h-3.5 ${tierConfig.iconColor}`} />
                      <span>Status: {evaluation.statusLabel || tierConfig.label}</span>
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. Detailed Explanation ("Why Did You Receive This Score?") */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                    <span>Why Did You Receive This Score?</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                    A factor-by-factor breakdown explaining how your qualifications contribute to your score.
                  </p>
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  {evaluation.factors?.length || 0} Evaluated Factors
                </div>
              </div>

              {/* Factors Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {evaluation.factors?.map((factor) => {
                  const factorConfig = getFactorStatusConfig(factor.status);
                  const factorPct = Math.round((factor.pointsEarned / factor.maxPoints) * 100);

                  return (
                    <div
                      key={factor.id}
                      className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:border-slate-300 transition-colors shadow-xs space-y-4"
                    >
                      {/* Top: Factor Name & Points Earned */}
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h4 className="text-sm font-bold text-gray-900 leading-snug">
                            {factor.factorName}
                          </h4>
                          <span className="shrink-0 text-xs font-extrabold text-gray-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                            {factor.pointsEarned} / {factor.maxPoints} pts
                          </span>
                        </div>

                        {/* Status Label Pill */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${factorConfig.badgeClass}`}>
                            {factor.statusLabel || factorConfig.label}
                          </span>
                        </div>

                        {/* Points Bar */}
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-3">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${factorConfig.barColor}`}
                            style={{ width: `${factorPct}%` }}
                          />
                        </div>

                        {/* Explanation Reason */}
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {factor.reason}
                        </p>

                        {/* Missing Items if any */}
                        {factor.missingItems && factor.missingItems.length > 0 && (
                          <div className="mt-3 p-2.5 rounded-xl bg-rose-50/60 border border-rose-100 text-[11px] text-rose-900">
                            <span className="font-bold">Missing requirement:</span> {factor.missingItems.join(', ')}
                          </div>
                        )}
                      </div>

                      {/* Bottom Action Recommendation */}
                      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="text-[11px] text-gray-500 leading-tight">
                          <span className="font-semibold text-gray-700">Recommended Action: </span>
                          {factor.recommendedAction}
                        </div>

                        {factor.actionRoute && (
                          <button
                            onClick={() => navigate(factor.actionRoute!)}
                            className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-900 hover:underline"
                          >
                            <span>Action</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 4. Scoring Transparency ("How Is This Score Calculated?") Expandable Accordion */}
            <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
              <button
                onClick={() => setIsMethodologyOpen(!isMethodologyOpen)}
                className="w-full px-8 py-6 text-left flex items-center justify-between gap-4 hover:bg-slate-50/80 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      How Is This Score Calculated?
                    </h3>
                    <p className="text-xs text-gray-500">
                      Scoring methodology, factor weighting rules, and mathematical transparency.
                    </p>
                  </div>
                </div>

                <div className="text-gray-400">
                  {isMethodologyOpen ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </button>

              {isMethodologyOpen && (
                <div className="px-8 pb-8 pt-2 space-y-6 border-t border-slate-100 text-xs sm:text-sm text-gray-600">
                  {/* Methodology Overview */}
                  <p className="leading-relaxed">
                    {evaluation.methodology?.description ||
                      'Our deterministic scoring engine evaluates your profile against official German immigration regulations (§18g AufenthG for Blue Card), Central Office for Foreign Education (ZAB / Anabin database), and KMK admission guidelines. Factor weights are calibrated to reflect real-world university cutoffs and visa approval rates.'}
                  </p>

                  {/* Bavarian Formula Explainer */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-teal-700" />
                      <span>Academic Grade Conversion: The Modified Bavarian Formula</span>
                    </h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      German universities convert foreign grading scales to the German 1.0–4.0 scale (where 1.0 is highest and 4.0 is passing) using the official Standing Conference of Ministers of Education (KMK) formula:
                    </p>
                    <div className="p-3 bg-white rounded-xl border border-slate-200 font-mono text-xs text-center text-gray-900 font-bold">
                      German Grade = 1 + 3 × [(Nmax - Nd) / (Nmax - Nmin)]
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Where <strong>Nmax</strong> is the maximum possible grade (e.g. 10.0 or 100%), <strong>Nmin</strong> is the minimum passing grade (e.g. 4.0 or 40%), and <strong>Nd</strong> is your obtained score. German university Master’s programs typically require a converted grade of <strong>≤ 2.5</strong> for tuition-free state admission.
                    </p>
                  </div>

                  {/* Factor Weights Table */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                      Factor Weight Distribution (Total: 100 Points)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {evaluation.methodology?.factorWeights?.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <span className="font-semibold text-gray-800">{item.factorName}</span>
                          <span className="font-black text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                            {item.weightPercentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Clarity Distinctions */}
                  <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-100 space-y-2 text-xs">
                    <h4 className="font-bold text-teal-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-teal-700" />
                      <span>Key Distinctions in Your Evaluation</span>
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-teal-900/90 leading-relaxed">
                      <li><strong>Profile Completeness:</strong> Measures how much required data you have supplied. Missing fields result in provisional estimates without penalizing you as ineligible.</li>
                      <li><strong>Qualification Readiness:</strong> Deterministic rating of how closely your credentials align with German public requirements.</li>
                      <li><strong>Confirmed Eligibility:</strong> Official confirmation by German universities, ZAB, or immigration offices upon document receipt.</li>
                    </ul>
                  </div>

                  {/* Legal Disclaimer */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-gray-500 leading-relaxed">
                    <strong>Legal Notice: </strong>
                    {evaluation.methodology?.disclaimer ||
                      'This score represents an eligibility readiness assessment based on standard German academic and immigration criteria. It does not constitute a legal guarantee of university admission, employer hiring, or visa issuance by German diplomatic missions.'}
                  </div>
                </div>
              )}
            </section>

            {/* 5. Next Steps to Improve Your Qualification */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-teal-600" />
                    <span>Next Steps to Improve Your Qualification</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                    Prioritized action items tailored to your profile gaps to increase your score and admission readiness.
                  </p>
                </div>
              </div>

              {/* Action Items List */}
              <div className="space-y-3">
                {evaluation.nextSteps?.map((step) => {
                  const isHigh = step.priority === 'HIGH';

                  return (
                    <div
                      key={step.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-colors shadow-xs"
                    >
                      <div className="space-y-1.5 max-w-2xl">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                              isHigh
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-slate-100 text-gray-700 border-slate-200'
                            }`}
                          >
                            {step.priority} Priority
                          </span>
                          <span className="text-[11px] font-medium text-gray-400">
                            • {step.category}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-gray-900">
                          {step.title}
                        </h4>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {step.description}
                        </p>
                      </div>

                      <button
                        onClick={() => navigate(step.targetRoute)}
                        className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-gray-900 text-white text-xs font-semibold hover:bg-teal-700 transition shadow-xs self-start sm:self-auto"
                      >
                        <span>{step.ctaText}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Bottom Navigation */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-200">
              <button
                onClick={() => navigate('/journey/documents')}
                className="text-xs text-gray-600 hover:text-gray-900 font-semibold transition"
              >
                ← Back to Document Preparation
              </button>
              <span className="text-xs text-gray-400">
                Click &quot;Continue to Recommendations&quot; in the header above to view matched opportunities.
              </span>
            </div>
          </>
        )}
      </main>

      <AgentTracePanel isOpen={isTraceOpen} onClose={() => setIsTraceOpen(false)} />
    </div>
  );
};
