import { SURFACE_GAP } from '../../core/geometry.js';
import { COLORS, ceilingLight, pointLight, wallX, wallZ } from './geometry.js';

const WIDTH = 32;
const FRONT = -13.5;
const BACK = 13;
const HEIGHT = 3.85;

function sedan(THREE, architecture, b, x, z, yaw, paint, special) {
  const body = architecture.group(b.root, special ? 'Sedan with illuminated cabin' : 'Parked sedan', x, 0, z, yaw);
  const p = architecture.builder(body);
  const glass = special ? 0xd9a46c : 0x354852;
  const chrome = 0xb8babe;
  const dark = 0x262b2e;
  // The cabin tapers toward the roof and the windshields follow the slope.
  const profile = new THREE.Shape();
  profile.moveTo(-1.43, 0);
  profile.lineTo(1.12, 0);
  profile.lineTo(0.74, 0.51);
  profile.lineTo(-0.86, 0.51);
  profile.lineTo(-1.43, 0);
  const cabin = new THREE.Mesh(
    new THREE.ExtrudeGeometry(profile, { depth: 1.59, bevelEnabled: false }),
    new THREE.MeshStandardMaterial({ color: glass, roughness: 0.37,
      emissive: special ? 0xe0a052 : 0x141c25, emissiveIntensity: special ? 0.34 : 0.16,
      transparent: special, opacity: special ? 0.46 : 1, depthWrite: !special }),
  );
  cabin.rotation.y = -Math.PI / 2;
  cabin.position.set(0.795, 0.87, 0);
  body.add(cabin);

  p.part(dark, 0, 0.31, 0, 1.7, 0.23, 4.37);
  p.part(paint, 0, 0.615, 0, 1.86, 0.485, 4.47);
  p.part(paint, 0, 0.855, -1.72, 1.77, 0.18, 1.04, { pitch: -0.09 });
  p.part(paint, 0, 0.839, 1.72, 1.75, 0.15, 0.98, { pitch: 0.08 });
  p.part(paint, 0, 1.383, -0.06, 1.61, 0.085, 1.62);
  p.part(dark, 0, 0.46, -2.247, 1.74, 0.15, 0.07);
  p.part(dark, 0, 0.47, 2.249, 1.73, 0.13, 0.07);
  p.part(0x1d2428, 0, 0.679, -2.247, 0.85, 0.18, 0.055);
  for (let i = 0; i < 3; i++) p.part(chrome, 0, 0.616 + i * 0.056, -2.279, 0.75, 0.015, 0.017);
  p.part(COLORS.ivory, 0, 0.635, 2.275, 0.41, 0.135, 0.035);
  architecture.sign(body, [special ? '17E' : 'P1'], 0, 0.635, 2.297, 0.35, 0.11);

  for (const side of [-1, 1]) {
    const edge = side * 0.934;
    p.part(0x45444a, side * 0.802, 1.115, 0.08, 0.045, 0.48, 0.08);
    p.part(chrome, side * 0.812, 0.906, -0.14, 0.045, 0.032, 2.43);
    p.part(paint, side * 0.998, 0.99, -0.94, 0.24, 0.124, 0.21, { shape: 'oval' });
    p.part(0x728289, side * 1.008, 0.989, -0.844, 0.145, 0.064, 0.025);
    p.part(COLORS.whiteLight, side * 0.66, 0.745, -2.25, 0.36, 0.132, 0.066);
    p.part(0xb3433a, side * 0.71, 0.744, 2.25, 0.31, 0.128, 0.057);
    for (const dz of [-0.56, 0.61]) {
      p.part(paint, edge, 0.65, dz, 0.032, 0.35, 1.12);
      p.part(chrome, edge + side * 0.029, 0.782, dz + 0.31, 0.055, 0.037, 0.17);
    }
    for (const end of [-1, 1]) {
      const wheel = { shape: 'cylinder', roll: Math.PI / 2 };
      p.part(0x242729, side * 0.855, 0.347, end * 1.39, 0.694, 0.264, 0.694, wheel);
      p.part(chrome, side * 0.997, 0.347, end * 1.39, 0.48, 0.035, 0.48, wheel);
      p.part(dark, side * 1.024, 0.347, end * 1.39, 0.115, 0.03, 0.115, wheel);
    }
  }
  if (special) {
    p.part(0xffd491, 0, 1.30, 0.06, 0.52, 0.048, 0.26, { glow: true });
    p.part(0x574337, 0, 0.965, -0.86, 1.49, 0.19, 0.21);
    p.part(0x72533d, 0, 0.986, 0.71, 1.43, 0.21, 0.29);
    for (const side of [-1, 1]) {
      p.part(0x836247, side * 0.44, 1.036, -0.04, 0.46, 0.32, 0.14, { pitch: -0.16 });
      p.part(0x775641, side * 0.44, 1.211, -0.013, 0.255, 0.15, 0.12, { shape: 'oval' });
    }
    pointLight(THREE, body, 0, 1.24, 0.15, 0xffb067, 5, 3.15);
  }
  p.finish();
  b.solid(x, z, 4.58, 2.07);
}

