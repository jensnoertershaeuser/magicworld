import * as THREE from 'three';
import { heightAt } from '../world/ground.js';
import { makeLabel } from '../ui/labels.js';
import { onUpdate } from '../engine/loop.js';
import { state } from '../state.js';
import { reserve } from '../world/occupancy.js';

const V = new THREE.Vector3();

export function addPool(scene, camera, dom) {
  const px = -24, pz = -12, baseY = heightAt(px, pz);
  reserve(px, pz, 8);            // 8x6 basin + diving board + ladder
  const g = new THREE.Group(); g.position.set(px, baseY, pz); scene.add(g);

  const W = 8, Dp = 6, wallH = 1.4, th = 0.3;
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xeef3f7, roughness: 0.7 });
  const innerMat = new THREE.MeshStandardMaterial({ color: 0x7fc7ff, roughness: 0.4 });
  const copeMat = new THREE.MeshStandardMaterial({ color: 0xbfe0ff, roughness: 0.6 });
  const mkWall = (w, h, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat); m.position.set(x, h / 2, z); m.castShadow = true; m.receiveShadow = true; g.add(m); };
  mkWall(W, wallH, th, 0, -Dp / 2); mkWall(W, wallH, th, 0, Dp / 2); mkWall(th, wallH, Dp, -W / 2, 0); mkWall(th, wallH, Dp, W / 2, 0);
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(W - th, 0.2, Dp - th), innerMat); bottom.position.y = 0.1; bottom.receiveShadow = true; g.add(bottom);
  [[W + 0.4, -Dp / 2], [W + 0.4, Dp / 2]].forEach((p) => { const c = new THREE.Mesh(new THREE.BoxGeometry(p[0], 0.14, th + 0.35), copeMat); c.position.set(0, wallH, p[1]); g.add(c); });
  [-W / 2, W / 2].forEach((x) => { const c = new THREE.Mesh(new THREE.BoxGeometry(th + 0.35, 0.14, Dp + 0.4), copeMat); c.position.set(x, wallH, 0); g.add(c); });

  const waterGeo = new THREE.PlaneGeometry(W - 0.5, Dp - 0.5, 20, 16); waterGeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeo, new THREE.MeshStandardMaterial({ color: 0x2fa8e0, transparent: true, opacity: 0.82, roughness: 0.12, metalness: 0.35 }));
  water.position.y = wallH - 0.35; g.add(water);
  const waterBase = new Float32Array(waterGeo.attributes.position.array);
  const waterY = baseY + wallH - 0.35;

  const board = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 2.6), new THREE.MeshStandardMaterial({ color: 0xffe066, roughness: 0.6 })); board.position.set(0, wallH + 0.7, Dp / 2 - 0.3); board.castShadow = true; g.add(board);
  [-0.35, 0.35].forEach((o) => { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, wallH + 0.7, 8), new THREE.MeshStandardMaterial({ color: 0xcfd3da, metalness: 0.6, roughness: 0.4 })); post.position.set(o, (wallH + 0.7) / 2, Dp / 2 + 0.6); g.add(post); });
  [-0.25, 0.25].forEach((o) => { const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, wallH + 0.6, 8), new THREE.MeshStandardMaterial({ color: 0xcfd3da, metalness: 0.6, roughness: 0.4 })); rail.position.set(-W / 2 - 0.35, (wallH + 0.6) / 2, o); g.add(rail); });
  for (let i = 0; i < 3; i++) { const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8), new THREE.MeshStandardMaterial({ color: 0xcfd3da, metalness: 0.6, roughness: 0.4 })); rung.rotation.x = Math.PI / 2; rung.position.set(-W / 2 - 0.35, 0.5 + i * 0.45, 0); g.add(rung); }

  // swimmer
  const jumper = new THREE.Group(); scene.add(jumper);
  const skin = new THREE.MeshStandardMaterial({ color: 0xffd8b0, roughness: 0.7 });
  const suit = new THREE.MeshStandardMaterial({ color: 0x1f6fd0, roughness: 0.7 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.8 });
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.7, 10), suit); torso.position.y = 0.9; jumper.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), skin); head.position.y = 1.4; jumper.add(head);
  const hcap = new THREE.Mesh(new THREE.SphereGeometry(0.235, 14, 10, 0, 6.28, 0, 2.0), hair); hcap.position.y = 1.44; jumper.add(hcap);
  [-1, 1].forEach((d) => { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.6, 8), skin); a.position.set(d * 0.3, 0.95, 0); a.rotation.z = d * 0.3; jumper.add(a); });
  [-1, 1].forEach((d) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.6, 8), skin); l.position.set(d * 0.12, 0.3, 0); jumper.add(l); });
  jumper.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  const boardPos = new THREE.Vector3(px, baseY + wallH + 0.78, pz + (Dp / 2 - 1.4));
  const poolCenter = new THREE.Vector3(px, baseY + wallH - 0.2, pz);
  jumper.position.copy(boardPos);
  const jump = { state: 'idle', t: 0 };

  const splashes = [];
  function splash(pos) {
    const N = 46, arr = new Float32Array(N * 3), data = [];
    for (let i = 0; i < N; i++) { arr[i * 3] = pos.x; arr[i * 3 + 1] = pos.y; arr[i * 3 + 2] = pos.z; const a = Math.random() * Math.PI * 2, sp = 0.8 + Math.random() * 1.6; data.push({ x: pos.x, y: pos.y, z: pos.z, vx: Math.cos(a) * sp, vy: 2.6 + Math.random() * 2.6, vz: Math.sin(a) * sp }); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xcdeeff, size: 0.18, transparent: true, opacity: 0.95, depthWrite: false })); scene.add(pts);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.42, 28), new THREE.MeshBasicMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.set(pos.x, waterY + 0.04, pos.z); scene.add(ring);
    splashes.push({ pts, data, ring, life: 0, ttl: 1.2 });
  }

  function triggerJump() { if (jump.state === 'idle') { jump.state = 'dive'; jump.t = 0; } }

  const label = makeLabel('Pool', '#7fc7ff'); label.position.set(px, baseY + wallH + 3.0, pz); scene.add(label);

  // click on the pool to jump (ignore drags)
  let dx = 0, dy = 0;
  dom.addEventListener('pointerdown', (e) => { dx = e.clientX; dy = e.clientY; });
  dom.addEventListener('pointerup', (e) => {
    if (Math.hypot(e.clientX - dx, e.clientY - dy) < 6) {
      const rc = new THREE.Raycaster();
      rc.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
      if (rc.intersectObject(g, true).length) triggerJump();
    }
  });

  onUpdate((dt, t) => {
    if (state.paused) return;
    // waves
    const p = water.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = waterBase[i * 3], z = waterBase[i * 3 + 2]; p.setY(i, Math.sin(x * 1.5 + t * 2.0) * 0.06 + Math.cos(z * 1.8 + t * 1.6) * 0.05); }
    p.needsUpdate = true;
    // jumper state machine
    if (jump.state === 'idle') { jumper.position.copy(boardPos); jumper.position.y = boardPos.y + Math.sin(t * 2) * 0.03; jumper.rotation.x = 0; }
    else if (jump.state === 'dive') {
      jump.t += dt; const pr = jump.t / 0.9;
      if (pr >= 1) { splash(poolCenter); jump.state = 'under'; jump.t = 0; jumper.visible = false; }
      else { jumper.visible = true; jumper.position.set(THREE.MathUtils.lerp(boardPos.x, poolCenter.x, pr), THREE.MathUtils.lerp(boardPos.y, poolCenter.y, pr) + Math.sin(Math.PI * pr) * 2.4, THREE.MathUtils.lerp(boardPos.z, poolCenter.z, pr)); jumper.rotation.x = pr * Math.PI * 2.5; }
    } else if (jump.state === 'under') { jump.t += dt; if (jump.t > 1.4) { jump.state = 'idle'; jumper.visible = true; jumper.rotation.x = 0; jumper.position.copy(boardPos); } }
    // splashes
    for (let i = splashes.length - 1; i >= 0; i--) {
      const s = splashes[i]; s.life += dt; const attr = s.pts.geometry.attributes.position;
      s.data.forEach((d, j) => { d.vy -= 9.8 * dt * 0.6; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt; attr.setXYZ(j, d.x, d.y, d.z); });
      attr.needsUpdate = true; s.pts.material.opacity = Math.max(0, 0.95 * (1 - s.life / s.ttl));
      const rp = s.life / s.ttl, sc = 1 + rp * 4; s.ring.scale.set(sc, sc, sc); s.ring.material.opacity = 0.7 * (1 - rp);
      if (s.life >= s.ttl) { scene.remove(s.pts); s.pts.geometry.dispose(); s.pts.material.dispose(); scene.remove(s.ring); s.ring.geometry.dispose(); s.ring.material.dispose(); splashes.splice(i, 1); }
    }
  });

  return { triggerJump };
}
