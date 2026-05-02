"use client";

import { create } from "zustand";
import type { UserResponse } from "@/types";

interface AuthState {
  user: UserResponse | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  setAuth: (user: UserResponse, accessToken: string, refreshToken: string) => void;
  setUser: (user: UserResponse) => void;
  clearAuth: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  hydrated: false,

  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", refreshToken);
    localStorage.setItem("user", JSON.stringify(user));
    set({ user, accessToken, isAuthenticated: true });
  },

  setUser: (user) => {
    localStorage.setItem("user", JSON.stringify(user));
    set({ user });
  },

  clearAuth: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  hydrate: () => {
    const token = localStorage.getItem("access_token");
    if (token) {
      let user = null;
      try {
        const raw = localStorage.getItem("user");
        if (raw) user = JSON.parse(raw);
      } catch { /* corrupted — ignore */ }
      set({ accessToken: token, isAuthenticated: true, hydrated: true, user });
    } else {
      set({ hydrated: true });
    }
  },
}));
