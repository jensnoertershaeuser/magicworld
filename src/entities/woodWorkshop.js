import * as THREE from 'three';
import { heightAt } from '../world/ground.js';
import { onUpdate } from '../engine/loop.js';
import { state } from '../state.js';
import { makeLabel } from '../ui/labels.js';
import { buildCharacter, poseSeated } from './character.js';
import { reserve, isFree } from '../world/occupancy.js';
import { playCarveDone } from '../audio/sfx.js';

// DIE HOLZWERKSTATT
//
// A log workshop in a small clearing deep in the woods, where Holzwichtel Willi
// whittles little figures out of firewood. There is always one carving on the
// bench: chunks come off it, the figure appears, and when it is finished it
// flies up onto the shelf on the back wall. Six figures stay on display; the
// seventh replaces the oldest one.
//
// The "Schnitzen" button in the menu jumps straight to the next figure. Left
// alone, Willi works through the whole catalogue by himself, so the shelf fills
// up with different animals either way.
//
// Returns { nextCarving } for the menu button.

const WX = -16, WZ = 38;   // the clearing: north-west, well inside the forest ring
const CLEARING = 15;       // hut + clearing + the ring of trees this file plants itself
const W = 8, D = 6.5, H = 3.4;

const CARVE_SECS = 17;     // one figure, blank to finished
const SWITCH_SECS = 7;     // after a button press — nobody wants to wait again
const FLY_SECS = 2.2;      // bench -> shelf
const STEPS = 7;           // visible cuts per carving (chunky, so you see it happen)
const REVEAL = 0.45;       // when the blank becomes the figure
const SLOTS = 6;           // figures on display

// Willi is 1.14 high, so the bench is deliberately low: at this height his
// shoulder sits just above the bench top and his hand lands on the blank, while
// his knees still tuck in underneath.
const FLOOR_Y = 0.3;       // top of the plank floor, where chips come to rest
const BENCH_Y = 0.88;      // top of the workbench
const SHELF_Y = 2.34;
const BENCH = { x: -0.3, z: 0.78, w: 3.3, d: 0.95 };
const SEAT_Z = 0.05;                                   // Willi's stool
const WORK = new THREE.Vector3(-0.15, BENCH_Y, 0.42);  // where the carving sits,
// a little to his knife hand's side so he isn't hidden behind his own work
const FIG = 0.7;           // figures are carved at this scale — a Wichtel's palm,
// not a fence post. The catalogue is modelled at 1 and shrunk here in one place.

