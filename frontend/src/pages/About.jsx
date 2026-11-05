export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-black tracking-tight sm:text-3xl">About / Contact</h1>

      <section className="mt-4 space-y-3 leading-relaxed text-slate-700 dark:text-slate-300">
        <p>
          <strong className="text-slate-900 dark:text-white">EV Gap India</strong> is an open, interactive
          dashboard that juxtaposes electric-vehicle adoption (Vahan registrations, by state/district and
          vehicle category) against public EV charging availability, exposing the regions where charging
          infrastructure is lagging the fleet.
        </p>
        <p>
          It was built for four audiences: policymakers targeting infrastructure subsidies, charging operators
          scouting demand-rich clusters, students/researchers needing transparent data limits, and EV buyers
          checking charger coverage where they live and travel.
        </p>
      </section>

      <section className="mt-8" aria-label="Contact">
        <h2 className="text-lg font-bold dark:text-white">Contact</h2>
        <ul className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <li>📧 <a className="text-brand-500 hover:underline" href="mailto:hello@evgapindia.example">hello@evgapindia.example</a></li>
          <li>🐙 Source / issues: <a className="text-brand-500 hover:underline" href="https://github.com/your-org/ev-gap-india">github.com/your-org/ev-gap-india</a></li>
          <li>📊 Found a data error? Please include state, district, month and source — we reconcile against official exports.</li>
        </ul>
      </section>

      <section className="mt-8" aria-label="Disclaimers">
        <div role="note" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-200">
          <p className="font-semibold">Disclaimers</p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            <li>When live feeds are unavailable, this app shows labelled <strong>sample/simulated</strong> data — do not cite as official statistics.</li>
            <li>Vahan, Open Charge Map and OpenStreetMap are third-party sources under their own terms — see Methodology → Credits.</li>
            <li>This project is not affiliated with MoRTH / NIC.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
