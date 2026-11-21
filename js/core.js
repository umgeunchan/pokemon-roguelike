// 공통 도구, 저장소, 전역 상태, 데이터·그림 불러오기
const $ = s => document.querySelector(s);
const cv = $('#game'), ctx = cv.getContext('2d');
// 캔버스 실제 해상도를 화면에 보이는 크기(× 기기 픽셀 비율)에 맞춘다. 게임 좌표는 그대로 880×492, draw()에서 배율만 곱한다
let SCALE = 1;
function fitCanvas() {
  const w = cv.getBoundingClientRect().width || 880, s = Math.max(1, Math.min(3, w * (devicePixelRatio || 1) / 880));
  const pw = Math.round(880 * s), ph = Math.round(492 * s);
  if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
  SCALE = pw / 880;
}
addEventListener('resize', fitCanvas); document.addEventListener('fullscreenchange', () => setTimeout(fitCanvas, 50));
// 컴퓨터: F 키나 화면 더블클릭으로 전체 화면 켜고 끄기
const toggleFullscreen = () => document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => {});
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const randDir = () => { const a = Math.random() * Math.PI * 2; return [Math.cos(a), Math.sin(a)]; };
// 받은 데이터·그림은 브라우저 Cache Storage에 넣어 두고 다음부터는 네트워크 없이 꺼낸다. 404도 기억해서(스프라이트가 없는 포켓몬) 다시 묻지 않는다
// Cache Storage를 못 쓰는 환경(file://, 사생활 보호 모드 등)에서는 그냥 네트워크로 받는다
const CACHE_NAME = 'pokemon-dungeon-cache-v1';
let cacheP = null;
async function cfetch(url) {
  let c = null;
  try { c = await (cacheP ??= caches.open(CACHE_NAME)); const hit = await c.match(url); if (hit) return hit; } catch { c = null; }
  const r = await fetch(url);
  if (c && (r.ok || r.status === 404)) c.put(url, r.clone()).catch(() => {});
  return r;
}
const getJson = u => cfetch(u).then(r => { if (!r.ok) throw new Error(`${r.status} ${u}`); return r.json(); });
const loadImg = src => cfetch(src).then(r => { if (!r.ok) throw new Error(`${r.status} ${src}`); return r.blob(); })
  .then(b => new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => fail(new Error(src)); i.src = URL.createObjectURL(b); }));
const TOUCH = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0 && !matchMedia('(pointer: fine)').matches;
let taps = [];  // 이번 프레임에 그린, 누를 수 있는 곳 (터치·클릭)
const store = { get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); onStoreChange(k); return true; } catch { return false; } },
  del: k => { try { localStorage.removeItem(k); } catch {} } };
const loadUnlocked = () => store.get(LEGEND_KEY) ?? [];
// 도감: 한 번이라도 쓰러뜨린 포켓몬. 판이 끝나도 남고, 다음 판 스타팅 후보가 된다
const DEX = new Set(store.get(DEX_KEY) ?? []), SHINY = new Set(store.get(SHINY_KEY) ?? []);
// 스타팅으로 고를 수 있게 되는 포켓몬: 각 세대 스타팅 계열(쓰러뜨리면 첫 단계가 열림)과 전설·환상(LEGEND_KEY)뿐. 나머지는 도감에만 등록된다
const ALL_STARTERS = REGIONS.flatMap(r => r.starters);
const starterBase = id => ALL_STARTERS.find(s => id >= s && id <= s + 2) ?? null;
// 예전 저장(도감 전체가 스타팅이던 때)에서 옮겨 올 때는 도감 속 스타팅 계열만 남긴다
const STARTERS = new Set(store.get(STARTER_KEY) ?? [...DEX].map(starterBase).filter(Boolean));
// 이로치 보너스: 이로치로 쓰러뜨린 전설·환상의 포켓몬과 스타팅(계열마다 하나)마다 다른 포켓몬의 이로치 확률 +1%
const shinyBonusIds = () => new Set([...SHINY].map(id => starterBase(id) ?? (LEGEND_MOVE[id] ? id : null)).filter(Boolean));
const shinyRate = () => SHINY_RATE + 0.01 * shinyBonusIds().size;
const CLEARED = new Set(store.get(CLEAR_KEY) ?? []), ACHIEVED = new Set(store.get(ACH_KEY) ?? []);
const itemById = id => ITEMS.find(i => i.id === id);
const moveDef = id => TMS.find(t => t.id === id) ?? LTMS.find(t => t.id === id);
// 월드 생성용 시드 난수. 같은 시드면 같은 지도가 나와서 저장에는 시드만 남기면 된다
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash = (x, y, s = 0) => { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 69069) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

