import { useState } from "react"
import { Play } from "lucide-react"
import type { Trailer } from "@/types/content"
import { VerificationBadge } from "@/components/verification-badge"
import { SourceLink } from "@/components/source-link"
import { cn, formatHebrewDate } from "@/lib/utils"

const thumb = (id: string, size: "maxresdefault" | "hqdefault" = "hqdefault") => `https://i.ytimg.com/vi/${id}/${size}.jpg`

/**
 * Featured player + selectable list. The YouTube iframe (privacy-enhanced domain) loads only
 * after the visitor presses play, so nothing autoplays with sound on page load.
 */
export function TrailerPlayer({ trailers }: { trailers: Trailer[] }) {
  const [selectedId, setSelectedId] = useState(trailers[0]?.id)
  const [playing, setPlaying] = useState(false)
  const selected = trailers.find((t) => t.id === selectedId) ?? trailers[0]

  if (!selected) {
    return <p className="rounded-xl border border-border bg-surface p-8 text-center text-muted">עוד לא אומת טריילר רשמי.</p>
  }

  const select = (id: string) => {
    setSelectedId(id)
    setPlaying(false)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
      <div className="min-w-0">
        <div className="relative aspect-video overflow-hidden rounded-[var(--radius-lg)] border border-border bg-black shadow-[0_40px_120px_-40px_rgb(70_214_44/0.45)]">
          {selected.youtubeId && playing ? (
            <iframe
              key={selected.youtubeId}
              src={`https://www.youtube-nocookie.com/embed/${selected.youtubeId}?autoplay=1&rel=0&modestbranding=1&hl=he`}
              title={selected.titleHe}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="absolute inset-0 size-full"
            />
          ) : selected.youtubeId ? (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="group absolute inset-0 cursor-pointer"
              aria-label={`הפעלת ${selected.titleHe}`}
            >
              <img
                src={thumb(selected.youtubeId, "maxresdefault")}
                onError={(e) => {
                  const img = e.currentTarget
                  if (!img.src.includes("hqdefault")) img.src = thumb(selected.youtubeId!, "hqdefault")
                  else img.style.visibility = "hidden"
                }}
                alt=""
                width={1280}
                height={720}
                className="absolute inset-0 size-full object-cover opacity-80 transition duration-700 group-hover:scale-[1.03] group-hover:opacity-95"
              />
              <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />
              <span
                aria-hidden
                className="absolute top-1/2 left-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_0_0_10px_rgb(70_214_44/0.18),0_0_60px_rgb(70_214_44/0.6)] transition group-hover:scale-110 sm:size-24"
              >
                <Play className="size-9 translate-x-0.5 fill-current" />
              </span>
              <span className="absolute inset-x-0 bottom-0 hidden p-5 text-start sm:block sm:p-7">
                <span className="block text-2xl font-black sm:text-3xl">{selected.titleHe}</span>
                <span className="mt-1 block text-sm text-muted">{formatHebrewDate(selected.publishedAt)}</span>
              </span>
            </button>
          ) : (
            <div className="absolute inset-0 grid place-items-center p-8 text-center text-muted">
              <p>
                לסרטון הזה עוד אין הטמעה מאומתת. <SourceLink source={selected.source} prefix="לצפייה:" />
              </p>
            </div>
          )}
        </div>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-2xl font-black">{selected.titleHe}</h3>
              <VerificationBadge status={selected.status} />
            </div>
            <p className="mt-2 leading-7 text-muted">{selected.descriptionHe}</p>
          </div>
          <div className="flex flex-col items-start gap-1 text-sm">
            <span className="text-muted">פורסם: {formatHebrewDate(selected.publishedAt)}</span>
            <SourceLink source={selected.source} />
          </div>
        </div>
      </div>

      <div role="listbox" aria-label="בחירת טריילר" className="flex max-h-[34rem] flex-col gap-2 overflow-y-auto pe-1">
        {trailers.map((t) => {
          const isActive = t.id === selected.id
          return (
            <button
              key={t.id}
              type="button"
              role="option"
              aria-selected={isActive}
              onClick={() => select(t.id)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 text-start transition",
                isActive ? "border-brand/60 bg-brand/10" : "border-transparent hover:border-border hover:bg-surface",
              )}
            >
              <span className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                {t.youtubeId && (
                  <img
                    src={thumb(t.youtubeId)}
                    alt=""
                    loading="lazy"
                    width={480}
                    height={360}
                    onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                    className="absolute inset-0 size-full object-cover"
                  />
                )}
                {isActive && (
                  <span className="absolute inset-0 grid place-items-center bg-black/40">
                    <Play aria-hidden className="size-5 fill-brand text-brand" />
                  </span>
                )}
              </span>
              <span className="min-w-0">
                <span className={cn("block truncate font-bold", isActive && "text-brand-pale")}>{t.titleHe}</span>
                <span className="mt-0.5 block text-xs text-muted">{formatHebrewDate(t.publishedAt)}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
