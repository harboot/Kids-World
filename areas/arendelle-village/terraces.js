import { insideClearance } from '../../core/interaction-clearance.js';

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
  railing(kit, terrace, [west, top, balcony.z - balcony.depth / 2], [west, top, south], 3, cap, rail);
  railing(kit, terrace, [west, top, south], [stairs.x - stairs.width / 2, top, south], 9, cap, rail);

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
    railing(kit, flight, [stairEnd, 0, z], [stairs.x - stairs.width / 2, top, z], 8, cap, rail);
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

export function railing({ box, beam }, node, a, b, sections, topColor, postColor) {
  const [x1, y1, z1] = a;
  const [x2, y2, z2] = b;
  const at = (t, height) => [
    x1 + (x2 - x1) * t, y1 + (y2 - y1) * t + height, z1 + (z2 - z1) * t,
  ];
  for (const height of [0.39, 1.02]) {
    beam(node, height > 0.5 ? topColor : postColor, at(0, height), at(1, height), 0.115, 0.14);
  }
  for (let i = 0; i <= sections; i++) {
    box(node, postColor, ...at(i / sections, 0.51), 0.105, 1.02, 0.105);
  }
}
