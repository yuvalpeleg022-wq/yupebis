import { cn } from "@/lib/utils"

/** The Marvel Gikim community logo, cropped from the fan page's profile image (not redrawn). */
export function BrandLogo({ size = 44, className, decorative = true }: { size?: number; className?: string; decorative?: boolean }) {
  return (
    <img
      src="./brand/marvel-gikim-logo.webp"
      width={size}
      height={size}
      alt={decorative ? "" : "הלוגו של מארוול גיקים"}
      aria-hidden={decorative || undefined}
      className={cn("shrink-0 rounded-full shadow-[0_0_0_2px_rgb(18_77_10),0_0_24px_rgb(70_214_44/0.35)]", className)}
      style={{ width: size, height: size }}
    />
  )
}