let legendPow = 1, lastInfo = null, state = 'loading', MON = {}, CHART = {}, IMG = {}, TRAINER_IMG = {}, keys = {}, loadError = '', FX = new Set();
let region, world, map, player, tears, beams, bombs, fx, hazards, puddles, pstrikes, texts, banner, taken, last, now = 0, textCd = 0, shake = 0;
let warp = null, dialog = null, dayTime = 0, spawnT = 0, spawnCd = 0, flowT = 0, timeStop = 0, learnTm = null, shopNpc = null, curNode = null;
let menu = { screen: 'root', cursor: 0, tab: 0, sel: 0, confirm: false };

// ---------- 불러오기 ----------
// 스프라이트의 불투명 픽셀 범위. 발끝(y1)을 땅 좌표에 맞춰 그려서 떠 보이지 않게 한다
function spriteBox(img) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let x0 = Infinity, x1 = 0, y0 = Infinity, y1 = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 0) {
    const k = (i - 3) / 4, x = k % c.width, y = Math.floor(k / c.width);
    x0 = Math.min(x0, x); x1 = Math.max(x1, x + 1); y0 = Math.min(y0, y); y1 = Math.max(y1, y + 1);
  }
  return x1 > x0 ? { x0, x1, y0, y1 } : { x0: 24, x1: 72, y0: 24, y1: 80 };
}

// 필드용 걷기/대기 애니메이션: PMD SpriteCollab (CC BY-NC 4.0). 줄 순서는 아래, 오른아래, 오른, 오른위, 위, 왼위, 왼, 왼아래
const PMD = 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite';
async function loadField(id, form = '') {
  const base = `${PMD}/${String(id).padStart(4, '0')}${form}`;
  try {
    const xml = await cfetch(`${base}/AnimData.xml`).then(r => r.ok ? r.text() : Promise.reject(new Error('no anim')));
    const blocks = xml.split('<Anim>').slice(1);
    const anim = name => {
      const b = blocks.find(b => b.includes(`<Name>${name}</Name>`));
      if (!b) return null;
      const copy = b.match(/<CopyOf>(\w+)<\/CopyOf>/);
      if (copy) return anim(copy[1]);
      return { name, fw: +b.match(/<FrameWidth>(\d+)/)[1], fh: +b.match(/<FrameHeight>(\d+)/)[1], dur: [...b.matchAll(/<Duration>(\d+)/g)].map(m => +m[1]) };
    };
    const walk = anim('Walk'), idle = anim('Idle');
    if (!walk) return null;
    walk.img = await loadImg(`${base}/${walk.name}-Anim.png`);
    if (idle) idle.img = await loadImg(`${base}/${idle.name}-Anim.png`).catch(() => null);
    for (const a of [walk, idle]) if (a?.img) { a.rows = Math.max(1, Math.floor(a.img.height / a.fh)); a.total = a.dur.reduce((s, d) => s + d, 0); a.foot = frameFoot(a); }
    return { walk, idle: idle?.img ? idle : walk };
  } catch { return null; }
}

// 아래 방향 첫 프레임의 불투명 범위로 발끝과 몸 크기를 잰다
function frameFoot(a) {
  const c = document.createElement('canvas'); c.width = a.fw; c.height = a.fh;
  const g = c.getContext('2d'); g.drawImage(a.img, 0, 0, a.fw, a.fh, 0, 0, a.fw, a.fh);
  const d = g.getImageData(0, 0, a.fw, a.fh).data;
  let x0 = Infinity, x1 = 0, y0 = Infinity, y1 = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 0) { const k = (i - 3) / 4, x = k % a.fw, y = Math.floor(k / a.fw); x0 = Math.min(x0, x); x1 = Math.max(x1, x + 1); y0 = Math.min(y0, y); y1 = Math.max(y1, y + 1); }
  return x1 > x0 ? { cx: (x0 + x1) / 2, by: y1, w: x1 - x0, h: y1 - y0 } : { cx: a.fw / 2, by: a.fh * 0.8, w: a.fw * 0.6, h: a.fh * 0.6 };
}

