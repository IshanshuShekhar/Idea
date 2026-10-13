import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { StepHeader } from '../../components/StepHeader';
import { AgentTracePanel } from '../../components/AgentTracePanel';
import { useAuth } from '../../context/AuthContext';
import {
  GermanCity,
  GermanCityId,
  AccommodationType,
  PathwayType,
  FinancialScenario,
  FinancialDataSourceInfo,
  GERMAN_STATUTORY_CONSTANTS,
  GERMAN_CITIES_CATALOG,
  FINANCIAL_DATA_SOURCES,
  calculateFinancialScenario,
  formatEUR,
  formatINR,
} from '@educaro/shared';
import {
  Calculator,
  Building2,
  Wallet,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Info,
  DollarSign,
  Briefcase,
  Home,
  Plane,
  FileCheck,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Sliders,
  Layers,
  ExternalLink,
  BookOpen,
  PieChart,
  Scale,
  Compass,
} from 'lucide-react';

export const FinancialSimulatorPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [isTraceOpen, setIsTraceOpen] = useState(false);
  const [currency, setCurrency] = useState<'EUR' | 'INR'>('EUR');
  const [exchangeRate, setExchangeRate] = useState<number>(GERMAN_STATUTORY_CONSTANTS.DEFAULT_EUR_TO_INR_RATE);

  // Active inputs for the unified calculator
  const [pathway, setPathway] = useState<PathwayType>('MASTER');
  const [selectedCityId, setSelectedCityId] = useState<GermanCityId>('aachen');
  const [accommodation, setAccommodation] = useState<AccommodationType>('WG_SHARED');
  const [durationMonths, setDurationMonths] = useState<number>(24);
  const [savingsINR, setSavingsINR] = useState<number>(1400000); // ~€15,500
  const [loanINR, setLoanINR] = useState<number>(1000000); // ~€11,000
  const [familySupportMonthlyEUR, setFamilySupportMonthlyEUR] = useState<number>(200);
  const [scholarshipMonthlyEUR, setScholarshipMonthlyEUR] = useState<number>(0);
  const [plansToWorkPartTime, setPlansToWorkPartTime] = useState<boolean>(true);
  const [workHoursPerWeek, setWorkHoursPerWeek] = useState<number>(15);
  const [hourlyWageEUR, setHourlyWageEUR] = useState<number>(14.5);

  // Custom user expense overrides (optional)
  const [customRentEUR, setCustomRentEUR] = useState<number | undefined>(undefined);

  // City comparison multi-selection (2-5 cities)
  const [comparisonCityIds, setComparisonCityIds] = useState<GermanCityId[]>(['munich', 'berlin', 'aachen', 'leipzig']);

  // UI state
  const [activeSection, setActiveSection] = useState<string>('profile');
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);

  // References for scrolling
  const sectionRefs = {
    profile: useRef<HTMLDivElement>(null),
    cities: useRef<HTMLDivElement>(null),
    relocation: useRef<HTMLDivElement>(null),
    monthly: useRef<HTMLDivElement>(null),
    recommendations: useRef<HTMLDivElement>(null),
    sources: useRef<HTMLDivElement>(null),
  };

  const scrollToSection = (sec: keyof typeof sectionRefs) => {
    setActiveSection(sec);
    sectionRefs[sec]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Helper to format values in currently toggled currency
  const formatMoney = (eurAmount: number, inrAmount?: number): string => {
    if (currency === 'INR') {
      const inr = inrAmount !== undefined ? inrAmount : Math.round(eurAmount * exchangeRate);
      return formatINR(inr);
    }
    return formatEUR(eurAmount);
  };

  // Helper to format both EUR and INR for comprehensive clarity
  const formatBoth = (eurAmount: number, inrAmount?: number): string => {
    const inr = inrAmount !== undefined ? inrAmount : Math.round(eurAmount * exchangeRate);
    return `${formatEUR(eurAmount)} (${formatINR(inr)})`;
  };

  // Selected city object
  const selectedCity: GermanCity = useMemo(() => {
    return (
      GERMAN_CITIES_CATALOG.find((c) => c.id === selectedCityId) ||
      GERMAN_CITIES_CATALOG[0]
    );
  }, [selectedCityId]);

  // Unified Real-Time Calculation Engine Execution (returns complete FinancialScenario)
  const activeScenarioResult: FinancialScenario = useMemo(() => {
    return calculateFinancialScenario({
      cityId: selectedCityId,
      accommodationType: accommodation,
      durationMonths,
      exchangeRate,
      pathway,
      availableSavingsINR: savingsINR,
      educationLoanINR: loanINR,
      familySupportMonthlyEUR,
      scholarshipMonthlyEUR,
      hasScholarshipConfirmed: scholarshipMonthlyEUR > 0,
      plansToWorkPartTime,
      workHoursPerWeek,
      hourlyWageEUR,
      customRentEUR,
    });
  }, [
    selectedCityId,
    accommodation,
    durationMonths,
    exchangeRate,
    pathway,
    savingsINR,
    loanINR,
    familySupportMonthlyEUR,
    scholarshipMonthlyEUR,
    plansToWorkPartTime,
    workHoursPerWeek,
    hourlyWageEUR,
    customRentEUR,
  ]);

  // Load applicant profile to prefill financial values on mount
  useEffect(() => {
    const fetchProfile = async () => {
      setLoadingProfile(true);
      try {
        if (token) {
          const res = await fetch('/api/profile/comprehensive', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.data) {
              const p = data.data;
              if (p.goals?.targetPathway) {
                const target = p.goals.targetPathway.toUpperCase();
                if (target.includes('AUSBILDUNG')) setPathway('AUSBILDUNG');
                else if (target.includes('EMPLOYMENT') || target.includes('JOB')) setPathway('JOB_SEEKER');
                else if (target.includes('BACHELOR')) setPathway('BACHELOR');
                else setPathway('MASTER');
              }
              if (p.financial?.fundingNeedLevel === 'NOT_NEEDED') {
                setSavingsINR(2500000);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Could not load profile:', err);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [token]);

  // Toggle city in comparison matrix
  const handleToggleComparisonCity = (cityId: GermanCityId) => {
    if (comparisonCityIds.includes(cityId)) {
      if (comparisonCityIds.length > 2) {
        setComparisonCityIds(comparisonCityIds.filter((id) => id !== cityId));
      }
    } else {
      if (comparisonCityIds.length < 5) {
        setComparisonCityIds([...comparisonCityIds, cityId]);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 font-sans pb-16">
      <Navbar onToggleTracePanel={() => setIsTraceOpen(!isTraceOpen)} isTraceOpen={isTraceOpen} />

      <StepHeader
        currentStepIndex={7}
        totalSteps={10}
        stepTitle="Financial Reality Simulator"
        stepSubtitle="Unified German relocation cost calculator, city cost comparison, and monthly living budgets."
        backRoute="/journey/scholarships"
        nextRoute="/journey/roadmap"
        continueLabel="Continue to Roadmap"
      />

      {/* STICKY REALITY CHECK SUMMARY BAR */}
      <div className="sticky top-20 z-30 w-full bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
          
          {/* Active Config Overview */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-teal-800 uppercase tracking-wide bg-teal-50 px-2 py-0.5 rounded">
                  Live Reality Check
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {selectedCity.name} · {accommodation === 'WG_SHARED' ? 'Shared Flat (WG)' : accommodation === 'STUDENT_DORM' ? 'Student Dorm' : 'Studio'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {pathway} · {durationMonths} Months ({durationMonths / 12} yrs)
              </p>
            </div>
          </div>

          {/* Key Live Metrics Pill */}
          <div className="flex items-center flex-wrap gap-4 text-xs">
            <div className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
              <span className="text-gray-500 block text-[10px] uppercase font-semibold">Total Upfront Cash</span>
              <span className="font-extrabold text-gray-900 text-sm">
                {formatMoney(activeScenarioResult.relocation.totalRelocationEUR, activeScenarioResult.relocation.totalRelocationINR)}
              </span>
            </div>

            <div className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
              <span className="text-gray-500 block text-[10px] uppercase font-semibold">Monthly Net Balance</span>
              <span
                className={`font-extrabold text-sm ${
                  activeScenarioResult.monthly.netMonthlyBalanceEUR >= 0
                    ? 'text-emerald-600'
                    : 'text-rose-600'
                }`}
              >
                {activeScenarioResult.monthly.netMonthlyBalanceEUR >= 0 ? '+' : ''}
                {formatMoney(activeScenarioResult.monthly.netMonthlyBalanceEUR, activeScenarioResult.monthly.netMonthlyBalanceINR)}
                <span className="text-[10px] text-gray-400 font-normal ml-0.5">/mo</span>
              </span>
            </div>

            <div className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
              <span className="text-gray-500 block text-[10px] uppercase font-semibold">Total Projected Cost</span>
              <span className="font-extrabold text-teal-800 text-sm">
                {formatMoney(activeScenarioResult.totalProjectedCostEUR, activeScenarioResult.totalProjectedCostINR)}
              </span>
            </div>
          </div>

          {/* Currency Toggle */}
          <div className="flex items-center gap-2">
            <div className="bg-gray-100 p-0.5 rounded-lg flex items-center text-xs font-semibold border border-gray-200">
              <button
                onClick={() => setCurrency('EUR')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  currency === 'EUR' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                EUR (€)
              </button>
              <button
                onClick={() => setCurrency('INR')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  currency === 'INR' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                INR (₹)
              </button>
            </div>
          </div>

        </div>

        {/* Section Navigation Quick Jump Pills */}
        <div className="bg-gray-50/80 border-t border-gray-200 px-4 sm:px-6 lg:px-8 py-1.5">
          <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto text-xs text-gray-600 no-scrollbar">
            <span className="text-[11px] font-bold uppercase text-gray-400 mr-2 shrink-0">Sections:</span>
            {[
              { id: 'profile', label: '1. Financial Profile' },
              { id: 'cities', label: '2. City Cost Comparison' },
              { id: 'relocation', label: '3. Calculate Moving Costs' },
              { id: 'monthly', label: '4. Monthly Budget' },
              { id: 'recommendations', label: '5. Personalized Recommendations' },
              { id: 'sources', label: '6. Cost Sources & Methodology' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => scrollToSection(tab.id as keyof typeof sectionRefs)}
                className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
                  activeSection === tab.id
                    ? 'bg-teal-700 text-white font-semibold shadow-xs'
                    : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-12">

        {/* PAGE INTRO HERO */}
        <section className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-teal-300 text-xs font-semibold mb-4 border border-white/10">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Unified Financial Engine · Germany 2026 Statutory Baseline</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              German Financial Reality Simulator
            </h1>
            <p className="mt-3 text-sm sm:text-base text-gray-300 leading-relaxed font-light">
              Eliminate unexpected financial distress before leaving India. Simulate your real costs across 10 German student cities, calculate exact visa-compliant blocked account & relocation outlays, and balance part-time work limits in real time on this single page.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-gray-300">
              <div className="flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-teal-400" />
                <span>AufenthG § 16b Sperrkonto €11,904/yr</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-teal-400" />
                <span>DSW 22nd Social Survey Benchmarks</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-teal-400" />
                <span>140 Full Days / 280 Half Days Work Permit Rule</span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 1: PERSONAL FINANCIAL PROFILE & USER INPUTS */}
        {/* ========================================================================= */}
        <section ref={sectionRefs.profile} className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-200">
                  1
                </span>
                <h2 className="text-xl font-bold text-gray-900">Your Financial Profile & Core Inputs</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Configure your target pathway, available capital, monthly support, and part-time student work expectations.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">EUR/INR Rate:</span>
              <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-xl border border-gray-200">
                <span className="text-xs font-semibold text-gray-700">₹</span>
                <input
                  type="number"
                  min="80"
                  max="105"
                  step="0.5"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 90.5)}
                  className="w-14 bg-transparent text-xs font-bold text-gray-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Pathway */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Target Pathway</label>
              <select
                value={pathway}
                onChange={(e) => setPathway(e.target.value as PathwayType)}
                className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:bg-white focus:ring-2 focus:ring-teal-500 transition"
              >
                <option value="MASTER">Master's Degree (University / FH)</option>
                <option value="BACHELOR">Bachelor's Degree (Undergraduate)</option>
                <option value="AUSBILDUNG">Ausbildung (Vocational Training)</option>
                <option value="JOB_SEEKER">Direct Employment / Job Seeker</option>
              </select>
              <p className="text-[11px] text-gray-400">Determines visa statutory minimum & tuition eligibility</p>
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Planned Duration</label>
              <select
                value={durationMonths}
                onChange={(e) => setDurationMonths(parseInt(e.target.value, 10))}
                className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:bg-white focus:ring-2 focus:ring-teal-500 transition"
              >
                <option value={12}>12 Months (1 Year - Standard Sperrkonto)</option>
                <option value={18}>18 Months (1.5 Years)</option>
                <option value={24}>24 Months (2 Years - Typical Master's)</option>
                <option value={36}>36 Months (3 Years - Typical Bachelor's / Ausbildung)</option>
                <option value={48}>48 Months (4 Years)</option>
              </select>
              <p className="text-[11px] text-gray-400">Total duration used for multi-year cost projection</p>
            </div>

            {/* Target City */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Active German City</label>
              <select
                value={selectedCityId}
                onChange={(e) => setSelectedCityId(e.target.value as GermanCityId)}
                className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:bg-white focus:ring-2 focus:ring-teal-500 transition"
              >
                {GERMAN_CITIES_CATALOG.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.state}) · {c.tier === 'VERY_HIGH' ? 'High Cost' : c.tier === 'HIGH' ? 'High' : c.tier === 'MODERATE' ? 'Moderate' : 'Affordable'}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400">Governs local rental rates and semester ticket fees</p>
            </div>

            {/* Accommodation Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Housing Type</label>
              <div className="grid grid-cols-3 gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200">
                {(['WG_SHARED', 'STUDENT_DORM', 'PRIVATE_STUDIO'] as AccommodationType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setAccommodation(type);
                      setCustomRentEUR(undefined);
                    }}
                    className={`py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                      accommodation === type
                        ? 'bg-white text-teal-700 shadow-xs'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {type === 'WG_SHARED' ? 'WG Flat' : type === 'STUDENT_DORM' ? 'Dorm' : 'Studio'}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400">
                {accommodation === 'WG_SHARED'
                  ? 'Shared apartment with roommates'
                  : accommodation === 'STUDENT_DORM'
                  ? 'Studentenwerk dorm (long waitlist)'
                  : 'Single private studio flat'}
              </p>
            </div>

          </div>

          {/* Capital & Inflow Sliders / Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-gray-100">
            
            {/* Available Savings */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Personal / Family Savings</span>
                <span className="text-xs font-extrabold text-teal-700">{formatINR(savingsINR)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="3500000"
                step="50000"
                value={savingsINR}
                onChange={(e) => setSavingsINR(parseFloat(e.target.value))}
                className="w-full accent-teal-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>₹0</span>
                <span>₹17.5 Lakhs</span>
                <span>₹35 Lakhs</span>
              </div>
            </div>

            {/* Education Loan */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Education Loan / Sanction</span>
                <span className="text-xs font-extrabold text-indigo-700">{formatINR(loanINR)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="3500000"
                step="50000"
                value={loanINR}
                onChange={(e) => setLoanINR(parseFloat(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>₹0</span>
                <span>₹17.5 Lakhs</span>
                <span>₹35 Lakhs</span>
              </div>
            </div>

            {/* Family Monthly Support */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Monthly Family Support</span>
                <span className="text-xs font-extrabold text-purple-700">{formatMoney(familySupportMonthlyEUR)}/mo</span>
              </div>
              <input
                type="range"
                min="0"
                max="1000"
                step="50"
                value={familySupportMonthlyEUR}
                onChange={(e) => setFamilySupportMonthlyEUR(parseFloat(e.target.value))}
                className="w-full accent-purple-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>€0</span>
                <span>€500</span>
                <span>€1,000</span>
              </div>
            </div>

            {/* Monthly Scholarship */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Confirmed Scholarship</span>
                <span className="text-xs font-extrabold text-emerald-700">{formatMoney(scholarshipMonthlyEUR)}/mo</span>
              </div>
              <input
                type="range"
                min="0"
                max="1200"
                step="50"
                value={scholarshipMonthlyEUR}
                onChange={(e) => setScholarshipMonthlyEUR(parseFloat(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>€0</span>
                <span>€600</span>
                <span>€1,200</span>
              </div>
            </div>

          </div>

          {/* Part-Time Student Job Module */}
          <div className="bg-teal-50/60 rounded-2xl p-5 border border-teal-100 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-teal-700" />
                <h4 className="text-sm font-bold text-teal-900">Part-Time Student Job (Werkstudent / Minijob)</h4>
                <label className="relative inline-flex items-center cursor-pointer ml-2">
                  <input
                    type="checkbox"
                    checked={plansToWorkPartTime}
                    onChange={(e) => setPlansToWorkPartTime(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
              </div>
              <p className="text-xs text-teal-800">
                International students on § 16b student visas are legally allowed to work up to <strong>140 full days (or 280 half days) per calendar year</strong> (max 20 hours/week during lecture terms).
              </p>
            </div>

            {plansToWorkPartTime && (
              <div className="flex items-center flex-wrap gap-5 bg-white p-3 rounded-xl border border-teal-200 shadow-xs">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block">Weekly Hours</label>
                  <div className="flex items-center gap-2 mt-0.5">
                    <input
                      type="range"
                      min="5"
                      max="20"
                      step="1"
                      value={workHoursPerWeek}
                      onChange={(e) => setWorkHoursPerWeek(parseInt(e.target.value, 10))}
                      className="w-24 accent-teal-600"
                    />
                    <span className="text-xs font-bold text-gray-900 w-8">{workHoursPerWeek}h/wk</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block">Hourly Wage (EUR)</label>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-xs font-semibold text-gray-500">€</span>
                    <input
                      type="number"
                      min="12.82"
                      max="25"
                      step="0.5"
                      value={hourlyWageEUR}
                      onChange={(e) => setHourlyWageEUR(parseFloat(e.target.value) || 14.5)}
                      className="w-16 text-xs font-bold text-gray-900 bg-gray-50 px-2 py-1 rounded border border-gray-200"
                    />
                  </div>
                </div>

                <div className="border-l border-gray-200 pl-4">
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">Estimated Monthly Inflow</span>
                  <span className="text-xs font-extrabold text-teal-700">
                    +{formatMoney(activeScenarioResult.monthly.partTimeEarningsEUR)}/mo
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: GERMANY CITY-WISE COST COMPARISON MATRIX */}
        {/* ========================================================================= */}
        <section ref={sectionRefs.cities} className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-200">
                  2
                </span>
                <h2 className="text-xl font-bold text-gray-900">Compare German Cities (2 to 5 Cities)</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Rental variance across Germany is substantial. Select 2–5 cities to contrast housing, food, and tuition policies.
              </p>
            </div>

            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs font-semibold text-gray-500 mr-1">Select Cities:</span>
              {GERMAN_CITIES_CATALOG.map((city) => {
                const isSelected = comparisonCityIds.includes(city.id);
                return (
                  <button
                    key={city.id}
                    onClick={() => handleToggleComparisonCity(city.id)}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                      isSelected
                        ? 'bg-gray-900 text-white font-semibold'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {city.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* City Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {comparisonCityIds.map((cId) => {
              const city = GERMAN_CITIES_CATALOG.find((c) => c.id === cId) || GERMAN_CITIES_CATALOG[0];
              const isSimulatorActiveCity = selectedCity.id === city.id;

              return (
                <div
                  key={city.id}
                  className={`rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                    isSimulatorActiveCity
                      ? 'border-teal-500 bg-teal-50/20 shadow-md ring-2 ring-teal-500/20'
                      : 'border-gray-200 bg-white hover:border-gray-300 shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{city.state}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          city.tier === 'VERY_HIGH'
                            ? 'bg-rose-100 text-rose-800'
                            : city.tier === 'HIGH'
                            ? 'bg-amber-100 text-amber-800'
                            : city.tier === 'MODERATE'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {city.tier === 'VERY_HIGH'
                          ? 'Tier 1 (High)'
                          : city.tier === 'HIGH'
                          ? 'Tier 2 (Moderate-High)'
                          : city.tier === 'MODERATE'
                          ? 'Tier 3 (Moderate)'
                          : 'Tier 4 (Affordable)'}
                      </span>
                    </div>

                    <h3 className="text-lg font-extrabold text-gray-900 mt-1">{city.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{city.description}</p>

                    {/* Rent Breakdown Table */}
                    <div className="mt-4 pt-3 border-t border-gray-100 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">WG Shared Room:</span>
                        <span className="font-bold text-gray-900">{formatMoney(city.avgRentWgEUR)}/mo</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Studentenwerk Dorm:</span>
                        <span className="font-bold text-emerald-700">{formatMoney(city.avgRentDormEUR)}/mo</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Private Studio:</span>
                        <span className="font-bold text-gray-900">{formatMoney(city.avgRentStudioEUR)}/mo</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                        <span className="text-gray-500">Food & Groceries:</span>
                        <span className="font-semibold text-gray-800">{formatMoney(city.avgFoodEUR)}/mo</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Semester Ticket / mo:</span>
                        <span className="font-semibold text-gray-800">{formatMoney(city.avgTransportEUR)}/mo</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Non-EU Tuition / sem:</span>
                        <span className={`font-bold ${city.hasNonEuTuitionFee ? 'text-amber-600' : 'text-emerald-700'}`}>
                          {city.hasNonEuTuitionFee ? formatMoney(city.nonEuTuitionPerSemesterEUR) : '€0 (Free)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-3">
                    {isSimulatorActiveCity ? (
                      <div className="w-full text-center py-2 rounded-xl bg-teal-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active in Simulator</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedCityId(city.id)}
                        className="w-full py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs transition"
                      >
                        Set as Active City
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 3: ONE-TIME RELOCATION COST CALCULATOR */}
        {/* ========================================================================= */}
        <section ref={sectionRefs.relocation} className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-200">
                  3
                </span>
                <h2 className="text-xl font-bold text-gray-900">Calculate Your Moving Costs</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Mandatory capital required in India and upon landing in Germany before your monthly living disbursements begin.
              </p>
            </div>

            <div className="bg-teal-50 border border-teal-200 px-4 py-2 rounded-2xl text-right">
              <span className="text-[11px] font-bold uppercase text-teal-800 block">Total Upfront Required</span>
              <span className="text-xl font-black text-teal-900">
                {formatBoth(activeScenarioResult.relocation.totalRelocationEUR, activeScenarioResult.relocation.totalRelocationINR)}
              </span>
            </div>
          </div>

          {/* Relocation Itemized Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Blocked Account */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Blocked Account (Sperrkonto)</span>
                <span className="text-xs font-bold text-teal-700">
                  {formatMoney(activeScenarioResult.relocation.blockedAccountDepositEUR)}
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Statutory German federal requirement under AufenthG § 16b (covers €992/month for 12 months).
              </p>
            </div>

            {/* APS India */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">APS India Verification</span>
                <span className="text-xs font-bold text-gray-900">
                  ₹{activeScenarioResult.relocation.apsIndiaFeeINR.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Academic Evaluation Centre (Akademische Prüfstelle) mandatory certificate for Indian applicants.
              </p>
            </div>

            {/* Visa Fee */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">National Visa Fee (Cat D)</span>
                <span className="text-xs font-bold text-gray-900">
                  {formatMoney(activeScenarioResult.relocation.visaFeeEUR, activeScenarioResult.relocation.visaFeeINR)}
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Standard long-stay German national student visa fee payable at VFS / German Mission India.
              </p>
            </div>

            {/* Flight */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Flight Ticket (India → DE)</span>
                <span className="text-xs font-bold text-gray-900">
                  {formatMoney(activeScenarioResult.relocation.flightTicketEUR, activeScenarioResult.relocation.flightTicketINR)}
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                One-way student flight with 2x23kg baggage allowance from India to Germany.
              </p>
            </div>

            {/* Security Deposit Kaution */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Rental Deposit (Kaution)</span>
                <span className="text-xs font-bold text-gray-900">
                  {formatMoney(activeScenarioResult.relocation.rentalKautionDepositEUR)}
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Calculated as 2.5 months net cold rent in {selectedCity.name}. Refundable upon lease completion.
              </p>
            </div>

            {/* Semester Fee */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">1st Semester Enrolment Fee</span>
                <span className="text-xs font-bold text-gray-900">
                  {formatMoney(activeScenarioResult.relocation.semesterFeeEUR)}
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Includes Studentenwerk social levy, administrative fee, and campus amenities.
              </p>
            </div>

            {/* Settling In */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Household & Settling In</span>
                <span className="text-xs font-bold text-gray-900">
                  {formatMoney(activeScenarioResult.relocation.settlingInClothingEUR)}
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Winter bedding, SIM registration, kitchenware, and initial setup items upon arrival.
              </p>
            </div>

            {/* Blocked account setup fee */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Sperrkonto Setup Fee</span>
                <span className="text-xs font-bold text-gray-900">
                  {formatMoney(activeScenarioResult.relocation.blockedAccountSetupFeeEUR)}
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Standard processing charge for Expatrio, Coracle, or Fintiba escrow setup.
              </p>
            </div>

          </div>

          {/* Upfront Affordability Check Banner */}
          {(() => {
            const totalAvailableCapitalINR = savingsINR + loanINR;
            const isAffordable = totalAvailableCapitalINR >= activeScenarioResult.relocation.totalRelocationINR;
            const diffINR = Math.abs(totalAvailableCapitalINR - activeScenarioResult.relocation.totalRelocationINR);
            const diffEUR = Math.round(diffINR / exchangeRate);

            return (
              <div
                className={`rounded-2xl p-5 border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  isAffordable
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50/70 border-rose-200 text-rose-900'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {isAffordable ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <h4 className="text-sm font-bold">
                      {isAffordable
                        ? 'Upfront Relocation Capital Verified'
                        : 'Upfront Relocation Capital Shortfall'}
                    </h4>
                  </div>
                  <p className="text-xs leading-relaxed opacity-90">
                    {isAffordable
                      ? `Your available savings and education loan (${formatINR(totalAvailableCapitalINR)}) comfortably cover the upfront requirement of ${formatBoth(activeScenarioResult.relocation.totalRelocationEUR, activeScenarioResult.relocation.totalRelocationINR)}.`
                      : `You have an upfront deficit of ${formatBoth(diffEUR, diffINR)}. You must secure an additional loan or family backing before applying for your German student visa.`}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                    {isAffordable ? 'Upfront Status' : 'Funding Deficit'}
                  </span>
                  <span
                    className={`text-lg font-black ${
                      isAffordable ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {isAffordable
                      ? 'Ready for Visa'
                      : `-${formatMoney(diffEUR, diffINR)}`}
                  </span>
                </div>
              </div>
            );
          })()}
        </section>

        {/* ========================================================================= */}
        {/* SECTION 4: MONTHLY EXPENSES & FUNDING CALCULATOR */}
        {/* ========================================================================= */}
        <section ref={sectionRefs.monthly} className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-200">
                  4
                </span>
                <h2 className="text-xl font-bold text-gray-900">Build Your Monthly Budget</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Real-time cash flow balance once settled in Germany: Monthly Outflows vs Inflows.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-gray-400 block">Net Balance</span>
                <span
                  className={`text-lg font-black ${
                    activeScenarioResult.monthly.netMonthlyBalanceEUR >= 0
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  {activeScenarioResult.monthly.netMonthlyBalanceEUR >= 0 ? '+' : ''}
                  {formatMoney(activeScenarioResult.monthly.netMonthlyBalanceEUR, activeScenarioResult.monthly.netMonthlyBalanceINR)}/mo
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left: Monthly Expenses Outflows */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-rose-500 rotate-180" />
                  <span>Monthly Expenses (Outflows)</span>
                </h3>
                <span className="text-sm font-extrabold text-rose-600">
                  {formatMoney(activeScenarioResult.monthly.totalMonthlyExpensesEUR, activeScenarioResult.monthly.totalMonthlyExpensesINR)}/mo
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-xl">
                  <div>
                    <span className="font-semibold text-gray-800 block">Rent & Utilities (Warmmiete)</span>
                    <span className="text-[11px] text-gray-400">{selectedCity.name} · {accommodation === 'WG_SHARED' ? 'WG Flat' : accommodation === 'STUDENT_DORM' ? 'Dorm' : 'Studio'}</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    {formatMoney(activeScenarioResult.monthly.rentEUR)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-xl">
                  <div>
                    <span className="font-semibold text-gray-800 block">Statutory Health Insurance (GKV)</span>
                    <span className="text-[11px] text-gray-400">TK / AOK / Barmer Student Statutory Rate</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    {formatMoney(activeScenarioResult.monthly.healthInsuranceEUR)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-xl">
                  <div>
                    <span className="font-semibold text-gray-800 block">Broadcasting Fee (GEZ / Rundfunk)</span>
                    <span className="text-[11px] text-gray-400">{accommodation === 'WG_SHARED' ? 'Split with flatmates' : 'Sole payer per apartment'}</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    {formatMoney(activeScenarioResult.monthly.broadcastingFeeEUR)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-xl">
                  <div>
                    <span className="font-semibold text-gray-800 block">Groceries & Food</span>
                    <span className="text-[11px] text-gray-400">Aldi / Lidl / Rewe student grocery basket</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    {formatMoney(activeScenarioResult.monthly.foodEUR)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-xl">
                  <div>
                    <span className="font-semibold text-gray-800 block">Local Public Transportation</span>
                    <span className="text-[11px] text-gray-400">Semester ticket amortized monthly</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    {formatMoney(activeScenarioResult.monthly.transportEUR)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-xl">
                  <div>
                    <span className="font-semibold text-gray-800 block">Mobile & Home Internet</span>
                    <span className="text-[11px] text-gray-400">Unlimited 5G SIM + Wi-Fi split</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    {formatMoney(activeScenarioResult.monthly.utilitiesInternetEUR)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-xl">
                  <div>
                    <span className="font-semibold text-gray-800 block">Leisure, Books & Miscellaneous</span>
                    <span className="text-[11px] text-gray-400">Study materials, clothing, social buffer</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    {formatMoney(activeScenarioResult.monthly.leisurePersonalEUR)}
                  </span>
                </div>

                {activeScenarioResult.monthly.tuitionFeeMonthlyEUR > 0 && (
                  <div className="flex justify-between items-center p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                    <div>
                      <span className="font-semibold text-amber-900 block">Non-EU Tuition (Amortized)</span>
                      <span className="text-[11px] text-amber-700">Baden-Württemberg state statutory fee</span>
                    </div>
                    <span className="font-bold text-amber-900">
                      {formatMoney(activeScenarioResult.monthly.tuitionFeeMonthlyEUR)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Monthly Inflows */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span>Monthly Inflows (Earnings & Support)</span>
                </h3>
                <span className="text-sm font-extrabold text-emerald-600">
                  {formatMoney(activeScenarioResult.monthly.totalMonthlyInflowsEUR, activeScenarioResult.monthly.totalMonthlyInflowsINR)}/mo
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <div>
                    <span className="font-semibold text-gray-900 block">Blocked Account Payout</span>
                    <span className="text-[11px] text-gray-500">Fixed €992/mo released by German bank</span>
                  </div>
                  <span className="font-bold text-emerald-700">
                    +{formatMoney(activeScenarioResult.monthly.blockedAccountPayoutEUR)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <div>
                    <span className="font-semibold text-gray-900 block">Student Part-Time Job</span>
                    <span className="text-[11px] text-gray-500">
                      {plansToWorkPartTime ? `${workHoursPerWeek} hrs/wk @ €${hourlyWageEUR.toFixed(2)}/hr` : 'No part-time work planned'}
                    </span>
                  </div>
                  <span className="font-bold text-emerald-700">
                    +{formatMoney(activeScenarioResult.monthly.partTimeEarningsEUR)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <div>
                    <span className="font-semibold text-gray-900 block">Family Remittance / Support</span>
                    <span className="text-[11px] text-gray-500">Monthly allowance sent from home</span>
                  </div>
                  <span className="font-bold text-emerald-700">
                    +{formatMoney(activeScenarioResult.monthly.familySupportMonthlyEUR)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <div>
                    <span className="font-semibold text-gray-900 block">Scholarship Stipend</span>
                    <span className="text-[11px] text-gray-500">DAAD / Deutschlandstipendium / Foundation</span>
                  </div>
                  <span className="font-bold text-emerald-700">
                    +{formatMoney(activeScenarioResult.monthly.scholarshipMonthlyEUR)}
                  </span>
                </div>

                {/* Net Visual Summary Card */}
                <div className="mt-6 p-4 rounded-2xl bg-slate-900 text-white space-y-2">
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>Monthly Cash Flow Status:</span>
                    <span className="font-bold text-white uppercase text-[11px]">
                      {activeScenarioResult.monthly.netMonthlyBalanceEUR >= 0 ? 'Surplus Reserve' : 'Monthly Deficit'}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-black">
                      {activeScenarioResult.monthly.netMonthlyBalanceEUR >= 0 ? '+' : ''}
                      {formatBoth(activeScenarioResult.monthly.netMonthlyBalanceEUR, activeScenarioResult.monthly.netMonthlyBalanceINR)}
                    </span>
                    <span className="text-xs text-gray-400">per month</span>
                  </div>
                  <p className="text-[11px] text-gray-300 pt-1 border-t border-gray-800">
                    {activeScenarioResult.monthly.netMonthlyBalanceEUR >= 0
                      ? 'You are generating a monthly buffer that can be reinvested into travel, savings, or exam fees.'
                      : `You have a monthly gap of ${formatMoney(Math.abs(activeScenarioResult.monthly.netMonthlyBalanceEUR))}. You will need to take up a student job or draw down from personal savings.`}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 5: PERSONALIZED FINANCIAL RECOMMENDATIONS */}
        {/* ========================================================================= */}
        <section ref={sectionRefs.recommendations} className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-200">
                  5
                </span>
                <h2 className="text-xl font-bold text-gray-900">Personalized Financial Recommendations</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Practical, data-backed guidance to optimize living expenses, manage student employment, and navigate German financial rules.
              </p>
            </div>

            <div className="bg-slate-50 border border-gray-200 px-4 py-2 rounded-2xl text-right">
              <span className="text-[11px] font-bold uppercase text-gray-400 block">Total Projected {durationMonths}-Month Cost</span>
              <span className="text-base font-extrabold text-teal-900">
                {formatBoth(activeScenarioResult.totalProjectedCostEUR, activeScenarioResult.totalProjectedCostINR)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Actionable Recommendations */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-teal-900 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span>Actionable Cost Optimizations & Rules</span>
              </h3>
              <div className="space-y-2.5">
                {activeScenarioResult.recommendations.map((rec: string, i: number) => (
                  <div key={i} className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-4 flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      ✓
                    </span>
                    <p className="text-xs text-teal-900 leading-relaxed font-medium">{rec}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Budget Considerations & Practical Insights */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Key Budget Considerations & Safety Buffers</span>
              </h3>
              <div className="space-y-2.5">
                {activeScenarioResult.budgetRiskFactors.length > 0 ? (
                  activeScenarioResult.budgetRiskFactors.map((risk: string, i: number) => (
                    <div key={i} className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        !
                      </span>
                      <p className="text-xs text-amber-900 leading-relaxed font-medium">{risk}</p>
                    </div>
                  ))
                ) : (
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                      Your current budget and capital allocation have no major deficits identified. Maintain a conservative buffer for initial apartment setup and winter clothing.
                    </p>
                  </div>
                )}

                {/* Practical Advice Card */}
                <div className="bg-slate-50 border border-gray-200 rounded-2xl p-4 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-gray-500 block">Pro Tip for Indian Applicants</span>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Always arrange your travel health insurance for the first 30 days before leaving India. Once enrolled at your German university, your statutory GKV student membership (TK/AOK/Barmer) takes over seamlessly.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Quick Links to Next Journey Steps */}
          <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-gray-500">
              Need to bridge your funding gap? Explore scholarship opportunities evaluated specifically for your profile.
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/journey/scholarships"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-xs transition"
              >
                <span>Find Matched Scholarships</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/journey/roadmap"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold transition"
              >
                <span>View Application Roadmap</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 6: COST DATA SOURCES & METHODOLOGY */}
        {/* ========================================================================= */}
        <section ref={sectionRefs.sources} className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-200">
                  6
                </span>
                <h2 className="text-xl font-bold text-gray-900">Cost Data Sources & Legal Methodology</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Transparency and statutory references governing the financial calculations.
              </p>
            </div>

            <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-3 py-1 rounded-xl border border-gray-200">
              Last Updated: Q1 2026 Revision
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FINANCIAL_DATA_SOURCES.map((src: FinancialDataSourceInfo, i: number) => (
              <div key={i} className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-900">{src.sourceName}</h4>
                  <span className="text-[10px] text-gray-400 font-medium">{src.lastUpdated}</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{src.description}</p>
                <div className="pt-1">
                  <a
                    href={src.officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:underline"
                  >
                    <span>View Official Regulations</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200 text-xs text-gray-500 leading-relaxed">
            <strong className="text-gray-800">Legal Notice & Disclaimer:</strong> The German Financial Reality Simulator provides empirical projections based on statutory federal rates (AufenthG § 16b, Mindestlohngesetz) and public student surveys (DSW). Actual living expenses may fluctuate based on personal lifestyle, accommodation availability, and seasonal utility adjustments. This tool does not constitute binding legal or banking advice.
          </div>
        </section>

        {/* Bottom Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <button
            onClick={() => navigate('/journey/scholarships')}
            className="text-xs text-gray-600 hover:text-gray-900 font-semibold transition"
          >
            ← Back to Scholarship Matching
          </button>
          <span className="text-xs text-gray-400">
            Click &quot;Continue to Roadmap&quot; in the header above to view your milestones.
          </span>
        </div>

      </main>

      <AgentTracePanel isOpen={isTraceOpen} onClose={() => setIsTraceOpen(false)} />
    </div>
  );
};
