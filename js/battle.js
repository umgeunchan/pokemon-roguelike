// 승부: 트레이너·관장·사천왕·챔피언, 첫 판 안내, 라이벌, NPC와 상점
// ---------- 승부 (트레이너, 관장, 사천왕) ----------
function startBattle(b) {
  map.battle = { wait: 1, ...b };
  sfx('battle');
  // 필드 승부: 가까운 야생은 놀라서 달아나고, 나머지는 승부가 끝날 때까지 덤비지 않는다
  if (map === world) {
    const p = player, near = map.enemies.filter(e => e.rank === 'wild' && Math.hypot(e.x - p.x, e.y - p.y) < 650);
    for (const e of near) fx.push({ kind: 'poof', x: e.x, y: e.y, t: 0.3, max: 0.3 });
    map.enemies = map.enemies.filter(e => !near.includes(e));
    for (const e of map.enemies) if (e.rank === 'wild' || e.rank === 'legend') { e.aggro = false; e.act = null; e.leash = 3; }
  }
  banner = { text: `${b.title ? `${b.title} ` : ''}${b.who}이(가) 승부를 걸어왔다!`, t: 2.5 };
}

function startTrainer(n) {
  const p = player;
  const team = Array.from({ length: 1 + Math.floor(Math.random() * 2) + (n.node.tier > 3 ? 1 : 0) }, () => pick(wildPool(n.node)));
  n.fighting = true;
  startBattle({ who: n.name, queue: team, x: n.x, y: n.y, rank: 'trainer', tier: tierAt(n.node), npc: n, onWin: () => {
    n.fighting = false; n.defeated = true; p.trainerWins = (p.trainerWins ?? 0) + 1;
    gainMoney(150 + n.node.tier * 150, n.x, n.y);
    banner = { text: `${n.name}에게 이겼다!`, t: 2 };
    map.pickups.push({ ...rollContent(Math.random, { tm: 0.3, c: 0.5, r: 0.45, l: 0.05 }), x: n.x, y: n.y + 40, ball: true });
    if (Math.random() < 0.2) map.pickups.push({ kind: 'candy', x: n.x + 40, y: n.y + 40 });
  } });
}

// ---------- 첫 판 안내: 해 보면 다음으로 넘어간다. 끝나거나 H 키로 끄면 다시 나오지 않는다 ----------
const TUT_KEY = 'pokemon-dungeon-tutorial';
let tutDone = !!store.get(TUT_KEY);
const TUT = [
  { key: '이동', pc: 'WASD로 걸어 보세요', touch: '왼쪽 스틱으로 걸어 보세요', done: p => p.walk > 240 },
  { key: '공격', pc: '방향키(↑↓←→)를 누르면 그 방향으로 기술을 쏩니다', touch: '오른쪽 스틱을 민 방향으로 기술을 쏩니다', done: p => p.fired },
  { key: '대화', pc: '사람 앞에서 E로 말 걸기 (간호순: 회복과 기록, 점원: 상점)', touch: '사람 앞에서 화면을 눌러 말 걸기 (간호순: 회복과 기록, 점원: 상점)', done: p => p.talked },
  { key: '지도·메뉴', pc: 'M = 지도, Esc = 메뉴 (도감·가방·설정)', touch: '왼쪽 위 지도·메뉴 버튼 (메뉴: 도감·가방·설정)', done: p => p.opened },
  { key: '목표', pc: '풀숲에는 야생 포켓몬! 체육관 배지 8개를 모아 포켓몬리그의 챔피언이 되세요', touch: '풀숲에는 야생 포켓몬! 체육관 배지 8개를 모아 포켓몬리그의 챔피언이 되세요', done: p => p.time - (p.tutGoalAt ??= p.time) > 6 },
];
const tutStep = () => tutDone || !player ? null : TUT.findIndex(s => !s.done(player));
function tickTutorial() {
  if (tutDone || !player) return;
  if (tutStep() < 0) { tutDone = true; store.set(TUT_KEY, true); sfx('select'); }
}
function drawTutorial() {
  const i = tutStep();
  if (i === null || i < 0) return;
  const st = TUT[i], w = 560, x = SIDE + (W - w) / 2, y = HUD + 10;
  ctx.fillStyle = 'rgba(10,14,30,.88)'; ctx.fillRect(x, y, w, 52); ctx.strokeStyle = '#8cf'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, 50);
  text(`안내 ${i + 1}/${TUT.length} · ${st.key}`, x + 12, y + 19, 11, '#8cf', 'left');
  text(TOUCH ? '' : 'H = 안내 끄기', x + w - 12, y + 19, 10, '#678', 'right');
  glowText(TOUCH ? st.touch : st.pc, x + w / 2, y + 41, 13, '#fff', '#4af');
  if (TOUCH) taps.push({ x: x + w - 60, y, w: 60, h: 24, fn: skipTutorial });
  if (TOUCH) text('안내 끄기', x + w - 12, y + 19, 10, '#678', 'right');
}
const skipTutorial = () => { tutDone = true; store.set(TUT_KEY, true); };

