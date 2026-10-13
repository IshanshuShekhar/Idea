import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RecommendationItem } from '@educaro/shared';
import { AlertCircle, CheckCircle2, ChevronRight, Info, MessageSquare, ShieldCheck } from 'lucide-react';

interface Props {
  recommendation: RecommendationItem;
  onStatusChange?: (id: string, newStatus: string) => void;
}

export const RecommendationCard: React.FC<Props> = ({ recommendation, onStatusChange }) => {
  const navigate = useNavigate();
  const [showWhy, setShowWhy] = useState(false);

  const isRequired = recommendation.priority === 'REQUIRED';
  const isImportant = recommendation.priority === 'IMPORTANT';

  const priorityBadge = isRequired 
    ? 'badge-soft' 
    : isImportant 
      ? 'badge-warning' 
      : 'bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full text-xs font-semibold';

  const borderLeft = isRequired ? 'border-l-emerald-600' : isImportant ? 'border-l-amber-500' : 'border-l-blue-500';

  const handleAction = () => {
    if (recommendation.actionRoute) {
      navigate(recommendation.actionRoute);
    }
  };

  const handleAskAI = () => {
    navigate(`/consultant?context=${encodeURIComponent(recommendation.title)}&recId=${recommendation.id}`);
  };

  return (
    <div className={`relative bg-white rounded-xl shadow-sm border border-border overflow-hidden flex flex-col transition-shadow hover:shadow-md border-l-4 ${borderLeft}`}>
      <div className="p-5 flex-1">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className={priorityBadge}>
              {recommendation.priority}
            </span>
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
              {recommendation.type.replace('_', ' ')}
            </span>
          </div>
          {recommendation.status === 'completed' && (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          )}
        </div>
        
        <h4 className="text-lg font-semibold text-gray-900 mb-1">{recommendation.title}</h4>
        <p className="text-sm text-gray-600 mb-4">{recommendation.description}</p>

        {showWhy && recommendation.whyExplanation && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-start">
            <ShieldCheck className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5 text-emerald-600" />
            <p>{recommendation.whyExplanation}</p>
          </div>
        )}

        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setShowWhy(!showWhy)}
            className="text-sm font-medium text-emerald-700 hover:text-emerald-800 flex items-center"
          >
            <Info className="w-4 h-4 mr-1" />
            {showWhy ? 'Hide explanation' : 'Why this recommendation?'}
          </button>
        </div>
      </div>

      <div className="bg-gray-50 px-5 py-3 border-t border-border flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={handleAskAI}
          className="inline-flex items-center px-3 py-1.5 border border-border shadow-xs text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-100 focus:outline-none"
        >
          <MessageSquare className="w-4 h-4 mr-2 text-gray-500" />
          Ask AI
        </button>
        
        <button
          onClick={handleAction}
          className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg btn-brand text-white shadow-xs"
        >
          {recommendation.actionLabel || 'Take Action'}
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
};
