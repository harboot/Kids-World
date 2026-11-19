import { SURFACE_GAP } from '../../core/geometry.js';
import { CITY_PIER, FISHING_PIER, QUAY, shorelineX } from './terrain.js';
import { randomFrom } from './scenery.js';

export const CITY_SIGN = { x: 30.7, z: 17.25 };
const timber = 0x866045;
const oak = 0x604333;
const rope = 0xc1a179;

export function buildHarbor(THREE, scene, kit) {
  const { group, box, part, solid, beam, sign } = kit;
  const ripples = buildSea(THREE, scene, kit);
  const quay = group('Harbor seawall', QUAY, 0, 0);
  for (const [start, end] of [[-21, FISHING_PIER.front], [FISHING_PIER.back, CITY_PIER.front], [CITY_PIER.back, 21]]) {
    const center = (start + end) / 2;
    const span = end - start;
    box(quay, 0x8d8072, -0.05, -0.44, center, 0.68, 0.87, span);
    const blocks = Math.ceil(span / 1.25);
    for (let i = 0; i < blocks; i++) {
      const z = start + (i + 0.5) * span / blocks;
      const color = [0xa59580, 0x978a7a, 0xb2a08a][i % 3];
      box(quay, color, -0.21, 0.28, z, 0.58, 0.55, span / blocks - 0.028);
      box(quay, 0xc9b695, -0.21, 0.59, z, 0.70, 0.16, span / blocks - 0.027);
    }
    solid(quay, 0.7, span, 0.67, -0.21, center);
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 17; i++) {
      const z = side * (21 + i * 0.82);
      const x = shorelineX(z);
      const n = 0.48 + (i * 11 % 7) * 0.094;
      part(quay, 'rock', i % 2 ? 0x92897d : 0xa59e8a, x - QUAY + 0.18, -0.27, z,
        n, n * 0.73, n * 1.13, { rotation: [0.2, i, -0.26] });
    }
  }

  const fishing = pier(kit, 'Fishing pier', FISHING_PIER);
  const city = pier(kit, 'City boat pier', CITY_PIER);
  crates(kit, fishing, 24.57, -4.98);
  crates(kit, fishing, 25.55, -4.96, 0.73);
  barrel(kit, fishing, 25.8, -1.05);
  barrel(kit, fishing, 26.55, -1.14, 0.73);
  barrel(kit, quay, -2.7, 0.95);
  crates(kit, quay, -1.55, 1.48, 0.84);
  fishingNet(kit, fishing, 29.6, -5.65);
  fishingNet(kit, fishing, 27.4, -0.31);

  const citySign = group('City pier boarding sign', CITY_SIGN.x + 0.84, 0, CITY_SIGN.z - 1.5);
  box(citySign, oak, 0, 0.82, 0, 0.17, 1.62, 0.17);
  sign(citySign, 'To The City', -0.12, 1.54, 0, 1.8, 0.42, { background: '#35545b', yaw: -Math.PI / 2 });
  solid(citySign, 0.23, 0.23, 1.6);
  box(city, timber, 28.6, 0.46, 19, 1.66, 0.15, 0.57);
  for (const x of [28.05, 29.15]) box(city, oak, x, 0.23, 19, 0.15, 0.46, 0.43);
  solid(city, 1.66, 0.57, 0.53, 28.6, 19);

  const hull = boatHull(THREE);
  const finish = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const sites = [
    { name: 'Ochre fishing boat', x: 30.6, z: -8.05, yaw: Math.PI / 2, length: 4.7, width: 1.75, trim: 0xd2a45a, mooring: [32.85, -5.79] },
    { name: 'Green fishing boat', x: 35.6, z: 2.01, yaw: -Math.PI / 2, length: 4.65, width: 1.67, trim: 0x6c9885, mooring: [32.87, -0.19] },
    { name: 'City passenger boat', x: 34.67, z: 17.24, yaw: 0, length: 6.55, width: 2.67, trim: 0xab4e3a, mooring: [32.73, 15.20], passenger: true },
  ];
  const boats = sites.map(site => {
    const boat = group(site.name, site.x, -0.32, site.z, site.yaw);
    buildBoat(THREE, kit, site, boat, hull, finish);
    const z = site.passenger ? site.z - 2.66 : site.z;
    const x = site.passenger ? site.x - 0.77 : site.x + Math.sign(site.mooring[0] - site.x) * site.length * 0.43;
    const [mx, mz] = site.mooring;
    beam(quay, rope, [mx - QUAY, 0.46, mz], [(mx + x) / 2 - QUAY, 0.13, (mz + z) / 2], 0.036);
    beam(quay, rope, [(mx + x) / 2 - QUAY, 0.13, (mz + z) / 2], [x - QUAY, 0.08, z], 0.036);
    if (site.passenger) {
      beam(quay, rope, [32.73 - QUAY, 0.41, 19.31], [33.78 - QUAY, 0.10, 19.24], 0.039);
    }
    return boat;
  });

  return function pose(elapsed) {
    ripples.position.x = (Math.cos(elapsed * 0.88) - 1) * 0.28;
    ripples.position.z = Math.sin(elapsed * 0.55) * 0.19;
    boats.forEach((boat, i) => {
      const phase = i * 0.94;
      boat.position.y = -0.32 + (Math.sin(elapsed * 1.2 + phase) - Math.sin(phase)) * 0.036;
      boat.rotation.z = (Math.sin(elapsed * 1.03 + phase) - Math.sin(phase)) * 0.027;
    });
  };
}

