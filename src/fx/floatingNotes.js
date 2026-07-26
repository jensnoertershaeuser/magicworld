import * as THREE from 'three';
import { onUpdate } from '../engine/loop.js';

// Little glowing ♪ ♫ that rise and fade. Used by the piano and the singing
// unicorn. Call initNotes(scene) once, then spawnNote(origin) anywhere.
const glyphs = ['\u266A', '\u266B', '\u266C', '\u2669'];
const colors = ['#ffe066', '#6ee7ff', '#ff6ec7', '#b06bff', '#5ff0d0'];
const notes = [];
let scene = null;

export function initNotes(s) {
  scene = s;
  onUpdate((dt, t) => {
    for (let i = notes.length - 1; i >= 0; i--) {
      const n = notes[i];
      n.life += dt;
      n.spr.position.y += n.vy * dt;
      n.spr.position.x += (n.vx + Math.sin(t * 2 + n.sway) * 0.3) * dt;
      const p = n.life / n.ttl;
      n.spr.material.opacity = Math.max(0, 1 - p);
      n.spr.scale.setScalar(1.1 * (1 + p * 0.5));
      if (n.life >= n.ttl) {
        scene.remove(n.spr);
        n.spr.material.map.dispose();
        n.spr.material.dispose();
        notes.splice(i, 1);
      }
    }
  });
}

export function spawnNote(origin, spread = 2.4) {
  if (!scene) return;
  const c = document.createElement('canvas'); c.width = c.height = 72;
  const x = c.getContext('2d');
  const col = colors[(Math.random() * colors.length) | 0];
  x.font = '52px serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = col; x.shadowBlur = 16; x.fillStyle = col;
  x.fillText(glyphs[(Math.random() * glyphs.length) | 0], 36, 38);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, depthTest: false,
  }));
  spr.position.set(
    origin.x + (Math.random() - 0.5) * spread,
    origin.y,
    origin.z + (Math.random() - 0.5) * spread * 0.35,
  );
  spr.scale.set(1.1, 1.1, 1);
  scene.add(spr);
  notes.push({ spr, life: 0, ttl: 2.6, vx: (Math.random() - 0.5) * 0.5, vy: 1.3 + Math.random() * 0.7, sway: Math.random() * 6.28 });
}
