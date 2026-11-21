import { brand, navItems } from '../config/brand';
import { scrollToSection } from '../lib/scroll';
import type { LegalDoc } from './Legal';
import './Footer.css';

export function Footer({ onOpenLegal }: { onOpenLegal: (doc: LegalDoc) => void }) {
  const year = new Date().getFullYear();
  return (
    <footer className="footer" aria-labelledby="footer-brand">
      <div className="container">
        <div className="footer__top">
          <div className="footer__brand">
            <p id="footer-brand" className="footer__word">
              {brand.name}
              <span>Motorcycles</span>
            </p>
            <p className="footer__desc">{brand.description}</p>
          </div>

          <nav className="footer__col" aria-label="Footer">
            <h3>Explore</h3>
            <ul>
              {navItems.map((n) => (
                <li key={n.id}>
                  <a
                    href={`#${n.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection(n.id);
                    }}
                  >
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="footer__col">
            <h3>Visit</h3>
            <address>
              {brand.contact.addressLines.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </address>
            {brand.contact.mapUrl ? (
              <a href={brand.contact.mapUrl} target="_blank" rel="noopener noreferrer" className="footer__link">
                Get directions
              </a>
            ) : (
              <span className="demo-tag">Location placeholder</span>
            )}
          </div>

          <div className="footer__col">
            <h3>Contact</h3>
            <ul>
              <li>
                {brand.contact.phoneHref ? <a href={brand.contact.phoneHref}>{brand.contact.phone}</a> : <span>{brand.contact.phone}</span>}
              </li>
              <li>
                {brand.contact.emailHref ? <a href={brand.contact.emailHref}>{brand.contact.email}</a> : <span>{brand.contact.email}</span>}
              </li>
            </ul>
            <h3 className="footer__social-h">Follow</h3>
            <ul className="footer__social">
              {brand.social.map((s) =>
                s.url ? (
                  <li key={s.label}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.label}
                    </a>
                  </li>
                ) : (
                  <li key={s.label}>
                    <span title="Placeholder — add the profile URL in src/config/brand.ts">{s.label}</span>
                  </li>
                ),
              )}
            </ul>
            {brand.social.every((s) => !s.url) && <span className="demo-tag">Social placeholders</span>}
          </div>
        </div>

        <div className="footer__bottom">
          <p>
            © {year} {brand.fullName}. Demo showcase — models and specifications are fictional.
          </p>
          <ul>
            <li>
              <button type="button" onClick={() => onOpenLegal('privacy')}>
                Privacy
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onOpenLegal('terms')}>
                Terms
              </button>
            </li>
            <li>
              <a
                href="#home"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('home');
                }}
              >
                Back to top ↑
              </a>
            </li>
          </ul>
        </div>
      </div>

      <p className="footer__giant" aria-hidden="true">
        {brand.name}
      </p>
    </footer>
  );
}
