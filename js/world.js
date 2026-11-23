// 지방 지도 생성: 장소, 길, 마을, 트레이너, 상자, 전설 배치
// ---------- 지도 ----------
function parseMap(rg) {
  const cells = [], links = [];
  rg.map.forEach((line, y) => {
    for (let x = 0; x < line.length; x++) {
      const ch = line[x];
      if (y % 2 === 0 && x % 2 === 0 && ch !== ' ') cells.push({ ch, x: x / 2, y: y / 2 });
      if (y % 2 === 0 && x % 2 === 1 && ch === '-') links.push([line[x - 1], line[x + 1]]);
      if (y % 2 === 1 && x % 2 === 0 && ch === '|') links.push([rg.map[y - 1]?.[x], rg.map[y + 1]?.[x]]);
    }
  });
  return { cells, links };
}

function makeNoise(rnd) {
  const S = 64, g = Array.from({ length: S * S }, rnd), at = (x, y) => g[((y % S + S) % S) * S + ((x % S + S) % S)];
  return (x, y) => {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

// 바닥에 놓인 볼의 종류로 내용물의 희귀도를 알린다: 흔한 도구·나무열매 < 희귀한 도구 < 기술머신·아주 희귀한 도구·중요한 물건 < 특별한 기술머신
const BALLS = ['poke-ball', 'great-ball', 'ultra-ball', 'master-ball'];
const ballGrade = k => k.kind === 'tm' ? (k.tm.legend ? 3 : 2) : k.kind === 'item' ? itemGrade(k.item) : 0;
// 테라피스는 내 타입일 때만, 전설 전용 도구는 그 전설로 플레이할 때만 마스터볼 급. 아니면 하이퍼볼 급
function itemGrade(it) {
  const p = player, tera = it.id.endsWith('-tera-shard') ? it.id.slice(0, -11) : null, fs = formsOf(it.id);
  if (tera) return myTypes().includes(tera) ? 3 : 2;
  if (fs.length && fs.some(f => f.mon === p?.mon.id)) return 3;
  if (fs.length && it.r !== 'g') return 2;  // 다이맥스밴드처럼 원래 마스터볼 급인 기믹 도구는 그대로
  return { c: 0, r: 1, l: 2, k: 2, g: 3, e: 3 }[it.r] ?? 0;
}
// 상자 내용물. tm = 일반 기술머신 확률, 나머지(c·r·l)는 아이템 등급 비율
// 전설의 기술머신(ltm)은 여기서 나오지 않는다: 전설의 포켓몬을 쓰러뜨리면 그 상징 기술머신이 떨어질 때만 얻는다 (ltm 값은 무시)
// 흔한 도구(c: 능력치가 조금씩 오르는 도구)는 같은 것이 몇 번이고 나올 수 있다. 희귀 이상은 한 판에 한 번
function rollContent(rnd, { tm = 0, c = 0.6, r = 0.35, l = 0.05, g = 0.03 }) {
  const fromPool = list => { const pool = list.filter(t => !taken.has(t.id) && !player?.moves.has(t.id)); if (!pool.length) return null; const t = pool[Math.floor(rnd() * pool.length)]; taken.add(t.id); return { kind: 'tm', tm: t }; };
  const roll = rnd();
  // 기믹 아이템(메가스톤·Z크리스탈·다이맥스밴드·테라피스): 드물게
  if (g && (roll * 9973) % 1 < g) { const gi = rollGimmick(rnd); if (gi) return gi; }
  if (roll < tm) { const t = fromPool(TMS); if (t) return t; }
  const r2 = rnd() * (c + r + l), tier = r2 < c ? 'c' : r2 < c + r ? 'r' : 'l';
  if (tier === 'c') { const cs = ITEMS.filter(i => i.r === 'c'); return { kind: 'item', item: cs[Math.floor(rnd() * cs.length)] }; }
  let pool = ITEMS.filter(i => i.r === tier && !taken.has(i.id));
  if (!pool.length) pool = ITEMS.filter(i => i.r !== 'k' && i.r !== 'g' && i.r !== 'e' && !taken.has(i.id));
  if (!pool.length) return { kind: 'berry' };
  const it = pool[Math.floor(rnd() * pool.length)];
  taken.add(it.id);
  return { kind: 'item', item: it };
}

// 원작 지도처럼: 장소마다 자유롭게 돌아다닐 수 있는 구역이 있고, 구역 사이는 곧게 뻗은 길로만 이어진다. 나머지는 숲·바위·바다로 막혀 있다
function genWorld(seed) {
  const rnd = mulberry32(seed), noise = makeNoise(rnd), { cells, links } = parseMap(region);
  const cols = Math.max(...cells.map(c => c.x)) + 1, rows = Math.max(...cells.map(c => c.y)) + 1;
  const tw = (cols - 1) * CELL + MARGIN * 2 + 1, th = (rows - 1) * CELL + MARGIN * 2 + 1, N = tw * th;
  const nodes = cells.map((c, i) => {
    const [name, kind, extra] = region.places[c.ch];
    return { i, ch: c.ch, gx: c.x, gy: c.y, name, kind, tx: MARGIN + c.x * CELL, ty: MARGIN + c.y * CELL, start: extra === 'start', league: extra === 'league',
      gym: typeof extra === 'number' ? region.gyms[extra] : null, legends: Array.isArray(extra) ? extra : [], links: [] };
  });
  const byCh = Object.fromEntries(nodes.map(n => [n.ch, n]));
  for (const [a, b] of links) { byCh[a].links.push(byCh[b]); byCh[b].links.push(byCh[a]); }
  const start = nodes.find(n => n.start), dist = new Map([[start, 0]]), q = [start];
  for (let i = 0; i < q.length; i++) for (const n of q[i].links) if (!dist.has(n)) { dist.set(n, dist.get(q[i]) + 1); q.push(n); }
  const maxD = Math.max(...dist.values()) || 1;
  for (const n of nodes) {
    n.tier = Math.round(dist.get(n) / maxD * 7);
    // 마을은 건물·NPC만 들어가는 작은 광장, 도로는 넉넉하게 넓은 전투 구역. 일직선으로 지나가는 길은 진행 방향으로 길쭉하다
    const h = n.links.some(l => l.gy === n.gy), v = n.links.some(l => l.gx === n.gx);
    // 2026-11-23: 도로를 길게 (일직선 도로 15→22칸, 갈림길 13→16칸) — 야생·트레이너를 더 자주 만난다
    [n.hx, n.hy] = n.kind === 'T' || n.gym || n.league ? [8, 6] : h && !v ? [22, 8] : v && !h ? [8, 22] : [16, 16];
  }

  const area = new Int16Array(N), zone = new Uint8Array(N), solid = new Uint8Array(N).fill(1), road = new Uint8Array(N), deco = new Uint8Array(N);
  // 바깥(막힌 곳)의 모습은 가장 가까운 장소를 따른다
  for (let ty = 0; ty < th; ty++) for (let tx = 0; tx < tw; tx++) {
    let best = Infinity, bn = 0;
    for (const n of nodes) { const d = Math.abs(tx - n.tx) + Math.abs(ty - n.ty); if (d < best) { best = d; bn = n.i; } }
    area[ty * tw + tx] = bn;
  }
  for (const n of nodes) for (let ty = n.ty - n.hy - 2; ty <= n.ty + n.hy + 2; ty++) for (let tx = n.tx - n.hx - 2; tx <= n.tx + n.hx + 2; tx++) {
    if (tx < 3 || ty < 3 || tx >= tw - 3 || ty >= th - 3) continue;
    const wob = n.kind === 'T' || n.gym || n.league ? 0 : (noise(tx / 4, ty / 4) - 0.5) * 0.35;
    if (Math.max(Math.abs(tx - n.tx) / n.hx, Math.abs(ty - n.ty) / n.hy) + wob < 1) { const k = ty * tw + tx; zone[k] = 1; solid[k] = 0; area[k] = n.i; }
  }
  // 구역 사이를 잇는 폭 7칸 길, 가운데 3칸은 흙길
  for (const [a, b] of links) {
    const A = byCh[a], B = byCh[b], steps = Math.ceil(Math.hypot(B.tx - A.tx, B.ty - A.ty));
    for (let s = 0; s <= steps; s++) {
      const x = Math.round(A.tx + (B.tx - A.tx) * s / steps), y = Math.round(A.ty + (B.ty - A.ty) * s / steps);
      for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) {
        const k = (y + oy) * tw + x + ox;
        if (!zone[k]) zone[k] = 2;
        solid[k] = 0;
        if (Math.abs(ox) <= 1 && Math.abs(oy) <= 1) road[k] = 1;
      }
    }
  }
  // 구역 안 장애물. 흙길 바로 옆은 비워서 길이 잘 보이게 한다
  for (let ty = 1; ty < th - 1; ty++) for (let tx = 1; tx < tw - 1; tx++) {
    const k = ty * tw + tx, n = nodes[area[k]];
    if (zone[k] !== 1 || road[k]) continue;
    if (n.kind === 'T' || n.gym || n.league) { if (rnd() < 0.03) deco[k] = 2; continue; }
    if (road[k - 1] || road[k + 1] || road[k - tw] || road[k + tw] || Math.hypot(tx - n.tx, ty - n.ty) < 3) continue;
    const v = noise(tx / 5, ty / 5) * 0.75 + rnd() * 0.25;
    if (v > 1 - KINDS[n.kind].dens * 1.4) solid[k] = 1;
    else if (rnd() < 0.08) deco[k] = 1 + Math.floor(rnd() * 3);
  }
  // 원작 도로의 디테일: 풀숲(야생 포켓몬은 여기서 나온다), 턱(8: 아래로만 뛰어내림), 작은 연못(9)
  const grass = new Uint8Array(N);
  for (const n of nodes) {
    if (n.kind !== 'R' && n.kind !== 'F') continue;
    for (let ty = n.ty - n.hy; ty <= n.ty + n.hy; ty++) for (let tx = n.tx - n.hx; tx <= n.tx + n.hx; tx++) {
      const k = ty * tw + tx;
      if (zone[k] === 1 && area[k] === n.i && !solid[k] && !road[k] && noise(tx / 3.5 + 40, ty / 3.5 + 40) > 0.52) { grass[k] = 1; deco[k] = 0; }
    }
    // 턱은 길이 지나는 곳에 틈을 두고, 양 끝도 비워서 돌아 올라올 수 있게 한다
    if (n.kind === 'R') for (const ly of n.hy >= 10 ? [n.ty - 4, n.ty + 4] : [n.ty + 3]) for (let tx = n.tx - n.hx + 2; tx <= n.tx + n.hx - 2; tx++) {
      const k = ly * tw + tx;
      if (zone[k] !== 1 || solid[k] || area[k] !== n.i || [-2, -1, 0, 1, 2].some(o => road[k + o])) continue;
      solid[k] = 8; grass[k] = 0; deco[k] = 0;
    }
    if (rnd() < 0.5) {
      const px = n.tx + Math.round((rnd() * 2 - 1) * (n.hx - 4)), py = n.ty + Math.round((rnd() * 2 - 1) * (n.hy - 4)), pr = 1.5 + rnd();
      if (Math.hypot(px - n.tx, py - n.ty) > 4) for (let ty = py - 3; ty <= py + 3; ty++) for (let tx = px - 3; tx <= px + 3; tx++) {
        const k = ty * tw + tx;
        if (Math.hypot(tx - px, ty - py) < pr && zone[k] === 1 && !solid[k] && !road[k] && ![-1, 1, -tw, tw].some(o => road[k + o])) { solid[k] = 9; grass[k] = 0; deco[k] = 0; }
      }
    }
  }

  const w = { kind: 'world', seed, tw, th, nodes, area, zone, solid, road, deco, grass, buildings: [], npcs: [], pickups: [], enemies: [], signs: [], battle: null };
  // 건물: 체육관, 포켓몬리그만. 문으로 들어갈 수 있다
  const building = (n, kind, ox, oy, bw, bh, extra = {}) => {
    const x = n.tx + ox, y = n.ty + oy;
    for (let yy = y; yy < y + bh; yy++) for (let xx = x; xx < x + bw; xx++) { solid[yy * tw + xx] = 3; road[yy * tw + xx] = 0; deco[yy * tw + xx] = 0; }
    const dx = x + Math.floor(bw / 2);
    for (let yy = y + bh; yy < y + bh + 3; yy++) for (let xx = dx - 1; xx <= dx + 1; xx++) { solid[yy * tw + xx] = 0; road[yy * tw + xx] = 1; zone[yy * tw + xx] ||= 1; }
    const b = { id: w.buildings.length, kind, x, y, w: bw, h: bh, node: n, doorX: (dx + 0.5) * TS, doorY: (y + bh) * TS, ...extra };
    w.buildings.push(b);
    return b;
  };
  let npcId = 0;
  const towns = nodes.filter(n => n.kind === 'T').sort((a, b) => a.tier - b.tier || (b.start ? 1 : 0) - (a.start ? 1 : 0));
  for (const n of nodes) {
    if (n.gym) building(n, 'gym', -7, 0, 7, 4, { type: n.gym.type });
    if (n.league) building(n, 'league', 0, 0, 8, 4, { type: 'dragon' });
    if (n.kind !== 'T') continue;
    // 회복과 상점은 건물 없이 마을 한가운데 NPC에게 말을 건다 (연못은 중심 4칸 밖에만 생겨서 이 자리는 비어 있다)
    w.npcs.push({ id: npcId++, kind: 'nurse', sprite: 'nurse', name: '간호순', x: (n.tx - 2.5) * TS, y: (n.ty - 1.5) * TS });
    w.npcs.push({ id: npcId++, kind: 'shop', sprite: 'clerk', name: '점원', x: (n.tx + 3.5) * TS, y: (n.ty - 1.5) * TS, special: rollContent(rnd, { tm: 0.35, c: 0, r: 0.7, l: 0.3, g: 0.3 }) });
    // 첫 마을은 기술머신을, 다음 마을들은 중요한 물건(자전거 등)을, 나머지는 가끔 희귀한 도구를 준다
    const idx = towns.indexOf(n), key = idx > 0 ? KEY_ITEMS[idx - 1] : null;
    if (idx === 0 || key || rnd() < 0.5) {
      const [sprite, name] = FRIENDLY[Math.floor(rnd() * FRIENDLY.length)];
      const gift = idx === 0 ? rollContent(rnd, { tm: 1 }) : key ? (taken.add(key), { kind: 'item', item: itemById(key) }) : rollContent(rnd, { tm: 0.3, c: 0.3, r: 0.6, l: 0.1 });
      w.npcs.push({ id: npcId++, kind: 'gift', sprite, name, x: (n.tx + 6.5) * TS, y: (n.ty - 3.5) * TS, gift });
    }
  }
  // 마을 가장자리 울타리(10). 길과 이어진 입구는 열어 둔다
  for (let k = tw; k < N - tw; k++) {
    if (zone[k] !== 1 || solid[k] || road[k]) continue;
    const n = nodes[area[k]];
    if ((n.kind === 'T' || n.gym || n.league) && [-1, 1, -tw, tw].some(o => zone[k + o] === 0)) solid[k] = 10;
  }
  // 동굴 입구: 동굴 구역으로 들어가는 길목
  w.mouths = [];
  for (const [a, b] of links) for (const [n, o] of [[byCh[a], byCh[b]], [byCh[b], byCh[a]]]) if (n.kind === 'C') {
    const dx = Math.sign(o.gx - n.gx), dy = Math.sign(o.gy - n.gy);
    w.mouths.push({ x: n.tx + dx * (n.hx + 1), y: n.ty + dy * (n.hy + 1), vertical: !!dy });
  }
  // 구역 출구마다 갈 곳을 알려주는 표지판
  for (const n of nodes) for (const l of n.links) {
    const dx = Math.sign(l.gx - n.gx), dy = Math.sign(l.gy - n.gy);
    const sx = n.tx + dx * (n.hx - 2) + (dy ? 3 : 0), sy = n.ty + dy * (n.hy - 2) + (dx ? -3 : 0);
    if (solid[sy * tw + sx]) continue;
    w.signs.push({ x: (sx + 0.5) * TS, y: (sy + 0.5) * TS, text: `${dx > 0 ? '→' : dx < 0 ? '←' : dy < 0 ? '↑' : '↓'} ${l.name}` });
  }
  // 시작점에서 걸어갈 수 있는 칸
  const reach = new Uint8Array(N);
  const flood = () => {
    reach.fill(0);
    const rq = [start.ty * tw + start.tx];
    reach[rq[0]] = 1;
    for (let i = 0; i < rq.length; i++) {
      const k = rq[i], x = k % tw, y = (k - x) / tw;
      for (const [dx, dy] of DIRS) { const nk = (y + dy) * tw + x + dx; if (!reach[nk] && !solid[nk]) { reach[nk] = 1; rq.push(nk); } }
    }
  };
  flood();
  // 턱 아래로 뛰어내렸는데 다시 못 올라오는 곳이 생기면 그 턱은 평지로 되돌린다
  let fixed = false;
  for (let k = tw; k < N - tw; k++) if (solid[k] === 8 && !solid[k + tw] && !reach[k + tw]) { solid[k] = 0; fixed = true; }
  if (fixed) flood();
  w.reach = reach;
  const spotNear = (n, avoidRoad) => {
    for (let t = 0; t < 300; t++) {
      const x = Math.round(n.tx + (rnd() * 2 - 1) * n.hx), y = Math.round(n.ty + (rnd() * 2 - 1) * n.hy), k = y * tw + x;
      if (reach[k] && !solid[k] && zone[k] === 1 && (!avoidRoad || !road[k]) && area[k] === n.i) return [(x + 0.5) * TS, (y + 0.5) * TS];
    }
    return [(n.tx + 0.5) * TS, (n.ty + 0.5) * TS];
  };
  let pk = 0;
  for (const n of nodes) {
    if (n.kind === 'T' || n.gym || n.league) continue;
    for (let i = 0, c = 3 + Math.floor(rnd() * 3); i < c; i++) {
      const [x, y] = spotNear(n, true);
      w.pickups.push({ id: `pk${pk++}`, x, y, ball: true, ...rollContent(rnd, n.kind === 'S' ? { tm: 0.2, c: 0.45, r: 0.35, l: 0.2 } : { tm: 0.2, c: 0.68, r: 0.3, l: 0.02 }) });
    }
    const pool = TRAINERS[n.kind] ?? TRAINERS.R;
    for (let i = 0, c = (n.kind === 'R' ? 4 : 3) + Math.floor(rnd() * 2); i < c; i++) {
      const [sprite, name] = pool[Math.floor(rnd() * pool.length)], [x, y] = spotNear(n, false);
      w.npcs.push({ id: npcId++, kind: 'trainer', sprite, name, x, y, hx: x, hy: y, r: 14, dir: [0, 0], turn: rnd() * 2, node: n });
    }
  }
  // 전설의 포켓몬: 한 판에 한 마리(챔피언이 된 지방은 두 마리)가 지방 명소(떠돌이 전설은 아무 길)에 반드시 나온다
  const cands = nodes.flatMap(n => n.legends.map(id => ({ id, n })));
  const wild = nodes.filter(n => n.kind !== 'T' && !n.gym && !n.league);
  region.roam.forEach(id => cands.push({ id, n: wild[Math.floor(rnd() * wild.length)] }));
  for (let i = cands.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [cands[i], cands[j]] = [cands[j], cands[i]]; }
  // 이미 챔피언이 된 지방이면 서로 다른 전설 두 마리
  const picked = [];
  for (const c of cands) if (picked.length < (CLEARED.has(region.name) ? 2 : 1) && !picked.some(o => o.id === c.id || o.n === c.n)) picked.push(c);  // 같은 장소에 둘이 몰리지 않게
  w.legends = picked.map((c, i) => { const [x, y] = c.n.legends.includes(c.id) ? [(c.n.tx + 0.5 + (i % 2) * 2) * TS, (c.n.ty + 0.5) * TS] : spotNear(c.n, true); return { i, id: c.id, n: c.n, x, y, done: false, alive: false }; });
  w.start = [(start.tx + 0.5) * TS, (start.ty + 3.5) * TS];
  return w;
}

// 건물 안: 아래에서 위로 방이 이어진다. 체육관은 트레이너 방 2~3개 + 관장 방, 리그는 사천왕 방 4개 + 훨씬 큰 챔피언 방
// 방에 들어서면 문이 닫히고, 이기면 위쪽 문(가운데 3칸)이 열린다. 맨 아래 방의 아래 문이 출구
function makeIndoor(b) {
  const league = b.kind === 'league', g = b.node.gym, last = region.league.length - 1;
  const specs = league ? region.league.map((who, i) => ({ w: i === last ? 31 : 21, h: i === last ? 19 : 13, who, type: who.type }))
    : [...Array(rollRange(GYM_ROOMS[player.beaten.size < EARLY_GYMS ? 'early' : 'late'])).fill({ w: 21, h: 13, type: b.type }), { w: 23, h: 15, who: g, type: b.type }];
  const tw = Math.max(...specs.map(s => s.w)), th = specs.reduce((a, s) => a + s.h - 1, 1), cx = Math.floor(tw / 2);
  const solid = new Uint8Array(tw * th).fill(4), voids = new Uint8Array(tw * th).fill(1), set = (x, y, v) => solid[y * tw + x] = v;
  const m = { kind: 'indoor', sub: b.kind, building: b, tw, th, solid, voids, rooms: [], npcs: [], pickups: [], enemies: [], buildings: [], signs: [], battle: null, type: b.type, furn: [], leader: g };
  const furn = (kind, x, y) => { m.furn.push({ kind, x, y, w: 1, h: 1 }); set(x, y, 7); };
  const door = y => [cx - 1, cx, cx + 1].map(x => y * tw + x);
  let y1 = th - 1;
  specs.forEach((s, i) => {
    const y0 = y1 - (s.h - 1), x0 = cx - (s.w - 1) / 2;
    for (let y = y0; y <= y1; y++) for (let x = x0; x < x0 + s.w; x++) { voids[y * tw + x] = 0; if (x > x0 && x < x0 + s.w - 1 && y > y0 && y < y1) set(x, y, 0); }
    // 기둥(지진 엄폐물): 좌우 대칭으로, 서로 붙지 않게 흩어 놓아서 길이 막히지 않는다. 가운데 통로와 위아래 두 줄은 비운다
    const pil = [], want = 2 * (s.who ? 3 : 3 + Math.floor(Math.random() * 3));
    for (let t = 0; t < 300 && pil.length < want; t++) {
      const x = x0 + 2 + Math.floor(Math.random() * (s.w - 4)), y = y0 + 3 + Math.floor(Math.random() * (s.h - 6)), mx = 2 * cx - x;
      if (Math.abs(x - cx) <= 1 || [x, mx].some(a => pil.some(([p, q]) => Math.abs(p - a) <= 1 && Math.abs(q - y) <= 1))) continue;
      pil.push([x, y], [mx, y]);
    }
    pil.forEach(([x, y]) => set(x, y, 1));
    const r = { i, y0, y1, x0, x1: x0 + s.w - 1, cx: (cx + 0.5) * TS, type: s.type, who: s.who, down: door(y1), up: i < specs.length - 1 ? door(y0) : [], cleared: false, started: false };
    if (!s.who) { const [sprite, name] = pick(Object.values(TRAINERS).flat()); r.npc = { kind: 'gymtrainer', sprite, name, x: r.cx, y: (y0 + 1.8) * TS }; m.npcs.push(r.npc); }
    m.rooms.push(r);
    y1 = y0;
  });
  m.rooms[0].down.forEach(k => solid[k] = 0);
  furn('statue', cx - 2, th - 2); furn('statue', cx + 2, th - 2);
  // 이미 이긴 체육관은 문이 모두 열려 있다
  if (!league && player.beaten.has(region.gyms.indexOf(g))) {
    for (const r of m.rooms) { r.cleared = r.started = true; r.up.forEach(k => solid[k] = 0); if (r.npc) r.npc.defeated = true; }
    m.portal = gymPortal(m.rooms.at(-1));
    m.roadPortal = roadPortal(m.rooms.at(-1));
  }
  return m;
}
// 배지 8개를 다 모으면 관장 방에 챔피언로드(없는 지방은 포켓몬리그 마을)로 바로 가는 고리가 생긴다
const roadNode = () => world.nodes.find(n => n.name.includes('챔피언로드')) ?? world.nodes.find(n => n.league);
const roadPortal = r => player.beaten.size >= region.gyms.length ? { x: r.cx, y: (r.y1 - 6.5) * TS, label: `${roadNode().name}(으)로`, road: true } : null;
// 장소 한가운데에서 가장 가까운, 걸어갈 수 있는 빈칸
// 체육관 안에서 부르므로 벽 검사는 반드시 바깥 지도(world)로 한다 (map이 체육관이면 체육관 벽으로 검사해서 바깥 벽에 끼였다)
function openSpot(n) {
  const prev = map, r = Math.max(player?.r ?? 16, 16) + 6;
  map = world;
  try {
    for (let rad = 0; rad < 24; rad++) for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue;
      const tx = n.tx + dx, ty = n.ty + dy, k = ty * world.tw + tx;
      if (tx < 0 || ty < 0 || tx >= world.tw || ty >= world.th) continue;
      if (world.reach[k] && !world.solid[k] && !circleHitsSolid((tx + 0.5) * TS, (ty + 0.5) * TS, r)) return [(tx + 0.5) * TS, (ty + 0.5) * TS];
    }
    return [(n.tx + 0.5) * TS, (n.ty + 0.5) * TS];
  } finally { map = prev; }
}
// 관장 방 한가운데 아래쪽: 밟으면 체육관 밖 문 앞으로 나간다
const gymPortal = r => ({ x: r.cx, y: (r.y1 - 3.5) * TS });
const roomAt = ty => map.rooms?.find(r => ty >= r.y0 && ty <= r.y1);
const setDoors = (ks, open) => ks.forEach(k => map.solid[k] = open ? 0 : 4);

