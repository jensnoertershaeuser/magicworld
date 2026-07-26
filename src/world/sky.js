import * as THREE from 'three';

// Returns { skyMat, stars } so the day/night system can recolour them.
export function addSky(scene) {
  const geo = new THREE.SphereGeometry(300, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      top: { value: new THREE.Color(0x2a6fd6) },
      mid: { value: new THREE.Color(0x6fb4f0) },
      bottom: { value: new THREE.Color(0xcfeaff) },
    },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP;
      void main(){
        float h = normalize(vP).y;
        vec3 c = h > 0.0 ? mix(mid, top, h) : mix(mid, bottom, -h);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(geo, skyMat));

  const pos = [];
  for (let i = 0; i < 800; i++) {
    const r = 260, u = Math.random(), v = Math.random();
    const th = 2 * Math.PI * u, ph = Math.acos(2 * v - 1);
    const y = r * Math.cos(ph);
    if (y < -20) continue;
    pos.push(r * Math.sin(ph) * Math.cos(th), y, r * Math.sin(ph) * Math.sin(th));
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.0, transparent: true, opacity: 0.0 }));
  stars.visible = false; // day starts starless; dayNight.js fades them in at night
  scene.add(stars);

  return { skyMat, stars };
}
