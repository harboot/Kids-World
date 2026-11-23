import { rectangleBounds } from '../../core/geometry.js';

export const floorRise = 3.25;
export const stories = 4;
export const stair = { inner: 9.9, outer: 12.4, top: -2.1, foot: 4.9, rear: -4.4, front: 7.15 };
export const gallery = { rear: -10.5, court: -7.5, outer: 15.35, front: 8.5, slab: .24 };
export const gateZ = 14.2;

export function courtyardLayout() {
  const surfaces = [];
  const guards = [];
  const obstacles = [];
  const { inner, outer, top, foot, rear, front } = stair;

  function surface(left, right, near, far, low, high = low, side = 1) {
    const x = side * (left + right) / 2;
    const z = (near + far) / 2;
    const bounds = rectangleBounds(x, z, right - left, far - near);
    const heightAt = low === high ? () => low : z => low + (high - low) * (far - z) / (far - near);
    const patch = { ...bounds, x, z, width: right - left, depth: far - near, low, high, heightAt };
    surfaces.push(patch);
    return patch;
  }

  function guard(x1, z1, x2, z2, low, high = low) {
    const length = Math.hypot(x2 - x1, z2 - z1);
    const rail = {
      x1, z1, x2, z2, low, high, length,
      ...rectangleBounds((x1 + x2) / 2, (z1 + z2) / 2, Math.abs(x2 - x1) + .18, Math.abs(z2 - z1) + .18),
    };
    guards.push(rail);
  }

  for (let level = 0; level < stories; level++) {
    const y = level * floorRise;
    surface(-gallery.outer, gallery.outer, gallery.rear, gallery.court, y);
    if (level > 0) guard(-outer, gallery.court, outer, gallery.court, y);
    for (const side of [-1, 1]) {
      surface(outer, gallery.outer, gallery.court, gallery.front, y, y, side);
      if (level > 0) {
        guard(side * outer, gallery.court, side * outer, rear, y);
        guard(side * outer, rear, side * inner, rear, y);
        surface(inner, outer, rear, top, y, y, side);
        guard(side * inner, rear, side * inner, top, y);
        guard(side * outer, top, side * outer, level === stories - 1 ? gallery.front : foot, y);
        guard(side * outer, gallery.front, side * gallery.outer, gallery.front, y);
      }
      if (level > 0 && level < stories - 1) {
        surface(inner, outer, foot, front, y, y, side);
        guard(side * inner, foot, side * inner, front, y);
        guard(side * inner, front, side * outer, front, y);
        guard(side * outer, front, side * outer, gallery.front, y);
      }
      if (level < stories - 1) {
        surface(inner, outer, top, foot, y, y + floorRise, side);
        guard(side * inner, foot, side * inner, top, y, y + floorRise);
        guard(side * outer, foot, side * outer, top, y, y + floorRise);
      }
    }
  }

  function solid(x, z, width, depth, height) {
    obstacles.push({ ...rectangleBounds(x, z, width, depth), height });
  }

  function distanceSquared(bounds, x, z) {
    const dx = Math.max(0, bounds.left - x, x - bounds.right);
    const dz = Math.max(0, bounds.front - z, z - bounds.back);
    return dx * dx + dz * dz;
  }

  return {
    surfaces, guards, obstacles, solid,
    getGroundHeight(x, z, feet = 0) {
      let ground = 0;
      // Keep the player on the current story while allowing a walking step uphill.
      for (const patch of surfaces) {
        if (distanceSquared(patch, x, z) !== 0) continue;
        const height = patch.heightAt(z);
        if (height <= feet + .22) ground = Math.max(ground, height);
      }
      return ground;
    },
    getCeilingHeight(x, z, feet = 0) {
      let ceiling = Infinity;
      for (const patch of surfaces) {
        if (distanceSquared(patch, x, z) !== 0) continue;
        const underside = patch.heightAt(z) - gallery.slab;
        if (feet < underside) ceiling = Math.min(ceiling, underside);
      }
      return ceiling;
    },
    blocksGround(x, z, radius, feet) {
      for (const rail of guards) {
        if (distanceSquared(rail, x, z) >= radius * radius) continue;
        const t = rail.z1 === rail.z2 ? 0 : Math.min(1, Math.max(0, (z - rail.z1) / (rail.z2 - rail.z1)));
        const height = rail.low + (rail.high - rail.low) * t;
        if (feet >= height - .36 && feet < height + 1.4) return true;
      }
      return false;
    },
  };
}
