import { useEffect, useState } from "react"
import { CalendarClock } from "lucide-react"
import { formatHebrewDate } from "@/lib/utils"

/** Whole days until an ISO release date. Counts calendar days only: no screening time has been announced. */
function daysUntil(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  const target = Date.UTC(y, m - 1, d)
  const now = new Date()
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target - today) / 86_400_000)
}

export function ReleaseCountdown({ releaseDate, regionHe }: { releaseDate: string; regionHe: string }) {
  const [days, setDays] = useState(() => daysUntil(releaseDate))
  useEffect(() => {
    const t = window.setInterval(() => setDays(daysUntil(releaseDate)), 60_000)
    return () => window.clearInterval(t)
  }, [releaseDate])

  const text =
    days > 1 ? `עוד ${days} ימים לבכורה` : days === 1 ? "מחר הבכורה" : days === 0 ? "הבכורה היום" : "הסרט כבר בבתי הקולנוע"

  return (
    <p className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-brand/30 bg-brand/8 px-4 py-2 text-sm" aria-live="polite">
      <CalendarClock aria-hidden className="size-4 text-brand" />
      <span className="font-black text-brand-pale">{text}</span>
      <span className="text-muted">
        {formatHebrewDate(releaseDate)} · {regionHe}
      </span>
    </p>
  )
}
