const base = 'http://localhost:4000/api';
(async () => {
  const j = async (p) => (await fetch(base + p)).json();
  console.log('health:', await j('/health'));
  console.log('stats:', await j('/stats'));
  const gap = await j('/gap?dimension=state');
  console.log('gap rows:', gap.rows.length);
  for (const r of gap.rows.slice(0, 8)) console.log(`  ${r.state}: ev=${r.evs} ch=${r.chargers} idx=${r.gapIndex}`);
  const dl = await j('/gap?dimension=district&state=UP');
  console.log('UP districts:', dl.rows.length, 'worst:', dl.rows[0]?.district, 'idx', dl.rows[0]?.gapIndex);
  const reg = await j('/registrations?state=DL&from=2025-01&to=2026-10');
  console.log('DL series pts:', reg.series.length, 'last:', reg.series[reg.series.length - 1]);
  const ch = await j('/chargers?state=MH&kind=DC&limit=5');
  console.log('MH DC chargers sample:', ch.count, ch.items[0]?.name);
  const trend = await j('/trend?state=KA');
  console.log('KA trend pts:', trend.series.length);
})();
