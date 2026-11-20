// 필드 그리기: 도트 텍스처, 타일, 캐릭터, 건물, 왼쪽 패널, 효과
// ---------- 그리기 ----------
const mix = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.substr(i, 2), 16) * (1 - t) + parseInt(b.substr(i, 2), 16) * t).toString(16).padStart(2, '0')).join('');

function arenaPal(type) {
  const c = TYPE_COLOR[type], a = mix(c, '#3a3a3a', 0.55);
  return { a, b: mix(a, '#000000', 0.07), wall: mix(c, '#101010', 0.75), brick: mix(c, '#101010', 0.6), speck: mix(a, '#000000', 0.18), rock: [mix('#3a3a3a', c, 0.2), mix('#787878', c, 0.2), mix('#ababab', c, 0.2)] };
}

// ---------- 도트 텍스처: 24x24 도트를 2배로 키운 48px 칸. 외곽선과 왼쪽 위 빛으로 원작 타일 느낌을 낸다 ----------
const TEX = {};
const tex = (key, make) => TEX[key] ??= make();
function paint(w, h, fn) {
  const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2;
  const g = c.getContext('2d');
  const set = (x, y, col) => { if (x < 0 || y < 0 || x >= w || y >= h) return; g.fillStyle = col; g.fillRect(x * 2, y * 2, 2, 2); };
  fn(set, g);
  return c;
}
const fill = (g, col) => { g.fillStyle = col; g.fillRect(0, 0, 48, 48); };
const GROUND = {
  R: ['#7cc458', '#62a842', '#a0dc7c'], T: ['#84ca60', '#6ab04a', '#a8e084'], F: ['#5ea444', '#488a32', '#7cbc5c'],
  C: ['#b09070', '#8c6c4c', '#c8a888'], N: ['#eef4fa', '#c8d8e8', '#ffffff'], D: ['#e8d098', '#ccb070', '#f6e4b8'],
  S: ['#a8a0c0', '#8a82a4', '#c4bed8'], W: ['#68a8e8', '#4c8cd0', '#9ccaf8'],
};
const isGreen = k => k === 'R' || k === 'T' || k === 'F';

// 바닥: 풀은 작은 풀 포기, 나머지는 알갱이 무늬
function groundTex(kind, v) {
  return tex(`g${kind}${v}`, () => paint(24, 24, (set, g) => {
    const [base, dark, light] = GROUND[kind], r = mulberry32(v * 131 + kind.charCodeAt(0));
    fill(g, base);
    if (isGreen(kind)) for (let i = 0; i < 6; i++) { const x = 1 + Math.floor(r() * 21), y = 2 + Math.floor(r() * 20); set(x, y, dark); set(x + 2, y, dark); set(x + 1, y + 1, dark); set(x + 1, y - 1, light); }
    else if (kind === 'W') for (let i = 0; i < 4; i++) { const x = Math.floor(r() * 20), y = Math.floor(r() * 22); for (let k = 0; k < 4; k++) set(x + k, y + (k === 0 || k === 3 ? 1 : 0), light); }
    else for (let i = 0; i < 10; i++) { const x = Math.floor(r() * 24), y = Math.floor(r() * 24); set(x, y, r() < 0.6 ? dark : light); if (kind === 'C' && r() < 0.3) { set(x + 1, y, dark); set(x + 2, y + 1, dark); } }
  }));
}

// 풀숲: 진한 외곽선의 뾰족한 풀잎이 엇갈려 줄지어 있다. 2프레임으로 흔들림
function tallGrassTex(frame) {
  return tex(`tg${frame}`, () => paint(24, 24, (set, g) => {
    fill(g, '#3e8a2c');
    for (let row = 0; row < 4; row++) for (let col = -1; col < 7; col++) {
      const bx = col * 4 + (row % 2) * 2 + (frame && row % 2 ? 1 : 0), by = row * 6;
      for (let yy = 0; yy < 6; yy++) for (let xx = -2; xx <= 2; xx++) {
        const half = yy * 0.45;
        if (Math.abs(xx) > half + 0.01) continue;
        set(bx + xx, by + yy, Math.abs(xx) > half - 0.9 ? '#1f5414' : yy < 2 ? '#b0e880' : xx < 0 ? '#78cc50' : '#5cb040');
      }
    }
  }));
}

function dirtTex(v) {
  return tex(`d${v}`, () => paint(24, 24, (set, g) => {
    fill(g, '#dcbf88');
    const r = mulberry32(v * 977 + 5);
    for (let i = 0; i < 9; i++) { const x = Math.floor(r() * 24), y = Math.floor(r() * 24); set(x, y, r() < 0.5 ? '#c4a46c' : '#eedcac'); }
  }));
}

// 마을 보도블록: 엇갈린 벽돌 무늬
const paveTex = () => tex('pave', () => paint(24, 24, (set, g) => {
  fill(g, '#e2d9c6');
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    const off = Math.floor(y / 6) % 2 ? 6 : 0;
    if (y % 6 === 5 || (x + off) % 12 === 11) set(x, y, '#bfb299');
    else if (y % 6 === 0 || (x + off) % 12 === 0) set(x, y, '#f2ecdf');
  }
}));

// 물가 길은 나무 다리
const bridgeTex = () => tex('bridge', () => paint(24, 24, (set, g) => {
  fill(g, '#c8945a');
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) { if (y % 6 === 5) set(x, y, '#7a5028'); else if (y % 6 === 0) set(x, y, '#e0b078'); if ((x === 3 || x === 20) && y % 6 === 2) set(x, y, '#5a3818'); }
}));

const seaTex = frame => tex(`sea${frame}`, () => paint(24, 24, (set, g) => {
  fill(g, '#3c78c8');
  const r = mulberry32(41);
  for (let i = 0; i < 5; i++) { const x = Math.floor(r() * 20) + frame * 2, y = Math.floor(r() * 22); for (let k = 0; k < 4; k++) set((x + k) % 24, y + (k === 0 || k === 3 ? 1 : 0), '#7cb0f0'); }
}));
const pondTex = frame => tex(`pond${frame}`, () => paint(24, 24, (set, g) => {
  fill(g, '#4c90e0');
  const r = mulberry32(7);
  for (let i = 0; i < 4; i++) { const x = Math.floor(r() * 20) + frame * 2, y = Math.floor(r() * 22); for (let k = 0; k < 4; k++) set((x + k) % 24, y + (k === 0 || k === 3 ? 1 : 0), '#a8d0fa'); }
}));

// 바깥 절벽(동굴·설원·사막·명소): 층층이 갈라진 바위 벽
function cliffTex(kind) {
  return tex(`cliff${kind}`, () => paint(24, 24, (set, g) => {
    const [base, dark, light] = { C: ['#7c5c3c', '#4e3420', '#a0805c'], N: ['#b8c8d8', '#7888a0', '#e4eef6'], D: ['#b88c50', '#7c5a2c', '#d8b078'], S: ['#6c6088', '#463c60', '#9088b0'] }[kind];
    fill(g, base);
    for (let y = 0; y < 24; y++) {
      if (y % 8 === 7) for (let x = 0; x < 24; x++) set(x, y, dark);
      if (y % 8 === 0) for (let x = 0; x < 24; x++) set(x, y, light);
    }
    for (const [x, y] of [[5, 1], [15, 3], [9, 9], [19, 11], [3, 17], [13, 19]]) for (let k = 0; k < 4; k++) set(x, y + k, dark);
  }));
}

const flowerTex = (kind, frame) => tex(`fl${kind}${frame}`, () => paint(24, 24, (set, g) => {
  g.drawImage(groundTex(kind, 2), 0, 0);
  for (const [cx, cy, col] of [[6, 7, '#f05858'], [17, 16, '#fafafa'], [16, 5, '#f8a8c8']]) {
    const o = frame && cx < 10 ? 1 : 0;
    [[0, -1], [-1, 0], [1, 0], [0, 1]].forEach(([dx, dy]) => set(cx + dx, cy + dy - o, col));
    set(cx, cy - o, '#f8d030');
  }
}));

// 턱: 풀밭 가장자리가 아래로 꺾인 흙 절벽
const ledgeTex = kind => tex(`ledge${kind}`, () => paint(24, 24, (set, g) => {
  const [base, dark, light] = GROUND[kind];
  g.drawImage(groundTex(kind, 3), 0, 0);
  for (let x = 0; x < 24; x++) {
    set(x, 11, light); set(x, 12, base);
    for (let y = 13; y < 18; y++) set(x, y, y === 13 ? '#e0b878' : x % 6 === 0 ? '#a07040' : '#c89858');
    set(x, 18, '#5a3c18'); set(x, 19, dark); set(x, 20, dark);
  }
}));

const fenceTex = kind => tex(`fence${kind}`, () => paint(24, 24, (set, g) => {
  g.drawImage(groundTex(kind, 1), 0, 0);
  for (const ry of [9, 15]) for (let x = 0; x < 24; x++) { set(x, ry - 1, '#4a2c10'); set(x, ry, '#e0b070'); set(x, ry + 1, '#a86e34'); set(x, ry + 2, '#4a2c10'); }
  for (const px of [3, 15]) {
    for (let y = 5; y < 21; y++) { set(px - 1, y, '#4a2c10'); set(px, y, '#d8a060'); set(px + 1, y, '#a06a30'); set(px + 2, y, '#4a2c10'); }
    for (let x = px - 1; x <= px + 2; x++) { set(x, 4, '#4a2c10'); set(x, 21, '#4a2c10'); }
    for (let x = px - 1; x <= px + 3; x++) set(x, 22, 'rgba(0,0,0,0.2)');
  }
}));

