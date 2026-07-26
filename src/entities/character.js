import * as THREE from 'three';
import { heightAt } from '../world/ground.js';
import { onUpdate } from '../engine/loop.js';
import { state } from '../state.js';
import { makeLabel } from '../ui/labels.js';

// Builds a character from primitives WITHOUT adding it to the scene or moving
// it. Returns handles (limbs + dimensions) so callers can walk it, seat it,
// or pose it however they like. This is the base every person is built from.
export function buildCharacter(opts) {
  const g = new THREE.Group();
  const H = opts.height;
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffd8b0, roughness: 0.7 });
  const shirt = new THREE.MeshStandardMaterial({ color: opts.shirt ?? 0x3b6ea5, roughness: 0.8 });
  const pants = new THREE.MeshStandardMaterial({ color: opts.pants ?? 0x2c3e50, roughness: 0.85 });
  const hairMat = new THREE.MeshStandardMaterial({ color: opts.hair ?? 0xe8c56a, roughness: 0.7 });

  const legH = H * 0.42, torsoH = H * 0.34, torsoW = H * 0.2, headR = H * 0.13, armH = H * 0.34;
  const legR = H * 0.05, armR = H * 0.038;

  const legL = new THREE.Mesh(new THREE.CylinderGeometry(legR, legR * 0.9, legH, 10), pants);
  const legR2 = legL.clone();
  legL.position.set(-torsoW * 0.28, legH / 2, 0);
  legR2.position.set(torsoW * 0.28, legH / 2, 0);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(torsoW * 0.42, torsoW * 0.5, torsoH, 12), shirt);
  torso.position.y = legH + torsoH / 2;
  const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(torsoW * 0.42, 12, 8), shirt);
  shoulderCap.position.y = legH + torsoH;

  const shoulderY = legH + torsoH - torsoW * 0.25;
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(armR, armR * 0.85, armH, 8), skinMat);
  const armR2 = armL.clone();
  armL.geometry.translate(0, -armH / 2, 0);
  armR2.geometry.translate(0, -armH / 2, 0);
  armL.position.set(-torsoW * 0.5, shoulderY, 0);
  armR2.position.set(torsoW * 0.5, shoulderY, 0);

  const headY = legH + torsoH + headR * 0.7;
  const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 16, 14), skinMat);
  head.position.y = headY;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.06, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMat);
  hair.position.y = headY + headR * 0.12;
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2a });
  [-1, 1].forEach((s) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.12, 8, 8), eyeMat);
    e.position.set(s * headR * 0.35, headY + headR * 0.05, headR * 0.88); g.add(e);
  });
  const smile = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.28, headR * 0.05, 6, 12, Math.PI), eyeMat);
  smile.rotation.x = Math.PI; smile.position.set(0, headY - headR * 0.28, headR * 0.86);

  g.add(legL, legR2, torso, shoulderCap, armL, armR2, head, hair, smile);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  if (opts.name) {
    const label = makeLabel(opts.name, opts.labelColor || '#fff');
    label.position.y = headY + headR + H * 0.22;
    g.add(label);
  }

  return { group: g, legL, legR: legR2, torso, armL, armR: armR2, head, dims: { legH, torsoH, armH, torsoW, headR, shoulderY, headY } };
}

// Build + add + walk a circular path. Respects the pause button.
export function addWalker(scene, opts) {
  const c = buildCharacter(opts);
  scene.add(c.group);
  const cx = opts.cx ?? 0, cz = opts.cz ?? 0, radius = opts.radius ?? 14, speed = opts.speed ?? 2.6;
  let angle = Math.random() * Math.PI * 2;
  onUpdate((dt, t) => {
    if (state.paused) return;
    angle += (speed * dt) / radius;
    const x = cx + Math.cos(angle) * radius, z = cz + Math.sin(angle) * radius;
    c.group.position.set(x, heightAt(x, z) + Math.abs(Math.sin(t * speed * 3.2)) * 0.05, z);
    c.group.rotation.y = Math.atan2(-Math.sin(angle), Math.cos(angle));
    const sw = Math.sin(t * speed * 3.2) * 0.6;
    c.legL.rotation.x = sw; c.legR.rotation.x = -sw;
    c.armL.rotation.x = -sw * 0.8; c.armR.rotation.x = sw * 0.8;
  });
  return c;
}

// Fold the legs forward at the hip so a character can sit on a stool/bench.
export function poseSeated(c) {
  const d = c.dims;
  c.legL.geometry.translate(0, -d.legH / 2, 0); // legs share geometry; translate once
  c.legL.position.y = d.legH; c.legR.position.y = d.legH;
  c.legL.rotation.x = -1.25; c.legR.rotation.x = -1.25;
  c.armL.rotation.x = -1.1; c.armR.rotation.x = -1.1;
  c.armBaseX = -1.1;
}
