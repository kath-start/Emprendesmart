'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as authApi from './api/auth';
import { tokenStorage } from './token-storage';
import type { Admin } from './types';
import { ApiError } from './api-client';

interface AuthContextValue {
  admin: Admin | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isSuperAdmin: boolean;
  canWrite: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = tokenStorage.getAdmin();
    const hasToken = Boolean(tokenStorage.getAccessToken());
    if (stored && hasToken) {
      setAdmin(stored);
    }
    setIsLoading(false);

    function handleExpired() {
      setAdmin(null);
      router.replace('/login');
    }
    window.addEventListener('esm:session-expired', handleExpired);
    return () => window.removeEventListener('esm:session-expired', handleExpired);
  }, [router]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    tokenStorage.setSession(data.accessToken, data.refreshToken, data.admin);
    setAdmin(data.admin);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
    } finally {
      tokenStorage.clear();
      setAdmin(null);
      router.replace('/login');
    }
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      admin,
      isLoading,
      login,
      logout,
      isSuperAdmin: admin?.role === 'SUPER_ADMIN',
      canWrite: admin?.role === 'SUPER_ADMIN' || admin?.role === 'ADMIN',
    }),
    [admin, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