// 나무: 원 몇 개를 합친 수관에 진한 외곽선, 왼쪽 위가 밝다
function treeTex(kind) {
  return tex(`tree${kind}`, () => paint(24, 36, set => {
    const [out, dark, mid, light] = kind === 'F' ? ['#0e2a0c', '#1e4c18', '#2e7426', '#4e9c40'] : ['#16380f', '#2a6420', '#3e9030', '#6cc050'];
    for (let x = 4; x < 21; x++) for (let y = 30; y < 36; y++) if (((x - 12) / 8.5) ** 2 + ((y - 33) / 2.5) ** 2 < 1) set(x, y, 'rgba(0,0,0,0.28)');
    for (let y = 21; y < 33; y++) { set(9, y, out); set(14, y, out); for (let x = 10; x < 14; x++) set(x, y, x < 12 ? '#9c6c3c' : '#74491f'); }
    for (let x = 9; x <= 14; x++) set(x, 33, out);
    const blobs = [[12, 9, 9], [6.5, 15, 6.5], [17.5, 15, 6.5], [12, 18, 7]];
    const inside = (x, y) => blobs.some(([cx, cy, r]) => (x - cx) ** 2 + (y - cy) ** 2 < r * r);
    for (let y = 0; y < 27; y++) for (let x = 0; x < 24; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1), shade = (x - 12) * 0.4 + (y - 10) * 0.8;
      set(x, y, edge ? out : shade < -5 ? light : shade < 5 ? mid : dark);
    }
    for (const [x, y] of [[8, 5], [14, 4], [5, 12], [11, 11], [17, 10], [9, 18], [15, 17]]) { set(x, y, light); set(x + 1, y + 1, dark); }
  }));
}

function boulderTex(key, [dark, base, light]) {
  return tex(`rock${key}`, () => paint(24, 24, set => {
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      const dx = (x - 11.5) / 10.5, dy = (y - 12.5) / 9.5, d = dx * dx + dy * dy;
      if (d > 1) { if (((x - 12) / 10) ** 2 + ((y - 21) / 2.5) ** 2 < 1) set(x, y, 'rgba(0,0,0,0.25)'); continue; }
      set(x, y, d > 0.8 ? '#2c2824' : dy < -0.3 && dx < 0.25 ? light : dy > 0.4 || dx > 0.6 ? dark : base);
    }
    set(7, 7, '#ffffff'); set(8, 7, light); set(13, 14, dark); set(14, 15, dark); set(15, 15, dark);
  }));
}

// 장애물 이미지: 초록 지역은 나무, 나머지는 그 지역 색의 바위
const obOf = key => isGreen(key) ? treeTex(key) : key.startsWith('arena:') ? pillarTex(key.slice(6)) : boulderTex(key, KINDS[key].rock);

// 실내 바닥과 벽
function indoorTex(sub, type, what) {
  return tex(`in${sub}${type}${what}`, () => paint(24, 24, (set, g) => {
    const ap = arenaPal(type);
    // 후파의 이공간: 별이 박힌 보랏빛 바닥, 금테 두른 벽
    if (sub === 'hoopa') {
      if (what === 'wall') { fill(g, '#2a1450'); for (let x = 0; x < 24; x++) { set(x, 0, '#e8c048'); set(x, 1, '#a07820'); set(x, 22, '#120828'); set(x, 23, '#120828'); } return; }
      fill(g, '#1c1236');
      for (let i = 0; i < 7; i++) { const x = (i * 7 + 3) % 24, y = (i * 11 + 5) % 24; set(x, y, i % 3 ? '#6a58a8' : '#e8e0ff'); }
      for (let x = 0; x < 24; x++) set(x, 23, '#160e2c');
      return;
    }
    if (what === 'wall') {
      fill(g, ap.wall);
      for (let x = 0; x < 24; x++) { for (let y = 14; y < 24; y++) set(x, y, ap.brick); set(x, 13, '#101010'); set(x, 23, '#101010'); if (x % 6 === 0) for (let y = 0; y < 13; y++) set(x, y, '#101010'); }
      return;
    }
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) set(x, y, x % 12 === 0 || y % 12 === 0 ? ap.speck : (x % 12 === 1 || y % 12 === 1) ? mix(ap.a, '#ffffff', 0.15) : ap.a);
  }));
}

// 체육관 석상: 24도트 단위로 그려 2배. 칸보다 키가 커서 위로 튀어나온다
const OUT = '#2a2838';
function furnTex(kind, type) {
  const blob = (set, cx, cy, rx, ry, col, edge = OUT) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; if (d <= 1) set(x, y, d > 0.75 ? edge : col); } };
  const box = (set, x0, y0, x1, y1, col, edge = OUT) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, x === x0 || x === x1 || y === y0 || y === y1 ? edge : col); };
  return tex(`furn${kind}${type}`, () => {
    if (kind === 'statue') return paint(24, 48, set => {
      box(set, 3, 32, 20, 46, '#9a9aa8'); for (let x = 4; x < 20; x++) set(x, 33, '#c8c8d4');
      box(set, 7, 37, 16, 42, TYPE_COLOR[type] ?? '#a8a8a8', '#3a3a48');
      blob(set, 12, 24, 7, 8, '#b4b4c0'); blob(set, 12, 12, 6, 6, '#c4c4d0'); blob(set, 6, 7, 2.5, 4, '#b4b4c0'); blob(set, 18, 7, 2.5, 4, '#b4b4c0');
      set(10, 11, OUT); set(14, 11, OUT); set(9, 9, '#ececf4'); set(10, 9, '#ececf4');
    });
  });
}
// 체육관 기둥: 지진을 막아 주는 엄폐물. 바위 대신 받침과 머리가 있는 돌기둥
const pillarTex = type => tex(`pillar${type}`, () => paint(24, 44, set => {
  const [dark, base, light] = arenaPal(type).rock;
  for (let y = 36; y < 44; y++) for (let x = 3; x < 21; x++) set(x, y, y === 43 ? 'rgba(0,0,0,0.25)' : x === 3 || x === 20 || y === 36 || y === 42 ? OUT : base);
  for (let y = 6; y < 36; y++) for (let x = 6; x < 18; x++) set(x, y, x === 6 || x === 17 ? OUT : x < 9 ? light : x > 14 ? dark : base);
  for (let y = 0; y < 7; y++) for (let x = 2; x < 22; x++) set(x, y, x === 2 || x === 21 || y === 0 || y === 6 ? OUT : y < 3 ? light : base);
}));

