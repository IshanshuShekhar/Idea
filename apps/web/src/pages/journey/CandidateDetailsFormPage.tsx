import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { StepHeader } from '../../components/StepHeader';
import { ProvenanceBadge } from '../../components/ProvenanceBadge';
import { AdvisorBookingModal } from '../../components/AdvisorBookingModal';
import { AgentTracePanel } from '../../components/AgentTracePanel';
import { CountryPhoneInput } from '../../components/CountryPhoneInput';
import { useAuth } from '../../context/AuthContext';
import { useJourney } from '../../context/JourneyContext';
import { Provenance } from '@educaro/shared';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Globe,
  Languages,
  Sparkles,
  ShieldCheck,
  Headphones,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export const CandidateDetailsFormPage: React.FC = () => {
  const { user, token } = useAuth();
  const { profileFields, refreshJourney } = useJourney();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('23');
  const [country, setCountry] = useState('India');
  const [germanLevel, setGermanLevel] = useState('None');
  const [englishLevel, setEnglishLevel] = useState('Fluent (C1)');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdvisorBookingOpen, setIsAdvisorBookingOpen] = useState(false);
  const [isTraceOpen, setIsTraceOpen] = useState(false);

  // Pre-fill from existing profile fields or user account if present
  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
    if (profileFields['fullName']?.value) {
      setFullName(profileFields['fullName'].value);
    }
    if (profileFields['email']?.value) setEmail(profileFields['email'].value);
    if (profileFields['phone']?.value) setPhone(profileFields['phone'].value);
    if (profileFields['age']?.value) setAge(profileFields['age'].value);
    if (profileFields['country']?.value) setCountry(profileFields['country'].value);
    if (profileFields['germanLevel']?.value) setGermanLevel(profileFields['germanLevel'].value);
    if (profileFields['englishLevel']?.value) setEnglishLevel(profileFields['englishLevel'].value);
  }, [user, profileFields]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (token) {
        await fetch('/api/profile/candidate-details', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fullName,
            email,
            phone,
            age,
            country,
            germanLevel,
            englishLevel,
          }),
        });

        await refreshJourney();
      }

      navigate('/journey/chat');
    } catch (err) {
      console.error('Failed to submit candidate details:', err);
      navigate('/journey/chat');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-educaro-main flex flex-col text-educaro-primary">
      <Navbar onToggleTracePanel={() => setIsTraceOpen(!isTraceOpen)} isTraceOpen={isTraceOpen} />

      <StepHeader
        currentStepIndex={4}
        totalSteps={12}
        stepTitle="Candidate Details"
        stepSubtitle="Provide your basic background information to begin profile generation."
        backRoute="/journey/goal"
        nextRoute="/journey/chat"
        continueLabel={isSubmitting ? 'Saving Profile...' : 'Continue to Intake Chat →'}
        onContinue={() => handleSubmit({ preventDefault: () => {} } as any)}
      />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Banner with Provenance Badge */}
        <div className="bg-educaro-main rounded-3xl border border-educaro-border p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-educaro-icon text-educaro-accent border border-educaro-border">
                Step 2 of 7
              </span>
              <ProvenanceBadge
                provenance={Provenance.APPLICANT_PROVIDED}
                sourceText="Direct applicant input"
              />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-educaro-primary">
              Personal & Language Information
            </h2>
            <p className="text-xs text-educaro-muted max-w-xl">
              Enter your official applicant details. All fields submitted here receive strict{' '}
              <strong>Applicant-Provided</strong> provenance and seed your verified intake record.
            </p>
          </div>

          {/* Talk to Consultant Link / Button */}
          <div className="shrink-0 bg-educaro-main p-4 rounded-2xl border border-educaro-border text-center space-y-2">
            <p className="text-[11px] text-educaro-muted font-medium">Need immediate guidance?</p>
            <button
              type="button"
              onClick={() => {
                console.log('TALK TO CONSULTANT BUTTON CLICKED!');
                setIsAdvisorBookingOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-educaro-accent hover:bg-educaro-accentHover text-black text-xs font-semibold shadow-sm hover:shadow-md transition-shadow transition-colors"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Talk to a Consultant</span>
            </button>
          </div>
        </div>

        {/* Form Container */}
        <form
          onSubmit={handleSubmit}
          className="bg-educaro-main rounded-3xl border border-educaro-border p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow space-y-6"
        >
          {/* Section: Personal Info */}
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-educaro-border mb-5">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-educaro-accent" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-educaro-primary">
                  Personal & Contact Details
                </h3>
              </div>
              <ProvenanceBadge provenance={Provenance.APPLICANT_PROVIDED} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-educaro-primary flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-educaro-accent" />
                  <span>Full Legal Name (as per Passport) *</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-4 py-2.5 rounded-xl border border-educaro-border bg-educaro-main text-xs sm:text-sm text-educaro-primary focus:outline-none focus:ring-1 focus:ring-educaro-accent"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-educaro-primary flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-educaro-accent" />
                  <span>Email Address *</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. rahul.sharma@example.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-educaro-border bg-educaro-main text-xs sm:text-sm text-educaro-primary focus:outline-none focus:ring-1 focus:ring-educaro-accent"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-educaro-primary flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-educaro-accent" />
                  <span>Phone Number *</span>
                </label>
                <CountryPhoneInput
                  value={phone}
                  onChange={(val) => setPhone(val)}
                  required
                />
              </div>

              {/* Age */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-educaro-primary flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-educaro-accent" />
                  <span>Age *</span>
                </label>
                <input
                  type="number"
                  min="16"
                  max="65"
                  required
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="23"
                  className="w-full px-4 py-2.5 rounded-xl border border-educaro-border bg-educaro-main text-xs sm:text-sm text-educaro-primary focus:outline-none focus:ring-1 focus:ring-educaro-accent"
                />
              </div>

              {/* Country */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-educaro-primary flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-educaro-accent" />
                  <span>Country of Residence *</span>
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-educaro-border bg-educaro-main text-xs sm:text-sm text-educaro-primary focus:outline-none focus:ring-1 focus:ring-educaro-accent"
                >
                  <option value="India">India</option>
                  <option value="Germany">Germany</option>
                  <option value="United Arab Emirates">United Arab Emirates</option>
                  <option value="Singapore">Singapore</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Language Proficiency */}
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-educaro-border mb-5">
              <div className="flex items-center gap-2">
                <Languages className="w-4 h-4 text-educaro-accent" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-educaro-primary">
                  Language Proficiency
                </h3>
              </div>
              <ProvenanceBadge provenance={Provenance.APPLICANT_PROVIDED} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* German Level */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-educaro-primary">
                  German Level (CEFR) *
                </label>
                <select
                  value={germanLevel}
                  onChange={(e) => setGermanLevel(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-educaro-border bg-educaro-main text-xs sm:text-sm text-educaro-primary focus:outline-none focus:ring-1 focus:ring-educaro-accent"
                >
                  <option value="None">None / Absolute Beginner</option>
                  <option value="A1">A1 — Elementary Beginner</option>
                  <option value="A2">A2 — Waystage / Pre-Intermediate</option>
                  <option value="B1">B1 — Intermediate (Meets Ausbildung minimum)</option>
                  <option value="B2">B2 — Vantage / Upper Intermediate</option>
                </select>
                <p className="text-[10px] text-educaro-muted">
                  If you hold an official Goethe certificate, you will review it in Step 4.
                </p>
              </div>

              {/* English Level */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-educaro-primary">
                  English Level *
                </label>
                <select
                  value={englishLevel}
                  onChange={(e) => setEnglishLevel(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-educaro-border bg-educaro-main text-xs sm:text-sm text-educaro-primary focus:outline-none focus:ring-1 focus:ring-educaro-accent"
                >
                  <option value="Basic (A1/A2)">Basic (A1/A2)</option>
                  <option value="Intermediate (B1/B2)">Intermediate (B1/B2)</option>
                  <option value="Fluent (C1)">Fluent (C1 — Academic MOI)</option>
                  <option value="Native / Bilingual (C2)">Native / Bilingual (C2)</option>
                </select>
                <p className="text-[10px] text-educaro-muted">
                  Required for English-taught master’s programs and technical roles.
                </p>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-educaro-border">
            <button
              type="button"
              onClick={() => navigate('/journey/goal')}
              className="text-xs text-educaro-muted hover:text-educaro-primary font-medium"
            >
              ← Back to Pathway Selection
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-educaro-accent hover:bg-educaro-accentHover text-black text-xs sm:text-sm font-semibold shadow-sm hover:shadow-md transition-shadow transition-colors"
            >
              <span>{isSubmitting ? 'Saving Profile...' : 'Save & Proceed to Profile Chat'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </main>

      {/* Advisor Booking Modal */}
      <AdvisorBookingModal
        isOpen={isAdvisorBookingOpen}
        onClose={() => setIsAdvisorBookingOpen(false)}
      />

      <AgentTracePanel isOpen={isTraceOpen} onClose={() => setIsTraceOpen(false)} />
    </div>
  );
};

