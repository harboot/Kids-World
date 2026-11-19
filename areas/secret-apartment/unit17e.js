import { SURFACE_GAP } from '../../core/geometry.js';
import { HALL } from './corridor.js';
import { COLORS, ceilingLight, pointLight, tileFloor, wallX, wallZ } from './geometry.js';

const LEFT = 0.8;
const RIGHT = 10.68;
const BACK = 3.33;
const DIVIDER = 6.52;
const CEILING = 2.92;
const KITCHEN_DOOR = { front: -3.61, back: -1.68, height: 2.326 };
const WHITE = 0xe9e5dd;

function marble(THREE, architecture) {
  const map = architecture.canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#f3f0e9';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 83; i++) {
      const x = (Math.sin(i * 27.1) + 1) * w / 2;
      const y = (Math.cos(i * 46.4) + 1) * h / 2;
      const gradient = ctx.createRadialGradient(x, y, 3, x, y, 35 + i % 7 * 9);
      gradient.addColorStop(0, i % 2 ? '#c7bbb228' : '#d5d6d580');
      gradient.addColorStop(1, '#ffffff00');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }
    for (let i = 0; i < 21; i++) {
      ctx.beginPath();
      const x = i * 23 - 35;
      ctx.moveTo(x + 58, -10);
      ctx.bezierCurveTo(x + 33, 128, x - 16, 164, x - 36, 235);
      ctx.bezierCurveTo(x - 53, 307, x - 133, 405, x - 146, 522);
      ctx.strokeStyle = i % 6 === 0 ? '#847e7759' : '#b7b1a947';
      ctx.lineWidth = i % 6 === 0 ? 2.1 : 0.65 + (i % 3) * 0.45;
      ctx.stroke();
    }
  });
  return new THREE.MeshStandardMaterial({ color: map ? 0xffffff : WHITE, map, roughness: 0.51 });
}

function wallPanel(THREE, parent, material, x, y, z, width, height, yaw) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = yaw;
  parent.add(mesh);
  return mesh;
}

function tvPicture(THREE, architecture) {
  const map = architecture.canvasTexture(512, 256, (ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#133a59');
    sky.addColorStop(0.48, '#5c8b9b');
    sky.addColorStop(0.77, '#f5b59d');
    sky.addColorStop(1, '#d99077');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffdec4';
    ctx.beginPath();
    ctx.arc(0.73 * w, 0.51 * h, 0.114 * h, 0, 2 * Math.PI);
    ctx.fill();
    for (let layer = 0; layer < 4; layer++) {
      ctx.fillStyle = ['#75909a', '#547481', '#355a63', '#243f46'][layer];
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 4) {
        const y = h * (0.55 + 0.13 * layer) + 14 * Math.sin(x * 0.028 + layer * 1.23) +
          11 * Math.cos(x * 0.018 - layer) + 5 * Math.sin(x * 0.093 + layer);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.fill();
    }
  });
  return new THREE.MeshBasicMaterial({ color: map ? 0xe1ece9 : 0x537c88, map });
}

