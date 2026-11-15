"use client";
import { useState } from "react";

export default function PreviewFrame({ base, pages, token, refreshKey = 0 }:
  { base: string; pages: { slug: string; title: string }[]; token?: string; refreshKey?: number }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [page, setPage] = useState(pages[0]?.slug ?? "index");
  const src = `${base}${page}.html${token ? `?token=${encodeURIComponent(token)}` : ""}${token ? "&" : "?"}r=${refreshKey}`;
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Pages">
          {pages.map((p) => (
            <button key={p.slug} role="tab" aria-selected={page === p.slug} onClick={() => setPage(p.slug)}
              className={`chip ${page === p.slug ? "chip-on" : ""}`}>{p.title}</button>
          ))}
        </div>
        <div className="flex gap-1" aria-label="Device">
          {(["desktop", "mobile"] as const).map((d) => (
            <button key={d} onClick={() => setDevice(d)} aria-pressed={device === d}
              className={`chip capitalize ${device === d ? "chip-on" : ""}`}>{d}</button>
          ))}
        </div>
      </div>
      <div className="flex justify-center bg-black/40 p-2 sm:p-4">
        <iframe
          key={src}
          title="Website preview"
          src={src}
          sandbox="allow-same-origin"
          className={`h-[70vh] rounded-lg border border-white/10 bg-white transition-all ${device === "mobile" ? "w-[390px] max-w-full" : "w-full"}`}
        />
      </div>
    </div>
  );
}
