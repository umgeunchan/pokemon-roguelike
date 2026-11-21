// 전설 오의: 전설의 기술을 배우면 "전설의 힘" 게이지가 생긴다
// 맞히고 쓰러뜨리면 차고, 가득 차면 가까운 적이 있을 때 그 기술 고유의 큰 필살기가 자동으로 나간다
// 전설의 포켓몬으로 플레이하면 더 빨리 차고 더 세다. 그 기술의 조합까지 갖추면 한층 강해진다

// shape: nova(나를 중심으로 퍼지는 파동) · rift(적을 가르는 공간의 균열) · strikes(적마다 내리꽂힘) · beam(거대한 광선)
// fx 효과 이름 → 필살기 모양. c1·c2 = 색, mul = 피해 배수, R = 범위, then = 추가 효과
const LEGEND_BURST = {
  psy: { shape: 'nova', c1: '#ff60ff', c2: '#ffe0ff', mul: 3.2, R: 330, then: o => o.stun = Math.max(o.stun ?? 0, 1.2) },
  beam: { shape: 'beam', mul: 4.2, R: 900 },
  holyBurn: { shape: 'strikes', c1: '#ffb020', c2: '#fff0a0', mul: 3.2, n: 7, then: o => o.burn = Math.max(o.burn ?? 0, 4) },
  fan5: { shape: 'nova', c1: '#2f6dff', c2: '#bfe0ff', mul: 3.2, R: 360, push: 90 },
  erupt: { shape: 'strikes', c1: '#c06a28', c2: '#ffd08a', mul: 3, n: 10, ring: true },
  dashStrike: { shape: 'beam', mul: 3.8, R: 760 },
  timeStop: { shape: 'nova', c1: '#4a70ff', c2: '#d8e4ff', mul: 3, R: 380, self: () => { timeStop = Math.max(timeStop, 3); } },
  rend: { shape: 'rift', c1: '#ff6ad5', c2: '#ffe2f6', mul: 4.2, n: 4 },
  vanish: { shape: 'nova', c1: '#5a2a9a', c2: '#d8b0ff', mul: 3.4, R: 320, self: p => { p.inv = Math.max(p.inv, 1.5); } },
  smite: { shape: 'strikes', c1: '#ffe040', c2: '#ffffff', mul: 3.4, n: 7, bolt: true, then: o => o.stun = Math.max(o.stun ?? 0, 1.5) },
  freeze: { shape: 'nova', c1: '#9fe8ff', c2: '#ffffff', mul: 3, R: 360, then: o => { if (!isBig(o)) o.frozen = Math.max(o.frozen ?? 0, 2.5); else o.stun = Math.max(o.stun ?? 0, 0.8); } },
  blade: { shape: 'rift', c1: '#ffc040', c2: '#fff6d0', mul: 4, n: 2 },
  bulwark: { shape: 'nova', c1: '#a8b8d8', c2: '#ffffff', mul: 3, R: 300, push: 120, self: p => { p.inv = Math.max(p.inv, 2); } },
  geo: { shape: 'nova', c1: '#ff80c0', c2: '#fff0a0', mul: 2.8, R: 340, self: p => { heal(2); p.surge = Math.max(p.surge ?? 0, 5); } },
  drain: { shape: 'nova', c1: '#d02040', c2: '#ffb0c0', mul: 3, R: 330, self: () => heal(3) },
  flare: { shape: 'strikes', c1: '#70e040', c2: '#f8ffb0', mul: 3.2, n: 8 },
  madness: { shape: 'nova', c1: '#a02870', c2: '#ffb0e0', mul: 2.6, R: 360, then: o => { if (!isBig(o) && o.hp > 0) o.hp /= 2; } },
  shard: { shape: 'strikes', c1: '#e8f8ff', c2: '#ff9fe0', mul: 3.2, n: 9, gem: true },
};
// 전설 기술마다 어울리는 조합: 갖추면 필살기 x1.5
const LEGEND_BURST_COMBO = { psy: 'psybreak', holyBurn: 'inferno', fan5: 'tsunami', erupt: 'tectonic', timeStop: 'timewarp', rend: 'dimension', vanish: 'phantom', smite: 'thundergod',
  freeze: 'absolute', blade: 'eclipse', bulwark: 'juggernaut', geo: 'gaia', drain: 'deathwing', flare: 'bloom', madness: 'calamity', shard: 'diamond', beam: 'lunar', dashStrike: 'stormdash' };