// 칸 종류: 1 장애물, 3 건물, 4 벽, 7 가구, 8 턱, 9 연못, 10 울타리
const flyBlock = v => v >= 3 && v <= 7;
const solidAt = (tx, ty, flying = false, down = false) => {
  if (tx < 0 || ty < 0 || tx >= map.tw || ty >= map.th) return true;
  const v = map.solid[ty * map.tw + tx];
  if (v === 8) return !flying && !down;   // 턱은 아래로 내려갈 때만 지나간다
  if (v === 9 || v === 10) return !flying;
  return flying ? flyBlock(v) : v > 0;
};
// 탄·광선·시야: 턱, 연못, 울타리 위로는 지나간다. ghost면 장애물도 통과
const shotBlocked = (tx, ty, ghost = false) => {
  if (tx < 0 || ty < 0 || tx >= map.tw || ty >= map.th) return true;
  const v = map.solid[ty * map.tw + tx];
  return v >= 8 ? false : ghost ? flyBlock(v) : v > 0;
};
const nodeAt = (x, y) => world.nodes[world.area[clamp(Math.floor(y / TS), 0, world.th - 1) * world.tw + clamp(Math.floor(x / TS), 0, world.tw - 1)]];

function circleHitsSolid(x, y, r, flying = false, down = false) {
  for (let ty = Math.floor((y - r) / TS); ty <= Math.floor((y + r) / TS); ty++)
    for (let tx = Math.floor((x - r) / TS); tx <= Math.floor((x + r) / TS); tx++) {
      if (!solidAt(tx, ty, flying, down)) continue;
      const nx = clamp(x, tx * TS, tx * TS + TS), ny = clamp(y, ty * TS, ty * TS + TS);
      if (Math.hypot(x - nx, y - ny) < r) return true;
    }
  return false;
}

