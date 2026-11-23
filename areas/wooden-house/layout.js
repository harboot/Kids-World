import { rectangleBounds } from '../../core/geometry.js';
import { overlaps } from '../../core/movement.js';

export const UPSTAIRS = 3.36;
export const SIDE = 8.65;
export const BACK = -5.4;
export const FRONT = 5.7;

const STAIR_X = 7.22;
const STAIR_WIDTH = 1.88;
const STAIR_START = -3.92;
const STAIR_END = 2.08;
const SHAFT_LEFT = STAIR_X - STAIR_WIDTH / 2;
const SHAFT_RIGHT = STAIR_X + STAIR_WIDTH / 2;
const WALL = 0.18;
const layers = [0xc2926a, 0xd0a078, 0xdbac85, 0xc99971];

function onStairs(x, z) {
  return x >= SHAFT_LEFT && x <= SHAFT_RIGHT && z >= STAIR_START && z < STAIR_END;
}

export function buildUpperFloor({ group, part, solid }) {
  const root = group('Second floor and staircase', 0, 0, 0);
  const panels = [
    [-SIDE, SHAFT_LEFT, BACK, FRONT],
    [SHAFT_RIGHT, SIDE, BACK, FRONT],
    [SHAFT_LEFT, SHAFT_RIGHT, BACK, STAIR_START],
    [SHAFT_LEFT, SHAFT_RIGHT, STAIR_END, FRONT],
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
  const tread = (STAIR_END - STAIR_START) / count;
  const rise = UPSTAIRS / count;
  for (let i = 0; i < count; i++) {
    const height = (i + .5) * rise;
    const z = STAIR_START + (i + .5) * tread;
    part(root, layers[i % layers.length], STAIR_X, height / 2, z, STAIR_WIDTH, height, tread);
  }
  for (const x of [SHAFT_LEFT - .06, SHAFT_RIGHT + .06]) {
    for (let i = 0; i <= 6; i++) {
      const z = STAIR_START + i;
      const base = i * UPSTAIRS / 6;
      part(root, 0x855b40, x, base + .43, z, .12, .86, .12);
    }
    part(root, 0x855b40, x, UPSTAIRS / 2 + .89, (STAIR_START + STAIR_END) / 2, .13, .12,
      Math.hypot(6, UPSTAIRS)).rotation.x = -Math.atan2(UPSTAIRS, 6);
  }

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
    [SHAFT_LEFT - .08, .7, .13, 2.8],
    [SHAFT_RIGHT + .08, (STAIR_START + STAIR_END) / 2, .12, STAIR_END - STAIR_START],
    [STAIR_X, STAIR_START - .10, STAIR_WIDTH, .12],
  ]) {
    part(root, 0x855b40, x, UPSTAIRS + .92, z, width, .125, depth);
    for (const offset of [-.35, 0, .35]) {
      part(root, 0xb47f56, x + (width > depth ? width * offset : 0),
        UPSTAIRS + .43, z + (depth > width ? depth * offset : 0), .11, .86, .11);
    }
    solid(x, z, width, depth, UPSTAIRS + 1.56, UPSTAIRS);
  }
  solid(SHAFT_LEFT - .075, (STAIR_START + STAIR_END) / 2, .14, 6, UPSTAIRS + 1.5, 'stairs');
  solid(SHAFT_RIGHT + .07, (STAIR_START + STAIR_END) / 2, .14, 6, UPSTAIRS + 1.5, 'stairs');
}

export function houseGround(x, z, feet) {
  if (onStairs(x, z)) return (z - STAIR_START) / (STAIR_END - STAIR_START) * UPSTAIRS;
  return feet >= UPSTAIRS - .14 ? UPSTAIRS : 0;
}

export function houseCeiling(x, z, feet = 0) {
  if (Math.abs(x) > SIDE || z > FRONT || z < BACK) return Infinity;
  if (feet < UPSTAIRS - .14 && !onStairs(x, z)) {
    if (Math.abs(x) <= .96 && z >= FRONT - .115) return 2.35;
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
        const floor = item.floor === 'stairs' ? houseGround(STAIR_X, z, 0) : item.floor;
        return feet >= floor - .13 && feet < item.height && overlaps(item, x, z);
      });
    },
  };
}
