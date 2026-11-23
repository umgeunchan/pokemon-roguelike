// 기술·도구 데이터: 타입, 도구, 상점, 기술머신, 숨은 조합, 전설 기술
// 보스/트레이너 포켓몬이 쓰는 기술: [패턴, 기술 이름]. 패턴 동작은 updateAct에 있다
const TYPE_MOVES = {
  normal: [['charge', '몸통박치기'], ['jump', '누르기'], ['radial', '하이퍼보이스']],
  fire: [['beam', '화염방사'], ['radial', '불꽃세례'], ['charge', '니트로차지']],
  water: [['beam', '하이드로펌프'], ['fan', '물대포'], ['radial', '파도타기']],
  electric: [['strike', '번개'], ['charge', '볼트태클'], ['spiral', '방전']],
  grass: [['fan', '잎날가르기'], ['strike', '씨폭탄'], ['jump', '우드해머']],
  ice: [['fan', '눈보라'], ['radial', '얼다바람'], ['strike', '고드름떨구기']],
  fighting: [['charge', '인파이트'], ['jump', '무릎차기'], ['fan', '파동탄']],
  poison: [['strike', '오물폭탄'], ['fan', '독침'], ['charge', '독찌르기']],
  ground: [['quake', '지진'], ['jump', '땅고르기'], ['charge', '구멍파기']],
  flying: [['jump', '공중날기'], ['charge', '브레이브버드'], ['fan', '에어슬래시']],
  psychic: [['teleport', '순간이동'], ['spiral', '사이코키네시스'], ['radial', '미래예지']],
  bug: [['fan', '바늘미사일'], ['charge', '메가혼'], ['spiral', '실뿜기']],
  rock: [['strike', '스톤에지'], ['jump', '바위깨기'], ['charge', '구르기']],
  ghost: [['teleport', '섀도다이브'], ['spiral', '섀도볼'], ['fan', '나이트헤드']],
  dragon: [['charge', '역린'], ['beam', '용의파동'], ['radial', '용성군']],
  dark: [['teleport', '기습'], ['fan', '악의파동'], ['charge', '깨물어부수기']],
  steel: [['spiral', '러스터캐논'], ['charge', '아이언헤드'], ['jump', '헤비봄버']],
  fairy: [['spiral', '문포스'], ['fan', '매지컬샤인'], ['teleport', '치근거리기']],
};
const TYPE_KO = { normal: '노말', fire: '불꽃', water: '물', electric: '전기', grass: '풀', ice: '얼음', fighting: '격투', poison: '독', ground: '땅', flying: '비행', psychic: '에스퍼', bug: '벌레', rock: '바위', ghost: '고스트', dragon: '드래곤', dark: '악', steel: '강철', fairy: '페어리' };
const TYPE_COLOR = { normal: '#a8a878', fire: '#f08030', water: '#6890f0', electric: '#f8d030', grass: '#78c850', ice: '#98d8d8', fighting: '#c03028', poison: '#a040a0', ground: '#e0c068', flying: '#a890f0', psychic: '#f85888', bug: '#a8b820', rock: '#b8a038', ghost: '#705898', dragon: '#7038f8', dark: '#705848', steel: '#b8b8d0', fairy: '#ee99ac' };
const TYPE_BOOST = { normal: 'silk-scarf', fire: 'charcoal', water: 'mystic-water', electric: 'magnet', grass: 'miracle-seed', ice: 'never-melt-ice', fighting: 'black-belt', poison: 'poison-barb', ground: 'soft-sand', flying: 'sharp-beak', psychic: 'twisted-spoon', bug: 'silver-powder', rock: 'hard-stone', ghost: 'spell-tag', dragon: 'dragon-fang', dark: 'black-glasses', steel: 'metal-coat', fairy: 'fairy-feather' };
const PLATES = { fire: 'flame-plate', water: 'splash-plate', electric: 'zap-plate', grass: 'meadow-plate', ice: 'icicle-plate', fighting: 'fist-plate', poison: 'toxic-plate', ground: 'earth-plate', flying: 'sky-plate', psychic: 'mind-plate', bug: 'insect-plate', rock: 'stone-plate', ghost: 'spooky-plate', dragon: 'draco-plate', dark: 'dread-plate', steel: 'iron-plate', fairy: 'pixie-plate' };
// 아이템 등급: c 흔함 / r 희귀 / l 전설 관련 / k 중요한 물건. 이름은 시작할 때 PokeAPI의 한국어 이름으로 바뀐다
const I = (id, r, name, desc, apply) => ({ id, r, name, desc, apply });
const ITEMS = [
  ...Object.entries(TYPE_BOOST).map(([t, id]) => I(id, 'c', `${TYPE_KO[t]} 강화 도구`, `공격 +0.25 (${TYPE_KO[t]} 타입이면 +0.8)`, p => p.dmg += p.type === t ? 0.8 : 0.25)),
  I('muscle-band', 'c', '힘의머리띠', '공격 +0.5', p => p.dmg += 0.5),
  I('wise-glasses', 'c', '박식안경', '공격 +0.3, 사거리 증가', p => { p.dmg += 0.3; p.range *= 1.15; }),
  I('quick-claw', 'c', '선제공격손톱', '연사 속도 증가', p => p.fireDelay *= 0.85),
  I('wide-lens', 'c', '광각렌즈', '사거리 증가', p => p.range *= 1.3),
  I('zoom-lens', 'c', '포커스렌즈', '탄속, 사거리 증가', p => { p.shotSpeed *= 1.2; p.range *= 1.1; }),
  I('scope-lens', 'c', '초점렌즈', '급소 확률 +12%', p => p.crit += 0.12),
  I('razor-claw', 'c', '예리한손톱', '급소 확률 +10%', p => p.crit += 0.1),
  I('bright-powder', 'c', '반짝가루', '10% 확률로 공격을 피한다', p => p.dodge += 0.1),
  I('shell-bell', 'c', '조개껍질방울', '적을 쓰러뜨리면 가끔 회복', p => p.shellBell = true),
  I('iron', 'c', '사포닌', '맞은 뒤 무적 시간 증가', p => p.invTime += 0.2),
  I('zinc', 'c', '브롬헥신', '회피 +5%', p => p.dodge += 0.05),
  I('pp-up', 'c', '포인트업', '연사 속도 소폭 증가', p => p.fireDelay *= 0.93),
  I('choice-specs', 'r', '구애안경', '공격 x1.4, 연사 감소', p => { p.dmg *= 1.4; p.fireDelay *= 1.25; }),
  I('choice-band', 'r', '구애머리띠', '공격 x1.3, 이동 속도 감소', p => { p.dmg *= 1.3; p.speed *= 0.92; }),
  I('choice-scarf', 'r', '구애스카프', '이동 속도 크게 증가', p => p.speed *= 1.2),
  I('leftovers', 'r', '먹다남은음식', '최대 체력 +1칸, 천천히 회복', p => { p.maxHp += 2; p.hp += 2; p.regen = true; }),
  I('life-orb', 'r', '생명의구슬', '공격 x1.3, 최대 체력 -1칸', p => { p.dmg *= 1.3; p.maxHp = Math.max(2, p.maxHp - 2); p.hp = Math.min(p.hp, p.maxHp); }),
  I('focus-sash', 'r', '기합의띠', '쓰러질 공격을 한 번 버틴다', p => p.sash = true),
  I('expert-belt', 'r', '달인의띠', '효과가 굉장한 공격 x1.3', p => p.expert = true),
  I('kings-rock', 'r', '왕의징표석', '10% 확률로 적이 풀죽어 멈춘다', p => p.kingsRock = true),
  I('big-root', 'r', '큰뿌리', '적을 쓰러뜨리면 10% 확률로 회복', p => p.bigRoot = true),
  I('eviolite', 'r', '진화의휘석', '최대 체력 +2칸', p => { p.maxHp += 4; p.hp += 4; }),
  I('metronome', 'r', '메트로놈', '맞지 않고 연속 적중할수록 공격 증가', p => p.metronome = true),
  I('light-ball', 'r', '전기구슬', '피카츄면 공격 x2, 아니면 공격 +0.3', p => p.mon.id === 25 ? p.dmg *= 2 : p.dmg += 0.3),
  I('air-balloon', 'r', '풍선', '떠올라서 장애물을 넘는다 (맞으면 터짐)', p => { if (!p.heavy) p.flying = p.balloon = true; }),
  I('iron-ball', 'r', '검은철구', '공격 +1, 이동 속도 감소, 뜰 수 없음', p => { p.dmg += 1; p.speed *= 0.85; p.heavy = true; p.flying = p.balloon = false; }),
  I('lagging-tail', 'r', '느림보꼬리', '적의 탄이 느려진다', p => p.lagTail = true),
  I('assault-vest', 'r', '돌격조끼', '최대 체력 +2칸, 이동 속도 소폭 감소', p => { p.maxHp += 4; p.hp += 4; p.speed *= 0.95; }),
  I('rocky-helmet', 'r', '울퉁불퉁멧', '몸으로 부딪힌 적에게 큰 피해', p => p.rockyHelmet = true),
  I('weakness-policy', 'r', '약점보험', '효과가 굉장한 공격을 맞으면 공격 +0.6 (1회)', p => p.weaknessPolicy = true),
  ...Object.entries(PLATES).map(([t, id]) => I(id, 'l', `${TYPE_KO[t]} 플레이트`, `아르세우스의 플레이트: 공격 +0.4 (${TYPE_KO[t]} 타입이면 +1.2)`, p => p.dmg += p.type === t ? 1.2 : 0.4)),
  I('adamant-orb', 'l', '금강옥', '디아루가의 보주: 공격 +1, 연사 증가', p => { p.dmg += 1; p.fireDelay *= 0.9; }),
  I('lustrous-orb', 'l', '백옥', '펄기아의 보주: 최대 체력 +1칸, 공격 +0.6', p => { p.maxHp += 2; p.hp += 2; p.dmg += 0.6; }),
  I('griseous-orb', 'l', '백금옥', '기라티나의 보주: 공격이 장애물을 통과, 공격 +0.5', p => { p.ghostShot = true; p.dmg += 0.5; }),
  I('red-orb', 'l', '빨강구슬', '그란돈의 구슬: 공격 x1.3', p => p.dmg *= 1.3),
  I('blue-orb', 'l', '쪽빛구슬', '가이오가의 구슬: 최대 체력 +2칸, 완전 회복', p => { p.maxHp += 4; p.hp = p.maxHp; }),
  I('jade-orb', 'l', '비취구슬', '레쿠쟈의 구슬: 탄속 증가, 공격 +0.5', p => { p.shotSpeed *= 1.3; p.dmg += 0.5; }),
  I('soul-dew', 'l', '마음의물방울', '라티아스·라티오스의 보물: 공격 +0.8, 사거리 증가', p => { p.dmg += 0.8; p.range *= 1.2; }),
  I('rainbow-wing', 'l', '무지개깃털', '칠색조의 깃털: 쓰러지면 한 번 부활', p => p.revive = true),
  I('silver-wing', 'l', '은빛날개', '루기아의 깃털: 회피 +15%', p => p.dodge += 0.15),
  I('rusted-sword', 'l', '녹슨 검', '자시안의 검: 공격 x1.4', p => p.dmg *= 1.4),
  I('rusted-shield', 'l', '녹슨 방패', '자마젠타의 방패: 최대 체력 +1칸, 무적 시간 증가', p => { p.maxHp += 2; p.hp += 2; p.invTime += 0.4; }),
  I('gracidea', 'l', '그라시데아꽃', '쉐이미의 꽃: 이동 속도 증가, 완전 회복', p => { p.speed *= 1.15; p.hp = p.maxHp; }),
  I('prison-bottle', 'l', '굴레의항아리', '후파의 항아리: 연사 x1.4', p => p.fireDelay *= 0.72),
  I('reveal-glass', 'l', '비추는거울', '급소 +20%, 사거리 증가', p => { p.crit += 0.2; p.range *= 1.2; }),
  I('dna-splicers', 'l', '유전자쐐기', '큐레무의 쐐기: 어떤 공격이든 뒤로도 한 번 더 (탄·레이저·광선·원뿔·알), 매지컬샤인의 빛이 매 공격마다', p => p.backShot = true),
  I('bicycle', 'k', '자전거', '이동 속도 x1.35', p => p.speed *= 1.35),
  I('amulet-coin', 'k', '부적금화', '얻는 돈 x2', p => p.moneyMul *= 2),
  I('lucky-egg', 'k', '행복의알', '얻는 경험치 x1.5', p => p.expMul *= 1.5),
  I('exp-share', 'k', '학습장치', '얻는 경험치 x1.3', p => p.expMul *= 1.3),
  I('town-map', 'k', '타운맵', '지도 전체가 보인다 (M 키)', p => p.townMap = true),
  I('dowsing-machine', 'k', '다우징머신', '가까운 몬스터볼 방향을 알려준다', p => p.dowsing = true),
];
const KEY_ITEMS = ['bicycle', 'town-map', 'amulet-coin', 'lucky-egg', 'exp-share', 'dowsing-machine'];
// 상점: 소모품과 반복 구매 가능한 도핑약 (살 때마다 값이 오른다)
const SHOP = [
  { id: 'potion', name: '상처약', price: 300, desc: '체력 1칸 회복', use: () => heal(2) },
  { id: 'super-potion', name: '좋은상처약', price: 700, desc: '체력 2칸 회복', use: () => heal(4) },
  { id: 'hyper-potion', name: '고급상처약', price: 1500, desc: '체력 완전 회복', use: () => heal(99) },
  { id: 'rare-candy', name: '이상한사탕', price: 3000, desc: '레벨 +1', use: () => levelUp(), grow: true },
  { id: 'protein', name: '타우린', price: 2500, desc: '공격 +0.25', use: () => withDelta(p => p.dmg += 0.25), grow: true },
  { id: 'calcium', name: '리보플라빈', price: 2500, desc: '연사 소폭 증가', use: () => withDelta(p => p.fireDelay *= 0.95), grow: true },
  { id: 'carbos', name: '알칼로이드', price: 2500, desc: '이동 속도 소폭 증가', use: () => withDelta(p => p.speed *= 1.05), grow: true },
  { id: 'hp-up', name: '맥스업', price: 3500, desc: '최대 체력 +반 칸', use: () => withDelta(p => { p.maxHp += 1; p.hp += 1; }), grow: true },
];
// 기술머신은 공격을 직접 정의하지 않고 수식어로 붙는다. 그래서 어떤 조합이든 자동으로 섞인다. 최대 4개
const TMS = [
  // 광선: 누르고 있다가 떼면 나가는 충전형. 여러 개면 가장 최근에 배운 광선의 타입으로 나가고 효과는 모두 얹힌다
  { id: 'flamethrower', tm: 'tm-fire', name: '화염방사', type: 'fire', desc: '광선 · 화상' },
  { id: 'hyper-beam', tm: 'tm-normal', name: '파괴광선', type: 'normal', desc: '광선 · 긴 차징, 굵고 강함' },
  { id: 'egg-bomb', tm: 'tm-normal', name: '알폭탄', type: 'normal', desc: '알폭탄 · 던지면 폭발' },
  // 레이저: 아이작의 테크놀로지처럼 가늘고 긴 선을 연사한다. 닿는 적을 모두 꿰뚫는다
  { id: 'thunderbolt', tm: 'tm-electric', name: '10만볼트', type: 'electric', desc: '레이저 · 꿰뚫는 전기' },
  { id: 'thunder-wave', tm: 'tm-electric', name: '전기자석파', type: 'electric', desc: '강화 · 옆 적에게 전기, 마비' },
  { id: 'pin-missile', tm: 'tm-bug', name: '바늘미사일', type: 'bug', desc: '강화 · 3갈래' },
  { id: 'swift', tm: 'tm-normal', name: '스피드스타', type: 'normal', desc: '강화 · 모든 공격 유도' },
  // 구슬: 아주 큰 탄이 맞으면 터진다. 구슬 + 다른 기술이 있으면 모든 효과가 커지고 세진다
  { id: 'shadow-ball', tm: 'tm-ghost', name: '섀도볼', type: 'ghost', desc: '구슬 · 벽 통과, 폭발' },
  // 원뿔: 탄 대신 앞쪽 부채꼴 범위를 한 번에 친다
  { id: 'icy-wind', tm: 'tm-ice', name: '얼다바람', type: 'ice', desc: '원뿔 · 느려짐' },
  { id: 'will-o-wisp', tm: 'tm-fire', name: '도깨비불', type: 'fire', desc: '강화 · 모든 공격에 화상' },
  { id: 'razor-leaf', tm: 'tm-grass', name: '잎날가르기', type: 'grass', desc: '강화 · 2갈래' },
  { id: 'bullet-seed', tm: 'tm-grass', name: '씨기관총', type: 'grass', desc: '강화 · 연사 2배, 약한 탄' },
  { id: 'earthquake', tm: 'tm-ground', name: '지진', type: 'ground', desc: '원뿔 · 땅 위 적에게 강함' },
  { id: 'surf', tm: 'tm-water', name: '파도타기', type: 'water', desc: '원뿔 · 넓게 밀어냄' },
  { id: 'sludge-bomb', tm: 'tm-poison', name: '오물폭탄', type: 'poison', desc: '강화 · 모든 공격에 독' },
  { id: 'psychic', tm: 'tm-psychic', name: '사이코키네시스', type: 'psychic', desc: '강화 · 공격이 되돌아옴' },
  { id: 'dragon-pulse', tm: 'tm-dragon', name: '용의파동', type: 'dragon', desc: '광선 · 가끔 폭발' },
  { id: 'dazzling-gleam', tm: 'tm-fairy', name: '매지컬샤인', type: 'fairy', desc: '원뿔 · 4번째 공격마다 사방' },
  { id: 'rock-slide', tm: 'tm-rock', name: '스톤샤워', type: 'rock', desc: '원뿔 · 바위 낙하' },
  { id: 'crunch', tm: 'tm-dark', name: '깨물어부수기', type: 'dark', desc: '강화 · 급소 강화' },
  { id: 'flash-cannon', tm: 'tm-steel', name: '러스터캐논', type: 'steel', desc: '구슬 · 폭발, 위력 증가' },
  { id: 'ice-beam', tm: 'tm-ice', name: '냉동빔', type: 'ice', desc: '레이저 · 꿰뚫는 얼음, 얼림' },
  { id: 'stone-edge', tm: 'tm-rock', name: '스톤에지', type: 'rock', desc: '강화 · 급소 시 바위 칼날' },
  { id: 'dark-pulse', tm: 'tm-dark', name: '악의파동', type: 'dark', desc: '강화 · 풀죽음' },
  { id: 'focus-blast', tm: 'tm-fighting', name: '기합구슬', type: 'fighting', desc: '구슬 · 강한 폭발, 느린 연사' },
  { id: 'dragon-claw', tm: 'tm-dragon', name: '드래곤크루', type: 'dragon', desc: '강화 · 위력 증가, 할퀴기' },
  { id: 'moonblast', tm: 'tm-fairy', name: '문포스', type: 'fairy', desc: '구슬 · 보스에게 강함' },
  { id: 'x-scissor', tm: 'tm-bug', name: '시저크로스', type: 'bug', desc: '강화 · 꿰뚫을수록 강해짐' },
  { id: 'hydro-pump', tm: 'tm-water', name: '하이드로펌프', type: 'water', desc: '광선 · 밀어내기' },
  { id: 'blizzard', tm: 'tm-ice', name: '눈보라', type: 'ice', desc: '원뿔 · 얼림' },
  { id: 'thunder', tm: 'tm-electric', name: '번개', type: 'electric', desc: '광선 · 벼락' },
  { id: 'energy-ball', tm: 'tm-grass', name: '에너지볼', type: 'grass', desc: '구슬 · 넓은 폭발' },
  { id: 'bug-buzz', tm: 'tm-bug', name: '벌레의야단법석', type: 'bug', desc: '원뿔 · 긴 음파, 밀어냄' },
  { id: 'air-slash', tm: 'tm-flying', name: '에어슬래시', type: 'flying', desc: '강화 · 빠른 칼날, 풀죽음' },
  { id: 'close-combat', tm: 'tm-fighting', name: '인파이트', type: 'fighting', desc: '강화 · 위력 증가, 가까울수록 강함 (바로 앞 x3)' },
  { id: 'play-rough', tm: 'tm-fairy', name: '치근거리기', type: 'fairy', desc: '강화 · 위력 증가, 근접 강화' },
  { id: 'earth-power', tm: 'tm-ground', name: '대지의힘', type: 'ground', desc: '원뿔 · 땅 솟음, 보스에게 강함' },
];
// 기술 분류. 공격 방식 우선순위: 알폭탄 > 광선 > 레이저 > 원뿔 > 보통 탄. 공격 방식이 되지 못한 기술도 적중 효과는 그대로 얹힌다
const BEAMS = ['flamethrower', 'hyper-beam', 'dragon-pulse', 'hydro-pump', 'thunder'];
const LASERS = ['thunderbolt', 'ice-beam'];
const CONES = ['icy-wind', 'earthquake', 'surf', 'dazzling-gleam', 'rock-slide', 'blizzard', 'bug-buzz', 'earth-power'];
const ORBS = ['flash-cannon', 'shadow-ball', 'focus-blast', 'moonblast', 'energy-ball'];
// 숨은 조합: 두 기술을 함께 기억하면 추가 효과가 조용히 켜진다 (화면에 알리지 않는다. 직접 찾아내는 재미)
// color: 조합이 켜지면 공격(탄·광선·알)이 이 색으로 바뀐다. 알림은 없지만 색으로 눈치챌 수 있다
const COMBOS = [
  { id: 'scorch', name: '작열', need: ['will-o-wisp', 'flamethrower'], desc: '화상·독에 걸린 적에게 피해 x1.4', color: '#ff5a1f' },
  { id: 'storm', name: '뇌우', need: ['thunder-wave', 'surf'], desc: '튀는 전기가 더 멀리, 피해 x2', color: '#7fd8ff' },
  { id: 'zero', name: '영구동토', need: ['icy-wind', 'ice-beam'], desc: '느려진 적은 30% 확률로 얼어붙는다', color: '#d8f8ff' },
  { id: 'toxic', name: '맹독', need: ['sludge-bomb', 'will-o-wisp'], desc: '독·화상 지속 피해 x2', color: '#b040e0' },
  { id: 'quake', name: '대지붕괴', need: ['earthquake', 'rock-slide'], desc: '관장·전설에게 피해 x1.35', color: '#a0703a' },
  { id: 'fang', name: '그림자 송곳니', need: ['shadow-ball', 'crunch'], desc: '급소 시 15% 확률로 체력 회복', color: '#5a3a8a' },
  { id: 'dragon', name: '용의 춤', need: ['dragon-claw', 'dragon-pulse'], desc: '모든 공격 위력 x1.25', color: '#8050ff' },
  { id: 'vine', name: '흡수 덩굴', need: ['razor-leaf', 'energy-ball'], desc: '피해를 줄수록 체력 회복', color: '#60e070' },
  { id: 'mind', name: '정신 붕괴', need: ['psychic', 'dark-pulse'], desc: '풀죽은 적에게 피해 x1.5', color: '#e050a0' },
  { id: 'fortress', name: '강철 요새', need: ['flash-cannon', 'rock-slide'], desc: '받는 공격을 20% 확률로 막아낸다', color: '#c8d0e0' },
  { id: 'gale', name: '질풍', need: ['swift', 'air-slash'], desc: '연사 x1.25', color: '#c0e8ff' },
  { id: 'steam', name: '증기 폭발', need: ['hydro-pump', 'flamethrower'], desc: '광선 피해 x1.4', color: '#f0f0f0' },
  { id: 'tempest', name: '천둥 폭풍', need: ['thunder', 'thunderbolt'], desc: '벼락 확률 두 배', color: '#fff060' },
  { id: 'prank', name: '요정의 장난', need: ['play-rough', 'dazzling-gleam'], desc: '사방으로 뿜는 빛이 3번째 공격마다', color: '#ffb0d8' },
  { id: 'eggstorm', name: '알 폭풍', need: ['egg-bomb', 'pin-missile'], desc: '알이 터지면 작은 알 3개로 갈라져 한 번 더 터진다', color: '#fff4c0' },
  { id: 'eggfire', name: '화염알', need: ['egg-bomb', 'flamethrower'], desc: '알이 터질 때 화염이 8방향으로', color: '#ffa040' },
  { id: 'magnet', name: '자력선', need: ['swift', 'thunder-wave'], desc: '튀는 전기가 2마리 더 이어진다', color: '#ffe080' },
  { id: 'tidal', name: '해일', need: ['surf', 'hydro-pump'], desc: '6번째 공격마다 주위로 큰 물결이 퍼져 적을 밀어낸다', color: '#3080ff' },
  { id: 'meteor', name: '유성우', need: ['rock-slide', 'stone-edge'], desc: '급소가 나면 하늘에서 바위 3개가 더 떨어진다', color: '#d0a050' },
  { id: 'aurora', name: '오로라', need: ['ice-beam', 'dazzling-gleam'], desc: '사방으로 뿜는 빛이 30% 확률로 적을 얼린다', color: '#a0ffe0' },
  { id: 'venom', name: '독엄니', need: ['sludge-bomb', 'crunch'], desc: '독에 걸린 적에게 급소 확률 +25%', color: '#8020a0' },
  { id: 'skyfall', name: '하늘 가르기', need: ['air-slash', 'pin-missile'], desc: '탄이 날아가다 둘로 갈라진다', color: '#e0d8ff' },
  { id: 'ironfist', name: '강철 주먹', need: ['close-combat', 'flash-cannon'], desc: '가까운 적(2칸 안)을 맞히면 잠깐 기절', color: '#e0a080' },
  { id: 'solar', name: '솔라빔', need: ['hyper-beam', 'energy-ball'], desc: '광선 피해 x1.4, 가끔 꽃잎이 터진다', color: '#f8ff80' },
  { id: 'rift', name: '지각변동', need: ['earth-power', 'earthquake'], desc: '원뿔이 1.5배 길어지고 공중의 적에게도 제대로 맞는다', color: '#c08040' },
  { id: 'nightmare', name: '악몽', need: ['shadow-ball', 'dark-pulse'], desc: '풀죽은 적은 악몽에 시달려 계속 피해를 입는다', color: '#402060' },
  // 사이코키네시스 조합: 무엇이든 되돌아오게 만든다
  { id: 'psyflame', name: '염동 화염', need: ['psychic', 'flamethrower'], desc: '광선이 벽이나 끝에서 꺾여 되돌아온다', color: '#ff70c0' },
  { id: 'psyspark', name: '염동 전류', need: ['psychic', 'thunderbolt'], desc: '레이저가 벽이나 끝에서 꺾여 되돌아온다', color: '#ffe0ff' },
  { id: 'psychill', name: '염동 냉기', need: ['psychic', 'icy-wind'], desc: '원뿔이 맞은 적을 내 앞으로 끌어당긴다', color: '#c0b0ff' },
  { id: 'psyegg', name: '염동 알', need: ['psychic', 'egg-bomb'], desc: '터진 알이 한 번 튀어 올라 돌아오며 다시 터진다', color: '#ffc0e8' },
  { id: 'psycut', name: '사이코 커터', need: ['psychic', 'x-scissor'], desc: '돌아오는 탄은 꿰뚫기 배수가 한 번 더 2배', color: '#f070ff' },
  // 번개 조합
  { id: 'stormfront', name: '폭풍우', need: ['thunder', 'hydro-pump'], desc: '광선이 지나가는 자리에 벼락이 연달아 떨어진다', color: '#5070ff' },
  { id: 'raijin', name: '뇌신', need: ['thunder', 'thunder-wave'], desc: '마비된 적에게는 벼락이 거의 반드시 떨어진다', color: '#ffff40' },
  // 전설 기술 조합: 'fx:이름'은 그 효과를 가진 전설 기술 아무거나 (사이코브레이크·미스트볼·러스터퍼지는 모두 fx:psy)
  { id: 'psybreak', name: '사이코 브레이크', need: ['fx:psy', 'psychic'], desc: '탄이 맞은 자리에서 염동 폭발', color: '#ff60ff' },
  { id: 'inferno', name: '성스러운 업화', need: ['sacred-fire', 'flamethrower'], desc: '화상 입은 적에게 피해 x1.5, 불탄 적의 폭발이 두 배 넓게', color: '#ffd040' },
  { id: 'blueblaze', name: '청염', need: ['blue-flare', 'will-o-wisp'], desc: '얹히는 불꽃 피해 x4, 화상 지속 피해 x2', color: '#40a0ff' },
  { id: 'absolute', name: '절대영도', need: ['sheer-cold', 'ice-beam'], desc: '언 적을 때리면 35% 확률로 깨지며 주변에 얼음 폭발', color: '#e8ffff' },
  { id: 'thundergod', name: '뇌격신', need: ['fusion-bolt', 'thunder'], desc: '낙뢰 확률 60%, 연쇄 번개가 4마리까지', color: '#ffff90' },
  { id: 'tsunami', name: '근원의 해일', need: ['origin-pulse', 'surf'], desc: '파동이 7갈래로, 더 크고 세게', color: '#2060ff' },
  { id: 'tectonic', name: '지각 붕괴', need: ['fx:erupt', 'earthquake'], desc: '땅의 칼날이 7개, 더 넓고 더 자주 솟는다', color: '#d07030' },
  { id: 'dimension', name: '차원 절단', need: ['spacial-rend', 'x-scissor'], desc: '공간의 균열이 4줄, 범위·피해 x2', color: '#ff90e0' },
  { id: 'timewarp', name: '시간 역행', need: ['roar-of-time', 'dragon-pulse'], desc: '시간이 5초마다 멈추고, 멈춘 동안 피해 x2', color: '#6080ff' },
  { id: 'lunar', name: '월식', need: ['moongeist-beam', 'moonblast'], desc: '광선 위력 x1.4, 50% 확률로 적의 공격이 뜸해짐', color: '#a080ff' },
  { id: 'eclipse', name: '일식', need: ['fx:blade', 'flash-cannon'], desc: '맞힐 때마다 강철 폭발', color: '#ffb040' },
  { id: 'dynamax', name: '무한다이맥스', need: ['eternabeam', 'hyper-beam'], desc: '광선 차징 x0.6, 굵기 x1.3', color: '#ff2050' },
  { id: 'gaia', name: '대지의 맥동', need: ['geomancy', 'earth-power'], desc: '대지의 힘이 8초마다 5초 동안, 그동안 맞힌 적 발밑에서 땅이 솟는다', color: '#ff80c0' },
  { id: 'calamity', name: '재앙의 날', need: ['fx:madness', 'dark-pulse'], desc: '체력 절반 확률 35%, 보스 피해 x1.5', color: '#802040' },
  { id: 'deathwing', name: '데스윙', need: ['oblivion-wing', 'air-slash'], desc: '체력 흡수 2배', color: '#c02030' },
  { id: 'bloom', name: '생명의 개화', need: ['seed-flare', 'energy-ball'], desc: '씨앗 폭발 범위 x1.6, 피해 x1.5, 쓰러뜨리면 40% 회복', color: '#90ff60' },
  { id: 'diamond', name: '다이아 광채', need: ['diamond-storm', 'stone-edge'], desc: '다이아 파편 확률 60%, 10갈래', color: '#f0f8ff' },
  { id: 'stormdash', name: '전광석화', need: ['fx:dashStrike', 'thunder-wave'], desc: '구르기에 맞은 적이 마비되고 주변으로 전기가 튄다', color: '#ffe040' },
  { id: 'phantom', name: '망령의 습격', need: ['shadow-force', 'shadow-ball'], desc: '나타날 때 폭발 범위 x1.6, 피해 x1.5', color: '#6030a0' },
  { id: 'juggernaut', name: '철벽 돌진', need: ['behemoth-bash', 'close-combat'], desc: '부딪힌 적에게 주는 피해 x2', color: '#a0b0d0' },
];
const combo = id => !!player?.combos?.has(id);
function refreshCombos() {
  const p = player;
  p.combos = new Set(COMBOS.filter(c => c.need.every(id => id.startsWith('fx:') ? FX.has(id.slice(3)) : p.moves.has(id))).map(c => c.id));
  // 공격 색: 켜진 조합이 있으면 마지막 조합의 색, 없으면 최근에 배운 두 기술의 타입 색(바탕·가운데)
  const cs = COMBOS.filter(c => p.combos.has(c.id)), ms = [...p.moves].map(moveDef).filter(Boolean);
  p.pcol = cs.length ? [cs.at(-1).color, cs.length > 1 ? cs.at(-2).color : '#ffffff']
    : ms.length ? [TYPE_COLOR[ms.at(-1).type], ms.length > 1 ? TYPE_COLOR[ms.at(-2).type] : '#ffffff'] : [TYPE_COLOR[p.type], '#ffffff'];
  // 자속 보정: 이 포켓몬의 타입과 같은 타입의 기술을 갖고 있으면 그 타입의 공격이 STAB배
  p.stabTypes = new Set(p.mon.types.filter(t => ms.some(m => m.type === t)));
}
const STAB = 1.5;
const stab = type => player.stabTypes?.has(type) ? (abStat('adapt', false) ? 2 : STAB) : 1;  // 적응력이면 2배

