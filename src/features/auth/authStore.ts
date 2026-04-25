import { create } from 'zustand';

import type { AuthUser } from './types';

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
  setSession: (payload: { accessToken: string | null; user: AuthUser | null }) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  setLoading: (value) => set({ isLoading: value }),
  setError: (value) => set({ error: value }),
  setSession: ({ accessToken, user }) =>
    set({
      accessToken,
      user,
      isAuthenticated: Boolean(accessToken),
      error: null,
    }),
  clearSession: () =>
    set({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      error: null,
      isLoading: false,
    }),
}));

