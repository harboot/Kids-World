import { footprint, gateZ } from './layout.js';
import { crack, exposedBrick, ink, laundry, roof } from './masonry.js';

function perimeterWall(kit, layout, random, x1, z1, x2, z2) {
  const { wall } = kit;
  const width = Math.hypot(x2 - x1, z2 - z1);
  const x = (x1 + x2) / 2;
  const z = (z1 + z2) / 2;
  const yaw = Math.atan2(z1 - z2, x2 - x1);
  const draw = wall(x, z, yaw);
  draw(ink.plaster, 0, .87, 0, width + .10, 1.74, .52);
  draw(ink.cream, 0, 1.83, 0, width + .17, .18, .67);
  draw(ink.band, 0, .17, 0, width + .12, .34, .63);
  layout.perimeter(x1, z1, x2, z2);
  const bays = Math.floor(width / 3.1);
  for (let i = 0; i < bays; i++) {
    const u = ((i + .5) / bays - .5) * width;
    draw(ink.band, u, .99, 0, .39, 1.98, .68);
    draw(ink.stone, u, 1.99, 0, .52, .12, .76);
    for (const v of [-1, 1]) {
      const face = wall(x + .264 * Math.sin(yaw) * v, z + .264 * Math.cos(yaw) * v,
        v === 1 ? yaw : yaw + Math.PI);
      const patchX = (u + width / bays * (i % 2 ? .27 : -.27)) * v;
      face.chip(0xa78a72, patchX, .78, .012, 1.62, 1.20, i * .19);
      if (i % 4 !== 2) {
        exposedBrick(face, patchX, .60 + random() * .36, .87 + random() * .96, .63 + random() * .59, random);
      }
      if (i % 2 === 0) crack(face, patchX + .45, .53, 1.16);
    }
  }
}

function pavedYard(kit, random) {
  const { box, beam } = kit;
  kit.ground();
  const pavers = [0xa18c78, 0xb0987e, 0xaa9482, 0xb6a18a, 0x988575, 0xb7a087];
  const [rearX, rearZ] = footprint[1];
  const [shoulderX, shoulderZ] = footprint[2];
  const [frontX, frontZ] = footprint[3];
  for (let row = 0; row < 27; row++) {
    const z = -14.4 + row * 1.06;
    const edge = z < shoulderZ
      ? rearX + (shoulderX - rearX) * (z - rearZ) / (shoulderZ - rearZ)
      : shoulderX + (frontX - shoulderX) * (z - shoulderZ) / (frontZ - shoulderZ);
    for (let col = -22; col <= 22; col++) {
      const x = col * 1.28 + (row % 2) * .55;
      if (Math.abs(x) > edge - .77) continue;
      const path = Math.abs(x) < 2.6 || z < -6 || z > 8.3 || Math.abs(x) > 13 + (z + 7.5) * .48;
      const paint = pavers[Math.floor(random() * pavers.length)];
      if (random() < (path ? .84 : .14)) {
        if (random() < .20) {
          kit.pavement(paint, x, z, .68 + random() * .55, .67 + random() * .35, random() * 6);
        } else {
          box(paint, x, -.044, z, 1.16 + random() * .07, .09 + random() * .019, .96, (random() - .5) * .048, 0, 0, false);
        }
      } else if (random() < .38) {
        kit.pavement(paint, x, z, .75 + random() * .44, .54 + random() * .39, random() * 6);
      }
    }
  }

  for (const [[x1, z1], [x2, z2]] of footprint.map((point, i) => [point, footprint[(i + 1) % footprint.length]])) {
    beam(0x867362, x1, -.16, z1, x2, -.16, z2, .30);
  }
}

