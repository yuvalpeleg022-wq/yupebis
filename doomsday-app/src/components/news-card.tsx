import type { NewsItem } from "@/types/content"
import { VerificationBadge } from "@/components/verification-badge"
import { SourceLink } from "@/components/source-link"
import { cn, formatHebrewDate } from "@/lib/utils"

export function NewsCard({ item }: { item: NewsItem }) {
  const official = item.status === "official"
  return (
    <article
      className={cn(
        "relative flex h-full flex-col gap-3 rounded-[var(--radius-lg)] border p-6 transition duration-500",
        official
          ? "border-border bg-surface hover:border-brand/45"
          : "border-dashed border-rumor/30 bg-[repeating-linear-gradient(135deg,rgb(201_163_255/0.035)_0_12px,transparent_12px_24px)] hover:border-rumor/60",
      )}
    >
      <span aria-hidden className={cn("absolute inset-y-6 start-0 w-0.5 rounded-full", official ? "bg-brand" : "bg-rumor/70")} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <VerificationBadge status={item.status} />
        <time dateTime={item.publishedAt} className="text-sm text-muted">
          {formatHebrewDate(item.publishedAt)}
        </time>
      </div>
      <h3 className="text-xl leading-snug font-black">{item.titleHe}</h3>
      <p className="leading-7 text-muted">{item.summaryHe}</p>
      <SourceLink source={item.source} className="mt-auto pt-1" />
    </article>
  )
}
