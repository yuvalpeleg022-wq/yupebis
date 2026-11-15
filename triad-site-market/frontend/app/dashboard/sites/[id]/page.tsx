"use client";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import PreviewFrame from "@/components/PreviewFrame";
import { api, label, type CustomerSite, type Section } from "@/lib/api";

const VARIANTS: Record<string, string[]> = {
  navbar: ["inline", "centered", "split", "floating"], hero: ["split", "centered", "fullbleed", "editorial", "stacked", "porthole", "immersive"],
  features: ["grid", "list", "alternating"], about: ["split", "quote", "timeline"], services: ["cards", "rows", "numbered"],
  menu: ["columns", "list"], gallery: ["masonry", "grid", "strip"], stats: ["row", "boxed", "ticker"],
  testimonials: ["cards", "single", "wall"], pricing: ["cards", "table"], team: ["grid", "list"],
  faq: ["accordion", "two_column"], cta: ["banner", "split", "minimal", "block"], contact: ["form", "split", "simple"],
  footer: ["columns", "minimal", "big", "telemetry"],
};
const ADDABLE = Object.keys(VARIANTS).filter((t) => t !== "navbar" && t !== "footer");
const LOCKED = new Set(["navbar", "footer"]);
type Op = Record<string, unknown>;

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const [site, setSite] = useState<CustomerSite | null>(null);
  const [token, setToken] = useState("");
  const [page, setPage] = useState("index");
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<"section" | "theme" | "ai">("section");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api<CustomerSite>(`/me/sites/${id}`).then(setSite).catch((e) => setError(e.message));
    api<{ token: string }>(`/me/sites/${id}/preview-token`, { method: "POST" }).then((r) => setToken(r.token));
  }, [id]);

  const apply = useCallback(async (operations: Op[]) => {
    if (!site) return;
    setStatus("Saving…"); setError("");
    try {
      const s = await api<CustomerSite>(`/me/sites/${id}/edits?revision=${site.revision}`, { method: "POST", json: { operations } });
      setSite(s); setStatus(`Saved · revision ${s.revision}`);
    } catch (e) { setError((e as Error).message); setStatus(""); }
  }, [id, site]);

  const currentPage = site?.spec.pages.find((p) => p.slug === page);
  const section = currentPage?.sections.find((s) => s.id === selected) ?? null;
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function onDragEnd(e: DragEndEvent) {
    if (!currentPage || !e.over || e.active.id === e.over.id) return;
    const ids = currentPage.sections.map((s) => s.id);
    const to = ids.indexOf(String(e.over.id));
    const moved = arrayMove(ids, ids.indexOf(String(e.active.id)), to);
    if (LOCKED.has(currentPage.sections[to].type) || moved[0] !== ids[0] || moved.at(-1) !== ids.at(-1)) return;
    apply([{ op: "move_section", page, section_id: String(e.active.id), to_index: to }]);
  }

  if (error && !site) return <p className="py-20 text-center text-white/60">{error}</p>;
  if (!site || !currentPage) return <p className="py-20 text-center text-white/40">Loading editor…</p>;

  return (
    <div className="py-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link href="/dashboard" className="text-sm text-white/50 hover:text-white">← My sites</Link>
        <h1 className="font-display text-2xl">{site.spec.meta.business_name}</h1>
        <span className="text-xs text-white/40">{site.sku} · revision {site.revision}</span>
        <span className="ml-auto text-sm text-white/60" role="status">{status}</span>
      </div>
      {error && <p className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300" role="alert">{error}</p>}

      <div className="grid gap-4 xl:grid-cols-[260px_1fr_360px]">
        <aside className="card space-y-3 p-3">
          <select className="input" aria-label="Page" value={page} onChange={(e) => { setPage(e.target.value); setSelected(null); }}>
            {site.spec.pages.map((p) => <option key={p.slug} value={p.slug}>{p.title}</option>)}
          </select>
          <p className="label !mb-0">Sections · drag to reorder</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={currentPage.sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-1">
                {currentPage.sections.map((s) => (
                  <SortableRow key={s.id} s={s} active={s.id === selected}
                    onSelect={() => { setSelected(s.id); setTab("section"); }}
                    onRemove={() => confirm(`Remove "${label(s.type)}"?`) && apply([{ op: "remove_section", page, section_id: s.id }])} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
          <AddSection onAdd={(type) => apply([{ op: "add_section", page, type, variant: VARIANTS[type][0],
            at_index: currentPage.sections.length - 1, heading: label(type) }])} />
        </aside>

        <PreviewFrame base={`/api/preview/site/${id}/`} pages={site.spec.pages.map((p) => ({ slug: p.slug, title: p.title }))}
          token={token} refreshKey={site.revision} />

        <aside className="card p-4">
          <div className="mb-4 flex gap-1" role="tablist">
            {(["section", "theme", "ai"] as const).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`chip ${tab === t ? "chip-on" : ""}`}>
                {t === "ai" ? "AI editor ✦" : label(t)}</button>
            ))}
          </div>
          {tab === "section" && (section ? <SectionForm key={`${section.id}-${site.revision}`} s={section} page={page} onApply={apply} />
            : <p className="text-sm text-white/50">Select a section to edit its content and layout.</p>)}
          {tab === "theme" && <ThemeForm key={site.revision} site={site} onApply={apply} />}
          {tab === "ai" && <AIChat site={site} onUpdated={(s) => { setSite(s); setStatus(`AI saved · revision ${s.revision}`); }} />}
        </aside>
      </div>
    </div>
  );
}

function SortableRow({ s, active, onSelect, onRemove }: { s: Section; active: boolean; onSelect: () => void; onRemove: () => void }) {
  const locked = LOCKED.has(s.type);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: s.id, disabled: locked });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm ${active ? "border-gold bg-gold/10" : "border-white/10 bg-ink"}`}>
      <span {...attributes} {...listeners} aria-label={`Drag ${s.type}`}
        className={`select-none ${locked ? "cursor-not-allowed text-white/20" : "cursor-grab text-white/40"}`}>⋮⋮</span>
      <button onClick={onSelect} className="flex-1 truncate text-left">{label(s.type)} <span className="text-white/40">· {s.variant}</span></button>
      {!locked && <button onClick={onRemove} aria-label={`Remove ${s.type}`} className="text-white/30 hover:text-red-400">✕</button>}
    </li>
  );
}

function AddSection({ onAdd }: { onAdd: (t: string) => void }) {
  const [t, setT] = useState(ADDABLE[0]);
  return (
    <div className="flex gap-2 pt-2">
      <select className="input" aria-label="Section type" value={t} onChange={(e) => setT(e.target.value)}>
        {ADDABLE.map((x) => <option key={x} value={x}>{label(x)}</option>)}
      </select>
      <button className="btn-ghost !px-3" onClick={() => onAdd(t)}>Add</button>
    </div>
  );
}

function SectionForm({ s, page, onApply }: { s: Section; page: string; onApply: (ops: Op[]) => void }) {
  const [d, setD] = useState({ eyebrow: s.eyebrow, heading: s.heading, body: s.body, variant: s.variant, background: s.background });
  const [items, setItems] = useState(s.items);
  const [links, setLinks] = useState(s.links);
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setD({ ...d, [k]: e.target.value });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onApply([{ op: "update_section", page, section_id: s.id, ...d, items, links }]); }}>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label">Layout</label>
          <select className="input" value={d.variant} onChange={set("variant")}>{VARIANTS[s.type].map((v) => <option key={v}>{v}</option>)}</select></div>
        <div><label className="label">Background</label>
          <select className="input" value={d.background} onChange={set("background")}>{["default", "surface", "primary", "inverse"].map((v) => <option key={v}>{v}</option>)}</select></div>
      </div>
      <div><label className="label">Eyebrow</label><input className="input" value={d.eyebrow} onChange={set("eyebrow")} maxLength={80} /></div>
      <div><label className="label">Heading</label><input className="input" value={d.heading} onChange={set("heading")} maxLength={200} /></div>
      <div><label className="label">Body</label><textarea className="input" rows={3} value={d.body} onChange={set("body")} maxLength={2000} /></div>
      {items.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="label">Items</legend>
          {items.map((it, i) => (
            <div key={i} className="space-y-1 rounded-lg border border-white/10 p-2">
              <div className="flex gap-1">
                <input className="input" placeholder="Title" value={it.title} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
                <button type="button" aria-label="Remove item" className="px-2 text-white/40 hover:text-red-400" onClick={() => setItems(items.filter((_, j) => j !== i))}>✕</button>
              </div>
              <textarea className="input" rows={2} placeholder="Text" value={it.text} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} />
              <input className="input" placeholder="Meta (price, role…)" value={it.meta} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, meta: e.target.value } : x))} />
            </div>
          ))}
          <button type="button" className="text-sm text-gold" onClick={() => setItems([...items, { title: "New item", text: "", meta: "" }])}>+ Add item</button>
        </fieldset>
      )}
      {links.length > 0 && (
        <fieldset className="space-y-1"><legend className="label">Buttons & links</legend>
          {links.map((l, i) => (
            <div key={i} className="flex gap-1">
              <input className="input" value={l.label} onChange={(e) => setLinks(links.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
              <input className="input" value={l.href} onChange={(e) => setLinks(links.map((x, j) => j === i ? { ...x, href: e.target.value } : x))} />
            </div>
          ))}
        </fieldset>
      )}
      <button className="btn-primary w-full">Apply changes</button>
    </form>
  );
}

function ThemeForm({ site, onApply }: { site: CustomerSite; onApply: (ops: Op[]) => void }) {
  const [pal, setPal] = useState<Record<string, string>>(site.spec.theme.palette);
  const [meta, setMeta] = useState({ business_name: site.spec.meta.business_name, tagline: site.spec.meta.tagline });
  const typo = site.spec.theme.typography as { heading_font: string; body_font: string };
  const [fonts, setFonts] = useState({ heading_font: typo.heading_font, body_font: typo.body_font });
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onApply([{ op: "update_meta", ...meta }, { op: "update_theme", palette: pal, typography: fonts }]); }}>
      <div><label className="label">Business name</label><input className="input" value={meta.business_name} onChange={(e) => setMeta({ ...meta, business_name: e.target.value })} /></div>
      <div><label className="label">Tagline</label><input className="input" value={meta.tagline} onChange={(e) => setMeta({ ...meta, tagline: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label">Heading font</label><input className="input" value={fonts.heading_font} onChange={(e) => setFonts({ ...fonts, heading_font: e.target.value })} /></div>
        <div><label className="label">Body font</label><input className="input" value={fonts.body_font} onChange={(e) => setFonts({ ...fonts, body_font: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(pal).map(([k, v]) => (
          <label key={k} className="flex items-center gap-2 text-sm">
            <input type="color" value={v} onChange={(e) => setPal({ ...pal, [k]: e.target.value })} className="h-8 w-10 rounded bg-transparent" />
            {label(k)}
          </label>
        ))}
      </div>
      <button className="btn-primary w-full">Apply theme</button>
    </form>
  );
}

type Msg = { role: "user" | "assistant"; text: string };

function AIChat({ site, onUpdated }: { site: CustomerSite; onUpdated: (s: CustomerSite) => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [needsSub, setNeedsSub] = useState(false);
  const hint = useMemo(() => "e.g. “Make the hero headline warmer and add a pricing section to the home page”", []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const instruction = input.trim();
    setMsgs((m) => [...m, { role: "user", text: instruction }]); setInput(""); setBusy(true);
    try {
      const r = await api<{ summary: string; operations: unknown[]; site: CustomerSite; usage: { used: number; allowance: number } }>(
        `/me/sites/${site.id}/ai-edit`, { method: "POST", json: { instruction, revision: site.revision } });
      setMsgs((m) => [...m, { role: "assistant", text: `${r.summary} (${r.operations.length} change(s) · ${r.usage.used}/${r.usage.allowance} used)` }]);
      if (r.operations.length) onUpdated(r.site);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 402) setNeedsSub(true);
      setMsgs((m) => [...m, { role: "assistant", text: (err as Error).message }]);
    } finally { setBusy(false); }
  }

  return (
    <div className="flex h-[60vh] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite">
        {!msgs.length && <p className="text-sm text-white/50">Describe the change you want. {hint}</p>}
        {msgs.map((m, i) => (
          <div key={i} className={`rounded-xl px-3 py-2 text-sm ${m.role === "user" ? "ml-6 bg-gold/15" : "mr-6 bg-white/5"}`}>{m.text}</div>
        ))}
        {needsSub && <Link href="/dashboard" className="btn-primary w-full">Subscribe to AI Editor</Link>}
      </div>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <input className="input" aria-label="Instruction" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask the AI editor…" disabled={busy} />
        <button className="btn-primary" disabled={busy}>{busy ? "…" : "Send"}</button>
      </form>
    </div>
  );
}
