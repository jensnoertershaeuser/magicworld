import * as THREE from 'three';
import { heightAt } from '../world/ground.js';
import { onUpdate } from '../engine/loop.js';
import { state } from '../state.js';
import { makeLabel } from '../ui/labels.js';
import { onBeat } from '../audio/music.js';
import { spawnNote } from '../fx/floatingNotes.js';
import { reserve } from '../world/occupancy.js';

const V0 = new THREE.Vector3();

export function addRainbowUnicorn(scene) {
  const RB = { x: -6, z: -30 };
  // The unicorn gallops a circle of radius 13 under a 10-wide rainbow arch,
  // so the whole clearing has to stay open.
  reserve(RB.x, RB.z, 15);

  // Rainbow arch + clouds
  const g = new THREE.Group();
  g.position.set(RB.x, heightAt(RB.x, RB.z), RB.z);
  [0xff4d4d, 0xff9e2c, 0xffe066, 0x4fd76a, 0x4fa3ff, 0x6a5cff, 0xb06bff].forEach((c, i) => {
    const band = new THREE.Mesh(new THREE.TorusGeometry(10 - i * 0.42, 0.22, 10, 64, Math.PI), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.5, roughness: 0.5 }));
    g.add(band);
  });
  [-9.6, 9.6].forEach((x) => {
    const cloud = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const s = 1.1 + Math.random() * 0.8;
      const puff = new THREE.Mesh(new THREE.SphereGeometry(s, 12, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdddfff, emissiveIntensity: 0.2, roughness: 0.9 }));
      puff.position.set((Math.random() - 0.5) * 2.4, 0.4 + Math.random() * 0.6, (Math.random() - 0.5) * 1.2); puff.castShadow = true; cloud.add(puff);
    }
    cloud.position.set(x, 0.2, 0); g.add(cloud);
  });
  scene.add(g);

  // Unicorn
  const u = new THREE.Group(); scene.add(u);
  const pink = new THREE.MeshStandardMaterial({ color: 0xff9ecf, roughness: 0.4, metalness: 0.1, emissive: 0x5a1030, emissiveIntensity: 0.15 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffe066, metalness: 0.8, roughness: 0.25, emissive: 0x3a2e00, emissiveIntensity: 0.4 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a1020 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), pink); body.scale.set(0.6, 0.6, 1.05); body.position.y = 1.15; u.add(body);
  const legs = [];
  [[-0.38, 0.62, true], [0.38, 0.62, true], [-0.38, -0.6, false], [0.38, -0.6, false]].forEach((d) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.95, 10), pink);
    leg.geometry.translate(0, -0.475, 0); leg.position.set(d[0], 0.95, d[1]);
    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.15, 10), gold); hoof.position.set(0, -0.9, 0); leg.add(hoof);
    u.add(leg); legs.push({ mesh: leg, front: d[2] });
  });
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 1.1, 12), pink); neck.position.set(0, 1.75, 0.85); neck.rotation.x = -0.6; u.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 14), pink); head.scale.set(0.7, 0.7, 1.0); head.position.set(0, 2.25, 1.35); u.add(head);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), pink); muzzle.scale.set(0.7, 0.6, 0.9); muzzle.position.set(0, 2.12, 1.75); u.add(muzzle);
  [-0.18, 0.18].forEach((x) => { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 8), pink); ear.position.set(x, 2.55, 1.25); u.add(ear); });
  [-0.22, 0.22].forEach((x) => { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), dark); eye.position.set(x, 2.28, 1.62); u.add(eye); });
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7, 10), gold); horn.position.set(0, 2.78, 1.42); horn.rotation.x = 0.2; u.add(horn);
  const maneCols = [0xff4d4d, 0xff9e2c, 0xffe066, 0x4fd76a, 0x4fa3ff, 0xb06bff];
  const mane = [], tail = [];
  for (let i = 0; i < 6; i++) {
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 8), new THREE.MeshStandardMaterial({ color: maneCols[i % 6], emissive: maneCols[i % 6], emissiveIntensity: 0.25, roughness: 0.5 }));
    const f = i / 5; tuft.position.set(0, 2.5 - f * 0.9, 1.15 - f * 1.0); tuft.rotation.x = 1.2; u.add(tuft); mane.push(tuft);
  }
  for (let i = 0; i < 5; i++) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.16 - i * 0.02, 0.4, 8), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xff5fa2 : 0xff9ecf, roughness: 0.5 }));
    t.position.set(0, 1.3 - i * 0.18, -1.05 - i * 0.06); t.rotation.x = -0.6; u.add(t); tail.push(t);
  }
  // Glitter cloud
  const N = 90, arr = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { arr[i * 3] = (Math.random() - 0.5) * 1.8; arr[i * 3 + 1] = 0.6 + Math.random() * 2.2; arr[i * 3 + 2] = (Math.random() - 0.5) * 2.6; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  const glitter = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffd1ec, size: 0.14, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  u.add(glitter);
  u.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const label = makeLabel('Einhorn', '#ff9ecf'); label.position.set(0, 3.6, 0.2); u.add(label);

  // gallop path
  const way = [];
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; way.push(new THREE.Vector3(RB.x + Math.cos(a) * 13, 0, RB.z + Math.sin(a) * 13)); }
  const st = { wi: 0, t: Math.random(), speed: 3.4, sing: 0 };
  u.position.copy(way[0]);

  // sing along: sparkle + a note above the head
  onBeat(() => {
    st.sing = 1;
    spawnNote(V0.set(0, 3.1, 1.4).applyEuler(u.rotation).add(u.position), 1.4);
  });

  onUpdate((dt, t) => {
    if (!state.paused) {
      const from = way[st.wi], to = way[(st.wi + 1) % way.length];
      const seg = from.distanceTo(to);
      st.t += (st.speed * dt) / Math.max(seg, 0.01);
      if (st.t >= 1) { st.t -= 1; st.wi = (st.wi + 1) % way.length; }
      const p = V0.copy(from).lerp(to, st.t);
      u.position.set(p.x, heightAt(p.x, p.z) + Math.abs(Math.sin(t * st.speed * 2.4)) * 0.18, p.z);
      const dir = to.clone().sub(from).setY(0);
      if (dir.lengthSq() > 1e-4) u.rotation.y = Math.atan2(dir.x, dir.z);
      const gallop = Math.sin(t * st.speed * 3.4) * 0.7;
      legs.forEach((l) => (l.mesh.rotation.x = l.front ? gallop : -gallop));
      mane.forEach((m, i) => (m.rotation.z = Math.sin(t * 4 + i * 0.5) * 0.15));
      tail.forEach((tt, i) => (tt.rotation.z = Math.sin(t * 3 + i * 0.4) * 0.2));
    }
    st.sing = Math.max(0, st.sing - dt * 2.2);
    glitter.material.opacity = 0.5 + Math.abs(Math.sin(t * 6)) * 0.5;
    glitter.material.size = 0.14 + st.sing * 0.16;
    glitter.rotation.y += dt * 0.6;
  });
}
