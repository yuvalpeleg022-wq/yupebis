import { useCallback, useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Expand } from "lucide-react"
import type { GalleryImage, MediaKind } from "@/types/content"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { SmartImage } from "@/components/smart-image"
import { SourceLink } from "@/components/source-link"
import { cn } from "@/lib/utils"

const KIND_LABEL: Record<MediaKind, string> = {
  poster: "פוסטר",
  still: "תמונת סט רשמית",
  "trailer-frame": "פריים מטריילר",
  "trailer-thumbnail": "תמונה ממוזערת של טריילר",
}

function ProvenanceBadge({ img }: { img: GalleryImage }) {
  return img.provenance === "official" ? <Badge>מקור רשמי</Badge> : <Badge variant="report">מקור לא אומת</Badge>
}

export function MediaGallery({ items }: { items: GalleryImage[] }) {
  const [index, setIndex] = useState<number | null>(null)
  const open = index !== null
  const current = open ? items[index] : null

  const go = useCallback(
    (dir: 1 | -1) => setIndex((i) => (i === null ? i : (i + dir + items.length) % items.length)),
    [items.length],
  )

  // Arrow keys in the lightbox. In RTL, "next" is the item to the left.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(1)
      if (e.key === "ArrowRight") go(-1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, go])

  return (
    <>
      <ul className="grid auto-rows-auto grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {items.map((img, i) => {
          const wide = img.width / img.height > 1.5
          return (
            <li key={img.id} className={cn("reveal", wide ? "lg:col-span-4" : "lg:col-span-2", i === 0 && "lg:row-span-2")}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                className="group relative block h-full w-full cursor-pointer overflow-hidden rounded-[var(--radius-lg)] border border-border text-start transition hover:border-brand/50"
                aria-label={`הגדלת התמונה: ${img.altHe}`}
              >
                <SmartImage
                  src={img.src}
                  alt={img.altHe}
                  width={img.width}
                  height={img.height}
                  focus={img.focus}
                  className="h-full w-full"
                  imgClassName="transition duration-700 group-hover:scale-[1.04]"
                />
                <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-transparent opacity-90" />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
                  <span className="flex flex-col items-start gap-1.5">
                    <ProvenanceBadge img={img} />
                    <span className="text-sm font-bold">{KIND_LABEL[img.kind]}</span>
                  </span>
                  <Expand aria-hidden className="size-5 text-brand-pale opacity-0 transition group-hover:opacity-100" />
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <Dialog open={open} onOpenChange={(o) => !o && setIndex(null)}>
        <DialogContent
          closeLabel="סגירת התמונה"
          className="inset-2 m-auto flex max-h-[calc(100svh-1rem)] max-w-6xl flex-col overflow-y-auto rounded-[var(--radius-lg)] p-0 sm:inset-6"
        >
          {current && (
            <>
              <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black">
                {current.src ? (
                  <img
                    src={current.src}
                    alt={current.altHe}
                    width={current.width}
                    height={current.height}
                    className="max-h-[70svh] w-auto max-w-full object-contain"
                  />
                ) : (
                  <SmartImage alt={current.altHe} width={current.width} height={current.height} className="w-full max-w-3xl" />
                )}
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="התמונה הקודמת"
                  className="absolute inset-y-0 start-0 my-auto grid size-12 cursor-pointer place-items-center rounded-full border border-white/10 bg-black/60 ms-3 transition hover:border-brand"
                >
                  <ChevronRight aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="התמונה הבאה"
                  className="absolute inset-y-0 end-0 my-auto grid size-12 cursor-pointer place-items-center rounded-full border border-white/10 bg-black/60 me-3 transition hover:border-brand"
                >
                  <ChevronLeft aria-hidden />
                </button>
              </div>
              <div className="flex flex-col gap-3 border-t border-border p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <ProvenanceBadge img={current} />
                  <Badge variant="muted">{KIND_LABEL[current.kind]}</Badge>
                  {current.timestamp && <Badge variant="muted">חותמת זמן: <bdi dir="ltr">{current.timestamp}</bdi></Badge>}
                  <span className="ms-auto text-sm text-muted">
                    {(index ?? 0) + 1} / {items.length}
                  </span>
                </div>
                <DialogTitle className="text-xl font-black">{current.captionHe}</DialogTitle>
                <DialogDescription className="text-sm leading-6 text-muted">{current.provenanceNoteHe}</DialogDescription>
                {current.source && <SourceLink source={current.source} />}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
