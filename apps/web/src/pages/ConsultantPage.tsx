import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { AgentTracePanel } from '../components/AgentTracePanel';
import { CallNowButton } from '../components/CallNowButton';
import { useAuth } from '../context/AuthContext';
import { useJourney } from '../context/JourneyContext';
import {
  Calendar,
  Clock,
  CheckCircle2,
  ArrowLeft,
  PhoneCall,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Loader2,
  XCircle,
} from 'lucide-react';

interface Slot {
  id: string;
  label: string;
  isoUtc: string;
}

interface Booking {
  id: string;
  scheduledAt: string;
  topic: string;
  status: string;
  createdAt: string;
}

export const ConsultantPage: React.FC = () => {
  const { user } = useAuth();
  const { entitlements } = useJourney();
  const navigate = useNavigate();

  const [isTraceOpen, setIsTraceOpen] = useState(false);

  // Premium gate
  const isPremium =
    entitlements && (entitlements.includes('EDUCARO_PREMIUM') ||
    entitlements.includes('CONSULTANT_REVIEW'));

  // Slots & booking state
  const [slots, setSlots] = useState<Slot[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState<Booking | null>(null);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);

  const token = localStorage.getItem('accessToken');
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Load slots, topics, and existing bookings
  useEffect(() => {
    if (!isPremium || !token) {
      setLoadingSlots(false);
      return;
    }

    const fallbackTopics = [
      'German University Application Process',
      'Visa & APS Document Verification',
      'Language Certificate Requirements',
      'Blocked Account & Finances Setup',
      'Finding Study Programs (Anabin H+)',
      'Work & Study Pathway in Germany',
      'Other / General Guidance',
    ];

    Promise.all([
      fetch('/api/consultant/slots', { headers, cache: 'no-store' }).then((r) => r.ok ? r.json() : []),
      fetch('/api/consultant/info', { headers, cache: 'no-store' }).then((r) => r.ok ? r.json() : {}),
      fetch('/api/consultant/bookings', { headers, cache: 'no-store' }).then((r) => r.ok ? r.json() : []),
    ])
      .then(([slotsData, infoData, bookingsData]) => {
        setSlots(Array.isArray(slotsData) ? slotsData : (slotsData?.slots || []));
        
        const fetchedTopics = (infoData as any)?.topics?.length ? (infoData as any).topics : fallbackTopics;
        setTopics(fetchedTopics);
        setSelectedTopic(fetchedTopics[0]);
        
        setMyBookings(Array.isArray(bookingsData) ? bookingsData : []);
      })
      .catch((err) => {
        console.error('Failed to load consultant data:', err);
        setTopics(fallbackTopics);
        setSelectedTopic(fallbackTopics[0]);
      })
      .finally(() => setLoadingSlots(false));
  }, [isPremium]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBook = async () => {
    if (!selectedSlot || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/consultant/bookings', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          scheduledAt: selectedSlot.isoUtc,
          topic: selectedTopic,
          notes: notes || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBooked(data);
        setMyBookings((prev) => [...prev, data]);
      }
    } catch {
      // handled via UI state
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (bookingId: string) => {
    try {
      await fetch(`/api/consultant/bookings/${bookingId}`, {
        method: 'DELETE',
        headers,
      });
      setMyBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, status: 'cancelled' } : b,
        ),
      );
    } catch {}
  };

  // ─── Not Premium: show gate ───
  if (!isPremium) {
    return (
      <div className="min-h-screen bg-educaro-secondary flex flex-col text-gray-900">
        <Navbar
          onToggleTracePanel={() => setIsTraceOpen(!isTraceOpen)}
          isTraceOpen={isTraceOpen}
        />
        <main className="flex-1 max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900">Premium Feature</h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            Consultant calling is part of <strong>Educaro Premium</strong>.
            Unlock it to book 1-on-1 calls with our senior immigration
            consultant and get direct phone access.
          </p>
          <button
            onClick={() => navigate('/checkout')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full btn-brand text-white text-sm font-bold shadow-xs transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>Unlock Educaro Premium</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </main>
        {isTraceOpen && <AgentTracePanel isOpen={isTraceOpen} onClose={() => setIsTraceOpen(false)} />}
      </div>
    );
  }

  // ─── Premium: full booking UI ───
  return (
    <div className="min-h-screen bg-educaro-secondary flex flex-col text-gray-900">
      <Navbar
        onToggleTracePanel={() => setIsTraceOpen(!isTraceOpen)}
        isTraceOpen={isTraceOpen}
      />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Back link */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <span className="badge-soft text-[10px] font-bold uppercase tracking-wider px-3 py-1">
            Premium · Consultant Support
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
            Book a Consultant Call
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 max-w-xl mx-auto">
            Schedule a call or dial directly — your Educaro consultant is ready
            to help with university applications, visa documents, and language
            planning.
          </p>
        </div>

        {/* Call Now card */}
        <div className="bg-white rounded-3xl border border-border p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-brand flex items-center justify-center">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Need help right now?</h3>
              <p className="text-xs text-gray-600">
                Tap below to call your consultant directly on their phone.
              </p>
            </div>
          </div>
          <CallNowButton />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ─── Left: Book a Slot ─── */}
          <div className="bg-white rounded-3xl border border-border p-6 shadow-xs space-y-5">
            {booked ? (
              /* ── Confirmation ── */
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-brand flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-gray-900">Call Booked!</h3>
                  <p className="text-xs text-gray-600">
                    Your consultation is confirmed for:
                  </p>
                </div>
                <div className="bg-gray-50 rounded-2xl border border-border p-4 text-left text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-bold text-gray-900">
                      {slots.find((s) => s.isoUtc === booked.scheduledAt)
                        ?.label || booked.scheduledAt}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Topic:</span>
                    <span className="font-medium text-gray-900">{booked.topic || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium text-emerald-700">
                      Confirmed
                    </span>
                  </div>
                </div>
                <div className="pt-2 space-y-2">
                  <CallNowButton bookingId={booked.id} className="w-full" />
                  <button
                    onClick={() => setBooked(null)}
                    className="w-full py-2 text-xs font-semibold text-gray-600 hover:text-gray-900"
                  >
                    Book Another Slot
                  </button>
                </div>
              </div>
            ) : loadingSlots ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-brand" />
              </div>
            ) : (
              /* ── Slot Picker ── */
              <>
                <h3 className="text-sm font-bold flex items-center gap-2 text-gray-900">
                  <Calendar className="w-4 h-4 text-brand" />
                  Select a Time Slot
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {slots.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSlot(s)}
                      className={`p-2.5 rounded-xl border text-xs text-left font-medium transition-all ${
                        selectedSlot?.id === s.id
                          ? 'btn-brand text-white shadow-xs'
                          : 'border-border bg-gray-50 text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Clock className="w-3 h-3 inline mr-1.5 opacity-60" />
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-900">
                    Consultation Topic:
                  </label>
                  <select
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-border bg-white text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    {topics.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-900">
                    Notes for consultant (optional):
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. I need help with my APS application…"
                    className="w-full p-2.5 rounded-xl border border-border bg-white text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>

                <button
                  onClick={handleBook}
                  disabled={!selectedSlot || submitting}
                  className="w-full py-3 px-4 rounded-full btn-brand text-white disabled:opacity-50 text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Calendar className="w-4 h-4" />
                  )}
                  <span>
                    {submitting ? 'Booking…' : 'Confirm Booking'}
                  </span>
                </button>
              </>
            )}
          </div>

          {/* ─── Right: My Bookings ─── */}
          <div className="bg-white rounded-3xl border border-border p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 text-gray-900">
              <ShieldCheck className="w-4 h-4 text-brand" />
              My Bookings
            </h3>
            {myBookings.length === 0 ? (
              <p className="text-xs text-gray-600 py-6 text-center">
                No bookings yet. Pick a slot on the left to get started.
              </p>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto">
                {myBookings.map((b) => (
                  <div
                    key={b.id}
                    className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                      b.status === 'cancelled'
                        ? 'border-red-200 bg-red-50/60 opacity-60 text-gray-900'
                        : 'border-border bg-gray-50 text-gray-900'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-gray-900">
                        {slots.find((s) => s.isoUtc === b.scheduledAt)?.label ||
                          new Date(b.scheduledAt).toLocaleString()}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          b.status === 'booked'
                            ? 'badge-soft'
                            : b.status === 'completed'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                    {b.topic && (
                      <p className="text-gray-600">Topic: {b.topic}</p>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      {b.status === 'booked' && (
                        <>
                          <CallNowButton
                            bookingId={b.id}
                            className="text-[10px] px-3 py-1.5"
                          />
                          <button
                            onClick={() => handleCancel(b.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-red-200 text-red-600 text-[10px] font-semibold hover:bg-red-50"
                          >
                            <XCircle className="w-3 h-3" />
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {isTraceOpen && <AgentTracePanel isOpen={isTraceOpen} onClose={() => setIsTraceOpen(false)} />}
    </div>
  );
};
