// 기믹: 메가진화 · Z기술 · 다이맥스 · 테라스탈
// 아이템은 볼(드물게) · 관장/라이벌 보상 · 상점 특가로 얻고, 얻는 순간 영구 적용된다. 모두 함께 쓸 수 있다
// 등급 'g': 보통 볼 풀(c/r/l)에는 섞이지 않고 rollGimmick으로만 나온다

// 메가진화: [메가진화하는 포켓몬, 메가스톤(둘이면 X/Y), 같은 진화 계통의 이전 단계]
const MEGA_LINES = [
  [3, ['venusaurite'], [1, 2]], [6, ['charizardite-x', 'charizardite-y'], [4, 5]], [9, ['blastoisinite'], [7, 8]], [15, ['beedrillite'], [13, 14]],
  [18, ['pidgeotite'], [16, 17]], [65, ['alakazite'], [63, 64]], [80, ['slowbronite'], [79]], [94, ['gengarite'], [92, 93]], [115, ['kangaskhanite'], []],
  [127, ['pinsirite'], []], [130, ['gyaradosite'], [129]], [142, ['aerodactylite'], []], [150, ['mewtwonite-x', 'mewtwonite-y'], []],
  [181, ['ampharosite'], [179, 180]], [208, ['steelixite'], [95]], [212, ['scizorite'], [123]], [214, ['heracronite'], []], [229, ['houndoominite'], [228]],
  [248, ['tyranitarite'], [246, 247]], [254, ['sceptilite'], [252, 253]], [257, ['blazikenite'], [255, 256]], [260, ['swampertite'], [258, 259]],
  [282, ['gardevoirite'], [280, 281]], [475, ['galladite'], []], [302, ['sablenite'], []], [303, ['mawilite'], []], [306, ['aggronite'], [304, 305]],
  [308, ['medichamite'], [307]], [310, ['manectite'], [309]], [319, ['sharpedonite'], [318]], [323, ['cameruptite'], [322]], [334, ['altarianite'], [333]],
  [354, ['banettite'], [353]], [359, ['absolite'], []], [362, ['glalitite'], [361]], [373, ['salamencite'], [371, 372]], [376, ['metagrossite'], [374, 375]],
  [380, ['latiasite'], []], [381, ['latiosite'], []], [428, ['lopunnite'], [427]], [445, ['garchompite'], [443, 444]], [448, ['lucarionite'], [447]],
  [460, ['abomasite'], [459]], [531, ['audinite'], []], [719, ['diancite'], []],
];
const MEGA_STONES = MEGA_LINES.flatMap(([id, stones]) => stones.map(s => ({ s, id })));
const megaLine = id => MEGA_LINES.find(([m, , pre]) => m === id || pre.includes(id));
const GI = (id, name, desc, apply, icon) => ({ id, r: 'g', name, desc, apply, icon });
ITEMS.push(
  ...MEGA_STONES.map(({ s, id }) => ({ ...GI(s, '메가스톤', '', p => { p.megaStone = s; checkMega(); }),
    get name() { return `${MON[id]?.name ?? '메가'}나이트${s.endsWith('-x') ? ' X' : s.endsWith('-y') ? ' Y' : ''}`; },
    get desc() { return `${MON[id]?.name ?? '최종 진화'}이(가) 되면 메가진화: 공격 x1.5`; } })),
  GI('z-crystal', 'Z크리스탈', '기술 하나에 Z파워: 그 기술 타입 피해 x1.5(다른 공격도 x1.25), 모든 효과 범위 x1.3', () => startZ(), 'z-ring'),
  GI('dynamax-band', '다이맥스밴드', '다이맥스: 최대 체력 +3칸, 공격 x1.25, 몸이 커진다', p => { p.maxHp += 6; p.hp += 6; p.dmax = true; p.r = 18; gimmickFx('dmax'); }),
  ...Object.keys(TYPE_KO).map(t => GI(`${t}-tera-shard`, `${TYPE_KO[t]} 테라피스`, `테라스탈: 내 타입(${TYPE_KO[t]})이면 공격 x1.5, 아니면 공격 +0.8`, p => tera(p, t))),
);

// 늘 붙는 기믹 배수 (능력치 창의 공격에 보인다)
const zActive = () => !!player?.zMove && player.moves.has(player.zMove);
const gimmickMul = () => { const p = player; return p ? (p.mega ? 1.5 : 1) * (LEGEND_FORMS[p.legendForm]?.mul ?? 1) * (p.dmax ? 1.25 : 1) * (p.teraSame ? 1.5 : 1) * (zActive() ? 1.25 : 1) : 1; };
// Z기술 타입 피해는 x1.5 (늘 붙는 x1.25에 1.2를 더 곱함)
const zTypeMul = type => zActive() && moveDef(player.zMove).type === type ? 1.2 : 1;
const zScale = () => zActive() ? 1.3 : 1;

// 볼·보상·상점에서 나올 기믹 아이템 하나 (이미 가졌거나 이번 판에 이미 나온 것은 빼고)
function rollGimmick(rnd) {
  const p = player, owned = id => taken.has(id) || !!p?.items.some(i => i.id === id), c = [];
  const line = p && megaLine(p.mon.id);
  if (line && !line[1].some(owned)) c.push(line[1][Math.floor(rnd() * line[1].length)]);
  if (!owned('z-crystal')) c.push('z-crystal');
  if (!owned('dynamax-band')) c.push('dynamax-band');
  const own = p?.mon.types.find(t => !owned(`${t}-tera-shard`)), others = Object.keys(TYPE_KO).filter(t => !owned(`${t}-tera-shard`));
  const t = own && rnd() < 0.5 ? own : others.length ? others[Math.floor(rnd() * others.length)] : null;
  if (t) c.push(`${t}-tera-shard`);
  if (!c.length) return null;
  const id = c[Math.floor(rnd() * c.length)];
  taken.add(id);
  return { kind: 'item', item: itemById(id) };
}
const gimmickReward = (x, y) => { const g = rollGimmick(Math.random); if (g) map.pickups.push({ ...g, x, y, ball: true }); };