function livingRoom(THREE, architecture, b, stone) {
  const sofaX = 1.94;
  const sofaZ = 0.08;
  const fabric = 0xdfd2ba;
  b.part(0xb2a187, sofaX, 0.25, sofaZ, 1.34, 0.43, 3.1);
  b.solid(sofaX + 0.035, sofaZ, 1.4, 3.15);
  b.part(fabric, sofaX - 0.54, 0.62, sofaZ, 0.29, 0.97, 3.05);
  for (let i = -1; i <= 1; i++) {
    const z = sofaZ + i * 0.89;
    b.part(0xe9dfc7, sofaX + 0.08, 0.475, z, 0.99, 0.21, 0.863);
    b.part(0xe6dbc5, sofaX - 0.35, 0.825, z, 0.31, 0.48, 0.875, { roll: -0.11 });
  }
  for (const side of [-1, 1]) {
    b.part(fabric, sofaX + 0.16, 0.61, sofaZ + side * 1.43, 1.14, 0.42, 0.29);
    b.part(COLORS.walnut, sofaX + 0.49, 0.06, sofaZ + side * 1.36, 0.085, 0.12, 0.085);
  }
  const pillows = [
    [1.82, 0.783, -0.91, 0xa34343, -0.155], [1.87, 0.742, -0.48, 0x76313b, 0.20],
    [1.78, 0.77, 1.04, 0x702e3e, -0.18], [1.93, 0.75, 0.72, 0xb15351, 0.15],
  ];
  for (const [x, y, z, color, tilt] of pillows) {
    b.part(color, x, y, z, 0.235, 0.46, 0.46, { shape: 'oval', pitch: tilt, roll: -0.32 });
  }
  b.part(0xb39a83, 4.05, SURFACE_GAP.detail, 0.52, 3.04, 0.015, 3.78);
  b.part(0xd1baa4, 4.05, SURFACE_GAP.trim, 0.52, 2.89, 0.009, 3.62);
  for (let i = 0; i < 20; i++) {
    b.part(i % 2 ? 0xc4ae96 : 0xc9b39c, 4.05, SURFACE_GAP.roof - 0.007, -1.14 + i * 0.177,
      2.84, 0.005, 0.025);
  }
  const tx = 4.07;
  const tz = 0.61;
  b.part(0x7e5c44, tx, 0.20, tz, 0.92, 0.399, 1.48);
  b.solid(tx, tz, 0.99, 1.56);
  b.part(0xc2a17e, tx, 0.431, tz, 0.99, 0.095, 1.56);
  b.part(0x725140, tx - 0.28, 0.51, tz + 0.32, 0.34, 0.055, 0.47, { yaw: 0.15 });
  b.part(0xd2b695, tx - 0.28, 0.544, tz + 0.32, 0.31, 0.022, 0.439, { yaw: 0.15 });
  b.part(0xd8b896, tx + 0.18, 0.536, tz - 0.28, 0.30, 0.11, 0.30, { shape: 'cylinder' });

  const tvZ = 0.79;
  const face = DIVIDER - 0.11;
  const set = wallPanel(THREE, b.root, stone, face - SURFACE_GAP.detail, 1.49, tvZ, 3.51, 2.66, -Math.PI / 2);
  set.name = 'White marble television feature wall';
  for (const z of [-0.96, 2.54]) b.part(COLORS.brass, face - 0.029, 1.49, z, 0.033, 2.66, 0.023);
  b.part(0x242626, face - 0.079, 1.57, tvZ, 0.12, 1.03, 1.82);
  wallPanel(THREE, b.root, tvPicture(THREE, architecture), face - 0.079 - 0.06 - SURFACE_GAP.detail,
    1.572, tvZ, 1.72, 0.94, -Math.PI / 2).name = 'Television landscape';
  b.part(0x33383a, face - 0.16, 0.962, tvZ, 0.119, 0.069, 1.34);
  b.block(WHITE, face - 0.258, 0.326, tvZ, 0.596, 0.575, 3.32);
  b.part(0xf6eee3, face - 0.268, 0.634, tvZ, 0.626, 0.053, 3.38);
  for (let i = -1; i <= 1; i++) {
    b.part(0xeee6da, face - 0.577, 0.326, tvZ + i * 1.095, 0.039, 0.465, 1.067);
    b.part(COLORS.brass, face - 0.604, 0.442, tvZ + i * 1.095, 0.025, 0.024, 0.29);
  }
  for (const y of [1.31, 1.90, 2.48]) {
    b.part(WHITE, face - 0.162, y, 2.28, 0.37, 0.06, 0.49);
  }
  for (let i = 0; i < 4; i++) {
    b.part([0xaf8270, 0xc9ac77, 0x69787a, 0x8f594d][i], face - 0.163,
      1.44 + i % 2 * 0.014, 2.09 + i * 0.081, 0.218, 0.198 + (i % 2) * 0.032, 0.062);
  }
  const vx = face - 0.31;
  const vz = -0.53;
  b.part(0xb3876f, vx, 0.795, vz, 0.22, 0.29, 0.22, { shape: 'oval' });
  b.part(0xca9b7e, vx, 0.943, vz, 0.077, 0.07, 0.077, { shape: 'cylinder' });
  for (let i = 0; i < 5; i++) {
    const angle = i * 2.4;
    const x = vx + Math.cos(angle) * 0.06;
    const z = vz + Math.sin(angle) * 0.112;
    b.part(COLORS.leaf, x, 1.055, z, 0.02, 0.28, 0.02, { shape: 'cylinder', pitch: Math.sin(angle) * 0.35 });
    b.part(i % 3 ? 0xb44a55 : 0xe3b9a2, x, 1.19 + i % 2 * 0.05, z, 0.106, 0.09, 0.11, { shape: 'leaf' });
  }

  b.part(WHITE, LEFT + 0.197, 2.56, -0.13, 0.23, 0.30, 1.15);
  b.part(0x978e81, LEFT + 0.317, 2.494, -0.13, 0.014, 0.04, 1.02);
  b.part(0xd4edc8, LEFT + 0.335, 2.53, 0.282, 0.012, 0.024, 0.056, { glow: true });
  architecture.sign(b.root, ['—   17E   —'], 2.50, 1.58, HALL.south + 0.145, 0.92, 0.53, { color: '#dec49e', background: '#55463a' });
}

