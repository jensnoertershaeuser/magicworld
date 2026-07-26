import * as THREE from 'three';
import { heightAt } from '../world/ground.js';
import { makeLabel } from '../ui/labels.js';
import { onUpdate } from '../engine/loop.js';
import { state } from '../state.js';
import { reserve } from '../world/occupancy.js';

const cSkin = new THREE.Color(0xffd8b0), cBurn = new THREE.Color(0xff2e1a);

// The Oberwichtel: a gnome who lies on a sun lounger, forgets his sun cream,
// and turns bright red - then recovers, on a loop.
export function addGnome(scene) {
  const lx = -30, lz = -10, baseY = heightAt(lx, lz);
  reserve(lx, lz, 4);            // his sunbathing spot stays sunny
  const spot = new THREE.Group(); spot.position.set(lx, baseY, lz); spot.rotation.y = 0.7; scene.add(spot);

  // Lounger
  const fabric = new THREE.MeshStandardMaterial({ color: 0xffcf3a, roughness: 0.7 });
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 2.6), fabric); bed.position.y = 0.5; bed.receiveShadow = true; spot.add(bed);
  for (let i = 0; i < 4; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.13, 0.28), new THREE.MeshStandardMaterial({ color: 0xff8a3a, roughness: 0.7 })); st.position.set(0, 0.5, -1.0 + i * 0.6); spot.add(st); }
  const hrest = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.7), fabric); hrest.position.set(0, 0.62, 1.15); hrest.rotation.x = -0.4; spot.add(hrest);
  [[-0.6, -1.1], [0.6, -1.1], [-0.6, 1.1], [0.6, 1.1]].forEach((p) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0xcfd3da, metalness: 0.6, roughness: 0.4 })); l.position.set(p[0], 0.25, p[1]); spot.add(l); });

  // Gnome, lying supine (head +Z, face up)
  const gnome = new THREE.Group();
  const skin = [];
  const mkSkin = () => { const m = new THREE.MeshStandardMaterial({ color: 0xffd8b0, roughness: 0.7 }); skin.push(m); return m; };
  const tunic = new THREE.MeshStandardMaterial({ color: 0x2f7d5b, roughness: 0.8 });
  const hatMat = new THREE.MeshStandardMaterial({ color: 0xd83a2a, roughness: 0.7 });
  const beardMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.85 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x4a3826, roughness: 0.8 });

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.32, 0.9, 14), tunic); torso.rotation.x = Math.PI / 2; torso.position.set(0, 0.34, 0); torso.castShadow = true; gnome.add(torso);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), tunic); belly.scale.set(1, 0.8, 1); belly.position.set(0, 0.42, -0.05); gnome.add(belly);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 16), mkSkin()); head.position.set(0, 0.4, 0.75); head.castShadow = true; gnome.add(head);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), mkSkin()); nose.position.set(0, 0.52, 1.0); gnome.add(nose);
  [-0.11, 0.11].forEach((x) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), new THREE.MeshStandardMaterial({ color: 0x222222 })); e.position.set(x, 0.56, 0.92); gnome.add(e); });
  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.29, 0.75, 12), beardMat); beard.rotation.x = -Math.PI / 2 + 0.35; beard.position.set(0, 0.44, 0.5); beard.scale.set(1, 1, 0.7); gnome.add(beard);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.33, 0.95, 14), hatMat); hat.position.set(0, 0.64, 0.55); hat.rotation.x = 0.55; hat.castShadow = true; gnome.add(hat);
  const hatRim = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.06, 8, 18), hatMat); hatRim.rotation.x = Math.PI / 2; hatRim.position.set(0, 0.52, 0.72); gnome.add(hatRim);
  [-1, 1].forEach((s) => { const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.6, 10), tunic); arm.rotation.x = Math.PI / 2; arm.position.set(s * 0.42, 0.32, -0.05); arm.castShadow = true; gnome.add(arm); const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), mkSkin()); hand.position.set(s * 0.42, 0.32, 0.26); gnome.add(hand); });
  [-1, 1].forEach((s) => { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.11, 0.55, 10), tunic); leg.rotation.x = Math.PI / 2; leg.position.set(s * 0.15, 0.3, -0.62); gnome.add(leg); const boot = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), bootMat); boot.scale.set(1, 0.8, 1.3); boot.position.set(s * 0.15, 0.26, -0.98); gnome.add(boot); });
  gnome.position.set(0, 0.56, 0); spot.add(gnome);

  // Forgotten sun cream
  const bottle = new THREE.Group();
  const bottleBody = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.4, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }));
  bottleBody.position.set(0, 0.2, 0); bottle.add(bottleBody);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 12), new THREE.MeshStandardMaterial({ color: 0xff5aa0, roughness: 0.5 })); cap.position.y = 0.46; bottle.add(cap);
  bottle.position.set(1.05, 0, -0.5); spot.add(bottle);

  const name = makeLabel('Oberwichtel', '#ffcf3a'); name.scale.set(4.6, 1, 1); name.position.set(0, 2.3, 0); gnome.add(name);
  const ouch = makeLabel('Autsch!', '#ff5030'); ouch.position.set(0, 2.5, 0.4); ouch.visible = false; gnome.add(ouch);

  let t = 0;
  onUpdate((dt, time) => {
    if (state.paused) return;
    const D1 = 9, D2 = 3, D3 = 2; t += dt; if (t > D1 + D2 + D3) t = 0;
    let red = 0, burning = false, wobble = 0, bounce = 0;
    if (t < D1) red = (t / D1) * 0.9;
    else if (t < D1 + D2) { red = 1.0; burning = true; wobble = Math.sin(time * 22) * 0.09; bounce = Math.abs(Math.sin(time * 9)) * 0.12; }
    else red = 0.9 * (1 - (t - D1 - D2) / D3);
    skin.forEach((m) => m.color.copy(cSkin).lerp(cBurn, red));
    ouch.visible = burning && state.labels;
    gnome.rotation.z = wobble;
    gnome.position.y = 0.56 + bounce;
  });
}
