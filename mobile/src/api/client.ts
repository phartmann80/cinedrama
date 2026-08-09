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

export async function fetchDramas(): Promise<Drama[]> {
  return request<Drama[]>('/api/v1/dramas');
}

export async function fetchEpisodes(dramaId: string): Promise<Episode[]> {
  return request<Episode[]>(`/api/v1/dramas/${dramaId}/episodes`);
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
