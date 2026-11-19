import { SURFACE_GAP } from '../../core/geometry.js';
import { gabledRoof } from './buildings.js';
import { randomFrom } from './scenery.js';

export const GATE = { x: 0, z: 26.85 };
const oak = 0x714b34;
const bronze = 0x553c2b;
const cream = 0xdfb980;
const gray = 0x9a8e7d;

export function decorateVillage(kit, height) {
  const { group, part, box, solid } = kit;
  entrance(kit, height);
  square(kit, height);
  stable(kit, height);

  const random = randomFrom(391);
  const plant = (x, z, size, evergreen) => tree(kit, x, height(x, z), z, size, evergreen);
  for (const [x, z, size, evergreen] of [
    [-5.8, 28.6, 1.06, true], [6.8, 29.7, 1.22, false], [-7.8, 25.8, 0.94, true],
    [5.35, 24.0, 0.82, true], [-7.6, 20.8, 0.89, false], [-31.3, 13.7, 1.06, false],
    [-21.8, 23.3, 0.87, true], [-23.25, 28.7, 1.1, true], [5.8, -27.8, 0.88, false],
    [-16.0, -27.1, 1.02, true], [19.7, -24.2, 0.86, false], [19, 24.1, 0.94, true],
    [15.5, 26.8, 1.25, false], [-10.65, 26.7, 0.94, false], [-22.25, 15.35, 0.78, true],
    [-31.6, 6.24, 1.08, false], [-32.3, -4, 1.16, true], [-32.7, -13, 1.2, true],
  ]) plant(x, z, size, evergreen);
  for (let i = 0; i < 43; i++) {
    const edge = i % 3;
    const x = edge === 0 ? -40 + random() * 7 : -36 + random() * 52;
    const z = edge === 0 ? -34 + random() * 68 : edge === 1 ? -35 + random() * 5 : 32.2 + random() * 3.6;
    if (Math.abs(x) < 4 && z > 0) continue;
    plant(x, z, 0.68 + random() * 0.80, random() > 0.29);
  }

  for (const [x, z, size] of [[-4.45, 28.7, 0.92], [5.6, 27.9, 0.81], [-8.6, 23.2, 0.76],
    [-20.6, 22.7, 0.58], [-15.2, 26.4, 0.44], [-35.4, 14.7, 1.12], [-34, -20.4, 1.15]]) {
    const rock = group('Boulders', x, height(x, z), z);
    part(rock, 'rock', gray, 0, size * 0.3, 0, size, size * 0.67, size * 0.78, { rotation: [0.24, x, 0.13] });
    part(rock, 'rock', 0xb1a48c, size * 0.78, 0.14, 0.48, size * 0.51, size * 0.39, size * 0.46);
    if (size > 0.75) solid(rock, size * 1.34, size, size);
  }

  for (const [x, z] of [[-5.45, 24], [5.5, 25.5], [-9.6, 22.7], [8.7, 28.7], [18, 25.6], [16.5, 23.2],
    [-31.6, 14.6], [-33.9, 28], [-22, 27.9], [-18.7, 14.5], [-16.5, 26.5], [-18.9, 28.4], [-14.7, 26.8],
    [-9, -8.45], [-8.95, 4.1], [-11.6, -20.5], [6.1, -6.8], [4.28, -19.7], [18.2, -25.5]]) {
    const shrub = group('Shrubs', x, height(x, z), z);
    for (let i = 0; i < 4; i++) {
      const radius = 0.29 + random() * 0.38;
      part(shrub, 'rock', [0x687f4a, 0x7e8d50, 0x8b9c61, 0x628047][i],
        (i - 1.5) * 0.30, radius * 0.60, (random() - 0.5) * 0.55, radius, radius * 0.82, radius);
    }
  }

  for (const [x, z, scale] of [[3.8, 26.8, 1], [-4.7, 26.7, 1.16], [-3.75, 19.64, 0.92],
    [3.8, 10.22, 0.85], [-9.7, 0.9, 0.8], [-10.25, -6.8, 1], [-31.6, 22.35, 0.9],
    [-9, 17.2, 0.82], [20.91, 10.3, 1.14], [-20.4, 16.1, 1.16], [12, 22.1, 0.9]]) {
    flowers(kit, x, z, scale, height, random);
  }

  for (const [x, z, yaw, label] of [[-4.28, 10.0, 0, 'Village Square ↑'], [-13.93, 15.35, Math.PI, 'Stables →'],
    [16.9, 6.35, -Math.PI / 2, 'Harbor ↑'], [-8.54, 8.26, 0, '← West Lane']]) {
    const post = group('Village directions', x, height(x, z), z, yaw);
    box(post, oak, 0, 0.75, 0, 0.18, 1.5, 0.18);
    kit.sign(post, label, 0, 1.68, 0, 1.71, 0.32);
  }
}

