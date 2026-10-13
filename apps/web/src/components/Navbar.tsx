import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useJourney } from '../context/JourneyContext';
import {
  User,
  LogOut,
  ShieldCheck,
  Sparkles,
  Menu,
  X,
  ChevronDown,
  FileText,
  CheckCircle2,
  Award,
  Calculator,
  Compass,
  BookOpen,
  Globe,
  Headphones,
  Home,
  Layers,
} from 'lucide-react';

interface NavbarProps {
  onToggleTracePanel?: () => void;
  isTraceOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleTracePanel, isTraceOpen }) => {
  const { user, logout } = useAuth();
  const { entitlements } = useJourney();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [journeyDropdownOpen, setJourneyDropdownOpen] = useState(false);
  const [resourcesDropdownOpen, setResourcesDropdownOpen] = useState(false);

  const journeyDropdownRef = useRef<HTMLDivElement>(null);
  const resourcesDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        journeyDropdownRef.current &&
        !journeyDropdownRef.current.contains(e.target as Node)
      ) {
        setJourneyDropdownOpen(false);
      }
      if (
        resourcesDropdownRef.current &&
        !resourcesDropdownRef.current.contains(e.target as Node)
      ) {
        setResourcesDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setJourneyDropdownOpen(false);
    setResourcesDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const isPriorityUnlocked = Boolean(
    entitlements &&
      (entitlements.includes('PRIORITY_APS_CONSULTANT_REVIEW') ||
        entitlements.includes('EDUCARO_PREMIUM')),
  );

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Workflow Journey steps (Exact sequence 2 to 8)
  const journeySteps = [
    {
      order: 1,
      label: 'Profile',
      path: '/journey/details',
      icon: User,
      desc: 'Academic & personal details',
      isActive:
        location.pathname.startsWith('/journey/details') ||
        location.pathname.startsWith('/candidate-details') ||
        location.pathname.startsWith('/profile'),
    },
    {
      order: 2,
      label: 'Documents',
      path: '/journey/documents',
      icon: FileText,
      desc: 'Credential verification & APS',
      isActive: location.pathname.startsWith('/journey/documents'),
    },
    {
      order: 3,
      label: 'Qualification',
      path: '/journey/qualification',
      icon: CheckCircle2,
      desc: 'Deterministic eligibility score',
      isActive: location.pathname.startsWith('/journey/qualification'),
    },
    {
      order: 4,
      label: 'Recommendations',
      path: '/journey/recommendations',
      icon: Sparkles,
      desc: 'Matched universities & programs',
      isActive:
        location.pathname.startsWith('/journey/recommendations') ||
        location.pathname.startsWith('/engine/dashboard'),
    },
    {
      order: 5,
      label: 'Scholarships',
      path: '/journey/scholarships',
      icon: Award,
      desc: 'Targeted funding & grants',
      isActive: location.pathname.startsWith('/journey/scholarships'),
    },
    {
      order: 6,
      label: 'Finance Simulator',
      path: '/journey/financial-simulator',
      icon: Calculator,
      desc: 'Relocation & monthly budgets',
      isActive:
        location.pathname.startsWith('/journey/financial-simulator') ||
        location.pathname.startsWith('/financial-simulator'),
    },
    {
      order: 7,
      label: 'Roadmap',
      path: '/journey/roadmap',
      icon: Compass,
      desc: 'Actionable timeline & milestones',
      isActive:
        location.pathname.startsWith('/journey/roadmap') ||
        location.pathname.startsWith('/roadmap'),
    },
  ];

  // Resources grouping (Exact sequence 9 to 10)
  const resourceSteps = [
    {
      order: 1,
      label: 'Exam Prep',
      path: '/journey/exam-prep',
      icon: BookOpen,
      desc: 'PYQs, playlists & guides',
      isActive:
        location.pathname.startsWith('/journey/exam-prep') ||
        location.pathname.startsWith('/exam-prep'),
    },
    {
      order: 2,
      label: 'Culture & Life',
      path: '/journey/culture',
      icon: Globe,
      desc: 'German habits, manners & quiz',
      isActive:
        location.pathname.startsWith('/journey/culture') ||
        location.pathname.startsWith('/culture'),
    },
  ];

  const isHomeActive = location.pathname === '/';
  const isJourneyActive = journeySteps.some((item) => item.isActive);
  const isResourcesActive = resourceSteps.some((item) => item.isActive);
  const isConsultantActive = location.pathname.startsWith('/consultant');
  const isPremiumActive = location.pathname.startsWith('/journey/payment');

  return (
    <header className="sticky top-0 z-40 w-full bg-black/75 backdrop-blur-2xl border-b border-white/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <span className="font-display font-bold text-xl sm:text-2xl tracking-[0.1em] text-white uppercase">
            EduRoute
          </span>
        </Link>

        {/* Desktop Hierarchical Navigation */}
        <nav className="hidden lg:flex items-center gap-2 xl:gap-4 ml-8 mr-auto text-xs font-medium text-gray-300 font-sans tracking-wide">
          {/* 1. Home */}
          <Link
            to="/"
            className={`px-3 py-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
              isHomeActive
                ? 'text-white bg-white/10 font-semibold'
                : 'hover:text-white hover:bg-white/5'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>

          {/* 2. My Journey Dropdown */}
          <div
            ref={journeyDropdownRef}
            className="relative"
            onMouseEnter={() => setJourneyDropdownOpen(true)}
            onMouseLeave={() => setJourneyDropdownOpen(false)}
          >
            <button
              onClick={() => setJourneyDropdownOpen(!journeyDropdownOpen)}
              className={`px-3 py-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
                isJourneyActive
                  ? 'text-white bg-white/10 font-semibold'
                  : 'hover:text-white hover:bg-white/5'
              }`}
              aria-expanded={journeyDropdownOpen}
            >
              <Layers className="w-3.5 h-3.5 text-teal-400" />
              <span>My Journey</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  journeyDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Journey Flyout Menu */}
            {journeyDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-[#0c0c0c]/95 border border-white/15 rounded-2xl p-2 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-white/10 mb-1">
                  Applicant Journey Sequence
                </div>
                <div className="space-y-0.5">
                  {journeySteps.map((step) => {
                    const IconComponent = step.icon;
                    return (
                      <Link
                        key={step.path}
                        to={step.path}
                        onClick={() => setJourneyDropdownOpen(false)}
                        className={`flex items-start gap-3 p-2.5 rounded-xl transition-all ${
                          step.isActive
                            ? 'bg-teal-500/20 text-white font-semibold border border-teal-500/30'
                            : 'hover:bg-white/10 text-gray-300 hover:text-white'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            step.isActive
                              ? 'bg-teal-500 text-white'
                              : 'bg-white/5 text-gray-400'
                          }`}
                        >
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs flex items-center justify-between">
                            <span className="truncate">{step.label}</span>
                            <span className="text-[10px] text-gray-400 font-normal">
                              Step {step.order}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 truncate font-normal">
                            {step.desc}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3. Resources Dropdown */}
          <div
            ref={resourcesDropdownRef}
            className="relative"
            onMouseEnter={() => setResourcesDropdownOpen(true)}
            onMouseLeave={() => setResourcesDropdownOpen(false)}
          >
            <button
              onClick={() => setResourcesDropdownOpen(!resourcesDropdownOpen)}
              className={`px-3 py-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
                isResourcesActive
                  ? 'text-white bg-white/10 font-semibold'
                  : 'hover:text-white hover:bg-white/5'
              }`}
              aria-expanded={resourcesDropdownOpen}
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>Resources</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  resourcesDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Resources Flyout Menu */}
            {resourcesDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-[#0c0c0c]/95 border border-white/15 rounded-2xl p-2 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-white/10 mb-1">
                  Preparation & Guides
                </div>
                <div className="space-y-0.5">
                  {resourceSteps.map((res) => {
                    const IconComponent = res.icon;
                    return (
                      <Link
                        key={res.path}
                        to={res.path}
                        onClick={() => setResourcesDropdownOpen(false)}
                        className={`flex items-start gap-3 p-2.5 rounded-xl transition-all ${
                          res.isActive
                            ? 'bg-blue-500/20 text-white font-semibold border border-blue-500/30'
                            : 'hover:bg-white/10 text-gray-300 hover:text-white'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            res.isActive
                              ? 'bg-blue-500 text-white'
                              : 'bg-white/5 text-gray-400'
                          }`}
                        >
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold">{res.label}</div>
                          <p className="text-[11px] text-gray-400 truncate font-normal">
                            {res.desc}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 4. Consultant (Support feature accessible at all times) */}
          <Link
            to="/consultant"
            className={`px-3 py-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
              isConsultantActive
                ? 'text-white bg-white/10 font-semibold'
                : 'hover:text-white hover:bg-white/5'
            }`}
          >
            <Headphones className="w-3.5 h-3.5 text-amber-400" />
            <span>Consultant</span>
          </Link>

          {/* Admin link if user is administrator */}
          {user?.role === 'ADMIN' && (
            <Link
              to="/engine/admin"
              className="px-3 py-2 rounded-xl text-amber-400 hover:text-amber-300 hover:bg-white/5 font-medium transition-all"
            >
              Admin
            </Link>
          )}

          {/* 5. Premium positioned strictly as the final navigation item */}
          <Link
            to="/journey/payment"
            className={`transition-all duration-300 flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${
              isPremiumActive
                ? 'bg-purple-600/30 text-white border-purple-400 font-semibold'
                : 'text-purple-300 hover:text-white border-purple-500/30 hover:bg-purple-500/20'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Premium</span>
          </Link>
        </nav>

        {/* Right Auth Entry Points & Mobile Menu Button */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/candidate-details"
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-white/5 hover:bg-white/15 border border-white/20 text-xs text-white transition-all duration-300"
                title="View Profile Details"
              >
                <User className="w-3.5 h-3.5 text-white" />
                <span className="max-w-[100px] sm:max-w-[140px] truncate font-light tracking-wide">
                  {user.email}
                </span>
                {isPriorityUnlocked && (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-0.5" />
                )}
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-white transition-colors duration-300 p-2 rounded-full hover:bg-white/5"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/auth?mode=login"
                className="text-xs sm:text-sm font-light text-gray-300 hover:text-white px-3 sm:px-4 py-2 rounded-full border border-white/20 hover:bg-white/10 transition-all duration-300"
              >
                Sign In
              </Link>
              <Link
                to="/auth?mode=signup"
                className="text-xs sm:text-sm font-semibold btn-brand text-white px-4 sm:px-5 py-2 rounded-full transition-all duration-300 shadow-sm"
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-950/95 border-b border-white/10 px-4 sm:px-6 py-5 backdrop-blur-3xl animate-in slide-in-from-top duration-200 max-h-[85vh] overflow-y-auto">
          <nav className="flex flex-col space-y-4 text-xs text-gray-300 font-sans">
            {/* Home */}
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`p-2.5 rounded-xl flex items-center gap-2.5 transition-all ${
                isHomeActive ? 'bg-white/10 text-white font-semibold' : 'hover:bg-white/5 text-gray-300'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Link>

            {/* MY JOURNEY GROUP */}
            <div className="space-y-1 pt-2 border-t border-white/10">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                <Layers className="w-3 h-3" />
                <span>My Journey (Ordered Steps)</span>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {journeySteps.map((step) => {
                  const IconComponent = step.icon;
                  return (
                    <Link
                      key={step.path}
                      to={step.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`p-2 rounded-xl flex items-center justify-between transition-all ${
                        step.isActive
                          ? 'bg-teal-500/20 text-white font-semibold border border-teal-500/30'
                          : 'hover:bg-white/5 text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <IconComponent className="w-3.5 h-3.5 text-teal-400" />
                        <span>{step.label}</span>
                      </div>
                      <span className="text-[10px] text-gray-400">Step {step.order}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* RESOURCES GROUP */}
            <div className="space-y-1 pt-2 border-t border-white/10">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <BookOpen className="w-3 h-3" />
                <span>Resources</span>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {resourceSteps.map((res) => {
                  const IconComponent = res.icon;
                  return (
                    <Link
                      key={res.path}
                      to={res.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`p-2 rounded-xl flex items-center justify-between transition-all ${
                        res.isActive
                          ? 'bg-blue-500/20 text-white font-semibold border border-blue-500/30'
                          : 'hover:bg-white/5 text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <IconComponent className="w-3.5 h-3.5 text-blue-400" />
                        <span>{res.label}</span>
                      </div>
                      <span className="text-[10px] text-gray-400">Resource</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* CONSULTANT & ADMIN */}
            <div className="space-y-1 pt-2 border-t border-white/10">
              <Link
                to="/consultant"
                onClick={() => setMobileMenuOpen(false)}
                className={`p-2.5 rounded-xl flex items-center gap-2.5 transition-all ${
                  isConsultantActive
                    ? 'bg-white/10 text-white font-semibold'
                    : 'hover:bg-white/5 text-gray-300'
                }`}
              >
                <Headphones className="w-4 h-4 text-amber-400" />
                <span>Consultant Advisory</span>
              </Link>

              {user?.role === 'ADMIN' && (
                <Link
                  to="/engine/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 rounded-xl text-amber-400 hover:bg-white/5 flex items-center gap-2.5"
                >
                  <span>Admin Engine</span>
                </Link>
              )}
            </div>

            {/* PREMIUM STRICTLY FINAL */}
            <div className="pt-2 border-t border-white/10">
              <Link
                to="/journey/payment"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-4 rounded-xl bg-purple-600/30 border border-purple-500/40 text-purple-200 hover:text-white font-semibold flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Premium Membership</span>
                </span>
                <span className="text-xs bg-purple-500/40 px-2 py-0.5 rounded text-purple-200">
                  Exclusive
                </span>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
export default Navbar;
