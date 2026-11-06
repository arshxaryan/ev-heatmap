import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../theme.jsx';

const links = [
  { to: '/', label: 'Home' },
  { to: '/map', label: 'Heat Map' },
  { to: '/stats', label: 'Stats' },
  { to: '/insights', label: 'Insights' },
  { to: '/compare', label: 'Compare' },
  { to: '/methodology', label: 'Methodology' },
  { to: '/about', label: 'About' },
];

export default function NavBar({ lastUpdated }) {
  const { dark, toggle } = useTheme();
  const location = useLocation();
  return (
    <header className="sticky top-0 z-[1000] border-b border-slate-200/70 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
      <nav className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5" aria-label="Main">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-white">⚡</span>
          <span className="text-slate-900 dark:text-white">EV Gap <span className="text-brand-500">India</span></span>
        </Link>

        <ul className="ml-2 hidden flex-wrap gap-1 md:flex">
          {links.map((l) => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${isActive ? 'bg-brand-50 font-medium text-brand-700 dark:bg-slate-800 dark:text-brand-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`
                }
              >
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          {lastUpdated && (
            <span className="hidden text-xs text-slate-500 dark:text-slate-400 lg:inline">
              Last updated: {new Date(lastUpdated).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          )}
          <button
            onClick={toggle}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            {dark ? '☀️' : '🌙'}
          </button>
          {!location.pathname.startsWith('/map') && !location.pathname.startsWith('/stats') && (
            <Link to="/map" className="hidden rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 sm:block">
              Open Map
            </Link>
          )}
        </div>
      </nav>
      {/* mobile nav row */}
      <ul className="flex items-center gap-1 overflow-x-auto px-3 pb-2 md:hidden">
        {links.map((l) => (
          <li key={l.to} className="shrink-0">
            <NavLink
              to={l.to}
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-sm ${isActive ? 'bg-brand-50 font-medium text-brand-700 dark:bg-slate-800 dark:text-brand-300' : 'text-slate-600 dark:text-slate-300'}`
              }
            >
              {l.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </header>
  );
}
