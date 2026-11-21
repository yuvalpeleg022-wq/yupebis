/** Smooth-scrolls to a section, honouring reduced-motion and the fixed nav. */
export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  if (history.replaceState) history.replaceState(null, '', `#${id}`);
}
