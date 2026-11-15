"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getToken, setToken, type User } from "@/lib/api";

type Ctx = { user: User | null; ready: boolean; login: (t: string, u: User) => void; logout: () => void };
const AuthCtx = createContext<Ctx>({ user: null, ready: false, login: () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!getToken()) { setReady(true); return; }
    api<User>("/auth/me").then(setUser).catch(() => setToken(null)).finally(() => setReady(true));
  }, []);
  const login = useCallback((t: string, u: User) => { setToken(t); setUser(u); }, []);
  const logout = useCallback(() => { setToken(null); setUser(null); }, []);
  return <AuthCtx.Provider value={{ user, ready, login, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
