import { floorRise } from './layout.js';
import { crack, exposedBrick, ink } from './masonry.js';

const shopColors = [0x77604c, 0x46645e, 0x8c6550, 0x6c5f50, 0x786548];
const specialties = ['雜貨', '布店', '茶舖', '陶器', '米行'];
const boardColors = [0x6d4b35, 0x876445, 0x76573d, 0x997654];

export function marketRow(kit, layout, { x, z, yaw, span, bays, depth, side = 0 }, random) {
  const face = kit.wall(x, z, yaw);
  const spacing = span / bays;
  const recess = 1.85;
  const cos = Math.round(Math.cos(yaw));
  const sin = Math.round(Math.sin(yaw));
  function solid(u, v, width, length, height) {
    layout.solid(x + cos * u + sin * v, z - sin * u + cos * v,
      cos ? width : length, cos ? length : width, height, side);
  }

  const backDepth = depth - recess;
  const backCenter = -(depth + recess) / 2;
  face(ink.plaster, 0, floorRise / 2, backCenter, span, floorRise, backDepth);
  solid(0, backCenter, span, backDepth, floorRise);
  layout.addCeiling(x - sin * recess / 2, z - cos * recess / 2, cos ? span : recess,
    cos ? recess : span, floorRise, side);

  for (let i = 0; i < bays; i++) {
    const u = (i + .5) * spacing - span / 2;
    const open = i > 0 && i < bays - 1 && (bays < 5 || i % 2 === 0);
    const paint = shopColors[i % shopColors.length];
    const opening = spacing - .91;
    const pier = .455;
    for (const s of [-1, 1]) {
      const edge = u + s * (spacing - pier) / 2;
      face(ink.plaster, edge, floorRise / 2, -recess / 2, pier, floorRise, recess);
      solid(edge, -recess / 2, pier, recess, floorRise);
    }
    face(ink.plaster, u, 2.91, -recess / 2, opening, .68, recess);
    face(paint, u, 2.48, .065, opening + .26, .27, .14);
    face(0xa99272, u, 2.51, .146, opening * .73, .178, .036);
    face.label(specialties[i % specialties.length], u, 2.512, .18, .61, .186);
    face(ink.wood, u, .09, -.045, opening, .14, .18);

    for (const s of [-1, 1]) {
      face(paint, u + s * (opening / 2 - .048), 1.24, .025, .092, 2.18, .14);
    }
    if (open) {
      stockedCounter(face, solid, u, opening, i, paint);
    } else {
      solid(u, -.83, opening, 1.76, floorRise);
      for (let plank = 0; plank < 11; plank++) {
        const w = (opening - .12) / 11;
        face(boardColors[(plank * 7 + i) % boardColors.length],
          u + (plank - 5) * w, 1.22, -.086, w - .012, 2.13, .11);
      }
      face(ink.wood, u, 1.6, -.01, opening - .16, .09, .06, 0, .028);
      face(ink.iron, u + .06, 1.03, .042, .26, .08, .07);
    }
    if (i % 2 === 0) {
      exposedBrick(face, u - spacing * .46, .67, .38, .92, random);
      crack(face, u + spacing * .44, .36, 1.32);
    }
  }
}

function stockedCounter(face, solid, x, width, index, paint) {
  const counterX = x + width * .22;
  const counterWidth = width * .51;
  face(ink.wood, counterX, .42, -.67, counterWidth, .82, .71);
  face(paint, counterX, .865, -.67, counterWidth + .07, .078, .77);
  solid(counterX, -.67, counterWidth + .07, .77, .905);
  for (let j = 0; j < 6; j++) {
    const u = counterX + (j - 2.5) * counterWidth * .14;
    face(j % 2 ? 0x9f7044 : 0xc2a978, u, 1.018, -.55, .15, .23, .145, 0, .09 * (j % 3 - 1));
    face(0xcebea1, u, 1.14, -.55, .14, .041, .13);
  }
  for (const y of [.66, 1.36, 1.94]) {
    face(ink.wood, x, y, -1.72, width - .20, .068, .30);
    for (let j = 0; j < 5; j++) {
      face(boardColors[(index + j) % boardColors.length], x + (j - 2) * width * .17,
        y + .155, -1.64, .30, .22, .19, 0, .045 * (j - 2));
    }
  }
  const px = x - width * .29;
  face(0x92704d, px, .23, -1.44, .48, .46, .38);
  face(0xb2a07d, px, .47, -1.44, .42, .086, .32);
  solid(px, -1.44, .48, .38, .5);
}
