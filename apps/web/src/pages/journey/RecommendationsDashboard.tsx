import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from '../../components/Navbar';
import { StepHeader } from '../../components/StepHeader';
import { RecommendationCard } from '../../components/RecommendationCard';
import { useAuth } from '../../context/AuthContext';
import { GapAnalysisResponse, RecommendationItem, Pathway } from '@educaro/shared';
import { ArrowRight, Activity, Target, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const RecommendationsDashboard: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  
  const [gapsData, setGapsData] = useState<GapAnalysisResponse | null>(null);
  const [flatRecommendations, setFlatRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pathway filtering
  const [selectedPathway, setSelectedPathway] = useState<Pathway | 'ALL'>('ALL');

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const headers = { Authorization: `Bearer ${token}` };
      
      const [gapsRes, listRes] = await Promise.all([
        fetch('/api/recommendations/gaps', { headers }),
        fetch('/api/recommendations', { headers })
      ]);

      // If auth fails (401/403), treat as empty — user may not have completed
      // qualification yet, or token expired. Don't show a scary error.
      if (gapsRes.status === 401 || listRes.status === 401 ||
          gapsRes.status === 403 || listRes.status === 403) {
        setGapsData(null);
        setFlatRecommendations([]);
        setLoading(false);
        return;
      }

      // For gaps endpoint: gracefully default if it errors (e.g. no profile yet)
      if (gapsRes.ok) {
        const gapsParsed: GapAnalysisResponse = await gapsRes.json();
        setGapsData(gapsParsed);
      } else {
        setGapsData(null);
      }

      // For flat list endpoint: gracefully default
      if (listRes.ok) {
        const listData: RecommendationItem[] = await listRes.json();
        setFlatRecommendations(listData);
      } else {
        setFlatRecommendations([]);
      }
    } catch (err: any) {
      // Only show error for genuine network failures
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (route?: string) => {
    if (route) navigate(route);
  };

  const filteredRecommendations = useMemo(() => {
    let filtered = flatRecommendations;
    if (selectedPathway !== 'ALL') {
      filtered = filtered.filter(r => r.pathwayContext === selectedPathway || r.pathwayContext === ('GENERAL' as any));
    }
    return filtered;
  }, [flatRecommendations, selectedPathway]);

  const completedCount = flatRecommendations.filter(r => r.status === 'completed').length;
  const totalCount = flatRecommendations.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-educaro-secondary flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-educaro-secondary flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-4xl mx-auto w-full p-8 flex items-center justify-center">
          <div className="bg-educaro-icon text-red-700 p-6 rounded-xl border border-red-200 text-center">
            <ShieldAlert className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-bold mb-2">Error Loading Recommendations</h2>
            <p>{error}</p>
            <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Try Again</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-educaro-secondary flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        
        <StepHeader 
          currentStepIndex={5}
          stepTitle="AI Recommendations" 
          stepSubtitle="Personalized matching for university programs and scholarships."
          totalSteps={8}
        backRoute="/journey/qualification"
        nextRoute="/candidate-details"
        continueLabel="Continue to Candidate Details →"
      />

        {/* Next Best Action Banner */}
        {gapsData?.nextBestAction && (
          <div className="mb-8 bg-gradient-to-r from-[#116830] to-[#15803D] rounded-2xl shadow-xl p-8 text-white flex flex-col md:flex-row items-center justify-between border border-educaro-accent/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Target className="w-48 h-48" />
            </div>
            <div className="relative z-10 flex items-start space-x-6 mb-6 md:mb-0 max-w-2xl">
              <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl flex-shrink-0">
                <ArrowRight className="w-8 h-8 text-[#ECFDF5]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#ECFDF5] uppercase tracking-widest mb-2 flex items-center">
                  <Activity className="w-4 h-4 mr-2" /> Next Best Action
                </h3>
                <h2 className="text-3xl font-bold mb-3 leading-tight">{gapsData.nextBestAction.title}</h2>
                <p className="text-[#ECFDF5] text-lg">{gapsData.nextBestAction.description}</p>
              </div>
            </div>
            <div className="relative z-10 flex-shrink-0">
              <button 
                onClick={() => handleActionClick(gapsData.nextBestAction?.actionRoute)}
                className="w-full md:w-auto px-8 py-4 bg-white text-educaro-accent rounded-xl font-bold text-lg hover:bg-educaro-icon hover:scale-105 transition-all shadow-lg hover:shadow-xl"
              >
                {gapsData.nextBestAction.actionLabel || 'Start Now'}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Recommendations List Header & Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-2xl font-bold text-educaro-primary">Action Plan</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-educaro-muted font-medium">Pathway:</span>
                <select 
                  value={selectedPathway}
                  onChange={(e) => setSelectedPathway(e.target.value as Pathway | 'ALL')}
                  className="text-sm border-educaro-border rounded-lg focus:ring-educaro-accent focus:border-educaro-accent bg-white shadow-sm"
                >
                  <option value="ALL">All Pathways</option>
                  <option value={Pathway.STUDY}>Study</option>
                  <option value={Pathway.VOCATIONAL}>Vocational</option>
                  <option value={Pathway.EMPLOYMENT}>Employment</option>
                </select>
              </div>
            </div>

            {/* Journey Progress Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-educaro-border p-6">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <h4 className="font-semibold text-educaro-primary">Journey Progress</h4>
                  <p className="text-sm text-educaro-muted">{completedCount} of {totalCount} items completed</p>
                </div>
                <span className="text-2xl font-bold text-educaro-accent">{progressPct}%</span>
              </div>
              <div className="w-full bg-[#E5E7EB] rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-educaro-accent h-3 rounded-full transition-all duration-1000" 
                  style={{ width: `${progressPct}%` }} 
                />
              </div>
            </div>

            {/* Recommendation Cards */}
            <div className="space-y-4">
              {filteredRecommendations.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-xl border border-educaro-border border-dashed">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold text-educaro-primary">You're all caught up!</h3>
                  <p className="text-educaro-muted">No pending actions for this pathway.</p>
                </div>
              ) : (
                filteredRecommendations.map((rec) => (
                  <RecommendationCard key={rec.id} recommendation={rec} />
                ))
              )}
            </div>

          </div>

          {/* Sidebar Area */}
          <div className="space-y-8">
            
            {/* Readiness Overview */}
            <div className="bg-white rounded-xl shadow-sm border border-educaro-border p-6">
              <h3 className="text-lg font-bold text-educaro-primary mb-6">Readiness Overview</h3>
              <div className="space-y-6">
                {gapsData?.readinessScores?.map((score) => {
                  let colorClass = 'bg-[#6B7280]';
                  if (score.status === 'EXCELLENT') colorClass = 'bg-green-500';
                  if (score.status === 'ON_TRACK') colorClass = 'bg-green-400';
                  if (score.status === 'ATTENTION_NEEDED') colorClass = 'bg-yellow-500';
                  if (score.status === 'ACTION_REQUIRED') colorClass = 'bg-educaro-icon0';

                  return (
                    <div key={score.category} className="group">
                      <div className="flex justify-between text-sm font-semibold mb-2">
                        <span className="text-educaro-primary capitalize">{score.category.toLowerCase()}</span>
                        <span className="text-educaro-primary">{score.scorePct}%</span>
                      </div>
                      <div className="w-full bg-[#E5E7EB] rounded-full h-2 mb-2">
                        <div className={`h-2 rounded-full transition-all ${colorClass}`} style={{ width: `${score.scorePct}%` }} />
                      </div>
                      <p className="text-xs text-educaro-muted leading-relaxed bg-educaro-secondary p-2 rounded border border-educaro-border">
                        {score.reason}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Gap Analysis Groups */}
            <div className="bg-white rounded-xl shadow-sm border border-educaro-border p-6">
              <h3 className="text-lg font-bold text-educaro-primary mb-4">AI Gap Analysis</h3>
              <div className="space-y-3">
                {Object.entries(gapsData?.groupedRecommendations || {}).map(([key, list]) => {
                  if (!list || list.length === 0) return null;
                  return (
                    <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-educaro-secondary border border-educaro-border">
                      <span className="text-sm font-medium text-educaro-muted capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E5E7EB] text-educaro-primary">
                        {list.length} gap{list.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