// ---------- 라이벌 ----------
// 라이벌 스타팅: 플레이어 스타팅(풀·불꽃·물 순)에 상성이 좋은 쪽. 스타팅이 아니면 무작위
function rivalStarter() {
  const id = player.mon.id, i = region.starters.findIndex(s => id >= s && id <= s + 2);
  return region.starters[i >= 0 ? (i + 1) % 3 : Math.floor(Math.random() * 3)];
}

// 배지가 많을수록 마릿수가 늘고 진화한다. 마지막(에이스)은 늘 스타팅
function rivalTeam(badges) {
  const [, , mates] = RIVALS[region.name], s = player.rival.starter + (badges >= 6 ? 2 : badges >= 2 ? 1 : 0);
  const n = clamp(Math.max(1, Math.ceil(badges / 2)), 0, mates.length);
  return [...mates.slice(0, n).map(([a, b]) => badges >= 4 ? b : a), s].filter(id => MON[id]);
}

function rivalDue() {
  const p = player, r = p.rival, b = p.beaten.size, at = curNode;
  if (!r.done.has('start')) { const i = tutStep(); return i === null || i < 0 || i >= 2 ? 'start' : null; }
  // 배지 이벤트는 가장 최근 것 하나만. 앞의 것을 놓쳤으면 건너뛴다
  const badge = ['b7', 'b5', 'b3'].find(ev => b >= +ev.slice(1) && !r.done.has(ev));
  if (badge) { ['b3', 'b5', 'b7'].forEach(ev => +ev.slice(1) <= +badge.slice(1) && r.done.add(ev)); r.done.delete(badge); return afterNextTown(badge); }
  if (r.legend && !r.done.has('legend')) return afterNextTown('legend');
  if (b >= region.gyms.length && !r.done.has('road') && at && (at.league || at.name.includes('챔피언로드'))) return 'road';
  return null;
}

// 배지·전설 이벤트는 바로 덤비지 않는다: 이벤트가 생긴 곳을 기억해 두고, 다른 마을에 들어섰을 때 나타난다 (준비할 시간)
function afterNextTown(ev) {
  const r = player.rival, at = curNode;
  if (r.waitEv !== ev) { r.waitEv = ev; r.waitNode = at?.i ?? -1; return null; }
  return at && (at.kind === 'T' || at.gym) && !at.league && at.i !== r.waitNode ? ev : null;
}

function rivalCheck() {
  const p = player, r = p.rival;
  if (!r || map !== world || map.battle || legendFight) return;
  const here = world.npcs.find(n => n.rival);
  if (here) { if (!here.defeated && Math.hypot(here.x - p.x, here.y - p.y) > 2200) world.npcs = world.npcs.filter(n => n !== here); return; }
  const ev = rivalDue();
  if (!ev) return;
  const [name, sprite] = RIVALS[region.name], ang = Math.random() * Math.PI * 2;
  const n = { id: -1, kind: 'trainer', rival: ev, sprite, name, x: p.x + Math.cos(ang) * 230, y: p.y + Math.sin(ang) * 230, r: 14, dir: [0, 0], turn: 0, node: curNode };
  unstick(n); clampBody(n); n.hx = n.x; n.hy = n.y;
  world.npcs.push(n);
  banner = { text: `라이벌 ${name}이(가) 다가온다!`, t: 2.5 };
}

// 라이벌과 마주치면 체육관 같은 결투장으로 옮겨서 싸운다. 이기면 잠시 뒤 마주쳤던 자리로 돌아오고, 보상은 그 자리에 떨어져 있다
function makeRivalArena(who, type) {
  const tw = 21, th = 13, cx = Math.floor(tw / 2);
  const solid = new Uint8Array(tw * th).fill(4), voids = new Uint8Array(tw * th);
  for (let y = 1; y < th - 1; y++) for (let x = 1; x < tw - 1; x++) solid[y * tw + x] = 0;
  for (const [dx, dy] of [[4, 4], [7, 7], [5, 9]]) { solid[dy * tw + cx - dx] = 1; solid[dy * tw + cx + dx] = 1; }  // 좌우 대칭 기둥(지진 엄폐물)
  const room = { i: 0, y0: 0, y1: th - 1, x0: 0, x1: tw - 1, cx: (cx + 0.5) * TS, type, who, down: [], up: [], cleared: false, started: true };
  return { kind: 'indoor', sub: 'rival', building: null, tw, th, solid, voids, rooms: [room], room, npcs: [], pickups: [], enemies: [], buildings: [], signs: [], battle: null, type, furn: [], leader: null };
}

