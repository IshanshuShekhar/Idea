import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@educaro/shared';
import { Mail, Lock, KeyRound, ArrowRight, ArrowLeft, Sparkles, RefreshCw } from 'lucide-react';

const RESEND_COOLDOWN_SECONDS = 30;

export const AuthPage: React.FC = () => {
  const { login, register, sendOtp, verifyOtp, demoLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const initialEmail = searchParams.get('email') || '';

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [authMethod, setAuthMethod] = useState<'OTP' | 'PASSWORD'>('OTP');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      cooldownRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            if (cooldownRef.current) clearInterval(cooldownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [resendCooldown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const result = await sendOtp(email);
      setOtpSent(true);
      setOtpCode('');
      setInfoMsg(
        result.debugOtp
          ? `${result.message} Demo verification code: ${result.debugOtp}`
          : result.message,
      );
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send verification email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setErrorMsg('');
    try {
      const result = await sendOtp(email);
      setOtpCode('');
      setInfoMsg(
        result.debugOtp
          ? `${result.message} Demo verification code: ${result.debugOtp}`
          : result.message,
      );
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) return;
    setLoading(true);
    setErrorMsg('');
    try {
      await verifyOtp(email, otpCode);
      // PRD Section 8.2 #3: On successful signup or login, taken directly to Goal Intake!
      navigate('/journey/goal');
    } catch (err: any) {
      setOtpCode('');
      setErrorMsg(err.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      if (mode === 'signup') {
        await register(email, password, UserRole.APPLICANT, true);
      } else {
        await login(email, password);
      }
      navigate('/journey/goal');
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoApplicant = async () => {
    setLoading(true);
    try {
      await demoLogin(UserRole.APPLICANT);
      navigate('/journey/goal');
    } catch (err: any) {
      setErrorMsg(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-educaro-main flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      
      {/* Back to Home Link */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-educaro-muted hover:text-educaro-primary font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Homepage</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        
        {/* Card Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-educaro-accent text-black flex items-center justify-center font-bold text-xl mx-auto shadow-sm mb-3">
            ER
          </div>
          <h2 className="text-2xl font-extrabold text-educaro-primary tracking-tight">
            {mode === 'signup' ? 'Begin Your Germany Journey' : 'Welcome Back to EduRoute AI'}
          </h2>
          <p className="text-xs text-educaro-muted mt-1">
            {mode === 'signup'
              ? 'Create your applicant profile and discover your optimal pathway to Germany'
              : 'Sign in to resume your verified applicant profile & qualification status'}
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-educaro-main rounded-3xl border border-educaro-border p-6 sm:p-8 shadow-sm space-y-5">
          
          {/* Toggle between OTP and Password */}
          <div className="flex rounded-xl bg-educaro-secondary p-1 border border-educaro-border">
            <button
              type="button"
              data-button-size="compact"
              onClick={() => { setAuthMethod('OTP'); setOtpSent(false); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                authMethod === 'OTP' ? 'bg-educaro-accent text-black shadow-xs' : 'text-educaro-muted hover:text-educaro-primary'
              }`}
            >
              Email + Instant OTP
            </button>
            <button
              type="button"
              data-button-size="compact"
              onClick={() => setAuthMethod('PASSWORD')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                authMethod === 'PASSWORD' ? 'bg-educaro-accent text-black shadow-xs' : 'text-educaro-muted hover:text-educaro-primary'
              }`}
            >
              Password
            </button>
          </div>

          {/* Messages */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-educaro-icon border border-educaro-accent/20 text-xs text-educaro-accent">
              {errorMsg}
            </div>
          )}
          {infoMsg && (
            <div className="p-3 rounded-xl bg-educaro-icon border border-educaro-accent/20 text-xs text-educaro-accent">
              {infoMsg}
            </div>
          )}

          {/* OTP Authentication Flow */}
          {authMethod === 'OTP' ? (
            !otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-educaro-primary block mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-educaro-muted" />
                    <input
                      type="email"
                      required
                      placeholder="applicant@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-educaro-border bg-educaro-main text-xs sm:text-sm text-educaro-primary placeholder:text-educaro-muted focus:outline-none focus:ring-1 focus:ring-educaro-accent"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-educaro-accent text-black hover:bg-educaro-accentHover text-xs sm:text-sm font-semibold shadow-xs transition-colors"
                >
                  <span>{loading ? 'Sending Code...' : 'Send Verification OTP →'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <label className="font-semibold text-educaro-primary">Enter 6-Digit OTP</label>
                    <button
                      type="button"
                      onClick={() => { setOtpSent(false); setOtpCode(''); setErrorMsg(''); setInfoMsg(''); }}
                      className="text-educaro-accent hover:underline text-[11px]"
                    >
                      Change Email
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-educaro-muted" />
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="e.g. 123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-educaro-border bg-educaro-main text-center font-mono tracking-widest text-base font-bold text-educaro-primary focus:outline-none focus:ring-1 focus:ring-educaro-accent"
                    />
                  </div>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || resending}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium text-educaro-accent hover:text-educaro-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
                    {resending
                      ? 'Sending…'
                      : resendCooldown > 0
                      ? `Resend code (${resendCooldown}s)`
                      : 'Resend code'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-educaro-accent text-black hover:bg-educaro-accentHover text-xs sm:text-sm font-semibold shadow-xs transition-colors"
                >
                  <span>{loading ? 'Verifying...' : 'Verify & Enter Goal Intake →'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

            )
          ) : (
            /* Password Authentication Flow */
            <form onSubmit={handlePasswordAuth} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-educaro-primary block mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-educaro-muted" />
                  <input
                    type="email"
                    required
                    placeholder="applicant@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-educaro-border bg-educaro-main text-xs sm:text-sm text-educaro-primary placeholder:text-educaro-muted focus:outline-none focus:ring-1 focus:ring-educaro-accent"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-educaro-primary block mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-educaro-muted" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-educaro-border bg-educaro-main text-xs sm:text-sm text-educaro-primary placeholder:text-educaro-muted focus:outline-none focus:ring-1 focus:ring-educaro-accent"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-educaro-accent text-black hover:bg-educaro-accentHover text-xs sm:text-sm font-semibold shadow-xs transition-colors"
              >
                <span>{loading ? 'Authenticating...' : mode === 'signup' ? 'Create Account & Start →' : 'Sign In & Resume →'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Toggle between Sign Up and Sign In */}
          <div className="pt-2 text-center text-xs text-educaro-muted">
            {mode === 'signup' ? (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  data-button-size="compact"
                  onClick={() => { setMode('login'); setErrorMsg(''); setInfoMsg(''); }}
                  className="font-bold text-educaro-accent hover:underline"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p>
                New here?{' '}
                <button
                  type="button"
                  data-button-size="compact"
                  onClick={() => { setMode('signup'); setErrorMsg(''); setInfoMsg(''); }}
                  className="font-bold text-educaro-accent hover:underline"
                >
                  Sign up
                </button>
              </p>
            )}
          </div>

          {/* Quick Demo Access */}
          <div className="pt-3 border-t border-educaro-border text-center">
            <button
              type="button"
              onClick={handleQuickDemoApplicant}
              className="inline-flex items-center gap-1.5 text-xs text-educaro-accent hover:text-educaro-primary font-medium"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Instant 1-Click Demo Applicant Login</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
