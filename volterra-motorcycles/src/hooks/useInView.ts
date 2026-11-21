import { useEffect, useState, type RefObject } from 'react';

/** True while (or once, with `once`) the element intersects the viewport. */
export function useInView<T extends Element>(
  ref: RefObject<T>,
  { rootMargin = '0px', once = false, threshold = 0 }: { rootMargin?: string; once?: boolean; threshold?: number } = {},
): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin, threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, once, threshold]);
  return inView;
}