function kitchen(THREE, architecture, b, stone) {
  const x = RIGHT - 0.465;
  const base = 0xcac2b3;
  const upper = 0xe5ded0;
  b.block(base, x, 0.42, 0.17, 0.73, 0.84, 5.48);
  b.part(0x66594e, x - 0.258, 0.083, 0.17, 0.436, 0.166, 5.40);
  b.part(0xe6e0d3, x - 0.027, 0.893, 0.17, 0.805, 0.108, 5.55);
  wallPanel(THREE, b.root, stone, RIGHT - 0.12 - SURFACE_GAP.detail, 1.23, 0.17, 5.55, 0.56, -Math.PI / 2);
  for (const z of [-2.18, -1.4, -0.62, 0.16, 0.94, 1.72, 2.50]) {
    if (z === -0.62) continue;
    b.part(base, x - 0.392, 0.487, z, 0.064, 0.59, 0.755);
    b.part(0x847865, x - 0.435, 0.65, z, 0.036, 0.025, 0.29);
  }
  b.part(upper, x + 0.105, 2.145, 0.34, 0.54, 0.82, 5.15);
  for (const z of [-1.84, -1.11, -0.38, 0.35, 1.08, 1.81, 2.54]) {
    b.part(upper, x - 0.187, 2.145, z, 0.057, 0.75, 0.697);
    b.part(0xa3947d, x - 0.23, 1.91, z - 0.198, 0.043, 0.16, 0.027);
  }
  b.part(COLORS.warmLight, x + 0.025, 1.725, 0.34, 0.055, 0.028, 4.91, { glow: true });

  const rangeZ = -0.62;
  b.part(0x292e30, x - 0.04, 0.956, rangeZ, 0.67, 0.03, 0.72);
  for (const dx of [-0.155, 0.155]) {
    for (const dz of [-0.17, 0.17]) {
      b.part(0x737775, x + dx - 0.02, 0.98, rangeZ + dz, 0.236, 0.02, 0.236, { shape: 'cylinder' });
      b.part(0x212529, x + dx - 0.02, 0.996, rangeZ + dz, 0.202, 0.013, 0.202, { shape: 'cylinder' });
    }
  }
  b.part(COLORS.steel, x - 0.392, 0.49, rangeZ, 0.081, 0.67, 0.741);
  b.part(0x272d30, x - 0.443, 0.405, rangeZ, 0.045, 0.395, 0.65);
  b.part(0x424d51, x - 0.475, 0.401, rangeZ, 0.028, 0.24, 0.528);
  b.part(0xb9b7aa, x - 0.507, 0.611, rangeZ, 0.058, 0.038, 0.51);
  for (const z of [rangeZ - 0.22, rangeZ + 0.22]) {
    b.part(0x4c4b49, x - 0.447, 0.758, z, 0.07, 0.075, 0.075, { shape: 'cylinder', roll: Math.PI / 2 });
  }
  architecture.sign(b.root, ['12:00'], x - 0.458, 0.758, rangeZ, 0.23, 0.067, { yaw: -Math.PI / 2, color: '#e0d6ad' });
  architecture.group(b.root, 'Oven front', x - 0.52, 0.49, rangeZ);

  const sinkZ = 1.59;
  b.part(0xafb7b7, x - 0.042, 0.954, sinkZ, 0.63, 0.026, 0.71);
  b.part(0x67777a, x - 0.078, 0.973, sinkZ, 0.50, 0.022, 0.52);
  b.part(0x42565d, x - 0.075, 0.985, sinkZ, 0.414, 0.014, 0.434);
  b.part(COLORS.steel, x + 0.236, 1.087, sinkZ, 0.052, 0.25, 0.052, { shape: 'cylinder' });
  b.part(COLORS.steel, x + 0.118, 1.207, sinkZ, 0.255, 0.043, 0.043);
  b.part(COLORS.steel, x - 0.007, 1.174, sinkZ, 0.043, 0.096, 0.043, { shape: 'cylinder' });
  b.part(0x7c9375, x + 0.19, 1.05, 2.1, 0.12, 0.21, 0.12, { shape: 'cylinder' });
  b.part(0x6e5744, x - 0.105, 0.962, 0.45, 0.39, 0.044, 0.47, { yaw: -0.14 });
  for (let i = 0; i < 3; i++) b.part(0xc29454, x - 0.17 + i * 0.095, 1.016, 0.47 + i % 2 * 0.08,
    0.142, 0.092, 0.115, { shape: 'oval' });

  const fridgeZ = -4.16;
  b.block(0xbcbeb7, x - 0.063, 1.00, fridgeZ, 0.81, 2.0, 0.91);
  b.part(0xd0d1c7, x - 0.498, 0.626, fridgeZ, 0.085, 1.21, 0.865);
  b.part(0xe1e0d7, x - 0.498, 1.626, fridgeZ, 0.085, 0.76, 0.865);
  for (const y of [0.982, 1.47]) b.part(0x727772, x - 0.557, y, fridgeZ + 0.29, 0.053, 0.292, 0.043);
  b.part(0xdbb576, x - 0.55, 1.70, fridgeZ - 0.19, 0.016, 0.18, 0.13);
  b.part(0x7b8874, x - 0.563, 1.798, fridgeZ - 0.17, 0.018, 0.044, 0.06);
}

