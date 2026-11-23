// 화면: Esc 메뉴, 상점, 지방·스타팅 선택, 도전과제, 결과 화면
// ---------- 메뉴 (Esc): 원작처럼 도감, 포켓몬, 가방, 트레이너 카드 ----------
const MENU = ['포켓몬 도감', '포켓몬', '가방', '트레이너 카드', '지도', '설정', '닫기', '그만두기'];
const BAG_TABS = ['도구', '중요한 물건', '기술'];
const DEX_COLS = 8, DEX_ROWS = 4;
const openMenu = () => { menu = { screen: 'root', cursor: 0, tab: 0, sel: 0, confirm: false }; state = 'pause'; };
const bagList = () => menu.tab === 0 ? player.items.filter(i => i.r && i.r !== 'k') : menu.tab === 1 ? player.items.filter(i => i.r === 'k') : [...player.moves].map(moveDef);

function menuKey(code) {
  const up = code === 'ArrowUp' || code === 'KeyW', down = code === 'ArrowDown' || code === 'KeyS', left = code === 'ArrowLeft' || code === 'KeyA', right = code === 'ArrowRight' || code === 'KeyD';
  const ok = ['Enter', 'KeyZ', 'Space', 'KeyE'].includes(code), back = code === 'Escape' || code === 'KeyX';
  if (menu.screen === 'root') {
    const confirm = menu.confirm;
    menu.confirm = false;
    if (up) menu.cursor = (menu.cursor + MENU.length - 1) % MENU.length;
    if (down) menu.cursor = (menu.cursor + 1) % MENU.length;
    if (up || down) sfx('menu');
    if (back) state = 'play';
    if (!ok) return;
    const item = MENU[menu.cursor];
    if (item === '닫기') state = 'play';
    else if (item === '그만두기') { if (confirm) { clearSave(); state = 'region'; } else menu.confirm = true; }
    else Object.assign(menu, { screen: item, sel: 0, tab: 0 });
    sfx('select');
    return;
  }
  if (back || (ok && !['가방', '포켓몬 도감', '설정'].includes(menu.screen))) { menu.screen = 'root'; return; }
  if (menu.screen === '설정') {
    if (up || down) { menu.sel = (menu.sel + (down ? 1 : 2)) % 3; sfx('menu'); }
    if (menu.sel === 2) { if (left || right || ok) { EASY = !EASY; store.set(EASY_KEY, EASY); sfx('menu'); } }
    else { const k = ['bgm', 'sfx'][menu.sel]; if (left || right) { VOL[k] = clamp(Math.round((VOL[k] + (right ? 0.1 : -0.1)) * 10) / 10, 0, 1); applyVolume(); sfx('menu'); } }
  }
  if (menu.screen === '가방') {
    if (left || right) { menu.tab = (menu.tab + (right ? 1 : 2)) % 3; menu.sel = 0; }
    if (up) menu.sel = Math.max(0, menu.sel - 1);
    if (down) menu.sel = Math.max(0, Math.min(bagList().length - 1, menu.sel + 1));
  }
  if (menu.screen === '포켓몬 도감') menu.sel = clamp(menu.sel + (up ? -DEX_COLS : down ? DEX_COLS : left ? -1 : right ? 1 : 0), 0, region.dex.length - 1);
}

function menuBox(x, y, w, h) {
  ctx.fillStyle = '#f8f8f0'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#303040'; ctx.lineWidth = 4; ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
  ctx.strokeStyle = '#8890a8'; ctx.lineWidth = 2; ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);
}
function plain(s, x, y, size, color = '#202028', align = 'left') { ctx.font = `${size}px Galmuri11, monospace`; ctx.textAlign = align; ctx.fillStyle = color; ctx.fillText(s, x, y); }
// 정해진 폭 안에서 띄어쓰기 단위로 줄을 나눈다
function lines(s, w, size) {
  ctx.font = `${size}px Galmuri11, monospace`;
  const out = []; let line = '';
  for (const word of s.split(' ')) { const t = line ? `${line} ${word}` : word; if (!line || ctx.measureText(t).width <= w) line = t; else { out.push(line); line = word; } }
  return [...out, line];
}
function wrap(s, x, y, w, size, color = '#303040', draw = plain, align = 'left') {
  for (const l of lines(s, w, size)) { draw(l, x, y, size, color, align); y += size + 5; }
  return y;
}