// 바닥 위 장식: 입구에서 관장까지 깔린 카펫, 뒷벽 깃발
function drawRoomDecor() {
  const r = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  // 후파의 이공간: 바닥에 천천히 도는 금빛 고리 문양
  if (map.sub === 'hoopa') {
    const cx = map.tw * TS / 2, cy = map.th * TS / 2;
    ctx.save(); ctx.lineWidth = 3;
    for (const [rr, sp, col] of [[300, 0.15, 'rgba(232,192,72,.35)'], [220, -0.25, 'rgba(200,144,255,.35)'], [130, 0.4, 'rgba(232,192,72,.3)']]) {
      ctx.strokeStyle = col; ctx.beginPath(); ctx.ellipse(cx, cy, rr, rr * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 6; i++) { const a = now * sp + i * Math.PI / 3; ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.62, 12, 8, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
    return;
  }
  for (const rm of map.rooms) {
    if (!rm.who) continue;
    const c = TYPE_COLOR[rm.type] ?? '#888888', x = rm.cx - 1.5 * TS, top = (rm.y0 + 2.5) * TS, h = (rm.y1 - rm.y0 - 2.5) * TS;
    r(x + 8, top, 3 * TS - 16, h, mix(c, '#000000', 0.45)); r(x + 14, top + 6, 3 * TS - 28, h - 6, mix(c, '#202020', 0.2));
    for (const dx of [-4, 4]) { const fx = rm.cx + dx * TS - 14, fy = rm.y0 * TS; r(fx - 2, fy + 2, 32, 44, OUT); r(fx, fy + 4, 28, 36, c); r(fx, fy + 40, 28, 4, mix(c, '#000000', 0.4)); r(fx + 10, fy + 14, 8, 12, '#f8f8f8'); }
  }
}

// 턱에서 뛰어내릴 때는 포물선으로 한 번 뛴다
const pose = (a, scale) => { const r = basePose(a, scale); if (a.hop > 0) r.lift += Math.sin((1 - a.hop / 0.35) * Math.PI) * 16; return r; };
function basePose(a, scale) {
  const z = a.z ?? 0;
  if (a.flying) return { lift: FLY_Z + z + Math.sin(now * 4 + (a.seed ?? 0)) * 4, sx: 1, sy: 1 };
  if (a.dash > 0) return { lift: Math.sin((1 - a.dash / 0.2) * Math.PI) * 12, sx: 1, sy: 1 };
  if (a.act && a.act.phase === 0 && (a.act.kind === 'jump' || a.act.kind === 'quake')) return { lift: 0, sx: 1.12, sy: 0.88 };  // 점프 전 웅크리기
  if (!a.moving) return { lift: z, sx: 1, sy: 1 };
  const h = Math.abs(Math.sin(a.walk / 9)), sq = (1 - h) * 0.1;
  return { lift: z + h * 5 * scale, sx: 1 + sq, sy: 1 - sq };
}

function drawShadow(x, y, w, lift) {
  const sw = Math.max(8, Math.round(w * 0.7 * (1 - Math.min(lift, 40) / 80) / 2) * 2);
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.fillRect(Math.round(x - sw / 2), Math.round(y - 3), sw, 6);
  ctx.fillRect(Math.round(x - sw / 2 + 4), Math.round(y - 5), sw - 8, 10);
}

// 필드 스프라이트는 도트를 2배(보스 4배)로 키워 바닥 타일과 도트 크기를 맞춘다
const bodyW = (a, s) => a.mon.field ? a.mon.field.idle.foot.w * 2 * s : (a.mon.box.x1 - a.mon.box.x0) * s;
const bodyH = (a, s) => a.mon.field ? a.mon.field.idle.foot.h * 2 * s : (a.mon.box.y1 - a.mon.box.y0) * s;
// 이동 방향 → PMD 시트의 줄 (아래, 오른아래, 오른, 오른위, 위, 왼위, 왼, 왼아래)
const faceRow = (dx, dy) => [2, 1, 0, 7, 6, 5, 4, 3][((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];

// 이로치: 몸 주위에 별이 번갈아 반짝인다
function drawSparkle(a, top, w) {
  const k = Math.floor(now * 4 + (a.seed ?? 0)) % 3, x = a.x + [-0.5, 0.45, 0][k] * w, y = top + [6, 18, -6][k];
  ctx.fillStyle = '#fff6a0'; ctx.fillRect(x - 1, y - 6, 2, 12); ctx.fillRect(x - 6, y - 1, 12, 2); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 2, y - 2, 4, 4);
}
function drawActor(a, scale, alpha = 1, battle = false) {
  const art = a.megaArt ?? (a.shiny && a.mon.shinyArt || a.mon), b = art.box ?? a.mon.box, f = !battle && art.field, { lift, sx, sy } = pose(a, scale);
  const jitter = a.act?.phase === 0 && a.act.kind === 'charge' ? Math.sin(now * 70) * 2 : 0;
  if (a === player) { drawAbilityBack(a); drawGimmickBack(a, scale); }
  ctx.save();
  ctx.globalAlpha = alpha * (1 - (a.fade ?? 0));
  ctx.translate(Math.round(a.x + jitter), Math.round(a.y - lift));
  let top, w;
  if (f) {
    const an = a.moving || a.dash > 0 ? f.walk : f.idle, S = 2 * scale, row = (a.face ?? 0) % an.rows;
    let t = Math.floor(now * 60 + (a.seed ?? 0) * 37) % an.total, fi = 0;
    while (t >= an.dur[fi]) t -= an.dur[fi++];
    ctx.scale(sx, sy);
    ctx.drawImage(an.img, fi * an.fw, row * an.fh, an.fw, an.fh, -an.foot.cx * S, -an.foot.by * S, an.fw * S, an.fh * S);
    top = a.y - lift - an.foot.h * S; w = an.foot.w * S;
  } else {
    ctx.scale((a.flip ? -1 : 1) * sx, sy);
    ctx.drawImage(art.img, -(b.x0 + b.x1) / 2 * scale, -b.y1 * scale, 96 * scale, 96 * scale);
    top = a.y - lift - (b.y1 - b.y0) * scale; w = (b.x1 - b.x0) * scale;
  }
  ctx.restore();
  if (a.r && map === world && !a.flying && lift < 8 && world.grass[Math.floor(a.y / TS) * world.tw + Math.floor(a.x / TS)]) drawGrassFront(a.x, a.y, w);
  if (a.frozen > 0) { ctx.fillStyle = 'rgba(170,230,255,.45)'; ctx.fillRect(a.x - w / 2, top, w, a.y - lift - top); }
  const dots = (color) => { ctx.fillStyle = color; for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(a.x - 12 + i * 10 + Math.sin(now * 9 + i) * 3), Math.round(top + ((now * 40 + i * 13) % 26)), 4, 4); };
  if (a.burn > 0) dots(a.holy ? '#ffd040' : '#f84');
  if (a.psn > 0) dots('#b050e0');
  if (a.slow > 0) dots('#aef');
  if (a.stun > 0) { ctx.fillStyle = '#ff8'; ctx.fillRect(Math.round(a.x - 8 + Math.sin(now * 8) * 10), Math.round(top - 6), 4, 4); }
  if (a.shiny) drawSparkle(a, top, w);
  if (a === player) { drawGimmick(a, top, w); drawAbility(a, top, w); }
  if (a.rank && a.rank !== 'wild' && !isBig(a) && a.hp < a.maxHp) { ctx.fillStyle = '#000'; ctx.fillRect(a.x - 16, top - 10, 32, 5); ctx.fillStyle = '#e44'; ctx.fillRect(a.x - 15, top - 9, 30 * Math.max(0, a.hp / a.maxHp), 3); }
}

function drawTrainerSprite(sprite, x, y, flip, alpha = 1, hop = 0) {
  const img = TRAINER_IMG[sprite];
  drawShadow(x, y, 34, 0);
  if (!img) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(Math.round(x), Math.round(y - hop));
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -img.width / 2, -img.height + 6);
  ctx.restore();
}

// 건물: 외곽선, 줄무늬 지붕, 창문, 간판
const BUILDING_LOOK = { gym: ['체육관'], league: ['포켓몬리그', '#7048c8'] };
function drawBuilding(b) {
  const [label, roofColor] = BUILDING_LOOK[b.kind], c = roofColor ?? mix(TYPE_COLOR[b.type], '#606060', 0.35);
  const x = b.x * TS, y = b.y * TS, w = b.w * TS, h = b.h * TS, roofH = Math.round(h * 0.45), wallY = y + roofH, OUT = '#2a2838';
  const rect = (rx, ry, rw, rh, col) => { ctx.fillStyle = col; ctx.fillRect(rx, ry, rw, rh); };
  rect(x - 2, y + h - 2, w + 8, 10, 'rgba(0,0,0,.25)');
  // 벽
  rect(x, wallY, w, h - roofH, OUT);
  rect(x + 4, wallY, w - 8, h - roofH - 4, '#f2ead8');
  rect(x + 4, y + h - 16, w - 8, 12, '#d6c8ae');
  // 지붕: 처마가 벽보다 튀어나오고 가로 줄무늬
  rect(x - 10, y + 4, w + 20, roofH, OUT);
  rect(x - 6, y + 8, w + 12, roofH - 8, c);
  for (let ry = y + 16; ry < y + roofH - 4; ry += 10) rect(x - 6, ry, w + 12, 3, mix(c, '#000000', 0.25));
  rect(x - 6, y + 8, w + 12, 4, mix(c, '#ffffff', 0.35));
  rect(x - 6, y + roofH - 2, w + 12, 4, mix(c, '#000000', 0.45));
  // 창문
  for (let wx = x + 16; wx < x + w - 36; wx += 56) {
    if (Math.abs(wx + 12 - b.doorX) < 40) continue;
    rect(wx - 2, wallY + 14, 28, 24, OUT); rect(wx, wallY + 16, 24, 20, '#8ec8f0'); rect(wx, wallY + 16, 24, 6, '#c8e8ff'); rect(wx + 11, wallY + 16, 2, 20, OUT);
  }
  // 문과 발판
  rect(b.doorX - 20, y + h - 44, 40, 44, OUT); rect(b.doorX - 16, y + h - 40, 32, 40, '#4a5068'); rect(b.doorX - 16, y + h - 40, 32, 6, '#7c86a8');
  rect(b.doorX - 22, y + h, 44, 6, '#b05040');
  // 간판
  ctx.font = '11px Galmuri11, monospace';
  const tw = ctx.measureText(label).width + 12, sx = x + w / 2 - tw / 2;
  rect(sx - 2, wallY - 2, tw + 4, 20, OUT); rect(sx, wallY, tw, 16, '#f8f4e8');
  plain(label, sx + tw / 2, wallY + 12, 11, '#2a2838', 'center');
}

// 동굴 입구: 길목을 가로지르는 어두운 바위 문턱
function drawMouth(m) {
  const x = m.x * TS, y = m.y * TS;
  ctx.fillStyle = '#3e2e20';
  if (m.vertical) { ctx.fillRect(x - 3 * TS, y + 8, 7 * TS, TS - 8); ctx.fillStyle = '#120c08'; ctx.fillRect(x - 2 * TS + 6, y + 14, 5 * TS - 12, TS - 14); }
  else { ctx.fillRect(x + 8, y - 3 * TS, TS - 8, 7 * TS); ctx.fillStyle = '#120c08'; ctx.fillRect(x + 14, y - 2 * TS + 6, TS - 14, 5 * TS - 12); }
}

// 풀숲 안에 있으면 발 쪽을 풀잎이 가린다
function drawGrassFront(x, y, w) {
  for (let gx = -w / 2; gx < w / 2; gx += 5) {
    const h = 12 + (Math.abs(Math.round(gx)) % 3) * 3, sw = Math.round(Math.sin(now * 3 + gx) * 1.5);
    ctx.fillStyle = '#2b6a22'; ctx.fillRect(Math.round(x + gx + sw), Math.round(y - h + 3), 4, h);
    ctx.fillStyle = '#5fae4a'; ctx.fillRect(Math.round(x + gx + sw), Math.round(y - h + 3), 2, 3);
  }
}

function drawSign(s) {
  ctx.fillStyle = '#5a3a20'; ctx.fillRect(s.x - 2, s.y - 26, 5, 26);
  ctx.fillStyle = '#8a6030'; ctx.fillRect(s.x - 16, s.y - 40, 33, 18); ctx.fillStyle = '#b08850'; ctx.fillRect(s.x - 14, s.y - 38, 29, 14);
  if (Math.hypot(player.x - s.x, player.y - s.y) < 150) { ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.font = '12px Galmuri11, monospace'; const w = ctx.measureText(s.text).width + 14; ctx.fillRect(s.x - w / 2, s.y - 70, w, 22); text(s.text, s.x, s.y - 54, 12, '#ffe'); }
}

function drawHeart(x, y, fill) {
  HEART.forEach((row, j) => [...row].forEach((c, i) => {
    if (c !== 'X') return;
    ctx.fillStyle = fill === 2 || (fill === 1 && i < 4) ? '#e83030' : '#444';
    ctx.fillRect(x + i * 3, y + j * 3, 3, 3);
  }));
}

function text(s, x, y, size, color = '#fff', align = 'center') {
  ctx.font = `${size}px Galmuri11, monospace`; ctx.textAlign = align;
  ctx.fillStyle = '#000'; ctx.fillText(s, x + 2, y + 2);
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}

function drawTiles(cam) {
  const tx0 = Math.floor(cam.x / TS), ty0 = Math.floor(cam.y / TS), tx1 = Math.ceil((cam.x + W) / TS), ty1 = Math.ceil((cam.y + H) / TS);
  const frame = Math.floor(now * 2) % 2;
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    if (tx < 0 || ty < 0 || tx >= map.tw || ty >= map.th) continue;
    const k = ty * map.tw + tx, x = tx * TS, y = ty * TS, h = hash(tx, ty), v = map.solid[k];
    if (map.kind === 'indoor') {
      if (map.voids[k]) { ctx.fillStyle = '#0c0a14'; ctx.fillRect(x, y, TS, TS); continue; }
      ctx.drawImage(indoorTex(map.sub, roomAt(ty)?.type ?? map.type, v === 4 ? 'wall' : 'floor'), x, y);
      continue;
    }
    const n = world.nodes[world.area[k]], kind = n.kind, z = world.zone[k];
    if (!z) {
      ctx.drawImage(kind === 'W' ? seaTex(frame) : 'CNDS'.includes(kind) ? cliffTex(kind) : groundTex(kind, Math.floor(h * 4)), x, y);
      continue;
    }
    if (v === 9) { ctx.drawImage(pondTex(frame), x, y); edges(k, x, y, o => world.solid[k + o] !== 9, '#d8ecfc', 4); continue; }
    if (world.road[k]) {
      ctx.drawImage(kind === 'W' ? bridgeTex() : kind === 'T' ? paveTex() : dirtTex(Math.floor(h * 3)), x, y);
      // 길과 풀밭이 만나는 곳: 진한 테두리와 삐져나온 풀
      if (kind !== 'W') edges(k, x, y, o => !world.road[k + o] && world.zone[k + o] && world.solid[k + o] !== 3, kind === 'T' ? '#a89c84' : '#b0925a', 3, isGreen(kind) && kind !== 'T' ? GROUND[kind][1] : null);
      continue;
    }
    if (world.grass[k]) { ctx.drawImage(tallGrassTex((frame + tx) % 2), x, y); continue; }
    if (v === 8) { ctx.drawImage(ledgeTex(GROUND[kind] ? kind : 'R'), x, y); continue; }
    if (v === 10) { ctx.drawImage(fenceTex(isGreen(kind) ? kind : 'T'), x, y); continue; }
    const d = world.deco[k];
    ctx.drawImage(d === 2 && isGreen(kind) ? flowerTex(kind, frame) : groundTex(kind, Math.floor(h * 4)), x, y);
    if (d === 3) { ctx.fillStyle = '#7a6a58'; ctx.fillRect(x + 20, y + 28, 8, 6); ctx.fillStyle = '#b8a890'; ctx.fillRect(x + 20, y + 28, 4, 2); }
  }
  return [tx0, ty0, tx1, ty1];
}

