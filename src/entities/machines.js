import * as THREE from 'three';
import { heightAt } from '../world/ground.js';
import { onUpdate } from '../engine/loop.js';
import { state } from '../state.js';

const V0 = new THREE.Vector3();

// A little walking robot rig. Exported so the tech-house "finished robot"
// event can reuse it. Returns { g, legL, legR, armL, armR }.
export function makeRobot(scene) {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0xb8c0cc, metalness: 0.85, roughness: 0.3 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xd08b4f, metalness: 0.8, roughness: 0.35 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, 0.9), metal); body.position.y = 1.4; g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.8), accent); head.position.y = 2.35; g.add(head);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), new THREE.MeshStandardMaterial({ color: 0x6ee7ff, emissive: 0x6ee7ff, emissiveIntensity: 1.5 }));
  eye.position.set(0, 2.4, 0.42); g.add(eye);
  const antBall = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshStandardMaterial({ color: 0xff6ec7, emissive: 0xff6ec7, emissiveIntensity: 1.2 }));
  antBall.position.y = 3.15; g.add(antBall);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.3), metal); legL.position.set(-0.3, 0.45, 0); g.add(legL);
  const legR = legL.clone(); legR.position.x = 0.3; g.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.9, 0.22), accent); armL.geometry.translate(0, -0.45, 0); armL.position.set(-0.66, 1.9, 0); g.add(armL);
  const armR = armL.clone(); armR.position.x = 0.66; g.add(armR);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(g);
  return { g, legL, legR, armL, armR };
}

function ring(cx, cz, r, n, phase) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2;
    pts.push(new THREE.Vector3(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r));
  }
  return pts;
}