// 도감 스타팅이 갖고 시작하는 기술: 첫 번째 타입에 맞는 기술머신 (없으면 두 번째 타입). 타입마다 목록 맨 앞이 공격 기술이라 회복 기술로 시작하지 않는다
const typeMove = m => m.types.map(t => TMS.find(x => x.type === t)).find(Boolean)?.id;
// 전설의 기술: 전설의 포켓몬으로 시작하면 처음부터 갖고 있고, 아주 드물게 기술머신으로도 나온다. 일반 기술보다 확실히 강하다
// 전설 기술 보너스: 전설 기술 하나마다 모든 공격 위력 x1.25 (LEGEND_POW). 전설 포켓몬은 기본 능력치가 높아서 보너스는 작게 둔다
// 전설 기술 설명: 기술 자체 위력 숫자에 보너스를 곱해 하나로 합친다. 구르기 공격은 배수로 바꿔 쓰고, 나머지 공격에 붙는 보너스는 뒤에 한 번만
const LEGEND_POW = 1.35;
// 기술 설명은 짧게: 공격 방식 · 핵심 효과만 (전설 기술 보너스는 '전설'이라고만 덧붙인다)
const legendDesc = d => `${d} · 전설`;
const L = (id, type, fx, desc, onLearn) => ({ id, tm: `tm-${type}`, name: id, type, fx, desc: legendDesc(desc), legend: true, onLearn });
const LTMS = [
  L('psystrike', 'psychic', 'psy', '탄 · 강한 유도, 관통'),
  L('mist-ball', 'psychic', 'psy', '탄 · 강한 유도, 관통'),
  L('luster-purge', 'psychic', 'psy', '탄 · 강한 유도, 관통'),
  L('aeroblast', 'flying', 'beam', '광선 · 짧은 차징, 급소'),
  L('blue-flare', 'fire', 'beam', '광선 · 아주 강한 화염'),
  L('moongeist-beam', 'ghost', 'beam', '광선 · 아주 강함'),
  L('eternabeam', 'dragon', 'beam', '광선 · 긴 차징, 거대함'),
  L('sacred-fire', 'fire', 'holyBurn', '강화 · 강한 화상, 불탄 적 폭발'),
  L('origin-pulse', 'water', 'fan5', '강화 · 파동 5갈래 추가'),
  L('precipice-blades', 'ground', 'erupt', '강화 · 땅의 칼날'),
  L('thousand-arrows', 'ground', 'erupt', '강화 · 땅의 칼날'),
  L('dragon-ascent', 'flying', 'dashStrike', '돌진 · 구르기가 공격, 자동 조준'),
  L('collision-course', 'fighting', 'dashStrike', '돌진 · 구르기가 공격, 자동 조준, 속도 증가'),
  L('electro-drift', 'electric', 'dashStrike', '돌진 · 구르기가 공격, 자동 조준, 속도 증가'),
  L('roar-of-time', 'dragon', 'timeStop', '강화 · 주기적으로 시간 정지'),
  L('spacial-rend', 'dragon', 'rend', '강화 · 공간째 범위 베기'),
  L('shadow-force', 'ghost', 'vanish', '구르기 · 사라졌다 나타나며 폭발'),
  L('fusion-bolt', 'electric', 'smite', '강화 · 낙뢰, 연쇄 번개'),
  L('sheer-cold', 'ice', 'freeze', '강화 · 얼림'),
  L('sunsteel-strike', 'steel', 'blade', '강화 · 관통, 보스에게 강함'),
  L('behemoth-blade', 'steel', 'blade', '검을 크게 휘둘러 벰, 검기가 날아감, 보스에게 강함'),
  L('behemoth-bash', 'steel', 'bulwark', '강화 · 피해 감소, 방패'),
  L('geomancy', 'fairy', 'geo', '강화 · 능력치 상승, 주기적 강화'),
  L('oblivion-wing', 'flying', 'drain', '강화 · 체력 흡수'),
  L('seed-flare', 'grass', 'flare', '강화 · 맞으면 폭발'),
  L('natures-madness', 'fairy', 'madness', '강화 · 체력 절반 확률'),
  L('ruination', 'dark', 'madness', '강화 · 체력 절반 확률'),
  L('diamond-storm', 'rock', 'shard', '강화 · 급소, 다이아 파편'),
  L('photon-geyser', 'psychic', 'beam', '광선 · 아주 강한 빛'),
  L('glacial-lance', 'ice', 'freeze', '강화 · 얼림'),
  L('astral-barrage', 'ghost', 'psy', '탄 · 강한 유도, 관통'),
  L('wicked-blow', 'dark', 'blade', '강한 주먹 한 방, 늘 급소급, 보스에게 강함'),
  L('surging-strikes', 'water', 'fan5', '물의 주먹 3연타(늘 급소), 물결 갈래 추가'),
  L('ivy-cudgel', 'grass', 'flare', '강화 · 맞으면 폭발'),
  L('tera-starstorm', 'normal', 'beam', '광선 · 별빛, 아주 강함'),
  // 2026-11-23: 전설·환상마다 실제 전용기(없으면 실제로 배우는 상징 기술)
  L('zap-cannon', 'electric', 'smite', '전기 구슬이 터지며 마비, 낙뢰'),
  L('sky-attack', 'flying', 'dashStrike', '돌진 · 불새가 되어 들이받음, 자동 조준'),
  L('expanding-force', 'psychic', 'psy', '탄 · 강한 유도, 관통, 넓은 염동 폭발'),
  L('discharge', 'electric', 'smite', '주위로 방전, 연쇄 번개, 마비'),
  L('scald', 'water', 'beam', '광선 · 뜨거운 물, 화상'),
  L('leaf-storm', 'grass', 'flare', '잎사귀 폭풍이 터짐'),
  L('ancient-power', 'rock', 'shard', '바위 파편이 흩날림, 급소'),
  L('frost-breath', 'ice', 'freeze', '얼림, 급소 +30%'),
  L('heavy-slam', 'steel', 'bulwark', '피해 감소, 부딪힌 적에게 큰 피해'),
  L('doom-desire', 'steel', 'doom', '잠시 뒤 하늘에서 거대한 빛이 떨어짐'),
  L('psycho-boost', 'psychic', 'psy', '탄 · 강한 유도, 관통, 아주 강한 염동 폭발'),
  L('mystical-power', 'psychic', 'psy', '탄 · 강한 유도, 관통'),
  L('lunar-blessing', 'psychic', 'psy', '탄 · 강한 유도, 12초마다 체력 회복'),
  L('take-heart', 'psychic', 'psy', '탄 · 강한 유도, 상태이상 무시, 급소 +10%'),
  L('dark-void', 'dark', 'void', '적을 잠재움, 잠든 적에게 피해 x1.3'),
  L('judgment', 'normal', 'judge', '하늘에서 빛의 화살이 쏟아짐, 타입은 플레이트를 따름'),
  L('v-create', 'fire', 'vcreate', 'V자로 화염이 함께 나감'),
  L('bleakwind-storm', 'flying', 'storm', '찬바람 소용돌이, 느려짐'),
  L('wildbolt-storm', 'electric', 'storm', '번개 소용돌이, 마비'),
  L('sandsear-storm', 'ground', 'storm', '열사 소용돌이, 화상'),
  L('glaciate', 'ice', 'freeze', '얼림, 주변 적 느려짐'),
  L('freeze-shock', 'ice', 'smite', '얼음 낙뢰, 얼림'),
  L('secret-sword', 'fighting', 'blade', '칼을 휘둘러 벰, 검기가 날아감'),
  L('relic-song', 'normal', 'void', '노래로 적을 잠재움, 잠든 적에게 피해 x1.3'),
  L('techno-blast', 'normal', 'beam', '광선 · 타입은 카세트를 따름'),
  L('hyperspace-hole', 'psychic', 'rend', '이차원의 구멍이 열려 공간째 공격'),
  L('hyperspace-fury', 'dark', 'rend', '이차원의 고리에서 주먹이 쏟아짐'),
  L('steam-eruption', 'water', 'beam', '광선 · 뜨거운 증기, 화상'),
  L('fleur-cannon', 'fairy', 'beam', '광선 · 꽃의 대포, 아주 강함'),
  L('spectral-thief', 'ghost', 'blade', '그림자 주먹, 맞히면 잠깐 공격 상승'),
  L('plasma-fists', 'electric', 'smite', '번개 주먹, 낙뢰, 연쇄 번개'),
  L('jungle-healing', 'grass', 'flare', '맞으면 폭발, 쓰러뜨리면 회복'),
  L('light-that-burns-the-sky', 'psychic', 'beam', '광선 · 멸망의 빛, 아주 거대함'),
];
// 휘둘러 치는 기술: 공격 방식이 '베기'(칼) 또는 '주먹'이 된다. 앞쪽 부채꼴을 직접 치고, 칼은 검기·주먹은 충격파가 조금 날아간다
const SWING = { 'behemoth-blade': 'sword', 'secret-sword': 'sword', 'wicked-blow': 'fist', 'surging-strikes': 'fist', 'spectral-thief': 'fist', 'plasma-fists': 'fist' };
// 준전설: 전설·환상보다 조금 약하게 다룬다 (플레이어일 때 전설의 기운 x1.15, 상대일 때 체력 x0.75)
const SUB_LEGENDS = new Set([144, 145, 146, 243, 244, 245, 377, 378, 379, 380, 381, 480, 481, 482, 488, 641, 642, 645, 785, 786, 787, 788, 892, 1001, 1002, 1003, 1004, 1017]);
const isSubLegend = id => SUB_LEGENDS.has(id);
const MYTHICAL = new Set([151, 251, 385, 386, 489, 490, 491, 492, 493, 494, 647, 648, 649, 719, 720, 721, 801, 802, 807, 808, 809, 893, 1025]);
// 전설 기술 한국어 이름 (PokeAPI에 한국어 이름이 없을 때 대신 쓴다)
const LEGEND_KO = { psystrike: '사이코브레이크', 'mist-ball': '미스트볼', 'luster-purge': '러스터퍼지', aeroblast: '에어로블라스트', 'blue-flare': '푸른불꽃', 'moongeist-beam': '섀도레이',
  eternabeam: '무한다이빔', 'sacred-fire': '성스러운불꽃', 'origin-pulse': '근원의파동', 'precipice-blades': '단애의칼', 'thousand-arrows': '사우전드애로', 'dragon-ascent': '화룡점정',
  'collision-course': '액셀브레이크', 'electro-drift': '라이트닝드라이브', 'roar-of-time': '시간의포효', 'spacial-rend': '공간절단', 'shadow-force': '섀도다이브', 'fusion-bolt': '크로스썬더',
  'sheer-cold': '절대영도', 'sunsteel-strike': '메테오드라이브', 'behemoth-blade': '거대검돌격', 'behemoth-bash': '거대방패돌격', geomancy: '지오컨트롤', 'oblivion-wing': '데스윙',
  'seed-flare': '시드플레어', 'natures-madness': '자연의분노', ruination: '카타스트로피', 'diamond-storm': '다이아스톰',
  'photon-geyser': '포톤가이저', 'glacial-lance': '블리자드랜스', 'astral-barrage': '아스트랄비트', 'wicked-blow': '암흑강타', 'surging-strikes': '수류연타', 'ivy-cudgel': '덩굴방망이', 'tera-starstorm': '테라클러스터',
  'zap-cannon': '전자포', 'sky-attack': '불새', 'expanding-force': '와이드포스', discharge: '방전', scald: '열탕', 'leaf-storm': '리프스톰', 'ancient-power': '원시의힘',
  'frost-breath': '얼음숨결', 'heavy-slam': '헤비봄버', 'doom-desire': '파멸의소원', 'psycho-boost': '사이코부스트', 'mystical-power': '신비의힘', 'lunar-blessing': '초승달의기도',
  'take-heart': '브레이브차지', 'dark-void': '다크홀', judgment: '심판의뭉치', 'v-create': 'V제너레이트', 'bleakwind-storm': '찬바람폭풍', 'wildbolt-storm': '번개폭풍',
  'sandsear-storm': '열사의폭풍', glaciate: '얼어붙은세계', 'freeze-shock': '프리즈볼트', 'secret-sword': '신비의칼', 'relic-song': '옛노래', 'techno-blast': '테크노버스터',
  'hyperspace-hole': '이차원홀', 'hyperspace-fury': '이차원러시', 'steam-eruption': '스팀버스트', 'fleur-cannon': '플뢰르캐논', 'spectral-thief': '섀도스틸',
  'plasma-fists': '플라스마피스트', 'jungle-healing': '정글힐', 'light-that-burns-the-sky': '하늘을태우는멸망의빛' };
