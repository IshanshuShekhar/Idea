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
        await fetch('/api/profile/field', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            category: 'GOAL',
            fieldKey: 'targetPathway',
            value: selectedPathway,
            provenance: 'APPLICANT_PROVIDED',
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
    <div className="min-h-screen bg-educaro-secondary flex flex-col text-gray-900">
      <Navbar onToggleTracePanel={() => setIsTraceOpen(!isTraceOpen)} isTraceOpen={isTraceOpen} />
      
      <StepHeader
        currentStepIndex={3}
        totalSteps={12}
        stepTitle="Pathway Selection"
        stepSubtitle="Select your target pathway to Germany to tailor your requirements."
        nextRoute="/journey/details"
        onContinue={handleContinue}
        continueLabel={isSubmitting ? 'Saving Goal...' : 'Continue to Applicant Profile →'}
      />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        
        {/* Intro */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full badge-soft text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Step 1: Define Your Pathway</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            What is your primary goal in Germany?
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-2">
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
                className={`relative rounded-3xl p-[1px] flex flex-col justify-between cursor-pointer transition-all duration-300 overflow-hidden ${
                  isSelected
                    ? 'shadow-md transform -translate-y-1'
                    : 'hover:shadow-sm hover:-translate-y-0.5'
                }`}
              >
                <div className={`relative h-full rounded-[23px] p-6 flex flex-col justify-between transition-colors duration-300 border ${
                  isSelected ? 'bg-white border-brand ring-2 ring-brand/20' : 'bg-white border-border hover:border-brand/40'
                }`}>
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold transition-all duration-300 ${
                        isSelected ? 'bg-brand text-white shadow-brand' : 'bg-gray-100 text-gray-600 border border-border'
                      }`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                        isSelected ? 'border-brand bg-brand' : 'border-gray-300'
                      }`}>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                    {item.subtitle}
                  </span>
                  <h3 className="text-base font-bold text-gray-900 leading-snug mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed mb-4">
                    {item.description}
                  </p>

                  <div className="space-y-1.5 pt-3 border-t border-border">
                    {item.highlights.map((hl, i) => (
                      <div key={i} className="text-[11px] text-gray-800 flex items-center gap-1.5">
                        <span className="text-brand font-bold">✓</span>
                        <span>{hl}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-3 border-t border-border flex items-center justify-between text-[11px]">
                    <span className="text-gray-500">Language:</span>
                    <span className="font-semibold text-gray-900">{item.minGerman}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="bg-white rounded-2xl border border-border p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div>
            <h4 className="text-sm font-bold text-gray-900">Selected Pathway: {selectedPathway}</h4>
            <p className="text-xs text-gray-600 mt-0.5">
              Next: Complete your comprehensive applicant profile with personal details, qualifications, and preferences.
            </p>
          </div>
          <button
            onClick={handleContinue}
            disabled={isSubmitting}
            className="btn-brand text-white text-xs sm:text-sm shrink-0 inline-flex items-center gap-2"
          >
            <span>{isSubmitting ? 'Saving Goal...' : 'Continue to Applicant Profile →'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </main>

      <AgentTracePanel isOpen={isTraceOpen} onClose={() => setIsTraceOpen(false)} />
    </div>
  );
};
