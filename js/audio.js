// 배경음(합성 곡)과 효과음
// ---------- 배경음: 직접 작곡한 휴대용 게임기풍 곡을 Web Audio로 합성한다 (bgm 폴더에 mp3가 있으면 그쪽이 먼저) ----------
// 곡 = intro(한 번) + loop(반복) 구간들. 구간마다:
//   chords: 마디마다 화음 하나('Am,G'는 반 마디씩). lead: 한 토큰이 8분음표, 'C5+D5'는 16분음표 둘, '-'는 앞 음 늘이기, '.'는 쉼표, '|'는 마디 구분(무시)
//   bass: oct(근음·옥타브) walk(근음·5도·옥타브) gallop(16분 질주) five(4분 근음·5도) pulse(2분 근음)
//   comp: arp(16분 분산화음) stab(엇박 화음) drive(파워코드 8분) pad(현악 같은 긴 화음)
//   drums(16분 한 글자): k 킥, s 스네어, h 닫힌 하이햇, o 열린 하이햇, c 심벌, t·T 낮은·높은 탐. fill은 구간 마지막 마디에 대신 친다
//   twin: 멜로디 아래 화음음으로 두 번째 펄스가 따라간다. shift: 멜로디 옥타브 이동(반음 단위)
const SEC = (chords, lead, o = {}) => ({ chords, lead, bass: 'oct', comp: 'arp', drums: 'k.h.s.h.k.h.s.h.', ...o });
const SONGS = {
  town: { bpm: 100, loop: [
    SEC('C Am F G C Am Dm G', 'E5 - G5 - C6 - B5 A5 | A5 - E5 - C5 - E5 - | F5 - A5 - C6 - D6 C6 | B5 - - - G5 - - . | E5 - G5 - C6 - E6 D6 | C6 - A5 - E5 - A5 B5 | C6 - - A5 F5 - D5 F5 | G5 - - - - . . .',
      { bass: 'five', drums: 'k...h...s...h...' }),
    SEC('F G Em Am F G C C', 'A5 - G5 F5 - E5 F5 - | G5 - F5 E5 - D5 E5 - | E5 - D5 C5 - B4 C5 - | A4 - C5 - E5 - A5 - | A5 - C6 - F6 - E6 D6 | D6 - B5 - G5 - B5 D6 | C6 - - - G5 - E5 - | C5 - - - . . . .',
      { bass: 'five', drums: 'k...h.h.s...h...', twin: true })] },
  route: { bpm: 152, intro: SEC('G D', 'D5 - G5+A5 B5 - A5 G5 D5 | E5 - F#5+G5 A5 - - . .', { comp: 'stab', drums: 'k...s...k.k.s.ss' }), loop: [
    SEC('G C D G Em C A7 D', 'B4 D5 G5 - F#5 G5 A5 - | G5 E5 C5 - E5+F#5 G5 E5 - | F#5 - A5 - D6 - C6 B5 | B5 - G5 - - . D5+E5 F#5 | G5 - E5 G5 B5 - A5 G5 | E5 - C5 E5 G5 - A5 B5 | C#6 - A5 - E5 - G5 - | F#5 - - - A5+G5 F#5 E5 D5',
      { bass: 'walk', comp: 'stab', drums: 'k.h.s.hkk.h.s.h.', twin: true }),
    SEC('C D Bm Em C D G G', 'E6 - - D6 C6 - G5 - | A5 - B5 C6 D6 - F#5 - | B5 - - A5 F#5 - D5 - | E5+F#5 G5 B5 E6 - D6 B5 - | C6 - B5 A5 G5 - E5 G5 | A5 - B5 - C6 - D6 - | B5 - D6 - G6 - - . | G5+A5 B5 A5 G5 F#5 G5 D5 .',
      { bass: 'walk', comp: 'arp', drums: 'k.h.s.hkk.h.s.hs', fill: 'k.s.k.s.s.ssTTtt', twin: true })] },
  forest: { bpm: 112, loop: [
    SEC('Em C D Bm Em C Am B', 'B5 . G5 . E5 . G5 B5 | C6 - - - G5 - E5 - | D6 . A5 . F#5 . A5 D6 | B5 - - - F#5 - - . | E6 . B5 . G5 . B5 E6 | E6 - D6 - C6 - G5 - | A5 - C6 - E6 - D6 C6 | B5 - - - D#6 - - .',
      { bass: 'five', drums: 'h...s...h.h.s...' }),
    SEC('C D G Em Am B Em Em', 'G5 - - - E5 - G5 C6 | A5 - - - F#5 - A5 D6 | B5 - - D6 - B5 G5 - | E5 - G5 - B5 - - . | C6 - B5 A5 - E5 A5 - | B5 - A5 - F#5 - D#5 - | E5 - - - G5 - B5 - | E5 - - - . . . .',
      { bass: 'five', drums: 'h...s...h.h.s.h.', twin: true })] },
  cave: { bpm: 84, loop: [
    SEC('Dm Dm Bb A Dm Dm Gm A', 'D5 - - . F5 - E5 . | D5 - - - A4 - - . | Bb4 - - . D5 - F5 . | E5 - - - C#5 - - . | D5 - - . A5 - G5 . | F5 - - - E5 - D5 . | G5 - - . Bb5 - A5 G5 | A5 - - - - . . .',
      { bass: 'pulse', comp: 'pad', drums: 'k.......t.....t.' })] },
  gym: { bpm: 164, intro: SEC('Cm Cm Ab Bb', 'C5 . C5 . C5 Eb5 G5 - | C6 - Bb5 - G5 - Eb5 - | Ab5 . Ab5 . Ab5 C6 Eb6 - | D6 - - - D6+Eb6 F6 G6 -',
      { bass: 'gallop', comp: 'drive', drums: 'k...k...k...k.k.', fill: 'k.s.k.s.ssssTTtt' }), loop: [
    SEC('Cm Bb Ab G Cm Bb Ab G7', 'G5 - C6 - Bb5 G5 - Eb5 | F5 - Bb5 - D6 - C6 Bb5 | C6 - Ab5 - Eb5 - F5 G5 | B5 - - - D6 - B5 G5 | G5 - C6 - Eb6 - D6 C6 | D6 - Bb5 - F5 - Bb5 D6 | Eb6 - D6 C6 - Ab5 C6 Eb6 | D6 - - - B5+C6 D6 F6 -',
      { bass: 'gallop', comp: 'drive', drums: 'k.h.s.hkk.h.s.h.' }),
    SEC('Ab Bb Gm Cm Fm Bb Eb G', 'Eb6 - - C6 - Ab5 C6 - | D6 - - Bb5 - F5 Bb5 - | G5 Bb5 D6 G6 - F6 D6 Bb5 | C6 - - - G5 - C6 - | Ab5 - C6 - F6 - Eb6 C6 | D6 - Bb5 - F6 - D6 - | Eb6 - G6 - Bb6 - G6 Eb6 | D6 - B5 - G5 - G5+A5 B5',
      { bass: 'oct', comp: 'arp', drums: 'k.hhs.hkk.hhs.hs', fill: 'kssskssskTTTtttt', twin: true })] },
  rival: { bpm: 168, intro: SEC('A A', 'A5 . A5 . . A5 C6 . | E6 - D6 C6 - A5 - .', { comp: 'stab', drums: 'k..k..s.k..k.sss' }), loop: [
    SEC('Am G F E Am G F E7', 'A5 - C6 . E6 - C6 A5 | B5 - D6 . G6 - D6 B5 | C6 - A5 - F5 - A5 C6 | B5 - G#5 - E5 - - . | E6 . E6 . D6 C6 B5 A5 | D6 . D6 . C6 B5 A5 G5 | A5 - C6 - F6 - E6 D6 | E6 - - - D6+C6 B5 G#5 E5',
      { bass: 'oct', comp: 'stab', drums: 'k.hks.hkk.hks.hs', twin: true }),
    SEC('F G Em Am Dm E Am E7', 'C6 - - A5 - C6 F6 - | D6 - - B5 - D6 G6 - | E6 - D6 - B5 - G5 - | A5 - C6 - E6 - A6 - | F6 - E6 - D6 - A5 - | G#5 - B5 - E6 - D6 - | C6 - B5 - A5 - E5 - | G#5 - - - B5 - - -',
      { bass: 'gallop', comp: 'arp', drums: 'k.h.s.hkk.h.s.h.', fill: 'k.s.k.s.sssTTTtt' })] },
  league: { bpm: 172, intro: SEC('Dm Dm', 'D5 . D5 . F5 . E5 . | D5 . C#5 . D5 - - -', { bass: 'gallop', comp: 'drive', drums: 'k...k...k...kkkk' }), loop: [
    SEC('Dm Bb Gm A Dm Bb Gm A7', 'A5 - D6 - A5 - F5 - | Bb5 - A5 - F5 - D5 - | G5 - Bb5 - D6 - C6 Bb5 | A5 - - - C#6 - E6 - | F6 - E6 - D6 - A5 - | Bb5 - D6 - F6 - E6 D6 | E6 - D6 - Bb5 - G5 - | A5 - C#6 - E6 - G6 -',
      { bass: 'gallop', comp: 'drive', drums: 'k.hks.hkk.hks.hk' }),
    SEC('Bb C A Dm Bb C Eb A', 'F6 - - - D6 - F6 - | G6 - - - E6 - C6 - | E6 - C#6 - A5 - C#6 E6 | D6 - - - - . A5+D6 F6 | D6 - Bb5 - F5 - Bb5 D6 | E6 - C6 - G5 - C6 E6 | G6 - F6 - Eb6 - D6 - | C#6 - - - A5 - - -',
      { bass: 'oct', comp: 'arp', drums: 'k.hhs.hkk.hhs.hs', fill: 'k.s.k.s.ssssTTTt', twin: true })] },
  champion: { bpm: 184, shift: -12, intro: SEC('Em C D B', 'E5 - - B5 - - E6 - | E6 - - D6 - - C6 - | D6 - - F#6 - - A6 - | F#6 - - - D#6 - B5 -',
      { comp: 'stab', drums: 'c..k..k.k..k.s.s', fill: 'k.s.k.s.ssssTTtt' }), loop: [
    SEC('Em C G D Em C Am B7', 'B5 - E6 - G6 - F#6 E6 | E6 - - - C6 - D6 E6 | D6 - B5 - G5 - B5 D6 | A5 - - - F#5 - A5 - | B5 - E6 - G6 - B6 - | A6 - G6 - E6 - G6 A6 | G6 - E6 - C6 - E6 G6 | F#6 - - - D#6 - B5 -',
      { bass: 'gallop', comp: 'drive', drums: 'k.hks.hkk.hks.hs', twin: true }),
    SEC('C D G Em C D B B7', 'G6 - - E6 - C6 - E6 | F#6 - - D6 - A5 - D6 | B5+C6 D6 G6 - - F#6 G6 B6 | B6 - - - G6 - E6 - | E6 - G6 - A6 - G6 E6 | F#6 - A6 - D6 - F#6 A6 | B6 - - - A6 - F#6 - | D#6 - F#6 - A6 - B6 -',
      { bass: 'oct', comp: 'stab', drums: 'c.hks.hkk.hks.hs', fill: 'kssskssskTTTtttt', twin: true })] },
  legend: { bpm: 140, intro: SEC('F#m F#m', 'F#4 . F#4 . F#4 . G4 . | F#4 . F#4 . A4 . G#4 .', { bass: 'pulse', comp: 'pad', drums: 't..t..t.T..t..TT' }), loop: [
    SEC('F#m D E C#m F#m D Bm C#', 'F#5 - - - C#6 - - - | D6 - C#6 - A5 - - - | B5 - - - G#5 - E5 - | G#5 - - - - - - . | A5 - - - F#6 - - - | F#6 - E6 - D6 - A5 - | B5 - D6 - F#6 - E6 D6 | C#6 - - - G#5 - F5 -',
      { bass: 'gallop', comp: 'pad', drums: 'k..k..s.k..k.ss.' }),
    SEC('D E F#m F#m D E C# C#', 'A5+B5 C#6 D6 - - - F#6 - | E6 - - - B5 - G#5 B5 | C#6 - - - F#6 - - - | A6 - G#6 - F#6 - C#6 - | D6 - F#6 - A6 - F#6 D6 | E6 - G#6 - B6 - G#6 E6 | F6 - - - G#6 - - - | F6 - - - C#6 - - -',
      { bass: 'oct', comp: 'drive', drums: 'k.hks.hkk.hks.hs', fill: 'c.s.k.s.TTTTtttt', twin: true })] },
};
const NOTE_I = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const QUAL = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], dim: [0, 3, 6], aug: [0, 4, 8], sus4: [0, 5, 7] };
const noteMidi = n => { const [, l, acc, o] = /^([A-G])([#b]?)(\d)$/.exec(n); return NOTE_I[l] + (acc === '#') - (acc === 'b') + (+o + 1) * 12; };
const midiF = m => 440 * 2 ** ((m - 69) / 12);
const parseChord = c => { const [, l, acc, q] = /^([A-G])([#b]?)(.*)$/.exec(c); return { root: (NOTE_I[l] + (acc === '#') - (acc === 'b') + 12) % 12, iv: QUAL[q] }; };
function compileSection(sec) {
  const steps = [];
  for (const tok of sec.lead.split(/\s+/).filter(t => t && t !== '|')) {
    if (tok.includes('+')) steps.push(...tok.split('+'));
    else steps.push(tok, tok === '.' ? '.' : '-');
  }
  const bars = sec.chords.split(/\s+/).map(b => b.split(',').map(parseChord));
  return Object.assign(sec, { steps, bars, len: bars.length * 16 });
}
for (const s of Object.values(SONGS)) { s.seq = [s.intro, ...s.loop].filter(Boolean).map(compileSection); s.loopAt = s.intro ? 1 : 0; }

let audio = null, master = null, musicBus = null, sfxBus = null, noiseBuf = null, muted = false, music = { name: null, file: null };
const VOL_KEY = 'pokemon-dungeon-volume', VOL = { bgm: 0.8, sfx: 0.8, ...(store.get(VOL_KEY) ?? {}) };
function applyVolume() {
  store.set(VOL_KEY, VOL);
  if (musicBus) musicBus.gain.value = VOL.bgm;
  if (sfxBus) sfxBus.gain.value = VOL.sfx;
  for (const a of Object.values(BGM_FILES)) if (a instanceof Audio) a.volume = 0.5 * VOL.bgm;
}
const PULSE = {};

// 브라우저는 사용자가 키를 누르거나 클릭하기 전에는 소리를 못 낸다. 첫 입력 때 켠다
function initAudio() {
  if (audio) return audio.state === 'suspended' && audio.resume();
  const AC = window.AudioContext ?? window.webkitAudioContext;
  if (!AC) return;
  audio = new AC();
  const comp = audio.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 3;
  master = audio.createGain(); master.gain.value = 0.35;
  master.connect(comp); comp.connect(audio.destination);
  musicBus = audio.createGain(); musicBus.connect(master);
  sfxBus = audio.createGain(); sfxBus.connect(master);
  applyVolume();
  noiseBuf = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // 펄스파: 듀티비 12.5%(가늘고 맑음), 25%(멜로디), 50%(네모파)
  for (const duty of [0.125, 0.25, 0.5]) {
    const N = 64, re = new Float32Array(N), im = new Float32Array(N);
    for (let n = 1; n < N; n++) re[n] = 2 / (n * Math.PI) * Math.sin(n * Math.PI * duty);
    PULSE[duty] = audio.createPeriodicWave(re, im);
  }
}

// 음 하나: 짧은 어택 → 서스테인까지 감쇠 → 끝에서 릴리스. 긴 음에는 비브라토가 서서히 걸린다
function voice(out, wave, f, t, len, vol, o = {}) {
  const osc = audio.createOscillator(), g = audio.createGain(), att = o.att ?? 0.006, rel = o.rel ?? 0.03, end = t + Math.max(len, att + 0.01);
  if (typeof wave === 'string') osc.type = wave; else osc.setPeriodicWave(wave);
  osc.frequency.setValueAtTime(f, t);
  if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + len);
  if (o.vib && len > 0.3) {
    const lfo = audio.createOscillator(), depth = audio.createGain();
    lfo.frequency.value = 5.5; depth.gain.setValueAtTime(0, t); depth.gain.linearRampToValueAtTime(0, t + 0.15); depth.gain.linearRampToValueAtTime(f * 0.014, t + Math.min(0.5, len));
    lfo.connect(depth); depth.connect(osc.frequency); lfo.start(t); lfo.stop(end + rel * 4);
  }
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + att);
  g.gain.setTargetAtTime(vol * (o.sus ?? 0.65), t + att, o.decay ?? 0.08);
  g.gain.setTargetAtTime(0, end, rel);
  let node = osc;
  if (o.lp) { const f2 = audio.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = o.lp; osc.connect(f2); node = f2; }
  node.connect(g); g.connect(out); osc.start(t); osc.stop(end + rel * 5);
}
function noise(t, len, vol, out, hp, lp) {
  const s = audio.createBufferSource(), f = audio.createBiquadFilter(), g = audio.createGain();
  s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
  let node = f;
  s.connect(f);
  if (lp) { const f2 = audio.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = lp; f.connect(f2); node = f2; }
  node.connect(g); g.connect(out); s.start(t); s.stop(t + len + 0.02);
}
function drum(d, t, out) {
  if (d === 'k') { voice(out, 'sine', 160, t, 0.16, 0.6, { slide: 42, sus: 1, decay: 1, rel: 0.04 }); noise(t, 0.015, 0.12, out, 2500); }
  if (d === 's') { noise(t, 0.14, 0.28, out, 1400, 9000); voice(out, 'triangle', 200, t, 0.07, 0.25, { slide: 140, rel: 0.02 }); }
  if (d === 'h') noise(t, 0.035, 0.09, out, 8000);
  if (d === 'o') noise(t, 0.18, 0.08, out, 7000);
  if (d === 'c') noise(t, 1.1, 0.13, out, 4500);
  if (d === 't' || d === 'T') voice(out, 'sine', d === 't' ? 120 : 180, t, 0.2, 0.45, { slide: d === 't' ? 70 : 110, sus: 1, decay: 1, rel: 0.05 });
}

// 곡마다 출력 버스: 멜로디는 메아리(점8분 딜레이)를 살짝 섞어서 넓게 들린다
function makeBus(bpm) {
  const out = audio.createGain(), lead = audio.createGain(), delay = audio.createDelay(1), fb = audio.createGain(), wet = audio.createGain();
  delay.delayTime.value = Math.min(0.95, 45 / bpm); fb.gain.value = 0.28; wet.gain.value = 0.22;
  lead.connect(out); lead.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(out);
  out.connect(musicBus);
  return { out, lead };
}

function playStep(s, m, t, dur) {
  const sec = s.seq[m.sec], step = m.step, bar = Math.floor(step / 16), pos = step % 16, cs = sec.bars[bar], ch = cs[pos >= 8 && cs.length > 1 ? 1 : 0], out = m.out;
  const pcs = ch.iv.map(i => (ch.root + i) % 12);
  // 멜로디(+아래 화음음 쌍둥이)
  const n = sec.steps[step];
  if (n && n !== '-' && n !== '.') {
    let len = 1; while (sec.steps[step + len] === '-') len++;
    const mi = noteMidi(n) + (s.shift ?? 0);
    voice(m.lead, PULSE[0.25], midiF(mi), t, len * dur * 0.92, 0.17, { vib: true });
    if (sec.twin && len >= 2) {
      let k = mi - 3; while (k > mi - 10 && !pcs.includes(k % 12)) k--;
      voice(out, PULSE[0.125], midiF(k), t, len * dur * 0.9, 0.075, { vib: true });
    }
  }
  // 반주
  const base = ch.root > 6 ? 48 : 60, tones = ch.iv.map(i => base + ch.root + i);
  if (sec.comp === 'arp') { const seq = [...tones, tones[0] + 12]; voice(out, PULSE[0.125], midiF(seq[pos % seq.length]), t, dur * 0.85, 0.05, { sus: 0.5 }); }
  if (sec.comp === 'stab' && pos % 4 === 2) for (const mi of tones) voice(out, PULSE[0.5], midiF(mi), t, dur * 1.3, 0.026, { sus: 0.45 });
  if (sec.comp === 'drive' && pos % 2 === 0) for (const mi of [tones[0] - 12, tones[0] - 5]) voice(out, PULSE[0.25], midiF(mi), t, dur * 1.1, 0.035, { sus: 0.4, lp: 2500 });
  if (sec.comp === 'pad' && (pos === 0 || (pos === 8 && cs.length > 1))) for (const mi of tones) voice(out, 'sawtooth', midiF(mi), t, dur * (cs.length > 1 ? 8 : 16) * 0.97, 0.03, { att: 0.25, sus: 1, rel: 0.2, lp: 1400 });
  // 베이스
  const r = 36 + ch.root;
  let bn = null, bl = 1;
  if (sec.bass === 'oct' && pos % 2 === 0) { bn = pos % 4 ? r + 12 : r; bl = 2; }
  if (sec.bass === 'walk' && pos % 2 === 0) { bn = r + [0, 7, 12, 7][pos / 2 % 4]; bl = 2; }
  if (sec.bass === 'gallop' && pos % 4 !== 1) { bn = pos === 14 ? r + 12 : r; bl = 1; }
  if (sec.bass === 'five' && pos % 4 === 0) { bn = pos % 8 ? r + 7 : r; bl = 4; }
  if (sec.bass === 'pulse' && pos % 8 === 0) { bn = r; bl = 8; }
  if (bn !== null) { voice(out, 'triangle', midiF(bn), t, bl * dur * 0.85, 0.34, { sus: 0.85 }); voice(out, PULSE[0.5], midiF(bn), t, bl * dur * 0.6, 0.05, { sus: 0.3, lp: 600 }); }
  // 드럼
  const d = sec.fill && bar === sec.bars.length - 1 ? sec.fill[pos] : sec.drums[step % sec.drums.length];
  if (d && d !== '.') drum(d, t, out);
}

// ---------- 효과음: 배경음과 같은 합성 엔진. 같은 소리가 너무 촘촘히 겹치지 않게 최소 간격을 둔다 ----------
const jingle = (t, notes, step, wave, vol, o = {}) => notes.forEach((n, i) => n && voice(sfxBus, wave, midiF(n), t + i * step, step * (o.hold ?? 0.9), vol, { sus: 0.8, ...o }));
const SFX = {
  shot: t => voice(sfxBus, PULSE[0.5], 1050, t, 0.05, 0.05, { slide: 520, sus: 1, rel: 0.015 }),
  beam: t => { voice(sfxBus, 'sawtooth', 220, t, 0.35, 0.08, { slide: 880, sus: 1, lp: 2400 }); noise(t, 0.3, 0.08, sfxBus, 3000); },
  hit: t => { noise(t, 0.04, 0.12, sfxBus, 2500); voice(sfxBus, PULSE[0.25], 330, t, 0.05, 0.07, { slide: 180, sus: 1 }); },
  crit: t => { noise(t, 0.08, 0.2, sfxBus, 1800); voice(sfxBus, PULSE[0.5], 660, t, 0.1, 0.1, { slide: 200, sus: 1 }); },
  hurt: t => { voice(sfxBus, PULSE[0.5], 420, t, 0.2, 0.16, { slide: 80, sus: 1 }); noise(t, 0.14, 0.16, sfxBus, 500, 3000); },
  faint: t => voice(sfxBus, PULSE[0.25], 760, t, 0.32, 0.1, { slide: 100, sus: 1 }),
  boss: t => { voice(sfxBus, 'triangle', 220, t, 0.7, 0.3, { slide: 40, sus: 1 }); noise(t, 0.6, 0.18, sfxBus, 200, 1500); jingle(t + 0.05, [76, 72, 67, 64, 60], 0.08, PULSE[0.25], 0.08); },
  coin: t => jingle(t, [88, 93], 0.05, PULSE[0.5], 0.05),
  dash: t => noise(t, 0.12, 0.09, sfxBus, 900, 4000),
  item: t => jingle(t, [72, 76, 79, 84], 0.06, PULSE[0.25], 0.09),
  rare: t => { jingle(t, [72, 76, 79, 84, 88, 91], 0.06, PULSE[0.25], 0.09); jingle(t + 0.36, [96, 100], 0.08, PULSE[0.125], 0.05); },
  heal: t => jingle(t, [72, 76, 79, 76, 84], 0.11, PULSE[0.25], 0.1, { hold: 1 }),
  level: t => { jingle(t, [67, 72, 76, 79], 0.07, PULSE[0.25], 0.1); jingle(t + 0.28, [84], 0.3, PULSE[0.25], 0.1); },
  evolve: t => { voice(sfxBus, PULSE[0.125], 200, t, 1.2, 0.08, { slide: 1600, sus: 1 }); jingle(t + 1.2, [72, 76, 79, 84, 79, 84, 88], 0.1, PULSE[0.25], 0.11, { hold: 1 }); },
  badge: t => { jingle(t, [72, 72, 72, 76, null, 79, 84], 0.09, PULSE[0.25], 0.11); jingle(t, [64, 64, 64, 67, null, 72, 76], 0.09, PULSE[0.125], 0.06); },
  battle: t => { jingle(t, [64, 67, 70, 73, 76, 79, 82, 85], 0.035, PULSE[0.5], 0.07); noise(t + 0.28, 0.3, 0.14, sfxBus, 3000); },
  legend: t => { voice(sfxBus, 'sawtooth', 55, t, 1.6, 0.18, { att: 0.3, sus: 1, lp: 400 }); jingle(t + 0.2, [66, 72, 66, 72], 0.25, PULSE[0.125], 0.06); },
  ach: t => { jingle(t, [84, 91], 0.09, PULSE[0.25], 0.09); jingle(t + 0.18, [96], 0.4, PULSE[0.125], 0.06); },
  menu: t => voice(sfxBus, PULSE[0.5], 1400, t, 0.03, 0.05, { sus: 1 }),
  select: t => jingle(t, [84, 91], 0.04, PULSE[0.5], 0.06),
  deny: t => jingle(t, [60, 55], 0.07, PULSE[0.5], 0.07),
  save: t => jingle(t, [79, 84, 88], 0.07, PULSE[0.125], 0.07),
  // 후파의 고리가 열리는 소리: 반짝이는 온음 음계 아르페지오
  ring: t => { jingle(t, [72, 74, 76, 78, 80, 82, 84, 86], 0.06, PULSE[0.125], 0.07); jingle(t + 0.12, [84, 86, 88, 90, 92, 94, 96], 0.06, PULSE[0.25], 0.04); voice(sfxBus, 'triangle', 110, t, 1.2, 0.18, { att: 0.2, sus: 1 }); },
  // 고리로 빨려 들어가는 소리: 낮게 울리다 솟구치는 소용돌이, 끝에 번쩍
  hoopa: t => {
    voice(sfxBus, 'sawtooth', 70, t, 2.1, 0.16, { slide: 1400, att: 0.4, sus: 1, lp: 1800 });
    voice(sfxBus, PULSE[0.125], 140, t + 0.2, 1.8, 0.06, { slide: 2200, sus: 1, vib: true });
    noise(t, 2.0, 0.12, sfxBus, 300, 5000);
    jingle(t + 1.75, [84, 88, 91, 96, 100], 0.05, PULSE[0.25], 0.09);
  },
};
const SFX_GAP = { shot: 0.06, hit: 0.05, coin: 0.06, faint: 0.05 }, sfxLast = {};
function sfx(name) {
  if (!audio || muted || !sfxBus || audio.state !== 'running') return;
  const t = audio.currentTime;
  if (t - (sfxLast[name] ?? -1) < (SFX_GAP[name] ?? 0.02)) return;
  sfxLast[name] = t;
  SFX[name](t + 0.01);
}

// 지금 장소와 상대에 맞는 곡 후보: 구체적인 것(그 장소·관장·전설 이름)부터 일반적인 것(마을·도로…)까지
// 우선순위: 라이벌 > 전설 > 리그(챔피언) > 체육관(관장) > 트레이너와 승부 > 장소
// 음원 파일이 있는 첫 후보를 튼다. 하나도 없으면 후보 중 합성곡이 있는 것을 튼다
function bgmFor() {
  if (state === 'title' || state === 'region' || state === 'select' || state === 'ach') return ['타이틀', 'town'];
  if (!['play', 'pause', 'map', 'learn', 'zpick', 'shop'].includes(state) || !map) return null;
  const p = player, legend = map.enemies.find(e => e.rank === 'legend' && Math.hypot(e.x - p.x, e.y - p.y) < 900);
  if (map.sub === 'rival') return ['라이벌전', 'rival'];
  if (map.sub === 'hoopa') { const h = map.enemies.find(e => e.hoopa); return h ? [`전설_${h.mon.name}`, '전설전', 'legend'] : ['champion']; }
  if (map.battle?.rival || map.npcs.some(n => n.rival && !n.defeated)) return ['라이벌전', 'rival'];
  if (legend) return [`전설_${legend.mon.name}`, '전설전', 'legend'];
  if (map.sub === 'league') { const w = map.room?.who, champ = w === region.league.at(-1); return [...(w && map.room.started ? [`리그_${w.leader}`] : []), champ ? '챔피언전' : '사천왕전', champ ? 'champion' : 'league']; }
  if (map.sub === 'gym') {
    const leader = map.battle && map.room?.who;
    return leader ? [`관장_${leader.leader}`, '관장전', 'gym'] : [...(map.battle ? ['트레이너전'] : []), '체육관', 'gym'];
  }
  const n = nodeAt(p.x, p.y), k = n.kind, place = k === 'T' ? 'town' : k === 'F' ? 'forest' : k === 'C' || k === 'S' ? 'cave' : 'route';
  return [...(map.battle ? ['트레이너전'] : []), n.name, place];
}

// 음원 파일: bgm/<지방>/<이름>.mp3, 없으면 bgm/<이름>.mp3. 처음 필요할 때 한 번만 확인하고 결과를 기억한다
// 파일은 저장소에 올리지 않는다(.gitignore). 직접 가진 음원을 이 컴퓨터의 bgm 폴더에 넣어 쓴다
const BGM_FILES = {};  // 주소 → Audio(있음) | false(없음) | 'wait'(확인 중)
function bgmProbe(url) {
  if (url in BGM_FILES) return BGM_FILES[url];
  BGM_FILES[url] = 'wait';
  const a = new Audio(url); a.loop = true; a.volume = 0.5 * VOL.bgm; a.preload = 'auto';
  a.addEventListener('canplaythrough', () => { BGM_FILES[url] = a; }, { once: true });
  a.addEventListener('error', () => { BGM_FILES[url] = false; }, { once: true });
  return 'wait';
}
// 후보 중 파일이 있는 첫 곡. 앞 후보를 아직 확인 중이면 기다린다(그동안은 합성곡)
function bgmFile(names) {
  for (const n of names) for (const url of [`bgm/${region?.name ?? '_'}/${n}.mp3`, `bgm/${n}.mp3`]) {
    const st = bgmProbe(url);
    if (st === 'wait') return null;
    if (st) return st;
  }
  return null;
}
// 지방을 고르면 그 지방의 기본 곡들을 미리 확인해 둔다
function probeBgm(rg) { for (const n of [...Object.keys(SONGS), '관장전', '트레이너전', '라이벌전', '전설전', '사천왕전', '챔피언전']) { bgmProbe(`bgm/${rg.name}/${n}.mp3`); bgmProbe(`bgm/${n}.mp3`); } }

function tickMusic() {
  if (!audio) return;
  const names = muted ? null : bgmFor(), file = names ? bgmFile(names) : null, want = names ? names.find(n => SONGS[n]) ?? null : null;
  if (want !== music.name || file !== music.file) {
    if (music.out) { music.out.gain.setTargetAtTime(0, audio.currentTime, 0.12); const old = music.out; setTimeout(() => old.disconnect(), 1500); }
    music.file?.pause();
    music = { name: want, file, sec: 0, step: 0, next: audio.currentTime + 0.1, ...(want && !file ? makeBus(SONGS[want].bpm) : {}) };
    if (file) { file.volume = 0.5 * VOL.bgm; file.currentTime = 0; file.play().catch(() => {}); }
  }
  if (!want || file) return;
  const s = SONGS[want], dur = 15 / s.bpm;
  if (music.next < audio.currentTime) music.next = audio.currentTime + 0.05;  // 탭이 가려졌다 돌아오면 밀린 음을 몰아 치지 않는다
  while (music.next < audio.currentTime + 0.2) {
    playStep(s, music, music.next, dur);
    music.next += dur;
    if (++music.step >= s.seq[music.sec].len) { music.step = 0; music.sec = music.sec + 1 < s.seq.length ? music.sec + 1 : s.loopAt; }
  }
}
