import * as THREE from 'three';

// PERFORMANCE NOTE (important for scaling to 10x):
// Every real light is re-computed for every surface, every frame. The old
// prototype had ~30 point lights, which is the main reason it would struggle
// at scale. Here we use just TWO lights for the whole world:
//   - a hemisphere light (soft sky/ground ambient)
//   - one directional "sun" that casts shadows
// Everything that should "glow" (crystals, windows, the unicorn) uses an
// EMISSIVE material instead of its own light. Emissive is basically free.

export function addLights(scene) {
  const hemi = new THREE.HemisphereLight(0xbfa8ff, 0x2a4d3a, 0.9);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff0d0, 2.4);
  sun.position.set(30, 45, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const s = 70;
  sun.shadow.camera.left = -s;
  sun.shadow.camera.right = s;
  sun.shadow.camera.top = s;
  sun.shadow.camera.bottom = -s;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 180;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  return { hemi, sun };
}
