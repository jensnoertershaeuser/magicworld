import * as THREE from 'three';
import { state } from '../state.js';
import { onUpdate } from '../engine/loop.js';

// Smoothly lerps sky colours, sun/hemi intensity, fog and star brightness
// toward day or night targets based on state.night. Other modules (sun, moon,
// aurora, glow mountains) read state.night directly in their own updates.
export function initDayNight({ skyMat, stars, hemi, sun, scene }) {
  const day = { top: 0x241b4a, mid: 0x5a3a7e, bottom: 0xffb98a, sun: 2.4, hemi: 0.9, fog: 0x2a2158, stars: 0.55 };
  const night = { top: 0x0a0820, mid: 0x1a1440, bottom: 0x3a2a55, sun: 0.35, hemi: 0.4, fog: 0x140f2e, stars: 1.0 };

  const cur = {
    top: new THREE.Color(day.top), mid: new THREE.Color(day.mid),
    bottom: new THREE.Color(day.bottom), fog: new THREE.Color(day.fog),
  };
  const tTop = new THREE.Color(), tMid = new THREE.Color(), tBot = new THREE.Color(), tFog = new THREE.Color();

  onUpdate((dt) => {
    const g = state.night ? night : day;
    const k = Math.min(1, dt * 2.5);
    cur.top.lerp(tTop.set(g.top), k); skyMat.uniforms.top.value.copy(cur.top);
    cur.mid.lerp(tMid.set(g.mid), k); skyMat.uniforms.mid.value.copy(cur.mid);
    cur.bottom.lerp(tBot.set(g.bottom), k); skyMat.uniforms.bottom.value.copy(cur.bottom);
    cur.fog.lerp(tFog.set(g.fog), k); scene.fog.color.copy(cur.fog);
    sun.intensity += (g.sun - sun.intensity) * k;
    hemi.intensity += (g.hemi - hemi.intensity) * k;
    stars.material.opacity += (g.stars - stars.material.opacity) * k;
  });
}