function gimmickFx(kind) { const p = player; fx.push({ kind, x: p.x, y: p.y, t: 1.3, max: 1.3, color: TYPE_COLOR[p.teraType] }); shake = 0.3; }

// ---------- 메가진화 ----------
function checkMega() {
  const p = player, st = MEGA_STONES.find(o => o.s === p.megaStone);
  if (!st || p.mega) return;
  if (p.mon.id !== st.id) return say(`${MON[st.id]?.name ?? '최종 진화'}이(가) 되면 메가진화할 수 있다`, p.x, p.y - 90, '#fbf');
  const name = p.mon.name;
  withDelta(() => { p.mega = true; });
  gimmickFx('mega'); sfx('evolve');
  banner = { text: `${name}은(는) 메가${name}(으)로 메가진화했다!`, t: 3.5, glow: '#ff9fe0' };
  loadMegaArt();
}
// 메가진화한 모습: 필드 그림(PMD)이 있으면 그것, 없으면 원래 그림을 쓰고 무지개 오라로 표시한다
async function loadMegaArt() {
  const p = player, st = MEGA_STONES.find(o => o.s === p.megaStone), m = p.mon;
  if (!st) return;
  const xy = st.s.endsWith('-x') ? '-x' : st.s.endsWith('-y') ? '-y' : '';
  const [j, field] = await Promise.all([getJson(`${API}/pokemon/${m.species.name}-mega${xy}`).catch(() => null), loadField(m.id, xy === '-y' ? '/0002' : '/0001')]);
  const img = j?.sprites?.front_default ? await loadImg(j.sprites.front_default).catch(() => null) : null;
  // 이로치는 메가 그림이 없을 때 이로치 그림을 그대로 쓴다 (메가 그림은 보통 색만 있다)
  const base = p.shiny && m.shinyArt || m;
  if (player === p) p.megaArt = { img: p.shiny ? base.img : img ?? m.img, box: !p.shiny && img ? spriteBox(img) : m.box, field: p.shiny ? base.field : field ?? m.field };
}