// 칸 테두리: 이웃이 조건을 만족하는 쪽에 선을 긋고, 원하면 풀이 삐져나온 도트를 얹는다
function edges(k, x, y, test, color, wpx, tuft = null) {
  const tw = map.tw;
  ctx.fillStyle = color;
  if (test(-tw)) ctx.fillRect(x, y, TS, wpx);
  if (test(tw)) ctx.fillRect(x, y + TS - wpx, TS, wpx);
  if (test(-1)) ctx.fillRect(x, y, wpx, TS);
  if (test(1)) ctx.fillRect(x + TS - wpx, y, wpx, TS);
  if (!tuft) return;
  ctx.fillStyle = tuft;
  if (test(-tw)) for (let i = 4; i < TS; i += 12) ctx.fillRect(x + i, y, 4, 6);
  if (test(tw)) for (let i = 8; i < TS; i += 12) ctx.fillRect(x + i, y + TS - 6, 4, 6);
  if (test(-1)) for (let i = 6; i < TS; i += 12) ctx.fillRect(x, y + i, 6, 4);
  if (test(1)) for (let i = 2; i < TS; i += 12) ctx.fillRect(x + TS - 6, y + i, 6, 4);
}

function placeName() {
  if (map === world) return curNode?.name ?? '';
  return { league: '포켓몬리그', hoopa: '후파의 고리 너머', rival: '라이벌과의 승부' }[map.sub] ?? `${map.leader.leader}의 ${map.leader.title === '체육관 관장' ? '체육관' : '시련'}`;
}

function drawPanel() {
  const p = player;
  ctx.fillStyle = '#0c0c12'; ctx.fillRect(0, HUD, SIDE, H);
  text(`${region.name}지방`, 6, HUD + 16, 13, '#ff8', 'left');
  text(placeName(), 6, HUD + 32, 11, '#ddd', 'left');
  text(`${p.mega ? '메가' : ''}${p.mon.name} ${p.level >= MAX_LEVEL ? 'Lv.MAX' : `Lv.${p.level}`}`, 6, HUD + 50, 12, p.level >= MAX_LEVEL ? '#fd6' : '#fff', 'left');
  ctx.fillStyle = '#222'; ctx.fillRect(6, HUD + 55, 146, 5);
  ctx.fillStyle = '#4ac0ff'; ctx.fillRect(6, HUD + 55, 146 * (p.level >= MAX_LEVEL ? 1 : Math.min(1, p.exp / expNeed(p.level))), 5);
  text(`₽ ${p.money.toLocaleString()}`, 6, HUD + 76, 12, '#fd6', 'left');
  const ab = curAb(); if (ab) text(ab.ko, 152, HUD + 76, 11, ab.color ?? '#9cf', 'right');  // 특성
  STATS.forEach(([label, icon, f, dg], i) => {
    const y = HUD + 84 + i * 30;
    ctx.drawImage(IMG[icon], 2, y, 30, 30);
    text(`${label} ${f(p).toFixed(dg)}${label === '급소' ? '%' : ''}`, 34, y + 20, 12, '#ddd', 'left');
    const d = p.deltas[i];
    if (d && d.t > 0) {
      ctx.globalAlpha = Math.min(1, d.t);
      text(`${d.v > 0 ? '▲' : '▼'}${Math.abs(d.v).toFixed(dg)}`, 116, y + 20, 11, d.v > 0 ? '#6f6' : '#f66', 'left');
      ctx.globalAlpha = 1;
    }
  });
  let y = HUD + 84 + STATS.length * 30 + 16;
  text(`기술 ${p.moves.size}/${MAX_MOVES}`, 6, y, 12, '#ff8', 'left');
  const moves = [...p.moves];
  for (let i = 0; i < MAX_MOVES; i++) {
    y += 15; const m = moveDef(moves[i]); nameText(m, m ? `${moves[i] === p.zMove ? 'Z ' : ''}${m.name}` : '-', 10, y, 11, m ? (m.legend ? '#fd6' : TYPE_COLOR[m.type]) : '#444');
    if (m && p.stabTypes?.has(m.type)) text(`자속 x${STAB}`, 154, y, 9, '#fd6', 'right');  // 내 타입과 같은 기술: 그 타입 공격 1.5배
  }
  p.items.filter(i => i.r === 'k').forEach((it, i) => ctx.drawImage(IMG[it.id], 4 + i * 26, y + 6, 26, 26));
  text(TOUCH ? 'A 대화·B 메뉴·구르기·지도' : 'Space 구르기·E 대화·M 지도·N 소리·Esc 메뉴·H 안내', 4, CH - 6, 9, '#777', 'left');
}

function drawBadges(x, y) {
  region.gyms.forEach((g, i) => {
    const bx = x + i * 18, got = player.beaten.has(i);
    ctx.fillStyle = got ? '#fff' : '#222'; ctx.fillRect(bx + 3, y, 6, 12); ctx.fillRect(bx, y + 3, 12, 6);
    ctx.fillStyle = got ? TYPE_COLOR[g.type] : '#333'; ctx.fillRect(bx + 3, y + 2, 6, 8); ctx.fillRect(bx + 2, y + 3, 8, 6);
  });
}

