// 보스 패턴: 타입마다 고유 기술 2개, 급(트레이너·관장·라이벌·전설)마다 고유 기술, 그리고 공통 기술
// 보스는 이 중에서 4개만 무작위로 골라 쓴다 (pickPatterns). 그래서 같은 관장도 판마다, 체육관마다 패턴이 달라진다
// 기술 한 줄: [패턴, 이름, 옵션]. 'sig'는 아래 SIG의 고유 동작, 나머지는 combat.js의 공통 패턴에 옵션만 바꾼 것
// 모든 패턴은 피할 수 있게 먼저 예고(낙하 지점·조준선·장판 테두리)를 보여 준다

const S = (name, sig, o = {}) => ['sig', name, { sig, ...o }];
const TYPE_SIG = {
  normal: [['charge', '전광석화', { reps: 3, wind: 0.25, speed: 640, dur: 0.35 }], S('대폭발', 'selfdestruct'), S('하이퍼보이스', 'hyperVoice')],
  fire: [S('불꽃소용돌이', 'firespin'), S('분화', 'eruption'), S('오버히트', 'overheat')],
  water: [S('소용돌이', 'whirlpool'), S('물의파동', 'aquaRing'), S('하이드로펌프', 'hydroPump')],
  electric: [S('10만볼트', 'boltLines'), S('전자포', 'zapCannon'), S('방전', 'dischargeF')],
  grass: [S('꽃잎댄스', 'petalDance'), S('씨뿌리기', 'leechSeed'), S('솔라빔', 'solarBeam')],
  ice: [S('싸라기눈', 'hailGrid'), S('냉동빔', 'iceLattice'), S('눈보라', 'blizzardF')],
  fighting: [S('폭발펀치', 'dynamicPunch'), S('기합구슬', 'focusBlast'), S('인파이트', 'closeCombat')],
  poison: [S('독압정', 'toxicSpikes'), S('오물웨이브', 'sludgeWave'), S('애시드봄', 'acidSpray')],
  ground: [S('땅가르기', 'fissure'), S('모래지옥', 'sandTomb'), S('지진', 'earthquakeF')],
  flying: [S('폭풍', 'hurricane'), S('급강하', 'aerialDive'), S('에어슬래시', 'airSlashF')],
  psychic: [S('사이코필드', 'psyField'), S('순간이동 난사', 'teleBarrage'), S('미래예지', 'futureSight')],
  bug: [S('실뿜기', 'stringShot'), S('벌레떼', 'swarm'), S('시저크로스', 'xScissor')],
  rock: [S('스텔스록', 'stealthRock'), S('원시의힘', 'ancientPower'), S('스톤에지', 'stoneEdge')],
  ghost: [S('도깨비불', 'wispCircle'), S('나이트헤드', 'nightShade'), S('섀도볼', 'shadowBallF')],
  dragon: [['jump', '드래곤다이브', { quake: true }], S('용의 회오리', 'dragonSpin'), S('용성군', 'dracoMeteor')],
  dark: [S('속임수', 'feint'), S('깜짝베기', 'nightSlash'), S('악의파동', 'darkPulseF')],
  steel: [S('기어소서', 'gearGrind'), S('코멧펀치', 'meteorMash'), S('러스터캐논', 'flashCannonF')],
  fairy: [S('달빛', 'moonlight'), S('꽃의 개화', 'flowerBloom'), S('문포스', 'moonblastF')],
};
// 급마다 고유 기술
const RANK_SIG = {
  trainer: [S('연속 공격', 'trainerCombo'), S('함정 설치', 'trap')],
  leader: [S('체육관 필드', 'gymField'), S('관장의 지시', 'command')],
  rival: [['charge', '라이벌 러시', { reps: 4, wind: 0.3, dur: 0.5, burst: true }], S('읽어내기', 'predict')],
  legend: [['summon', '동료 부르기'], S('전설의 영역', 'domain')],
};
const HEAVY = [['smash', '필살 일격'], ['hbeam', '필살 광선']];

// 전설 전용 기술: 전설의 상징 기술마다 하나. 이름은 그 기술 이름, 동작은 고유 동작 하나 또는 여러 동작을 시간차로 겹친 것
const LEGEND_SIG = {
  psystrike: ['psyField', 0, 'teleBarrage', 0.8], 'mist-ball': ['psyField', 0, 'flowerBloom', 0.6], 'luster-purge': ['psyField', 0, 'feint', 0.6],
  aeroblast: ['aeroL', 0, 'hurricane', 0.4], 'blue-flare': ['firespin', 0, 'eruption', 0.6], 'moongeist-beam': ['trackBeam', 0], eternabeam: ['eternaL', 0],
  'sacred-fire': ['eruption', 0, 'firespin', 1.2], 'origin-pulse': ['aquaRing', 0, 'whirlpool', 0.4], 'precipice-blades': ['fissure', 0, 'meteorMash', 0.6],
  'thousand-arrows': ['fissure', 0, 'hailGrid', 0.6], 'dragon-ascent': ['ascentL', 0], 'collision-course': ['ascentL', 0], 'electro-drift': ['ascentL', 0, 'boltLines', 0.3],
  'roar-of-time': ['timeL', 0], 'spacial-rend': ['nightSlash', 0, 'nightShade', 0.8], 'shadow-force': ['wispCircle', 0, 'aerialDive', 0.4],
  'fusion-bolt': ['boltLines', 0, 'zapCannon', 0.5], 'sheer-cold': ['iceLattice', 0, 'hailGrid', 0.5], 'sunsteel-strike': ['nightSlash', 0, 'gearGrind', 0.5],
  'behemoth-blade': ['nightSlash', 0, 'meteorMash', 0.5], 'behemoth-bash': ['dynamicPunch', 0, 'dynamicPunch', 1.6], geomancy: ['flowerBloom', 0, 'moonlight', 0.6],
  'oblivion-wing': ['whirlpool', 0, 'swarm', 0.5], 'seed-flare': ['leechSeed', 0, 'petalDance', 0.3], 'natures-madness': ['domain', 0, 'feint', 0.6],
  ruination: ['domain', 0, 'nightShade', 0.5], 'diamond-storm': ['stealthRock', 0, 'ancientPower', 0.3],
  'photon-geyser': ['psyField', 0, 'trackBeam', 0.5], 'glacial-lance': ['iceLattice', 0, 'hailGrid', 0.4], 'astral-barrage': ['wispCircle', 0, 'teleBarrage', 0.6],
  'wicked-blow': ['nightSlash', 0, 'dynamicPunch', 0.6], 'surging-strikes': ['aquaRing', 0, 'whirlpool', 0.3], 'ivy-cudgel': ['leechSeed', 0, 'petalDance', 0.4],
  'tera-starstorm': ['stealthRock', 0, 'trackBeam', 0.5],
  'zap-cannon': ['zapCannon', 0, 'boltLines', 0.5], 'sky-attack': ['ascentL', 0, 'firespin', 0.4], 'expanding-force': ['psyField', 0, 'teleBarrage', 0.6],
  discharge: ['boltLines', 0, 'zapCannon', 0.6], scald: ['aquaRing', 0, 'trackBeam', 0.5], 'leaf-storm': ['petalDance', 0, 'leechSeed', 0.5],
  'ancient-power': ['ancientPower', 0, 'stealthRock', 0.5], 'frost-breath': ['iceLattice', 0, 'hailGrid', 0.4], 'heavy-slam': ['dynamicPunch', 0, 'meteorMash', 0.8],
  'doom-desire': ['stealthRock', 0, 'meteorMash', 0.8], 'psycho-boost': ['psyField', 0, 'trackBeam', 0.4], 'mystical-power': ['psyField', 0, 'teleBarrage', 0.6],
  'lunar-blessing': ['moonlight', 0, 'psyField', 0.5], 'take-heart': ['aquaRing', 0, 'teleBarrage', 0.5], 'dark-void': ['domain', 0, 'nightShade', 0.4],
  judgment: ['hailGrid', 0, 'trackBeam', 0.6], 'v-create': ['eruption', 0, 'ascentL', 0.5], 'bleakwind-storm': ['hurricane', 0, 'aeroL', 0.5],
  'wildbolt-storm': ['hurricane', 0, 'boltLines', 0.4], 'sandsear-storm': ['hurricane', 0, 'fissure', 0.4], glaciate: ['iceLattice', 0, 'hailGrid', 0.5],
  'freeze-shock': ['iceLattice', 0, 'zapCannon', 0.5], 'secret-sword': ['nightSlash', 0, 'meteorMash', 0.5], 'relic-song': ['flowerBloom', 0, 'feint', 0.5],
  'techno-blast': ['gearGrind', 0, 'trackBeam', 0.5], 'hyperspace-hole': ['feint', 0, 'teleBarrage', 0.5], 'hyperspace-fury': ['nightSlash', 0, 'feint', 0.4],
  'steam-eruption': ['eruption', 0, 'aquaRing', 0.4], 'fleur-cannon': ['flowerBloom', 0, 'trackBeam', 0.4], 'spectral-thief': ['wispCircle', 0, 'dynamicPunch', 0.5],
  'plasma-fists': ['dynamicPunch', 0, 'boltLines', 0.4], 'jungle-healing': ['leechSeed', 0, 'petalDance', 0.4], 'light-that-burns-the-sky': ['psyField', 0, 'trackBeam', 0.3],
};
const legendSig = m => { const id = LEGEND_MOVE[m.id], d = id && moveDef(id); return d && LEGEND_SIG[id] ? S(d.name, 'legendCombo', { parts: LEGEND_SIG[id], type: d.type, legendSig: true }) : null; };

