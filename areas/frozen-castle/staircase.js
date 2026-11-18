import { addPalaceSign, palaceGround } from './palace.js';

export const BALCONY_HEIGHT = 6.2;

const center = { x: -4.5, z: 4.6 };
const radius = 7.12;
const halfWidth = 1.6;
const start = 3.88;
const turn = start - Math.PI / 2;
const layers = 3;
const treadsPerLayer = 11;
const treadCount = layers * treadsPerLayer;
const openUnder = 3.35;
const balcony = {
  left: center.x, right: 4.75,
  front: center.z + radius - halfWidth, back: center.z + radius + halfWidth,
};

export const stairSite = { x: -6.9, z: -1.2 };

export function stairPoint(progress, offset = 0) {
  const angle = start - turn * progress;
  return {
    x: center.x + Math.cos(angle) * (radius + offset),
    z: center.z + Math.sin(angle) * (radius + offset),
    y: BALCONY_HEIGHT * progress,
  };
}

function locate(x, z, margin = 0) {
  if (x >= balcony.left) {
    if (x > balcony.right - margin || z < balcony.front + margin || z > balcony.back - margin) return;
    return { progress: 1, height: BALCONY_HEIGHT, landing: true };
  }
  const dx = x - center.x;
  const dz = z - center.z;
  if (Math.abs(Math.hypot(dx, dz) - radius) > halfWidth - margin) return;
  let angle = Math.atan2(dz, dx);
  if (angle < 0) angle += 2 * Math.PI;
  const progress = (start - angle) / turn;
  if (progress < 0 || progress > 1) return;
  return { progress, height: BALCONY_HEIGHT * progress };
}

