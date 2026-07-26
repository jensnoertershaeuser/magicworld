import * as THREE from 'three';
import { heightAt } from '../world/ground.js';
import { makeLabel } from '../ui/labels.js';
import { onUpdate } from '../engine/loop.js';
import { reserve } from '../world/occupancy.js';

export function addRainPalm(scene) {
  const px = 20, pz = -18;
  reserve(px, pz, 6);            // palm + the puddle the rain falls into
  const g = new THREE.Group();
  g.position.set(px, heightAt(px, pz), pz); scene.add(g);

  const bark = new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.9 });
  const barkDark = new THREE.MeshStandardMaterial({ color: 0x6f4620, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3fbf6a, roughness: 0.7, emissive: 0x0f3d22, emissiveIntensity: 0.2, side: THREE.DoubleSide, flatShading: true });

  const seg = 6, pts = [];
  for (let i = 0; i <= seg; i++) { const t = i / seg; pts.push(new THREE.Vector3(Math.sin(t * 0.9) * 1.6, t * 7.0, 0)); }
  const trunk = new THREE.Group(); g.add(trunk);
  for (let i = 0; i < seg; i++) {
    const a = pts[i], b = pts[i + 1], dir = b.clone().sub(a);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(0.14, 0.55 - (i + 1) * 0.06), Math.max(0.16, 0.55 - i * 0.06), dir.length() * 1.04, 10), i % 2 ? bark : barkDark);
    s.position.copy(a.clone().lerp(b, 0.5)); s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()); s.castShadow = true; trunk.add(s);
  }
  const crown = pts[seg];
  for (let i = 0; i < 11; i++) {
    const arm = new THREE.Object3D(); arm.position.copy(crown); arm.rotation.y = (i / 11) * Math.PI * 2; trunk.add(arm);
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.42, 4.4, 4), leafMat); frond.geometry.translate(0, 2.2, 0); frond.scale.set(1, 1, 0.16);
    frond.rotation.z = -(Math.PI / 2 + 0.45 + Math.random() * 0.2); frond.castShadow = true; arm.add(frond);
  }
  for (let k = 0; k < 4; k++) { const co = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), barkDark); co.position.set(crown.x + (Math.random() - 0.5) * 0.7, crown.y - 0.4, (Math.random() - 0.5) * 0.7); trunk.add(co); }

  const puddle = new THREE.Mesh(new THREE.CircleGeometry(3.2, 32), new THREE.MeshStandardMaterial({ color: 0x3a7bd5, transparent: true, opacity: 0.35, roughness: 0.15, metalness: 0.4 }));
  puddle.rotation.x = -Math.PI / 2; puddle.position.set(crown.x, 0.04, 0); g.add(puddle);

  const ripples = [];
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.44, 28), new THREE.MeshBasicMaterial({ color: 0xafe0ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(crown.x, 0.06, 0); g.add(ring); ripples.push({ mesh: ring, phase: i / 3 });
  }

  const label = makeLabel('Regenpalme', '#8fd3ff'); label.position.set(crown.x, crown.y + 2.4, 0); g.add(label);

  // rain
  const N = 150, arr = new Float32Array(N * 3), data = [];
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, rr = Math.random() * 3.2;
    const dx = crown.x + Math.cos(a) * rr, dz = Math.sin(a) * rr, dy = Math.random() * crown.y;
    data.push({ x: dx, z: dz, y: dy, sp: 6 + Math.random() * 4 }); arr[i * 3] = dx; arr[i * 3 + 1] = dy; arr[i * 3 + 2] = dz;
  }
  const rgeo = new THREE.BufferGeometry(); rgeo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  const rpts = new THREE.Points(rgeo, new THREE.PointsMaterial({ color: 0x8fd3ff, size: 0.16, transparent: true, opacity: 0.8, depthWrite: false }));
  g.add(rpts);

  onUpdate((dt) => {
    const attr = rpts.geometry.attributes.position;
    data.forEach((d, i) => {
      d.y -= d.sp * dt;
      if (d.y < 0) { d.y = crown.y; const a = Math.random() * Math.PI * 2, rr = Math.random() * 3.2; d.x = crown.x + Math.cos(a) * rr; d.z = Math.sin(a) * rr; }
      attr.setXYZ(i, d.x, d.y, d.z);
    });
    attr.needsUpdate = true;
    ripples.forEach((r) => { r.phase += dt * 0.6; if (r.phase > 1) r.phase -= 1; const sc = 0.3 + r.phase * 3.2; r.mesh.scale.set(sc, sc, sc); r.mesh.material.opacity = 0.5 * (1 - r.phase); });
  });
}
