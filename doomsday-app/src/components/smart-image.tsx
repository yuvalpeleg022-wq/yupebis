import { useState } from "react"
import { ImageOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface SmartImageProps {
  src?: string
  alt: string
  width: number
  height: number
  className?: string
  imgClassName?: string
  focus?: string
  /** Above-the-fold images load eagerly; everything else is lazy */
  priority?: boolean
}

/** Image with reserved dimensions and a Hebrew fallback for missing or broken media. */
export function SmartImage({ src, alt, width, height, className, imgClassName, focus, priority }: SmartImageProps) {
  const [failed, setFailed] = useState(false)
  const missing = !src || failed
  return (
    <div className={cn("relative overflow-hidden bg-surface-2", className)} style={{ aspectRatio: `${width} / ${height}` }}>
      {missing ? (
        <div role="img" aria-label={`${alt}. התמונה תתווסף בקרוב`} className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_40%,rgb(70_214_44/0.12),transparent_65%)]">
          <div className="flex flex-col items-center gap-2 text-center text-muted">
            <ImageOff aria-hidden className="size-7 text-brand/70" />
            <span className="text-sm font-medium">התמונה תתווסף בקרוב</span>
          </div>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
          className={cn("absolute inset-0 size-full object-cover", imgClassName)}
          style={focus ? { objectPosition: focus } : undefined}
        />
      )}
    </div>
  )
}