export function addMachines(scene) {
  // Central magic reactor with rotating rings + glowing core
  const reactor = new THREE.Group();
  reactor.position.set(0, heightAt(0, 0), 0);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4, 2, 20), new THREE.MeshStandardMaterial({ color: 0x3a3550, metalness: 0.7, roughness: 0.35 }));
  base.position.y = 1; reactor.add(base);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 5, 16), new THREE.MeshStandardMaterial({ color: 0xd08b4f, metalness: 0.85, roughness: 0.3 }));
  col.position.y = 4.2; reactor.add(col);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 1), new THREE.MeshStandardMaterial({ color: 0x6ee7ff, emissive: 0x6ee7ff, emissiveIntensity: 1.4, roughness: 0.2 }));
  core.position.y = 7.5; reactor.add(core);
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const rg = new THREE.Mesh(new THREE.TorusGeometry(2.4 - i * 0.1, 0.14, 8, 40), new THREE.MeshStandardMaterial({ color: 0xffe066, emissive: 0x7a5a10, metalness: 0.6, roughness: 0.4 }));
    rg.position.y = 7.5; rg.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    rg.userData = { ax: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(), sp: 0.6 + i * 0.4 };
    reactor.add(rg); rings.push(rg);
  }
  reactor.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(reactor);

  // Gears
  function gear(x, z, r, teeth, color) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.8, roughness: 0.35 });
    const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.5, 24), mat); b.rotation.x = Math.PI / 2; g.add(b);
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.4), mat); t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); g.add(t);
    }
    g.position.set(x, heightAt(x, z) + r + 0.6, z);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(g); return g;
  }
  const gearA = gear(22, 18, 2.2, 12, 0xd08b4f);
  const gearB = gear(26.4, 18, 1.6, 9, 0xb06bff);

  // Patrolling robot
  const robot = makeRobot(scene);
  const rWay = ring(0, 0, 20, 10, 0.3);
  const rState = { wi: 0, t: 0 };

  // Turbine
  const turbine = new THREE.Group();
  const tx = -30, tz = 14;
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.7, 9, 12), new THREE.MeshStandardMaterial({ color: 0xe8e0d0, metalness: 0.4, roughness: 0.5 }));
  tower.position.y = 4.5; turbine.add(tower);
  const hub = new THREE.Group(); hub.position.y = 9;
  hub.add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), new THREE.MeshStandardMaterial({ color: 0xd08b4f, metalness: 0.8, roughness: 0.3 })));
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.6, 0.7), new THREE.MeshStandardMaterial({ color: 0x6ee7ff, emissive: 0x184a55, metalness: 0.3, roughness: 0.4, transparent: true, opacity: 0.92 }));
    blade.geometry.translate(0, 1.8, 0); blade.rotation.z = (i / 3) * Math.PI * 2; hub.add(blade);
  }
  turbine.add(hub); turbine.position.set(tx, heightAt(tx, tz), tz);
  turbine.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(turbine);

  // Floating island with portal
  const island = new THREE.Group();
  const ix = 28, iy = 12, iz = -24;
  const rock = new THREE.Mesh(new THREE.ConeGeometry(4, 5, 8), new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.9, flatShading: true }));
  rock.rotation.x = Math.PI; rock.position.y = -2.5; island.add(rock);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(4, 3.6, 1.4, 10), new THREE.MeshStandardMaterial({ color: 0x3fbf8f, roughness: 0.85, flatShading: true })); island.add(top);
  const portal = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.3, 12, 32), new THREE.MeshStandardMaterial({ color: 0xb06bff, emissive: 0xb06bff, emissiveIntensity: 1.2, roughness: 0.3 }));
  portal.position.y = 2.4; island.add(portal);
  island.position.set(ix, iy, iz); scene.add(island);

  // Drones (emissive, no lights)
  const drones = [];
  function drone(x, y, z, color) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), new THREE.MeshStandardMaterial({ color: 0x3a3550, metalness: 0.7, roughness: 0.3 })));
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.6 })); glow.position.z = 0.42; g.add(glow);
    const rotors = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.06), new THREE.MeshStandardMaterial({ color: 0xb8c0cc }));
      arm.position.set(Math.cos(a) * 0.55, 0.1, Math.sin(a) * 0.55); g.add(arm);
      const rot = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.1), new THREE.MeshStandardMaterial({ color: 0x6ee7ff, transparent: true, opacity: 0.7 }));
      rot.position.set(Math.cos(a) * 0.55, 0.15, Math.sin(a) * 0.55); g.add(rot); rotors.push(rot);
    }
    g.position.set(x, y, z); scene.add(g);
    drones.push({ g, rotors, baseY: y, off: Math.random() * 6.28, cx: x, cz: z, r: 2 + Math.random() * 3 });
  }
  drone(-12, 8, 10, 0xff6ec7); drone(14, 9, -8, 0xffe066); drone(-4, 10, -18, 0x5ff0d0);

  onUpdate((dt, t) => {
    if (state.paused) return;
    core.rotation.y += dt * 0.6; core.rotation.x += dt * 0.3;
    rings.forEach((rg) => rg.rotateOnAxis(rg.userData.ax, dt * rg.userData.sp));
    gearA.rotation.z += dt * 0.8; gearB.rotation.z -= dt * 0.8 * (2.2 / 1.6);
    hub.rotation.z += dt * 1.2;
    island.position.y = iy + Math.sin(t * 0.6) * 0.5; portal.rotation.z += dt * 0.5;

    // robot patrol
    const from = rWay[rState.wi], to = rWay[(rState.wi + 1) % rWay.length];
    const seg = from.distanceTo(to);
    rState.t += (2.2 * dt) / Math.max(seg, 0.01);
    if (rState.t >= 1) { rState.t -= 1; rState.wi = (rState.wi + 1) % rWay.length; }
    const p = V0.copy(from).lerp(to, rState.t); p.y = heightAt(p.x, p.z);
    robot.g.position.copy(p);
    const dir = to.clone().sub(from).setY(0);
    if (dir.lengthSq() > 1e-4) robot.g.rotation.y = Math.atan2(dir.x, dir.z);
    const sw = Math.sin(t * 7) * 0.5;
    robot.legL.rotation.x = sw; robot.legR.rotation.x = -sw; robot.armL.rotation.x = -sw * 0.6; robot.armR.rotation.x = sw * 0.6;

    drones.forEach((d) => {
      const a = t * 0.4 + d.off;
      d.g.position.set(d.cx + Math.cos(a) * d.r, d.baseY + Math.sin(t * 1.5 + d.off) * 0.6, d.cz + Math.sin(a) * d.r);
      d.g.rotation.y = a + Math.PI / 2;
      d.rotors.forEach((r) => (r.rotation.y += dt * 30));
    });
  });
}
