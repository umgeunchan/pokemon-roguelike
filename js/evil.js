// 악의 조직: 체육관을 제패하고 나오면 조직원이 다가와 거래를 건다
// 거래 = 좋은 것(도구·기술 위력·능력치)을 주는 대신 대가(최대 체력·상대 체력 증가·받는 피해 증가·회복량 절반)를 건다. 거절하면 라이벌급 승부
// 한 번이라도 거래하면 라이벌이 적대적으로 변하고, 8번 모두 거절하면 라이벌이 마지막 승부 뒤에 조건 없는 최고급 거래를 해 준다
// 기록(플레이어 숫자·참거짓 값이라 이어하기에 그대로 저장된다): evilDue 거래를 걸어올 배지 수, evilDeals 거래 횟수, evilRefused 거절 횟수,
// evilPow 기술 위력 배수, curseHp 상대 체력 배수, evilHurt 받는 피해 추가(반 칸 단위), healHalf 회복량 절반, rivalGiftDue/rivalGiftDone 라이벌의 선물

// 지방마다: 조직 이름, 색, 조직원·간부·보스 [이름, 스프라이트], 포켓몬 [진화 전, 진화 후], 보스 에이스, 승부 결투장 타입
const ORGS = {
  관동: { name: '로켓단', color: '#d02030', grunt: ['로켓단 조직원', 'rocketgrunt'], admin: ['아폴로', 'archer'], boss: ['비주기', 'giovanni'], mons: [[23, 24], [109, 110], [41, 42], [19, 20], [52, 53]], ace: 34, type: 'poison' },
  성도: { name: '로켓단', color: '#d02030', grunt: ['로켓단 조직원', 'rocketgruntf'], admin: ['랜스', 'proton'], boss: ['비주기', 'giovanni'], mons: [[41, 169], [109, 110], [228, 229], [19, 20], [198, 198]], ace: 112, type: 'dark' },
  호연: { name: '마그마단', color: '#c03010', grunt: ['마그마단 조직원', 'magmagrunt'], admin: ['호걸', 'tabitha'], boss: ['마적', 'maxie-gen3'], mons: [[322, 323], [218, 219], [261, 262], [41, 42], [109, 110]], ace: 323, type: 'fire' },
  신오: { name: '갤럭시단', color: '#40a0b0', grunt: ['갤럭시단 조직원', 'galacticgrunt'], admin: ['마스', 'mars'], boss: ['태홍', 'cyrus'], mons: [[434, 435], [41, 42], [451, 452], [436, 437], [198, 430]], ace: 461, type: 'dark' },
  하나: { name: '플라스마단', color: '#4060a0', grunt: ['플라스마단 조직원', 'plasmagrunt'], admin: ['아크로마', 'colress'], boss: ['게치스', 'ghetsis'], mons: [[509, 510], [551, 552], [559, 560], [602, 603], [599, 600]], ace: 635, type: 'dark' },
  칼로스: { name: '플레어단', color: '#e05020', grunt: ['플레어단 조직원', 'flaregrunt'], admin: ['크세로시키', 'xerosic'], boss: ['플라드리', 'lysandre'], mons: [[667, 668], [228, 229], [261, 262], [677, 678], [41, 42]], ace: 130, type: 'fire' },
  알로라: { name: '스컬단', color: '#6a6a7a', grunt: ['스컬단 조직원', 'skullgrunt'], admin: ['플루메리', 'plumeria'], boss: ['구즈마', 'guzma'], mons: [[757, 758], [19, 20], [41, 42], [88, 89], [751, 752]], ace: 768, type: 'bug' },
  가라르: { name: '매크로코스모스', color: '#b08a30', grunt: ['매크로코스모스 직원', 'oleana'], admin: ['올리브', 'oleana'], boss: ['로즈', 'rose'], mons: [[599, 600], [878, 879], [624, 625], [436, 437], [52, 863]], ace: 879, type: 'steel' },
  팔데아: { name: '스타단', color: '#e050c0', grunt: ['스타단 단원', 'giacomo'], admin: ['오르티가', 'ortega'], boss: ['보탄', 'penny'], mons: [[848, 849], [434, 435], [52, 863], [209, 210], [570, 571]], ace: 197, type: 'dark' },
};
const org = () => ORGS[region?.name];
const hasBatchim = w => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 > 0; };
const orgSay = s => { const n = org()?.name ?? '악의 조직', b = hasBatchim(n); return s.replaceAll('{org}이(가)', n + (b ? '이' : '가')).replaceAll('{org}은(는)', n + (b ? '은' : '는')).replaceAll('{org}이랑', n + (b ? '이랑' : '랑')).replaceAll('{org}이냐', n + (b ? '이냐' : '냐')).replaceAll('{org}', n); };
// 조직원은 이름에 조직 이름이 이미 들어 있다: '로켓단 조직원' / 간부·보스는 '로켓단 간부 아폴로'
const orgLabel = who => who.rank ? `${org().name} ${who.title} ${who.name}` : who.name;
// 배지 1~3개: 조직원, 4~6개: 간부, 7~8개: 보스
const orgWho = k => { const o = org(); const [name, sprite] = k >= 7 ? o.boss : k >= 4 ? o.admin : o.grunt; return { name, sprite, title: k >= 7 ? '보스' : k >= 4 ? '간부' : '조직원', rank: k >= 7 ? 2 : k >= 4 ? 1 : 0 }; };
const orgTeam = k => { const o = org(), n = clamp(1 + Math.ceil(k / 2), 2, 5); return [...o.mons.slice(0, n).map(([a, b]) => k >= 4 ? b : a), ...(k >= 7 ? [o.ace] : [])]; };

