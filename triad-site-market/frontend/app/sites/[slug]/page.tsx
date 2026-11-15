"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PreviewFrame from "@/components/PreviewFrame";
import { useAuth } from "@/components/auth";
import { api, label, money, type WebsiteDetail } from "@/lib/api";

export default function SitePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [w, setW] = useState<WebsiteDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { api<WebsiteDetail>(`/websites/${slug}`).then(setW).catch((e) => setError(e.message)); }, [slug]);

  async function buy() {
    if (!user) return router.push(`/login?next=/sites/${slug}`);
    if (!w) return;
    setBusy(true); setError("");
    try {
      const r = await api<{ order_id: string; redirect_url: string }>(`/websites/${w.id}/checkout`, {
        method: "POST", json: { idempotency_key: `chk-${crypto.randomUUID()}` },
      });
      const u = new URL(r.redirect_url);
      router.push(u.pathname + u.search);
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }

  if (error && !w) return <p className="py-20 text-center text-white/60">{error}</p>;
  if (!w) return <p className="py-20 text-center text-white/40">Loading…</p>;
  const available = w.status === "available";

  return (
    <div className="grid gap-8 py-10 lg:grid-cols-[1fr_340px]">
      <PreviewFrame base={`/api/preview/website/${w.id}/`} pages={w.pages} />
      <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
        <div>
          <p className="text-xs uppercase tracking-widest text-white/40">{w.sku}</p>
          <h1 className="mt-1 font-display text-4xl">{w.title}</h1>
          <p className="mt-2 text-white/60">{w.tagline}</p>
        </div>
        <dl className="card grid grid-cols-2 gap-4 p-4 text-sm">
          <div><dt className="label">Category</dt><dd>{label(w.category)}</dd></div>
          <div><dt className="label">Style</dt><dd>{label(w.design_direction)}</dd></div>
          <div><dt className="label">Pages</dt><dd>{w.page_count}</dd></div>
          <div><dt className="label">QC score</dt><dd>{w.quality_score}</dd></div>
          <div className="col-span-2"><dt className="label">Typography</dt><dd>{w.theme.fonts.join(" / ")}</dd></div>
          <div className="col-span-2"><dt className="label">Palette</dt>
            <dd className="mt-1 flex gap-1">{Object.entries(w.theme.palette).map(([k, c]) => (
              <span key={k} title={k} className="h-6 w-6 rounded-full border border-white/20" style={{ background: c }} />))}</dd></div>
        </dl>
        <div className="card space-y-4 p-5">
          <p className="text-3xl font-semibold">{money(w.price_cents, w.currency)}</p>
          <button className="btn-primary w-full" disabled={!available || busy} onClick={buy}>
            {available ? (busy ? "Reserving…" : "Buy this website") : "No longer available"}
          </button>
          {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
          <ul className="space-y-1 text-sm text-white/60">
            <li>✓ Sold to one customer only - removed from the market at purchase</li>
            <li>✓ Free visual editor included, forever</li>
            <li>✓ Export as a static site anytime</li>
            <li>✓ Optional AI editor subscription - ownership never depends on it</li>
          </ul>
          <p className="text-xs text-white/40">
            Exclusivity means TRIAD sells this specific website asset to a single buyer under the license terms.
            Independently created websites elsewhere may look similar.
          </p>
        </div>
      </aside>
    </div>
  );
}
