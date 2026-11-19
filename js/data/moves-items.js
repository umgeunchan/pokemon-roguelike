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
  I('dna-splicers', 'l', '유전자쐐기', '큐레무의 쐐기: 뒤로도 한 발 더 쏜다', p => p.backShot = true),
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
  { id: 'flamethrower', tm: 'tm-fire', name: '화염방사', type: 'fire', desc: '차징 후 화염 광선을 일직선으로 발사' },
  { id: 'hyper-beam', tm: 'tm-normal', name: '파괴광선', type: 'normal', desc: '긴 차징 후 강력한 광선' },
  { id: 'egg-bomb', tm: 'tm-normal', name: '알폭탄', type: 'normal', desc: '알을 던져 폭발 (적에게 닿으면 공중에서 바로 폭발)' },
  { id: 'thunderbolt', tm: 'tm-electric', name: '10만볼트', type: 'electric', desc: '적중 시 옆의 적에게 전기가 튄다' },
  { id: 'thunder-wave', tm: 'tm-electric', name: '전기자석파', type: 'electric', desc: '적중 시 25% 확률로 마비' },
  { id: 'pin-missile', tm: 'tm-bug', name: '바늘미사일', type: 'bug', desc: '공격이 3갈래로 나간다' },
  { id: 'swift', tm: 'tm-normal', name: '스피드스타', type: 'normal', desc: '공격이 적을 따라간다' },
  { id: 'shadow-ball', tm: 'tm-ghost', name: '섀도볼', type: 'ghost', desc: '공격이 커지고 적과 장애물을 관통' },
  { id: 'icy-wind', tm: 'tm-ice', name: '얼다바람', type: 'ice', desc: '적중한 적이 느려진다' },
  { id: 'will-o-wisp', tm: 'tm-fire', name: '도깨비불', type: 'fire', desc: '적중한 적에게 화상 (지속 피해)' },
  { id: 'razor-leaf', tm: 'tm-grass', name: '잎날가르기', type: 'grass', desc: '공격이 2갈래로 나간다 (한 발 위력 x0.7)' },
  { id: 'giga-drain', tm: 'tm-grass', name: '기가드레인', type: 'grass', desc: '피해를 줄수록 체력 회복' },
  { id: 'bullet-seed', tm: 'tm-grass', name: '씨기관총', type: 'grass', desc: '연사 x2, 한 발 위력 감소' },
  { id: 'earthquake', tm: 'tm-ground', name: '지진', type: 'ground', desc: '적중 시 주변 땅 위의 적에게 충격파' },
  { id: 'surf', tm: 'tm-water', name: '파도타기', type: 'water', desc: '공격이 커지고 관통하며 적을 크게 밀어낸다' },
  { id: 'sludge-bomb', tm: 'tm-poison', name: '오물폭탄', type: 'poison', desc: '적중한 자리에 독 웅덩이' },
  { id: 'psychic', tm: 'tm-psychic', name: '사이코키네시스', type: 'psychic', desc: '탄이 부메랑처럼 돌아온다' },
  { id: 'aerial-ace', tm: 'tm-flying', name: '제비반환', type: 'flying', desc: '탄속 크게 증가, 급소 확률 증가' },
  { id: 'dragon-pulse', tm: 'tm-dragon', name: '용의파동', type: 'dragon', desc: '적중 시 주변에 폭발' },
  { id: 'dazzling-gleam', tm: 'tm-fairy', name: '매지컬샤인', type: 'fairy', desc: '4번째 공격마다 사방으로 빛을 뿜는다' },
  { id: 'rock-slide', tm: 'tm-rock', name: '스톤샤워', type: 'rock', desc: '적중 시 주변에 바위가 떨어진다' },
  { id: 'brick-break', tm: 'tm-fighting', name: '깨트리기', type: 'fighting', desc: '트레이너·관장·전설에게 피해 x1.3' },
  { id: 'crunch', tm: 'tm-dark', name: '깨물어부수기', type: 'dark', desc: '급소 피해 x1.5 → x2.2, 급소 확률 +5%' },
  { id: 'flash-cannon', tm: 'tm-steel', name: '러스터캐논', type: 'steel', desc: '모든 공격 위력 x1.2' },
  { id: 'ice-beam', tm: 'tm-ice', name: '냉동빔', type: 'ice', desc: '적중 시 15% 확률로 얼림 (언 적은 피해 x1.5)' },
  { id: 'stone-edge', tm: 'tm-rock', name: '스톤에지', type: 'rock', desc: '급소 확률 +20%' },
  { id: 'dark-pulse', tm: 'tm-dark', name: '악의파동', type: 'dark', desc: '적중 시 20% 확률로 풀죽음 (잠깐 멈춤)' },
  { id: 'focus-blast', tm: 'tm-fighting', name: '기합구슬', type: 'fighting', desc: '위력 x1.6, 대신 연사가 조금 느려진다' },
  { id: 'iron-head', tm: 'tm-steel', name: '아이언헤드', type: 'steel', desc: '위력 x1.15, 15% 확률로 풀죽음' },
  { id: 'dragon-claw', tm: 'tm-dragon', name: '드래곤크루', type: 'dragon', desc: '모든 공격 위력 x1.2' },
  { id: 'moonblast', tm: 'tm-fairy', name: '문포스', type: 'fairy', desc: '관장·사천왕·전설에게 피해 x1.3' },
  { id: 'x-scissor', tm: 'tm-bug', name: '시저크로스', type: 'bug', desc: '공격이 적을 관통한다' },
  { id: 'hydro-pump', tm: 'tm-water', name: '하이드로펌프', type: 'water', desc: '모든 공격 위력 x1.25' },
  { id: 'blizzard', tm: 'tm-ice', name: '눈보라', type: 'ice', desc: '적중 시 10% 확률로 그 적과 주변 적을 얼림' },
  { id: 'thunder', tm: 'tm-electric', name: '번개', type: 'electric', desc: '적중 시 15% 확률로 벼락이 떨어져 주변에 큰 피해' },
  { id: 'energy-ball', tm: 'tm-grass', name: '에너지볼', type: 'grass', desc: '적중 시 20% 확률로 작은 폭발 (주변 피해)' },
  { id: 'poison-jab', tm: 'tm-poison', name: '독찌르기', type: 'poison', desc: '적중 시 30% 확률로 독 (지속 피해)' },
  { id: 'bug-buzz', tm: 'tm-bug', name: '벌레의야단법석', type: 'bug', desc: '5번째 적중마다 주변에 음파 (피해 + 밀어냄)' },
  { id: 'air-slash', tm: 'tm-flying', name: '에어슬래시', type: 'flying', desc: '적중 시 25% 확률로 풀죽음' },
  { id: 'close-combat', tm: 'tm-fighting', name: '인파이트', type: 'fighting', desc: '모든 공격 위력 x1.35, 연사 조금 느려짐' },
  { id: 'play-rough', tm: 'tm-fairy', name: '치근거리기', type: 'fairy', desc: '급소 확률 +10%, 급소 피해 x1.2' },
  { id: 'earth-power', tm: 'tm-ground', name: '대지의힘', type: 'ground', desc: '관장·사천왕·전설에게 피해 x1.25' },
];
// 숨은 조합: 두 기술을 함께 기억하면 추가 효과가 조용히 켜진다 (화면에 알리지 않는다. 직접 찾아내는 재미)
const COMBOS = [
  { id: 'scorch', name: '작열', need: ['will-o-wisp', 'flamethrower'], desc: '화상·독에 걸린 적에게 피해 x1.4' },
  { id: 'storm', name: '뇌우', need: ['thunderbolt', 'surf'], desc: '전기 튀김이 더 멀리, 피해 x2' },
  { id: 'zero', name: '절대영도', need: ['icy-wind', 'ice-beam'], desc: '느려진 적은 30% 확률로 얼어붙는다' },
  { id: 'toxic', name: '맹독', need: ['sludge-bomb', 'poison-jab'], desc: '독·화상 지속 피해 x2' },
  { id: 'quake', name: '대지붕괴', need: ['earthquake', 'rock-slide'], desc: '관장·전설에게 피해 x1.35' },
  { id: 'fang', name: '그림자 송곳니', need: ['shadow-ball', 'crunch'], desc: '급소 시 15% 확률로 체력 회복' },
  { id: 'dragon', name: '용의 춤', need: ['dragon-claw', 'dragon-pulse'], desc: '모든 공격 위력 x1.25' },
  { id: 'vine', name: '흡수 덩굴', need: ['giga-drain', 'razor-leaf'], desc: '체력 흡수가 두 배로 잦아진다' },
  { id: 'mind', name: '정신 붕괴', need: ['psychic', 'dark-pulse'], desc: '풀죽은 적에게 피해 x1.5' },
  { id: 'fortress', name: '강철 요새', need: ['flash-cannon', 'iron-head'], desc: '받는 공격을 20% 확률로 막아낸다' },
  { id: 'gale', name: '질풍', need: ['aerial-ace', 'swift'], desc: '연사 x1.25' },
  { id: 'steam', name: '증기 폭발', need: ['hydro-pump', 'flamethrower'], desc: '광선 피해 x1.4' },
  { id: 'tempest', name: '천둥 폭풍', need: ['thunder', 'thunderbolt'], desc: '벼락 확률 15% → 30%' },
  { id: 'prank', name: '요정의 장난', need: ['play-rough', 'dazzling-gleam'], desc: '빛 폭발이 3번째 공격마다' },
];
const combo = id => !!player?.combos?.has(id);
function refreshCombos() {
  const p = player;
  p.combos = new Set(COMBOS.filter(c => c.need.every(id => p.moves.has(id))).map(c => c.id));
}

