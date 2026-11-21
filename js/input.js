// 키보드·마우스 입력
addEventListener('keydown', e => {
  keys[e.code] = true; initAudio();
  if (e.code === 'KeyN') muted = !muted;
  if (e.code === 'KeyF' && !e.repeat && !TOUCH) toggleFullscreen();
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  const d = /^Digit[0-9]$/.test(e.code) ? +e.code.slice(5) : null;
  if (state === 'title') {
    const n = titleItems().length;
    if (['ArrowUp', 'KeyW'].includes(e.code)) { titleCur = (titleCur + n - 1) % n; sfx('menu'); }
    else if (['ArrowDown', 'KeyS'].includes(e.code)) { titleCur = (titleCur + 1) % n; sfx('menu'); }
    else if (['Enter', 'Space', 'KeyE', 'KeyZ'].includes(e.code)) titleSelect(titleCur);
  }
  else if (state === 'region') { if (e.code === 'Escape') state = 'title'; else if (d !== null) chooseRegion(d - 1); else if (e.code === 'KeyT') state = 'ach'; else if (e.code === 'KeyC' || e.code === 'Enter') continueRun(); }
  else if (state === 'ach') { if (e.code === 'KeyT' || e.code === 'Escape') state = 'region'; }
  else if (state === 'select') {
    if (d) { const c = starterCards()[d - 1]; if (c) chooseStarter(c.i); }
    else if (SEL_STEP[e.code]) selCur = clamp(selCur + SEL_STEP[e.code], 0, starterIds().length - 1);
    else if (e.code === 'Enter') chooseStarter(selCur);
    else if (e.code === 'KeyX') selShiny = !selShiny;
    else if (e.code === 'Escape') state = 'region';
  }
  else if (state === 'play') { if (e.code === 'KeyR' && !e.repeat) player.quitArm = true; if (e.code === 'Space') player.dashQ = true; if (e.code === 'KeyE') talk(); else if (e.code === 'KeyM') { state = 'map'; player.opened = true; } else if (e.code === 'Escape') { openMenu(); player.opened = true; } else if (e.code === 'KeyH') skipTutorial(); }
  else if (state === 'pause') menuKey(e.code);
  else if (state === 'map') { if (e.code === 'KeyM' || e.code === 'Escape') state = 'play'; }
  else if (state === 'zpick') { if (d >= 1 && d <= player.moves.size) setZ([...player.moves][d - 1]); }
  else if (state === 'learn') { if (d >= 1 && d <= player.moves.size) decideLearn(d - 1); else if (d === 5 || e.code === 'Escape') decideLearn(null); }
  else if (state === 'shop') { if (d >= 1 && d <= 9) buy(d === 9 ? SHOP.length : d - 1); else if (e.code === 'Escape' || e.code === 'KeyE') state = 'play'; }
  else if ((state === 'dead' || state === 'win') && e.code === 'KeyR') state = 'region';
});
addEventListener('keyup', e => keys[e.code] = false);
addEventListener('pagehide', () => saveRun());
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveRun(); });
cv.addEventListener('click', e => {
  initAudio();
  const rect = cv.getBoundingClientRect(), x = (e.clientX - rect.left) / rect.width * CW, y = (e.clientY - rect.top) / rect.height * CH;
  const hit = c => x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h;
  const tap = [...taps].reverse().find(hit);
  if (tap) return tap.fn();
  // 휴대폰: A·B 버튼 대신 화면을 눌러 진행 (대화·다음, 결과 화면 닫기, 지도·상점 닫기)
  if (TOUCH) {
    const k = { play: 'KeyE', title: 'Enter', dead: 'KeyR', win: 'KeyR', map: 'KeyM', shop: 'Escape' }[state];
    if (k) { dispatchEvent(new KeyboardEvent('keydown', { code: k })); dispatchEvent(new KeyboardEvent('keyup', { code: k })); return; }
  }
  if (state === 'region') { const i = [...REGIONS, null].findIndex((_, i) => hit(regionCard(i))); if (i >= 0) chooseRegion(i); }
  else if (state === 'select') { const c = starterCards().find(hit); if (c) c.i === selCur ? chooseStarter(c.i) : selCur = c.i; }
});
