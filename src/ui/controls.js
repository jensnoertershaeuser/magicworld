import { state } from '../state.js';
import { onUpdate } from '../engine/loop.js';
import { setLabelsVisible } from './labels.js';

// Builds the ☰ toggle and the button bar, and wires each button to the shared
// state flags and the callbacks passed in from main.js.
//
// The bar is hidden by default on every device — the world should be the
// screen, not the UI. ☰ toggles the `menu-open` class on <html>, which is what
// both the desktop styles below and the phone styles in ui/mobile.js key off.
export function initControls({ onSound, onJump, onDoor, onBuild, onCarve }) {
  const style = document.createElement('style');
  style.textContent = `
    #menu-toggle {
      position: fixed; z-index: 12; cursor: pointer;
      top: calc(10px + env(safe-area-inset-top));
      left: calc(10px + env(safe-area-inset-left));
      width: 44px; height: 44px; border-radius: 14px;
      font: 700 20px 'Trebuchet MS', sans-serif; color: rgba(255,255,255,.92);
      background: rgba(30,22,58,.42); border: 1px solid rgba(255,255,255,.3);
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      touch-action: manipulation; -webkit-user-select: none; user-select: none;
      transition: background .15s;
    }
    #menu-toggle:hover { background: rgba(40,28,74,.72); }
    #menu-toggle.on { background: rgba(123,77,255,.72); border-color: transparent; }

    #bar { position: fixed; left: 50%; bottom: 14px;
      display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;
      max-width: 96vw; z-index: 10;
      transform: translate(-50%, 10px); opacity: 0; pointer-events: none;
      transition: opacity .18s, transform .18s; }
    html.menu-open #bar { transform: translate(-50%, 0); opacity: 1; pointer-events: auto; }

    #bar button { font: 600 13px 'Trebuchet MS', sans-serif; color: #fff; cursor: pointer;
      padding: 9px 13px; border-radius: 999px; border: 1px solid rgba(255,255,255,.25);
      background: rgba(40,28,74,.72); backdrop-filter: blur(6px); transition: transform .08s, background .15s; }
    #bar button:hover { transform: translateY(-2px); }
    #bar button.on { background: linear-gradient(90deg,#7b4dff,#3fa9f5); border-color: transparent; }
  `;
  document.head.appendChild(style);

  buildMenuToggle();

  const bar = document.createElement('div'); bar.id = 'bar'; document.body.appendChild(bar);

  const mk = (label, onClick, active = false) => {
    const b = document.createElement('button');
    b.textContent = label;
    if (active) b.classList.add('on');
    b.addEventListener('click', () => onClick(b));
    bar.appendChild(b);
    return b;
  };
  const toggleClass = (b, v) => b.classList.toggle('on', v);
  const soundLabel = () => (state.sound ? '🔊 Ton an' : '🔇 Ton aus');
  // Two projects, so the button shows what the Technik-Haus is building right
  // now and one press swaps to the other one.
  const buildLabel = () => (state.build === 'sup' ? '🏄 Bauen: SUP' : '🤖 Bauen: Roboter');
  const carveLabel = () => `🪵 Schnitzen: ${state.carve}`;

  mk('🌙 Tag/Nacht', (b) => { state.night = !state.night; toggleClass(b, state.night); });
  mk('🏷️ Schilder', (b) => { state.labels = !state.labels; setLabelsVisible(state.labels); toggleClass(b, state.labels); }, state.labels);
  mk(soundLabel(), (b) => { const on = onSound(); b.textContent = soundLabel(); toggleClass(b, on); }, state.sound);
  mk('🤸 Reinspringen', () => onJump());
  mk('🚪 Tür', (b) => { const open = onDoor(); toggleClass(b, open); });
  mk(buildLabel(), (b) => { onBuild(); b.textContent = buildLabel(); toggleClass(b, state.build === 'sup'); });

  // The Holzwerkstatt moves on to the next figure by itself once one is
  // finished, so this button's text follows state.carve every frame instead of
  // only changing when it is clicked — otherwise it would soon be lying about
  // what is on the bench.
  const carveBtn = mk(carveLabel(), () => onCarve());
  onUpdate(() => {
    const txt = carveLabel();
    if (carveBtn.textContent !== txt) carveBtn.textContent = txt;
  });
}

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