function drawMenu() {
  if (menu.screen === '지도') return drawBigMap();
  if (menu.screen === 'root') {
    const w = 210, h = 30 + MENU.length * 34, x = SIDE + W - w - 10, y = HUD + 10;
    menuBox(x, y, w, h);
    MENU.forEach((m, i) => { plain(m, x + 40, y + 42 + i * 34, 16); if (i === menu.cursor) plain('▶', x + 18, y + 42 + i * 34, 16); taps.push({ x, y: y + 20 + i * 34, w, h: 32, fn: () => { menu.cursor = i; menuKey('Enter'); } }); });
    if (menu.confirm) { menuBox(SIDE + 10, HUD + H - 92, W - 240, 82); plain('정말 그만둘까요? 지금까지의 모험과 이어하기 기록이 사라집니다.', SIDE + 30, HUD + H - 54, 13); plain('한 번 더 고르면 지방 선택으로 돌아갑니다.', SIDE + 30, HUD + H - 30, 12, '#904040'); }
    return;
  }
  menuBox(SIDE + 8, HUD + 8, W - 16, H - 16);
  const x = SIDE + 30, y = HUD + 40;
  plain(menu.screen, x, y, 18, '#303060');
  plain('Esc 돌아가기', SIDE + W - 30, y, 11, '#707080', 'right');
  ({ '포켓몬': drawPartyScreen, '가방': drawBagScreen, '포켓몬 도감': drawDexScreen, '트레이너 카드': drawCardScreen, '설정': drawSettingsScreen })[menu.screen](x, y);
}

function drawSettingsScreen(x, y) {
  plain('↑ ↓ 고르기 · ← → 조절 · N 키 = 모든 소리 끄기/켜기 · F 키 = 전체 화면', x + 20, y + 40, 12, '#707080');
  [['배경음', 'bgm'], ['효과음', 'sfx']].forEach(([label, k], i) => {
    const yy = y + 90 + i * 60, on = menu.sel === i;
    if (on) plain('▶', x + 20, yy, 15);
    plain(label, x + 44, yy, 15);
    for (let j = 0; j < 10; j++) { ctx.fillStyle = j < Math.round(VOL[k] * 10) ? (on ? '#304080' : '#6070a0') : '#c8cce0'; ctx.fillRect(x + 150 + j * 30, yy - 16, 24, 20); }
    plain(`${Math.round(VOL[k] * 100)}%`, x + 470, yy, 14, '#303060');
  });
  // 쉬움 모드: 받는 피해 절반
  const yy = y + 210, on = menu.sel === 2;
  if (on) plain('▶', x + 20, yy, 15);
  plain('쉬움 모드', x + 44, yy, 15);
  ctx.fillStyle = EASY ? '#40a060' : '#c8cce0'; ctx.fillRect(x + 150, yy - 16, 60, 20); plain(EASY ? '켜짐' : '꺼짐', x + 180, yy, 12, EASY ? '#fff' : '#606070', 'center');
  plain('받는 피해가 절반이 됩니다. 액션이 서툴거나 휴대폰으로 할 때 추천', x + 230, yy, 11, '#707080');
  taps.push({ x: x + 20, y: yy - 22, w: 600, h: 30, fn: () => { menu.sel = 2; EASY = !EASY; store.set(EASY_KEY, EASY); } });
  if (muted) plain('지금은 N 키로 소리를 꺼 둔 상태입니다', x + 44, y + 260, 12, '#904040');
}

function drawPartyScreen(x, y) {
  const p = player, m = p.mon, next = p.evo[0];
  ctx.fillStyle = '#dde6f0'; ctx.fillRect(x, y + 14, 200, 210);
  drawActor({ mon: m, x: x + 100, y: y + 200, flip: false }, 2, 1, true);
  plain(m.name, x + 220, y + 40, 18);
  plain(`Lv.${p.level}`, x + 220, y + 64, 14);
  m.types.forEach((t, i) => { ctx.fillStyle = TYPE_COLOR[t]; ctx.fillRect(x + 300 + i * 64, y + 50, 58, 20); plain(TYPE_KO[t], x + 329 + i * 64, y + 65, 12, '#fff', 'center'); });
  const bar = (yy, frac, color) => { ctx.fillStyle = '#c8c8c8'; ctx.fillRect(x + 220, yy, 200, 6); ctx.fillStyle = color; ctx.fillRect(x + 220, yy, 200 * clamp(frac, 0, 1), 6); };
  plain(`체력 ${p.hp / 2} / ${p.maxHp / 2}칸`, x + 220, y + 92, 13);
  bar(y + 98, p.hp / p.maxHp, p.hp / p.maxHp > 0.5 ? '#48c048' : p.hp / p.maxHp > 0.2 ? '#e0c030' : '#e04040');
  plain(`경험치 ${p.exp} / ${expNeed(p.level)}`, x + 220, y + 122, 13);
  bar(y + 128, p.exp / expNeed(p.level), '#4ac0ff');
  plain(next ? `Lv.${next.level}에 ${MON[next.id]?.name}(으)로 진화` : '더 이상 진화하지 않는다', x + 220, y + 154, 12, '#506080');
  const ab = curAb(); if (ab) { plain(`특성 ${ab.ko}`, x + 220, y + 178, 13, '#303060'); lines(ab.desc, 230, 10).slice(0, 2).forEach((l, j) => plain(l, x + 220, y + 194 + j * 12, 10, '#505060')); }
  STATS.forEach(([label, , f, dg], i) => plain(`${label} ${f(p).toFixed(dg)}${label === '급소' ? '%' : ''}`, x + 450 + (i % 2) * 110, y + 40 + Math.floor(i / 2) * 22, 12));
  plain(`회피 ${Math.round(p.dodge * 100)}%`, x + 450, y + 110, 12);
  plain(`이로치 확률 ${+(shinyRate() * 100).toFixed(1)}%`, x + 560, y + 110, 12, '#b08000');
  plain('기술', x, y + 252, 14, '#303060');
  const moves = [...p.moves];
  for (let i = 0; i < MAX_MOVES; i++) {
    const d = moveDef(moves[i]), yy = y + 276 + i * 22;
    nameText(d, d ? `${moves[i] === p.zMove ? 'Z ' : ''}${d.name}` : '-', x + 10, yy, 13, d ? (d.legend ? '#b08000' : mix(TYPE_COLOR[d.type], '#000000', 0.35)) : '#999', 'left', plain);
    if (d) lines(d.desc, 470, 10).slice(0, 2).forEach((l, j) => plain(l, x + 180, yy - 5 + j * 11, 10, '#505060'));
  }
}