const EVIL_LINES = {
  offer: [
    '어이, 거기 배지 딴 트레이너! {org}이(가) 좋은 거래를 하나 제안하지. 손해 볼 일은 없을걸? 크크...',
    '배지를 모으는 실력자라... 당신 같은 인재를 {org}은(는) 늘 찾고 있었어요. 힘을 조금 나눠 드리죠. 대가는... 사소한 겁니다.',
    '강해지고 싶겠지. 나는 그 방법을 알고 있다. 이 손을 잡아라. 물론, 대가는 치러야겠지만.',
  ],
  accept: ['현명한 선택이야! {org}은(는) 은혜를 잊지 않지. 크크크...', '좋은 거래였어요. 다음에도... 기대하죠.', '그래. 그 힘에 익숙해져라. 너는 이미 우리 쪽이다.'],
  refuse: ['뭐? 거절하겠다고? 그럼 힘으로 빼앗아 주마!', '유감이군요. 그럼 실력으로 설득해 드리죠.', '어리석군. 그 고집, 내가 직접 꺾어 주마.'],
  ace: ['아직이야! 이 녀석이 진짜다!', '여기서부터가 진짜입니다.', '이것이 {org}의 힘이다!'],
  lose: ['크윽... 이번엔 물러나 주지! 하지만 {org}은(는) 끝나지 않아!', '...계산이 틀렸군요. 당신, 기억해 두죠.', '...훗. 거절할 줄 아는 트레이너인가. 언젠가 다시 만나게 되겠지.'],
};