async function loadMon(id) {
  if (MON[id]) return;
  const [p, s, img, field] = await Promise.all([getJson(`${API}/pokemon/${id}`), getJson(`${API}/pokemon-species/${id}`), loadImg(`${SPR}/pokemon/${id}.png`), loadField(id)]);
  const types = p.types.map(t => t.type.name);
  MON[id] = { id, name: s.names.find(n => n.language.name === 'ko')?.name ?? p.name, img, field, box: spriteBox(img), types, species: s,
    flying: types.includes('flying') || p.abilities.some(a => a.ability.name === 'levitate'),
    abilities: p.abilities.filter(a => !a.is_hidden).sort((a, b) => a.slot - b.slot).map(a => a.ability.name),  // 특성 (ability.js)
    st: Object.fromEntries(p.stats.map(s => [s.stat.name, s.base_stat])) };
}

// 이로치 그림은 필요할 때만 받는다. 없으면 보통 그림으로 대신
const loadShiny = m => m.shinyLoad ??= Promise.all([loadImg(`${SPR}/pokemon/shiny/${m.id}.png`).catch(() => m.img), loadField(m.id, '/0000/0001')])
  .then(([img, field]) => m.shinyArt = { img, field: field ?? m.field });

// 트레이너 스프라이트는 Showdown 서버라 CORS 헤더가 없을 수 있다. 픽셀을 읽지 않으니 crossOrigin 없이 불러오고, 실패해도 게임은 진행
const loadTrainer = name => TRAINER_IMG[name] !== undefined ? null : new Promise(ok => {
  const i = new Image(); i.onload = () => ok(TRAINER_IMG[name] = i); i.onerror = () => ok(TRAINER_IMG[name] = null);
  i.src = `https://play.pokemonshowdown.com/sprites/trainers/${name}.png`;
});

// 진화 경로: 첫 번째 갈래만 따라가고, 레벨 조건이 없으면(돌, 친밀도, 통신교환) 25/40레벨로 대신한다
async function loadEvo(id) {
  const s = MON[id].species, c = await getJson(s.evolution_chain.url);
  const find = n => n.species.name === s.name ? n : n.evolves_to.map(find).find(Boolean);
  const out = [];
  for (let n = find(c.chain); n?.evolves_to.length; n = n.evolves_to[0]) {
    const nx = n.evolves_to[0], lvl = nx.evolution_details[0]?.min_level ?? (out.length ? 40 : 25);
    out.push({ id: +nx.species.url.split('/').at(-2), level: Math.max(lvl, (out.at(-1)?.level ?? 5) + 5) });
  }
  await Promise.all(out.map(o => loadMon(o.id)));
  return out;
}

async function loadRegion(rg) {
  const legends = Object.values(rg.places).flatMap(p => Array.isArray(p[2]) ? p[2] : []);
  const dex = new Set([...rg.starters, 25, ...rg.roam, ...legends, ...rg.gyms.flatMap(g => [...g.team, ...g.mobs]), ...rg.league.flatMap(e => e.team)]);
  rg.dex = [...dex].sort((a, b) => a - b);
  const rival = RIVALS[rg.name], rivalIds = rival ? [...rg.starters.flatMap(s => [s, s + 1, s + 2]), ...rival[2].flat()] : [];
  await Promise.all([...new Set([...dex, ...rivalIds, ...ACH.filter(a => a.reward).map(a => a.reward), ...loadUnlocked()])].map(loadMon));
  // 다른 지방에서 해금한 스타팅: 하나가 실패해도 지방은 열린다
  await Promise.all([...STARTERS].map(id => loadMon(id).catch(() => {})));
  const sprites = [...rg.gyms.map(g => g.sprite), ...rg.league.map(e => e.sprite), ...(rival ? [rival[1]] : []),...Object.values(TRAINERS).flat().map(t => t[0]), ...FRIENDLY.map(t => t[0]), 'nurse', 'clerk'];
  await Promise.all([...new Set(sprites)].map(loadTrainer));
}

