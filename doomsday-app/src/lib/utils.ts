import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const hebrewDate = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long", year: "numeric" })

/** Formats an ISO date (YYYY-MM-DD) as a Hebrew date without shifting days across time zones. */
export function formatHebrewDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return hebrewDate.format(new Date(y, (m ?? 1) - 1, d ?? 1))
}
