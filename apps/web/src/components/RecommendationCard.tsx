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

  const priorityColors = isRequired 
    ? 'border-l-[#15803D] bg-educaro-icon text-educaro-accent' 
    : isImportant 
      ? 'border-l-yellow-400 bg-yellow-50 text-yellow-800' 
      : 'border-l-blue-400 bg-educaro-icon text-educaro-accent';

  const handleAction = () => {
    if (recommendation.actionRoute) {
      navigate(recommendation.actionRoute);
    }
  };

  const handleAskAI = () => {
    navigate(`/journey/chat?context=${encodeURIComponent(recommendation.title)}&recId=${recommendation.id}`);
  };

  return (
    <div className={`relative bg-white rounded-xl shadow-sm border border-educaro-border overflow-hidden flex flex-col transition-shadow hover:shadow-md border-l-4 ${priorityColors.split(' ')[0]}`}>
      <div className="p-5 flex-1">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors.split(' ').slice(1).join(' ')}`}>
              {recommendation.priority}
            </span>
            <span className="text-xs text-educaro-muted uppercase tracking-wider font-semibold">
              {recommendation.type.replace('_', ' ')}
            </span>
          </div>
          {recommendation.status === 'completed' && (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          )}
        </div>
        
        <h4 className="text-lg font-semibold text-educaro-primary mb-1">{recommendation.title}</h4>
        <p className="text-sm text-educaro-muted mb-4">{recommendation.description}</p>

        {showWhy && recommendation.whyExplanation && (
          <div className="mb-4 p-3 bg-educaro-icon border border-educaro-accent/20 rounded-lg text-sm text-educaro-accent flex items-start">
            <ShieldCheck className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5 text-educaro-accent" />
            <p>{recommendation.whyExplanation}</p>
          </div>
        )}

        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setShowWhy(!showWhy)}
            className="text-sm font-medium text-educaro-accent hover:text-educaro-accent flex items-center"
          >
            <Info className="w-4 h-4 mr-1" />
            {showWhy ? 'Hide explanation' : 'Why this recommendation?'}
          </button>
        </div>
      </div>

      <div className="bg-educaro-secondary px-5 py-3 border-t border-educaro-border flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={handleAskAI}
          className="inline-flex items-center px-3 py-1.5 border border-educaro-border shadow-sm text-sm font-medium rounded-md text-educaro-muted bg-white hover:bg-educaro-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-educaro-accent"
        >
          <MessageSquare className="w-4 h-4 mr-2 text-educaro-muted" />
          Ask AI
        </button>
        
        <button
          onClick={handleAction}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-educaro-accent hover:bg-educaro-accentHover shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-educaro-accent"
        >
          {recommendation.actionLabel || 'Take Action'}
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
};
