import { SURFACE_GAP } from '../../core/geometry.js';
import { PLAYER_RADIUS } from '../../core/movement.js';
import { COLORS } from './geometry.js';

export const TERRACE = { left: -24, right: 24, front: -5.35, back: 37 };
const WATER_Y = -0.19;
const POINTS = 88;
const GAZEBO = { x: -17.1, z: 27.1 };

function basinOutline(x, z, rx, rz, curve, rim = 0) {
  return Array.from({ length: POINTS }, (_, i) => {
    const a = i / POINTS * Math.PI * 2;
    const width = 1 + curve * Math.cos(a * 3 + 0.54) + curve * 0.7 * Math.sin(a * 2);
    return {
      x: x + (rx * width + rim) * Math.cos(a) + Math.sin(a) * curve * 9,
      z: z + (rz * width + rim) * Math.sin(a),
    };
  });
}

function filledPath(path, points) {
  points.forEach(({ x, z }, i) => {
    if (i === 0) path.moveTo(x, -z);
    else path.lineTo(x, -z);
  });
  path.closePath();
  return path;
}

function planarMesh(THREE, parent, shape, material, y) {
  const geometry = new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, position.getX(i), position.getZ(i));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = y;
  parent.add(mesh);
  return mesh;
}

function ring(THREE, parent, inside, out, innerY, outerY, material) {
  const positions = [];
  for (let i = 0; i < inside.length; i++) {
    const j = (i + 1) % inside.length;
    for (const [p, y] of [[inside[i], innerY], [out[i], outerY], [out[j], outerY],
      [inside[i], innerY], [out[j], outerY], [inside[j], innerY]]) {
      positions.push(p.x, y, p.z);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  parent.add(new THREE.Mesh(geometry, material));
}

function tileTexture(THREE, architecture, { base, joint, porcelain }) {
  const map = architecture.canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = joint;
    ctx.fillRect(0, 0, w, h);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const x = col * 128 + 1;
        const y = row * 128 + 1;
        ctx.fillStyle = base[row * 2 + col];
        ctx.fillRect(x, y, 125, 125);
        ctx.fillStyle = porcelain;
        ctx.fillRect(x + 1, y + 1, 123, 2);
        for (let i = 0; i < 41; i++) {
          const a = Math.sin(i * 31.13 + col * 29 + row * 13);
          const b = Math.cos(i * 78.33 + col * 2 - row * 23);
          ctx.fillStyle = i % 2 ? '#ffffff18' : '#543b2110';
          ctx.fillRect(x + 5 + 113 * (a + 1) / 2, y + 5 + 114 * (b + 1) / 2, 2 + i % 6, 1);
        }
      }
    }
  });
  if (map) {
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.setScalar(0.64);
  }
  return map;
}

