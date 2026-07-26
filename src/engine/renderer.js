import * as THREE from 'three';
import { isPhone } from '../ui/device.js';

// The renderer settings here are the biggest single upgrade over the old
// single-file prototype. They give richer colour and softer light for free:
//   - antialias           : smooth edges
//   - pixelRatio (max 2)  : crisp on retina/hi-dpi screens without melting the GPU
//   - ACES tone mapping   : filmic colour response, less "flat plastic" look
//   - sRGB output         : correct, punchy colours
//   - soft shadow maps    : gentle shadows instead of hard jagged ones

export function createRenderer() {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  // Phones get a lower pixel-ratio cap: at devicePixelRatio 3 a modern phone
  // would render ~9x the pixels of a 1x screen and drop to a slideshow.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isPhone() ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  document.getElementById('app').appendChild(renderer.domElement);

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return renderer;
}
