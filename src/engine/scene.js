import * as THREE from 'three';

export function createScene() {
  const scene = new THREE.Scene();
  // Exponential fog fades distant objects into the sky colour. It hides the
  // edge of the world and adds depth. Lower density = you can see further.
  scene.fog = new THREE.FogExp2(0xbcd9f5, 0.010);
  return scene;
}
