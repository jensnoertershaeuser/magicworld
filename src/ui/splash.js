import { isPhone } from './device.js';

// The launch splash itself lives in index.html so it paints on the very first
// frame, before Three.js is downloaded. This module only decides WHEN it goes
// away: once the world is built (main.js calls dismissSplash at the end) and a
// minimum showing time has elapsed, so it never flashes past on a fast machine.
const MIN_VISIBLE_MS = 2600;
const FADE_MS = 600;

export function dismissSplash() {
  const el = document.getElementById('splash');
  if (!el) return;

  // performance.now() is milliseconds since the page started loading, so this
  // measures the splash from when the user actually first saw it.
  const wait = Math.max(0, MIN_VISIBLE_MS - performance.now());
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), FADE_MS);
  }, wait);
}

// The controls hint used to sit permanently on top of the world. It is now a
// launch tip instead: read once while the world loads, then gone.
export function initSplashTip() {
  const tip = document.getElementById('splash-tip');
  if (!tip) return;
  tip.textContent = isPhone()
    ? 'Ziehen = umsehen · 2 Finger = zoomen · Pfeile = bewegen'
    : 'Ziehen = umsehen · Scrollen = zoomen · W A S D = bewegen';
}