// ---------- 전설·환상의 폼 체인지 ----------
// 폼 체인지가 되는 포켓몬이 자기 전용 도구를 손에 넣으면 도구 효과에 더해 모습이 바뀌고 능력이 늘 오른다 (기믹 배수: 늘 적용)
// 키 = PokeAPI 폼 이름. item = 전용 도구, mon = 포켓몬 번호, pmd = 필드 그림 폼 번호(기본 /0001), form: null이면 원래 모습 그대로
// mul = 공격 배수, spd·rate·shot = 이동 속도·공격 간격·탄속 배수, hp = 처음 바뀔 때 최대 체력(반 칸 단위), guard = 받는 피해 늘 반 칸
// mega: 원시회귀·레쿠쟈처럼 메가진화(x1.5)도 함께 일어난다. type: 내 타입이 바뀐다(아르세우스). shotType: 공격 타입만 바뀐다(게노세크트)
// 같은 포켓몬의 다른 폼 도구를 주우면 그 폼으로 바뀐다 (테오키스 운석, 아르세우스 플레이트, 게노세크트 카세트)
const LEGEND_FORMS = {
  'dialga-origin': { item: 'adamant-orb', mon: 483, base: '디아루가', name: '디아루가 오리진', mul: 1.3, say: '디아루가는 금강옥의 힘으로 오리진폼이 되었다!' },
  'palkia-origin': { item: 'lustrous-orb', mon: 484, base: '펄기아', name: '펄기아 오리진', mul: 1.3, say: '펄기아는 백옥의 힘으로 오리진폼이 되었다!' },
  'giratina-origin': { item: 'griseous-orb', mon: 487, base: '기라티나', name: '기라티나 오리진', mul: 1.3, say: '기라티나는 백금옥의 힘으로 오리진폼이 되었다!' },
  'kyogre-primal': { item: 'blue-orb', mon: 382, base: '가이오가', name: '원시가이오가', mul: 1.2, mega: true, say: '가이오가의 원시회귀! 태고의 모습을 되찾았다!' },
  'groudon-primal': { item: 'red-orb', mon: 383, base: '그란돈', name: '원시그란돈', mul: 1.2, mega: true, say: '그란돈의 원시회귀! 태고의 모습을 되찾았다!' },
  'rayquaza-mega': { item: 'jade-orb', mon: 384, base: '레쿠쟈', name: '메가레쿠쟈', mul: 1.2, mega: true, say: '레쿠쟈는 비취구슬의 힘으로 메가진화했다!' },
  'zacian-crowned': { item: 'rusted-sword', mon: 888, base: '자시안', name: '자시안 검왕', mul: 1.3, say: '자시안은 녹슨 검을 물고 검왕의 모습이 되었다!' },
  'zamazenta-crowned': { item: 'rusted-shield', mon: 889, base: '자마젠타', name: '자마젠타 방패왕', mul: 1.2, hp: 4, say: '자마젠타는 녹슨 방패를 두르고 방패왕의 모습이 되었다!' },
  'shaymin-sky': { item: 'gracidea', mon: 492, base: '쉐이미', name: '쉐이미 스카이', mul: 1.25, say: '쉐이미는 그라시데아꽃으로 스카이폼이 되었다!' },
  'hoopa-unbound': { item: 'prison-bottle', mon: 720, base: '후파', name: '굴레를 벗어난 후파', mul: 1.3, say: '굴레의항아리가 열렸다! 후파가 본모습을 드러냈다!' },
  'kyurem-black': { item: 'dna-splicers', mon: 646, base: '큐레무', name: '블랙큐레무', mul: 1.35, say: '큐레무는 유전자쐐기로 블랙큐레무가 되었다!' },
  // 영물폼: 비추는거울 하나로 셋 다
  'tornadus-therian': { item: 'reveal-glass', mon: 641, base: '토네로스', name: '토네로스 영물폼', mul: 1.3, note: '영물폼, 화력 x1.3', say: '비추는거울에 비친 토네로스가 영물폼이 되었다!' },
  'thundurus-therian': { item: 'reveal-glass', mon: 642, base: '볼트로스', name: '볼트로스 영물폼', mul: 1.3, say: '비추는거울에 비친 볼트로스가 영물폼이 되었다!' },
  'landorus-therian': { item: 'reveal-glass', mon: 645, base: '랜드로스', name: '랜드로스 영물폼', mul: 1.3, say: '비추는거울에 비친 랜드로스가 영물폼이 되었다!' },
  // 지가르데 퍼펙트폼, 무한다이노 무한다이맥스(다이맥스밴드)
  'zygarde-complete': { item: 'zygarde-cube', mon: 718, pmd: '/0002', base: '지가르데', name: '퍼펙트 지가르데', mul: 1.25, hp: 8, note: '퍼펙트폼, 화력 x1.25·최대 체력 +4칸', say: '셀이 모여든다! 지가르데가 퍼펙트폼이 되었다!' },
  'eternatus-eternamax': { item: 'dynamax-band', mon: 890, base: '무한다이노', name: '무한다이맥스 무한다이노', mul: 1.3, hp: 4, note: '무한다이맥스, 화력 x1.3·최대 체력 +2칸', say: '무한다이노가 무한다이맥스했다!' },
  // 테오키스: 운석 4종
  'deoxys-attack': { item: 'attack-meteorite', mon: 386, pmd: '/0001', base: '테오키스', name: '테오키스 어택폼', mul: 2, note: '어택폼, 공격 x2', say: '운석이 빛난다! 테오키스는 어택폼이 되었다!' },
  'deoxys-defense': { item: 'defense-meteorite', mon: 386, pmd: '/0002', base: '테오키스', name: '테오키스 디펜스폼', guard: true, note: '디펜스폼, 받는 피해가 늘 반 칸', say: '운석이 빛난다! 테오키스는 디펜스폼이 되었다!' },
  'deoxys-speed': { item: 'speed-meteorite', mon: 386, pmd: '/0003', base: '테오키스', name: '테오키스 스피드폼', spd: 1.35, note: '스피드폼, 이동 속도 x1.35', say: '운석이 빛난다! 테오키스는 스피드폼이 되었다!' },
  'deoxys-normal': { item: 'balance-meteorite', mon: 386, form: null, base: '테오키스', name: '테오키스 밸런스', mul: 1.15, spd: 1.1, rate: 0.9, shot: 1.1, hp: 2, note: '노말폼, 공격·연사·속도·탄속·체력 고루 증가', say: '운석이 빛난다! 테오키스는 균형 잡힌 노말폼이 되었다!' },
};
// 네크로즈마·버드렉스·우라오스·오거폰·테라파고스. types: 내 타입이 이것으로 바뀐다
Object.assign(LEGEND_FORMS, {
  'necrozma-dusk': { item: 'n-solarizer', mon: 800, pmd: '/0001', base: '네크로즈마', name: '황혼의 갈기 네크로즈마', mul: 1.3, types: ['psychic', 'steel'], note: '황혼의 갈기, 강철 타입 추가·화력 x1.3', say: '네크로즈마가 솔가레오와 합체했다! 황혼의 갈기!' },
  'necrozma-dawn': { item: 'n-lunarizer', mon: 800, pmd: '/0002', base: '네크로즈마', name: '새벽의 날개 네크로즈마', mul: 1.2, rate: 0.85, types: ['psychic', 'ghost'], note: '새벽의 날개, 고스트 타입 추가·화력 x1.2·연사 증가', say: '네크로즈마가 루나아라와 합체했다! 새벽의 날개!' },
  'necrozma-ultra': { item: 'ultranecrozium-z', mon: 800, pmd: '/0003', base: '네크로즈마', name: '울트라네크로즈마', mul: 1.5, hp: 4, types: ['psychic', 'dragon'], note: '울트라네크로즈마, 화력 x1.5·최대 체력 +2칸', say: '빛이 넘쳐흐른다! 울트라네크로즈마!' },
  'calyrex-ice': { item: 'ice-reins', mon: 898, pmd: '/0001', base: '버드렉스', name: '백마 버드렉스', mul: 1.35, hp: 4, types: ['psychic', 'ice'], note: '백마 탄 모습, 화력 x1.35·최대 체력 +2칸', say: '버드렉스가 블리자포스에 올라탔다!' },
  'calyrex-shadow': { item: 'shadow-reins', mon: 898, pmd: '/0002', base: '버드렉스', name: '흑마 버드렉스', mul: 1.2, rate: 0.8, spd: 1.15, types: ['psychic', 'ghost'], note: '흑마 탄 모습, 화력 x1.2·연사·속도 증가', say: '버드렉스가 레이스포스에 올라탔다!' },
  'urshifu-single-strike': { item: 'scroll-of-darkness', mon: 892, form: null, base: '우라오스', name: '일격의 우라오스', mul: 1.35, note: '일격의 태세, 화력 x1.35', say: '악의 족자를 읽었다! 우라오스는 일격의 태세를 갈고닦았다!' },
  'urshifu-rapid-strike': { item: 'scroll-of-waters', mon: 892, pmd: '/0001', base: '우라오스', name: '연격의 우라오스', mul: 1.1, rate: 0.75, types: ['fighting', 'water'], shotType: 'water', note: '연격의 태세, 물 타입·연사 크게 증가', say: '물의 족자를 읽었다! 우라오스는 연격의 태세가 되었다!' },
  'ogerpon-wellspring-mask': { item: 'wellspring-mask', mon: 1017, pmd: '/0005', base: '오거폰', name: '우물의 가면 오거폰', mul: 1.25, rate: 0.85, types: ['grass', 'water'], shotType: 'water', note: '우물의 가면, 물 타입·화력 x1.25·연사 증가', say: '오거폰이 우물의 가면을 썼다!' },
  'ogerpon-hearthflame-mask': { item: 'hearthflame-mask', mon: 1017, pmd: '/0006', base: '오거폰', name: '화덕의 가면 오거폰', mul: 1.4, types: ['grass', 'fire'], shotType: 'fire', note: '화덕의 가면, 불꽃 타입·화력 x1.4', say: '오거폰이 화덕의 가면을 썼다!' },
  'ogerpon-cornerstone-mask': { item: 'cornerstone-mask', mon: 1017, pmd: '/0007', base: '오거폰', name: '주춧돌의 가면 오거폰', mul: 1.2, hp: 6, types: ['grass', 'rock'], shotType: 'rock', note: '주춧돌의 가면, 바위 타입·화력 x1.2·최대 체력 +3칸', say: '오거폰이 주춧돌의 가면을 썼다!' },
  'terapagos-stellar': { item: 'tera-orb', mon: 1024, pmd: '/0002', base: '테라파고스', name: '스텔라 테라파고스', mul: 1.4, hp: 6, note: '스텔라폼, 화력 x1.4·최대 체력 +3칸', say: '테라스탈오브가 빛난다! 테라파고스는 스텔라폼이 되었다!' },
});
// 아르세우스: 플레이트마다 그 타입의 아르세우스 (내 타입이 바뀐다). PMD 폼 번호는 아래 순서
['bug', 'dark', 'dragon', 'electric', 'fighting', 'fire', 'flying', 'ghost', 'grass', 'ground', 'ice', 'poison', 'psychic', 'rock', 'steel', 'water', 'fairy'].forEach((t, i) => {
  if (PLATES[t]) LEGEND_FORMS[`arceus-${t}`] = { item: PLATES[t], mon: 493, pmd: `/${String(i + 1).padStart(4, '0')}`, base: '아르세우스', name: `${TYPE_KO[t]} 아르세우스`, mul: 1.2, type: t, note: '그 타입의 아르세우스로 바뀜, 화력 x1.2', say: `아르세우스는 ${TYPE_KO[t]} 타입이 되었다!` };
});
// 게노세크트: 카세트마다 공격 타입이 바뀐다
[['douse', 'water', '아쿠아'], ['shock', 'electric', '번개'], ['burn', 'fire', '블레이즈'], ['chill', 'ice', '프리즈']].forEach(([k, t, ko], i) => {
  LEGEND_FORMS[`genesect-${k}`] = { item: `${k}-drive`, mon: 649, pmd: `/${String(i + 1).padStart(4, '0')}`, base: '게노세크트', name: `${ko} 게노세크트`, mul: 1.2, shotType: t, note: `${TYPE_KO[t]} 타입 공격, 화력 x1.2`, say: `게노세크트에 ${ko}카세트를 꽂았다! 공격이 ${TYPE_KO[t]} 타입이 된다!` };
});
// 새 도구: 테오키스 운석 4종, 게노세크트 카세트 4종, 지가르데큐브. 다른 포켓몬이 얻으면 능력치가 조금 오른다 (테오키스는 폼 효과만)
const notDeoxys = fn => p => { if (p.mon.id !== 386) fn(p); };
ITEMS.push(
  { ...I('attack-meteorite', 'l', '어택운석', '공격 +0.8', notDeoxys(p => p.dmg += 0.8)), icon: 'meteorite' },
  { ...I('speed-meteorite', 'l', '스피드운석', '이동 속도 +0.3', notDeoxys(p => p.speed += 60)), icon: 'meteorite' },
  { ...I('balance-meteorite', 'l', '밸런스운석', '모든 능력치 조금 증가', notDeoxys(p => { p.dmg += 0.3; p.fireDelay *= 0.95; p.range *= 1.05; p.shotSpeed *= 1.05; p.speed += 10; p.crit += 0.02; })), icon: 'meteorite' },
  { ...I('defense-meteorite', 'l', '디펜스운석', '최대 체력 +1.5칸', notDeoxys(p => { p.maxHp += 3; p.hp += 3; })), icon: 'meteorite' },
  ...[['douse', '아쿠아카세트'], ['shock', '번개카세트'], ['burn', '블레이즈카세트'], ['chill', '프리즈카세트']].map(([k, ko]) => I(`${k}-drive`, 'l', ko, '탄속 x1.1, 공격 +0.3', p => { p.shotSpeed *= 1.1; p.dmg += 0.3; })),
  I('zygarde-cube', 'l', '지가르데큐브', '최대 체력 +1칸', p => { p.maxHp += 2; p.hp += 2; }),
  { ...I('n-solarizer', 'l', 'N솔라라이저', '공격 +0.6', p => p.dmg += 0.6), icon: 'sun-stone' },
  { ...I('n-lunarizer', 'l', 'N루나라이저', '연사 x1.1', p => p.fireDelay *= 0.9), icon: 'moon-stone' },
  { ...I('ultranecrozium-z', 'l', '울트라네크로Z', '공격 +0.5, 급소 +5%', p => { p.dmg += 0.5; p.crit += 0.05; }), icon: 'z-ring' },
  { ...I('ice-reins', 'l', '유대의고삐 백마', '최대 체력 +1칸, 공격 +0.3', p => { p.maxHp += 2; p.hp += 2; p.dmg += 0.3; }), icon: 'reins-of-unity' },
  { ...I('shadow-reins', 'l', '유대의고삐 흑마', '이동 속도 +0.15, 연사 x1.05', p => { p.speed += 30; p.fireDelay *= 0.95; }), icon: 'reins-of-unity' },
  I('scroll-of-darkness', 'l', '악의 족자', '급소 +10%', p => p.crit += 0.1),
  I('scroll-of-waters', 'l', '물의 족자', '연사 x1.1', p => p.fireDelay *= 0.9),
  I('wellspring-mask', 'l', '우물의가면', '연사 x1.08, 공격 +0.3', p => { p.fireDelay *= 0.92; p.dmg += 0.3; }),
  I('hearthflame-mask', 'l', '화덕의가면', '공격 +0.7', p => p.dmg += 0.7),
  I('cornerstone-mask', 'l', '주춧돌의가면', '최대 체력 +1칸, 공격 +0.2', p => { p.maxHp += 2; p.hp += 2; p.dmg += 0.2; }),
  I('tera-orb', 'l', '테라스탈오브', '공격 +0.5, 최대 체력 +1칸', p => { p.dmg += 0.5; p.maxHp += 2; p.hp += 2; }),
);
// 나머지 전설·환상 전용 도구 (2026-11-23). 그 포켓몬이 주우면 폼 효과처럼 늘 강해지고, 다른 포켓몬은 능력치가 조금 오른다
// [포켓몬 번호들, 도구 id, 이름(null이면 이미 있는 도구), 아이콘, 포켓몬 이름들, 전용 효과, 폼(PokeAPI 폼 이름·PMD 번호, 없으면 모습 그대로)]
// 일반 효과는 전용 효과에서 정한다: 체력이 있으면 최대 체력 +1칸, 연사면 연사 x1.06, 속도면 이동 속도 +0.15, 아니면 공격 +0.5
const LEGEND_SIGS = [
  [[144], 'sig-articuno', '얼음깃털', 'never-melt-ice', ['프리져'], { mul: 1.25, rate: 0.9 }],
  [[145], 'sig-zapdos', '번개깃털', 'magnet', ['썬더'], { mul: 1.25, spd: 1.1 }],
  [[146], 'sig-moltres', '불꽃깃털', 'charcoal', ['파이어'], { mul: 1.35 }],
  [[150], 'sig-mewtwo', '뮤츠의 갑옷', 'metal-coat', ['뮤츠'], { mul: 1.25, hp: 4 }],
  [[151], 'old-sea-map', '오래된해도', 'old-sea-map', ['뮤'], { mul: 1.2, rate: 0.85, spd: 1.1 }],
  [[243], 'sig-raikou', '천둥의 결정', 'thunder-stone', ['라이코'], { mul: 1.25, rate: 0.9 }],
  [[244], 'sig-entei', '화산의 결정', 'fire-stone', ['앤테이'], { mul: 1.35 }],
  [[245], 'clear-bell', '투명한방울', 'clear-bell', ['스이쿤'], { mul: 1.2, hp: 4 }],
  [[249], 'silver-wing', null, null, ['루기아'], { mul: 1.3, hp: 2 }],
  [[250], 'rainbow-wing', null, null, ['칠색조'], { mul: 1.35 }],
  [[251], 'sig-celebi', '시간의 뿌리', 'big-root', ['세레비'], { mul: 1.2, rate: 0.85 }],
  [[377], 'sig-regirock', '바위 점자석판', 'hard-stone', ['레지락'], { mul: 1.15, hp: 6 }],
  [[378], 'sig-regice', '얼음 점자석판', 'ice-stone', ['레지아이스'], { mul: 1.2, hp: 4, rate: 0.95 }],
  [[379], 'sig-registeel', '강철 점자석판', 'comet-shard', ['레지스틸'], { mul: 1.15, hp: 6 }],
  [[380, 381], 'soul-dew', null, null, ['라티아스', '라티오스'], { mul: 1.3 }],
  [[385], 'sig-jirachi', '소원의 별', 'star-piece', ['지라치'], { mul: 1.3 }],
  [[480, 481, 482], 'red-chain', '빨간쇠사슬', 'red-chain', ['유크시', '엠라이트', '아그놈'], { mul: 1.3 }],
  [[488], 'lunar-wing', '초승달날개', 'lunar-wing', ['크레세리아'], { mul: 1.2, hp: 4 }],
  [[490], 'sig-manaphy', '바다의 왕관', 'mystic-water', ['마나피'], { mul: 1.2, rate: 0.85 }],
  [[491], 'sig-darkrai', '악몽의 결정', 'dusk-stone', ['다크라이'], { mul: 1.35 }],
  [[494], 'liberty-pass', '리버티패스', 'liberty-pass', ['비크티니'], { mul: 1.3, spd: 1.1 }],
  [[643], 'light-stone', '라이트스톤', 'light-stone', ['레시라무'], { mul: 1.3, hp: 2 }],
  [[644], 'dark-stone', '다크스톤', 'dark-stone', ['제크로무'], { mul: 1.3, hp: 2 }],
  [[647], 'sig-keldeo', '신비의검 비전서', 'black-belt', ['케르디오'], { mul: 1.3 }, ['keldeo-resolute', '/0001', '케르디오 각오의 모습']],
  [[648], 'sig-meloetta', '고대의 노래 악보', 'gb-sounds', ['메로엣타'], { mul: 1.3, spd: 1.1, types: ['normal', 'fighting'], shotType: 'fighting' }, ['meloetta-pirouette', '/0001', '메로엣타 스텝폼']],
  [[716], 'sig-xerneas', '생명의 나뭇가지', 'dawn-stone', ['제르네아스'], { mul: 1.3, hp: 2 }, ['xerneas-active', '', '제르네아스 액티브모드']],
  [[717], 'sig-yveltal', '파괴의 고치', 'reaper-cloth', ['이벨타르'], { mul: 1.35 }],
  [[719], 'sig-diancie', '핑크 다이아', 'shiny-stone', ['디안시'], { mul: 1.2, hp: 4 }],
  [[721], 'sig-volcanion', '증기의 핵', 'magmarizer', ['볼케니온'], { mul: 1.3, shot: 1.15 }],
  [[785], 'electric-seed', '일렉트릭시드', 'electric-seed', ['카푸꼬꼬꼭'], { mul: 1.3, spd: 1.1 }],
  [[786], 'psychic-seed', '사이코시드', 'psychic-seed', ['카푸나비나'], { mul: 1.3, rate: 0.9 }],
  [[787], 'grassy-seed', '그래스시드', 'grassy-seed', ['카푸브루루'], { mul: 1.25, hp: 4 }],
  [[788], 'misty-seed', '미스트시드', 'misty-seed', ['카푸느지느'], { mul: 1.25, hp: 2, rate: 0.95 }],
  [[791], 'sun-flute', '해의피리', 'sun-flute', ['솔가레오'], { mul: 1.3, hp: 2 }],
  [[792], 'moon-flute', '달의피리', 'moon-flute', ['루나아라'], { mul: 1.25, rate: 0.9 }],
  [[801], 'sig-magearna', '소울하트', 'prism-scale', ['마기아나'], { mul: 1.3 }, ['magearna-original', '/0001', '마기아나 500년 전의 색']],
  [[802], 'sig-marshadow', '그림자 두건', 'spell-tag', ['마샤도'], { mul: 1.3, spd: 1.1 }],
  [[807], 'sig-zeraora', '뇌전의 발톱', 'electirizer', ['제라오라'], { mul: 1.25, rate: 0.85 }],
  [[893], 'sig-zarude', '정글의 덩굴', 'miracle-seed', ['자루도'], { mul: 1.3, hp: 2 }],
  [[1001], 'sig-wo-chien', '재앙의 목간', 'rare-bone', ['총지엔'], { mul: 1.25, hp: 4 }],
  [[1002], 'sig-chien-pao', '재앙의 검', 'dragon-scale', ['파오젠'], { mul: 1.35 }],
  [[1003], 'sig-ting-lu', '재앙의 그릇', 'odd-keystone', ['딩루'], { mul: 1.15, hp: 6 }],
  [[1004], 'sig-chi-yu', '재앙의 구슬', 'magma-stone', ['위유이'], { mul: 1.3, rate: 0.9 }],
  [[1007, 1008], 'booster-energy', '부스터에너지', 'booster-energy', ['코라이돈', '미라이돈'], { mul: 1.3, spd: 1.15 }],
];
for (const [mons, item, ko, icon, bases, st, form] of LEGEND_SIGS) {
  if (ko) {
    const [gd, ga] = st.hp ? ['최대 체력 +1칸', p => { p.maxHp += 2; p.hp += 2; }] : st.rate ? ['연사 x1.06', p => p.fireDelay *= 0.94] : st.spd ? ['이동 속도 +0.15', p => p.speed += 30] : ['공격 +0.5', p => p.dmg += 0.5];
    ITEMS.push({ ...I(item, 'l', ko, `${bases.join('·')}의 보물: ${gd}`, ga), icon });
  }
  const extra = [st.hp && `최대 체력 +${st.hp / 2}칸`, st.rate && '연사 증가', st.spd && '이동 속도 증가', st.shot && '탄속 증가', st.shotType && `${TYPE_KO[st.shotType]} 타입 공격`].filter(Boolean);
  const iname = ko ?? ITEMS.find(it => it.id === item)?.name;
  mons.forEach((mon, i) => {
    const base = bases[i] ?? bases[0], [key, pmd, fname] = form ?? [`sig-${mon}`, undefined, base];
    LEGEND_FORMS[key] = { item, mon, ...(form ? { pmd } : { form: null }), base, name: fname, ...st,
      note: `${form ? `${fname}(으)로 변신, ` : '전설의 힘이 깨어남, '}화력 x${st.mul}${extra.length ? '·' + extra.join('·') : ''}`,
      say: form ? `${base}은(는) ${iname}의 힘으로 ${fname}이(가) 되었다!` : `${base}은(는) ${iname}의 힘으로 전설의 힘이 깨어났다!` };
  });
}
const formsOf = itemId => Object.values(LEGEND_FORMS).filter(f => f.item === itemId);
const formFor = (itemId, monId) => Object.keys(LEGEND_FORMS).find(k => LEGEND_FORMS[k].item === itemId && LEGEND_FORMS[k].mon === monId) ?? null;
const curForm = () => LEGEND_FORMS[player?.legendForm];
const formStat = k => curForm()?.[k] ?? 1;
// 아르세우스는 플레이트로 타입이 바뀐다: 받는 피해 상성·테라피스에 쓰는 내 타입
const myTypes = () => player?.formType ? player.formType.split(',') : player?.mon.types ?? [];
// 폼이 바뀔 때 배우는 기술 [배우는 기술, 잊는 기술들]. 예: 우라오스는 악의 족자면 암흑강타, 물의 족자면 수류연타 (다른 쪽은 잊는다)
// 이미 아는 기술이면 그대로. 기술이 가득 차 있으면 하나를 잊을지 고르는 화면이 뜬다
const FORM_MOVES = {
  'urshifu-single-strike': ['wicked-blow', ['surging-strikes']], 'urshifu-rapid-strike': ['surging-strikes', ['wicked-blow']],
  'calyrex-ice': ['glacial-lance', ['astral-barrage']], 'calyrex-shadow': ['astral-barrage', ['glacial-lance']],
  'hoopa-unbound': ['hyperspace-fury', ['hyperspace-hole']], 'kyurem-black': ['freeze-shock', ['glaciate']],
  'necrozma-dusk': ['sunsteel-strike'], 'necrozma-dawn': ['moongeist-beam'], 'necrozma-ultra': ['light-that-burns-the-sky'],
  'zacian-crowned': ['behemoth-blade'], 'zamazenta-crowned': ['behemoth-bash'], 'keldeo-resolute': ['secret-sword'], 'meloetta-pirouette': ['relic-song'],
  'dialga-origin': ['roar-of-time'], 'palkia-origin': ['spacial-rend'], 'giratina-origin': ['shadow-force'], 'kyogre-primal': ['origin-pulse'], 'groudon-primal': ['precipice-blades'],
  'rayquaza-mega': ['dragon-ascent'], 'shaymin-sky': ['seed-flare'], 'terapagos-stellar': ['tera-starstorm'], 'eternatus-eternamax': ['eternabeam'], 'zygarde-complete': ['thousand-arrows'],
};
for (const [k, f] of Object.entries(LEGEND_FORMS)) {
  const fm = FORM_MOVES[k] ?? (f.mon === 386 ? ['psycho-boost'] : f.mon === 493 ? ['judgment'] : f.mon === 649 ? ['techno-blast'] : f.mon === 1017 ? ['ivy-cudgel'] : null);
  if (fm) { f.move = fm[0]; f.drop = fm[1] ?? []; }
}
// 네크로즈마: 황혼의 갈기·새벽의 날개(1단계) < 울트라네크로즈마(2단계). 같거나 낮은 단계의 도구를 더 먹으면 모습은 그대로 두고 그 기술만 배운다
// (예전에는 울트라네크로즈마가 된 뒤 솔라라이저를 먹으면 황혼의 갈기로 되돌아가 화력 x1.5가 풀렸다)
Object.assign(LEGEND_FORMS['necrozma-dusk'], { rank: 1 }); Object.assign(LEGEND_FORMS['necrozma-dawn'], { rank: 1 }); Object.assign(LEGEND_FORMS['necrozma-ultra'], { rank: 2 });
// 도구 설명에 전용 효과를 덧붙인다 (같은 도구를 여러 포켓몬이 쓰면 한 줄로)
for (const it of ITEMS) {
  const fs = formsOf(it.id);
  if (!fs.length) continue;
  const f = fs[0], bases = [...new Set(fs.map(f => f.base))].join('·');
  const mv = f.move && LTMS.find(t => t.id === f.move);
  it.desc += ` · ${bases} 전용: ${f.note ?? `${f.name}(으)로 변신, 화력 x${f.mega ? +(f.mul * 1.5).toFixed(2) : f.mul}`}${mv && fs.length === 1 ? `, ${mv.name} 습득` : ''}`;
}
// 도구를 주운 뒤 부른다 (update.js)
// 폼의 기술: 잊을 기술을 먼저 잊고, 새 기술을 배운다 (가득 차 있으면 고르는 화면)
function formMove(f, drop) {
  const p = player;
  if (drop) for (const id of f.drop ?? []) {
    if (!p.moves.has(id) || id === f.move) continue;
    withDelta(() => { p.moves.delete(id); p.items = p.items.filter(it => it.id !== id); if (p.zMove === id) p.zMove = f.move; refreshFx(); });
    say(`${moveDef(id).name}을(를) 잊었다`, p.x, p.y - 130, '#ccc');
  }
  if (!f.move || p.moves.has(f.move)) return;
  if (p.moves.size < MAX_MOVES) { learnMove(f.move); say(`${moveDef(f.move).name}을(를) 배웠다!`, p.x, p.y - 110, '#fd6'); }
  else { learnTm = { kind: 'tm', tm: moveDef(f.move), x: p.x, y: p.y }; state = 'learn'; }
}
function checkLegendForm(itemId) {
  const p = player, key = formFor(itemId, p.mon.id), f = LEGEND_FORMS[key];
  if (!f || p.legendForm === key) return;
  const cur = curForm();
  if (cur && f.rank && cur.mon === f.mon && (cur.rank ?? 0) >= f.rank) {
    formMove(f, false);
    banner = { text: `${cur.name}의 모습은 그대로! ${f.move ? `${moveDef(f.move).name}의 힘만 받아들였다` : ''}`, t: 3.5, glow: '#ffd060' };
    return;
  }
  withDelta(() => {
    p.legendForm = key; if (f.mega) p.mega = true; if (f.hp) { p.maxHp += f.hp; p.hp += f.hp; }
    p.formType = f.types?.join(',') ?? f.type ?? null; p.type = f.type ?? f.shotType ?? p.mon.types[0];
  });
  gimmickFx('mega'); gimmickFx('legendForm'); sfx('evolve'); shake = 0.6;
  banner = { text: f.say, t: 4, glow: '#ffd060' };
  formMove(f, true);
  loadFormArt();
}
// 모습이 그대로인 전용 도구(form: null)는 메가진화했으면 메가 이름을 그대로 쓴다
const formName = p => { const f = LEGEND_FORMS[p.legendForm]; return f && !(f.form === null && p.mega && !f.mega) ? f.name : `${p.mega ? '메가' : ''}${p.mon.name}`; };
// 바뀐 모습 그림: 배틀 그림은 PokeAPI 폼, 필드 그림은 PMD 폼 (없으면 원래 그림)
async function loadFormArt() {
  const p = player, key = p.legendForm, f = LEGEND_FORMS[key], m = p.mon;
  if (!f) return;
  if (f.form === null) { if (p.mega && !f.mega) loadMegaArt(); else p.megaArt = undefined; return; }
  const [j, field] = await Promise.all([getJson(`${API}/pokemon-form/${key}`).catch(() => null), loadField(m.id, f.pmd ?? '/0001')]);
  const src = p.shiny ? j?.sprites?.front_shiny ?? j?.sprites?.front_default : j?.sprites?.front_default;
  const img = src ? await loadImg(src).catch(() => null) : null;
  if (player === p && p.legendForm === key) p.megaArt = { img: img ?? m.img, box: img ? spriteBox(img) : m.box, field: field ?? m.field };
}

