export function Footer() {
  return (
    <footer className="section-pad border-t hairline py-12 text-sm text-mist">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="display text-3xl text-bone">The Infinity Saga <span className="text-mist">/ Fan Experience</span></p>
          <p className="mt-3 max-w-xl leading-relaxed">
            An unofficial, non-commercial fan concept. Not affiliated with, endorsed or sponsored by Marvel Studios,
            Marvel Entertainment or The Walt Disney Company. Character names, film titles and related marks belong to their respective owners.
          </p>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.25em]">
          Film data current as of writing — release details for upcoming titles may change.
        </p>
      </div>
    </footer>
  );
}
