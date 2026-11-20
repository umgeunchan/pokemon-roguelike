// 전투: 피해 계산, 플레이어 공격, 적 행동과 기술 패턴, 야생 출현, 전설
// ---------- 전투 ----------
function say(text, x, y, color = '#fff') {
  if (textCd > 0 && texts.some(t => t.text === text)) return;
  texts.push({ text, x, y, t: 1.2, color }); textCd = 0.3;
}

const heal = n => player.hp = Math.min(player.maxHp, player.hp + n);

// 능력치가 바뀌면 왼쪽 창에 ▲▼로 잠깐 보여 준다. 안쪽에서 또 부르면(기술을 잊고 새로 배울 때 등) 바깥에서 한 번에 합쳐 보여 준다
let deltaDepth = 0;
function withDelta(fn) {
  const p = player, before = STATS.map(s => s[2](p));
  deltaDepth++;
  try { fn(p); } finally { deltaDepth--; }
  if (deltaDepth) return;
  STATS.forEach((s, i) => { const d = s[2](p) - before[i]; if (Math.abs(d) > 1e-6) p.deltas[i] = { v: d, t: 3 }; });
}

function hurt(type, amount = 1, src = null) {
  const p = player, who = src?.src ?? curEnemy, move = src?.move ?? who?.act?.name;
  if (p.inv > 0 || p.dash > 0 || p.vanish > 0 || state !== 'play') return;
  if (Math.random() < p.dodge) { p.inv = 0.5; return say('공격을 피했다!', p.x, p.y - 60, '#aef'); }
  // 거대방패: 8초마다 다시 차오르는 방패가 공격 한 번을 완전히 막는다
  if (hasFx('bulwark') && p.shieldUp) { p.shieldUp = false; p.shieldT = 8; p.inv = 0.6; fx.push({ kind: 'boom', x: p.x, y: p.y, r: 50, t: 0.25, max: 0.25, color: '#c8d4e8' }); sfx('crit'); return say('방패가 막아냈다!', p.x, p.y - 60, '#ccf'); }
  if (combo('fortress') && Math.random() < 0.2) { p.inv = 0.5; return say('강철 요새가 막아냈다!', p.x, p.y - 60, '#ccf'); }
  const m = eff(type, p.mon.types);
  let d = m === 0 ? 0 : amount + (m > 1 ? 1 : 0) + (who?.awake ? 1 : 0);  // 각성한 상대의 공격은 반 칸 더
  if (amount >= 2) d = Math.min(d, amount + 1);  // 필살기·큰 공격은 약점·각성이 겹쳐도 반 칸까지만 더
  // 쉬움 모드: 피해 절반 (반 칸 단위라 남는 반은 모아 두었다가 다음에 더한다)
  if (EASY && d > 0) { p.easyCarry = (p.easyCarry ?? 0) + d / 2; d = Math.floor(p.easyCarry); p.easyCarry -= d; if (d <= 0) { p.inv = p.invTime; return; } }
  if (hasFx('bulwark') && d > 0) { d -= 1; if (d === 0 && Math.random() < 0.5) d = 1; if (d === 0) { p.inv = 0.5; return say('막아냈다!', p.x, p.y - 60, '#ccf'); } }
  // 특성: 막거나 줄이거나 회복으로 바꾼다
  if (d > 0) { d = abHurt(type, d, who, src); if (d <= 0) { p.inv = 0.4; return; } }
  p.inv = p.invTime + abStat('inv', 0); p.streak = 0;
  // 사망 화면에 보여 줄 최근 맞은 공격 3개
  p.lastHits = [...(p.lastHits ?? []), { who: who?.mon.name, move, d, heavy: amount >= 2, type }].slice(-3); p.hits = (p.hits ?? 0) + 1;
  if (p.balloon && d > 0) { p.balloon = p.flying = false; say('풍선이 터졌다!', p.x, p.y - 80, '#f88'); unstick(p); }
  if (m > 1 && p.weaknessPolicy) { p.weaknessPolicy = false; withDelta(p => p.dmg += 0.6); say('약점보험 발동!', p.x, p.y - 90, '#ff8'); }
  if (d > 0) sfx('hurt');
  if (p.hp - d <= 0 && p.sash) { p.sash = false; p.hp = 1; say('기합의띠로 버텼다!', p.x, p.y - 60, '#ff8'); }
  else p.hp -= d;
  if (m > 1) say('효과가 굉장했다!', p.x, p.y - 60, '#f66');
  if (p.hp <= 0 && p.revive) { p.revive = false; p.hp = p.maxHp; banner = { text: '무지개깃털이 빛나며 다시 일어섰다!', t: 3 }; }
  if (p.hp <= 0 && map.sub === 'hoopa') { p.hoopaLost = who?.mon.name ?? '전설의 포켓몬'; state = 'win'; return; }  // 챔피언은 이미 됐다: 져도 챔피언 결과 화면으로
  if (p.hp <= 0) { p.cause = who ? `${who.rank === 'trainer' || who.rank === 'boss' ? '상대 ' : who.rank === 'legend' ? '전설의 포켓몬 ' : '야생 '}${who.mon.name}의 ${move ?? '공격'}` : `${TYPE_KO[type]} 타입 공격`; state = 'dead'; clearSave(); ach('die'); checkAch(); }
}

const nearestEnemy = (x, y, except, maxD) => map.enemies.filter(e => e !== except && e.hp > 0 && !untargetable(e) && Math.hypot(e.x - x, e.y - y) < maxD)
  .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
const enemiesNear = (x, y, rad, except) => map.enemies.filter(o => o !== except && o.hp > 0 && Math.hypot(o.x - x, o.y - y) < rad + o.r);

