// Single source of truth for "is this a phone?".
//
// The test is: a coarse pointer (finger, not mouse) AND a short side under
// 600 CSS px. The short side is used on purpose — a modern phone in landscape
// is ~430px tall but ~930px wide, so a max-dimension test would wrongly let
// big phones through, while every tablet (iPad mini is already 744px on its
// short side) stays on the desktop layout.
// Add ?mobile=1 to the URL to preview the phone layout on a desktop browser.
const forced = new URLSearchParams(window.location.search).has('mobile');

export function isPhone() {
  if (forced) return true;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const w = window.screen?.width || window.innerWidth;
  const h = window.screen?.height || window.innerHeight;
  return coarse && Math.min(w, h) < 600;
}

export function isPortrait() {
  return window.matchMedia?.('(orientation: portrait)').matches
    ?? window.innerHeight > window.innerWidth;
}
