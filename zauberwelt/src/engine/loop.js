// The heartbeat of the world.
//
// Anything that needs to animate registers an update function with onUpdate().
// The loop calls every registered function once per frame with:
//   dt      = seconds since last frame (already capped, so tab-switches don't explode)
//   elapsed = seconds since the page loaded
//
// This "registry" is the key to scaling: a new feature just calls onUpdate(...)
// and never has to touch the central loop. That keeps files small and
// independent, which is exactly what makes Claude Code edits safe and fast.

const updatables = [];

export function onUpdate(fn) {
  updatables.push(fn);
}

export function startLoop(renderer, scene, camera) {
  let last = performance.now();

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const elapsed = now / 1000;

    for (let i = 0; i < updatables.length; i++) {
      updatables[i](dt, elapsed);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