// 두 점 사이에 장애물이 있으면 true. 지진 충격파를 바위 뒤에서 피하는 데 쓴다
function losBlocked(x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  for (let s = 16; s < d - 8; s += 12) if (shotBlocked(Math.floor((x0 + (x1 - x0) * s / d) / TS), Math.floor((y0 + (y1 - y0) * s / d) / TS))) return true;
  return false;
}

// 축별로 움직이고 막히면 그 축만 되돌려서 장애물을 따라 미끄러지게 한다
function moveBody(a, dx, dy) {
  const onLedge = a === player && circleHitsSolid(a.x, a.y, a.r, a.flying) && !circleHitsSolid(a.x, a.y, a.r, a.flying, true);
  a.x += dx; if (circleHitsSolid(a.x, a.y, a.r, a.flying, onLedge)) a.x -= dx;
  a.y += dy; if (circleHitsSolid(a.x, a.y, a.r, a.flying, onLedge || (a === player && dy > 0))) a.y -= dy;
}
const clampBody = a => { a.x = clamp(a.x, a.r, map.tw * TS - a.r); a.y = clamp(a.y, a.r, map.th * TS - a.r); };
// 체육관·리그 방 안 승부: 적은 지금 방의 벽 안쪽에만 있을 수 있다 (벽 너머 다음 방으로 끼어 들어가 진행이 막히는 것 방지)
function keepInRoom(e) {
  const r = map.kind === 'indoor' && map.room;
  if (!r || r.x0 === undefined) return;
  const rr = Math.min(e.r, TS * 1.5);
  e.x = clamp(e.x, (r.x0 + 1) * TS + rr, r.x1 * TS - rr); e.y = clamp(e.y, (r.y0 + 1) * TS + rr, r.y1 * TS - rr);
  if (!circleHitsSolid(e.x, e.y, e.r, e.flying)) return;
  // 기둥에 겹쳤으면 방 안에서만 가장 가까운 빈자리를 찾는다
  let best = null, bd = Infinity;
  for (let ty = r.y0 + 1; ty < r.y1; ty++) for (let tx = r.x0 + 1; tx < r.x1; tx++) {
    const x = clamp((tx + 0.5) * TS, (r.x0 + 1) * TS + rr, r.x1 * TS - rr), y = clamp((ty + 0.5) * TS, (r.y0 + 1) * TS + rr, r.y1 * TS - rr), d = Math.hypot(x - e.x, y - e.y);
    if (d < bd && !circleHitsSolid(x, y, Math.min(e.r, TS), e.flying)) { bd = d; best = [x, y]; }
  }
  if (best) [e.x, e.y] = best;
}