function startRival(n) {
  // 악의 조직과 한 번이라도 거래했으면 라이벌은 적대적: 대사가 바뀌고, 포켓몬이 더 많고 더 단단하다
  const p = player, b = p.beaten.size, hostile = rivalHostile(), [hi, bye] = (hostile ? RIVAL_TALK_HOSTILE : RIVAL_TALK)[n.rival].map(orgSay);
  if (map !== world || legendFight) return;
  n.fighting = true; n.flip = p.x > n.x;
  world.returnTo = [p.x, p.y];
  map = makeRivalArena({ leader: n.name, sprite: n.sprite, title: hostile ? '적대하는 라이벌' : '라이벌' }, MON[p.rival.starter]?.types[0] ?? 'normal');
  if (hostile) fx.push({ kind: 'lflash', x: p.x, y: p.y, c1: '#600010', t: 0.4, max: 0.4 });
  resetCombat(); p.warpIn = 0.6;
  const r = map.room, at = { x: r.cx, y: (r.y0 + 1.6) * TS };
  p.x = r.cx; p.y = (map.th - 2.5) * TS;
  startBattle({ who: n.name, title: hostile ? '적대하는 라이벌' : '라이벌', queue: rivalTeam(hostile ? b + 2 : b), ...at, rank: 'boss', tier: clamp(b - 1, 0, 7), hpMul: (b ? 1.15 : 0.55) * (hostile ? 1.25 : 1), rival: true, wait: 2.5,
    say: (i, ace) => ace && i > 0 ? (hostile ? '이 녀석만큼은... 절대 지지 않아!' : '아직 끝나지 않았어! 내 파트너, 가자!') : i === 0 ? hi : null, onWin: () => {
    n.fighting = false; n.defeated = true; n.leaveT = 5; p.rival.done.add(n.rival); r.cleared = true;
    ach('rival1'); if (RIVAL_EVENTS.every(ev => p.rival.done.has(ev))) ach('rival6');
    gainMoney(b ? 1200 + b * 500 : 300, at.x, at.y);
    dialog = { name: n.name, text: bye, t: 6 };
    banner = { text: `라이벌 ${n.name}에게 이겼다! 원래 자리로 돌아간다`, t: 3 };
    world.pickups.push({ ...rollContent(Math.random, { tm: 0.45, c: b ? 0 : 0.5, r: 0.6, l: b >= 5 ? 0.4 : 0.1 }), x: n.x, y: n.y + 40, ball: true });
    world.pickups.push({ kind: 'candy', x: n.x + 40, y: n.y + 40 });
    world.pickups.push({ ...bossReward(), x: n.x, y: n.y + 90, ball: true });  // 슈퍼볼~마스터볼 급
    if (Math.random() < 0.35) { const g = rollGimmick(Math.random); if (g) world.pickups.push({ ...g, x: n.x - 40, y: n.y + 40, ball: true }); }
    // 버드렉스는 첫 라이벌전을 이기면 유대의 고삐 하나를 바로 받는다 (기술 없이 시작하는 대신)
    if (n.rival === 'start' && p.mon.id === 898) { const rs = ['ice-reins', 'shadow-reins'].filter(id => !taken.has(id) && !p.items.some(i => i.id === id)); if (rs.length) { const id = pick(rs); taken.add(id); world.pickups.push({ kind: 'item', item: itemById(id), x: n.x + 40, y: n.y + 90, ball: true }); banner = { text: `라이벌에게 이겼다! 유대의 고삐가 떨어졌다`, t: 3 }; } }
    // 악의 조직의 거래를 8번 모두 거절했다면 마지막 승부 뒤에 라이벌이 조건 없는 최고급 거래를 해 준다
    if (n.rival === 'road' && !hostile && (p.evilRefused ?? 0) >= 8 && !p.rivalGiftDone) p.rivalGiftDue = true;
    map.returnT = 3.5;
  } });
}

function enterBuilding(b) {
  const p = player;
  if (b.kind === 'league' && p.beaten.size < region.gyms.length) return say(`배지가 ${region.gyms.length}개 있어야 들어갈 수 있다`, p.x, p.y - 70, '#f88');
  if (b.kind === 'league' && p.rival && !p.rival.done.has('road')) return say('라이벌이 앞을 막고 있다!', p.x, p.y - 70, '#f88');
  world.returnTo = [b.doorX, b.doorY + p.r + 20];
  map = makeIndoor(b);
  map.tier = p.beaten.size;  // 체육관 세기는 체육관 번호가 아니라 들어갈 때 가진 배지 수로 정한다 (리그는 8)
  resetCombat();
  p.x = map.rooms[0].cx; p.y = (map.th - 1.6) * TS;
}

