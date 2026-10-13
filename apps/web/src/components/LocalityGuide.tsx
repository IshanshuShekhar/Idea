import React, { useMemo } from 'react';
import { useJourney } from '../context/JourneyContext';
import { MapPin, Home, Train, Info } from 'lucide-react';
import localitiesData from '../data/localities.json';

export const LocalityGuide: React.FC = () => {
  const { profileFields } = useJourney();

  // Extract target city or university location
  const targetCity = (profileFields['target_city']?.value || profileFields['university']?.value || '').toLowerCase();

  const matchedCity = useMemo(() => {
    if (!targetCity) return null;
    
    // Find the first city whose matchKeywords overlap with the user's targetCity string
    return localitiesData.find(city => 
      city.matchKeywords.some(keyword => targetCity.includes(keyword))
    );
  }, [targetCity]);

  if (!matchedCity) {
    return null; // Don't show if we don't have a recognized city match
  }

  return (
    <div className="mt-8 bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-brand" />
            Your City Guide: {matchedCity.name}
          </h2>
          <p className="text-sm text-gray-600 mt-1 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-brand" />
            General guidance only. Costs and details are approximate.
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-700 leading-relaxed mb-6">
        {matchedCity.overview}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gray-50 p-4 rounded-2xl border border-border">
          <div className="flex items-center gap-2 mb-2 text-gray-900">
            <span className="font-bold text-sm">~ Cost of Living</span>
          </div>
          <p className="text-xs text-gray-600">{matchedCity.costOfLiving}</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-2xl border border-border">
          <div className="flex items-center gap-2 mb-2 text-gray-900">
            <Home className="w-4 h-4 text-brand" />
            <span className="font-bold text-sm">Housing Platforms</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {matchedCity.studentHousingPlatforms.map((platform, idx) => (
              <span key={idx} className="bg-white border border-border text-[10px] font-semibold text-brand px-2 py-1 rounded-md">
                {platform}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-2xl border border-border md:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-2 text-gray-900">
            <Train className="w-4 h-4 text-brand" />
            <span className="font-bold text-sm">Transport</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            {matchedCity.publicTransportNote}
          </p>
        </div>
      </div>
    </div>
  );
};
