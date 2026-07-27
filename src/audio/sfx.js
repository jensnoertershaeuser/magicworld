import { state } from '../state.js';
import { getAudioContext, getSfxBus } from './music.js';

// Short sound effects, synthesised the same way the melody is — no audio files
// to download. They share the melody's AudioContext and obey the same on/off
// switch (state.sound), which the "Ton" button flips.

// One blip: a triangle wave that bends from f0 to f1 while it fades out.
function blip(ctx, bus, t0, f0, f1, dur, peak) {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(f0, t0);
  osc.frequency.exponentialRampToValueAtTime(f1, t0 + dur * 0.8);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(g); g.connect(bus);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}

// "Autsch!" — a squeak that jumps up ("au") and then slides down ("tsch"),
// which reads as a yelp rather than as a beep.
export function playOuch() {
  if (!state.sound) return;
  const ctx = getAudioContext();
  // Before the first user gesture the browser keeps the context suspended;
  // playing into it would just be silently dropped.
  if (!ctx || ctx.state !== 'running') return;

  const bus = getSfxBus();
  const t = ctx.currentTime;
  blip(ctx, bus, t, 520, 1180, 0.13, 0.20);
  blip(ctx, bus, t + 0.14, 980, 430, 0.22, 0.17);
}