// 지금 쓸 전설 기술: 가장 최근에 배운 것
const burstMove = () => { const p = player; if (!p) return null; const ls = [...p.moves].map(moveDef).filter(m => m?.legend && LEGEND_BURST[m.fx]); return ls.at(-1) ?? null; };
const burstOn = () => !!burstMove();
// 게이지 충전 배수: 전설의 포켓몬이면 1.6배
const burstRate = () => (isLegendMon() ? 1.6 : 1) * (combo(LEGEND_BURST_COMBO[burstMove()?.fx]) ? 1.25 : 1);
function burstGain(v) { const p = player; if (!burstOn()) return; p.lg = Math.min(1, (p.lg ?? 0) + v * burstRate()); }

// 매 프레임 (update.js): 천천히 차고, 가득 차면 가까운 적에게 쏜다
function updateBurst(dt) {
  const p = player;
  if (!burstOn()) return;
  burstGain(dt * 0.012);
  if ((p.lg ?? 0) < 1 || map.battle?.wait > 0) return;
  const target = map.enemies.filter(o => o.hp > 0 && !untargetable(o) && !outsideLegendHome(o) && Math.hypot(o.x - p.x, o.y - p.y) < 420)
    .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
  if (target) fireBurst(target);
}

function fireBurst(t) {
  const p = player, m = burstMove(), b = LEGEND_BURST[m.fx], strong = combo(LEGEND_BURST_COMBO[m.fx]);
  const mul = b.mul * (isLegendMon() ? 1.3 : 1) * (strong ? 1.5 : 1), c1 = b.c1 ?? TYPE_COLOR[m.type], c2 = b.c2 ?? '#ffffff';
  p.lg = 0;
  const hit = (o, k = 1) => { if (o.hp <= 0) return; damage(o, p.dmg * mul * k, m.type, false, true, 0.25); b.then?.(o); if (b.push && !isBig(o)) { const d = Math.hypot(o.x - p.x, o.y - p.y) || 1; moveBody(o, (o.x - p.x) / d * b.push, (o.y - p.y) / d * b.push); } };
  if (b.shape === 'nova') {
    const R = b.R * (strong ? 1.25 : 1);
    fx.push({ kind: 'lnova', x: p.x, y: p.y, r: R, c1, c2, t: 0.9, max: 0.9 });
    for (const o of enemiesNear(p.x, p.y, R)) hit(o);
  }
  if (b.shape === 'rift') {
    // 균열 n줄: 줄마다 가까운 적을 하나씩 골라 그 적을 지나가게 긋고, 줄 근처의 적을 모두 벤다
    const n = b.n + (strong ? 2 : 0), near = map.enemies.filter(o => o.hp > 0 && !untargetable(o) && Math.hypot(o.x - p.x, o.y - p.y) < 480).sort((a, b2) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b2.x - p.x, b2.y - p.y));
    for (let i = 0; i < n; i++) {
      const c = near[i % Math.max(1, near.length)] ?? t, a = Math.random() * Math.PI, L = 520, x1 = c.x - Math.cos(a) * L / 2, y1 = c.y - Math.sin(a) * L / 2, x2 = c.x + Math.cos(a) * L / 2, y2 = c.y + Math.sin(a) * L / 2;
      fx.push({ kind: 'lrift', x: c.x, y: c.y, x1, y1, x2, y2, c1, c2, t: 0.75 + i * 0.06, max: 0.75 + i * 0.06, seed: Math.random() * 1000 });
      for (const o of map.enemies) if (o.hp > 0 && segDist(o.x, o.y, x1, y1, x2, y2) < 46 + o.r) hit(o, 0.55);
    }
  }
  if (b.shape === 'strikes') {
    const ts = map.enemies.filter(o => o.hp > 0 && Math.hypot(o.x - p.x, o.y - p.y) < 480).sort((a, b2) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b2.x - p.x, b2.y - p.y));
    const n = b.n + (strong ? 3 : 0);
    for (let i = 0; i < n; i++) {
      const o = ts[i % Math.max(1, ts.length)], ang = i / n * Math.PI * 2;
      const [x, y] = b.ring || !o ? [p.x + Math.cos(ang) * (90 + (i % 2) * 70), p.y + Math.sin(ang) * (90 + (i % 2) * 70)] : [o.x + (Math.random() - 0.5) * 40, o.y + (Math.random() - 0.5) * 40];
      fx.push({ kind: 'lstrike', x, y, c1, c2, bolt: b.bolt, gem: b.gem, t: 0.55 + i * 0.07, max: 0.55 + i * 0.07, d: i * 0.07 });
      setTimeout(() => { if (state !== 'play' && state !== 'warp') return; for (const q of enemiesNear(x, y, 70)) hit(q, 0.7); }, i * 70);
    }
  }
  if (b.shape === 'beam') {
    const a = Math.atan2(t.y - p.y, t.x - p.x), L = b.R, W = 70 * (strong ? 1.4 : 1), x2 = p.x + Math.cos(a) * L, y2 = p.y + Math.sin(a) * L;
    fx.push({ kind: 'lbeam', x: p.x, y: p.y, x2, y2, w: W, c1, c2, t: 0.8, max: 0.8 });
    for (const o of map.enemies) if (o.hp > 0 && segDist(o.x, o.y, p.x, p.y, x2, y2) < W / 2 + o.r) hit(o);
  }
  b.self?.(p);
  fx.push({ kind: 'lflash', x: p.x, y: p.y, c1, t: 0.35, max: 0.35 });
  shake = 0.5; sfx('legend');
  banner = { text: `${m.name}!${strong ? ' (조합 강화)' : ''}`, t: 1.6, glow: c1 };
}
const segDist = (px, py, x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy || 1, u = clamp(((px - x1) * dx + (py - y1) * dy) / l, 0, 1); return Math.hypot(px - x1 - u * dx, py - y1 - u * dy); };

