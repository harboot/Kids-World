import { SURFACE_GAP } from '../../core/geometry.js';
import { seededRandom } from '../../core/random.js';

export const QUAY = 23;
export const FISHING_PIER = { left: 22.5, right: 39, front: -6, back: 0 };
export const CITY_PIER = { left: 22.5, right: 33, front: 15, back: 19.5 };
const BRIDGE = { left: -21.75, right: -13, front: 17.5, back: 21.5 };
const CREEK = -17.3;
const WATER_HEIGHT = -0.47;
const landWidth = 65;
const landDepth = 72;
const paving = [
  // The entrance avenue, plaza, and north lane around the clock tower.
  [-3, 3, 8, 34], [-8, 8, -8, 9], [2.5, 5.5, -25, -8],
  [-15, 14, -25, -21.5], [-6, 8, -11, -8],
  // The west residential lanes form a loop with a branch to the stable.
  [-28.5, -7, 3, 7.5], [-27, -7, -12.5, -9],
  [-14.75, -11.5, -24, 21.5], [-29, -26, -12, 6],
  [-25.5, -13, 17.5, 21.5], [-30.5, -28.5, 24, 27],
  // Market Street and the quay join the square to both piers.
  [7, 21, 4.5, 9], [16.5, 23, -18, 21], [16.5, 23, -18.5, -15.5],
  [3.5, 23, -4, 0], [3.5, 18, -22, -18.5], [3, 21, 17, 20],
];

function smooth(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

export function shorelineX(z) {
  return QUAY - 5.5 * smooth((Math.abs(z) - 21) / 13);
}

function creekWidth(z) {
  return 1.6 * smooth((z - 10.5) / 4.5) * smooth((33 - z) / 4);
}

function landHeight(x, z) {
  const west = smooth((-x - 28) / 11) * (1.84 + 0.4 * Math.sin(z * 0.21));
  const north = smooth((-z - 25) / 12) * (1.45 + 0.45 * Math.cos(x * 0.21));
  const south = smooth((z - 23) / 10) * Math.exp(-((x - 10) ** 2) / 38);
  const creek = (0.95 * smooth((creekWidth(z) + 1.8 - Math.abs(x - CREEK)) / 2.3)) *
    smooth((z - 10.5) / 4.5) * smooth((33 - z) / 4);
  const cliffs = smooth((shorelineX(z) - x) / 4) * (west + north + south);
  return cliffs - creek;
}

function inside({ left, right, front, back }, x, z) {
  return x >= left && x <= right && z >= front && z <= back;
}

function bridgeHeight(x) {
  return 0.52 * Math.sin(Math.PI * (x - BRIDGE.left) / (BRIDGE.right - BRIDGE.left));
}

export function buildTerrain(THREE, scene, kit) {
  const random = seededRandom(209);
  const cellsX = landWidth * 2;
  const cellsZ = landDepth * 2;
  const stride = cellsX + 1;
  const position = [];
  const colors = [];
  const uv = [];
  const grass = [];
  const stones = [];
  const tint = new THREE.Color();
  const green = new THREE.Color(0x9caa61);
  const shade = new THREE.Color(0x617a47);
  const sand = new THREE.Color(0xb8ab86);
  for (let row = 0; row <= cellsZ; row++) {
    const z = row / 2 - landDepth / 2;
    for (let col = 0; col <= cellsX; col++) {
      const x = Math.min(col / 2 - 42, shorelineX(z));
      const y = landHeight(x, z);
      position.push(x, y, z);
      uv.push(x / 4, z / 4);
      const heath = 0.38 + Math.sin(x * 0.37 + z * 0.18) * 0.17 + random() * 0.2;
      const beach = smooth((x - shorelineX(z) + 1.75) / 1.75);
      tint.copy(green).lerp(shade, heath).lerp(sand, Math.max(beach * 0.92, smooth(-y * 1.2)));
      colors.push(tint.r, tint.g, tint.b);
      if (row === 0 || col === 0) continue;
      const r = position.length / 3 - 1;
      const road = paving.some(([x1, x2, z1, z2]) => x - 0.25 > x1 && x - 0.25 < x2 && z - 0.25 > z1 && z - 0.25 < z2);
      (road ? stones : grass).push(r - stride - 1, r - 1, r - stride, r - stride, r - 1, r);
    }
  }

  const terrain = new THREE.BufferGeometry();
  terrain.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  terrain.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  terrain.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  terrain.setIndex([...grass, ...stones]);
  terrain.computeVertexNormals();
  terrain.addGroup(0, grass.length, 0);
  terrain.addGroup(grass.length, stones.length, 1);
  const map = cobbles(THREE, kit);
  const ground = new THREE.Mesh(terrain, [
    new THREE.MeshLambertMaterial({ vertexColors: true }),
    new THREE.MeshLambertMaterial({ map, color: map ? 0xf5e7d5 : 0xa69a82 }),
  ]);
  ground.name = 'Village terrain and cobblestone streets';
  ground.receiveShadow = true;
  scene.add(ground);

  buildShore(THREE, scene);
  const creek = kit.group('Mill creek', CREEK, 0, 21.75);
  kit.box(creek, 0x448d85, 0, WATER_HEIGHT, 0, 3.3, 0.035, 23);
  buildBridge(THREE, kit);
  buildHorizon(THREE, kit);

  function getGroundHeight(x, z) {
    if (inside(BRIDGE, x, z)) return bridgeHeight(x);
    if (x >= shorelineX(z)) return 0;
    // Sample the same triangle drawn by the terrain grid, matching the player's feet to the visible slope.
    const gridX = (x + 42) * 2;
    const gridZ = (z + landDepth / 2) * 2;
    const col = Math.max(0, Math.min(cellsX - 1, Math.floor(gridX)));
    const row = Math.max(0, Math.min(cellsZ - 1, Math.floor(gridZ)));
    const u = gridX - col;
    const v = gridZ - row;
    const a = (row * stride + col) * 3 + 1;
    const b = position[a + 3];
    const c = position[a + stride * 3];
    if (u + v <= 1) return position[a] * (1 - u - v) + b * u + c * v;
    return b * (1 - v) + c * (1 - u) + position[a + stride * 3 + 3] * (u + v - 1);
  }

  function supported(x, z) {
    if (inside(BRIDGE, x, z)) return true;
    if (x < -37 || z < -34 || z > 34) return false;
    if (x > shorelineX(z)) return inside(FISHING_PIER, x, z) || inside(CITY_PIER, x, z);
    const wet = creekWidth(z);
    return wet < 0.24 || Math.abs(x - CREEK) > wet + 0.35;
  }

  function blocksGround(x, z, radius) {
    return !supported(x, z) || !supported(x - radius, z) || !supported(x + radius, z) ||
      !supported(x, z - radius) || !supported(x, z + radius);
  }

  return { getGroundHeight, blocksGround };
}

function buildShore(THREE, scene) {
  const positions = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 30; i++) {
      const z = side * (21 + i * 0.5);
      const next = z + side * 0.5;
      const a = [shorelineX(z), 0, z];
      const b = [shorelineX(next), 0, next];
      const c = [shorelineX(next) + 0.85, -0.73, next];
      const d = [shorelineX(z) + 0.85, -0.73, z];
      for (const point of [a, b, c, a, c, d]) positions.push(...point);
    }
  }
  const skirt = new THREE.BufferGeometry();
  skirt.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  skirt.computeVertexNormals();
  const mesh = new THREE.Mesh(skirt, new THREE.MeshLambertMaterial({ color: 0x93846f, side: THREE.DoubleSide }));
  mesh.name = 'Rocky shore';
  mesh.receiveShadow = true;
  scene.add(mesh);
}

