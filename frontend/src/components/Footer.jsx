export default function Footer() {
  return (
    <footer className="border-t border-slate-200 py-6 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-2 px-4 sm:flex-row sm:items-center sm:justify-between">
        <p>
          EV Gap India — registration data (Vahan, Parivahan) is best-effort; charging stations (Open Charge Map). See
          {' '}
          <a href="/methodology" className="text-brand-500 hover:underline">Methodology</a> for data limits.
        </p>
        <p className="text-xs">Demo dataset where official feeds are unavailable · © {new Date().getFullYear()} EV Gap India</p>
      </div>
    </footer>
  );
}