// ---------------------------------------------------------------------------
// The figures Willi can carve. Each builder gets its own materials and
// geometries, so a finished figure can be thrown away (dispose) without
// touching any of the others. All of them stand on y = 0 and are ~0.6 high.
// ---------------------------------------------------------------------------
const CARVINGS = [
  { name: 'Bär', build: (w, add) => {
    add(new THREE.SphereGeometry(0.16, 12, 10), w.mid, 0, 0.26, 0).scale.set(1, 1.1, 0.85);
    add(new THREE.SphereGeometry(0.115, 12, 10), w.light, 0, 0.47, 0.02);
    add(new THREE.SphereGeometry(0.05, 8, 8), w.dark, 0, 0.44, 0.11);
    [-1, 1].forEach((s) => add(new THREE.SphereGeometry(0.045, 8, 8), w.mid, s * 0.08, 0.56, 0));
    [[-0.08, 0.08], [0.08, 0.08], [-0.08, -0.08], [0.08, -0.08]].forEach((p) =>
      add(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 8), w.dark, p[0], 0.08, p[1]));
  } },
  { name: 'Vogel', build: (w, add) => {
    add(new THREE.SphereGeometry(0.14, 12, 10), w.mid, 0, 0.25, 0).scale.set(0.85, 1, 1.25);
    add(new THREE.SphereGeometry(0.09, 12, 10), w.light, 0, 0.43, 0.05);
    add(new THREE.ConeGeometry(0.035, 0.11, 8), w.dark, 0, 0.42, 0.16).rotation.x = Math.PI / 2;
    add(new THREE.ConeGeometry(0.08, 0.22, 6), w.mid, 0, 0.3, -0.21).rotation.x = -1.25;
    [-1, 1].forEach((s) => add(new THREE.SphereGeometry(0.08, 10, 8), w.light, s * 0.11, 0.27, 0).scale.set(0.35, 0.9, 1.3));
    [-1, 1].forEach((s) => add(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 6), w.dark, s * 0.05, 0.08, 0.02));
  } },
  { name: 'Fisch', build: (w, add) => {
    add(new THREE.CylinderGeometry(0.12, 0.13, 0.06, 14), w.dark, 0, 0.03, 0);
    add(new THREE.SphereGeometry(0.15, 12, 10), w.mid, 0.02, 0.23, 0).scale.set(1.5, 0.95, 0.45);
    const tail = add(new THREE.ConeGeometry(0.12, 0.18, 4), w.light, -0.28, 0.23, 0);
    tail.rotation.z = Math.PI / 2; tail.scale.set(1, 1, 0.35);
    add(new THREE.ConeGeometry(0.07, 0.14, 3), w.light, 0.0, 0.37, 0).scale.set(1, 1, 0.4);
    add(new THREE.SphereGeometry(0.022, 8, 8), w.dark, 0.16, 0.27, 0.055);
  } },
  { name: 'Hase', build: (w, add) => {
    add(new THREE.SphereGeometry(0.14, 12, 10), w.mid, 0, 0.2, -0.01).scale.set(1, 1.05, 0.9);
    add(new THREE.SphereGeometry(0.1, 12, 10), w.light, 0, 0.38, 0.05);
    [-1, 1].forEach((s) => {
      const ear = add(new THREE.CapsuleGeometry(0.033, 0.17, 4, 8), w.light, s * 0.055, 0.56, -0.01);
      ear.rotation.set(-0.12, 0, s * 0.18);
    });
    add(new THREE.SphereGeometry(0.055, 10, 8), w.light, 0, 0.22, -0.15);
    [-1, 1].forEach((s) => add(new THREE.SphereGeometry(0.06, 10, 8), w.dark, s * 0.07, 0.05, 0.06).scale.set(0.7, 0.5, 1.5));
    add(new THREE.SphereGeometry(0.022, 8, 8), w.dark, 0, 0.37, 0.145);
  } },
  { name: 'Eule', build: (w, add) => {
    add(new THREE.CylinderGeometry(0.115, 0.145, 0.34, 14), w.mid, 0, 0.17, 0);
    add(new THREE.SphereGeometry(0.115, 14, 10), w.mid, 0, 0.35, 0);
    [-1, 1].forEach((s) => add(new THREE.SphereGeometry(0.045, 10, 8), w.light, s * 0.055, 0.38, 0.09));
    [-1, 1].forEach((s) => add(new THREE.SphereGeometry(0.018, 8, 8), w.dark, s * 0.055, 0.385, 0.125));
    add(new THREE.ConeGeometry(0.028, 0.07, 6), w.dark, 0, 0.33, 0.11).rotation.x = Math.PI / 2;
    [-1, 1].forEach((s) => add(new THREE.ConeGeometry(0.05, 0.1, 5), w.mid, s * 0.075, 0.45, 0).rotation.z = -s * 0.3);
    [-1, 1].forEach((s) => add(new THREE.SphereGeometry(0.07, 10, 8), w.light, s * 0.115, 0.17, 0).scale.set(0.4, 1.5, 0.8));
    [-1, 1].forEach((s) => add(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 6), w.dark, s * 0.05, 0.03, 0.04));
  } },
  { name: 'Pilz', build: (w, add) => {
    add(new THREE.CylinderGeometry(0.055, 0.075, 0.3, 12), w.light, 0, 0.15, 0);
    // A hemisphere is open underneath, so a thin dark disc plays the gills.
    add(new THREE.CylinderGeometry(0.168, 0.168, 0.02, 14), w.dark, 0, 0.295, 0);
    add(new THREE.SphereGeometry(0.17, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), w.mid, 0, 0.3, 0).scale.set(1, 0.85, 1);
    [[0.06, 0.06], [-0.08, 0.03], [0.01, -0.09]].forEach((p) =>
      add(new THREE.SphereGeometry(0.028, 8, 8), w.light, p[0], 0.4, p[1]));
  } },
];

// Builds one entry of the catalogue. `mats` is handed back so the finished
// figure can be made to glow, and disposed of later.
function makeFigure(entry) {
  const w = {
    light: new THREE.MeshStandardMaterial({ color: 0xe0b071, roughness: 0.7, flatShading: true }),
    mid: new THREE.MeshStandardMaterial({ color: 0xc08a4a, roughness: 0.75, flatShading: true }),
    dark: new THREE.MeshStandardMaterial({ color: 0x8a5a30, roughness: 0.8, flatShading: true }),
  };
  const g = new THREE.Group();
  entry.build(w, (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m;
  });
  return { g, mats: [w.light, w.mid, w.dark] };
}

