// 계정(Google·게스트, Firebase 동기화)과 시작 화면
// ---------- 계정: Google 로그인 / 게스트. Firebase(인증 + Firestore)로 기록을 클라우드에 맞춰 둔다 ----------
// Firebase 콘솔 → 프로젝트 설정 → 내 앱(웹)의 firebaseConfig 값을 그대로 붙여 넣는다. 공개돼도 되는 값이다(보안은 Firestore 규칙이 맡음)
// 비어 있으면 Google 로그인 버튼이 꺼지고, 게스트(이 기기에만 저장)로만 할 수 있다
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCuhPMTCGdzf3FRfWfTTLhsziAZG0L3JmQ',
  authDomain: 'pokemon-roguelike.firebaseapp.com',
  projectId: 'pokemon-roguelike',
  storageBucket: 'pokemon-roguelike.firebasestorage.app',
  messagingSenderId: '149034794320',
  appId: '1:149034794320:web:cc93730b3318835a9dc055',
};
const FB_VER = '10.12.2', FB = `https://www.gstatic.com/firebasejs/${FB_VER}`;
const GUEST_KEY = 'pokemon-dungeon-guest';
// 클라우드로 맞추는 기록: 도감, 이로치, 전설, 스타팅, 클리어한 지방, 도전과제, 이어하기, 안내, 볼륨
const SYNC_KEYS = () => [DEX_KEY, SEEN_KEY, SHINY_KEY, LEGEND_KEY, STARTER_KEY, CLEAR_KEY, ACH_KEY, SAVE_KEY, TUT_KEY, VOL_KEY];
let acct = { ready: !FIREBASE_CONFIG, user: null, status: '', busy: false }, fb = null, syncing = false, upT = null;

function onStoreChange(k) {
  if (syncing || !acct.user || !SYNC_KEYS().includes(k)) return;
  clearTimeout(upT); upT = setTimeout(uploadAll, 3000);
}

async function initAccount() {
  if (!FIREBASE_CONFIG) return;
  try {
    const [app, auth, fs] = await Promise.all(['app', 'auth', 'firestore'].map(m => import(`${FB}/firebase-${m}.js`)));
    const a = app.initializeApp(FIREBASE_CONFIG);
    fb = { ...auth, ...fs, auth: auth.getAuth(a), db: fs.getFirestore(a) };
    await fb.getRedirectResult(fb.auth).catch(() => {});
    fb.onAuthStateChanged(fb.auth, async u => {
      acct.user = u && { uid: u.uid, name: u.displayName || (u.isAnonymous ? '게스트' : '트레이너'), anon: u.isAnonymous, photo: u.photoURL };
      acct.ready = true;
      if (u) await pullAndMerge();
    });
  } catch (e) { acct.ready = true; acct.status = `계정 서비스를 불러오지 못했다 (${e.message})`; }
}

// 클라우드와 이 기기의 기록을 합친다: 목록은 합집합, 이어하기는 더 최근 것, 안내는 둘 중 하나라도 끝났으면 끝
function mergeValue(k, a, b) {
  if (a == null) return b; if (b == null) return a;
  if (k === SAVE_KEY) return (b.at ?? 0) > (a.at ?? 0) ? b : a;
  if (k === TUT_KEY) return a || b;
  if (k === VOL_KEY) return a;
  if (Array.isArray(a) && Array.isArray(b)) return [...new Set([...a, ...b])];
  return a;
}
async function pullAndMerge() {
  acct.status = '기록을 맞추는 중...'; acct.busy = true;
  try {
    const snap = await fb.getDoc(fb.doc(fb.db, 'users', acct.user.uid)), cloud = snap.exists() ? snap.data().data ?? {} : {};
    syncing = true;
    for (const k of SYNC_KEYS()) {
      const merged = mergeValue(k, store.get(k), cloud[k] != null ? JSON.parse(cloud[k]) : null);
      if (merged != null) store.set(k, merged);
    }
    syncing = false;
    reloadProgress();
    await uploadAll();
    acct.status = '클라우드에 기록이 저장된다';
  } catch (e) { syncing = false; acct.status = `동기화 실패: ${e.code ?? e.message}`; }
  acct.busy = false;
}
async function uploadAll() {
  if (!fb || !acct.user) return;
  const data = Object.fromEntries(SYNC_KEYS().map(k => [k, localStorage.getItem(k)]).filter(([, v]) => v != null));
  try { await fb.setDoc(fb.doc(fb.db, 'users', acct.user.uid), { data, name: acct.user.name, updatedAt: fb.serverTimestamp() }); }
  catch (e) { acct.status = `저장 실패: ${e.code ?? e.message}`; }
}
// 합친 기록을 게임이 들고 있는 값에 다시 반영
function reloadProgress() {
  const fill = (set, k) => { set.clear(); (store.get(k) ?? []).forEach(v => set.add(v)); };
  fill(DEX, DEX_KEY); fill(SEEN, SEEN_KEY); fill(SHINY, SHINY_KEY); fill(STARTERS, STARTER_KEY); fill(CLEARED, CLEAR_KEY); fill(ACHIEVED, ACH_KEY);
  Object.assign(VOL, store.get(VOL_KEY) ?? {}); applyVolume();
  tutDone = !!store.get(TUT_KEY);
}