function concreteFloor(THREE, architecture, parent) {
  const map = architecture.canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#92958e';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 49; i++) {
      const x = (Math.sin(i * 22.95) + 1) * w / 2;
      const y = (Math.cos(i * 30.62) + 1) * h / 2;
      const radius = 8 + i % 8 * 3;
      for (const ox of [x - w, x, x + w]) {
        for (const oy of [y - h, y, y + h]) {
          const shade = ctx.createRadialGradient(ox, oy, 1, ox, oy, radius);
          shade.addColorStop(0, i % 3 ? '#4e565433' : '#c4c5b843');
          shade.addColorStop(1, '#777b7600');
          ctx.fillStyle = shade;
          ctx.fillRect(ox - radius, oy - radius, radius * 2, radius * 2);
        }
      }
    }
    for (let i = 0; i < 2500; i++) {
      ctx.fillStyle = i % 2 ? '#555e591a' : '#dfd9c426';
      ctx.fillRect((i * 2579 % 8191) / 8191 * w, (i * 1859 % 4349) / 4349 * h, 1.4, 1.1);
    }
  });
  if (map) {
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(6, 5);
  }
  const concrete = new THREE.MeshStandardMaterial({ color: map ? 0xaeb0a9 : 0x666c6b, map, roughness: 0.91 });
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(WIDTH, BACK - FRONT).rotateX(-Math.PI / 2), concrete);
  surface.position.set(0, -0.016, (FRONT + BACK) / 2);
  parent.add(surface);
}

