// 매 프레임 게임 진행: 이동, 충돌, 탄, 아이템 줍기
// ---------- 메인 업데이트 ----------
// 돌진 기술 위력 배수 = 이동 속도 (능력치 창의 속도 값, 기본 1 안팎)
const dashSpd = () => Math.max(2, player.speed * moveSpeed() / 200);  // 최소 2배
// R 키를 1.5초 꾹 누르면 모험 그만두기 (모험 중에 새로 누른 경우만. 결과 화면에서 누르던 R이 이어져도 그만두지 않는다)
const QUIT_HOLD = 1.5;
function updateQuit(dt) {
  const p = player;
  if (keys.KeyR && p.quitArm) p.quitHold = (p.quitHold ?? 0) + dt;
  else { p.quitHold = 0; p.quitArm = false; }
  if (p.quitHold < QUIT_HOLD) return false;
  p.quitHold = 0; p.quitArm = false; clearSave(); state = 'region';
  return true;
}

function update(dt) {
  const p = player;
  if (updateQuit(dt)) return;
  refreshFx();
  now += dt; dayTime += map === world ? dt : 0; p.cd -= dt; p.inv -= dt; p.dashCd -= dt; p.eruptCd -= dt; textCd -= dt; shake -= dt; timeStop -= dt;
  if (banner && !dangerNow() && (banner.t -= dt) <= 0) banner = null;  // 필살기 예고 중에는 문구를 멈춰 두었다가 나중에
  if (lastInfo) lastInfo.t -= dt;
  if (dialog && ((dialog.t -= dt) <= 0 || (map.battle && !dialog.keep))) dialog = null;
  p.deltas.forEach(d => d && (d.t -= dt));
  if (p.winAt > 0 && (p.winAt -= dt) <= 0) { state = 'win'; return; }
  if (p.warpIn > 0) p.warpIn -= dt;
  // 챔피언을 이기고 잠시 뒤 후파의 고리가 열린다
  if (map.hoopaT > 0 && (map.hoopaT -= dt) <= 0) openHoopaRing();
  p.time += dt; p.hop -= dt; if (p.webbed > 0) p.webbed -= dt;
  if (p.regen && (p.regenT -= dt) <= 0) { p.regenT = 12; heal(1); }
  abTick(dt);
  // 지오컨트롤: 12초마다 4초 동안 대지의 힘이 넘친다
  if (hasFx('geo') && (p.geoT = (p.geoT ?? 6) - dt) <= 0) { p.geoT = combo('gaia') ? 8 : 12; p.surge = combo('gaia') ? 5 : 4; banner = { text: '대지의 힘이 넘쳐흐른다!', t: 1.5, glow: '#f9c' }; }
  if (p.surge > 0) p.surge -= dt;
  if (map.enemies.some(e => (e.battle || (e.rank === 'legend' && e.aggro)) && e.hp > 0)) p.fT = (p.fT ?? 0) + dt;
  if ((p.achT = (p.achT ?? 0) - dt) <= 0) { p.achT = 0.5; checkAch(); }
  tickTutorial();

  let vx = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), vy = (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0);
  const len = Math.hypot(vx, vy) || 1, ox = p.x, oy = p.y;
  vx /= len; vy /= len;
  // 스페이스: 짧게 뛰어 피하기. 뛰는 동안은 무적이라 돌진, 낙하, 충격파를 넘길 수 있다
  if ((keys.Space || p.dashQ) && p.dashCd <= 0) {
    p.dashQ = false;
    sfx('dash'); p.dashed = true;
    // 구르기 대기 1초. 돌진 기술(화룡점정·라이트닝드라이브 등)은 0.25초에, 가까운 적에게 자동으로 돌진한다
    p.dash = hasFx('dashStrike') ? 0.26 : 0.2; p.dashCd = hasFx('dashStrike') ? 1 : abStat('dash'); p.dashDir = vx || vy ? [vx, vy] : [p.flip ? 1 : -1, 0]; p.dashHit = new Set(); p.dashAt = p.time;
    const tg = hasFx('dashStrike') && nearestEnemy(p.x, p.y, null, 320);
    if (tg) { const d = Math.hypot(tg.x - p.x, tg.y - p.y) || 1; p.dashDir = [(tg.x - p.x) / d, (tg.y - p.y) / d]; }
    if (hasFx('vanish')) p.vanish = 0.6;
  }
  if (p.dash > 0) {
    p.dash -= dt; vx = p.dashDir[0] * 3; vy = p.dashDir[1] * 3;
    // 돌진 기술(화룡점정·브레이브버드 계열·라이트닝드라이브): 지나가는 길 주변(몸 둘레 55px)을 휩쓸고, 끝나면 충격파
    const dtype = hasFx('dashStrike') && moveDef([...p.moves].find(id => moveDef(id).fx === 'dashStrike')).type, dcol = dtype && TYPE_COLOR[dtype];
    if (dtype) {
      fx.push({ kind: 'trail', x: p.x, y: p.y, r: 30, t: 0.3, max: 0.3, color: dcol });
      if (dtype === 'electric' && Math.random() < 0.6) { const a = Math.random() * Math.PI * 2; fx.push({ kind: 'zap', x: p.x, y: p.y, x2: p.x + Math.cos(a) * 60, y2: p.y + Math.sin(a) * 60, t: 0.12 }); }
    }
    if (dtype) for (const e of map.enemies) if (!p.dashHit.has(e) && e.hp > 0 && !untargetable(e) && Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r + 55) {
      p.dashHit.add(e); damage(e, p.dmg * 4 * dashSpd(), dtype);
      fx.push({ kind: 'boom', x: e.x, y: e.y, r: 34, t: 0.2, max: 0.2, color: dcol });
      if (combo('stormdash') && e.hp > 0) {
        e.stun = Math.max(e.stun ?? 0, 1); say('마비되었다!', e.x, e.y - 50, '#ff8');
        for (const o of enemiesNear(e.x, e.y, 150, e).slice(0, 3)) { damage(o, p.dmg * 1.2 * dashSpd(), 'electric', false, true); fx.push({ kind: 'zap', x: e.x, y: e.y, x2: o.x, y2: o.y, t: 0.15 }); }
      }
    }
  }
  if (hasFx('dashStrike') && p.dashHit && p.dash <= 0 && !p.dashDone) {
    p.dashDone = true;
    const dtype = moveDef([...p.moves].find(id => moveDef(id).fx === 'dashStrike')).type, R = 95;
    fx.push({ kind: 'boom', x: p.x, y: p.y, r: R, t: 0.25, max: 0.25, color: TYPE_COLOR[dtype] }); fx.push({ kind: 'ring', x: p.x, y: p.y, t: 0.3, max: 0.3 }); shake = Math.max(shake, 0.12);
    for (const e of enemiesNear(p.x, p.y, R)) { p.dashHit.add(e); damage(e, p.dmg * 1.5 * dashSpd(), dtype, false, true); }
    // 돌진은 적 사이로 파고드는 기술이라 맞히면 잠깐 무적 (회복은 돌진으로 쓰러뜨렸을 때: combat.js onKill)
    if (p.dashHit.size) p.inv = Math.max(p.inv, 0.4);
  }
  if (p.dash > 0) p.dashDone = false;
  if (hasFx('bulwark') && !p.shieldUp && (p.shieldT = (p.shieldT ?? 0) - dt) <= 0) p.shieldUp = true;
  if (p.vanish > 0 && (p.vanish -= dt) <= 0) {
    const R = combo('phantom') ? 160 : 100;
    fx.push({ kind: 'boom', x: p.x, y: p.y, r: R, t: 0.3, max: 0.3, color: TYPE_COLOR.ghost }); shake = 0.2;
    const hitN = enemiesNear(p.x, p.y, R).length;
    for (const e of enemiesNear(p.x, p.y, R)) damage(e, p.dmg * 3 * (combo('phantom') ? 1.5 : 1), 'ghost');
    if (hitN && p.time >= (p.dashHealAt ?? 0)) { p.dashHealAt = p.time + 1.5; heal(1); say('체력을 회복했다!', p.x, p.y - 60, '#8f8'); }
  }
  if (vx && !(keys.ArrowLeft || keys.ArrowRight)) p.flip = vx > 0;
  moveBody(p, vx * p.speed * dt * (p.webbed > 0 && !abStat('clear', false) ? 0.5 : 1) * moveSpeed(), vy * p.speed * dt * (p.webbed > 0 && !abStat('clear', false) ? 0.5 : 1) * moveSpeed()); clampBody(p);  // 실 장판 위에서는 느려진다
  p.velX = (p.x - ox) / dt; p.velY = (p.y - oy) / dt;  // 라이벌의 읽어내기가 쓰는 이동 속도
  p.walk += Math.hypot(p.x - ox, p.y - oy); p.moving = p.x !== ox || p.y !== oy;
  if (vx || vy) p.face = faceRow(vx, vy);
  if (map === world && world.solid[Math.floor(p.y / TS) * world.tw + Math.floor(p.x / TS)] === 8 && vy > 0 && p.hop <= 0) p.hop = 0.35;

  if (map.kind === 'indoor') {
    if (p.y > (map.th - 1) * TS + 10) return leaveBuilding();
    if (map.hoopa && Math.hypot(p.x - map.hoopa.x, p.y - map.hoopa.y) < 30) return enterHoopa();
    if (map.returnT > 0 && (map.returnT -= dt) <= 0) return leaveBuilding();  // 라이벌 결투장: 이기면 원래 자리로
    const r = roomAt(Math.floor(p.y / TS));
    if (r && !r.started && !map.battle && p.y < (r.y1 - 1.2) * TS) startRoom(r);
  } else {
    // 문 바로 아래에서 위로 밀면 입장. 빠를수록 한 프레임 이동이 커서 건물 앞 여유를 넉넉히 둔다
    for (const b of world.buildings) if (keys.KeyW && Math.abs(p.x - b.doorX) < 22 && p.y < b.doorY + p.r + 14 && p.y > b.doorY) return enterBuilding(b);
    const n = nodeAt(p.x, p.y);
    if (n !== curNode) {
      curNode = n;
      if (!n.visited) { n.visited = true; banner = { text: n.name, t: 2 }; }
    }
    // 전설이 사는 장소 밖으로 나가면 도망친 것 (멀리 있어서 이번 프레임에 움직이지 않는 전설도 확인)
    for (const e of map.enemies) if (e.rank === 'legend' && (e.aggro || e.act) && outsideLegendHome(e)) escapeLegend(e);
    // 전설과 싸우기 시작하면(전설이 덤벼들면) 주변 야생은 놀라 달아나고, 싸우는 동안 새로 나오지 않는다
    const lf = map.enemies.some(e => e.rank === 'legend' && e.aggro && e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) < 900);
    if (lf && !legendFight) {
      const near = map.enemies.filter(e => e.rank === 'wild' && !e.minion && Math.hypot(e.x - p.x, e.y - p.y) < 650);
      for (const e of near) fx.push({ kind: 'poof', x: e.x, y: e.y, t: 0.3, max: 0.3 });
      map.enemies = map.enemies.filter(e => !near.includes(e));
    }
    legendFight = lf;
    manageSpawns(dt);
    checkLegends();
    rivalCheck();
  }

  attack(dt);
  updateNpcs(dt);

  // 시간의포효: 주기적으로 적과 적의 공격이 멈춘다
  if (hasFx('timeStop') && (p.stopCd -= dt) <= 0 && map.enemies.some(e => Math.hypot(e.x - p.x, e.y - p.y) < 500)) { p.stopCd = combo('timewarp') ? 5 : 7; timeStop = 1.8; banner = { text: '시간이 멈췄다!', t: 1.5 }; }
  updateBurst(dt);
  const frozenTime = timeStop > 0;

  if ((flowT -= dt) <= 0) { flowT = 0.25; buildFlow(); }
  const enemies = map.enemies;
  if (!frozenTime) for (const e of enemies) if (Math.abs(e.x - p.x) < 1100 && Math.abs(e.y - p.y) < 900) updateEnemy(e, dt);
  for (let i = 0; i < enemies.length; i++) for (let j = i + 1; j < enemies.length; j++) {
    const a = enemies[i], b = enemies[j];
    if (a.flying !== b.flying || a.act || b.act) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, o = a.r + b.r - d;
    if (o > 0) { moveBody(a, -dx / d * o / 2, -dy / d * o / 2); moveBody(b, dx / d * o / 2, dy / d * o / 2); }
  }

  if (!frozenTime) for (const h of hazards) {
    updatePatternHazard(h, dt);
    // 두 번째 필살 일격 표식은 터지기 직전까지 플레이어를 천천히 따라온다
    if (h.follow && h.t > 0.6) { const d = Math.hypot(p.x - h.x, p.y - h.y) || 1, v = Math.min(d, 120 * dt); h.x += (p.x - h.x) / d * v; h.y += (p.y - h.y) / d * v; }
    if (h.kind === 'strike' && (h.t -= dt) <= 0) {
      fx.push({ kind: 'boom', x: h.x, y: h.y, r: h.r, t: 0.25, max: 0.25, color: TYPE_COLOR[h.type] });
      if (h.dmg > 1) shake = 0.3;
      if (Math.hypot(p.x - h.x, p.y - h.y) < h.r + p.r * 0.5) hurt(h.type, h.dmg ?? 1, h);
      h.done = true;
    }
    if (h.kind === 'quake') {
      h.R += 260 * dt;
      // 지진 충격파는 땅을 타고 오므로, 진원지와 나 사이에 바위·기둥이 있으면 막힌다
      if (!h.hit && Math.abs(Math.hypot(p.x - h.x, p.y - h.y) - h.R) < 14 + p.r * 0.5) {
        h.hit = true;
        if (losBlocked(h.x, h.y, p.x, p.y)) say('엄폐물 뒤에서 충격파를 피했다!', p.x, p.y - 60, '#aef'); else hurt(h.type, 1, h);
      }
      if (h.R > 560) h.done = true;
    }
  }
  hazards = hazards.filter(h => !h.done);
  for (const s of pstrikes) if ((s.t -= dt) <= 0) {
    s.done = true; fx.push({ kind: 'boom', x: s.x, y: s.y, r: s.r ?? 40, t: 0.25, max: 0.25, color: TYPE_COLOR[s.type ?? 'rock'] });
    for (const e of enemiesNear(s.x, s.y, s.r ?? 40)) damage(e, p.dmg * (s.mul ?? 0.8), s.type ?? 'rock', false, true);
  }
  pstrikes = pstrikes.filter(s => !s.done);
  for (const u of puddles) {
    u.t -= dt;
    if ((u.tick -= dt) <= 0) { u.tick = 0.4; for (const e of enemiesNear(u.x, u.y, u.r)) if (!e.flying) damage(e, p.dmg * 0.25, 'poison', true, true); }
  }
  puddles = puddles.filter(u => u.t > 0);

  const bc = beamCfg();
  for (const b of beams) {
    b.t -= dt;
    // 레이저: 쏜 순간 한 번 지나가며 닿은 적을 모두 친다
    if (b.laser) { if (!b.fired) { b.fired = true; laserHits(b); } continue; }
    if ((b.tick -= dt) > 0) continue;
    b.tick = 0.05;
    const pts = beamPath(b);
    for (const e of enemies) {
      if (!pts.some(([x, y]) => Math.hypot(e.x - x, e.y - y) < b.w / 2 + e.r)) continue;
      damage(e, p.dmg * 0.45 * bc.mul * (b.mul ?? 1) * (combo('steam') ? 1.4 : 1) * (combo('solar') ? 1.4 : 1), bc.type, true, false, bc.crit);
      if (combo('solar') && Math.random() < 0.04) { fx.push({ kind: 'boom', x: e.x, y: e.y, r: 50, t: 0.2, max: 0.2, color: '#f8ff80' }); for (const o of enemiesNear(e.x, e.y, 50)) damage(o, p.dmg * 0.5, 'grass', false, true); }
      if (has('blue-flare')) e.burn = 3;
      // 광선 + 레이저: 광선에 감긴 전기·얼음 레이저가 함께 지진다
      if (has('thunderbolt')) damage(e, p.dmg * 0.2, 'electric', true, true);
      if (has('ice-beam')) damage(e, p.dmg * 0.2, 'ice', true, true);
      // 하이드로펌프: 물줄기가 적을 밀어내고, 벽에 부딪히면 추가 피해
      if (has('hydro-pump') && !isBig(e) && !e.act && e.hp > 0) {
        const ex = e.x, ey = e.y;
        moveBody(e, Math.cos(b.a) * 14, Math.sin(b.a) * 14);
        if (Math.hypot(e.x - ex, e.y - ey) < 7 && (e.slamCd ?? 0) < now) { e.slamCd = now + 0.6; damage(e, p.dmg * 0.8, 'water', false, true); say('벽에 부딪혔다!', e.x, e.y - 50, '#8cf'); }
      }
    }
    // 폭풍우: 광선이 지나가는 자리에 벼락
    if (combo('stormfront') && pts.length > 2 && Math.random() < 0.12) { const [x, y] = pts[1 + Math.floor(Math.random() * (pts.length - 1))]; pstrikes.push({ x, y, t: 0.15, r: 45 * fxScale(), mul: 1.2, type: 'electric' }); }
  }
  beams = beams.filter(b => b.t > 0);

  for (const b of bombs) {
    // 유도되는 알: 목표가 살아 있으면 떨어질 자리가 목표를 따라 움직인다
    if (b.target && b.target.hp > 0 && !untargetable(b.target)) { b.tx += (b.target.x - b.tx) * Math.min(1, dt * 8); b.ty += (b.target.y - b.ty) * Math.min(1, dt * 8); }
    b.t += dt;
    const k = Math.min(b.t / b.dur, 1);
    b.x = b.sx + (b.tx - b.sx) * k; b.y = b.sy + (b.ty - b.sy) * k; b.z = Math.sin(k * Math.PI) * 50;
    // 날아가는 도중 적에게 닿으면 공중에서 바로 터진다
    if (k >= 1 || (b.t > 0.06 && enemies.some(e => !untargetable(e) && e.hp > 0 && Math.hypot(e.x - b.x, e.y - b.y) < e.r + 16))) { explode(b); b.done = true; }
  }
  bombs = bombs.filter(b => !b.done);

  for (const t of tears) {
    if (t.from === 'e' && frozenTime) continue;
    if (t.from === 'e') {
      // 추적탄: 정해진 시간 동안만 천천히 플레이어 쪽으로 휜다
      if (t.seek > 0) { t.seek -= dt; const na = turnToward(Math.atan2(t.vy, t.vx), Math.atan2(p.y - t.y, p.x - t.x), 1.7 * dt), sp = Math.hypot(t.vx, t.vy); t.vx = Math.cos(na) * sp; t.vy = Math.sin(na) * sp; }
      // 분열탄: 시간이 되면 터져서 사방으로 갈라진다
      if (t.split !== undefined && (t.split -= dt) <= 0) {
        t.life = 0; fx.push({ kind: 'boom', x: t.x, y: t.y, r: 26, t: 0.2, max: 0.2, color: TYPE_COLOR[t.type] });
        const off = Math.random();
        for (let i = 0; i < t.splitN; i++) enemyShot(t.src, (i / t.splitN + off) * Math.PI * 2, 150, { x: t.x, y: t.y, move: t.move, type: t.type });
        continue;
      }
    }
    if (t.home) {
      const e = nearestEnemy(t.x, t.y, null, t.home > 5 ? 380 : 260);
      if (e) { const na = turnToward(Math.atan2(t.vy, t.vx), Math.atan2(e.y - t.y, e.x - t.x), t.home * dt), sp = Math.hypot(t.vx, t.vy); t.vx = Math.cos(na) * sp; t.vy = Math.sin(na) * sp; }
    }
    // 사이코키네시스: 사거리 절반에서 플레이어 쪽으로 되돌아온다
    if (t.boom && !t.back && t.life < t.life0 / 2) { t.back = true; t.hit.clear(); t.life = t.life0; if (combo('psycut') && t.xs) t.xs = Math.min(t.xs * 2, 32); }
    // 하늘 가르기: 사거리 절반에서 둘로 갈라진다
    if (t.split2 && t.life < t.life0 / 2) { t.split2 = false; const a = Math.atan2(t.vy, t.vx); for (const o of [-0.35, 0.35]) playerShot(t.x, t.y, a + o, { type: t.type, mul: t.mul, r: t.r, life: t.life, pierce: t.pierce, ghost: t.ghost, home: t.home, blade: t.blade, xs: t.xs, fire: t.fire, psn: t.psn, hit: new Set(t.hit), color: t.color, accent: t.accent }); }
    if (t.back) { const d = Math.hypot(p.x - t.x, p.y - t.y) || 1, sp = Math.hypot(t.vx, t.vy); t.vx = (p.x - t.x) / d * sp; t.vy = (p.y - t.y) / d * sp; if (d < 20) t.life = 0; }
    if (!(t.from === 'e' && moveEnemyShot(t, dt))) { t.x += t.vx * dt; t.y += t.vy * dt; t.life -= dt; }
    if (t.life > 0 && shotBlocked(Math.floor(t.x / TS), Math.floor(t.y / TS), t.ghost && t.from === 'p') && !(t.from === 'e' && bounceShot(t, dt))) { t.life = 0; fx.push({ kind: 'splash', x: t.x, y: t.y, t: 0.2, max: 0.2, color: TYPE_COLOR[t.type] }); }
    if (t.life <= 0) continue;
    if (t.from === 'p') {
      for (const e of enemies) {
        if (t.hit.has(e) || e.hp <= 0 || untargetable(e) || Math.hypot(e.x - t.x, e.y - t.y) > e.r + t.r) continue;
        t.hit.add(e);
        // 시저크로스: 꿰뚫을 때마다 피해 2배 (최대 16배, 사이코 커터로 돌아오면 더)
        damage(e, p.dmg * t.mul * (t.xs || 1), t.type);
        if (t.xs) t.xs = Math.min(t.xs * 2, combo('psycut') && t.back ? 32 : 16);
        if (t.freeze && Math.random() < t.freeze) { e.frozen = 1; say('얼어붙었다!', e.x, e.y - 50, '#aef'); }
        if (!isBig(e) && !e.act) moveBody(e, t.vx * 0.03, t.vy * 0.03);
        if (!t.pierce) { t.life = 0; break; }
      }
    } else if (Math.hypot(p.x - t.x, p.y - t.y) < p.r + t.r) { hurt(t.type, 1, t); t.life = 0; }
  }
  tears = tears.filter(t => t.life > 0);

  for (const e of enemies) if (e.hp <= 0 && !e.dead) { e.dead = true; onKill(e); }
  map.enemies = map.enemies.filter(e => e.hp > 0 && !e.gone);
  updateBattle(dt);
  fx.forEach(f => f.t -= dt); fx = fx.filter(f => f.t > 0);
  texts.forEach(t => { t.t -= dt; t.y -= 30 * dt; }); texts = texts.filter(t => t.t > 0);

  for (const k of map.pickups) if (!k.placed) placePickup(k);
  for (const k of [...map.pickups]) {
    const d = Math.hypot(p.x - k.x, p.y - k.y);
    if (k.declined) { if (d > 120) k.declined = false; continue; }
    if (d > p.r + 22) continue;
    if (k.kind === 'berry' && p.hp >= p.maxHp) continue;
    if (k.kind === 'tm' && p.moves.size >= MAX_MOVES) { learnTm = k; state = 'learn'; return; }
    takePickup(k);
  }
}

