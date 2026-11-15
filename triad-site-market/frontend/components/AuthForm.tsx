"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./auth";
import { api, type User } from "@/lib/api";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { login } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const r = await api<{ access_token: string; user: User }>(`/auth/${mode}`, { method: "POST", json: { email, password } });
      login(r.access_token, r.user);
      router.push(next);
    } catch (err) { setError((err as Error).message); setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="card mx-auto mt-20 max-w-sm space-y-4 p-8">
      <h1 className="font-display text-3xl">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
      <div><label className="label" htmlFor="email">Email</label>
        <input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div><label className="label" htmlFor="password">Password</label>
        <input id="password" className="input" type="password" minLength={8} required autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
      <button className="btn-primary w-full" disabled={busy}>{mode === "login" ? "Sign in" : "Create account"}</button>
      <p className="text-center text-sm text-white/50">
        {mode === "login" ? <>New here? <Link className="text-gold" href={`/register?next=${next}`}>Create an account</Link></>
          : <>Have an account? <Link className="text-gold" href={`/login?next=${next}`}>Sign in</Link></>}
      </p>
    </form>
  );
}
