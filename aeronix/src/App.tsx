import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
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

export default function App() {
  return (
    <QualityProvider>
      <BrowserRouter>
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
      </BrowserRouter>
    </QualityProvider>
  );
}
