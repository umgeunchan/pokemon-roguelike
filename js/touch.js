// 휴대폰·태블릿 터치 조작
// ---------- 터치 조작: 스틱과 버튼은 키보드 키를 누른 것처럼 키 이벤트를 보낸다 ----------
const sendKey = (code, down) => dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
function setupTouch() {
  if (!TOUCH) return;
  document.body.classList.add('touch');
  // 스틱: 왼쪽은 WASD(8방향, 메뉴에서는 꾹 누르면 반복), 오른쪽은 방향키(공격, 4방향)
  const stick = (el, codes, eight) => {
    const knob = el.querySelector('i');
    let id = null, held = [], rep = null;
    const set = next => {
      for (const c of held) if (!next.includes(c)) sendKey(c, false);
      for (const c of next) if (!held.includes(c)) sendKey(c, true);
      held = next;
      clearInterval(rep);
      if (next.length && eight) rep = setInterval(() => { if (state !== 'play') next.forEach(c => sendKey(c, true)); }, 260);
    };
    const move = e => {
      const r = el.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), d = Math.hypot(dx, dy), max = r.width / 2 - 18;
      const k = Math.min(1, max / (d || 1));
      knob.style.transform = `translate(${dx * k}px,${dy * k}px)`;
      if (d < 18) return set([]);
      const [U, D, L, R] = codes;
      if (eight) { const out = []; if (dy < -d * 0.38) out.push(U); if (dy > d * 0.38) out.push(D); if (dx < -d * 0.38) out.push(L); if (dx > d * 0.38) out.push(R); set(out); }
      else set([Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? L : R) : (dy < 0 ? U : D)]);
    };
    el.addEventListener('pointerdown', e => { initAudio(); id = e.pointerId; el.setPointerCapture(id); move(e); e.preventDefault(); });
    el.addEventListener('pointermove', e => { if (e.pointerId === id) move(e); });
    const end = e => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; set([]); };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  };
  stick($('#stickL'), ['KeyW', 'KeyS', 'KeyA', 'KeyD'], true);
  stick($('#stickR'), ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'], false);
  // 버튼: 화면 상태에 따라 알맞은 키로 바꿔 보낸다
  const btn = (el, codeFor) => {
    let code = null;
    el.addEventListener('pointerdown', e => { initAudio(); e.preventDefault(); el.setPointerCapture(e.pointerId); el.classList.add('on'); code = codeFor(); if (code) sendKey(code, true); });
    const up = () => { el.classList.remove('on'); if (code) sendKey(code, false); code = null; };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  };
  const ended = () => state === 'dead' || state === 'win';
  btn($('#bA'), () => ended() ? 'KeyR' : ['title', 'region', 'select'].includes(state) ? 'Enter' : 'KeyE');
  btn($('#bB'), () => ended() ? 'KeyR' : 'Escape');
  btn($('#bDash'), () => 'Space');
  btn($('#bMap'), () => state === 'map' ? 'KeyM' : state === 'play' ? 'KeyM' : null);
}
setupTouch();
