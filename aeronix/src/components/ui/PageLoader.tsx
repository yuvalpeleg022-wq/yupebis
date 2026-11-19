export function PageLoader() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <span className="h-px w-24 animate-pulse bg-gradient-to-r from-transparent via-gold to-transparent" />
        <span className="eyebrow">Preparing for departure</span>
      </div>
    </div>
  );
}
