/**
 * AuthContext — JWT token, coin balance, and unlocked episodes.
 *
 * Token is stored via tokenStorage (AsyncStorage when installed, otherwise
 * in-memory for the session). All state of record lives in the database;
 * losing the token just requires logging in again on next launch.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { tokenStorage } from '../utils/tokenStorage';
import { registerUser, loginUser, fetchMe, unlockEpisode, AuthResponse } from '../api/client';
import type { UnlockResponse } from '../types';

const TOKEN_KEY = 'cinedrama:auth_token';

interface AuthState {
  token: string | null;
  userId: string | null;
  email: string | null;
  coinBalance: number;
  unlockedEpisodeIds: string[];
  /** Signed video URLs received from unlock responses, keyed by episodeId. */
  unlockedUrls: Record<string, string>;
  /** Increments on each successful unlock so consumers can react. */
  unlocksVersion: number;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Unlock an episode. Pass method:'ad' when the user earned a rewarded ad. */
  unlock: (episodeId: string, method?: 'coins' | 'ad') => Promise<UnlockResponse>;
  isUnlocked: (episodeId: string) => boolean;
  /** Return the signed video URL for an episode if the user has unlocked it. */
  getUnlockedUrl: (episodeId: string) => string | null;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    userId: null,
    email: null,
    coinBalance: 0,
    unlockedEpisodeIds: [],
    unlockedUrls: {},
    unlocksVersion: 0,
    isLoading: true,
  });

  // Restore session on mount
  useEffect(() => {
    tokenStorage.get(TOKEN_KEY).then(async (savedToken) => {
      if (savedToken) {
        try {
          const me = await fetchMe(savedToken);
          setState({
            token: savedToken,
            userId: me.id,
            email: me.email,
            coinBalance: me.coinBalance,
            unlockedEpisodeIds: me.unlockedEpisodeIds,
            unlockedUrls: {},
            unlocksVersion: 0,
            isLoading: false,
          });
        } catch {
          // Token expired or invalid — clear it
          await tokenStorage.remove(TOKEN_KEY);
          setState((s) => ({ ...s, token: null, isLoading: false }));
        }
      } else {
        setState((s) => ({ ...s, isLoading: false }));
      }
    });
  }, []);

  async function applyAuthResponse(res: AuthResponse) {
    await tokenStorage.set(TOKEN_KEY, res.token);
    const me = await fetchMe(res.token);
    setState({
      token: res.token,
      userId: res.user.id,
      email: res.user.email,
      coinBalance: me.coinBalance,
      unlockedEpisodeIds: me.unlockedEpisodeIds,
      unlockedUrls: {},
      unlocksVersion: 0,
      isLoading: false,
    });
  }

  async function register(email: string, password: string) {
    const res = await registerUser(email, password);
    await applyAuthResponse(res);
  }

  async function login(email: string, password: string) {
    const res = await loginUser(email, password);
    await applyAuthResponse(res);
  }

  async function logout() {
    await tokenStorage.remove(TOKEN_KEY);
    setState({
      token: null,
      userId: null,
      email: null,
      coinBalance: 0,
      unlockedEpisodeIds: [],
      unlockedUrls: {},
      unlocksVersion: 0,
      isLoading: false,
    });
  }

  const refreshMe = useCallback(async () => {
    if (!state.token) return;
    try {
      const me = await fetchMe(state.token);
      setState((s) => ({
        ...s,
        coinBalance: me.coinBalance,
        unlockedEpisodeIds: me.unlockedEpisodeIds,
      }));
    } catch {
      // Silently ignore refresh failures
    }
  }, [state.token]);

  async function unlock(episodeId: string, method: 'coins' | 'ad' = 'coins'): Promise<UnlockResponse> {
    if (!state.token) {
      throw new Error('You must be signed in to unlock episodes.');
    }
    const res = await unlockEpisode({ episodeId, method }, state.token);
    if (res.success) {
      setState((s) => ({
        ...s,
        coinBalance: res.newCoinBalance ?? s.coinBalance,
        unlockedEpisodeIds: s.unlockedEpisodeIds.includes(episodeId)
          ? s.unlockedEpisodeIds
          : [...s.unlockedEpisodeIds, episodeId],
        // Store the signed URL from the unlock response so the feed can play
        // the episode immediately without a re-fetch.
        unlockedUrls: res.videoUrl
          ? { ...s.unlockedUrls, [episodeId]: res.videoUrl }
          : s.unlockedUrls,
        unlocksVersion: s.unlocksVersion + 1,
      }));
    }
    return res;
  }

  function isUnlocked(episodeId: string): boolean {
    return state.unlockedEpisodeIds.includes(episodeId);
  }

  function getUnlockedUrl(episodeId: string): string | null {
    return state.unlockedUrls[episodeId] ?? null;
  }

  return (
    <AuthContext.Provider
      value={{ ...state, register, login, logout, unlock, isUnlocked, getUnlockedUrl, refreshMe }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