function drawBagScreen(x, y) {
  BAG_TABS.forEach((t, i) => { ctx.fillStyle = i === menu.tab ? '#304080' : '#c8cce0'; ctx.fillRect(x + i * 150, y + 14, 140, 26); plain(t, x + i * 150 + 70, y + 32, 13, i === menu.tab ? '#fff' : '#303040', 'center'); });
  plain('← → 주머니 · ↑ ↓ 고르기', x + 470, y + 32, 11, '#707080');
  const list = bagList(), per = 8, start = clamp(menu.sel - per + 1, 0, Math.max(0, list.length - per)), sel = list[menu.sel];
  if (!list.length) plain('비어 있다', x + 20, y + 80, 13, '#888');
  list.slice(start, start + per).forEach((it, i) => {
    const idx = start + i, yy = y + 56 + i * 34;
    if (idx === menu.sel) { ctx.fillStyle = '#e4e8f8'; ctx.fillRect(x, yy - 2, 420, 32); plain('▶', x + 4, yy + 20, 13); }
    ctx.drawImage(IMG[it.tm ?? it.id], x + 24, yy, 28, 28);
    nameText(it, it.name, x + 60, yy + 20, 13, it.legend || it.r === 'l' ? '#9050c0' : it.r === 'r' ? '#a07000' : '#202028', 'left', plain);
  });
  if (!sel) return;
  menuBox(x + 440, y + 56, 230, 230);
  ctx.drawImage(IMG[sel.tm ?? sel.id], x + 525, y + 80, 60, 60);
  plain(sel.name, x + 555, y + 166, 14, '#202028', 'center');
  wrap(sel.desc, x + 456, y + 194, 200, 12);
  plain(sel.tm ? (sel.legend ? `${TYPE_KO[sel.type]} 타입 · 아주 희귀한 기술` : `${TYPE_KO[sel.type]} 타입 기술`) : { c: '흔한 도구', r: '희귀한 도구', l: '아주 희귀한 도구', k: '중요한 물건' }[sel.r], x + 456, y + 272, 11, '#707080');
}

function drawDexScreen(x, y) {
  const p = player, ids = region.dex, cw = 82, ch = 78;
  plain(`발견 ${ids.filter(id => p.seen.has(id)).length} · 쓰러뜨림 ${ids.filter(id => p.defeated[id]).length} / ${ids.length}`, x + 170, y, 13, '#505060');
  const row0 = clamp(Math.floor(menu.sel / DEX_COLS) - DEX_ROWS + 1, 0, Math.max(0, Math.ceil(ids.length / DEX_COLS) - DEX_ROWS));
  for (let r = 0; r < DEX_ROWS; r++) for (let c = 0; c < DEX_COLS; c++) {
    const i = (row0 + r) * DEX_COLS + c, id = ids[i];
    if (id === undefined) continue;
    const cx = x + c * cw, cy = y + 16 + r * ch, m = MON[id];
    ctx.fillStyle = i === menu.sel ? '#d8e0ff' : '#eceef4'; ctx.fillRect(cx, cy, cw - 4, ch - 4);
    if (p.seen.has(id)) { const b = m.box, s = 0.6; ctx.drawImage(m.img, cx + cw / 2 - 2 - (b.x0 + b.x1) / 2 * s, cy + ch - 10 - b.y1 * s, 96 * s, 96 * s); }
    else plain('?', cx + cw / 2 - 2, cy + 48, 22, '#a0a4b4', 'center');
    plain(String(id).padStart(4, '0'), cx + 4, cy + 12, 9, '#808090');
  }
  const id = ids[menu.sel], m = MON[id];
  plain(p.seen.has(id) ? `No.${String(id).padStart(4, '0')} ${m.name} · ${m.types.map(t => TYPE_KO[t]).join('/')} · 쓰러뜨림 ${p.defeated[id] ?? 0}마리` : `No.${String(id).padStart(4, '0')} ???`, x, y + 16 + DEX_ROWS * ch + 18, 13);
}