// 챔피언은 포켓몬을 낼 때마다 챔피언의 자격에 대해 말한다
const CHAMP_SAY = ['배지 8개, 그리고 사천왕까지. 여기까지 올라온 실력은 인정하지.', '하지만 챔피언은 강하기만 해서 앉는 자리가 아니야. 몇 번을 쓰러져도 포켓몬과 함께 다시 일어서는 것, 그게 자격이다.',
  '아직이야! 이 자리를 지켜 온 시간만큼, 내 포켓몬들도 물러서지 않아!', '좋아, 조금씩 보이는군. 너와 그 포켓몬이 어떤 길을 걸어왔는지.', '도망치지 않는구나. 챔피언의 자리는 너 같은 트레이너를 기다리고 있었어.'];
const CHAMP_ACE = '이게 마지막 한 마리다. 네가 챔피언이 될 자격이 있는지, 이 녀석으로 확인하겠어!';

// 마스터볼 급 보상: 아직 없는 전설의 기술머신, 없으면 기믹 아이템, 그것도 없으면 아주 희귀한 도구
// 하이퍼볼 급 보상: 다른 전설의 전용 도구나 다른 타입 테라피스, 없으면 아주 희귀한 도구
function hyperReward() {
  const p = player, own = id => taken.has(id) || p.items.some(i => i.id === id);
  const pool = [...new Set([...Object.values(LEGEND_FORMS).map(f => f.item), ...Object.keys(TYPE_KO).map(t => `${t}-tera-shard`)])].filter(id => !own(id) && itemById(id) && ballGrade({ kind: 'item', item: itemById(id) }) === 2);
  if (pool.length && Math.random() < 0.6) { const id = pick(pool); taken.add(id); return { kind: 'item', item: itemById(id) }; }
  return rollContent(Math.random, { c: 0, r: 0, l: 1, g: 0 });
}
// 라이벌·관장 보상: 슈퍼볼(희귀한 도구) 50% · 하이퍼볼 급 35% · 마스터볼 급 15%
function bossReward() {
  const r = Math.random();
  if (r < 0.15) return masterReward();
  if (r < 0.5) return hyperReward();
  return rollContent(Math.random, { c: 0, r: 1, l: 0, g: 0 });
}
function masterReward() {
  const p = player, own = id => taken.has(id) || p.moves.has(id) || p.items.some(i => i.id === id), give = id => (taken.add(id), { kind: 'item', item: itemById(id) });
  // 자기 전설 전용 도구, 자기 타입 테라피스가 남아 있으면 그것부터
  const mines = [...new Set(Object.values(LEGEND_FORMS).filter(f => f.mon === p.mon.id && !own(f.item)).map(f => f.item))], mine = mines.length ? pick(mines) : null;
  if (mine && Math.random() < 0.75) return give(mine);
  const tera = myTypes().map(t => `${t}-tera-shard`).find(id => !own(id));
  if (tera && Math.random() < 0.35) return give(tera);
  const lt = LTMS.filter(t => !own(t.id) && !t.evil);
  if (lt.length && Math.random() < 0.6) { const t = pick(lt); taken.add(t.id); return { kind: 'tm', tm: t }; }
  return rollGimmick(Math.random) ?? (lt.length ? (t => (taken.add(t.id), { kind: 'tm', tm: t }))(pick(lt)) : rollContent(Math.random, { c: 0, r: 0, l: 1 }));
}