// 지도: 장소 그래프 위에 현재 위치. 가 본 곳과 그 이웃만 보이고, 타운맵이 있으면 전부 보인다. 큰 지도에는 전설의 기운(★)도 보인다
function drawRegionMap(ox, oy, sx, sy, big) {
  const p = player, nodes = world.nodes, known = n => p.townMap || n.visited || n.links.some(l => l.visited), pos = n => [ox + n.gx * sx, oy + n.gy * sy];
  ctx.fillStyle = '#555';
  for (const n of nodes) for (const l of n.links) if (known(n) && known(l)) { const [ax, ay] = pos(n), [bx, by] = pos(l); ctx.fillRect(Math.min(ax, bx), Math.min(ay, by), Math.abs(ax - bx) + 2, Math.abs(ay - by) + 2); }
  for (const n of nodes) {
    if (!known(n)) continue;
    const [x, y] = pos(n), s = big ? 8 : 3;
    ctx.fillStyle = n.gym ? (p.beaten.has(region.gyms.indexOf(n.gym)) ? TYPE_COLOR[n.gym.type] : '#fff') : n.league ? '#c8f' : n.kind === 'T' ? '#b9a77a' : n.visited ? '#888' : '#444';
    ctx.fillRect(x - s, y - s, s * 2 + 2, s * 2 + 2);
    if (big && (n.visited || p.townMap) && (n.kind === 'T' || n.gym || n.league || n.legends.length || n === nodeAt(p.x, p.y))) text(n.name, x + 1, y - 12, 10, n === nodeAt(p.x, p.y) ? '#ff8' : '#ddd');
  }
  // 타운맵이 있으면 체육관마다 순서 번호(아직) 또는 ✔(배지 획득)를 달고, 다음에 갈 체육관을 깜빡여 알려 준다
  if (big && p.townMap) {
    const next = region.gyms.findIndex((_, i) => !p.beaten.has(i));
    for (const n of nodes) {
      if (!n.gym) continue;
      const i = region.gyms.indexOf(n.gym), [x, y] = pos(n), got = p.beaten.has(i);
      text(got ? '✔' : `${i + 1}`, x + 1, y + 5, 11, got ? '#2a2' : '#222');
      if (i === next) { ctx.strokeStyle = Math.floor(now * 3) % 2 ? '#ff8' : '#fa4'; ctx.lineWidth = 2; ctx.strokeRect(x - 12, y - 12, 26, 26); }
    }
    const nn = next >= 0 && nodes.find(n => n.gym === region.gyms[next]);
    glowText(nn ? `다음 목적지: ${nn.name} (${next + 1}번째 · ${TYPE_KO[nn.gym.type]} 체육관 ${nn.gym.leader})` : `배지 ${region.gyms.length}개 완료! 다음 목적지: ${roadNode().name}`, SIDE + W / 2, HUD + H - 14, 13, '#ff8', '#a60');
  }
  if (big) for (const l of world.legends) if (!l.done) { const [x, y] = pos(l.n); text('★', x + 14, y + 6, 14, Math.floor(now * 3) % 2 ? '#c8f' : '#fff'); }
  const [wx, wy] = map === world ? [p.x, p.y] : world.returnTo, px = ox + (wx / TS - MARGIN) / CELL * sx, py = oy + (wy / TS - MARGIN) / CELL * sy;
  ctx.fillStyle = Math.floor(now * 4) % 2 ? '#f33' : '#fff'; ctx.fillRect(px - 2, py - 2, big ? 7 : 5, big ? 7 : 5);
}

// 몬스터볼/받침대 근처에 가면 우측 상단에 이름과 설명
function drawItemInfo() {
  const p = player, near = map.pickups.filter(k => k.kind === 'item' || k.kind === 'tm').find(k => Math.hypot(p.x - k.x, p.y - k.y) < 110);
  const k = near ?? (lastInfo?.t > 0 ? lastInfo.k : null);
  if (!k) return;
  const it = k.kind === 'tm' ? k.tm : k.item, x = SIDE + W - 266, y = HUD + 8, ls = lines(it.desc, 206, 11);
  const ts = lines(`${near ? '' : '획득! '}${k.kind === 'tm' ? `기술머신 · ${it.name}` : it.name}`, 206, 13), h = 26 + ts.length * 18 + ls.length * 16;
  ctx.fillStyle = 'rgba(0,0,0,.8)'; ctx.fillRect(x, y, 258, h);
  ctx.strokeStyle = k.kind === 'tm' ? (k.tm.legend ? '#fd6' : TYPE_COLOR[k.tm.type]) : { c: '#aaa', r: '#d4a017', l: '#c8f', k: '#6cf' }[k.item.r]; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, 256, h - 2);
  ctx.drawImage(IMG[k.kind === 'tm' ? k.tm.tm : k.item.id], x + 6, y + 10, 30, 30);
  ts.forEach((l, i) => nameText(it, l, x + 42, y + 24 + i * 18, 13, k.tm?.legend ? '#fd6' : '#fff'));
  ls.forEach((l, i) => text(l, x + 42, y + 26 + ts.length * 18 + i * 16, 11, '#ccc', 'left'));
}

// 출구 포탈: 겹친 타원이 숨 쉬듯 커졌다 작아진다
function drawPortal(o) {
  ['#3a2cc8', '#6a54f0', '#a898ff', '#ffffff'].forEach((c, i) => {
    const r = 30 - i * 7 + Math.sin(now * 5 + i) * 2;
    ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(o.x, o.y, r, r * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
  });
  text(o.label ?? '밖으로', o.x, o.y - 26, 11, '#c8bcff');
}

// 후파의 고리: 금빛 고리 안쪽에 보랏빛 소용돌이. 나타날 때 커지면서 열린다
function drawHoopaRing(o, scale = 1) {
  const k = clamp((now - o.born) / 0.6, 0, 1) * scale, R = 44 * k, y = o.y - 30;
  if (R <= 4) return;
  ctx.save();
  ctx.fillStyle = 'rgba(40,10,80,.9)'; ctx.beginPath(); ctx.ellipse(o.x, y, R, R * 1.15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = i % 2 ? '#c890ff' : '#7040d0'; ctx.beginPath();
    for (let s = 0; s <= 24; s++) { const t = s / 24, a = now * 4 + i * Math.PI / 2 + t * 5, rr = R * 0.9 * t; s ? ctx.lineTo(o.x + Math.cos(a) * rr, y + Math.sin(a) * rr * 1.15) : ctx.moveTo(o.x, y); }
    ctx.stroke();
  }
  ctx.shadowColor = '#ffd860'; ctx.shadowBlur = 12 + Math.sin(now * 5) * 5;
  ctx.strokeStyle = '#e8c048'; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(o.x, y, R, R * 1.15, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.shadowBlur = 0; ctx.strokeStyle = '#fff2b0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(o.x, y, R - 2, R * 1.15 - 2, 0, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
  ctx.restore();
  if (k >= 1 && !o.used) glowText('후파의 고리', o.x, y - R * 1.15 - 10, 12, '#ffe9a8', '#c8f');
}

// 후파의 고리로 빨려 들어가는 연출: 고리가 화면을 덮을 만큼 커지고, 소용돌이가 돌다가 하얗게 번쩍인다
function drawWarp() {
  const w = warp, p = player, cam = { x: clamp(p.x - W / 2, 0, map.tw * TS - W), y: clamp(p.y - H / 2, 0, map.th * TS - H) };
  const sx = SIDE + w.x - cam.x, sy = HUD + w.y - 30 - cam.y, t = w.t, g = clamp((t - 0.7) / 1.1, 0, 1), R = 44 + g * g * 900;
  ctx.save(); ctx.beginPath(); ctx.rect(SIDE, HUD, W, H); ctx.clip();
  ctx.fillStyle = `rgba(24,6,52,${Math.min(1, g * 1.4)})`; ctx.beginPath(); ctx.arc(sx, sy, R, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 4 + g * 10;
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = i % 2 ? `rgba(200,144,255,${0.4 + g * 0.5})` : `rgba(232,192,72,${0.3 + g * 0.5})`; ctx.beginPath();
    for (let s = 0; s <= 30; s++) { const u = s / 30, a = t * (5 + g * 6) + i * Math.PI / 3 + u * 6, rr = R * u; s ? ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr) : ctx.moveTo(sx, sy); }
    ctx.stroke();
  }
  ctx.strokeStyle = '#e8c048'; ctx.lineWidth = 8 + g * 20; ctx.shadowColor = '#ffd860'; ctx.shadowBlur = 20;
  ctx.beginPath(); ctx.arc(sx, sy, R, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0;
  for (let i = 0; i < 24; i++) { const a = i * 2.4 + t * 3, d = ((i * 37 + t * 260) % 420) * (1 - g * 0.5); ctx.fillStyle = i % 3 ? '#c8a8ff' : '#fff'; ctx.fillRect(sx + Math.cos(a) * (420 - d), sy + Math.sin(a) * (420 - d), 3, 3); }
  const flash = clamp((t - 1.7) / 0.6, 0, 1);
  if (flash > 0) { ctx.fillStyle = `rgba(250,240,255,${flash})`; ctx.fillRect(SIDE, HUD, W, H); }
  ctx.restore();
  if (t > 0.9) glowText(w.ready || t < WARP_TIME ? '후파의 고리 너머로 빨려 들어간다...' : '고리 너머를 들여다보는 중...', SIDE + W / 2, HUD + H - 40, 16, flash > 0.5 ? '#503080' : '#ffe9a8', '#c8f');
}

// 적 광선 한 줄 (조준 광선·휩쓸기 광선 공용)
function enemyBeamAt(e, ang, c, s = 1) {
  const len = beamLen(e.x, e.y, Math.cos(ang), Math.sin(ang), true);
  ctx.save(); ctx.translate(Math.round(e.x), Math.round(e.y - TEAR_Z)); ctx.rotate(ang);
  for (const [k, col] of [[1, mix(c, '#000000', 0.3)], [0.6, c], [0.25, '#fff']]) { ctx.fillStyle = col; ctx.fillRect(0, -14 * k * s, len, 28 * k * s); }
  ctx.restore();
}

// 레이저: 가늘고 밝은 선. 전기는 지글거리고 얼음은 반짝인다
const LASER_COLOR = { electric: ['#fff36a', '#ffffff'], ice: ['#9ff0ff', '#ffffff'] };
function drawLaser(b) {
  const pts = b.pts ?? beamPath(b), [c, core] = LASER_COLOR[b.ltype] ?? [player.pcol?.[0] ?? '#fff', '#fff'], k = Math.min(1, Math.max(0, b.t / b.t0) * 1.6);
  ctx.save(); ctx.globalAlpha = k; ctx.translate(0, -TEAR_Z); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.shadowColor = c; ctx.shadowBlur = 12;
  const jit = b.ltype === 'electric' ? 5 : 0;
  // 풀밭 위에서도 보이게 어두운 테두리 → 색 → 하얀 심
  for (const [w, col] of [[b.w + 4, mix(c, '#000000', 0.6)], [b.w, c], [Math.max(2, b.w * 0.4), core]]) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
    pts.forEach(([x, y], i) => { const j = i && i < pts.length - 1 ? (Math.random() - 0.5) * jit : 0; i ? ctx.lineTo(x + j, y + j) : ctx.moveTo(x, y); });
    ctx.stroke();
  }
  if (b.ltype === 'ice') { ctx.fillStyle = '#fff'; for (let i = 2; i < pts.length; i += 4) ctx.fillRect(pts[i][0] - 2 + Math.random() * 6 - 3, pts[i][1] - 2 + Math.random() * 6 - 3, 3, 3); }
  ctx.restore();
}
function drawBeam(b) {
  if (b.laser) return drawLaser(b);
  const pts = beamPath(b), c = player.pcol?.[0] ?? TYPE_COLOR[beamCfg().type], w = b.w + Math.random() * 4 - 2;
  ctx.save();
  ctx.globalAlpha = Math.min(1, b.t * 8);
  ctx.translate(0, -TEAR_Z); ctx.lineJoin = 'round';
  for (const [k, col] of [[1, mix(c, '#000000', 0.35)], [0.7, c], [0.4, mix(c, '#ffffff', 0.5)], [0.15, '#ffffff']]) {
    ctx.strokeStyle = col; ctx.lineWidth = w * k; ctx.beginPath();
    pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
  }
  if (has('thunderbolt') || has('ice-beam')) {
    // 광선을 감싸고 도는 두 줄의 레이저 (전기는 노랑, 얼음은 하늘색. 휘어도 광선을 따라간다)
    ctx.fillStyle = has('thunderbolt') ? '#fff36a' : '#9ff0ff';
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], a = Math.atan2(y1 - y0, x1 - x0);
      for (const ph of [0, Math.PI]) { const o = Math.sin(i - now * 30 + ph) * (w / 2 + 6); ctx.fillRect(x1 - Math.sin(a) * o - 2, y1 + Math.cos(a) * o - 2, 4, 4); }
    }
  }
  ctx.restore();
}

