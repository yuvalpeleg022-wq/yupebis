import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SEQUENCE_SHOTS } from './cameraSequences';
import { rigValuesFor, type FlightRig } from './flightRig';

gsap.registerPlugin(ScrollTrigger);

interface Options {
  /** Element wrapping the hero + sequence sections; its scroll range drives the flight. */
  trigger: HTMLElement;
  /** One element per shot after the hero, in order. Used for reduced-motion cuts & captions. */
  sections: HTMLElement[];
  reduced: boolean;
  simplified: boolean;
}

/**
 * Builds the scroll-driven flight. Normal mode: one scrubbed timeline tweening the rig through
 * every shot. Reduced-motion: no camera motion — each section cuts to its framing on entry.
 * Returns a cleanup function.
 */
export function createScrollFlight(rig: FlightRig, { trigger, sections, reduced, simplified }: Options) {
  const ctx = gsap.context(() => {
    if (reduced) {
      rig.snap = true;
      sections.forEach((el, i) => {
        const shot = SEQUENCE_SHOTS[i + 1];
        const prev = SEQUENCE_SHOTS[i];
        if (!shot || !prev) return;
        ScrollTrigger.create({
          trigger: el,
          start: 'top center',
          end: 'bottom center',
          onEnter: () => Object.assign(rig, rigValuesFor(shot)),
          onLeaveBack: () => Object.assign(rig, rigValuesFor(prev)),
        });
      });
      return;
    }

    rig.snap = false;
    const tl = gsap.timeline({
      defaults: { ease: 'sine.inOut', duration: 1 },
      scrollTrigger: {
        trigger,
        start: 'top top',
        end: 'bottom bottom',
        scrub: simplified ? true : 1.4,
        invalidateOnRefresh: true,
      },
    });
    SEQUENCE_SHOTS.slice(1).forEach((shot) => {
      tl.to(rig, rigValuesFor(shot));
    });

    // Captions: fade each section's copy in/out around its midpoint.
    sections.forEach((el) => {
      const copy = el.querySelector('[data-caption]');
      if (!copy) return;
      gsap.fromTo(
        copy,
        { autoAlpha: 0, y: 40 },
        {
          autoAlpha: 1,
          y: 0,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 75%', end: 'top 35%', scrub: true },
        },
      );
    });
  }, trigger);

  return () => ctx.revert();
}

export { ScrollTrigger };
