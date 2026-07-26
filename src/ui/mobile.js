import { isPhone, isPortrait } from './device.js';

// Phone-only UI layer. Does nothing at all on desktop or tablet.
//
// Three parts:
//   1. a full-screen "turn your phone sideways" gate that disappears by itself
//      as soon as the device is in landscape,
//   2. the button bar from ui/controls.js is hidden and gets a ☰ toggle,
//   3. translucent on-screen movement buttons (W A S D + up/down) that press
//      the exact same keys the keyboard does, via camControls.setKey().
export function initMobile({ camControls }) {
  if (!isPhone()) return;

  document.documentElement.classList.add('mobile');
  injectStyle();
  buildRotateGate();
  buildMenuToggle();
  buildTouchPads(camControls);
  retuneHint();
}

function injectStyle() {
  const style = document.createElement('style');
  style.textContent = `
    /* --- rotate gate --- */
    #rotate-gate {
      position: fixed; inset: 0; z-index: 200;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 20px; padding: 28px; text-align: center; color: #fff;
      background: radial-gradient(circle at 50% 35%, #2a5fa8, #101a3a 75%);
      font-family: 'Trebuchet MS', sans-serif;
    }
    #rotate-gate.hidden { display: none; }
    #rotate-gate .phone {
      width: 62px; height: 106px; border: 3px solid rgba(255,255,255,.85);
      border-radius: 12px; position: relative;
      animation: tilt 2.2s ease-in-out infinite;
    }
    #rotate-gate .phone::after {
      content: ''; position: absolute; left: 50%; bottom: 6px; transform: translateX(-50%);
      width: 22px; height: 3px; border-radius: 2px; background: rgba(255,255,255,.7);
    }
    @keyframes tilt {
      0%, 30% { transform: rotate(0deg); }
      60%, 100% { transform: rotate(-90deg); }
    }
    #rotate-gate h2 {
      font-size: 22px; letter-spacing: .5px;
      background: linear-gradient(90deg, #ffe066, #5ff0d0, #b06bff);
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    #rotate-gate p { font-size: 14px; opacity: .85; max-width: 300px; line-height: 1.45; }
    #rotate-gate button {
      margin-top: 6px; font: 600 13px 'Trebuchet MS', sans-serif; color: rgba(255,255,255,.75);
      background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.28);
      border-radius: 999px; padding: 9px 16px;
    }

    /* --- menu: hidden by default, ☰ toggles it --- */
    #menu-toggle {
      position: fixed; z-index: 12;
      top: calc(10px + env(safe-area-inset-top));
      left: calc(10px + env(safe-area-inset-left));
      width: 44px; height: 44px; border-radius: 14px;
      font: 700 20px 'Trebuchet MS', sans-serif; color: rgba(255,255,255,.92);
      background: rgba(255,255,255,.16); border: 1px solid rgba(255,255,255,.32);
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      touch-action: manipulation; -webkit-user-select: none; user-select: none;
    }
    #menu-toggle.on { background: rgba(255,255,255,.34); }

    /* A 2-column sheet instead of the desktop bar: all nine buttons fit on a
       landscape phone without scrolling. */
    html.mobile #bar {
      left: calc(10px + env(safe-area-inset-left)); bottom: auto;
      top: calc(62px + env(safe-area-inset-top));
      width: min(420px, calc(100vw - 20px - env(safe-area-inset-left) - env(safe-area-inset-right)));
      max-width: none;
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px;
      padding: 10px; border-radius: 18px;
      background: rgba(18,14,38,.42); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      transform: translateX(-10px); transition: opacity .18s, transform .18s;
      opacity: 0; pointer-events: none;
    }
    html.mobile.menu-open #bar { opacity: 1; transform: translateX(0); pointer-events: auto; }
    html.mobile #bar button {
      font-size: 13px; padding: 10px 8px; width: 100%;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    /* While the menu is open you're not steering — get the pads out of the way. */
    html.mobile.menu-open .tpad { opacity: 0; pointer-events: none; }
    .tpad { transition: opacity .18s; }

    /* --- touch movement pads --- */
    .tpad { position: fixed; z-index: 11; display: grid; gap: 7px; }
    #tpad-move {
      left: calc(14px + env(safe-area-inset-left));
      bottom: calc(14px + env(safe-area-inset-bottom));
      grid-template-columns: repeat(3, 54px); grid-template-rows: repeat(2, 54px);
    }
    #tpad-vert {
      right: calc(14px + env(safe-area-inset-right));
      bottom: calc(14px + env(safe-area-inset-bottom));
      grid-template-columns: 54px; grid-template-rows: repeat(2, 54px);
    }
    .tbtn {
      width: 54px; height: 54px; border-radius: 16px;
      display: flex; align-items: center; justify-content: center;
      font: 700 17px 'Trebuchet MS', sans-serif; color: rgba(255,255,255,.9);
      background: rgba(220,220,225,.20); border: 1px solid rgba(255,255,255,.34);
      backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
      touch-action: none; -webkit-user-select: none; user-select: none;
      -webkit-tap-highlight-color: transparent;
      transition: background .1s, transform .1s;
    }
    .tbtn.press { background: rgba(255,255,255,.42); transform: scale(.93); }

    html.mobile #hint { top: calc(10px + env(safe-area-inset-top)); }
    html.mobile #hint h1 { font-size: 17px; }
    html.mobile #hint p { font-size: 11px; }
  `;
  document.head.appendChild(style);
}

