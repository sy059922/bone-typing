// 도트 게임 느낌 소리 — 파일 없이 Web Audio 로 그 자리에서 합성 (곡·효과음 모두 이 프로젝트용 창작, 저작권 걱정 없음)
// 배경음: 132BPM 칩튠 루프 (펄스파 멜로디 · 삼각파 베이스 · 노이즈 드럼), Am–F–C–G
// 학습 모드 곡: 76BPM 로파이 (Fmaj7–Em7–Dm7–Cmaj7, 부드러운 패드 · 전자 피아노 · 스윙 하이햇 · 레코드 잡음) — 집중용으로 멜로디는 아주 드물게
// 효과음: 키 타격(펄스 블립 + 노이즈 클릭 + 저음 쿵), 오타(내려가는 버즈), 낱말 성공(올라가는 아르페지오), 결과 팡파르

let ctx: BaseAudioContext | null = null;
let master: GainNode, bgmBus: GainNode, sfxBus: GainNode;
let noise: AudioBuffer;
const pulse: Record<string, PeriodicWave> = {};

const PREF = 'bone-typing:sound';
const prefs = (() => {
  try {
    return {bgm: true, sfx: true, ...JSON.parse(localStorage.getItem(PREF) ?? '{}')} as {bgm: boolean; sfx: boolean};
  } catch {
    return {bgm: true, sfx: true};
  }
})();
const savePrefs = () => {
  try {
    localStorage.setItem(PREF, JSON.stringify(prefs));
  } catch {
    /* 무시 */
  }
};

const BGM_VOL = 0.24;
const SFX_VOL = 0.8;

