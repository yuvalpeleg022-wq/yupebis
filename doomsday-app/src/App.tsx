import { useMemo, useState } from "react"
import { CheckCircle2, CircleHelp, Film, Sparkles } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { ResponsiveHeroBanner } from "@/components/ui/responsive-hero-banner"
import { ReleaseCountdown } from "@/components/release-countdown"
import { SectionHeading } from "@/components/section-heading"
import { CharacterCard } from "@/components/character-card"
import { TrailerPlayer } from "@/components/trailer-player"
import { MediaGallery } from "@/components/media-gallery"
import { NewsCard } from "@/components/news-card"
import { SiteFooter } from "@/components/site-footer"
import { BrandLogo } from "@/components/brand-logo"
import { SourceLink } from "@/components/source-link"
import { STATUS_LABEL } from "@/components/verification-badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useReveal } from "@/hooks/use-reveal"
import { cn, formatHebrewDate } from "@/lib/utils"
import {
  CHARACTERS,
  CHARACTER_GROUPS,
  FAQ,
  FILM,
  GALLERY,
  HERO_IMAGE,
  LAST_REVIEWED,
  NAV_LINKS,
  NEWS,
  SOURCES,
  TRAILERS,
} from "@/data/content"
import type { VerificationStatus } from "@/types/content"

type Filter = "all" | VerificationStatus

const SOCIALS = [{ label: "אינסטגרם", handle: "@marv.elgikim", url: "https://www.instagram.com/marv.elgikim/" }]

function FilterChips({ value, onChange, counts, label }: { value: Filter; onChange: (f: Filter) => void; counts: Record<Filter, number>; label: string }) {
  const options: Filter[] = ["all", "official", "report", "rumor"]
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options
        .filter((o) => o === "all" || counts[o] > 0)
        .map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={value === o}
            onClick={() => onChange(o)}
            className={cn(
              "cursor-pointer rounded-full border px-4 py-2 text-sm font-bold transition",
              value === o ? "border-brand bg-brand text-primary-foreground" : "border-border bg-surface text-muted hover:border-brand/50 hover:text-foreground",
            )}
          >
            {o === "all" ? "הכול" : STATUS_LABEL[o]} <span className="opacity-70">({counts[o]})</span>
          </button>
        ))}
    </div>
  )
}

function countBy<T extends { status: VerificationStatus }>(items: T[]): Record<Filter, number> {
  return {
    all: items.length,
    official: items.filter((i) => i.status === "official").length,
    report: items.filter((i) => i.status === "report").length,
    rumor: items.filter((i) => i.status === "rumor").length,
  }
}

