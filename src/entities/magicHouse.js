import * as THREE from 'three';
import { heightAt } from '../world/ground.js';
import { makeLabel } from '../ui/labels.js';
import { onUpdate } from '../engine/loop.js';

// Returns { toggleDoor } so the UI button can open/close the door.
export function addMagicHouse(scene) {
  const hx = 10, hz = 36, yaw = Math.atan2(-hx, -hz);
  const g = new THREE.Group(); g.position.set(hx, heightAt(hx, hz), hz); g.rotation.y = yaw; scene.add(g);

  const W = 6, D = 6, H = 4;
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x6b4a9e, roughness: 0.8, emissive: 0x1a1030, emissiveIntensity: 0.2 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x8e3ad6, roughness: 0.7, emissive: 0x2a0a44, emissiveIntensity: 0.25 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xffe066, metalness: 0.7, roughness: 0.3, emissive: 0x3a2e00, emissiveIntensity: 0.4 });

  const walls = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), wallMat); walls.position.y = H / 2; walls.castShadow = true; walls.receiveShadow = true; g.add(walls);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(W * 0.82, 3.2, 4), roofMat); roof.position.y = H + 1.6; roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof);
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.5), new THREE.MeshStandardMaterial({ color: 0xffe066, emissive: 0xffe066, emissiveIntensity: 1.4, roughness: 0.3 })); star.position.y = H + 3.6; g.add(star);

  // glowing windows
  [[-1.6, 2.4], [1.6, 2.4]].forEach((p) => { const win = new THREE.Mesh(new THREE.CircleGeometry(0.6, 20), new THREE.MeshStandardMaterial({ color: 0xffd966, emissive: 0xffd966, emissiveIntensity: 0.7, roughness: 0.3 })); win.position.set(p[0], p[1], D / 2 + 0.01); g.add(win); });

  // interior glow (ramps up as the door opens)
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.6), new THREE.MeshBasicMaterial({ color: 0xffdf9a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.position.set(0, 1.35, D / 2 - 0.05); g.add(glow);

  // door on a hinge pivot
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.0, 0.2), trimMat); frame.position.set(0, 1.5, D / 2 + 0.02); g.add(frame);
  const pivot = new THREE.Group(); pivot.position.set(-0.85, 1.45, D / 2 + 0.08); g.add(pivot);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.7, 0.12), new THREE.MeshStandardMaterial({ color: 0x4a2f7a, roughness: 0.7, emissive: 0x140a24, emissiveIntensity: 0.3 }));
  door.geometry.translate(0.8, 0, 0); door.castShadow = true; pivot.add(door);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), trimMat); knob.position.set(1.45, 0, 0.1); door.add(knob);

  const label = makeLabel('Zauberhaus', '#c9a8ff'); label.scale.set(5.0, 1.05, 1); label.position.set(0, H + 5.0, 0); g.add(label);

  const st = { open: false };
  function toggleDoor() { st.open = !st.open; return st.open; }

  onUpdate((dt, t) => {
    const target = st.open ? -1.9 : 0;
    pivot.rotation.y += (target - pivot.rotation.y) * Math.min(1, dt * 4);
    const openness = pivot.rotation.y / -1.9;
    glow.material.opacity = openness * (0.5 + Math.sin(t * 3) * 0.1);
    star.rotation.y += dt * 0.8;
    star.material.emissiveIntensity = 1.2 + Math.sin(t * 2) * 0.4;
  });

  return { toggleDoor };
}
