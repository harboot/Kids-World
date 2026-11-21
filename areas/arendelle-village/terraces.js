import { insideClearance } from './clearance.js';
import { SURFACE_GAP } from '../../core/geometry.js';

const balcony = { x: -23.1, z: -12.5, width: 5.8, depth: 1.92 };
const stairs = { x: -17.45, z: -12.5, width: 5.5, depth: 1.72 };
const top = 2.4;
const stairEnd = stairs.x + stairs.width / 2;
const oak = 0x795437;
const rail = 0x5f4232;
const cap = 0xd8ab74;

export function buildHouseBalcony(kit) {
  const { group, box, beam } = kit;
  const terrace = group('Timber Hall balcony', 0, 0, 0);
  const flight = group('Timber Hall exterior stairs', 0, 0, 0);
  box(terrace, oak, balcony.x, top - 0.13, balcony.z, balcony.width, 0.26, balcony.depth, { shadow: true });
  for (const x of [-25.6, -23.9, -21.5]) {
    box(terrace, rail, x, (top - 0.15) / 2, -13.17, 0.20, top - 0.15, 0.24);
    beam(terrace, oak, [x, 1.38, -13.22], [x, top - 0.17, -11.75], 0.17);
  }
  const west = balcony.x - balcony.width / 2;
  const south = balcony.z + balcony.depth / 2;
  railing(kit, terrace, [
    [[west, top, balcony.z - balcony.depth / 2], [west, top, south], 3],
    [[west, top, south], [stairs.x - stairs.width / 2, top, south], 9],
  ], cap, rail);

  const steps = 15;
  for (let i = 0; i < steps; i++) {
    const rise = top * (i + 1) / steps;
    const x = stairEnd - (i + 0.5) * stairs.width / steps;
    box(flight, i % 2 ? oak : 0x926745, x, rise - 0.093, stairs.z, stairs.width / steps - 0.017, 0.186,
      stairs.depth, { shadow: true });
  }
  for (const side of [-1, 1]) {
    const z = stairs.z + side * stairs.depth / 2;
    beam(flight, rail, [stairEnd, -0.055, z], [stairs.x - stairs.width / 2, top - 0.16, z], 0.22, 0.16);
    railing(kit, flight, [[[stairEnd, 0, z], [stairs.x - stairs.width / 2, top, z], 8]], cap, rail);
  }

  function surface(x, z, feet = 0) {
    if (insideClearance(stairs, x, z)) {
      const height = top * (stairEnd - x) / stairs.width;
      if (height < 0.36 || feet >= height - 0.27) return height;
    }
    if (feet >= top - 0.27 && insideClearance(balcony, x, z)) return top;
  }

  function blocks(x, z, radius, feet, from) {
    const previous = surface(from.x, from.z, feet);
    if (previous === undefined || previous < 0.16) return false;
    if (x > stairEnd && previous < 0.28) return false;
    // Probe across the railing as well as beneath the player's center.
    return surface(x, z, feet) === undefined || surface(x, z - radius, feet) === undefined ||
      surface(x, z + radius, feet) === undefined || x < west + radius;
  }

  return { surface, blocks };
}

export function railing({ box, beam }, node, spans, topColor, postColor) {
  const ends = new Map();
  const topRail = 1.02;
  const railDepth = 0.14;
  const postWidth = 0.105;

  function post([x, y, z], height, width) {
    box(node, postColor, x, y + height / 2, z, width, height, width);
  }

  for (const [a, b, sections] of spans) {
    const raise = ([x, y, z], height) => [x, y + height, z];
    beam(node, postColor, raise(a, 0.39), raise(b, 0.39), 0.115, railDepth);
    beam(node, topColor, raise(a, topRail), raise(b, topRail), 0.115, railDepth);
    for (let i = 1; i < sections; i++) {
      post(a.map((start, axis) => start + (b[axis] - start) * i / sections), topRail, postWidth);
    }
    for (const point of [a, b]) {
      const key = point.join(',');
      ends.set(key, { point, shared: ends.has(key) });
    }
  }
  for (const { point, shared } of ends.values()) {
    // One larger post covers the ends of both rails at a corner.
    post(point, shared ? topRail + railDepth / 2 + SURFACE_GAP.detail : topRail,
      shared ? railDepth + 2 * SURFACE_GAP.detail : postWidth);
  }
}
