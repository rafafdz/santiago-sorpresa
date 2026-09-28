/** Tiny procedural sound kit (Web Audio). No audio files are shipped. */
let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function ac(): AudioContext | null {
  if (!enabled) return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function noiseBurst(c: AudioContext, t: number, dur: number, freq: number, gain: number, q = 8) {
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
}

function tone(c: AudioContext, t: number, freq: number, dur: number, gain: number, type: OscillatorType = 'sine') {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function buzz(ms: number | number[]) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* vibration not allowed — ignore */
  }
}

export const sfx = {
  tick() {
    buzz(6);
    const c = ac();
    if (c) noiseBurst(c, c.currentTime, 0.03, 3200, 0.5, 12);
  },
  set() {
    buzz(18);
    const c = ac();
    if (!c) return;
    noiseBurst(c, c.currentTime, 0.06, 1400, 0.8, 6);
    tone(c, c.currentTime, 660, 0.12, 0.05, 'triangle');
  },
  wrong() {
    buzz([40, 60, 40]);
    const c = ac();
    if (!c) return;
    noiseBurst(c, c.currentTime, 0.18, 240, 1.2, 3);
    tone(c, c.currentTime + 0.02, 110, 0.25, 0.08, 'sawtooth');
  },
  unlock() {
    buzz([20, 40, 80]);
    const c = ac();
    if (!c) return;
    const t = c.currentTime;
    noiseBurst(c, t, 0.12, 500, 1.4, 4);
    noiseBurst(c, t + 0.18, 0.12, 380, 1.4, 4);
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, t + 0.45 + i * 0.12, f, 0.9, 0.06, 'sine'));
  },
  reveal() {
    const c = ac();
    if (!c) return;
    const t = c.currentTime;
    noiseBurst(c, t, 0.35, 900, 0.4, 1);
    tone(c, t + 0.15, 880, 0.5, 0.04);
    tone(c, t + 0.28, 1318.5, 0.6, 0.03);
  },
};