export function buildBasement(THREE, architecture, { b, doorZ }) {
  const concrete = 0x828683;
  const lineY = SURFACE_GAP.detail;
  const yellow = 0xd4ac50;
  concreteFloor(THREE, architecture, b.root);
  b.part(0x818380, 0, HEIGHT + 0.12, (FRONT + BACK) / 2, WIDTH, 0.24, BACK - FRONT);
  for (const x of [-WIDTH / 2, WIDTH / 2]) wallZ(b, concrete, x, FRONT, BACK, HEIGHT);
  for (const z of [FRONT, BACK]) wallX(b, concrete, -WIDTH / 2, WIDTH / 2, z, HEIGHT);
  for (const z of [-8.55, -2.1, 4.4, 10.9]) {
    b.part(0x767b77, 0, HEIGHT - 0.23, z, WIDTH - 0.15, 0.46, 0.56);
    for (const x of [-5.22, 5.22]) {
      b.block(0x8e8e82, x, HEIGHT / 2, z, 0.81, HEIGHT, 0.81);
      b.part(0x393f3e, x, 0.38, z, 0.84, 0.76, 0.84);
      b.part(yellow, x, 0.84, z, 0.865, 0.2, 0.865);
      architecture.sign(b.root, ['B · ' + Math.round(z + 10)], x, 1.56, z + 0.422, 0.61, 0.23);
    }
  }
  for (const x of [-11.6, -3.3, 3.3, 11.6]) {
    b.part(0x494c4c, x, 3.3, 0.2, 0.14, 0.14, 24.5);
    for (const z of [-6.0, 0.9, 7.3]) ceilingLight(b, x, z, 0.2, 2.05, 3.59, COLORS.whiteLight);
  }
  for (const x of [-13.9, -9.5, 9.5, 13.9]) {
    b.part(0x4e5655, x, 2.76, FRONT + 0.134, 2.6, 0.59, 0.075);
    for (let i = 0; i < 9; i++) b.part(0x7b807b, x - 1.03 + i * 0.26, 2.76, FRONT + 0.184, 0.09, 0.41, 0.043);
  }
  for (const side of [-1, 1]) {
    const x = side * (WIDTH / 2 - 0.16);
    b.part(yellow, x, 1.03, -0.25, 0.035, 0.19, 25.8);
    for (const z of [-8.8, -3, 2.8, 8.6]) {
      b.part(0x373d3c, x - side * 0.012, 2.48, z, 0.125, 0.28, 0.45);
      b.part(COLORS.whiteLight, x - side * 0.093, 2.43, z, 0.04, 0.125, 0.38, { glow: true });
    }
    for (const z of [-7.45, -4.25, -1.05, 2.15, 5.35, 8.55, 11.75]) {
      b.part(0xd1c7a6, side * 9.45, lineY, z, 6.9, 0.006, 0.072);
    }
    for (const z of [-5.85, -2.65, 0.55, 3.75, 6.95, 10.15]) {
      b.part(0x504e47, side * 12.67, 0.055, z, 0.24, 0.11, 1.9);
      b.solid(side * 12.67, z, 0.24, 1.9);
    }
  }
  for (const [x, z, color, special] of [
    [-9.25, -5.85, 0x8b293b, false], [-9.25, 0.55, 0xc8cfd5, false],
    [-9.25, 6.95, 0x266460, false], [9.25, -2.65, 0x465a8b, false],
    [9.25, 3.75, 0xb3723b, true], [9.25, 10.15, 0x666874, false],
  ]) sedan(THREE, architecture, b, x, z, Math.sign(x) * Math.PI / 2, color, special);

  for (const [x, z, direction] of [[-1.47, 6.1, 1], [1.47, 5.35, -1], [-1.47, -4.3, 1], [1.47, -4.3, -1]]) {
    b.part(0xd9d2b4, x, lineY, z, 0.17, 0.005, 1.85);
    for (const side of [-1, 1]) b.part(0xd9d2b4, x + side * 0.184, lineY + SURFACE_GAP.detail,
      z - direction * 0.94, 0.15, 0.004, 0.62, { yaw: side * direction * Math.PI / 4 });
  }
  for (const x of [-3.63, 3.63]) {
    for (let i = 0; i < 16; i++) b.part(yellow, x, lineY, -7.7 + i * 1.24, 0.085, 0.005, 0.82);
  }

  // The painted lobby wall contains the actual elevator aperture.
  for (const side of [-1, 1]) {
    wallX(b, 0xb6ae98, side < 0 ? -5.05 : 1.17, side < 0 ? -1.17 : 5.05, doorZ, HEIGHT, 0.19);
    wallZ(b, 0xa3a391, side * 5.05, FRONT, doorZ + 0.07, HEIGHT, 0.2);
    b.part(0x62696b, side * 3.54, 0.12, doorZ + 0.105, 3.03, 0.24, 0.045);
  }
  b.part(0xb6ae98, 0, 3.15, doorZ, 2.34, 1.4, 0.19);
  b.part(0x8d8270, 0, 2.22, doorZ + 0.119, 2.42, 0.019, 0.052);
  for (let i = -5; i <= 5; i++) {
    b.part(0xd9c38f, i * 0.55, lineY, doorZ + 1.53, 0.3, 0.005, 0.095);
  }
  architecture.sign(b.root, ['PARKING  ·  B'], -3.3, 2.56, doorZ + 0.112, 2.5, 0.59);
  architecture.sign(b.root, ['RESIDENT LIFT'], 2.98, 2.56, doorZ + 0.112, 2.17, 0.48);
  architecture.sign(b.root, ['5 km/h', 'SLOW'], -11.1, 1.91, BACK - 0.146, 1.75, 0.84, { yaw: Math.PI });
  architecture.sign(b.root, ['PARKING  ·  B'], 15.842, 1.91, 2.8, 2.42, 0.6, { yaw: -Math.PI / 2 });
  pointLight(THREE, b.root, 0, 3.15, -7.1, 0xffe4ac, 36, 12);
  pointLight(THREE, b.root, -4.4, 3.18, 3.2, 0xe0ebf9, 28, 12);
}