function cobbles(THREE, kit) {
  const random = seededRandom(61);
  const map = kit.paintedTexture(256, 256, ink => {
    const colors = ['#ada295', '#b4aa97', '#a6998a', '#bab09b', '#9a9288', '#c4b6a0', '#aca292', '#b1a79a'];
    ink.fillStyle = '#80796e';
    ink.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 12; row++) {
      for (let col = 0; col < 9; col++) {
        const x = col * 32 + (row % 2) * 16 - 16 + random() * 3;
        const y = row * (256 / 12) + 1 + random() * 2.4;
        const width = 28 + random() * 3;
        const height = 17 + random() * 2.6;
        const color = colors[Math.floor(random() * colors.length)];
        for (const dx of [0, -256]) {
          ink.fillStyle = '#716b61';
          ink.beginPath();
          ink.roundRect(x + dx, y + 1.5, width, height, 4);
          ink.fill();
          ink.fillStyle = color;
          ink.beginPath();
          ink.roundRect(x + dx, y, width - 1, height - 1, 4);
          ink.fill();
          ink.fillStyle = '#ffffff30';
          ink.fillRect(x + dx + 4, y + 1.7, width - 10, 1.3);
        }
      }
    }
  });
  if (map) map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return map;
}

function buildBridge(THREE, { group, box, solid }) {
  const bridge = group('Stone bridge', 0, 0, 0);
  const { left, right, front, back } = BRIDGE;
  const segments = 18;
  const width = (right - left) / segments;
  const positions = [];
  const colors = [];
  const tint = new THREE.Color();

  function quad(a, b, c, d) {
    for (const point of [a, b, c, a, c, d]) {
      positions.push(...point);
      colors.push(tint.r, tint.g, tint.b);
    }
  }

  // All segments end at the same cross sections, so the colored stones meet
  // at edges and the rail has continuous sides through the changes in slope.
  function course(z0, z1, bottom, top, color) {
    function section(i) {
      const x = left + i * width;
      const y = bridgeHeight(x) + SURFACE_GAP.trim;
      return [[x, y + top, z0], [x, y + top, z1], [x, y + bottom, z1], [x, y + bottom, z0]];
    }
    let start = section(0);
    for (let i = 0; i < segments; i++) {
      const end = section(i + 1);
      tint.setHex(color(i));
      for (let side = 0; side < start.length; side++) {
        const next = (side + 1) % start.length;
        quad(start[side], start[next], end[next], end[side]);
      }
      if (i === 0) quad(...start.toReversed());
      if (i === segments - 1) quad(...end);
      start = end;
    }
  }

  const stones = [0xb8aa92, 0xa59b8e, 0xc5b39a, 0xab9f90];
  const rowWidth = (back - front) / 8;
  for (let row = 0; row < 8; row++) {
    const z = front + row * rowWidth;
    course(z + 0.012, z + rowWidth - 0.012, -0.22, 0, i => stones[(i * 3 + row * 7) % stones.length]);
  }
  for (const z of [front, back]) {
    course(z - 0.17, z + 0.17, -0.39, 0.81, () => 0x8f8275);
    course(z - 0.25, z + 0.25, 0.765, 0.955, () => 0xcabb9d);
    solid(bridge, right - left, 0.34, 2, (left + right) / 2, z);
    for (const x of [left, right]) {
      box(bridge, 0x9a8774, x, 0.51, z, 0.52, 1.04, 0.52);
      box(bridge, 0xd3be9b, x, 1.02, z, 0.66, 0.16, 0.67);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const stonework = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true }));
  stonework.receiveShadow = true;
  bridge.add(stonework);
}

