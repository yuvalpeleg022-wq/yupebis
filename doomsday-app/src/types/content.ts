/** How well a piece of content is backed by a source. */
export type VerificationStatus = "official" | "report" | "rumor"

export interface SourceLink {
  /** Short Hebrew label shown in the UI, e.g. "Marvel.com" */
  label: string
  url: string
}

export interface FilmInfo {
  titleHe: string
  titleEn: string
  /** ISO date of the theatrical release */
  releaseDate: string
  releaseRegionHe: string
  directorsEn: string[]
  studioEn: string
  synopsisHe: string
  synopsisSource: SourceLink
  sequel: { titleHe: string; titleEn: string; releaseDate: string; source: SourceLink }
  sources: SourceLink[]
}

export interface Character {
  id: string
  actorEn: string
  actorHe: string
  /** Only set when the role itself is confirmed by a source */
  characterHe?: string
  characterEn?: string
  descriptionHe: string
  group: "doom" | "avengers" | "fantastic-four" | "thunderbolts" | "x-men" | "wakanda-talokan"
  status: VerificationStatus
  source: SourceLink
  image?: GalleryImage
}

export interface Trailer {
  id: string
  titleHe: string
  /** ISO date */
  publishedAt: string
  descriptionHe: string
  status: VerificationStatus
  source: SourceLink
  /** Only set for a YouTube ID verified as an official Marvel upload */
  youtubeId?: string
}

export type MediaKind = "poster" | "still" | "trailer-frame" | "trailer-thumbnail"

export interface GalleryImage {
  id: string
  /** Public path or URL. Missing = not obtained yet, a fallback is shown. */
  src?: string
  width: number
  height: number
  altHe: string
  captionHe: string
  kind: MediaKind
  /** official = from an official Marvel/Disney source; unverified = origin not confirmed */
  provenance: "official" | "unverified"
  provenanceNoteHe: string
  source?: SourceLink
  /** Trailer timestamp, e.g. "1:42" */
  timestamp?: string
  /** CSS object-position used to avoid awkward crops */
  focus?: string
}

export interface NewsItem {
  id: string
  titleHe: string
  summaryHe: string
  /** ISO date */
  publishedAt: string
  status: VerificationStatus
  source: SourceLink
}

export interface FaqItem {
  id: string
  questionHe: string
  answerHe: string
  source?: SourceLink
}

export interface NavLink {
  label: string
  href: `#${string}`
}
