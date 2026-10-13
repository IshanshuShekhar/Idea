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
      <div className="bg-white rounded-3xl border border-border max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 bg-white border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg ${isPremiumActive ? 'btn-brand text-white' : 'bg-gray-100 text-gray-700'} flex items-center justify-center`}>
              {isPremiumActive ? <UserCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">
                  {isPremiumActive ? 'Schedule Senior Advisor Call' : 'Consultant Support • Educaro Premium'}
                </h3>
                {isPremiumActive ? (
                  <span className="badge-soft text-[10px] font-bold px-2 py-0.5">
                    ✓ Entitlement Active
                  </span>
                ) : (
                  <span className="badge-warning text-[10px] font-bold px-2 py-0.5">
                    Premium Feature
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-600">{serviceTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!isPremiumActive ? (
            <div className="space-y-5 text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
                <Lock className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base font-bold text-gray-900">
                  Educaro Premium Required for 1-on-1 Sessions
                </h4>
                <p className="text-xs text-gray-600 max-w-sm mx-auto leading-relaxed">
                  Direct consultation with a senior German immigration and APS advisor is exclusively unlocked with <strong>Educaro Premium</strong> (90 days of full access).
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-border text-left text-xs space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand block">
                  What is included in Educaro Premium:
                </span>
                <div className="flex items-center gap-2 text-gray-900">
                  <CheckCircle2 className="w-4 h-4 text-brand shrink-0" />
                  <span>1-on-1 45-min Google Meet session with Senior German Advisor</span>
                </div>
                <div className="flex items-center gap-2 text-gray-900">
                  <CheckCircle2 className="w-4 h-4 text-brand shrink-0" />
                  <span>Extended German Learning Path (C1 preparation & technical modules)</span>
                </div>
                <div className="flex items-center gap-2 text-gray-900">
                  <CheckCircle2 className="w-4 h-4 text-brand shrink-0" />
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
                  className="w-full py-3 px-4 rounded-full btn-brand text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Unlock Educaro Premium (₹100 / 90 Days)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          ) : isBooked ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-brand flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-gray-900">Consultation Call Confirmed!</h4>
                <p className="text-xs text-gray-600 max-w-sm mx-auto">
                  A Google Meet invitation for <strong>{selectedDate}</strong> has been dispatched to <strong>{user?.email}</strong>.
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-border text-left text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Advisor:</span>
                  <span className="font-bold text-gray-900">Educaro Senior Immigration Consultant</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Selected Topic:</span>
                  <span className="font-medium text-gray-900">{topic}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Meeting Format:</span>
                  <span className="font-medium text-emerald-700 flex items-center gap-1">
                    <Video className="w-3.5 h-3.5" /> 1-on-1 Google Meet (45 mins)
                  </span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-full btn-brand text-white text-xs font-semibold transition-colors shadow-xs"
              >
                Close & Return to Dashboard
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Your account holds an active <strong>Consultant Review</strong> entitlement. Choose your preferred slot below to connect directly with an Educaro advisor.
                </p>
              </div>

              {/* Time Slots */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand" />
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
                          ? 'btn-brand text-white shadow-xs'
                          : 'border-border bg-gray-50 text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-brand" />
                  <span>Primary Consultation Focus:</span>
                </label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border bg-white text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand"
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
                <label className="text-xs font-bold text-gray-900">
                  Specific questions for your advisor (optional):
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Inconsistency in my degree date, or German A2 to B1 exam schedule..."
                  className="w-full p-2.5 rounded-xl border border-border bg-white text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-full btn-brand text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
