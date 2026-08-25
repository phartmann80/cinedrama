import type { Drama, Episode, UnlockRequest, UnlockResponse } from '../types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000';

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

/** Base URL the mobile app uses for API + media requests. */
export function getApiBaseUrl(): string {
  return BASE_URL;
}

/**
 * The API returns signed media URLs as relative paths
 * (e.g. `/api/v1/media/play?episodeId=...`). Resolve them against the API
 * base so React Native's <Video> can play them against the real backend.
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function enrichDrama(drama: Drama): Drama {
  return {
    ...drama,
    thumbnailUrl: resolveMediaUrl(drama.thumbnailUrl) ?? drama.thumbnailUrl,
  };
}

function enrichEpisode(episode: Episode): Episode {
  return {
    ...episode,
    videoUrl: resolveMediaUrl(episode.videoUrl),
    thumbnailUrl: resolveMediaUrl(episode.thumbnailUrl) ?? episode.thumbnailUrl,
  };
}

// ─── Dramas ──────────────────────────────────────────────────────────────────

/** Returns the first page of dramas (up to 50). */
export async function fetchDramas(): Promise<Drama[]> {
  const res = await request<{ data: Drama[]; meta: unknown }>('/api/v1/dramas?limit=50');
  return res.data.map(enrichDrama);
}

/** Fetch a single drama by id. */
export async function fetchDrama(id: string): Promise<Drama> {
  const drama = await request<Drama>(`/api/v1/dramas/${id}`);
  return enrichDrama(drama);
}

/** Fetch episodes for a drama. Pass the auth token to receive unlock-overlaid URLs. */
export async function fetchEpisodes(dramaId: string, token?: string): Promise<Episode[]> {
  const episodes = await request<Episode[]>(
    `/api/v1/dramas/${dramaId}/episodes`,
    undefined,
    token
  );
  return episodes.map(enrichEpisode);
}

/** Fetch a single episode. Pass the auth token to receive a live signed URL. */
export async function fetchEpisode(
  dramaId: string,
  episodeNumber: number,
  token?: string
): Promise<Episode> {
  const episode = await request<Episode>(
    `/api/v1/dramas/${dramaId}/episodes/${episodeNumber}`,
    undefined,
    token
  );
  return enrichEpisode(episode);
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
