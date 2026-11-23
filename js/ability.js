// 특성: 포켓몬의 첫 번째 일반 특성(숨겨진 특성 제외)을 쓴다. 진화하면 진화한 모습의 특성으로 바뀐다
// 게임에서 따로 효과가 없는 특성(프레셔 같은 것)은 주변에 오라를 두르는 화력 증가 특성으로 바꾼다
// 전설·환상의 포켓몬은 특성이 무엇이든 화력 증가가 붙고, 특성마다 이펙트가 있다
// 필드: mul(공격 배수) type(타입별 피해 배수) pinch(체력 1/3 이하일 때 그 타입 x1.5) crit rate(연사 간격 배수) shot(탄속) speed
//       absorb(그 타입 공격을 맞으면 피해 대신 회복) contact(닿은 적에게) style·color(이펙트)
const AB = {
  // 스타팅 특성: 위기일 때 그 타입 공격 x1.5, 몸에서 불꽃이 인다
  overgrow: { ko: '심록', desc: '체력이 1/3 이하면 풀 공격 x1.5', pinch: 'grass' },
  blaze: { ko: '맹화', desc: '체력이 1/3 이하면 불꽃 공격 x1.5', pinch: 'fire' },
  torrent: { ko: '급류', desc: '체력이 1/3 이하면 물 공격 x1.5', pinch: 'water' },
  swarm: { ko: '벌레의알림', desc: '체력이 1/3 이하면 벌레 공격 x1.5', pinch: 'bug' },
  // 공격
  'huge-power': { ko: '천하장사', desc: '공격 x1.5', mul: 1.5, style: 'flame', color: '#ff9060' },
  'pure-power': { ko: '순수한힘', desc: '공격 x1.5', mul: 1.5, style: 'aura', color: '#f8a0d0' },
  hustle: { ko: '의욕', desc: '공격 x1.3', mul: 1.3 },
  guts: { ko: '근성', desc: '체력이 절반 이하면 공격 x1.35', guts: true },
  'solar-power': { ko: '선파워', desc: '공격 x1.25', mul: 1.25, style: 'sun', color: '#ffb040' },
  'iron-fist': { ko: '철주먹', desc: '가까운 적(2칸 안)에게 피해 x1.3', near: 1.3 },
  reckless: { ko: '이판사판', desc: '공격 x1.15, 가까운 적에게 x1.2', mul: 1.15, near: 1.2 },
  technician: { ko: '테크니션', desc: '연사 x1.25', rate: 0.8 },
  adaptability: { ko: '적응력', desc: '자속 보정이 1.5배 → 2배', adapt: true },
  sniper: { ko: '스나이퍼', desc: '급소 피해 x1.5 더', sniper: true },
  'keen-eye': { ko: '날카로운눈', desc: '급소 +10%', crit: 0.1 },
  'super-luck': { ko: '대운', desc: '급소 +15%', crit: 0.15 },
  'compound-eyes': { ko: '복안', desc: '급소 +5%, 탄속 x1.15', crit: 0.05, shot: 1.15 },
  moxie: { ko: '자기과신', desc: '적을 쓰러뜨리면 6초 동안 공격 x1.3', moxie: true },
  'beast-boost': { ko: '비스트부스트', desc: '적을 쓰러뜨리면 6초 동안 공격 x1.3', moxie: true, style: 'aura', color: '#80e0ff' },
  justified: { ko: '정의의마음', desc: '악 타입 공격을 맞으면 6초 동안 공격 x1.3', justified: true },
  'flash-fire': { ko: '타오르는불꽃', desc: '불꽃 공격을 맞으면 피해 대신 회복, 불꽃 공격 x1.25', absorb: 'fire', type: { fire: 1.25 } },
  // 속도
  'swift-swim': { ko: '쓱쓱', desc: '이동 속도 x1.15', speed: 1.15 }, chlorophyll: { ko: '엽록소', desc: '이동 속도 x1.15', speed: 1.15 },
  'sand-rush': { ko: '모래헤치기', desc: '이동 속도 x1.15', speed: 1.15 }, 'slush-rush': { ko: '눈치우기', desc: '이동 속도 x1.15', speed: 1.15 },
  'quick-feet': { ko: '속보', desc: '이동 속도 x1.15', speed: 1.15 }, 'speed-boost': { ko: '가속', desc: '이동 속도 x1.2', speed: 1.2, style: 'wind', color: '#c0f0ff' },
  'run-away': { ko: '도주', desc: '구르기 대기 시간 x0.7', dash: 0.7 },
  // 방어
  levitate: { ko: '부유', desc: '땅 타입 공격과 충격파를 받지 않는다', immune: 'ground' },
  sturdy: { ko: '옹골참', desc: '30초마다 한 번, 쓰러질 공격을 체력 반 칸으로 버틴다', sturdy: true },
  'thick-fat': { ko: '두꺼운지방', desc: '불꽃·얼음 공격의 피해를 절반 확률로 막는다', thick: true },
  'shell-armor': { ko: '조가비갑옷', desc: '받는 피해를 25% 확률로 반 칸 줄인다', armor: 0.25 }, 'battle-armor': { ko: '전투무장', desc: '받는 피해를 25% 확률로 반 칸 줄인다', armor: 0.25 },
  'inner-focus': { ko: '정신력', desc: '맞은 뒤 무적 시간 +0.3초', inv: 0.3 },
  'magic-guard': { ko: '매직가드', desc: '장판 피해를 받지 않는다', noZone: true },
  'clear-body': { ko: '클리어바디', desc: '끌어당기기·느려짐을 받지 않는다', clear: true }, 'white-smoke': { ko: '하얀연기', desc: '끌어당기기·느려짐을 받지 않는다', clear: true },
  'own-tempo': { ko: '마이페이스', desc: '끌어당기기·느려짐을 받지 않는다', clear: true },
  'water-absorb': { ko: '저수', desc: '물 공격을 맞으면 피해 대신 회복', absorb: 'water' }, 'volt-absorb': { ko: '축전', desc: '전기 공격을 맞으면 피해 대신 회복', absorb: 'electric' },
  'lightning-rod': { ko: '피뢰침', desc: '전기 공격을 맞으면 피해 대신 회복', absorb: 'electric' }, 'storm-drain': { ko: '마중물', desc: '물 공격을 맞으면 피해 대신 회복', absorb: 'water' },
  'sap-sipper': { ko: '초식', desc: '풀 공격을 맞으면 피해 대신 회복', absorb: 'grass' },
  synchronize: { ko: '싱크로', desc: '맞으면 때린 상대도 큰 피해', sync: true },
  // 회복
  'natural-cure': { ko: '자연회복', desc: '15초마다 체력 반 칸 회복', regen: true }, 'shed-skin': { ko: '탈피', desc: '15초마다 체력 반 칸 회복', regen: true },
  regenerator: { ko: '재생력', desc: '15초마다 체력 반 칸 회복', regen: true },
  pickup: { ko: '픽업', desc: '얻는 돈 x1.3', money: 1.3 },
  // 닿은 적에게
  static: { ko: '정전기', desc: '몸에 닿은 적이 30% 확률로 마비되고 전기 피해', contact: 'static' },
  'flame-body': { ko: '불꽃몸', desc: '몸에 닿은 적이 화상', contact: 'burn' },
  'poison-point': { ko: '독가시', desc: '몸에 닿은 적이 독', contact: 'psn' },
  'rough-skin': { ko: '까칠한피부', desc: '몸에 닿은 적에게 큰 피해', contact: 'spike' }, 'iron-barbs': { ko: '철가시', desc: '몸에 닿은 적에게 큰 피해', contact: 'spike' },
  'effect-spore': { ko: '포자', desc: '몸에 닿은 적이 독 또는 마비', contact: 'spore' }, 'cute-charm': { ko: '헤롱헤롱바디', desc: '몸에 닿은 적이 30% 확률로 멈춘다', contact: 'charm' },
  intimidate: { ko: '위협', desc: '주변 적의 공격이 뜸해진다', foes: 1.2, style: 'aura', color: '#ff6060' },
  // 날씨·오라 계열: 화력 증가 + 이펙트
  pressure: { ko: '프레셔', desc: '위압의 오라: 공격 x1.25, 주변 적의 공격이 뜸해진다', mul: 1.25, foes: 1.15, style: 'aura', color: '#b070ff' },
  unnerve: { ko: '긴장감', desc: '긴장의 오라: 공격 x1.2, 주변 적의 공격이 뜸해진다', mul: 1.2, foes: 1.1, style: 'aura', color: '#ff7090' },
  drought: { ko: '가뭄', desc: '햇살: 공격 x1.2, 불꽃 공격 x1.5', mul: 1.2, type: { fire: 1.5 }, style: 'sun', color: '#ff9030' },
  drizzle: { ko: '잔비', desc: '비: 공격 x1.2, 물 공격 x1.5', mul: 1.2, type: { water: 1.5 }, style: 'rain', color: '#60a0ff' },
  'sand-stream': { ko: '모래날림', desc: '모래바람: 공격 x1.15, 바위 공격 x1.3', mul: 1.15, type: { rock: 1.3 }, style: 'sand', color: '#d8c080' },
  'snow-warning': { ko: '눈퍼뜨리기', desc: '눈: 공격 x1.15, 얼음 공격 x1.3', mul: 1.15, type: { ice: 1.3 }, style: 'snow', color: '#e8f8ff' },
  'air-lock': { ko: '에어록', desc: '하늘의 기류: 공격 x1.3', mul: 1.3, style: 'wind', color: '#70e090' },
  'cloud-nine': { ko: '날씨부정', desc: '공격 x1.2', mul: 1.2, style: 'wind', color: '#c0e0ff' },
  multiscale: { ko: '멀티스케일', desc: '공격 x1.2, 체력이 가득하면 받는 피해 절반', mul: 1.2, full: true, style: 'shield', color: '#a0d8ff' },
  turboblaze: { ko: '터보블레이즈', desc: '푸른 불꽃의 오라: 공격 x1.3', mul: 1.3, style: 'flame', color: '#ff7040' },
  teravolt: { ko: '테라볼티지', desc: '번개의 오라: 공격 x1.3', mul: 1.3, style: 'spark', color: '#80c0ff' },
  'full-metal-body': { ko: '메탈프로텍트', desc: '공격 x1.2, 체력이 가득하면 받는 피해 절반', mul: 1.2, full: true, style: 'shield', color: '#ffd070' },
  'shadow-shield': { ko: '스펙터가드', desc: '공격 x1.2, 체력이 가득하면 받는 피해 절반', mul: 1.2, full: true, style: 'shield', color: '#b090ff' },
  'prism-armor': { ko: '프리즘아머', desc: '공격 x1.2, 받는 피해를 25% 확률로 반 칸 줄인다', mul: 1.2, armor: 0.25, style: 'shield', color: '#ffffff' },
  'intrepid-sword': { ko: '불요의검', desc: '공격 x1.4', mul: 1.4, style: 'aura', color: '#60b0ff' },
  'dauntless-shield': { ko: '불굴의방패', desc: '공격 x1.2, 받는 피해를 25% 확률로 반 칸 줄인다', mul: 1.2, armor: 0.25, style: 'shield', color: '#ff6080' },
  'fairy-aura': { ko: '페어리오라', desc: '공격 x1.2, 페어리 공격 x1.5', mul: 1.2, type: { fairy: 1.5 }, style: 'aura', color: '#ff9fd8' },
  'dark-aura': { ko: '다크오라', desc: '공격 x1.2, 악 공격 x1.5', mul: 1.2, type: { dark: 1.5 }, style: 'smoke', color: '#a03050' },
  'aura-break': { ko: '오라브레이크', desc: '공격 x1.3', mul: 1.3, style: 'aura', color: '#40e080' },
  'tablets-of-ruin': { ko: '재앙의목간', desc: '재앙의 기운: 공격 x1.3', mul: 1.3, style: 'smoke', color: '#80a040' },
  'sword-of-ruin': { ko: '재앙의검', desc: '재앙의 기운: 공격 x1.3', mul: 1.3, style: 'smoke', color: '#6080c0' },
  'vessel-of-ruin': { ko: '재앙의그릇', desc: '재앙의 기운: 공격 x1.3', mul: 1.3, style: 'smoke', color: '#a07040' },
  'beads-of-ruin': { ko: '재앙의구슬', desc: '재앙의 기운: 공격 x1.3', mul: 1.3, style: 'smoke', color: '#e06040' },
  'orichalcum-pulse': { ko: '진홍빛고동', desc: '햇살: 공격 x1.33, 불꽃 공격 x1.2', mul: 1.33, type: { fire: 1.2 }, style: 'sun', color: '#ff4030' },
  'hadron-engine': { ko: '하드론엔진', desc: '일렉트릭필드: 공격 x1.33, 전기 공격 x1.2', mul: 1.33, type: { electric: 1.2 }, style: 'spark', color: '#a060ff' },
  'serene-grace': { ko: '하늘의은총', desc: '공격 x1.2, 급소 +10%', mul: 1.2, crit: 0.1, style: 'aura', color: '#fff0a0' },
};
const LEGEND_AB_MUL = 1.3, SUB_LEGEND_AB_MUL = 1.15;
// 이번 포켓몬의 특성 (포켓몬이 바뀔 때만 다시 계산)
let abCache = { id: null, ab: null };
function curAb() {
  const p = player;
  if (!p?.mon) return null;
  if (abCache.id === p.mon.id) return abCache.ab;
  const id = p.mon.abilities?.[0] ?? 'pressure', base = AB[id], legend = !!LEGEND_MOVE[p.mon.id], col = TYPE_COLOR[p.mon.types[0]];
  // 효과가 없는 특성: 주변 오라 + 화력 증가
  let ab = base ? { id, ...base } : { id, ko: abKo(id), desc: '특별한 힘이 오라로 퍼진다: 공격 x1.2', mul: 1.2, style: 'aura', color: col };
  // 전설: 화력 증가 특성이 아니면 화력 증가와 오라를 더한다
  // 준전설은 기운이 조금 약하다 (x1.15)
  const lm = isSubLegend(p.mon.id) ? SUB_LEGEND_AB_MUL : LEGEND_AB_MUL;
  if (legend && !(ab.mul > 1)) ab = { ...ab, mul: lm, desc: `${ab.desc} · ${isSubLegend(p.mon.id) ? '준전설' : '전설'}의 기운: 공격 x${lm}`, color: ab.color ?? col };
  else if (legend && isSubLegend(p.mon.id) && ab.mul > 1) ab = { ...ab, mul: 1 + (ab.mul - 1) * 0.6 };  // 원래 화력 특성(프레셔 등)도 준전설은 덜 붙는다
  abCache = { id: p.mon.id, ab };
  return ab;
}
// 표에 없는 특성의 한국어 이름: PokeAPI에서 받아 브라우저에 저장해 둔다
const AB_KO_KEY = 'pokemon-dungeon-ability-names', abKoCache = store.get(AB_KO_KEY) ?? {}, abKoWait = new Set();
function abKo(id) {
  if (AB[id]) return AB[id].ko;
  if (abKoCache[id]) return abKoCache[id];
  if (!abKoWait.has(id)) { abKoWait.add(id); getJson(`${API}/ability/${id}`).then(j => { const n = j.names.find(n => n.language.name === 'ko')?.name; if (n) { abKoCache[id] = n; store.set(AB_KO_KEY, abKoCache); abCache.id = null; } }).catch(() => {}); }
  return id;
}
const monAb = m => { const id = m.abilities?.[0]; return id ? { ko: abKo(id), desc: AB[id]?.desc ?? '특별한 힘이 오라로 퍼진다: 공격 x1.2' } : null; };

