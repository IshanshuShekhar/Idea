import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useJourney } from '../context/JourneyContext';
import { ArrowRight, Compass, ShieldCheck, Mail, Sparkles } from 'lucide-react';

export const FloatingJourneyCard: React.FC = () => {
  const { user } = useAuth();
  const { journeyState } = useJourney();
  const navigate = useNavigate();
  const [emailInput, setEmailInput] = useState('');

  const completeness = journeyState?.profileCompletenessPct ?? (user ? 45 : 82);
  const nextActionTitle = journeyState?.nextBestAction?.title ?? (user ? 'Upload your German language certificate' : 'Upload your German language certificate');
  const nextActionDescription = journeyState?.nextBestAction?.description ?? 'Complete your language credentials to unlock official state university matching.';
  const targetRoute = journeyState?.nextBestAction?.targetRoute ?? '/journey/goal';

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      navigate(targetRoute);
    } else {
      const q = emailInput ? `&email=${encodeURIComponent(emailInput)}` : '';
      navigate(`/auth?mode=signup${q}`);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -5, rotateX: 2, rotateY: -2, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="relative w-full max-w-md mx-auto lg:max-w-none bg-[#0a0a0a]/80 backdrop-blur-3xl rounded-3xl border border-white/10 p-6 shadow-[0_0_40px_rgba(0,0,0,0.8)] text-white transition-all duration-300 hover:border-white/30"
    >
      
      {/* Top Tag & Header */}
      <div className="flex items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 block mb-1">
              Active Roadmap
            </span>
            <h3 className="text-sm font-display font-medium text-white tracking-widest">YOUR GERMANY JOURNEY</h3>
          </div>
        </div>
        <span className="text-[10px] font-medium px-3 py-1 rounded-full bg-white/10 text-white border border-white/20 uppercase tracking-widest">
          Interactive
        </span>
      </div>

      {/* Profile Completeness Bar */}
      <div className="space-y-2 mb-6 bg-white/5 p-4 rounded-2xl border border-white/10">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-widest">
          <span className="font-light text-gray-400">Profile completeness</span>
          <span className="font-bold text-white">{completeness}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-gray-800 overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${completeness}%` }}
          />
        </div>
      </div>

      {/* Next Best Action Card */}
      <div className="p-5 rounded-2xl bg-white/5 border border-white/10 mb-6">
        <div className="flex items-center gap-2 text-[10px] font-medium text-gray-400 uppercase tracking-[0.2em] mb-3">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span>NEXT BEST ACTION</span>
        </div>
        <p className="text-sm font-medium text-white mb-1.5">{nextActionTitle}</p>
        <p className="text-[11px] text-gray-400 leading-relaxed font-light">
          {nextActionDescription}
        </p>
      </div>

      {/* CTA / Email Capture */}
      {user ? (
        <button
          onClick={() => navigate(targetRoute)}
          className="w-full inline-flex items-center justify-between py-3.5 px-6 rounded-full bg-white text-black hover:bg-gray-200 text-sm font-medium shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-300"
        >
          <span>Continue Journey</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      ) : (
        <form onSubmit={handleStart} className="space-y-4">
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="email"
              required
              placeholder="Enter your email to begin..."
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-full border border-white/10 bg-white/5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-white transition-all duration-300"
            />
          </div>
          <button
            type="submit"
            className="w-full inline-flex items-center justify-between py-3.5 px-6 rounded-full bg-white text-black hover:bg-gray-200 text-sm font-medium shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-300"
          >
            <span>Initialize Profile</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Trust note */}
      <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[10px] text-gray-500 uppercase tracking-widest font-light">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-white" />
          Encrypted Data
        </span>
        <span>AI Assessment</span>
      </div>

    </motion.div>
  );
};
