import { useEffect, useState } from "react"
import { Menu, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { BrandLogo } from "@/components/brand-logo"
import type { NavLink } from "@/types/content"
import { cn } from "@/lib/utils"

interface SiteHeaderProps {
  links: NavLink[]
  cta: { label: string; href: `#${string}` }
}

export function SiteHeader({ links, cta }: SiteHeaderProps) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState<string>("#top")

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Highlight the link of the section currently in view
  useEffect(() => {
    const sections = links.map((l) => document.querySelector(l.href)).filter(Boolean) as Element[]
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => e.isIntersecting && setActive(`#${e.target.id}`))
      },
      { rootMargin: "-45% 0px -50% 0px" },
    )
    sections.forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [links])

  const navigate = (href: string) => {
    setOpen(false)
    // Wait for the dialog to close (and restore scroll) before jumping
    window.setTimeout(() => document.querySelector(href)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60)
  }

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-500",
        scrolled ? "border-b border-border bg-background/75 backdrop-blur-xl" : "bg-gradient-to-b from-black/70 to-transparent",
      )}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a href="#top" className="group flex items-center gap-3" aria-label="מארוול גיקים, חזרה לראש העמוד">
          <BrandLogo size={44} className="transition-transform duration-500 group-hover:scale-105" />
          <span className="text-lg font-black tracking-tight">מארוול גיקים</span>
        </a>

        <nav aria-label="ניווט ראשי" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  aria-current={active === l.href ? "true" : undefined}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-[15px] font-medium text-muted transition hover:text-foreground",
                    active === l.href && "bg-brand/12 text-brand-pale",
                  )}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <a href={cta.href}>
              <Play aria-hidden className="fill-current" />
              {cta.label}
            </a>
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden" aria-label="פתיחת התפריט">
                <Menu aria-hidden />
              </Button>
            </DialogTrigger>
            <DialogContent
              closeLabel="סגירת התפריט"
              className="inset-y-0 start-0 flex w-[min(86vw,22rem)] flex-col gap-8 border-y-0 border-s-0 border-e p-6 pt-5 data-[state=open]:animate-fade-slide-in"
            >
              <div className="flex items-center gap-3">
                <BrandLogo size={52} />
                <div>
                  <DialogTitle className="text-xl font-black">מארוול גיקים</DialogTitle>
                  <DialogDescription className="text-sm text-muted">הנוקמים: דומסדיי</DialogDescription>
                </div>
              </div>
              <nav aria-label="ניווט במובייל">
                <ul className="flex flex-col gap-1">
                  {links.map((l) => (
                    <li key={l.href}>
                      <a
                        href={l.href}
                        onClick={(e) => {
                          e.preventDefault()
                          navigate(l.href)
                        }}
                        className={cn(
                          "flex items-center justify-between rounded-lg px-4 py-3.5 text-lg font-bold transition hover:bg-brand/10",
                          active === l.href ? "bg-brand/12 text-brand-pale" : "text-foreground",
                        )}
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
              <Button
                className="mt-auto w-full"
                size="lg"
                onClick={() => navigate(cta.href)}
              >
                <Play aria-hidden className="fill-current" />
                {cta.label}
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  )
}
