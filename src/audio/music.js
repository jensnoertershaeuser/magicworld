// A tiny synth that plays a gentle looping melody (piano-ish) with a sung
// vowel voice layered on top (the unicorn "singing along"). Other modules
// subscribe with onBeat(cb) to spawn visuals in time with the notes.

import { state } from '../state.js';

let ctx, master, filter;
let playing = false, started = false, idx = 0, nextT = 0, timer = null;
const beat = 0.52;

const F = { G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, R: 0 };
const melody = [
  [F.E5, 1], [F.G5, 1], [F.A5, 2], [F.G5, 1], [F.E5, 1], [F.D5, 2],
  [F.C5, 1], [F.D5, 1], [F.E5, 2], [F.D5, 1], [F.C5, 1], [F.G4, 2],
  [F.C5, 1], [F.E5, 1], [F.G5, 2], [F.F5, 1], [F.E5, 1], [F.D5, 2],
  [F.E5, 1], [F.C5, 1], [F.D5, 2], [F.C5, 2], [F.R, 2],
];

const beatSubs = [];
export function onBeat(cb) { beatSubs.push(cb); }
export function isPlaying() { return playing; }

function startAudio() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.5;
  filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 2600;
  const delay = ctx.createDelay(); delay.delayTime.value = 0.30;
  const fb = ctx.createGain(); fb.gain.value = 0.26;
  const wet = ctx.createGain(); wet.gain.value = 0.28;
  filter.connect(master);
  filter.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);
  master.connect(ctx.destination);
}

function playNote(freq, time, d) {
  const dur = d * beat;
  const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = freq;
  const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = freq; o2.detune.value = 5;
  const oL = ctx.createOscillator(); oL.type = 'sine'; oL.frequency.value = freq / 2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, time); g.gain.linearRampToValueAtTime(0.16, time + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, time + dur + 0.35);
  const gL = ctx.createGain();
  gL.gain.setValueAtTime(0.0001, time); gL.gain.linearRampToValueAtTime(0.05, time + 0.04); gL.gain.exponentialRampToValueAtTime(0.0001, time + dur + 0.35);
  o1.connect(g); o2.connect(g); oL.connect(gL); g.connect(filter); gL.connect(filter);
  const end = time + dur + 0.4;
  o1.start(time); o2.start(time); oL.start(time); o1.stop(end); o2.stop(end); oL.stop(end);
}

function singNote(freq, time, d) {
  const dur = d * beat;
  const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = freq;
  const vib = ctx.createOscillator(); vib.type = 'sine'; vib.frequency.value = 5.5;
  const vg = ctx.createGain(); vg.gain.value = freq * 0.012; vib.connect(vg); vg.connect(osc.frequency);
  const voice = ctx.createGain();
  voice.gain.setValueAtTime(0.0001, time); voice.gain.linearRampToValueAtTime(0.11, time + 0.08);
  voice.gain.setValueAtTime(0.11, time + dur * 0.55); voice.gain.exponentialRampToValueAtTime(0.0001, time + dur + 0.28);
  [[720, 1], [1150, 0.65], [2600, 0.35]].forEach((f) => {
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f[0]; bp.Q.value = 9;
    const fg = ctx.createGain(); fg.gain.value = f[1];
    osc.connect(bp); bp.connect(fg); fg.connect(voice);
  });
  voice.connect(filter);
  const end = time + dur + 0.32;
  osc.start(time); vib.start(time); osc.stop(end); vib.stop(end);
}

function scheduler() {
  if (!playing) return;
  while (nextT < ctx.currentTime + 0.12) {
    const m = melody[idx];
    if (m[0] > 0) {
      playNote(m[0], nextT, m[1]);
      singNote(m[0], nextT, m[1]);
      const delayMs = Math.max(0, (nextT - ctx.currentTime) * 1000);
      setTimeout(() => { if (playing) beatSubs.forEach((cb) => cb()); }, delayMs);
    }
    nextT += m[1] * beat;
    idx = (idx + 1) % melody.length;
  }
  timer = setTimeout(scheduler, 25);
}

export function startMusic() {
  startAudio();
  if (ctx.state === 'suspended') ctx.resume();
  playing = true; started = true; nextT = ctx.currentTime + 0.15;
  scheduler();
}
export function stopMusic() {
  playing = false;
  if (timer) { clearTimeout(timer); timer = null; }
}
export function toggleMusic() { playing ? stopMusic() : startMusic(); return playing; }

// Sound effects (see audio/sfx.js) share this AudioContext instead of opening
// a second one. They connect to `master`, bypassing the melody's echo/lowpass
// so a squeak stays crisp.
export function getAudioContext() { startAudio(); return ctx; }
export function getSfxBus() { startAudio(); return master; }

// Browsers block audio until the user interacts; start on first gesture.
export function autoStartOnGesture() {
  const f = () => {
    if (!started && state.sound) startMusic();
    window.removeEventListener('pointerdown', f);
    window.removeEventListener('keydown', f);
    window.removeEventListener('touchstart', f);
  };
  window.addEventListener('pointerdown', f);
  window.addEventListener('keydown', f);
  window.addEventListener('touchstart', f);
}
