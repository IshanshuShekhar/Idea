import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useJourney } from '../context/JourneyContext';
import { CheckoutPlanInfo } from '@educaro/shared';
import {
  X,
  QrCode,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Upload,
  ExternalLink,
  Sparkles,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureKey?: string;
  featureTitle?: string;
  amount?: number;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, token } = useAuth();
  const { refreshJourney } = useJourney();
  const navigate = useNavigate();

  const [checkoutInfo, setCheckoutInfo] = useState<CheckoutPlanInfo | null>(null);
  const [method, setMethod] = useState<'QR' | 'UPI'>('QR');
  const [utrInput, setUtrInput] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchInfo = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/payment/checkout-info');
        if (res.ok) {
          const data = await res.json();
          setCheckoutInfo(data);
        }
      } catch (err) {
        console.error('Failed to load checkout details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, [isOpen]);

  if (!isOpen) return null;

  const copyUpi = () => {
    if (checkoutInfo?.upiId) {
      navigator.clipboard.writeText(checkoutInfo.upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReceiptFile(file);
      setReceiptPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (isDemoInstant = false) => {
    setIsProcessing(true);
    setErrorMsg('');
    try {
      const formData = new FormData();
      const finalUtr = utrInput.trim() || (isDemoInstant ? `DEMO-UTR-${Date.now()}` : '');
      if (finalUtr) {
        formData.append('utr', finalUtr);
      }
      if (receiptFile) {
        formData.append('receipt', receiptFile);
      }

      // 1. Submit payment proof
      const res = await fetch('/api/payment/submit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Payment submission failed');

      // If instant demo mode requested, confirm immediately
      if (isDemoInstant && data.purchase?.id) {
        await fetch(`/api/payment/confirm/${data.purchase.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ notes: 'Instant demo confirmation via modal' }),
        });
      }

      setIsSuccess(true);
      await refreshJourney();
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong submitting payment');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-3xl border border-border max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 bg-white border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg btn-brand text-white flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">Educaro Premium Checkout 🇮🇳</h3>
                <span className="badge-soft">
                  UPI / QR
                </span>
              </div>
              <p className="text-[11px] text-gray-500">90-Day Full Entitlement • Single Payment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-gray-900">Payment Recorded Successfully!</h4>
                <p className="text-xs text-gray-600 max-w-sm mx-auto">
                  Your Educaro Premium submission is safely recorded against your account (<strong>{user?.email}</strong>) in PostgreSQL.
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-border text-xs text-gray-900 text-left space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Plan:</span>
                  <span className="font-bold">Educaro Premium (90 Days)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">UTR / Ref:</span>
                  <span className="font-mono">{utrInput || 'Submitted'}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  onClose();
                  navigate('/candidate-details');
                }}
                className="w-full py-2.5 rounded-full btn-brand text-white text-xs font-semibold shadow-xs"
              >
                Go to Candidate Details
              </button>
            </div>
          ) : loading ? (
            <div className="text-center py-12 flex flex-col items-center justify-center animate-in fade-in duration-500">
              <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-gray-500">Loading secure UPI details...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Product Card */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-border">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                      Unified Premium Tier
                    </span>
                    <h4 className="text-sm font-bold text-gray-900">
                      {checkoutInfo?.planName || 'Educaro Premium'}
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-gray-900">
                      ₹{checkoutInfo?.amount || 100}
                    </span>
                    <span className="block text-[10px] text-gray-500">90 Days Access</span>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-border grid grid-cols-2 gap-1.5 text-[11px] text-gray-700">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>1-on-1 Advisor Session</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Extended German Path</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Priority Document Review</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Survives Re-login</span>
                  </div>
                </div>
              </div>

              {/* Method Switcher */}
              <div className="flex rounded-xl bg-gray-100 p-1 border border-border">
                <button
                  type="button"
                  data-button-size="compact"
                  onClick={() => setMethod('QR')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    method === 'QR' ? 'btn-brand text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Scan Dynamic UPI QR</span>
                </button>
                <button
                  type="button"
                  data-button-size="compact"
                  onClick={() => setMethod('UPI')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    method === 'UPI' ? 'btn-brand text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>UPI ID / VPA</span>
                </button>
              </div>

              {/* Mode display */}
              {method === 'QR' ? (
                <div className="text-center p-4 bg-gray-50 rounded-2xl border border-border space-y-2.5">
                  {checkoutInfo?.qrCodeDataUrl ? (
                    <div className="w-44 h-44 mx-auto bg-white p-2 rounded-xl border border-border shadow-xs flex items-center justify-center">
                      <img
                        src={checkoutInfo.qrCodeDataUrl}
                        alt="Educaro UPI QR Code"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-44 h-44 mx-auto bg-white flex items-center justify-center border border-border rounded-xl text-xs text-gray-500">
                      <div className="flex flex-col items-center"><div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin mb-2"></div><span>Loading QR...</span></div>
                    </div>
                  )}
                  <p className="text-[11px] text-gray-600">
                    Scan using Google Pay, PhonePe, Paytm, BHIM, or CRED
                  </p>
                  {checkoutInfo?.upiUri && (
                    <a
                      href={checkoutInfo.upiUri}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-brand hover:text-brand-dark hover:underline"
                    >
                      <span>Pay directly via UPI mobile app</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-2xl border border-border space-y-3">
                  <label className="text-xs font-semibold text-gray-900 block">
                    Educaro Business UPI VPA:
                  </label>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-border">
                    <span className="font-mono text-xs font-bold text-gray-900 flex-1">
                      {checkoutInfo?.upiId || 'Loading...'}
                    </span>
                    <button
                      type="button"
                      onClick={copyUpi}
                      className="p-1 rounded text-gray-500 hover:text-gray-900"
                      title="Copy UPI ID"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    Send exactly ₹{checkoutInfo?.amount || 100} to this UPI ID from any banking app.
                  </p>
                </div>
              )}

              {/* UTR and Receipt Form */}
              <div className="p-3.5 bg-white rounded-2xl border border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">Payment Verification Proof</span>
                  <span className="badge-soft">
                    Manual Verification
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Enter 12-digit UPI Reference / UTR Number"
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand font-mono"
                />

                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-dashed border-border hover:border-brand bg-gray-50 text-xs text-gray-600 transition-colors">
                    <Upload className="w-3.5 h-3.5 text-gray-600" />
                    <span className="truncate">
                      {receiptFile ? receiptFile.name : 'Upload Screenshot / Receipt'}
                    </span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {receiptPreview && (
                    <img
                      src={receiptPreview}
                      alt="Receipt preview"
                      className="w-8 h-8 rounded-lg object-cover border border-border"
                    />
                  )}
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-red-700 bg-red-50 p-2.5 rounded-xl border border-red-200">
                  {errorMsg}
                </p>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSubmit(false)}
                    disabled={isProcessing}
                    className="py-2.5 px-3 rounded-full btn-ghost-brand text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {isProcessing ? 'Submitting...' : "I've Paid — Upload Receipt"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmit(true)}
                    disabled={isProcessing}
                    className="py-2.5 px-3 rounded-full btn-brand text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Instant Demo Confirm</span>
                  </button>
                </div>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/checkout');
                    }}
                    className="text-xs text-brand hover:text-brand-dark hover:underline inline-flex items-center gap-1 font-semibold"
                  >
                    <span>Open full dedicated checkout page</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
