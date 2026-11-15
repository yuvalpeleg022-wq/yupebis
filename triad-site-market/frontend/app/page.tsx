"use client";
import { useEffect, useState } from "react";
import SiteCard from "@/components/SiteCard";
import { api, type WebsiteCard } from "@/lib/api";

type Catalog = { categories: { key: string; label: string }[]; design_directions: { key: string; label: string }[] };

export default function Marketplace() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [items, setItems] = useState<WebsiteCard[]>([]);
  const [total, setTotal] = useState(0);
  const [category, setCategory] = useState("");
  const [direction, setDirection] = useState("");
  const [sort, setSort] = useState("newest");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { api<Catalog>("/catalog").then(setCatalog).catch(() => {}); }, []);
  useEffect(() => {
    const p = new URLSearchParams({ sort });
    if (category) p.set("category", category);
    if (direction) p.set("direction", direction);
    if (q.trim()) p.set("q", q.trim());
    setLoading(true);
    const t = setTimeout(() => {
      api<{ items: WebsiteCard[]; total: number }>(`/websites?${p}`)
        .then((r) => { setItems(r.items); setTotal(r.total); setError(""); })
        .catch((e) => setError(e.message)).finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [category, direction, sort, q]);

  return (
    <>
      <section className="py-16 sm:py-24">
        <p className="text-xs uppercase tracking-[0.3em] text-gold">One website · One owner</p>
        <h1 className="mt-4 max-w-4xl font-display text-5xl leading-[1.05] sm:text-7xl">
          Exceptional websites, crafted by AI, reviewed by people, sold exactly once.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-white/60">
          Every site in the market is an original. When you buy it, it leaves the market forever.
          Customize it freely with the visual editor, or go further with the AI editor.
        </p>
      </section>

      <section aria-label="Filters" className="sticky top-[65px] z-20 -mx-4 mb-8 space-y-3 border-b border-white/10 bg-ink/90 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <button className={`chip ${!category ? "chip-on" : ""}`} onClick={() => setCategory("")}>All</button>
          {catalog?.categories.map((c) => (
            <button key={c.key} className={`chip ${category === c.key ? "chip-on" : ""}`} onClick={() => setCategory(c.key)}>{c.label}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input className="input max-w-xs" placeholder="Search websites" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input w-auto" aria-label="Design direction" value={direction} onChange={(e) => setDirection(e.target.value)}>
            <option value="">All styles</option>
            {catalog?.design_directions.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select>
          <select className="input w-auto" aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="quality">Quality score</option>
          </select>
          <span className="ml-auto text-sm text-white/50">{total} available</span>
        </div>
      </section>

      {error && <p className="text-red-400">{error}</p>}
      {!loading && !items.length && !error && (
        <p className="card p-10 text-center text-white/60">No websites match these filters right now. New originals are added after review.</p>
      )}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((w) => <SiteCard key={w.id} w={w} />)}
      </div>
    </>
  );
}
