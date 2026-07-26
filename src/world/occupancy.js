// KEEP-OUT ZONES
//
// Anything that owns a patch of ground calls reserve(x, z, radius) while it
// builds itself. Whatever scatters things around (currently the forest) asks
// isFree() before placing each one, so trees never sprout inside the pool, a
// house, or a creature's walking circle.
//
// This is the same idea as the golden rule in the README: a new thing builds
// itself, registers its own animation — and now also declares its own space.
// Add reserve(...) to a new entity and the forest respects it automatically,
// with no edit to the forest.
//
// ORDER MATTERS: everything that reserves must be created BEFORE whatever
// scatters. That is why main.js builds the forest last.

const zones = [];

export function reserve(x, z, radius) {
  zones.push({ x, z, r: radius });
}

// `margin` is the radius of the thing you are about to place, so it keeps its
// whole body out of the zone instead of just its centre point.
export function isFree(x, z, margin = 0) {
  for (let i = 0; i < zones.length; i++) {
    const z0 = zones[i];
    const reach = z0.r + margin;
    const dx = x - z0.x, dz = z - z0.z;
    if (dx * dx + dz * dz < reach * reach) return false;
  }
  return true;
}

export function zoneCount() {
  return zones.length;
}
