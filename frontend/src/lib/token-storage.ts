import type { Admin } from './types';

const ACCESS_KEY = 'esm_access_token';
const REFRESH_KEY = 'esm_refresh_token';
const ADMIN_KEY = 'esm_admin';

function isBrowser() {
  return typeof window !== 'undefined';
}

export const tokenStorage = {
  getAccessToken(): string | null {
    if (!isBrowser()) return null;
    return window.localStorage.getItem(ACCESS_KEY);
  },
  getRefreshToken(): string | null {
    if (!isBrowser()) return null;
    return window.localStorage.getItem(REFRESH_KEY);
  },
  getAdmin(): Admin | null {
    if (!isBrowser()) return null;
    const raw = window.localStorage.getItem(ADMIN_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Admin;
    } catch {
      return null;
    }
  },
  setSession(accessToken: string, refreshToken: string, admin: Admin) {
    if (!isBrowser()) return;
    window.localStorage.setItem(ACCESS_KEY, accessToken);
    window.localStorage.setItem(REFRESH_KEY, refreshToken);
    window.localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
  },
  setTokens(accessToken: string, refreshToken: string) {
    if (!isBrowser()) return;
    window.localStorage.setItem(ACCESS_KEY, accessToken);
    window.localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  setAdmin(admin: Admin) {
    if (!isBrowser()) return;
    window.localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
  },
  clear() {
    if (!isBrowser()) return;
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
    window.localStorage.removeItem(ADMIN_KEY);
  },
};
