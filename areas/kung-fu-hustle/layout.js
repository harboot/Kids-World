import { PLAYER_RADIUS } from '../../core/movement.js';
import { rectangleBounds } from '../../core/geometry.js';

export const floorRise = 3.25;
export const stories = 4;
export const stair = { inner: 10.8, outer: 12.4, top: -2.1, foot: 4.9, rear: -4.4, front: 7.15 };
export const gallery = { rear: -10.5, court: -7.5, outer: 15.35, front: 8.5, slab: .24 };
export const perimeterCap = { height: 1.92, width: .67 };
export const guardCaps = {
  wood: { offset: 1.12, width: .172 },
  iron: { offset: 1.02, width: .067 },
};
export const gateZ = 20.4;
export const gateHalfWidth = 6.7;
export const wingSlope = .48;
export const footprint = [
  [-19.2, -15.6], [19.2, -15.6], [29.2, 9.2],
  [20.2, gateZ], [-20.2, gateZ], [-29.2, 9.2],
];
const boundary = footprint.map(([x, z], i) => {
  const [nextX, nextZ] = footprint[(i + 1) % footprint.length];
  return { x, z, dx: nextX - x, dz: nextZ - z };
});

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
  const ledges = [];
  const obstacles = [];
  const barriers = [];
  const ceilings = [];
  const { inner, outer, top, foot, rear, front } = stair;

  function surface(left, right, near, far, low, high = low, side = 0, axis = 'z') {
    const x = (side || 1) * (left + right) / 2;
    const z = (near + far) / 2;
    const bounds = rectangleBounds(x, z, right - left, far - near);
    const start = axis === 'x' ? right : far;
    const run = axis === 'x' ? right - left : far - near;
    const heightAt = (x, z) => low + (high - low) * Math.min(1, Math.max(0, (start - (axis === 'x' ? x : z)) / run));
    const patch = { ...bounds, x, z, width: right - left, depth: far - near, low, high, heightAt, side, axis };
    surfaces.push(patch);
    return patch;
  }

  function guard(x1, z1, x2, z2, low, high = low, side = 0, repaired = false) {
    x1 = wingX(side, x1, z1);
    x2 = wingX(side, x2, z2);
    const length = Math.hypot(x2 - x1, z2 - z1);
    const cap = repaired ? guardCaps.iron : guardCaps.wood;
    const halfWidth = cap.width / 2;
    const offset = cap.offset + halfWidth * Math.hypot(length, high - low) / length;
    const ledge = { x1, z1, x2, z2, low, high, halfWidth, offset };
    ledges.push(ledge);
    guards.push({ ...ledge, length, repaired });
  }

  // The ground floor uses a wide L stair. The upper flight climbs across the rear gallery.
  const halfway = floorRise / 2;
  surface(2, 8.55, -1.9, 1.1, 0, halfway, 0, 'x');
  surface(-1, 2, -1.9, 1.1, halfway);
  surface(-1, 2, gallery.court, -1.9, halfway, floorRise);
  for (const z of [-1.9, 1.1]) guard(8.55, z, 2, z, 0, halfway);
  guard(-1, 1.1, 2, 1.1, halfway);
  guard(-1, 1.1, -1, -1.9, halfway);
  guard(-1, -1.9, -1, gallery.court, halfway, floorRise);
  guard(2, -1.9, 2, gallery.court, halfway, floorRise);

  const upperLow = floorRise * 2;
  const upperHigh = floorRise * 3;
  surface(-3.75, 4.05, -5.5, -3.5, upperLow, upperHigh, 0, 'x');
  for (const z of [-5.5, -3.5]) guard(4.05, z, -3.75, z, upperLow, upperHigh);
  for (const [left, right, y, end] of [[4.05, 6.25, upperLow, 6.25], [-5.95, -3.75, upperHigh, -5.95]]) {
    surface(left, right, gallery.court, -3.5, y);
    guard(left, -3.5, right, -3.5, y);
    guard(end, -3.5, end, gallery.court, y);
    const stairEnd = end === left ? right : left;
    guard(stairEnd, -5.5, stairEnd, gallery.court, y);
  }

  const galleryOpenings = [[-1, 2], [4.05, 6.25], [-5.95, -3.75]];
  for (let level = 0; level < stories; level++) {
    const y = level * floorRise;
    if (level >= 2) {
      const [left, right, brokenEdge] = [5.72, 12.72, -8.98];
      surface(-gallery.outer, left, gallery.rear, gallery.court, y);
      surface(left, right, brokenEdge, gallery.court, y);
      surface(right, gallery.outer, gallery.rear, gallery.court, y);
      guard(left, gallery.rear, left, brokenEdge, y, y, 0, true);
      guard(left, brokenEdge, right, brokenEdge, y, y, 0, true);
      guard(right, brokenEdge, right, gallery.rear, y, y, 0, true);
    } else {
      surface(-gallery.outer, gallery.outer, gallery.rear, gallery.court, y);
    }
    if (level > 0) {
      const [left, right] = galleryOpenings[level - 1];
      guard(-outer, gallery.court, left, gallery.court, y);
      if (level >= 2) {
        const repairedFrom = Math.max(right, 6.25);
        if (right < repairedFrom) guard(right, gallery.court, repairedFrom, gallery.court, y);
        guard(repairedFrom, gallery.court, outer, gallery.court, y, y, 0, true);
      } else {
        guard(right, gallery.court, outer, gallery.court, y);
      }
    }
    for (const side of [-1, 1]) {
      const rail = (x1, z1, x2, z2, low = y, high = low) => guard(side * x1, z1, side * x2, z2, low, high, side);
      const deck = (x1, x2, z1, z2, low = y, high = low) => surface(x1, x2, z1, z2, low, high, side);
      deck(outer, gallery.outer, gallery.court, gallery.front);
      if (!level) continue;
      rail(outer, gallery.front, gallery.outer, gallery.front);
      if (level === 1) {
        deck(inner, outer, foot, front);
        rail(outer, gallery.court, outer, foot);
        rail(outer, front, outer, gallery.front);
        rail(inner, front, outer, front);
        rail(inner, front, inner, foot);
        deck(inner, outer, top, foot, y, y + floorRise);
        rail(inner, foot, inner, top, y, y + floorRise);
        rail(outer, foot, outer, top, y, y + floorRise);
      } else if (level === 2) {
        deck(inner, outer, rear, top);
        rail(outer, gallery.court, outer, rear);
        rail(outer, top, outer, gallery.front);
        rail(inner, rear, outer, rear);
        rail(inner, rear, inner, top);
      } else {
        rail(outer, gallery.court, outer, gallery.front);
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
    const ledge = { x1, z1, x2, z2, low: 0, high: 0, halfWidth: perimeterCap.width / 2, offset: perimeterCap.height };
    edges.push(ledge);
    ledges.push(ledge);
  }

  function ledgeHeight({ x1, z1, x2, z2, low, high, offset, halfWidth }, x, z, radius = PLAYER_RADIUS) {
    const t = nearestFraction(x1, z1, x2, z2, x, z);
    if (segmentDistanceSquared(x1, z1, x2, z2, x, z, t) >= (halfWidth + radius) ** 2) return -Infinity;
    return low + (high - low) * t + offset;
  }

  function standsOnLedge(ledge, x, z, feet) {
    return Math.abs(ledgeHeight(ledge, x, z) - feet) <= .014;
  }

  return {
    surfaces, guards, obstacles, solid, perimeter, addBarrier: barrier => barriers.push(barrier),
    addCeiling(x, z, width, depth, height, side) {
      ceilings.push({ ...rectangleBounds(x, z, width, depth), height, side });
    },
    getGroundHeight(x, z, feet = 0) {
      let ground = 0;
      // Keep the player on the current story while allowing a walking step uphill.
      for (const patch of surfaces) {
        const localX = wingX(-patch.side, x, z);
        if (!inside(patch, localX, z)) continue;
        const height = patch.heightAt(localX, z);
        if (height <= feet + .22) ground = Math.max(ground, height);
      }
      for (const ledge of ledges) {
        if (ledge.low + ledge.offset > feet + .22) continue;
        const height = ledgeHeight(ledge, x, z);
        if (height <= feet + .22) ground = Math.max(ground, height);
      }
      return ground;
    },
    getCeilingHeight(x, z, feet = 0) {
      let ceiling = Infinity;
      for (const roof of ceilings) {
        if (feet < roof.height && inside(roof, wingX(-roof.side, x, z), z)) ceiling = Math.min(ceiling, roof.height);
      }
      for (const patch of surfaces) {
        const localX = wingX(-patch.side, x, z);
        if (!inside(patch, localX, z)) continue;
        const underside = patch.heightAt(localX, z) - gallery.slab;
        if (feet < underside) ceiling = Math.min(ceiling, underside);
      }
      return ceiling;
    },
    canDropFrom(x, z, feet) {
      return ledges.some(ledge => standsOnLedge(ledge, x, z, feet));
    },
    blocksGround(x, z, radius, feet, from) {
      // The raised outer wall can support the player within the compound outline.
      if (boundary.some(edge => edge.dx * (z - edge.z) - edge.dz * (x - edge.x) < -1e-6)) return true;
      if (barriers.some(blocks => blocks(x, z, radius, feet))) return true;
      for (const ledge of edges) {
        if (feet + .002 < ledgeHeight(ledge, x, z, radius)) return true;
      }
      for (const ledge of guards) {
        if (feet < ledge.low - .36 || feet >= ledge.high + ledge.offset) continue;
        const height = ledgeHeight(ledge, x, z, radius);
        if (feet < height - ledge.offset - .36 || feet + .002 >= height) continue;
        if (from && standsOnLedge(ledge, from.x, from.z, feet)) continue;
        return true;
      }
      return false;
    },
  };
}
