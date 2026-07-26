import * as THREE from 'three';
import { heightAt } from '../world/ground.js';
import { makeLabel } from '../ui/labels.js';
import { onBeat } from '../audio/music.js';
import { spawnNote } from '../fx/floatingNotes.js';
import { reserve } from '../world/occupancy.js';

export function addPiano(scene) {
  const px = -14, pz = 20;
  reserve(px, pz, 4);            // keep the forest off the piano
  const g = new THREE.Group();
  g.position.set(px, heightAt(px, pz), pz); g.rotation.y = -0.5; scene.add(g);

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x160b24, metalness: 0.55, roughness: 0.22 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xffe066, metalness: 0.85, roughness: 0.3, emissive: 0x3a2e00, emissiveIntensity: 0.4 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x0e0718, metalness: 0.5, roughness: 0.35 });

  const shape = new THREE.Shape();
  shape.moveTo(-2.6, -1.1); shape.lineTo(1.0, -1.1);
  shape.bezierCurveTo(3.1, -1.1, 3.6, 1.0, 1.9, 1.9);
  shape.bezierCurveTo(0.5, 2.6, -1.3, 1.8, -2.6, 1.8);
  shape.lineTo(-2.6, -1.1);
  const caseGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.42, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2 });
  const body = new THREE.Mesh(caseGeo, bodyMat); body.rotation.x = -Math.PI / 2; body.position.y = 1.05; body.castShadow = true; g.add(body);

  const lid = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false }), bodyMat);
  lid.position.set(0, 1.5, 0); lid.rotation.x = -Math.PI / 2 + 0.32; g.add(lid);
  const prop = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 8), goldMat); prop.position.set(1.4, 1.35, 1.3); prop.rotation.z = 0.25; g.add(prop);

  [[-2.3, -0.8], [1.9, -0.8], [0.2, 1.5]].forEach((p) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.05, 10), legMat); leg.position.set(p[0], 0.52, p[1]); leg.castShadow = true; g.add(leg);
  });

  const ledge = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.18, 0.5), goldMat); ledge.position.set(-0.8, 1.16, 1.35); g.add(ledge);
  const nook = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 0.42), new THREE.MeshStandardMaterial({ color: 0x05030a, roughness: 0.6 })); nook.position.set(-0.8, 1.24, 1.36); g.add(nook);
  // invisible keys (they exist but aren't drawn)
  for (let i = 0; i < 24; i++) {
    const key = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.34), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    key.position.set(-0.8 - 1.5 + i * 0.13, 1.28, 1.36); key.visible = false; g.add(key);
  }

  const label = makeLabel('Klavier', '#ffe066'); label.position.set(-0.6, 3.0, 0.4); g.add(label);

  // notes rise from the keyboard on every beat
  const origin = new THREE.Vector3(-0.8, 1.4, 1.35).applyEuler(g.rotation).add(g.position);
  onBeat(() => spawnNote(origin));
}
