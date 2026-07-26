import * as THREE from 'three';
import { onUpdate } from '../engine/loop.js';
import { state } from '../state.js';
import { reserve } from './occupancy.js';

export function addMountains(scene) {
  // Plain snowy mountains
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x59527a, roughness: 0.95, flatShading: true });
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xeaf2ff, roughness: 0.7, flatShading: true });
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
    const d = 66 + Math.random() * 18;
    const x = Math.cos(a) * d, z = Math.sin(a) * d, h = 12 + Math.random() * 14, r = 6 + Math.random() * 6;
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5 + ((Math.random() * 3) | 0), 1), rockMat);
    m.position.set(x, h / 2 - 1, z); m.rotation.y = Math.random() * Math.PI; scene.add(m);
    // Trees planted inside a mountain are invisible anyway — keep them at the
    // foot of the slope instead. (0.8 of the base, so they can still hug it.)
    reserve(x, z, r * 0.8);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.42, h * 0.28, 5, 1), snowMat);
    cap.position.set(x, h - h * 0.14 - 1, z); cap.rotation.y = m.rotation.y; scene.add(cap);
  }

  // Glow mountains: dark rock with emissive crystals. Bright at night.
  const glow = [];
  const cols = [0x6ee7ff, 0xb06bff, 0xff6ec7, 0x5ff0d0, 0xffe066];
  [[0.7, 74], [1.9, 80], [3.0, 70], [4.2, 78], [5.5, 72]].forEach((s, i) => {
    const x = Math.cos(s[0]) * s[1], z = Math.sin(s[0]) * s[1];
    const h = 16 + Math.random() * 10, r = 6 + Math.random() * 4, col = cols[i % cols.length];
    const g = new THREE.Group(); g.position.set(x, -1, z);
    const rockM = new THREE.MeshStandardMaterial({ color: 0x241f3e, roughness: 0.95, flatShading: true, emissive: col, emissiveIntensity: 0.05 });
    const rock = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6, 1), rockM); rock.position.y = h / 2; g.add(rock);
    const crystals = [];
    for (let k = 0; k < 6; k++) {
      const cm = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.4, roughness: 0.3, metalness: 0.2 });
      const cy = 2 + Math.random() * (h * 0.7), taper = r * 0.5 * (1 - cy / h), ca = Math.random() * Math.PI * 2;
      const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.7 + Math.random() * 1.0), cm);
      cr.position.set(Math.cos(ca) * taper, cy, Math.sin(ca) * taper); cr.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      g.add(cr); crystals.push(cm);
    }
    reserve(x, z, r * 0.8);
    scene.add(g); glow.push({ rockMat: rockM, crystals, pulse: Math.random() * 6.28 });
  });

  onUpdate((dt, t) => {
    glow.forEach((m) => {
      const nb = state.night ? 1.5 : 0.28;
      const pulse = 0.28 * Math.sin(t * 1.4 + m.pulse);
      const inten = Math.max(0.05, nb + pulse);
      m.crystals.forEach((cm) => (cm.emissiveIntensity = inten));
      m.rockMat.emissiveIntensity = state.night ? 0.3 : 0.05;
    });
  });
}