export default function App() {
  useReveal()
  const [castFilter, setCastFilter] = useState<Filter>("all")
  const [newsFilter, setNewsFilter] = useState<Filter>("all")

  const confirmedCast = useMemo(() => CHARACTERS.filter((c) => c.status === "official"), [])
  const unconfirmedCast = useMemo(() => CHARACTERS.filter((c) => c.status !== "official"), [])
  const visibleConfirmed = castFilter === "all" || castFilter === "official" ? confirmedCast : []
  const visibleUnconfirmed = unconfirmedCast.filter((c) => castFilter === "all" || c.status === castFilter)
  const [doom, ...restConfirmed] = visibleConfirmed

  const visibleNews = NEWS.filter((n) => newsFilter === "all" || n.status === newsFilter).sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  )

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
        דילוג לתוכן
      </a>
      <SiteHeader links={NAV_LINKS} cta={{ label: "צפו בטריילר", href: "#trailers" }} />

      <main id="main">
        <ResponsiveHeroBanner
          id="top"
          badge={
            <span className="inline-flex items-center gap-3 rounded-full border border-brand/30 bg-black/40 py-1.5 ps-1.5 pe-4 text-sm font-bold text-brand-pale backdrop-blur">
              <BrandLogo size={30} />
              מארוול גיקים מציגים
            </span>
          }
          title={FILM.titleHe}
          subtitle="כל המידע. כל הטריילרים. כל העדכונים."
          primaryButton={{ label: "צפו בטריילר", href: "#trailers" }}
          secondaryButton={{ label: "גלו את כל הפרטים", href: "#about" }}
          background={{ src: HERO_IMAGE.src!, alt: HERO_IMAGE.altHe, focus: "50% 18%", width: HERO_IMAGE.width, height: HERO_IMAGE.height }}
          infoItems={[
            { label: "בכורה", value: <>{formatHebrewDate(FILM.releaseDate)} <span className="text-sm font-normal text-muted">(ארה״ב)</span></> },
            { label: "בימוי", value: "האחים רוסו" },
            { label: "אולפן", value: <bdi dir="ltr">{FILM.studioEn}</bdi> },
          ]}
          aside={<ReleaseCountdown releaseDate={FILM.releaseDate} regionHe={FILM.releaseRegionHe} />}
          imageCredit="תמונת הרקע: פוסטר הדמות של דוקטור דום, שהתקבל מהקהילה. מקור לא אומת. © Marvel"
        />

        {/* ===== About ===== */}
        <section id="about" aria-labelledby="about-title" className="relative overflow-hidden py-24 sm:py-32">
          <img
            src="./brand/marvel-gikim-logo.webp"
            alt=""
            aria-hidden
            loading="lazy"
            className="pointer-events-none absolute -end-40 top-10 size-[34rem] rounded-full opacity-[0.022] grayscale"
          />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading id="about-title" eyebrow="על הסרט" title="סאגת המולטיוורס מתחילה את הפרק האחרון" />
            <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
              <div className="reveal">
                <blockquote className="border-s-2 border-brand ps-6 text-2xl leading-[1.6] font-light text-foreground sm:text-[1.7rem]">
                  {FILM.synopsisHe}
                </blockquote>
                <p className="mt-4 ps-6 text-sm text-muted">
                  התקציר הרשמי, בתרגום חופשי. <SourceLink source={FILM.synopsisSource} prefix="" />
                </p>

                <div className="mt-12 grid gap-6 sm:grid-cols-2">
                  <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
                    <h3 className="flex items-center gap-2 text-lg font-black">
                      <Film aria-hidden className="size-5 text-brand" />
                      ההקשר ביקום הקולנועי
                    </h3>
                    <p className="mt-3 leading-7 text-muted">
                      הסרט הוכרז בקומיק-קון 2024 יחד עם ההמשך שלו, ״{FILM.sequel.titleHe}״, שמתוכנן ל-
                      {formatHebrewDate(FILM.sequel.releaseDate)}. לפי התקציר הרשמי, הוא פותח את הפרק האחרון בסאגת המולטיוורס.
                    </p>
                    <SourceLink source={FILM.sequel.source} className="mt-3" />
                  </div>
                  <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
                    <h3 className="flex items-center gap-2 text-lg font-black">
                      <Sparkles aria-hidden className="size-5 text-brand" />
                      שלוש קבוצות, יקום אחד
                    </h3>
                    <p className="mt-3 leading-7 text-muted">
                      הצוות שהוכרז כולל את הנוקמים, ארבעת המופלאים, הת׳אנדרבולטס ודמויות מסרטי האקס-מן הוותיקים. בצד השני עומד
                      דוקטור דום.
                    </p>
                    <SourceLink source={SOURCES.production} className="mt-3" />
                  </div>
                </div>
              </div>

              <aside className="reveal flex flex-col gap-6" aria-label="מה ידוע ומה לא">
                <div className="rounded-[var(--radius-lg)] border border-brand/30 bg-gradient-to-b from-brand-deep/40 to-surface p-6">
                  <h3 className="flex items-center gap-2 text-lg font-black text-brand-pale">
                    <CheckCircle2 aria-hidden className="size-5" />
                    מה הוכרז רשמית
                  </h3>
                  <ul className="mt-4 space-y-3 leading-7 text-foreground/90">
                    <li>תאריך בכורה: {formatHebrewDate(FILM.releaseDate)} בארה״ב</li>
                    <li>בימוי: אנתוני וג׳ו רוסו</li>
                    <li>רוברט דאוני ג׳וניור בתפקיד ויקטור פון דום</li>
                    <li>צוות של יותר מעשרים שחקנים, שנחשף ב-26 במרץ 2025</li>
                    <li>ארבעה טיזרים, טריילר מלא ומבט מיוחד מכנס D23</li>
                  </ul>
                </div>
                <div className="rounded-[var(--radius-lg)] border border-dashed border-white/15 bg-surface/60 p-6">
                  <h3 className="flex items-center gap-2 text-lg font-black">
                    <CircleHelp aria-hidden className="size-5 text-muted" />
                    מה עוד לא ידוע
                  </h3>
                  <ul className="mt-4 space-y-3 leading-7 text-muted">
                    <li>פרטי העלילה, מעבר לתקציר הרשמי</li>
                    <li>התפקידים של רוב השחקנים בסרט</li>
                    <li>אורך הסרט ודירוג הצפייה שלו</li>
                    <li>האם יהיו סצנות אחרי הקרדיטים</li>
                  </ul>
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* ===== Characters ===== */}
        <section id="characters" aria-labelledby="characters-title" className="border-y border-border bg-[linear-gradient(180deg,#050805,#0a120b_30%,#050805)] py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading id="characters-title" eyebrow="דמויות וצוות" title="מי נלחם בדומסדיי">
              כל שחקן מסומן לפי רמת האימות. שם הדמות מופיע רק כשהוא אושר במקור רשמי. ההופעה של שחקן בסרטים קודמים לא אומרת
              שגם הדמות שלו מאושרת.
            </SectionHeading>
            <div className="reveal mb-10">
              <FilterChips value={castFilter} onChange={setCastFilter} counts={countBy(CHARACTERS)} label="סינון לפי רמת אימות" />
            </div>

            {visibleConfirmed.length > 0 && (
              <>
                <h3 className="mb-5 text-sm font-bold tracking-[0.14em] text-brand">צוות מאושר</h3>
                {doom && (
                  <div className="reveal mb-5">
                    <CharacterCard character={doom} groupLabel={CHARACTER_GROUPS[doom.group]} featured />
                  </div>
                )}
                <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {restConfirmed.map((c) => (
                    <li key={c.id} className="reveal">
                      <CharacterCard character={c} groupLabel={CHARACTER_GROUPS[c.group]} />
                    </li>
                  ))}
                </ul>
              </>
            )}

            {visibleUnconfirmed.length > 0 && (
              <div className="mt-16 rounded-[calc(var(--radius-lg)+0.5rem)] border border-dashed border-white/12 p-4 sm:p-6">
                <h3 className="mb-2 text-xl font-black">לא מאושר</h3>
                <p className="mb-6 text-muted">דיווחים ושמועות שמארוול עוד לא אישרה.</p>
                <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleUnconfirmed.map((c) => (
                    <li key={c.id} className="reveal">
                      <CharacterCard character={c} groupLabel={CHARACTER_GROUPS[c.group]} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* ===== Trailers ===== */}
        <section id="trailers" aria-labelledby="trailers-title" className="relative py-24 sm:py-32">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[36rem] bg-[radial-gradient(ellipse_at_top,rgb(70_214_44/0.10),transparent_65%)]" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading id="trailers-title" eyebrow="טריילרים וטיזרים" title="צפו בטריילרים הרשמיים">
              הסרטונים מגיעים מערוץ ה-YouTube של <bdi dir="ltr">Marvel Entertainment</bdi>. הם לא מתנגנים לבד, הפעילו
              כשתרצו.
            </SectionHeading>
            <div className="reveal">
              <TrailerPlayer trailers={TRAILERS} />
            </div>
          </div>
        </section>

        {/* ===== Gallery ===== */}
        <section id="gallery" aria-labelledby="gallery-title" className="border-y border-border bg-surface/40 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading id="gallery-title" eyebrow="גלריה" title="תמונות מהסרט">
              כל תמונה מסומנת לפי המקור שלה: רשמי, או שהתקבלה מהקהילה ועוד לא אומתה. לחצו על תמונה כדי להגדיל אותה.
            </SectionHeading>
            <MediaGallery items={GALLERY} />
          </div>
        </section>

        {/* ===== News ===== */}
        <section id="news" aria-labelledby="news-title" className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading id="news-title" eyebrow="עדכונים" title="מה חדש בדרך לדומסדיי">
              הודעות רשמיות מסומנות בירוק. דיווחים ושמועות מסומנים אחרת, כדי שיהיה קל להבדיל ביניהם.
            </SectionHeading>
            <div className="reveal mb-8 flex flex-wrap items-center justify-between gap-4">
              <FilterChips value={newsFilter} onChange={setNewsFilter} counts={countBy(NEWS)} label="סינון עדכונים לפי רמת אימות" />
              <p className="text-sm text-muted">
                עודכן לאחרונה: <time dateTime={LAST_REVIEWED}>{formatHebrewDate(LAST_REVIEWED)}</time>
              </p>
            </div>
            <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {visibleNews.map((n) => (
                <li key={n.id} className="reveal">
                  <NewsCard item={n} />
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section id="faq" aria-labelledby="faq-title" className="relative overflow-hidden border-t border-border py-24 sm:py-32">
          <img
            src="./brand/marvel-gikim-logo.webp"
            alt=""
            aria-hidden
            loading="lazy"
            className="pointer-events-none absolute -start-48 bottom-0 size-[30rem] rounded-full opacity-[0.022] grayscale"
          />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.6fr] lg:px-8">
            <SectionHeading id="faq-title" eyebrow="שאלות נפוצות" title="כל מה שרציתם לדעת" className="mb-0" />
            <Accordion type="single" collapsible className="reveal">
              {FAQ.map((f) => (
                <AccordionItem key={f.id} value={f.id}>
                  <AccordionTrigger>{f.questionHe}</AccordionTrigger>
                  <AccordionContent>
                    <p>{f.answerHe}</p>
                    {f.source && <SourceLink source={f.source} className="mt-3" />}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>

      <SiteFooter links={NAV_LINKS} lastReviewed={LAST_REVIEWED} socials={SOCIALS} />
    </>
  )
}
