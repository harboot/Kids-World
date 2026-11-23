import { floorRise, gallery } from './layout.js';
import { ink } from './masonry.js';

const x = -9.52;
const z = gallery.rear;
const sill = floorRise * 3 + .80;
const head = sill + 2.07;
const left = x - 1.03;
const right = x + 1.03;

export const residentWindow = {
  aperture: [[left, sill], [right, sill], [right, head], [left, head]],
};

export function buildResidentWindow(kit, random) {
  const { box, oval, leaf, beam, drum } = kit;
  const frame = kit.wall(x, z, 0);
  box(0x4d4037, x, (sill + head) / 2, z - 1.14, 2.08, 2.09, .15);
  frame(ink.stone, 0, sill - .044, .125, 2.31, .17, .54);
  frame(ink.wood, 0, head + .031, .043, 2.13, .115, .18);
  for (const side of [-1, 1]) {
    frame(ink.wood, side * 1.015, sill + 1.00, .034, .13, 2.03, .16);
    const shutter = kit.wall(x + side * 1.39, z + .235, -side * .55);
    shutter(0x815139, 0, sill + 1.01, 0, .84, 1.91, .11);
    for (let plank = -2; plank <= 2; plank++) {
      shutter(plank % 2 ? 0x895a41 : 0x76513c, plank * .151, sill + 1.01, .05, .145, 1.73, .031);
    }
    for (const y of [.26, 1.68]) shutter(ink.wood, 0, sill + y, .075, .83, .087, .069);
    beam(0x555a3a, x + side * 2.04, sill - .48, z + .092, x + side * 1.95, head - .22, z + .100, .031);
    for (let i = 0; i < 12; i++) {
      const px = x + side * (1.91 + random() * .23);
      const py = sill - .38 + i * .18;
      leaf(i % 2 ? 0x64784f : 0x4d633f, px, py, z + .082 + random() * .055,
        .16 + random() * .15, .17, .079, .35, 0, side * .65);
    }
  }

  // The wash line is mounted to the stone outside the shutters.
  for (const side of [-1, 1]) {
    beam(ink.wood, x + side * 1.66, sill + .04, z + .08, x + side * 1.37, sill + .40, z + .69, .075);
  }
  beam(0xa58e70, x - 1.37, sill + .40, z + .69, x + 1.37, sill + .43, z + .69, .022);
  for (const [offset, height, paint] of [[-1.02, .49, 0xcb9d9b], [.94, .42, 0xd5c7a9]]) {
    frame(paint, offset, sill + .40 - height / 2, .71, .46, height, .039, -.06, .06);
    frame(ink.brass, offset + .08, sill + .414, .743, .035, .115, .035);
  }

  const robe = 0xd3adba;
  const cuff = 0xe0c8c7;
  const skin = 0xc39173;
  const hair = 0x31252b;
  const faceZ = z + .400;

  function arm(paint, a, b, width) {
    const [ax, ay, az] = a;
    const [bx, by, bz] = b;
    const dx = bx - ax;
    const dz = bz - az;
    const dy = by - ay;
    const flat = Math.hypot(dx, dz);
    oval(paint, x + (ax + bx) / 2, sill + (ay + by) / 2, z + (az + bz) / 2,
      Math.hypot(flat, dy) + .12, width, width, Math.atan2(-dz, dx), 0, Math.atan2(dy, flat));
  }

  oval(robe, x, sill + .40, z + .084, .79, .91, .52, 0, -.25, -.065);
  oval(cuff, x + .026, sill + .66, z + .272, .51, .18, .14, 0, 0, -.17);
  for (const [i, y] of [.487, .387, .281].entries()) {
    oval(0xe7cccd, x + .043 - i * .014, sill + y, z + .346 - i * .01, .038, .038, .024);
  }
  oval(skin, x + .024, sill + .77, z + .204, .215, .25, .226);
  for (const side of [-1, 1]) {
    arm(robe, [side * .28, .60, .137], [side * .62, .45, .41], .225);
    arm(skin, [side * .61, .46, .40], [side * .86, .40, .69], .131);
    oval(cuff, x + side * .599, sill + .460, z + .411, .143, .177, .146);
    oval(skin, x + side * .91, sill + .397, z + .69, .16, .11, .16);
  }

  oval(hair, x + .018, sill + 1.188, z + .181, .657, .67, .57);
  oval(skin, x + .027, sill + 1.116, z + .303, .439, .521, .371);
  for (const side of [-1, 1]) {
    oval(skin, x + side * .217, sill + 1.10, z + .334, .092, .145, .119);
    oval(0x3d2b28, x + side * .092 + .024, sill + 1.158, faceZ + .064, .060, .027, .033);
    box(hair, x + side * .092 + .024, sill + 1.211, faceZ + .066, .079, .017, .023, 0, 0, side * -.16);
  }
  oval(0xbd8266, x + .028, sill + 1.111, faceZ + .076, .089, .111, .087);
  oval(0x88535a, x + .032, sill + 1.026, faceZ + .086, .105, .025, .028, 0, 0, -.11);
  for (const [i, [px, py]] of [[-.28, 1.12], [-.29, 1.30], [-.22, 1.44], [-.055, 1.48],
    [.117, 1.47], [.25, 1.37], [.30, 1.21]].entries()) {
    const color = [0x993c4e, 0xb5914d, 0x8c596e][i % 3];
    drum(color, x + px, sill + py, z + .352, .142, .104, .142, i % 2 ? .22 : -.22, Math.PI / 2);
    drum(hair, x + px, sill + py, z + .405, .069, .022, .069, i % 2 ? .22 : -.22, Math.PI / 2);
  }
}
