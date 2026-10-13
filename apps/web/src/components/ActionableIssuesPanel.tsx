import React, { useState, useEffect } from 'react';
import { RecommendationCard } from './RecommendationCard';
import { useJourney } from '../context/JourneyContext';
import { useAuth } from '../context/AuthContext';
import { GapAnalysisResponse, RecommendationItem, Pathway, Provenance, DiscrepancyItem } from '@educaro/shared';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';

export const ActionableIssuesPanel: React.FC = () => {
  const { token } = useAuth();
  const { inconsistencies } = useJourney();
  const [gapsData, setGapsData] = useState<GapAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGaps = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/recommendations/gaps', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setGapsData(data);
        }
      } catch (err) {
        console.error('Failed to load gap analysis:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGaps();
  }, [token]);

  if (loading) {
    return <div className="p-8 flex flex-col items-center justify-center animate-in fade-in duration-500"><div className="w-6 h-6 border-2 border-educaro-accent border-t-transparent rounded-full animate-spin mb-3"></div><span className="text-xs text-educaro-muted">Analyzing profile readiness...</span></div>;
  }

  // 1. MISSING Information (From Gap Analysis Engine)
  const missingItems = gapsData ? [
    ...(gapsData.groupedRecommendations.missingInfo || []),
    ...(gapsData.groupedRecommendations.documents || []),
    // Include REQUIRED and IMPORTANT items to show critical missing fields
  ].filter(item => (item.priority === 'REQUIRED' || item.priority === 'IMPORTANT') && item.status !== 'completed') : [];

  // 2. INCORRECT / CONFLICTING Information (From Consistency Engine)
  const discrepancyItemsAsRecs: RecommendationItem[] = (inconsistencies || []).filter(inc => !inc.isResolved).map((inc: DiscrepancyItem) => {
    return {
      id: inc.id,
      userId: 'current',
      type: 'CONFLICT' as any, // Cast to bypass TS enum
      priority: inc.severity === 'CRITICAL' ? 'REQUIRED' : 'IMPORTANT',
      title: `Data Conflict: ${inc.fieldLabel}`,
      description: inc.clarifyingQuestion,
      status: 'pending',
      pathwayContext: Pathway.STUDY,
      actionRoute: '/journey/documents', // Documents page handles inconsistency modal popups
      actionLabel: 'Resolve Conflict',
      whyExplanation: `${inc.sourceA.sourceName} states "${inc.sourceA.value}", while ${inc.sourceB.sourceName} states "${inc.sourceB.value}".`,
      whyProvenance: Provenance.AI_EXTRACTED,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  if (missingItems.length === 0 && discrepancyItemsAsRecs.length === 0) {
    return null; // Don't render the panel if there are no actionable blocking issues
  }

  return (
    <div className="w-full space-y-6 mb-8">
      
      {missingItems.length > 0 && (
        <div className="bg-educaro-secondary border border-educaro-accent/20 rounded-2xl overflow-hidden shadow-xs">
          <div className="bg-educaro-icon px-4 py-3 border-b border-educaro-accent/20 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wide">⚠️ Missing Information</h3>
          </div>
          <div className="p-4 bg-white grid grid-cols-1 md:grid-cols-2 gap-4">
            {missingItems.map(item => (
              <RecommendationCard key={item.id} recommendation={item} />
            ))}
          </div>
        </div>
      )}

      {discrepancyItemsAsRecs.length > 0 && (
        <div className="bg-educaro-secondary border border-educaro-accent/20 rounded-2xl overflow-hidden shadow-xs">
          <div className="bg-educaro-icon px-4 py-3 border-b border-educaro-accent/20 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <h3 className="text-sm font-bold text-rose-900 uppercase tracking-wide">🔴 Incorrect / Conflicting Information</h3>
          </div>
          <div className="p-4 bg-white grid grid-cols-1 md:grid-cols-2 gap-4">
            {discrepancyItemsAsRecs.map(item => (
              <RecommendationCard key={item.id} recommendation={item} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

