import { addGroup, SURFACE_GAP } from '../../core/geometry.js';
import { seededRandom } from '../../core/random.js';
import { addRoundSolid, addSolid } from './parts.js';

export const MULAN_STAGE = Object.freeze({ x: 1.05, z: -2.07, top: .46 });

export function buildMulanGarden({ THREE, room, outline, parts, colors, obstacles, toWorld, exhibit }) {
  const { batch, beam, part, matte } = parts;
  const { stone, cream, gold, shade } = colors;
  const grass = matte(0x73955a);
  const path = matte(0xc6b591);
  const grit = matte(0xac9a7b);
  const leaf = matte(0x548263);
  const bamboo = matte(0x51824b);
  const wood = matte(0x69434c);
  const blossoms = [0xdc789b, 0xf2a7bf, 0xf8c3d4, 0xc35f86].map(color => matte(color));
  const random = seededRandom(642);
  const geometry = new THREE.ShapeGeometry(new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x * .988, -z * .988))));
  geometry.rotateX(-Math.PI / 2);
  const lawn = part(room, geometry, grass, 0, -SURFACE_GAP.detail, 0, 1, 1, 1);
  lawn.name = 'Mulan garden lawn';

  const detail = new THREE.Group();
  const solid = (x, z, w, d, top) => addSolid(obstacles, ...toWorld(x, z), w, d, top, exhibit.rotation);
  for (let i = 0; i < 15; i++) {
    const z = 10.65 - i * .765;
    const x = .32 * Math.sin(i * .37);
    const width = 3.24 + .27 * Math.sin(i * .71);
    part(detail, 'box', i % 3 ? path : grit, x, .007, z, width, .028, .702);
    for (const side of [-1, 1]) {
      part(detail, 'gem', cream, x + side * (width / 2 + .16), .041, z - .06, .17, .072, .23).rotation.y = i;
    }
  }

  const { x, z, top } = MULAN_STAGE;
  const stage = addGroup(THREE, room, 'Mulan practice stage', x, 0, z);
  const staging = new THREE.Group();
  part(staging, 'box', stone, 0, .16, 0, 5.45, .32, 2.71);
  part(staging, 'box', shade, 0, .355, 0, 5.31, .07, 2.60);
  part(staging, 'box', cream, 0, top - .034, 0, 5.42, .068, 2.69);
  part(staging, 'box', stone, -.48, .074, 1.93, 2.49, .148, .57);
  part(staging, 'box', stone, -.48, .153, 1.51, 2.49, .306, .45);
  for (const side of [-1, 1]) {
    part(staging, 'box', gold, side * 2.31, top + .008, 0, .055, .018, 2.18);
  }
  batch(staging, stage);
  solid(x, z, 5.45, 2.71, top);
  // Keep the middle of the platform clear for the performance.
  solid(x, z, 3.9, 2.18, top + 2.55);
  solid(x - .48, z + 1.93, 2.49, .57, .148);
  solid(x - .48, z + 1.51, 2.49, .45, .306);

  const pagodaX = .95, pagodaZ = -6.48;
  buildPagoda({ THREE, room, parts, colors }, pagodaX, pagodaZ);
  solid(pagodaX, pagodaZ, 5.50, 4.45, 3.1);
  solid(pagodaX, pagodaZ + 2.38, 2.28, .54, .19);

  const treeParts = new THREE.Group();
  for (const [index, [tx, tz, h]] of [[-6.05, 5.35, 3.51], [5.6, 5.56, 3.83], [-5.90, -1.58, 4.21],
    [6.22, -3.85, 4.39], [-4.46, -6.13, 3.79]].entries()) {
    const tree = addGroup(THREE, treeParts, 'Sakura tree ' + (index + 1), tx, 0, tz, index * 1.37);
    const crown = [-.22, h * .62, .11];
    beam(tree, wood, [0, 0, 0], crown, .36, .42);
    beam(tree, wood, [.11, .06, .08], [.62, .008, .29], .15, .18);
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * .40;
      const dx = Math.cos(angle) * (1.24 + .33 * random());
      const dz = Math.sin(angle) * (1.12 + .33 * random());
      const dy = h * (.82 + .18 * random());
      beam(tree, wood, crown, [dx, dy - .23, dz], .22 - i * .018, .20);
      part(tree, 'ball', blossoms[(i + index) % 3], dx, dy, dz, 1.12, .73, .95).rotation.y = angle;
      part(tree, 'ball', blossoms[1 + i % 2], dx * .82 + .25, dy + .47, dz * .83 - .15, .74, .46, .69).rotation.y = i;
      part(tree, 'ball', blossoms[3], dx * 1.27, dy - .29, dz * 1.19, .53, .37, .49).rotation.y = -i;
    }
    part(tree, 'ball', blossoms[1], -.12, h + .21, .09, 1.16, .85, 1.16);
    for (let i = 0; i < 16; i++) {
      const a = random() * Math.PI * 2, r = .52 + random() * 1.57;
      part(tree, 'gem', blossoms[i % 4], Math.cos(a) * r, .018 + random() * .008, Math.sin(a) * r,
        .062 + random() * .098, .011, .045 + random() * .054).rotation.y = a;
    }
    addRoundSolid(obstacles, ...toWorld(tx, tz), .39, h);
  }
  const grove = addGroup(THREE, room, 'Sakura grove');
  batch(treeParts, grove);

  const pondX = 5.67, pondZ = 1.34;
  const pond = addGroup(THREE, room, 'Lotus pond', pondX, 0, pondZ);
  const pondParts = new THREE.Group();
  const water = matte(0x559f9d);
  part(pondParts, 'drum', stone, 0, .08, 0, 1.98, .16, 1.24);
  part(pondParts, 'drum', water, 0, .17, 0, 1.84, .021, 1.12);
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    part(pondParts, 'ball', i % 2 ? stone : cream, Math.cos(a) * 1.91, .14, Math.sin(a) * 1.18, .34, .18, .23)
      .rotation.y = -a;
  }
  for (const [lx, lz, yaw] of [[-.95, -.25, .4], [.54, .36, .9], [.96, -.37, -1.5]]) {
    part(pondParts, 'drum', leaf, lx, .194, lz, .29, .019, .23).rotation.y = yaw;
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5;
      part(pondParts, 'gem', blossoms[1 + i % 2], lx + Math.sin(a) * .078, .24, lz + Math.cos(a) * .078,
        .060, .107, .060).rotation.set(.62, a, 0, 'YXZ');
    }
    part(pondParts, 'gem', gold, lx, .27, lz, .064, .058, .064);
  }
  batch(pondParts, pond);
  solid(pondX, pondZ, 3.82, 2.42, .36);

  const amber = matte(0xffd48e, { emissive: 0xd28a46, emissiveIntensity: .38 });
  for (const [lx, lz] of [[-2.35, 8.22], [2.35, 8.22], [-2.27, .08], [3.82, -.64]]) {
    part(detail, 'box', stone, lx, .091, lz, .55, .18, .51);
    part(detail, 'box', stone, lx, .41, lz, .23, .55, .22);
    part(detail, 'box', shade, lx, .72, lz, .45, .12, .44);
    part(detail, 'box', amber, lx, .89, lz, .30, .23, .29);
    part(detail, 'drum', stone, lx, 1.023, lz, .34, .11, .33);
    part(detail, 'gem', stone, lx, 1.14, lz, .26, .16, .26);
    addRoundSolid(obstacles, ...toWorld(lx, lz), .28, 1.25);
  }

  for (const [bx, bz] of [[-7.28, 1.56], [7.35, -1.48], [-6.68, -4.69], [5.20, -7.22]]) {
    for (let i = 0; i < 5; i++) {
      const a = i * 2.4;
      const dx = bx + Math.cos(a) * .57, dz = bz + Math.sin(a) * .48;
      const h = 1.53 + random() * 1.35;
      part(detail, 'box', bamboo, dx, h / 2, dz, .094, h, .091).rotation.z = Math.cos(a) * .12;
      for (let j = 0; j < 3; j++) {
        part(detail, 'gem', leaf, dx + (j % 2 ? -.18 : .20), h * (.60 + j * .13), dz + .05,
          .32, .083, .12).rotation.z = j % 2 ? -.49 : .43;
      }
    }
    part(detail, 'ball', leaf, bx, .12, bz, .82, .31, .67);
    addRoundSolid(obstacles, ...toWorld(bx, bz), .60, 2.9);
  }
  batch(detail, room);
}

