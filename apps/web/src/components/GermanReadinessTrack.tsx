import React, { useState } from 'react';
import { GermanReadinessTrack as GermanTrackType } from '@educaro/shared';
import { BookOpen, Clock, PlayCircle, ExternalLink, Sparkles, CheckCircle2 } from 'lucide-react';

interface GermanReadinessTrackProps {
  track: GermanTrackType;
}

export const GermanReadinessTrack: React.FC<GermanReadinessTrackProps> = ({ track }) => {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  return (
    <div className="bg-educaro-main rounded-2xl border border-educaro-border p-6 shadow-xs">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-educaro-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-educaro-accent text-xs font-semibold">
              Learning-Readiness Path
            </span>
            <span className="text-xs text-educaro-muted">No Disqualification</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-educaro-primary">
            {track.readinessHeadline}
          </h3>
          <p className="text-xs text-educaro-muted mt-0.5">
            Curated preparation path designed specifically for Indian applicants pursuing Germany.
          </p>
        </div>

        {/* Readiness Pill */}
        <div className="bg-educaro-main p-3 rounded-xl border border-educaro-border flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-lg bg-educaro-accent text-black flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-educaro-muted block">
              Estimated Readiness
            </span>
            <span className="text-sm font-extrabold text-educaro-primary">
              ~{track.estimatedMonthsToTarget} Months
            </span>
            <span className="text-[10px] text-educaro-accent block">at 10-12 hrs/week</span>
          </div>
        </div>
      </div>

      {/* Embedded Video Player Modal or In-line Preview */}
      {activeVideo && (
        <div className="mb-6 p-4 bg-educaro-main rounded-2xl border border-educaro-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-educaro-primary">Video Tutorial Preview</span>
            <button
              onClick={() => setActiveVideo(null)}
              className="text-xs text-educaro-muted hover:text-educaro-primary"
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
            className="bg-educaro-main rounded-xl border border-educaro-border p-4 flex flex-col justify-between hover:border-educaro-accent transition-all shadow-xs"
          >
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold px-2 py-0.5 rounded-full bg-educaro-icon text-educaro-accent">
                  {mod.level}
                </span>
                <span className="text-educaro-muted font-mono text-[11px] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {mod.duration}
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-educaro-primary leading-snug mb-1">
                {mod.title}
              </h4>
              <p className="text-[11px] text-educaro-muted leading-relaxed">
                {mod.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-educaro-border/60 flex items-center justify-between">
              <button
                onClick={() => setActiveVideo(mod.videoUrl)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-educaro-accent hover:text-educaro-accentHover"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Watch Lesson</span>
              </button>
              <span className="text-[10px] text-educaro-muted">Free Module</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 p-3.5 bg-educaro-icon rounded-xl border border-educaro-border text-xs text-educaro-primary flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-educaro-accent shrink-0" />
        <span>
          <strong>Educaro Promise:</strong> You are not disqualified due to beginner German. Completing these modules unlocks our partner university intake matching.
        </span>
      </div>

    </div>
  );
};
