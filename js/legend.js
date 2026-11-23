// 전설 기술의 연출: 원작 기술이 나가는 모습을 본떠서, 평소 공격이 맞을 때 터진다 (combat.js의 legendHit)
// 그림 종류: lrift(공간의 균열·칼날 궤적) · lstrike(빛기둥·낙뢰·솟는 바위) · lnova(퍼지는 파동) · lbeam(굵은 광선)
// 같은 효과가 너무 자주 겹치지 않게 효과마다 짧은 간격을 둔다
const lcd = (k, t) => { const p = player, c = p.lcd ??= {}; if ((c[k] ?? 0) > p.time) return false; c[k] = p.time + t; return true; };
const rift = (x, y, a, L, c1, c2, t = 0.4) => fx.push({ kind: 'lrift', x, y, x1: x - Math.cos(a) * L / 2, y1: y - Math.sin(a) * L / 2, x2: x + Math.cos(a) * L / 2, y2: y + Math.sin(a) * L / 2, c1, c2, t, max: t, seed: Math.random() * 1000 });
// 이 효과(fx)를 가진 전설 기술 중 가장 최근에 배운 것: 같은 효과라도 기술마다 색·타입·이름이 다르다
const lmove = k => [...player.moves].map(moveDef).filter(m => m?.legend && m.fx === k).at(-1);
const LCOL = {
  'fusion-bolt': ['#ffe040', '#ffffff'], 'zap-cannon': ['#ffe040', '#fffbd0'], discharge: ['#fff36a', '#ffffff'], 'freeze-shock': ['#9fe8ff', '#ffffff'], 'plasma-fists': ['#ffe040', '#d0f8ff'],
  'spacial-rend': ['#ff6ad5', '#ffe2f6'], 'hyperspace-hole': ['#b060ff', '#f0d8ff'], 'hyperspace-fury': ['#8030c0', '#ffb0ff'],
  'diamond-storm': ['#c8f0ff', '#ff9fe0'], 'ancient-power': ['#b08040', '#f0d8a0'],
  'seed-flare': ['#70e040', '#f8ffb0'], 'leaf-storm': ['#40c040', '#d0ffb0'], 'jungle-healing': ['#30a050', '#c0ffa0'], 'ivy-cudgel': ['#50c050', '#e0ffb0'],
  psystrike: ['#ff60ff', '#ffe0ff'], 'expanding-force': ['#e070ff', '#ffe8ff'], 'psycho-boost': ['#ff7040', '#ffe0c0'], 'mystical-power': ['#a080ff', '#f0e8ff'],
  'lunar-blessing': ['#ffc0f0', '#fff8ff'], 'take-heart': ['#ff80a0', '#fff0f4'], 'mist-ball': ['#ff90c0', '#fff0f8'], 'luster-purge': ['#6090ff', '#e8f0ff'], 'astral-barrage': ['#6040c0', '#e0d8ff'],
  'dark-void': ['#301040', '#a070ff'], 'relic-song': ['#ffb0e0', '#ffffff'],
  'bleakwind-storm': ['#a0d8ff', '#ffffff'], 'wildbolt-storm': ['#ffe040', '#ffffff'], 'sandsear-storm': ['#d09050', '#ffe0a0'],
};
const lcol = (m, def) => LCOL[m?.id] ?? def;
// 빛가루: 사방으로 튀어 오르다 떨어지며 사라지는 작은 빛 (그릴 때 위치를 계산해서 따로 움직일 필요가 없다)
function lburst(x, y, c1, c2, n, spd, life = 0.6, up = 0) {
  if (fx.length > 1100) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = spd * (0.35 + Math.random() * 0.65), t = life * (0.6 + Math.random() * 0.4);
    fx.push({ kind: 'lpart', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7 - up, g: 260, c: i % 3 ? c1 : c2, s: 2 + Math.random() * 4, t, max: t });
  }
}
// 돌진 기술(화룡점정·액셀브레이크·라이트닝드라이브·불새): 구르기 대신, 공격할 때 1.4초마다 그 방향(가까운 적)으로 혜성처럼 꿰뚫는 돌진 일격
const CHARGE_COL = { 'dragon-ascent': ['#30e070', '#e8fff0'], 'collision-course': ['#ff5030', '#ffe0a0'], 'electro-drift': ['#40a0ff', '#ffff90'], 'sky-attack': ['#ff8020', '#fff0a0'] };
function legendCharge(a) {
  const p = player, m = lmove('dashStrike');
  if (!m || (p.chargeCd ?? 0) > p.time) return;
  p.chargeCd = p.time + (combo('stormdash') ? 1.1 : 1.4);
  const tg = nearestEnemy(p.x, p.y, null, 440);
  if (tg) a = Math.atan2(tg.y - p.y, tg.x - p.x);
  const s = fxScale(), L = 420 * s, [c1, c2] = CHARGE_COL[m.id] ?? [TYPE_COLOR[m.type], '#ffffff'];
  let x = p.x, y = p.y;
  for (let d = 0; d < L; d += 12) { const nx = x + Math.cos(a) * 12, ny = y + Math.sin(a) * 12; if (shotBlocked(Math.floor(nx / TS), Math.floor(ny / TS))) break; x = nx; y = ny; }
  const spd = dashSpd(), hit = [];
  for (const e of [...map.enemies]) if (e.hp > 0 && !untargetable(e) && segDist(e.x, e.y, p.x, p.y, x, y) < 50 * s + e.r) { hit.push(e); e.chargeAt = p.time; damage(e, p.dmg * 3 * spd, m.type); }
  // 끝에서 충격파
  const R = 95 * s;
  for (const e of enemiesNear(x, y, R)) { e.chargeAt = p.time; damage(e, p.dmg * 1.5 * spd, m.type, false, true); }
  if (combo('stormdash')) for (const e of hit) if (e.hp > 0) {
    e.stun = Math.max(e.stun ?? 0, 1); say('마비되었다!', e.x, e.y - 50, '#ff8');
    for (const o of enemiesNear(e.x, e.y, 150, e).slice(0, 3)) { damage(o, p.dmg * 1.2 * spd, 'electric', false, true); fx.push({ kind: 'zap', x: e.x, y: e.y, x2: o.x, y2: o.y, t: 0.15 }); }
  }
  fx.push({ kind: 'lcharge', x: p.x, y: p.y, x2: x, y2: y, c1, c2, w: 40 * s, t: 0.5, max: 0.5 });
  fx.push({ kind: 'lnova', x, y, r: R, c1, c2, t: 0.45, max: 0.45, d: 0.15 });
  if (hit.length) p.inv = Math.max(p.inv, 0.3);
  shake = Math.max(shake, 0.15); sfx('beam');
}
const segDist = (px, py, x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy || 1, u = clamp(((px - x1) * dx + (py - y1) * dy) / l, 0, 1); return Math.hypot(px - x1 - u * dx, py - y1 - u * dy); };