// 적 기술의 예고와 본체: 돌진 조준선, 점프 낙하 지점, 광선
function drawTelegraphs(e, layer) {
  const a = e.act;
  if (layer === 'ground' && e.ccImmune > 0) { ctx.strokeStyle = `rgba(255,210,90,${0.5 + Math.abs(Math.sin(now * 5)) * 0.4})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r * 1.5, e.r * 0.7, 0, 0, Math.PI * 2); ctx.stroke(); }
  if (layer === 'ground' && e.enraged) { ctx.strokeStyle = `rgba(255,50,50,${0.35 + Math.abs(Math.sin(now * 6)) * 0.4})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r * 1.3, e.r * 0.6, 0, 0, Math.PI * 2); ctx.stroke(); }
  if (!a) return;
  const c = TYPE_COLOR[a.type], pulse = 0.35 + Math.abs(Math.sin(now * 10)) * 0.35;
  if (layer === 'ground') {
    if (a.kind === 'jump' && a.phase === 1) {
      ctx.strokeStyle = `rgba(255,60,60,${pulse})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(a.tx, a.ty, e.r + 55, (e.r + 55) * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,60,60,.15)'; ctx.fill();
    }
    if (a.kind === 'charge' && a.phase === 0 && a.name) {
      ctx.save(); ctx.globalAlpha = pulse; ctx.translate(e.x, e.y); ctx.rotate(Math.atan2(a.dy, a.dx));
      ctx.fillStyle = '#f33'; ctx.fillRect(0, -3, 160, 6); ctx.fillRect(150, -10, 10, 20);
      ctx.restore();
    }
    return;
  }
  drawSpinArms(e, a);
  if (a.kind === 'beam') {
    if (a.phase === 0) {
      const len = beamLen(e.x, e.y, Math.cos(a.ang), Math.sin(a.ang), true);
      ctx.save(); ctx.translate(Math.round(e.x), Math.round(e.y - TEAR_Z)); ctx.rotate(a.ang);
      ctx.globalAlpha = pulse; ctx.fillStyle = a.heavy ? '#d00' : '#f33';
      if (a.heavy) { ctx.globalAlpha = pulse * 0.35; ctx.fillRect(0, -24, len, 48); ctx.globalAlpha = pulse; ctx.fillRect(0, -4, len, 8); } else ctx.fillRect(0, -2, len, 4);
      ctx.restore();
    } else enemyBeamAt(e, a.ang, c, a.heavy ? 1.6 : 1);
  }
  // 휩쓸기 광선 예고: 쓸고 지나갈 부채꼴, 시작하는 선, 도는 방향 화살표
  if (a.kind === 'sweep') {
    if (a.phase === 0) {
      const R = 520, a1 = a.ang0 + a.dir * a.span;
      ctx.save(); ctx.translate(Math.round(e.x), Math.round(e.y - TEAR_Z));
      ctx.fillStyle = `rgba(255,60,60,${pulse * 0.25})`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, Math.min(a.ang0, a1), Math.max(a.ang0, a1)); ctx.closePath(); ctx.fill();
      ctx.rotate(a.ang0); ctx.globalAlpha = pulse; ctx.fillStyle = '#f33'; ctx.fillRect(0, -3, R, 6);
      ctx.restore();
      ctx.save(); ctx.translate(Math.round(e.x), Math.round(e.y - TEAR_Z)); ctx.strokeStyle = `rgba(255,220,220,${pulse})`; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, 140, Math.min(a.ang0, a1), Math.max(a.ang0, a1)); ctx.stroke();
      ctx.rotate(a1); ctx.fillStyle = `rgba(255,220,220,${pulse})`; ctx.beginPath(); ctx.moveTo(140, 0); ctx.lineTo(128, -a.dir * 14); ctx.lineTo(152, -a.dir * 14); ctx.fill();
      ctx.restore();
    } else enemyBeamAt(e, a.ang, c);
  }
}

function drawHazard(h) {
  if (drawPatternHazard(h)) return;
  const c = TYPE_COLOR[h.type];
  if (h.kind === 'strike' && h.dmg > 1) {
    // 필살 일격: 굵은 붉은 이중 원과 느낌표
    const k = 1 - clamp(h.t / h.t0, 0, 1), pulse = 0.5 + Math.abs(Math.sin(now * 12)) * 0.5;
    ctx.strokeStyle = `rgba(255,40,40,${pulse})`; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r, h.r * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r + 8, (h.r + 8) * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(200,0,0,${0.15 + k * 0.4})`; ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r * k, h.r * 0.55 * k, 0, 0, Math.PI * 2); ctx.fill();
    text('!!', h.x, h.y - 6, 22, `rgba(255,230,230,${pulse})`, 'center');
    return;
  }
  if (h.kind === 'strike') {
    const k = 1 - clamp(h.t / 0.9, 0, 1);
    ctx.strokeStyle = c; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r, h.r * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(255,60,60,${0.1 + k * 0.3})`; ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r * k, h.r * 0.55 * k, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (h.kind === 'quake') {
    ctx.strokeStyle = c; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.ellipse(h.x, h.y, h.R, h.R * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawFx(f) {
  const k = 1 - f.t / (f.max ?? f.t);
  drawGimmickFx(f, k); drawPatternFx(f, k);
  if (f.kind === 'zap') {
    ctx.strokeStyle = '#fff36a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(f.x, f.y - TEAR_Z);
    for (let i = 1; i < 6; i++) ctx.lineTo(f.x + (f.x2 - f.x) * i / 6 + Math.random() * 12 - 6, f.y + (f.y2 - f.y) * i / 6 - TEAR_Z + Math.random() * 12 - 6);
    ctx.lineTo(f.x2, f.y2 - TEAR_Z); ctx.stroke();
  }
  if (f.kind === 'boom') { ctx.globalAlpha = 1 - k; ctx.fillStyle = f.color ?? '#f8a030'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.5 + k * 0.5), 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
  // 원뿔: 부채꼴이 퍼지며 사라진다. 바깥 테두리는 두 번째 색
  if (f.kind === 'cone') {
    const R = f.len * (0.55 + 0.45 * k), cy = f.y - TEAR_Z;
    ctx.save(); ctx.globalAlpha = 0.25 + (1 - k) * 0.5; ctx.fillStyle = f.color;
    ctx.beginPath(); ctx.moveTo(f.x, cy); ctx.arc(f.x, cy, R, f.a - f.half, f.a + f.half); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.accent; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(f.x, cy, R, f.a - f.half, f.a + f.half); ctx.stroke();
    ctx.restore();
  }
  if (f.kind === 'wave') { ctx.strokeStyle = `rgba(80,150,255,${1 - k})`; ctx.lineWidth = 10 * (1 - k) + 2; ctx.beginPath(); ctx.ellipse(f.x, f.y, 150 * k, 80 * k, 0, 0, Math.PI * 2); ctx.stroke(); }
  // 돌진 잔상: 지나간 자리에 타입 색의 빛이 남았다가 옅어진다
  if (f.kind === 'trail') { ctx.globalAlpha = (1 - k) * 0.55 * Math.min(1, k * 5); ctx.fillStyle = f.color; ctx.beginPath(); ctx.ellipse(f.x, f.y - 14, f.r * (1 - k * 0.5), f.r * 0.7 * (1 - k * 0.5), 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = (1 - k) * 0.8 * Math.min(1, k * 5); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(f.x, f.y - 14, f.r * 0.35 * (1 - k), f.r * 0.25 * (1 - k), 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
  if (f.kind === 'ring') { ctx.strokeStyle = `rgba(224,192,104,${1 - k})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(f.x, f.y, 90 * k, 45 * k, 0, 0, Math.PI * 2); ctx.stroke(); }
  if (f.kind === 'evo') { ctx.globalAlpha = 1 - k; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f.x, f.y - 30, 30 + k * 120, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
  if (f.kind === 'slash') { ctx.fillStyle = `rgba(255,255,255,${1 - k})`; for (let i = -1; i <= 1; i++) { ctx.save(); ctx.translate(f.x + i * 30, f.y - 30); ctx.rotate(-0.8); ctx.fillRect(-60, -2, 120, 4); ctx.restore(); } }
  if (f.kind === 'poof' || f.kind === 'splash') {
    ctx.fillStyle = f.color ?? '#ddd';
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.fillRect(Math.round(f.x + Math.cos(a) * 20 * k), Math.round(f.y - TEAR_Z + Math.sin(a) * 20 * k), 4, 4); }
  }
}