async function googleLogin() {
  if (!fb) return acct.status = 'Google 로그인이 아직 설정되지 않았다 (FIREBASE_CONFIG)';
  const provider = new fb.GoogleAuthProvider(), cur = fb.auth.currentUser;
  acct.busy = true; acct.status = 'Google 로그인 창을 여는 중...';
  try {
    // 게스트로 하던 기록은 Google 계정에 그대로 이어 붙인다
    if (cur?.isAnonymous) {
      try { await fb.linkWithPopup(cur, provider); await cur.reload(); acct.user = { ...acct.user, name: fb.auth.currentUser.displayName ?? '트레이너', anon: false }; await uploadAll(); acct.status = '게스트 기록을 Google 계정에 연결했다'; }
      catch (e) {
        if (e.code !== 'auth/credential-already-in-use') throw e;
        await fb.signInWithCredential(fb.auth, fb.GoogleAuthProvider.credentialFromError(e));  // 이미 쓰던 Google 계정이면 그쪽으로 들어가서 합친다
      }
    } else await fb.signInWithPopup(fb.auth, provider);
    store.del(GUEST_KEY);
  } catch (e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') return fb.signInWithRedirect(fb.auth, provider);
    acct.status = e.code === 'auth/popup-closed-by-user' ? '로그인을 취소했다' : `로그인 실패: ${e.code ?? e.message}`;
  } finally { acct.busy = false; }
}
async function guestLogin() {
  store.set(GUEST_KEY, true);
  if (fb && !fb.auth.currentUser) {
    acct.busy = true;
    try { await fb.signInAnonymously(fb.auth); } catch { acct.status = '게스트 기록은 이 기기에만 저장된다'; }
    acct.busy = false;
  }
  state = 'region';
}
async function logout() {
  await uploadAll();
  if (fb) await fb.signOut(fb.auth);
  store.del(GUEST_KEY); acct.user = null; acct.status = '로그아웃했다';
}

// ---------- 시작 화면 ----------
let titleCur = FIREBASE_CONFIG || store.get(GUEST_KEY) ? 0 : 1, titleMons = [];
const titleItems = () => {
  const guest = acct.user?.anon || (!acct.user && store.get(GUEST_KEY));
  if (acct.user && !acct.user.anon) return [['모험 시작', () => state = 'region'], ['로그아웃', logout]];
  if (guest) return [['게스트로 계속하기', () => state = 'region'], ['Google 계정 연결', googleLogin], ...(acct.user ? [['로그아웃', logout]] : [])];
  return [['Google로 시작하기', googleLogin], ['게스트로 시작하기', guestLogin]];
};
function titleSelect(i) { const it = titleItems()[i]; if (!it || acct.busy) return; sfx('select'); it[1](); }
// 시작 화면을 걸어 다니는 스타팅들: 처음 한 번만 불러오고, 실패해도 화면은 그대로
const loadTitleMons = () => Promise.all([1, 4, 7, 25].map(id => loadMon(id).then(() => MON[id]).catch(() => null))).then(ms => titleMons = ms.filter(Boolean));

