import { Link } from 'react-router-dom';
import { Logo } from '../navigation/Logo';
import { navItems } from '../navigation/navItems';

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-silver/10 bg-navy-950">
      <div className="mx-auto grid grid-cols-1 max-w-[1600px] gap-12 px-5 py-16 md:grid-cols-[1.4fr_1fr_1fr] md:px-10">
        <div>
          <Logo />
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-silver">
            Beyond the ordinary. AERONIX AIRWAYS is a fictional airline created as a digital portfolio project. No real
            flights, services or payments are offered.
          </p>
        </div>
        <nav aria-label="Footer">
          <p className="eyebrow mb-5">Explore</p>
          <ul className="space-y-3 text-sm">
            {navItems.map((n) => (
              <li key={n.to}>
                <Link to={n.to} className="text-silver transition hover:text-cloud">
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/booking" className="text-silver transition hover:text-cloud">
                Book a flight
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <p className="eyebrow mb-5">Portfolio notice</p>
          <p className="text-sm leading-relaxed text-silver">
            All aircraft specifications, routes, schedules and fares on this site are illustrative demonstration data.
          </p>
        </div>
      </div>
      <div className="hairline" />
      <p className="mx-auto max-w-[1600px] px-5 py-6 text-xs tracking-wide text-muted md:px-10">
        © {new Date().getFullYear()} AERONIX AIRWAYS — a fictional brand. Designed &amp; engineered as an interactive 3D showcase.
      </p>
    </footer>
  );
}
