import React, { useMemo } from 'react';
import { useJourney } from '../context/JourneyContext';
import { ExternalLink, CheckCircle2, Info, AlertCircle } from 'lucide-react';
import scholarshipsData from '../data/scholarships.json';

export const ScholarshipsFinder: React.FC = () => {
  const { profileFields } = useJourney();

  // Extract applicant details safely (case-insensitive for robust matching)
  const userPathway = (profileFields['pathway']?.value || profileFields['journey_type']?.value || '').toLowerCase();
  const userField = (profileFields['field_of_study']?.value || '').toLowerCase();
  const userNationality = (profileFields['nationality']?.value || '').toLowerCase();

  // If user is clearly on a 'work' pathway, we might skip or show a generic message
  const isWorkPathway = userPathway.includes('work') || userPathway.includes('job') || userPathway.includes('employment');

  const evaluatedScholarships = useMemo(() => {
    return scholarshipsData.map((scholarship) => {
      let isLikelyEligible = true;
      let checkRequirements = false;
      let notApplicable = false;

      // 1. Check Pathway Match
      const pwMatches = scholarship.criteria.pathways.some(
        (pw) => pw.toLowerCase() === 'all' || userPathway.includes(pw.toLowerCase())
      );
      if (!pwMatches && userPathway) {
        notApplicable = true;
      } else if (!userPathway) {
        checkRequirements = true; // Not enough info
      }

      // 2. Check Nationality Match
      const natMatches = scholarship.criteria.nationalities.some((nat) => {
        if (nat === 'ALL') return true;
        if (nat === 'DEVELOPING') {
          // Simplistic check: If not from typical developed nations, assume developing
          const developed = ['usa', 'united states', 'uk', 'united kingdom', 'canada', 'australia', 'germany', 'france'];
          return userNationality && !developed.some(d => userNationality.includes(d));
        }
        return userNationality.includes(nat.toLowerCase());
      });
      if (!natMatches && userNationality) {
        notApplicable = true;
      } else if (!userNationality && !scholarship.criteria.nationalities.includes('ALL')) {
        checkRequirements = true;
      }

      // 3. Check Field of Study
      const fieldMatches = scholarship.criteria.fieldsOfStudy.some(
        (f) => f === 'ALL' || userField.includes(f.toLowerCase())
      );
      if (!fieldMatches && userField) {
        checkRequirements = true; // Maybe eligible, but needs strict check
      } else if (!userField && !scholarship.criteria.fieldsOfStudy.includes('ALL')) {
        checkRequirements = true;
      }

      let label: 'Likely Eligible' | 'Check Requirements' | 'Not applicable to your pathway' = 'Likely Eligible';
      
      // Work pathway overrides for study-specific scholarships
      if (isWorkPathway && !scholarship.criteria.pathways.includes('ALL') && !scholarship.criteria.pathways.includes('work')) {
        notApplicable = true;
      }

      if (notApplicable) {
        label = 'Not applicable to your pathway';
      } else if (checkRequirements) {
        label = 'Check Requirements';
      }

      return {
        ...scholarship,
        label,
      };
    });
  }, [userPathway, userField, userNationality, isWorkPathway]);

  // Filter out not applicable unless we want to show everything. 
  // Let's hide the not applicable ones to save space, or just show the best matches.
  const visibleScholarships = evaluatedScholarships.filter(s => s.label !== 'Not applicable to your pathway');

  if (visibleScholarships.length === 0) {
    return null; // Don't show the section if nothing applies (e.g., pure work pathway and no work grants)
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Scholarships & Grants Finder</h2>
      <p className="text-sm text-gray-600 mb-6 leading-relaxed">
        Based on your profile, here are some curated financial aid options to support your journey to Germany. 
        These are external official programs—verify exact deadlines and requirements on their official sites.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleScholarships.map((scholarship) => (
          <div key={scholarship.id} className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">{scholarship.name}</h3>
                <span className="text-xs text-gray-600 font-medium">{scholarship.provider}</span>
              </div>
              
              {scholarship.label === 'Likely Eligible' ? (
                <span className="badge-soft shrink-0">
                  <CheckCircle2 className="w-3 h-3" />
                  Likely Eligible
                </span>
              ) : (
                <span className="badge-warning shrink-0">
                  <AlertCircle className="w-3 h-3" />
                  Check Requirements
                </span>
              )}
            </div>

            <p className="text-xs text-gray-600 mb-4 line-clamp-3 leading-relaxed">
              {scholarship.eligibilitySummary}
            </p>

            <div className="space-y-2 mb-5 flex-grow">
              <div className="flex items-start gap-2 text-xs">
                <span className="font-semibold text-gray-900 min-w-[70px]">Coverage:</span>
                <span className="text-gray-700">{scholarship.coverage}</span>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <span className="font-semibold text-gray-900 min-w-[70px]">Deadline:</span>
                <span className="text-gray-700">{scholarship.deadline}</span>
              </div>
            </div>

            <a
              href={scholarship.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl btn-ghost-brand text-xs font-semibold transition-colors"
            >
              <span>View Official Site</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

