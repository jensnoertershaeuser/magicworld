import { addWalker } from './character.js';

// Papa, Mama and Oma Annette walk the central meadow. Balthasar and Opa Klaus
// are seated in the tech house (see techHouse.js), so they are not here.
export function addFamily(scene) {
  addWalker(scene, { name: 'Papa', height: 1.80, hair: 0xe8c56a, shirt: 0x3b6ea5, pants: 0x2c3e50, labelColor: '#6ee7ff', radius: 14, speed: 2.6 });
  addWalker(scene, { name: 'Mama', height: 1.56, hair: 0x6b4423, shirt: 0xe0607e, pants: 0x5b3a6b, labelColor: '#ff9ec7', radius: 10, speed: 2.4 });
  addWalker(scene, { name: 'Oma Annette', height: 1.68, hair: 0xe8c56a, shirt: 0x8e6bd6, pants: 0x4a3a6b, labelColor: '#c9a8ff', radius: 17, speed: 2.1 });
}