const pulseWave = (c: BaseAudioContext, duty: number) => {
  const n = 64;
  const re = new Float32Array(n);
  const im = new Float32Array(n);
  for (let k = 1; k < n; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
  return c.createPeriodicWave(re, im);
};

// 첫 클릭·키 입력 때 불러야 함 (브라우저 자동재생 정책)
export function initSound() {
  if (ctx) {
    if (ctx.state === 'suspended' && ctx instanceof AudioContext) void ctx.resume();
    return;
  }
  const AC = window.AudioContext ?? (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
  const live = new AC();
  ctx = live;
  master = ctx.createGain();
  master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -10;
  master.connect(comp).connect(ctx.destination);
  bgmBus = ctx.createGain();
  bgmBus.gain.value = prefs.bgm ? BGM_VOL : 0;
  bgmBus.connect(master);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = prefs.sfx ? SFX_VOL : 0;
  sfxBus.connect(master);
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  pulse['12'] = pulseWave(live, 0.125);
  pulse['25'] = pulseWave(live, 0.25);
  pulse['50'] = pulseWave(live, 0.5);
}

const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

type ToneOpt = {
  wave: 'p12' | 'p25' | 'p50' | 'tri' | 'sine';
  f0: number;
  f1?: number; // 끝 주파수 (피치 미끄럼)
  t: number;
  dur: number;
  vol: number;
  bus: GainNode;
  attack?: number;
};
const tone = ({wave, f0, f1, t, dur, vol, bus, attack = 0.002}: ToneOpt) => {
  const c = ctx!;
  const o = c.createOscillator();
  if (wave === 'tri') o.type = 'triangle';
  else if (wave === 'sine') o.type = 'sine';
  else o.setPeriodicWave(pulse[wave.slice(1)]);
  o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + dur + 0.02);
};

const hiss = (t: number, dur: number, vol: number, bus: GainNode, type: BiquadFilterType, freq: number) => {
  const c = ctx!;
  const s = c.createBufferSource();
  s.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(bus);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
};

// ── 효과음 ───────────────────────────────────────────
// 키 한 번: 높은 펄스 '틱' + 노이즈 '탁' + 저음 '쿵' — progress(0~1)가 오를수록 음이 살짝 올라감
export function sfxKey(progress = 0, at?: number) {
  if (!ctx || !prefs.sfx) return;
  const t = at ?? ctx.currentTime;
  const base = 900 + progress * 500 + Math.random() * 80;
  tone({wave: 'p25', f0: base * 1.6, f1: base * 0.7, t, dur: 0.045, vol: 0.32, bus: sfxBus});
  hiss(t, 0.035, 0.38, sfxBus, 'highpass', 3500);
  tone({wave: 'sine', f0: 180, f1: 55, t, dur: 0.07, vol: 0.55, bus: sfxBus});
}

export function sfxBackspace(at?: number) {
  if (!ctx || !prefs.sfx) return;
  const t = at ?? ctx.currentTime;
  tone({wave: 'p50', f0: 520, f1: 300, t, dur: 0.05, vol: 0.18, bus: sfxBus});
  hiss(t, 0.025, 0.2, sfxBus, 'highpass', 2500);
}

// 오타: 낮게 떨어지는 '뿌-웅' 버즈 두 번
export function sfxBad(at?: number) {
  if (!ctx || !prefs.sfx) return;
  const t = at ?? ctx.currentTime;
  tone({wave: 'p50', f0: 220, f1: 110, t, dur: 0.12, vol: 0.32, bus: sfxBus});
  tone({wave: 'p50', f0: 165, f1: 70, t: t + 0.11, dur: 0.18, vol: 0.32, bus: sfxBus});
  hiss(t, 0.16, 0.22, sfxBus, 'lowpass', 900);
}

// 패스: 낮게 미끄러지는 '휘익'
export function sfxPass(at?: number) {
  if (!ctx || !prefs.sfx) return;
  const t = at ?? ctx.currentTime;
  tone({wave: 'p25', f0: 660, f1: 165, t, dur: 0.28, vol: 0.2, bus: sfxBus});
  hiss(t, 0.25, 0.16, sfxBus, 'bandpass', 1200);
}

// 낱말 성공: 콤보가 높을수록 높은 음에서 시작하는 아르페지오 + '챙'
export function sfxWord(combo = 0, at?: number) {
  if (!ctx || !prefs.sfx) return;
  const t = at ?? ctx.currentTime;
  const root = 72 + Math.min(combo, 12);
  [0, 4, 7, 12].forEach((iv, i) => tone({wave: 'p12', f0: midi(root + iv), t: t + i * 0.045, dur: 0.12, vol: 0.26, bus: sfxBus}));
  hiss(t, 0.12, 0.18, sfxBus, 'highpass', 6000);
  if (combo > 0 && combo % 5 === 0) {
    // 다섯 콤보마다 반짝이 한 번 더
    [12, 16, 19, 24].forEach((iv, i) => tone({wave: 'p25', f0: midi(root + iv), t: t + 0.2 + i * 0.05, dur: 0.14, vol: 0.2, bus: sfxBus}));
  }
}

// 결과 팡파르
export function sfxFinish(at?: number) {
  if (!ctx || !prefs.sfx) return;
  const t = (at ?? ctx.currentTime) + 0.05;
  const seq: [number, number, number][] = [
    [72, 0, 0.12],
    [76, 0.12, 0.12],
    [79, 0.24, 0.12],
    [84, 0.36, 0.5],
  ];
  seq.forEach(([m, at, d]) => {
    tone({wave: 'p25', f0: midi(m), t: t + at, dur: d, vol: 0.28, bus: sfxBus});
    tone({wave: 'tri', f0: midi(m - 24), t: t + at, dur: d, vol: 0.35, bus: sfxBus});
  });
}

// ── 배경음 (시퀀서) ─────────────────────────────────────
const BPM = 132;
const STEP = 60 / BPM / 4; // 16분음표
const CHORDS = [
  [57, 60, 64], // Am
  [53, 57, 60], // F
  [48, 52, 55], // C
  [55, 59, 62], // G
];
// 멜로디 [시작 스텝, MIDI, 길이(스텝)] — 4마디 64스텝
const MELODY: [number, number, number][] = [
  [0, 69, 2], [2, 72, 2], [4, 76, 2], [6, 74, 1], [7, 72, 1], [8, 69, 4], [12, 67, 2], [14, 69, 2],
  [16, 72, 2], [18, 69, 2], [20, 65, 4], [24, 67, 2], [26, 69, 2], [28, 72, 4],
  [32, 76, 2], [34, 79, 2], [36, 76, 2], [38, 74, 2], [40, 72, 4], [44, 74, 2], [46, 76, 2],
  [48, 74, 2], [50, 71, 2], [52, 67, 4], [56, 69, 2], [58, 71, 2], [60, 74, 2], [62, 76, 2],
];
// 두 번째 판: 멜로디를 한 옥타브 위 짧은 스타카토로
const MELODY_B: [number, number, number][] = MELODY.map(([s, m]) => [s, m + 12, 1]);

let timer: number | null = null;
let nextT = 0;
let step = 0;

const scheduleStep = (s: number, t: number) => {
  const bar = Math.floor((s % 64) / 16);
  const loop = Math.floor(s / 64) % 4; // A A B A
  const inBar = s % 16;
  const ch = CHORDS[bar];
  // 드럼
  if (inBar % 8 === 0) tone({wave: 'sine', f0: 150, f1: 45, t, dur: 0.12, vol: 0.9, bus: bgmBus});
  if (inBar % 8 === 4) hiss(t, 0.1, 0.5, bgmBus, 'bandpass', 1800);
  if (inBar % 2 === 0) hiss(t, 0.03, inBar % 4 === 2 ? 0.28 : 0.16, bgmBus, 'highpass', 7000);
  // 베이스: 8분음표로 근음-옥타브
  if (inBar % 2 === 0) {
    const m = ch[0] - 12 + (inBar % 4 === 2 ? 12 : 0);
    tone({wave: 'tri', f0: midi(m), t, dur: STEP * 1.8, vol: 0.55, bus: bgmBus, attack: 0.005});
  }
  // 아르페지오: 16분음표로 화음 돌기 (B 판에서 더 크게)
  const arp = ch[inBar % 3] + 12;
  tone({wave: 'p12', f0: midi(arp), t, dur: STEP * 0.9, vol: loop === 2 ? 0.16 : 0.07, bus: bgmBus});
  // 멜로디
  const mel = loop === 2 ? MELODY_B : MELODY;
  for (const [st, m, len] of mel) if (st === s % 64) tone({wave: 'p25', f0: midi(m), t, dur: STEP * len * 0.95, vol: 0.2, bus: bgmBus, attack: 0.004});
};

// ── 블라인드 모드 곡: 150BPM D 프리지안, 쿵쿵 네 박 + 웅웅대는 저음 반복 + 삼전음 찌르기 (살벌하게)
const BPM_B = 150;
const STEP_B = 60 / BPM_B / 4;
// 저음 반복 (16스텝 한 마디): D 위주, b2(E♭)로 긴장
const BASS_B = [38, 38, 50, 38, 38, 39, 38, 50, 38, 38, 50, 38, 39, 38, 41, 39];
// 4마디마다 바뀌는 높은 찌르기 [스텝, MIDI] — D–G♯ 삼전음, E♭ 반음
const STAB_B: [number, number][] = [
  [0, 74], [6, 80], [12, 75],
  [16, 74], [22, 80], [26, 81], [28, 80],
  [32, 77], [38, 80], [44, 75],
  [48, 74], [52, 75], [54, 80], [58, 86], [60, 85], [62, 80],
];

const scheduleBlind = (s: number, t: number) => {
  const inBar = s % 16;
  const bar = Math.floor((s % 64) / 16);
  // 드럼: 네 박 킥 · 2·4 스네어 · 16분 하이햇 · 마지막 마디엔 탐 굴리기
  if (inBar % 4 === 0) tone({wave: 'sine', f0: 120, f1: 38, t, dur: 0.16, vol: 0.7, bus: bgmBus});
  if (inBar % 8 === 4) hiss(t, 0.14, 0.42, bgmBus, 'bandpass', 1400);
  hiss(t, 0.025, inBar % 2 ? 0.07 : 0.14, bgmBus, 'highpass', 8000);
  if (bar === 3 && inBar >= 12) tone({wave: 'tri', f0: midi(50 - (inBar - 12) * 2), t, dur: STEP_B * 0.9, vol: 0.35, bus: bgmBus});
  // 웅웅 저음 (펄스 50% 로 거칠게)
  tone({wave: 'p50', f0: midi(BASS_B[inBar]), t, dur: STEP_B * 0.8, vol: 0.126, bus: bgmBus, attack: 0.003});
  tone({wave: 'tri', f0: midi(BASS_B[inBar] - 12), t, dur: STEP_B * 0.9, vol: 0.315, bus: bgmBus});
  // 감7 화음 아르페지오 (D F G♯ B) — 불안하게 맴돎
  const dim = [62, 65, 68, 71];
  tone({wave: 'p12', f0: midi(dim[s % 4] + (bar === 2 ? 1 : 0)), t, dur: STEP_B * 0.7, vol: 0.042, bus: bgmBus});
  for (const [st, m] of STAB_B) if (st === s % 64) tone({wave: 'p25', f0: midi(m), t, dur: STEP_B * 1.6, vol: 0.119, bus: bgmBus, attack: 0.002});
};

// ── 학습 모드 곡: 76BPM 로파이, 8마디 루프 (진행 두 번 — 뒤 네 마디만 종소리 멜로디)
const BPM_S = 76;
const STEP_S = 60 / BPM_S / 4;
const CHORDS_S = [
  [53, 57, 60, 64], // Fmaj7
  [52, 55, 59, 62], // Em7
  [50, 53, 57, 60], // Dm7
  [48, 52, 55, 59], // Cmaj7
];
// 종소리 멜로디 [스텝(8마디 128 중), MIDI, 길이(스텝)] — 뒤 네 마디(64~127)에만, 띄엄띄엄
const BELL_S: [number, number, number][] = [
  [66, 76, 6], [74, 72, 4], [82, 74, 8], [98, 72, 4], [102, 69, 6], [114, 67, 4], [118, 71, 8],
];
// 전자 피아노: 한 화음을 부드럽게 (기음 + 한 옥타브 위 배음 조금)
const keys = (m: number, t: number, dur: number, vol: number) => {
  tone({wave: 'sine', f0: midi(m), t, dur, vol, bus: bgmBus, attack: 0.012});
  tone({wave: 'sine', f0: midi(m + 12), t, dur: dur * 0.45, vol: vol * 0.18, bus: bgmBus, attack: 0.008});
};
const scheduleStudy = (s: number, t: number) => {
  const inBar = s % 16;
  const bar = Math.floor((s % 64) / 16);
  const ch = CHORDS_S[bar];
  const barLen = STEP_S * 16;
  // 스윙: 엇박 16분음표를 살짝 늦게
  const sw = inBar % 2 ? STEP_S * 0.28 : 0;
  // 패드 (마디 처음, 천천히 커졌다 사라짐)
  if (inBar === 0) for (const m of ch) tone({wave: 'tri', f0: midi(m), t, dur: barLen * 1.05, vol: 0.05, bus: bgmBus, attack: 0.6});
  // 전자 피아노 반주: 1박 · 2박 엇박 · 4박 (화음 위쪽 세 음)
  if (inBar === 0 || inBar === 6 || inBar === 12) {
    const v = inBar === 0 ? 0.11 : 0.075;
    ch.slice(1).forEach((m, i) => keys(m + 12, t + sw + i * 0.012, inBar === 0 ? 1.6 : 0.9, v));
  }
  // 베이스: 근음 (1박, 3박 앞 엇박)
  if (inBar === 0) tone({wave: 'sine', f0: midi(ch[0] - 12), t, dur: STEP_S * 7, vol: 0.42, bus: bgmBus, attack: 0.01});
  if (inBar === 10) tone({wave: 'sine', f0: midi(ch[0] - 12 + (bar % 2 ? 7 : 0)), t: t + sw, dur: STEP_S * 5, vol: 0.32, bus: bgmBus, attack: 0.01});
  // 드럼: 작은 킥 (1박 · 3박 앞) · 부드러운 스네어 (2 · 4박) · 아주 작은 스윙 하이햇
  if (inBar === 0 || inBar === 10) tone({wave: 'sine', f0: 105, f1: 42, t: t + sw, dur: 0.22, vol: 0.5, bus: bgmBus});
  if (inBar === 4 || inBar === 12) hiss(t, 0.16, 0.13, bgmBus, 'bandpass', 1100);
  if (inBar % 2 === 0) hiss(t + sw, 0.03, inBar % 4 === 2 ? 0.06 : 0.035, bgmBus, 'highpass', 7500);
  // 레코드판 잡음: 가끔 '틱'
  if (Math.random() < 0.22) hiss(t + Math.random() * STEP_S, 0.012, 0.03 + Math.random() * 0.03, bgmBus, 'highpass', 2500);
  // 종소리 멜로디 (뒤 네 마디만)
  for (const [st, m, len] of BELL_S) if (st === s % 128) {
    tone({wave: 'sine', f0: midi(m), t: t + sw, dur: STEP_S * len, vol: 0.075, bus: bgmBus, attack: 0.005});
    tone({wave: 'sine', f0: midi(m + 19), t: t + sw, dur: STEP_S * len * 0.3, vol: 0.012, bus: bgmBus, attack: 0.003});
  }
};

type Theme = 'normal' | 'blind' | 'study';
let theme: Theme = 'normal';
const SONGS: Record<Theme, {step: number; play: (s: number, t: number) => void}> = {
  normal: {step: STEP, play: scheduleStep},
  blind: {step: STEP_B, play: scheduleBlind},
  study: {step: STEP_S, play: scheduleStudy},
};
const song = () => SONGS[theme];

// 곡 바꾸기 (블라인드 모드 켜고 끌 때). 재생 중이면 바로 갈아탐
export function setTheme(th: Theme) {
  if (th === theme) return;
  theme = th;
  if (timer !== null) {
    stopBgm();
    startBgm();
  }
}

export function startBgm() {
  if (!ctx || timer !== null) return;
  nextT = ctx.currentTime + 0.08;
  step = 0;
  timer = window.setInterval(() => {
    const {step: dt, play} = song();
    while (nextT < ctx!.currentTime + 0.12) {
      play(step, nextT);
      nextT += dt;
      step++;
    }
  }, 25);
}

export function stopBgm() {
  if (timer !== null) clearInterval(timer);
  timer = null;
}

export const soundPrefs = () => ({...prefs});
export function setPref(k: 'bgm' | 'sfx', on: boolean) {
  prefs[k] = on;
  savePrefs();
  if (!ctx) return;
  const bus = k === 'bgm' ? bgmBus : sfxBus;
  bus.gain.setTargetAtTime(on ? (k === 'bgm' ? BGM_VOL : SFX_VOL) : 0, ctx.currentTime, 0.05);
}

// 미리듣기 WAV 만들기 (개발용 — ?demo 페이지에서 호출): 배경음 위에 실제 게임처럼 타자·오타·성공·팡파르
export async function renderDemo(seconds = 20, th: Theme = 'normal', withSfx = true): Promise<string> {
  const SR = 44100;
  const off = new OfflineAudioContext(2, SR * seconds, SR);
  const saved = ctx;
  ctx = off;
  master = off.createGain();
  master.gain.value = 0.9;
  const comp = off.createDynamicsCompressor();
  comp.threshold.value = -10;
  master.connect(comp).connect(off.destination);
  bgmBus = off.createGain();
  bgmBus.gain.value = BGM_VOL;
  bgmBus.connect(master);
  sfxBus = off.createGain();
  sfxBus.gain.value = SFX_VOL;
  sfxBus.connect(master);
  noise = off.createBuffer(1, SR, SR);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  pulse['12'] = pulseWave(off as BaseAudioContext, 0.125);
  pulse['25'] = pulseWave(off as BaseAudioContext, 0.25);
  pulse['50'] = pulseWave(off as BaseAudioContext, 0.5);
  const on = {...prefs};
  prefs.bgm = prefs.sfx = true;
  const sg = SONGS[th];
  for (let i = 0, t = 0.05; t < seconds - 0.2; i++, t += sg.step) sg.play(i, t);
  // 2초부터: 낱말마다 6타 + 확정, 세 번째 낱말에서 오타 하나
  let t = 2;
  for (let w = 0; w < (withSfx ? 9 : 0); w++) {
    for (let k = 0; k < 6; k++) {
      sfxKey(w / 10, t);
      t += 0.11;
      if (w === 2 && k === 3) {
        sfxBad(t);
        t += 0.35;
        sfxBackspace(t);
        t += 0.15;
      }
    }
    sfxKey(w / 10, t);
    sfxWord(w === 2 ? 0 : w + 1, t + 0.02);
    t += 0.55;
  }
  if (withSfx) sfxFinish(t + 0.3);
  Object.assign(prefs, on);
  const buf = await off.startRendering();
  ctx = saved;
  // WAV(16bit) → base64
  const n = buf.length;
  const out = new DataView(new ArrayBuffer(44 + n * 4));
  const w = (o: number, str: string) => [...str].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF');
  out.setUint32(4, 36 + n * 4, true);
  w(8, 'WAVEfmt ');
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);
  out.setUint16(22, 2, true);
  out.setUint32(24, SR, true);
  out.setUint32(28, SR * 4, true);
  out.setUint16(32, 4, true);
  out.setUint16(34, 16, true);
  w(36, 'data');
  out.setUint32(40, n * 4, true);
  const L = buf.getChannelData(0);
  const R = buf.getChannelData(1);
  for (let i = 0; i < n; i++) {
    out.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 0x7fff, true);
    out.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 0x7fff, true);
  }
  let bin = '';
  const bytes = new Uint8Array(out.buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
