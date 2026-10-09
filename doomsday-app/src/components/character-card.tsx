import type { Character } from "@/types/content"
import { VerificationBadge } from "@/components/verification-badge"
import { SourceLink } from "@/components/source-link"
import { SmartImage } from "@/components/smart-image"
import { cn } from "@/lib/utils"

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((p) => /^[A-Za-z]/.test(p))
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
}

export function CharacterCard({ character, groupLabel, featured = false }: { character: Character; groupLabel: string; featured?: boolean }) {
  const c = character
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface transition duration-500 hover:-translate-y-1 hover:border-brand/45 hover:shadow-[0_24px_60px_-30px_rgb(70_214_44/0.55)]",
        featured && "md:flex-row",
      )}
    >
      {c.image ? (
        <SmartImage
          src={c.image.src}
          alt={c.image.altHe}
          width={c.image.width}
          height={c.image.height}
          focus={c.image.focus}
          className={cn("w-full", featured && "md:w-2/5")}
        />
      ) : (
        <div
          aria-hidden
          className={cn(
            "relative grid aspect-[4/3] place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_35%,#163a1c,#0b140d_70%)]",
            featured && "md:aspect-auto md:w-2/5",
          )}
        >
          <span dir="ltr" className="text-5xl font-black tracking-tight text-brand/35 transition duration-500 group-hover:text-brand/60">
            {initials(c.actorEn)}
          </span>
          <span className="absolute bottom-3 text-xs font-medium text-muted/80">התמונה תתווסף בקרוב</span>
        </div>
      )}

      <div className={cn("flex flex-1 flex-col gap-3 p-5", featured && "md:p-8")}>
        <div className="flex flex-wrap items-center gap-2">
          <VerificationBadge status={c.status} />
          <span className="text-xs font-medium text-muted">{groupLabel}</span>
        </div>
        <div>
          <h3 className={cn("text-xl leading-tight font-black", featured && "md:text-3xl")}>{c.actorHe}</h3>
          <p className="mt-0.5 text-sm text-muted">
            <bdi dir="ltr">{c.actorEn}</bdi>
          </p>
        </div>
        {c.characterHe ? (
          <p className="text-base font-bold text-brand-pale">
            בתפקיד {c.characterHe}
            {c.characterEn && (
              <span className="font-normal text-muted">
                {" "}
                (<bdi dir="ltr">{c.characterEn}</bdi>)
              </span>
            )}
          </p>
        ) : (
          <p className="text-sm font-medium text-muted/90">הדמות עוד לא אושרה</p>
        )}
        <p className={cn("text-[15px] leading-7 text-muted", featured && "md:text-lg md:leading-8")}>{c.descriptionHe}</p>
        <SourceLink source={c.source} className="mt-auto pt-2" />
      </div>
    </article>
  )
}
