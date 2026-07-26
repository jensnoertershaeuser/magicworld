import { createRenderer } from './engine/renderer.js';
import { createScene } from './engine/scene.js';
import { createCamera, createControls } from './engine/cameraControls.js';
import { addLights } from './engine/lights.js';
import { onUpdate, startLoop } from './engine/loop.js';

import { state } from './state.js';
import { addSky } from './world/sky.js';
import { initDayNight } from './world/dayNight.js';
import { addGround } from './world/ground.js';
import { addForest } from './world/instancedForest.js';
import { addScenery } from './world/scenery.js';
import { addMountains } from './world/mountains.js';
import { addSkyDecor } from './world/skyDecor.js';

import { addFamily } from './entities/family.js';
import { addMachines } from './entities/machines.js';
import { addRainbowUnicorn } from './entities/rainbowUnicorn.js';
import { addPiano } from './entities/piano.js';
import { addFlag } from './entities/flag.js';
import { addRainPalm } from './entities/rainPalm.js';
import { addTechHouse } from './entities/techHouse.js';
import { addPool } from './entities/pool.js';
import { addGnome } from './entities/gnome.js';
import { addMagicHouse } from './entities/magicHouse.js';

import { initNotes } from './fx/floatingNotes.js';
import { autoStartOnGesture, toggleMusic } from './audio/music.js';
import { initControls } from './ui/controls.js';

// --- engine ---
const renderer = createRenderer();
const scene = createScene();
const camera = createCamera();
const controls = createControls(camera, renderer.domElement, state);
const { hemi, sun } = addLights(scene);

// --- environment ---
const { skyMat, stars } = addSky(scene);
initDayNight({ skyMat, stars, hemi, sun, scene });
addGround(scene);
addForest(scene, 400);
addScenery(scene);
addMountains(scene);
addSkyDecor(scene);
initNotes(scene);

// --- inhabitants & structures ---
addFamily(scene);
addMachines(scene);
addRainbowUnicorn(scene);
addPiano(scene);
addFlag(scene);
addRainPalm(scene);
const balthasar = addTechHouse(scene);   // camera can follow him
const pool = addPool(scene, camera, renderer.domElement);
addGnome(scene);
const magicHouse = addMagicHouse(scene);

// follow target for the camera
controls.setFollowTarget(balthasar);

// --- UI + audio ---
initControls({
  camControls: controls,
  onMusic: toggleMusic,
  onJump: pool.triggerJump,
  onDoor: magicHouse.toggleDoor,
});
autoStartOnGesture();

// camera update every frame
onUpdate((dt) => controls.update(dt));

startLoop(renderer, scene, camera);