function drawTitle() {
  // 하늘 → 먼 산 → 풀밭. 풀밭 줄무늬가 천천히 흘러간다
  const sky = ctx.createLinearGradient(0, 0, 0, CH);
  sky.addColorStop(0, '#1b2a5a'); sky.addColorStop(0.55, '#4f7fc0'); sky.addColorStop(0.56, '#5f9b45'); sky.addColorStop(1, '#3f7a3a');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, CW, CH);
  ctx.fillStyle = '#35507e';
  for (let i = 0; i < 9; i++) { const x = i * 120 - 40, h = 50 + (i * 37) % 60; ctx.beginPath(); ctx.moveTo(x, CH * 0.56); ctx.lineTo(x + 70, CH * 0.56 - h); ctx.lineTo(x + 140, CH * 0.56); ctx.fill(); }
  for (let i = 0; i < 16; i++) { const x = ((i * 70 - now * 30) % (CW + 70) + CW + 70) % (CW + 70) - 70; ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(x, CH * 0.56, 34, CH); }
  // 별
  for (let i = 0; i < 40; i++) { const x = (i * 97) % CW, y = (i * 53) % 150, a = 0.3 + 0.3 * Math.sin(now * 2 + i); ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(x, y, 2, 2); }
  // 걸어가는 포켓몬
  titleMons.forEach((m, i) => {
    const b = m.box, sc = 0.9, x = ((now * 40 + i * (CW / titleMons.length)) % (CW + 120)) - 60, y = CH * 0.78 + (i % 2) * 26, hop = Math.abs(Math.sin(now * 6 + i)) * 4;
    drawShadow(x, y, 26, 0);
    ctx.save(); ctx.translate(x, y - hop); ctx.scale(-1, 1); ctx.drawImage(m.img, -(b.x0 + b.x1) / 2 * sc, -b.y1 * sc, 96 * sc, 96 * sc); ctx.restore();
  });
  // 로고
  const bob = Math.sin(now * 1.6) * 4;
  glowText('포켓몬 던전 로그', CW / 2, 112 + bob, 54, '#ffe066', '#fa0');
  text('9개 지방을 누비는 로그라이크 팬게임', CW / 2, 150 + bob, 14, '#dfe8ff');
  // 메뉴
  const items = titleItems(), w = 300, h = 40, x0 = CW / 2 - w / 2, y0 = 200;
  titleCur = clamp(titleCur, 0, items.length - 1);
  items.forEach(([label], i) => {
    const y = y0 + i * (h + 12), on = i === titleCur, dis = label.startsWith('Google') && !FIREBASE_CONFIG;
    ctx.fillStyle = on ? 'rgba(20,30,60,.92)' : 'rgba(10,14,30,.75)'; ctx.fillRect(x0, y, w, h);
    ctx.strokeStyle = on ? '#ffe066' : 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.strokeRect(x0 + 1, y + 1, w - 2, h - 2);
    if (label.startsWith('Google')) drawGoogleG(x0 + 26, y + h / 2);
    text(label, CW / 2 + (label.startsWith('Google') ? 10 : 0), y + 26, 16, dis ? '#777' : on ? '#ffe066' : '#fff');
    taps.push({ x: x0, y, w, h, fn: () => { titleCur = i; titleSelect(i); } });
  });
  // 계정 상태
  const who = acct.user ? (acct.user.anon ? '게스트 (클라우드 저장)' : `${acct.user.name} 님`) : store.get(GUEST_KEY) ? '게스트 (이 기기에만 저장)' : '로그인하지 않음';
  text(who, CW / 2, y0 + items.length * (h + 12) + 18, 12, '#cfe');
  const note = acct.status || (!FIREBASE_CONFIG ? 'Google 로그인은 아직 준비 중 · 게스트 기록은 이 기기의 브라우저에만 저장됩니다' : !acct.ready ? '계정 확인 중...' : 'Google로 로그인하면 다른 기기에서도 기록이 이어집니다');
  text(acct.busy ? `${note} ${'.'.repeat(Math.floor(now * 3) % 4)}` : note, CW / 2, y0 + items.length * (h + 12) + 38, 11, '#9ab');
  text(TOUCH ? '버튼을 누르세요' : '↑ ↓ 고르기 · Enter 결정 · F 전체 화면', CW / 2, CH - 16, 11, 'rgba(255,255,255,.55)');
}
function drawGoogleG(x, y) {
  ctx.save(); ctx.lineWidth = 4;
  [['#ea4335', -2.4, -0.9], ['#fbbc05', 2.4, 3.6], ['#34a853', 0.9, 2.4], ['#4285f4', -0.9, 0.2]].forEach(([c, a0, a1]) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(x, y, 8, a0, a1); ctx.stroke(); });
  ctx.fillStyle = '#4285f4'; ctx.fillRect(x, y - 2, 9, 4);
  ctx.restore();
}
