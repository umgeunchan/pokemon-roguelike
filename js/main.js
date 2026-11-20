// 게임 루프, 자체 점검, 시작
function loop(t) {
  const dt = Math.min((t - (last ?? t)) / 1000, 0.05);
  last = t;
  if (state === 'play') update(dt);
  if (state === 'warp') updateWarp(dt);
  if (!dangerNow()) toasts.slice(0, 3).forEach(o => o.t += dt); toasts = toasts.filter(o => o.t < 5);
  draw(); tickMusic();
  requestAnimationFrame(loop);
}

function selfCheck() {
  for (const [name, s] of Object.entries(SONGS)) for (const sec of s.seq)
    console.assert(sec.steps.length === sec.len && sec.bars.flat().every(c => c.iv) && sec.steps.every(n => n === '-' || n === '.' || /^[A-G][#b]?\d$/.test(n)), `song ${name}: lead length matches chords`);
  for (const rg of REGIONS) console.assert(RIVALS[rg.name]?.[2].length === 4, `${rg.name}: rival data`);
  console.assert(eff('fire', ['grass']) === 2 && eff('electric', ['rock', 'ground']) === 0, 'type chart from PokeAPI');
  console.assert(new Set(ITEMS.map(i => i.id)).size === ITEMS.length && TMS.length >= 20 && LTMS.length >= 25, 'item ids unique, TM counts');
  for (const rg of REGIONS) {
    const { cells, links } = parseMap(rg), chars = cells.map(c => c.ch), pos = Object.fromEntries(cells.map(c => [c.ch, c])), extras = Object.values(rg.places).map(p => p[2]);
    console.assert(chars.length === new Set(chars).size && chars.every(ch => rg.places[ch]) && Object.keys(rg.places).every(ch => chars.includes(ch)), `${rg.name}: map cells match places`);
    console.assert(links.every(([a, b]) => pos[a] && pos[b] && Math.abs(pos[a].x - pos[b].x) + Math.abs(pos[a].y - pos[b].y) === 1), `${rg.name}: every road joins two neighbours`);
    console.assert(extras.filter(v => typeof v === 'number').sort().join() === '0,1,2,3,4,5,6,7', `${rg.name}: 8 gyms placed once`);
    console.assert(extras.filter(v => v === 'start').length === 1 && extras.filter(v => v === 'league').length === 1 && Object.values(rg.places).every(p => KINDS[p[1]]), `${rg.name}: one start, one league`);
    const adj = {}; links.forEach(([a, b]) => { (adj[a] ??= []).push(b); (adj[b] ??= []).push(a); });
    const seen = new Set([chars[0]]), q = [chars[0]];
    while (q.length) for (const n of adj[q.shift()] ?? []) if (!seen.has(n)) { seen.add(n); q.push(n); }
    console.assert(seen.size === chars.length, `${rg.name}: every place reachable`);
    console.assert(rg.gyms.every(g => TYPE_KO[g.type] && g.team.length >= 2) && rg.league.length === 5, `${rg.name}: gym and league data`);
    const legendIds = [...extras.flatMap(v => Array.isArray(v) ? v : []), ...rg.roam];
    console.assert(legendIds.length > 0 && legendIds.every(id => moveDef(LEGEND_MOVE[id])?.legend), `${rg.name}: every legend has a signature move`);
  }
}

state = 'loading';
loadCommon().then(() => { selfCheck(); state = 'title'; loadTitleMons(); initAccount(); }).catch(e => { loadError = `로딩 실패: ${e.message}`; state = 'error'; });
requestAnimationFrame(loop);
