import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { StepHeader } from '../../components/StepHeader';
import {
  BookOpen,
  Search,
  Filter,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Youtube,
  FileText,
  Award,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Languages,
  Calendar,
  Layers,
  Info,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { ExamResource, ExamInfo, ExamCategory, ExamResourceType } from '@educaro/shared';

export const ExamPrepPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Selected exam from URL query param if present
  const initialExam = (searchParams.get('exam') || 'ALL').toUpperCase();
  const [selectedExam, setSelectedExam] = useState<string>(initialExam);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'pyq' | 'playlists' | 'guides' | 'bookmarks'>('all');

  const [examsInfo, setExamsInfo] = useState<ExamInfo[]>([]);
  const [resources, setResources] = useState<ExamResource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Bookmarks stored in localStorage
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('educaro_exam_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleBookmark = (resourceId: string) => {
    setBookmarks((prev) => {
      const updated = prev.includes(resourceId)
        ? prev.filter((id) => id !== resourceId)
        : [...prev, resourceId];
      try {
        localStorage.setItem('educaro_exam_bookmarks', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save bookmarks:', e);
      }
      return updated;
    });
  };

  // Fetch exam resources and applicant profile
  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    Promise.all([
      fetch('/api/engine/exam-resources').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/engine/profile', { headers }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([examData, profileData]) => {
        if (examData?.data) {
          setExamsInfo(examData.data.exams || []);
          setResources(examData.data.resources || []);
        }
        if (profileData?.data) {
          setUserProfile(profileData.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load exam preparation resources:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleExamSelect = (category: string) => {
    setSelectedExam(category);
    if (category === 'ALL') {
      searchParams.delete('exam');
    } else {
      searchParams.set('exam', category.toLowerCase());
    }
    setSearchParams(searchParams);
  };

  // Filtered resources
  const filteredResources = useMemo(() => {
    return resources.filter((res) => {
      // Tab filter
      if (activeTab === 'bookmarks') {
        if (!bookmarks.includes(res.id)) return false;
      } else if (activeTab === 'pyq') {
        if (res.resourceType !== 'SAMPLE_PAPERS') return false;
      } else if (activeTab === 'playlists') {
        if (res.resourceType !== 'PLAYLIST') return false;
      } else if (activeTab === 'guides') {
        if (res.resourceType !== 'STUDY_GUIDE') return false;
      }

      // Exam category filter
      if (selectedExam !== 'ALL' && res.exam !== selectedExam) {
        return false;
      }

      // Type filter
      if (selectedType !== 'ALL' && res.resourceType !== selectedType) {
        return false;
      }

      // Language filter
      if (selectedLanguage !== 'ALL' && res.language !== selectedLanguage) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = res.title.toLowerCase().includes(q);
        const matchDesc = res.description.toLowerCase().includes(q);
        const matchProvider = res.provider.toLowerCase().includes(q);
        const matchSection = (res.sectionOrLevel || '').toLowerCase().includes(q);
        const matchRecommended = (res.recommendedFor || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchProvider && !matchSection && !matchRecommended) {
          return false;
        }
      }

      return true;
    });
  }, [resources, activeTab, selectedExam, selectedType, selectedLanguage, searchQuery, bookmarks]);

  // Personalized Advice Calculation
  const personalizedAdvice = useMemo(() => {
    if (!userProfile) return null;
    const targetDegree = userProfile.step2?.targetDegree || userProfile.target_degree || 'MASTER';
    const targetField = userProfile.step2?.targetField || userProfile.field_of_study || '';
    const teachingLang = userProfile.step2?.teachingLanguage || 'ENGLISH';
    const germanLevel = userProfile.step3?.germanProficiency || 'A1';

    const recommendations: { exam: string; reason: string; priority: 'HIGH' | 'MEDIUM' | 'OPTIONAL' }[] = [];

    // Language test
    if (teachingLang === 'ENGLISH' || teachingLang === 'BILINGUAL') {
      recommendations.push({
        exam: 'IELTS Academic',
        reason: 'Required for English-taught master and bachelor courses in Germany (aim for minimum Band 6.5 overall, 6.0 in each section).',
        priority: 'HIGH',
      });
    }

    if (teachingLang === 'GERMAN' || teachingLang === 'BILINGUAL') {
      recommendations.push({
        exam: 'German C1 (TestDaF / Goethe / telc / DSH)',
        reason: 'Mandatory C1 certification required for all German-medium degree admissions and official university matriculation.',
        priority: 'HIGH',
      });
    } else {
      recommendations.push({
        exam: 'German A2 / B1 (Goethe-Zertifikat)',
        reason: `Your profile indicates current level is ${germanLevel}. While your coursework may be in English, B1 German is strongly recommended for part-time student jobs (Werkstudent) and daily life.`,
        priority: 'MEDIUM',
      });
    }

    // Quantitative/Aptitude
    const isTechOrCS = /computer|data|software|informati|engine|mechanic|electr/i.test(targetField);
    const isBusiness = /business|manage|finance|econom|mba/i.test(targetField);

    if (isTechOrCS && targetDegree.includes('MASTER')) {
      recommendations.push({
        exam: 'GRE General (Quantitative)',
        reason: 'Recommended for top German technical universities (TU Munich, RWTH Aachen, TU Berlin) which mandate a 160+ or 164+ Quant score for CS and Data Science admissions.',
        priority: 'MEDIUM',
      });
    }

    if (isBusiness) {
      recommendations.push({
        exam: 'GMAT / GRE',
        reason: 'Elite business institutions such as Mannheim, ESMT Berlin, and WHU consider competitive GMAT Focus or GRE scores for admissions and merit awards.',
        priority: 'MEDIUM',
      });
    }

    if (targetDegree.includes('BACHELOR')) {
      recommendations.push({
        exam: 'TestAS (Academic Studies Aptitude)',
        reason: 'Frequently required for non-EU applicants applying to German undergraduate degrees via Uni-Assist or specific APS fast-track tracks.',
        priority: 'HIGH',
      });
    }

    return recommendations;
  }, [userProfile]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <Navbar />

      <StepHeader
        currentStepIndex={9}
        totalSteps={10}
        stepTitle="Exam Preparation Hub"
        stepSubtitle="Curated past questions, preparation guides, and video playlists for TestDaF, Goethe, IELTS, GRE, and TestAS."
        backRoute="/journey/roadmap"
        nextRoute="/journey/culture"
        continueLabel="Explore Culture & Life"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Main Header Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-brand uppercase tracking-wider">
                <GraduationCap className="w-4 h-4 text-emerald-600" />
                <span>German Admissions Prep Hub</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Exam Preparation & Study Resources
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                Official Previous Year Questions (PYQs), authentic sample examination papers, free comprehensive study guides, and verified YouTube video playlists for exams relevant to students going to Germany.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-slate-100 p-3 rounded-2xl border border-slate-200 flex items-center gap-3 text-xs">
                <div className="text-right">
                  <div className="font-bold text-slate-900">{resources.length} Verified Resources</div>
                  <div className="text-slate-500 text-[11px]">100% Free & Authentic</div>
                </div>
                <div className="w-10 h-10 rounded-xl btn-brand text-white flex items-center justify-center font-bold">
                  ✓
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Essential Transparency & Reality Check Alert */}
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 sm:p-6 shadow-xs flex items-start gap-4">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-xs text-amber-950">
            <h3 className="font-bold text-sm text-amber-900">
              Important: Are all of these exams mandatory for German Universities?
            </h3>
            <p className="leading-relaxed text-amber-900/90">
              <strong>No.</strong> Unlike the US or UK, German public universities assess admission primarily on your <strong>academic curriculum match (ECTS credits)</strong> and <strong>Bachelor degree grades</strong>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1.5 text-[11px]">
              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200">
                <strong>GRE / GMAT:</strong> Not universally required. Only specific competitive technical faculties (e.g. TUM Computer Science) or private business schools request them.
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200">
                <strong>IELTS / TOEFL:</strong> Required only if your chosen degree is taught in English. Minimum benchmark is typically 6.5.
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200">
                <strong>TestDaF / Goethe / DSH:</strong> Required at C1 level only for German-taught degrees, or B1/B2 for vocational training (Ausbildung).
              </div>
            </div>
          </div>
        </div>

        {/* Personalized Exam Recommendations (if logged in & profile exists) */}
        {personalizedAdvice && personalizedAdvice.length > 0 && (
          <div className="bg-white rounded-3xl border border-emerald-200 p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Personalized Exam Recommendations based on Your Saved Profile
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                Tailored for You
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {personalizedAdvice.map((rec, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{rec.exam}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          rec.priority === 'HIGH'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {rec.priority === 'HIGH' ? 'High Priority' : 'Recommended'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{rec.reason}</p>
                  </div>

                  <button
                    onClick={() => {
                      if (rec.exam.includes('GRE')) handleExamSelect('GRE');
                      else if (rec.exam.includes('GMAT')) handleExamSelect('GMAT');
                      else if (rec.exam.includes('IELTS')) handleExamSelect('IELTS');
                      else if (rec.exam.includes('TestAS')) handleExamSelect('TESTAS');
                      else handleExamSelect('GERMAN');
                    }}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 mt-auto pt-1"
                  >
                    <span>View {rec.exam.split(' ')[0]} Materials</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5 Key Exam Overviews & Quick Filters */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Browse by Exam
            </h2>
            {selectedExam !== 'ALL' && (
              <button
                onClick={() => handleExamSelect('ALL')}
                className="text-xs text-emerald-700 hover:underline font-semibold"
              >
                Reset to Show All Exams
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { id: 'ALL', name: 'All Exams', icon: Layers, count: resources.length },
              { id: 'GRE', name: 'GRE General', icon: GraduationCap, count: resources.filter((r) => r.exam === 'GRE').length },
              { id: 'GMAT', name: 'GMAT Focus', icon: Award, count: resources.filter((r) => r.exam === 'GMAT').length },
              { id: 'TESTAS', name: 'TestAS', icon: FileText, count: resources.filter((r) => r.exam === 'TESTAS').length },
              { id: 'IELTS', name: 'IELTS Academic', icon: Languages, count: resources.filter((r) => r.exam === 'IELTS').length },
              { id: 'GERMAN', name: 'German Tests', icon: BookOpen, count: resources.filter((r) => r.exam === 'GERMAN').length },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = selectedExam === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleExamSelect(tab.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50 shadow-xs ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-700' : 'text-slate-500'}`} />
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {tab.count}
                    </span>
                  </div>
                  <div className={`text-xs font-bold ${isSelected ? 'text-emerald-900' : 'text-slate-800'}`}>
                    {tab.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Exam Information Spotlight (if an exam is selected) */}
        {selectedExam !== 'ALL' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
            {(() => {
              const info = examsInfo.find((e) => e.category === selectedExam);
              if (!info) return null;
              return (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{info.name}</h3>
                      <p className="text-xs text-slate-500">{info.fullName}</p>
                    </div>
                    {info.officialPortalUrl && (
                      <a
                        href={info.officialPortalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ghost-brand text-xs px-3.5 py-2 inline-flex items-center gap-1.5 self-start"
                      >
                        <span>Official Portal</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-blue-600" />
                        Who Needs It?
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">{info.whoNeedsIt}</p>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Germany Relevance
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">{info.germanyApplicability}</p>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-purple-600" />
                        Format & Scoring
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">{info.scoringFormat}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Tab Controls & Search Bar */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'all'
                    ? 'btn-brand text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Resources
              </button>

              <button
                onClick={() => setActiveTab('pyq')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'pyq'
                    ? 'btn-brand text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Sample Papers & PYQs</span>
              </button>

              <button
                onClick={() => setActiveTab('playlists')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'playlists'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Youtube className="w-3.5 h-3.5 text-red-500 group-hover:text-white" />
                <span>YouTube Playlists</span>
              </button>

              <button
                onClick={() => setActiveTab('guides')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'guides'
                    ? 'btn-brand text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Study Guides</span>
              </button>

              <button
                onClick={() => setActiveTab('bookmarks')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'bookmarks'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>My Study List ({bookmarks.length})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search topics, exams, or titles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Secondary Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs"
            >
              <option value="ALL">All Languages</option>
              <option value="ENGLISH">English</option>
              <option value="GERMAN">German</option>
              <option value="BILINGUAL">Bilingual</option>
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs"
            >
              <option value="ALL">All Resource Types</option>
              <option value="SAMPLE_PAPERS">Official Sample Papers / PYQs</option>
              <option value="PLAYLIST">YouTube Playlists</option>
              <option value="STUDY_GUIDE">Study Guides</option>
              <option value="PRACTICE_QUESTIONS">Practice Question Banks</option>
            </select>

            {(selectedLanguage !== 'ALL' || selectedType !== 'ALL' || searchQuery.trim()) && (
              <button
                onClick={() => {
                  setSelectedLanguage('ALL');
                  setSelectedType('ALL');
                  setSearchQuery('');
                }}
                className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold"
              >
                Clear Filters
              </button>
            )}

            <span className="ml-auto text-[11px] text-slate-500 font-medium">
              Showing <strong>{filteredResources.length}</strong> of {resources.length} materials
            </span>
          </div>
        </div>

        {/* Resources Grid */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Loading verified exam preparation resources...</p>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No resources found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {activeTab === 'bookmarks'
                ? "You haven't bookmarked any study materials yet. Tap the bookmark icon on any card to save it to your personal study list."
                : 'No materials match your current search and filter criteria. Try adjusting your search query or reset the filters.'}
            </p>
            {activeTab === 'bookmarks' && (
              <button
                onClick={() => setActiveTab('all')}
                className="px-4 py-2 rounded-xl btn-brand text-white text-xs font-bold inline-block"
              >
                Browse All Materials
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((res) => {
              const isBookmarked = bookmarks.includes(res.id);
              const isYoutube = res.resourceType === 'PLAYLIST';
              const isOfficialPaper = res.resourceType === 'SAMPLE_PAPERS';

              return (
                <div
                  key={res.id}
                  className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    {/* Header tags & Bookmark button */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
                          {res.exam}
                        </span>

                        {isYoutube ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-800 flex items-center gap-1">
                            <Youtube className="w-3 h-3 text-red-600" />
                            YouTube Playlist
                          </span>
                        ) : isOfficialPaper ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Official Paper / PYQ
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                            {res.resourceType.replace('_', ' ')}
                          </span>
                        )}

                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-slate-500 border border-slate-200">
                          {res.language}
                        </span>
                      </div>

                      <button
                        onClick={() => toggleBookmark(res.id)}
                        title={isBookmarked ? 'Remove from My Study List' : 'Save to My Study List'}
                        className={`p-1.5 rounded-xl border transition-colors ${
                          isBookmarked
                            ? 'bg-amber-50 border-amber-300 text-amber-700'
                            : 'border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        {isBookmarked ? (
                          <BookmarkCheck className="w-4 h-4 fill-amber-500 text-amber-700" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Title & Provider */}
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 group-hover:text-emerald-800 transition-colors leading-snug">
                        {res.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                        By {res.provider}
                      </p>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {res.description}
                    </p>

                    {/* Section or Level & Recommended info */}
                    {(res.sectionOrLevel || res.recommendedFor) && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {res.sectionOrLevel && (
                          <span className="text-[10px] bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md">
                            {res.sectionOrLevel}
                          </span>
                        )}
                        {res.recommendedFor && (
                          <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-md">
                            {res.recommendedFor}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Action Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {res.accessStatus}
                    </span>

                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs ${
                        isYoutube
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'btn-brand text-white'
                      }`}
                    >
                      <span>{isYoutube ? 'Watch Playlist' : 'Open Resource'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-200">
          <button
            onClick={() => navigate('/journey/roadmap')}
            className="text-xs text-gray-600 hover:text-gray-900 font-semibold transition"
          >
            ← Back to Application Roadmap
          </button>
          <span className="text-xs text-gray-400">
            Click &quot;Explore Culture & Life&quot; in the header above to prepare for life in Germany.
          </span>
        </div>
      </main>
    </div>
  );
};
export default ExamPrepPage;
