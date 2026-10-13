import React, { useEffect, useState } from 'react';
import { PhoneCall, Loader2 } from 'lucide-react';

interface CallNowButtonProps {
  /** If true, also logs the call to the backend */
  logCall?: boolean;
  bookingId?: string;
  className?: string;
}

/**
 * Reusable "Call Consultant Now" button.
 * Fetches the phone number from the server (never hardcoded).
 * Renders a real tel: link that opens the device dialer.
 * Only renders content when phone number is available.
 */
export const CallNowButton: React.FC<CallNowButtonProps> = ({
  logCall = true,
  bookingId,
  className = '',
}) => {
  const [phone, setPhone] = useState<string | null>(null);
  const [consultantName, setConsultantName] = useState('Consultant');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    fetch('/api/consultant/info', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.phone) {
          setPhone(data.phone);
          setConsultantName(data.name || 'Consultant');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCallClick = async () => {
    if (!logCall) return; // just let the tel: link do its thing
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    try {
      await fetch('/api/consultant/call-log', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId: bookingId || undefined }),
      });
    } catch {
      // non-blocking — call still proceeds via tel: link
    }
  };

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-educaro-muted">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
      </span>
    );
  }

  if (!phone) return null;

  return (
    <a
      href={`tel:${phone}`}
      onClick={handleCallClick}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors ${className}`}
      title={`Call ${consultantName} at ${phone}`}
    >
      <PhoneCall className="w-4 h-4" />
      <span>Call Consultant Now</span>
    </a>
  );
};

