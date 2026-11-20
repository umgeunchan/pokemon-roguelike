// 판 진행: 경험치·레벨·진화·돈, 새 판 시작, 이어하기 저장
// ---------- 진행: 경험치, 레벨, 진화, 돈 ----------
function gainExp(n) {
  const p = player;
  if (p.level >= MAX_LEVEL) { p.exp = 0; return; }
  p.exp += Math.round(n * p.expMul);
  while (p.level < MAX_LEVEL && p.exp >= expNeed(p.level)) { p.exp -= expNeed(p.level); levelUp(); }
  if (p.level >= MAX_LEVEL) p.exp = 0;
}

function levelUp() {
  const p = player;
  p.level++;
  withDelta(p => { p.dmg += 0.12; p.speed += 1; });  // 최대 체력은 레벨로 오르지 않는다 (도구·도핑약으로만)
  say(p.level >= MAX_LEVEL ? '최고 레벨 100 달성!' : `레벨 ${p.level}!`, p.x, p.y - 80, '#8ff'); sfx('level');
  if (p.evo[0] && p.level >= p.evo[0].level) evolve();
}

function evolve() {
  const p = player, next = p.evo.shift(), m = MON[next.id];
  if (!m) return;
  const a = baseOf(p.mon), b = baseOf(m), old = p.mon.name;
  withDelta(p => { p.dmg += b.dmg - a.dmg; p.speed += b.speed - a.speed; });
  p.mon = m; if (p.shiny) loadShiny(m);
  fx.push({ kind: 'evo', x: p.x, y: p.y, t: 1.2, max: 1.2 }); sfx('evolve');
  banner = { text: `축하합니다! ${old}는(은) ${m.name}(으)로 진화했다!`, t: 4 };
  ach('evolve');
}

function gainMoney(n, x, y) {
  const v = Math.round(n * player.moneyMul);
  player.money += v; sfx('coin');
  texts.push({ text: `+₽${v}`, x, y: y - 40, t: 0.9, color: '#fd6', size: 11 });
}

function newRun(m, shiny = false) {
  clearSave();
  taken = new Set(); texts = []; banner = null; dialog = null; fx = []; dayTime = 0;
  player = makePlayer(m); player.shiny = shiny; player.startId = m.id;
  // 전설의 포켓몬은 상징적인 기술을 갖고 시작한다
  // 전설이 아니면 타입에 맞는 기술머신 하나를 갖고 시작한다
  const first = LEGEND_MOVE[m.id] ?? typeMove(m);
  if (first) { taken.add(first); learnMove(first); }
  player.first = first ?? null;
  world = genWorld(Math.floor(Math.random() * 2 ** 31));
  map = world;
  [player.x, player.y] = world.start;
  player.rival = RIVALS[region.name] ? { starter: rivalStarter(), done: new Set(), legend: false } : null;
  resetCombat(); refreshFx(); renderBar();
  state = 'loading';
  Promise.all([loadEvo(m.id).catch(() => []), shiny && loadShiny(m)]).then(([evo]) => { player.evo = evo; state = 'play'; });
}

// ---------- 이어하기: 지도는 시드로 똑같이 다시 만들고, 그 위에 플레이어와 바뀐 것(주운 볼, 이긴 트레이너, 받은 선물...)만 덮어쓴다 ----------
const SAVE_KEY = 'pokemon-dungeon-save';
const clearSave = () => store.set(SAVE_KEY, { deleted: true, at: Date.now() });
// 지도나 상자 내용물 규칙이 바뀌면 SAVE_VER를 올린다. 버전이 다른 옛 기록은 이어하지 않는다 (같은 시드로도 다른 지도가 나와서 기록이 어긋난다)
const SAVE_VER = 4;
const loadSave = () => { const sv = store.get(SAVE_KEY); return sv?.v === SAVE_VER && REGIONS.some(r => r.name === sv.region) ? sv : null; };
const packContent = k => k.kind === 'tm' ? { kind: 'tm', tm: k.tm.id } : k.kind === 'item' ? { kind: 'item', item: k.item.id } : { kind: k.kind };
const unpackContent = k => k.kind === 'tm' ? { kind: 'tm', tm: moveDef(k.tm) } : k.kind === 'item' ? { kind: 'item', item: itemById(k.item) } : { kind: k.kind };

