import * as THREE from 'three';
import { state } from '../state.js';
import { onUpdate } from '../engine/loop.js';

// Smoothly lerps sky colours, sun/hemi colour + intensity, fog and star
// brightness toward day or night targets based on state.night. Other modules
// (sun, moon, aurora, glow mountains) read state.night directly in their own
// updates.
//
// Day is a real bright-blue daytime sky: deep blue at the zenith, pale blue at
// the horizon, warm white sunlight and a hazy blue fog. Night keeps the
// original magic-purple palette.
export function initDayNight({ skyMat, stars, hemi, sun, scene }) {
  const day = {
    top: 0x2a6fd6, mid: 0x6fb4f0, bottom: 0xcfeaff,
    fog: 0xbcd9f5, hemiSky: 0x9ec9ff, hemiGround: 0x4e8a5c, sunCol: 0xfff6e2,
    sun: 3.2, hemi: 1.1, stars: 0.0,
  };
  const night = {
    top: 0x0a0820, mid: 0x1a1440, bottom: 0x3a2a55,
    fog: 0x140f2e, hemiSky: 0xbfa8ff, hemiGround: 0x2a4d3a, sunCol: 0xbcd0ff,
    sun: 0.35, hemi: 0.4, stars: 1.0,
  };

  const cur = {
    top: new THREE.Color(day.top), mid: new THREE.Color(day.mid),
    bottom: new THREE.Color(day.bottom), fog: new THREE.Color(day.fog),
  };
  const tTop = new THREE.Color(), tMid = new THREE.Color(), tBot = new THREE.Color(), tFog = new THREE.Color();
  const tHemiSky = new THREE.Color(), tHemiGround = new THREE.Color(), tSunCol = new THREE.Color();

  onUpdate((dt) => {
    const g = state.night ? night : day;
    const k = Math.min(1, dt * 2.5);
    cur.top.lerp(tTop.set(g.top), k); skyMat.uniforms.top.value.copy(cur.top);
    cur.mid.lerp(tMid.set(g.mid), k); skyMat.uniforms.mid.value.copy(cur.mid);
    cur.bottom.lerp(tBot.set(g.bottom), k); skyMat.uniforms.bottom.value.copy(cur.bottom);
    cur.fog.lerp(tFog.set(g.fog), k); scene.fog.color.copy(cur.fog);
    sun.intensity += (g.sun - sun.intensity) * k;
    hemi.intensity += (g.hemi - hemi.intensity) * k;
    sun.color.lerp(tSunCol.set(g.sunCol), k);
    hemi.color.lerp(tHemiSky.set(g.hemiSky), k);
    hemi.groundColor.lerp(tHemiGround.set(g.hemiGround), k);
    stars.material.opacity += (g.stars - stars.material.opacity) * k;
    stars.visible = stars.material.opacity > 0.02;
  });
}