function buildPagoda({ THREE, room, parts, colors }, x, z) {
  const { part, batch } = parts;
  const { stone, cream, red, shade, gold, roof } = colors;
  const pagoda = addGroup(THREE, room, 'Three-tier garden pagoda', x, 0, z);
  const detail = new THREE.Group();
  part(detail, 'box', stone, 0, .20, 0, 5.48, .40, 4.44);
  part(detail, 'box', cream, 0, .428, 0, 5.32, .10, 4.30);
  part(detail, 'box', stone, 0, .094, 2.38, 2.28, .188, .54);
  part(detail, 'box', cream, 0, .266, 2.18, 2.29, .155, .46);

  const eaves = pagodaRoof(THREE);
  const tiers = [
    { base: .48, wall: 2.23, span: 2.58, depth: 1.94, rise: 1.35 },
    { base: 3.39, wall: 1.24, span: 1.73, depth: 1.34, rise: .97 },
    { base: 5.12, wall: .95, span: 1.13, depth: .91, rise: .81 },
  ];
  for (const [i, { base, wall, span, depth, rise }] of tiers.entries()) {
    const top = base + wall;
    const half = span * .82, halfDepth = depth * .81;
    part(detail, 'box', cream, 0, base + wall / 2, 0, half * 2, wall, halfDepth * 2);
    part(detail, 'box', shade, 0, top - .095, 0, half * 2 + .22, .23, halfDepth * 2 + .19);
    for (const side of [-1, 1]) {
      for (const back of [-1, 1]) {
        part(detail, 'box', red, side * half, base + wall / 2, back * halfDepth, .20, wall + .09, .20);
      }
      const panelX = side * half * .55;
      part(detail, 'box', shade, panelX, base + wall * .61, halfDepth + .018, span * .38, wall * .49, .045);
      for (const offset of [-.11, .11]) {
        part(detail, 'box', gold, panelX + offset * span, base + wall * .61, halfDepth + .050,
          .035, wall * .47, .035);
      }
    }
    if (!i) {
      part(detail, 'box', red, 0, base + .85, halfDepth + .076, 1.17, 1.76, .17);
      for (const side of [-1, 1]) {
        part(detail, 'box', shade, side * .25, base + .81, halfDepth + .177, .46, 1.53, .072);
        part(detail, 'gem', gold, side * .081, base + .81, halfDepth + .241, .049, .059, .032);
      }
    }
    part(detail, eaves, roof, 0, top + .075, 0, span * 1.21, rise, depth * 1.25);
  }
  part(detail, 'drum', gold, 0, 6.86, 0, .15, .18, .15);
  part(detail, 'gem', gold, 0, 7.10, 0, .25, .29, .25);
  batch(detail, pagoda);
}

