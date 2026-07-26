import { createRenderer } from './engine/renderer.js';
import { createScene } from './engine/scene.js';
import { createCamera, createControls } from './engine/cameraControls.js';
import { addLights } from './engine/lights.js';
import { onUpdate, startLoop } from './engine/loop.js';

import { addSky } from './world/sky.js';
import { addGround } from './world/ground.js';
import { addForest } from './world/instancedForest.js';

import { addCharacter } from './entities/character.js';

// --- boot the engine ---
const renderer = createRenderer();
const scene = createScene();
const camera = createCamera();
const controls = createControls(camera, renderer.domElement);
addLights(scene);

// --- build the world ---
addSky(scene);
addGround(scene);
addForest(scene, 400); // 400 trees, 2 draw calls

// --- add the family (each self-animates) ---
addCharacter(scene, { name: 'Papa', height: 1.80, hair: 0xe8c56a, shirt: 0x3b6ea5, radius: 14, speed: 2.6 });
addCharacter(scene, { name: 'Mama', height: 1.56, hair: 0x6b4423, shirt: 0xe0607e, radius: 10, speed: 2.4 });
addCharacter(scene, { name: 'Balthasar', height: 1.07, hair: 0xe8c56a, shirt: 0x2fae6a, radius: 6, speed: 2.9 });

// camera responds to WASD every frame
onUpdate((dt) => controls.update(dt));

startLoop(renderer, scene, camera);