// 새로 생긴 아이템이 벽·장애물 속이나 갈 수 없는 곳(절벽 너머, 닫힌 방)에 있으면 가장 가까운 갈 수 있는 칸으로 옮긴다
function pickupOk(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= map.tw || ty >= map.th || solidAt(tx, ty)) return false;
  if (map === world) return !!world.reach[ty * world.tw + tx];
  const r = map.room ?? roomAt(ty);
  return !r || (tx > r.x0 && tx < r.x1 && ty > r.y0 && ty < r.y1);
}
function glowImg(img, x, y, w, h, c) { ctx.save(); ctx.shadowColor = c; ctx.shadowBlur = 8 + Math.sin(now * 4) * 3; ctx.drawImage(img, x, y, w, h); ctx.restore(); }
function placePickup(k) {
  k.placed = true;
  const cx = Math.floor(k.x / TS), cy = Math.floor(k.y / TS);
  if (pickupOk(cx, cy) && !circleHitsSolid(k.x, k.y, 16)) return;
  for (let rad = 1; rad < 14; rad++) {
    let best = null, bd = Infinity;
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad || !pickupOk(cx + dx, cy + dy)) continue;
      const x = (cx + dx + 0.5) * TS, y = (cy + dy + 0.5) * TS, d = Math.hypot(x - k.x, y - k.y);
      if (d < bd && !circleHitsSolid(x, y, 16)) { bd = d; best = [x, y]; }
    }
    if (best) { [k.x, k.y] = best; return; }
  }
}

