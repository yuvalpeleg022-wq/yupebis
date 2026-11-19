import gsap from 'gsap';
import type { FlightRig } from './flightRig';

/**
 * Hero intro, in order:
 *  1 background → 2 clouds → 3 aircraft enters → 4 camera reveal → 5 headline → 6 nav → 7 CTAs.
 * Short (≈4 s) and non-blocking: the page is interactive throughout.
 */
export function playHeroIntro(rig: FlightRig, root: HTMLElement, reduced: boolean): gsap.core.Timeline {
  const q = gsap.utils.selector(root);
  const nav = document.querySelector('[data-nav]');
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  if (reduced) {
    rig.intro.planeX = 0;
    rig.intro.planeY = 0;
    rig.intro.camDolly = 0;
    rig.intro.exposure = 1;
    rig.snap = true;
    tl.set([q('[data-intro]'), nav], { autoAlpha: 1, y: 0 });
    return tl;
  }

  tl.set(q('[data-intro]'), { autoAlpha: 0, y: 28 })
    .set(nav, { autoAlpha: 0, y: -16 })
    .to(rig.intro, { exposure: 1, duration: 1.6, ease: 'power2.out' }, 0) // 1–2 sky & clouds fade up
    .to(rig.intro, { planeX: 0, planeY: 0, duration: 3.4, ease: 'power3.out' }, 0.35) // 3 aircraft enters
    .to(rig.intro, { camDolly: 0, duration: 3.6, ease: 'power2.inOut' }, 0.5) // 4 camera reveal
    .to(q('[data-intro="eyebrow"]'), { autoAlpha: 1, y: 0, duration: 1 }, 1.9)
    .to(q('[data-intro="headline"]'), { autoAlpha: 1, y: 0, duration: 1.3 }, 2.05) // 5 headline
    .to(q('[data-intro="sub"]'), { autoAlpha: 1, y: 0, duration: 1.1 }, 2.4)
    .to(nav, { autoAlpha: 1, y: 0, duration: 1 }, 2.6) // 6 navigation
    .to(q('[data-intro="cta"]'), { autoAlpha: 1, y: 0, duration: 1, stagger: 0.12 }, 2.85) // 7 CTAs
    .to(q('[data-intro="meta"]'), { autoAlpha: 1, y: 0, duration: 1 }, 3.1);
  return tl;
}
