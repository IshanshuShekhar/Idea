import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { StepHeader } from '../../components/StepHeader';
import { ProvenanceBadge } from '../../components/ProvenanceBadge';
import { AgentTracePanel } from '../../components/AgentTracePanel';
import { useAuth } from '../../context/AuthContext';
import { GermanCV, Provenance } from '@educaro/shared';
import { FileText, Download, Printer, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

export const CvPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [cv, setCv] = useState<GermanCV | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTraceOpen, setIsTraceOpen] = useState(false);

  useEffect(() => {
    const fetchCv = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/cv/generate', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCv(data);
        }
      } catch (err) {
        console.error('Failed to load CV:', err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchCv();
  }, [token]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-educaro-main flex flex-col text-educaro-primary">
      <Navbar onToggleTracePanel={() => setIsTraceOpen(!isTraceOpen)} isTraceOpen={isTraceOpen} />

      <StepHeader
        currentStepIndex={7}
        totalSteps={8}
        stepTitle="German CV Generation"
        stepSubtitle="Auto-generate a DIN-compliant German resume from your verified profile."
        backRoute="/candidate-details"
        nextRoute="/journey/next-steps"
        continueLabel="Continue to Premium →"
      />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        
        {/* Controls Bar */}
        <div className="bg-educaro-main rounded-2xl border border-educaro-border p-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-educaro-primary">German Standard DIN 5008 CV</span>
            <ProvenanceBadge provenance={Provenance.AI_GENERATED} sourceText="Compiled by CV Generation Agent" />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-educaro-main hover:bg-educaro-secondary text-xs font-semibold text-educaro-primary border border-educaro-border transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>

        {loading || !cv ? (
          <div className="bg-educaro-main rounded-3xl border border-educaro-border p-12 text-center">
            <Sparkles className="w-8 h-8 text-educaro-accent animate-spin mx-auto mb-3" />
            <h3 className="text-sm font-bold text-educaro-primary">CV Generation Agent Compiling Lebenslauf...</h3>
            <p className="text-xs text-educaro-muted mt-1">Formulating career objectives and mapping verified credentials</p>
          </div>
        ) : (
          /* Formatted German CV Card */
          <div className="bg-white rounded-3xl border border-educaro-border p-8 sm:p-12 shadow-sm text-educaro-primary font-sans print:border-none print:shadow-none print:p-0">
            
            {/* CV Header */}
            <div className="border-b-2 border-educaro-accent pb-6 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-educaro-primary tracking-tight">
                    {cv.header.fullName}
                  </h1>
                  <ProvenanceBadge provenance={cv.header.provenance} />
                </div>
                <p className="text-sm font-bold text-educaro-accent">{cv.header.targetRoleOrDegree}</p>
                <p className="text-xs text-educaro-muted mt-1">
                  {cv.header.location} • {cv.header.email} • {cv.header.phone}
                </p>
              </div>

              <div className="text-right text-[11px] text-educaro-muted">
                <span className="font-bold text-educaro-primary block">LEBENSLAUF</span>
                <span>Stand: {new Date().toLocaleDateString('de-DE')}</span>
              </div>
            </div>

            {/* Professional Summary */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-educaro-accent">
                  Kurzprofil / Professional Summary
                </h2>
                <ProvenanceBadge provenance={cv.summaryProvenance} sourceText="Generated by CV Agent" />
              </div>
              <p className="text-xs sm:text-sm text-educaro-primary leading-relaxed bg-educaro-main p-4 rounded-xl border border-educaro-border">
                {cv.summaryText}
              </p>
            </div>

            {/* Education */}
            <div className="mb-8">
              <h2 className="text-xs font-bold uppercase tracking-wider text-educaro-accent mb-3">
                Ausbildung / Education
              </h2>
              <div className="space-y-4">
                {cv.education.map((edu, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-educaro-border/60 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-educaro-primary">{edu.degree}</span>
                        <ProvenanceBadge provenance={edu.provenance} />
                      </div>
                      <p className="text-xs text-educaro-muted">{edu.institution} • {edu.field}</p>
                      {edu.grade && (
                        <p className="text-xs font-medium text-educaro-accent mt-0.5">{edu.grade}</p>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-educaro-muted sm:text-right shrink-0">
                      {edu.graduationYear}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Professional Experience */}
            <div className="mb-8">
              <h2 className="text-xs font-bold uppercase tracking-wider text-educaro-accent mb-3">
                Berufserfahrung / Professional Experience
              </h2>
              <div className="space-y-4">
                {cv.experience.map((exp, idx) => (
                  <div key={idx} className="space-y-2 border-b border-educaro-border/60 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-educaro-primary">{exp.role}</span>
                        <ProvenanceBadge provenance={exp.provenance} />
                      </div>
                      <span className="text-xs text-educaro-muted sm:text-right">{exp.duration}</span>
                    </div>
                    <p className="text-xs font-semibold text-educaro-muted">{exp.company}</p>
                    <ul className="list-disc list-inside text-xs text-educaro-primary space-y-1">
                      {exp.bulletPoints.map((bp, i) => (
                        <li key={i}>{bp}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Languages (CEFR) & Skills */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-educaro-accent mb-3">
                  Sprachkenntnisse / Languages
                </h2>
                <div className="space-y-2.5">
                  {cv.languages.map((lang, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-educaro-main border border-educaro-border flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-educaro-primary">{lang.language}</span>
                        <p className="text-[11px] text-educaro-muted">{lang.level}</p>
                      </div>
                      <ProvenanceBadge provenance={lang.provenance} />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-educaro-accent mb-3">
                  Fachliche Kompetenzen / Skills
                </h2>
                <div className="flex flex-wrap gap-2">
                  {cv.skills.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full bg-educaro-icon border border-educaro-border text-xs font-medium text-educaro-primary"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Bottom Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-educaro-border">
          <button
            onClick={() => navigate('/journey/qualification')}
            className="text-xs text-educaro-muted hover:text-educaro-primary font-medium"
          >
            ← Back to Qualification
          </button>
          <button
            onClick={() => navigate('/journey/payment')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-educaro-accent hover:bg-educaro-accentHover text-black text-xs sm:text-sm font-semibold shadow-xs transition-colors"
          >
            <span>Proceed to Recommended Next Steps</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </main>

      <AgentTracePanel isOpen={isTraceOpen} onClose={() => setIsTraceOpen(false)} />
    </div>
  );
};