// tick: 광선처럼 짧은 간격으로 들어가는 피해. secondary: 다른 효과가 만든 피해라 또 연쇄하지 않음
function damage(e, base, type, tick = false, secondary = false, extraCrit = 0) {
  if (e.hp <= 0 || untargetable(e)) return;
  // 전설은 제 장소 안에서만 싸울 수 있다 (장소 밖에서 쏘아 맞히는 꼼수 방지)
  if (outsideLegendHome(e)) { if (!tick) say('전설의 기운에 막혔다', e.x, e.y - 70, '#c8f'); return; }
  const p = player, raw = eff(type, e.mon.types), big = isBig(e), near = Math.hypot(e.x - p.x, e.y - p.y) < 110 + e.r, dot = e.burn > 0 || e.psn > 0;
  // shortcut: 면역(0배)도 0.25배로 처리해서 못 잡는 적이 없게 함
  // 늘 붙는 기술 보너스는 moveDmgMul(능력치 창의 공격에 보이는 값), 여기서는 조건이 붙는 것만 더 곱한다
  let d = base * moveDmgMul() * Math.max(raw, 0.25) * (raw > 1 && p.expert ? 1.3 : 1) * (p.metronome ? 1 + Math.min(p.streak, 20) * 0.03 : 1) * (e.frozen > 0 ? 1.5 : 1)
    * (hasFx('blade') && big ? 1.4 : 1) * (hasFx('madness') && big ? (combo('calamity') ? 1.5 : 1.25) : 1) * (has('moonblast') && big ? 1.3 : 1) * (has('earth-power') && big ? 1.25 : 1)
    * (combo('scorch') && dot ? 1.4 : 1) * (combo('quake') && big ? 1.35 : 1) * (combo('dragon') ? 1.25 : 1) * (combo('mind') && e.stun > 0 ? 1.5 : 1)
    * stab(type) * zTypeMul(type) * abDamageMul(type, near) * (has('close-combat') && near ? 1.4 : 1) * (has('play-rough') && near ? 1.4 : 1) * (e.broken > 0 ? 1.2 : 1) * (p.surge > 0 ? 1.5 : 1)
    * (combo('inferno') && e.burn > 0 ? 1.5 : 1) * (combo('timewarp') && timeStop > 0 ? 2 : 1);
  const crit = Math.random() < p.crit + extraCrit + moveCrit() + (combo('venom') && e.psn > 0 ? 0.25 : 0);
  if (crit) d *= (has('crunch') ? 2.2 : 1.5) * (abStat('sniper', false) ? 1.5 : 1);
  if (crit && combo('fang') && !tick && Math.random() < 0.15) heal(1);
  if (e.battle || e.rank === 'legend') p.fD = (p.fD ?? 0) + Math.min(d, Math.max(0, e.hp));
  e.hp -= d; e.hit = 0.1; e.aggro = true;
  if (!tick) sfx(crit ? 'crit' : 'hit');
  if (hasFx('drain') && (p.drain2 += d) >= (combo('deathwing') ? 6 : 12)) { p.drain2 -= combo('deathwing') ? 6 : 12; heal(1); fx.push({ kind: 'boom', x: p.x, y: p.y - 20, r: 26, t: 0.25, max: 0.25, color: '#e04050' }); }
  if (combo('vine') && (p.drain += d) >= 25) { p.drain -= 25; heal(1); say('체력을 흡수했다!', p.x, p.y - 60, '#8f8'); }
  if (!tick) {
    const msg = crit ? '급소에 맞았다!' : raw > 1 ? '효과가 굉장했다!' : raw === 0 ? '효과가 없는 것 같다...' : raw < 1 ? '효과가 별로인 듯하다' : null;
    if (msg) say(msg, e.x, e.y - 70, raw > 1 ? '#ff4' : '#ccc');
  }
  if (secondary) return;
  p.streak++;
  // proc: 광선처럼 촘촘히 들어가는 피해는 확률 효과를 낮춰서 건다. ride: 원뿔 기술의 적중 효과는 공격 방식이 원뿔이 아닐 때만 따로 얹는다 (원뿔이면 원뿔 자체가 그 효과)
  const proc = tick ? 0.12 : 1, ride = carrier() !== 'cone', s = fxScale();
  // 도깨비불·오물폭탄: 모든 공격에 불·독이 얹힌다
  if (has('will-o-wisp') && Math.random() < (tick ? 0.3 : 1)) { e.burn = Math.max(e.burn, 3); damage(e, base * 0.15 * (combo('blueblaze') ? 4 : 1), 'fire', true, true); }
  if (has('sludge-bomb') && Math.random() < (tick ? 0.3 : 1)) { e.psn = Math.max(e.psn ?? 0, 4); damage(e, base * 0.15, 'poison', true, true); }
  if (has('sludge-bomb') && Math.random() < 0.15 * proc) puddles.push({ x: e.x, y: e.y, r: 40 * s, t: 2.5, tick: 0 });
  if (has('flamethrower') && Math.random() < 0.5 * proc) e.burn = Math.max(e.burn, 2);
  if (hasFx('holyBurn') && Math.random() < proc) { e.burn = 4; e.holy = true; }
  if (has('icy-wind') && Math.random() < proc) e.slow = 2;
  if (has('ice-beam') && Math.random() < 0.15 * proc) { e.frozen = 1; say('얼어붙었다!', e.x, e.y - 50, '#aef'); }
  if (has('dark-pulse') && Math.random() < 0.2 * proc) { e.stun = 0.6; say('풀죽었다!', e.x, e.y - 50, '#ccc'); }
  if (has('air-slash') && Math.random() < 0.25 * proc) { e.stun = 0.5; say('풀죽었다!', e.x, e.y - 50, '#ccc'); }
  if (hasFx('freeze') && Math.random() < 0.35 * proc) { e.frozen = 1.5; say('얼어붙었다!', e.x, e.y - 50, '#aef'); }
  if (p.kingsRock && Math.random() < 0.1 * proc) { e.stun = 0.8; say('풀죽었다!', e.x, e.y - 50, '#ccc'); }
  if (has('blizzard') && Math.random() < 0.1 * proc) { for (const o of [e, ...enemiesNear(e.x, e.y, 90 * s, e)]) o.frozen = 1.2; say('눈보라에 얼어붙었다!', e.x, e.y - 50, '#aef'); }
  if (combo('zero') && e.slow > 0 && Math.random() < 0.3 * proc) { e.frozen = 1; say('얼어붙었다!', e.x, e.y - 50, '#aef'); }
  if (has('rock-slide') && Math.random() < 0.3 * proc) for (let i = 0; i < 3; i++) pstrikes.push({ x: e.x + Math.random() * 100 - 50, y: e.y + Math.random() * 100 - 50, t: 0.4 + i * 0.1, r: 40 * s });
  if (has('crunch')) e.broken = 3;
  if (has('moonblast') && Math.random() < (combo('lunar') ? 0.5 : 0.2) * proc) { e.weak = 4; say('공격이 뜸해졌다!', e.x, e.y - 50, '#fbd'); }
  if (has('earth-power') && Math.random() < 0.25 * proc) pstrikes.push({ x: e.x, y: e.y, t: 0.25, r: 45 * s, mul: 0.9, type: 'ground' });
  if (has('stone-edge') && crit) pstrikes.push({ x: e.x, y: e.y, t: 0.1, r: 55 * s, mul: 1, type: 'rock' });
  if (combo('meteor') && crit) for (let i = 0; i < 3; i++) pstrikes.push({ x: e.x + Math.random() * 120 - 60, y: e.y + Math.random() * 120 - 60, t: 0.35 + i * 0.12, r: 45 * s, mul: 1, type: 'rock' });
  if (combo('ironfist') && near) e.stun = Math.max(e.stun, 0.4);
  if (has('thunder-wave') && Math.random() < 0.25 * proc) { e.stun = Math.max(e.stun, 1); say('마비되었다!', e.x, e.y - 50, '#ff8'); }
  // 원뿔 기술의 효과를 다른 공격 방식에 얹을 때: 지진 충격파, 벌레의야단법석 음파
  if (ride && has('earthquake') && Math.random() < proc * 0.6) {
    const R = (combo('rift') ? 180 : 90) * s;
    fx.push({ kind: 'ring', x: e.x, y: e.y, t: 0.3, max: 0.3 });
    for (const o of enemiesNear(e.x, e.y, R, e)) if (!o.flying || combo('rift')) damage(o, p.dmg * 0.5, 'ground', false, true);
  }
  if (ride && has('bug-buzz') && !tick && (p.buzz = (p.buzz ?? 0) + 1) % 5 === 0) {
    fx.push({ kind: 'ring', x: p.x, y: p.y, t: 0.35, max: 0.35 });
    for (const o of enemiesNear(p.x, p.y, 120 * s)) { damage(o, p.dmg * 0.5, 'bug', false, true); if (!isBig(o)) { const d2 = Math.hypot(o.x - p.x, o.y - p.y) || 1; moveBody(o, (o.x - p.x) / d2 * 50, (o.y - p.y) / d2 * 50); } }
  }
  // 전기자석파: 옆의 적에게 전기가 튄다 (자력선 조합이면 2마리 더)
  if (has('thunder-wave') && Math.random() < (tick ? 0.15 : 1)) {
    let from = e;
    const done = new Set([e]);
    for (let k = 0; k < (combo('magnet') ? 3 : 1); k++) {
      const o = map.enemies.filter(o => !done.has(o) && o.hp > 0 && !untargetable(o) && Math.hypot(o.x - from.x, o.y - from.y) < (combo('storm') ? 260 : 160) * s)
        .sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y))[0];
      if (!o) break;
      damage(o, p.dmg * (combo('storm') ? 1.2 : 0.6), 'electric', false, true); fx.push({ kind: 'zap', x: from.x, y: from.y, x2: o.x, y2: o.y, t: 0.15 });
      done.add(o); from = o;
    }
  }
  if (has('dragon-pulse') && Math.random() < (tick ? 0.06 : 1)) {
    fx.push({ kind: 'boom', x: e.x, y: e.y, r: 45 * s, t: 0.2, max: 0.2, color: TYPE_COLOR.dragon });
    for (const o of enemiesNear(e.x, e.y, 45 * s, e)) damage(o, p.dmg * 0.5, 'dragon', false, true);
  }
  // 번개: 벼락. 천둥 폭풍이면 두 배, 뇌신이면 마비된 적에게는 거의 반드시
  if (has('thunder') && Math.random() < 0.15 * (combo('tempest') ? 2 : 1) * (combo('raijin') && e.stun > 0 ? 6 : 1) * (tick ? 0.3 : 1)) {
    fx.push({ kind: 'boom', x: e.x, y: e.y, r: 75 * s, t: 0.3, max: 0.3, color: TYPE_COLOR.electric }); fx.push({ kind: 'zap', x: e.x, y: e.y - 220, x2: e.x, y2: e.y, t: 0.2 }); shake = 0.12;
    for (const o of [e, ...enemiesNear(e.x, e.y, 75 * s, e)]) damage(o, p.dmg * 1.5, 'electric', false, true);
  }
  if (tick) return;
  // 구슬: 맞은 자리에서 폭발 (에너지볼은 더 넓게)
  if (orbCount()) {
    const R = 50 * s * (has('energy-ball') ? 1.4 : 1), ot = moveDef(lastOf(ORBS)).type;
    fx.push({ kind: 'boom', x: e.x, y: e.y, r: R, t: 0.22, max: 0.22, color: p.pcol?.[0] ?? TYPE_COLOR[ot] });
    for (const o of enemiesNear(e.x, e.y, R, e)) damage(o, p.dmg * 0.55, ot, false, true);
  }
  if (has('dragon-claw')) {
    fx.push({ kind: 'slash', x: e.x, y: e.y, t: 0.2, max: 0.2 });
    for (const o of [e, ...enemiesNear(e.x, e.y, 50 * s, e)]) damage(o, p.dmg * 0.35, 'dragon', true, true);
  }
  if (hasFx('shard') && Math.random() < (combo('diamond') ? 0.6 : 0.3)) for (let i = 0, n = combo('diamond') ? 10 : 6; i < n; i++) playerShot(e.x, e.y, i / n * Math.PI * 2 + Math.random() * 0.5, { type: 'rock', mul: 0.5, r: 6, life: 0.35, hit: new Set([e]), color: '#e8f8ff', accent: '#ff9fe0' });
  // 전설의 기술 효과
  if (hasFx('smite') && Math.random() < (combo('thundergod') ? 0.6 : 0.35)) {
    damage(e, p.dmg * 2.5, 'electric', false, true);
    fx.push({ kind: 'zap', x: e.x, y: e.y - 220, x2: e.x, y2: e.y, t: 0.2 });
    for (const o of enemiesNear(e.x, e.y, 170, e).slice(0, combo('thundergod') ? 4 : 2)) { damage(o, p.dmg, 'electric', false, true); fx.push({ kind: 'zap', x: e.x, y: e.y, x2: o.x, y2: o.y, t: 0.2 }); }
  }
  if (hasFx('rend')) {
    fx.push({ kind: 'slash', x: e.x, y: e.y, t: 0.25, max: 0.25 });
    const R = 110 * s * (combo('dimension') ? 1.6 : 1);
    for (const o of enemiesNear(e.x, e.y, R, e)) damage(o, p.dmg * 0.7 * (combo('dimension') ? 1.5 : 1), 'dragon', false, true);
  }
  if (hasFx('erupt') && p.eruptCd <= 0) {
    const tc = combo('tectonic');
    p.eruptCd = tc ? 0.2 : 0.35;
    const d0 = Math.hypot(e.x - p.x, e.y - p.y) || 1, ux = (e.x - p.x) / d0, uy = (e.y - p.y) / d0;
    for (let i = 0; i < (tc ? 7 : 4); i++) pstrikes.push({ x: e.x + ux * 55 * i, y: e.y + uy * 55 * i, t: 0.08 + i * 0.1, r: 45 * s * (tc ? 1.35 : 1), mul: 1.2, type: 'ground' });
  }
  if (hasFx('flare')) {
    const R = 55 * s * (combo('bloom') ? 1.6 : 1);
    fx.push({ kind: 'boom', x: e.x, y: e.y, r: R, t: 0.25, max: 0.25, color: TYPE_COLOR.grass });
    for (const o of enemiesNear(e.x, e.y, R, e)) damage(o, p.dmg * 0.8 * (combo('bloom') ? 1.5 : 1), 'grass', false, true);
  }
  // 전설 기술 조합의 적중 효과
  if (combo('psybreak')) {
    fx.push({ kind: 'boom', x: e.x, y: e.y, r: 50 * s, t: 0.22, max: 0.22, color: '#ff60ff' });
    for (const o of enemiesNear(e.x, e.y, 50 * s, e)) damage(o, p.dmg * 0.6, 'psychic', false, true);
  }
  if (combo('absolute') && e.frozen > 0 && Math.random() < 0.35) {
    e.frozen = 0; fx.push({ kind: 'boom', x: e.x, y: e.y, r: 80 * s, t: 0.3, max: 0.3, color: '#e8ffff' }); say('산산조각!', e.x, e.y - 60, '#aef');
    for (const o of [e, ...enemiesNear(e.x, e.y, 80 * s, e)]) { damage(o, p.dmg * 1.5, 'ice', false, true); if (o !== e && o.hp > 0) o.frozen = Math.max(o.frozen ?? 0, 0.8); }
  }
  if (combo('eclipse')) {
    fx.push({ kind: 'boom', x: e.x, y: e.y, r: 40 * s, t: 0.2, max: 0.2, color: '#ffb040' });
    for (const o of enemiesNear(e.x, e.y, 40 * s, e)) damage(o, p.dmg * 0.5, 'steel', false, true);
  }
  if (combo('gaia') && p.surge > 0 && e.hp > 0) pstrikes.push({ x: e.x, y: e.y, t: 0.2, r: 45 * s, mul: 0.9, type: 'ground' });
  if (hasFx('madness') && !big && e.hp > 0 && Math.random() < (combo('calamity') ? 0.35 : 0.2)) { e.hp /= 2; say('자연의 분노!', e.x, e.y - 60, '#f9c'); fx.push({ kind: 'boom', x: e.x, y: e.y, r: e.r + 30, t: 0.35, max: 0.35, color: '#c04090' }); fx.push({ kind: 'ring', x: e.x, y: e.y, t: 0.35, max: 0.35 }); }
}

