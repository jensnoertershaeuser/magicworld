import * as THREE from 'three';
import { heightAt } from './ground.js';
import { onUpdate } from '../engine/loop.js';
import { state } from '../state.js';
import { reserve } from './occupancy.js';

const COLORS = [0xff6ec7, 0x6ee7ff, 0xffe066, 0xb06bff, 0x5ff0d0, 0xff9e2c];

export function addScenery(scene) {
  const crystals = []; // animated floaters

  function crystal(x, y, z, color, size) {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(size), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.7, metalness: 0.3, roughness: 0.15, transparent: true, opacity: 0.92 }));
    m.position.set(x, y, z); m.castShadow = true;
    m.userData = { baseY: y, spin: 0.2 + Math.random() * 0.6, off: Math.random() * 6.28 };
    scene.add(m); crystals.push(m);
  }
  crystal(-6, 8, -12, 0xb06bff, 1.3); crystal(10, 7, 6, 0x6ee7ff, 1.0);
  crystal(-16, 6, 4, 0xffe066, 0.9); crystal(20, 9, -14, 0x5ff0d0, 1.1);

  // Glowing mushrooms (emissive, no lights)
  function mushroom(x, z, scale, color) {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.0, 10), new THREE.MeshStandardMaterial({ color: 0xf3e9d8, roughness: 0.8 }));
    stem.position.y = 0.5; g.add(stem);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.6, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, roughness: 0.5 }));
    cap.position.y = 1.0; g.add(cap);
    g.scale.setScalar(scale); g.position.set(x, heightAt(x, z), z);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    reserve(x, z, 0.6 * scale + 1.2);   // cap width; the big ones need real room
    scene.add(g);
  }
  [[-18, 10, 1.1, 0xff6ec7], [-22, 16, 0.8, 0x6ee7ff], [16, -20, 1.3, 0xffe066], [24, 8, 0.9, 0xb06bff], [-10, -24, 1.0, 0x5ff0d0], [30, -6, 0.85, 0xff9e7d]]
    .forEach((m) => mushroom(m[0], m[1], m[2], m[3]));

  // The big magic tree
  (function tree() {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.6, 7, 12), new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9 }));
    trunk.position.y = 3.5; g.add(trunk);
    const cols = [0x2f9e6a, 0x3fbf8f, 0x5ff0d0];
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(3.4 - i * 0.4, 0), new THREE.MeshStandardMaterial({ color: cols[i % 3], emissive: 0x114d33, emissiveIntensity: 0.25, roughness: 0.85, flatShading: true }));
      leaf.position.set((Math.random() - 0.5) * 2, 7 + i * 1.6, (Math.random() - 0.5) * 2); g.add(leaf);
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    // Was at (-26,-16), where its trunk grew through the pool's back wall.
    // Moved clear of the pool (which sits at -24,-12 and is 8x6).
    const tx = -32, tz = -22;
    g.position.set(tx, heightAt(tx, tz), tz); scene.add(g);
    reserve(tx, tz, 6);          // the magic tree is 3.4 wide and should stand alone
  })();

  // Colourful mid-ground: big crystals + big mushrooms (between play area and mountains)
  for (let i = 0; i < 9; i++) {
    const a = Math.random() * Math.PI * 2, d = 44 + Math.random() * 16;
    const x = Math.cos(a) * d, z = Math.sin(a) * d, size = 1.6 + Math.random() * 2.2;
    crystal(x, heightAt(x, z) + size + 2 + Math.random() * 6, z, COLORS[i % COLORS.length], size);
  }
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2, d = 46 + Math.random() * 14;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    mushroom(x, z, 2.2 + Math.random() * 1.6, COLORS[(i + 2) % COLORS.length]);
  }

  onUpdate((dt, t) => {
    if (state.paused) return;
    crystals.forEach((c) => {
      c.rotation.y += dt * c.userData.spin;
      c.position.y = c.userData.baseY + Math.sin(t + c.userData.off) * 0.5;
    });
  });
}