// 도감 스타팅이 갖고 시작하는 기술: 첫 번째 타입에 맞는 기술머신 (없으면 두 번째 타입). 타입마다 목록 맨 앞이 공격 기술이라 회복 기술로 시작하지 않는다
const typeMove = m => m.types.map(t => TMS.find(x => x.type === t)).find(Boolean)?.id;
// 전설의 기술: 전설의 포켓몬으로 시작하면 처음부터 갖고 있고, 아주 드물게 기술머신으로도 나온다. 일반 기술보다 확실히 강하다
// 전설 기술 보너스: 전설 기술 하나마다 모든 공격 위력 x1.25 (LEGEND_POW). 전설 포켓몬은 기본 능력치가 높아서 보너스는 작게 둔다
// 전설 기술 설명: 기술 자체 위력 숫자에 보너스를 곱해 하나로 합친다. 구르기 공격은 배수로 바꿔 쓰고, 나머지 공격에 붙는 보너스는 뒤에 한 번만
const LEGEND_POW = 1.25;
const legendDesc = d => d.includes('구르기') ? `${d.replace(/위력 x([\d.]+)/, (_, n) => `공격력의 ${+(n * LEGEND_POW).toFixed(2)}배`)} · 모든 공격 위력 x${LEGEND_POW}`
  : /위력 x[\d.]+/.test(d) ? d.replace(/위력 x([\d.]+)/, (_, n) => `위력 x${+(n * LEGEND_POW).toFixed(2)}`) : `${d} · 모든 공격 위력 x${LEGEND_POW}`;
