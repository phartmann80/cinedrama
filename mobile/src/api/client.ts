const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.cinedrama.app';

async function request<T>(
  path: string,
  options?: RequestInit,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string> ?? {}) },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── Dramas ──────────────────────────────────────────────────────────────────

import type { Drama, Episode, UnlockRequest, UnlockResponse } from '../types';

/** Returns the first page of dramas (up to 50). */
export async function fetchDramas(): Promise<Drama[]> {
  const res = await request<{ data: Drama[]; meta: unknown }>('/api/v1/dramas?limit=50');
  return res.data;
}

/** Fetch episodes for a drama. Pass the auth token to receive unlock-overlaid URLs. */
export async function fetchEpisodes(dramaId: string, token?: string): Promise<Episode[]> {
  return request<Episode[]>(`/api/v1/dramas/${dramaId}/episodes`, undefined, token);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  token: string;
  user: { id: string; email: string; coinBalance: number };
}

export async function registerUser(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/api/v1/user/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/api/v1/user/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export interface MeResponse {
  id: string;
  email: string;
  coinBalance: number;
  unlockedEpisodeIds: string[];
  likedEpisodeIds: string[];
}

export async function fetchMe(token: string): Promise<MeResponse> {
  return request<MeResponse>('/api/v1/user/me', undefined, token);
}

// ─── User / Unlock ────────────────────────────────────────────────────────────

export async function unlockEpisode(
  payload: UnlockRequest,
  token: string
): Promise<UnlockResponse> {
  return request<UnlockResponse>('/api/v1/user/unlock', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}