// ---------- 효과 ----------
const abMul = () => { const a = curAb(), p = player; return a ? (a.mul ?? 1) * (a.moxie && p.moxT > p.time ? 1.3 : 1) * (a.justified && p.justT > p.time ? 1.3 : 1) : 1; };
// 피해 계산에서 조건이 붙는 배수
function abDamageMul(type, near) {
  const a = curAb(), p = player; if (!a) return 1;
  return (a.type?.[type] ?? 1) * (a.pinch === type && p.hp <= p.maxHp / 3 ? 1.5 : 1) * (a.guts && p.hp <= p.maxHp / 2 ? 1.35 : 1) * (a.near && near ? a.near : 1);
}
const abStat = (k, def = 1) => curAb()?.[k] ?? def;
// 맞을 때: 돌려주는 값이 실제 피해 (0이면 막음)
function abHurt(type, d, who, src) {
  const a = curAb(), p = player; if (!a || d <= 0) return d;
  if (a.immune === type) { say(`${a.ko}!`, p.x, p.y - 60, '#ccf'); return 0; }
  if (a.absorb === type) { heal(1); say(`${a.ko}: 회복!`, p.x, p.y - 60, '#8f8'); fx.push({ kind: 'boom', x: p.x, y: p.y - 20, r: 30, t: 0.3, max: 0.3, color: TYPE_COLOR[type] }); return 0; }
  if (a.noZone && src?.kind === 'zone') return 0;
  if (a.thick && (type === 'fire' || type === 'ice') && Math.random() < 0.5) { say('두꺼운지방!', p.x, p.y - 60, '#ccf'); return 0; }
  if (a.armor && Math.random() < a.armor) d -= 1;
  if (a.full && p.hp >= p.maxHp) { d = Math.ceil(d / 2); fx.push({ kind: 'boom', x: p.x, y: p.y - 20, r: 40, t: 0.25, max: 0.25, color: a.color }); }
  if (a.justified && type === 'dark') { p.justT = p.time + 6; say('정의의마음!', p.x, p.y - 80, '#ff8'); }
  if (a.sync && who && who.hp > 0) { damage(who, p.dmg * 2, p.type, false, true); fx.push({ kind: 'zap', x: p.x, y: p.y, x2: who.x, y2: who.y, t: 0.2 }); }
  if (a.sturdy && p.hp - d <= 0 && p.time >= (p.sturdyAt ?? 0)) { p.sturdyAt = p.time + 30; d = p.hp - 1; banner = { text: '옹골참으로 버텼다!', t: 2 }; }
  return Math.max(0, d);
}
// 닿은 적에게 (적마다 0.8초에 한 번)
function abContact(e) {
  const a = curAb(), p = player; if (!a?.contact || (e.abT ?? 0) > p.time) return;
  e.abT = p.time + 0.8;
  if (a.contact === 'static') { damage(e, p.dmg, 'electric', false, true); fx.push({ kind: 'zap', x: p.x, y: p.y, x2: e.x, y2: e.y, t: 0.15 }); if (Math.random() < 0.3) e.stun = Math.max(e.stun, 1); }
  if (a.contact === 'burn') { e.burn = Math.max(e.burn, 3); damage(e, p.dmg * 0.5, 'fire', false, true); }
  if (a.contact === 'psn') { e.psn = Math.max(e.psn ?? 0, 4); damage(e, p.dmg * 0.5, 'poison', false, true); }
  if (a.contact === 'spike') damage(e, p.dmg * 1.5, p.type, false, true);
  if (a.contact === 'spore') { if (Math.random() < 0.5) e.psn = Math.max(e.psn ?? 0, 4); else e.stun = Math.max(e.stun, 1); }
  if (a.contact === 'charm' && Math.random() < 0.3) { e.stun = Math.max(e.stun, 1.2); say('헤롱헤롱!', e.x, e.y - 50, '#fbd'); }
}
function abTick(dt) {
  const a = curAb(), p = player; if (!a) return;
  if (a.regen && (p.abRegen = (p.abRegen ?? 15) - dt) <= 0) { p.abRegen = 15; if (p.hp < p.maxHp) { heal(1); say(`${a.ko}!`, p.x, p.y - 60, '#8f8'); } }
}
const abKill = () => { const a = curAb(); if (a?.moxie) player.moxT = player.time + 6; };
// 주변 적의 공격 간격 배수 (프레셔·위협)
const abFoes = e => { const a = curAb(); return a?.foes && Math.hypot(e.x - player.x, e.y - player.y) < 260 ? a.foes : 1; };

