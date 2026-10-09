import { ExternalLink } from "lucide-react"
import type { SourceLink as Src } from "@/types/content"
import { cn } from "@/lib/utils"

export function SourceLink({ source, className, prefix = "מקור:" }: { source: Src; className?: string; prefix?: string }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("inline-flex items-center gap-1.5 text-sm text-muted underline-offset-4 transition hover:text-brand-pale hover:underline", className)}
    >
      <span>{prefix}</span>
      <bdi>{source.label}</bdi>
      <ExternalLink aria-hidden className="size-3.5" />
      <span className="sr-only">(נפתח בלשונית חדשה)</span>
    </a>
  )
}