// 광선: 가장 최근에 배운 광선 기술의 타입으로 나가고, 위력·굵기·차징은 가진 광선 기술 중 센 쪽을 따른다
function beamCfg() {
  const last = lastOf(BEAMS);
  let type = last ? moveDef(last).type : 'normal', mul = 1, wm = 1, cm = 1, crit = 0;
  if (has('hyper-beam')) { mul = Math.max(mul, 1.8); wm *= 1.4; cm *= 1.3; }
  if (has('dragon-pulse')) mul = Math.max(mul, 1.3);
  if (has('hydro-pump')) { mul = Math.max(mul, 1.25); wm *= 1.2; }
  if (has('thunder')) mul = Math.max(mul, 1.2);
  if (has('aeroblast')) { type = 'flying'; mul = Math.max(mul, 1.5); cm *= 0.5; crit = 0.3; }
  if (has('moongeist-beam')) { type = 'ghost'; mul = Math.max(mul, 2); }
  if (has('blue-flare')) { type = 'fire'; mul = Math.max(mul, 2.2); }
  if (has('eternabeam')) { type = 'dragon'; mul = Math.max(mul, 2.6); wm *= 1.8; cm *= 1.5; }
  if (combo('lunar')) mul *= 1.4;
  if (combo('dynamax')) { cm *= 0.6; wm *= 1.3; }
  return { type, mul, wm: wm * fxScale(), cm, crit };
}
// 공격 방식: 알폭탄 > 광선 > 레이저 > 원뿔 > 보통 탄
function carrier() { return carrierOf([...player.moves]); }
// 이 기술들을 가졌을 때의 공격 방식 (볼 근처에서 "공격 방식: 보통 탄 → 광선" 미리 보기에도 쓴다)
function carrierOf(ids) {
  const h = id => ids.includes(id);
  return h('egg-bomb') ? 'bomb' : BEAMS.some(h) || ids.some(id => moveDef(id)?.fx === 'beam') ? 'beam' : LASERS.some(h) ? 'laser' : CONES.some(h) ? 'cone' : 'tear';
}
const CARRIER_KO = { bomb: '알폭탄', beam: '광선', laser: '레이저', cone: '원뿔', tear: '보통 탄' };
const shotScale = () => clamp(1 + (player.dmg * legendPow - 3) * 0.05, 1, 2);
const spread = () => has('pin-missile') ? [-0.26, 0, 0.26] : has('razor-leaf') ? [-0.12, 0.12] : [0];
const chargeTime = () => player.fireDelay * 2.2 * beamCfg().cm * (has('bullet-seed') ? 0.6 : 1);

function aimAngle(sd) {
  const p = player, e = homing() && nearestEnemy(p.x, p.y, null, 420);
  return e ? Math.atan2(e.y - p.y, e.x - p.x) : Math.atan2(sd[1], sd[0]);
}

// 유도 세기: 사이코 계열 > 스피드스타. 탄·알·광선·레이저(알에서 나온 것 포함) 모두 같은 값을 쓴다
const homing = () => hasFx('psy') ? 9 : has('swift') ? 5 : 0;
function shootTear(a, extra = {}) {
  const p = player, sp = p.shotSpeed * moveShot(), psy = hasFx('psy'), orb = orbCount() > 0;
  if (has('bullet-seed')) a += (Math.random() - 0.5) * 0.16;  // 씨앗은 조금씩 흩어진다
  tears.push({ x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: p.range, life0: p.range, r: ((orb ? 17 : 7) + (hasFx('blade') ? 3 : 0)) * shotScale() * fxScale(), from: 'p', type: p.type,
    pierce: has('shadow-ball') || has('psychic') || psy || has('x-scissor') || hasFx('blade'), ghost: has('shadow-ball') || p.ghostShot, boom: has('psychic'), home: homing(), hit: new Set(),
    xs: has('x-scissor') ? 1 : 0, blade: has('air-slash'), split2: combo('skyfall'), fire: has('will-o-wisp'), psn: has('sludge-bomb'), color: p.pcol?.[0], accent: p.pcol?.[1],
    mul: (has('bullet-seed') ? 0.55 : 1) * (psy ? 1.4 : 1) * (has('razor-leaf') && !has('pin-missile') ? 0.7 : 1), ...extra });
}
// 플레이어 쪽 탄을 아무 자리에서나 쏜다 (파편, 갈라지는 탄)
function playerShot(x, y, a, o = {}) {
  const p = player, sp = p.shotSpeed * moveShot(), life = o.life ?? p.range;
  tears.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life, life0: life, r: 7, from: 'p', type: p.type, hit: new Set(), mul: 1, color: p.pcol?.[0], accent: p.pcol?.[1], ...o });
}

// 레이저(10만볼트·냉동빔): 아이작의 테크놀로지처럼 쏠 때마다 가늘고 긴 선이 한 번 지나가며 닿은 적을 모두 꿰뚫는다
const laserType = () => moveDef(lastOf(LASERS) ?? 'thunderbolt').type;
function fireLaser(a, o = {}) {
  const p = player;
  beams.push({ a, laser: true, ltype: laserType(), t: 0.2, t0: 0.2, tick: 0, w: 7 * fxScale(), len: Math.min(560, p.range * p.shotSpeed * 1.5) * kindScale(), bounce: combo('psyspark'), ...o });
}
function laserHits(b) {
  const p = player, pts = b.pts = beamPath(b), [x0, y0] = pts[0];
  const hit = map.enemies.filter(e => e.hp > 0 && !untargetable(e) && pts.some(([x, y]) => Math.hypot(e.x - x, e.y - y) < b.w / 2 + e.r))
    .sort((u, v) => Math.hypot(u.x - x0, u.y - y0) - Math.hypot(v.x - x0, v.y - y0));
  let m = 1;
  for (const e of hit) { damage(e, p.dmg * (b.mul ?? 1) * m, b.ltype); if (has('x-scissor')) m = Math.min(m * 2, 16); }  // 시저크로스: 꿰뚫을 때마다 2배
}

