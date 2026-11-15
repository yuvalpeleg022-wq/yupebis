"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth";
import { api, type Subscription } from "@/lib/api";

type Owned = { id: string; website_id: string; name: string; revision: number; updated_at: string };

export default function Dashboard() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [sites, setSites] = useState<Owned[] | null>(null);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [msg, setMsg] = useState("");

  const load = () => {
    api<Owned[]>("/me/sites").then(setSites).catch((e) => setMsg(e.message));
    api<Subscription | null>("/me/subscription").then(setSub).catch(() => {});
  };
  useEffect(() => { if (ready && !user) router.push("/login?next=/dashboard"); if (user) load(); }, [ready, user]); // eslint-disable-line

  async function subscribe() {
    try {
      const r = await api<{ redirect_url: string }>("/me/subscription", { method: "POST" });
      const u = new URL(r.redirect_url); router.push(u.pathname + u.search);
    } catch (e) { setMsg((e as Error).message); }
  }
  async function cancel() {
    if (!confirm("Cancel the AI Editor subscription? Your websites stay yours.")) return;
    await api("/me/subscription", { method: "DELETE" }); load();
  }

  return (
    <div className="space-y-10 py-12">
      <h1 className="font-display text-4xl">Your websites</h1>
      {msg && <p className="text-red-400">{msg}</p>}

      <section className="card flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="font-display text-2xl">AI Editor</h2>
          {sub ? (
            <p className="text-sm text-white/60">
              {sub.status === "canceled" ? "Canceled - active until " : "Active - renews "}
              {new Date(sub.current_period_end).toLocaleDateString()} · {sub.used_this_period}/{sub.monthly_allowance} AI edits used
            </p>
          ) : (
            <p className="text-sm text-white/60">Edit your sites by chatting with AI. ₪79/month. Ownership never depends on it.</p>
          )}
        </div>
        {sub ? (sub.status !== "canceled" && <button className="btn-ghost" onClick={cancel}>Cancel subscription</button>)
          : <button className="btn-primary" onClick={subscribe}>Subscribe</button>}
      </section>

      {sites && !sites.length && (
        <p className="card p-10 text-center text-white/60">You don&apos;t own any websites yet. <Link className="text-gold" href="/">Browse the market</Link>.</p>
      )}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sites?.map((s) => (
          <div key={s.id} className="card p-5">
            <h3 className="font-display text-xl">{s.name}</h3>
            <p className="text-xs text-white/40">Revision {s.revision} · updated {new Date(s.updated_at).toLocaleString()}</p>
            <div className="mt-4 flex gap-2">
              <Link href={`/dashboard/sites/${s.id}`} className="btn-primary">Open editor</Link>
              <ExportButton id={s.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExportButton({ id }: { id: string }) {
  async function go() {
    const blob = await api<Blob>(`/me/sites/${id}/export.zip`);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `site-${id.slice(0, 8)}.zip`; a.click();
    URL.revokeObjectURL(a.href);
  }
  return <button className="btn-ghost" onClick={go}>Export</button>;
}
