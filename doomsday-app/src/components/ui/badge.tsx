import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-wide whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-brand/40 bg-brand/12 text-brand-pale",
        report: "border-report/40 bg-report/10 text-report",
        rumor: "border-rumor/40 bg-rumor/10 text-rumor",
        muted: "border-white/10 bg-white/5 text-muted",
      },
    },
    defaultVariants: { variant: "default" },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
