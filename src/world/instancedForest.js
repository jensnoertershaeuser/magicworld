import * as THREE from 'three';
import { heightAt } from './ground.js';
import { isFree } from './occupancy.js';

// THE scalability technique, in one file.
//
// The prototype created one THREE.Mesh per tree. 400 trees = 400 draw calls =
// slow. Here, ALL trunks share one InstancedMesh and ALL canopies share
// another. That is 2 draw calls total for the whole forest, no matter how many
// trees. This is how you get to "10x" and beyond: instance anything repeated
// (trees, crystals, mushrooms, rocks, grass).
//
// Per-tree variety (position, size, rotation, colour) comes from per-instance
// matrices and per-instance colours, so they still all look different.

export function addForest(scene, count = 400) {
  const trunkGeo = new THREE.CylinderGeometry(0.28, 0.5, 2.2, 6);
  trunkGeo.translate(0, 1.1, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
  trunks.castShadow = true;

  const leafGeo = new THREE.IcosahedronGeometry(1.5, 0);
  const leafMat = new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true, vertexColors: false });
  const canopies = new THREE.InstancedMesh(leafGeo, leafMat, count);
  canopies.castShadow = true;

  const canopyColors = [0x2f9e6a, 0x3fbf8f, 0x5ff0d0, 0x2f9e5a, 0x49c97a];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const color = new THREE.Color();

  // A tree's canopy is 1.5 wide at scale 1 and scales up to 1.4, so ~2.1.
  // The extra bit is breathing room, so nothing is planted flush against a
  // wall either. Everything else that owns ground registers its own zone —
  // see world/occupancy.js.
  const TREE_CLEARANCE = 2.6;

  let placed = 0, tries = 0;
  while (placed < count && tries < count * 12) {
    tries++;
    const a = Math.random() * Math.PI * 2;
    const d = 16 + Math.random() * 66;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (!isFree(x, z, TREE_CLEARANCE)) continue;

    const scale = 0.6 + Math.random() * 0.8;
    const y = heightAt(x, z);

    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);

    // trunk
    p.set(x, y, z); s.set(scale, scale, scale);
    m.compose(p, q, s);
    trunks.setMatrixAt(placed, m);

    // canopy (sits above the trunk, slightly randomised height)
    p.set(x, y + (2.2 + Math.random() * 0.8) * scale, z);
    s.set(scale, scale, scale);
    m.compose(p, q, s);
    canopies.setMatrixAt(placed, m);
    color.set(canopyColors[Math.floor(Math.random() * canopyColors.length)]);
    canopies.setColorAt(placed, color);

    placed++;
  }
  trunks.count = placed;
  canopies.count = placed;
  trunks.instanceMatrix.needsUpdate = true;
  canopies.instanceMatrix.needsUpdate = true;
  if (canopies.instanceColor) canopies.instanceColor.needsUpdate = true;

  scene.add(trunks, canopies);
  return { trunks, canopies };
}
