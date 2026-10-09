import type { NavLink } from "@/types/content"
import { BrandLogo } from "@/components/brand-logo"
import { formatHebrewDate } from "@/lib/utils"

interface SiteFooterProps {
  links: NavLink[]
  lastReviewed: string
  socials: { label: string; handle: string; url: string }[]
}

export function SiteFooter({ links, lastReviewed, socials }: SiteFooterProps) {
  return (
    <footer className="relative border-t border-border bg-surface/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr] lg:px-8">
        <div className="flex flex-col items-start gap-4">
          <div className="flex items-center gap-4">
            <BrandLogo size={64} />
            <div>
              <p className="text-2xl font-black">מארוול גיקים</p>
              <p className="text-sm text-muted">קהילת המעריצים של מארוול</p>
            </div>
          </div>
          <p className="max-w-sm text-sm leading-6 text-muted">אתר מעריצים עצמאי. אינו אתר רשמי של Marvel או Disney.</p>
        </div>

        <nav aria-label="ניווט בכותרת התחתונה">
          <p className="mb-3 text-sm font-bold text-brand">ניווט</p>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="text-muted transition hover:text-brand-pale">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {socials.length > 0 && (
          <div>
            <p className="mb-3 text-sm font-bold text-brand">עקבו אחרינו</p>
            <ul className="flex flex-col gap-2">
              {socials.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-muted transition hover:text-brand-pale">
                    {s.label}: <bdi dir="ltr">{s.handle}</bdi>
                    <span className="sr-only"> (נפתח בלשונית חדשה)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-muted/80 sm:px-6 lg:px-8">
          עודכן לאחרונה: <time dateTime={lastReviewed}>{formatHebrewDate(lastReviewed)}</time> · התוכן נבדק ידנית. אין באתר עדכון חי.
        </p>
      </div>
    </footer>
  )
}