// 방 안으로 걸어 들어서면 아래 문이 닫히고 승부가 시작된다. 이기면 아래·위 문이 열린다
function startRoom(r) {
  const p = player, b = map.building, gi = region.gyms.indexOf(map.leader), gt = map.tier ?? gi, champ = r.who === region.league.at(-1), at = { x: r.cx, y: (r.y0 + 1.6) * TS };
  r.started = true; map.room = r;
  setDoors(r.down, false);
  const open = () => { r.cleared = true; setDoors(r.down, true); setDoors(r.up, true); };
  if (r.npc) return startBattle({ who: r.npc.name, title: '체육관 트레이너', queue: Array.from({ length: rollRange(GYM_TRAINER_MONS[gt < EARLY_GYMS ? 'early' : 'late']) }, () => pick(map.leader.mobs)), x: r.npc.x, y: r.npc.y, rank: 'trainer', tier: gt, onWin: () => {
    open(); r.npc.defeated = true;
    gainMoney(200 + gt * 200, r.npc.x, r.npc.y);
    banner = { text: `${r.npc.name}에게 이겼다! 위쪽 문이 열렸다`, t: 2.5 };
    map.pickups.push({ kind: 'berry', x: r.cx, y: (r.y0 + r.y1) / 2 * TS });
    if (Math.random() < 0.15) map.pickups.push({ kind: 'candy', x: r.cx + 50, y: (r.y0 + r.y1) / 2 * TS });
  } });
  const hits0 = p.hits ?? 0;
  // 관장은 배지가 적을 때 엔트리 뒤쪽(에이스 포함) 몇 마리만 낸다: 배지 0~1개 2마리, 2~3개 3마리, 4개 이상 전부
  const leaderTeam = r.who.team.slice(-clamp(2 + Math.floor(gt / 2), 2, r.who.team.length));
  if (b.kind === 'gym') return startBattle({ who: r.who.leader, title: r.who.title, queue: leaderTeam, ...at, rank: 'boss', tier: gt, onWin: () => {
    open(); if ((p.hits ?? 0) === hits0) ach('perfect'); p.beaten.add(gi); p.maxHp += badgeHp(); p.hp += badgeHp(); map.portal = gymPortal(r);
    if (ORGS[region.name]) p.evilDue = p.beaten.size;  // 체육관 밖으로 나가면 악의 조직이 거래를 걸어온다 (evil.js)
    gainMoney(1500 + gt * 600, at.x, at.y + 2 * TS);
    banner = { text: `${r.who.leader}에게 이겼다! 배지를 손에 넣었다 (${p.beaten.size}/${region.gyms.length})`, t: 3 }; sfx('badge');
    map.roadPortal = roadPortal(r);
    if (map.roadPortal) dialog = { name: r.who.leader, text: `배지 ${region.gyms.length}개를 다 모았구나. 저 고리를 타면 ${roadNode().name}까지 단숨에 갈 수 있어!`, t: 6, keep: true };
    map.pickups.push({ ...rollContent(Math.random, { tm: 0.55, c: 0, r: 0.7, l: 0.3 }), x: r.cx, y: (r.y0 + 4.5) * TS });
    map.pickups.push({ kind: 'candy', x: r.cx + 60, y: (r.y0 + 4.5) * TS });
    map.pickups.push({ ...bossReward(), x: r.cx, y: (r.y0 + 6) * TS, ball: true });  // 슈퍼볼~마스터볼 급
    if (Math.random() < 0.35) gimmickReward(r.cx - 60, (r.y0 + 4.5) * TS);
  } });
  // 사천왕 → 이기면 위쪽 방 문이 열린다. 마지막 방은 챔피언
  // 챔피언 방에 들어서면 한 번 완전 회복 (사천왕을 연달아 치른 뒤 숨 돌리기)
  if (champ && p.hp < p.maxHp) { heal(p.maxHp); sfx('heal'); say('기운을 되찾았다! 체력 완전 회복', p.x, p.y - 80, '#8f8'); }
  startBattle({ who: r.who.leader, title: r.who.title, queue: [...r.who.team], ...at, rank: 'boss', tier: 8, wait: champ ? 4 : 1, elite: true,
    // 사천왕은 대사 없음: false가 아니라 null을 넣는다 (bt.say?.()는 null·undefined만 건너뛰고, false는 호출하다 멈춘다)
    say: champ ? (i, ace) => ace ? CHAMP_ACE : CHAMP_SAY[Math.min(i, CHAMP_SAY.length - 1)] : null, onWin: bt => {
    open(); gainMoney(3000, at.x, at.y + 2 * TS);
    if (!champ) {
      heal(Math.ceil(p.maxHp / 2)); banner = { text: `${r.who.leader}에게 이겼다! 위쪽 방의 문이 열렸다`, t: 3 };
      // 사천왕 보상: 마스터볼 급(전설의 기술머신·기믹 아이템) 하나
      map.pickups.push({ ...masterReward(), x: r.cx, y: (r.y0 + 4.5) * TS, ball: true });
      map.pickups.push({ ...hyperReward(), x: r.cx - 60, y: (r.y0 + 4.5) * TS, ball: true });
      map.pickups.push({ kind: 'candy', x: r.cx + 60, y: (r.y0 + 4.5) * TS });
      // 마지막 사천왕을 이기면 챔피언전 전에 준비할 수 있게 간호순과 프렌들리숍 점원이 나온다
      if (region.league.indexOf(r.who) === region.league.length - 2) {
        const y = (r.y0 + 2.6) * TS;
        map.npcs.push({ id: -1, kind: 'nurse', sprite: 'nurse', name: '간호순', x: r.cx - 4 * TS, y },
          { id: -1, kind: 'shop', sprite: 'clerk', name: '점원', x: r.cx + 4 * TS, y, special: rollContent(Math.random, { tm: 0.35, c: 0, r: 0.3, l: 0.7, g: 0.5 }) });
        [r.cx - 4 * TS, r.cx + 4 * TS].forEach(x => fx.push({ kind: 'poof', x, y, t: 0.4, max: 0.4 }));
        dialog = { name: '간호순', text: '챔피언과 싸우기 전에 쉬어 가세요! 회복과 마지막 쇼핑을 도와드릴게요.', t: 5 };
      }
      return;
    }
    recordClear(); clearSave(); p.champion = true;
    p.champHp = bt.hpSum;  // 챔피언 포켓몬 전원의 체력 합: 후파의 고리 너머 전설의 체력 기준
    dialog = { name: r.who.leader, text: '...졌다. 너와 네 포켓몬이라면 이 자리를 맡겨도 되겠어. 오늘부터 네가 새로운 챔피언이다!', t: 6, keep: true };
    banner = { text: `챔피언 ${r.who.leader}에게 이겼다! 새로운 챔피언의 탄생이다!`, t: 5 };
    // 밖으로 나가는 고리를 밟으면 모험이 끝나고, 잠시 뒤 열리는 후파의 고리로 들어가면 전설·환상의 포켓몬과 싸운다
    map.portal = { ...gymPortal(r), win: true, label: '모험 끝내기' };
    map.hoopaT = 3; map.hoopaRoom = r;
  } });
  if (champ) dialog = { name: r.who.leader, text: `기다리고 있었어. 나는 ${region.name}지방의 챔피언 ${r.who.leader}. 이 방에 들어온 이상, 자격을 증명해야 해.`, t: 4, keep: true };
}