// 밤에는 화면이 어두워지고 플레이어 주변만 밝다
const nightCv = document.createElement('canvas'); nightCv.width = W; nightCv.height = H;
// 동굴 안은 낮에도 어둡다
const inCave = () => map === world && curNode?.kind === 'C';
const darkness = () => map === world ? Math.max(clamp(-Math.cos(dayTime / DAY * Math.PI * 2) * 0.75 - 0.1, 0, 0.62), inCave() ? 0.82 : 0) : 0;
function drawNight(px, py) {
  const d = darkness();
  if (d <= 0) return;
  const g = nightCv.getContext('2d');
  g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H);
  g.fillStyle = inCave() ? `rgba(16,10,4,${d})` : `rgba(10,18,52,${d})`; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'destination-out';
  const grad = g.createRadialGradient(px, py, 30, px, py, 200);
  grad.addColorStop(0, 'rgba(0,0,0,1)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  ctx.drawImage(nightCv, SIDE, HUD);
}

function drawPlay() {
  const p = player, cam = { x: clamp(p.x - W / 2, 0, map.tw * TS - W), y: clamp(p.y - H / 2, 0, map.th * TS - H) };
  ctx.save(); ctx.translate(SIDE, HUD);
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  ctx.translate(-Math.round(cam.x) + (shake > 0 ? Math.random() * 6 - 3 : 0), -Math.round(cam.y) + (shake > 0 ? Math.random() * 6 - 3 : 0));
  const [tx0, ty0, tx1, ty1] = drawTiles(cam);
  if (map.kind === 'indoor') drawRoomDecor();
  if (map.portal) drawPortal(map.portal);
  if (map.roadPortal) drawPortal(map.roadPortal);
  if (map.hoopa) drawHoopaRing(map.hoopa, map.hoopa.used ? 1 + (warp?.t ?? 0) : 1);
  const inView = (x, y, m = 120) => x > cam.x - m && x < cam.x + W + m && y > cam.y - m && y < cam.y + H + m * 2;
  const bob = Math.round(Math.sin(now * 5) * 3);
  for (const u of puddles) { ctx.fillStyle = 'rgba(160,64,160,.45)'; ctx.beginPath(); ctx.ellipse(u.x, u.y, u.r, u.r * 0.55, 0, 0, Math.PI * 2); ctx.fill(); }
  for (const k of map.pickups) {
    if (!inView(k.x, k.y)) continue;
    if (k.kind === 'berry') { drawShadow(k.x, k.y + 14, 30, 0); ctx.drawImage(IMG['oran-berry'], k.x - 30, k.y - 40 + bob, 60, 60); continue; }
    if (k.kind === 'candy') { drawShadow(k.x, k.y + 10, 24, 0); glowImg(IMG['rare-candy'], k.x - 22, k.y - 34 + bob, 44, 44, '#c8f'); continue; }
    const g = ballGrade(k);
    if (k.ball) {
      drawShadow(k.x, k.y + 4, 22, 0);
      // 마스터볼은 은은한 빛을 두른다
      if (g === 3) { ctx.save(); ctx.shadowColor = '#c8f'; ctx.shadowBlur = 10 + Math.sin(now * 4) * 4; }
      ctx.drawImage(IMG[BALLS[g]], k.x - 15, k.y - 24 + bob, 30, 30);
      if (g === 3) ctx.restore();
      continue;
    }
    // 받침대 위 물건: 받침대 앞면에 등급 볼을 붙인다
    ctx.fillStyle = '#666'; ctx.fillRect(k.x - 22, k.y + 6, 44, 20); ctx.fillStyle = '#999'; ctx.fillRect(k.x - 22, k.y + 6, 44, 4);
    ctx.drawImage(IMG[BALLS[g]], k.x - 9, k.y + 9, 18, 18);
    ctx.drawImage(IMG[k.kind === 'tm' ? k.tm.tm : k.item.id], k.x - 30, k.y - 54 + bob, 60, 60);
  }
  const enemies = map.enemies.filter(e => inView(e.x, e.y, 200));
  for (const e of enemies) p.seen.add(e.mon.id);
  if (map === world) for (const m of world.mouths) drawMouth(m);
  for (const h of hazards) drawHazard(h);
  for (const e of enemies) drawTelegraphs(e, 'ground');
  for (const e of enemies) if (e.fade < 0.9) drawShadow(e.x, e.y, bodyW(e, e.scale), pose(e, 1).lift);
  if (p.vanish <= 0) drawShadow(p.x, p.y, bodyW(p, 1), pose(p, 1).lift);
  for (const t of tears) drawShadow(t.x, t.y, t.r * 2, TEAR_Z);
  for (const b of bombs) drawShadow(b.x, b.y, 16, b.z);

  const list = [];
  for (let ty = ty0 - 1; ty <= ty1 + 1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    if (tx < 0 || ty < 0 || tx >= map.tw || ty >= map.th) continue;
    const v = map.solid[ty * map.tw + tx];
    if (v !== 1) continue;
    let key;
    if (map.kind === 'indoor') key = `arena:${roomAt(ty)?.type ?? map.type}`;
    else { const k = ty * map.tw + tx, kind = world.nodes[world.area[k]].kind; if (!world.zone[k] && !isGreen(kind)) continue; key = kind; }
    const img = obOf(key);
    list.push({ y: (ty + 1) * TS - 6, draw: () => ctx.drawImage(img, tx * TS, (ty + 1) * TS - img.height) });
  }
  for (const f of map.furn ?? []) list.push({ y: (f.y + f.h) * TS - 6, draw: () => { const img = furnTex(f.kind, map.type); ctx.drawImage(img, f.x * TS, (f.y + f.h) * TS - img.height); } });
  for (const b of map.buildings) if (inView(b.x * TS + b.w * TS / 2, b.y * TS, 400)) list.push({ y: (b.y + b.h) * TS, draw: () => drawBuilding(b) });
  for (const s of map.signs) if (inView(s.x, s.y)) list.push({ y: s.y, draw: () => drawSign(s) });
  for (const r of map.rooms ?? []) if (r.who) list.push({ y: (r.y0 + 1.6) * TS, draw: () => drawTrainerSprite(r.who.sprite, r.cx, (r.y0 + 1.6) * TS, false, r.cleared ? 0.7 : 1) });
  for (const n of map.npcs) if (inView(n.x, n.y)) list.push({ y: n.y, draw: () => drawTrainerSprite(n.sprite, n.x, n.y, n.flip, n.defeated ? 0.7 : 1, n.moving ? Math.abs(Math.sin(now * 10)) * 3 : 0) });
  for (const e of enemies) list.push({ y: e.y, draw: () => drawActor(e, e.scale, e.hit > 0 ? 0.4 : 1) });
  if (hasFx('bulwark') && p.shieldUp) { ctx.strokeStyle = `rgba(200,212,232,${0.5 + Math.abs(Math.sin(now * 3)) * 0.3})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(p.x, p.y - 16, 30, 34, 0, 0, Math.PI * 2); ctx.stroke(); }
  if (p.surge > 0) { ctx.strokeStyle = `rgba(255,150,210,${0.4 + Math.abs(Math.sin(now * 8)) * 0.4})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(p.x, p.y, 30, 14, 0, 0, Math.PI * 2); ctx.stroke(); }
  list.push({ y: p.y, draw: () => drawActor(p, (p.warpS ?? 1) * (p.dmax ? 1.4 : 1), p.vanish > 0 ? 0.15 : p.warpS !== undefined ? p.warpS : p.inv > 0 && Math.floor(p.inv * 10) % 2 ? 0.3 : 1) });
  for (const t of tears) list.push({ y: t.y, draw: () => {
    const s = t.r * 2, x = Math.round(t.x - t.r), y = Math.round(t.y - TEAR_Z - t.r);
    // 불·독이 얹힌 탄: 뒤로 불씨·독방울이 흩날린다
    if (t.fire || t.psn) for (let i = 0; i < 3; i++) { ctx.fillStyle = t.fire && (i % 2 || !t.psn) ? (i ? '#ffb030' : '#ff5020') : '#b050e0'; ctx.fillRect(Math.round(t.x - t.vx * 0.02 * (i + 1) + Math.random() * 6 - 3), Math.round(t.y - TEAR_Z - t.vy * 0.02 * (i + 1) + Math.random() * 6 - 3), 4, 4); }
    // 에어슬래시: 날아가는 방향으로 길쭉한 칼날
    if (t.blade) {
      ctx.save(); ctx.translate(t.x, t.y - TEAR_Z); ctx.rotate(Math.atan2(t.vy, t.vx));
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(t.r * 2.4, 0); ctx.lineTo(0, -t.r * 0.9); ctx.lineTo(-t.r * 1.6, 0); ctx.lineTo(0, t.r * 0.9); ctx.fill();
      ctx.fillStyle = t.color ?? '#dff'; ctx.beginPath(); ctx.moveTo(t.r * 2, 0); ctx.lineTo(0, -t.r * 0.6); ctx.lineTo(-t.r * 1.3, 0); ctx.lineTo(0, t.r * 0.6); ctx.fill();
      ctx.fillStyle = t.accent ?? '#fff'; ctx.fillRect(-t.r * 0.6, -1, t.r * 2, 2);
      ctx.restore(); return;
    }
    // 구슬처럼 큰 탄은 둥글게: 바깥 테두리, 몸통, 가운데 색, 빛 반사
    if (t.r >= 12) {
      const cx = t.x, cy = t.y - TEAR_Z, pul = 1 + Math.sin(now * 14 + t.x * 0.05) * 0.05, R = t.r * pul;
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, cy, R + 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = t.color ?? TYPE_COLOR[t.type] ?? '#fff'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
      if (t.accent) { ctx.fillStyle = t.accent; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(cx, cy, R * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(cx - R * 0.35, cy - R * 0.35, Math.max(2, R * 0.2), 0, Math.PI * 2); ctx.fill();
      return;
    }
    ctx.fillStyle = '#000'; ctx.fillRect(x - 2, y - 2, s + 4, s + 4);
    ctx.fillStyle = t.color ?? TYPE_COLOR[t.type] ?? '#fff'; ctx.fillRect(x, y, s, s);
    // 가운데 색: 두 번째 기술(또는 조합)의 색
    if (t.accent && s >= 10) { const q = Math.max(4, Math.round(s * 0.45)), o = Math.round((s - q) / 2); ctx.fillStyle = t.accent; ctx.fillRect(x + o, y + o, q, q); }
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x + 2, y + 2, 4, 4);
  } });
  for (const b of bombs) list.push({ y: b.y, draw: () => {
    const x = Math.round(b.x), y = Math.round(b.y - 10 - b.z);
    ctx.fillStyle = '#000'; ctx.fillRect(x - 8, y - 11, 16, 22); ctx.fillRect(x - 10, y - 7, 20, 14);
    ctx.fillStyle = '#f4ecd8'; ctx.fillRect(x - 6, y - 9, 12, 18); ctx.fillRect(x - 8, y - 5, 16, 10);
    ctx.fillStyle = p.pcol?.[0] ?? '#7cb342'; ctx.fillRect(x - 4, y - 4, 4, 4); ctx.fillStyle = p.pcol?.[1] ?? '#7cb342'; ctx.fillRect(x + 2, y + 2, 4, 4);
  } });
  for (const s of pstrikes) list.push({ y: s.y, draw: () => { ctx.fillStyle = s.type === 'ground' ? '#a07848' : '#7a6a48'; ctx.fillRect(s.x - 10, s.y - 20 - Math.max(0, s.t) * 300, 20, 18); } });
  list.sort((a, b) => a.y - b.y).forEach(a => a.draw());
  for (const e of enemies) drawTelegraphs(e, 'air');
  beams.forEach(drawBeam);
  fx.forEach(drawFx);

  const talkable = !map.battle && map.npcs.find(n => n.kind !== 'gymtrainer' && Math.hypot(n.x - p.x, n.y - p.y) < 90);
  // 방 맨 위에 선 NPC(간호순, 점원)는 머리 위가 화면 밖이라 아래로 내려 그린다
  if (talkable) { const ey = Math.max(talkable.y - 104, 4); ctx.fillStyle = '#fff'; ctx.fillRect(talkable.x - 9, ey, 18, 18); text('E', talkable.x, ey + 14, 13, '#000'); }
  if (p.charge > 0) {
    const full = p.charge >= chargeTime(), top = p.y - bodyH(p, 1) - 14;
    ctx.fillStyle = '#000'; ctx.fillRect(p.x - 20, top, 40, 8);
    ctx.fillStyle = full && Math.floor(now * 12) % 2 ? '#fff' : '#f07020';
    ctx.fillRect(p.x - 18, top + 2, 36 * Math.min(1, p.charge / chargeTime()), 4);
  }
  for (const t of texts) text(t.text, t.x, t.y, t.size ?? 14, t.color);
  ctx.restore();

  drawNight(p.x - cam.x, p.y - cam.y);
  if (timeStop > 0) { ctx.fillStyle = 'rgba(120,140,220,.22)'; ctx.fillRect(SIDE, HUD, W, H); }
  if (p.warpIn > 0) { ctx.fillStyle = `rgba(250,240,255,${Math.min(1, p.warpIn)})`; ctx.fillRect(SIDE, HUD, W, H); }
  // 다우징머신: 가까운 몬스터볼 방향 화살표
  if (p.dowsing && map === world) {
    const ball = map.pickups.filter(k => k.ball).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    if (ball && Math.hypot(ball.x - p.x, ball.y - p.y) > 150) {
      const a = Math.atan2(ball.y - p.y, ball.x - p.x), sx = SIDE + p.x - cam.x + Math.cos(a) * 70, sy = HUD + p.y - cam.y - 30 + Math.sin(a) * 70;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(a); ctx.fillStyle = '#6cf'; ctx.fillRect(-8, -3, 16, 6); ctx.fillRect(4, -7, 6, 14); ctx.restore();
    }
  }
  const boss = map.enemies.find(isBig);
  if (boss) {
    ctx.fillStyle = '#000'; ctx.fillRect(SIDE + W / 2 - 202, HUD + H - 34, 404, 16);
    ctx.fillStyle = boss.rank === 'legend' ? '#c8f' : '#c33'; ctx.fillRect(SIDE + W / 2 - 200, HUD + H - 32, 400 * Math.max(boss.hp, 0) / boss.maxHp, 12);
    text(boss.mon.name, SIDE + W / 2, HUD + H - 38, 14);
  }
  drawItemInfo();
  // 배너: 화면 폭을 넘으면 줄을 나눠 가운데 정렬
  if (banner) lines(banner.text, W - 40, 18).forEach((l, i) => banner.glow ? glowText(l, SIDE + W / 2, HUD + H / 2 - 70 + i * 24, 18, '#ff8', banner.glow) : text(l, SIDE + W / 2, HUD + H / 2 - 70 + i * 24, 18, '#ff8'));
  // NPC 대사: 원작처럼 화면 아래 대화창
  // 대사가 길면 줄을 나누고 창이 위로 늘어난다 (한 줄일 때는 예전과 같은 크기)
  if (dialog) {
    const x = SIDE + 16, w = W - 32, ls = lines(dialog.text, w - 40, 15), h = 54 + ls.length * 22, y = HUD + H - 12 - h - (boss ? 48 : 0);
    ctx.fillStyle = OUT; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#f8f8f8'; ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
    ctx.fillStyle = '#a8c0e0'; ctx.fillRect(x + 8, y + 8, w - 16, 2); ctx.fillRect(x + 8, y + h - 10, w - 16, 2);
    plain(dialog.name, x + 20, y + 30, 13, '#d04848');
    ls.forEach((l, i) => plain(l, x + 20, y + 54 + i * 22, 15));
  }

  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, CW, HUD);
  for (let k = 0; k < Math.ceil(p.maxHp / 2); k++) drawHeart(10 + (k % 12) * 24, k < 12 ? 14 : 36, clamp(p.hp - k * 2, 0, 2));
  drawBadges(SIDE + W / 2 - 72, 14);
  text(inCave() ? '동굴' : darkness() > 0.3 ? '밤' : '낮', SIDE + W / 2, 50, 11, inCave() ? '#c9a' : darkness() > 0.3 ? '#99f' : '#fd6');
  const cols = Math.max(...world.nodes.map(n => n.gx)) + 1, rows = Math.max(...world.nodes.map(n => n.gy)) + 1, sy = Math.min(8, Math.floor((HUD - 10) / rows));
  drawRegionMap(CW - 10 - cols * 14 + 7, 6, 14, sy, false);
  drawPanel();
}

