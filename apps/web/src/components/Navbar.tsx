import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useJourney } from '../context/JourneyContext';
import { Activity, User, LogOut, CheckCircle2, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  onToggleTracePanel?: () => void;
  isTraceOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleTracePanel, isTraceOpen }) => {
  const { user, logout } = useAuth();
  const { entitlements } = useJourney();
  const navigate = useNavigate();
  const location = useLocation();

  const isPriorityUnlocked = entitlements.includes('PRIORITY_APS_CONSULTANT_REVIEW');

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-black/50 backdrop-blur-2xl border-b border-white/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Logo & Brand */}
        <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
          <span className="font-display font-bold text-xl sm:text-2xl tracking-[0.1em] text-white uppercase">
            EduRoute
          </span>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden lg:flex items-center gap-10 ml-8 mr-auto text-sm font-light text-gray-400 font-sans tracking-wide">
          <Link to="/" className={`transition-all duration-300 hover:text-white ${location.pathname === '/' ? 'text-white' : ''}`}>Home</Link>
          <a href="/#how-it-works" className="transition-all duration-300 hover:text-white">Workflow</a>
          <Link to="/journey/documents" className="transition-all duration-300 hover:text-white">Documents</Link>
          <Link to="/journey/qualification" className="transition-all duration-300 hover:text-white">Qualification</Link>
          <Link to="/candidate-details" className="transition-all duration-300 hover:text-white">Profile</Link>
        </nav>

        {/* Right Auth Entry Points */}
        <div className="flex items-center gap-6 flex-shrink-0">
          {user ? (
            <div className="flex items-center gap-6">
              <Link
                to="/candidate-details"
                className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/20 text-xs text-white transition-all duration-300"
              >
                <User className="w-4 h-4 text-white" />
                <span className="max-w-[120px] truncate font-light tracking-wide">{user.email}</span>
                {isPriorityUnlocked && <ShieldCheck className="w-4 h-4 text-white ml-1" />}
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-white transition-colors duration-300"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                to="/auth?mode=login"
                className="text-sm font-light text-gray-300 hover:text-white px-5 py-2.5 rounded-full border border-white/20 hover:bg-white/10 transition-all duration-300"
              >
                Sign In
              </Link>
              <Link
                to="/auth?mode=signup"
                className="text-sm font-medium text-black bg-white hover:bg-gray-200 px-6 py-2.5 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all duration-300"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
