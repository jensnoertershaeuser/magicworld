import * as THREE from 'three';

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 700);
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });
  return camera;
}

// A small self-contained orbit camera with WASD panning, ported from the
// prototype. No external dependency, so it can't break on a Three.js update.
// `state` (optional) drives autoSpin and follow.
export function createControls(camera, dom, state = null) {
  const orbit = {
    target: new THREE.Vector3(0, 2, 0),
    theta: Math.PI * 0.25,
    phi: Math.PI * 0.38,
    radius: 40,
    minR: 8, maxR: 120,
    minPhi: 0.15, maxPhi: Math.PI * 0.49,
  };

  function apply() {
    const { phi: p, theta: t, radius: r, target } = orbit;
    camera.position.set(
      target.x + r * Math.sin(p) * Math.sin(t),
      target.y + r * Math.cos(p),
      target.z + r * Math.sin(p) * Math.cos(t),
    );
    camera.lookAt(target);
  }
  apply();

  let dragging = false, panning = false, lastX = 0, lastY = 0, pinch = 0;
  const stopSpin = () => { if (state) state.autoSpin = false; };
  dom.addEventListener('contextmenu', (e) => e.preventDefault());
  dom.addEventListener('mousedown', (e) => { dragging = true; panning = e.button === 2; lastX = e.clientX; lastY = e.clientY; stopSpin(); });
  window.addEventListener('mouseup', () => { dragging = false; panning = false; });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    if (panning) pan(dx, dy); else rotate(dx, dy);
  });
  dom.addEventListener('wheel', (e) => {
    e.preventDefault();
    orbit.radius = clamp(orbit.radius + e.deltaY * 0.04, orbit.minR, orbit.maxR);
  }, { passive: false });

  dom.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) { lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; dragging = true; stopSpin(); }
    else if (e.touches.length === 2) { dragging = false; pinch = touchDist(e); }
  }, { passive: false });
  dom.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && dragging) {
      rotate(e.touches[0].clientX - lastX, e.touches[0].clientY - lastY);
      lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      const d = touchDist(e);
      orbit.radius = clamp(orbit.radius + (pinch - d) * 0.06, orbit.minR, orbit.maxR);
      pinch = d;
    }
  }, { passive: false });
  dom.addEventListener('touchend', () => { dragging = false; });

  const keys = {};
  window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
  window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

  function rotate(dx, dy) {
    orbit.theta -= dx * 0.005;
    orbit.phi = clamp(orbit.phi - dy * 0.005, orbit.minPhi, orbit.maxPhi);
  }
  function pan(dx, dy) {
    const speed = orbit.radius * 0.0015;
    const fwd = new THREE.Vector3().subVectors(orbit.target, camera.position).setY(0).normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    orbit.target.addScaledVector(right, -dx * speed);
    orbit.target.addScaledVector(fwd, -dy * speed);
  }

  let followTarget = null;
  function setFollowTarget(obj) { followTarget = obj; }

  function update(dt) {
    if (state && state.autoSpin) orbit.theta += dt * 0.12;
    if (state && state.follow && followTarget) {
      orbit.target.lerp(followTarget.position, Math.min(1, dt * 2));
    }
    const speed = 20 * dt;
    const fwd = new THREE.Vector3().subVectors(orbit.target, camera.position).setY(0);
    if (fwd.lengthSq() > 1e-4) {
      fwd.normalize();
      const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
      if (keys['w'] || keys['arrowup']) orbit.target.addScaledVector(fwd, speed);
      if (keys['s'] || keys['arrowdown']) orbit.target.addScaledVector(fwd, -speed);
      if (keys['a'] || keys['arrowleft']) orbit.target.addScaledVector(right, -speed);
      if (keys['d'] || keys['arrowright']) orbit.target.addScaledVector(right, speed);
      if (keys['e']) orbit.target.y += speed;
      if (keys['q']) orbit.target.y -= speed;
    }
    apply();
  }

  return { update, orbit, setFollowTarget };
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function touchDist(e) {
  const a = e.touches[0], b = e.touches[1];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}