const shuffle = list => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// cls: trainer / leader / rival / legend. 타입 기술은 그 기술의 타입 색으로 나간다
function pickPatterns(e, cls) {
  // 첫 라이벌·초반 관장(단계 0~1)은 기술 3개만: 처음 만나는 보스전이 버겁지 않게
  const m = e.mon, big = isBig(e), N = big && cls !== 'legend' && (e.tier ?? 0) <= 1 ? 3 : 4, out = [], add = mv => { if (mv && out.length < N && !out.some(o => o[1] === mv[1])) out.push(mv); };
  e.cls = cls;
  if (cls === 'legend') add(legendSig(m));  // 전설은 전용 기술을 늘 갖는다
  const sigs = shuffle(m.types.flatMap(t => TYPE_SIG[t].map(([k, n, o]) => [k, n, { ...o, type: t }])));
  add(sigs[0]);
  if ((big && Math.random() < 0.8) || Math.random() < 0.35) add(sigs[1]);
  if (big || Math.random() < 0.5) add(pick(RANK_SIG[cls]));
  if (big && e.tier >= 4 && Math.random() < 0.6) add(pick(HEAVY));
  // 남는 자리는 공통 기술로: 타입별 기본 기술 + 돌진·누르기 + 강할수록 까다로운 공통 패턴
  const common = [...movesFor(m), ...(e.lvl >= 1 ? [['ring', '포위 탄막'], ['rain', RAIN_NAME[m.types[0]] ?? '유성우']] : []), ...(e.lvl >= 2 ? [['cross', '십자 포화']] : []),
    ...(big ? ADV_MOVES.slice(0, cls === 'legend' ? ADV_MOVES.length : [2, 4, 5][e.lvl]) : [])];
  for (const mv of shuffle(common)) add(mv);
  return out;
}
// 이 상대가 쓸 수 있는 기술 전부 (각성 때 바꿔 넣을 후보)
function allPatterns(e) {
  const m = e.mon;
  return [...m.types.flatMap(t => TYPE_SIG[t].map(([k, n, o]) => [k, n, { ...o, type: t }])), ...RANK_SIG[e.cls ?? 'leader'], ...(e.tier >= 2 ? HEAVY : []),
    ...movesFor(m), ['ring', '포위 탄막'], ['rain', RAIN_NAME[m.types[0]] ?? '유성우'], ['cross', '십자 포화'], ...ADV_MOVES];
}
// 각성(체력 절반): 지금 기술 중 둘을 새 기술 둘로 바꾼다 (전설 전용 기술은 남긴다). 그 뒤로 기술이 빨라지고(x1.3) 맞으면 반 칸 더 아프다
function awaken(e) {
  const pool = shuffle(allPatterns(e).filter(mv => !e.moves.some(o => o[1] === mv[1]))), idx = shuffle(e.moves.map((_, i) => i).filter(i => !e.moves[i][2]?.legendSig)).slice(0, 2);
  for (const i of idx) { const mv = pool.shift(); if (mv) e.moves[i] = mv; }
  e.awake = true;
}
const AWAKE_SPEED = 1.3;

// ---------- 고유 동작 ----------
const toP = e => Math.atan2(player.y - e.y, player.x - e.x);
const hz = (e, a, o) => hazards.push({ type: a.type, src: e, move: a.name, ...o });
// 초반 보스(단계 0~1): 낙하 표식·장판을 하나 걸러 하나만 (화면이 표식으로 뒤덮이지 않게)
const thin = (e, a) => isBig(e) && (e.tier ?? 0) <= 1 && (a.hzN = (a.hzN ?? 0) + 1) % 2 === 0;
const strikeAt = (e, a, x, y, r = 38, t = 0.9, o = {}) => thin(e, a) ? 0 : hz(e, a, { kind: 'strike', x, y, r, t, t0: t, ...o });
// 장판: delay 동안 테두리로 예고, 그 뒤 dur 동안 밟으면 피해 (slow면 피해 대신 느려짐)
const zoneAt = (e, a, x, y, r, delay, dur, o = {}) => thin(e, a) ? 0 : hz(e, a, { kind: 'zone', x, y, r, delay, delay0: delay, dur, ...o });
// 선: t 동안 예고한 뒤 선 전체가 터진다
const lineAt = (e, a, x, y, ang, len, w, t) => hz(e, a, { kind: 'line', x, y, a: ang, len: Math.hypot(x - e.x, y - e.y) < 40 ? Math.max(24, beamLen(x, y, Math.cos(ang), Math.sin(ang), true, len)) : len, w, t, t0: t });
const lineThrough = (e, a, cx, cy, ang, len, w, t) => lineAt(e, a, cx - Math.cos(ang) * len / 2, cy - Math.sin(ang) * len / 2, ang, len, w, t);
const ringShots = (e, a, n, sp, o = {}, off = Math.random()) => { for (let i = 0; i < n; i++) enemyShot(e, (i / n + off) * Math.PI * 2, sp, { type: a.type, ...o }); };
const fanShots = (e, a, base, n, gap, sp, o = {}) => { for (let i = 0; i < n; i++) enemyShot(e, base + (i - (n - 1) / 2) * gap, sp, { type: a.type, ...o }); };
// 정해진 시각에 한 번만 true
const at = (a, i, time) => { a.done ??= new Set(); if (a.t < time || a.done.has(i)) return false; a.done.add(i); return true; };
const every = (a, gap, dt) => (a.tick = (a.tick ?? 0) - dt) <= 0 && (a.tick = gap, true);
const lv = e => e.lvl ?? 0, few = e => isBig(e) ? 1 : 0.6;
// 플레이어를 보스 쪽으로 끌어당긴다 (구르는 동안은 안 끌린다)
function pullPlayer(e, v, dt) {
  const p = player; if (p.dash > 0 || abStat('clear', false)) return;
  const d = Math.hypot(p.x - e.x, p.y - e.y) || 1; if (d < e.r + 30) return;
  moveBody(p, (e.x - p.x) / d * v * dt, (e.y - p.y) / d * v * dt);
}
const blink = (e, x, y) => { fx.push({ kind: 'poof', x: e.x, y: e.y, t: 0.3, max: 0.3 }); e.x = x; e.y = y; clampBody(e); unstick(e); fx.push({ kind: 'poof', x: e.x, y: e.y, t: 0.3, max: 0.3 }); };

