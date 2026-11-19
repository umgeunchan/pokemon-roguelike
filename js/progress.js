// 영구 기록: 지방 해금, 도전과제
// ---------- 해금: 지방은 앞 지방의 챔피언이 되면 열린다. 도전과제는 판이 끝나도 남고 일부는 스타팅 포켓몬을 준다 ----------
const CLEAR_KEY = 'pokemon-dungeon-cleared', ACH_KEY = 'pokemon-dungeon-ach';
const regionOpen = i => i === 0 || CLEARED.has(REGIONS[i - 1].name) || CLEARED.has(REGIONS[i].name);
// reward: 달성하면 다음 판부터 스타팅으로 고를 수 있는 포켓몬
const ACH = [
  { id: 'evolve', name: '첫 진화', desc: '포켓몬이 처음으로 진화했다' },
  { id: 'badge1', name: '첫 배지', desc: '체육관 배지를 처음 손에 넣었다' },
  { id: 'badge8', name: '배지 수집가', desc: '한 판에서 배지 8개를 모았다' },
  { id: 'perfect', name: '완벽한 승리', desc: '관장에게 한 대도 맞지 않고 이겼다' },
  { id: 'rival1', name: '라이벌 첫 승리', desc: '라이벌을 처음으로 이겼다' },
  { id: 'rival6', name: '숙명의 라이벌', desc: '한 판에서 라이벌을 6번 모두 이겼다', reward: 447 },
  { id: 'trainer15', name: '눈이 마주치면 승부', desc: '한 판에서 필드 트레이너 15명을 이겼다' },
  { id: 'legend1', name: '전설과의 조우', desc: '전설의 포켓몬을 처음으로 쓰러뜨렸다' },
  { id: 'legend5', name: '전설 사냥꾼', desc: '서로 다른 전설의 포켓몬 5마리를 쓰러뜨렸다' },
  { id: 'shiny', name: '반짝이는 발견', desc: '색이 다른 포켓몬을 쓰러뜨렸다' },
  { id: 'dex50', name: '도감 50', desc: '도감에 포켓몬 50마리를 등록했다' },
  { id: 'dex100', name: '도감 100', desc: '도감에 포켓몬 100마리를 등록했다', reward: 147 },
  { id: 'dex200', name: '도감 200', desc: '도감에 포켓몬 200마리를 등록했다' },
  { id: 'lv50', name: '베테랑', desc: '레벨 50에 도달했다' },
  { id: 'rich', name: '부자', desc: '돈을 50000원 넘게 모았다' },
  { id: 'items15', name: '가방이 무거워', desc: '한 판에서 도구와 기술을 15개 모았다' },
  { id: 'champion', name: '챔피언', desc: '처음으로 챔피언이 되었다', reward: 133 },
  { id: 'fast', name: '번개 같은 챔피언', desc: '40분 안에 챔피언이 되었다' },
  { id: 'pika', name: '최고의 파트너', desc: '피카츄(또는 라이츄)로 챔피언이 되었다', reward: 172 },
  { id: 'champ3', name: '세 지방의 챔피언', desc: '서로 다른 지방 3곳에서 챔피언이 되었다' },
  { id: 'champ9', name: '포켓몬 마스터', desc: '모든 지방에서 챔피언이 되었다', reward: 570 },
  { id: 'die', name: '다시 일어서기', desc: '처음으로 쓰러졌다. 다음엔 더 멀리!' },
];
const achRewards = () => ACH.filter(a => a.reward && ACHIEVED.has(a.id)).map(a => a.reward);
let toasts = [];
function ach(id) {
  if (ACHIEVED.has(id)) return;
  const a = ACH.find(a => a.id === id);
  ACHIEVED.add(id); store.set(ACH_KEY, [...ACHIEVED]);
  toasts.push({ a, t: 0 }); sfx('ach');
  if (player && state !== 'region' && state !== 'select') (player.runAch ??= []).push(a);
}
// 상태로 판정하는 도전과제. 플레이 중 0.5초마다, 그리고 판이 끝날 때 확인한다
function checkAch() {
  const p = player;
  if (!p) return;
  if (p.beaten.size >= 1) ach('badge1');
  if (p.beaten.size >= 8) ach('badge8');
  if (DEX.size >= 50) ach('dex50');
  if (DEX.size >= 100) ach('dex100');
  if (DEX.size >= 200) ach('dex200');
  if (p.level >= 50) ach('lv50');
  if (p.money >= 50000) ach('rich');
  if (p.items.length >= 15) ach('items15');
  if ((p.trainerWins ?? 0) >= 15) ach('trainer15');
  if (loadUnlocked().length >= 5) ach('legend5');
  if (CLEARED.size >= 3) ach('champ3');
  if (CLEARED.size >= REGIONS.length) ach('champ9');
}
// 챔피언을 이긴 순간: 지방 클리어 기록과 챔피언 도전과제
function recordClear() {
  const p = player, i = REGIONS.indexOf(region), next = REGIONS[i + 1], wasOpen = next && regionOpen(i + 1);
  CLEARED.add(region.name); store.set(CLEAR_KEY, [...CLEARED]);
  p.unlockedNext = next && !wasOpen ? next.name : null;
  ach('champion');
  if (p.time < 40 * 60) ach('fast');
  if (p.mon.id === 25 || p.mon.id === 26) ach('pika');
  checkAch();
}