for (const t of LTMS) t.name = LEGEND_KO[t.id] ?? t.name;
// 게임 안에서는 공격 방식(광선·원뿔·탄…) 말머리를 보여 주지 않는다. 효과만 남긴다
for (const t of [...TMS, ...LTMS]) t.desc = t.desc.replace(/^(강화|광선|원뿔|구슬|탄|돌진|레이저|알폭탄|구르기) · /, '');
// 전설의 포켓몬 → 상징적인 기술
const LEGEND_MOVE = { 144: 'sheer-cold', 145: 'zap-cannon', 146: 'sky-attack', 150: 'psystrike', 151: 'expanding-force', 243: 'discharge', 244: 'sacred-fire', 245: 'scald',
  249: 'aeroblast', 250: 'sacred-fire', 251: 'leaf-storm', 377: 'ancient-power', 378: 'frost-breath', 379: 'heavy-slam', 380: 'mist-ball', 381: 'luster-purge',
  382: 'origin-pulse', 383: 'precipice-blades', 384: 'dragon-ascent', 480: 'mystical-power', 481: 'mystical-power', 482: 'mystical-power', 483: 'roar-of-time', 484: 'spacial-rend',
  487: 'shadow-force', 488: 'lunar-blessing', 641: 'bleakwind-storm', 642: 'wildbolt-storm', 643: 'blue-flare', 644: 'fusion-bolt', 645: 'sandsear-storm', 646: 'glaciate',
  716: 'geomancy', 717: 'oblivion-wing', 718: 'thousand-arrows', 719: 'diamond-storm', 785: 'natures-madness', 786: 'natures-madness', 787: 'natures-madness',
  788: 'natures-madness', 791: 'sunsteel-strike', 792: 'moongeist-beam', 888: 'behemoth-blade', 889: 'behemoth-bash', 890: 'eternabeam',
  1001: 'ruination', 1002: 'ruination', 1003: 'ruination', 1004: 'ruination', 1007: 'collision-course', 1008: 'electro-drift',
  800: 'photon-geyser', 898: 'glacial-lance', 892: 'wicked-blow', 1017: 'ivy-cudgel', 1024: 'tera-starstorm',
  // 환상의 포켓몬: 지방 지도에는 없고 후파의 고리 너머에서만 만난다
  385: 'doom-desire', 386: 'psycho-boost', 490: 'take-heart', 491: 'dark-void', 492: 'seed-flare', 493: 'judgment', 494: 'v-create', 647: 'secret-sword',
  648: 'relic-song', 649: 'techno-blast', 720: 'hyperspace-hole', 721: 'steam-eruption', 801: 'fleur-cannon', 802: 'spectral-thief', 807: 'plasma-fists', 893: 'jungle-healing' };