// ---------- 거래 내용 ----------
// 좋은 것: 배지가 많을수록 더 좋다. 한 번에 2가지를 주고, 조직 전용 물건이 붙기도 한다
// (2026-11-23: 대가에 비해 보상이 약하다는 의견으로 크게 올림 → 2026-11-25: 반대로 너무 남는 장사라 보상은 조금 내리고 대가를 무겁게)
const f2 = v => +v.toFixed(2);
const EVIL_GIVE = [
  { id: 'item', ko: k => k >= 5 ? '마스터볼 급 물건 하나' : '하이퍼볼 급 물건 하나', give: k => { const p = player, c = k >= 5 ? masterReward() : hyperReward(); map.pickups.push({ ...c, x: p.x - 30, y: p.y + 40, ball: true }); } },
  { id: 'pow', ko: k => `모든 기술 위력 x${f2(1.15 + 0.02 * k)}`, give: k => { player.evilPow = (player.evilPow ?? 1) * (1.15 + 0.02 * k); } },
  { id: 'atk', ko: k => `공격 x${f2(1.1 + 0.015 * k)}`, give: k => { player.dmg *= 1.1 + 0.015 * k; } },
  { id: 'rate', ko: k => `연사 x${f2(1.1 + 0.015 * k)}, 탄속 x1.1`, give: k => { player.fireDelay /= 1.1 + 0.015 * k; player.shotSpeed *= 1.1; } },
  { id: 'crit', ko: k => `급소 +${8 + k}%, 사거리 x1.15`, give: k => { player.crit += 0.08 + 0.01 * k; player.range *= 1.15; } },
  { id: 'hp', ko: () => '최대 체력 +1칸, 완전 회복', give: () => { const p = player; p.maxHp += 2; p.hp = p.maxHp; } },
  { id: 'speed', ko: k => `이동 속도 +${f2(0.15 + 0.015 * k)}, 공격 +${f2(0.2 * k)}`, give: k => { player.speed += 30 + 3 * k; player.dmg += 0.2 * k; } },
];
// 조직 전용 물건: 악의 조직과 거래해야만 얻는다 (도구 r: 'e'는 상자·상점에 안 나온다, 섀도 기술은 마스터볼 급 보상에서도 빠진다)
ITEMS.push(
  { ...I('evil-core', 'e', '섀도코어', '조직 전용 · 공격 x1.25, 급소 +8%', p => { p.dmg *= 1.25; p.crit += 0.08; }), icon: 'dark-gem' },
  { ...I('evil-fang', 'e', '흡혈송곳니', '조직 전용 · 피해를 줄수록 체력을 흡수한다', p => { p.vamp = true; }), icon: 'razor-fang' },
  { ...I('evil-armor', 'e', '흑요석 갑옷', '조직 전용 · 최대 체력 +2칸, 완전 회복', p => { p.maxHp += 4; p.hp = p.maxHp; }), icon: 'malicious-armor' },
  { ...I('evil-disc', 'e', '개조 디스크', '조직 전용 · 연사 x1.3, 탄속 x1.2', p => { p.fireDelay /= 1.3; p.shotSpeed *= 1.2; }), icon: 'dubious-disc' },
  { ...I('evil-stone', 'e', '어둠의 결정', '조직 전용 · 적을 쓰러뜨리면 6초 동안 공격 x1.4', p => { p.evilMoxie = true; }), icon: 'black-augurite' },
  { ...I('evil-plate', 'e', '어둠의 판', '조직 전용 · 모든 기술 위력 x1.2', p => { p.evilPow = (p.evilPow ?? 1) * 1.2; }), icon: 'dread-plate' },
);
const EVIL_ITEMS = ['evil-core', 'evil-fang', 'evil-armor', 'evil-disc', 'evil-stone', 'evil-plate'], EVIL_MOVES = ['shadow-rush', 'shadow-blast', 'shadow-storm', 'shadow-end'];
// 아직 없는 조직 전용 물건 하나 (기술 또는 도구)
function evilExclusive() {
  const p = player, own = id => taken.has(id) || p.moves.has(id) || p.items.some(i => i.id === id);
  const pool = [...EVIL_ITEMS.filter(id => !own(id)).map(id => ({ kind: 'item', item: itemById(id) })), ...EVIL_MOVES.filter(id => !own(id)).map(id => ({ kind: 'tm', tm: moveDef(id) }))];
  if (!pool.length) return null;
  const c = pick(pool); taken.add(c.kind === 'item' ? c.item.id : c.tm.id); return c;
}
const exclusiveGive = c => ({ id: 'excl', ko: () => `조직 전용 ${c.kind === 'tm' ? '기술' : '도구'}: ${c.kind === 'tm' ? c.tm.name : c.item.name} (${c.kind === 'tm' ? c.tm.desc.replace('조직 전용 · ', '') : c.item.desc.replace('조직 전용 · ', '')})`,
  give: () => { const p = player; map.pickups.push({ ...c, x: p.x + 30, y: p.y + 40, ball: true }); }, excl: true });
