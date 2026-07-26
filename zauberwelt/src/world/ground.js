import * as THREE from 'three';

// One shared height function so trees, characters, and props all sit on the
// same terrain. Import { heightAt } wherever you need to place something.
export function heightAt(x, z) {
  const edge = Math.max(0, 1 - Math.hypot(x, z) / 90);
  return (Math.sin(x * 0.12) * Math.cos(z * 0.1) * 1.6 + Math.sin(x * 0.05 + z * 0.07) * 2.2) * edge;
}

export function addGround(scene) {
  const geo = new THREE.PlaneGeometry(190, 190, 110, 110);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({ color: 0x35784f, roughness: 0.95 });
  const ground = new THREE.Mesh(geo, mat);
  ground.receiveShadow = true;
  scene.add(ground);
  return ground;
}
