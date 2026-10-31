import { tokenStorage } from './token-storage';
import type { ApiFailure, ApiSuccess, PaginationMeta } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  details?: { path: string; message: string }[];
  status: number;

  constructor(message: string, status: number, details?: { path: string; message: string }[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const body = await res.json();
    if (!res.ok || !body.success) return false;
    tokenStorage.setTokens(body.data.accessToken, body.data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

function notifySessionExpired() {
  tokenStorage.clear();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('esm:session-expired'));
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: object;
  skipAuth?: boolean;
  /** Cuerpo binario (ej. una imagen) en lugar de JSON. */
  file?: Blob;
}

function buildUrl(path: string, query?: object) {
  const url = new URL(`${API_URL}${path}`);
  if (query) {
    Object.entries(query as Record<string, unknown>).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

async function rawRequest<T>(path: string, options: RequestOptions, accessToken: string | null) {
  const headers: Record<string, string> = {
    'Content-Type': options.file ? options.file.type || 'application/octet-stream' : 'application/json',
  };
  if (accessToken && !options.skipAuth) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    body: options.file ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
  });

  const body = (await res.json().catch(() => null)) as ApiSuccess<T> | ApiFailure | null;
  return { res, body };
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<{ data: T; meta?: PaginationMeta }> {
  const accessToken = tokenStorage.getAccessToken();
  let { res, body } = await rawRequest<T>(path, options, accessToken);

  if (res.status === 401 && !options.skipAuth) {
    if (!refreshPromise) {
      refreshPromise = refreshSession().finally(() => {
        refreshPromise = null;
      });
    }
    const refreshed = await refreshPromise;
    if (refreshed) {
      const retryToken = tokenStorage.getAccessToken();
      ({ res, body } = await rawRequest<T>(path, options, retryToken));
    } else {
      notifySessionExpired();
      throw new ApiError('Tu sesión expiró, inicia sesión de nuevo', 401);
    }
  }

  if (!body) {
    throw new ApiError('Respuesta inválida del servidor', res.status);
  }

  if (!body.success) {
    const failure = body as ApiFailure;
    throw new ApiError(failure.message ?? 'Ocurrió un error', res.status, failure.details);
  }

  const success = body as ApiSuccess<T>;
  return { data: success.data, meta: success.meta };
}
