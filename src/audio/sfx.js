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

// Is there anything to play into? Before the first user gesture the browser
// keeps the context suspended, and anything played into it would just be
// silently dropped.
function liveContext() {
  if (!state.sound) return null;
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== 'running') return null;
  return ctx;
}

// "Autsch!" — a squeak that jumps up ("au") and then slides down ("tsch"),
// which reads as a yelp rather than as a beep.
export function playOuch() {
  const ctx = liveContext();
  if (!ctx) return;

  const bus = getSfxBus();
  const t = ctx.currentTime;
  blip(ctx, bus, t, 520, 1180, 0.13, 0.20);
  blip(ctx, bus, t + 0.14, 980, 430, 0.22, 0.17);
}

// A figure comes off Willi's knife: two short wooden taps and a bright little
// chime on top, so you hear from across the meadow that one is finished.
export function playCarveDone() {
  const ctx = liveContext();
  if (!ctx) return;

  const bus = getSfxBus();
  const t = ctx.currentTime;
  blip(ctx, bus, t, 420, 300, 0.09, 0.14);
  blip(ctx, bus, t + 0.10, 520, 380, 0.09, 0.12);
  blip(ctx, bus, t + 0.22, 990, 1480, 0.30, 0.12);
}
