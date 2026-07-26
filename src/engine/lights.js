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
  // Starting values match the DAY palette in world/dayNight.js so the world
  // doesn't flash purple on the first frames. dayNight.js lerps both lights
  // (colour + intensity) from here on.
  const hemi = new THREE.HemisphereLight(0x9ec9ff, 0x4e8a5c, 1.1);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff6e2, 3.2);
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