function leaveBuilding(to = null) {
  const p = player, from = map.sub;
  map = world;
  [p.x, p.y] = to ?? world.returnTo;
  resetCombat();
  if (from === 'rival' || to) p.warpIn = 0.6;
  if (p.hp > 0 && p.winAt <= 0) autoSave();
}

function updateBattle(dt) {
  const bt = map.battle, p = player;
  if (!bt) return;
  // 트레이너와의 승부에서는 도망칠 수 없다: 트레이너 둘레(BATTLE_FENCE) 밖으로는 못 나간다 (update.js의 fence)
  if (map.enemies.some(e => e.battle)) return;
  if (bt.queue.length && (bt.wait -= dt) <= 0) {
    const m = MON[bt.queue.shift()], ang = Math.atan2(p.y - bt.y, p.x - bt.x), e = spawnEnemy(m, bt.x + Math.cos(ang) * 50, bt.y + Math.sin(ang) * 50, bt.rank, bt.tier);
    if (bt.rival) e.moves = pickPatterns(e, 'rival');
    if (bt.elite) e.elite = true;  // 사천왕·챔피언: 각성하면 반 칸 더 아프다
    if (!bt.queue.length && bt.rank === 'boss') { e.hp *= 1.3; e.maxHp = e.hp; }  // 마지막 에이스는 더 단단하게
    if (bt.hpMul) { e.hp *= bt.hpMul; e.maxHp = e.hp; }  // 라이벌 체력 보정 (첫 승부는 보스급이지만 체력은 낮게)
    bt.hpSum = (bt.hpSum ?? 0) + e.maxHp;
    e.battle = true; keepInRoom(e);
    map.enemies.push(e); bt.wait = 1.2;
    const line = bt.say?.(bt.sent = (bt.sent ?? -1) + 1, !bt.queue.length);
    if (line) dialog = { name: bt.who, text: line, t: 3, keep: true };
    banner = { text: `${bt.who}은(는) ${m.name}을(를) 내보냈다!`, t: 2 };
  } else if (!bt.queue.length) { map.battle = null; samplePower(); bt.onWin(bt); }
}

// ---------- 후파의 고리: 챔피언을 이긴 뒤 열리는 보너스 보스전 ----------
// 고리 너머에는 반드시 이로치인 전설·환상의 포켓몬이 있다. 아직 해금하지 못한 포켓몬이 남아 있으면 그중에서만 나온다
// 체력은 방금 쓰러뜨린 챔피언 포켓몬 전원의 체력 합 x HOOPA_HP
const HOOPA_HP = 1.5, WARP_TIME = 2.4;
function openHoopaRing() {
  const r = map.hoopaRoom;
  map.hoopa = { x: r.cx, y: (r.y1 - 6.5) * TS, born: now };  // 밖으로 나가는 고리 바로 위: 둘이 한 화면에 보인다
  shake = 0.3; sfx('ring');
  banner = { text: '어디선가 후파의 고리가 나타났다!', t: 3.5, glow: '#c8f' };
  dialog = { name: '???', text: '...고리 너머에서 무언가가 이쪽을 보고 있다. 들어가 볼까?', t: 5 };
}