// 후파의 고리 너머에서 나올 수 있는 전설·환상의 포켓몬 전체
const HOOPA_POOL = Object.keys(LEGEND_MOVE).map(Number);
// 기술이 늘 주는 능력치 보너스(조건 없는 것만). 왼쪽 능력치 창과 실제 계산이 같은 값을 쓴다
// 숨은 조합 보너스는 여기 넣지 않는다 (화면에 드러나면 숨은 효과가 아니게 된다)
// 배수 규칙: 도구의 배수(빨강구슬 x1.3 등)는 얻는 순간 그때의 능력치에 한 번 곱한다.
// 기술·특성·기믹의 배수는 아래 함수들로 늘 계산에 붙어서, 그 뒤에 얻은 도구에도 곱해진다
const moveDmgMul = () => (has('flash-cannon') ? 1.2 : 1) * (has('focus-blast') ? 1.35 : 1) * (has('dragon-claw') ? 1.2 : 1)
  * (has('close-combat') ? 1.2 : 1) * (has('play-rough') ? 1.2 : 1) * (hasFx('blade') ? 1.5 : 1) * (hasFx('drain') ? 1.2 : 1) * orbPow() * kindPow() * (hasFx('geo') ? 1.3 : 1) * gimmickMul() * abMul() * legendPow;