function drawCardScreen(x, y) {
  const p = player, t = Math.floor(p.time), kills = Object.values(p.defeated).reduce((a, b) => a + b, 0);
  ctx.fillStyle = '#e8eef8'; ctx.fillRect(x, y + 14, 650, 340);
  plain(`${region.name}지방 트레이너`, x + 20, y + 48, 16);
  [['함께하는 포켓몬', `${p.mon.name} Lv.${p.level}`], ['돈', `₽ ${p.money.toLocaleString()}`], ['도감', `${region.dex.filter(id => p.seen.has(id)).length}마리 발견`],
   ['쓰러뜨린 포켓몬', `${kills}마리`], ['모험 시간', `${Math.floor(t / 3600)}:${String(Math.floor(t / 60) % 60).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`], ['전설 해금', `${loadUnlocked().length}마리`], ['챔피언이 된 지방', `${CLEARED.size} / ${REGIONS.length}`], ['도전과제', `${ACHIEVED.size} / ${ACH.length}`], ['상대 강함 (화력 따라가기)', `x${powerScale(p.beaten.size).toFixed(1)}`]]
    .forEach(([k, v], i) => { plain(k, x + 20, y + 84 + i * 28, 13, '#505060'); plain(v, x + 300, y + 84 + i * 28, 13, '#202028', 'right'); });
  plain('배지', x + 340, y + 48, 14, '#303060');
  region.gyms.forEach((g, i) => {
    const bx = x + 340 + (i % 4) * 75, by = y + 62 + Math.floor(i / 4) * 100, got = p.beaten.has(i);
    ctx.fillStyle = got ? TYPE_COLOR[g.type] : '#c8ccd8'; ctx.beginPath(); ctx.arc(bx + 28, by + 28, 24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = got ? '#fff' : '#e8eaf0'; ctx.fillRect(bx + 20, by + 20, 16, 16);
    plain(g.leader, bx + 28, by + 72, 11, got ? '#202028' : '#909098', 'center');
  });
}

function drawShop() {
  const p = player, n = shopNpc, x = SIDE + 100, y = HUD + 40, sp = shopSpecial(n);
  ctx.fillStyle = 'rgba(0,0,0,.92)'; ctx.fillRect(x, y, 520, 350); ctx.strokeStyle = '#4a80d8'; ctx.strokeRect(x, y, 520, 350);
  text('프렌들리숍', x + 260, y + 28, 16, '#fff');
  text(`가진 돈 ₽ ${p.money.toLocaleString()}   (숫자 키로 구입, Esc 닫기)`, x + 260, y + 50, 11, '#fd6');
  SHOP.forEach((s, i) => {
    const yy = y + 76 + i * 30;
    ctx.drawImage(IMG[s.id], x + 16, yy - 18, 26, 26);
    taps.push({ x, y: yy - 20, w: 520, h: 28, fn: () => buy(i) });
    text(`${i + 1}. ${s.name}`, x + 48, yy, 13, '#fff', 'left'); text(s.desc, x + 210, yy, 11, '#aaa', 'left'); text(`₽${shopPrice(s)}`, x + 500, yy, 12, '#fd6', 'right');
  });
  const yy = y + 76 + SHOP.length * 30 + 6;
  if (sp) {
    const it = sp.kind === 'tm' ? sp.tm : sp.item;
    ctx.drawImage(IMG[sp.kind === 'tm' ? sp.tm.tm : sp.item.id], x + 16, yy - 18, 26, 26);
    taps.push({ x, y: yy - 20, w: 520, h: 28, fn: () => buy(SHOP.length) });
    nameText(it, `9. ${sp.kind === 'tm' ? '기술머신 ' : ''}${it.name}`, x + 48, yy, 13, '#ff8'); text(it.desc, x + 260, yy, 10, '#aaa', 'left'); text(`₽${specialPrice(sp)}`, x + 500, yy, 12, '#fd6', 'right');
  } else text('9. (오늘의 특가는 팔렸습니다)', x + 48, yy, 12, '#666', 'left');
}

// 희귀한 것의 이름: 글씨 둘레가 은은하게 숨 쉬듯 빛난다
function glowText(s, x, y, size, color, glow = color, align = 'center', draw = text) {
  ctx.save(); ctx.shadowColor = glow; ctx.shadowBlur = 7 + Math.sin(now * 4 + x * 0.01) * 3;
  draw(s, x, y, size, color, align);
  ctx.restore();
}
// 아이템·기술 등급에 따른 빛 색: 희귀 금색, 아주 희귀·특별한 기술 보라
const rareGlow = it => it?.r === 'g' ? '#f8c' : it?.legend || it?.r === 'l' ? '#c8f' : it?.r === 'r' ? '#fc4' : null;
function nameText(it, s, x, y, size, color, align = 'left', draw = text) {
  const g = rareGlow(it);
  g ? glowText(s, x, y, size, color, g, align, draw) : draw(s, x, y, size, color, align);
}

function drawLock(x, y) {
  ctx.fillStyle = '#444'; ctx.fillRect(x - 12, y - 2, 24, 20);
  ctx.strokeStyle = '#444'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y - 4, 8, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = '#222'; ctx.fillRect(x - 2, y + 4, 4, 7);
}

// 도전과제 달성 알림: 오른쪽 아래에서 미끄러져 들어와 4초쯤 머문다
function drawToasts() {
  let bottom = CH - 12;
  toasts.slice(0, 3).forEach(o => {
    const w = 270, h = o.a.reward ? 66 : 52, slide = Math.max(0, Math.min(1, o.t / 0.3, (5 - o.t) / 0.4)), x = CW - (w + 12) * slide, y = bottom - h;
    bottom = y - 8;
    ctx.fillStyle = 'rgba(16,16,24,.92)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#fd6'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    drawTrophy(x + 22, y + 26);
    text('도전과제 달성!', x + 44, y + 19, 11, '#fd6', 'left');
    glowText(o.a.name, x + 44, y + 39, 14, '#fff', '#fd6', 'left');
    if (o.a.reward) text(`보상: 다음 판부터 ${MON[o.a.reward]?.name ?? '새 포켓몬'}(으)로 시작 가능`, x + 44, y + 57, 10, '#8cf', 'left');
  });
}
function drawTrophy(x, y, on = true) {
  const c = on ? '#fd6' : '#444', d = on ? '#b8902a' : '#333';
  ctx.fillStyle = c; ctx.fillRect(x - 8, y - 10, 16, 10); ctx.fillRect(x - 3, y, 6, 5); ctx.fillRect(x - 7, y + 5, 14, 4);
  ctx.fillStyle = d; ctx.fillRect(x - 12, y - 9, 4, 6); ctx.fillRect(x + 8, y - 9, 4, 6); ctx.fillRect(x - 8, y - 2, 16, 2);
}

// 도전과제 목록 (지방 선택 화면에서 T)
function drawAchList() {
  ctx.fillStyle = '#16161e'; ctx.fillRect(0, 0, CW, CH);
  text(`도전과제 ${ACHIEVED.size} / ${ACH.length}`, CW / 2, 40, 24, '#fd6');
  text(`${TOUCH ? '화면을 누르면 돌아가기' : 'T 또는 Esc = 돌아가기'} · 보상이 있는 과제를 달성하면 그 포켓몬으로 시작할 수 있습니다`, CW / 2, 64, 11, '#888');
  taps.push({ x: 0, y: 0, w: CW, h: CH, fn: () => state = 'region' });
  const cols = 3, cw = (CW - 64) / cols, rh = 34;
  ACH.forEach((a, i) => {
    const on = ACHIEVED.has(a.id), x = 16 + (i % cols) * (cw + 16), y = 80 + Math.floor(i / cols) * rh;
    ctx.fillStyle = on ? '#262634' : '#1c1c24'; ctx.fillRect(x, y, cw, rh - 4);
    drawTrophy(x + 18, y + 18, on);
    on ? glowText(a.name, x + 36, y + 13, 11, '#fff', '#fd6', 'left') : text(a.name, x + 36, y + 13, 11, '#777', 'left');
    text(a.desc, x + 36, y + 26, 9, on ? '#bbb' : '#555', 'left');
    if (a.reward && MON[a.reward]) text(`보상 ${MON[a.reward].name}`, x + cw - 8, y + 14, 10, on ? '#8cf' : '#456', 'right');
  });
}

const regionCard = i => ({ x: 20 + (i % 5) * (CW - 40) / 5, y: 120 + Math.floor(i / 5) * 150, w: (CW - 40) / 5 - 10, h: 140 });

function drawRegionSelect() {
  ctx.fillStyle = '#16161e'; ctx.fillRect(0, 0, CW, CH);
  text('포켓몬 던전 로그', CW / 2, 54, 32, '#ff8');
  text('모험할 지방을 고르세요 (1~9 키, 0 = 랜덤, 또는 클릭) · T = 도전과제 · Esc = 시작 화면', CW / 2, 90, 14, '#aaa');
  text(acct.user && !acct.user.anon ? `${acct.user.name} 님 · 클라우드 저장` : '게스트 · 이 기기에 저장', 20, 30, 12, acct.user && !acct.user.anon ? '#8cf' : '#999', 'left');
  text(`도전과제 ${ACHIEVED.size} / ${ACH.length}`, CW - 20, 30, 12, '#fd6', 'right');
  taps.push({ x: CW - 160, y: 10, w: 160, h: 30, fn: () => state = 'ach' });
  const sv = loadSave();
  if (sv) {
    const sp = sv.player, x = CW / 2 - 300, y = 418;
    taps.push({ x, y, w: 600, h: 30, fn: continueRun });
    ctx.fillStyle = '#1e2a3a'; ctx.fillRect(x, y, 600, 30); ctx.strokeStyle = '#8cf'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, 598, 28);
    glowText(`C · Enter = 이어하기: ${sv.region}지방 · ${sv.monName} Lv.${sp.level} · 배지 ${sp.beaten.length}개`, CW / 2, y + 20, 13, '#fff', '#8cf');
  }
  [...REGIONS, null].forEach((rg, i) => {
    const c = regionCard(i), open = !rg || regionOpen(i), done = rg && CLEARED.has(rg.name);
    ctx.fillStyle = open ? '#23232e' : '#18181f'; ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = !rg ? '#d4a017' : done ? '#8cf' : open ? '#555' : '#2c2c36'; ctx.lineWidth = 2; ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
    text(`${(i + 1) % 10}`, c.x + 16, c.y + 24, 14, open ? '#888' : '#444');
    if (!open) {
      drawLock(c.x + c.w / 2, c.y + 40);
      text(`${rg.name}지방`, c.x + c.w / 2, c.y + 84, 18, '#555');
      wrap(`${REGIONS[i - 1].name}지방 챔피언이 되면 열림`, c.x + c.w / 2, c.y + 106, c.w - 16, 10, '#666', text, 'center');
      return;
    }
    text(rg ? `${rg.name}지방` : '랜덤 지방', c.x + c.w / 2, c.y + 68, 20, rg ? '#fff' : '#ff8');
    if (rg) text(`장소 ${Object.keys(rg.places).length}곳`, c.x + c.w / 2, c.y + 98, 11, '#999');
    if (done) text('챔피언 달성', c.x + c.w / 2, c.y + 122, 11, '#8cf');
    if (!rg) text('열린 지방 중에서', c.x + c.w / 2, c.y + 98, 11, '#999');
  });
  text(loadSave() ? '새 지방을 고르면 이어하기 기록은 사라집니다' : `도감 ${DEX.size}마리 · 전설·환상의 포켓몬을 쓰러뜨리면 다음 판 스타팅으로 고를 수 있습니다 (스타팅은 그 지방 세대 3마리)`, CW / 2, 470, 12, loadSave() ? '#f99' : '#8cf');
}

