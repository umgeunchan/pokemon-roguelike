// 전설 기술의 연출: 원작 기술이 나가는 모습을 본떠서, 평소 공격이 맞을 때 터진다 (combat.js의 legendHit)
// 그림 종류: lrift(공간의 균열·칼날 궤적) · lstrike(빛기둥·낙뢰·솟는 바위) · lnova(퍼지는 파동) · lbeam(굵은 광선)
// 같은 효과가 너무 자주 겹치지 않게 효과마다 짧은 간격을 둔다
const lcd = (k, t) => { const p = player, c = p.lcd ??= {}; if ((c[k] ?? 0) > p.time) return false; c[k] = p.time + t; return true; };
const rift = (x, y, a, L, c1, c2, t = 0.4) => fx.push({ kind: 'lrift', x, y, x1: x - Math.cos(a) * L / 2, y1: y - Math.sin(a) * L / 2, x2: x + Math.cos(a) * L / 2, y2: y + Math.sin(a) * L / 2, c1, c2, t, max: t, seed: Math.random() * 1000 });
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


// ---------- 전설 기술이 맞았을 때 (평소 공격) ----------
// 원작 연출을 본떴다. 공간절단: 적 자리의 공간이 X자로 찢어짐 / 크로스썬더: 하늘에서 낙뢰 / 단애의칼: 땅에서 바위 칼날이 줄지어 솟음
// 시드플레어: 몸에서 빛이 터져 퍼짐 / 사이코브레이크: 적 둘레에 염동파가 모여 터짐 / 성스러운불꽃: 불기둥 / 메테오드라이브·거대검: 금빛 참격
// 자연의분노·카타스트로피: 분홍·붉은 구체가 짓누름 / 다이아스톰: 다이아가 흩날림 / 시간의포효: 일그러지는 파동
function legendHit(e, big) {
  const p = player, s = fxScale();
  // 크로스썬더·볼트로스 등: 하늘에서 내리꽂히는 낙뢰, 옆 적에게 번개가 이어짐
  if (hasFx('smite') && Math.random() < (combo('thundergod') ? 0.65 : 0.45)) {
    damage(e, p.dmg * 3, 'electric', false, true); e.stun = Math.max(e.stun ?? 0, 0.4);
    fx.push({ kind: 'lstrike', x: e.x, y: e.y, c1: '#ffe040', c2: '#ffffff', bolt: true, t: 0.4, max: 0.4, d: 0 }); shake = Math.max(shake, 0.12);
    for (const o of enemiesNear(e.x, e.y, 190, e).slice(0, combo('thundergod') ? 4 : 3)) { damage(o, p.dmg * 1.2, 'electric', false, true); fx.push({ kind: 'zap', x: e.x, y: e.y, x2: o.x, y2: o.y, t: 0.2 }); }
  }
  // 공간절단: 맞힌 자리의 공간이 X자로 찢어지고, 균열에 닿은 적을 모두 벤다 (차원 절단 조합이면 4줄, 범위·피해 x2)
  if (hasFx('rend') && lcd('rend', 0.18)) {
    const dim = combo('dimension'), L = 220 * s * (dim ? 1.6 : 1), a0 = Math.random() * Math.PI, n = dim ? 4 : 2;
    for (let i = 0; i < n; i++) {
      const a = a0 + i * Math.PI / n, x1 = e.x - Math.cos(a) * L / 2, y1 = e.y - Math.sin(a) * L / 2, x2 = e.x + Math.cos(a) * L / 2, y2 = e.y + Math.sin(a) * L / 2;
      rift(e.x, e.y, a, L, '#ff6ad5', '#ffe2f6', 0.45);
      for (const o of map.enemies) if (o !== e && o.hp > 0 && segDist(o.x, o.y, x1, y1, x2, y2) < 34 + o.r) damage(o, p.dmg * 1.1 * (dim ? 2 : 1), 'dragon', false, true);
    }
    damage(e, p.dmg * 0.6 * (dim ? 2 : 1), 'dragon', false, true);
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
    const R = 75 * s * (combo('bloom') ? 1.6 : 1);
    fx.push({ kind: 'lnova', x: e.x, y: e.y, r: R, c1: '#70e040', c2: '#f8ffb0', t: 0.45, max: 0.45 });
    for (const o of enemiesNear(e.x, e.y, R, e)) damage(o, p.dmg * 1.1 * (combo('bloom') ? 1.5 : 1), 'grass', false, true);
  }
  // 사이코브레이크·미스트볼·러스터퍼지: 적 둘레에 염동파가 모여들어 터진다
  if (hasFx('psy') && lcd('psy', 0.2)) {
    const R = 60 * s * (combo('psybreak') ? 1.5 : 1);
    fx.push({ kind: 'lnova', x: e.x, y: e.y, r: R, c1: '#ff60ff', c2: '#ffe0ff', t: 0.4, max: 0.4 });
    for (const o of [e, ...enemiesNear(e.x, e.y, R, e)]) damage(o, p.dmg * (combo('psybreak') ? 0.9 : 0.5), 'psychic', false, true);
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
    for (let i = 0, n = combo('diamond') ? 10 : 7; i < n; i++) playerShot(e.x, e.y, i / n * Math.PI * 2 + Math.random() * 0.5, { type: 'rock', mul: 0.7, r: 7, life: 0.4, hit: new Set([e]), color: '#e8f8ff', accent: '#ff9fe0' });
    fx.push({ kind: 'lstrike', x: e.x, y: e.y, c1: '#c8f0ff', c2: '#ff9fe0', gem: true, t: 0.45, max: 0.45, d: 0 });
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
  const pillar = { 'photon-geyser': ['#ffe880', '#ffffff'], 'tera-starstorm': ['#c0a0ff', '#fff8ff'], 'blue-flare': ['#40a0ff', '#e0f4ff'] }[lb.id];
  if (pillar) fx.push({ kind: 'lstrike', x: e.x, y: e.y, c1: pillar[0], c2: pillar[1], t: 0.5, max: 0.5, d: 0 });
  else fx.push({ kind: 'lnova', x: e.x, y: e.y, r: 70, c1: TYPE_COLOR[lb.type], c2: '#ffffff', t: 0.4, max: 0.4 });
  for (const o of [e, ...enemiesNear(e.x, e.y, 60, e)]) damage(o, p.dmg * 0.9, lb.type, false, true);
  if (lb.id === 'blue-flare') e.burn = Math.max(e.burn ?? 0, 3);
  return false;
}
