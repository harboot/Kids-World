import { rectangleBounds } from '../../core/geometry.js';
import { overlaps } from '../../core/movement.js';

export const UPSTAIRS = 3.36;
export const SIDE = 8.65;
export const BACK = -5.4;
export const FRONT = 5.7;

const STAIR_WIDTH = 2.04;
// Align the wall edge of the treads with the face of the front baseboard.
const SHAFT_BACK = FRONT - .20;
export const STAIR_Z = SHAFT_BACK - STAIR_WIDTH / 2;
export const STAIR_START = 6.30;
export const STAIR_END = .30;
const STAIR_LENGTH = STAIR_START - STAIR_END;
const SHAFT_FRONT = STAIR_Z - STAIR_WIDTH / 2;
const WALL = 0.18;
const layers = [0xc2926a, 0xd0a078, 0xdbac85, 0xc99971];

function onStairs(x, z) {
  return x > STAIR_END && x <= STAIR_START && z >= SHAFT_FRONT && z <= SHAFT_BACK;
}

export function buildUpperFloor({ group, part, solid }) {
  const root = group('Second floor and staircase', 0, 0, 0);
  const panels = [
    [-SIDE, SIDE, BACK, SHAFT_FRONT],
    [-SIDE, STAIR_END, SHAFT_FRONT, FRONT],
    [STAIR_START, SIDE, SHAFT_FRONT, FRONT],
  ];
  // Leave a continuous opening through the floor above the stairs.
  for (const [left, right, front, back] of panels) {
    part(root, 0xd9a777, (left + right) / 2, UPSTAIRS - .105,
      (front + back) / 2, right - left, .21, back - front);
    const rows = Math.ceil((back - front) / .34);
    const size = (back - front) / rows;
    for (let i = 0; i < rows; i++) {
      part(root, layers[i % layers.length], (left + right) / 2, UPSTAIRS - .012,
        front + (i + .5) * size, right - left - .012, .026, size - .011);
    }
  }

  const count = 18;
  const tread = STAIR_LENGTH / count;
  const rise = UPSTAIRS / count;
  const middle = (STAIR_START + STAIR_END) / 2;
  for (let i = 0; i < count; i++) {
    const height = (i + .5) * rise;
    const x = STAIR_START - (i + .5) * tread;
    part(root, layers[i % layers.length], x, height / 2, STAIR_Z, tread, height, STAIR_WIDTH);
  }
  const railZ = SHAFT_FRONT - .06;
  for (let i = 0; i <= 6; i++) {
    const x = STAIR_START - i * STAIR_LENGTH / 6;
    const base = i * UPSTAIRS / 6;
    part(root, 0x855b40, x, base + .43, railZ, .12, .86, .12);
  }
  part(root, 0x855b40, middle, UPSTAIRS / 2 + .89, railZ, Math.hypot(STAIR_LENGTH, UPSTAIRS), .12, .13)
    .rotation.z = -Math.atan2(UPSTAIRS, STAIR_LENGTH);
  solid(middle, railZ, STAIR_LENGTH, .14, UPSTAIRS + 1.5, 'stairs');

  function wall(x, z, width, depth, tint) {
    part(root, tint, x, UPSTAIRS + 1.58, z, width, 3.16, depth);
    part(root, 0xa56e52, x, UPSTAIRS + .10, z, width + .025, .20, depth + .025);
    solid(x, z, width, depth, UPSTAIRS + 3.18, UPSTAIRS);
  }

  const hall = -.6;
  wall(0, (BACK + hall) / 2, WALL, hall - BACK, 0xe1cbcf);
  wall(6.1, (BACK + hall) / 2, WALL, hall - BACK, 0xdec6c5);
  for (const [left, right, doorway, tint] of [[-SIDE, 0, -6.55, 0xa9c7d4], [0, 6.1, 2.06, 0xdcb6c6]]) {
    const start = doorway - .86;
    const end = doorway + .86;
    for (const [a, b] of [[left, start], [end, right]]) wall((a + b) / 2, hall, b - a, WALL, tint);
    part(root, tint, doorway, UPSTAIRS + 2.76, hall, 1.72, .8, WALL);
    for (const x of [start, end]) part(root, 0x966445, x, UPSTAIRS + 1.19, hall + .055, .12, 2.38, .16);
    part(root, 0x966445, doorway, UPSTAIRS + 2.37, hall + .055, 1.82, .12, .16);
    part(root, tint, doorway, UPSTAIRS + 2.69, hall + .12, .65, .25, .045);
  }

  for (const [x, z, width, depth] of [
    [middle, SHAFT_FRONT - .08, STAIR_LENGTH, .13],
    [STAIR_START + .08, STAIR_Z, .12, STAIR_WIDTH],
  ]) {
    part(root, 0x855b40, x, UPSTAIRS + .92, z, width, .125, depth);
    for (const offset of [-.35, 0, .35]) {
      part(root, 0xb47f56, x + (width > depth ? width * offset : 0),
        UPSTAIRS + .43, z + (depth > width ? depth * offset : 0), .11, .86, .11);
    }
    solid(x, z, width, depth, UPSTAIRS + 1.56, UPSTAIRS);
  }
}

export function houseGround(x, z, feet) {
  if (onStairs(x, z)) return (STAIR_START - x) / STAIR_LENGTH * UPSTAIRS;
  return feet >= UPSTAIRS - .14 ? UPSTAIRS : 0;
}

export function houseCeiling(x, z, feet = 0) {
  if (Math.abs(x) > SIDE || z > FRONT || z < BACK) return Infinity;
  if (feet < UPSTAIRS - .14 && !onStairs(x, z)) {
    return UPSTAIRS - .21;
  }
  return UPSTAIRS + 3.16;
}

export function upstairsBlockers() {
  const blockers = [];
  return {
    add(x, z, width, depth, height, floor) {
      blockers.push({ ...rectangleBounds(x, z, width, depth), height, floor });
    },
    blocks(x, z, feet) {
      return blockers.some(item => {
        const floor = item.floor === 'stairs' ? houseGround(x, STAIR_Z, 0) : item.floor;
        return feet >= floor - .13 && feet < item.height && overlaps(item, x, z);
      });
    },
  };
}
