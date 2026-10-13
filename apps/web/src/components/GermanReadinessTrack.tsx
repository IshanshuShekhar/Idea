import React, { useState } from 'react';
import { GermanReadinessTrack as GermanTrackType } from '@educaro/shared';
import { BookOpen, Clock, PlayCircle, ExternalLink, Sparkles, CheckCircle2 } from 'lucide-react';

interface GermanReadinessTrackProps {
  track: GermanTrackType;
}

export const GermanReadinessTrack: React.FC<GermanReadinessTrackProps> = ({ track }) => {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-2xl border border-border p-6 shadow-xs">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge-soft">
              Learning-Readiness Path
            </span>
            <span className="text-xs text-gray-500">No Disqualification</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900">
            {track.readinessHeadline}
          </h3>
          <p className="text-xs text-gray-600 mt-0.5">
            Curated preparation path designed specifically for Indian applicants pursuing Germany.
          </p>
        </div>

        {/* Readiness Pill */}
        <div className="bg-gray-50 p-3 rounded-xl border border-border flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-lg btn-brand text-white flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
              Estimated Readiness
            </span>
            <span className="text-sm font-extrabold text-gray-900">
              ~{track.estimatedMonthsToTarget} Months
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold block">at 10-12 hrs/week</span>
          </div>
        </div>
      </div>

      {/* Embedded Video Player Modal or In-line Preview */}
      {activeVideo && (
        <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-900">Video Tutorial Preview</span>
            <button
              onClick={() => setActiveVideo(null)}
              className="text-xs text-gray-500 hover:text-gray-900 font-medium"
            >
              Close Video ✕
            </button>
          </div>
          <div className="aspect-video w-full rounded-xl overflow-hidden bg-black/90">
            <iframe
              src={activeVideo}
              title="Educaro German Learning Track"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Tutorial Video Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {track.tutorialModules.map((mod) => (
          <div
            key={mod.id}
            className="bg-gray-50 rounded-xl border border-border p-4 flex flex-col justify-between hover:border-brand/40 transition-all shadow-xs"
          >
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="badge-soft text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {mod.level}
                </span>
                <span className="text-gray-500 font-mono text-[11px] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {mod.duration}
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug mb-1">
                {mod.title}
              </h4>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                {mod.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
              <button
                onClick={() => setActiveVideo(mod.videoUrl)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-dark"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Watch Lesson</span>
              </button>
              <span className="text-[10px] text-gray-500">Free Module</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 p-3.5 badge-soft w-full rounded-xl border border-brand/20 text-xs flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-brand shrink-0" />
        <span>
          <strong>Educaro Promise:</strong> You are not disqualified due to beginner German. Completing these modules unlocks our partner university intake matching.
        </span>
      </div>

    </div>
  );
};
