import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useJourney } from '../../context/JourneyContext';
import { Navbar } from '../../components/Navbar';
import { CallNowButton } from '../../components/CallNowButton';
import {
  MessageSquare,
  Users,
  Sparkles,
  ShieldCheck,
  Send,
  RefreshCw,
  PhoneCall,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Lock,
  User,
  Star,
  BookOpen,
  CalendarDays,
  Edit3,
  X,
  AlertTriangle,
} from 'lucide-react';

interface AvailableDate {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "Wed, Oct 14"
  dayName: string; // e.g. "Wednesday"
  isSelectable: boolean;
}

interface Slot {
  id: string;
  time: string;
  label: string;
  isoUtc: string;
  isAvailable?: boolean;
}

interface Booking {
  id: string;
  user_id?: string;
  scheduled_at?: string;
  scheduledAt?: string;
  topic: string;
  notes?: string;
  status: string;
  created_at?: string;
  createdAt?: string;
}

export const ConsultantHubPage: React.FC = () => {
  const { user } = useAuth();
  const { entitlements } = useJourney();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab: 'ai' | 'human'
  const initialTab = searchParams.get('tab') === 'human' ? 'human' : 'ai';
  const [activeTab, setActiveTab] = useState<'ai' | 'human'>(initialTab);

  // Premium status check
  const isPremium =
    Boolean(entitlements && (
      entitlements.includes('EDUCARO_PREMIUM') ||
      entitlements.includes('CONSULTANT_REVIEW') ||
      entitlements.includes('PRIORITY_APS_CONSULTANT_REVIEW')
    ));

  // --------------------------------------------------------------------------
  // AI ASSISTANT STATE
  // --------------------------------------------------------------------------
  const [chatMessages, setChatMessages] = useState<
    { role: 'user' | 'assistant'; text: string; sources?: string[] }[]
  >([
    {
      role: 'assistant',
      text: 'Guten Tag! I am your AI Admissions Advisor for Germany. Ask me anything about Bavarian Formula grade conversions, APS India verification requirements, tuition-free public universities, or matching scholarships.',
    },
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [applicantContext, setApplicantContext] = useState<any>(null);

  // --------------------------------------------------------------------------
  // HUMAN CONSULTANT 5-STEP BOOKING STATE
  // --------------------------------------------------------------------------
  const [bookingStep, setBookingStep] = useState<number>(1);
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');

  // Applicant details pre-filled from auth/profile
  const [applicantName, setApplicantName] = useState<string>('');
  const [applicantEmail, setApplicantEmail] = useState<string>('');
  const [applicantPhone, setApplicantPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [loadingHumanData, setLoadingHumanData] = useState<boolean>(true);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [submittingBooking, setSubmittingBooking] = useState<boolean>(false);
  const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Booking management
  const [myBookings, setMyBookings] = useState<Booking[]>([]);

  // Rescheduling modal state
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleSlots, setRescheduleSlots] = useState<Slot[]>([]);
  const [rescheduleSelectedSlot, setRescheduleSelectedSlot] = useState<Slot | null>(null);
  const [submittingReschedule, setSubmittingReschedule] = useState<boolean>(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Load applicant profile context for pre-fill & AI Advisor
  useEffect(() => {
    if (!token) return;
    fetch('/api/engine/profile', { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res?.data) {
          setApplicantContext(res.data);
          const fullName = res.data.step1?.fullName || user?.email?.split('@')[0] || '';
          setApplicantName(fullName);
          setApplicantEmail(user?.email || res.data.step1?.email || '');
          setApplicantPhone(res.data.step1?.phone || '');
        } else if (user?.email) {
          setApplicantEmail(user.email);
          setApplicantName(user.email.split('@')[0]);
        }
      })
      .catch(() => {
        if (user?.email) {
          setApplicantEmail(user.email);
          setApplicantName(user.email.split('@')[0]);
        }
      });
  }, [user]);

  // Load human consultant initial metadata & bookings if premium
  useEffect(() => {
    if (!isPremium || !token) {
      setLoadingHumanData(false);
      return;
    }

    const fallbackTopics = [
      'German University Application Strategy & Program Selection',
      'APS India Certificate Verification & Transcript Audit',
      'Visa Requirements & Blocked Account Setup (€11,904)',
      'Language Certificate Strategy (IELTS & TestDaF / Goethe)',
      'Statement of Purpose (SOP) & Europass CV Review',
      'Ausbildung (Vocational Training) & Employer Match',
      'General / Other Guidance',
    ];

    Promise.all([
      fetch('/api/consultant/slots', { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/consultant/info', { headers }).then((r) => (r.ok ? r.json() : {})),
      fetch('/api/consultant/bookings', { headers }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([slotsResponse, infoData, bookingsData]) => {
        // Extract slots and dates from backend
        if (slotsResponse?.availableDates?.length) {
          setAvailableDates(slotsResponse.availableDates);
          setSelectedDate(slotsResponse.selectedDate || slotsResponse.availableDates[0].date);
        }
        if (slotsResponse?.slots) {
          setSlots(slotsResponse.slots);
        } else if (Array.isArray(slotsResponse)) {
          setSlots(slotsResponse);
        }

        const fetchedTopics = (infoData as any)?.topics?.length ? (infoData as any).topics : fallbackTopics;
        setTopics(fetchedTopics);
        setSelectedTopic(fetchedTopics[0] || fallbackTopics[0]);

        setMyBookings(Array.isArray(bookingsData) ? bookingsData : []);
      })
      .catch((err) => {
        console.error('Failed to load consultant data:', err);
        setTopics(fallbackTopics);
        setSelectedTopic(fallbackTopics[0]);
      })
      .finally(() => setLoadingHumanData(false));
  }, [isPremium]);

  // Fetch slots whenever selectedDate changes
  const handleDateChange = (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    setLoadingSlots(true);
    setBookingError(null);

    fetch(`/api/consultant/slots?date=${dateStr}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res?.slots) {
          setSlots(res.slots);
        } else if (Array.isArray(res)) {
          setSlots(res);
        }
      })
      .catch((err) => console.error('Failed to update date slots:', err))
      .finally(() => setLoadingSlots(false));
  };

  const handleTabChange = (tab: 'ai' | 'human') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // AI Assistant Chat Send
  const handleSendChat = async (overridePrompt?: string) => {
    const query = overridePrompt || chatInput;
    if (!query.trim() || chatLoading) return;

    const userMessage = { role: 'user' as const, text: query };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/engine/assistant', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query }),
      });

      if (res.ok) {
        const json = await res.json();
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: json.data.answer,
            sources: json.data.groundedSources,
          },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: 'I could not retrieve an answer at this moment. Please check your eligibility and criteria on the Recommendations and Qualification pages.',
          },
        ]);
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Network issue contacting advisory service. Please check your internet connection.',
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Human Consultant Booking Submit
  const handleBookSlot = async () => {
    if (!selectedSlot || submittingBooking) return;
    setSubmittingBooking(true);
    setBookingSuccess(false);
    setBookingError(null);

    try {
      const res = await fetch('/api/consultant/bookings', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          scheduledAt: selectedSlot.isoUtc,
          topic: selectedTopic,
          notes: notes ? `${notes} (Contact: ${applicantName}, Phone: ${applicantPhone || 'N/A'})` : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMyBookings((prev) => [data, ...prev]);
        setBookingSuccess(true);
        setSelectedSlot(null);
        setNotes('');
        setBookingStep(1);
        // Refresh slots to mark newly booked slot
        if (selectedDate) handleDateChange(selectedDate);
      } else if (res.status === 409) {
        const errJson = await res.json().catch(() => ({}));
        setBookingError(errJson.message || 'This slot has already been booked by another applicant. Please select an alternative slot.');
      } else {
        const errJson = await res.json().catch(() => ({}));
        setBookingError(errJson.message || 'Unable to complete appointment booking. Please verify your Premium status.');
      }
    } catch (err: any) {
      console.error('Failed to book slot', err);
      setBookingError(err.message || 'Connection error while saving booking.');
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Cancel Booking
  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this scheduled consultation?')) return;
    try {
      const res = await fetch(`/api/consultant/bookings/${bookingId}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        setMyBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b)),
        );
        if (selectedDate) handleDateChange(selectedDate);
      }
    } catch (err) {
      console.error('Failed to cancel booking', err);
    }
  };

  // Open Reschedule Modal
  const openRescheduleModal = (booking: Booking) => {
    setReschedulingBooking(booking);
    setRescheduleSelectedSlot(null);
    setRescheduleError(null);

    const initialD = availableDates[0]?.date || '2026-10-14';
    setRescheduleDate(initialD);

    fetch(`/api/consultant/slots?date=${initialD}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res?.slots) setRescheduleSlots(res.slots);
      })
      .catch((e) => console.error(e));
  };

  // Handle Reschedule Date Change
  const handleRescheduleDateChange = (dateStr: string) => {
    setRescheduleDate(dateStr);
    setRescheduleSelectedSlot(null);
    setRescheduleError(null);

    fetch(`/api/consultant/slots?date=${dateStr}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res?.slots) setRescheduleSlots(res.slots);
      })
      .catch((e) => console.error(e));
  };

  // Submit Reschedule
  const handleConfirmReschedule = async () => {
    if (!reschedulingBooking || !rescheduleSelectedSlot || submittingReschedule) return;
    setSubmittingReschedule(true);
    setRescheduleError(null);

    try {
      const res = await fetch(`/api/consultant/bookings/${reschedulingBooking.id}/reschedule`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          newScheduledAt: rescheduleSelectedSlot.isoUtc,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setMyBookings((prev) =>
          prev.map((b) => (b.id === reschedulingBooking.id ? { ...b, ...updated } : b)),
        );
        setReschedulingBooking(null);
        if (selectedDate) handleDateChange(selectedDate);
      } else if (res.status === 409) {
        const errJson = await res.json().catch(() => ({}));
        setRescheduleError(errJson.message || 'This slot is already booked. Please choose another date or time.');
      } else {
        const errJson = await res.json().catch(() => ({}));
        setRescheduleError(errJson.message || 'Could not reschedule appointment.');
      }
    } catch (err: any) {
      setRescheduleError(err.message || 'Connection error.');
    } finally {
      setSubmittingReschedule(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-700 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Advisory & Consultant Hub
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Consultant & Advisory Services
              </h1>
              <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                Connect with our 24/7 AI Admissions Advisor for verified answers, or schedule 1-on-1 personalized strategy calls with senior German immigration specialists.
              </p>
            </div>

            {/* Service Tier Switcher */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 flex-shrink-0">
              <button
                onClick={() => handleTabChange('ai')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  activeTab === 'ai'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>AI Advisor</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                  Free
                </span>
              </button>

              <button
                onClick={() => handleTabChange('human')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  activeTab === 'human'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4 text-purple-600" />
                <span>Human Consultant</span>
                {isPremium ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
                    Unlocked
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" /> Premium
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 1: AI ADMISSIONS ADVISOR (FREE)                                */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'ai' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                  AI German Admissions Advisor
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Grounded in official DAAD guidelines, Bavarian Formula regulations, and your saved profile data.
                </p>
              </div>

              {applicantContext && (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs text-slate-700">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    Evaluating: <strong>{applicantContext.step1?.fullName || 'Applicant'}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Level: <strong>{applicantContext.step3?.germanProficiency || 'A1/A2'}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Quick Conversation Starter Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-500 block">Suggested Questions:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  'How was my German grade calculated using the Bavarian Formula?',
                  'What are the mandatory APS India verification requirements?',
                  'Which public universities in Germany offer English-taught degrees?',
                  'What is the statutory blocked account requirement (€11,904)?',
                  'Am I eligible for DAAD or Deutschlandstipendium scholarships?',
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChat(prompt)}
                    className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Messages Stream */}
            <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-slate-50 min-h-[340px] max-h-[500px] overflow-y-auto space-y-4">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'btn-brand text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-900 shadow-xs'
                    }`}
                  >
                    <div className="whitespace-pre-line font-sans">{msg.text}</div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                        <strong>Grounded Citations:</strong> {msg.sources.join('; ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl p-3 text-xs text-slate-500 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    Querying verified knowledge base...
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input Bar */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask about admissions, deadlines, APS India, or visa rules..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={() => handleSendChat()}
                disabled={chatLoading || !chatInput.trim()}
                className="px-5 py-2.5 rounded-xl btn-brand text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" /> Send
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 2: SENIOR HUMAN CONSULTANT (PREMIUM)                          */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'human' && (
          <div className="space-y-6">
            {!isPremium ? (
              /* PREMIUM GATE / UPGRADE CARD */
              <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs space-y-6">
                <div className="w-16 h-16 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
                  <Users className="w-8 h-8" />
                </div>

                <div className="max-w-lg mx-auto space-y-2">
                  <span className="badge-soft text-[10px] font-bold uppercase tracking-wider px-3 py-1 bg-purple-50 text-purple-700">
                    Educaro Premium · 1-on-1 Guidance
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Senior Human Immigration Consultant
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Personalized 1-on-1 strategy video & phone calls with certified German admissions and APS document evaluation specialists.
                  </p>
                </div>

                {/* Benefits Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto text-left pt-2">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-purple-600" />
                      APS Dossier Review
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Line-by-line verification of transcripts, marksheets, and university credentials before submitting to APS New Delhi.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-purple-600" />
                      Direct Phone / Video Dialing
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Direct device dialer access to speak directly with your dedicated senior consultant.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-purple-600" />
                      SOP & Resume Critique
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Personalized feedback from German university alumni on your Statement of Purpose and Europass CV.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-purple-600" />
                      Visa Mock Interview
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Preparation for German Embassy / VFS National Student Visa interview questions and blocked account setup.
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    to="/journey/payment"
                    className="w-full sm:w-auto px-6 py-3 rounded-full btn-brand text-white text-xs font-bold shadow-xs hover:brightness-105 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Unlock Educaro Premium</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/checkout"
                    className="w-full sm:w-auto px-6 py-3 rounded-full border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                  >
                    View Plan Comparison
                  </Link>
                </div>
              </div>
            ) : (
              /* PREMIUM UNLOCKED: FULL 5-STEP BOOKING & APPOINTMENT MANAGEMENT */
              <div className="space-y-6">
                {/* Direct Call Card */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                      <PhoneCall className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Need Immediate Assistance?</h3>
                      <p className="text-xs text-slate-600">
                        Speak directly with your assigned Frankfurt / Bangalore senior consultant right now.
                      </p>
                    </div>
                  </div>
                  <CallNowButton />
                </div>

                {/* Success Notification */}
                {bookingSuccess && (
                  <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <strong>Consultation Confirmed!</strong> A calendar invite and confirmation email have been sent to {applicantEmail || user?.email}.
                      </div>
                    </div>
                    <button
                      onClick={() => setBookingSuccess(false)}
                      className="text-emerald-700 hover:text-emerald-900 font-bold"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Error Notification */}
                {bookingError && (
                  <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl text-rose-900 text-xs flex items-center gap-2.5 shadow-xs">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    <div>
                      <strong>Booking Conflict:</strong> {bookingError}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column (7 cols): 5-Step Booking Flow */}
                  <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-6">
                    {/* Stepper Header */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-purple-600" />
                          Book 1-on-1 Strategy Appointment
                        </h3>
                        <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                          Step {bookingStep} of 5
                        </span>
                      </div>

                      {/* Visual Step Indicator */}
                      <div className="grid grid-cols-5 gap-1.5">
                        {[
                          { num: 1, label: 'Service' },
                          { num: 2, label: 'Date' },
                          { num: 3, label: 'Time' },
                          { num: 4, label: 'Details' },
                          { num: 5, label: 'Confirm' },
                        ].map((s) => (
                          <button
                            key={s.num}
                            onClick={() => {
                              // Allow navigation to previous completed steps
                              if (s.num < bookingStep) setBookingStep(s.num);
                            }}
                            className={`h-2 rounded-full transition-all ${
                              s.num === bookingStep
                                ? 'bg-purple-600'
                                : s.num < bookingStep
                                ? 'bg-emerald-500 cursor-pointer'
                                : 'bg-slate-200 cursor-not-allowed'
                            }`}
                            title={`Step ${s.num}: ${s.label}`}
                          />
                        ))}
                      </div>
                    </div>

                    {loadingHumanData ? (
                      <div className="py-12 text-center space-y-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-purple-600 mx-auto" />
                        <p className="text-xs text-slate-500">Loading appointment availability...</p>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {/* -------------------------------------------------- */}
                        {/* STEP 1: Select Topic / Service                     */}
                        {/* -------------------------------------------------- */}
                        {bookingStep === 1 && (
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-bold text-slate-900">Step 1: Select Consultation Topic</h4>
                              <p className="text-xs text-slate-500">
                                Choose the primary area you want your senior advisor to examine.
                              </p>
                            </div>

                            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                              {topics.map((t, idx) => {
                                const isSelected = selectedTopic === t;
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setSelectedTopic(t)}
                                    className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between text-xs ${
                                      isSelected
                                        ? 'border-purple-600 bg-purple-50/70 text-purple-950 font-bold ring-2 ring-purple-500/20'
                                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                    }`}
                                  >
                                    <span>{t}</span>
                                    {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 ml-2" />}
                                  </button>
                                );
                              })}
                            </div>

                            <div className="pt-3 flex justify-end">
                              <button
                                onClick={() => setBookingStep(2)}
                                disabled={!selectedTopic}
                                className="px-5 py-2.5 rounded-xl btn-brand text-white text-xs font-bold flex items-center gap-2 shadow-xs disabled:opacity-50"
                              >
                                <span>Proceed to Date Selection</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* -------------------------------------------------- */}
                        {/* STEP 2: Select Date                                */}
                        {/* -------------------------------------------------- */}
                        {bookingStep === 2 && (
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-bold text-slate-900">Step 2: Choose Available Date</h4>
                              <p className="text-xs text-slate-500">
                                Consultations are conducted Monday through Saturday (Sundays excluded).
                              </p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
                              {availableDates.map((d) => {
                                const isSelected = selectedDate === d.date;
                                return (
                                  <button
                                    key={d.date}
                                    type="button"
                                    onClick={() => handleDateChange(d.date)}
                                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between text-xs ${
                                      isSelected
                                        ? 'border-purple-600 bg-purple-50/80 text-purple-950 font-bold ring-2 ring-purple-500/20'
                                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                    }`}
                                  >
                                    <span className="text-[10px] text-slate-400 uppercase font-semibold">{d.dayName}</span>
                                    <span className="font-bold text-xs mt-0.5">{d.label}</span>
                                  </button>
                                );
                              })}
                            </div>

                            <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                              <button
                                onClick={() => setBookingStep(1)}
                                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
                              >
                                <ArrowLeft className="w-3.5 h-3.5" /> Back
                              </button>
                              <button
                                onClick={() => setBookingStep(3)}
                                disabled={!selectedDate}
                                className="px-5 py-2.5 rounded-xl btn-brand text-white text-xs font-bold flex items-center gap-2 shadow-xs disabled:opacity-50"
                              >
                                <span>Choose Time Slot</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* -------------------------------------------------- */}
                        {/* STEP 3: Select Time Slot                           */}
                        {/* -------------------------------------------------- */}
                        {bookingStep === 3 && (
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-bold text-slate-900">Step 3: Select Time Slot (IST)</h4>
                              <p className="text-xs text-slate-500">
                                30-minute private 1-on-1 session for <strong>{selectedDate}</strong>.
                              </p>
                            </div>

                            {loadingSlots ? (
                              <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                                <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                                Checking available slots for {selectedDate}...
                              </div>
                            ) : slots.length === 0 ? (
                              <div className="p-8 text-center text-xs text-slate-500 border border-dashed rounded-2xl">
                                No open slots available on this date. Please choose another date.
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-1">
                                {slots.map((s) => {
                                  const isSelected = selectedSlot?.id === s.id;
                                  const isAvailable = s.isAvailable !== false;

                                  return (
                                    <button
                                      key={s.id}
                                      type="button"
                                      disabled={!isAvailable}
                                      onClick={() => setSelectedSlot(s)}
                                      className={`p-2.5 rounded-xl border text-center transition-all text-xs ${
                                        !isAvailable
                                          ? 'border-slate-200 bg-slate-100 text-slate-400 line-through cursor-not-allowed opacity-60'
                                          : isSelected
                                          ? 'border-purple-600 bg-purple-600 text-white font-bold shadow-xs'
                                          : 'border-slate-200 bg-white text-slate-800 hover:border-purple-400 hover:bg-purple-50/30'
                                      }`}
                                    >
                                      <span>{s.time}</span>
                                      {!isAvailable && (
                                        <span className="block text-[9px] text-slate-400 no-underline">Booked</span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                              <button
                                onClick={() => setBookingStep(2)}
                                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
                              >
                                <ArrowLeft className="w-3.5 h-3.5" /> Back
                              </button>
                              <button
                                onClick={() => setBookingStep(4)}
                                disabled={!selectedSlot}
                                className="px-5 py-2.5 rounded-xl btn-brand text-white text-xs font-bold flex items-center gap-2 shadow-xs disabled:opacity-50"
                              >
                                <span>Applicant Details</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* -------------------------------------------------- */}
                        {/* STEP 4: Applicant Details & Notes                  */}
                        {/* -------------------------------------------------- */}
                        {bookingStep === 4 && (
                          <div className="space-y-4 text-xs">
                            <div>
                              <h4 className="text-sm font-bold text-slate-900">Step 4: Applicant Details & Notes</h4>
                              <p className="text-slate-500">
                                Pre-filled from your profile. Add any questions or documents you'd like reviewed.
                              </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block font-semibold text-slate-700 mb-1">Applicant Name</label>
                                <input
                                  type="text"
                                  value={applicantName}
                                  onChange={(e) => setApplicantName(e.target.value)}
                                  placeholder="Full Name"
                                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900"
                                />
                              </div>

                              <div>
                                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                                <input
                                  type="email"
                                  value={applicantEmail}
                                  onChange={(e) => setApplicantEmail(e.target.value)}
                                  placeholder="Email"
                                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900"
                                />
                              </div>

                              <div className="sm:col-span-2">
                                <label className="block font-semibold text-slate-700 mb-1">Phone Number (with country code)</label>
                                <input
                                  type="tel"
                                  value={applicantPhone}
                                  onChange={(e) => setApplicantPhone(e.target.value)}
                                  placeholder="+91 98765 43210"
                                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900"
                                />
                              </div>

                              <div className="sm:col-span-2">
                                <label className="block font-semibold text-slate-700 mb-1">
                                  Specific Questions / Notes for Advisor
                                </label>
                                <textarea
                                  rows={3}
                                  value={notes}
                                  onChange={(e) => setNotes(e.target.value)}
                                  placeholder="e.g. Please audit my APS transcripts, TU Munich MSc Computer Science credit match, or blocked account query..."
                                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900"
                                />
                              </div>
                            </div>

                            <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                              <button
                                onClick={() => setBookingStep(3)}
                                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
                              >
                                <ArrowLeft className="w-3.5 h-3.5" /> Back
                              </button>
                              <button
                                onClick={() => setBookingStep(5)}
                                className="px-5 py-2.5 rounded-xl btn-brand text-white text-xs font-bold flex items-center gap-2 shadow-xs"
                              >
                                <span>Review Summary</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* -------------------------------------------------- */}
                        {/* STEP 5: Review & Confirmation                      */}
                        {/* -------------------------------------------------- */}
                        {bookingStep === 5 && (
                          <div className="space-y-4 text-xs">
                            <div>
                              <h4 className="text-sm font-bold text-slate-900">Step 5: Review & Confirm Appointment</h4>
                              <p className="text-slate-500">
                                Please review your appointment details before locking in the slot.
                              </p>
                            </div>

                            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
                              <div className="flex items-start justify-between pb-2 border-b border-slate-200">
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-400">Consultation Topic</span>
                                  <div className="font-bold text-slate-900 text-sm mt-0.5">{selectedTopic}</div>
                                </div>
                                <button
                                  onClick={() => setBookingStep(1)}
                                  className="text-[11px] text-purple-700 hover:underline font-semibold"
                                >
                                  Edit
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-3 py-1">
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-400">Date</span>
                                  <div className="font-bold text-slate-800">{selectedSlot?.label?.split('·')[0] || selectedDate}</div>
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-400">Time</span>
                                  <div className="font-bold text-slate-800">{selectedSlot?.time}</div>
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-400">Applicant</span>
                                  <div className="font-bold text-slate-800">{applicantName || 'Applicant'}</div>
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-400">Confirmation Sent To</span>
                                  <div className="font-bold text-slate-800 truncate">{applicantEmail || user?.email}</div>
                                </div>
                              </div>

                              {notes && (
                                <div className="pt-2 border-t border-slate-200">
                                  <span className="text-[10px] uppercase font-bold text-slate-400">Notes / Questions</span>
                                  <div className="text-slate-700 italic mt-0.5">{notes}</div>
                                </div>
                              )}
                            </div>

                            <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                              <button
                                onClick={() => setBookingStep(4)}
                                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
                              >
                                <ArrowLeft className="w-3.5 h-3.5" /> Back
                              </button>
                              <button
                                onClick={handleBookSlot}
                                disabled={submittingBooking || !selectedSlot}
                                className="px-6 py-2.5 rounded-xl btn-brand text-white text-xs font-bold flex items-center gap-2 shadow-xs disabled:opacity-50"
                              >
                                {submittingBooking ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Securing Slot...</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Confirm & Book Appointment</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column (5 cols): Scheduled Appointments Management */}
                  <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-600" />
                        Your Booked Appointments
                      </h3>
                      <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                        {myBookings.filter((b) => b.status !== 'cancelled').length} Active
                      </span>
                    </div>

                    {myBookings.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl space-y-2">
                        <CalendarDays className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs text-slate-600 font-medium">No consultations booked yet</p>
                        <p className="text-[11px] text-slate-400">
                          Complete the 5-step booking on the left to schedule your 1-on-1 strategy session.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                        {myBookings.map((b) => {
                          const isCancelled = b.status === 'cancelled';
                          const isRescheduled = b.status === 'rescheduled';
                          const scheduledTime = b.scheduled_at || b.scheduledAt || '';

                          return (
                            <div
                              key={b.id}
                              className={`p-4 rounded-2xl border space-y-2 text-xs transition-all ${
                                isCancelled
                                  ? 'bg-slate-50 border-slate-200 opacity-60'
                                  : 'bg-purple-50/40 border-purple-200 shadow-2xs'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                    isCancelled
                                      ? 'bg-rose-100 text-rose-800'
                                      : isRescheduled
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {b.status.toUpperCase()}
                                </span>

                                {!isCancelled && (
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => openRescheduleModal(b)}
                                      className="text-[11px] text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1"
                                    >
                                      <Edit3 className="w-3 h-3" /> Reschedule
                                    </button>
                                    <button
                                      onClick={() => handleCancelBooking(b.id)}
                                      className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                )}
                              </div>

                              <h4 className="font-bold text-slate-900 leading-snug">
                                {b.topic || 'General Guidance'}
                              </h4>

                              <div className="text-slate-600 flex items-center gap-1.5 text-[11px]">
                                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{scheduledTime ? new Date(scheduledTime).toLocaleString() : 'Pending'}</span>
                              </div>

                              {b.notes && (
                                <p className="text-[11px] text-slate-500 italic line-clamp-2 pt-1 border-t border-slate-200/50">
                                  {b.notes}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* RESCHEDULE MODAL                                                   */}
      {/* ------------------------------------------------------------------ */}
      {reschedulingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-sm text-slate-900">Reschedule Consultation</h3>
              </div>
              <button
                onClick={() => setReschedulingBooking(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {rescheduleError && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{rescheduleError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-700 block mb-1">Select New Date:</span>
                <select
                  value={rescheduleDate}
                  onChange={(e) => handleRescheduleDateChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs"
                >
                  {availableDates.map((d) => (
                    <option key={d.date} value={d.date}>
                      {d.label} ({d.dayName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="font-semibold text-slate-700 block mb-1">Select New Time Slot:</span>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {rescheduleSlots.map((s) => {
                    const isSelected = rescheduleSelectedSlot?.id === s.id;
                    const isAvailable = s.isAvailable !== false;

                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => setRescheduleSelectedSlot(s)}
                        className={`p-2 rounded-xl border text-center transition-all text-xs ${
                          !isAvailable
                            ? 'border-slate-200 bg-slate-100 text-slate-400 line-through cursor-not-allowed opacity-50'
                            : isSelected
                            ? 'border-purple-600 bg-purple-600 text-white font-bold'
                            : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        {s.time}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setReschedulingBooking(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReschedule}
                disabled={!rescheduleSelectedSlot || submittingReschedule}
                className="px-5 py-2 rounded-xl btn-brand text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                {submittingReschedule ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Rescheduling...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm Reschedule</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ConsultantHubPage;