// 대가: 배지가 많을수록 무겁다 (조직원 → 간부 → 보스). 배지 1~3개는 1가지, 4개부터는 서로 다른 2가지를 한꺼번에 건다
// 최대 체력은 2칸 아래로는 깎지 않는다(그만큼 남지 않으면 그 대가는 고르지 않는다)
const hpLoss = k => k >= 7 ? 10 : k >= 4 ? 6 : 4;  // 반 칸 단위: 2칸 / 3칸 / 5칸
const curseMul = k => k >= 7 ? 2 : k >= 4 ? 1.7 : 1.4;
const hurtAdd = k => k >= 7 ? 2 : 1;  // 반 칸 단위
const EVIL_COST = [
  { id: 'maxhp', ko: k => `최대 체력 -${hpLoss(k) / 2}칸`, ok: (p, k) => p.maxHp - hpLoss(k) >= 4, pay: (p, k) => { p.maxHp -= hpLoss(k); p.hp = Math.min(p.hp, p.maxHp); } },
  { id: 'curse', ko: k => `앞으로 만나는 상대 포켓몬 체력 x${curseMul(k)}`, ok: () => true, pay: (p, k) => { p.curseHp = (p.curseHp ?? 1) * curseMul(k); } },
  { id: 'hurt', ko: k => `앞으로 받는 피해 +${hurtAdd(k) === 1 ? '반 칸' : hurtAdd(k) / 2 + '칸'} (맞을 때마다)`, ok: () => true, pay: (p, k) => { p.evilHurt = (p.evilHurt ?? 0) + hurtAdd(k); } },
  { id: 'heal', ko: () => '앞으로 회복량 절반', ok: p => !p.healHalf, pay: p => { p.healHalf = true; } },
];
let deal = null;
function makeDeal(n, k) {
  const p = player, costs = shuffle(EVIL_COST.filter(c => c.ok(p, k))).slice(0, k >= 4 ? 2 : 1);
  if (!costs.length) costs.push(EVIL_COST[1]);
  const pool = shuffle(EVIL_GIVE.filter(g => !(g.id === 'hp' && costs.some(c => c.id === 'maxhp'))));
  const gives = pool.slice(0, 2);
  // 조직 전용 물건: 배지 1~3개 20%, 4~6개 45%, 7~8개는 반드시
  const ex = Math.random() < (k >= 7 ? 1 : k >= 4 ? 0.45 : 0.2) && evilExclusive();
  if (ex) gives.push(exclusiveGive(ex));
  return { n, k, who: n.who, line: orgSay(EVIL_LINES.offer[n.who.rank]), gives, costs };
}

// ---------- 체육관 밖에서 다가온다 ----------
// 체육관을 이기면 battle.js가 player.evilDue = 배지 수를 남긴다. 밖(지방 지도)으로 나오면 조직원이 나타나 걸어온다
function evilCheck(dt) {
  const p = player, o = org();
  if (!o || map !== world || map.battle || legendFight || state !== 'play') return;
  if (p.rivalGiftDue) { p.rivalGiftDue = false; openRivalGift(); return; }
  const n = world.npcs.find(n => n.kind === 'evil');
  if (!n) {
    if (!(p.evilDue > 0) || p.evilSpawning) return;
    const k = p.evilDue, who = orgWho(k);
    p.evilSpawning = true;
    Promise.all([loadTrainer(who.sprite), ...orgTeam(k).map(id => loadMon(id).catch(() => {}))]).finally(() => {
      p.evilSpawning = false;
      if (player !== p || !(p.evilDue > 0)) return;
      const ang = Math.random() * Math.PI * 2, m = { id: -2, kind: 'evil', k, who, sprite: who.sprite, name: who.name, x: p.x + Math.cos(ang) * 260, y: p.y + Math.sin(ang) * 260, r: 14 };
      unstick(m); clampBody(m);
      world.npcs.push(m);
      fx.push({ kind: 'lnova', x: m.x, y: m.y, r: 60, c1: o.color, c2: '#ffffff', t: 0.5, max: 0.5 });
      banner = { text: `${orgLabel(who)}이(가) 다가온다...`, t: 2.5, glow: o.color };
    });
    return;
  }
  if (n.leaveT !== undefined) { if ((n.leaveT -= dt) <= 0) { world.npcs = world.npcs.filter(x => x !== n); fx.push({ kind: 'poof', x: n.x, y: n.y, t: 0.3, max: 0.3 }); } return; }
  const d = Math.hypot(p.x - n.x, p.y - n.y);
  n.flip = p.x > n.x;
  if (d > 110) { const ox = n.x, oy = n.y; moveBody(n, (p.x - n.x) / d * 160 * dt, (p.y - n.y) / d * 160 * dt); n.moving = n.x !== ox || n.y !== oy; return; }
  n.moving = false;
  deal = makeDeal(n, n.k); state = 'deal'; sfx('battle');
}

