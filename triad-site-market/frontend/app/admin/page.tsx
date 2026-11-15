"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import PreviewFrame from "@/components/PreviewFrame";
import { useAuth } from "@/components/auth";
import { api, label, money } from "@/lib/api";

type AdminSite = {
  id: string; sku: string; slug: string; title: string; tagline: string; category: string; design_direction: string;
  price_cents: number; currency: string; quality_score: number; page_count: number; status: string;
  qc_report: { passed: boolean; score: number; checks: { name: string; passed: boolean; severity: string; detail: string }[] };
  created_at: string;
};
type Detail = {
  website: AdminSite; pages: { slug: string; title: string }[];
  reviews: { decision: string; notes: string | null; similarity: { score?: number; most_similar_id?: string; blocked?: boolean } }[];
  preview: { token: string; base: string };
};
type Stats = { websites: Record<string, number>; revenue_cents: number; ai_calls: { provider: string; calls: number; avg_latency_ms: number }[] };
type Catalog = { categories: { key: string; label: string }[]; design_directions: { key: string; label: string }[] };

const STATUSES = ["in_review", "listed", "reserved", "sold", "rejected", "archived"];

export default function Admin() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [status, setStatus] = useState("in_review");
  const [sites, setSites] = useState<AdminSite[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [gen, setGen] = useState({ category: "", design_direction: "", count: 3 });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    api<Stats>("/admin/stats").then(setStats);
    api<AdminSite[]>(`/admin/websites?status=${status}`).then(setSites);
  }, [status]);

  useEffect(() => {
    if (ready && user?.role !== "admin") { router.push("/"); return; }
    if (user) { load(); api<Catalog>("/catalog").then(setCatalog); }
  }, [ready, user, load, router]);

  async function generate() {
    setBusy(true); setMsg("");
    try {
      const r = await api<{ results: { website_status: string | null; error: string | null }[] }>("/admin/generate", {
        method: "POST", json: { category: gen.category || null, design_direction: gen.design_direction || null, count: gen.count } });
      const ok = r.results.filter((x) => x.website_status === "in_review").length;
      setMsg(`Generated ${r.results.length}: ${ok} ready for review, ${r.results.length - ok} rejected/failed automatically.`);
      load();
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }

  async function open(id: string) { setDetail(await api<Detail>(`/admin/websites/${id}`)); }

  async function decide(approve: boolean) {
    if (!detail) return;
    const notes = approve ? null : prompt("Reason for rejection?") ?? "";
    try {
      await api(`/admin/websites/${detail.website.id}/decision`, { method: "POST", json: { approve, notes } });
      setDetail(null); load();
    } catch (e) { setMsg((e as Error).message); }
  }

  return (
    <div className="space-y-8 py-10">
      <h1 className="font-display text-4xl">Control center</h1>
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat k="Awaiting review" v={stats.websites.in_review ?? 0} />
          <Stat k="Listed" v={stats.websites.listed ?? 0} />
          <Stat k="Sold" v={stats.websites.sold ?? 0} />
          <Stat k="Revenue" v={money(stats.revenue_cents, "ILS")} />
        </div>
      )}

      <section className="card flex flex-wrap items-end gap-3 p-5">
        <div><label className="label">Category</label>
          <select className="input" value={gen.category} onChange={(e) => setGen({ ...gen, category: e.target.value })}>
            <option value="">Random</option>{catalog?.categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></div>
        <div><label className="label">Direction</label>
          <select className="input" value={gen.design_direction} onChange={(e) => setGen({ ...gen, design_direction: e.target.value })}>
            <option value="">Random</option>{catalog?.design_directions.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}</select></div>
        <div><label className="label">Count</label>
          <input className="input w-20" type="number" min={1} max={20} value={gen.count} onChange={(e) => setGen({ ...gen, count: Number(e.target.value) })} /></div>
        <button className="btn-primary" onClick={generate} disabled={busy}>{busy ? "Generating…" : "Generate websites"}</button>
        {msg && <p className="w-full text-sm text-white/70" role="status">{msg}</p>}
      </section>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => <button key={s} onClick={() => { setStatus(s); setDetail(null); }} className={`chip ${status === s ? "chip-on" : ""}`}>
          {label(s)} {stats?.websites[s] ? `(${stats.websites[s]})` : ""}</button>)}
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <ul className="space-y-2">
          {!sites.length && <li className="text-sm text-white/50">Nothing here.</li>}
          {sites.map((s) => (
            <li key={s.id}>
              <button onClick={() => open(s.id)} className={`card w-full p-3 text-left hover:border-gold/50 ${detail?.website.id === s.id ? "border-gold" : ""}`}>
                <div className="flex justify-between gap-2"><span className="font-medium">{s.title}</span><span className="text-xs text-white/50">QC {s.quality_score}</span></div>
                <div className="text-xs text-white/50">{s.sku} · {label(s.category)} · {label(s.design_direction)}</div>
              </button>
            </li>
          ))}
        </ul>
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-2xl">{detail.website.title}</h2>
              <span className="text-sm text-white/50">{money(detail.website.price_cents, detail.website.currency)}</span>
              {detail.website.status === "in_review" && (
                <div className="ml-auto flex gap-2">
                  <button className="btn-ghost" onClick={() => decide(false)}>Reject</button>
                  <button className="btn-primary" onClick={() => decide(true)} disabled={!detail.website.qc_report.passed}>Approve & list</button>
                </div>
              )}
            </div>
            <PreviewFrame base={detail.preview.base} pages={detail.pages} token={detail.preview.token} />
            <div className="card p-4 text-sm">
              <p className="mb-2 font-medium">Automated QC: {detail.website.qc_report.passed ? "passed" : "failed"} · score {detail.website.qc_report.score}
                {detail.reviews[0]?.similarity?.score !== undefined && <> · similarity {detail.reviews[0].similarity.score}</>}</p>
              <ul className="grid gap-1 sm:grid-cols-2">
                {detail.website.qc_report.checks.filter((c) => !c.passed).map((c) => (
                  <li key={c.name} className={c.severity === "error" ? "text-red-400" : "text-amber-300"}>✕ {c.name} {c.detail}</li>
                ))}
                {detail.website.qc_report.checks.every((c) => c.passed) && <li className="text-emerald-400">All {detail.website.qc_report.checks.length} checks passed</li>}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string | number }) {
  return <div className="card p-5"><p className="label">{k}</p><p className="text-3xl font-semibold">{v}</p></div>;
}