function saveRun() {
  const p = player;
  if (!p || !world || p.hp <= 0 || p.champion || !['play', 'pause', 'map', 'shop', 'learn'].includes(state)) return false;  // 챔피언이 된 판은 끝난 판이라 저장하지 않는다
  if ((map.battle && map === world) || map.sub === 'rival') return false;  // 승부 중에는 저장하지 않는다 (도망치기 꼼수 방지)
  const prim = Object.fromEntries(Object.entries(p).filter(([, v]) => v === null || ['number', 'boolean', 'string'].includes(typeof v)));
  const [x, y] = map === world ? [p.x, p.y] : world.returnTo;
  const sv = {
    v: SAVE_VER, region: region.name, seed: world.seed, dayTime, at: Date.now(), monName: p.mon.name,
    player: { ...prim, x, y, mon: p.mon.id, items: p.items.map(i => i.tm ? { m: i.id } : { i: i.id }), moves: [...p.moves], beaten: [...p.beaten], seen: [...p.seen],
      defeated: p.defeated, bought: p.bought, evo: p.evo, rival: p.rival && { ...p.rival, done: [...p.rival.done] } },
    taken: [...taken],
    pickups: world.pickups.filter(k => k.id).map(k => k.id),
    drops: world.pickups.filter(k => !k.id).map(k => ({ ...packContent(k), x: k.x, y: k.y, ball: !!k.ball })),
    npcs: world.npcs.filter(n => n.id >= 0).map(n => ({ id: n.id, defeated: !!n.defeated, gift: n.kind === 'gift' && !n.gift, sold: !!n.sold, healed: !!n.healed })),
    legends: world.legends.filter(l => l.done).map(l => l.i),
    legendHp: Object.fromEntries(world.legends.filter(l => !l.done).map(l => { const e = world.enemies.find(e => e.legend === l); return [l.i, e ? e.hp / e.maxHp : l.hpFrac ?? 1]; })),
    visited: world.nodes.filter(n => n.visited).map(n => n.i),
  };
  return store.set(SAVE_KEY, sv);
}

async function continueRun() {
  const sv = loadSave();
  if (!sv) return;
  state = 'loading'; region = REGIONS.find(r => r.name === sv.region); probeBgm(region);
  try {
    await loadRegion(region);
    const sp = sv.player;
    await Promise.all([sp.startId, sp.mon, ...sp.evo.map(e => e.id)].map(loadMon));
    // 처음 판을 시작할 때와 똑같은 상태에서 지도를 만들어야 볼·선물 내용물이 같아진다
    taken = new Set(); texts = []; banner = null; dialog = null; fx = []; dayTime = sv.dayTime ?? 0;
    player = makePlayer(MON[sp.startId]);
    if (sp.first) { taken.add(sp.first); learnMove(sp.first); }
    world = genWorld(sv.seed);
    const p = player, { mon, items, moves, beaten, seen, defeated, bought, evo, rival, ...prim } = sp;
    Object.assign(p, prim);
    p.mon = MON[mon]; p.items = items.map(o => o.m ? moveDef(o.m) : itemById(o.i)).filter(Boolean);
    p.moves = new Set(moves); p.beaten = new Set(beaten); p.seen = new Set(seen); p.defeated = defeated; p.bought = bought; p.evo = evo;
    p.rival = rival && { ...rival, done: new Set(rival.done) };
    p.deltas = Array(STATS.length).fill(null);
    taken = new Set(sv.taken);
    const left = new Set(sv.pickups), byId = new Map(sv.npcs.map(n => [n.id, n]));
    world.pickups = [...world.pickups.filter(k => left.has(k.id)), ...sv.drops.map(d => ({ ...unpackContent(d), x: d.x, y: d.y, ball: d.ball })).filter(k => k.kind === 'berry' || k.kind === 'candy' || k.tm || k.item)];
    for (const n of world.npcs) { const o = byId.get(n.id); if (!o) continue; if (o.defeated) n.defeated = true; if (o.gift) n.gift = null; if (o.sold) n.sold = true; if (o.healed) n.healed = true; }
    for (const i of sv.legends) world.legends[i].done = true;
    for (const [i, f] of Object.entries(sv.legendHp ?? {})) if (world.legends[i]) world.legends[i].hpFrac = f;
    for (const i of sv.visited) world.nodes[i].visited = true;
    map = world;
    resetCombat(); refreshFx(); renderBar();
    if (p.shiny) await loadShiny(p.mon);
    banner = { text: `${region.name}지방 모험을 이어서 한다`, t: 2.5 };
    state = 'play';
  } catch (e) { loadError = `이어하기 실패: ${e.message}`; state = 'error'; }
}

function autoSave() { if (saveRun()) { sfx('save'); say('기록했다', player.x, player.y - 100, '#8cf'); } }

const resetCombat = () => { tears = []; beams = []; bombs = []; hazards = []; puddles = []; pstrikes = []; fx = fx ?? []; curNode = null; timeStop = 0; legendFight = false; };