// 하위 동작을 off초 뒤에 시작한다. 하위 동작은 따로 시간을 잰다
function subSig(e, a, i, name, off, dt) {
  const c = (a.subs ??= [])[i] ??= { type: a.type, name: a.name, t: 0 };
  if (c.fin || a.t < off) return !!c.fin;
  c.t += dt; if (SIG[name](e, c, dt)) c.fin = true;
  if (c.arms !== undefined) { a.arms = c.arms; a.armOn = c.armOn; a.heavy = c.heavy; }
  return !!c.fin;
}
// 광선 팔(회전·추적 광선)에 맞았는지
function armsHit(e, a) {
  const p = player;
  for (const g of a.arms) { const dx = Math.cos(g), dy = Math.sin(g), rx = p.x - e.x, ry = p.y - e.y, s = rx * dx + ry * dy; if (s > 0 && s < beamLen(e.x, e.y, dx, dy, true) && Math.abs(rx * dy - ry * dx) < (a.heavy ? 22 : 14) + p.r) hurt(a.type, a.heavy ? heavyDmg(e) : 1); }
}

const SIG = {
  // ---------- 2026-11-23 추가: 타입마다 세 번째 기술 ----------
  // 노말 하이퍼보이스: 음파 고리 세 겹. 겹마다 빈틈 방향이 다르다
  hyperVoice: (e, a) => {
    for (let w = 0; w < 3; w++) if (at(a, w, 0.3 + w * 0.5)) { const n = 16 + 2 * lv(e), gap = toP(e) + (w - 1) * 0.9; for (let i = 0; i < n; i++) { const g = gap + 0.35 + i / n * (Math.PI * 2 - 0.7); enemyShot(e, g, 170, { type: a.type }); } fx.push({ kind: 'ring', x: e.x, y: e.y, t: 0.3, max: 0.3 }); }
    return a.t >= 1.7;
  },
  // 불꽃 오버히트: 빠른 불꽃 부채꼴 세 번 (점점 좁아진다)
  overheat: (e, a) => {
    for (let w = 0; w < 3; w++) if (at(a, w, 0.4 + w * 0.45)) fanShots(e, a, toP(e), 7 + lv(e), 0.2 - w * 0.04, 250 + w * 30, { r: 8 });
    return a.t >= 1.8;
  },
  // 물 하이드로펌프: 나를 노리는 굵은 물줄기 세 번
  hydroPump: (e, a) => {
    for (let w = 0; w < 3; w++) if (at(a, w, 0.2 + w * 0.7)) lineAt(e, a, e.x, e.y, toP(e), 800, 42, 0.6);
    return a.t >= 2.5;
  },
  // 전기 방전: 보스 둘레 넓은 전기 장판 → 터지며 사방 탄
  dischargeF: (e, a) => {
    if (at(a, 0, 0.2)) zoneAt(e, a, e.x, e.y, 160 + 20 * lv(e), 1.0, 0.4);
    if (at(a, 1, 1.3)) ringShots(e, a, 10 + 2 * lv(e), 210);
    return a.t >= 1.8;
  },
  // 풀 솔라빔: 빛을 모았다가 아주 굵은 광선 한 줄, 끝나고 씨앗 부채꼴
  solarBeam: (e, a) => {
    if (at(a, 0, 0)) lineAt(e, a, e.x, e.y, toP(e), 950, 80, 1.3);
    if (at(a, 1, 1.6)) fanShots(e, a, toP(e), 5, 0.3, 200);
    return a.t >= 1.9;
  },
  // 얼음 눈보라: 내 쪽으로 넓게 흩어지는 얼음 알갱이
  blizzardF: (e, a, dt) => {
    if (a.t < 1.6 && every(a, 0.07, dt)) enemyShot(e, toP(e) + (Math.random() - 0.5) * 1.1, 120 + Math.random() * 90, { type: a.type, r: 6 });
    return a.t >= 1.9;
  },
  // 격투 인파이트: 내 쪽으로 뛰어든 뒤 둘레를 세 번 연달아 친다
  closeCombat: (e, a, dt) => {
    if (at(a, 0, 0)) { a.tx = player.x; a.ty = player.y; }
    if (a.t > 0.2 && a.t < 0.6) { const d = Math.hypot(a.tx - e.x, a.ty - e.y); if (d > e.r + 30) { const v = Math.min(d, 600 * dt); moveBody(e, (a.tx - e.x) / d * v, (a.ty - e.y) / d * v); e.moving = true; } }
    for (let k = 0; k < 3; k++) if (at(a, 1 + k, 0.6 + k * 0.3)) strikeAt(e, a, e.x, e.y, e.r + 60, 0.5);
    return a.t >= 1.9;
  },
  // 독 애시드봄: 내 쪽으로 독 장판이 줄지어 깔린다
  acidSpray: (e, a) => {
    if (at(a, 0, 0.2)) { const g = toP(e); for (let i = 1; i <= 5 + lv(e); i++) zoneAt(e, a, e.x + Math.cos(g) * i * 75, e.y + Math.sin(g) * i * 75, 42, 0.5 + i * 0.1, 2.5); }
    return a.t >= 1.3;
  },
  // 땅 지진: 퍼져 나가는 충격파 세 번 (구르기로 넘거나 바위 뒤에 숨는다)
  earthquakeF: (e, a) => {
    for (let w = 0; w < 3; w++) if (at(a, w, 0.3 + w * 0.6)) { hz(e, a, { kind: 'quake', x: e.x, y: e.y, R: e.r, hit: false }); shake = 0.2; }
    return a.t >= 2.2;
  },
  // 비행 에어슬래시: 빠른 칼날 부채꼴이 엇갈려 네 번
  airSlashF: (e, a) => {
    for (let w = 0; w < 4; w++) if (at(a, w, 0.2 + w * 0.3)) fanShots(e, a, toP(e) + (w % 2 ? 0.14 : -0.14), 4, 0.3, 290, { r: 7 });
    return a.t >= 1.6;
  },
  // 에스퍼 미래예지: 지금 내가 있는 자리에 잠시 뒤 염동 폭발 (세 번)
  futureSight: (e, a) => {
    for (let w = 0; w < 3; w++) if (at(a, w, 0.1 + w * 0.5)) strikeAt(e, a, player.x, player.y, 70, 1.2);
    return a.t >= 2.4;
  },
  // 벌레 시저크로스: 나를 지나는 X자 두 줄 → 십자 두 줄
  xScissor: (e, a) => {
    const p = player;
    if (at(a, 0, 0.3)) { a.cx = p.x; a.cy = p.y; for (const g of [Math.PI / 4, -Math.PI / 4]) lineThrough(e, a, a.cx, a.cy, g, 700, 34, 0.8); }
    if (at(a, 1, 1.2)) for (const g of [0, Math.PI / 2]) lineThrough(e, a, p.x, p.y, g, 700, 34, 0.8);
    return a.t >= 2.2;
  },
  // 바위 스톤에지: 보스에서 내 쪽으로 바위 칼날이 차례로 솟는다
  stoneEdge: (e, a) => {
    if (at(a, 0, 0)) a.g = toP(e);
    for (let i = 0; i < 8; i++) if (at(a, 1 + i, 0.2 + i * 0.08)) strikeAt(e, a, e.x + Math.cos(a.g) * (60 + i * 70), e.y + Math.sin(a.g) * (60 + i * 70), 42, 0.6);
    return a.t >= 1.5;
  },
  // 고스트 섀도볼: 크고 느린 그림자 구슬이 나를 따라온다
  shadowBallF: (e, a) => {
    for (let i = 0; i <= (lv(e) >= 1 ? 1 : 0); i++) if (at(a, i, 0.3 + i * 0.6)) enemyShot(e, toP(e) + (i ? 0.5 : 0), 110, { type: a.type, r: 16, seek: 2.5, life: 4.5 });
    return a.t >= 1.4;
  },
  // 드래곤 용성군: 내 둘레에 유성이 여기저기 떨어진다
  dracoMeteor: (e, a) => {
    if (at(a, 0, 0.3)) { const p = player; for (let i = 0; i < Math.round((7 + lv(e)) * few(e)); i++) { const g = Math.random() * Math.PI * 2, r = Math.random() * 220; strikeAt(e, a, p.x + Math.cos(g) * r, p.y + Math.sin(g) * r * 0.8, 55, 1.0 + i * 0.08); } }
    return a.t >= 2.0;
  },
  // 악 악의파동: 반은 오른쪽, 반은 왼쪽으로 휘는 고리 두 겹
  darkPulseF: (e, a) => {
    for (let w = 0; w < 2; w++) if (at(a, w, 0.2 + w * 0.7)) ringShots(e, a, 16 + 2 * lv(e), 160, { curve: w ? -0.6 : 0.6 });
    return a.t >= 1.6;
  },
  // 강철 러스터캐논: 커다란 빛 구슬이 날아가다 터져 사방으로
  flashCannonF: (e, a) => {
    for (let i = 0; i <= (lv(e) >= 1 ? 1 : 0); i++) if (at(a, i, 0.3 + i * 0.7)) enemyShot(e, toP(e), 150, { type: a.type, r: 18, split: 1.0, splitN: 12 + 2 * lv(e) });
    return a.t >= 1.6;
  },
  // 페어리 문포스: 달빛 구슬이 나를 따라오다 터진다
  moonblastF: (e, a) => {
    if (at(a, 0, 0.3)) enemyShot(e, toP(e), 120, { type: a.type, r: 20, seek: 1.5, split: 2.0, splitN: 10 + 2 * lv(e), life: 4 });
    return a.t >= 1.4;
  },
  // 전설 전용: 여러 동작을 시간차로 겹친다
  legendCombo: (e, a, dt) => {
    let all = true;
    for (let i = 0; i < a.parts.length; i += 2) if (!subSig(e, a, i / 2, a.parts[i], a.parts[i + 1], dt)) all = false;
    if (all) { a.arms = null; e.fade = 0; }
    return all;
  },
  // 에어로블라스트: 보스에서 부채꼴로 바람 선이 차례로 (왼쪽 → 오른쪽)
  aeroL: (e, a) => {
    if (at(a, 9, 0)) { a.base = toP(e); a.dir = Math.random() < 0.5 ? 1 : -1; }
    for (let i = 0; i < 7; i++) if (at(a, i, 0.2 + i * 0.13)) lineAt(e, a, e.x, e.y, a.base + a.dir * (i - 3) * 0.2, 700, 40, 0.6);
    return a.t >= 1.9;
  },
  // 섀도레이: 천천히 나를 따라오는 굵은 광선
  trackBeam: (e, a, dt) => {
    if (at(a, 0, 0)) a.base = toP(e);
    if (a.t > 0.8) a.base = turnToward(a.base, toP(e), 0.8 * dt);
    a.arms = [a.base]; a.armOn = a.t > 0.8; a.heavy = false;
    if (a.armOn) armsHit(e, a);
    if (a.t >= 3) { a.arms = null; return true; }
    return false;
  },
  // 무한다이빔: 세 갈래 필살 광선 (예고가 길다)
  eternaL: (e, a) => {
    if (at(a, 0, 0)) a.base = toP(e);
    a.arms = [-0.45, 0, 0.45].map(o => a.base + o); a.armOn = a.t > 1.2 && a.t < 1.9; a.heavy = true;
    if (a.armOn) armsHit(e, a);
    if (at(a, 1, 1.2)) shake = 0.35;
    if (a.t >= 2.2) { a.arms = null; return true; }
    return false;
  },
  // 화룡점정·브레이브차지·라이트닝드라이브: 네 번 연달아 돌진, 멈출 때마다 충격파와 사방 탄
  ascentL: (e, a, dt) => {
    const c = Math.floor(a.t / 0.6), ct = a.t - c * 0.6;
    if (c >= 4) return true;
    if (at(a, c * 2, c * 0.6)) { const g = toP(e); a.dx = Math.cos(g); a.dy = Math.sin(g); fx.push({ kind: 'ring', x: e.x, y: e.y, t: 0.25, max: 0.25 }); }
    if (ct > 0.25) { moveBody(e, a.dx * 720 * dt, a.dy * 720 * dt); clampBody(e); e.moving = true; if (Math.hypot(player.x - e.x, player.y - e.y) < e.r + player.r) hurt(a.type, isBig(e) ? 2 : 1); }
    if (at(a, c * 2 + 1, c * 0.6 + 0.58)) { hz(e, a, { kind: 'quake', x: e.x, y: e.y, R: e.r, hit: false }); ringShots(e, a, 8, 190); }
    return false;
  },
  // 시간의포효: 내 몸이 느려지고, 둘레에 멈춰 있던 탄이 한꺼번에 날아온다 (두 번)
  timeL: (e, a) => {
    for (let s = 0; s < 2; s++) if (at(a, s, 0.2 + s * 1.5)) {
      const p = player, n = 16 + 4 * s, R = 210 + 50 * s;
      if (s === 0) { p.webbed = 1.4; banner = { text: '시간이 일그러진다!', t: 1.2, glow: '#68f' }; }
      for (let i = 0; i < n; i++) { const g = i / n * Math.PI * 2; enemyShot(e, 0, 0, { type: a.type, r: 8, x: p.x + Math.cos(g) * R, y: p.y + Math.sin(g) * R * 0.8, wait: 1.1, go: 250, life: 5 }); }
    }
    return a.t >= 3.2;
  },
  // 노말: 몸이 빛나다가 주변 크게 폭발
  selfdestruct: (e, a) => {
    if (at(a, 0, 0)) strikeAt(e, a, e.x, e.y, 170, 1.4, { dmg: e.tier >= 4 ? 2 : 1 });
    e.hit = Math.sin(a.t * 30) > 0 ? 0.05 : 0;
    if (at(a, 1, 1.4)) ringShots(e, a, 12 + 4 * lv(e), 200);
    return a.t >= 1.8;
  },
  // 불꽃: 플레이어 둘레에 불길 고리(틈 하나). 가운데는 안전
  firespin: (e, a) => {
    if (at(a, 0, 0)) { const p = player, n = 12, gap = Math.floor(Math.random() * n); for (let i = 0; i < n; i++) if (i !== gap && i !== (gap + 1) % n) { const g = i / n * Math.PI * 2; zoneAt(e, a, p.x + Math.cos(g) * 140, p.y + Math.sin(g) * 100, 40, 0.8, 2.4); } }
    if (lv(e) >= 1 && at(a, 1, 1.0)) fanShots(e, a, toP(e), 5, 0.25, 200);
    return a.t >= 1.4;
  },
  // 불꽃: 보스 둘레로 퍼져 나가는 분화 고리 3겹
  eruption: (e, a) => {
    for (let w = 0; w < 3; w++) if (at(a, w, 0.2 + w * 0.45)) { const n = 8 + w * 4, off = Math.random(); for (let i = 0; i < n; i++) { const g = (i / n + off) * Math.PI * 2, R = 100 + w * 95; strikeAt(e, a, e.x + Math.cos(g) * R, e.y + Math.sin(g) * R * 0.8, 40, 0.75); } }
    return a.t >= 2.2;
  },
  // 물: 끌어당기며 소용돌이 탄
  whirlpool: (e, a, dt) => {
    pullPlayer(e, 115, dt);
    if (every(a, 0.11, dt)) { a.rot = (a.rot ?? Math.random() * 6) + 0.5; for (let k = 0; k < 2 + (lv(e) >= 2 ? 1 : 0); k++) enemyShot(e, a.rot + k * Math.PI * 2 / (2 + (lv(e) >= 2 ? 1 : 0)), 130, { type: a.type, curve: 0.9 }); }
    if (at(a, 9, 0) || at(a, 10, 0.7) || at(a, 11, 1.4)) fx.push({ kind: 'wave', x: e.x, y: e.y, t: 0.45, max: 0.45 });
    return a.t >= 2.1;
  },
  // 물: 반은 오른쪽, 반은 왼쪽으로 휘는 고리 탄 (격자 무늬)
  aquaRing: (e, a) => {
    for (let w = 0; w < 3; w++) if (at(a, w, 0.3 + w * 0.6)) { const n = 14, off = Math.random(); for (let i = 0; i < n; i++) enemyShot(e, (i / n + off) * Math.PI * 2, 150, { type: a.type, curve: i % 2 ? 0.8 : -0.8 }); }
    return a.t >= 1.9;
  },
  // 전기: 보스에서 십자 번개 → 45도 돌린 십자
  boltLines: (e, a) => {
    const sets = lv(e) >= 1 ? 3 : 2;
    for (let s = 0; s < sets; s++) if (at(a, s, 0.2 + s * 0.8)) { const base = toP(e) + s * Math.PI / 4; for (let k = 0; k < 4; k++) lineAt(e, a, e.x, e.y, base + k * Math.PI / 2, 650, 34, 0.75); }
    return a.t >= 0.2 + sets * 0.8 + 0.2;
  },
  // 전기: 느리게 따라오는 커다란 전기 구슬이 터지며 사방으로
  zapCannon: (e, a) => {
    for (let i = 0; i <= (lv(e) >= 2 ? 1 : 0); i++) if (at(a, i, 0.5 + i * 0.6)) enemyShot(e, toP(e), 95, { type: a.type, r: 20, seek: 2, split: 2.4, splitN: 14 + 4 * lv(e), life: 4 });
    return a.t >= 1.2;
  },
  // 풀: 휘면서 빨라지는 꽃잎 세 갈래
  petalDance: (e, a, dt) => {
    if (a.t < 1.8 && every(a, 0.09, dt)) { a.rot = (a.rot ?? Math.random() * 6) + 0.33; for (let k = 0; k < 3; k++) enemyShot(e, a.rot + k * Math.PI * 2 / 3, 110, { type: a.type, curve: 1.1, accel: 0.6 }); }
    return a.t >= 2;
  },
  // 풀: 플레이어 주변에 씨앗 장판이 여기저기
  leechSeed: (e, a) => {
    if (at(a, 0, 0.3)) { const p = player; for (let i = 0; i < Math.round((5 + lv(e)) * few(e)); i++) { const g = Math.random() * Math.PI * 2, r = 50 + Math.random() * 170; zoneAt(e, a, p.x + Math.cos(g) * r, p.y + Math.sin(g) * r * 0.8, 46, 0.9, 3.5); } }
    return a.t >= 0.9;
  },
  // 얼음: 바둑판 모양으로 두 번 엇갈려 떨어지는 우박
  hailGrid: (e, a) => {
    for (let s = 0; s < 2; s++) if (at(a, s, 0.3 + s * 0.8)) { const p = player; a.cx ??= p.x; a.cy ??= p.y; for (let i = -2; i <= 2; i++) for (let j = -2; j <= 1; j++) if ((i + j + 10 + s) % 2 === 0) strikeAt(e, a, a.cx + i * 90, a.cy + j * 80 + 40, 46, 0.9); }
    return a.t >= 2.2;
  },
  // 얼음: 가로 세 줄 → 세로 세 줄 얼음 광선 (줄 사이가 안전)
  iceLattice: (e, a) => {
    const p = player;
    if (at(a, 0, 0.3)) for (let k = -1; k <= 1; k++) lineThrough(e, a, p.x, p.y + k * 110 + 55, 0, 1000, 30, 0.9);
    if (at(a, 1, 1.3)) for (let k = -1; k <= 1; k++) lineThrough(e, a, p.x + k * 120 + 60, p.y, Math.PI / 2, 800, 30, 0.9);
    return a.t >= 2.4;
  },
  // 격투: 표시된 곳으로 뛰어들어 주먹으로 내리친다
  dynamicPunch: (e, a, dt) => {
    if (at(a, 0, 0)) { a.tx = player.x; a.ty = player.y; strikeAt(e, a, a.tx, a.ty, 110, 1.0); }
    if (a.t > 0.5 && a.t < 1.0) { const d = Math.hypot(a.tx - e.x, a.ty - e.y); if (d > 8) { const v = Math.min(d, 700 * dt); moveBody(e, (a.tx - e.x) / d * v, (a.ty - e.y) / d * v); e.moving = true; } }
    if (at(a, 1, 1.0)) { shake = 0.25; ringShots(e, a, 10 + 2 * lv(e), 190); }
    return a.t >= 1.5;
  },
  // 격투: 기를 모아 아주 큰 구슬
  focusBlast: (e, a) => {
    if (at(a, 9, 0)) fx.push({ kind: 'ring', x: e.x, y: e.y, t: 0.9, max: 0.9 });
    const n = 1 + Math.min(lv(e), 2);
    for (let i = 0; i < n; i++) if (at(a, i, 0.9 + i * 0.4)) enemyShot(e, toP(e), 290, { type: a.type, r: 26, life: 3 });
    return a.t >= 1.2 + n * 0.4;
  },
  // 독: 독 장판을 흩뿌린다
  toxicSpikes: (e, a) => {
    if (at(a, 0, 0.2)) { const p = player; for (let i = 0; i < Math.round((7 + 2 * lv(e)) * few(e)); i++) { const g = Math.random() * Math.PI * 2, r = Math.random() * 230; zoneAt(e, a, p.x + Math.cos(g) * r, p.y + Math.sin(g) * r * 0.8, 40, 0.6, 5); } }
    return a.t >= 0.8;
  },
  // 독: 충격파 두 번 사이에 탄 고리
  sludgeWave: (e, a) => {
    if (at(a, 0, 0.3) || at(a, 1, 1.0)) { hz(e, a, { kind: 'quake', x: e.x, y: e.y, R: e.r, hit: false }); shake = 0.2; }
    if (at(a, 2, 0.65)) ringShots(e, a, 12 + 2 * lv(e), 170);
    return a.t >= 1.5;
  },
  // 땅: 보스에서 플레이어 쪽으로 땅이 갈라진다
  fissure: (e, a) => {
    if (at(a, 0, 0.2)) for (const o of [-0.35, 0, 0.35]) lineAt(e, a, e.x, e.y, toP(e) + o, 700, 44, 0.85);
    if (lv(e) >= 1 && at(a, 1, 1.2)) for (const o of [-0.17, 0.17]) lineAt(e, a, e.x, e.y, toP(e) + o, 700, 44, 0.85);
    return a.t >= (lv(e) >= 1 ? 2.2 : 1.2);
  },
  // 땅: 보스 발밑 모래 구덩이로 끌어당긴다
  sandTomb: (e, a, dt) => {
    if (at(a, 0, 0)) zoneAt(e, a, e.x, e.y, 100, 0.4, 2.2);
    if (a.t > 0.3 && a.t < 2.2) pullPlayer(e, 95, dt);
    if (at(a, 1, 1.2)) ringShots(e, a, 10, 160);
    return a.t >= 2.3;
  },
  // 비행: 플레이어를 따라오는 회오리 낙하
  hurricane: (e, a) => {
    if (at(a, 0, 0.2)) for (let i = 0; i < Math.round((3 + lv(e)) * few(e)); i++) { const p = player; strikeAt(e, a, p.x + Math.random() * 200 - 100, p.y + Math.random() * 160 - 80, 55, 1.6 + i * 0.4, { follow: true }); }
    return a.t >= 1.0;
  },
  // 비행: 하늘로 사라졌다가 표시된 곳으로 내리꽂기 (여러 번)
  aerialDive: (e, a) => {
    const n = isBig(e) ? 3 : 2, c = Math.floor(a.t / 0.9), ct = a.t - c * 0.9;
    if (c >= n) { e.fade = 0; return true; }
    if (at(a, c * 2, c * 0.9)) { a.tx = player.x; a.ty = player.y; strikeAt(e, a, a.tx, a.ty, e.r + 45, 0.7); }
    e.fade = ct < 0.15 ? ct / 0.15 : ct < 0.7 ? 1 : Math.max(0, 1 - (ct - 0.7) / 0.1);
    if (at(a, c * 2 + 1, c * 0.9 + 0.7)) { e.x = a.tx; e.y = a.ty; clampBody(e); unstick(e); shake = 0.2; ringShots(e, a, 8, 170); }
    return false;
  },
  // 에스퍼: 보스 둘레를 돌며 퍼져 나가는 탄 두 겹 (서로 반대로 돈다)
  psyField: (e, a) => {
    if (at(a, 0, 0.3)) for (const w of [1.3, -1.3]) for (let i = 0; i < 10; i++) enemyShot(e, 0, 0, { type: a.type, life: 4.5, orbit: { src: e, ang: i / 10 * Math.PI * 2 + (w > 0 ? 0 : 0.3), r: 40, dr: 105, w } });
    return a.t >= 1.0;
  },
  // 에스퍼: 플레이어 주변으로 순간이동하며 고리 탄
  teleBarrage: (e, a) => {
    const n = isBig(e) ? 3 : 2;
    for (let c = 0; c < n; c++) {
      if (at(a, c * 2, c * 0.65)) { const g = Math.random() * Math.PI * 2; blink(e, player.x + Math.cos(g) * 170, player.y + Math.sin(g) * 140); }
      if (at(a, c * 2 + 1, c * 0.65 + 0.35)) ringShots(e, a, 8 + 2 * lv(e), 170);
    }
    return a.t >= n * 0.65 + 0.2;
  },
  // 벌레: 실 장판(밟으면 느려짐) + 부채꼴 탄
  stringShot: (e, a) => {
    if (at(a, 0, 0.2)) { const p = player; for (let i = 0; i < 4; i++) { const g = i / 4 * Math.PI * 2 + Math.random(); zoneAt(e, a, p.x + Math.cos(g) * 90, p.y + Math.sin(g) * 70, 60, 0.4, 3.5, { slow: true }); } }
    if (at(a, 1, 0.8)) fanShots(e, a, toP(e), 5 + lv(e), 0.22, 210);
    return a.t >= 1.2;
  },
  // 벌레: 잠깐 따라오는 작은 벌레 떼
  swarm: (e, a) => {
    if (at(a, 0, 0.3)) for (let i = 0; i < Math.round((18 + 6 * lv(e)) * few(e)); i++) enemyShot(e, Math.random() * Math.PI * 2, 130 + Math.random() * 80, { type: a.type, r: 5, seek: 0.8 });
    return a.t >= 0.8;
  },
  // 바위: 플레이어 둘레에 멈춘 바위들이 잠시 뒤 터진다
  stealthRock: (e, a) => {
    if (at(a, 0, 0.3)) { const p = player, n = 6; for (let i = 0; i < n; i++) { const g = i / n * Math.PI * 2 + Math.random() * 0.3; enemyShot(e, 0, 0, { type: a.type, r: 12, x: p.x + Math.cos(g) * 160, y: p.y + Math.sin(g) * 120, split: 2.2 + i * 0.15, splitN: 6, life: 4 }); } }
    return a.t >= 1.0;
  },
  // 바위: 보스 둘레를 돌던 바위가 하나씩 날아온다
  ancientPower: (e, a) => {
    const n = isBig(e) ? 5 + lv(e) : 3;
    if (at(a, 0, 0.2)) for (let i = 0; i < n; i++) enemyShot(e, 0, 0, { type: a.type, r: 12, life: 5, orbit: { src: e, ang: i / n * Math.PI * 2, r: e.r + 40, dr: 0, w: 3, rel: 0.8 + i * 0.25, sp: 300 } });
    return a.t >= 1.2 + n * 0.25;
  },
  // 고스트: 플레이어 둘레를 돌며 좁혀 오는 도깨비불 (밖으로 빠져나간다)
  wispCircle: (e, a) => {
    if (at(a, 0, 0.3)) { const p = player, n = 10 + 2 * lv(e); for (let i = 0; i < n; i++) enemyShot(e, 0, 0, { type: a.type, r: 9, life: 4, orbit: { cx: p.x, cy: p.y, ang: i / n * Math.PI * 2, r: 230, dr: -80, w: 0.8 } }); }
    return a.t >= 1.0;
  },
  // 고스트: 플레이어를 지나는 그림자 선 세 개, 두 번
  nightShade: (e, a) => {
    for (let s = 0; s < 2; s++) if (at(a, s, 0.2 + s * 0.9)) { const p = player, b = Math.random() * Math.PI; for (let k = 0; k < 3; k++) lineThrough(e, a, p.x, p.y, b + k * Math.PI / 3, 800, 30, 0.8); }
    return a.t >= 2.1;
  },
  // 드래곤: 보스를 축으로 도는 광선 여러 개 (예고 → 회전)
  dragonSpin: (e, a, dt) => {
    const n = 3 + Math.min(lv(e), 1);
    if (at(a, 0, 0)) { a.dir = Math.random() < 0.5 ? 1 : -1; a.base = toP(e) + Math.PI / n; }
    if (a.t > 0.8) a.base += a.dir * 1.5 * dt;
    a.arms = Array.from({ length: n }, (_, k) => a.base + k * Math.PI * 2 / n); a.armOn = a.t > 0.8;
    if (a.armOn) armsHit(e, a);
    if (a.t >= 2.4) { a.arms = null; return true; }
    return false;
  },
  // 악: 부채꼴 탄 → 그 틈을 메우는 부채꼴 탄
  feint: (e, a) => {
    if (at(a, 9, 0.3)) a.base = toP(e);
    const n = 3 + (lv(e) >= 1 ? 1 : 0);
    for (let s = 0; s < n; s++) if (at(a, s, 0.3 + s * 0.35)) fanShots(e, a, a.base + (s % 2 ? 0.12 : 0), s % 2 ? 6 : 7, 0.24, 200);
    return a.t >= 0.4 + n * 0.35;
  },
  // 악: 플레이어 자리에 X자 베기 세 번
  nightSlash: (e, a) => {
    for (let s = 0; s < 3; s++) if (at(a, s, 0.2 + s * 0.4)) { const p = player; for (const g of [Math.PI / 4, -Math.PI / 4]) lineThrough(e, a, p.x, p.y, g, 300, 30, 0.6); }
    return a.t >= 1.6;
  },
  // 강철: 벽에 튕기는 커다란 톱니
  gearGrind: (e, a) => {
    if (at(a, 0, 0.4)) { const n = 2 + (lv(e) >= 1 ? 1 : 0); fanShots(e, a, toP(e), n, 0.5, 230, { r: 18, bounce: 3, life: 5 }); }
    return a.t >= 0.9;
  },
  // 강철: 보스에서 플레이어 쪽으로 쿵쿵 내려찍는 발자국
  meteorMash: (e, a) => {
    for (let s = 0; s <= (lv(e) >= 1 ? 1 : 0); s++) if (at(a, s, 0.2 + s * 1.1)) { const g = toP(e); for (let i = 1; i <= 7; i++) strikeAt(e, a, e.x + Math.cos(g) * i * 70, e.y + Math.sin(g) * i * 70, 50, 0.5 + i * 0.12); }
    return a.t >= (lv(e) >= 1 ? 2.4 : 1.3);
  },
  // 페어리: 체력을 조금 회복하며 휘어 나가는 별빛 고리
  moonlight: (e, a) => {
    if (at(a, 0, 0.2)) { if (isBig(e)) { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.05); say('체력을 회복했다!', e.x, e.y - 80, '#8f8'); } fx.push({ kind: 'boom', x: e.x, y: e.y, r: e.r + 30, t: 0.4, max: 0.4, color: '#fff6c0' }); ringShots(e, a, 16, 110, { curve: 0.5 }); }
    if (at(a, 1, 0.9)) ringShots(e, a, 16, 110, { curve: -0.5 });
    return a.t >= 1.4;
  },
  // 페어리: 꽃봉오리 탄이 피어나며 다섯 갈래로
  flowerBloom: (e, a) => {
    for (let s = 0; s <= (lv(e) >= 1 ? 1 : 0); s++) if (at(a, s, 0.3 + s * 0.7)) ringShots(e, a, 6, 160, { r: 11, split: 0.7, splitN: 5 });
    return a.t >= 1.4;
  },
  // ---------- 급 고유 기술 ----------
  // 트레이너: 부채꼴 세 번 연달아
  trainerCombo: (e, a) => {
    for (let s = 0; s < 3; s++) if (at(a, s, 0.2 + s * 0.25)) fanShots(e, a, toP(e), 3, s === 1 ? 0.4 : 0.2, 220);
    return a.t >= 1.0;
  },
  // 트레이너: 플레이어 둘레에 함정 셋 + 느려지는 장판
  trap: (e, a) => {
    if (at(a, 0, 0.2)) { const p = player; for (let i = 0; i < 3; i++) { const g = i / 3 * Math.PI * 2 + Math.random(); strikeAt(e, a, p.x + Math.cos(g) * 70, p.y + Math.sin(g) * 55, 40, 1.0); } zoneAt(e, a, p.x, p.y, 55, 0.5, 2, { slow: true }); }
    return a.t >= 1.0;
  },
  // 관장: 플레이어를 가르는 선 한쪽 절반이 장판으로 → 반대쪽 절반 (선을 넘어 피한다)
  gymField: (e, a) => {
    if (at(a, 9, 0)) { a.cx = player.x; a.cy = player.y; a.g = toP(e); a.side = Math.random() < 0.5 ? 1 : -1; }
    for (let s = 0; s < 2; s++) if (at(a, s, 0.2 + s * 1.6)) {
      const ux = -Math.sin(a.g), uy = Math.cos(a.g), side = s ? -a.side : a.side;
      for (let i = -3; i <= 3; i++) for (let j = 0; j < 3; j++) { const d = (j * 85 + 50) * side; zoneAt(e, a, a.cx + ux * d + Math.cos(a.g) * i * 85, a.cy + uy * d + Math.sin(a.g) * i * 85, 48, 0.9, 1.0); }
    }
    return a.t >= 3.8;
  },
  // 관장: 잠깐 멈춰 지시를 내리면 다음 두 기술을 쉬지 않고 이어 쓴다
  command: (e, a) => {
    if (at(a, 0, 0)) { fx.push({ kind: 'ring', x: e.x, y: e.y, t: 0.5, max: 0.5 }); say('관장의 지시!', e.x, e.y - 90, '#ff8'); }
    if (a.t >= 0.6) { e.chainN = 2; return true; }
    return false;
  },
  // 라이벌: 내가 움직이는 쪽을 읽고 앞질러 쏜다
  predict: (e, a) => {
    for (let s = 0; s < 3; s++) if (at(a, s, 0.3 + s * 0.4)) { const p = player, tx = p.x + (p.velX ?? 0) * 0.6, ty = p.y + (p.velY ?? 0) * 0.6; fanShots(e, a, Math.atan2(ty - e.y, tx - e.x), 5, 0.16, 240); }
    return a.t >= 1.4;
  },
  // 전설: 화면 가득 낙하, 안전한 곳은 몇 군데뿐
  domain: (e, a) => {
    if (at(a, 0, 0.3)) {
      const p = player, safe = Array.from({ length: 3 }, () => [p.x + Math.random() * 400 - 200, p.y + Math.random() * 300 - 150]);
      for (let i = -3; i <= 3; i++) for (let j = -2; j <= 2; j++) { const x = p.x + i * 95, y = p.y + j * 85; if (safe.some(([sx, sy]) => Math.hypot(sx - x, sy - y) < 85)) continue; strikeAt(e, a, x, y, 50, 1.4); }
    }
    return a.t >= 1.9;
  },
};