function acceptDeal() {
  const p = player, dl = deal, o = org();
  deal = null; state = 'play';
  if (dl.rival) {
    withDelta(() => dl.gives.forEach(g => g.give(8)));
    p.rivalGiftDone = true; ach('rivalgift');
    fx.push({ kind: 'lnova', x: p.x, y: p.y, r: 160, c1: '#ffd060', c2: '#ffffff', t: 0.8, max: 0.8 }, { kind: 'lflash', x: p.x, y: p.y, c1: '#fff2b0', t: 0.4, max: 0.4 });
    lburst(p.x, p.y, '#ffd060', '#ffffff', 40, 260, 0.9, 120); sfx('evolve');
    banner = { text: '라이벌의 마음이 담긴 최고의 거래! 조건 없이 힘을 받았다', t: 4, glow: '#ffd060' };
    renderBar(); return;
  }
  withDelta(() => { dl.gives.forEach(g => g.give(dl.k)); dl.costs.forEach(c => c.pay(p, dl.k)); capStats(p); });
  p.evilDeals = (p.evilDeals ?? 0) + 1; p.evilDue = 0;
  ach('evil1'); if (p.evilDeals >= 8) ach('evil8');
  if (dl.gives.some(g => g.excl)) ach('evilitem');
  // 계약의 연출: 검붉은 기운이 몸을 감싸고 화면이 잠깐 어두워진다
  fx.push({ kind: 'lnova', x: p.x, y: p.y, r: 150, c1: '#601040', c2: o.color, t: 0.8, max: 0.8 }, { kind: 'lflash', x: p.x, y: p.y, c1: '#300018', t: 0.5, max: 0.5 });
  lburst(p.x, p.y, '#a02060', '#301028', 36, 220, 0.9, 80); shake = 0.3; sfx('crit');
  dialog = { name: dl.who.name, text: orgSay(EVIL_LINES.accept[dl.who.rank]), t: 4 };
  const rv = RIVALS[region.name];
  banner = { text: p.evilDeals === 1 && rv ? `거래 성립... 어딘가에서 ${rv[0]}이(가) 지켜보고 있었다` : `거래 성립: ${dl.gives.map(g => g.ko(dl.k)).join(', ')} / 대가: ${dl.costs.map(c => c.ko(dl.k)).join(', ')}`, t: 3.5, glow: '#a02060' };
  dl.n.leaveT = 2.5;
  renderBar();
}

function refuseDeal() {
  const p = player, dl = deal;
  deal = null; state = 'play'; p.evilDue = 0;
  startEvilBattle(dl.n, dl.k);
}

// 거절: 라이벌처럼 결투장으로 옮겨 싸운다. 이기면 잠시 뒤 원래 자리로
function startEvilBattle(n, k) {
  const p = player, o = org(), who = n.who;
  world.returnTo = [p.x, p.y];
  map = makeRivalArena({ leader: who.name, sprite: who.sprite, title: o.name }, o.type);
  resetCombat(); p.warpIn = 0.6;
  const r = map.room, at = { x: r.cx, y: (r.y0 + 1.6) * TS };
  p.x = r.cx; p.y = (map.th - 2.5) * TS;
  fx.push({ kind: 'lflash', x: p.x, y: p.y, c1: o.color, t: 0.4, max: 0.4 });
  startBattle({ who: who.name, title: who.rank ? `${o.name} ${who.title}` : '', queue: orgTeam(k).filter(id => MON[id]), ...at, rank: 'boss', tier: clamp(k - 1, 0, 7), hpMul: k > 1 ? 1.15 : 0.6, rival: true, wait: 2.5,
    say: (i, ace) => i === 0 ? orgSay(EVIL_LINES.refuse[who.rank]) : ace ? orgSay(EVIL_LINES.ace[who.rank]) : null, onWin: () => {
      r.cleared = true; p.evilRefused = (p.evilRefused ?? 0) + 1;
      world.npcs = world.npcs.filter(x => x !== n);
      gainMoney(1000 + k * 500, at.x, at.y);
      dialog = { name: who.name, text: orgSay(EVIL_LINES.lose[who.rank]), t: 5 };
      banner = { text: `${orgLabel(who)}을(를) 물리쳤다! (거절 ${p.evilRefused}번)`, t: 3 };
      world.pickups.push({ ...rollContent(Math.random, { tm: 0.4, c: 0, r: 0.6, l: k >= 5 ? 0.4 : 0.15 }), x: world.returnTo[0], y: world.returnTo[1] + 50, ball: true });
      if (who.rank === 2) ach('evilboss');
      if (p.evilRefused >= 8 && !(p.evilDeals > 0)) ach('justice');
      map.returnT = 3.5;
    } });
}