function createWater(THREE) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      time: { value: 0 },
      deep: { value: new THREE.Color(0x058ca8) },
      shallow: { value: new THREE.Color(0x53dcdf) },
      reflected: { value: new THREE.Color(0x9bd3ed) },
    },
    vertexShader: `
      varying vec3 world;
      void main() {
        vec4 point = modelMatrix * vec4(position, 1.0);
        world = point.xyz;
        gl_Position = projectionMatrix * viewMatrix * point;
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 deep;
      uniform vec3 shallow;
      uniform vec3 reflected;
      varying vec3 world;
      void main() {
        vec2 p = world.xz;
        float a = sin(p.x * 1.8 + p.y * 2.5 + time * 1.25);
        float b = sin(p.x * 3.2 - p.y * 1.15 - time * 0.84);
        float c = sin(p.x * 4.4 + p.y * 3.8 + a * 1.2 - b + time * 0.54);
        float ripples = a * 0.23 + b * 0.18 + c * 0.13;
        vec3 normal = normalize(vec3(a * 0.06 + c * 0.035, 1.0, b * 0.08 - c * 0.035));
        vec3 viewDir = normalize(cameraPosition - world);
        float sky = pow(1.0 - max(0.0, dot(viewDir, normal)), 3.2);
        float glints = smoothstep(0.37, 0.54, ripples);
        vec3 color = mix(deep, shallow, 0.27 + ripples * 0.36 + glints * 0.19);
        color = mix(color, reflected, sky * 0.51) + glints * 0.065;
        gl_FragColor = vec4(color, 0.77 + sky * 0.17);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

function touchesPool(points, x, z) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) inside = !inside;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    if ((x - a.x - t * dx) ** 2 + (z - a.z - t * dz) ** 2 < PLAYER_RADIUS ** 2) return true;
  }
  return inside;
}

function buildBasins(THREE, architecture, b) {
  const { left, right, front, back } = TERRACE;
  const deckShape = filledPath(new THREE.Shape(), [
    { x: left, z: front }, { x: right, z: front }, { x: right, z: back }, { x: left, z: back },
  ]);
  const deck = new THREE.MeshStandardMaterial({
    color: 0xe9d0ad, roughness: 0.91,
    map: tileTexture(THREE, architecture, {
      base: ['#e5d5bb', '#dcd1bb', '#e7d9c3', '#e2d4bc'], joint: '#ae9e88', porcelain: '#eee0c9',
    }),
  });
  const tile = new THREE.MeshStandardMaterial({
    color: 0xa0e2db, roughness: 0.5,
    map: tileTexture(THREE, architecture, {
      base: ['#3fc5cc', '#33b4c6', '#42bbcc', '#33b5c4'], joint: '#4999a4', porcelain: '#65cad5',
    }),
  });
  if (tile.map) tile.map.repeat.setScalar(2.4);
  const coping = new THREE.MeshStandardMaterial({ color: 0xd0bf9d, roughness: 0.62, side: THREE.DoubleSide });
  const wallTile = new THREE.MeshStandardMaterial({ color: 0x359da7, roughness: 0.43, side: THREE.DoubleSide });
  const trim = new THREE.MeshStandardMaterial({ color: 0x206979, side: THREE.DoubleSide });
  const water = createWater(THREE);
  const basins = [[-4.5, 14.1, 9.7, 11.2, 0.132, -1.52], [11.6, 18.3, 4.25, 4.05, 0.057, -0.82]];
  const boundaries = basins.map(([x, z, rx, rz, curve, depth]) => {
    const edge = basinOutline(x, z, rx, rz, curve, 0.49);
    const lip = basinOutline(x, z, rx, rz, curve, 0.39);
    const inner = basinOutline(x, z, rx, rz, curve);
    deckShape.holes.push(filledPath(new THREE.Path(), edge.slice().reverse()));
    ring(THREE, b.root, lip, edge, 0.064, 0, coping);
    ring(THREE, b.root, inner, lip, 0.064, 0.064, coping);
    ring(THREE, b.root, inner, inner, -0.106, 0.064, coping);
    ring(THREE, b.root, inner, inner, -0.235, -0.106, trim);
    ring(THREE, b.root, inner, inner, depth, -0.235, wallTile);
    planarMesh(THREE, b.root, filledPath(new THREE.Shape(), inner), tile, depth);
    const surface = planarMesh(THREE, b.root, filledPath(new THREE.Shape(), inner), water, WATER_Y);
    surface.name = rx > 5 ? 'Main swimming pool' : 'Shallow pool';
    const bounds = {
      left: Math.min(...edge.map(p => p.x)) - PLAYER_RADIUS,
      right: Math.max(...edge.map(p => p.x)) + PLAYER_RADIUS,
      front: Math.min(...edge.map(p => p.z)) - PLAYER_RADIUS,
      back: Math.max(...edge.map(p => p.z)) + PLAYER_RADIUS,
    };
    return { bounds, edge };
  });
  planarMesh(THREE, b.root, deckShape, deck, 0).name = 'Tiled pool deck';
  return {
    blocks(x, z) {
      return boundaries.some(({ bounds, edge }) => x >= bounds.left && x <= bounds.right &&
        z >= bounds.front && z <= bounds.back && touchesPool(edge, x, z));
    },
    reset() { water.uniforms.time.value = 0; },
    update(dt, still) { water.uniforms.time.value = still ? 0 : (water.uniforms.time.value + dt) % 600; },
  };
}

function tower(architecture, parent, { x, z, facing, width, floors, variant }) {
  const node = architecture.group(parent, 'Residential tower facade', x, -2.9, z, facing);
  const { part, finish } = architecture.builder(node);
  const step = 2.88;
  const height = floors * step;
  const warm = [0xdacfaf, 0xebdfc4, 0xe4d6bc][variant];
  const stone = [0xb5a486, 0xc7ad8f, 0xc4bda6][variant];
  const ivory = 0xf0e3c8;
  const glass = [0x344955, 0x4a6572, 0x5a7584, 0x698390, 0x435767];
  const bays = width > 13 ? [-4.9, -2.55, 2.55, 4.9] : [-3.52, -1.5, 1.5, 3.52];
  part(warm, 0, height / 2, -1.99, width, height, 4);
  part(stone, 0, 1.4, 0.024, width - 0.23, 2.8, 0.12);
  part(ivory, 0, height - 0.04, 0.1, width + 0.19, 0.32, 0.5);
  part(stone, 0, height + 0.71, -1.05, width * 0.83, 1.42, 1.93);
  part(ivory, 0, height + 1.43, -0.98, width * 0.86, 0.22, 2.35);
  part(0x233a49, 0, height / 2 + 0.25, 0.12, 1.65, height - 0.75, 0.18);
  for (const sign of [-1, 1]) {
    part(ivory, sign * 0.88, height / 2 + 0.08, 0.278, 0.155, height - 0.29, 0.19);
    part(ivory, sign * (width / 2 - 0.31), height / 2 + 0.07, 0.093, 0.36, height - 0.39, 0.17);
    part(stone, sign * (width / 2 - 0.58), height / 2, 0.025, 0.12, height - 0.5, 0.15);
  }
  for (let y = 0; y < floors; y++) {
    const level = y * step + 0.52;
    part(stone, 0, level - 0.06, 0.085, width - 0.38, 0.13, 0.18);
    part(0x51707f, -0.37, level + 1.03, 0.231, 0.63, 1.82, 0.044);
    part(0x385662, 0.38, level + 1.03, 0.239, 0.67, 1.82, 0.047);
    for (const [i, bx] of bays.entries()) {
      const pane = glass[(y * 11 + i * 3 + variant * 2) % glass.length];
      part(0x827769, bx, level + 1.12, 0.084, 1.48, 1.88, 0.14);
      part(pane, bx - 0.32, level + 1.14, 0.171, 0.57, 1.69, 0.043);
      part(glass[(y + i + 1) % glass.length], bx + 0.32, level + 1.14, 0.178, 0.57, 1.69, 0.043);
      part(ivory, bx, level + 0.21, 0.175, 1.61, 0.105, 0.165);
      if ((i + variant) % 2 !== 0) continue;
      part(ivory, bx, level + 0.04, 0.57, 1.91, 0.16, 1.05);
      part(0x677779, bx, level + 0.55, 1.06, 1.78, 0.66, 0.045);
      part(0xf0e4cb, bx, level + 0.91, 1.08, 1.93, 0.092, 0.081);
      for (const side of [-1, 1]) part(stone, bx + side * 0.905, level + 0.52, 0.64, 0.07, 0.81, 0.83);
    }
  }
  finish();
}

function landscaping(architecture, b) {
  const greens = [0x466f3e, 0x58854a, 0x688b4b, 0x3a6544, 0x759653];

  function planter(x, z, width, depth, n, palm = false) {
    b.block(0xaca18a, x, 0.20, z, width, 0.40, depth);
    b.part(0x645645, x, 0.405, z, width - 0.23, 0.035, depth - 0.21);
    for (let i = 0; i < n; i++) {
      const u = Math.sin(i * 78.91 + x);
      const v = Math.cos(i * 12.28 + z);
      const size = 0.49 + (i % 4) * 0.12;
      b.part(greens[i % greens.length], x + u * (width - 0.64) / 2, 0.52 + size / 3,
        z + v * (depth - 0.5) / 2, size * 1.15, size, size * 0.96, { shape: 'leaf', yaw: i * 1.7 });
    }
    if (!palm) return;
    const treeHeight = 3.5 + Math.abs(Math.sin(x)) * 1.45;
    const segments = 7;
    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      const diameter = 0.32 - t * 0.136;
      const cx = x + t * t * 0.56;
      b.part(i % 2 ? 0x8b7655 : 0x9b8761, cx, 0.4 + treeHeight * (i + 0.5) / segments, z,
        diameter, treeHeight / segments + 0.018, diameter, { shape: 'tapered', roll: -t * 0.26 });
    }
    for (let i = 0; i < 10; i++) {
      const angle = i * 2.39996;
      const length = 1.62 + 0.36 * Math.sin(i * 74);
      for (let section = 0; section < 3; section++) {
        const span = (section + 0.45) / 3 * length;
        const lift = [0.14, 0.26, -0.04][section] - (i % 3) * 0.17;
        b.part(greens[(i + section) % greens.length], x + 0.56 + Math.sin(angle) * span, treeHeight + 0.43 + lift,
          z + Math.cos(angle) * span, 0.43 - section * 0.09, 0.16, length / 2.3,
          { shape: 'leaf', yaw: angle, pitch: [-0.37, 0.18, 0.42][section] + (i % 3) * 0.12 });
      }
    }
  }

  for (const [x, z, w, d, n, palm] of [
    [-6.9, -1.25, 3.3, 1.45, 9, true], [7.15, -0.9, 3.5, 1.45, 9, true],
    [-21.0, 1.75, 3.25, 4.1, 18, true], [-21.3, 15.1, 2.6, 5.6, 18, true],
    [20.93, 5.1, 2.7, 5.8, 17, true], [21.2, 20.9, 2.5, 6.3, 18, true],
    [-11.1, 32.9, 3.5, 2.3, 8, true], [0.65, 33.2, 3.85, 2.17, 12, true],
    [13.2, 32.5, 3.2, 2.49, 12, true], [18.7, 30.25, 2.8, 2.2, 12, false],
    [-11.5, 0.5, 2.1, 1.23, 6, false], [15.4, 5.15, 4.2, 1.9, 12, false],
  ]) planter(x, z, w, d, n, palm);

  for (const side of [-1, 1]) {
    b.block(0xa89a7b, side * 23.75, 0.35, 15.5, 0.46, 0.7, 42.4);
    b.part(0xd2c19b, side * 23.75, 0.73, 15.5, 0.56, 0.10, 42.36);
  }
  b.block(0xa89a7b, 0, 0.35, 36.75, 47.03, 0.7, 0.46);
  b.part(0xd2c19b, 0, 0.73, 36.75, 47.03, 0.10, 0.56);
  for (let x = -21.45; x <= 22; x += 0.36) {
    b.part(greens[Math.round((x + 22) / 0.36) % greens.length], x, 0.84, 36.47,
      0.67, 0.56 + 0.14 * Math.sin(x * 15), 0.68, { shape: 'leaf', yaw: x * 5 });
  }
  for (const x of [-17.4, -10.5, -0.2, 8.6, 17.7]) {
    b.part(COLORS.ink, x, 0.45, 34.53, 0.14, 0.9, 0.14, { shape: 'cylinder' });
    b.part(COLORS.warmLight, x, 0.83, 34.53, 0.151, 0.14, 0.151, { shape: 'cylinder', glow: true });
    b.part(COLORS.ink, x, 0.947, 34.53, 0.201, 0.065, 0.201, { shape: 'cylinder' });
  }
}

function loungeChairs(architecture, b) {
  for (const [x, z, yaw, color] of [
    [-17.2, 8.1, Math.PI / 2, 0xe9e3cb], [-17.3, 10.3, Math.PI / 2, 0xcadbd7], [-17.2, 12.6, Math.PI / 2, 0xe9e3cb],
    [17.9, 15, -Math.PI / 2, 0xebe2cd], [17.85, 17.28, -Math.PI / 2, 0xcadbd7], [17.9, 19.57, -Math.PI / 2, 0xebe2cd],
    [6.64, 26.9, Math.PI, 0xe9e3cb], [8.35, 26.9, Math.PI, 0xcadbd7],
  ]) {
    const node = architecture.group(b.root, 'Pool lounger', x, 0, z, yaw);
    const { part, finish } = architecture.builder(node);
    for (const side of [-1, 1]) {
      part(0x9a754f, side * 0.33, 0.28, 0.1, 0.058, 0.08, 1.91);
      for (const dz of [-0.71, 0.81]) part(0x987654, side * 0.30, 0.141, dz, 0.075, 0.282, 0.075);
    }
    part(color, 0, 0.354, 0.363, 0.62, 0.10, 1.34);
    part(color, 0, 0.57, -0.643, 0.622, 0.098, 0.82, { pitch: 0.62 });
    finish();
    b.solid(x + Math.sin(yaw) * 0.07, z + Math.cos(yaw) * 0.07, Math.abs(Math.sin(yaw)) > 0.9 ? 2.14 : 0.73,
      Math.abs(Math.sin(yaw)) > 0.9 ? 0.73 : 2.14);
  }
}

function gazebo(architecture, b) {
  const { x, z } = GAZEBO;
  const roof = 0x7d4c3a;
  const wood = 0x876142;
  const platform = 0xb49262;
  b.part(platform, x, -0.056, z, 4.99, 0.18, 4.63);
  for (let i = 0; i < 15; i++) b.part(0x8d6c48, x - 2.24 + i * 0.32, 0.04, z, 0.017, 0.009, 4.52);
  for (const side of [-1, 1]) {
    b.part(wood, x + side * 2.03, 2.45, z, 0.21, 0.32, 4.23);
    for (const dz of [-1.91, 1.91]) {
      b.block(wood, x + side * 2.03, 1.25, z + dz, 0.235, 2.5, 0.235);
      b.part(0x9e8764, x + side * 2.03, 0.14, z + dz, 0.295, 0.28, 0.295);
    }
    const roll = -side * 0.44;
    b.part(roof, x + side * 1.30, 3.13, z, 2.87, 0.16, 5.33, { roll });
    for (let row = 0; row < 8; row++) {
      const t = row / 8;
      b.part(row % 2 ? 0x8e5940 : 0x754333, x + side * (0.27 + t * 2.28), 3.71 - t * 1.075,
        z, 0.075, SURFACE_GAP.roof, 5.36, { roll });
    }
  }
  b.part(0x684435, x, 3.778, z, 0.24, 0.14, 5.40);
  for (const dz of [-1.95, 0, 1.95]) {
    b.part(wood, x, 2.44, z + dz, 4.28, 0.245, 0.19);
    b.part(wood, x, 3.061, z + dz, 0.153, 1.21, 0.16);
    for (const side of [-1, 1]) {
      b.part(wood, x + side * 0.925, 3.011, z + dz, 2.19, 0.124, 0.142, { roll: -side * 0.5 });
    }
  }
  b.solid(x, z + 1.23, 1.21, 0.75);
  for (const side of [-1, 1]) {
    for (const dz of [-0.244, 0.244]) b.part(wood, x + side * 0.463, 0.36, z + 1.23 + dz, 0.105, 0.66, 0.105);
  }
  b.part(0xc3a075, x, 0.753, z + 1.23, 1.21, 0.086, 0.75);
  const table = architecture.group(b.root, 'Gazebo table surface', x, 0.8, z + 1.23);
  architecture.sign(b.root, ['PENDOPO'], x, 2.45, z - 2.061, 0.94, 0.21, { yaw: Math.PI, background: '#4a3125' });
  return table;
}

export function buildPool(THREE, architecture, { b }) {
  const basins = buildBasins(THREE, architecture, b);
  landscaping(architecture, b);
  loungeChairs(architecture, b);
  const gazeboTable = gazebo(architecture, b);
  for (const towerInfo of [
    { x: -16.5, z: 40.2, facing: Math.PI, width: 15.7, floors: 14, variant: 0 },
    { x: 0.3, z: 40.8, facing: Math.PI, width: 15.1, floors: 16, variant: 1 },
    { x: 17.0, z: 40.3, facing: Math.PI, width: 15.6, floors: 13, variant: 2 },
    { x: -26.4, z: 26.3, facing: Math.PI / 2, width: 13.65, floors: 14, variant: 1 },
    { x: -26.1, z: 9.25, facing: Math.PI / 2, width: 15.7, floors: 16, variant: 2 },
    { x: 26.0, z: 26.1, facing: -Math.PI / 2, width: 14.3, floors: 15, variant: 0 },
    { x: 26.9, z: 7.55, facing: -Math.PI / 2, width: 16.0, floors: 13, variant: 2 },
    { x: -17.4, z: -7.65, facing: 0, width: 11.5, floors: 14, variant: 0 },
    { x: 17.9, z: -7.75, facing: 0, width: 12.7, floors: 15, variant: 2 },
  ]) tower(architecture, b.root, towerInfo);

  for (const [x, z, yaw] of [[-11.95, 7.59, 0.65], [14.9, 16.62, -1.0]]) {
    const ladder = architecture.group(b.root, 'Swimming pool ladder', x, 0, z, yaw);
    const { part, finish } = architecture.builder(ladder);
    for (const side of [-1, 1]) {
      part(COLORS.steel, side * 0.30, 0.03, 0, 0.07, 1.11, 0.07, { shape: 'cylinder' });
      part(COLORS.steel, side * 0.30, 0.56, -0.23, 0.07, 0.48, 0.07, { shape: 'cylinder', pitch: Math.PI / 2 });
      part(COLORS.steel, side * 0.30, 0.28, -0.44, 0.07, 0.56, 0.07, { shape: 'cylinder' });
    }
    for (const y of [-0.22, -0.45]) part(COLORS.steel, 0, y, 0, 0.62, 0.055, 0.07);
    finish();
    b.solid(x, z, 0.65, 0.51);
  }
  architecture.sign(b.root, ['POOL TERRACE', 'MAIN POOL    ·    SHALLOW POOL'], 2.94, 1.36, -0.27, 2.46, 0.75, { yaw: Math.PI });
  b.block(0x82694b, 2.94, 0.83, -0.20, 2.48, 1.66, 0.10);
  return {
    ...basins, gazeboTable,
    insideGazebo: (x, z) => Math.abs(x - GAZEBO.x) < 1.86 && Math.abs(z - GAZEBO.z) < 1.87,
    ceiling(x, z) {
      const underGazebo = Math.abs(x - GAZEBO.x) < 2.4 && Math.abs(z - GAZEBO.z) < 2.38;
      return underGazebo ? 2.30 : Infinity;
    },
  };
}
