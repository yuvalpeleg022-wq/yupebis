import { useCallback, useMemo, useState } from 'react';
import { getMotorcycle, motorcycles } from './data/motorcycles';
import { scrollToSection } from './lib/scroll';
import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { Collection } from './components/Collection';
import { Experience } from './components/Experience';
import { Details } from './components/Details';
import { About } from './components/About';
import { TestRide } from './components/TestRide';
import { Footer } from './components/Footer';
import { Legal, type LegalDoc } from './components/Legal';

export default function App() {
  const [bikeId, setBikeId] = useState(motorcycles[0].id);
  const [paintByBike, setPaintByBike] = useState<Record<string, string>>({});
  const [preferredBike, setPreferredBike] = useState<string | null>(null);
  const [prefillNonce, setPrefillNonce] = useState(0);
  const [legal, setLegal] = useState<LegalDoc | null>(null);

  const bike = useMemo(() => getMotorcycle(bikeId), [bikeId]);
  const paint = bike.paints.find((p) => p.id === paintByBike[bike.id]) ?? bike.paints[0];

  const selectPaint = useCallback(
    (paintId: string) => setPaintByBike((m) => ({ ...m, [bikeId]: paintId })),
    [bikeId],
  );

  const viewDetails = useCallback((id: string) => {
    setBikeId(id);
    requestAnimationFrame(() => scrollToSection('details'));
  }, []);

  const view3D = useCallback((id: string) => {
    setBikeId(id);
    requestAnimationFrame(() => scrollToSection('experience'));
  }, []);

  const bookRide = useCallback((id: string) => {
    setPreferredBike(id);
    setPrefillNonce((n) => n + 1);
    scrollToSection('contact');
  }, []);

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Hero bike={motorcycles[0]} onBookRide={bookRide} />
        <Collection onViewDetails={viewDetails} onView3D={view3D} />
        <Experience
          bike={bike}
          paint={paint}
          onSelectBike={setBikeId}
          onSelectPaint={selectPaint}
          onViewDetails={() => scrollToSection('details')}
        />
        <Details
          bike={bike}
          paint={paint}
          onSelectPaint={selectPaint}
          onBookRide={bookRide}
          onView3D={() => scrollToSection('experience')}
        />
        <About />
        <TestRide preferredBikeId={preferredBike} prefillNonce={prefillNonce} onOpenPrivacy={() => setLegal('privacy')} />
      </main>
      <Footer onOpenLegal={setLegal} />
      <Legal doc={legal} onClose={() => setLegal(null)} />
    </>
  );
}