export function addWoodWorkshop(scene) {
  const yaw = Math.atan2(-WX, -WZ);
  // The hut is one rigid box on a hilly meadow, so it stands on the HIGHEST
  // point of its own footprint and the deep stone plinth fills the gap on the
  // low side. Sitting it on the centre height instead buries the front doorstep
  // in the slope, floor and all.
  const baseY = footprintTop(yaw) + 0.06;

  // The grove goes in BEFORE the keep-out zone: its trees ask isFree()
  // themselves so they respect the piano and the houses, and they must not be
  // turned away by the workshop's own zone. Reserving afterwards is what keeps
  // the big forest (built last, in main.js) out of the clearing and the grove.
  addGrove(scene);
  reserve(WX, WZ, CLEARING);
  addClearingFloor(scene);

  const g = new THREE.Group();
  g.position.set(WX, baseY, WZ); g.rotation.y = yaw; scene.add(g);

  // --- the hut ------------------------------------------------------------
  const logMat = new THREE.MeshStandardMaterial({ color: 0x8a5a30, roughness: 0.9, flatShading: true });
  const plankMat = new THREE.MeshStandardMaterial({ color: 0xa9743c, roughness: 0.85 });
  // The roof gets a whisper of emissive: its underside faces away from both the
  // sky and the sun, and without this the whole ceiling reads as a black hole
  // above the workbench.
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x5f4023, roughness: 0.9, flatShading: true, emissive: 0x3a2716, emissiveIntensity: 0.55 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6f6a63, roughness: 1 });

  // A stone plinth, deep enough that no gap shows on the downhill side.
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(W + 0.5, 2.4, D + 0.5), stoneMat);
  plinth.position.y = -1.05; plinth.receiveShadow = true; g.add(plinth);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.3, D), plankMat);
  floor.position.y = FLOOR_Y - 0.15; floor.receiveShadow = true; g.add(floor);

  // Stacked logs, three InstancedMeshes instead of ~40 separate wall meshes:
  // the back wall, the two sides, and a stub at each end of the open front that
  // leaves a 5-unit-wide gap to watch through.
  const rows = 8, gap = 0.42, y0 = FLOOR_Y + 0.24;
  const STUB = 1.5;
  logWall(g, logMat, W, 'x', rows, [[0, -D / 2 + 0.22]], y0, gap);
  logWall(g, logMat, D, 'z', rows, [[-W / 2 + 0.22, 0], [W / 2 - 0.22, 0]], y0, gap);
  logWall(g, logMat, STUB, 'x', rows, [[-(W - STUB) / 2, D / 2 - 0.22], [(W - STUB) / 2, D / 2 - 0.22]], y0, gap);

  // Corner posts hide the log ends.
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach((c) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.3, H + 0.5, 8), logMat);
    post.position.set(c[0] * (W / 2 - 0.1), FLOOR_Y + (H + 0.5) / 2 - 0.2, c[1] * (D / 2 - 0.1));
    post.castShadow = true; g.add(post);
  });

  // Gable roof: two shingle slabs leaning on a ridge log. Steep and high on
  // purpose — with a lower ridge or a longer overhang the roof's own shadow
  // falls straight across the workbench and you can't see Willi work.
  const RIDGE_Y = H + 2.2, slope = 0.5, half = 4.25;
  [-1, 1].forEach((s) => {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(W + 1.3, 0.22, half), roofMat);
    panel.position.set(0, RIDGE_Y - (half / 2) * Math.sin(slope), s * (half / 2) * Math.cos(slope));
    panel.rotation.x = s * slope;
    // The front half deliberately casts no shadow. The sun stands at 42°, so any
    // roof over the bench — however steep — puts the whole workshop in the dark.
    // This is the same trick as the emissive "glow" elsewhere: cheat the light,
    // keep the picture readable. The back half still shadows the meadow.
    panel.castShadow = s < 0;
    g.add(panel);
  });
  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, W + 1.5, 8), logMat);
  ridge.rotation.z = Math.PI / 2; ridge.position.set(0, RIDGE_Y + 0.12, 0); ridge.castShadow = true; g.add(ridge);
  // Logs filling the back gable. The front gable stays open, so daylight and
  // the camera both get inside.
  [[0.82, 0.42], [0.62, 0.9], [0.42, 1.38], [0.2, 1.86]].forEach((r) => {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, W * r[0], 8), logMat);
    l.rotation.z = Math.PI / 2; l.position.set(0, H + r[1], -D / 2 + 0.22); g.add(l);
  });

  // A window on the side wall, and a lantern for the evening. No new lights —
  // an emissive material costs nothing and glows all the same.
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 1.3), new THREE.MeshStandardMaterial({ color: 0xffe9b0, emissive: 0xffd27a, emissiveIntensity: 0.5, roughness: 0.4 }));
  win.position.set(-W / 2 + 0.2, 2.1, -0.9); g.add(win);
  const lanternMat = new THREE.MeshStandardMaterial({ color: 0xffe066, emissive: 0xffc457, emissiveIntensity: 0.5, roughness: 0.35 });
  // Hung from the roof on a long cord: any higher and the deep front eave hides
  // it from anyone standing out in the clearing.
  const lantern = new THREE.Group(); lantern.position.set(1.3, RIDGE_Y - 0.63, 1.0); g.add(lantern);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 6), logMat); cord.position.y = -0.8; lantern.add(cord);
  const lid = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.16, 4), roofMat); lid.position.y = -1.65; lantern.add(lid);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, 0.26), lanternMat); glass.position.y = -1.88; lantern.add(glass);
  // The pool of lamplight on the floorboards. An additive disc, not a light —
  // three real lights is the whole world's budget (see engine/lights.js).
  const lampPool = new THREE.Mesh(new THREE.CircleGeometry(1.7, 24), new THREE.MeshBasicMaterial({
    color: 0xffc457, map: radialFade(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  lampPool.rotation.x = -Math.PI / 2; lampPool.position.set(1.3, FLOOR_Y + 0.02, 1.0); g.add(lampPool);

  // --- workbench, tools, wood --------------------------------------------
  const bench = new THREE.Mesh(new THREE.BoxGeometry(BENCH.w, 0.16, BENCH.d), new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.7 }));
  bench.position.set(BENCH.x, BENCH_Y - 0.08, BENCH.z); bench.castShadow = true; g.add(bench);
  const benchLegH = BENCH_Y - 0.16 - FLOOR_Y;
  [[-1.45, -0.3], [1.45, -0.3], [-1.45, 0.3], [1.45, 0.3]].forEach((p) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, benchLegH, 8), logMat);
    leg.position.set(BENCH.x + p[0], FLOOR_Y + benchLegH / 2, BENCH.z + p[1]); g.add(leg);
  });
  // A vise at the end of the bench, and a chisel rack on the back wall.
  const vise = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.5), new THREE.MeshStandardMaterial({ color: 0x8f949c, metalness: 0.7, roughness: 0.4 }));
  vise.position.set(BENCH.x + 1.35, BENCH_Y + 0.07, BENCH.z); g.add(vise);
  const rack = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.16), plankMat);
  rack.position.set(0.4, 1.75, -D / 2 + 0.42); g.add(rack);
  const steelMat = new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: 0.75, roughness: 0.35 });
  for (let i = 0; i < 5; i++) {
    const x = -0.5 + i * 0.45;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.05), steelMat); blade.position.set(x, 1.52, -D / 2 + 0.42); g.add(blade);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.22, 8), logMat); grip.position.set(x, 1.83, -D / 2 + 0.42); g.add(grip);
  }
  // A hand saw hung on the wall.
  const saw = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.28, 0.03), steelMat); saw.position.set(-2.9, 3.0, -D / 2 + 0.4); saw.rotation.z = 0.12; g.add(saw);

  // The shelf the finished figures end up on.
  const shelfPlank = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.12, 0.45), plankMat);
  shelfPlank.position.set(0, SHELF_Y - 0.06, -D / 2 + 0.52); shelfPlank.castShadow = true; g.add(shelfPlank);
  [-2.0, 0, 2.0].forEach((x) => {
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.12), logMat);
    br.position.set(x, SHELF_Y - 0.27, -D / 2 + 0.3); g.add(br);
  });

  // Firewood stacked against the right-hand wall, a sawhorse, a chopping block
  // with the axe still in it, and a heap of shavings under the bench.
  const stackMat = new THREE.MeshStandardMaterial({ color: 0x9a6b3f, roughness: 0.9, flatShading: true });
  const cutMat = new THREE.MeshStandardMaterial({ color: 0xe0b071, roughness: 0.8 });
  const stack = new THREE.Group(); stack.position.set(W / 2 + 1.1, 0, 0.4); g.add(stack);
  [4, 3, 2].forEach((n, row) => {
    for (let i = 0; i < n; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.5, 9), stackMat);
      log.rotation.x = Math.PI / 2;
      log.position.set((row * 0.24) + (Math.random() - 0.5) * 0.06, 0.24 + row * 0.44, -0.9 + i * 0.52);
      log.castShadow = true; stack.add(log);
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.235, 10), cutMat);
      face.position.set(log.position.x, log.position.y, log.position.z + 0.76); stack.add(face);
    }
  });
  const horse = new THREE.Group(); horse.position.set(-W / 2 - 1.8, 0, 1.6); g.add(horse);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 1.6), logMat); beam.position.y = 0.85; beam.castShadow = true; horse.add(beam);
  [-0.55, 0.55].forEach((z) => [-1, 1].forEach((s) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0, 6), logMat);
    leg.position.set(s * 0.3, 0.44, z); leg.rotation.z = s * 0.35; horse.add(leg);
  }));
  const halfSawn = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 1.1, 10), stackMat);
  halfSawn.rotation.z = Math.PI / 2; halfSawn.position.set(0.1, 1.05, 0); halfSawn.castShadow = true; horse.add(halfSawn);

  const block = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.7, 12), stackMat);
  block.position.set(-1.9, 0.35, D / 2 + 1.9); block.castShadow = true; g.add(block);
  const blockFace = new THREE.Mesh(new THREE.CircleGeometry(0.41, 14), cutMat);
  blockFace.rotation.x = -Math.PI / 2; blockFace.position.set(-1.9, 0.701, D / 2 + 1.9); g.add(blockFace);
  const axe = new THREE.Group(); axe.position.set(-1.9, 0.68, D / 2 + 1.9); axe.rotation.set(0, 0.5, -0.35); g.add(axe);
  const helve = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.9, 8), logMat);
  helve.position.y = 0.45; helve.castShadow = true; axe.add(helve);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.24, 0.3), steelMat);
  head.position.set(0, 0.88, 0.06); axe.add(head);

  // The heap of shavings that never gets swept up.
  const shavingMat = new THREE.MeshStandardMaterial({ color: 0xdfc08a, roughness: 0.85, flatShading: true });
  for (let i = 0; i < 12; i++) {
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.05, 7, 5), shavingMat);
    sh.scale.set(1, 0.3, 1); sh.rotation.y = Math.random() * 3;
    sh.position.set(BENCH.x - 1.1 + Math.random() * 2.2, FLOOR_Y + 0.02, BENCH.z + 0.7 + Math.random() * 0.75);
    g.add(sh);
  }

  const sign = makeLabel('Holzwerkstatt', '#e8c88a');
  sign.scale.set(5.8, 1.15, 1); sign.position.set(0, H + 3.1, 0); g.add(sign);

  // --- Holzwichtel Willi --------------------------------------------------
  // No `name` here: buildCharacter puts the sign right on top of the head, which
  // is fine for a 1.8m grown-up but would swallow a Wichtel and his pointed hat
  // whole. His own label goes on further down, above the hat.
  // Green tunic and red hat, like the Oberwichtel over on his sun lounger — and
  // it keeps him from disappearing into a workshop where everything is brown.
  const willi = buildCharacter({ height: 1.14, hair: 0xf2f2f2, shirt: 0x2f7d5b, pants: 0x46331f });
  poseSeated(willi);
  const dims = willi.dims;
  willi.group.position.set(WX, baseY + FLOOR_Y, WZ);
  // He sits behind the bench looking out of the open front, so you watch him
  // work from the meadow rather than staring at his back. The character lives in
  // the scene, not in the hut's group, so its own offset has to be turned by the
  // hut's yaw first.
  const seatOff = new THREE.Vector3(BENCH.x, 0, SEAT_Z).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  willi.group.position.x += seatOff.x; willi.group.position.z += seatOff.z;
  willi.group.rotation.y = yaw;
  scene.add(willi.group);
  const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, dims.legH, 12), logMat);
  stool.position.set(BENCH.x, FLOOR_Y + dims.legH / 2, SEAT_Z); stool.castShadow = true; g.add(stool);
  // A red pointed hat is what turns the little figure into a Wichtel.
  const hatMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.75 });
  const hat = new THREE.Mesh(new THREE.ConeGeometry(dims.headR * 1.15, dims.headR * 2.6, 12), hatMat);
  hat.position.y = dims.headY + dims.headR * 1.25; hat.castShadow = true; willi.group.add(hat);
  const brim = new THREE.Mesh(new THREE.TorusGeometry(dims.headR * 1.05, dims.headR * 0.16, 6, 16), hatMat);
  brim.rotation.x = Math.PI / 2; brim.position.y = dims.headY + dims.headR * 0.62; willi.group.add(brim);
  // A cone points up by default, so the beard is flipped to hang off his chin.
  // Hat and beard both stay clear of eye level, or he ends up faceless.
  const beard = new THREE.Mesh(new THREE.ConeGeometry(dims.headR * 0.66, dims.headR * 1.6, 10), new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.9 }));
  beard.rotation.x = Math.PI - 0.3;
  beard.position.set(0, dims.headY - dims.headR * 0.85, dims.headR * 0.5); willi.group.add(beard);
  const nameTag = makeLabel('Holzwichtel Willi', '#e8c88a');
  nameTag.scale.set(4.4, 1.0, 1); nameTag.position.y = dims.headY + dims.headR * 5.4; willi.group.add(nameTag);
  // The carving knife rides in his right hand, i.e. at the far end of the arm,
  // so it swings with every stroke for free.
  const knife = new THREE.Group();
  knife.position.set(0, -dims.armH - 0.02, 0.03); knife.rotation.set(1.15, 0, 0); willi.armR.add(knife);
  const grip2 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.16, 8), logMat);
  grip2.position.y = -0.06; knife.add(grip2);
  const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.17, 0.045), steelMat);
  blade2.position.y = 0.08; knife.add(blade2);

  // --- flying wood chips (one InstancedMesh, one draw call) ---------------
  const CHIPS = 22;
  const chipMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.075, 0.018, 0.05),
    new THREE.MeshStandardMaterial({ color: 0xf0d49a, roughness: 0.8, flatShading: true }),
    CHIPS,
  );
  chipMesh.frustumCulled = false; g.add(chipMesh);
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
  const chips = [];
  for (let i = 0; i < CHIPS; i++) {
    chips.push({ life: 0, parked: true, p: new THREE.Vector3(), v: new THREE.Vector3(), rot: new THREE.Euler(), spin: new THREE.Vector3() });
    chipMesh.setMatrixAt(i, _m.makeScale(0, 0, 0));   // otherwise all 22 sit at the origin
  }
  chipMesh.instanceMatrix.needsUpdate = true;
  let cursor = 0;

  function spawnChips(n) {
    for (let i = 0; i < n; i++) {
      const c = chips[cursor]; cursor = (cursor + 1) % CHIPS;
      c.life = 1.0 + Math.random() * 0.8;
      c.p.copy(WORK).add(new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.25, 0.05));
      c.v.set((Math.random() - 0.5) * 1.7, 1.0 + Math.random() * 1.2, 0.5 + Math.random() * 1.1);
      c.rot.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
      c.spin.set((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9);
    }
  }

  function updateChips(dt) {
    let dirty = false;
    for (let i = 0; i < CHIPS; i++) {
      const c = chips[i];
      if (c.life <= 0) {
        if (c.parked) continue;
        c.parked = true; chipMesh.setMatrixAt(i, _m.makeScale(0, 0, 0)); dirty = true; continue;
      }
      c.parked = false; dirty = true;
      c.life -= dt;
      c.v.y -= 7.0 * dt;
      c.p.addScaledVector(c.v, dt);
      if (c.p.y < FLOOR_Y + 0.02) { c.p.y = FLOOR_Y + 0.02; c.v.y *= -0.28; c.v.x *= 0.55; c.v.z *= 0.55; }
      c.rot.x += c.spin.x * dt; c.rot.y += c.spin.y * dt; c.rot.z += c.spin.z * dt;
      _q.setFromEuler(c.rot);
      _s.setScalar(Math.min(1, c.life * 2.4));   // shrink away instead of popping out
      chipMesh.setMatrixAt(i, _m.compose(c.p, _q, _s));
    }
    if (dirty) chipMesh.instanceMatrix.needsUpdate = true;
  }

  // --- the carving job ----------------------------------------------------
  // The blank: a chunk of firewood standing on the bench. It shrinks in visible
  // steps, and halfway through it hands over to the figure itself.
  const blank = new THREE.Group(); blank.position.copy(WORK); g.add(blank);
  const blankBody = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.135, 0.44, 10), new THREE.MeshStandardMaterial({ color: 0xd8a55e, roughness: 0.8, flatShading: true }));
  blankBody.position.y = 0.22; blankBody.castShadow = true; blank.add(blankBody);
  const bark = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.145, 0.1, 10), new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.95, flatShading: true }));
  bark.position.y = 0.12; blank.add(bark);

  // One label for every carving — makeLabel() registers each sprite with the
  // "Schilder" button forever, so a fresh one per figure would pile them up.
  const fertig = makeLabel('Fertig!', '#8affa0');
  // It hangs on the figure, which lives at FIG scale, so the sprite is scaled up
  // by the same amount to come out the right size on screen.
  fertig.scale.set(2.6 / FIG, 0.65 / FIG, 1);

  const shelf = new Array(SLOTS).fill(null);
  const job = {
    idx: Math.max(0, CARVINGS.findIndex((c) => c.name === state.carve)),
    phase: 'carving', t: 0, dur: CARVE_SECS, step: -1, slot: 0, work: null,
    from: new THREE.Vector3(), to: new THREE.Vector3(),   // the flight to the shelf
  };
  state.carve = CARVINGS[job.idx].name;

  function slotPos(i) { return new THREE.Vector3(-1.75 + i * 0.7, SHELF_Y + 0.02, -D / 2 + 0.52); }

  function disposeFigure(fig) {
    if (!fig) return;
    if (fertig.parent === fig.g) fig.g.remove(fertig);   // rescue the shared label
    fig.g.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
    fig.mats.forEach((m) => m.dispose());
    g.remove(fig.g);
  }

  function startCarving(secs) {
    disposeFigure(job.work);
    job.work = makeFigure(CARVINGS[job.idx]);
    job.work.g.position.copy(WORK); job.work.g.visible = false; g.add(job.work.g);
    job.phase = 'carving'; job.t = 0; job.dur = secs; job.step = -1;
    blank.visible = true; blank.scale.setScalar(1);
  }
  startCarving(CARVE_SECS);

  // Menu hook: skip to the next figure right away. Whatever is on the bench is
  // firewood again, and the new one is carved on the short countdown.
  function nextCarving() {
    job.idx = (job.idx + 1) % CARVINGS.length;
    state.carve = CARVINGS[job.idx].name;
    startCarving(SWITCH_SECS);
    return state.carve;
  }

  function finish() {
    const fig = job.work;
    fig.g.visible = true; fig.g.scale.setScalar(FIG);
    fertig.position.set(0, 1.5, 0); fig.g.add(fertig);   // in the figure's own, shrunk space
    fig.mats.forEach((m) => { m.emissive.set(0xffcf6a); m.emissiveIntensity = 0; });
    job.phase = 'flying'; job.t = 0;
    job.from.copy(fig.g.position);
    job.to.copy(slotPos(job.slot));
    spawnChips(6);
    playCarveDone();
  }

  function land() {
    const fig = job.work;
    fig.g.remove(fertig);
    fig.g.position.copy(job.to);
    fig.g.rotation.set(0, (job.slot % 2 ? 0.35 : -0.3), 0);
    fig.mats.forEach((m) => (m.emissiveIntensity = 0));
    disposeFigure(shelf[job.slot]);          // the oldest one makes room
    shelf[job.slot] = fig;
    job.work = null;
    job.slot = (job.slot + 1) % SLOTS;
    // Nobody carves the same animal all day: on to the next one in the
    // catalogue, which is also what the menu button shows.
    job.idx = (job.idx + 1) % CARVINGS.length;
    state.carve = CARVINGS[job.idx].name;
    startCarving(CARVE_SECS);
  }

  onUpdate((dt, time) => {
    if (state.paused) return;
    job.t += dt;
    const flicker = Math.sin(time * 2.2) * 0.12;
    lanternMat.emissiveIntensity = (state.night ? 1.6 : 0.45) + flicker;
    lampPool.material.opacity = state.night ? 0.26 + flicker * 0.3 : 0;
    updateChips(dt);

    if (job.phase === 'carving') {
      const p = Math.min(job.t / job.dur, 1);
      const q = Math.floor(p * STEPS) / STEPS;          // chunky, so each cut shows
      const step = Math.floor(p * STEPS);
      if (step !== job.step) { job.step = step; spawnChips(p < REVEAL ? 5 : 3); }
      if (p < REVEAL) {
        blank.visible = true;
        blank.scale.setScalar(1 - 0.4 * (q / REVEAL));
        job.work.g.visible = false;
      } else {
        // The blank is gone; from here on the figure itself is refined. The
        // hand-over is hidden inside a burst of shavings.
        if (blank.visible) { blank.visible = false; spawnChips(10); }
        job.work.g.visible = true;
        job.work.g.scale.setScalar(FIG * (0.55 + 0.45 * Math.min((q - REVEAL) / (0.93 - REVEAL), 1)));
      }
      if (job.t >= job.dur) finish();
    } else {
      // Up over Willi's hat and onto the shelf, turning as it goes.
      const p = Math.min(job.t / FLY_SECS, 1);
      const e = p * p * (3 - 2 * p);
      const fig = job.work;
      fig.g.position.lerpVectors(job.from, job.to, e);
      fig.g.position.y += Math.sin(Math.PI * e) * 1.5;
      fig.g.rotation.y = e * Math.PI * 2;
      fig.mats.forEach((m) => (m.emissiveIntensity = Math.sin(Math.PI * p) * 0.8));
      if (p >= 1) land();
    }

    // Fast strokes while there is wood to remove, slow ones for the polishing.
    const rate = job.phase === 'carving' && job.t / job.dur < 0.9 ? 7.5 : 3.0;
    willi.armR.rotation.x = willi.armBaseX + Math.sin(time * rate) * 0.33;
    willi.armL.rotation.x = willi.armBaseX + Math.sin(time * rate + 2.1) * 0.13;
    willi.head.rotation.x = Math.sin(time * rate * 0.5) * 0.06 + 0.12;
    willi.group.position.y = baseY + FLOOR_Y + Math.sin(time * 1.5) * 0.012;
  });

  return { nextCarving };
}