// ---------- 그리기 ----------
function drawLegendFx(f, k) {
  if (f.kind === 'lpart') {
    const age = f.max - f.t, x = f.x + f.vx * age, y = f.y - 20 + f.vy * age + 0.5 * f.g * age * age, sz = f.s * (1 - k * 0.5);
    const g0 = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1 - k; ctx.fillStyle = f.c; ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    if (f.s > 3.5) { ctx.globalAlpha = (1 - k) * 0.3; ctx.beginPath(); ctx.arc(x, y, sz * 1.8, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = g0;
    return;
  }
  if (f.kind === 'lcharge') {
    // 혜성 같은 돌진: 머리가 끝까지 날아가고, 지나간 자리에 빛의 꼬리가 남았다가 사라진다
    const u = Math.min(1, k * 3), hx = f.x + (f.x2 - f.x) * u, hy = f.y + (f.y2 - f.y) * u, fade = k < 0.34 ? 1 : 1 - (k - 0.34) / 0.66;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.shadowColor = f.c1; ctx.shadowBlur = 24;
    for (const [w, c, al] of [[f.w, f.c1, 0.35], [f.w * 0.45, f.c1, 0.85], [f.w * 0.15, f.c2, 1]]) { ctx.globalAlpha = al * fade; ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(f.x, f.y - 20); ctx.lineTo(hx, hy - 20); ctx.stroke(); }
    if (u < 1) { const g = ctx.createRadialGradient(hx, hy - 20, 0, hx, hy - 20, f.w * 1.2); g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, f.c1); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy - 20, f.w * 1.2, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    if (u < 1 && Math.random() < 0.9) lburst(hx, hy, f.c1, f.c2, 3, 160, 0.4);
    return;
  }
  if (!f.burst && ((f.kind === 'lnova' && k * f.max >= (f.d ?? 0)) || f.kind === 'lrift' || (f.kind === 'lstrike' && k * f.max >= f.d))) {
    f.burst = true;
    if (f.kind === 'lnova') lburst(f.x, f.y, f.c1, f.c2, 22, f.r * 2.4, 0.55, 40);
    else if (f.kind === 'lstrike') lburst(f.x, f.y, f.c1, f.c2, 16, 220, 0.6, 180);
    else for (let i = 0; i < 14; i++) { const u = Math.random(); lburst(f.x1 + (f.x2 - f.x1) * u, f.y1 + (f.y2 - f.y1) * u, f.c1, f.c2, 1, 140, 0.5, 60); }
  }
  if (f.kind === 'lswing') {
    // 칼: 굵은 초승달이 한쪽에서 반대쪽으로 쓸고 지나간다 / 주먹: 앞쪽에 주먹 충격이 터진다
    const kk = clamp((k * f.max - f.d) / (f.max - f.d), 0, 1);
    if (kk <= 0) return;
    const cy = f.y - 20;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (f.sword) {
      const a0 = f.a - f.half, a1 = f.a - f.half + f.half * 2 * Math.min(1, kk * 2.2);
      for (const [w, c, al] of [[26, f.c1, 0.55], [10, f.c2, 0.95]]) {
        ctx.globalAlpha = al * (1 - Math.max(0, kk - 0.5) * 2); ctx.strokeStyle = c; ctx.lineWidth = w * (1 - kk * 0.4); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(f.x, cy, f.R * 0.82, a0, a1); ctx.stroke();
      }
      ctx.globalAlpha = 0.5 * (1 - kk); ctx.fillStyle = f.c1; ctx.beginPath(); ctx.moveTo(f.x, cy); ctx.arc(f.x, cy, f.R, a0, a1); ctx.closePath(); ctx.fill();
      // 잔상 호 두 겹과 칼끝 불티
      ctx.shadowColor = f.c1; ctx.shadowBlur = 16;
      for (const [rr, al] of [[0.62, 0.45], [1.0, 0.3]]) { ctx.globalAlpha = al * (1 - kk); ctx.strokeStyle = f.c2; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.x, cy, f.R * rr, a0, a1); ctx.stroke(); }
      if (kk < 0.5 && !f.sp) { f.sp = true; for (let i = 0; i < 10; i++) { const g = a0 + (a1 - a0) * Math.random(); lburst(f.x + Math.cos(g) * f.R * 0.82, f.y + Math.sin(g) * f.R * 0.82, f.c1, f.c2, 1, 120, 0.45); } }
    } else {
      const r = f.R * (0.55 + kk * 0.45), x = f.x + Math.cos(f.a) * r, y = cy + Math.sin(f.a) * r;
      if (!f.sp) { f.sp = true; lburst(x, y + 20, f.c1, f.c2, 12, 200, 0.45); }
      ctx.shadowColor = f.c1; ctx.shadowBlur = 18;
      ctx.globalAlpha = 1 - kk; ctx.fillStyle = f.c1; ctx.beginPath(); ctx.arc(x, y, 26 * (1 - kk * 0.3), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = f.c2; ctx.beginPath(); ctx.arc(x, y, 12 * (1 - kk * 0.5), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = f.c2; ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) { const g = f.a + (i - 2.5) * 0.45, r1 = 22 + kk * 30, r2 = r1 + 16; ctx.beginPath(); ctx.moveTo(x + Math.cos(g) * r1, y + Math.sin(g) * r1); ctx.lineTo(x + Math.cos(g) * r2, y + Math.sin(g) * r2); ctx.stroke(); }
      ctx.globalAlpha = 0.6 * (1 - kk); ctx.lineWidth = 8; ctx.strokeStyle = f.c1; ctx.beginPath(); ctx.moveTo(f.x, cy); ctx.lineTo(x, y); ctx.stroke();
    }
    ctx.restore();
    return;
  }
  if (f.kind === 'lflash') { ctx.globalAlpha = (1 - k) * 0.45; ctx.fillStyle = f.c1; ctx.fillRect(f.x - 1400, f.y - 1000, 2800, 2000); ctx.globalAlpha = 1; }
  if (f.kind === 'lnova') {
    // 겹겹이 퍼지는 고리 + 빛줄기 + 가운데 섬광
    if (f.d && k * f.max < f.d) return;
    const e = 1 - (1 - k) ** 3;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // 바탕 빛무리 + 회전하는 네 갈래 섬광
    const bg = ctx.createRadialGradient(f.x, f.y - 20, 0, f.x, f.y - 20, f.r * 1.2);
    bg.addColorStop(0, f.c1); bg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = (1 - k) * 0.28; ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(f.x, f.y - 20, f.r * 1.2 * (0.4 + e * 0.6), f.r * 0.8 * (0.4 + e * 0.6), 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = (1 - k) * 0.9; ctx.fillStyle = f.c2;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(f.x, f.y - 20, f.r * 1.3 * (1 - k * 0.5), 3 + 4 * (1 - k), i * Math.PI / 4 + k * 1.2, 0, Math.PI * 2); ctx.fill(); }
    ctx.shadowColor = f.c1; ctx.shadowBlur = 18;
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
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = f.c1; ctx.shadowBlur = 22;
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
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const gg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 110); gg.addColorStop(0, f.c2); gg.addColorStop(0.3, f.c1); gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = (1 - kk) * 0.35; ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(f.x, f.y, 110, 50, 0, 0, Math.PI * 2); ctx.fill();
    if (kk < 0.2) { ctx.globalAlpha = (0.2 - kk) * 2.5; ctx.fillStyle = f.c2; ctx.beginPath(); ctx.arc(f.x, f.y - 30, 50 * (1 - kk * 2), 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1 - kk; ctx.shadowColor = f.c1; ctx.shadowBlur = 20;
    if (f.spike) {
      // 단애의칼·사우전드애로: 땅에서 바위 칼날이 솟는다
      const hgt = 90 * Math.sin(Math.min(1, kk * 2.2) * Math.PI / 2) * (1 - Math.max(0, kk - 0.6) / 0.4);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      for (const [dx, sc] of [[-16, 0.7], [0, 1], [15, 0.8]]) { ctx.fillStyle = f.c1; ctx.beginPath(); ctx.moveTo(f.x + dx - 11 * sc, f.y); ctx.lineTo(f.x + dx, f.y - hgt * sc); ctx.lineTo(f.x + dx + 11 * sc, f.y); ctx.fill(); ctx.fillStyle = f.c2; ctx.beginPath(); ctx.moveTo(f.x + dx, f.y - hgt * sc); ctx.lineTo(f.x + dx + 4 * sc, f.y - hgt * sc * 0.4); ctx.lineTo(f.x + dx, f.y); ctx.fill(); }
      ctx.globalCompositeOperation = 'lighter';
    } else if (f.bolt) {
      ctx.strokeStyle = f.c1; ctx.lineWidth = 6; ctx.beginPath(); let x = f.x, y = f.y - 420; ctx.moveTo(x, y);
      for (let i = 0; i < 8; i++) { x = f.x + (Math.random() - 0.5) * 40; y += 52; ctx.lineTo(x, y); } ctx.stroke();
      ctx.strokeStyle = f.c2; ctx.lineWidth = 2; ctx.stroke();
      // 곁가지 번개
      ctx.strokeStyle = f.c1; ctx.lineWidth = 2;
      for (let b = 0; b < 3; b++) { let bx = f.x + (Math.random() - 0.5) * 30, by = f.y - 300 + b * 90; ctx.beginPath(); ctx.moveTo(bx, by); for (let i = 0; i < 3; i++) { bx += (Math.random() - 0.5) * 70; by += 30; ctx.lineTo(bx, by); } ctx.stroke(); }
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
    if (Math.random() < 0.7) { const u = Math.random(); lburst(f.x + Math.cos(a) * L * u, f.y + Math.sin(a) * L * u, f.c1, f.c2, 2, 120, 0.4, 40); }
    ctx.save(); ctx.translate(f.x, f.y - 20); ctx.rotate(a); ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = f.c1; ctx.shadowBlur = 26;
    ctx.globalAlpha = 0.25; ctx.fillStyle = f.c1; ctx.fillRect(0, -w * 1.4, L, w * 2.8);
    ctx.globalAlpha = 0.5; ctx.fillStyle = f.c1; ctx.fillRect(0, -w * 0.8, L, w * 1.6);
    ctx.globalAlpha = 0.9; ctx.fillRect(0, -w / 2, L, w);
    ctx.fillStyle = f.c2; ctx.fillRect(0, -w / 5, L, w / 2.5);
    for (let i = 0; i < 8; i++) { const x = ((now * 900 + i * 120) % L); ctx.globalAlpha = 0.7; ctx.fillRect(x, -w * 0.7, 30, w * 1.4); }
    ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(0, 0, w * 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}


// ---------- 전설 기술이 맞았을 때 (평소 공격) ----------
// 원작 연출을 본떴다. 공간절단: 적 자리의 공간이 X자로 찢어짐 / 크로스썬더: 하늘에서 낙뢰 / 단애의칼: 땅에서 바위 칼날이 줄지어 솟음
// 시드플레어: 몸에서 빛이 터져 퍼짐 / 사이코브레이크: 적 둘레에 염동파가 모여 터짐 / 성스러운불꽃: 불기둥 / 메테오드라이브·거대검: 금빛 참격
// 자연의분노·카타스트로피: 분홍·붉은 구체가 짓누름 / 다이아스톰: 다이아가 흩날림 / 시간의포효: 일그러지는 파동
function legendHit(e, big) {
  const p = player, s = fxScale();
  // 크로스썬더·볼트로스 등: 하늘에서 내리꽂히는 낙뢰, 옆 적에게 번개가 이어짐
  // 전자포: 전기 구슬이 터지며 오래 마비 / 방전: 연쇄가 더 멀리·많이 / 프리즈볼트: 얼음 낙뢰라 얼린다 / 플라스마피스트: 주먹이 맞을 때마다
  if (hasFx('smite') && Math.random() < (combo('thundergod') ? 0.65 : 0.45)) {
    const m = lmove('smite'), [c1, c2] = lcol(m, ['#ffe040', '#ffffff']), t = m?.type ?? 'electric', dis = m?.id === 'discharge';
    damage(e, p.dmg * 3, t, false, true); e.stun = Math.max(e.stun ?? 0, m?.id === 'zap-cannon' ? 1 : 0.4);
    if (m?.id === 'freeze-shock' && !isBig(e)) e.frozen = Math.max(e.frozen ?? 0, 1.2);
    if (m?.id === 'zap-cannon') fx.push({ kind: 'lnova', x: e.x, y: e.y, r: 60 * s, c1, c2, t: 0.35, max: 0.35 });
    fx.push({ kind: 'lstrike', x: e.x, y: e.y, c1, c2, bolt: true, t: 0.4, max: 0.4, d: 0 }); shake = Math.max(shake, 0.12);
    for (const o of enemiesNear(e.x, e.y, dis ? 260 : 190, e).slice(0, (combo('thundergod') ? 4 : 3) + (dis ? 2 : 0))) { damage(o, p.dmg * 1.2, t, false, true); fx.push({ kind: 'zap', x: e.x, y: e.y, x2: o.x, y2: o.y, t: 0.2 }); }
  }
  // 공간절단: 맞힌 자리의 공간이 X자로 찢어지고, 균열에 닿은 적을 모두 벤다 (차원 절단 조합이면 4줄, 범위·피해 x2)
  if (hasFx('rend') && lcd('rend', 0.18)) {
    const m = lmove('rend'), [c1, c2] = lcol(m, ['#ff6ad5', '#ffe2f6']), rt = m?.type ?? 'dragon';
    const dim = combo('dimension'), L = 220 * s * (dim ? 1.6 : 1), a0 = Math.random() * Math.PI, n = dim ? 4 : m?.id === 'hyperspace-fury' ? 3 : 2;
    if (m?.id === 'hyperspace-hole' || m?.id === 'hyperspace-fury') fx.push({ kind: 'lnova', x: e.x, y: e.y, r: 50 * s, c1, c2, t: 0.35, max: 0.35 });  // 후파의 고리
    for (let i = 0; i < n; i++) {
      const a = a0 + i * Math.PI / n, x1 = e.x - Math.cos(a) * L / 2, y1 = e.y - Math.sin(a) * L / 2, x2 = e.x + Math.cos(a) * L / 2, y2 = e.y + Math.sin(a) * L / 2;
      rift(e.x, e.y, a, L, c1, c2, 0.45);
      for (const o of map.enemies) if (o !== e && o.hp > 0 && segDist(o.x, o.y, x1, y1, x2, y2) < 34 + o.r) damage(o, p.dmg * 1.1 * (dim ? 2 : 1), rt, false, true);
    }
    damage(e, p.dmg * 0.6 * (dim ? 2 : 1), rt, false, true);
  }
  // 단애의칼·사우전드애로: 적 쪽으로 바위 칼날이 줄지어 솟는다
  if (hasFx('erupt') && p.eruptCd <= 0) {
    const tc = combo('tectonic');
    p.eruptCd = tc ? 0.2 : 0.35;
    const d0 = Math.hypot(e.x - p.x, e.y - p.y) || 1, ux = (e.x - p.x) / d0, uy = (e.y - p.y) / d0;
    for (let i = 0; i < (tc ? 7 : 5); i++) {
      const x = e.x + ux * 55 * i, y = e.y + uy * 55 * i;
      pstrikes.push({ x, y, t: 0.08 + i * 0.1, r: 50 * s * (tc ? 1.35 : 1), mul: 1.5, type: 'ground' });
      fx.push({ kind: 'lstrike', x, y, c1: '#9a5a2a', c2: '#e8c090', spike: true, t: 0.6 + i * 0.1, max: 0.6 + i * 0.1, d: 0.08 + i * 0.1 });
    }
  }
  // 시드플레어: 맞힌 자리에서 빛이 터져 둥글게 퍼진다
  if (hasFx('flare') && lcd('flare', 0.15)) {
    const m = lmove('flare'), [c1, c2] = lcol(m, ['#70e040', '#f8ffb0']), R = 75 * s * (combo('bloom') ? 1.6 : 1) * (m?.id === 'leaf-storm' ? 1.3 : 1);
    fx.push({ kind: 'lnova', x: e.x, y: e.y, r: R, c1, c2, t: 0.45, max: 0.45 });
    for (const o of enemiesNear(e.x, e.y, R, e)) damage(o, p.dmg * 1.1 * (combo('bloom') ? 1.5 : 1), 'grass', false, true);
  }
  // 사이코브레이크·미스트볼·러스터퍼지: 적 둘레에 염동파가 모여들어 터진다
  if (hasFx('psy') && lcd('psy', 0.2)) {
    const m = lmove('psy'), [c1, c2] = lcol(m, ['#ff60ff', '#ffe0ff']), big2 = m?.id === 'expanding-force' ? 1.5 : 1, boost = m?.id === 'psycho-boost' ? 1.6 : 1;
    const R = 60 * s * (combo('psybreak') ? 1.5 : 1) * big2;
    fx.push({ kind: 'lnova', x: e.x, y: e.y, r: R, c1, c2, t: 0.4, max: 0.4 });
    for (const o of [e, ...enemiesNear(e.x, e.y, R, e)]) damage(o, p.dmg * (combo('psybreak') ? 0.9 : 0.5) * boost, m?.type ?? 'psychic', false, true);
  }
  // 성스러운불꽃·푸른불꽃 계열: 가끔 불기둥이 솟아 태운다
  if (hasFx('holyBurn') && lcd('holy', 0.5) && Math.random() < 0.5) {
    fx.push({ kind: 'lstrike', x: e.x, y: e.y, c1: '#ff9020', c2: '#fff0a0', t: 0.55, max: 0.55, d: 0 });
    for (const o of [e, ...enemiesNear(e.x, e.y, 60, e)]) { damage(o, p.dmg * 1.2, 'fire', false, true); o.burn = Math.max(o.burn ?? 0, 4); o.holy = true; }
  }
  // 메테오드라이브·거대검돌격·암흑강타: 금빛(악은 검붉은) 참격이 적을 가른다
  if (hasFx('blade') && lcd('blade', 0.22)) {
    const dark = has('wicked-blow'), a = Math.atan2(e.y - p.y, e.x - p.x) + Math.PI / 2;
    rift(e.x, e.y, a, 150 * s, dark ? '#a02050' : '#ffc040', dark ? '#ffb0c8' : '#fff6d0', 0.3);
    for (const o of enemiesNear(e.x, e.y, 70 * s, e)) damage(o, p.dmg * 0.8, dark ? 'dark' : 'steel', false, true);
  }
  // 다이아스톰: 맞힌 자리에서 다이아가 사방으로 흩날린다
  if (hasFx('shard') && Math.random() < (combo('diamond') ? 0.6 : 0.4)) {
    const [c1, c2] = lcol(lmove('shard'), ['#c8f0ff', '#ff9fe0']);
    for (let i = 0, n = combo('diamond') ? 10 : 7; i < n; i++) playerShot(e.x, e.y, i / n * Math.PI * 2 + Math.random() * 0.5, { type: 'rock', mul: 0.7, r: 7, life: 0.4, hit: new Set([e]), color: c1, accent: c2 });
    fx.push({ kind: 'lstrike', x: e.x, y: e.y, c1, c2, gem: true, t: 0.45, max: 0.45, d: 0 });
  }
  // 파멸의소원: 맞힌 자리에 잠시 뒤 하늘에서 거대한 빛이 떨어진다
  if (hasFx('doom') && lcd('doom', 0.7)) {
    pstrikes.push({ x: e.x, y: e.y, t: 0.9, r: 80 * s, mul: 2.4, type: 'steel' });
    fx.push({ kind: 'lstrike', x: e.x, y: e.y, c1: '#d8e8ff', c2: '#ffffff', t: 1.3, max: 1.3, d: 0.85 });
    fx.push({ kind: 'lnova', x: e.x, y: e.y, r: 30, c1: '#a0b8ff', c2: '#ffffff', t: 0.9, max: 0.9 });
  }
  // 다크홀·옛노래: 적을 잠재운다 (잠든 적에게 피해 x1.3, 보스는 짧게)
  if (hasFx('void') && lcd('void', 0.6) && Math.random() < 0.35) {
    const m = lmove('void'), [c1, c2] = lcol(m, ['#301040', '#a070ff']), R = 90 * s;
    fx.push({ kind: 'lnova', x: e.x, y: e.y, r: R, c1, c2, t: 0.5, max: 0.5 });
    for (const o of [e, ...enemiesNear(e.x, e.y, R, e)]) { const t2 = isBig(o) ? 0.5 : 1.6; o.stun = Math.max(o.stun ?? 0, t2); o.sleep = p.time + t2 + 2; }
    say('잠들었다!', e.x, e.y - 60, c2);
  }
  // 심판의뭉치: 하늘에서 빛의 화살이 주위로 쏟아진다. 타입은 플레이트(아르세우스의 지금 타입)
  if (hasFx('judge') && lcd('judge', 0.4)) {
    const t = p.formType?.split(',')[0] ?? 'normal', c = TYPE_COLOR[t];
    for (let i = 0; i < 4; i++) {
      const x = e.x + (i ? Math.cos(i * 2.1) * 70 : 0), y = e.y + (i ? Math.sin(i * 2.1) * 45 : 0);
      pstrikes.push({ x, y, t: 0.15 + i * 0.08, r: 40 * s, mul: 0.8, type: t });
      fx.push({ kind: 'lstrike', x, y, c1: c, c2: '#ffffff', t: 0.4 + i * 0.08, max: 0.4 + i * 0.08, d: 0.1 + i * 0.08 });
    }
  }
  // 찬바람폭풍·번개폭풍·열사의폭풍: 맞힌 자리에 소용돌이 (느려짐·마비·화상)
  if (hasFx('storm') && lcd('storm', 0.3)) {
    const m = lmove('storm'), [c1, c2] = lcol(m, ['#a0d8ff', '#ffffff']), R = 80 * s;
    fx.push({ kind: 'lnova', x: e.x, y: e.y, r: R, c1, c2, t: 0.45, max: 0.45 });
    for (const o of [e, ...enemiesNear(e.x, e.y, R, e)]) {
      damage(o, p.dmg * 0.8, m.type, false, true);
      if (m.type === 'flying') o.slow = Math.max(o.slow ?? 0, 2); else if (m.type === 'electric' && Math.random() < 0.3) o.stun = Math.max(o.stun ?? 0, 0.6); else if (m.type === 'ground') o.burn = Math.max(o.burn ?? 0, 3);
    }
  }
  // V제너레이트: 맞힌 자리에서 작은 불꽃이 터진다
  if (hasFx('vcreate') && lcd('vcreate', 0.2)) {
    fx.push({ kind: 'boom', x: e.x, y: e.y, r: 45 * s, t: 0.25, max: 0.25, color: '#ff6020' });
    for (const o of enemiesNear(e.x, e.y, 45 * s, e)) damage(o, p.dmg * 0.6, 'fire', false, true);
    e.burn = Math.max(e.burn ?? 0, 2);
  }
  // 시간의포효: 공격할 때마다 일그러지는 파동이 퍼진다
  if (hasFx('timeStop') && lcd('roar', 0.9)) {
    fx.push({ kind: 'lnova', x: e.x, y: e.y, r: 110 * s, c1: '#4a70ff', c2: '#d8e4ff', t: 0.5, max: 0.5 });
    for (const o of [e, ...enemiesNear(e.x, e.y, 110 * s, e)]) damage(o, p.dmg * 0.9, 'dragon', false, true);
  }
  // 전설 기술 조합의 적중 효과
  if (combo('absolute') && e.frozen > 0 && Math.random() < 0.35) {
    e.frozen = 0; fx.push({ kind: 'lnova', x: e.x, y: e.y, r: 80 * s, c1: '#9fe8ff', c2: '#ffffff', t: 0.45, max: 0.45 }); say('산산조각!', e.x, e.y - 60, '#aef');
    for (const o of [e, ...enemiesNear(e.x, e.y, 80 * s, e)]) { damage(o, p.dmg * 1.5, 'ice', false, true); if (o !== e && o.hp > 0) o.frozen = Math.max(o.frozen ?? 0, 0.8); }
  }
  if (combo('eclipse')) {
    fx.push({ kind: 'boom', x: e.x, y: e.y, r: 40 * s, t: 0.2, max: 0.2, color: '#ffb040' });
    for (const o of enemiesNear(e.x, e.y, 40 * s, e)) damage(o, p.dmg * 0.5, 'steel', false, true);
  }
  if (combo('gaia') && p.surge > 0 && e.hp > 0) pstrikes.push({ x: e.x, y: e.y, t: 0.2, r: 45 * s, mul: 0.9, type: 'ground' });
  // 자연의분노·카타스트로피: 분홍(악은 검붉은) 구체가 짓눌러 체력을 절반으로
  if (hasFx('madness') && !big && e.hp > 0 && Math.random() < (combo('calamity') ? 0.4 : 0.28)) {
    const dark = has('ruination'); e.hp /= 2; say(dark ? '카타스트로피!' : '자연의 분노!', e.x, e.y - 60, '#f9c');
    fx.push({ kind: 'lnova', x: e.x, y: e.y, r: e.r + 50, c1: dark ? '#802040' : '#ff70c0', c2: '#ffd0f0', t: 0.45, max: 0.45 });
  }
}
// 광선형 전설 기술: 광선이 닿는 적마다 그 기술다운 것이 따로 터진다
// 포톤가이저: 발밑에서 빛기둥 / 테라클러스터: 별빛 기둥 / 푸른불꽃: 푸른 불기둥 / 무한다이빔·에어로블라스트·섀도레이: 광선 색의 폭발
function legendBeamHit(e) {
  const p = player, lb = [...p.moves].map(moveDef).filter(m => m?.legend && m.fx === 'beam').at(-1);
  if (!lb || !lcd('beamfx', 0.35)) return false;
  const pillar = { 'photon-geyser': ['#ffe880', '#ffffff'], 'tera-starstorm': ['#c0a0ff', '#fff8ff'], 'blue-flare': ['#40a0ff', '#e0f4ff'], scald: ['#60c0ff', '#ffffff'],
    'steam-eruption': ['#e0f0ff', '#ffffff'], 'light-that-burns-the-sky': ['#fff0a0', '#ffffff'] }[lb.id];
  if (pillar) fx.push({ kind: 'lstrike', x: e.x, y: e.y, c1: pillar[0], c2: pillar[1], t: 0.5, max: 0.5, d: 0 });
  else fx.push({ kind: 'lnova', x: e.x, y: e.y, r: 70, c1: TYPE_COLOR[lb.type], c2: '#ffffff', t: 0.4, max: 0.4 });
  const bt = lb.id === 'techno-blast' ? curForm()?.shotType ?? 'normal' : lb.type;
  for (const o of [e, ...enemiesNear(e.x, e.y, 60, e)]) damage(o, p.dmg * 0.9, bt, false, true);
  if (lb.id === 'blue-flare' || (lb.id === 'scald' || lb.id === 'steam-eruption') && Math.random() < 0.4) e.burn = Math.max(e.burn ?? 0, 3);
  return false;
}