const L = (id, type, fx, desc, onLearn) => ({ id, tm: `tm-${type}`, name: id, type, fx, desc: legendDesc(desc), legend: true, onLearn });
const LTMS = [
  L('psystrike', 'psychic', 'psy', '탄이 적을 강하게 쫓아가며 관통, 위력 x1.4'),
  L('mist-ball', 'psychic', 'psy', '탄이 적을 강하게 쫓아가며 관통, 위력 x1.4'),
  L('luster-purge', 'psychic', 'psy', '탄이 적을 강하게 쫓아가며 관통, 위력 x1.4'),
  L('aeroblast', 'flying', 'beam', '짧은 차징의 바람 광선, 위력 x1.5, 급소 +30%'),
  L('blue-flare', 'fire', 'beam', '푸른 화염 광선, 위력 x2.2, 화상'),
  L('moongeist-beam', 'ghost', 'beam', '달빛 광선, 위력 x2'),
  L('eternabeam', 'dragon', 'beam', '긴 차징의 거대한 광선, 위력 x2.6'),
  L('sacred-fire', 'fire', 'holyBurn', '맞은 적은 반드시 강한 화상, 불탄 적이 쓰러지면 폭발'),
  L('origin-pulse', 'water', 'fan5', '공격할 때마다 관통하는 파동이 5갈래로'),
  L('precipice-blades', 'ground', 'erupt', '적중한 곳부터 앞으로 땅의 칼날이 솟는다'),
  L('thousand-arrows', 'ground', 'erupt', '적중한 곳부터 앞으로 땅의 칼날이 솟는다'),
  L('dragon-ascent', 'flying', 'dashStrike', '구르기가 공격이 된다 (위력 x4), 구르기 대기 시간 감소'),
  L('collision-course', 'fighting', 'dashStrike', '구르기 공격(위력 x4) + 배우는 순간 이동 속도 x1.15', p => p.speed *= 1.15),
  L('electro-drift', 'electric', 'dashStrike', '구르기 공격(위력 x4) + 배우는 순간 이동 속도 x1.15', p => p.speed *= 1.15),
  L('roar-of-time', 'dragon', 'timeStop', '7초마다 1.8초 동안 시간을 멈춘다'),
  L('spacial-rend', 'dragon', 'rend', '적중 시 주변 공간째로 베어 범위 피해'),
  L('shadow-force', 'ghost', 'vanish', '구르면 사라졌다가 나타나며 주변에 큰 피해'),
  L('fusion-bolt', 'electric', 'smite', '적중 시 35% 확률로 낙뢰 + 연쇄 번개'),
  L('sheer-cold', 'ice', 'freeze', '적중 시 35% 확률로 얼림, 언 적은 피해 x1.5'),
  L('sunsteel-strike', 'steel', 'blade', '위력 x1.5, 보스에게 추가 x1.4'),
  L('behemoth-blade', 'steel', 'blade', '위력 x1.5, 보스에게 추가 x1.4'),
  L('behemoth-bash', 'steel', 'bulwark', '받는 피해 감소, 부딪힌 적에게 큰 피해'),
  L('geomancy', 'fairy', null, '배우는 순간 공격 x1.3, 연사 x1.25, 속도 x1.15', p => { p.dmg *= 1.3; p.fireDelay *= 0.8; p.speed *= 1.15; }),
  L('oblivion-wing', 'flying', 'drain', '위력 x1.2, 준 피해로 체력을 크게 흡수'),
  L('seed-flare', 'grass', 'flare', '탄이 터지며 범위 피해, 쓰러뜨리면 가끔 회복'),
  L('natures-madness', 'fairy', 'madness', '일반 적은 20% 확률로 체력 절반, 보스 피해 x1.25'),
  L('ruination', 'dark', 'madness', '일반 적은 20% 확률로 체력 절반, 보스 피해 x1.25'),
  L('diamond-storm', 'rock', null, '배우는 순간 급소 +30%, 회피 +10%', p => { p.crit += 0.3; p.dodge += 0.1; }),
];
// 전설의 포켓몬 → 상징적인 기술
const LEGEND_MOVE = { 144: 'sheer-cold', 145: 'fusion-bolt', 146: 'sacred-fire', 150: 'psystrike', 151: 'psystrike', 243: 'fusion-bolt', 244: 'sacred-fire', 245: 'origin-pulse',
  249: 'aeroblast', 250: 'sacred-fire', 251: 'seed-flare', 377: 'thousand-arrows', 378: 'sheer-cold', 379: 'behemoth-bash', 380: 'mist-ball', 381: 'luster-purge',
  382: 'origin-pulse', 383: 'precipice-blades', 384: 'dragon-ascent', 480: 'psystrike', 481: 'psystrike', 482: 'psystrike', 483: 'roar-of-time', 484: 'spacial-rend',
  487: 'shadow-force', 488: 'psystrike', 641: 'aeroblast', 642: 'fusion-bolt', 643: 'blue-flare', 644: 'fusion-bolt', 645: 'thousand-arrows', 646: 'sheer-cold',
  716: 'geomancy', 717: 'oblivion-wing', 718: 'thousand-arrows', 719: 'diamond-storm', 785: 'natures-madness', 786: 'natures-madness', 787: 'natures-madness',
  788: 'natures-madness', 791: 'sunsteel-strike', 792: 'moongeist-beam', 888: 'behemoth-blade', 889: 'behemoth-bash', 890: 'eternabeam',
  1001: 'ruination', 1002: 'ruination', 1003: 'ruination', 1004: 'ruination', 1007: 'collision-course', 1008: 'electro-drift' };
// [이름, 아이콘, 값, 소수 자리]
const STATS = [
  ['공격', 'muscle-band', p => p.dmg, 2], ['연사', 'quick-claw', p => 1 / p.fireDelay, 2], ['사거리', 'wide-lens', p => p.range * p.shotSpeed / TS, 1],
  ['탄속', 'zoom-lens', p => p.shotSpeed / 380, 2], ['속도', 'choice-scarf', p => p.speed / 200, 2], ['급소', 'scope-lens', p => p.crit * 100, 0],
];
const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
