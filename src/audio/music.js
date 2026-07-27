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

  // Coming back to the tab (or unlocking the phone) leaves the context
  // suspended on mobile; without this the world is silent from then on.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state.sound && ctx.state === 'suspended') ctx.resume();
  });

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
  // If the context was paused (tab backgrounded, phone locked) its clock has
  // run on without us. Re-anchor instead of dumping the whole backlog at once.
  if (nextT < ctx.currentTime - 0.5) nextT = ctx.currentTime + 0.1;
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
  unlock();          // no-op once the phone has let us through
  playing = true; started = true;

  // The melody is scheduled against ctx.currentTime, and a suspended context's
  // clock does not advance. Anchoring before the resume finishes would queue
  // every note in the past, where they are silently dropped — which is exactly
  // how "no sound at all on the phone" happens. So wait for it to be running.
  const begin = () => {
    if (!playing) return;
    if (timer) { clearTimeout(timer); timer = null; }
    nextT = ctx.currentTime + 0.15;
    scheduler();
  };
  if (ctx.state === 'running') begin();
  else ctx.resume().then(begin).catch(() => { /* still locked; a later gesture retries */ });
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

// iOS in particular will not let a context out of 'suspended' unless the
// resume happens inside a real user gesture, and it ignores a resume that
// arrives from a gesture it considers already spent. Playing one empty buffer
// is the long-standing way to convince it the page is allowed to make noise.
function unlock() {
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  const src = ctx.createBufferSource();
  src.buffer = ctx.createBuffer(1, 1, 22050);
  src.connect(ctx.destination);
  src.start(0);
}

// Browsers block audio until the user interacts, so start on the first gesture
// — but KEEP LISTENING until the context is genuinely running. The first tap on
// a phone often lands on the rotate gate or a movement button and does not get
// us all the way there; with a one-shot listener the world stays mute forever.
export function autoStartOnGesture() {
  const off = () => {
    window.removeEventListener('pointerdown', f);
    window.removeEventListener('keydown', f);
    window.removeEventListener('touchstart', f);
  };
  const f = () => {
    startAudio();
    unlock();
    if (state.sound) startMusic();   // safe to repeat: it re-anchors the melody
    if (ctx && ctx.state === 'running') off();
  };
  window.addEventListener('pointerdown', f);
  window.addEventListener('keydown', f);
  window.addEventListener('touchstart', f);
}