// ---------- 이펙트 ----------
const isLegendMon = () => !!(player && LEGEND_MOVE[player.mon.id]);
function drawAbilityBack(a) {
  const ab = curAb(); if (!ab?.style) return;
  const c = ab.color, pul = 0.5 + Math.sin(now * 3) * 0.2;
  // 전설·환상은 몸 주위 오라를 그리지 않는다 (2026-11-23 사용자 요청으로 제거)
  if ((ab.style === 'aura' || ab.style === 'smoke') && !isLegendMon()) {
    const g = ctx.createRadialGradient(a.x, a.y - 20, 4, a.x, a.y - 20, 58);
    g.addColorStop(0, hexA(c, 0.5 * pul)); g.addColorStop(1, hexA(c, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(a.x, a.y - 20, 62, 54, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hexA(c, 0.95 * pul); ctx.lineWidth = 3;
    for (let i = 0; i < 2; i++) { const r = 30 + ((now * 22 + i * 18) % 36); ctx.globalAlpha = 1 - (r - 30) / 36; ctx.beginPath(); ctx.ellipse(a.x, a.y, r, r * 0.42, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  if (ab.style === 'sun') {
    const g = ctx.createRadialGradient(a.x, a.y - 20, 6, a.x, a.y - 20, 90);
    g.addColorStop(0, hexA(c, 0.35)); g.addColorStop(1, hexA(c, 0));
    ctx.fillStyle = g; ctx.fillRect(a.x - 90, a.y - 110, 180, 180);
    ctx.strokeStyle = hexA(c, 0.45); ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) { const g2 = now * 0.6 + i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(a.x + Math.cos(g2) * 40, a.y - 20 + Math.sin(g2) * 40); ctx.lineTo(a.x + Math.cos(g2) * 62, a.y - 20 + Math.sin(g2) * 62); ctx.stroke(); }
  }
  if (ab.style === 'shield' && player.hp >= player.maxHp) {
    ctx.strokeStyle = hexA(c, 0.35 + Math.abs(Math.sin(now * 2)) * 0.35); ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 6; i++) { const g2 = i / 6 * Math.PI * 2 + now * 0.4, x = a.x + Math.cos(g2) * 34, y = a.y - 20 + Math.sin(g2) * 38; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  }
}
function drawAbility(a, top, w) {
  const ab = curAb(), p = player; if (!ab) return;
  const c = ab.color, h = a.y - top, seed = i => (Math.sin(i * 91.7) + 1) / 2;
  // 위기 특성(맹화 등): 발동 중이면 몸에서 그 타입 색 불꽃
  const pinch = ab.pinch && p.hp <= p.maxHp / 3;
  const style = pinch ? 'flame' : ab.style, col = pinch ? TYPE_COLOR[ab.pinch] : c;
  if (style === 'flame') for (let i = 0; i < 6; i++) { const k = (now * 1.4 + seed(i)) % 1; ctx.globalAlpha = 1 - k; ctx.fillStyle = col; ctx.fillRect(Math.round(a.x - w / 2 + seed(i + 3) * w), Math.round(a.y - k * h * 1.1), 4, 4); }
  if (style === 'smoke') for (let i = 0; i < 5; i++) { const k = (now * 0.7 + seed(i)) % 1; ctx.globalAlpha = (1 - k) * 0.6; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(a.x - w / 2 + seed(i + 5) * w, a.y - k * h * 1.2, 4 + k * 6, 0, Math.PI * 2); ctx.fill(); }
  if (style === 'spark' && Math.sin(now * 13) > 0.3) { ctx.globalAlpha = 1; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); const x0 = a.x + (seed(Math.floor(now * 8)) - 0.5) * w * 1.4, y0 = top + seed(Math.floor(now * 8) + 1) * h; ctx.moveTo(x0, y0); ctx.lineTo(x0 + 6, y0 + 8); ctx.lineTo(x0 - 2, y0 + 12); ctx.lineTo(x0 + 5, y0 + 20); ctx.stroke(); }
  if (style === 'wind') { ctx.globalAlpha = 0.7; ctx.strokeStyle = col; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const g = now * 3 + i * 2.1; ctx.beginPath(); ctx.ellipse(a.x, a.y - h / 2, w / 2 + 14, h / 2 + 6, 0, g, g + 1.1); ctx.stroke(); } }
  if (style === 'rain') { ctx.globalAlpha = 0.6; ctx.strokeStyle = col; ctx.lineWidth = 2; for (let i = 0; i < 14; i++) { const x = a.x - 150 + seed(i) * 300, y = a.y - 160 + ((now * 420 + seed(i + 20) * 320) % 320); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 12); ctx.stroke(); } }
  if (style === 'snow') { ctx.globalAlpha = 0.8; ctx.fillStyle = col; for (let i = 0; i < 14; i++) ctx.fillRect(Math.round(a.x - 150 + seed(i) * 300 + Math.sin(now + i) * 10), Math.round(a.y - 160 + ((now * 60 + seed(i + 20) * 320) % 320)), 3, 3); }
  if (style === 'sand') { ctx.globalAlpha = 0.7; ctx.fillStyle = col; for (let i = 0; i < 16; i++) ctx.fillRect(Math.round(a.x - 160 + ((now * 160 + seed(i) * 320) % 320)), Math.round(a.y - 120 + seed(i + 30) * 160), 3, 2); }
  ctx.globalAlpha = 1;
}
// '#rrggbb' → rgba 문자열
const hexA = (c, a) => { const n = parseInt(c.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${Math.max(0, a)})`; };
