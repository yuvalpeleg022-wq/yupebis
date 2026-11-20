export function SectionFallback({ label }: { label: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" aria-busy="true">
      <span className="eyebrow animate-pulse">Loading {label}…</span>
    </div>
  );
}
