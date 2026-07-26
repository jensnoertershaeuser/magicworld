import * as THREE from 'three';
import { onUpdate } from '../engine/loop.js';
import { state } from '../state.js';

function glowSprite(rgb, scale) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const x = cv.getContext('2d');
  const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.35, `rgba(${rgb},0.6)`); gr.addColorStop(1, `rgba(${rgb},0)`);
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false }));
  spr.scale.set(scale, scale, 1); return spr;
}

// The moon gets its own soft light (the one extra light we allow) so nights
// aren't pitch black.
export function addSkyDecor(scene) {
  // Sun (day only)
  const sun = new THREE.Group();
  sun.add(new THREE.Mesh(new THREE.SphereGeometry(7, 28, 22), new THREE.MeshBasicMaterial({ color: 0xffe27a, fog: false })));
  const sunHalo = glowSprite('255,220,120', 60); sun.add(sunHalo);
  sun.position.copy(new THREE.Vector3(0.45, 0.5, -0.55).normalize().multiplyScalar(190));
  scene.add(sun);

  // Moon (always)
  const moon = new THREE.Group();
  moon.add(new THREE.Mesh(new THREE.SphereGeometry(4.6, 26, 20), new THREE.MeshBasicMaterial({ color: 0xe4ecff, fog: false })));
  [[1.6, 1.0, 1.2], [-1.8, 0.6, 1.0], [0.4, -1.9, 1.4], [1.2, -0.8, 0.8]].forEach((c) => {
    const cr = new THREE.Mesh(new THREE.CircleGeometry(c[2] * 0.5, 14), new THREE.MeshBasicMaterial({ color: 0xc3cde8, fog: false }));
    cr.position.set(c[0], c[1], 4.35); moon.add(cr);
  });
  const moonHalo = glowSprite('200,215,255', 34); moon.add(moonHalo);
  moon.position.copy(new THREE.Vector3(-0.5, 0.55, 0.45).normalize().multiplyScalar(185));
  scene.add(moon);
  const moonLight = new THREE.PointLight(0xbcd0ff, 0.2, 600); moonLight.position.copy(moon.position); scene.add(moonLight);

  // Aurora ribbons
  const auroras = [];
  function aurora(rgb) {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64;
    const x = cv.getContext('2d');
    const gg = x.createLinearGradient(0, 0, 0, 64);
    gg.addColorStop(0, `rgba(${rgb},0)`); gg.addColorStop(0.5, `rgba(${rgb},1)`); gg.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = gg; x.fillRect(0, 0, 128, 64);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(130, 26, 26, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    const p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 0.06) * 10);
    return mesh;
  }
  [['90,255,180', -120, 78, -70], ['150,120,255', 70, 90, -120], ['120,220,255', -30, 68, 130]].forEach((d) => {
    const m = aurora(d[0]); m.position.set(d[1], d[2], d[3]); m.rotation.y = Math.atan2(-d[1], -d[3]);
    scene.add(m); auroras.push({ mesh: m, baseX: d[1] });
  });

  // Hot-air balloons
  const balloons = [];
  function balloon(x, y, z, c1, c2) {
    const g = new THREE.Group();
    const env = new THREE.Mesh(new THREE.SphereGeometry(3, 20, 16), new THREE.MeshStandardMaterial({ color: c1, roughness: 0.6, emissive: c1, emissiveIntensity: 0.12 }));
    env.scale.set(1, 1.25, 1); env.castShadow = true; g.add(env);
    for (let k = 0; k < 2; k++) {
      const band = new THREE.Mesh(new THREE.SphereGeometry(3.03, 20, 16, k * Math.PI, Math.PI * 0.22), new THREE.MeshStandardMaterial({ color: c2, roughness: 0.6, emissive: c2, emissiveIntensity: 0.12 }));
      band.scale.set(1, 1.25, 1); g.add(band);
    }
    const neck = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.1, 10), new THREE.MeshStandardMaterial({ color: c2, roughness: 0.7 })); neck.position.y = -3.4; neck.rotation.x = Math.PI; g.add(neck);
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.9 })); basket.position.y = -4.6; basket.castShadow = true; g.add(basket);
    [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]].forEach((o) => {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 4), new THREE.MeshStandardMaterial({ color: 0x333333 })); rope.position.set(o[0], -3.9, o[1]); g.add(rope);
    });
    g.position.set(x, y, z); scene.add(g);
    balloons.push({ g, baseY: y, off: Math.random() * 6.28, cx: x, cz: z, r: 5 + Math.random() * 7, spd: 0.04 + Math.random() * 0.05, ang: Math.random() * 6.28 });
  }
  balloon(-40, 30, -30, 0xff6ec7, 0xffe066); balloon(46, 34, 20, 0x6ee7ff, 0xb06bff);
  balloon(20, 28, 50, 0xffa24a, 0x5ff0d0); balloon(-50, 36, 28, 0x9b6bff, 0xff6ec7);

  onUpdate((dt, t) => {
    sun.visible = !state.night;
    sunHalo.material.opacity = 0.7 + Math.sin(t * 1.5) * 0.12;
    moonLight.intensity = state.night ? 0.55 : 0.18;
    moonHalo.material.opacity = (state.night ? 0.95 : 0.55) + Math.sin(t * 1.2) * 0.08;
    auroras.forEach((a, i) => {
      a.mesh.material.opacity = (state.night ? 0.55 : 0.16) + Math.sin(t * 0.6 + i) * 0.12;
      a.mesh.position.x = a.baseX + Math.sin(t * 0.15 + i) * 6;
    });
    balloons.forEach((b) => {
      b.ang += dt * b.spd;
      b.g.position.set(b.cx + Math.cos(b.ang) * b.r, b.baseY + Math.sin(t * 0.6 + b.off) * 1.2, b.cz + Math.sin(b.ang) * b.r);
      b.g.rotation.y = -b.ang;
    });
  });
}