function enterHoopa() {
  const p = player, owned = new Set(loadUnlocked()), left = HOOPA_POOL.filter(id => !owned.has(id));
  map.hoopa.used = true;
  warp = { t: 0, x: map.hoopa.x, y: map.hoopa.y, px: p.x, py: p.y, id: pick(left.length ? left : HOOPA_POOL), ready: false };
  state = 'warp'; dialog = null; banner = null; sfx('hoopa');
  const w = warp;
  // 불러오기는 빨려 들어가는 연출 동안 한다. 실패하면 이미 불러 둔 전설 중에서 고른다
  loadMon(w.id).catch(() => { const have = HOOPA_POOL.filter(id => MON[id]); w.id = pick(have.filter(id => !owned.has(id)).length ? have.filter(id => !owned.has(id)) : have); })
    .then(() => loadShiny(MON[w.id])).then(() => w.ready = true);
}

function updateWarp(dt) {
  const w = warp, p = player;
  w.t += dt;
  // 고리 쪽으로 빨려 들어가며 빙글빙글 돌고 작아진다
  const k = clamp(w.t / 0.9, 0, 1);
  p.x = w.px + (w.x - w.px) * k * k; p.y = w.py + (w.y - w.py) * k * k;
  p.warpS = Math.max(0.05, 1 - k); p.face = Math.floor(w.t * 14) % 8; p.moving = false;
  if (w.t >= WARP_TIME && w.ready) enterHoopaStage(MON[w.id]);
}

// 전용 보스 스테이지: 별이 뜬 이공간 위의 둥근 결투장. 지진을 피할 기둥이 몇 개 있다
function makeHoopaArena() {
  const tw = 27, th = 19, cx = Math.floor(tw / 2), cy = Math.floor(th / 2);
  const solid = new Uint8Array(tw * th).fill(4), voids = new Uint8Array(tw * th).fill(1);
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const d = ((x - cx) / (cx + 0.5)) ** 2 + ((y - cy) / (cy + 0.5)) ** 2;
    if (d <= 1.12) voids[y * tw + x] = 0;
    if (d <= 0.82) solid[y * tw + x] = 0;
  }
  for (const [dx, dy] of [[-6, -3], [6, -3], [-8, 2], [8, 2], [-3, 5], [3, 5]]) solid[(cy + dy) * tw + cx + dx] = 1;
  const room = { i: 0, y0: 0, y1: th - 1, x0: 0, x1: tw - 1, cx: (cx + 0.5) * TS, type: 'ghost', down: [], up: [], cleared: true, started: true };
  return { kind: 'indoor', sub: 'hoopa', building: null, tw, th, solid, voids, rooms: [room], room, npcs: [], pickups: [], enemies: [], buildings: [], signs: [], battle: null, type: 'ghost', furn: [], leader: null };
}

function enterHoopaStage(m) {
  const p = player;
  warp = null; p.warpS = undefined; p.warpIn = 1;
  map = makeHoopaArena(); resetCombat();
  const r = map.room;
  p.x = r.cx; p.y = (map.th - 4) * TS; p.hp = p.maxHp; p.inv = 1.5; p.fT = p.fD = 0;  // 챔피언을 이긴 상으로 체력을 모두 회복
  const e = spawnEnemy(m, r.cx, 5 * TS, 'legend', 8);
  e.hp = e.maxHp = (p.champHp || e.maxHp) * HOOPA_HP;
  Object.assign(e, { shiny: true, hoopa: true, arena: true, aggro: true, leash: 0, cd: 2.5 });
  map.enemies.push(e);
  state = 'play'; shake = 0.4; sfx('legend');
  banner = { text: `앗! 색이 다른 ${m.name}이(가) 나타났다!`, t: 3.5, glow: '#c8f' };
}