// 스타팅 도감: 8x3 칸씩 페이지로 넘긴다. 오른쪽에 고른 포켓몬의 능력치와 시작 기술
const SEL_COLS = 8, SEL_ROWS = 3, SEL_PAGE = SEL_COLS * SEL_ROWS;
let selCur = 0, selShiny = false;
function starterCards() {
  const top = Math.floor(selCur / SEL_PAGE) * SEL_PAGE;
  return starterIds().slice(top, top + SEL_PAGE).map((id, i) => ({ id, i: top + i, x: 20 + (i % SEL_COLS) * 76, y: 112 + Math.floor(i / SEL_COLS) * 100, w: 72, h: 96 }));
}

function drawSelect() {
  ctx.fillStyle = '#16161e'; ctx.fillRect(0, 0, CW, CH);
  const ids = starterIds();
  text(`${region.name}지방 모험`, CW / 2, 50, 30, '#ff8');
  text('스타팅 포켓몬을 고르세요 (방향키 이동 · Enter 시작 · 숫자 키 · 클릭, Esc = 지방 다시 고르기)', CW / 2, 82, 13, '#aaa');
  starterCards().forEach((c, i) => {
    const m = MON[c.id], b = m.box, s = 0.7, cx = c.x + c.w / 2, on = c.i === selCur;
    ctx.fillStyle = LEGEND_MOVE[c.id] ? '#2e2440' : '#23232e'; ctx.fillRect(c.x, c.y, c.w, c.h);
    if (on) { ctx.strokeStyle = '#ff8'; ctx.lineWidth = 2; ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2); }
    ctx.drawImage(m.img, cx - (b.x0 + b.x1) / 2 * s, c.y + 72 - b.y1 * s, 96 * s, 96 * s);
    if (i < 9) text(`${i + 1}`, c.x + 9, c.y + 14, 10, '#777');
    if (shinyOk(c.id)) text('★', c.x + c.w - 10, c.y + 15, 11, '#fd6');
    text(m.name, cx, c.y + 88, 11, on ? '#ff8' : '#ddd');
  });
  const pages = Math.ceil(ids.length / SEL_PAGE);
  if (pages > 1) text(`${Math.floor(selCur / SEL_PAGE) + 1} / ${pages} 페이지`, 324, 430, 12, '#888');
  text(`도감 ${DEX.size}마리 · 전설·환상을 쓰러뜨리면 도감 번호 순으로 여기에 추가됩니다`, 324, 452, 11, '#777');
  // 오른쪽 상세
  const m = MON[ids[selCur]], st = baseOf(m), mv = moveDef(LEGEND_MOVE[m.id] ?? typeMove(m)), px = 760;
  ctx.fillStyle = '#23232e'; ctx.fillRect(650, 112, 220, 296);
  drawShadow(px, 260, (m.box.x1 - m.box.x0) * 1.5, 0);
  const shiny = selShiny && shinyOk(m.id);
  if (shiny) loadShiny(m);
  drawActor({ mon: m, x: px, y: 260, flip: false, shiny }, 1.5, 1, true);
  if (shinyOk(m.id)) text(shiny ? '★ 이로치 (X 키로 바꾸기)' : '이로치 있음 (X 키)', px, 128, 11, '#fd6');
  text(m.name, px, 286, 18, LEGEND_MOVE[m.id] ? (isSubLegend(m.id) ? '#9cf' : '#c8f') : '#fff');
  if (LEGEND_MOVE[m.id]) text(isSubLegend(m.id) ? '준전설' : MYTHICAL.has(m.id) ? '환상' : '전설', px, 146, 11, isSubLegend(m.id) ? '#9cf' : '#c8f');
  text(m.types.map(t => TYPE_KO[t]).join('/'), px, 306, 12, TYPE_COLOR[m.types[0]]);
  text(`체력 ${st.hp / 2}칸 · 공격 ${st.dmg.toFixed(1)} · 속도 ${(st.speed / 200).toFixed(2)}`, px, 324, 11, '#ccc');
  const ab = monAb(m); if (ab) text(`특성 ${ab.ko}`, px, 341, 11, '#9cf');
  if (mv) { nameText(mv, `시작 기술 ${mv.name}`, px, 362, 13, mv.legend ? '#fd6' : TYPE_COLOR[mv.type], 'center'); wrap(mv.desc, px, 380, 200, 10, '#aaa', text, 'center'); }
  text('WASD 이동 · 방향키 공격 · E 대화 · 배지 8개 → 포켓몬리그 → 챔피언', CW / 2, CH - 14, 12, '#888');
}

