import { SURFACE_GAP } from '../../core/geometry.js';
import { SUMMIT_HEIGHT } from './terrain.js';

const HALF_WIDTH = 1.18;
const WALL_WIDTH = 0.24;
const WALL_HEIGHT = 0.63;
const DECK_DEPTH = 0.2;
const DECK_Y = SUMMIT_HEIGHT + SURFACE_GAP.roof;
const LANDING_Y = SURFACE_GAP.roof;

// Keep the launch facing west, then wind back along the valley to the southwest runout.
const turns = [
  [-5.8, -24], [-11, -24], [-19, -23], [-23, -23], [-25.4, -19], [-23.4, -14.5],
  [-17.7, -10.4], [-16.1, -5], [-16.1, 1.5], [-15.4, 7.7], [-17.5, 12.3],
  [-22.4, 14.9], [-25.6, 18.6],
];
const sectionsPerTurn = 6;
const SEGMENTS = (turns.length - 1) * sectionsPerTurn;

function curve(a, b, c, d, t) {
  return b + t * ((c - a) + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a))) / 2;
}

function buildPath() {
  const path = [{ x: turns[0][0], z: turns[0][1], distance: 0 }];
  for (let i = 1; i < turns.length; i++) {
    const [ax, az] = turns[Math.max(0, i - 2)];
    const [bx, bz] = turns[i - 1];
    const [cx, cz] = turns[i];
    const [dx, dz] = turns[Math.min(turns.length - 1, i + 1)];
    for (let step = 1; step <= sectionsPerTurn; step++) {
      const t = step / sectionsPerTurn;
      const x = curve(ax, bx, cx, dx, t);
      const z = curve(az, bz, cz, dz, t);
      const start = path.at(-1);
      path.push({ x, z, distance: start.distance + Math.hypot(x - start.x, z - start.z) });
    }
  }
  const length = path.at(-1).distance;
  return Object.freeze(path.map(({ x, z, distance }) => {
    const t = distance / length;
    const descent = (t * t * (3 - 2 * t)) ** 1.3;
    return Object.freeze({ x, y: LANDING_Y + (DECK_Y - LANDING_Y) * (1 - descent), z });
  }));
}

export const SLIDE_PATH = buildPath();
export const SLIDE_START = SLIDE_PATH[0];
export const SLIDE_LANDING = SLIDE_PATH.at(-1);
export const SLIDE_PLATFORM = Object.freeze({
  x: SLIDE_START.x + 1.65, z: SLIDE_START.z, length: 3.3, width: 3.42,
});

function wallHeight(i) {
  return WALL_HEIGHT * Math.min(1, (SEGMENTS - i) / 5);
}

