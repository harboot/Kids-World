import { SURFACE_GAP } from '../../core/geometry.js';
import { PALACE_WIDTH, PALACE_DEPTH } from './palace.js';
import { SUMMIT_SIZE } from './metadata.js';

const edge = SUMMIT_SIZE / 2;
const railLine = edge - 0.4;
const railWidth = 0.32;

export function blocksSummitEdge(x, z, playerRadius) {
  return Math.max(Math.abs(x), Math.abs(z)) + playerRadius > railLine - railWidth / 2;
}

export function buildSummit(THREE, scene, builder) {
  buildTerrace(builder);
  addMountainRange(THREE, scene);

  const clouds = new THREE.MeshBasicMaterial({ color: 0xe5efff });
  const { architecture, part } = builder;
  for (let i = 0; i < 34; i++) {
    const angle = i * 2.39996;
    const distance = 34 + (i * 17 % 47);
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const y = -19 - i % 7 * 1.35;
    const width = 4.7 + i % 5 * 0.9;
    part(architecture, 'ball', clouds, x, y, z, width, 1.8, width * 0.68).rotation.y = angle;
    part(architecture, 'ball', clouds, x + 3.1, y - 0.35, z + 1.3, width * 0.83, 1.05, width * 0.54).rotation.y = angle;
    part(architecture, 'ball', clouds, x - 2.8, y - 0.43, z - 0.95, width * 0.71, 0.94, width * 0.76);
  }
}

function buildTerrace(builder) {
  const { architecture, group, part, beam, materials: { blue, deep, frost, glass, light, lilac, pearl, silver, snow } } = builder;
  const box = (parent, material, ...values) => part(parent, 'box', material, ...values);

  for (const side of [-1, 1]) {
    const hallX = PALACE_WIDTH / 2;
    const hallZ = PALACE_DEPTH / 2;
    const eastWest = group('Summit terrace', side * (hallX + edge) / 2, 0, 0, architecture);
    eastWest.rotation.y = Math.PI / 2;
    const northSouth = group('Summit terrace', 0, 0, side * (hallZ + edge) / 2, architecture);
    paving(eastWest, SUMMIT_SIZE, edge - hallX);
    paving(northSouth, PALACE_WIDTH, edge - hallZ);
  }

  // Build the same lattice and rail cap on each side, with continuous corners.
  const length = railLine * 2;
  for (let side = 0; side < 4; side++) {
    const yaw = side * Math.PI / 2;
    const rim = group('Summit railing', Math.sin(yaw) * railLine, 0, Math.cos(yaw) * railLine, architecture);
    rim.rotation.y = yaw;
    function rail(material, y, z, height, depth) {
      // One pair runs through the corners, and the other meets its inside edges.
      const span = 2 * (railLine + z) + (side % 2 ? -depth : depth);
      box(rim, material, 0, y, z, span, height, depth);
    }
    rail(deep, -0.37, 0.13, 0.74, 0.54);
    rail(glass, 0.08, 0, 0.16, railWidth);
    const capTop = 1.255;
    rail(frost, capTop - 0.065, 0, 0.13, 0.22);
    rail(light, capTop, -0.02, 2 * SURFACE_GAP.detail, 0.089);
    rail(blue, 0.29, 0, 0.089, 0.17);
    box(rim, light, 0, 0.01, -1.06, length - 2.12, 0.021, 0.067);

    const bays = 20;
    for (let i = 0; i < bays; i++) {
      const left = -railLine + i * length / bays;
      const right = left + length / bays;
      const middle = (left + right) / 2;
      const top = [middle, 0.91, 0];
      const bottom = [middle, 0.31, 0];
      for (const x of [left, right]) {
        beam(rim, pearl, [x, 0.63, 0], top, 0.055);
        beam(rim, pearl, [x, 0.63, 0], bottom, 0.055);
      }
      const corner = i === 0;
      const pillar = i % 5 === 0;
      const post = pillar ? 0.31 : 0.14;
      box(rim, blue, left, 0.61, 0, post, 1.22, post);
      part(rim, 'gem', pillar ? silver : frost, left, pillar ? 1.39 : 1.32, 0, pillar ? 0.22 : 0.11, pillar ? 0.27 : 0.14, pillar ? 0.22 : 0.11);
      if (pillar) {
        part(rim, 'gem', corner ? lilac : glass, left, -0.88, 0.12, 0.45, corner ? 1.42 : 1.02, 0.32);
      }
    }
  }

  function paving(deck, length, depth) {
    box(deck, blue, 0, -0.29, 0, length, 0.56, depth);
    const count = Math.ceil(length / 2.8);
    const step = length / count;
    const palette = [frost, pearl, snow, frost];
    for (let i = 0; i < count; i++) {
      const x = -length / 2 + (i + 0.5) * step;
      for (const side of [-1, 1]) {
        const tile = palette[(i + side + palette.length) % palette.length];
        box(deck, tile, x, -0.08, side * depth / 4, step - 0.025, 0.16, depth / 2 - 0.022);
      }
    }
  }
}