// White in the middle fading to black at the rim. On an additively blended disc
// black adds nothing, so this turns a hard-edged bright circle into a soft pool
// of light — one tiny canvas instead of a real spotlight.
function radialFade() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, '#ffffff');
  grd.addColorStop(0.45, '#9a9a9a');
  grd.addColorStop(1, '#000000');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// The highest terrain point under the hut's footprint (corners, edges, centre).
function footprintTop(yaw) {
  const up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3();
  let top = -Infinity;
  for (let ix = -1; ix <= 1; ix++) {
    for (let iz = -1; iz <= 1; iz++) {
      v.set(ix * (W / 2 + 0.3), 0, iz * (D / 2 + 0.3)).applyAxisAngle(up, yaw);
      top = Math.max(top, heightAt(WX + v.x, WZ + v.z));
    }
  }
  return top;
}

// A trodden patch of forest floor, following the terrain vertex by vertex so it
// never floats over a bump the way a flat disc would.
function addClearingFloor(scene) {
  const geo = new THREE.CircleGeometry(7.8, 28);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, heightAt(WX + pos.getX(i), WZ + pos.getZ(i)) + 0.05);
  }
  geo.computeVertexNormals();
  const patch = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x6d5a3c, roughness: 1 }));
  patch.position.set(WX, 0, WZ); patch.receiveShadow = true; scene.add(patch);
}