function pier({ group, box, part, solid }, name, { left, right, front, back }) {
  const node = group(name, 0, 0, 0);
  const center = (front + back) / 2;
  const width = back - front;
  const planks = Math.ceil((right - left) / 0.32);
  const step = (right - left) / planks;
  for (let i = 0; i < planks; i++) {
    const x = left + (i + 0.5) * step;
    const color = [0xb2845b, 0xae7e55, 0xc2956a, 0xb78c62, 0xa47954][i % 5];
    box(node, color, x, -0.08, center, step - 0.012, 0.20, width, { shadow: true });
    for (const z of [front + 0.39, back - 0.39]) {
      box(node, oak, x, 0.023, z, 0.032, 0.018, 0.032);
    }
  }
  for (const z of [front + 0.04, back - 0.04]) box(node, timber, (left + right) / 2, -0.13, z, right - left, 0.25, 0.13);
  const posts = right > 35 ? [left + 0.55, 27.4, 32.87, right - 0.24] : [left + 0.55, 26.4, right - 0.27];
  for (const x of posts) {
    for (const z of [front + 0.20, back - 0.20]) {
      part(node, 'drum', oak, x, -0.23, z, 0.172, 1.55, 0.172, { shadow: true });
      part(node, 'drum', timber, x, 0.56, z, 0.183, 0.078, 0.183);
      for (const y of [0.36, 0.42]) part(node, 'drum', rope, x, y, z, 0.184, 0.045, 0.184);
      solid(node, 0.35, 0.35, 0.63, x, z);
    }
  }
  return node;
}

function buildSea(THREE, scene, { group, part }) {
  const seaLevel = -0.48;
  const sea = new THREE.PlaneGeometry(165, 225, 24, 20).rotateX(-Math.PI / 2).translate(55, seaLevel, -14);
  const points = sea.getAttribute('position');
  const colors = [];
  const deep = new THREE.Color(0x478d99);
  const blue = new THREE.Color(0x42888b);
  const shallow = new THREE.Color(0x71b5a7);
  const tint = new THREE.Color();
  for (let i = 0; i < points.count; i++) {
    const x = points.getX(i);
    const z = points.getZ(i);
    const shore = Math.max(0, 1 - Math.abs(x - 20.5) / 19);
    tint.copy(deep).lerp(blue, 0.19 + Math.sin(z * 0.087 + x * 0.12) * 0.18).lerp(shallow, shore * 0.83);
    colors.push(tint.r, tint.g, tint.b);
  }
  sea.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const water = new THREE.Mesh(sea, new THREE.MeshLambertMaterial({ vertexColors: true }));
  water.name = 'Fjord water';
  water.receiveShadow = true;
  scene.add(water);
  const waves = group('Water ripples', 0, 0, 0);
  const random = randomFrom(761);
  const placed = [];
  for (let i = 0; i < 252; i++) {
    const x = 22.9 + random() * (i < 145 ? 26 : 85);
    const z = (random() - 0.53) * (i < 145 ? 64 : 155);
    const size = 0.23 + random() * (i < 145 ? 0.73 : 1.1);
    const color = [0x8bbdb1, 0x7eb2aa, 0x9cc7bb, 0x76aaa5][i % 4];
    const width = 0.035 + random() * 0.026;
    const angle = -0.13 + random() * 0.27;
    // Keep coplanar ripple decals apart as the entire batch drifts together.
    const reachX = Math.hypot(size * Math.cos(angle), width * Math.sin(angle));
    const reachZ = Math.hypot(size * Math.sin(angle), width * Math.cos(angle));
    if (placed.some(other => Math.abs(x - other.x) < reachX + other.reachX &&
        Math.abs(z - other.z) < reachZ + other.reachZ)) continue;
    placed.push({ x, z, reachX, reachZ });
    part(waves, 'disk', color, x, seaLevel + SURFACE_GAP.detail, z, size, width, 1,
      { batch: waves, rotation: [-Math.PI / 2, 0, angle] });
  }
  return waves;
}

function crate({ box, solid }, node, x, z, size, base = 0) {
  box(node, 0xa77951, x, base + size / 2, z, size, size, size);
  for (const face of [-1, 1]) {
    box(node, oak, x, base + size - 0.084, z + face * size / 2, size, 0.13, 0.054);
    box(node, oak, x + face * size / 2, base + size - 0.084, z, 0.054, 0.13, size);
    for (const dx of [-0.36, 0.36]) box(node, 0x795138, x + dx * size, base + size / 2, z + face * size / 2, 0.08, size, 0.058);
  }
  solid(node, size, size, base + size, x, z);
}