// ---------- Z기술 ----------
function startZ() {
  const p = player, ms = [...p.moves];
  p.zPending = true;
  if (ms.length === 1) return setZ(ms[0]);
  if (ms.length) state = 'zpick';
}
function setZ(id) {
  const p = player;
  withDelta(() => { p.zMove = id; p.zPending = false; });
  state = 'play';
  gimmickFx('zburst'); sfx('rare');
  banner = { text: `Z파워가 ${moveDef(id).name}에 깃들었다!`, t: 3, glow: '#ffe060' };
}

// ---------- 테라스탈 ----------
function tera(p, t) {
  p.teraType = t;
  if (myTypes().includes(t) && !p.teraSame) p.teraSame = true; else p.dmg += 0.8;
  gimmickFx('tera');
  say(`${TYPE_KO[t]} 테라스탈!`, p.x, p.y - 100, TYPE_COLOR[t]);
}

// ---------- 그리기 ----------
// 다이맥스: 몸 뒤 붉은 기운 (drawActor가 그림 전에 부른다)
function drawGimmickBack(a, scale) {
  if (!a.dmax) return;
  const pul = 0.35 + Math.abs(Math.sin(now * 3)) * 0.2, g = ctx.createRadialGradient(a.x, a.y - 30 * scale, 4, a.x, a.y - 30 * scale, 60 * scale);
  g.addColorStop(0, `rgba(255,40,90,${pul})`); g.addColorStop(1, 'rgba(255,40,90,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(a.x, a.y - 30 * scale, 60 * scale, 66 * scale, 0, 0, Math.PI * 2); ctx.fill();
}
// 메가 무지개 고리, Z 금빛 입자, 다이맥스 붉은 구름, 테라스탈 왕관
function drawGimmick(a, top, w) {
  if (a.mega) {
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) { ctx.strokeStyle = `hsl(${(now * 120 + i * 60) % 360},100%,65%)`; ctx.beginPath(); ctx.ellipse(a.x, a.y, 26, 11, 0, now * 2 + i * Math.PI / 3, now * 2 + i * Math.PI / 3 + 0.9); ctx.stroke(); }
  }
  if (zActive() && a === player) {
    ctx.fillStyle = '#ffe060';
    for (let i = 0; i < 4; i++) { const t = now * 2.5 + i * Math.PI / 2, y = top + 8 + ((now * 30 + i * 17) % (a.y - top)); ctx.globalAlpha = 0.8; ctx.fillRect(Math.round(a.x + Math.cos(t) * (w / 2 + 8)), Math.round(y), 3, 3); }
    ctx.globalAlpha = 1;
  }
  if (a.dmax) {
    ctx.fillStyle = 'rgba(255,60,110,.75)';
    for (let i = 0; i < 3; i++) { const x = a.x + (i - 1) * 16 + Math.sin(now * 2 + i) * 3; ctx.beginPath(); ctx.arc(x, top - 6 + Math.sin(now * 3 + i) * 2, 8, 0, Math.PI * 2); ctx.fill(); }
  }
  if (a.teraType) {
    const c = TYPE_COLOR[a.teraType], cx = a.x, cy = top - (a.dmax ? 22 : 10) + Math.sin(now * 2) * 2;
    // 보석 왕관: 가운데 큰 결정 + 양옆 작은 결정
    const gem = (x, y, s) => {
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y - s * 1.6); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s * 0.6); ctx.lineTo(x - s, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.moveTo(x, y - s * 1.6); ctx.lineTo(x + s * 0.35, y - s * 0.2); ctx.lineTo(x - s * 0.2, y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = mix(c, '#000000', 0.45); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y - s * 1.6); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s * 0.6); ctx.lineTo(x - s, y); ctx.closePath(); ctx.stroke();
    };
    gem(cx - 13, cy + 2, 5); gem(cx + 13, cy + 2, 5); gem(cx, cy, 8);
    if (Math.sin(now * 5) > 0.9) { ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(cx + 3), Math.round(cy - 10), 2, 2); }
  }
}
// 발동 순간 이펙트
function drawGimmickFx(f, k) {
  if (f.kind === 'legendForm') {
    // 금빛 기둥과 퍼지는 고리
    ctx.globalAlpha = (1 - k) * 0.8; ctx.fillStyle = '#ffd060'; ctx.fillRect(f.x - 26 * (1 - k) - 4, f.y - 700, 52 * (1 - k) + 8, 700);
    ctx.strokeStyle = '#fff3b0'; ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(f.x, f.y, 30 + k * 200 + i * 24, (30 + k * 200 + i * 24) * 0.45, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  if (f.kind === 'mega') {
    for (let i = 0; i < 4; i++) { ctx.strokeStyle = `hsla(${(now * 360 + i * 90) % 360},100%,70%,${1 - k})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(f.x, f.y - 30, 18 + k * 150 + i * 14, 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = (1 - k) * 0.7; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f.x, f.y - 30, 40 * (1 - k), 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  }
  if (f.kind === 'zburst') {
    ctx.save(); ctx.translate(f.x, f.y - 30); ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = '#ffe060'; ctx.lineWidth = 4;
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 20 * (1 + k * 3), Math.sin(a) * 20 * (1 + k * 3)); ctx.lineTo(Math.cos(a) * 50 * (1 + k * 3), Math.sin(a) * 50 * (1 + k * 3)); ctx.stroke(); }
    ctx.restore(); text('Z', f.x, f.y - 60 - k * 30, 40 + k * 30, `rgba(255,224,96,${1 - k})`);
  }
  if (f.kind === 'dmax') {
    ctx.globalAlpha = 1 - k; ctx.fillStyle = '#ff3c6e'; ctx.fillRect(f.x - 30 - k * 20, f.y - 600, 60 + k * 40, 600);
    ctx.strokeStyle = '#ff9ab8'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(f.x, f.y, 40 + k * 160, (40 + k * 160) * 0.5, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  }
  if (f.kind === 'tera') {
    ctx.globalAlpha = 1 - k; ctx.fillStyle = f.color ?? '#fff';
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2 + now, r = 20 + k * 130, x = f.x + Math.cos(a) * r, y = f.y - 30 + Math.sin(a) * r * 0.7;
      ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 5); ctx.lineTo(x - 6, y); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// Z기술을 깃들일 기술 고르기
function drawZPick() {
  const p = player, x = SIDE + 120, w = 480, rows = [...p.moves].map(moveDef), h = 110 + rows.length * 30, y = HUD + Math.max(10, (H - h) / 2);
  ctx.fillStyle = 'rgba(0,0,0,.9)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#ffe060'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
  glowText('Z크리스탈이 빛난다!', x + w / 2, y + 32, 16, '#ffe060', '#fa0');
  text('Z파워를 깃들일 기술을 고르세요 (그 타입 피해 x1.5, 범위 x1.3)', x + w / 2, y + 56, 11, '#ccc');
  rows.forEach((m, i) => {
    const yy = y + 88 + i * 30;
    taps.push({ x, y: yy - 18, w, h: 28, fn: () => setZ(m.id) });
    text(`${i + 1}.`, x + 24, yy, 13, '#fff', 'left'); nameText(m, m.name, x + 50, yy, 13, m.legend ? '#fd6' : TYPE_COLOR[m.type]); text(TYPE_KO[m.type], x + w - 24, yy, 11, '#aaa', 'right');
  });
}
