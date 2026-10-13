import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from '../../components/Navbar';
import { StepHeader } from '../../components/StepHeader';
import {
  Compass,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ArrowRight,
  Filter,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
  Award,
  FileText,
  UserCheck,
  Plane,
  Home,
  Briefcase,
  GraduationCap,
} from 'lucide-react';
import { RoadmapStep } from '@educaro/shared';

export const ApplicationRoadmapPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [roadmap, setRoadmap] = useState<RoadmapStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Load roadmap data
  const fetchRoadmap = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Please sign in to access your application roadmap.');
      }

      const res = await fetch('/api/engine/roadmap', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`Failed to load roadmap (HTTP ${res.status})`);
      }

      const json = await res.json();
      setRoadmap(json.data || []);
    } catch (err: any) {
      setError(err.message || 'Error loading application roadmap.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoadmap();
  }, []);

  // Toggle step completion
  const handleToggleStep = async (stepId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (!token) return;

      // Optimistic update
      setRoadmap((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, isCompleted: !currentStatus } : s)),
      );

      const res = await fetch(`/api/engine/roadmap/${stepId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ completed: !currentStatus }),
      });

      if (res.ok) {
        const json = await res.json();
        setRoadmap((prev) => prev.map((s) => (s.id === stepId ? json.data : s)));
      } else {
        // Rollback if failed
        fetchRoadmap();
      }
    } catch (err) {
      console.error('Failed to toggle roadmap step', err);
      fetchRoadmap();
    }
  };

  // Re-sync milestones
  const handleRefreshRoadmap = async () => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (!token) return;

      const res = await fetch('/api/engine/roadmap/refresh', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        setRoadmap(json.data || []);
      }
    } catch (err) {
      console.error('Failed to refresh roadmap', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate metrics
  const totalSteps = roadmap.length;
  const completedSteps = roadmap.filter((s) => s.isCompleted).length;
  const completionPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // Derive step status: COMPLETED | IN_PROGRESS | PENDING | BLOCKED
  const getStepStatus = (step: RoadmapStep, index: number) => {
    if (step.isCompleted) return 'COMPLETED';

    // If step 2 requires step 1 and step 1 is not complete
    if (index > 0 && !roadmap[index - 1].isCompleted && step.isMandatory) {
      // Check if earlier mandatory steps are blocked
      const priorMandatoryUnfinished = roadmap
        .slice(0, index)
        .some((s) => s.isMandatory && !s.isCompleted);
      if (priorMandatoryUnfinished && index >= 2) {
        return 'BLOCKED';
      }
    }

    // If first incomplete step or preceding is complete
    const firstIncompleteIndex = roadmap.findIndex((s) => !s.isCompleted);
    if (firstIncompleteIndex === index) {
      return 'IN_PROGRESS';
    }

    return 'PENDING';
  };

  // Filtered steps
  const filteredSteps = roadmap.filter((step, idx) => {
    if (filterStatus === 'ALL') return true;
    const status = getStepStatus(step, idx);
    return status === filterStatus;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'PROFILE':
        return <UserCheck className="w-4 h-4 text-emerald-600" />;
      case 'QUALIFICATION':
        return <Award className="w-4 h-4 text-blue-600" />;
      case 'PATHWAY':
        return <GraduationCap className="w-4 h-4 text-purple-600" />;
      case 'SCHOLARSHIP':
        return <Award className="w-4 h-4 text-amber-600" />;
      case 'DOCUMENTS':
        return <FileText className="w-4 h-4 text-slate-700" />;
      case 'APPLICATION':
        return <Briefcase className="w-4 h-4 text-blue-700" />;
      case 'OFFERS':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'FINANCE_VISA':
        return <ShieldCheck className="w-4 h-4 text-rose-600" />;
      case 'TRAVEL':
        return <Plane className="w-4 h-4 text-sky-600" />;
      case 'SETTLEMENT':
        return <Home className="w-4 h-4 text-teal-600" />;
      default:
        return <Compass className="w-4 h-4 text-slate-600" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
          <h2 className="text-base font-bold text-slate-800">
            Synthesizing Your 10-Stage Journey Roadmap...
          </h2>
          <p className="text-xs text-slate-500">
            Mapping prerequisites from profile, Anabin criteria, and German statutory regulations.
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
          <h2 className="text-xl font-bold text-slate-900">Failed to Load Roadmap</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">{error}</p>
          <button
            onClick={() => fetchRoadmap()}
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
        currentStepIndex={8}
        totalSteps={10}
        stepTitle="Application Roadmap"
        stepSubtitle="Chronological timeline, milestone checkpoints, and actionable deadlines for your Germany journey."
        backRoute="/journey/financial-simulator"
        nextRoute="/journey/exam-prep"
        continueLabel="Explore Exam Prep"
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider">
                <Compass className="w-4 h-4 text-blue-600" />
                Dedicated Applicant Journey
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                10-Stage German Application Roadmap
              </h1>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                A verified step-by-step master plan adapted to your selected pathway, tracking every statutory requirement from initial profile verification to your local registration (Anmeldung) in Germany.
              </p>
            </div>

            {/* Overall Progress Widget */}
            <div className="flex items-center gap-5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-200"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-emerald-600 transition-all duration-700 stroke-current"
                    strokeWidth="3.5"
                    strokeDasharray={`${completionPercentage}, 100`}
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute text-sm font-black text-slate-900">
                  {completionPercentage}%
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Overall Journey
                </span>
                <span className="text-sm font-bold text-slate-800 block">
                  {completedSteps} of {totalSteps} Stages Done
                </span>
                <button
                  onClick={handleRefreshRoadmap}
                  disabled={refreshing}
                  className="mt-1 text-[11px] font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Re-syncing...' : 'Re-sync Milestones'}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-6 mt-6 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-semibold">Filter by Status:</span>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {[
                { id: 'ALL', label: `All (${roadmap.length})` },
                { id: 'IN_PROGRESS', label: `In-Progress (${roadmap.filter((s, i) => getStepStatus(s, i) === 'IN_PROGRESS').length})` },
                { id: 'PENDING', label: `Pending (${roadmap.filter((s, i) => getStepStatus(s, i) === 'PENDING').length})` },
                { id: 'BLOCKED', label: `Blocked (${roadmap.filter((s, i) => getStepStatus(s, i) === 'BLOCKED').length})` },
                { id: 'COMPLETED', label: `Completed (${completedSteps})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id)}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
                    filterStatus === tab.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 10-Stage Sequential Roadmap Timeline */}
        <div className="space-y-4">
          {filteredSteps.map((step, idx) => {
            const originalIndex = roadmap.findIndex((s) => s.id === step.id);
            const status = getStepStatus(step, originalIndex);

            return (
              <div
                key={step.id}
                className={`rounded-2xl border transition-all p-5 sm:p-6 ${
                  step.isCompleted
                    ? 'bg-emerald-50/40 border-emerald-300'
                    : status === 'IN_PROGRESS'
                    ? 'bg-white border-blue-400 ring-2 ring-blue-100 shadow-xs'
                    : status === 'BLOCKED'
                    ? 'bg-rose-50/30 border-rose-200'
                    : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-4 sm:gap-5">
                  {/* Interactive Completion Checkbox */}
                  <button
                    onClick={() => handleToggleStep(step.id, step.isCompleted)}
                    className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 transition-all ${
                      step.isCompleted
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'border-2 border-slate-300 hover:border-emerald-600 text-transparent'
                    }`}
                    title={step.isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
                  >
                    ✓
                  </button>

                  <div className="flex-1 space-y-2">
                    {/* Header Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 flex items-center gap-1.5 border border-slate-200">
                        {getCategoryIcon(step.category)}
                        Stage {step.stepNumber}
                      </span>

                      {/* Status Badge */}
                      {status === 'COMPLETED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Completed
                        </span>
                      )}
                      {status === 'IN_PROGRESS' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                          <Clock className="w-3 h-3 text-blue-700 animate-spin" /> In Progress (Next Action)
                        </span>
                      )}
                      {status === 'BLOCKED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          <AlertTriangle className="w-3 h-3 text-rose-700" /> Prerequisite Pending
                        </span>
                      )}
                      {status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600">
                          Upcoming
                        </span>
                      )}

                      {step.isMandatory ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                          Mandatory
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          Recommended
                        </span>
                      )}

                      {step.dueDate && (
                        <span className="text-[11px] text-slate-500 font-medium ml-auto flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <strong>Target Timeline:</strong> {step.dueDate}
                        </span>
                      )}
                    </div>

                    {/* Stage Title */}
                    <h3
                      className={`text-base font-bold tracking-tight ${
                        step.isCompleted ? 'line-through text-slate-500' : 'text-slate-900'
                      }`}
                    >
                      {step.title}
                    </h3>

                    {/* Detailed Explanation */}
                    <p className="text-xs text-slate-600 leading-relaxed">{step.description}</p>

                    {/* Conditional Prerequisites & Roadmap Notes */}
                    {step.conditionalReason && (
                      <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2 mt-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong>Important Instruction:</strong> {step.conditionalReason}
                        </div>
                      </div>
                    )}

                    {/* Action Link Button */}
                    {step.actionUrl && (
                      <div className="pt-2 flex items-center gap-3">
                        {step.actionUrl.startsWith('http') ? (
                          <a
                            href={step.actionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
                          >
                            Open Official Portal <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <Link
                            to={step.actionUrl}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl btn-brand text-white text-xs font-bold transition-all shadow-xs"
                          >
                            Take Action in Platform <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-200">
          <button
            onClick={() => navigate('/journey/financial-simulator')}
            className="text-xs text-gray-600 hover:text-gray-900 font-semibold transition"
          >
            ← Back to Finance Simulator
          </button>
          <span className="text-xs text-gray-400">
            Click &quot;Explore Exam Prep&quot; in the header above to view entrance exam resources.
          </span>
        </div>
      </main>
    </div>
  );
};
