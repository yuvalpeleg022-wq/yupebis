import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Logo } from './Logo';
import { navItems } from './navItems';
import { ButtonLink } from '../ui/Button';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const solid = scrolled || open;

  return (
    <header
      data-nav
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-500 ${
        solid
          ? 'border-b border-silver/10 bg-navy-950/85 backdrop-blur-xl'
          : 'border-b border-transparent bg-gradient-to-b from-navy-950/60 to-transparent [background-origin:border-box]'
      }`}
    >
      <nav aria-label="Primary" className="mx-auto flex h-18 max-w-[1600px] items-center justify-between px-5 md:h-20 md:px-10">
        <Logo />
        <ul className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `relative px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.24em] transition-colors duration-300 hover:text-cloud ${
                    isActive ? 'text-cloud after:absolute after:inset-x-4 after:-bottom-0.5 after:h-px after:bg-gold' : 'text-silver'
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block">
            <ButtonLink to="/booking" variant="primary" size="sm">
              Book a flight
            </ButtonLink>
          </span>
          <button
            ref={menuButton}
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-silver/20 text-cloud transition hover:border-silver/50 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>
      <div
        id="mobile-menu"
        hidden={!open}
        className="h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-silver/10 bg-navy-950 px-6 pb-10 pt-6 lg:hidden"
      >
        <ul className="flex flex-col">
          {navItems.map((item) => (
            <li key={item.to} className="border-b border-silver/10">
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `block py-5 font-display text-3xl font-semibold tracking-tight ${isActive ? 'text-cloud' : 'text-silver'}`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <ButtonLink to="/booking" variant="primary" className="mt-8 w-full justify-center">
          Book a flight
        </ButtonLink>
      </div>
    </header>
  );
}
