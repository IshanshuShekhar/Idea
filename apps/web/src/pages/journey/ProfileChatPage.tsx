import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { StepHeader } from '../../components/StepHeader';
import { AgentTracePanel } from '../../components/AgentTracePanel';
import { ProvenanceBadge } from '../../components/ProvenanceBadge';
import { useAuth } from '../../context/AuthContext';
import { useJourney } from '../../context/JourneyContext';
import { Provenance } from '@educaro/shared';
import { Bot, User, Send, Sparkles, Globe, ArrowRight, UserCheck } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'AGENT' | 'USER';
  text: string;
  step: 'PERSONAL' | 'EDUCATION' | 'EMPLOYMENT' | 'LANGUAGES' | 'SKILLS' | 'COMPLETE';
  quickReplies?: string[];
  timestamp: string;
}

export const ProfileChatPage: React.FC = () => {
  const { user, token } = useAuth();
  const { profileFields, refreshJourney } = useJourney();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialContext = searchParams.get('context');
  const recId = searchParams.get('recId');
  
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [inputText, setInputText] = useState('');
  const [currentStep, setCurrentStep] = useState<'PERSONAL' | 'EDUCATION' | 'EMPLOYMENT' | 'LANGUAGES' | 'SKILLS'>('PERSONAL');
  const [isTraceOpen, setIsTraceOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const candidateName = profileFields['fullName']?.value;

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'm1',
      sender: 'AGENT',
      text: candidateName
        ? `Welcome back, ${candidateName}! Let's continue building your profile. Next, what is your highest degree, university, and year of graduation?`
        : language === 'hi'
        ? 'नमस्ते! मैं Educaro का Intake Agent हूँ। आपकी जर्मनी यात्रा को सुगम बनाने के लिए कुछ बुनियादी जानकारी एकत्र करेंगे। आपका पूरा नाम और वर्तमान शहर क्या है?'
        : 'Welcome! I am your Educaro Intake Agent. To begin customizing your Germany pathway, what is your full legal name and current city in India?',
      step: candidateName ? 'EDUCATION' : 'PERSONAL',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  useEffect(() => {
    if (candidateName && currentStep === 'PERSONAL') {
      setCurrentStep('EDUCATION');
    }
  }, [candidateName]);

  const hasInjectedRef = useRef(false);

  useEffect(() => {
    if (initialContext && !hasInjectedRef.current) {
      hasInjectedRef.current = true;
      const agentMsg: ChatMessage = {
        id: `a-context-${Date.now()}`,
        sender: 'AGENT',
        text: `I see you have a question about your recommendation: "${initialContext}". How can I help you resolve this?`,
        step: currentStep,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, agentMsg]);
    }
  }, [initialContext, currentStep]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isSending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'USER',
      text,
      step: currentStep,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsSending(true);

    try {
      const res = await fetch('/api/intake/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          step: currentStep,
          message: text,
          language,
        }),
      });

      const data = await res.json();
      await refreshJourney();

      // Determine next step
      let nextStep: any = 'EDUCATION';
      if (currentStep === 'PERSONAL') nextStep = 'EDUCATION';
      else if (currentStep === 'EDUCATION') nextStep = 'EMPLOYMENT';
      else if (currentStep === 'EMPLOYMENT') nextStep = 'LANGUAGES';
      else if (currentStep === 'LANGUAGES') nextStep = 'SKILLS';
      else if (currentStep === 'SKILLS') nextStep = 'COMPLETE';

      setCurrentStep(nextStep);

      const agentMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        sender: 'AGENT',
        text: data.replyText,
        step: nextStep,
        quickReplies: data.quickReplies,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, agentMsg]);
    } catch (err) {
      console.error('Failed to send intake message:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-educaro-main flex flex-col text-educaro-primary">
      <Navbar onToggleTracePanel={() => setIsTraceOpen(!isTraceOpen)} isTraceOpen={isTraceOpen} />
      
      <StepHeader
        currentStepIndex={5}
        totalSteps={12}
        stepTitle="Intake Agent Chat"
        stepSubtitle="Conversational intake to build your verified applicant profile."
        backRoute="/journey/details"
        nextRoute="/journey/video"
        continueLabel="Continue to Video Intro →"
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Interactive Chat Interface */}
          <div className="lg:col-span-8 bg-educaro-main rounded-3xl border border-educaro-border flex flex-col h-[650px] shadow-xs overflow-hidden">
            
            {/* Chat Header */}
            <div className="p-4 bg-educaro-secondary border-b border-educaro-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-educaro-accent text-black flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-educaro-primary flex items-center gap-2">
                    Intake Agent
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </h3>
                  <p className="text-[11px] text-educaro-muted">Step: {currentStep} • German Journey Specialist</p>
                </div>
              </div>

              {/* Language Switcher (PRD Section 7 #6: Hindi voice/chat support) */}
              <div className="flex items-center gap-1.5 bg-educaro-main p-1 rounded-full border border-educaro-border text-xs">
                <Globe className="w-3.5 h-3.5 text-educaro-accent ml-1.5" />
                <button
                  type="button"
                  data-button-size="compact"
                  onClick={() => setLanguage('en')}
                  className={`px-2.5 py-0.5 rounded-full font-semibold transition-all ${
                    language === 'en' ? 'bg-educaro-accent text-black' : 'text-educaro-muted'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  data-button-size="compact"
                  onClick={() => setLanguage('hi')}
                  className={`px-2.5 py-0.5 rounded-full font-semibold transition-all ${
                    language === 'hi' ? 'bg-educaro-accent text-black' : 'text-educaro-muted'
                  }`}
                >
                  हिन्दी
                </button>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m) => {
                const isAgent = m.sender === 'AGENT';
                return (
                  <div
                    key={m.id}
                    className={`flex items-start gap-2.5 ${isAgent ? '' : 'flex-row-reverse'}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
                        isAgent ? 'bg-educaro-accent text-black' : 'bg-educaro-accent text-black'
                      }`}
                    >
                      {isAgent ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>

                    <div className="max-w-[80%] space-y-2">
                      <div
                        className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                          isAgent
                            ? 'bg-educaro-main text-educaro-primary border border-educaro-border rounded-tl-xs shadow-2xs'
                            : 'bg-educaro-accent text-black rounded-tr-xs shadow-xs'
                        }`}
                      >
                        <p>{m.text}</p>
                      </div>

                      {/* Quick Replies */}
                      {isAgent && m.quickReplies && m.quickReplies.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {m.quickReplies.map((qr, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                if (qr.includes('Proceed to Document Upload') || qr.includes('Video Intro')) {
                                  navigate('/journey/video');
                                } else {
                                  handleSendMessage(qr);
                                }
                              }}
                              className="px-3 py-1 rounded-full bg-educaro-icon hover:bg-[#E5E7EB] text-[11px] font-medium text-educaro-primary border border-educaro-border transition-colors"
                            >
                              {qr}
                            </button>
                          ))}
                        </div>
                      )}

                      <span className="text-[10px] text-educaro-muted block px-1">
                        {m.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-educaro-secondary border-t border-educaro-border">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder={
                    language === 'hi'
                      ? 'यहाँ अपना संदेश लिखें (उदा. B.Tech Computer Science, XYZ University 2024)...'
                      : 'Type your message (e.g. B.Tech Computer Science, XYZ University 2024)...'
                  }
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-full border border-educaro-border bg-educaro-main text-xs sm:text-sm text-educaro-primary focus:outline-none focus:ring-1 focus:ring-educaro-accent"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className="p-2.5 rounded-full bg-educaro-accent text-black hover:bg-educaro-accentHover disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

          </div>

          {/* Right Column: Live Profile Snapshot with Provenance Badges */}
          <div className="lg:col-span-4 bg-educaro-main rounded-3xl border border-educaro-border p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-educaro-border">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-educaro-accent" />
                <h3 className="text-sm font-bold text-educaro-primary">Live Profile Snapshot</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-educaro-accent font-semibold">
                Single Source of Truth
              </span>
            </div>

            <p className="text-[11px] text-educaro-muted">
              Every field captured here is tagged with strict provenance badges and stored securely.
            </p>

            {/* Field Entries */}
            <div className="space-y-2.5">
              {[
                { label: 'Full Legal Name', key: 'fullName' },
                { label: 'Location / Country', key: 'country' },
                { label: 'German CEFR Level', key: 'germanLevel' },
                { label: 'English Level', key: 'englishLevel' },
                { label: 'Highest Degree', key: 'degree' },
                { label: 'Awarding University', key: 'institution' },
                { label: 'Graduation Year', key: 'graduationYear' },
                { label: 'Work Experience', key: 'workExperience' },
                { label: 'Technical Skills', key: 'technicalSkills' },
              ].map((item) => {
                const captured = profileFields[item.key] || (item.key === 'country' ? profileFields['currentLocation'] : undefined);
                const hasValue = Boolean(captured?.value && captured.value.trim().length > 0);
                const value = hasValue ? captured!.value : 'Pending input...';
                const provenance = captured?.provenance || Provenance.APPLICANT_PROVIDED;

                return (
                  <div key={item.key} className="p-2.5 rounded-xl bg-educaro-main border border-educaro-border/70 text-xs">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-bold text-educaro-muted uppercase">{item.label}</span>
                      {hasValue ? (
                        <ProvenanceBadge provenance={provenance} />
                      ) : (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-educaro-secondary text-educaro-muted font-medium">
                          Awaiting Intake
                        </span>
                      )}
                    </div>
                    <p className={`font-semibold truncate ${hasValue ? 'text-educaro-primary' : 'text-educaro-muted italic'}`}>
                      {value}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Quick action */}
            <button
              onClick={() => navigate('/journey/documents')}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full bg-educaro-accent text-black hover:bg-educaro-accentHover text-xs font-semibold shadow-xs transition-colors"
            >
              <span>Continue to Document Upload</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </main>

      <AgentTracePanel isOpen={isTraceOpen} onClose={() => setIsTraceOpen(false)} />
    </div>
  );
};
