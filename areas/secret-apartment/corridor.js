import { SURFACE_GAP } from '../../core/geometry.js';
import { COLORS, ceilingLight, pointLight, roomDoor, tileFloor, wallX, wallZ } from './geometry.js';

export const HALL = { halfWidth: 10.65, south: -5.35, height: 3.2 };

export function buildCorridor(THREE, architecture, { b, doorZ }, level, southDoors) {
  const { halfWidth, south, height } = HALL;
  const tileColors = level === 8
    ? [0xdcd0b8, 0xe6dbc4, 0xddcfb7, 0xe4d8c3, 0xdfd4bd]
    : [0xc4b69f, 0xc8baa5, 0xcec2ad, 0xd1c3aa, 0xcabca8];
  const backDoors = [-7.9, -4.5, 4.6, 8.0].map((x, i) => ({
    x, width: 1.27, number: level + 'ABCD'[i],
  }));

  function wall(z, doors, yaw) {
    const dir = Math.cos(yaw);
    let edge = -halfWidth;
    for (const { x, width, number, accent, elevator, glass } of doors) {
      const left = x - width / 2;
      const right = x + width / 2;
      if (left > edge) {
        wallX(b, COLORS.cream, edge, left, z, height);
        b.part(COLORS.oak, (edge + left) / 2, 0.075, z + dir * (0.12 + SURFACE_GAP.detail),
          left - edge, 0.15, 0.044);
      }
      const top = elevator ? 2.475 : glass ? 2.58 : 2.34;
      b.part(COLORS.cream, x, (top + height) / 2, z, width, height - top, 0.24);
      if (!elevator && !glass) roomDoor(b, architecture, number, x, z, yaw, { width, accent, open: accent });
      edge = right;
    }
    wallX(b, COLORS.cream, edge, halfWidth, z, height);
    b.part(COLORS.oak, (edge + halfWidth) / 2, 0.075, z + dir * (0.12 + SURFACE_GAP.detail),
      halfWidth - edge, 0.15, 0.044);
  }

  wall(doorZ, [...backDoors.slice(0, 2), { x: 0, width: 2.34, elevator: true }, ...backDoors.slice(2)], 0);
  wall(south, southDoors, Math.PI);
  for (const x of [-halfWidth, halfWidth]) wallZ(b, COLORS.plaster, x, doorZ, south, height);
  const middle = (doorZ + south) / 2;
  tileFloor(b, 0, middle, halfWidth * 2, south - doorZ, 0.78, tileColors);
  b.part(0xf0e7d2, 0, height + 0.08, middle, halfWidth * 2, 0.16, south - doorZ + 0.13);
  b.part(0xc6b59d, 0, height - 0.07, doorZ + 0.33, halfWidth * 2, 0.14, 0.44);
  for (const x of [-8.8, -5.25, -1.75, 1.75, 5.25, 8.8]) {
    ceilingLight(b, x, middle, 1.24, 0.48, height);
  }
  for (const x of [-6.22, -2.5, 2.55, 6.31]) {
    b.part(0x9a8062, x, 2.03, doorZ + 0.151, 0.16, 0.59, 0.075);
    b.part(COLORS.warmLight, x, 2.08, doorZ + 0.222, 0.105, 0.41, 0.08, { glow: true });
  }
  for (const x of [-6.6, 6.6]) pointLight(THREE, b.root, x, 2.55, middle, 0xffe4c2, 15, 9);
  architecture.sign(b.root, ['FLOOR ' + level], -1.97, 2.75, doorZ + 0.158, 1.13, 0.28);
  architecture.sign(b.root, [level === 8 ? 'POOL TERRACE' : 'UNITS 17A–17H'], 2.03, 2.73, doorZ + 0.157, 1.28, 0.26);
  for (const side of [-1, 1]) {
    b.part(0x756857, side * 10.3, 0.43, middle, 0.59, 0.86, 0.59);
    b.solid(side * 10.3, middle, 0.59, 0.59);
    for (let i = 0; i < 7; i++) {
      const angle = i * 2.4;
      b.part(i % 2 ? 0x58744d : 0x396448, side * 10.3 + Math.cos(angle) * 0.23, 1.09 + i * 0.078,
        middle + Math.sin(angle) * 0.22, 0.33, 0.43, 0.23, { shape: 'leaf', pitch: 0.5, yaw: angle });
    }
  }
}
