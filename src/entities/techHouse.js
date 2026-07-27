import * as THREE from 'three';
import { heightAt } from '../world/ground.js';
import { onUpdate } from '../engine/loop.js';
import { state } from '../state.js';
import { makeLabel } from '../ui/labels.js';
import { buildCharacter, poseSeated } from './character.js';
import { makeRobot, makeSup } from './machines.js';
import { POOL, POOL_WATER_Y } from './pool.js';
import { reserve } from '../world/occupancy.js';

// Returns { follow, toggleBuild }: the Balthasar group for the camera to follow,
// and the menu hook that switches what he and Opa Klaus are building.
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

  // The other thing they can build: a half-finished SUP clamped on the bench.
  // Only one of the two mock-ups is ever visible — see syncBench() below.
  const miniSup = new THREE.Group(); miniSup.position.set(0.2, 1.16, -0.3); miniSup.rotation.set(0, 0.45, 0.08); g.add(miniSup);
  const mHull = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.66, 4, 10), new THREE.MeshStandardMaterial({ color: 0xffe066, roughness: 0.5 }));
  mHull.rotation.x = Math.PI / 2;
  const mBoard = new THREE.Group(); mBoard.add(mHull); mBoard.scale.y = 0.34; miniSup.add(mBoard);
  const mPad = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.5), new THREE.MeshStandardMaterial({ color: 0x3a3550, roughness: 0.9 })); mPad.position.y = 0.06; miniSup.add(mPad);
  const mPaddle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6), new THREE.MeshStandardMaterial({ color: 0xcfd3da, metalness: 0.6, roughness: 0.4 })); mPaddle.position.set(0.26, 0.36, 0.1); mPaddle.rotation.z = 0.35; miniSup.add(mPaddle);
  const mLed = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshStandardMaterial({ color: 0x5ff0d0, emissive: 0x5ff0d0, emissiveIntensity: 1.1, roughness: 0.3 })); mLed.position.set(0, 0.08, 0.4); miniSup.add(mLed); leds.push(mLed);
  miniSup.traverse((o) => { if (o.isMesh) o.castShadow = true; });

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

  // --- The build project ---------------------------------------------------
  // state.build (set from the menu) decides what the two of them are working on.
  // The bench shows a mock-up of it, and when the build is done the real thing
  // leaves the workshop: the robot walks off across the meadow, the SUP glides
  // over to the pool and paddles in circles there.
  const FIRST_SECS = 60;     // the first build is something to look forward to
  const AGAIN_SECS = 15;     // after a switch nobody wants to wait a full minute
  // The lap: small enough to stay off the pool walls, and pushed away from the
  // diving-board end, because the raised paddle would otherwise sweep straight
  // through the board.
  const SUP_R = 1.2;
  const SUP_CZ = POOL.z - 0.6;
  const SUP_FLOAT = POOL_WATER_Y + 0.06;

  const job = { kind: state.build, dueAt: FIRST_SECS, done: false, robot: null, sup: null };
  const walk = { path: null, idx: 0, moving: false };
  const sail = { phase: 'none', t: 0, yaw: 0, from: new THREE.Vector3(), to: new THREE.Vector3(POOL.x + SUP_R, SUP_FLOAT, SUP_CZ) };
  let now = 0;               // latest elapsed time, so toggleBuild() can schedule

  // One label, reused by every build — makeLabel() registers each sprite with
  // the "Schilder" button forever, so creating a fresh one per build would pile
  // them up.
  const fertig = makeLabel('Fertig!', '#8affa0');

  function L(lx, lz) { const v = new THREE.Vector3(lx, 0, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw); return new THREE.Vector3(hx + v.x, heightAt(hx + v.x, hz + v.z), hz + v.z); }
  const lerpAngle = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

  function syncBench() {
    miniBot.visible = !job.done && job.kind === 'robot';
    miniSup.visible = !job.done && job.kind === 'sup';
  }
  syncBench();

  function finishRobot() {
    const r = makeRobot(scene); r.g.position.copy(L(0.2, 0.8)); r.g.rotation.y = yaw;
    fertig.position.set(0, 3.4, 0); r.g.add(fertig);
    job.robot = r;
    walk.path = [L(0, 3), L(0, 7), L(0, 11), new THREE.Vector3(16, heightAt(16, 10), 10), new THREE.Vector3(4, heightAt(4, 3), 3)];
    walk.idx = 0; walk.moving = true;
  }

  function finishSup() {
    const s = makeSup(scene); s.g.position.copy(L(0.2, 1.4)); s.g.position.y += 0.9; s.g.rotation.y = yaw;
    fertig.position.set(0, 2.4, 0); s.g.add(fertig);
    job.sup = s;
    sail.from.copy(s.g.position); sail.phase = 'deliver'; sail.t = 0;
    // Heading for the flight over to the pool; the circle then takes over from
    // yaw 0, which is the tangent at the point the board is dropped in.
    sail.yaw = Math.atan2(sail.to.x - sail.from.x, sail.to.z - sail.from.z);
  }

  // Throw the current build away, geometry and all, so switching projects back
  // and forth doesn't slowly fill the world with abandoned robots and boards.
  function clearBuild() {
    [job.robot, job.sup].forEach((rig) => {
      if (!rig) return;
      // Rescue the shared label before the rig is disposed with it inside.
      if (fertig.parent === rig.g) rig.g.remove(fertig);
      rig.g.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
      scene.remove(rig.g);
    });
    job.robot = job.sup = null;
    walk.moving = false; sail.phase = 'none';
  }

  // Menu hook. Switching mid-project scraps whatever is standing around and
  // starts the other one — on the short countdown, because the whole point of
  // pressing the button is to see the other thing get built.
  function toggleBuild() {
    state.build = state.build === 'robot' ? 'sup' : 'robot';
    clearBuild();
    job.kind = state.build; job.done = false; job.dueAt = now + AGAIN_SECS;
    syncBench();
    return state.build;
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

    now = t;
    if (!job.done && t >= job.dueAt) {
      job.done = true;
      if (job.kind === 'sup') finishSup(); else finishRobot();
      syncBench();
    }

    if (walk.moving) {
      const r = job.robot, target = walk.path[walk.idx];
      const dir = target.clone().sub(r.g.position); dir.y = 0;
      if (dir.length() < 0.35) {
        walk.idx++;
        if (walk.idx >= walk.path.length) { walk.moving = false; r.legL.rotation.x = r.legR.rotation.x = 0; }
      } else {
        dir.normalize();
        r.g.position.addScaledVector(dir, 3.0 * dt); r.g.position.y = heightAt(r.g.position.x, r.g.position.z);
        r.g.rotation.y = Math.atan2(dir.x, dir.z);
        const sw = Math.sin(t * 8) * 0.5; r.legL.rotation.x = sw; r.legR.rotation.x = -sw; r.armL.rotation.x = -sw * 0.6; r.armR.rotation.x = sw * 0.6;
      }
    }

    if (sail.phase !== 'none') {
      const s = job.sup;
      if (sail.phase === 'deliver') {
        // A hover-flight across the meadow: the board can't walk, so it arcs
        // over the trees and settles onto the water.
        sail.t += dt; const p = Math.min(sail.t / 7, 1);
        const e = p * p * (3 - 2 * p);
        s.g.position.lerpVectors(sail.from, sail.to, e); s.g.position.y += Math.sin(Math.PI * e) * 5;
        s.g.rotation.set(0, lerpAngle(sail.yaw, 0, e), 0);
        s.paddle.rotation.x = -0.25;
        if (p >= 1) { sail.phase = 'circle'; sail.t = 0; }
      } else {
        // Round and round the pool, paddle stroking, bobbing on the waves.
        sail.t += dt; const a = sail.t * 0.5;
        s.g.position.set(POOL.x + Math.cos(a) * SUP_R, SUP_FLOAT + Math.sin(t * 1.6) * 0.05, SUP_CZ + Math.sin(a) * SUP_R);
        s.g.rotation.set(Math.sin(t * 1.6) * 0.04, -a, -0.1);
        s.paddle.rotation.x = -0.25 + Math.sin(t * 2.4) * 0.45;
        s.leds.forEach((l, i) => (l.material.emissiveIntensity = 0.5 + 0.8 * (0.5 + 0.5 * Math.sin(t * 5 + i * 2))));
      }
    }
  });

  return { follow: balthasar.group, toggleBuild };
}