async function loadCommon() {
  const types = Object.keys(TYPE_KO);
  const rel = await Promise.all(types.map(t => getJson(`${API}/type/${t}`)));
  types.forEach((t, i) => {
    const d = rel[i].damage_relations;
    CHART[t] = {};
    d.double_damage_to.forEach(x => CHART[t][x.name] = 2);
    d.half_damage_to.forEach(x => CHART[t][x.name] = 0.5);
    d.no_damage_to.forEach(x => CHART[t][x.name] = 0);
  });
  // 그림 이름(icon)이 아이템 id와 다른 것(Z크리스탈 → z-ring)은 icon 그림을 id로 저장한다
  const sprites = new Map([...ITEMS.map(i => [i.id, i.icon ?? i.id]), ...[...SHOP.map(s => s.id), ...TMS.map(t => t.tm), ...LTMS.map(t => t.tm), 'oran-berry', 'rare-candy', ...BALLS].map(n => [n, n])]);
  await Promise.all([...sprites].map(async ([n, f]) => IMG[n] = await loadImg(`${SPR}/items/${f}.png`)));
  // 아이템/기술 한국어 이름: 처음 한 번 PokeAPI에서 받아 브라우저에 저장해 둔다
  let names = store.get(NAMES_KEY);
  if (!names) {
    names = {};
    const ko = j => j.names.find(n => n.language.name === 'ko')?.name;
    await Promise.all([...ITEMS.filter(i => i.r !== 'g'), ...SHOP].map(i => getJson(`${API}/item/${i.id}`).then(j => { if (ko(j)) names[i.id] = ko(j); }).catch(() => {})));
    await Promise.all([...TMS, ...LTMS].map(t => getJson(`${API}/move/${t.id}`).then(j => { if (ko(j)) names[t.id] = ko(j); }).catch(() => {})));
    store.set(NAMES_KEY, names);
  }
  for (const it of [...ITEMS.filter(i => i.r !== 'g'), ...SHOP, ...TMS, ...LTMS]) if (names[it.id] && !(it.legend && LEGEND_KO[it.id])) it.name = names[it.id];
}

