"use client";
import Link from "next/link";
import { useAuth } from "./auth";

export default function Header() {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="font-display text-xl tracking-[0.2em]">TRIAD<span className="text-gold"> ·</span> SITE MARKET</Link>
        <nav className="flex items-center gap-2 text-sm sm:gap-4">
          <Link href="/" className="hidden text-white/70 hover:text-white sm:inline">Marketplace</Link>
          {user && <Link href="/dashboard" className="text-white/70 hover:text-white">My sites</Link>}
          {user?.role === "admin" && <Link href="/admin" className="text-white/70 hover:text-white">Admin</Link>}
          {user ? (
            <button onClick={logout} className="btn-ghost !px-4 !py-1.5">Sign out</button>
          ) : (
            <Link href="/login" className="btn-primary !px-4 !py-1.5">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