function drawBigMap() {
  ctx.fillStyle = 'rgba(0,0,0,.85)'; ctx.fillRect(SIDE, HUD, W, H);
  const cols = Math.max(...world.nodes.map(n => n.gx)) + 1, rows = Math.max(...world.nodes.map(n => n.gy)) + 1, s = Math.min((W - 80) / cols, (H - 80) / rows);
  drawRegionMap(SIDE + (W - (cols - 1) * s) / 2, HUD + (H - (rows - 1) * s) / 2 + 10, s, s, true);
  text(`${region.name}지방 지도 (M 닫기) · ★ 전설의 기운${player.townMap ? ' · 숫자 = 체육관 순서, ✔ = 배지 획득' : ''}`, SIDE + W / 2, HUD + 24, 14, '#ff8');
}

function drawLearn() {
  const p = player, k = learnTm, x = SIDE + 120, w = 480, rows = [...p.moves].map(moveDef);
  const blocks = rows.map(m => lines(`${m.name} — ${m.desc}`, w - 60, 11)), nl = lines(`새 기술: ${k.tm.desc}`, w - 60, 11);
  const h = 120 + blocks.reduce((a, b) => a + b.length * 16 + 8, 0) + nl.length * 16, y = HUD + Math.max(10, (H - h) / 2);
  ctx.fillStyle = 'rgba(0,0,0,.9)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = k.tm.legend ? '#fd6' : TYPE_COLOR[k.tm.type]; ctx.strokeRect(x, y, w, h);
  nameText(k.tm, `${p.mon.name}은(는) ${k.tm.name}을(를) 배우고 싶다!`, x + w / 2, y + 32, 15, '#fff', 'center');
  text('하지만 기술을 4개까지만 기억할 수 있다. 잊을 기술을 고르세요.', x + w / 2, y + 56, 11, '#aaa');
  let yy = y + 88;
  blocks.forEach((b, i) => { const m = rows[i]; taps.push({ x, y: yy - 14, w, h: b.length * 16 + 6, fn: () => decideLearn(i) }); text(`${i + 1}.`, x + 20, yy, 11, '#fff', 'left'); b.forEach(l => { nameText(m, l, x + 40, yy, 11, m.legend ? '#fd6' : TYPE_COLOR[m.type]); yy += 16; }); yy += 8; });
  taps.push({ x, y: yy - 12, w, h: 22, fn: () => decideLearn(null) });
  text(TOUCH ? '여기를 누르면 배우지 않는다 (기술머신은 사라진다)' : '5 / Esc. 배우지 않는다 (기술머신은 사라진다)', x + 20, yy + 4, 11, '#ccc', 'left');
  nl.forEach((l, i) => text(l, x + 40, yy + 24 + i * 16, 11, '#ccc', 'left'));
}