function shops(kit, layout, random) {
  const { box, wall, drum } = kit;
  const buildings = [
    { x: -11.8, z: 10.65, width: 4.45, depth: 3.3, height: 2.95, awning: 0x9b5149, plaster: 0xb89674, faceY: Math.PI },
    { x: 12.65, z: 10.65, width: 4.9, depth: 3.15, height: 3.18, awning: 0x64786c, plaster: 0xbdb08f, faceY: Math.PI },
    { x: -23.85, z: 10.85, width: 3.75, depth: 3.45, height: 4.12, awning: 0xa36d51, plaster: 0xa98468, faceY: Math.PI },
    { x: 23.80, z: 10.85, width: 3.9, depth: 3.40, height: 3.66, awning: 0x956462, plaster: 0xb59b85, faceY: Math.PI },
    { x: -20.75, z: -4.35, width: 2.95, depth: 4.35, height: 3.85, awning: 0x7a6e55, plaster: 0xab8e75, faceY: Math.PI },
    { x: 22.80, z: .6, width: 3, depth: 4.0, height: 4.75, awning: 0x875a49, plaster: 0xaa886f, faceY: 0 },
  ];
  for (const [i, { x, z, width, depth, height, awning, plaster, faceY }] of buildings.entries()) {
    box(plaster, x, height / 2, z, width, height, depth);
    layout.solid(x, z, width, depth, height);
    const direction = Math.cos(faceY);
    const facade = wall(x, z + direction * depth / 2, faceY);
    const back = wall(x, z - direction * depth / 2, faceY + Math.PI);
    const flank = wall(x + width / 2, z, Math.PI / 2);
    for (const draw of [facade, back, flank]) {
      draw(ink.band, 0, .19, .025, draw === flank ? depth : width, .38, .075);
      draw.chip(0x917760, -.64, 1.33, .012, 1.93, 2.73);
      exposedBrick(draw, -.86, .99, 1.25, 1.51, random);
      crack(draw, .96, .64, 1.48, i % 2 ? 1 : -1);
    }
    back(ink.shade, .55, 1.28, .04, 1.35, 1.38, .11);
    back(awning, .55, 1.28, .107, 1.24, 1.26, .07);
    for (const u of [-.39, 0, .39]) back(ink.pane, .55 + u, 1.28, .154, .32, 1.05, .039);
    back(ink.wood, .55, .59, .143, 1.52, .12, .28);
    for (let stripe = -3; stripe <= 3; stripe++) {
      back(stripe % 2 ? ink.linen : awning, .55 + stripe * .22, 2.12, .34, .214, .05, .67, .25);
    }
    facade(ink.dark, .06, 1.10, .057, width * .65, 2.19, .13);
    for (let plank = 0; plank < 9; plank++) {
      const u = .06 + (plank - 4) * width * .067;
      facade([ink.wood, 0x85664d, 0x765442][(i + plank) % 3], u, 1.04, .139, width * .061, 1.95, .085);
    }
    facade(ink.band, .06, 1.75, .185, width * .63, .096, .06, 0, .042);
    facade(0x493e36, .06, 2.31, .124, width * .56, .35, .10);
    facade(awning, .06, 2.32, .194, width * .51, .25, .052, 0, -.029);
    if (height > 3.4) {
      facade(ink.shade, .35, height - .67, .033, 1.12, .83, .08);
      for (let j = -1; j <= 1; j++) facade(0x7c8881, .35 + j * .28, height - .67, .091, .25, .68, .04);
      facade(ink.band, .35, height - 1.13, .12, 1.25, .12, .26);
    }
    for (let stripe = -5; stripe <= 5; stripe++) {
      const paint = stripe % 2 ? 0xc7ad94 : awning;
      const u = stripe * width / 15;
      facade(paint, u, 2.39 - Math.abs(stripe) * .007, .59, width / 15 - .006, .056, 1.15, .28);
      facade(paint, u, 2.19 - Math.abs(stripe) * .007, 1.145, width / 15 - .011, .16 + (stripe % 3) * .028, .046);
    }
    const lanternZ = z + direction * (depth / 2 + .66);
    const lanternX = x - direction * width * .37;
    drum(0x9f4233, lanternX, 2.01, lanternZ, .28, .33, .28);
    drum(ink.band, lanternX, 2.20, lanternZ, .16, .064, .16);
    box(ink.brass, lanternX, 1.79, lanternZ, .038, .12, .038);

    if (i === 3 || i === 5) {
      const roofFace = wall(x, z, 0);
      for (let j = -7; j <= 7; j++) {
        roofFace(j % 3 === 0 ? 0x7c6553 : 0x67574d, j * (width + .54) / 15,
          height + .13 + (j % 4) * .015, 0, (width + .50) / 15, .13, depth + .60, .15, .032);
      }
    } else {
      roof(wall(x, z, 0), width + .6, depth + .63, height, random);
      for (const end of [-1, 1]) {
        kit.gable(plaster, x + end * width / 2, height, z, depth, Math.tan(.29) * depth / 2, .15, -end * Math.PI / 2);
      }
    }
  }
}

function courtyardProps(kit, layout, random) {
  const { box, drum, leaf, beam } = kit;
  for (const [x, z, size] of [
    [-5.8, -4.7, .85], [6.4, -6.2, 1], [-9, 7.85, .88],
    [9.65, 7.98, .77], [15.65, 11.68, .92], [-22.0, 8.15, .9],
    [3.85, 13.47, 1.07], [-3.8, 13.39, .80],
  ]) {
    drum(0x8c614b, x, size * .29, z, size * .58, size * .58, size * .58);
    drum(0x64513c, x, size * .55, z, size * .52, size * .10, size * .52);
    layout.solid(x, z, size * .58, size * .58, size * .58);
    for (let i = 0; i < 7; i++) {
      const yaw = i * Math.PI * 2 / 7;
      const dx = Math.sin(yaw) * size * (.24 + random() * .24);
      const dz = Math.cos(yaw) * size * (.24 + random() * .24);
      const y = size * (.80 + random() * .55);
      beam(0x626547, x, size * .53, z, x + dx, y, z + dz, .043);
      leaf([0x626f47, 0x777d4e, 0x8c8a4f][i % 3],
        x + dx, y, z + dz, size * .24, size * .12, size * .50, yaw, -.34);
    }
  }

  for (const [x, z] of [[-14.48, 11.25], [15.69, 10.42], [-21.68, 11.55], [21.35, 9.7], [7.6, -6.65]]) {
    box(0x806349, x, .34, z, .70, .68, .65);
    box(0xa37d54, x, .695, z, .72, .073, .67);
    for (const side of [-1, 1]) {
      box(0x624b39, x + side * .23, .34, z + .337, .085, .66, .041);
      box(0x624b39, x, .34 + side * .22, z + .339, .70, .070, .044);
    }
    layout.solid(x, z, .72, .67, .73);
  }

  // A rack in the yard and a low wooden bench under the rear galleries.
  for (const x of [5.0, 8.12]) {
    box(0x977757, x, .96, .16, .11, 1.92, .12, 0, 0, .035);
    beam(ink.wood, x, 0, -.37, x, .96, .16, .082);
    beam(ink.wood, x, 0, .70, x, .96, .16, .082);
    layout.solid(x, .16, .11, .12, 1.92);
  }
  laundry(kit.wall(6.56, .16, 0), 0, 1.81, 0, 3);
  box(ink.wood, -5.78, .47, -8.71, 1.80, .13, .43);
  for (const x of [-6.44, -5.13]) box(ink.band, x, .21, -8.71, .15, .42, .32);
  layout.solid(-5.78, -8.71, 1.8, .43, .54);
}

