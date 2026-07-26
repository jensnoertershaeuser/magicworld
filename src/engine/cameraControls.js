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
    // phi is the angle between "straight up" and the camera-to-pivot arm:
    // small = you look down at the pivot, PI/2 = level, larger = you look up.
    minPhi: 0.15, maxPhi: Math.PI * 0.75,
  };

  // The camera always sits `radius` away from `target` in the direction given
  // by phi/theta. Both apply() and the free-look turning below use this arm.
  const _arm = new THREE.Vector3();
  function arm() {
    const { phi: p, theta: t, radius: r } = orbit;
    return _arm.set(r * Math.sin(p) * Math.sin(t), r * Math.cos(p), r * Math.sin(p) * Math.cos(t));
  }

  function apply() {
    camera.position.copy(orbit.target).add(arm());
    camera.lookAt(orbit.target);
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
  // On-screen touch buttons (ui/mobile.js) press the very same keys.
  function setKey(name, down) { keys[name] = down; }
  function releaseAllKeys() { for (const k in keys) keys[k] = false; }

  // FREE-LOOK TURNING
  // The naive version just changes phi/theta, which swings the camera around
  // the pivot like a satellite — you turn and find yourself somewhere else.
  // Instead we keep the camera exactly where it is and move the pivot to the
  // new viewing direction, so turning happens on the spot, like a person
  // looking around. Everything downstream (zoom, WASD, follow) still works,
  // because they all go through the same target + arm.
  function setAngles(theta, phi) {
    orbit.theta = theta;
    orbit.phi = clamp(phi, orbit.minPhi, orbit.maxPhi);
    orbit.target.copy(camera.position).sub(arm());
  }

  function rotate(dx, dy) {
    setAngles(orbit.theta - dx * 0.005, orbit.phi - dy * 0.005);
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
    // Auto-spin turns on the spot too, so it reads as a slow panorama instead
    // of the camera flying in a circle around the world.
    if (state && state.autoSpin) setAngles(orbit.theta + dt * 0.12, orbit.phi);
    if (state && state.follow && followTarget) {
      // Following pins the pivot to Balthasar, so turning orbits him instead.
      // If you were looking up, drop straight back to an over-the-shoulder
      // angle. Easing into it would drag the camera through the terrain, and
      // the jump is invisible anyway next to the leap onto Balthasar.
      orbit.phi = Math.min(orbit.phi, Math.PI * 0.45);
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

  return { update, orbit, setFollowTarget, setKey, releaseAllKeys };
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function touchDist(e) {
  const a = e.touches[0], b = e.touches[1];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}
