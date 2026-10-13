import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { FloatingJourneyCard } from '../components/FloatingJourneyCard';
import { FAQSection } from '../components/FAQSection';
import { AgentTracePanel } from '../components/AgentTracePanel';
import { ThreeDBackground } from '../components/ThreeDBackground';
import { useAuth } from '../context/AuthContext';
import { useJourney } from '../context/JourneyContext';
import { getResumeRoute } from '../utils/workflow';
import { motion } from 'framer-motion';
import {
  Check,
  ArrowRight,
  BookOpen,
  Briefcase,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  FileCheck2,
  Cpu,
  Compass,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const { journeyState } = useJourney();
  const navigate = useNavigate();
  const [isTraceOpen, setIsTraceOpen] = useState(false);

  const primaryTargetRoute = user ? getResumeRoute(user, journeyState) : '/auth?mode=signup';

  return (
    <div className="min-h-screen bg-black flex flex-col text-white">
      {/* Top Navbar */}
      <Navbar onToggleTracePanel={() => setIsTraceOpen(!isTraceOpen)} isTraceOpen={isTraceOpen} />

      {/* Main Hero Section (PRD Section 9.1) */}
      <section className="relative overflow-hidden min-h-[640px] lg:min-h-[720px] flex items-center justify-center border-b border-educaro-border">
        {/* 3D Background */}
        <div className="absolute inset-0 z-0 bg-[#040112]">
          <ThreeDBackground className="w-full h-full" />
        </div>

        {/* Hero Content Container */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Hero Column */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-7 space-y-10 text-white z-10"
            >
              
              {/* Headline */}
              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-display font-light tracking-tighter leading-[0.95] text-white">
                Intelligence<br/>
                <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-white">Refined.</span>
              </h1>

              {/* Description */}
              <p className="text-lg sm:text-xl text-gray-400 max-w-xl leading-relaxed font-light tracking-wide">
                A deterministic AI applicant journey designed to connect your profile to Germany's most demanding professional environments.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-6 pt-6">
                <Link
                  to={primaryTargetRoute}
                  className="inline-flex items-center justify-center px-10 py-4 rounded-full bg-white text-black text-sm font-medium hover:bg-gray-200 hover:scale-105 transition-all duration-300"
                >
                  Start My Journey
                </Link>

                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center px-10 py-4 rounded-full bg-transparent text-white text-sm font-light border border-white/20 hover:bg-white/10 hover:border-white/40 transition-all duration-300"
                >
                  Discover Workflow
                </a>
              </div>

            </motion.div>

            {/* Right Hero Column: Floating Journey Card */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="lg:col-span-5 flex justify-center lg:justify-end"
            >
              <FloatingJourneyCard />
            </motion.div>

          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-black relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 text-gray-300 border border-white/10 text-xs font-medium uppercase tracking-[0.2em] mb-6">
              <Compass className="w-3.5 h-3.5 text-white" />
              <span>Architected for Precision</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-display font-light text-white tracking-tight mb-4">
              Agentic Intelligence. Zero Guesswork.
            </h2>
            <p className="text-base sm:text-lg text-gray-400 font-light">
              From first contact to qualified Germany profile with minimal re-entry, transparent AI provenance, and deterministic accuracy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Card 1: Goal & Conversational Intake */}
            <div className="bg-[#0a0a0a] rounded-3xl border border-white/10 p-8 shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group hover:border-white/30">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center mb-6 transition-transform group-hover:scale-110">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-display font-medium text-white mb-3">
                  1. Comprehensive Applicant Profile
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed font-light">
                  Choose between University Study (Master&apos;s/Bachelor&apos;s), Dual Vocational Training, or Direct Employment. Record your credentials once in a unified, verified profile.
                </p>
              </div>
              <div className="mt-8 pt-6 border-t border-white/10 text-[11px] font-medium text-white uppercase tracking-widest flex items-center gap-2">
                <span>Applicant Profile Active</span>
                <Check className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Card 2: Document Intelligence */}
            <div className="bg-[#0a0a0a] rounded-3xl border border-white/10 p-8 shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group hover:border-white/30">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center mb-6 transition-transform group-hover:scale-110">
                  <FileCheck2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-display font-medium text-white mb-3">
                  2. Document Analysis
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed font-light">
                  Upload degree certificates and language test scores. Extraction Agent pulls critical fields side-by-side with confidence scores, catching mismatched dates immediately.
                </p>
              </div>
              <div className="mt-8 pt-6 border-t border-white/10 text-[11px] font-medium text-white uppercase tracking-widest flex items-center gap-2">
                <span>Extraction Active</span>
                <Check className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Card 3: Deterministic Qualification */}
            <div className="bg-[#0a0a0a] rounded-3xl border border-white/10 p-8 shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group hover:border-white/30">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center mb-6 transition-transform group-hover:scale-110">
                  <Cpu className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-display font-medium text-white mb-3">
                  3. Qualification & CV
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed font-light">
                  Deterministic rules assess eligibility without guesswork. Generate your German DIN-standard Lebenslauf CV, and connect directly with official advisors.
                </p>
              </div>
              <div className="mt-8 pt-6 border-t border-white/10 text-[11px] font-medium text-white uppercase tracking-widest flex items-center gap-2">
                <span>Qualification Active</span>
                <Check className="w-3.5 h-3.5" />
              </div>
            </div>

          </div>

          {/* Quick CTA Banner */}
          <div className="mt-20 bg-white/5 rounded-[2.5rem] border border-white/10 p-12 text-center max-w-4xl mx-auto shadow-2xl backdrop-blur-md">
            <h3 className="text-3xl sm:text-4xl font-display font-light text-white mb-4 tracking-tight">
              Ready to initialize your profile?
            </h3>
            <p className="text-base text-gray-400 mb-8 font-light max-w-xl mx-auto">
              Create an account or login securely. No consultant fees required to build your verified profile.
            </p>
            <Link
              to={primaryTargetRoute}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white hover:bg-gray-200 active:scale-95 text-black text-sm font-medium transition-all duration-300"
            >
              <span>{user ? 'Enter Your Journey' : 'Secure Login'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>

      {/* Section 10 FAQ Accordion */}
      <FAQSection />

      {/* Footer */}
      <footer className="bg-[#020202] border-t border-white/10 py-12 text-center text-xs text-gray-500 font-light tracking-wide">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="font-medium text-white tracking-widest uppercase">EduRoute AI</span>
            <span className="w-1 h-1 rounded-full bg-gray-700" />
            <span>Educaro Deutschland GmbH</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#faq" className="hover:text-white transition-colors duration-300">FAQ</a>
            <Link to={user ? primaryTargetRoute : '/journey/details'} className="hover:text-white transition-colors duration-300">Journey</Link>
            <Link to="/journey/details" className="hover:text-white transition-colors duration-300">Profile</Link>
          </div>
        </div>
      </footer>

      {/* Slide-out Agent Trace Panel */}
      <AgentTracePanel isOpen={isTraceOpen} onClose={() => setIsTraceOpen(false)} />
    </div>
  );
};
