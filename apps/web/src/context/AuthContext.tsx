import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '@educaro/shared';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  consentAt?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  register: (email: string, password: string, role: UserRole, consent: boolean) => Promise<void>;
  sendOtp: (email: string) => Promise<{ message: string; debugOtp?: string }>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  demoLogin: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const readAuthResponse = async (res: Response, fallbackMessage: string) => {
  let data: any;
  try {
    data = await res.json();
  } catch {
    if (!res.ok) {
      throw new Error(`${fallbackMessage} (HTTP ${res.status})`);
    }
    throw new Error('The server returned an empty or invalid response. Please try again.');
  }

  if (!res.ok) {
    throw new Error(data.message || `${fallbackMessage} (HTTP ${res.status})`);
  }
  return data;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState<boolean>(true);

  // Check current session on initial load
  useEffect(() => {
    const checkMe = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Session restoration failed', err);
      } finally {
        setLoading(false);
      }
    };
    checkMe();
  }, []);

  const handleAuthSuccess = (userData: User, accessToken: string) => {
    setUser(userData);
    setToken(accessToken);
    localStorage.setItem('token', accessToken);
  };

  const login = async (email: string, password?: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await readAuthResponse(res, 'Login failed');
    handleAuthSuccess(data.user, data.accessToken);
  };

  const register = async (email: string, password: string, role: UserRole, consent: boolean) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role, consent }),
    });
    const data = await readAuthResponse(res, 'Registration failed');
    handleAuthSuccess(data.user, data.accessToken);
  };

  const sendOtp = async (email: string): Promise<{ message: string; debugOtp?: string }> => {
    const res = await fetch('/api/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await readAuthResponse(res, 'Failed to send OTP');
    return { message: data.message, debugOtp: data.debugOtp };
  };

  const verifyOtp = async (email: string, code: string) => {
    const res = await fetch('/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const data = await readAuthResponse(res, 'OTP verification failed');
    handleAuthSuccess(data.user, data.accessToken);
  };

  const demoLogin = async (role: UserRole) => {
    const res = await fetch('/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    const data = await readAuthResponse(res, 'Demo login failed');
    handleAuthSuccess(data.user, data.accessToken);
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        sendOtp,
        verifyOtp,
        demoLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