function buildHorizon(THREE, { group, part }) {
  const vista = group('Fjord mountains', 0, 0, 0);
  const random = seededRandom(1607);
  const positions = [];
  const colors = [];
  const rock = new THREE.Color();
  const snow = new THREE.Color(0xd8ddd1);
  const foot = new THREE.Color(0x6f8e81);
  const tint = new THREE.Color();
  const sites = [
    [-63, -48, 28, 33, 27, 0x6c8d93], [-35, -72, 29, 44, 29, 0x7899a0],
    [-6, -83, 28, 43, 27, 0x88a3ab], [24, -79, 31, 38, 24, 0x8da7ad],
    [48, -67, 25, 31, 26, 0x789da1], [68, -48, 27, 28, 23, 0x7999a0],
    [83, -27, 21, 20, 20, 0x88a6a9], [91, 7, 24, 15, 17, 0x9bb5af],
    [-63, 36, 27, 29, 26, 0x6c8c86], [-70, -1, 24, 28, 26, 0x6e8c87],
  ];
  const sides = 12;
  for (const [x, z, width, height, depth, color] of sites) {
    rock.setHex(color);
    const turn = random() * Math.PI;
    const shift = (random() - 0.5) * width * 0.6;
    const levels = [[-0.16, 1.0], [0.12, 0.86], [0.33, 0.72], [0.54, 0.48], [0.73, 0.27], [0.89, 0.13]];
    const rings = levels.map(([level, size]) => Array.from({ length: sides }, (_, i) => {
      const angle = turn + i * Math.PI * 2 / sides;
      const spur = 0.78 + (i % 3) * 0.16 + random() * 0.25;
      return [
        x + shift * size + Math.cos(angle) * width * size * spur,
        (level + (random() - 0.44) * 0.12) * height,
        z + Math.sin(angle) * depth * size * spur,
      ];
    }));
    const peak = [x + shift * 0.13, height * 0.96, z];
    for (let ring = 0; ring < rings.length; ring++) {
      for (let i = 0; i < sides; i++) {
        const j = (i + 1) % sides;
        const a = rings[ring][i];
        const b = rings[ring][j];
        const c = rings[ring + 1]?.[i] ?? peak;
        const d = rings[ring + 1]?.[j] ?? peak;
        tint.copy(rock);
        if (ring < 2) tint.lerp(foot, 0.24 * (2 - ring));
        if (ring >= 4 && height >= 29) tint.lerp(snow, 0.46 + random() * 0.35);
        const faces = ring + 1 === rings.length ? [a, c, b] : [a, c, b, b, c, d];
        for (const point of faces) {
          positions.push(...point);
          colors.push(tint.r, tint.g, tint.b);
        }
      }
    }
  }
  const ridges = new THREE.BufferGeometry();
  ridges.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  ridges.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  ridges.computeVertexNormals();
  vista.add(new THREE.Mesh(ridges, new THREE.MeshLambertMaterial({ vertexColors: true })));

  for (const [x, y, z, scale] of [[-45, 26, -60, 1], [10, 23, -62, 1.25], [47, 18, -49, 0.84],
    [66, 14, 15, 1.17], [-51, 16, 12, 0.9]]) {
    const length = Math.hypot(x, z);
    const yaw = Math.atan2(x, z);
    for (let i = 0; i < 5; i++) {
      const offset = (i - 2) * 2.8 * scale;
      const width = (3.0 + random() * 1.8) * scale;
      part(vista, 'cloud', i % 2 ? 0xf1edde : 0xe9ebdd, x + offset * z / length, y + Math.sin(i * Math.PI / 4),
        z - offset * x / length, width, (0.9 + random() * 0.75) * scale, 2.1 * scale, { rotation: [0, yaw, 0] });
    }
  }
}
