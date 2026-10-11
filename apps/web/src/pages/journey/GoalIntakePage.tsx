import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { StepHeader } from '../../components/StepHeader';
import { AgentTracePanel } from '../../components/AgentTracePanel';
import { useAuth } from '../../context/AuthContext';
import { useJourney } from '../../context/JourneyContext';
import { Pathway } from '@educaro/shared';
import { GraduationCap, Wrench, Briefcase, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';

export const GoalIntakePage: React.FC = () => {
  const { user, token } = useAuth();
  const { profileFields, refreshJourney } = useJourney();
  const navigate = useNavigate();
  const [selectedPathway, setSelectedPathway] = useState<Pathway>(Pathway.STUDY);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTraceOpen, setIsTraceOpen] = useState(false);

  React.useEffect(() => {
    const saved = profileFields['targetPathway']?.value;
    if (saved) {
      if (saved.toUpperCase().includes('AUSBILDUNG') || saved.toUpperCase().includes('VOCATIONAL')) {
        setSelectedPathway(Pathway.AUSBILDUNG);
      } else if (saved.toUpperCase().includes('EMPLOYMENT') || saved.toUpperCase().includes('JOB')) {
        setSelectedPathway(Pathway.EMPLOYMENT);
      } else {
        setSelectedPathway(Pathway.STUDY);
      }
    }
  }, [profileFields]);

  const pathways = [
    {
      id: Pathway.STUDY,
      title: 'University Study (Master’s / Bachelor’s)',
      subtitle: 'Higher Education in Germany',
      description: 'Pursue state-accredited Bachelor or Master degree programs at German public universities. Low to zero tuition fees with high research standards.',
      icon: GraduationCap,
      highlights: ['Direct admission with recognized degree', 'English & German taught programs', '18-month post-study work visa'],
      minGerman: 'English C1 or German B2/C1',
    },
    {
      id: Pathway.AUSBILDUNG,
      title: 'Dual Vocational Training (Ausbildung)',
      subtitle: 'Paid Apprenticeship + Classroom Training',
      description: 'Combine hands-on paid company training with vocational schooling in IT, Nursing, Mechatronics, or Hotel Management. Earn a monthly stipend from Day 1.',
      icon: Wrench,
      highlights: ['Earn ~€950–€1,400 monthly stipend', 'Guaranteed employer placement', 'Full residency qualification'],
      minGerman: 'Minimum German B1 required',
    },
    {
      id: Pathway.EMPLOYMENT,
      title: 'Direct Employment / EU Blue Card',
      subtitle: 'Skilled Work & Opportunity Card',
      description: 'For experienced Indian graduates looking for direct tech, engineering, healthcare, or shortage occupation positions with German employers.',
      icon: Briefcase,
      highlights: ['EU Blue Card fast-track to PR in 21 months', 'Chancenkarte points system', 'Family reunification rights'],
      minGerman: 'German A2–B1 or English C1',
    },
  ];

  const handleContinue = async () => {
    setIsSubmitting(true);
    try {
      if (token) {
        await fetch('/api/intake/message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            step: 'GOAL',
            message: selectedPathway,
            language: 'en',
          }),
        });
        await refreshJourney();
      }
      navigate('/journey/details');
    } catch (err) {
      console.error('Failed to save pathway goal:', err);
      navigate('/journey/details');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-educaro-main flex flex-col text-educaro-primary">
      <Navbar onToggleTracePanel={() => setIsTraceOpen(!isTraceOpen)} isTraceOpen={isTraceOpen} />
      
      <StepHeader
        currentStepIndex={3}
        totalSteps={12}
        stepTitle="Pathway Selection"
        stepSubtitle="Select your target pathway to Germany to tailor your requirements."
        nextRoute="/journey/details"
        onContinue={handleContinue}
        continueLabel={isSubmitting ? 'Saving Goal...' : 'Continue to Profile Details →'}
      />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        
        {/* Intro */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-educaro-icon text-educaro-accent border border-educaro-border text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Step 1: Define Your Pathway</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-educaro-primary tracking-tight">
            What is your primary goal in Germany?
          </h2>
          <p className="text-xs sm:text-sm text-educaro-muted mt-2">
            Educaro provides specialized immigration guidance, university matching, and dual employer contracts across three pathways.
          </p>
        </div>

        {/* Pathway Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 relative z-10">
          {pathways.map((item) => {
            const isSelected = selectedPathway === item.id;
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedPathway(item.id)}
                className={`relative rounded-3xl p-[1px] flex flex-col justify-between cursor-pointer transition-all duration-500 overflow-hidden ${
                  isSelected
                    ? 'shadow-[0_0_40px_rgba(255,255,255,0.1)] transform -translate-y-2'
                    : 'hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:-translate-y-1'
                }`}
              >
                {/* Animated glowing border effect */}
                <div className={`absolute inset-0 transition-opacity duration-500 ${isSelected ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="absolute inset-[-50%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#000000_0%,#ffffff_50%,#000000_100%)] opacity-30" />
                </div>
                
                <div className={`relative h-full rounded-[23px] p-6 flex flex-col justify-between transition-colors duration-500 ${
                  isSelected ? 'bg-[#0a0a0a]' : 'bg-[#121212]'
                }`}>
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold transition-all duration-500 ${
                        isSelected ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.5)]' : 'bg-white/5 text-[#888888] border border-white/10'
                      }`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                        isSelected ? 'border-white bg-white' : 'border-white/20'
                      }`}>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-black" />}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold uppercase tracking-wider text-educaro-accent block mb-1">
                    {item.subtitle}
                  </span>
                  <h3 className="text-base font-bold text-educaro-primary leading-snug mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-educaro-muted leading-relaxed mb-4">
                    {item.description}
                  </p>

                  <div className="space-y-1.5 pt-3 border-t border-educaro-border">
                    {item.highlights.map((hl, i) => (
                      <div key={i} className="text-[11px] text-educaro-primary flex items-center gap-1.5">
                        <span className="text-educaro-accent font-bold">✓</span>
                        <span>{hl}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-educaro-border flex items-center justify-between text-[11px]">
                  <span className="text-educaro-muted">Language:</span>
                  <span className="font-semibold text-educaro-primary">{item.minGerman}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="bg-educaro-secondary rounded-2xl border border-educaro-border p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-educaro-primary">Selected Pathway: {selectedPathway}</h4>
            <p className="text-xs text-educaro-muted mt-0.5">
              Next: Our Intake Agent will collect your personal details, degree, and skills through an interactive chat.
            </p>
          </div>
          <button
            onClick={handleContinue}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-educaro-accent hover:bg-educaro-accentHover text-black text-xs sm:text-sm font-semibold shadow-xs transition-colors shrink-0"
          >
            <span>{isSubmitting ? 'Saving Goal...' : 'Continue to Profile Chat →'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </main>

      <AgentTracePanel isOpen={isTraceOpen} onClose={() => setIsTraceOpen(false)} />
    </div>
  );
};
