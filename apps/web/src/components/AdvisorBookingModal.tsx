import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Calendar, Clock, Video, CheckCircle2, ShieldCheck, UserCheck, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useJourney } from '../context/JourneyContext';

interface AdvisorBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceTitle?: string;
}

export const AdvisorBookingModal: React.FC<AdvisorBookingModalProps> = ({
  isOpen,
  onClose,
  serviceTitle = 'Educaro Premium • 1-on-1 Senior Consultant Strategy Call',
}) => {
  const { user, token } = useAuth();
  const { entitlements } = useJourney();
  const navigate = useNavigate();

  const isPremiumActive =
    entitlements && (entitlements.includes('EDUCARO_PREMIUM') ||
    entitlements.includes('CONSULTANT_REVIEW') ||
    entitlements.includes('PRIORITY_APS_CONSULTANT_REVIEW'));

  console.log('AdvisorBookingModal render -> isOpen:', isOpen, 'isPremiumActive:', isPremiumActive, 'entitlements:', entitlements);

  const [selectedDate, setSelectedDate] = useState('Tomorrow, 3:00 PM IST');
  const [topic, setTopic] = useState('APS Certificate Filing & Transcript Review');
  const [notes, setNotes] = useState('');
  const [isBooked, setIsBooked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const dates = [
    'Tomorrow, 11:00 AM IST',
    'Tomorrow, 3:00 PM IST',
    'Day after tomorrow, 5:00 PM IST',
    'Saturday, 2:00 PM IST',
  ];

  const topics = [
    'APS Certificate Filing & Transcript Review',
    'University Selection & Anabin Degree Equivalence',
    'Ausbildung Contract & Employer Match',
    'Opportunity Card (Chancenkarte) Visa Strategy',
  ];

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/consultant/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          scheduledAt: selectedDate,
          topic,
          notes,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to book appointment');
      }

      setIsBooked(true);
    } catch (error) {
      console.error(error);
      alert('Failed to book appointment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-educaro-main rounded-3xl border border-educaro-border max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 bg-educaro-main border-b border-educaro-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg ${isPremiumActive ? 'bg-educaro-accent' : 'bg-educaro-accent'} text-white flex items-center justify-center`}>
              {isPremiumActive ? <UserCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-educaro-primary">
                  {isPremiumActive ? 'Schedule Senior Advisor Call' : 'Consultant Support • Educaro Premium'}
                </h3>
                {isPremiumActive ? (
                  <span className="text-[10px] font-bold text-educaro-accent bg-emerald-100 px-2 py-0.5 rounded-full">
                    ✓ Entitlement Active
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-educaro-accent bg-educaro-icon px-2 py-0.5 rounded-full">
                    Premium Feature
                  </span>
                )}
              </div>
              <p className="text-[11px] text-educaro-muted">{serviceTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-educaro-muted hover:text-educaro-primary hover:bg-educaro-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!isPremiumActive ? (
            <div className="space-y-5 text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-educaro-icon border border-educaro-accent/20 text-educaro-accent flex items-center justify-center mx-auto shadow-xs">
                <Lock className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base font-bold text-educaro-primary">
                  Educaro Premium Required for 1-on-1 Sessions
                </h4>
                <p className="text-xs text-educaro-muted max-w-sm mx-auto leading-relaxed">
                  Direct consultation with a senior German immigration and APS advisor is exclusively unlocked with <strong>Educaro Premium</strong> (90 days of full access).
                </p>
              </div>

              <div className="p-4 bg-educaro-main rounded-2xl border border-educaro-border text-left text-xs space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-educaro-accent block">
                  What is included in Educaro Premium:
                </span>
                <div className="flex items-center gap-2 text-educaro-primary">
                  <CheckCircle2 className="w-4 h-4 text-educaro-accent shrink-0" />
                  <span>1-on-1 45-min Google Meet session with Senior German Advisor</span>
                </div>
                <div className="flex items-center gap-2 text-educaro-primary">
                  <CheckCircle2 className="w-4 h-4 text-educaro-accent shrink-0" />
                  <span>Extended German Learning Path (C1 preparation & technical modules)</span>
                </div>
                <div className="flex items-center gap-2 text-educaro-primary">
                  <CheckCircle2 className="w-4 h-4 text-educaro-accent shrink-0" />
                  <span>Priority APS and document verification queue</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/journey/payment');
                  }}
                  className="w-full py-3 px-4 rounded-full bg-educaro-accent hover:bg-educaro-accentHover text-black text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Unlock Educaro Premium (₹100 / 90 Days)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 text-xs font-semibold text-educaro-muted hover:text-educaro-primary transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          ) : isBooked ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-educaro-accent flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-educaro-primary">Consultation Call Confirmed!</h4>
                <p className="text-xs text-educaro-muted max-w-sm mx-auto">
                  A Google Meet invitation for <strong>{selectedDate}</strong> has been dispatched to <strong>{user?.email}</strong>.
                </p>
              </div>

              <div className="p-4 bg-educaro-main rounded-2xl border border-educaro-border text-left text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-educaro-muted">Advisor:</span>
                  <span className="font-bold text-educaro-primary">Educaro Senior Immigration Consultant</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-educaro-muted">Selected Topic:</span>
                  <span className="font-medium text-educaro-primary">{topic}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-educaro-muted">Meeting Format:</span>
                  <span className="font-medium text-emerald-700 flex items-center gap-1">
                    <Video className="w-3.5 h-3.5" /> 1-on-1 Google Meet (45 mins)
                  </span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-full bg-educaro-accent text-black text-xs font-semibold hover:bg-educaro-accentHover transition-colors shadow-xs"
              >
                Close & Return to Dashboard
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              
              <div className="p-3.5 bg-educaro-icon/80 rounded-2xl border border-educaro-accent/20 text-xs text-[#116830] flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-educaro-accent shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Your account holds an active <strong>Consultant Review</strong> entitlement. Choose your preferred slot below to connect directly with an Educaro advisor.
                </p>
              </div>

              {/* Time Slots */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-educaro-primary flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-educaro-accent" />
                  <span>Select Consultation Slot:</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {dates.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDate(d)}
                      className={`p-2.5 rounded-xl border text-xs text-left font-medium transition-all ${
                        selectedDate === d
                          ? 'border-educaro-accent bg-educaro-accent text-black shadow-xs'
                          : 'border-educaro-border bg-educaro-main text-educaro-primary hover:bg-educaro-secondary'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-educaro-primary flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-educaro-accent" />
                  <span>Primary Consultation Focus:</span>
                </label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-educaro-border bg-white text-xs text-educaro-primary focus:outline-none focus:ring-1 focus:ring-educaro-accent"
                >
                  {topics.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Extra Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-educaro-primary">
                  Specific questions for your advisor (optional):
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Inconsistency in my degree date, or German A2 to B1 exam schedule..."
                  className="w-full p-2.5 rounded-xl border border-educaro-border bg-white text-xs text-educaro-primary focus:outline-none focus:ring-1 focus:ring-educaro-accent"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-full bg-educaro-accent text-black hover:bg-educaro-accentHover text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Video className="w-4 h-4" />
                  <span>{isSubmitting ? 'Confirming...' : 'Confirm Advisor Video Appointment'}</span>
                </button>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
};
