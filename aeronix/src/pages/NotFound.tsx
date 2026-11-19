import { ButtonLink } from '../components/ui/Button';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

export default function NotFound() {
  useDocumentMeta('Page not found', 'This page could not be found.', '/404');
  return (
    <section className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <p className="eyebrow">Error 404</p>
      <h1 className="display mt-6 text-6xl md:text-8xl">Off the flight path.</h1>
      <p className="mt-6 max-w-md text-silver">The page you are looking for has departed or never existed.</p>
      <div className="mt-10">
        <ButtonLink to="/">Return home</ButtonLink>
      </div>
    </section>
  );
}