const eff = (atk, defTypes) => defTypes.reduce((m, t) => m * (CHART[atk]?.[t] ?? 1), 1);
const has = id => player.moves.has(id);
const hasFx = f => FX.has(f);
const refreshFx = () => { FX = new Set([...player.moves].map(id => moveDef(id)?.fx).filter(Boolean)); legendPow = LEGEND_POW ** [...player.moves].filter(id => moveDef(id)?.legend).length; refreshCombos(); };
const starterIds = () => [...new Set([...region.starters, 25, ...achRewards(), ...[...STARTERS].sort((a, b) => a - b), ...loadUnlocked()])].filter(id => MON[id]);
const untargetable = e => e.z > 30 || e.fade > 0.5;
const baseOf = m => ({ hp: Math.round(m.st.hp / 7.5), dmg: Math.max(m.st.attack, m.st['special-attack']) / 20, speed: 120 + m.st.speed * 1.5 });
// 레벨업 필요 경험치: 초반엔 적게, 갈수록 기하급수로 (5레벨 15, 30레벨 177, 60레벨 3400쯤)
const expNeed = lv => Math.round(20 * 2 ** ((lv - 8) / 7));
// 체력 배율: 잡몹·트레이너는 x2에 마을 단계(tier)마다 x1.5, 관장·사천왕은 x10에 체육관마다 x1.6(tier = 체육관 번호, 리그 8)
// 전설은 x20에 나타난 곳의 단계마다 x1.6: 기본 체력이 관장의 2배라 같은 단계 관장 에이스의 약 4배, 관장 팀 전체보다 조금 더 단단하다
// 플레이어 화력이 단계마다 1.5배쯤 크는 것(dps 시뮬레이션)에 맞춘 값
// 관장·라이벌·사천왕 체력 보정: 단계(tier = 들어갈 때 가진 배지 수)별로 곱한다. 초반을 가볍게, 배지 5개부터는 원래대로
// 배지 0개(첫 체육관) ~ 4개까지 차례로. 숫자를 바꾸면 바로 반영된다
// 전설로 시작한 판: 상대(관장·트레이너·라이벌·전설) 체력 x1.5, 관장 보상 체력은 반 칸. 일반 스타팅은 배지마다 1칸
const legendStart = () => !!LEGEND_MOVE[player?.startId];
const LEGEND_START_HP = 1.5;
const badgeHp = () => legendStart() ? 1 : 2;
const BOSS_HP_EARLY = [0.6, 0.65, 0.7, 0.78, 0.88];  // v2.6: 2~4단계(가장 많이 막히던 구간)를 조금 낮춤
// 일반 스타팅은 배지 0~3개 구간 보스 체력을 0.8배 더 (봇 모의 테스트에서 2단계 관장전이 가장 길고 아팠다)
const bossEase = t => (t >= BOSS_HP_EARLY.length ? 1 : BOSS_HP_EARLY[Math.max(0, Math.floor(t))]) * (t <= 3 && !legendStart() ? 0.8 : 1);
// 트레이너(체육관 트레이너·필드 트레이너) 체력: 야생의 TRAINER_HP배에, 단계별 보정을 곱한다. 5단계부터는 보정 없음
const TRAINER_HP = 2.2, TRAINER_HP_EARLY = [0.6, 0.7, 0.8, 0.9];
const trainerEase = t => t >= TRAINER_HP_EARLY.length ? 1 : TRAINER_HP_EARLY[Math.max(0, Math.floor(t))];
// 체육관 구성: 트레이너 방 수와 트레이너 한 명의 포켓몬 수 [최소, 최대]. 앞쪽 EARLY_GYMS개 체육관은 적게
const EARLY_GYMS = 3, GYM_ROOMS = { early: [1, 2], late: [2, 3] }, GYM_TRAINER_MONS = { early: [1, 2], late: [2, 3] };
const rollRange = ([a, b]) => a + Math.floor(Math.random() * (b - a + 1));
// 화력 따라가기: 트레이너·관장·라이벌·전설과 싸울 때 실제로 넣은 초당 피해(p.dps)를 재서,
// 그 단계에서 예상한 화력(base x growth^단계)보다 강하면 상대 체력을 (비율^follow)배 올린다. 예상보다 약하면 그대로(1배), 최대 max배
// 예상 화력(base)은 자속(STAB배)을 넣은 값: 자속 때문에 화력이 오른 만큼은 따라가지 않는다 (DIFF_HP가 메워 준다)
// v2.6: 잘하는 사람을 덜 벌주고(최대 2.5배, 지수 0.5), 화력이 모자라면 상대 체력을 0.7배까지 낮춰 돕는다
// 쉬움 모드: 받는 피해 절반 (설정 화면에서 켜고 끔, 브라우저에 저장)
const EASY_KEY = 'pokemon-dungeon-easy';
let EASY = !!store.get(EASY_KEY);
// 필살기 예고가 떠 있는 동안: 축하 문구·업적 팝업을 잠깐 미룬다 (피해야 할 순간에 시선을 가리지 않게)
const dangerNow = () => state === 'play' && (hazards.some(h => h.dmg > 1) || !!map?.enemies?.some(e => e.act && (e.act.heavy || e.act.kind === 'smash')));
const POWER = { base: 6 * STAB, growth: 1.5, follow: 0.5, min: 0.7, max: 2.5 };
const powerScale = t => { const d = player?.dps; return d ? clamp((d / (POWER.base * POWER.growth ** t)) ** POWER.follow, POWER.min, POWER.max) : 1; };
// 한 승부가 끝날 때마다 그 승부의 초당 피해를 기록에 섞는다 (4초 넘게 싸운 승부만)
function samplePower() {
  const p = player;
  if ((p.fT ?? 0) > 4) {
    const v = p.fD / p.fT; p.dps = p.dps ? p.dps * 0.6 + v * 0.4 : v;
    // 적응 난이도가 크게 바뀌면 알려 준다 (숨은 벌이 아니라 보이는 도전으로)
    const f = powerScale(Math.min(8, p.beaten.size));
    if (Math.abs(f - (p.adaptShown ?? 1)) >= 0.2) { p.adaptShown = f; say(f > 1 ? `상대가 강해진다 x${f.toFixed(1)}` : `상대가 약해진다 x${f.toFixed(1)}`, p.x, p.y - 110, f > 1 ? '#f96' : '#9cf'); }
  }
  p.fT = p.fD = 0;
}
// 난이도: 단계(0~8 = 배지 수·지역 깊이)별로 상대 체력과 공격 빈도를 곱한다. 숫자를 바꾸면 바로 반영된다
// 체력: 초반(0~3단계)은 자속 1.5배를 메울 만큼 단단하게, 후반은 일괄 1.5배를 빼서 너무 질기지 않게 (v1.9.1의 2.1배 → 1.4배)
const DIFF_HP = [1.28, 1.35, 1.43, 1.5, 1.45, 1.4, 1.6, 1.75, 1.75];  // v2.6: 적응 상한(2.5배)을 낮춘 만큼 6~8단계를 올려 후반은 어렵게 (봇 기준 후반 관장 에이스 30~45초)   // 단계별 체력 배율 (v1.9.0 이전 대비)
const DIFF_CD = [1.2, 1.15, 1.1, 1, 1, 0.95, 0.9, 0.85, 0.8];  // 단계별 기술 대기 시간 배율 (작을수록 자주 공격)
const diffAt = (arr, t) => arr[clamp(Math.round(t), 0, arr.length - 1)];
const hpMult = (rank, t) => diffAt(DIFF_HP, t) * (rank === 'legend' ? 20 * 1.6 ** t * bossEase(t) : rank === 'boss' ? 10 * 1.6 ** t * bossEase(t) : rank === 'trainer' ? 2 * 1.5 ** t * trainerEase(t) : 2 * 1.5 ** t);