export function buildStaircase(THREE, builder, document) {
  const { architecture, group, part, beam, solid, batchParts, materials } = builder;
  const { blue, deep, frost, glass, light, lilac, pearl, silver } = materials;

  const stand = group('Staircase pedestal', stairSite.x, 0, stairSite.z, architecture);
  part(stand, 'drum', deep, 0, 0.12, 0, 0.64, 0.24, 0.64);
  part(stand, 'drum', blue, 0, 0.59, 0, 0.39, 0.74, 0.39);
  part(stand, 'gem', lilac, 0, 1.19, 0, 0.37, 0.55, 0.37);
  addPalaceSign(THREE, document, stand, 'Ice Staircase', 0, 0.72, 0.44, 1.37, 0.26);
  solid(stairSite.x, stairSite.z, 1.23, 1.23, 1.7);

  const landing = group('Entrance balcony', 0, BALCONY_HEIGHT, 0, architecture);
  const width = balcony.right - balcony.left;
  const zCenter = (balcony.front + balcony.back) / 2;
  const xCenter = (balcony.left + balcony.right) / 2;
  part(landing, 'box', glass, xCenter, -0.2, zCenter, width, 0.4, halfWidth * 2);
  part(landing, 'box', frost, xCenter, -0.055, zCenter, width, 0.11, halfWidth * 2);
  part(landing, 'box', silver, xCenter, -0.23, balcony.front, width, 0.095, 0.14);
  for (let x = balcony.left; x < balcony.right - 0.5; x += width / 9) {
    part(landing, 'gem', pearl, x + 0.5, -0.42, balcony.front + 0.02, 0.25, 0.37, 0.15);
  }
  for (const [x, z, dx, dz, panels] of [
    [balcony.left, balcony.front, width, 0, 9],
    [balcony.right, balcony.front, 0, halfWidth * 2, 3],
  ]) {
    for (let i = 0; i < panels; i++) {
      const a = [x + dx * i / panels, 0, z + dz * i / panels];
      const b = [x + dx * (i + 1) / panels, 0, z + dz * (i + 1) / panels];
      railPanel(landing, a, b);
    }
  }

  const treadMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
  const segments = Array.from({ length: layers }, (_, layer) => {
    const model = group('Ice staircase section ' + (layer + 1));
    const first = layer * treadsPerLayer;
    const last = first + treadsPerLayer;
    model.add(new THREE.Mesh(treadGeometry(THREE, first, last), treadMaterial));
    const details = new THREE.Group();
    for (let i = first; i < last; i += 2) {
      const a = i / treadCount;
      const b = Math.min(i + 2, last) / treadCount;
      for (const side of [-1, 1]) {
        const edge = side * (halfWidth - 0.055);
        railPanel(details, coordinates(stairPoint(a, edge)), coordinates(stairPoint(b, edge)));
      }
    }
    batchParts(details, model);
    return { model, growth: null };
  });
  const barricades = [1, 2].map(i => {
    const model = group('Unfinished staircase barrier');
    const details = new THREE.Group();
    railPanel(details, coordinates(stairPoint(i / layers, -halfWidth)), coordinates(stairPoint(i / layers, halfWidth)));
    batchParts(details, model);
    return model;
  });

  function coordinates({ x, y, z }) { return [x, y, z]; }

  function railPanel(parent, a, b) {
    const lift = ([x, y, z], height) => [x, y + height, z];
    const middle = a.map((n, i) => (n + b[i]) / 2);
    beam(parent, blue, lift(a, 0.27), lift(b, 0.27), 0.095);
    beam(parent, light, lift(a, 1.06), lift(b, 1.06), 0.085);
    beam(parent, pearl, lift(a, 0.89), lift(middle, 0.29), 0.061);
    beam(parent, pearl, lift(middle, 0.29), lift(b, 0.89), 0.061);
    beam(parent, glass, a, lift(a, 1.17), 0.125);
    part(parent, 'gem', silver, a[0], a[1] + 1.12, a[2], 0.11, 0.18, 0.11);
  }

  function builtFraction() {
    const gap = segments.findIndex(section => section.growth !== 1);
    return gap === -1 ? 1 : gap / layers;
  }

  function getGroundHeight(x, z, feet = 0) {
    const surface = locate(x, z);
    if (surface && (surface.landing || surface.progress <= builtFraction()) &&
        ((!surface.landing && surface.height < openUnder) || feet >= surface.height - 0.32)) {
      return surface.height;
    }
    return palaceGround(x, z);
  }

  function blocksGround(x, z, playerRadius, feet, from) {
    const previous = locate(from.x, from.z);
    if (!previous || feet < previous.height - 0.32) return false;
    const limit = builtFraction();
    if (!previous.landing && (previous.progress > limit || previous.height < 0.27)) return false;

    const next = locate(x, z, playerRadius);
    if (!next) return previous.height >= 0.3;
    if (next.landing && z > balcony.back - 0.45) return true;
    // Leave a player's radius in front of a temporary rail until the next flight settles.
    const clearance = limit < 1 ? playerRadius / ((radius - halfWidth) * turn) : 0;
    return next.progress > limit - clearance;
  }

  function pose() {
    for (const { model, growth } of segments) {
      model.visible = growth !== null;
      model.position.y = growth === 1 ? 0 : -0.58 * (1 - (growth ?? 0)) ** 3;
    }
    const limit = builtFraction();
    barricades.forEach((model, i) => { model.visible = limit === (i + 1) / layers; });
  }

  return { segments, getGroundHeight, blocksGround, pose };
}

function treadGeometry(THREE, first, last) {
  const positions = [];
  const colors = [];
  const frost = new THREE.Color(0xc9edff);
  const bright = new THREE.Color(0xe1f4ff);
  const ice = new THREE.Color(0x4fa9d5);
  const shade = new THREE.Color(0x35658f);

  function quad(a, b, c, d, color) {
    for (const point of [a, b, c, a, c, d]) {
      positions.push(point.x, point.y, point.z);
      colors.push(color.r, color.g, color.b);
    }
  }

  for (let i = first; i < last; i++) {
    const start = i / treadCount;
    const end = (i + 1) / treadCount;
    const height = BALCONY_HEIGHT * end;
    const bottom = height < openUnder ? -0.014 : height - 0.34;
    const top = [
      stairPoint(start, -halfWidth), stairPoint(start, halfWidth),
      stairPoint(end, halfWidth), stairPoint(end, -halfWidth),
    ].map(point => ({ ...point, y: height }));
    const base = top.map(point => ({ ...point, y: bottom }));
    quad(...top, i % 2 === 0 ? frost : bright);
    quad(...base.toReversed(), shade);
    for (let j = 0; j < 4; j++) {
      const next = (j + 1) % 4;
      quad(top[j], base[j], base[next], top[next], j % 2 === 0 ? ice : shade);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}