// 원뿔(얼다바람·지진·파도타기·매지컬샤인·스톤샤워·눈보라·벌레의야단법석·대지의힘): 탄 대신 앞쪽 부채꼴을 한 번에 친다
// 가장 최근에 배운 원뿔 기술의 타입으로 맞고, 가진 원뿔 기술의 효과는 모두 얹힌다
function fireCone(a, o = {}) {
  const p = player, s = fxScale(), type = moveDef(lastOf(CONES) ?? 'icy-wind').type;
  const len = (120 + p.range * p.shotSpeed * 0.3) * s * (has('bug-buzz') ? 1.25 : 1) * (combo('rift') ? 1.5 : 1);
  const half = o.half ?? (has('surf') ? 0.62 : 0.45) * (1 + 0.25 * (spread().length - 1));
  fx.push({ kind: 'cone', x: p.x, y: p.y, a, len, half, t: 0.28, max: 0.28, color: p.pcol?.[0] ?? TYPE_COLOR[type], accent: p.pcol?.[1] ?? '#ffffff' });
  if (has('earthquake')) shake = 0.15;
  for (const e of [...map.enemies]) {
    if (e.hp <= 0 || untargetable(e)) continue;
    const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
    if (d > len + e.r) continue;
    const off = Math.abs(((Math.atan2(dy, dx) - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (off > half + Math.atan2(e.r, d) || losBlocked(p.x, p.y, e.x, e.y)) continue;
    const quake = !has('earthquake') ? 1 : e.flying && !combo('rift') ? 0.5 : 1.4;
    damage(e, p.dmg * 1.1 * quake * (o.mul ?? 1), type);
    if (isBig(e) || e.act || e.hp <= 0) continue;
    if (combo('psychill')) moveBody(e, -dx / d * 60, -dy / d * 60);  // 염동 냉기: 끌어당긴다
    else if (has('surf') || has('bug-buzz')) moveBody(e, dx / d * (has('surf') ? 70 : 40), dy / d * (has('surf') ? 70 : 40));
  }
  if (has('rock-slide') && !o.half) for (let i = 0; i < 3; i++) { const r = len * (0.4 + Math.random() * 0.6), aa = a + (Math.random() * 2 - 1) * half; pstrikes.push({ x: p.x + Math.cos(aa) * r, y: p.y + Math.sin(aa) * r, t: 0.3 + i * 0.12, r: 40 * s, mul: 0.8, type: 'rock' }); }
}

const beamWidth = () => ((has('shadow-ball') ? 32 : 20) + (LASERS.some(has) ? 10 : 0)) * beamCfg().wm * shotScale();
// 지금 공격 방식(탄·레이저·광선·원뿔·알) 그대로 a 방향으로 한 번 더 쏜다. 유전자쐐기(뒤로 한 발)·매지컬샤인(사방)·근원의파동(5갈래)이 모든 공격 방식에 적용되게
// o.mul: 위력 배수, o.tear: 보통 탄일 때 덮어쓸 탄 속성, o.wide: 원뿔일 때 여러 갈래 대신 넓은 원뿔 하나(반각)
function fireAt(kind, a, o = {}) {
  const p = player, mul = o.mul ?? 1;
  if (kind === 'tear') shootTear(a, o.tear ?? {});
  else if (kind === 'laser') fireLaser(a, { mul });
  else if (kind === 'beam') beams.push({ a, t: 0.4, tick: 0, w: beamWidth() * (mul < 1 ? 0.6 : 1), bounce: combo('psyflame'), mul });
  else if (kind === 'cone') fireCone(a, { mul, half: o.wide });
  else if (kind === 'bomb') { const d = p.range * p.shotSpeed * 0.5; bombs.push({ sx: p.x, sy: p.y, x: p.x, y: p.y, z: 0, t: 0, dur: 0.45, tx: p.x + Math.cos(a) * d, ty: p.y + Math.sin(a) * d, mini: mul < 1 }); }
}

function attack(dt) {
  const p = player, kind = carrier();
  const sd = keys.ArrowUp ? [0, -1] : keys.ArrowDown ? [0, 1] : keys.ArrowLeft ? [-1, 0] : keys.ArrowRight ? [1, 0] : null;
  if (sd && sd[0]) p.flip = sd[0] > 0;
  if (sd) p.face = faceRow(sd[0], sd[1]);
  // 어떤 공격 방식이든 공격할 때마다 붙는 추가 공격
  const waves = base => {
    if (hasFx('fan5')) {
      const offs = combo('tsunami') ? [-1.05, -0.7, -0.35, 0.35, 0.7, 1.05] : [-0.7, -0.35, 0.35, 0.7], m = combo('tsunami') ? 1.2 : 0.8;
      if (kind === 'cone') fireCone(base, { mul: m, half: Math.max(...offs) + 0.3 });  // 원뿔은 갈래 대신 아주 넓은 원뿔 하나
      else for (const off of offs) fireAt(kind, base + off, { mul: m, tear: { r: combo('tsunami') ? 16 : 11, pierce: true, type: 'water', mul: m } });
    }
    if (combo('tidal') && (p.tide = (p.tide ?? 0) + 1) % 6 === 0) {
      fx.push({ kind: 'wave', x: p.x, y: p.y, t: 0.45, max: 0.45 });
      for (const o of enemiesNear(p.x, p.y, 150 * fxScale())) { damage(o, p.dmg * 0.6, 'water', false, true); if (!isBig(o)) { const d2 = Math.hypot(o.x - p.x, o.y - p.y) || 1; moveBody(o, (o.x - p.x) / d2 * 90, (o.y - p.y) / d2 * 90); } }
    }
    // 매지컬샤인: 4번째(요정의 장난이면 3번째) 공격마다 사방으로 빛. 유전자쐐기가 있으면 매 공격마다
    if (has('dazzling-gleam') && (p.backShot || (p.shots = (p.shots ?? 0) + 1) % (combo('prank') ? 3 : 4) === 0)) {
      // 원뿔이면 내 둘레 전체를 한 번에, 나머지는 지금 공격 방식으로 8방향
      if (kind === 'cone') fireCone(base, { mul: 0.6, half: Math.PI });
      else for (let i = 0; i < 8; i++) fireAt(kind, base + i / 8 * Math.PI * 2, { mul: 0.6, tear: { type: 'fairy', mul: 0.6, freeze: combo('aurora') ? 0.3 : 0 } });
    }
  };
  if (kind === 'beam') {
    // 혈사포처럼: 누르고 있으면 충전, 다 찬 상태에서 떼면 발사
    if (sd) { p.charge = Math.min(p.charge + dt, chargeTime()); p.aim = sd; return; }
    if (p.charge >= chargeTime()) {
      // 광선은 누른 방향으로 나가서 휘어 들어간다(beamPath). 처음부터 적을 조준하면 곧은 선이 된다
      const base = Math.atan2(p.aim[1], p.aim[0]), w = beamWidth();
      for (const off of spread()) beams.push({ a: base + off, t: 0.4, tick: 0, w, bounce: combo('psyflame') });
      if (p.backShot) beams.push({ a: base + Math.PI, t: 0.4, tick: 0, w, bounce: combo('psyflame') });
      sfx('beam'); p.fired = true;
      waves(base);
    }
    p.charge = 0;
    return;
  }
  if (!sd || p.cd > 0) return;
  sfx('shot'); p.fired = true;
  const base = kind === 'bomb' ? aimAngle(sd) : Math.atan2(sd[1], sd[0]);
  if (kind === 'cone') fireCone(base);
  else for (const off of spread()) {
    const a = base + off;
    if (kind === 'bomb') {
      // 유도 기술이 있으면 알이 날아가는 동안 목표를 따라간다
      const target = homing() && nearestEnemy(p.x, p.y, null, 420), dist = target ? Math.hypot(target.x - p.x, target.y - p.y) : p.range * p.shotSpeed * 0.7;
      bombs.push({ sx: p.x, sy: p.y, x: p.x, y: p.y, z: 0, t: 0, dur: 0.55, tx: p.x + Math.cos(a) * dist, ty: p.y + Math.sin(a) * dist, target });
    } else if (kind === 'laser') fireLaser(a);
    else shootTear(a);
  }
  waves(base);
  // 유전자쐐기: 어떤 공격 방식이든 뒤로도 한 번 더 (바늘미사일·잎날가르기 갈래도 함께)
  if (p.backShot) for (const off of kind === 'cone' ? [0] : spread()) fireAt(kind, base + Math.PI + off);
  p.cd = p.fireDelay * (kind === 'bomb' ? 1.8 : kind === 'cone' ? 1.15 : 1) * moveRate() / (combo('gale') ? 1.25 : 1);
}

// 플레이어 광선·레이저는 장애물을 지나가고 건물/벽에서 멈춘다. 적의 광선은 장애물에도 막혀서 숨으면 피할 수 있다
// 경로: 12px씩 나아가며, 유도 기술(스피드스타·사이코 계열)이 있으면 앞쪽의 가장 가까운 적으로 조금씩 휜다
// bounce(염동 화염·염동 전류): 벽에 막히거나 끝에 닿으면 한 번 꺾여 되돌아온다
function beamPath(b) {
  const p = player, home = hasFx('psy') ? 0.08 : has('swift') ? 0.05 : 0, len = b.len ?? 520 * kindScale();
  let x = b.ox ?? p.x, y = b.oy ?? p.y, a = b.a, turned = !b.bounce, s = 0, limit = len;
  const pts = [[x, y]];
  while (s < limit) {
    const t = home && nearestEnemy(x, y, null, 260);
    if (t) { const d = ((Math.atan2(t.y - y, t.x - x) - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI; if (Math.abs(d) < 1.6) a += clamp(d, -home, home); }
    const nx = x + Math.cos(a) * 12, ny = y + Math.sin(a) * 12;
    s += 12;
    if (shotBlocked(Math.floor(nx / TS), Math.floor(ny / TS), true)) { if (turned) break; turned = true; a += Math.PI; limit = s + len * 0.6; continue; }
    x = nx; y = ny; pts.push([x, y]);
    if (s >= limit && !turned) { turned = true; a += Math.PI; limit = s + len * 0.6; }
  }
  return pts;
}

function beamLen(ox, oy, dx, dy, blockedByObstacles = false) {
  for (let s = 0; s < 520; s += 12) if (shotBlocked(Math.floor((ox + dx * s) / TS), Math.floor((oy + dy * s) / TS), !blockedByObstacles)) return s;
  return 520;
}

function explode(b) {
  const p = player, s = fxScale(), rad = (has('shadow-ball') ? 80 : 56) * (b.mini ? 0.6 : 1) * s;
  fx.push({ kind: 'boom', x: b.x, y: b.y - b.z * 0.5, r: rad, t: 0.25, max: 0.25, color: p.pcol?.[0] });
  for (const e of map.enemies) if (Math.hypot(e.x - b.x, e.y - b.y) < rad + e.r) damage(e, p.dmg * 2.5 * (has('bullet-seed') ? 0.55 : 1) * (b.mini ? 0.45 : 1), 'normal');
  if (b.mini) return;
  const n = combo('eggfire') ? 8 : 4;
  if (BEAMS.some(has) || hasFx('beam')) for (let i = 0; i < n; i++) beams.push({ ox: b.x, oy: b.y, a: i * Math.PI * 2 / n, t: 0.3, tick: 0, w: 16 * s, bounce: combo('psyflame') });
  if (LASERS.some(has)) for (let i = 0; i < 4; i++) fireLaser(i * Math.PI / 2 + Math.PI / 4, { ox: b.x, oy: b.y, len: 300 });
  if (combo('eggstorm')) for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + Math.random(); bombs.push({ sx: b.x, sy: b.y, x: b.x, y: b.y, z: 0, t: 0, dur: 0.35, tx: b.x + Math.cos(a) * 70, ty: b.y + Math.sin(a) * 70, mini: true }); }
  // 염동 알: 한 번 튀어 올라 플레이어 쪽으로 반쯤 돌아오며 다시 터진다
  if (combo('psyegg') && !b.bounced) bombs.push({ sx: b.x, sy: b.y, x: b.x, y: b.y, z: 0, t: 0, dur: 0.45, tx: b.x + (p.x - b.x) * 0.5, ty: b.y + (p.y - b.y) * 0.5, bounced: true });
}

// o: 탄 속성 덮어쓰기. x·y(쏘는 자리), r(크기), seek(이 시간 동안 플레이어를 따라감), split(이 시간 뒤 터지며 splitN발로 갈라짐)
function enemyShot(e, a, speed, o = {}) {
  if (player.lagTail) speed *= 0.7;
  if (e?.awake) { speed *= 1.15; if (o.go) o.go *= 1.15; }
  tears.push({ x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 3, r: 6, from: 'e', type: e.mon.types[0], src: e, move: e.act?.name, ...o });
}

// 플레이어 주변 41x29칸만 BFS 거리 지도를 만든다. 땅 위의 적은 거리가 줄어드는 칸으로 걸어서 장애물을 돌아간다
const FW = 41, FH = 29, flowD = new Int16Array(FW * FH);
let flowOx = 0, flowOy = 0;
function buildFlow() {
  flowOx = Math.floor(player.x / TS) - 20; flowOy = Math.floor(player.y / TS) - 14;
  flowD.fill(-1); flowD[14 * FW + 20] = 0;
  const q = [[20, 14]];
  for (let i = 0; i < q.length; i++) {
    const [c, r] = q[i];
    for (const [dx, dy] of DIRS8) {
      const nc = c + dx, nr = r + dy, k = nr * FW + nc;
      if (nc < 0 || nr < 0 || nc >= FW || nr >= FH || flowD[k] >= 0 || solidAt(nc + flowOx, nr + flowOy)) continue;
      if (dx && dy && (solidAt(c + dx + flowOx, r + flowOy) || solidAt(c + flowOx, r + dy + flowOy))) continue;  // 대각선으로 모서리 뚫기 금지
      flowD[k] = flowD[r * FW + c] + 1; q.push([nc, nr]);
    }
  }
}

function pathDir(e) {
  const p = player, dist = Math.hypot(p.x - e.x, p.y - e.y) || 1, direct = [(p.x - e.x) / dist, (p.y - e.y) / dist];
  const c = Math.floor(e.x / TS) - flowOx, r = Math.floor(e.y / TS) - flowOy;
  if (c < 0 || r < 0 || c >= FW || r >= FH || flowD[r * FW + c] <= 1) return direct;
  let best = null, bv = flowD[r * FW + c];
  for (const [dx, dy] of DIRS8) {
    const nc = c + dx, nr = r + dy;
    if (nc < 0 || nr < 0 || nc >= FW || nr >= FH) continue;
    const v = flowD[nr * FW + nc];
    if (v < 0 || v >= bv) continue;
    if (dx && dy && (solidAt(c + dx + flowOx, r + flowOy) || solidAt(c + flowOx, r + dy + flowOy))) continue;
    bv = v; best = [nc, nr];
  }
  if (!best) return direct;
  const tx = (best[0] + flowOx + 0.5) * TS, ty = (best[1] + flowOy + 0.5) * TS, d2 = Math.hypot(tx - e.x, ty - e.y) || 1;
  return [(tx - e.x) / d2, (ty - e.y) / d2];
}

const aimAt = (a, e) => { const p = player, d = Math.hypot(p.x - e.x, p.y - e.y) || 1; a.dx = (p.x - e.x) / d; a.dy = (p.y - e.y) / d; };
const cooldown = e => ({ wild: 2.5, trainer: 1.6, boss: 0.9, legend: 0.6 }[e.rank]) * (e.hp < e.maxHp / 2 ? 0.7 : 1) * (1 - 0.12 * (e.lvl ?? 0)) * (e.enraged ? 0.8 : 1) * (e.hoopa ? 0.85 : 1) * (e.weak > 0 ? 1.4 : 1) * (isBig(e) ? Math.min(1, diffAt(DIFF_CD, e.tier ?? 0)) : diffAt(DIFF_CD, e.tier ?? 0)) * abFoes(e) + Math.random() * 0.5;
// 관장·라이벌 등 보스급은 초반에도 공격 빈도를 늦추지 않는다 (DIFF_CD의 초반 완화는 잡몹·트레이너만)
// 필살기(필살 일격·필살 광선) 피해: 체력 2칸, 마지막 단계(사천왕·챔피언·후반 전설)는 3칸
const heavyDmg = e => (e.tier ?? 0) >= 7 ? 3 : 2;
const isBig = e => e.rank === 'boss' || e.rank === 'legend';
const CC_MAX = 1.5, CC_IMMUNE = 4;  // 보스급 멈춤 면역: 멈춘 시간이 합쳐서 CC_MAX초가 되면 CC_IMMUNE초 동안 면역

function turnToward(cur, want, max) {
  const diff = ((want - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return cur + clamp(diff, -max, max);
}

// 기술 시작: 이름을 띄우고 패턴별 준비를 한다. 모든 패턴은 피할 수 있도록 먼저 예고(조준선/낙하 지점/표식)를 보여준다
function startAct(e, [kind, name, mo], opts = {}) {
  const p = player, a = e.act = { kind, name, type: e.mon.types[0], t: 0, phase: 0, ...mo, ...opts }, type = a.type;  // 타입 고유 기술은 그 기술의 타입으로
  if (name) say(`${e.mon.name}의 ${name}!`, e.x, e.y - bodyH(e, e.scale) - 24, TYPE_COLOR[type]);
  if (kind === 'charge') { a.reps ??= name === '역린' ? 3 : 1 + (e.lvl >= 2 ? 1 : 0); a.wind ??= 0.6; a.dur ??= 0.7; a.speed ??= e.rank === 'trainer' ? 380 : 470; aimAt(a, e); }
  if (kind === 'hbeam') { a.kind = 'beam'; a.heavy = true; }
  if (a.kind === 'beam') a.ang = Math.atan2(p.y - e.y, p.x - e.x);
  // 필살 일격: 플레이어 자리에 아주 큰 표식이 찍히고 오래 기다렸다가 크게 터진다. 피하지 못하면 체력이 크게 깎인다
  if (kind === 'smash') for (let i = 0; i < (e.lvl >= 2 ? 2 : 1); i++) hazards.push({ kind: 'strike', type, r: 95, t: 1.3 + i * 0.7, t0: 1.3 + i * 0.7, dmg: heavyDmg(e), src: e, move: name, x: p.x, y: p.y, follow: i > 0 });
  if (kind === 'summon') a.count = Math.min(e.lvl >= 2 ? 3 : 2, MAX_MINIONS - map.enemies.filter(o => o.summoner === e && o.hp > 0).length);
  if (kind === 'strike') for (let i = 0; i < (e.rank === 'trainer' ? 2 : 4 + 2 * (e.lvl ?? 0)); i++) hazards.push({ kind: 'strike', type, r: 38, t: 0.9 + i * 0.15, src: e, move: name,
    x: p.x + (i ? Math.random() * 180 - 90 : 0), y: p.y + (i ? Math.random() * 180 - 90 : 0) });
  // 비처럼 쏟아지는 공격: 플레이어 주변 넓은 범위에 낙하 지점이 차례로 찍힌다
  // 휩쓸기 광선: 플레이어 한쪽 옆에서 시작해 반대쪽으로 부채꼴을 쓸고 지나간다. 부채꼴 밖으로 나가거나, 기둥 뒤에 숨거나, 구르기로 넘는다
  if (kind === 'sweep') { a.dir = Math.random() < 0.5 ? 1 : -1; a.span = e.lvl >= 2 ? 2.2 : 1.9; a.ang0 = Math.atan2(p.y - e.y, p.x - e.x) - a.dir * a.span / 2; a.ang = a.ang0; }
  if (kind === 'rain') for (let i = 0; i < (e.lvl >= 2 ? 11 : 7); i++) hazards.push({ kind: 'strike', type, r: 34, t: 0.8 + i * 0.11, src: e, move: name,
    x: p.x + (i ? Math.random() * 480 - 240 : 0), y: p.y + (i ? Math.random() * 480 - 240 : 0) });
}

function land(e) {
  const p = player;
  fx.push({ kind: 'ring', x: e.x, y: e.y, t: 0.35, max: 0.35 }); shake = 0.2;
  if (Math.hypot(p.x - e.x, p.y - e.y) < e.r + 55) hurt(e.mon.types[0], isBig(e) ? 2 : 1);
  if (e.act?.quake) hazards.push({ kind: 'quake', x: e.x, y: e.y, R: e.r, hit: false, type: e.act.type, src: e, move: e.act.name });  // 드래곤다이브: 내려앉으며 충격파
  if (isBig(e)) for (let i = 0, off = Math.random(); i < 8; i++) enemyShot(e, (i / 8 + off) * Math.PI * 2, 160);
}

function updateAct(e, dt) {
  const a = e.act, p = player, next = () => { a.phase++; a.t = 0; }, end = () => {
    e.act = null; e.cd = cooldown(e);
    // 관장의 지시: 다음 기술 두 개를 쉬지 않고 이어 쓴다
    const nx = list => list.length ? pick(list) : null;
    if (e.chainN > 0 && e.hp > 0) { e.chainN--; const m = nx(e.moves.filter(m => m[2]?.sig !== 'command')); if (m) { startAct(e, m); e.act.chained = true; return; } }
    // 2단계 보스와 전설은 가끔 기술을 끊지 않고 이어서 쓴다 (후파의 고리 너머 전설은 더 자주)
    if ((e.lvl >= 2 || e.rank === 'legend') && !a.chained && e.hp > 0 && Math.random() < (e.hoopa ? 0.5 : 0.35)) { const m = nx(e.moves.filter(m => m[1] !== a.name)); if (m) { startAct(e, m); e.act.chained = true; } }
  };
  if (e.awake) dt *= AWAKE_SPEED;  // 각성하면 모든 기술이 빨라진다
  a.t += dt;
  // 타입·급 고유 기술 (patterns.js)
  if (a.kind === 'sig') { if (SIG[a.sig](e, a, dt)) end(); return; }
  if (a.kind === 'charge') {
    if (a.phase === 0) { if (a.t >= a.wind) next(); return; }
    const ox = e.x, oy = e.y;
    moveBody(e, a.dx * a.speed * dt, a.dy * a.speed * dt); clampBody(e);
    e.walk += a.speed * dt; e.moving = true; if (Math.abs(a.dx) > 0.1) e.flip = a.dx > 0;
    const blocked = Math.hypot(e.x - ox, e.y - oy) < a.speed * dt * 0.5;
    if (blocked || a.t >= a.dur) {
      if (a.burst) for (let i = 0, off = Math.random(); i < 8; i++) enemyShot(e, (i / 8 + off) * Math.PI * 2, 180, { type: a.type });  // 라이벌 러시: 멈출 때마다 사방으로
      if (blocked && isBig(e)) { fx.push({ kind: 'poof', x: e.x, y: e.y, t: 0.3, max: 0.3 }); shake = 0.15; }
      if (--a.reps > 0) { aimAt(a, e); a.phase = 0; a.t = 0; a.wind = 0.3; } else end();
    }
  } else if (a.kind === 'jump') {
    if (a.phase === 0) {
      if (a.t >= 0.4) { a.sx = e.x; a.sy = e.y; a.tx = p.x; a.ty = p.y; next(); }
    } else if (a.phase === 1) {
      const k = Math.min(a.t / 0.9, 1);
      e.x = a.sx + (a.tx - a.sx) * k; e.y = a.sy + (a.ty - a.sy) * k; e.z = Math.sin(k * Math.PI) * 150;
      if (a.tx !== a.sx) e.flip = a.tx > a.sx;
      if (k >= 1) { e.z = 0; unstick(e); land(e); next(); }
    } else if (a.t >= 0.45) end();
  } else if (a.kind === 'beam') {
    if (a.phase === 0) { if (a.t < (a.heavy ? 0.6 : 0.45)) a.ang = turnToward(a.ang, Math.atan2(p.y - e.y, p.x - e.x), 1.8 * dt); if (a.t >= (a.heavy ? 1.2 : 0.85)) { next(); if (a.heavy) shake = 0.3; } return; }
    if (a.t >= 0.5) return end();
    const dx = Math.cos(a.ang), dy = Math.sin(a.ang), rx = p.x - e.x, ry = p.y - e.y, s = rx * dx + ry * dy;
    if (s > 0 && s < beamLen(e.x, e.y, dx, dy, true) && Math.abs(rx * dy - ry * dx) < (a.heavy ? 22 : 14) + p.r) hurt(a.type, a.heavy ? heavyDmg(e) : 1);
  } else if (a.kind === 'strike') {
    if (a.t >= 0.7) end();
  } else if (a.kind === 'smash') {
    if (a.t >= 1.0) end();
  } else if (a.kind === 'quake') {
    if (a.phase === 0) { if (a.t >= 0.35) { hazards.push({ kind: 'quake', x: e.x, y: e.y, R: e.r, type: a.type, hit: false, src: e, move: a.name }); shake = 0.25; next(); } }
    else if (a.t >= 0.4) end();
  } else if (a.kind === 'radial') {
    if (a.t >= a.phase * 0.35) { const n = e.rank === 'trainer' ? 8 : 12 + 4 * (e.lvl ?? 0), off = Math.random(); for (let i = 0; i < n; i++) enemyShot(e, (i / n + off) * Math.PI * 2, 170); a.phase++; }
    if (a.phase >= 2 + (e.lvl >= 1 ? 1 : 0)) end();
  } else if (a.kind === 'fan') {
    if (a.t >= a.phase * 0.28) { const n = e.rank === 'trainer' ? 3 : 5 + (e.lvl ?? 0), base = Math.atan2(p.y - e.y, p.x - e.x); for (let i = 0; i < n; i++) enemyShot(e, base + (i - (n - 1) / 2) * 0.22, 220); a.phase++; }
    if (a.phase >= 3 + (e.lvl ?? 0)) end();
  } else if (a.kind === 'spiral') {
    if ((a.next = (a.next ?? 0) - dt) <= 0) { a.next = 0.07; a.rot = (a.rot ?? Math.random() * 6) + 0.45; const arms = e.rank === 'trainer' ? 1 : 2 + (e.lvl ?? 0); for (let k = 0; k < arms; k++) enemyShot(e, a.rot + k * Math.PI * 2 / arms, 170); }
    if (a.t >= 1.6) end();
  } else if (a.kind === 'ring') {
    // 둘러싸는 탄막: 한쪽에만 틈이 있다. 틈은 플레이어 정면이 아니라 옆쪽이라 움직여야 빠져나간다
    const waves = e.lvl >= 2 ? 2 : 1;
    if (a.phase < waves && a.t >= 0.5 + a.phase * 0.6) {
      const n = 30, toP = Math.atan2(p.y - e.y, p.x - e.x), gap = toP + (Math.random() < 0.5 ? -1 : 1) * (0.7 + Math.random() * 0.6);
      for (let i = 0; i < n; i++) { const ang = i / n * Math.PI * 2; if (Math.abs(((ang - gap + Math.PI * 3) % (Math.PI * 2)) - Math.PI) > 0.42) enemyShot(e, ang, 150); }
      a.phase++;
    }
    if (a.t >= 0.5 + waves * 0.6) end();
  } else if (a.kind === 'summon') {
    // 전설이 울부짖으면 같은 타입의 약한 포켓몬이 주위에 나타난다. 이미 많으면 부르지 않는다
    if (a.count <= 0) return end();
    if (a.phase === 0 && a.t >= 0.6) {
      const n = nodeAt(e.x, e.y), pool = [...new Set(region.gyms.flatMap(g => g.mobs))].filter(id => MON[id] && MON[id].types.some(t => e.mon.types.includes(t)));
      const ids = pool.length ? pool : wildPool(n);
      for (let i = 0; i < a.count; i++) {
        const ang = Math.random() * Math.PI * 2, m = spawnEnemy(MON[pick(ids)], e.x + Math.cos(ang) * (e.r + 50), e.y + Math.sin(ang) * (e.r + 50), 'wild', Math.max(0, e.tier - 1));
        m.minion = true; m.summoner = e; m.aggro = true; m.leash = 0;
        map.enemies.push(m); fx.push({ kind: 'poof', x: m.x, y: m.y, t: 0.3, max: 0.3 });
      }
      shake = 0.15; next();
    }
    if (a.phase === 1 && a.t >= 0.4) end();
  } else if (a.kind === 'rain') {
    if (a.t >= 1.3) end();
  } else if (a.kind === 'cross') {
    // 십자 → 대각선 → 십자로 돌아가며 쏜다
    if (a.phase < 3 && a.t >= a.phase * 0.3) { a.rot = (a.rot ?? Math.random() * Math.PI) + Math.PI / 4; for (let k = 0; k < 8; k++) enemyShot(e, a.rot + k * Math.PI / 4, k % 2 ? 160 : 210); a.phase++; }
    if (a.phase >= 3 && a.t >= 0.4) end();
  } else if (a.kind === 'homing') {
    // 추적탄: 1.3초 동안만 천천히 방향을 틀고 그 뒤로는 곧게 간다. 다가올 때 옆으로 비키면 빗나간다
    const n = 2 + (e.lvl ?? 0) + (e.rank === 'legend' ? 1 : 0);
    if (a.phase < 2 && a.t >= 0.3 + a.phase * 0.7) { const base = Math.atan2(p.y - e.y, p.x - e.x); for (let i = 0; i < n; i++) enemyShot(e, base + (i - (n - 1) / 2) * 0.5, 150, { r: 9, seek: 1.3 }); a.phase++; }
    if (a.phase >= 2 && a.t >= 0.8) end();
  } else if (a.kind === 'wall') {
    // 탄막 벽: 가로로 길게 늘어선 탄이 밀려온다. 틈은 한 곳뿐이고 플레이어 정면이 아니라 옆쪽이라 옆으로 움직여야 빠져나간다
    const waves = 2 + (e.lvl >= 2 ? 1 : 0);
    if (a.phase < waves && a.t >= 0.45 + a.phase * 0.75) {
      const base = Math.atan2(p.y - e.y, p.x - e.x), vx = -Math.sin(base), vy = Math.cos(base), gap = (Math.random() < 0.5 ? -1 : 1) * (50 + Math.random() * 130);
      for (let s = -340; s <= 340; s += 26) if (Math.abs(s - gap) > 48) enemyShot(e, base, 140, { x: e.x + vx * s, y: e.y + vy * s });
      a.phase++;
    }
    if (a.phase >= waves && a.t >= 0.45 + waves * 0.75) end();
  } else if (a.kind === 'chase') {
    // 연속 낙하: 지금 서 있는 자리에 차례로 떨어진다. 멈추지 않고 움직이면 피한다
    const n = 4 + 2 * (e.lvl ?? 0);
    if (a.phase < n && a.t >= 0.2 + a.phase * 0.3) { hazards.push({ kind: 'strike', type: a.type, r: 40, t: 0.75, src: e, move: a.name, x: p.x, y: p.y }); a.phase++; }
    if (a.phase >= n && a.t >= 0.2 + n * 0.3 + 0.6) end();
  } else if (a.kind === 'split') {
    // 분열탄: 큰 탄이 날아가다 터지며 사방으로 갈라진다. 큰 탄에서 멀리 떨어지면 갈라진 탄 사이가 넓어진다
    const n = 2 + (e.lvl >= 1 ? 1 : 0);
    if (a.phase === 0 && a.t >= 0.4) { const base = Math.atan2(p.y - e.y, p.x - e.x); for (let i = 0; i < n; i++) enemyShot(e, base + (i - (n - 1) / 2) * 0.45, 210, { r: 11, split: 0.65 + i * 0.08, splitN: 8 + 2 * (e.lvl ?? 0) }); a.phase++; }
    if (a.t >= 1.4) end();
  } else if (a.kind === 'sweep') {
    if (a.phase === 0) { if (a.t >= 0.8) next(); return; }
    const dur = 1.1;
    a.ang = a.ang0 + a.dir * a.span * Math.min(1, a.t / dur);
    if (a.t >= dur) return end();
    const dx = Math.cos(a.ang), dy = Math.sin(a.ang), rx = p.x - e.x, ry = p.y - e.y, s = rx * dx + ry * dy;
    if (s > 0 && s < beamLen(e.x, e.y, dx, dy, true) && Math.abs(rx * dy - ry * dx) < 14 + p.r) hurt(a.type);
  } else if (a.kind === 'teleport') {
    if (a.phase === 0) {
      e.fade = Math.min(1, a.t / 0.35);
      if (a.t >= 0.35) { const ang = Math.random() * Math.PI * 2; e.x = p.x + Math.cos(ang) * 130; e.y = p.y + Math.sin(ang) * 130; clampBody(e); unstick(e); next(); }
    } else if (a.phase === 1) {
      e.fade = 1 - Math.min(1, a.t / 0.3);
      if (a.t >= 0.3) { e.fade = 0; const base = Math.atan2(p.y - e.y, p.x - e.x); for (let i = 0; i < 5; i++) enemyShot(e, base + (i - 2) * 0.2, 230); next(); }
    } else if (a.t >= 0.3) end();
  }
}

function wildShot(e) {
  const p = player, a = Math.atan2(p.y - e.y, p.x - e.x);
  if (e.shotStyle === 'fan') for (const o of [-0.3, 0, 0.3]) enemyShot(e, a + o, 190);
  else if (e.shotStyle === 'burst') { enemyShot(e, a, 220); e.burst = 2; e.burstT = 0.15; }
  else enemyShot(e, a, 210);
}

function contact(e) {
  const p = player;
  if (untargetable(e) || Math.hypot(p.x - e.x, p.y - e.y) >= e.r + p.r - 4) return;
  abContact(e);
  if ((p.rockyHelmet || hasFx('bulwark')) && p.inv <= 0 && p.dash <= 0) damage(e, p.dmg * (hasFx('bulwark') ? 3 : 2) * (combo('juggernaut') ? 2 : 1), 'steel', false, true);
  hurt(e.mon.types[0], e.act?.kind === 'charge' && e.act.phase === 1 && isBig(e) ? 2 : 1);
}

// 마을(체육관·리그 마을 포함)의 반듯한 광장 안쪽. 야생은 여기로 들어오지 못한다
function inTown(x, y) {
  if (map !== world) return false;
  const n = nodeAt(x, y), tx = Math.floor(x / TS), ty = Math.floor(y / TS);
  return (n.kind === 'T' || !!n.gym || n.league) && Math.abs(tx - n.tx) <= n.hx + 1 && Math.abs(ty - n.ty) <= n.hy + 1;
}

let curEnemy = null, legendFight = false;
const MAX_MINIONS = 4;  // 전설 하나가 한 번에 거느릴 수 있는 소환 포켓몬 수  // 지금 행동 중인 적: 그 사이에 맞으면 이 적이 때린 것
function updateEnemy(e, dt) {
  const ox = e.x, oy = e.y;
  // 각성: 보스급은 체력이 절반 아래로 떨어지면 기술 둘이 새 기술로 바뀌고, 기술이 빨라지고 더 아파진다
  if (isBig(e) && e.moves && !e.enraged && e.hp > 0 && e.hp < e.maxHp * 0.5) {
    e.enraged = true; e.speed *= 1.25; shake = 0.4; sfx('boss'); awaken(e);
    fx.push({ kind: 'ring', x: e.x, y: e.y, t: 0.5, max: 0.5 }); fx.push({ kind: 'boom', x: e.x, y: e.y, r: e.r + 60, t: 0.5, max: 0.5, color: '#ff3040' });
    banner = { text: `${e.mon.name}이(가) 각성했다! 새로운 기술을 꺼낸다`, t: 2.5, glow: '#f44' };
  }
  curEnemy = e; updateEnemyInner(e, dt); curEnemy = null;
  if (e.battle) keepInRoom(e);
  // 야생·전설이 마을 경계를 넘으려 하면 막고, 쫓기를 그만두고 제자리로 돌아가게 한다
  if ((e.rank === 'wild' || e.rank === 'legend') && !e.battle && inTown(e.x, e.y) && !inTown(ox, oy)) {
    e.x = ox; e.y = oy; e.aggro = false; e.leash = 2; e.act = null; e.vx = e.vy = 0;
  }
}

function updateEnemyInner(e, dt) {
  const p = player;
  e.cd -= dt; e.hit -= dt; e.slow -= dt; e.stun -= dt; e.broken -= dt; e.weak -= dt; e.breakCd -= dt;
  // 보스급(관장·사천왕·챔피언·라이벌 에이스·전설)은 멈춤(풀죽음·마비·얼음·헤롱헤롱)이 합쳐서 CC_MAX초 쌓이면
  // CC_IMMUNE초 동안 멈추지 않고 기술을 이어 간다. 멈추지 않는 동안에는 쌓인 시간이 천천히 줄어든다
  if (isBig(e)) {
    if (e.ccImmune > 0) { e.ccImmune -= dt; e.stun = Math.min(e.stun, 0); e.frozen = 0; }
    else if (e.stun > 0 || e.frozen > 0) {
      if ((e.ccT = (e.ccT ?? 0) + dt) >= CC_MAX) { e.ccT = 0; e.ccImmune = CC_IMMUNE; e.stun = 0; e.frozen = 0; say('정신을 차렸다! 잠시 멈추지 않는다', e.x, e.y - 90, '#fc6'); }
    } else e.ccT = Math.max(0, (e.ccT ?? 0) - dt * 0.5);
  }
  if (combo('nightmare') && e.stun > 0) e.nightmare = 3;
  if (e.nightmare > 0) { e.nightmare -= dt; if ((e.nmTick = (e.nmTick ?? 0) - dt) <= 0) { e.nmTick = 0.5; damage(e, p.dmg * 0.3, 'ghost', true, true); } }
  if (e.burn > 0) { e.burn -= dt; if ((e.burnTick -= dt) <= 0) { e.burnTick = 0.5; damage(e, p.dmg * 0.3 * (e.holy ? 2 : 1) * (combo('toxic') ? 2 : 1) * (combo('blueblaze') ? 2 : 1), 'fire', true, true); } }
  // 독(오물폭탄): 화상과 따로 쌓인다
  if (e.psn > 0) { e.psn -= dt; if ((e.psnTick = (e.psnTick ?? 0) - dt) <= 0) { e.psnTick = 0.5; damage(e, p.dmg * 0.25 * (combo('toxic') ? 2 : 1), 'poison', true, true); } }
  if (e.burst > 0 && (e.burstT -= dt) <= 0) { enemyShot(e, Math.atan2(p.y - e.y, p.x - e.x), 220); e.burst--; e.burstT = 0.15; }
  e.moving = false;
  if (e.frozen > 0) { e.frozen -= dt; return; }
  if (e.stun > 0) return;
  if (e.aggro || e.act) e.face = faceRow(p.x - e.x, p.y - e.y);
  if (e.act) { updateAct(e, dt); contact(e); return; }
  const spd = e.speed * (e.slow > 0 ? 0.5 : 1), dx = p.x - e.x, dy = p.y - e.y, dist = Math.hypot(dx, dy) || 1;
  // 야생·전설은 가까이 오거나 맞기 전까지는 제 영역을 어슬렁거린다.
  // 플레이어가 멀어지거나 제 영역에서 너무 끌려 나오면 쫓기를 그만두고 돌아간다 (2초 동안은 다시 쫓지 않는다)
  if (((e.rank === 'wild' || e.rank === 'legend') && ((map.battle && !e.battle) || inTown(p.x, p.y))) || (legendFight && e.rank === 'wild' && !e.minion)) { e.aggro = false; e.leash = 2; e.act = null; }
  else if (outsideLegendHome(e)) { if (e.aggro || e.act) escapeLegend(e); }
  else if ((e.rank === 'wild' || e.rank === 'legend') && !e.arena) {
    if (dist > 750 || Math.hypot(e.x - e.hx, e.y - e.hy) > 900) { e.aggro = false; e.leash = 2; }
    else if ((e.leash = (e.leash ?? 0) - dt) <= 0 && dist < 520) e.aggro = true;
    if (e.aggro && e.rank === 'legend') e.engaged = true;
  }
  let w = [0, 0], k = 1;
  if (!e.aggro) {
    if ((e.turn -= dt) <= 0) { const hd = Math.hypot(e.hx - e.x, e.hy - e.y); e.dir = hd > 200 ? [(e.hx - e.x) / hd, (e.hy - e.y) / hd] : Math.random() < 0.4 ? [0, 0] : randDir(); e.turn = 1 + Math.random() * 2; }
    w = e.dir; k = 0.35;
  } else if (e.rank !== 'wild') {
    if (e.cd <= 0) return startAct(e, pick(e.moves));
    w = e.flying ? [dx / dist, dy / dist] : pathDir(e); k = 0.7;
  } else if (!e.shooter) {
    w = e.flying ? [dx / dist, dy / dist] : pathDir(e);
    // 가까워지면 몸을 움츠렸다가 짧게 덮친다
    if ((e.lunge -= dt) <= 0 && dist < 190) { e.lunge = 1.2 + Math.random() * 1.2; return startAct(e, ['charge', null], { wind: 0.3, dur: 0.3, speed: 400 }); }
  } else if (e.flying) {
    if ((e.turn -= dt) <= 0) { e.dir = dist > 300 ? [dx / dist, dy / dist] : randDir(); e.turn = 1 + Math.random() * 1.5; }
    w = e.dir;
    if (e.cd <= 0) { wildShot(e); e.cd = 1.2; }
  } else {
    // 땅 위의 원거리형: 걷다가 멈춰서 조준한 뒤 쏜다
    e.turn -= dt;
    if (e.turn > 0) w = dist > 320 ? pathDir(e) : e.dir;
    else if (e.turn < -0.5) { wildShot(e); e.dir = randDir(); e.turn = 0.6 + Math.random() * 0.8; }
  }
  let mx, my;
  if (e.flying) {
    // 관성 있는 비행 + 진행 방향 옆으로 흔들림
    const kk = Math.min(1, dt * 2.5), wob = Math.sin(now * 3 + e.seed) * spd * 0.35 * k;
    e.vx += (w[0] * spd * k - e.vx) * kk; e.vy += (w[1] * spd * k - e.vy) * kk;
    mx = (e.vx - w[1] * wob) * dt; my = (e.vy + w[0] * wob) * dt;
  } else { mx = w[0] * spd * k * dt; my = w[1] * spd * k * dt; }
  const ox = e.x, oy = e.y;
  moveBody(e, mx, my); clampBody(e);
  const moved = Math.hypot(e.x - ox, e.y - oy);
  e.walk += moved; e.moving = moved > 0.1;
  if (Math.abs(mx) > 0.05) e.flip = mx > 0;
  if (!e.aggro && e.moving) e.face = faceRow(mx, my);
  if (e.aggro) contact(e);
}

// 플레이어 주변에서 야생 포켓몬이 계속 다시 나타난다. 마을과 건물 안은 안전 지대
function manageSpawns(dt) {
  if (map.battle || legendFight) return;  // 트레이너·라이벌과 승부하는 동안에는 야생이 새로 나오지 않는다
  if ((spawnCd -= dt) > 0 || (spawnT -= dt) > 0) return;
  spawnT = 0.4;
  const p = player, wild = map.enemies.filter(e => e.rank === 'wild');
  for (const e of wild) if (Math.hypot(e.x - p.x, e.y - p.y) > 1400) e.gone = true;
  const here = nodeAt(p.x, p.y), near = wild.filter(e => !e.gone && Math.hypot(e.x - p.x, e.y - p.y) < 900).length;
  if (near >= 8 + Math.floor(tierAt(here) / 2)) return;  // 넓어진 도로에 맞춰 한 번에 더 많이
  for (let tries = 0; tries < 24; tries++) {
    const a = Math.random() * Math.PI * 2, d = 480 + Math.random() * 280, x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
    const tx = Math.floor(x / TS), ty = Math.floor(y / TS), k = ty * world.tw + tx;
    if (tx < 0 || ty < 0 || tx >= world.tw || ty >= world.th || !world.reach[k] || world.solid[k]) continue;
    const n = nodeAt(x, y);
    if (n.kind === 'T' || n.gym || n.league) continue;
    if ((n.kind === 'R' || n.kind === 'F') && !world.grass[k]) continue;  // 도로와 숲에서는 원작처럼 풀숲에서만 나온다
    const e = spawnEnemy(MON[pick(wildPool(n))], x, y, 'wild', tierAt(n));
    if (Math.random() < shinyRate()) { e.shiny = true; loadShiny(e.mon); banner = { text: `앗! 색이 다른 ${e.mon.name}이(가) 나타났다!`, t: 3 }; }
    map.enemies.push(e);
    return;
  }
}

// 전설이 사는 장소. 플레이어가 그 밖에 있으면 전설과 싸울 수 없다
const outsideLegendHome = e => e.rank === 'legend' && !!e.legend && map === world && nodeAt(player.x, player.y) !== e.legend.n;
// 장소 밖으로 나가면 도망친 것: 전설은 깎인 체력 그대로 제자리로 돌아가고, 다시 들어오면 이어서 싸운다
function escapeLegend(e) {
  const fled = e.engaged;
  e.aggro = e.engaged = false; e.act = null; e.leash = 1; e.fade = 0; e.z = 0; unstick(e);
  e.legend.hpFrac = e.hp / e.maxHp;
  for (const o of map.enemies) if (o.summoner === e) { o.gone = true; fx.push({ kind: 'poof', x: o.x, y: o.y, t: 0.3, max: 0.3 }); }
  tears = tears.filter(t => t.from !== 'e' || (t.src !== e && t.src?.summoner !== e));
  hazards = hazards.filter(h => h.src !== e);
  if (!fled) return;
  samplePower();
  banner = { text: `${e.mon.name}에게서 도망쳤다! (남은 체력 ${Math.ceil(e.hp / e.maxHp * 100)}%)`, t: 3 };
}

function checkLegends() {
  const p = player;
  for (const l of world.legends) {
    if (l.done || l.alive || Math.hypot(p.x - l.x, p.y - l.y) > 520) continue;
    const e = spawnEnemy(MON[l.id], l.x, l.y, 'legend', nodeAt(l.x, l.y).tier);
    e.legend = l; l.alive = true;
    if (l.hpFrac < 1) { e.hp = e.maxHp * l.hpFrac; }  // 예전에 도망쳤던 전설: 깎인 체력 그대로
    map.enemies.push(e);
    banner = { text: `앗! 야생의 ${MON[l.id].name}이(가) 나타났다!`, t: 3 }; sfx('legend');
  }
}

function onKill(e) {
  const p = player;
  abKill();
  fx.push({ kind: 'poof', x: e.x, y: e.y, t: 0.3, max: 0.3 });
  sfx(isBig(e) ? 'boss' : 'faint');
  p.seen.add(e.mon.id); p.defeated[e.mon.id] = (p.defeated[e.mon.id] ?? 0) + 1;
  if (!DEX.has(e.mon.id)) { DEX.add(e.mon.id); p.newDex = (p.newDex ?? 0) + 1; store.set(DEX_KEY, [...DEX]); say(`${e.mon.name} 도감 등록!`, e.x, e.y - 90, '#8cf'); }
  const sb = starterBase(e.mon.id);
  if (sb && !STARTERS.has(sb)) {
    STARTERS.add(sb); store.set(STARTER_KEY, [...STARTERS]); (p.newStarters ??= []).push(sb);
    banner = { text: `${MON[sb]?.name ?? e.mon.name}을(를) 다음 판부터 스타팅으로 고를 수 있다!`, t: 3.5, glow: '#8cf' };
  }
  if (e.shiny) {
    const bonus0 = shinyBonusIds().size;
    if (!SHINY.has(e.mon.id)) { SHINY.add(e.mon.id); store.set(SHINY_KEY, [...SHINY]); }
    if (shinyBonusIds().size > bonus0) say(`이로치 확률 +1%! (지금 ${+(shinyRate() * 100).toFixed(1)}%)`, e.x, e.y - 120, '#fd6');
    ach('shiny');
    banner = { text: sb || LEGEND_MOVE[e.mon.id] ? `색이 다른 ${e.mon.name}을(를) 쓰러뜨렸다! 다음 판부터 이로치로 시작할 수 있다` : `색이 다른 ${e.mon.name}을(를) 쓰러뜨렸다!`, t: 4 };
    map.pickups.push({ ...rollContent(Math.random, { tm: 0.3, c: 0, r: 0.6, l: 0.4 }), x: e.x, y: e.y + 30, ball: true });
  }
  if (p.bigRoot && Math.random() < 0.1) heal(1);
  if (p.shellBell && Math.random() < 0.15) heal(1);
  if (hasFx('flare') && Math.random() < (combo('bloom') ? 0.4 : 0.2)) heal(1);
  // 돌진 기술: 돌진(0.6초 안)으로 쓰러뜨리면 체력 1칸
  if (hasFx('dashStrike') && p.dashHit?.has(e) && p.time - (p.dashAt ?? -9) < 0.6) { heal(2); say('체력을 회복했다!', p.x, p.y - 60, '#8f8'); }
  if (hasFx('holyBurn') && e.burn > 0) {
    const R = combo('inferno') ? 160 : 80;
    fx.push({ kind: 'boom', x: e.x, y: e.y, r: R, t: 0.3, max: 0.3, color: TYPE_COLOR.fire });
    for (const o of enemiesNear(e.x, e.y, R, e)) damage(o, p.dmg * 1.5, 'fire', false, true);
  }
  const t = e.tier;
  // 경험치도 단계마다 2배: 초반 잡몹은 4, 마지막 단계 잡몹은 500쯤
  gainExp(4 * 2 ** t * { wild: 1, trainer: 2.5, boss: 8, legend: 25 }[e.rank]);
  if (e.rank === 'wild' && !e.minion) {
    spawnCd = 4;  // 잡고 나면 4초 동안은 새로 나오지 않는다
    gainMoney((5 + t * 6) * (0.6 + Math.random() * 0.8), e.x, e.y);
    const roll = Math.random();
    if (roll < 0.1) map.pickups.push({ ...rollContent(Math.random, { tm: 0.08, c: 0.9, r: 0.1, l: 0 }), x: e.x, y: e.y, ball: true });
    else if (roll < 0.13) map.pickups.push({ kind: 'candy', x: e.x, y: e.y });
    else if (roll < 0.19) map.pickups.push({ kind: 'berry', x: e.x, y: e.y });
  }
  if (e.rank === 'legend') {
    const ids = loadUnlocked();
    if (!ids.includes(e.mon.id)) { store.set(LEGEND_KEY, [...ids, e.mon.id]); (p.newStarters ??= []).push(e.mon.id); }
    if (e.legend) { e.legend.done = true; e.legend.alive = false; }
    for (const o of map.enemies) if (o.summoner === e) { o.gone = true; fx.push({ kind: 'poof', x: o.x, y: o.y, t: 0.3, max: 0.3 }); }
    samplePower();
    if (p.rival) p.rival.legend = true;
    ach('legend1');
    gainMoney(3000, e.x, e.y);
    banner = { text: `${e.mon.name}을(를) 쓰러뜨렸다! 다음 판부터 ${e.mon.name}(으)로 시작할 수 있다`, t: 4 };
    // 쓰러뜨린 전설의 상징 기술이 기술머신으로 떨어진다
    const sig = LTMS.find(t => t.id === LEGEND_MOVE[e.mon.id]);
    if (sig && !taken.has(sig.id) && !p.moves.has(sig.id)) { taken.add(sig.id); map.pickups.push({ kind: 'tm', tm: sig, x: e.x - 40, y: e.y }); }
    map.pickups.push({ ...rollContent(Math.random, { c: 0, r: 0, l: 1 }), x: e.x + 40, y: e.y });
    if (e.hoopa) {
      p.hoopaWin = e.mon.name; p.winAt = 7; sfx('hoopa');
      banner = { text: `색이 다른 ${e.mon.name}을(를) 쓰러뜨렸다! 다음 판부터 이로치 ${e.mon.name}(으)로 시작할 수 있다`, t: 6, glow: '#c8f' };
    }
  }
}
