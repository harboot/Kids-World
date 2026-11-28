import { heightGrid, mix, nearest, route, smooth } from './landform.js';

export const shaft = { x: 28, z: -56, half: 2, lower: 7.65, upper: 17.45 };
export const aditEntryZ = -34;
const access = route([
  [-12, -32.5, 1.54], [-5, -33, 2.02], [0, aditEntryZ, 2.64],
  [6, -36.4, 3.38], [12, -40, 4.45], [18, -44, 5.65],
  [22, -49, 6.64], [24, -54, 7.45], [26, -56, shaft.lower], [shaft.x, shaft.z, shaft.lower],
]);

export function shaftContains(x, z, margin = 0) {
  return Math.abs(x - shaft.x) <= shaft.half + margin && Math.abs(z - shaft.z) <= shaft.half + margin;
}

export function aditOpening(x, z) {
  const trail = nearest(access, x, z);
  const trace = 2.85 - trail.offset + smooth(0, 5, x) * Math.sin(x * 0.83 + z * 0.31) * 0.26;
  const landing = 5.15 - Math.hypot((x - 27) * 0.91, z - shaft.z);
  return Math.max(trace, landing);
}

export function aditHeight(x, z) {
  const trail = nearest(access, x, z);
  return mix(shaft.lower, trail.y, smooth(3.8, 7.6, Math.hypot(x - shaft.x, z - shaft.z)));
}

export function aditCeiling(x, z) {
  return aditHeight(x, z) + 3.25 + smooth(0, 3, x) * (0.21 * Math.sin(x * 0.72 + z * 0.34)
    + 0.16 * Math.cos(x * 0.51 - z * 0.62));
}

export function createLowerAdit() {
  return {
    opening: heightGrid(0, 36, -64, -26, aditOpening),
    floor: heightGrid(0, 36, -64, -26, aditHeight),
    ceiling: heightGrid(0, 36, -64, -26, aditCeiling),
  };
}