function windowView(THREE, architecture, b) {
  const z = BACK;
  const x = 3.8;
  const w = 3.6;
  const sill = 0.85;
  const top = 2.59;
  const outer = b.root;
  const map = architecture.canvasTexture(512, 256, (ctx, width, height) => {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#83b3cc');
    sky.addColorStop(0.72, '#d9e2dc');
    sky.addColorStop(1, '#d6d4bf');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 21; i++) {
      const h = 15 + (i * 37) % 68;
      const bx = i * 26 - 12;
      ctx.fillStyle = ['#8faaa9', '#9fb4b3', '#b2bdb2'][i % 3];
      ctx.fillRect(bx, height - h - 7, 23, h);
      ctx.fillStyle = '#c7d5cc90';
      for (let j = 0; j < h - 8; j += 7) {
        ctx.fillRect(bx + 4, height - h + j - 3, 4, 3);
        ctx.fillRect(bx + 13, height - h + j - 3, 4, 3);
      }
    }
  });
  wallPanel(THREE, outer, new THREE.MeshBasicMaterial({ map, color: map ? 0xffffff : 0x9bbfc7 }),
    x, (sill + top) / 2, z - 0.126, w, top - sill, Math.PI);
  for (const dx of [-w / 2, 0, w / 2]) b.part(WHITE, x + dx, (sill + top) / 2, z - 0.174, 0.065, top - sill, 0.065);
  b.part(WHITE, x, top, z - 0.172, w + 0.06, 0.063, 0.066);
  b.part(0xd1ba99, x, sill, z - 0.202, w + 0.18, 0.10, 0.21);
  b.part(COLORS.brass, x, 2.69, z - 0.248, w + 0.38, 0.032, 0.032);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      b.part(i % 2 ? 0xd3c1a5 : 0xe4d4bb, x + side * (w / 2 + 0.161 - i * 0.09),
        1.77, z - 0.28 - (i % 2) * 0.039, 0.13, 1.76, 0.10, { shape: 'oval' });
    }
  }
}

