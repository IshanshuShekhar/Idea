import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-educaro-main flex items-center justify-center animate-in fade-in duration-500">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-educaro-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-educaro-muted text-sm font-medium">Authenticating session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
