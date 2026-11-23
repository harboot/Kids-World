import { PLAYER_RADIUS } from '../../core/movement.js';
import { rectangleBounds } from '../../core/geometry.js';

export const floorRise = 3.25;
export const stories = 4;
export const stair = { inner: 9.9, outer: 12.4, top: -2.1, foot: 4.9, rear: -4.4, front: 7.15 };
export const gallery = { rear: -10.5, court: -7.5, outer: 15.35, front: 8.5, slab: .24 };
export const gateZ = 14.2;
export const wingSlope = .48;
export const footprint = [
  [-19.2, -15.6], [19.2, -15.6], [29.2, 9.2],
  [25.2, gateZ], [-25.2, gateZ], [-29.2, 9.2],
];

export function wingX(side, x, z) {
  return x + side * wingSlope * (z - gallery.court);
}

function nearestFraction(x1, z1, x2, z2, x, z) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  return Math.min(1, Math.max(0, ((x - x1) * dx + (z - z1) * dz) / (dx * dx + dz * dz)));
}

function segmentDistanceSquared(x1, z1, x2, z2, x, z, t = nearestFraction(x1, z1, x2, z2, x, z)) {
  return (x - x1 - (x2 - x1) * t) ** 2 + (z - z1 - (z2 - z1) * t) ** 2;
}

function inside(bounds, x, z) {
  return x >= bounds.left - 1e-8 && x <= bounds.right + 1e-8 &&
    z >= bounds.front - 1e-8 && z <= bounds.back + 1e-8;
}

export function courtyardLayout() {
  const surfaces = [];
  const guards = [];
  const edges = [];
  const obstacles = [];
  const { inner, outer, top, foot, rear, front } = stair;

  function surface(left, right, near, far, low, high = low, side = 0) {
    const x = (side || 1) * (left + right) / 2;
    const z = (near + far) / 2;
    const bounds = rectangleBounds(x, z, right - left, far - near);
    const heightAt = low === high ? () => low : z => low + (high - low) * (far - z) / (far - near);
    const patch = { ...bounds, x, z, width: right - left, depth: far - near, low, high, heightAt, side };
    surfaces.push(patch);
    return patch;
  }

  function guard(x1, z1, x2, z2, low, high = low, side = 0) {
    x1 = wingX(side, x1, z1);
    x2 = wingX(side, x2, z2);
    const length = Math.hypot(x2 - x1, z2 - z1);
    guards.push({ x1, z1, x2, z2, low, high, length });
  }

  for (let level = 0; level < stories; level++) {
    const y = level * floorRise;
    surface(-gallery.outer, gallery.outer, gallery.rear, gallery.court, y);
    if (level > 0) guard(-outer, gallery.court, outer, gallery.court, y);
    for (const side of [-1, 1]) {
      surface(outer, gallery.outer, gallery.court, gallery.front, y, y, side);
      if (level > 0) {
        guard(side * outer, gallery.court, side * outer, rear, y, y, side);
        guard(side * outer, rear, side * inner, rear, y, y, side);
        surface(inner, outer, rear, top, y, y, side);
        guard(side * inner, rear, side * inner, top, y, y, side);
        guard(side * outer, top, side * outer, level === stories - 1 ? gallery.front : foot, y, y, side);
        guard(side * outer, gallery.front, side * gallery.outer, gallery.front, y, y, side);
      }
      if (level > 0 && level < stories - 1) {
        surface(inner, outer, foot, front, y, y, side);
        guard(side * inner, foot, side * inner, front, y, y, side);
        guard(side * inner, front, side * outer, front, y, y, side);
        guard(side * outer, front, side * outer, gallery.front, y, y, side);
      }
      if (level < stories - 1) {
        surface(inner, outer, top, foot, y, y + floorRise, side);
        guard(side * inner, foot, side * inner, top, y, y + floorRise, side);
        guard(side * outer, foot, side * outer, top, y, y + floorRise, side);
      }
    }
  }

  function solid(x, z, width, depth, height, side = 0) {
    const bounds = rectangleBounds(x, z, width, depth);
    if (!side) {
      obstacles.push({ ...bounds, height });
      return;
    }
    const { left, right, front, back } = bounds;
    const points = [[left, front], [right, front], [right, back], [left, back]]
      .map(([u, v]) => [wingX(side, u, v), v]);
    obstacles.push({
      height,
      touches(px, pz) {
        if (inside(bounds, wingX(-side, px, pz), pz)) return true;
        return points.some(([x1, z1], i) => {
          const [x2, z2] = points[(i + 1) % points.length];
          return segmentDistanceSquared(x1, z1, x2, z2, px, pz) < PLAYER_RADIUS ** 2;
        });
      },
    });
  }

  function perimeter(x1, z1, x2, z2) {
    edges.push({ x1, z1, x2, z2 });
  }

  return {
    surfaces, guards, obstacles, solid, perimeter,
    getGroundHeight(x, z, feet = 0) {
      let ground = 0;
      // Keep the player on the current story while allowing a walking step uphill.
      for (const patch of surfaces) {
        if (!inside(patch, wingX(-patch.side, x, z), z)) continue;
        const height = patch.heightAt(z);
        if (height <= feet + .22) ground = Math.max(ground, height);
      }
      return ground;
    },
    getCeilingHeight(x, z, feet = 0) {
      let ceiling = Infinity;
      for (const patch of surfaces) {
        if (!inside(patch, wingX(-patch.side, x, z), z)) continue;
        const underside = patch.heightAt(z) - gallery.slab;
        if (feet < underside) ceiling = Math.min(ceiling, underside);
      }
      return ceiling;
    },
    blocksGround(x, z, radius, feet) {
      for (const { x1, z1, x2, z2 } of edges) {
        if (segmentDistanceSquared(x1, z1, x2, z2, x, z) < (radius + .27) ** 2) return true;
      }
      for (const { x1, z1, x2, z2, low, high } of guards) {
        if (feet < low - .36 || feet >= high + 1.4) continue;
        const t = nearestFraction(x1, z1, x2, z2, x, z);
        if (segmentDistanceSquared(x1, z1, x2, z2, x, z, t) >= (radius + .09) ** 2) continue;
        const height = low + (high - low) * t;
        if (feet >= height - .36 && feet < height + 1.4) return true;
      }
      return false;
    },
  };
}