const moveCrit = () => (hasFx('rend') ? 0.15 : 0) + (hasFx('blade') ? 0.05 : 0) + (has('crunch') ? 0.05 : 0) + (has('stone-edge') ? 0.2 : 0) + (hasFx('shard') ? 0.3 : 0) + (has('frost-breath') ? 0.3 : 0) + (has('take-heart') ? 0.1 : 0) + abStat('crit', 0);
// 이동 속도 배수 (기술·특성): 지오컨트롤 x1.15, 액셀브레이크·라이트닝드라이브 x1.15, 특성
const moveSpeed = () => (hasFx('geo') ? 1.15 : 1) * (has('collision-course') || has('electro-drift') ? 1.15 : 1) * abStat('speed') * formStat('spd');
// 공격 사이 간격 배수 (작을수록 빠름): 구슬 하나마다 x1.2, 기합구슬은 더 느리다
const moveRate = () => (has('bullet-seed') ? 0.5 : 1) * (has('air-slash') ? 0.8 : 1) * 1.2 ** orbCount() * (has('focus-blast') ? 1.15 : 1) * (hasFx('geo') ? 0.8 : 1) * abStat('rate') * formStat('rate');
const moveShot = () => (has('air-slash') ? 1.3 : 1) * abStat('shot') * formStat('shot');
// 구슬: 구슬 기술 + 다른 기술이 하나라도 있으면 모든 효과(탄 크기·폭발·광선 굵기·원뿔 길이·범위)가 커지고 위력이 오른다. 구슬이 많을수록 더
const orbCount = () => player ? ORBS.filter(id => player.moves.has(id)).length : 0;
const orbBoost = () => { const n = orbCount(); return n && player.moves.size >= 2 ? n : 0; };
const fxScale = () => { const n = orbBoost(); return (n ? 1.3 + 0.15 * (n - 1) : 1) * kindScale() * zScale(); };
// 같은 종류 공명: 광선·레이저·원뿔 기술을 같은 종류로 2개 이상 가지면 범위(굵기·길이·폭발)와 위력이 오른다 (구슬은 위의 구슬 보너스가 같은 역할)
// 전설의 광선 기술(에어로블라스트 등)도 광선으로 센다. 2개면 한 쌍, 3개면 두 쌍
const MOVE_KINDS = [['광선', id => BEAMS.includes(id) || moveDef(id)?.fx === 'beam'], ['레이저', id => LASERS.includes(id)], ['원뿔', id => CONES.includes(id)]];
const kindPairs = () => player ? MOVE_KINDS.reduce((n, [, f]) => n + Math.max(0, [...player.moves].filter(f).length - 1), 0) : 0;
const kindScale = () => { const n = kindPairs(); return n ? 1.25 + 0.15 * (n - 1) : 1; };
const kindPow = () => { const n = kindPairs(); return n ? 1.2 + 0.1 * (n - 1) : 1; };
const orbPow = () => { const n = orbBoost(); return n ? 1.2 + 0.1 * (n - 1) : 1; };
// 그 분류에서 가장 최근에 배운 기술
// 그 분류에서 가장 최근에 배운 기술 (Z기술이 그 분류에 있으면 Z기술이 우선: 공격 타입이 Z기술 타입이 된다)
const lastOf = list => { const ms = [...player.moves].filter(id => list.includes(id)); return ms.includes(player.zMove) ? player.zMove : ms.at(-1); };
// [이름, 아이콘, 값, 소수 자리]: 도구·도핑약·기술 보너스가 모두 들어간 실제 값
const STATS = [
  ['공격', 'muscle-band', p => p.dmg * moveDmgMul() * stab(p.type), 2], ['연사', 'quick-claw', p => 1 / (p.fireDelay * moveRate()), 2], ['사거리', 'wide-lens', p => p.range * p.shotSpeed * moveShot() / TS, 1],
  ['탄속', 'zoom-lens', p => p.shotSpeed * moveShot() / 380, 2], ['속도', 'choice-scarf', p => p.speed * moveSpeed() / 200, 2], ['급소', 'scope-lens', p => (p.crit + moveCrit()) * 100, 0],
];
const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