export function addIceSlide(THREE, scene, { mesh, material, box, block }, ground) {
  const group = new THREE.Group();
  group.name = 'Ice Mountain slide';
  scene.add(group);

  const positions = [];
  const colors = [];
  const blue = new THREE.Color(0x8ccfe9);
  const pale = new THREE.Color(0xc4edf8);
  const edge = new THREE.Color(0x62a8c9);
  const deep = new THREE.Color(0x4986a8);

  const sections = SLIDE_PATH.map((point, i) => {
    const a = SLIDE_PATH[Math.max(0, i - 1)];
    const b = SLIDE_PATH[Math.min(SEGMENTS, i + 1)];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const nx = i === 0 ? 0 : (b.z - a.z) / length;
    const nz = i === 0 ? 1 : (a.x - b.x) / length;
    const at = (lateral, dy) => [point.x + lateral * nx, point.y + dy, point.z + lateral * nz];
    const outer = HALF_WIDTH + WALL_WIDTH;
    const wall = wallHeight(i);
    return [
      at(-outer, -DECK_DEPTH), at(-outer, wall * 0.83), at(-HALF_WIDTH, wall), at(-HALF_WIDTH, 0),
      at(-0.76, 0), at(-0.69, 0), at(HALF_WIDTH, 0), at(HALF_WIDTH, wall),
      at(outer, wall * 0.83), at(outer, -DECK_DEPTH),
    ];
  });

  function triangle(a, b, c, color) {
    positions.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) colors.push(color.r, color.g, color.b);
  }

  // Cross sections join the deck, both walls, and the underside in one opaque mesh.
  const faceColors = [edge, pale, edge, blue, pale, blue, edge, pale, edge, deep];
  for (let i = 1; i < sections.length; i++) {
    const a = sections[i - 1];
    const b = sections[i];
    for (const [j, color] of faceColors.entries()) {
      const k = (j + 1) % a.length;
      triangle(a[j], a[k], b[j], color);
      triangle(a[k], b[k], b[j], color);
    }
  }
  const channel = new THREE.BufferGeometry();
  channel.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  channel.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  channel.computeVertexNormals();
  const surface = new THREE.Mesh(channel, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  surface.receiveShadow = true;
  group.add(surface);

  const pack = material(0xc0e4f3);
  const post = material(0x6fa9c7);
  const trim = material(0xe0f5fa);
  const supportSites = [10, 17, 24, 31, 37, 43, 50, 57, 64];
  const support = new THREE.CylinderGeometry(0.46, 0.68, 1, 5);
  for (const i of supportSites) {
    const { x, y, z } = SLIDE_PATH[i];
    const bottom = ground(x, z);
    const height = y - DECK_DEPTH - bottom;
    if (height < 0.25) continue;
    mesh(support, post, x, bottom + height / 2, z, 1.15, height, 1.15, false, group);
    block(x, z, 1.24, 1.24, bottom + height);
  }

  const { x, y, z } = SLIDE_START;
  const platform = mesh(box, pack, SLIDE_PLATFORM.x, y - 0.12, z, SLIDE_PLATFORM.length, 0.24, SLIDE_PLATFORM.width, false, group);
  platform.name = 'Ice slide starting platform';
  for (const side of [-1, 1]) {
    mesh(box, post, x + 1.67, y + 0.28, z + side * 1.66, 2.95, 0.56, 0.17, false, group);
    mesh(box, trim, x + 1.67, y + 0.58, z + side * 1.66, 2.95, 0.075, 0.21, false, group);
    mesh(box, post, x + 0.18, y + 0.53, z + side * 1.36, 0.26, 1.23, 0.28, false, group);
    mesh(box, trim, x + 0.18, y + 1.17, z + side * 1.36, 0.33, 0.12, 0.35, false, group);
  }
  const gate = mesh(box, pack, x + 0.18, y + 0.48, z, 0.17, 0.22, 2.58, false, group);
  gate.name = 'Ice slide gate';

  const left = Math.min(...SLIDE_PATH.map(point => point.x)) - HALF_WIDTH - WALL_WIDTH;
  const north = Math.min(...SLIDE_PATH.map(point => point.z)) - HALF_WIDTH - WALL_WIDTH;
  const south = SLIDE_LANDING.z + HALF_WIDTH + WALL_WIDTH;

  function blocksGround(px, pz, radius, feet = 0) {
    if (px < left - radius || px > x + 3.35 + radius || pz < north - radius || pz > south + radius) return false;
    const platformEdge = Math.abs(pz - z);
    if (px >= x + 0.05 - radius && px <= x + 3.19 + radius &&
        Math.abs(platformEdge - 1.66) < radius + 0.105 && feet >= y - 1.8) return true;
    if (Math.abs(px - x - 0.18) < radius + 0.13 && platformEdge < 1.51 + radius && feet >= y - 1.8) return true;

    if (px > x + radius) return false;
    const reach = HALF_WIDTH + WALL_WIDTH + radius;
    for (let i = 1; i <= SEGMENTS - 4; i++) {
      const a = SLIDE_PATH[i - 1];
      const b = SLIDE_PATH[i];
      if (px < Math.min(a.x, b.x) - reach || px > Math.max(a.x, b.x) + reach ||
          pz < Math.min(a.z, b.z) - reach || pz > Math.max(a.z, b.z) + reach) continue;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (pz - a.z) * dz) / (dx * dx + dz * dz)));
      const surfaceY = a.y + (b.y - a.y) * t;
      if (feet + 1.85 < surfaceY - DECK_DEPTH) continue;
      if (Math.hypot(px - a.x - t * dx, pz - a.z - t * dz) < reach) return true;
    }
    return false;
  }

  return { blocksGround, gate };
}
