import * as THREE from 'three';
import { heightAt } from '../world/ground.js';
import { onUpdate } from '../engine/loop.js';

// A minimal character built from primitives, with a walk cycle. This shows the
// pattern every new "thing" in the world should follow:
//
//   1. build a THREE.Group
//   2. add it to the scene
//   3. call onUpdate(...) to animate itself
//
// Nothing central needs editing to add a new character/creature/machine. That
// is what keeps the project easy to grow with a lot of features.

export function addCharacter(scene, opts) {
  const g = new THREE.Group();
  const H = opts.height ?? 1.8;
  const skin = new THREE.MeshStandardMaterial({ color: 0xffd8b0, roughness: 0.7 });
  const shirt = new THREE.MeshStandardMaterial({ color: opts.shirt ?? 0x3b6ea5, roughness: 0.8 });
  const pants = new THREE.MeshStandardMaterial({ color: opts.pants ?? 0x2c3e50, roughness: 0.85 });
  const hair = new THREE.MeshStandardMaterial({ color: opts.hair ?? 0xe8c56a, roughness: 0.7 });

  const legH = H * 0.42, torsoH = H * 0.34, torsoW = H * 0.2, headR = H * 0.13, armH = H * 0.34;

  const legL = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.05, H * 0.045, legH, 8), pants);
  const legR = legL.clone();
  legL.position.set(-torsoW * 0.28, legH / 2, 0);
  legR.position.set(torsoW * 0.28, legH / 2, 0);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(torsoW * 0.42, torsoW * 0.5, torsoH, 12), shirt);
  torso.position.y = legH + torsoH / 2;

  const armL = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.038, H * 0.032, armH, 8), skin);
  const armR = armL.clone();
  armL.geometry.translate(0, -armH / 2, 0);
  armR.geometry.translate(0, -armH / 2, 0);
  const shoulderY = legH + torsoH - torsoW * 0.25;
  armL.position.set(-torsoW * 0.5, shoulderY, 0);
  armR.position.set(torsoW * 0.5, shoulderY, 0);

  const headY = legH + torsoH + headR * 0.7;
  const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 16, 14), skin);
  head.position.y = headY;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.06, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), hair);
  cap.position.y = headY + headR * 0.12;

  g.add(legL, legR, torso, armL, armR, head, cap);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(g);

  // walk a circular path
  const cx = opts.cx ?? 0, cz = opts.cz ?? 0, radius = opts.radius ?? 14, speed = opts.speed ?? 2.6;
  let angle = Math.random() * Math.PI * 2;

  onUpdate((dt, t) => {
    angle += (speed * dt) / radius;
    const x = cx + Math.cos(angle) * radius;
    const z = cz + Math.sin(angle) * radius;
    g.position.set(x, heightAt(x, z) + Math.abs(Math.sin(t * speed * 3.2)) * 0.05, z);
    // face travel direction (tangent to the circle)
    g.rotation.y = Math.atan2(-Math.sin(angle), -Math.cos(angle)) + Math.PI / 2;
    const swing = Math.sin(t * speed * 3.2) * 0.6;
    legL.rotation.x = swing; legR.rotation.x = -swing;
    armL.rotation.x = -swing * 0.8; armR.rotation.x = swing * 0.8;
  });

  return g;
}