function makePlayer(m) {
  // 일반 스타팅은 최소 4칸으로 시작 (전설은 원래 체력이 높다)
  const b = baseOf(m), hp = LEGEND_MOVE[m.id] ? b.hp : Math.max(b.hp, 8);
  return { mon: m, type: m.types[0], x: 0, y: 0, r: 14, maxHp: hp, hp, items: [], moves: new Set(), beaten: new Set(), seen: new Set(), defeated: {}, time: 0, hop: 0, deltas: Array(STATS.length).fill(null), bought: {}, evo: [],
    dmg: b.dmg, speed: b.speed, fireDelay: 0.42, range: 0.7, shotSpeed: 380, crit: 0.05, dodge: 0, invTime: 1, moneyMul: 1, expMul: 1,
    level: 5, exp: 0, money: 1000, shots: 0, flip: false, cd: 0, inv: 0, charge: 0, aim: [0, -1], walk: 0, moving: false, streak: 0, drain: 0, drain2: 0,
    dash: 0, dashCd: 0, dashDir: [1, 0], vanish: 0, stopCd: 3, eruptCd: 0, winAt: 0, regenT: 0 };
}

// 기술의 능력치 보너스(공격 x1.2, 급소 +20% 등)는 왼쪽 능력치 창에 바로 더해져 보인다
function learnMove(id) {
  const p = player, d = moveDef(id), kp = kindPairs();
  withDelta(() => {
    p.moves.add(id);
    if (!p.items.includes(d)) p.items.push(d);
    d.onLearn?.(p);
    if (p.zPending && state !== 'zpick') { p.zMove = id; p.zPending = false; }  // 기술이 없을 때 얻은 Z크리스탈은 처음 배우는 기술에
    refreshFx();
  });
  if (kindPairs() > kp) { const k = MOVE_KINDS.find(([, f]) => f(id))?.[0] ?? '기술'; banner = { text: `같은 종류(${k}) 기술이 공명한다! 범위·위력 증가`, t: 2.5, glow: '#ffd060' }; }
  renderBar();
}
