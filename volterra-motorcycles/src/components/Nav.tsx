import { useEffect, useRef, useState } from 'react';
import { brand, navItems } from '../config/brand';
import { useActiveSection } from '../hooks/useActiveSection';
import { scrollToSection } from '../lib/scroll';
import { Close, Menu } from './Icons';
import './Nav.css';

const sectionIds = navItems.map((n) => n.id);

export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const active = useActiveSection(sectionIds);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Mobile menu: lock scroll, close on Escape, keep focus inside
  useEffect(() => {
    if (!open) return;
    document.body.classList.add('no-scroll');
    const firstLink = panelRef.current?.querySelector<HTMLElement>('a, button');
    firstLink?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'Tab' && panelRef.current) {
        const items = [menuBtnRef.current, ...panelRef.current.querySelectorAll<HTMLElement>('a, button')].filter(
          Boolean,
        ) as HTMLElement[];
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('no-scroll');
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Close the mobile menu if the viewport grows to desktop
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    // let the body unlock before scrolling
    requestAnimationFrame(() => scrollToSection(id));
  };

  return (
    <header className={`nav ${scrolled ? 'nav--scrolled' : ''} ${open ? 'nav--open' : ''}`}>
      <div className="nav__inner container">
        <a href="#home" className="nav__brand" onClick={go('home')} aria-label={`${brand.fullName} — back to top`}>
          <span className="nav__mark" aria-hidden="true">V</span>
          <span className="nav__word">{brand.name}</span>
        </a>

        <nav className="nav__links" aria-label="Primary">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={go(item.id)}
              className={active === item.id ? 'is-active' : ''}
              aria-current={active === item.id ? 'true' : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <a href="#contact" className="btn btn-primary btn-sm nav__cta" onClick={go('contact')}>
          Book a Test Ride
        </a>

        <button
          ref={menuBtnRef}
          type="button"
          className="nav__toggle icon-btn"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <Close /> : <Menu />}
        </button>
      </div>

      <div
        id="mobile-menu"
        ref={panelRef}
        className="nav__panel"
        hidden={!open}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
      >
        <nav aria-label="Mobile">
          <ol>
            {navItems.map((item, i) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={go(item.id)}
                  aria-current={active === item.id ? 'true' : undefined}
                >
                  <span className="nav__num">0{i + 1}</span>
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <a href="#contact" className="btn btn-primary nav__panel-cta" onClick={go('contact')}>
          Book a Test Ride
        </a>
      </div>
    </header>
  );
}
