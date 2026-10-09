import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SectionHeadingProps {
  eyebrow: string
  title: string
  id: string
  children?: ReactNode
  className?: string
}

export function SectionHeading({ eyebrow, title, id, children, className }: SectionHeadingProps) {
  return (
    <header className={cn("reveal mb-12 max-w-3xl", className)}>
      <p className="mb-4 flex items-center gap-3 text-sm font-bold tracking-[0.18em] text-brand">
        <span aria-hidden className="h-px w-10 bg-gradient-to-l from-brand to-transparent" />
        {eyebrow}
      </p>
      <h2 id={id} className="text-4xl leading-[1.1] font-black tracking-tight text-balance sm:text-5xl lg:text-6xl">
        {title}
      </h2>
      {children && <div className="mt-5 text-lg leading-8 text-muted">{children}</div>}
    </header>
  )
}
