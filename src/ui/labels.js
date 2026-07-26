import * as THREE from 'three';

// Floating text labels (billboards) used for names and building signs.
// Every label registers here so the "Schilder" button can show/hide them all.
const sprites = [];

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function makeLabel(text, color = '#ffffff') {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(25,18,51,0.82)';
  roundRect(ctx, 6, 6, 244, 52, 16); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 3;
  roundRect(ctx, 6, 6, 244, 52, 16); ctx.stroke();
  ctx.font = 'bold 30px Trebuchet MS, sans-serif';
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 34);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(c), transparent: true, depthTest: false,
  }));
  spr.scale.set(3.2, 0.8, 1);
  sprites.push(spr);
  return spr;
}

export function setLabelsVisible(v) {
  sprites.forEach((s) => (s.visible = v));
}
