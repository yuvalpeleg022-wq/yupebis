import { lazy, Suspense, useEffect, useMemo } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { QualityContext, detectQuality } from './hooks/useQuality';
import { Nav } from './components/Nav';
import { Hero } from './sections/Hero';
import { Footer } from './components/Footer';
import { SectionFallback } from './components/SectionFallback';

// Every section below the fold is code-split and loaded on demand.
const StonesSection = lazy(() => import('./sections/Stones'));
const Timeline = lazy(() => import('./sections/Timeline'));
const Gallery = lazy(() => import('./sections/Gallery'));
const Multiverse = lazy(() => import('./sections/Multiverse'));
const Characters = lazy(() => import('./sections/Characters'));
const Finale = lazy(() => import('./sections/Finale'));

export default function App() {
  const quality = useMemo(detectQuality, []);

  useEffect(() => {
    document.documentElement.dataset.tier = quality.tier;
    // Lazy sections and pins change the page height after triggers are created:
    // re-sort triggers by page position and re-measure whenever layout settles.
    let t = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(t);
      t = window.setTimeout(() => { ScrollTrigger.sort(); ScrollTrigger.refresh(); }, 200);
    });
    ro.observe(document.body);
    return () => { ro.disconnect(); window.clearTimeout(t); };
  }, [quality.tier]);

  return (
    <QualityContext.Provider value={quality}>
      <div className="grain">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] btn bg-void">Skip to content</a>
        <Nav />
        <main id="main">
          <Hero />
          <Suspense fallback={<SectionFallback label="Infinity Stones" />}><StonesSection /></Suspense>
          <Suspense fallback={<SectionFallback label="Timeline" />}><Timeline /></Suspense>
          <Suspense fallback={<SectionFallback label="Gallery" />}><Gallery /></Suspense>
          <Suspense fallback={<SectionFallback label="Multiverse" />}><Multiverse /></Suspense>
          <Suspense fallback={<SectionFallback label="Characters" />}><Characters /></Suspense>
          <Suspense fallback={<SectionFallback label="Finale" />}><Finale /></Suspense>
        </main>
        <Footer />
      </div>
    </QualityContext.Provider>
  );
}