function entrance(kit, height) {
  const { group, box, beam, part, solid, sign } = kit;
  const gate = group('Village gateway', GATE.x, height(GATE.x, GATE.z), GATE.z);
  for (const side of [-1, 1]) {
    const x = side * 3.22;
    box(gate, 0x8d7e70, x, 0.28, 0, 1.34, 0.56, 1.25, { shadow: true });
    for (let row = 0; row < 8; row++) {
      box(gate, [0xad9a81, 0x9b8c7b, 0xb7a48a][(row + side + 3) % 3], x, 0.54 + row * 0.43, 0,
        row % 2 ? 1.06 : 1.16, 0.414, row % 2 ? 0.95 : 1.06, { shadow: true });
    }
    box(gate, 0xcdba96, x, 3.7, 0, 1.23, 0.23, 1.10);
    solid(gate, 1.34, 1.25, 4.9, x);
    lantern(kit, gate, x, 2.25, 0.78);
    lantern(kit, gate, x, 2.25, -0.78);
    const wing = side * 4.52;
    box(gate, gray, wing, 0.61, 0, 1.78, 1.22, 0.78, { shadow: true });
    box(gate, 0xc7ad88, wing, 1.23, 0, 1.86, 0.18, 0.87);
    solid(gate, 1.86, 0.87, 1.7, wing);
  }
  for (let i = 0; i < 12; i++) {
    const point = n => [3.18 * Math.cos(n * Math.PI / 12), 3.62 + 1.78 * Math.sin(n * Math.PI / 12), 0];
    // Recess alternating stones on both sides where the angled joints overlap.
    const depth = i % 2 ? 1.06 - 2 * SURFACE_GAP.trim : 1.06;
    beam(gate, i % 2 ? 0xb7a389 : 0xc2ad91, point(i), point(i + 1), 0.58, depth, { shadow: true });
  }
  part(gate, 'gem', 0xe7c78e, 0, 5.82, 0, 0.29, 0.4, 0.27);
  sign(gate, 'Arendelle Village', 0, 4.72, 0.63, 3.42, 0.62, { background: '#2b5049' });
  sign(gate, 'Frozen Castle', 0, 4.72, -0.63, 2.9, 0.59, { background: '#304a59', yaw: Math.PI });
}

function square(kit, height) {
  const { group, part, box, solid, beam } = kit;
  const square = group('Village Square', 0, 0, 0);
  const fountain = group('Village fountain', 0, 0, 1.4, 0, square);
  part(fountain, 'drum', 0x887d70, 0, 0.16, 0, 2.20, 0.32, 2.20, { shadow: true });
  part(fountain, 'drum', 0xbca988, 0, 0.43, 0, 2.04, 0.4, 2.04, { shadow: true });
  part(fountain, 'ring', 0xd4c098, 0, 0.665, 0, 1.93, 1.93, 2.12, { rotation: [-Math.PI / 2, 0, 0] });
  part(fountain, 'drum', 0x518e89, 0, 0.62, 0, 1.86, 0.055, 1.86);
  part(fountain, 'drum', 0xb6a288, 0, 1.07, 0, 0.28, 1.25, 0.28);
  part(fountain, 'bowl', 0xdcc49a, 0, 1.64, 0, 0.81, 0.32, 0.81);
  part(fountain, 'drum', 0x6da5a1, 0, 1.81, 0, 0.73, 0.05, 0.73);
  part(fountain, 'gem', 0xd1b97c, 0, 2.04, 0, 0.22, 0.30, 0.22);
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const x = Math.cos(angle);
    const z = Math.sin(angle);
    beam(fountain, 0xadd4cf, [0.72 * x, 1.78, 0.72 * z], [0.91 * x, 1.43, 0.91 * z], 0.039);
    beam(fountain, 0xadd4cf, [0.91 * x, 1.43, 0.91 * z], [1.06 * x, 0.69, 1.06 * z], 0.034);
  }
  solid(fountain, 3.25, 4.25, 1.65);
  solid(fountain, 4.25, 3.25, 1.65);

  for (const [x, z, yaw] of [[-5.95, 1, Math.PI / 2], [5.95, 1, -Math.PI / 2], [4.9, -5.85, 0]]) {
    const bench = group('Square bench', x, 0, z, yaw);
    box(bench, oak, 0, 0.48, 0, 1.89, 0.15, 0.58);
    for (const y of [0.76, 0.93]) box(bench, cream, 0, y, -0.27, 1.92, 0.13, 0.10);
    for (const side of [-1, 1]) {
      box(bench, bronze, side * 0.71, 0.48, -0.23, 0.1, 0.96, 0.11);
      box(bench, bronze, side * 0.71, 0.23, 0.19, 0.12, 0.46, 0.12);
    }
    solid(bench, 1.89, 0.58, 0.99);
  }

  for (const [x, z] of [[-5.9, -6.1], [5.75, 8.67], [-5.6, 7.8], [6.78, -4.98]]) {
    const banner = group('Village pennant', x, 0, z);
    box(banner, bronze, 0, 1.98, 0, 0.14, 3.96, 0.14);
    part(banner, 'gem', 0xe0af66, 0, 4.02, 0, 0.145, 0.16, 0.145);
    box(banner, cream, 0, 3.73, 0, 1.12, 0.08, 0.08);
    part(banner, 'banner', 0xa73536, 0, 3.0, 0, 0.88, 1.4, 1);
    for (const side of [-1, 1]) {
      box(banner, 0xe9bf72, side * 0.32, 3.02, 0, 0.028, 1.34, 0.023);
    }
    part(banner, 'gem', 0xe2b96c, 0, 3.16, 0, 0.17, 0.23, 0.025);
    pot(kit, banner, 0, 0, 0);
    solid(banner, 0.52, 0.52, 1.6);
  }

  for (const [x, z] of [[-3.75, 13.1], [3.75, 16.25], [-12.3, -11.3], [-29.17, 3.15],
    [9.7, 5.01], [19.15, 9.35], [16.9, 17.2], [20.85, -7.4], [19.75, -14.2], [-27.6, 21.9]]) {
    const stand = group('Street lantern', x, height(x, z), z);
    box(stand, bronze, 0, 1.34, 0, 0.15, 2.68, 0.15);
    part(stand, 'drum', gray, 0, 0.09, 0, 0.23, 0.18, 0.23);
    lantern(kit, stand, 0, 2.75, 0);
    solid(stand, 0.19, 0.19, 2.7);
  }
}

