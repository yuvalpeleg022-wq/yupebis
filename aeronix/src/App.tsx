import { lazy, Suspense } from 'react';
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';
import { QualityProvider } from './hooks/useQuality';
import { Layout } from './components/layout/Layout';
import { PageLoader } from './components/ui/PageLoader';
import Home from './pages/Home';

// Secondary routes are code-split so the home experience loads first.
const Destinations = lazy(() => import('./pages/Destinations'));
const Fleet = lazy(() => import('./pages/Fleet'));
const Experience = lazy(() => import('./pages/Experience'));
const Booking = lazy(() => import('./pages/Booking'));
const About = lazy(() => import('./pages/About'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Hash routing for hosts without SPA rewrites (e.g. the portable preview build: VITE_ROUTER=hash).
const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter;

export default function App() {
  return (
    <QualityProvider>
      <Router>
        <Layout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/destinations" element={<Destinations />} />
              <Route path="/fleet" element={<Fleet />} />
              <Route path="/experience" element={<Experience />} />
              <Route path="/booking" element={<Booking />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Layout>
      </Router>
    </QualityProvider>
  );
}