function draw() {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.imageSmoothingEnabled = false;
  taps = [];
  if (state === 'loading' || state === 'error') {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, CW, CH);
    return text(state === 'loading' ? '불러오는 중...' : loadError, CW / 2, CH / 2, 16);
  }
  if (state === 'title') return drawTitle(), drawToasts();
  if (state === 'region') return drawRegionSelect(), drawToasts();
  if (state === 'ach') return drawAchList(), drawToasts();
  if (state === 'select') return drawSelect();
  drawPlay();
  if (state === 'warp') drawWarp();
  if (state === 'play') drawTutorial();
  if (state === 'map') drawBigMap();
  if (state === 'pause') drawMenu();
  if (state === 'learn') drawLearn();
  if (state === 'zpick') drawZPick();
  if (state === 'shop') drawShop();
  if (state === 'deal') drawDeal();
  if (state === 'dead' || state === 'win') drawResult();
  drawToasts();
}

// 판 결과: 제목 → 기록 → 이번 판에 얻은 것 → 다음 목표
function drawResult() {
  const p = player, win = state === 'win', t = Math.floor(p.time);
  ctx.fillStyle = '#0c0c14'; ctx.fillRect(0, 0, CW, CH);
  taps.push({ x: 0, y: 0, w: CW, h: CH, fn: () => state = 'region' });
  win ? glowText(`${region.name}지방 챔피언이 되었다!`, CW / 2, 52, 28, '#ff8', '#fc4') : text(`${p.mon.name}는(은) 쓰러졌다...`, CW / 2, 52, 28, '#f66');
  if (!win && p.cause) text(`${p.cause}에 쓰러졌다`, CW / 2, 78, 14, '#f99');
  if (!win && p.lastHits?.length) text(`마지막에 맞은 공격: ${p.lastHits.map(h => `${h.who ? `${h.who}의 ` : ''}${h.move ?? `${TYPE_KO[h.type]} 공격`}(${h.d / 2}칸${h.heavy ? '·필살기' : ''})`).join(' → ')}`, CW / 2, 95, 11, '#c99');
  if (win && p.hoopaWin) glowText(`후파의 고리 너머에서 색이 다른 ${p.hoopaWin}을(를) 쓰러뜨렸다!`, CW / 2, 82, 14, '#fff', '#c8f');
  if (win && p.hoopaLost) text(`후파의 고리 너머의 ${p.hoopaLost}에게는 아쉽게 졌다`, CW / 2, 82, 14, '#c9a8ff');
  // 기록
  const kills = Object.values(p.defeated).reduce((a, b) => a + b, 0), rw = p.rival ? [...p.rival.done].length : 0;
  const rows = [['모험 시간', `${Math.floor(t / 3600)}:${String(Math.floor(t / 60) % 60).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`], ['레벨', `${p.mon.name} Lv.${p.level}`],
    ['배지', `${p.beaten.size} / ${region.gyms.length}`], ['쓰러뜨린 포켓몬', `${kills}마리`], ['새로 도감 등록', `${p.newDex ?? 0}마리`], ['라이벌 승리', p.rival ? `${rw} / ${RIVAL_EVENTS.length}` : '-'],
    ['모은 도구·기술', `${p.items.length}개`], ['가진 돈', `₽ ${p.money.toLocaleString()}`]];
  ctx.fillStyle = '#1c1c28'; ctx.fillRect(40, 100, 380, 300);
  text('이번 모험', 230, 126, 15, '#aaa');
  rows.forEach(([k, v], i) => { text(k, 64, 160 + i * 30, 13, '#aaa', 'left'); text(v, 396, 160 + i * 30, 13, '#fff', 'right'); });
  // 이번 판에 얻은 것
  ctx.fillStyle = '#1c1c28'; ctx.fillRect(460, 100, 380, 300);
  text('이번 판에 얻은 것', 650, 126, 15, '#aaa');
  const got = [
    ...(p.runAch ?? []).map(a => [`도전과제 · ${a.name}`, '#fd6']),
    ...(p.newStarters ?? []).filter(id => MON[id]).map(id => [`스타팅 해금 · ${MON[id].name}`, '#8cf']),
    ...(win && p.unlockedNext ? [[`새 지방 · ${p.unlockedNext}지방`, '#8cf']] : []),
  ];
  if (!got.length) text('이번에는 새로 얻은 것이 없다', 650, 170, 12, '#666');
  got.slice(0, 7).forEach(([s, c], i) => glowText(s, 484, 164 + i * 28, 13, '#fff', c, 'left'));
  if (got.length > 7) text(`외 ${got.length - 7}개`, 484, 164 + 7 * 28, 12, '#888', 'left');
  // 다음 목표: 아직 못 한 도전과제 중 앞의 두 개와 다음 지방
  const next = ACH.filter(a => !ACHIEVED.has(a.id)).slice(0, 2).map(a => `${a.name}: ${a.desc}`);
  const ri = REGIONS.findIndex((_, i) => !regionOpen(i));
  if (ri > 0) next.unshift(`${REGIONS[ri - 1].name}지방 챔피언이 되면 ${REGIONS[ri].name}지방이 열린다`);
  text('다음 목표', CW / 2, 420, 12, '#888');
  next.slice(0, 2).forEach((l, i) => text(l, CW / 2, 438 + i * 16, 11, '#bbb'));
  text(TOUCH ? '화면을 누르면 지방 선택으로' : 'R 키 또는 클릭 = 지방 선택으로', CW / 2, 482, 11, '#777');
}

function renderBar() {
  $('#bar').innerHTML = player.items.map(i => `<img src="${SPR}/items/${i.tm ?? i.icon ?? i.id}.png" title="${i.name}: ${i.desc}" alt="${i.name}">`).join('');
}

async function chooseRegion(i) {
  if (REGIONS[i] && !regionOpen(i)) return;
  state = 'loading'; region = REGIONS[i] ?? pick(REGIONS.filter((_, j) => regionOpen(j))); probeBgm(region);
  try { await loadRegion(region); selCur = 0; state = 'select'; }
  catch (e) { loadError = `로딩 실패: ${e.message}`; state = 'error'; }
}
const chooseStarter = i => { const id = starterIds()[i]; if (id) newRun(MON[id], selShiny && shinyOk(id)); };
const shinyOk = id => [...SHINY].some(s => (starterBase(s) ?? s) === id);
const SEL_STEP = { ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1, ArrowUp: -SEL_COLS, KeyW: -SEL_COLS, ArrowDown: SEL_COLS, KeyS: SEL_COLS };