function lantern({ box, part }, node, x, y, z) {
  box(node, 0xffd08a, x, y, z, 0.23, 0.36, 0.22);
  part(node, 'cone', bronze, x, y + 0.25, z, 0.24, 0.21, 0.24);
  box(node, bronze, x, y - 0.19, z, 0.29, 0.065, 0.28);
  for (const dx of [-0.115, 0.115]) {
    for (const dz of [-0.11, 0.11]) box(node, bronze, x + dx, y, z + dz, 0.032, 0.37, 0.032);
  }
}

function pot({ part }, node, x, y, z) {
  part(node, 'bowl', 0xb06545, x, y + 0.19, z, 0.30, 0.38, 0.30);
  part(node, 'drum', 0x715844, x, y + 0.379, z, 0.277, 0.024, 0.277);
  part(node, 'rock', 0x608246, x, y + 0.45, z, 0.27, 0.16, 0.26);
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3;
    part(node, 'gem', i % 2 ? 0xf1c26a : 0xbd545c, x + 0.17 * Math.sin(angle), y + 0.56, z + 0.17 * Math.cos(angle),
      0.075, 0.07, 0.073);
  }
}

function tree({ group, part, solid }, x, y, z, size, evergreen) {
  const tree = group(evergreen ? 'Fir' : 'Village birch', x, y, z);
  const rotation = [0, x * 0.47, 0.06];
  part(tree, 'drum', evergreen ? oak : 0xc2ab8b, 0, 1.55 * size, 0, 0.17 * size, 3.1 * size, 0.17 * size);
  if (evergreen) {
    for (let i = 0; i < 3; i++) {
      const radius = (1.41 - i * 0.29) * size;
      part(tree, 'cone', [0x4e684b, 0x5f7a4d, 0x77905b][i], 0, (2.38 + i * 0.84) * size, 0, radius,
        (2.8 - i * 0.4) * size, radius, { rotation, shadow: true });
    }
  } else {
    for (const [dx, dy, dz, radius, color] of [[0, 3.85, 0, 1.63, 0x829552], [-0.85, 3.21, 0.1, 1.25, 0x70904d],
      [0.84, 3.0, 0.32, 1.25, 0xa0a35c], [-0.22, 3.07, -0.8, 1.24, 0x5c814c], [0.23, 4.65, -0.12, 1.15, 0x92a357]]) {
      part(tree, 'rock', color, dx * size, dy * size, dz * size, radius * size, radius * size, radius * size, { rotation, shadow: true });
    }
  }
  solid(tree, 0.38 * size, 0.38 * size, 2.3 * size);
}