// 8번 모두 거절했다면: 마지막 라이벌 승부 뒤 라이벌이 조건 없는 최고급 거래를 해 준다
function openRivalGift() {
  const [name, sprite] = RIVALS[region.name];
  loadTrainer(sprite);
  deal = { rival: true, k: 8, who: { name, sprite, title: '라이벌', rank: 2 },
    line: orgSay('{org}의 유혹을 여덟 번 모두 뿌리쳤다며? ...역시 넌 내 라이벌이야. 이건 내가 모아 둔 최고의 것들이야. 조건 따윈 없어. 챔피언, 꼭 되라고!'),
    gives: [EVIL_GIVE[0], EVIL_GIVE[1], EVIL_GIVE[2], EVIL_GIVE[5]], costs: null };
  state = 'deal'; sfx('select');
}
const rivalHostile = () => (player?.evilDeals ?? 0) > 0;

// ---------- 거래 화면 ----------
function drawDeal() {
  const dl = deal; if (!dl) return;
  const o = org(), col = dl.rival ? '#ffd060' : o.color, w = 560, h = 350, x = SIDE + (W - w) / 2, y = HUD + (H - h) / 2;
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(SIDE, HUD, W, H);
  ctx.fillStyle = dl.rival ? '#1e1a10' : '#1a1016'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  // 테두리에 기운이 흐른다
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + Math.sin(now * 3) * 0.15; ctx.strokeStyle = col; ctx.lineWidth = 8; ctx.strokeRect(x - 3, y - 3, w + 6, h + 6); ctx.restore();
  drawTrainerSprite(dl.who.sprite, x + 70, y + 120, false);
  glowText(dl.rival ? `라이벌 ${dl.who.name}` : orgLabel(dl.who), x + 140, y + 30, 16, '#fff', col, 'left');
  wrap(dl.line, x + 140, y + 54, w - 160, 11, '#ddd', text);
  ctx.fillStyle = 'rgba(255,210,90,.1)'; ctx.fillRect(x + 20, y + 132, w - 40, 86);
  text(dl.rival ? '선물' : '받는 것', x + 30, y + 148, 11, '#fd6', 'left');
  dl.gives.forEach((g, i) => text(`· ${g.ko(dl.k)}`, x + 30, y + 166 + i * 15, g.excl ? 11 : 12, g.excl ? '#e0a0ff' : '#ffe8a0', 'left'));
  if (dl.costs) {
    ctx.fillStyle = 'rgba(255,60,90,.1)'; ctx.fillRect(x + 20, y + 224, w - 40, 22 + dl.costs.length * 16);
    text('대가', x + 30, y + 238, 11, '#f68', 'left');
    dl.costs.forEach((c, i) => text(`· ${c.ko(dl.k)}`, x + 30, y + 254 + i * 16, 12, '#ff9ab0', 'left'));
  } else text('대가 없음', x + 30, y + 242, 12, '#9f9', 'left');
  const btn = (bx, label, c, fn) => { ctx.fillStyle = c; ctx.fillRect(bx, y + h - 56, 200, 38); text(label, bx + 100, y + h - 32, 13, '#fff'); taps.push({ x: bx, y: y + h - 56, w: 200, h: 38, fn }); };
  if (dl.rival) btn(x + (w - 200) / 2, TOUCH ? '받는다' : '[1] 받는다', '#806020', acceptDeal);
  else { btn(x + 70, TOUCH ? '거래한다' : '[1] 거래한다', '#702040', acceptDeal); btn(x + w - 270, TOUCH ? '거절한다 (승부)' : '[2] 거절한다 (승부)', '#304060', refuseDeal); }
  if (!dl.rival) text(rivalHostile() ? '이미 조직과 손을 잡았다...' : `한 번이라도 거래하면 라이벌이 등을 돌린다 · 거절 ${player.evilRefused ?? 0}/8`, x + w / 2, y + h - 8, 10, '#888');
}
function dealKey(code, d) {
  if (!deal) return;
  if (d === 1 || (deal.rival && ['Enter', 'KeyE', 'KeyZ'].includes(code))) acceptDeal();
  else if (d === 2 && !deal.rival) refuseDeal();
}