// ---------- 새 위험 요소: 장판, 선 ----------
function updatePatternHazard(h, dt) {
  const p = player;
  if (h.kind === 'zone') {
    if (h.delay > 0) { h.delay -= dt; return; }
    if ((h.dur -= dt) <= 0) { h.done = true; return; }
    if (Math.hypot((p.x - h.x) / 1, (p.y - h.y) / 0.6) < h.r + p.r * 0.4) { if (h.slow) p.webbed = 0.25; else hurt(h.type, 1, h); }
  }
  if (h.kind === 'line' && (h.t -= dt) <= 0) {
    h.done = true;
    fx.push({ kind: 'lineburst', x: h.x, y: h.y, a: h.a, len: h.len, w: h.w, t: 0.22, max: 0.22, color: TYPE_COLOR[h.type] });
    const dx = Math.cos(h.a), dy = Math.sin(h.a), rx = p.x - h.x, ry = p.y - h.y, s = rx * dx + ry * dy;
    if (s > -p.r && s < h.len + p.r && Math.abs(rx * dy - ry * dx) < h.w / 2 + p.r * 0.5) hurt(h.type, 1, h);
  }
}
function drawPatternHazard(h) {
  const c = TYPE_COLOR[h.type], pulse = 0.35 + Math.abs(Math.sin(now * 10)) * 0.35;
  if (h.kind === 'zone') {
    if (h.delay > 0) {
      const k = 1 - h.delay / h.delay0;
      ctx.strokeStyle = h.slow ? `rgba(230,230,230,${pulse})` : `rgba(255,60,60,${pulse})`; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r, h.r * 0.6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = h.slow ? 'rgba(230,230,230,.15)' : `rgba(255,60,60,${0.08 + k * 0.2})`; ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r * k, h.r * 0.6 * k, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.globalAlpha = Math.min(1, h.dur * 2) * 0.55; ctx.fillStyle = h.slow ? '#e8e8e8' : c;
      ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r, h.r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = Math.min(1, h.dur * 2); ctx.strokeStyle = h.slow ? '#fff' : mix(c, '#ffffff', 0.4); ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1;
    }
    return true;
  }
  if (h.kind === 'line') {
    const k = 1 - h.t / h.t0;
    ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.a);
    ctx.fillStyle = `rgba(255,60,60,${0.1 + k * 0.25})`; ctx.fillRect(0, -h.w / 2, h.len, h.w);
    ctx.globalAlpha = pulse; ctx.fillStyle = '#f33'; ctx.fillRect(0, -1.5, h.len, 3);
    ctx.restore();
    return true;
  }
  return false;
}
function drawPatternFx(f, k) {
  if (f.kind !== 'lineburst') return;
  ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.a); ctx.globalAlpha = 1 - k;
  for (const [s, col] of [[1, mix(f.color, '#000000', 0.3)], [0.6, f.color], [0.25, '#fff']]) { ctx.fillStyle = col; ctx.fillRect(0, -f.w / 2 * s, f.len, f.w * s); }
  ctx.restore();
}
// 드래곤 회오리 광선 그리기 (drawTelegraphs에서)
function drawSpinArms(e, a) {
  if (!a.arms) return;
  for (const g of a.arms) {
    if (a.armOn) enemyBeamAt(e, g, TYPE_COLOR[a.type], a.heavy ? 1.6 : 1);
    else { const len = beamLen(e.x, e.y, Math.cos(g), Math.sin(g), true); ctx.save(); ctx.translate(Math.round(e.x), Math.round(e.y - TEAR_Z)); ctx.rotate(g); ctx.globalAlpha = 0.35 + Math.abs(Math.sin(now * 10)) * 0.35; ctx.fillStyle = '#f33'; ctx.fillRect(0, -2, len, 4); ctx.restore(); }
  }
}
// 적 탄의 새 움직임: 멈춤(wait), 휘기(curve), 가속(accel), 공전(orbit), 벽 튕기기(bounce)
function moveEnemyShot(t, dt) {
  const p = player;
  // 멈춘 탄: 기다렸다가 그 순간의 내 자리로 날아온다
  if (t.wait > 0) { if ((t.wait -= dt) <= 0) { const g = Math.atan2(p.y - t.y, p.x - t.x); t.vx = Math.cos(g) * t.go; t.vy = Math.sin(g) * t.go; } return true; }
  if (t.orbit) {
    const o = t.orbit, cx = o.src ? o.src.x : o.cx, cy = o.src ? o.src.y : o.cy;
    o.ang += o.w * dt; o.r += o.dr * dt;
    if (o.r <= 4 || (o.src && o.src.hp <= 0)) { t.life = 0; return true; }
    t.x = cx + Math.cos(o.ang) * o.r; t.y = cy + Math.sin(o.ang) * o.r * (o.src ? 1 : 0.8);
    if (o.rel !== undefined && (o.rel -= dt) <= 0) { const g = Math.atan2(p.y - t.y, p.x - t.x); t.vx = Math.cos(g) * o.sp; t.vy = Math.sin(g) * o.sp; t.orbit = null; }
    t.life -= dt;
    return true;  // 위치는 여기서 정했다
  }
  if (t.curve) { const g = Math.atan2(t.vy, t.vx) + t.curve * dt, sp = Math.hypot(t.vx, t.vy); t.vx = Math.cos(g) * sp; t.vy = Math.sin(g) * sp; }
  if (t.accel) { const k = 1 + t.accel * dt; if (Math.hypot(t.vx, t.vy) < 420) { t.vx *= k; t.vy *= k; } }
  return false;
}
function bounceShot(t, dt) {
  if (!(t.bounce > 0)) return false;
  t.bounce--;
  const ox = t.x - t.vx * dt, oy = t.y - t.vy * dt;
  const bx = shotBlocked(Math.floor(t.x / TS), Math.floor(oy / TS), false), by = shotBlocked(Math.floor(ox / TS), Math.floor(t.y / TS), false);
  t.x = ox; t.y = oy;
  if (bx) t.vx = -t.vx;
  if (by) t.vy = -t.vy;
  if (!bx && !by) { t.vx = -t.vx; t.vy = -t.vy; }
  return true;
}
