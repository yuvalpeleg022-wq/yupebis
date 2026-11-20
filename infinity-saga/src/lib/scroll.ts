/**
 * Shared mutable scroll state. ScrollTrigger writes, render loops read —
 * no React re-renders on scroll.
 */
export const scrollState = {
  hero: 0,
  finale: 0,
  velocity: 0,
};