// A dense ring of dark spruce around the clearing — taller and pointier than
// the round trees of the big forest, so the workshop really sits IN the woods
// instead of next to it. Two InstancedMeshes, so the whole ring is 2 draw calls.
function addGrove(scene) {
  const COUNT = 34;
  const trunkGeo = new THREE.CylinderGeometry(0.26, 0.46, 3.0, 6); trunkGeo.translate(0, 1.5, 0);
  const capGeo = new THREE.ConeGeometry(1.7, 4.4, 7); capGeo.translate(0, 2.2, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x5c3f28, roughness: 0.95 }), COUNT);
  const caps = new THREE.InstancedMesh(capGeo, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), COUNT);
  trunks.castShadow = caps.castShadow = true;

  const shades = [0x1f6b4a, 0x27805a, 0x2f9e6a, 0x1a5c40];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();

  let placed = 0;
  for (let i = 0; i < COUNT; i++) {
    const a = (i / COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
    const d = 10.0 + Math.random() * 3.6;
    const x = WX + Math.cos(a) * d, z = WZ + Math.sin(a) * d;
    if (!isFree(x, z, 2.2)) continue;         // the piano, the houses, the mountains

    const scale = 0.85 + Math.random() * 0.5, y = heightAt(x, z);
    q.setFromAxisAngle(up, Math.random() * Math.PI * 2);
    s.setScalar(scale);
    p.set(x, y, z); trunks.setMatrixAt(placed, m.compose(p, q, s));
    p.set(x, y + 2.5 * scale, z); caps.setMatrixAt(placed, m.compose(p, q, s));
    caps.setColorAt(placed, col.set(shades[(Math.random() * shades.length) | 0]));
    placed++;
  }
  trunks.count = caps.count = placed;
  trunks.instanceMatrix.needsUpdate = true;
  caps.instanceMatrix.needsUpdate = true;
  if (caps.instanceColor) caps.instanceColor.needsUpdate = true;
  scene.add(trunks, caps);
}

// One InstancedMesh per run of stacked logs: `len` long, lying along `axis`,
// `rows` of them stacked at every (x, z) in `at`.
function logWall(parent, mat, len, axis, rows, at, y0, gap) {
  const geo = new THREE.CylinderGeometry(0.22, 0.22, len, 8);
  if (axis === 'x') geo.rotateZ(Math.PI / 2); else geo.rotateX(Math.PI / 2);
  const mesh = new THREE.InstancedMesh(geo, mat, rows * at.length);
  mesh.castShadow = true;
  const m = new THREE.Matrix4();
  let n = 0;
  at.forEach((c) => {
    for (let r = 0; r < rows; r++) {
      mesh.setMatrixAt(n++, m.makeTranslation(c[0], y0 + r * gap, c[1]));
    }
  });
  mesh.instanceMatrix.needsUpdate = true;
  parent.add(mesh);
  return mesh;
}
