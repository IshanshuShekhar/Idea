import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { StepHeader } from '../../components/StepHeader';
import { AgentTracePanel } from '../../components/AgentTracePanel';
import { useAuth } from '../../context/AuthContext';
import { useJourney } from '../../context/JourneyContext';
import { ShieldCheck, Calendar, ArrowRight, UserCheck, CheckCircle2, Sparkles, PhoneCall , Compass, ExternalLink, Bot, Send} from 'lucide-react';

export const NextStepsPage: React.FC = () => {
  const { user } = useAuth();
  const { entitlements, refreshJourney } = useJourney();
  const navigate = useNavigate();

  const [isConsultantBooked, setIsConsultantBooked] = useState(false);
  const [isTraceOpen, setIsTraceOpen] = useState(false);

  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'ai' | 'user', text: string}[]>([
    { role: 'ai', text: 'Welcome to Premium! I can help you book your Frankfurt advisor call, track your APS fast-track status, or recommend which German learning modules to tackle first. How can I assist you today?' }
  ]);

  const handleChatSubmit = async (e: any) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const userText = chatInput;
    const newMessages = [...chatMessages, { role: 'user', text: userText }];
    setChatMessages(newMessages as any);
    setChatInput('');
    setIsTyping(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/consultant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message: userText,
          history: chatMessages // Send previous messages for context
        })
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const errMsg = (errBody as any).message || res.statusText;
        throw new Error(errMsg);
      }
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'ai', text: (data as any).text }] as any);
    } catch (err: any) {
      const msg = err?.message === 'Unauthorized'
        ? 'Your session has expired. Please refresh the page and log in again.'
        : 'Connection failed. Please try again shortly.';
      setChatMessages(prev => [...prev, { role: 'ai', text: msg }] as any);
      console.error('[Chat] Error:', err);
    } finally {
      setIsTyping(false);
    }
  };


  const isPriorityUnlocked =
    entitlements.includes('EDUCARO_PREMIUM') ||
    entitlements.includes('PRIORITY_APS_CONSULTANT_REVIEW') ||
    entitlements.includes('CONSULTANT_REVIEW');

  return (
    <div className="min-h-screen bg-educaro-main flex flex-col text-educaro-primary">
      <Navbar onToggleTracePanel={() => setIsTraceOpen(!isTraceOpen)} isTraceOpen={isTraceOpen} />

      <StepHeader
        currentStepIndex={9}
        totalSteps={9}
        stepTitle="Recommended Next Steps"
        stepSubtitle="Review recommendations, access fast-tracking, or consult with an advisor."
        backRoute="/journey/cv"
        nextRoute="/"
        continueLabel="Return Home"
      />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        
        {/* Congratulations Banner */}
        <div className="bg-educaro-main rounded-[24px] border border-educaro-border p-10 shadow-elevated-rest text-center max-w-3xl mx-auto animate-fade-in-up">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-educaro-accent flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-educaro-primary tracking-tight mb-2">
            You have entered Premium
          </h2>
        </div>

        {/* Action Pathways Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6 animate-fade-in-up-1">
          
          {/* Card 1: 1-on-1 Consultant Referral */}
          <div className="premium-card p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-educaro-accent text-black flex items-center justify-center">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-educaro-primary">Educaro Senior Advisor Consultation</h3>
                  <p className="text-[11px] text-educaro-muted">Free 1-on-1 strategy video call</p>
                </div>
              </div>
              <p className="text-xs text-educaro-muted leading-relaxed mb-4">
                Our Frankfurt & Bangalore advisors will review your qualification report, confirm tuition-free university shortlist, and outline visa timelines.
              </p>
              <div className="space-y-1.5 text-xs text-educaro-primary">
                <div className="flex items-center gap-1.5">
                  <span className="text-educaro-accent font-bold">✓</span>
                  <span>Pre-digested AI summary shared with advisor</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-educaro-accent font-bold">✓</span>
                  <span>Zero repetition of entered information</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-educaro-border">
              {isConsultantBooked ? (
                <div className="p-3 bg-educaro-icon rounded-xl border border-educaro-accent/20 text-xs font-semibold text-educaro-accent text-center">
                  ✓ Advisory Call Requested! An advisor will reach out to {user?.email}.
                </div>
              ) : (
                <button
                  onClick={() => navigate('/consultant')}
                  className="w-full py-3 px-4 rounded-full bg-educaro-accent hover:bg-educaro-accentHover text-black text-xs font-semibold shadow-xs transition-colors flex justify-center items-center gap-2"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Book Advisor Call →</span>
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Priority APS Fast-Track */}
          <div className="premium-card p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-educaro-accent text-black flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-educaro-primary">Priority APS Verification</h3>
                    <span className="text-[10px] font-bold bg-educaro-icon text-educaro-accent px-2 py-0.5 rounded-full">
                      ₹1100
                    </span>
                  </div>
                  <p className="text-[11px] text-educaro-muted">Expedited German Academic Evaluation</p>
                </div>
              </div>
              <p className="text-xs text-educaro-muted leading-relaxed mb-4">
                Fast-track your mandatory APS India certificate verification with dedicated document notarization checks and verified tracking.
              </p>
              <div className="space-y-1.5 text-xs text-educaro-primary">
                <div className="flex items-center gap-1.5">
                  <span className="text-educaro-accent font-bold">✓</span>
                  <span>Persistent entitlement tied to account</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-educaro-accent font-bold">✓</span>
                  <span>Direct Indian UPI & Dynamic QR payment</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-educaro-border">
              {isPriorityUnlocked ? (
                <div className="p-3 bg-educaro-icon rounded-xl border border-educaro-accent/20 text-xs font-semibold text-educaro-accent text-center flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-educaro-accent" />
                  <span>Educaro Premium Active (90 Days)</span>
                </div>
              ) : (
                <button
                  onClick={() => navigate('/checkout')}
                  className="btn-primary-glow w-full py-3.5 px-4 rounded-full bg-educaro-accent text-black text-xs sm:text-sm font-bold"
                >
                  Unlock Educaro Premium via UPI / QR →
                </button>
              )}
            </div>
          </div>

          {/* Card 3: German Learning Path */}
          <div className="premium-card p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-educaro-accent text-black flex items-center justify-center">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-educaro-primary">German Learning Path</h3>
                  <p className="text-[11px] text-educaro-muted">Guided language readiness</p>
                </div>
              </div>
              <p className="text-xs text-educaro-muted leading-relaxed mb-4">
                Access curated, free official German courses (like DW's Nicos Weg) and track your CEFR readiness based on your target pathway.
              </p>
              <div className="space-y-1.5 text-xs text-educaro-primary">
                <div className="flex items-center gap-1.5">
                  <span className="text-educaro-accent font-bold">✓</span>
                  <span>Direct links to A1-B2 Goethe content</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-educaro-accent font-bold">✓</span>
                  <span>AI-estimated completion timeline</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-educaro-border">
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/journey/german-learning-path')}
                  className="w-full py-2.5 px-4 rounded-full bg-educaro-primary hover:bg-educaro-primary/90 text-white text-xs font-bold shadow-xs transition-colors flex justify-center items-center gap-2 mb-1"
                >
                  <Compass className="w-4 h-4" />
                  <span>View Your Learning Path</span>
                </button>
                <a
                  href="https://learngerman.dw.com/en/nicos-weg/c-36519789"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-full bg-educaro-accent hover:bg-educaro-accentHover text-black text-xs font-semibold shadow-xs transition-colors flex justify-center items-center gap-2"
                >
                  <span>Launch Nicos Weg (DW)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <a
                  href="https://www.testdaf.de/de/teilnehmende/vorbereitung/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-full bg-educaro-icon hover:bg-[#D1FAE5] border border-educaro-accent/20 text-educaro-accent text-xs font-semibold shadow-xs transition-colors flex justify-center items-center gap-2"
                >
                  <span>TestDaF Preparation</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

        
        {/* Premium Agent Chat Widget */}
        <div className="md:col-span-3 lg:col-span-3 premium-card flex flex-col h-[650px] overflow-hidden mt-6 mb-6 animate-fade-in-up-2">
          {/* Chat Header */}
          <div className="p-4 bg-educaro-secondary border-b border-educaro-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-educaro-accent text-black flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-educaro-primary flex items-center gap-2">
                  AI Consultant
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </h3>
                <p className="text-[11px] text-educaro-muted">Online ? Ask about advisor booking or next steps</p>
              </div>
            </div>
          </div>
          
          {/* Chat Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50/30">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex items-end gap-2 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-educaro-primary' : 'bg-educaro-accent'}`}>
                  {msg.role === 'user' ? <span className="text-white text-[10px]">U</span> : <Bot className="w-3 h-3 text-white" />}
                </div>
                <div className={`p-3 rounded-2xl text-xs leading-relaxed border ${
                  msg.role === 'user' 
                    ? 'rounded-br-none bg-educaro-primary text-black border-educaro-primary' 
                    : 'rounded-bl-none bg-educaro-main text-educaro-primary border-educaro-border'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex items-end gap-2 max-w-[85%]">
                <div className="w-6 h-6 rounded-full bg-educaro-accent flex items-center justify-center shrink-0">
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <div className="p-3 rounded-2xl rounded-bl-none bg-educaro-main border border-educaro-border flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-3 bg-educaro-secondary border-t border-educaro-border">
            <form onSubmit={handleChatSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about your premium benefits..."
                className="flex-1 px-4 py-2.5 rounded-full border border-educaro-border bg-educaro-main text-xs text-educaro-primary focus:outline-none focus:ring-1 focus:ring-educaro-accent"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isTyping}
                className="p-2.5 rounded-full bg-educaro-accent text-black hover:bg-educaro-accentHover disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        </div>

        {/* View Full Consolidated Profile Link */}
        <div className="bg-educaro-secondary rounded-2xl border border-educaro-border p-6 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-educaro-primary">Consolidated Candidate Details & Audit</h4>
            <p className="text-xs text-educaro-muted">
              Audit all profile fields with provenance tags, inline editing, and consultant lead scoring.
            </p>
          </div>
          <button
            onClick={() => navigate('/candidate-details')}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-educaro-accent text-black hover:bg-educaro-accentHover text-xs font-semibold transition-colors"
          >
            <span>Open Candidate Details</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </main>

      <AgentTracePanel isOpen={isTraceOpen} onClose={() => setIsTraceOpen(false)} />
    </div>
  );
};
