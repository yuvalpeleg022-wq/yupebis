import { BadgeCheck, Newspaper, MessageCircleQuestion } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { VerificationStatus } from "@/types/content"

const MAP: Record<VerificationStatus, { label: string; variant: "default" | "report" | "rumor"; Icon: typeof BadgeCheck; hint: string }> = {
  official: { label: "רשמי", variant: "default", Icon: BadgeCheck, hint: "אושר על ידי מקור רשמי של Marvel או Disney" },
  report: { label: "דיווח", variant: "report", Icon: Newspaper, hint: "דווח בכלי תקשורת, אבל לא אושר רשמית" },
  rumor: { label: "שמועה", variant: "rumor", Icon: MessageCircleQuestion, hint: "לא מאומת. יש להתייחס בזהירות" },
}

export function VerificationBadge({ status, className }: { status: VerificationStatus; className?: string }) {
  const { label, variant, Icon, hint } = MAP[status]
  return (
    <Badge variant={variant} className={className} title={hint}>
      <Icon aria-hidden className="size-3.5" />
      {label}
      <span className="sr-only">: {hint}</span>
    </Badge>
  )
}

export const STATUS_LABEL: Record<VerificationStatus, string> = { official: "רשמי", report: "דיווח", rumor: "שמועה" }
