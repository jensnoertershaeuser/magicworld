import * as THREE from 'three';
import { heightAt } from '../world/ground.js';
import { onUpdate } from '../engine/loop.js';
import { state } from '../state.js';
import { makeLabel } from '../ui/labels.js';
import { buildCharacter, poseSeated } from './character.js';
import { makeRobot } from './machines.js';
import { reserve } from '../world/occupancy.js';

// Returns the Balthasar group so main.js can use it as the camera-follow target.
export function addTechHouse(scene) {
  const hx = 28, hz = 26, yaw = Math.atan2(-hx, -hz), baseY = heightAt(hx, hz);
  reserve(hx, hz, 9);            // 9x7 house + the yard Balthasar works in
  const g = new THREE.Group(); g.position.set(hx, baseY, hz); g.rotation.y = yaw; scene.add(g);

  const W = 9, D = 7, H = 4.2, t = 0.3;
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xeadfc8, roughness: 0.9 });
  const beamMat = new THREE.MeshStandardMaterial({ color: 0x7a4f2a, roughness: 0.85 });

  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.3, D), new THREE.MeshStandardMaterial({ color: 0x9a6b3f, roughness: 0.8 }));
  floor.position.y = 0.15; floor.receiveShadow = true; g.add(floor);
  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, t), wallMat); back.position.set(0, H / 2, -D / 2); back.castShadow = true; g.add(back);
  [-1, 1].forEach((s) => { const side = new THREE.Mesh(new THREE.BoxGeometry(t, H, D), wallMat); side.position.set(s * W / 2, H / 2, 0); side.castShadow = true; g.add(side); });
  [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]].forEach((p) => { const beam = new THREE.Mesh(new THREE.BoxGeometry(0.4, H + 0.5, 0.4), beamMat); beam.position.set(p[0], (H + 0.5) / 2, p[1]); beam.castShadow = true; g.add(beam); });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(W + 1.4, 0.4, D + 1.6), beamMat); roof.position.set(0, H + 0.55, 0.2); roof.castShadow = true; g.add(roof);
  const win = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24), new THREE.MeshStandardMaterial({ color: 0x6ee7ff, emissive: 0x6ee7ff, emissiveIntensity: 0.6, roughness: 0.3 })); win.position.set(-2.6, 2.7, -D / 2 + t / 2 + 0.02); g.add(win);

  // Workbench
  const topM = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.18, 1.5), new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.7 })); topM.position.set(0.1, 1.0, -0.3); topM.castShadow = true; g.add(topM);
  [[-1.5, -0.6], [1.5, -0.6], [-1.5, 0.6], [1.5, 0.6]].forEach((p) => { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.0, 8), new THREE.MeshStandardMaterial({ color: 0x4a3826, roughness: 0.8 })); leg.position.set(0.1 + p[0], 0.5, -0.3 + p[1]); g.add(leg); });

  const holos = [], leds = [], gears = [];
  const holo = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0), new THREE.MeshBasicMaterial({ color: 0x6ee7ff, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); holo.position.set(-0.6, 1.9, -0.3); g.add(holo); holos.push(holo);
  const holo2 = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), new THREE.MeshBasicMaterial({ color: 0xb06bff, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); holo2.position.set(1.0, 1.75, -0.3); holo2.rotation.y = -0.4; g.add(holo2); holos.push(holo2);

  const miniBot = new THREE.Group(); miniBot.position.set(0.2, 0, -0.3); g.add(miniBot);
  const bBody = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.4), new THREE.MeshStandardMaterial({ color: 0xb8c0cc, metalness: 0.8, roughness: 0.3 })); bBody.position.set(0, 1.4, 0); miniBot.add(bBody);
  const bHead = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.32), new THREE.MeshStandardMaterial({ color: 0xd08b4f, metalness: 0.7, roughness: 0.35 })); bHead.position.set(0, 1.85, 0); miniBot.add(bHead);
  const bEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshStandardMaterial({ color: 0x6ee7ff, emissive: 0x6ee7ff, emissiveIntensity: 1.4, roughness: 0.3 })); bEye.position.set(0, 1.87, 0.16); miniBot.add(bEye); leds.push(bEye);

  [0xff4d4d, 0x4fd76a, 0xffe066, 0x6ee7ff].forEach((c, i) => { const led = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6, roughness: 0.3 })); led.position.set(-1.3 + i * 0.35, 1.13, 0.15); g.add(led); leds.push(led); });
  [[-1.05, 0x6ee7ff], [-0.62, 0xffe066]].forEach((d2) => { const gr = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 12), new THREE.MeshStandardMaterial({ color: d2[1], metalness: 0.7, roughness: 0.4 })); gr.rotation.x = Math.PI / 2; gr.position.set(d2[0], 1.2, 0.4); g.add(gr); gears.push(gr); });

  // Seat Balthasar & Opa
  const seated = [];
  function seat(opts, lx, lz) {
    const c = buildCharacter(opts); poseSeated(c); scene.add(c.group);
    const legH = c.dims.legH;
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, legH, 12), new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.85 })); stool.position.set(lx, legH / 2, lz); stool.castShadow = true; g.add(stool);
    const v = new THREE.Vector3(lx, 0, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    c.group.position.set(hx + v.x, baseY, hz + v.z); c.group.rotation.y = yaw;
    seated.push({ c, off: Math.random() * 6.28, baseY });
    return c;
  }
  const balthasar = seat({ name: 'Balthasar', height: 1.07, hair: 0xe8c56a, shirt: 0x2fae6a, pants: 0x9a5b2f, labelColor: '#ffe066' }, -1.1, -1.7);
  seat({ name: 'Opa Klaus', height: 1.86, hair: 0x1a1a1a, shirt: 0x2f7d5b, pants: 0x394049, labelColor: '#9fe0c0' }, 1.3, -1.7);

  const label = makeLabel('Technik-Haus', '#ffd9a0'); label.scale.set(5.4, 1.1, 1); label.position.set(0, H + 1.7, 0); g.add(label);

  // Finished-robot event (once, after 60s of active time)
  const robotEvt = { spawned: false, robot: null, path: null, idx: 0, moving: false };
  function L(lx, lz) { const v = new THREE.Vector3(lx, 0, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw); return new THREE.Vector3(hx + v.x, heightAt(hx + v.x, hz + v.z), hz + v.z); }
  function spawnFinished() {
    const r = makeRobot(scene); r.g.position.copy(L(0.2, 0.8)); r.g.rotation.y = yaw;
    miniBot.visible = false;
    const lbl = makeLabel('Fertig!', '#8affa0'); lbl.position.set(0, 3.4, 0); r.g.add(lbl);
    robotEvt.robot = r; robotEvt.path = [L(0, 3), L(0, 7), L(0, 11), new THREE.Vector3(16, heightAt(16, 10), 10), new THREE.Vector3(4, heightAt(4, 3), 3)]; robotEvt.idx = 0; robotEvt.moving = true;
  }

  onUpdate((dt, t) => {
    if (state.paused) return;
    seated.forEach((s) => {
      const d = s.c;
      d.armR.rotation.x = d.armBaseX + Math.sin(t * 4 + s.off) * 0.35;
      d.armL.rotation.x = d.armBaseX + Math.sin(t * 4 + s.off + 1.6) * 0.30;
      d.group.position.y = s.baseY + Math.sin(t * 1.4 + s.off) * 0.015;
    });
    gears.forEach((gr, i) => (gr.rotation.z += dt * (1.2 + i * 0.4)));
    leds.forEach((l, i) => (l.material.emissiveIntensity = 0.3 + 0.9 * (0.5 + 0.5 * Math.sin(t * 4 + i * 1.3))));
    holos.forEach((h, i) => { h.material.opacity = 0.35 + 0.18 * Math.sin(t * 3 + i * 2); h.rotation.y += dt * 0.5; });

    if (!robotEvt.spawned && t >= 60) { robotEvt.spawned = true; spawnFinished(); }
    if (robotEvt.moving) {
      const r = robotEvt.robot, target = robotEvt.path[robotEvt.idx];
      const dir = target.clone().sub(r.g.position); dir.y = 0;
      if (dir.length() < 0.35) {
        robotEvt.idx++;
        if (robotEvt.idx >= robotEvt.path.length) { robotEvt.moving = false; r.legL.rotation.x = r.legR.rotation.x = 0; }
      } else {
        dir.normalize();
        r.g.position.addScaledVector(dir, 3.0 * dt); r.g.position.y = heightAt(r.g.position.x, r.g.position.z);
        r.g.rotation.y = Math.atan2(dir.x, dir.z);
        const sw = Math.sin(t * 8) * 0.5; r.legL.rotation.x = sw; r.legR.rotation.x = -sw; r.armL.rotation.x = -sw * 0.6; r.armR.rotation.x = sw * 0.6;
      }
    }
  });

  return balthasar.group;
}