// 같은 도구를 여러 번 먹을 수 있어서 능력치마다 상한을 둔다
function capStats(p) {
  p.crit = Math.min(p.crit, 0.6); p.dodge = Math.min(p.dodge, 0.35); p.fireDelay = Math.max(p.fireDelay, 0.14);
  p.range = Math.min(p.range, 2.2); p.shotSpeed = Math.min(p.shotSpeed, 900); p.invTime = Math.min(p.invTime, 2.5);
}

function takePickup(k) {
  const p = player;
  map.pickups.splice(map.pickups.indexOf(k), 1);
  if (k.kind === 'item') { withDelta(p => { k.item.apply(p); capStats(p); }); p.items.push(k.item); banner = { text: `${k.item.name}을(를) 손에 넣었다!`, t: 2.5 }; renderBar(); checkLegendForm(k.item.id); }
  if (k.kind === 'tm') { learnMove(k.tm.id); banner = { text: `${k.tm.name}을(를) 배웠다!`, t: 2.5, glow: rareGlow(k.tm) }; }
  if (k.kind === 'berry') { heal(2); sfx('heal'); }
  if (k.kind === 'candy') {
    if (p.level < MAX_LEVEL) { p.exp = 0; levelUp(); banner = { text: `이상한사탕을 먹었다! ${p.mon.name}의 레벨이 ${p.level}(으)로 올랐다`, t: 2.5 }; }
    else { gainMoney(500, p.x, p.y); banner = { text: '이미 최고 레벨이다. 사탕을 팔아 돈으로 바꿨다', t: 2.5 }; }
  }
  if (k.kind === 'item' || k.kind === 'tm') { lastInfo = { k, t: 5 }; sfx(ballGrade(k) >= 2 ? 'rare' : 'item'); }
}

// 기술이 4개일 때 기술머신: 하나를 잊고 배우거나, 배우지 않고 그대로 둔다
function decideLearn(i) {
  const p = player, k = learnTm;
  learnTm = null; state = 'play';
  if (i === null) { map.pickups = map.pickups.filter(o => o !== k); say(`${k.tm.name} 기술머신을 두고 왔다`, p.x, p.y - 90, '#ccc'); return; }
  const old = [...p.moves][i];
  // 잊은 기술의 보너스가 빠지고 새 기술의 보너스가 붙은 차이를 한 번에 보여 준다
  withDelta(() => {
    p.moves.delete(old);
    p.items = p.items.filter(it => it.id !== old);
    refreshFx();
    say(`${moveDef(old).name}을(를) 잊었다`, p.x, p.y - 90, '#ccc');
    if (old === p.zMove) { p.zMove = k.tm.id; say('Z파워가 새 기술로 옮겨 갔다', p.x, p.y - 110, '#ffe060'); }
    takePickup(k);
  });
}