// ---------- NPC ----------
function updateNpcs(dt) {
  const p = player;
  if (map.npcs.some(n => n.gone)) map.npcs = map.npcs.filter(n => !n.gone);
  for (const n of map.npcs) {
    if ((Math.abs(n.x - p.x) > 900 || Math.abs(n.y - p.y) > 700) && !n.rival) continue;
    if (n.kind !== 'trainer') { if (map === world) n.flip = p.x > n.x; continue; }
    if (n.rival && n.leaveT !== undefined && (n.leaveT -= dt) <= 0) { n.gone = true; fx.push({ kind: 'poof', x: n.x, y: n.y, t: 0.3, max: 0.3 }); continue; }
    if (n.defeated || n.fighting) { n.moving = false; continue; }
    // 라이벌은 플레이어를 향해 곧장 걸어와서 승부를 건다
    if (n.rival) {
      const d = Math.hypot(p.x - n.x, p.y - n.y);
      if (!map.battle && !legendFight && d < 200) { startRival(n); continue; }
      const [wx, wy] = pathDir(n), ox = n.x, oy = n.y;
      moveBody(n, wx * 150 * dt, wy * 150 * dt);
      n.moving = n.x !== ox || n.y !== oy; n.flip = p.x > n.x;
      continue;
    }
    // 트레이너와 눈이 마주치면 승부
    if (!map.battle && !legendFight && Math.hypot(p.x - n.x, p.y - n.y) < 170) { n.flip = p.x > n.x; startTrainer(n); continue; }
    if ((n.turn -= dt) <= 0) { const hd = Math.hypot(n.hx - n.x, n.hy - n.y); n.dir = hd > 120 ? [(n.hx - n.x) / hd, (n.hy - n.y) / hd] : Math.random() < 0.4 ? [0, 0] : randDir(); n.turn = 1 + Math.random() * 2; }
    const ox = n.x, oy = n.y;
    moveBody(n, n.dir[0] * 45 * dt, n.dir[1] * 45 * dt);
    n.moving = n.x !== ox || n.y !== oy;
    if (n.dir[0]) n.flip = n.dir[0] > 0;
  }
}

// 관장 방의 고리(밖으로·챔피언로드·모험 끝내기)는 밟아도 들어가지 않는다: 앞에서 E(휴대폰은 화면 터치)를 눌러야 들어간다
const PORTAL_R = 56;
const nearPortal = o => o && Math.hypot(player.x - o.x, player.y - o.y) < PORTAL_R;
function usePortal() {
  if (map.kind !== 'indoor' || map.battle) return false;
  if (nearPortal(map.portal)) { if (map.portal.win) state = 'win'; else leaveBuilding(); return true; }
  if (nearPortal(map.roadPortal)) { const n = roadNode(); leaveBuilding(openSpot(n)); banner = { text: `${n.name}(으)로 이동했다!`, t: 2.5 }; return true; }
  return false;
}

function talk() {
  if (usePortal()) return;
  const p = player, n = map.npcs.find(n => n.kind !== 'gymtrainer' && Math.hypot(n.x - p.x, n.y - p.y) < 90);
  if (!n || map.battle) return;
  p.talked = true;
  const line = s => dialog = { name: n.name, text: s, t: 3 };
  if (n.kind === 'nurse') {
    // 마을마다 간호순은 한 번만 회복해 준다. 모험 기록은 언제든 해 준다
    if (!n.healed) { n.healed = true; p.hp = p.maxHp; line('어서 오세요! 포켓몬의 체력을 모두 회복했어요! 모험도 기록해 둘게요.'); sfx('heal'); }
    else line('오늘 이 포켓몬센터의 회복은 이미 받으셨어요. 모험 기록만 해 둘게요!');
    autoSave();
  }
  if (n.kind === 'shop') { shopNpc = n; state = 'shop'; dialog = null; }
  if (n.kind === 'gift') {
    if (!n.gift) return line('여행 조심해!');
    map.pickups.push({ ...n.gift, x: n.x, y: n.y + 50, ball: true }); n.gift = null; line('이걸 줄게!');
  }
  if (n.kind === 'trainer' && !n.defeated && legendFight) return line('전설의 포켓몬이 날뛰고 있잖아! 승부는 나중에 하자!');
  if (n.kind === 'trainer') n.defeated ? line(n.rival ? '다음엔 내가 이긴다!' : '졌다...') : n.rival ? startRival(n) : startTrainer(n);
}

const shopPrice = s => Math.round(s.price * (s.grow ? 1.25 ** (player.bought[s.id] ?? 0) : 1));
const shopSpecial = n => !n.sold && n.special.kind !== 'berry' ? n.special : null;
const specialPrice = sp => sp.kind === 'tm' ? (sp.tm.legend ? 15000 : 5000) : ballGrade(sp) >= 3 ? 15000 : ballGrade(sp) === 2 ? 12000 : 6000;

function buy(i) {
  const p = player, n = shopNpc, s = SHOP[i], sp = i === SHOP.length ? shopSpecial(n) : null;
  const price = s ? shopPrice(s) : sp ? specialPrice(sp) : null;
  if (price === null) return;
  if (p.money < price) { sfx('deny'); return say('돈이 모자라다', p.x, p.y - 70, '#f88'); }
  p.money -= price; sfx('item');
  if (s) { s.use(); p.bought[s.id] = (p.bought[s.id] ?? 0) + 1; say(`${s.name}을(를) 샀다`, p.x, p.y - 70, '#8f8'); }
  else { n.sold = true; map.pickups.push({ ...sp, x: p.x, y: p.y - 10 }); state = 'play'; }
}
