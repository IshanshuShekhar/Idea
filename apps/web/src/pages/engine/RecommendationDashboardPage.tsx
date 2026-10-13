import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from '../../components/Navbar';
import { StepHeader } from '../../components/StepHeader';
import {
  Building2,
  Sparkles,
  Sliders,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Award,
  Compass,
  MessageSquare,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import {
  UniversityMatchResult,
  RecommendationEngineResponse,
  UniversityMatchStatus,
} from '@educaro/shared';

export const RecommendationDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<RecommendationEngineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterLanguage, setFilterLanguage] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterTuition, setFilterTuition] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Configurable Weights Modal
  const [showWeightsModal, setShowWeightsModal] = useState<boolean>(false);
  const [weights, setWeights] = useState({
    academic: 30,
    subject: 25,
    language: 20,
    budget: 15,
    preferences: 10,
  });

  // Expanded score breakdowns
  const [expandedBreakdown, setExpandedBreakdown] = useState<Record<string, boolean>>({});

  const toggleBreakdown = (id: string) => {
    setExpandedBreakdown((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Fetch initial dashboard recommendations
  const fetchDashboardData = async (activeWeights?: typeof weights) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Please sign in to access recommendations.');
      }

      // Fetch recommendations
      const recUrl = '/api/engine/recommendations';
      const recMethod = activeWeights ? 'POST' : 'GET';
      const recBody = activeWeights ? JSON.stringify({ weights: activeWeights }) : undefined;

      const res = await fetch(recUrl, {
        method: recMethod,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: recBody,
      });

      if (res.status === 404) {
        // No profile created yet
        navigate('/journey/details');
        return;
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed to fetch recommendations (HTTP ${res.status})`);
      }

      const recJson = await res.json();
      setData(recJson.data);
    } catch (err: any) {
      setError(err.message || 'Error loading recommendation dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Filtered University Matches
  const filteredUniversities = (data?.universityMatches || []).filter((m) => {
    if (filterLanguage !== 'ALL' && m.programme.teachingLanguage !== filterLanguage) return false;
    if (filterStatus !== 'ALL' && m.admissionStatus !== filterStatus) return false;
    if (filterTuition === 'FREE' && m.programme.tuitionFeeEUR > 0) return false;
    if (filterTuition === 'PAID' && m.programme.tuitionFeeEUR === 0) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = m.programme.programmeName.toLowerCase().includes(q);
      const matchUni = (m.programme.universityName || '').toLowerCase().includes(q);
      const matchCity = (m.programme.city || '').toLowerCase().includes(q);
      if (!matchName && !matchUni && !matchCity) return false;
    }
    return true;
  });

  // Admission Status Badge Helper
  const renderAdmissionStatusBadge = (status: UniversityMatchStatus) => {
    switch (status) {
      case UniversityMatchStatus.SATISFIED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Requirements Satisfied
          </span>
        );
      case UniversityMatchStatus.POTENTIAL_MATCH:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-700" /> Potential Match — Verification Required
          </span>
        );
      case UniversityMatchStatus.UNMET_REQUIREMENTS:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
            <AlertCircle className="w-3.5 h-3.5 text-rose-700" /> Requirements Not Satisfied
          </span>
        );
      case UniversityMatchStatus.UNSUITABLE:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800 border border-slate-300">
            Currently Unsuitable
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            More Information Required
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
          <h2 className="text-base font-bold text-slate-800">
            Evaluating German University Admissions...
          </h2>
          <p className="text-xs text-slate-500">
            Applying Bavarian Formula, ECTS credit validation, and university admission criteria.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Failed to Load Recommendations</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">{error}</p>
          <button
            onClick={() => fetchDashboardData()}
            className="px-5 py-2.5 rounded-xl btn-brand text-white text-xs font-bold shadow-xs hover:brightness-105"
          >
            Try Again
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <Navbar />

      <StepHeader
        currentStepIndex={5}
        totalSteps={10}
        stepTitle="Recommendations"
        stepSubtitle="Tailored state university programs, dual vocational training, and employment opportunities in Germany."
        backRoute="/journey/qualification"
        nextRoute="/journey/scholarships"
        continueLabel="Continue to Scholarships"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Top Applicant Summary Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Verified Germany Higher Education Matching
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                University & Programme Recommendations
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                Candidate: <strong className="text-slate-900">{data?.applicantSummary.fullName || 'Indian Applicant'}</strong> • Intended Degree: <strong className="text-slate-900">{data?.applicantSummary.intendedDegree} in {data?.applicantSummary.intendedSubject}</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-center">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">German Grade</span>
                <span className="text-base font-black text-emerald-700">
                  {data?.applicantSummary.convertedGermanGrade ? data.applicantSummary.convertedGermanGrade.toFixed(2) : '2.00'}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-center">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">German Level</span>
                <span className="text-base font-bold text-slate-800">
                  {data?.applicantSummary.germanLevel || 'B1'}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-center">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">English Test</span>
                <span className="text-base font-bold text-slate-800">
                  {data?.applicantSummary.englishScore || 'IELTS 7.0'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowWeightsModal(true)}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-xs"
                  title="Configure matching weights"
                >
                  <Sliders className="w-3.5 h-3.5 text-slate-600" />
                  Weights
                </button>
                <Link
                  to="/journey/details"
                  className="px-4 py-2.5 rounded-xl btn-brand text-white text-xs font-bold shadow-xs hover:brightness-105 flex items-center gap-1.5"
                >
                  Edit Profile
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Journey Navigation Hub */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/journey/scholarships"
            className="group p-4 bg-white rounded-2xl border border-slate-200 hover:border-emerald-500/50 hover:shadow-xs transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Scholarship Matching
                </h4>
                <p className="text-[11px] text-slate-500">Explore verified funding & grants</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </Link>

          <Link
            to="/journey/roadmap"
            className="group p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-500/50 hover:shadow-xs transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  Application Roadmap
                </h4>
                <p className="text-[11px] text-slate-500">10-stage sequential journey milestones</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </Link>

          <Link
            to="/consultant"
            className="group p-4 bg-white rounded-2xl border border-slate-200 hover:border-purple-500/50 hover:shadow-xs transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                  Consultant & AI Advisor
                </h4>
                <p className="text-[11px] text-slate-500">Instant answers & senior human review</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
          </Link>
        </div>

        {/* Filter controls */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
              <Filter className="w-3.5 h-3.5" /> Filter by:
            </div>

            <select
              value={filterLanguage}
              onChange={(e) => setFilterLanguage(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-medium"
            >
              <option value="ALL">All Languages</option>
              <option value="ENGLISH">English Only</option>
              <option value="GERMAN">German Taught</option>
              <option value="BILINGUAL">Bilingual</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-medium"
            >
              <option value="ALL">All Match Statuses</option>
              <option value={UniversityMatchStatus.SATISFIED}>Requirements Satisfied</option>
              <option value={UniversityMatchStatus.POTENTIAL_MATCH}>Potential Match</option>
              <option value={UniversityMatchStatus.UNMET_REQUIREMENTS}>Requirements Unmet</option>
            </select>

            <select
              value={filterTuition}
              onChange={(e) => setFilterTuition(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-medium"
            >
              <option value="ALL">All Tuition Types</option>
              <option value="FREE">€0 Tuition (Public)</option>
              <option value="PAID">Non-EU Tuition / Specialized</option>
            </select>
          </div>

          <div className="w-full md:w-64">
            <input
              type="text"
              placeholder="Search university or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900"
            />
          </div>
        </div>

        {/* University Cards List */}
        {filteredUniversities.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-600 font-medium">No university matches found for active filters.</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting the filters or modifying your target subject area in Profile.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUniversities.map((item) => {
              const p = item.programme;
              const isBreakdownOpen = expandedBreakdown[p.id];

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {renderAdmissionStatusBadge(item.admissionStatus)}
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-200">
                          {p.teachingLanguage === 'ENGLISH' ? '🇬🇧 English' : p.teachingLanguage === 'GERMAN' ? '🇩🇪 German' : '🌐 Bilingual'}
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-200">
                          {p.institutionType || 'TU9 / Research University'}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 pt-1">
                        {p.programmeName}
                      </h3>
                      <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3">
                        <span className="font-semibold text-slate-800">{p.universityName}</span>
                        <span>•</span>
                        <span>{p.city}, {p.federalState}</span>
                        <span>•</span>
                        <span>Intake: {p.intake}</span>
                        <span>•</span>
                        <span>Winter Deadline: <strong className="text-slate-800">{p.applicationDeadlineWinter}</strong></span>
                      </div>
                    </div>

                    {/* Compatibility Score */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Compatibility</span>
                        <span className="text-2xl font-black text-emerald-700">{item.matchScore}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Criteria matched and missing */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {item.matchedCriteria.length > 0 && (
                      <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-xl p-3 text-xs space-y-1.5">
                        <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Criteria Met
                        </div>
                        <ul className="space-y-1 text-emerald-900 list-disc list-inside">
                          {item.matchedCriteria.map((c, idx) => (
                            <li key={idx}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.missingRequirements.length > 0 && (
                      <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 text-xs space-y-1.5">
                        <div className="font-bold text-rose-950 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-700" /> Missing Requirements (Action Required)
                        </div>
                        <ul className="space-y-1 text-rose-900 list-disc list-inside">
                          {item.missingRequirements.map((m, idx) => (
                            <li key={idx}>{m}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Next Action Pill */}
                  <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-700">Recommended Action: </span>
                      <span className="text-slate-900">{item.recommendedNextAction}</span>
                    </div>
                    <button
                      onClick={() => toggleBreakdown(p.id)}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                    >
                      {isBreakdownOpen ? 'Hide Score Breakdown' : 'View Score Breakdown'}
                      {isBreakdownOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Expandable Score Breakdown */}
                  {isBreakdownOpen && (
                    <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Academic ({weights.academic}%)</span>
                        <span className="font-bold text-slate-900">{item.scoreBreakdown.academicCompatibility} / {weights.academic}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Subject ({weights.subject}%)</span>
                        <span className="font-bold text-slate-900">{item.scoreBreakdown.subjectRelevance} / {weights.subject}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Language ({weights.language}%)</span>
                        <span className="font-bold text-slate-900">{item.scoreBreakdown.languageReadiness} / {weights.language}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Budget ({weights.budget}%)</span>
                        <span className="font-bold text-slate-900">{item.scoreBreakdown.budgetCompatibility} / {weights.budget}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Preferences ({weights.preferences}%)</span>
                        <span className="font-bold text-slate-900">{item.scoreBreakdown.locationAndPreferences} / {weights.preferences}</span>
                      </div>
                    </div>
                  )}

                  {/* Estimated Costs Banner (Clearly labelled as baseline estimates) */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-4 text-slate-600">
                      <div>
                        Tuition: <strong className="text-slate-900">{p.tuitionFeeEUR === 0 ? '€0 (Free)' : `€${p.tuitionFeeEUR}/sem`}</strong>
                      </div>
                      <div>
                        Semester Ticket: <strong className="text-slate-900">€{item.estimatedCosts.semesterContributionEUR}</strong>
                      </div>
                      <div>
                        Living Estimate: <strong className="text-slate-900">~€{item.estimatedCosts.monthlyLivingEstimateEUR}/mo</strong>
                      </div>
                      <div>
                        Annual Total: <strong className="text-slate-900">~€{item.estimatedCosts.annualTotalEstimateEUR.toLocaleString()}</strong>
                      </div>
                      <span className="text-[10px] text-slate-600 italic">(Verified baseline estimates)</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <a
                        href={p.officialAdmissionRequirementsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1"
                      >
                        Requirements Portal <ExternalLink className="w-3 h-3" />
                      </a>
                      <a
                        href={p.officialProgrammeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                      >
                        Apply Official Portal <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-200">
          <button
            onClick={() => navigate('/journey/qualification')}
            className="text-xs text-gray-600 hover:text-gray-900 font-semibold transition"
          >
            ← Back to Qualification Assessment
          </button>
          <span className="text-xs text-gray-400">
            Click &quot;Continue to Scholarships&quot; in the header above to explore funding.
          </span>
        </div>

        {/* WEIGHTS CONFIGURATION MODAL */}
        {showWeightsModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-lg space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Configure Compatibility Weights</h3>
                <button
                  onClick={() => setShowWeightsModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                >
                  ×
                </button>
              </div>
              <p className="text-xs text-slate-600">
                Adjust how much each factor influences your 0–100 compatibility ranking score.
              </p>

              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold text-slate-700">Academic Compatibility</span>
                    <span className="font-bold text-slate-900">{weights.academic}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={weights.academic}
                    onChange={(e) => setWeights({ ...weights, academic: parseInt(e.target.value, 10) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold text-slate-700">Subject Relevance</span>
                    <span className="font-bold text-slate-900">{weights.subject}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="40"
                    value={weights.subject}
                    onChange={(e) => setWeights({ ...weights, subject: parseInt(e.target.value, 10) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold text-slate-700">Language Readiness</span>
                    <span className="font-bold text-slate-900">{weights.language}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="30"
                    value={weights.language}
                    onChange={(e) => setWeights({ ...weights, language: parseInt(e.target.value, 10) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold text-slate-700">Budget Compatibility</span>
                    <span className="font-bold text-slate-900">{weights.budget}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="25"
                    value={weights.budget}
                    onChange={(e) => setWeights({ ...weights, budget: parseInt(e.target.value, 10) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold text-slate-700">Location & Preferences</span>
                    <span className="font-bold text-slate-900">{weights.preferences}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="20"
                    value={weights.preferences}
                    onChange={(e) => setWeights({ ...weights, preferences: parseInt(e.target.value, 10) })}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  onClick={() => setShowWeightsModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowWeightsModal(false);
                    fetchDashboardData(weights);
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-lg btn-brand text-white"
                >
                  Apply & Re-rank
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
