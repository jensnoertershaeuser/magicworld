import { state } from '../state.js';
import { setLabelsVisible } from './labels.js';

// Builds the on-screen button bar and wires each button to the shared state
// flags and the callbacks passed in from main.js.
export function initControls({ camControls, onMusic, onJump, onDoor }) {
  const style = document.createElement('style');
  style.textContent = `
    #bar { position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%);
      display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;
      max-width: 96vw; z-index: 10; }
    #bar button { font: 600 13px 'Trebuchet MS', sans-serif; color: #fff; cursor: pointer;
      padding: 9px 13px; border-radius: 999px; border: 1px solid rgba(255,255,255,.25);
      background: rgba(40,28,74,.72); backdrop-filter: blur(6px); transition: transform .08s, background .15s; }
    #bar button:hover { transform: translateY(-2px); }
    #bar button.on { background: linear-gradient(90deg,#7b4dff,#3fa9f5); border-color: transparent; }
  `;
  document.head.appendChild(style);

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

  mk('👣 Balthasar folgen', (b) => { state.follow = !state.follow; toggleClass(b, state.follow); }, state.follow);
  mk('🎥 Kamera dreht', (b) => { state.autoSpin = !state.autoSpin; toggleClass(b, state.autoSpin); }, state.autoSpin);
  mk('⏸️ Anhalten', (b) => { state.paused = !state.paused; b.textContent = state.paused ? '▶️ Weiter' : '⏸️ Anhalten'; toggleClass(b, state.paused); });
  mk('🌙 Tag/Nacht', (b) => { state.night = !state.night; toggleClass(b, state.night); });
  mk('🏷️ Schilder', (b) => { state.labels = !state.labels; setLabelsVisible(state.labels); toggleClass(b, state.labels); }, state.labels);
  mk('🎵 Melodie', (b) => { const on = onMusic(); toggleClass(b, on); });
  mk('🤸 Reinspringen', () => onJump());
  mk('🚪 Tür', (b) => { const open = onDoor(); toggleClass(b, open); });
  mk('↩️ Ansicht zurück', () => {
    const o = camControls.orbit;
    o.target.set(0, 2, 0); o.theta = Math.PI * 0.25; o.phi = Math.PI * 0.38; o.radius = 40;
    state.follow = false;
    document.querySelectorAll('#bar button').forEach((b) => { if (b.textContent.includes('folgen')) b.classList.remove('on'); });
  });
}
