import { createRenderer } from './engine/renderer.js';
import { createScene } from './engine/scene.js';
import { createCamera, createControls } from './engine/cameraControls.js';
import { addLights } from './engine/lights.js';
import { onUpdate, startLoop } from './engine/loop.js';

import { state } from './state.js';
import { addSky } from './world/sky.js';
import { initDayNight } from './world/dayNight.js';
import { addGround, heightAt } from './world/ground.js';
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
import { addWoodWorkshop } from './entities/woodWorkshop.js';

import { initNotes } from './fx/floatingNotes.js';
import { autoStartOnGesture, startMusic, stopMusic } from './audio/music.js';
import { initControls } from './ui/controls.js';
import { dismissSplash, initSplashTip } from './ui/splash.js';
import { initMobile } from './ui/mobile.js';

// --- engine ---
const renderer = createRenderer();
const scene = createScene();
const camera = createCamera();
const controls = createControls(camera, renderer.domElement, state, heightAt);
const { hemi, sun } = addLights(scene);

// --- environment ---
const { skyMat, stars } = addSky(scene);
initDayNight({ skyMat, stars, hemi, sun, scene });
addGround(scene);
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
const techHouse = addTechHouse(scene);   // camera can follow Balthasar
const pool = addPool(scene, camera, renderer.domElement);
addGnome(scene);
const magicHouse = addMagicHouse(scene);
// Last of the ground-owning modules, so its own ring of trees can dodge
// everything above it (see the isFree() call in woodWorkshop.js).
const workshop = addWoodWorkshop(scene);

// --- forest LAST ---
// Every module above reserves the ground it occupies (world/occupancy.js), and
// the forest fills whatever is left over. Move this line back up and trees will
// start growing through the houses again.
addForest(scene, 400);

// follow target for the camera
controls.setFollowTarget(techHouse.follow);

// --- UI + audio ---
initControls({
  onSound: toggleSound,
  onJump: pool.triggerJump,
  onDoor: magicHouse.toggleDoor,
  onBuild: techHouse.toggleBuild,
  onCarve: workshop.nextCarving,
});
initMobile({ camControls: controls });   // no-op on desktop / tablet
initSplashTip();
autoStartOnGesture();

// One switch for the melody and the sound effects alike; sfx.js reads the flag.
function toggleSound() {
  state.sound = !state.sound;
  if (state.sound) startMusic(); else stopMusic();
  return state.sound;
}

// camera update every frame
onUpdate((dt) => controls.update(dt));

startLoop(renderer, scene, camera);

// The world is built and the first frame is on its way — let the splash go.
dismissSplash();