// --- 1. rotate gate -------------------------------------------------------
function buildRotateGate() {
  const gate = document.createElement('div');
  gate.id = 'rotate-gate';
  gate.innerHTML = `
    <div class="phone"></div>
    <h2>Bitte dreh dein Handy quer</h2>
    <p>Balthasars Zauberwelt öffnet sich, sobald dein Handy im Querformat ist.</p>
    <button type="button">Trotzdem weiter</button>
  `;
  document.body.appendChild(gate);

  let dismissed = false;
  const sync = () => gate.classList.toggle('hidden', dismissed || !isPortrait());
  gate.querySelector('button').addEventListener('click', () => { dismissed = true; sync(); });

  sync();
  window.addEventListener('resize', sync);
  window.addEventListener('orientationchange', () => setTimeout(sync, 150));
}

// --- 2. ☰ menu toggle -----------------------------------------------------
function buildMenuToggle() {
  const btn = document.createElement('button');
  btn.id = 'menu-toggle';
  btn.type = 'button';
  btn.textContent = '☰';
  btn.setAttribute('aria-label', 'Menü');
  btn.addEventListener('click', () => {
    const open = document.documentElement.classList.toggle('menu-open');
    btn.classList.toggle('on', open);
    btn.textContent = open ? '✕' : '☰';
  });
  document.body.appendChild(btn);
}

// --- 3. movement buttons --------------------------------------------------
function buildTouchPads(camControls) {
  const move = document.createElement('div');
  move.className = 'tpad'; move.id = 'tpad-move';
  const vert = document.createElement('div');
  vert.className = 'tpad'; vert.id = 'tpad-vert';
  document.body.append(move, vert);

  // [ , W , ] / [ A , S , D ] — empty cells keep W centred above S.
  const spacer = () => { const d = document.createElement('div'); return d; };
  const btn = (label, key, col, row, parent) => {
    const b = document.createElement('div');
    b.className = 'tbtn';
    b.textContent = label;
    b.style.gridColumn = col;
    b.style.gridRow = row;
    hold(b, key, camControls);
    parent.appendChild(b);
    return b;
  };

  move.appendChild(spacer());
  btn('W', 'w', 2, 1, move);
  btn('A', 'a', 1, 2, move);
  btn('S', 's', 2, 2, move);
  btn('D', 'd', 3, 2, move);
  btn('⬆', 'e', 1, 1, vert);
  btn('⬇', 'q', 1, 2, vert);

  // A finger still down when the app is backgrounded would otherwise leave the
  // camera drifting forever.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      camControls.releaseAllKeys();
      document.querySelectorAll('.tbtn.press').forEach((b) => b.classList.remove('press'));
    }
  });
}

// Press-and-hold behaviour, multi-touch safe: pointer capture keeps the
// release event on this button even if the finger slides off it, so W + A can
// be held together without either key sticking.
function hold(el, key, camControls) {
  const down = (e) => {
    e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch { /* not a live pointer */ }
    el.classList.add('press');
    camControls.setKey(key, true);
  };
  const up = (e) => {
    e.preventDefault();
    el.classList.remove('press');
    camControls.setKey(key, false);
  };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('lostpointercapture', up);
}

function retuneHint() {
  const p = document.querySelector('#hint p');
  if (p) p.textContent = 'Ziehen = drehen · 2 Finger = zoomen · Tasten = bewegen';
}
