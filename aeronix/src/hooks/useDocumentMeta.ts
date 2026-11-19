import { useEffect } from 'react';

const SITE = 'AERONIX AIRWAYS';
const BASE_URL = 'https://aeronix.example';

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Per-route title, description, canonical and Open Graph tags. */
export function useDocumentMeta(title: string, description: string, path: string) {
  useEffect(() => {
    const full = path === '/' ? `${SITE} — Beyond the Ordinary` : `${title} · ${SITE}`;
    document.title = full;
    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', full);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[property="og:url"]', 'property', 'og:url', BASE_URL + path);
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    canonical?.setAttribute('href', BASE_URL + path);
  }, [title, description, path]);
}
