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
  { id: 'evil1', name: '악마의 속삭임', desc: '악의 조직과 처음으로 거래했다' },
  { id: 'evilitem', name: '어둠의 보물', desc: '악의 조직 전용 기술이나 도구를 손에 넣었다' },
  { id: 'evil8', name: '완전한 타락', desc: '한 판에서 악의 조직과 8번 모두 거래했다' },
  { id: 'justice', name: '꺾이지 않는 정의', desc: '한 판에서 악의 조직의 거래를 8번 모두 거절했다' },
  { id: 'evilboss', name: '조직 괴멸', desc: '악의 조직의 보스를 쓰러뜨렸다' },
  { id: 'rivalgift', name: '라이벌의 믿음', desc: '라이벌에게서 조건 없는 최고의 거래를 받았다' },
  { id: 'formchange', name: '진정한 모습', desc: '전용 도구로 전설의 포켓몬의 모습을 바꿨다' },
  { id: 'ultra', name: '빛을 되찾은 자', desc: '울트라네크로즈마가 되었다' },
  { id: 'trainer40', name: '도로의 지배자', desc: '한 판에서 필드 트레이너 40명을 이겼다' },
  { id: 'subchamp', name: '준전설의 긍지', desc: '준전설의 포켓몬으로 챔피언이 되었다' },
  { id: 'mythchamp', name: '환상의 챔피언', desc: '환상의 포켓몬으로 챔피언이 되었다' },
  // 2026-11-25: 도감·이로치·전설 각성·숨은 조합
  { id: 'seen100', name: '관찰력', desc: '도감에서 포켓몬 100마리를 발견했다' },
  { id: 'seen300', name: '걸어 다니는 도감', desc: '도감에서 포켓몬 300마리를 발견했다' },
  { id: 'dex400', name: '도감 400', desc: '도감에 포켓몬 400마리를 등록했다' },
  { id: 'rdexseen', name: '지방 탐험가', desc: '한 지방 도감의 포켓몬을 모두 발견했다' },
  { id: 'rdexfull', name: '지방 도감 완성', desc: '한 지방 도감의 포켓몬을 모두 쓰러뜨렸다' },
  { id: 'shiny5', name: '반짝이 수집가', desc: '서로 다른 이로치 포켓몬 5마리를 도감에 등록했다' },
  { id: 'shiny20', name: '빛나는 도감', desc: '서로 다른 이로치 포켓몬 20마리를 도감에 등록했다' },
  { id: 'awaken', name: '깨어난 힘', desc: '전설의 포켓몬으로 라이벌을 이겨 전용 기술을 깨달았다' },
  { id: 'combo1', name: '숨은 조합', desc: '숨은 기술 조합을 처음으로 찾아냈다' },
  { id: 'combo3', name: '조합의 달인', desc: '한 판에서 숨은 기술 조합 3개를 동시에 켰다' },
  { id: 'psymaster', name: '염동력자', desc: '사이코키네시스와 함께 염동 조합을 켰다' },
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
  if (DEX.size >= 400) ach('dex400');
  if (SEEN.size >= 100) ach('seen100');
  if (SEEN.size >= 300) ach('seen300');
  if (region?.dex?.every(id => SEEN.has(id))) ach('rdexseen');
  if (region?.dex?.every(id => DEX.has(id))) ach('rdexfull');
  if (SHINY.size >= 5) ach('shiny5');
  if (SHINY.size >= 20) ach('shiny20');
  if (p.combos?.size >= 1) ach('combo1');
  if (p.combos?.size >= 3) ach('combo3');
  if (['psyflame', 'psyspark', 'psychill', 'psyegg', 'psycut', 'psystar', 'psyshade', 'psyleaf', 'psyburn'].some(combo)) ach('psymaster');
  if (p.level >= 50) ach('lv50');
  if (p.money >= 50000) ach('rich');
  if (p.items.length >= 15) ach('items15');
  if ((p.trainerWins ?? 0) >= 15) ach('trainer15');
  if ((p.trainerWins ?? 0) >= 40) ach('trainer40');
  if (p.legendForm) ach('formchange');
  if (p.legendForm === 'necrozma-ultra') ach('ultra');
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
  if (isSubLegend(p.startId)) ach('subchamp');
  if (MYTHICAL.has(p.startId)) ach('mythchamp');
  checkAch();
}