function pagodaRoof(THREE) {
  const perimeter = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
  const profile = [[.97, -.08], [1, 0], [.91, .095], [.72, .30], [.47, .66], [.25, 1.06], [0, 1.065]];
  const positions = [], indices = [], colors = [];
  for (const [ring, [radius, y]] of profile.entries()) {
    for (const [i, [x, z]] of perimeter.entries()) {
      const corner = i % 2 === 0;
      positions.push(x * radius, y + (corner ? .31 * radius ** 3 : 0), z * radius);
      const shade = ring === 0 ? 0x9c654c : ring === 1 ? 0xe8bd78 : corner ? 0x317377 : 0x4f9590;
      colors.push(...new THREE.Color(shade).toArray());
      if (ring) {
        const a = (ring - 1) * 8 + i, b = (ring - 1) * 8 + (i + 1) % 8;
        indices.push(a, a + 8, b, b, a + 8, b + 8);
      }
    }
  }
  const underside = positions.length / 3;
  positions.push(0, -.08, 0);
  colors.push(...new THREE.Color(0x664b43).toArray());
  for (let i = 0; i < perimeter.length; i++) indices.push(underside, i, (i + 1) % perimeter.length);
  const roof = new THREE.BufferGeometry();
  roof.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  roof.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  roof.setIndex(indices);
  roof.computeVertexNormals();
  return roof;
}