function unstick(a) {
  if (!circleHitsSolid(a.x, a.y, a.r, a.flying)) return;
  const cx = Math.floor(a.x / TS), cy = Math.floor(a.y / TS);
  for (let rad = 1; rad < 8; rad++) for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
    const x = (cx + dx + 0.5) * TS, y = (cy + dy + 0.5) * TS;
    if (!circleHitsSolid(x, y, a.r, a.flying)) { a.x = x; a.y = y; return; }
  }
}

function wildPool(n) {
  const base = [...new Set(region.gyms.slice(0, Math.min(8, n.tier + 2)).flatMap(g => g.mobs))];
  const fit = base.filter(id => MON[id].types.some(t => KINDS[n.kind].pref?.includes(t)));
  return fit.length >= 2 ? fit : base;
}
const tierAt = n => Math.max(n.tier, player.beaten.size * 0.9);

function movesFor(m) {
  const list = m.types.flatMap(t => TYPE_MOVES[t]);
  if (!list.some(([k]) => k === 'charge')) list.push(['charge', '돌진']);
  if (!list.some(([k]) => k === 'jump')) list.push(['jump', m.flying ? '공중날기' : '누르기']);
  return list;
}

const ADV_MOVES = [['homing', '추적탄'], ['wall', '탄막 벽'], ['chase', '연속 낙하'], ['split', '분열탄'], ['sweep', '휩쓸기 광선']];
const RAIN_NAME = { fire: '불꽃 비', water: '폭우', ice: '우박', electric: '낙뢰', rock: '낙석', ground: '낙석', grass: '씨앗 폭격', poison: '독 비', psychic: '사이코 유성', dragon: '용성군', fairy: '별빛 비' };
// rank: wild(야생) / trainer(트레이너) / boss(관장·사천왕) / legend(전설)
function spawnEnemy(m, x, y, rank, tier = 0) {
  const s = m.st, big = rank === 'boss' || rank === 'legend', w = m.box.x1 - m.box.x0;
  const base = { wild: s.hp / 8, trainer: s.hp / 8 * TRAINER_HP, boss: 20 + s.hp * 0.15, legend: 40 + s.hp * 0.3 }[rank], hp = base * hpMult(rank, tier);
  const e = { mon: m, x, y, hx: x, hy: y, rank, tier, hp, maxHp: hp, scale: big ? 2 : 1, r: big ? clamp(w * 0.6, 30, 52) : clamp(w * 0.3, 12, 20), flying: m.flying, seed: Math.random() * 10,
    flip: false, hit: 0, cd: 1 + Math.random(), turn: Math.random(), dir: randDir(), vx: 0, vy: 0, walk: 0, moving: false, burn: 0, burnTick: 0, slow: 0, stun: 0, frozen: 0,
    z: 0, fade: 0, act: null, lunge: 1 + Math.random() * 2, burst: 0, burstT: 0, shotStyle: pick(tier >= 3 ? ['single', 'fan', 'burst', 'wave', 'snipe', 'spiral', 'ring', 'seeker'] : ['single', 'fan', 'burst', 'wave', 'snipe']), aggro: rank !== 'wild',
    moves: rank === 'wild' ? null : movesFor(m), speed: big ? 30 + s.speed * 0.6 : (40 + s.speed * 0.8) * (rank === 'wild' ? 1.15 : 1), shooter: !big && s['special-attack'] >= s.attack };
  // 준전설 상대: 체력 x0.75, 각성 단계도 늦게
  const sub = rank === 'legend' && isSubLegend(m.id);
  if (rank !== 'wild') { e.hp *= powerScale(tier) * startHpMul() * (sub ? 0.75 : 1); e.maxHp = e.hp; }
  if (player?.curseHp > 1) { e.hp *= player.curseHp; e.maxHp = e.hp; }  // 악의 조직과의 거래 대가
  e.lvl = rank === 'boss' ? (tier >= 6 ? 2 : tier >= 3 ? 1 : 0) : rank === 'legend' ? (tier >= (sub ? 6 : 4) ? 2 : 1) : 0;
  e.sub = sub;
  // 기술은 타입 고유·급 고유·공통 기술 중 4개만 무작위로 (patterns.js). 라이벌은 battle.js에서 라이벌 기술로 다시 고른다
  // 후반(배지 4개~) 보스급은 필살기(체력 2~3칸)가 섞일 수 있다
  if (rank !== 'wild') e.moves = pickPatterns(e, rank === 'legend' ? 'legend' : rank === 'boss' ? 'leader' : 'trainer');
  if (rank === 'legend') e.aggro = false;  // 전설도 다가가야 덤빈다
  unstick(e); clampBody(e);
  return e;
}