function crates(kit, node, x, z, size = 1) {
  crate(kit, node, x, z, size);
  if (size === 1) crate(kit, node, x + 0.05, z + 0.11, 0.65, size);
}

function barrel({ part, solid }, node, x, z, size = 1) {
  part(node, 'barrel', timber, x, 0.44 * size, z, 0.4 * size, 0.88 * size, 0.4 * size);
  for (const y of [0.18, 0.68]) part(node, 'barrel', 0x514b44, x, y * size, z, (0.43 - y * 0.04) * size, 0.08 * size, 0.415 * size);
  solid(node, 0.82 * size, 0.82 * size, 0.9 * size, x, z);
}

function fishingNet({ beam, part }, node, x, z) {
  for (let i = -5; i <= 5; i++) {
    const px = x + i * 0.15;
    beam(node, 0xa28866, [px, 0.05, z + 0.13], [px + 0.11, -0.42, z + Math.sign(z + 3) * 0.34], 0.018);
  }
  for (const t of [0.09, 0.32, 0.58, 0.84]) {
    beam(node, 0xa28866, [x - 0.75 + 0.11 * t, 0.05 - 0.47 * t, z + 0.13 + (Math.sign(z + 3) * 0.34 - 0.13) * t],
      [x + 0.75 + 0.11 * t, 0.05 - 0.47 * t, z + 0.13 + (Math.sign(z + 3) * 0.34 - 0.13) * t], 0.02);
  }
  for (const dx of [-0.65, 0, 0.64]) part(node, 'rock', 0xc18654, x + dx, 0.063, z + 0.15, 0.067, 0.05, 0.056);
}

// Loft three cross sections into a clinker-style hull with an open interior.
const stations = [[-0.5, 0.024, 0.22], [-0.38, 0.26, 0.10], [-0.20, 0.46, 0.00], [0, 0.5, -0.06],
  [0.20, 0.46, 0.00], [0.38, 0.29, 0.10], [0.50, 0.025, 0.24]];

function boatHull(THREE) {
  const position = [];
  const colors = [];
  const ink = new THREE.Color();
  function strip(a, b, c, d, color) {
    ink.setHex(color);
    for (const vertex of [a, b, c, a, c, d]) {
      position.push(...vertex);
      colors.push(ink.r, ink.g, ink.b);
    }
  }
  for (const side of [-1, 1]) {
    const point = ([z, x, lift], width, level) => [side * x * width, lift + level, z];
    for (let i = 1; i < stations.length; i++) {
      const a = stations[i - 1];
      const b = stations[i];
      strip(point(a, 0.37, -0.37), point(b, 0.37, -0.37), point(b, 0.82, 0.03), point(a, 0.82, 0.03), 0x654735);
      strip(point(a, 0.82, 0.03), point(b, 0.82, 0.03), point(b, 1, 0.38), point(a, 1, 0.38), 0x9f7050);
      strip(point(a, 1, 0.38), point(b, 1, 0.38), point(b, 0.82, -0.07), point(a, 0.82, -0.07), 0xb28962);
      strip(point(a, 0.82, -0.07), point(b, 0.82, -0.07), [0, -0.08, b[0]], [0, -0.08, a[0]], 0x986b48);
    }
  }
  const hull = new THREE.BufferGeometry();
  hull.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  hull.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  hull.computeVertexNormals();
  return hull;
}

function buildBoat(THREE, { box, beam, part }, site, boat, hull, material) {
  const { width, length, passenger, trim } = site;
  const body = new THREE.Mesh(hull, material);
  body.scale.set(width, 1, length);
  boat.add(body);
  const dynamic = { batch: boat };
  for (const side of [-1, 1]) {
    const point = ([z, x, y]) => [x * width * side, y + 0.385, z * length];
    for (let i = 1; i < stations.length; i++) {
      beam(boat, trim, point(stations[i - 1]), point(stations[i]), 0.12, 0.115, dynamic);
    }
  }
  for (const i of passenger ? [-2, -1, 0, 1, 2] : [-1, 1]) {
    const z = i * (passenger ? 0.72 : 0.65);
    box(boat, 0xd0a57a, 0, 0.21, z, width * (0.87 - 0.055 * Math.abs(i)), 0.135, 0.27, dynamic);
  }
  if (passenger) {
    part(boat, 'drum', oak, 0, 0.59, length * 0.39, 0.045, 0.91, 0.045, dynamic);
    part(boat, 'banner', 0xaa5044, 0.24, 0.89, length * 0.39, 0.51, 0.26, 1, dynamic);
  } else {
    beam(boat, 0xca9b65, [-width * 0.35, 0.33, -length * 0.3], [width * 0.38, 0.31, length * 0.24], 0.07, 0.07, dynamic);
    box(boat, 0xa97d57, -width * 0.3, 0.33, -length * 0.27, 0.20, 0.055, 0.4, dynamic);
  }
}
