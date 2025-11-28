import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiFetch, setAuthToken } from '../lib/api';
import type { UserRole } from '../types';

interface AuthUser {
  id: string;
  name: string;
  employeeId: string;
  email?: string;
  role: UserRole;
  departmentId?: string;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
  requiresPasswordChange: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  requiresPasswordChange: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: () => void;
  markPasswordChanged: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('expense-auth-user');
    const storedToken = localStorage.getItem('expense-auth-token');

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
      setAuthToken(storedToken);
      const needsPasswordChange = localStorage.getItem('expense-auth-requires-password-change');
      setRequiresPasswordChange(needsPasswordChange === 'true');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('expense-auth-user', JSON.stringify(user));
    } else {
      localStorage.removeItem('expense-auth-user');
    }
  }, [user]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    requiresPasswordChange,
    loading,
    login: async (email: string, password: string) => {
      const response = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      setUser(response.user);
      setToken(response.token);
      setAuthToken(response.token);
      setRequiresPasswordChange(response.requiresPasswordChange);
      localStorage.setItem('expense-auth-requires-password-change', String(response.requiresPasswordChange));
      return response;
    },
    logout: () => {
      setUser(null);
      setToken(null);
      setRequiresPasswordChange(false);
      setAuthToken(null);
      localStorage.removeItem('expense-auth-user');
      localStorage.removeItem('expense-auth-requires-password-change');
      navigate('/login');
    },
    markPasswordChanged: () => {
      setRequiresPasswordChange(false);
      localStorage.setItem('expense-auth-requires-password-change', 'false');
    }
  }), [user, token, requiresPasswordChange, loading, navigate]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
