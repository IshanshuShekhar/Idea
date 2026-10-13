import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { StepHeader } from '../../components/StepHeader';
import { AgentTracePanel } from '../../components/AgentTracePanel';
import { useAuth } from '../../context/AuthContext';
import {
  ScholarshipMatchResult,
  ScholarshipEligibilityStatus,
} from '@educaro/shared';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Search,
  Filter,
  ArrowRight,
  RefreshCw,
  Trophy,
  DollarSign,
  FileText,
  ShieldCheck,
  Sparkles,
  Info,
  Calendar,
  Award,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const ScholarshipMatchingPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [matches, setMatches] = useState<ScholarshipMatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTraceOpen, setIsTraceOpen] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedFundingType, setSelectedFundingType] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'MATCH' | 'AMOUNT' | 'DEADLINE'>('MATCH');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const loadScholarships = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetch('/api/engine/scholarship-matches', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        // Fallback to recommendations API if needed
        const recRes = await fetch('/api/engine/recommendations', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (recRes.ok) {
          const recJson = await recRes.json();
          setMatches(recJson.data?.scholarshipMatches || []);
          return;
        }
        throw new Error(`Failed to load scholarship matches (HTTP ${res.status})`);
      }

      const json = await res.json();
      setMatches(json.data || []);
    } catch (err: any) {
      console.error('Error fetching scholarship matches:', err);
      setError(err.message || 'Unable to load scholarship matches');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadScholarships();
  }, [token]);

  // Toggle Shortlist action
  const toggleSaveShortlist = async (match: ScholarshipMatchResult) => {
    if (!token) return;
    const isCurrentlySaved = match.isSaved;

    // Optimistic UI update
    setMatches((prev) =>
      prev.map((m) =>
        m.scholarship.id === match.scholarship.id
          ? { ...m, isSaved: !isCurrentlySaved }
          : m
      )
    );

    try {
      if (isCurrentlySaved) {
        await fetch(`/api/engine/shortlists/SCHOLARSHIP/${match.scholarship.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch('/api/engine/shortlists', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            itemType: 'SCHOLARSHIP',
            itemId: match.scholarship.id,
            notes: `Saved from Scholarship Matching (${match.eligibilityStatus})`,
          }),
        });
      }
    } catch (err) {
      console.error('Failed to toggle shortlist:', err);
      // Revert on error
      setMatches((prev) =>
        prev.map((m) =>
          m.scholarship.id === match.scholarship.id
            ? { ...m, isSaved: isCurrentlySaved }
            : m
        )
      );
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Status visual configurations
  const getStatusConfig = (status: ScholarshipEligibilityStatus) => {
    switch (status) {
      case ScholarshipEligibilityStatus.LIKELY_ELIGIBLE:
        return {
          label: 'Likely Eligible',
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-emerald-500/20',
          dotColor: 'bg-emerald-500',
          icon: CheckCircle2,
          iconColor: 'text-emerald-600',
          headerBg: 'bg-emerald-50/60 border-emerald-100',
        };
      case ScholarshipEligibilityStatus.POTENTIALLY_ELIGIBLE:
        return {
          label: 'Potential Match',
          badgeClass: 'bg-teal-50 text-teal-800 border-teal-300 ring-teal-500/20',
          dotColor: 'bg-teal-500',
          icon: CheckCircle2,
          iconColor: 'text-teal-600',
          headerBg: 'bg-teal-50/50 border-teal-100',
        };
      case ScholarshipEligibilityStatus.MISSING_INFO:
        return {
          label: 'Needs More Information',
          badgeClass: 'bg-amber-50 text-amber-900 border-amber-300 ring-amber-500/20',
          dotColor: 'bg-amber-500',
          icon: AlertCircle,
          iconColor: 'text-amber-600',
          headerBg: 'bg-amber-50/40 border-amber-100',
        };
      case ScholarshipEligibilityStatus.RECHECK_REQUIRED:
        return {
          label: 'Eligibility to Be Verified',
          badgeClass: 'bg-indigo-50 text-indigo-900 border-indigo-300 ring-indigo-500/20',
          dotColor: 'bg-indigo-500',
          icon: Info,
          iconColor: 'text-indigo-600',
          headerBg: 'bg-indigo-50/40 border-indigo-100',
        };
      case ScholarshipEligibilityStatus.DEADLINE_PASSED:
        return {
          label: 'Application Deadline Passed',
          badgeClass: 'bg-gray-100 text-gray-700 border-gray-300',
          dotColor: 'bg-gray-400',
          icon: Clock,
          iconColor: 'text-gray-500',
          headerBg: 'bg-gray-50/70 border-gray-200',
        };
      case ScholarshipEligibilityStatus.NOT_ELIGIBLE:
      default:
        return {
          label: 'Likely Not Eligible',
          badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
          dotColor: 'bg-rose-500',
          icon: AlertTriangle,
          iconColor: 'text-rose-600',
          headerBg: 'bg-rose-50/30 border-rose-100',
        };
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = matches.length;
    const likely = matches.filter(
      (m) => m.eligibilityStatus === ScholarshipEligibilityStatus.LIKELY_ELIGIBLE
    ).length;
    const potential = matches.filter(
      (m) => m.eligibilityStatus === ScholarshipEligibilityStatus.POTENTIALLY_ELIGIBLE
    ).length;
    const totalMonthlyEUR = matches
      .filter((m) =>
        [
          ScholarshipEligibilityStatus.LIKELY_ELIGIBLE,
          ScholarshipEligibilityStatus.POTENTIALLY_ELIGIBLE,
        ].includes(m.eligibilityStatus) &&
        m.scholarship.paymentFrequency === 'MONTHLY'
      )
      .reduce((acc, m) => acc + (m.scholarship.fundingAmount || 0), 0);

    return { total, likely, potential, totalMonthlyEUR };
  }, [matches]);

  // Filtering & Sorting
  const filteredMatches = useMemo(() => {
    return matches
      .filter((m) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesQuery =
            m.scholarship.scholarshipName.toLowerCase().includes(q) ||
            m.scholarship.providerName.toLowerCase().includes(q) ||
            (m.scholarship.otherEligibilityConditions || '').toLowerCase().includes(q) ||
            m.whyAmISeeingThis.toLowerCase().includes(q);
          if (!matchesQuery) return false;
        }

        // Status filter
        if (selectedStatus !== 'ALL') {
          if (m.eligibilityStatus !== selectedStatus) return false;
        }

        // Funding type filter
        if (selectedFundingType !== 'ALL') {
          if (m.scholarship.fundingType !== selectedFundingType) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'AMOUNT') {
          return (b.scholarship.fundingAmount || 0) - (a.scholarship.fundingAmount || 0);
        }
        if (sortBy === 'DEADLINE') {
          return a.scholarship.applicationDeadline.localeCompare(b.scholarship.applicationDeadline);
        }
        // Default: matchScore descending
        return b.matchScore - a.matchScore;
      });
  }, [matches, searchQuery, selectedStatus, selectedFundingType, sortBy]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 font-sans">
      <Navbar onToggleTracePanel={() => setIsTraceOpen(!isTraceOpen)} isTraceOpen={isTraceOpen} />

      {/* 4-Step Mandatory Header: Step 3 of 4 */}
      <StepHeader
        currentStepIndex={6}
        totalSteps={10}
        stepTitle="Scholarship Matching"
        stepSubtitle="Personalized funding eligibility evaluated against your saved Applicant Profile, athletic achievements, and funding preferences."
        backRoute="/journey/recommendations"
        nextRoute="/journey/financial-simulator"
        continueLabel="Continue to Finance Simulator"
      />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Loading State */}
        {loading ? (
          <div className="bg-white rounded-3xl border border-border p-16 text-center shadow-xs">
            <div className="w-12 h-12 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-base font-bold text-gray-900">Matching Scholarships Against Your Profile...</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              Evaluating DAAD programmes, Deutschlandstipendium, Friedrich Ebert Stiftung, adh athletic squad eligibility, and Studierendenwerk grants.
            </p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-3xl border border-rose-200 p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Unable to Load Scholarship Matches</h3>
            <p className="text-xs text-gray-600 mt-1 max-w-md mx-auto">{error}</p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => loadScholarships(true)}
                className="px-5 py-2.5 rounded-full bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 transition"
              >
                Retry
              </button>
              <Link
                to="/journey/details"
                className="px-5 py-2.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold hover:bg-teal-100 transition"
              >
                Edit Applicant Profile
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* 1. Summary Metrics Strip */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-border shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Total Evaluated
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-gray-900">{metrics.total}</span>
                  <span className="text-xs text-gray-500">schemes</span>
                </div>
                <p className="text-[11px] text-gray-600 mt-1">Verified German funding programs</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-border shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                  Likely Eligible
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-emerald-600">{metrics.likely}</span>
                  <span className="text-xs text-emerald-700 font-semibold">strong matches</span>
                </div>
                <p className="text-[11px] text-gray-600 mt-1">Met core criteria & prerequisites</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-border shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600">
                  Potential Matches
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-teal-700">{metrics.potential}</span>
                  <span className="text-xs text-teal-700 font-semibold">schemes</span>
                </div>
                <p className="text-[11px] text-gray-600 mt-1">Eligible with supporting docs</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-border shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                  Monthly Potential
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-indigo-600">
                    {metrics.totalMonthlyEUR > 0 ? `€${metrics.totalMonthlyEUR}` : '€0'}
                  </span>
                  <span className="text-xs text-gray-500">/ mo</span>
                </div>
                <p className="text-[11px] text-gray-600 mt-1">Combined stipend value potential</p>
              </div>
            </section>

            {/* 2. Transparency & Grounded Explanation Banner */}
            <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 text-xs text-teal-900 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-gray-900 text-xs">
                    Deterministic Matching Grounded in Your Saved Profile
                  </h4>
                  <p className="text-[11px] text-gray-700 mt-0.5 leading-relaxed">
                    Eligibility is evaluated strictly using verified database rules against your profile (nationality, academic grade cutoff, Bavarian conversion, athletic squad representation, and voluntary funding preferences). Non-disclosure of sensitive details will never reduce your qualification score.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to="/journey/details"
                  className="px-3 py-1.5 rounded-full bg-white border border-teal-200 text-[11px] font-semibold text-teal-800 hover:bg-teal-50 transition shadow-2xs whitespace-nowrap"
                >
                  Edit Profile
                </Link>
                <button
                  onClick={() => loadScholarships(true)}
                  disabled={refreshing}
                  className="p-1.5 rounded-full bg-white border border-teal-200 text-teal-800 hover:bg-teal-50 transition shadow-2xs"
                  title="Recalculate matches"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* 3. Search & Filter Bar */}
            <section className="bg-white p-5 rounded-2xl border border-border shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by scholarship name, provider (e.g. DAAD, FES), or keyword..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-border text-xs focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>

                {/* Funding Type Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-gray-500 whitespace-nowrap">
                    Funding Type:
                  </span>
                  <select
                    value={selectedFundingType}
                    onChange={(e) => setSelectedFundingType(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="ALL">All Funding Types</option>
                    <option value="FULL_SCHOLARSHIP">Full Scholarship</option>
                    <option value="MONTHLY_STIPEND">Monthly Stipend</option>
                    <option value="PARTIAL_STIPEND">Partial Stipend</option>
                    <option value="TUITION_WAIVER">Tuition Waiver</option>
                    <option value="TRAVEL_GRANT">Travel / Mobility Grant</option>
                  </select>
                </div>

                {/* Sort dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-gray-500 whitespace-nowrap">
                    Sort:
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 rounded-xl border border-border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="MATCH">Best Match Score</option>
                    <option value="AMOUNT">Highest Funding Amount</option>
                    <option value="DEADLINE">Application Deadline</option>
                  </select>
                </div>
              </div>

              {/* Status Filter Pill Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                {[
                  { key: 'ALL', label: 'All Opportunities' },
                  { key: ScholarshipEligibilityStatus.LIKELY_ELIGIBLE, label: 'Likely Eligible' },
                  { key: ScholarshipEligibilityStatus.POTENTIALLY_ELIGIBLE, label: 'Potential Match' },
                  { key: ScholarshipEligibilityStatus.MISSING_INFO, label: 'Needs Information' },
                  { key: ScholarshipEligibilityStatus.RECHECK_REQUIRED, label: 'To Be Verified' },
                  { key: ScholarshipEligibilityStatus.NOT_ELIGIBLE, label: 'Not Eligible' },
                  { key: ScholarshipEligibilityStatus.DEADLINE_PASSED, label: 'Deadline Passed' },
                ].map((tab) => {
                  const isActive = selectedStatus === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setSelectedStatus(tab.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                        isActive
                          ? 'bg-gray-900 text-white shadow-2xs'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 4. Scholarship Cards Grid / List */}
            {filteredMatches.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-border text-center shadow-xs">
                <Trophy className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-gray-800">No scholarships match your filters</h4>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Try adjusting your search query or selecting "All Opportunities" to view the complete catalog.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedStatus('ALL');
                    setSelectedFundingType('ALL');
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {filteredMatches.map((match) => {
                  const schol = match.scholarship;
                  const cfg = getStatusConfig(match.eligibilityStatus);
                  const StatusIcon = cfg.icon;
                  const isExpanded = expandedCards[schol.id] ?? false;

                  const isDeadlinePassed =
                    match.eligibilityStatus === ScholarshipEligibilityStatus.DEADLINE_PASSED;

                  return (
                    <div
                      key={schol.id}
                      className="bg-white rounded-2xl border border-border overflow-hidden shadow-xs hover:border-gray-300 transition"
                    >
                      {/* Top Header Strip with Status and Match Score */}
                      <div className={`px-5 py-3 border-b flex items-center justify-between ${cfg.headerBg}`}>
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${cfg.badgeClass}`}
                          >
                            <StatusIcon className={`w-3.5 h-3.5 ${cfg.iconColor}`} />
                            <span>{cfg.label}</span>
                          </span>

                          <span className="text-xs text-gray-500 font-medium">
                            Match Score: <span className="font-bold text-gray-900">{match.matchScore}%</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleSaveShortlist(match)}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                              match.isSaved
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-white text-gray-700 border border-border hover:bg-gray-50'
                            }`}
                            title={match.isSaved ? 'Remove from Shortlist' : 'Save to Shortlist'}
                          >
                            {match.isSaved ? (
                              <>
                                <BookmarkCheck className="w-3.5 h-3.5 text-amber-600" />
                                <span>Saved</span>
                              </>
                            ) : (
                              <>
                                <Bookmark className="w-3.5 h-3.5 text-gray-500" />
                                <span>Save</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Card Content Body */}
                      <div className="p-5 sm:p-6 space-y-4">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                              {schol.providerName}
                            </span>
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 mt-0.5">
                              {schol.scholarshipName}
                            </h3>
                            <p className="text-xs text-gray-600 mt-1 max-w-2xl leading-relaxed">
                              {schol.otherEligibilityConditions || `${schol.providerName} funding grant for international students.`}
                            </p>
                          </div>

                          {/* Funding & Amount Pill */}
                          <div className="shrink-0 bg-slate-50 border border-slate-200 p-3 rounded-xl text-left md:text-right">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                              Funding Value
                            </span>
                            <span className="text-base font-extrabold text-gray-900 block mt-0.5">
                              €{schol.fundingAmount.toLocaleString()} ({schol.paymentFrequency.toLowerCase()})
                            </span>
                            {schol.paymentFrequency === 'MONTHLY' && (
                              <span className="text-[10px] text-emerald-700 font-semibold block">
                                ~€{schol.fundingAmount * (schol.durationMonths || 12)} total support ({schol.durationMonths} mo)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Metadata Pills: Degrees, Deadline, Target */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                          <span className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 font-medium">
                            Level: {(schol.eligibleDegreeLevels || []).join(', ') || 'All Degrees'}
                          </span>

                          <span className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 font-medium">
                            Type: {schol.fundingType.replace('_', ' ')}
                          </span>

                          <span
                            className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1 ${
                              isDeadlinePassed
                                ? 'bg-rose-50 text-rose-800'
                                : 'bg-blue-50 text-blue-800'
                            }`}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              Deadline: {schol.applicationDeadline}{' '}
                              {isDeadlinePassed ? '(Passed)' : ''}
                            </span>
                          </span>

                          {schol.nationalityEligibility && (
                            <span className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 font-medium">
                              Open to: {schol.nationalityEligibility.join(', ')}
                            </span>
                          )}
                        </div>

                        {/* Grounded Explanation Box */}
                        <div className="p-4 rounded-xl bg-gray-50 border border-border/80 text-xs space-y-2">
                          <div className="flex items-center gap-2 text-gray-900 font-bold">
                            <Sparkles className="w-4 h-4 text-brand" />
                            <span>Why am I seeing this result?</span>
                          </div>
                          <p className="text-gray-700 text-xs leading-relaxed">
                            {match.whyAmISeeingThis}
                          </p>
                        </div>

                        {/* Collapsible Deep Details (Conditions Met, Missing, Required Evidence) */}
                        <div>
                          <button
                            type="button"
                            onClick={() => toggleExpand(schol.id)}
                            className="text-xs font-bold text-teal-800 hover:text-teal-900 flex items-center gap-1 transition"
                          >
                            <span>
                              {isExpanded ? 'Hide Eligibility Breakdown' : 'Show Detailed Eligibility Breakdown'}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-border space-y-3">
                              {/* Conditions Met */}
                              {match.conditionsMet && match.conditionsMet.length > 0 && (
                                <div>
                                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Satisfied Requirements ({match.conditionsMet.length})</span>
                                  </span>
                                  <ul className="mt-1 space-y-1">
                                    {match.conditionsMet.map((c, i) => (
                                      <li
                                        key={i}
                                        className="text-xs text-gray-700 flex items-start gap-2 pl-4"
                                      >
                                        <span className="text-emerald-600 font-bold mt-0.5">•</span>
                                        <span>{c}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Missing Conditions */}
                              {match.missingConditions && match.missingConditions.length > 0 && (
                                <div>
                                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Unmet or Missing Information ({match.missingConditions.length})</span>
                                  </span>
                                  <ul className="mt-1 space-y-1">
                                    {match.missingConditions.map((c, i) => (
                                      <li
                                        key={i}
                                        className="text-xs text-gray-700 flex items-start gap-2 pl-4"
                                      >
                                        <span className="text-amber-600 font-bold mt-0.5">•</span>
                                        <span>{c}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Evidence Needed */}
                              {((match.evidenceNeeded && match.evidenceNeeded.length > 0) ||
                                (schol.requiredDocuments && schol.requiredDocuments.length > 0)) && (
                                <div>
                                  <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                                    <FileText className="w-3.5 h-3.5 text-gray-500" />
                                    <span>Required Certificates & Official Evidence</span>
                                  </span>
                                  <ul className="mt-1 space-y-1">
                                    {(match.evidenceNeeded || schol.requiredDocuments || []).map(
                                      (doc, i) => (
                                        <li
                                          key={i}
                                          className="text-xs text-gray-700 flex items-start gap-2 pl-4"
                                        >
                                          <span className="text-gray-400 mt-0.5">•</span>
                                          <span>{doc}</span>
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons Toolbar */}
                        <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {schol.officialApplicationUrl && (
                              <a
                                href={schol.officialApplicationUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 transition"
                              >
                                <span>Visit Official Portal</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {schol.officialEligibilityUrl && (
                              <a
                                href={schol.officialEligibilityUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-border text-gray-700 text-xs font-semibold hover:bg-gray-50 transition"
                              >
                                <span>Eligibility Guidelines</span>
                                <ExternalLink className="w-3 h-3 text-gray-400" />
                              </a>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {match.eligibilityStatus === ScholarshipEligibilityStatus.MISSING_INFO && (
                              <Link
                                to="/journey/details"
                                className="text-xs font-bold text-amber-700 hover:text-amber-800 underline"
                              >
                                Complete Missing Profile Info →
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Journey Navigation */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-200">
              <button
                onClick={() => navigate('/journey/recommendations')}
                className="text-xs text-gray-600 hover:text-gray-900 font-semibold transition"
              >
                ← Back to Recommendations
              </button>
              <span className="text-xs text-gray-400">
                Click &quot;Continue to Finance Simulator&quot; in the header above to plan expenses.
              </span>
            </div>
          </>
        )}
      </main>

      <AgentTracePanel isOpen={isTraceOpen} onClose={() => setIsTraceOpen(false)} />
    </div>
  );
};
