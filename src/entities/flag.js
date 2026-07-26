import * as THREE from 'three';
import { heightAt } from '../world/ground.js';
import { makeLabel } from '../ui/labels.js';
import { onUpdate } from '../engine/loop.js';
import { reserve } from '../world/occupancy.js';

export function addFlag(scene) {
  const px = 9, pz = -7;
  reserve(px, pz, 3.5);          // pole + room to see the cloth
  const g = new THREE.Group();
  g.position.set(px, heightAt(px, pz), pz); scene.add(g);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 8, 12), new THREE.MeshStandardMaterial({ color: 0xcfd3da, metalness: 0.7, roughness: 0.3 }));
  pole.position.y = 4; pole.castShadow = true; g.add(pole);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), new THREE.MeshStandardMaterial({ color: 0xffe066, metalness: 0.8, roughness: 0.3, emissive: 0x3a2e00, emissiveIntensity: 0.3 }));
  knob.position.y = 8.15; g.add(knob);

  const W = 4.2, H = 2.5;
  const geo = new THREE.PlaneGeometry(W, H, 28, 16); geo.translate(W / 2, 0, 0);
  const c = document.createElement('canvas'); c.width = 256; c.height = 152;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 256, 152);
  grad.addColorStop(0, '#1e73d6'); grad.addColorStop(0.5, '#1fa59a'); grad.addColorStop(1, '#2fbf5a');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 256, 152);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, 250, 146);
  (function star(cx, cy, spikes, outer, inner) {
    let rot = -Math.PI / 2; const step = Math.PI / spikes; ctx.beginPath(); ctx.moveTo(cx, cy - outer);
    for (let i = 0; i < spikes; i++) { ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer); rot += step; ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner); rot += step; }
    ctx.closePath();
  })(128, 78, 5, 28, 13);
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill();

  const cloth = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(c), side: THREE.DoubleSide, roughness: 0.7 }));
  cloth.position.set(0.06, 6.9, 0); cloth.castShadow = true; g.add(cloth);
  const base = new Float32Array(geo.attributes.position.array);

  const label = makeLabel('Fahne', '#2fbf5a'); label.position.set(2.1, 8.9, 0); g.add(label);

  onUpdate((dt, t) => {
    const pos = cloth.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1];
      const fx = x / W;
      const z = Math.sin(fx * 6.0 - t * 5.0) * 0.38 * fx + Math.sin(fx * 3.0 + y * 1.4 - t * 3.0) * 0.12 * fx;
      pos.setXYZ(i, x, y + Math.sin(fx * 4.0 - t * 4.0) * 0.05 * fx, z);
    }
    pos.needsUpdate = true;
    cloth.geometry.computeVertexNormals();
  });
}