export function buildUnit17E(THREE, architecture, { b }) {
  const front = HALL.south;
  const longest = BACK - front;
  const midpoint = (LEFT + RIGHT) / 2;
  tileFloor(b, midpoint, (front + BACK) / 2, RIGHT - LEFT, longest, 0.77,
    [0xe4d4ba, 0xe9d9c3, 0xe2d4bd, 0xe7d7bd, 0xe7dcca]);
  wallZ(b, COLORS.ivory, LEFT, front, BACK, CEILING);
  wallZ(b, COLORS.ivory, RIGHT, front, BACK, CEILING);
  wallX(b, COLORS.ivory, LEFT, RIGHT, BACK, CEILING);
  wallX(b, COLORS.ivory, DIVIDER, RIGHT, -4.83, CEILING);
  wallZ(b, 0xe9e1d3, DIVIDER, front, KITCHEN_DOOR.front, CEILING, 0.22);
  wallZ(b, 0xe9e1d3, DIVIDER, KITCHEN_DOOR.back, BACK, CEILING, 0.22);
  b.part(0xe9e1d3, DIVIDER, 2.7, -2.645, 0.22, 0.44, 1.93);
  for (const z of [-3.6, -1.69]) b.part(COLORS.walnut, DIVIDER, 1.176, z, 0.263, 2.35, 0.069);
  b.part(COLORS.walnut, DIVIDER, 2.365, -2.645, 0.263, 0.078, 1.98);
  b.part(0xeee5d7, midpoint, CEILING + 0.079, (front + BACK) / 2, RIGHT - LEFT, 0.158, longest);
  b.part(0xb99673, LEFT + 0.14, 0.075, (front + BACK) / 2, 0.041, 0.15, longest - 0.2);
  b.part(0xb99673, midpoint, 0.075, BACK - 0.138, RIGHT - LEFT - 0.2, 0.15, 0.041);
  b.part(0xf0e9d7, 3.69, CEILING - 0.055, -0.34, 4.38, 0.11, 4.29);
  for (const [x, z] of [[2.22, -1.91], [5.04, -1.91], [2.22, 1.28], [5.04, 1.28]]) {
    ceilingLight(b, x, z, 0.31, 0.31, CEILING - 0.11);
  }
  for (const z of [-3.2, 0.55, 2.07]) ceilingLight(b, 8.59, z, 0.32, 0.32, CEILING);
  pointLight(THREE, b.root, 3.85, 2.57, 0.29, 0xffe1b3, 21, 6.2);
  pointLight(THREE, b.root, 8.87, 2.50, -0.9, 0xffe6c6, 20, 5.8);

  const stone = marble(THREE, architecture);
  livingRoom(THREE, architecture, b, stone);
  kitchen(THREE, architecture, b, stone);
  windowView(THREE, architecture, b);

  const serviceDoor = architecture.group(b.root, 'Closed interior door', LEFT + 0.128, 0, -3.75, Math.PI / 2);
  const door = architecture.builder(serviceDoor);
  door.part(COLORS.walnut, 0, 1.19, 0.013, 1.12, 2.37, 0.085);
  door.part(0x704b38, 0, 1.14, 0.065, 0.89, 2.1, 0.031);
  door.part(COLORS.brass, 0.39, 0.97, 0.106, 0.15, 0.043, 0.062);
  door.finish();
}

export function unitCeiling(x, z) {
  if (z < HALL.south || x < LEFT || x > RIGHT || z > BACK) return Infinity;
  if (Math.abs(x - DIVIDER) < 0.25 && z > KITCHEN_DOOR.front && z < KITCHEN_DOOR.back) return KITCHEN_DOOR.height;
  return CEILING - 0.19;
}