function addMountainRange(THREE, scene) {
  const snow = [0xe9f7ff, 0xc1dbf1, 0xa6c5e2, 0xd2e5f7].map(color => new THREE.Color(color));
  const rock = [0x597897, 0x3d587e, 0x7494b0, 0x657d9f].map(color => new THREE.Color(color));
  const distant = [0x779bc6, 0x86a5ca, 0x5a7aa9, 0xa6bddd].map(color => new THREE.Color(color));
  const positions = [];
  const colors = [];
  const material = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, flatShading: true, vertexColors: true });

  function triangle(a, b, c, color) {
    positions.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) colors.push(color.r, color.g, color.b);
  }

  function join(upper, lower, palette, band) {
    for (let i = 0; i < upper.length; i++) {
      const next = (i + 1) % upper.length;
      const facet = (i * 3 + band * 5) % palette.length;
      triangle(upper[i], lower[i], upper[next], palette[facet]);
      triangle(upper[next], lower[i], lower[next], palette[(facet + 1) % palette.length]);
    }
  }

  // The playable deck rests on the snowy lip of a much deeper, jagged massif.
  const cliffRings = [[20.4, -0.72, 0.54], [21.8, -3.9, 1.48], [23.6, -10.9, 2.92],
    [28.9, -22, 3.68], [40.2, -46, 4.0], [55, -73, 4.0]].map(([width, y, roughness], band) =>
    Array.from({ length: 32 }, (_, i) => {
      const angle = i * Math.PI / 16;
      const x = Math.cos(angle);
      const z = Math.sin(angle);
      const reach = (width + roughness * Math.sin(i * 2.31 + band * 0.92)) / Math.max(Math.abs(x), Math.abs(z));
      return [x * reach, y + Math.sin(i * 3.14 / 3 + band) * roughness * 0.55, z * reach];
    }));
  for (let band = 1; band < cliffRings.length; band++) {
    join(cliffRings[band - 1], cliffRings[band], band < 3 ? snow : rock, band);
  }
  // Fill the irregular ledges visible just beyond the terrace.
  for (let i = 0; i < cliffRings[0].length; i++) {
    triangle([0, -0.87, 0], cliffRings[0][i], cliffRings[0][(i + 1) % cliffRings[0].length], snow[i % snow.length]);
  }
  storeMesh('Frozen Castle summit cliff');

  for (let i = 0; i < 36; i++) {
    const far = i >= 16;
    const angle = i * 2.39996;
    const distance = far ? 77 + i * 13 % 20 : 44 + i * 11 % 19;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const tipY = (far ? -5.5 : -9.5) - (i * 9 % 16);
    const width = 8.2 + i % 6 * 1.7;
    const start = i * 0.86;
    const peak = [x + Math.sin(i) * 2.4, tipY, z + Math.cos(i) * 2.9];
    const crown = [];
    const base = [];
    for (let face = 0; face < 6; face++) {
      const direction = start + face * Math.PI / 3;
      const reach = width * (0.91 + 0.21 * Math.sin(i + face * 2.24));
      const dx = Math.cos(direction) * reach;
      const dz = Math.sin(direction) * reach;
      const snowline = 5.9 + (i + face * 4) % 7;
      crown.push([x + dx * 0.54, tipY - snowline, z + dz * 0.54]);
      base.push([x + dx * 2, -60 - face % 3 * 4, z + dz * 2]);
    }
    for (let j = 0; j < crown.length; j++) {
      triangle(peak, crown[j], crown[(j + 1) % crown.length], snow[(j + i) % snow.length]);
    }
    join(crown, base, far ? distant : rock, i);
  }
  storeMesh('Snowy mountain range');

  function storeMesh(name) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    scene.add(mesh);
    positions.length = 0;
    colors.length = 0;
  }
}