// ---------- 그리기 ----------
function drawLegendFx(f, k) {
  if (f.kind === 'lflash') { ctx.globalAlpha = (1 - k) * 0.45; ctx.fillStyle = f.c1; ctx.fillRect(f.x - 1400, f.y - 1000, 2800, 2000); ctx.globalAlpha = 1; }
  if (f.kind === 'lnova') {
    // 겹겹이 퍼지는 고리 + 빛줄기 + 가운데 섬광
    const e = 1 - (1 - k) ** 3;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const r = f.r * clamp(e - i * 0.08, 0, 1);
      ctx.globalAlpha = (1 - k) * (0.9 - i * 0.18); ctx.strokeStyle = i % 2 ? f.c2 : f.c1; ctx.lineWidth = 14 - i * 3;
      ctx.beginPath(); ctx.ellipse(f.x, f.y - 20, r, r * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = (1 - k) * 0.8; ctx.strokeStyle = f.c2; ctx.lineWidth = 3;
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + k * 1.5, r1 = f.r * e * 0.3, r2 = f.r * e * 1.05; ctx.beginPath(); ctx.moveTo(f.x + Math.cos(a) * r1, f.y - 20 + Math.sin(a) * r1 * 0.62); ctx.lineTo(f.x + Math.cos(a) * r2, f.y - 20 + Math.sin(a) * r2 * 0.62); ctx.stroke(); }
    const g = ctx.createRadialGradient(f.x, f.y - 20, 0, f.x, f.y - 20, 120 * (1 - k) + 20);
    g.addColorStop(0, `rgba(255,255,255,${1 - k})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y - 20, 140, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  if (f.kind === 'lrift') {
    // 공간의 균열: 들쭉날쭉한 빛의 선이 벌어졌다 닫힌다
    const open = Math.sin(Math.min(1, k * 1.4) * Math.PI), pts = 14;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [w, c, a] of [[22 * open + 4, f.c1, 0.55], [8 * open + 2, f.c2, 0.95]]) {
      ctx.globalAlpha = a * (1 - k * 0.6); ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineJoin = 'bevel'; ctx.beginPath();
      for (let i = 0; i <= pts; i++) {
        const u = i / pts, jx = (Math.sin(f.seed + i * 2.7) * 14) * (i % pts ? 1 : 0), jy = (Math.cos(f.seed + i * 1.9) * 14) * (i % pts ? 1 : 0);
        const x = f.x1 + (f.x2 - f.x1) * u + jx, y = f.y1 + (f.y2 - f.y1) * u + jy - 20;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    // 흩어지는 조각
    ctx.fillStyle = f.c2;
    for (let i = 0; i < 10; i++) { const u = (i + 0.5) / 10, x = f.x1 + (f.x2 - f.x1) * u, y = f.y1 + (f.y2 - f.y1) * u - 20, s = (1 - k) * 6; ctx.globalAlpha = 1 - k; ctx.fillRect(x + Math.sin(f.seed + i) * 40 * k, y - 60 * k * ((i % 3) + 1) / 2, s, s); }
    ctx.restore();
  }
  if (f.kind === 'lstrike') {
    const kk = clamp((k * f.max - f.d) / (f.max - f.d), 0, 1);
    if (kk <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - kk;
    if (f.bolt) {
      ctx.strokeStyle = f.c1; ctx.lineWidth = 6; ctx.beginPath(); let x = f.x, y = f.y - 420; ctx.moveTo(x, y);
      for (let i = 0; i < 8; i++) { x = f.x + (Math.random() - 0.5) * 40; y += 52; ctx.lineTo(x, y); } ctx.stroke();
      ctx.strokeStyle = f.c2; ctx.lineWidth = 2; ctx.stroke();
    } else {
      // 빛기둥
      const g = ctx.createLinearGradient(f.x, f.y - 360, f.x, f.y);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, f.c1);
      ctx.fillStyle = g; const w = 46 * (1 - kk * 0.6); ctx.fillRect(f.x - w / 2, f.y - 360, w, 360);
      ctx.fillStyle = f.c2; ctx.fillRect(f.x - w / 6, f.y - 360, w / 3, 360);
    }
    ctx.strokeStyle = f.c2; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(f.x, f.y, 20 + kk * 70, (20 + kk * 70) * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
    if (f.gem) { ctx.fillStyle = f.c2; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, r = kk * 60; ctx.beginPath(); ctx.moveTo(f.x + Math.cos(a) * r, f.y - 20 + Math.sin(a) * r - 8); ctx.lineTo(f.x + Math.cos(a) * r + 5, f.y - 20 + Math.sin(a) * r); ctx.lineTo(f.x + Math.cos(a) * r, f.y - 20 + Math.sin(a) * r + 4); ctx.lineTo(f.x + Math.cos(a) * r - 5, f.y - 20 + Math.sin(a) * r); ctx.fill(); } }
    ctx.restore();
  }
  if (f.kind === 'lbeam') {
    const a = Math.atan2(f.y2 - f.y, f.x2 - f.x), L = Math.hypot(f.x2 - f.x, f.y2 - f.y), w = f.w * Math.sin(Math.min(1, k * 1.3) * Math.PI);
    ctx.save(); ctx.translate(f.x, f.y - 20); ctx.rotate(a); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5; ctx.fillStyle = f.c1; ctx.fillRect(0, -w * 0.8, L, w * 1.6);
    ctx.globalAlpha = 0.9; ctx.fillRect(0, -w / 2, L, w);
    ctx.fillStyle = f.c2; ctx.fillRect(0, -w / 5, L, w / 2.5);
    for (let i = 0; i < 8; i++) { const x = ((now * 900 + i * 120) % L); ctx.globalAlpha = 0.7; ctx.fillRect(x, -w * 0.7, 30, w * 1.4); }
    ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(0, 0, w * 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// 왼쪽 창 아래: 전설의 힘 게이지
function drawBurstGauge(y) {
  const p = player, m = burstMove();
  if (!m) return;
  const v = p.lg ?? 0, full = v >= 1, c = LEGEND_BURST[m.fx].c1 ?? TYPE_COLOR[m.type];
  text(full ? `${m.name} 준비!` : '전설의 힘', 6, y, 11, full ? '#fff' : '#fd6', 'left');
  ctx.fillStyle = '#222'; ctx.fillRect(6, y + 4, 146, 7);
  ctx.fillStyle = full ? (Math.sin(now * 10) > 0 ? '#fff' : c) : c; ctx.fillRect(6, y + 4, 146 * v, 7);
  if (combo(LEGEND_BURST_COMBO[m.fx])) text('조합', 152, y, 10, '#ff8', 'right');
}
