import Link from "next/link";
import { label, money, type WebsiteCard } from "@/lib/api";

export default function SiteCard({ w }: { w: WebsiteCard }) {
  return (
    <Link href={`/sites/${w.slug}`} className="group card block overflow-hidden transition hover:border-gold/60">
      <div className="relative aspect-[16/10] overflow-hidden bg-ink-3">
        <iframe
          title={`${w.title} thumbnail`}
          src={`/api/preview/website/${w.id}/index.html`}
          tabIndex={-1}
          aria-hidden
          sandbox=""
          loading="lazy"
          className="pointer-events-none absolute left-0 top-0 h-[250%] w-[250%] origin-top-left scale-[0.4] border-0 bg-white"
        />
      </div>
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg group-hover:text-gold">{w.title}</h3>
          <p className="truncate text-sm text-white/60">{w.tagline}</p>
          <p className="mt-2 text-xs uppercase tracking-wider text-white/40">
            {label(w.category)} · {label(w.design_direction)} · {w.page_count} pages
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-gold/10 px-3 py-1 text-sm font-semibold text-gold">
          {money(w.price_cents, w.currency)}
        </span>
      </div>
    </Link>
  );
}