function flowers({ group, part, beam }, x, z, size, height, random) {
  const bed = group('Wildflowers', x, 0, z);
  for (let i = 0; i < 16; i++) {
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * size;
    const dx = Math.sin(angle) * radius;
    const dz = Math.cos(angle) * radius * 0.58;
    const y = height(x + dx, z + dz);
    const stem = 0.10 + random() * 0.2;
    beam(bed, 0x668047, [dx, y, dz], [dx - 0.04, y + stem, dz], 0.021);
    part(bed, 'gem', [0xeee3bf, 0xc96b71, 0xf2c052, 0xad8eae][i % 4], dx - 0.04, y + stem, dz, 0.089, 0.051, 0.089);
  }
}

function stable(kit, height) {
  const { group, box, part, solid, sign } = kit;
  const shed = group('Village stables', -29.3, height(-29.3, 29.25), 29.25, Math.PI);
  box(shed, 0x533d32, 0, 1.26, -0.18, 6.2, 2.52, 3.9, { shadow: true });
  part(shed, 'gable', 0xa17553, 0, 2.52, 0, 6.2, 1.98, 4.42);
  gabledRoof(kit, shed, 6.2, 4.7, 2.59, 2.08, 0x645d4b);
  for (const side of [-1, 1]) {
    box(shed, oak, side * 3.0, 1.28, 0, 0.25, 2.56, 4.7);
    for (let i = 0; i < 10; i++) {
      box(shed, i % 2 ? 0xa57853 : 0xb0825a, side * 3.11, 1.27, (i - 4.5) * 0.46, 0.15, 2.47, 0.43);
    }
    box(shed, 0x66482f, side * 2.5, 0.86, 2.11, 1.12, 1.72, 0.19);
    box(shed, oak, side * 2.5, 1.72, 2.19, 1.09, 0.16, 0.24);
  }
  for (const x of [-3.02, 0, 3.02]) box(shed, oak, x, 1.24, 2.22, 0.2, 2.48, 0.24);
  box(shed, oak, 0, 2.52, 2.3, 6.25, 0.22, 0.25);
  sign(shed, 'Village Stables', 0, 2.96, 2.34, 2.14, 0.40);
  solid(shed, 6.22, 4.45, 4.48);

  const fence = group('Stable enclosure', 0, 0, 0);
  for (const [x, z, length, across] of [
    [-28, 17, 12, true], [-34, 21.8, 9.6, false], [-33.2, 26.6, 1.6, true],
    [-24.1, 26.6, 4.2, true], [-22, 18.0, 2.0, false], [-22, 24.8, 3.6, false],
  ]) {
    const count = Math.ceil(length / 2);
    const run = (i, y) => {
      const offset = (i / count - 0.5) * length;
      const px = x + (across ? offset : 0);
      const pz = z + (across ? 0 : offset);
      return [px, y + height(px, pz), pz];
    };
    for (let i = 0; i <= count; i++) {
      box(fence, oak, ...run(i, 0.76), 0.18, 1.52, 0.18);
      box(fence, cream, ...run(i, 1.53), 0.24, 0.09, 0.24);
      if (i === count) continue;
      for (const y of [0.47, 1.05, 1.47]) kit.beam(fence, 0x996b43, run(i, y), run(i + 1, y), 0.116);
    }
    solid(fence, across ? length : 0.18, across ? 0.18 : length, height(x, z) + 1.62, x, z);
  }

  const supplies = group('Hay and feeding trough', -31.7, height(-31.7, 24.2), 24.2);
  for (const [x, y] of [[0, 0.3], [1.0, 0.3], [0.35, 0.9]]) {
    box(supplies, 0xce9c4f, x, y, 0, 0.98, 0.59, 0.66);
    for (const dx of [-0.31, 0.31]) box(supplies, 0x8d6a3e, x + dx, y, 0, 0.034, 0.612, 0.69);
  }
  solid(supplies, 2, 0.7, 1.2, 0.5);
  const trough = group('Feeding trough', -26.8, height(-26.8, 24.65), 24.65);
  box(trough, oak, 0, 0.34, 0, 1.65, 0.28, 0.63);
  for (const side of [-1, 1]) {
    box(trough, 0x9a754e, 0, 0.55, side * 0.31, 1.73, 0.2, 0.12);
    box(trough, oak, side * 0.8, 0.55, 0, 0.13, 0.2, 0.65);
    box(trough, bronze, side * 0.62, 0.19, 0, 0.13, 0.38, 0.68);
  }
  solid(trough, 1.73, 0.7, 0.65);
}