export function courtyard(kit, layout, random) {
  const { box, drum, ring, beam } = kit;
  pavedYard(kit, random);
  const edges = footprint.map((point, i) => [point, footprint[(i + 1) % footprint.length]]);
  for (const [[x1, z1], [x2, z2]] of edges) {
    if (z1 === gateZ && z2 === gateZ) {
      perimeterWall(kit, layout, random, x1, z1, 2.57, gateZ);
      perimeterWall(kit, layout, random, -2.57, gateZ, x2, z2);
      continue;
    }
    perimeterWall(kit, layout, random, x1, z1, x2, z2);
  }
  for (const side of [-1, 1]) {
    const x = side * 2.58;
    box(ink.band, x, 1.575, gateZ, .77, 3.15, .87);
    box(ink.cream, x, 3.15, gateZ, .95, .19, 1.02);
    drum(ink.band, x, 3.44, gateZ, .35, .40, .35);
    const face = kit.wall(x, gateZ + .437, 0);
    exposedBrick(face, 0, 1.14, .74, 1.68, random);
  }
  shops(kit, layout, random);
  courtyardProps(kit, layout, random);

  // A wrought-iron arch with two closed gate leaves.
  function archY(x) { return 3.10 + 1.46 * (1 - (x / 2.57) ** 2); }
  for (let i = 0; i < 16; i++) {
    const a = -2.56 + i * .32;
    const b = a + .32;
    beam(ink.iron, a, archY(a), gateZ, b, archY(b), gateZ, .14);
    beam(ink.iron, a, archY(a) - .43, gateZ, b, archY(b) - .43, gateZ, .085);
    beam(ink.iron, a, archY(a) - .43, gateZ, b, archY(b), gateZ, .066);
  }
  for (const [i, letter] of Array.from('永安里').entries()) {
    const x = (i - 1) * 1.04;
    const y = archY(x) - .15;
    drum(ink.wood, x, y, gateZ, 1.00, .18, 1.00, 0, Math.PI / 2);
    drum(0xb5956c, x, y, gateZ, .87, .196, .87, 0, Math.PI / 2);
    kit.gateLetter(letter, x, y, gateZ);
  }
  for (const side of [-1, 1]) {
    box(ink.iron, side * 1.13, .34, gateZ, 2.22, .44, .13);
    box(ink.iron, side * 1.13, 1.30, gateZ, 2.22, .08, .12);
    for (let i = 0; i < 9; i++) {
      const x = side * (.14 + i * .25);
      const y = 2.42 + .22 * (1 - Math.abs(x) / 2.2);
      box(ink.iron, x, y / 2, gateZ, .061, y, .074);
    }
  }
  layout.solid(0, gateZ, 5.12, .22, 3.12);

  // Central stone well and the structural timber frame above it.
  const wellX = -3.5;
  const wellZ = -.8;
  drum(ink.dark, wellX, .08, wellZ, 1.73, .16, 1.73);
  ring(ink.band, wellX, .45, wellZ, 2.03, .90, 2.03);
  ring(ink.shade, wellX, .45, wellZ, 1.53, .90, 1.53);
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 14; i++) {
      const angle = (i + (row % 2) / 2) * Math.PI * 2 / 14;
      const radius = row === 2 ? .895 : .90;
      box(i % 3 === 0 ? ink.cream : ink.stone, wellX + Math.sin(angle) * radius, .15 + row * .29,
        wellZ + Math.cos(angle) * radius, .385, .275, row === 2 ? .39 : .26, angle);
    }
  }
  layout.solid(wellX, wellZ, 2.13, 2.13, .89);
  for (const side of [-1, 1]) box(ink.wood, wellX + side * 1.14, 1.31, wellZ, .16, 2.63, .17);
  for (const side of [-1, 1]) layout.solid(wellX + side * 1.14, wellZ, .16, .17, 2.63);
  box(ink.wood, wellX, 2.63, wellZ, 2.72, .19, .18);
  box(ink.brass, wellX, 2.12, wellZ, .044, .86, .044);
}
