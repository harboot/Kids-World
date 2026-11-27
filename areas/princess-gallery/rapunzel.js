import { cueSource, entryCue, galleryCues } from './interaction-audio.js';
import { addGroup, paintCanvasTexture, rectangleBounds, SURFACE_GAP } from '../../core/geometry.js';
import { PLAYER_RADIUS } from '../../core/movement.js';
import { EYE_HEIGHT } from '../../core/player.js';
import { seededRandom } from '../../core/random.js';
import { PLAYER_ONLY_LAYER } from '../../core/render-layers.js';
import { addGallerySign } from './parts.js';
import { buildTower } from './rapunzel-tower.js';

export const observationPlatform = Object.freeze({ x: 0, z: 4.25, width: 2.75, depth: 2.35, top: 0.78 });
const tower = { x: 0, z: -5.15, radius: 2.16 };
const footTolerance = 0.025;
const pathCenter = z => 1.35 * Math.sin((z - 4.25) * 0.52) * Math.min(1, Math.abs(z - 4.25) / 3);

function terrainHeight(x, z, width, front) {
  const edge = Math.max(0, Math.min(1, (front - z) / 2, (width / 2 - Math.abs(x)) / 1.2));
  const rise = Math.max(0, Math.min(1, (Math.abs(x - pathCenter(z)) - 2.0) / 2.8));
  return edge * rise * (0.12 + 0.12 * Math.sin(x * 0.42 + z * 0.54) ** 2
    + 0.14 * Math.cos(z * 0.34 - x * 0.25) ** 2);
}

export function buildRapunzel({ THREE, document, bay, exhibit, parts, obstacles, interiorFace, playCue = () => {} }) {
  const { part, beam, batch, matte } = parts;
  const { bounds: { width, depth }, position, rotation } = exhibit;
  const random = seededRandom(4553);
  const components = new THREE.Group();
  const left = -width / 2 + 0.19;
  const rear = -depth / 2 + 0.60;
  const front = interiorFace;
  const ground = (x, z) => terrainHeight(x, z, width, front);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const worldX = (x, z) => position.x + cos * x + sin * z;
  const worldZ = (x, z) => position.z - sin * x + cos * z;
  const localX = (x, z) => cos * (x - position.x) - sin * (z - position.z);
  const localZ = (x, z) => sin * (x - position.x) + cos * (z - position.z);
  const grass = new THREE.MeshLambertMaterial({ vertexColors: true });
  const dirt = new THREE.MeshLambertMaterial({ vertexColors: true });
  const moss = [matte(0x557843), matte(0x739348), matte(0x8e9d57)];
  const greens = [matte(0x274e4b), matte(0x3d6853), matte(0x578562), matte(0x72976b)];
  const bark = [matte(0x503c3d), matte(0x775246)];
  const rock = [matte(0x5b6d69), matte(0x7b7e72)];
  const violet = matte(0xb18cc8);
  const pink = matte(0xe5a0b8);
  const amber = matte(0xefc37c);
  const ivory = matte(0xf6dfb1);
  const walnut = matte(0x6c453c);
  const warmWood = matte(0xa56a47);
  const woodLight = matte(0xbe8a5d);
  const gold = matte(0xc9914c);

  function circle(x, z, radius, height) {
    const cx = worldX(x, z);
    const cz = worldZ(x, z);
    obstacles.push({
      ...rectangleBounds(cx, cz, radius * 2, radius * 2), height,
      touches: (px, pz) => (px - cx) ** 2 + (pz - cz) ** 2 < (radius + PLAYER_RADIUS) ** 2,
    });
  }

  const terrain = new THREE.PlaneGeometry(width - 0.36, front - rear, 40, 46);
  terrain.rotateX(-Math.PI / 2);
  terrain.translate(0, 0, (front + rear) / 2);
  const terrainVertices = terrain.getAttribute('position');
  const color = new THREE.Color();
  const terrainColors = [];
  for (let i = 0; i < terrainVertices.count; i++) {
    const x = terrainVertices.getX(i);
    const z = terrainVertices.getZ(i);
    const shade = 0.29 + 0.095 * (Math.sin(x * 0.47 + z * 0.39) + 1) / 2 + random() * 0.031;
    color.setHSL(0.245 + 0.033 * Math.sin(z * 0.29), 0.34, shade, THREE.SRGBColorSpace);
    terrainVertices.setY(i, ground(x, z));
    terrainColors.push(color.r, color.g, color.b);
  }
  terrain.setAttribute('color', new THREE.Float32BufferAttribute(terrainColors, 3));
  terrain.computeVertexNormals();
  part(components, terrain, grass, 0, 0, 0, 1, 1, 1);

  const pathPositions = [], pathColors = [], pathIndices = [];
  for (let row = 0; row <= 54; row++) {
    const z = front - row * (front - tower.z - 2.22) / 54;
    for (let column = 0; column < 5; column++) {
      const spread = 1.43 + 0.14 * Math.sin(row * 0.47 + (column === 0 ? 0 : 2.3));
      const x = pathCenter(z) + spread * (column - 2) / 2;
      pathPositions.push(x, ground(x, z) + SURFACE_GAP.detail, z);
      color.setHSL(0.082 + random() * 0.035, 0.31 + random() * 0.10,
        0.43 + (column % 4 ? 0.09 : 0) + random() * 0.07, THREE.SRGBColorSpace);
      pathColors.push(color.r, color.g, color.b);
      if (row > 0 && column > 0) {
        const i = row * 5 + column;
        pathIndices.push(i - 6, i - 5, i - 1, i - 5, i, i - 1);
      }
    }
  }
  const path = new THREE.BufferGeometry();
  path.setAttribute('position', new THREE.Float32BufferAttribute(pathPositions, 3));
  path.setAttribute('color', new THREE.Float32BufferAttribute(pathColors, 3));
  path.setIndex(pathIndices);
  path.computeVertexNormals();
  part(components, path, dirt, 0, 0, 0, 1, 1, 1);

  buildForestBackdrop(THREE, document, bay, width, rear, front, exhibit.bounds.height);

  function tree(x, z, height, radius, narrow = false) {
    const y = ground(x, z);
    const model = addGroup(THREE, components, 'Forest tree', x, y, z);
    const turn = random() * Math.PI * 2;
    const { clamp } = THREE.MathUtils;
    const trunk = part(model, 'drum', bark[0], 0, height * 0.30, 0, radius, height * 0.61, radius);
    trunk.rotation.z = 0.07;
    part(model, 'drum', bark[1], 0.16, height * 0.57, 0, radius * 0.61, height * 0.56, radius * 0.65).rotation.z = -0.08;
    for (let i = 0; i < 3; i++) {
      const angle = i * Math.PI * 2 / 3 + turn;
      const dx = Math.cos(angle);
      const dz = Math.sin(angle);
      beam(model, bark[1], [0, height * 0.49, 0], [dx * height * 0.18, height * 0.76, dz * height * 0.145], radius * 0.67);
      const crownRadius = height * (narrow ? 0.18 : 0.223);
      const inset = 0.41 + crownRadius;
      const crownX = clamp(x + dx * height * 0.17, -width / 2 + inset, width / 2 - inset) - x;
      const crownZ = clamp(z + dz * height * 0.11, rear + crownRadius, front - crownRadius) - z;
      const canopy = part(model, 'ball', greens[i], crownX, height * (0.75 + i * 0.085), crownZ,
        crownRadius, height * 0.24, Math.min(crownRadius, height * 0.19));
      canopy.rotation.y = i * 2.2;
      part(model, 'ball', greens[i + 1], crownX, height * (0.88 + i * 0.043), crownZ,
        height * 0.142, height * 0.19, height * 0.153).rotation.y = i;
      beam(model, bark[0], [0, 0.54, 0], [dx * radius * 2.35, 0.08, dz * radius * 2.35], radius * 0.75);
    }
    circle(x, z, radius * 1.15, height);
  }

  for (const [x, z, h, r] of [
    [-7.7, 8.1, 7.2, 0.36], [7.65, 8.55, 8.2, 0.40], [-8.1, 1.35, 10.7, 0.49], [7.76, 2.0, 9.4, 0.44],
    [-8.45, -4.05, 10.9, 0.53], [7.85, -4.0, 11.4, 0.53], [-6.25, -8.2, 11.8, 0.45],
    [6.15, -8.65, 11.2, 0.53], [-3.45, -9.5, 9.3, 0.39], [3.9, -9.6, 10.4, 0.42],
  ]) tree(x, z, h, r, z < -7);

  function boulder(x, z, size) {
    const y = ground(x, z);
    part(components, 'ball', rock[size > 1.04 ? 0 : 1], x, y + size * 0.38, z, size, size * 0.65, size * 0.74).rotation.y = random() * 3;
    part(components, 'ball', moss[0], x - 0.13 * size, y + size * 0.79, z + 0.04, size * 0.82, size * 0.26, size * 0.60).rotation.y = random() * 2;
    if (size > 0.75) circle(x, z, size * 0.76, y + size * 1.01);
  }
  for (const [x, z, size] of [[-5.6, 6.1, 1.4], [5.7, 4.8, 1.25], [-5.0, -0.1, 0.98],
    [5.25, -2.1, 1.45], [-6.25, -5.8, 1.75], [4.92, -6.25, 1.31], [0.7, -9.7, 1.16]]) boulder(x, z, size);

  for (let i = 0; i < 118; i++) {
    const side = i % 2 ? 1 : -1;
    const z = rear + 0.8 + random() * (front - rear - 1.5);
    const x = side * (2.15 + random() * 6.98);
    if (Math.abs(x - pathCenter(z)) < 1.9 || Math.hypot(x - tower.x, z - tower.z) < 2.7) continue;
    const y = ground(x, z);
    const size = 0.22 + random() * 0.69;
    part(components, 'ball', moss[i % 3], x, y + size * 0.40, z, size * 0.96, size * 0.55, size * 0.77).rotation.y = random() * 6;
    if (i % 3) {
      const stem = 0.19 + random() * 0.29;
      for (let j = 0; j < 3; j++) {
        const dx = (j - 1) * 0.16;
        const h = stem + (j % 2) * 0.09;
        part(components, 'drum', greens[2], x + dx, y + h / 2, z + 0.2, 0.018, h, 0.018);
        part(components, 'ball', [pink, violet, ivory, amber][i % 4], x + dx, y + h, z + 0.2, 0.085, 0.065, 0.079);
      }
    } else {
      part(components, 'drum', ivory, x, y + 0.14, z + 0.25, 0.058, 0.28, 0.058);
      part(components, 'sphere', i % 2 ? pink : amber, x, y + 0.29, z + 0.25, 0.17, 0.085, 0.17);
    }
  }

  // Root lamps sit outside the walking path and frame the observation area.
  for (const x of [-2.47, 2.47]) {
    const z = 5.55;
    part(components, 'drum', walnut, x, 0.28, z, 0.17, 0.57, 0.17);
    part(components, 'drum', gold, x, 0.59, z, 0.26, 0.12, 0.26);
    part(components, 'gem', amber, x, 0.81, z, 0.18, 0.27, 0.18);
    circle(x, z, 0.25, 1.08);
  }

  const platform = observationPlatform;
  const { x, z, width: padWidth, depth: padDepth, top } = platform;
  const platformParts = addGroup(THREE, components, 'Observation platform', x, 0, z);
  part(platformParts, 'box', walnut, 0, 0.31, 0, padWidth - 0.09, 0.62, padDepth - 0.09);
  part(platformParts, 'box', gold, 0, 0.615, 0, padWidth, 0.13, padDepth);
  part(platformParts, 'box', warmWood, 0, (0.66 + top - SURFACE_GAP.detail) / 2, 0, padWidth, top - SURFACE_GAP.detail - 0.66, padDepth);
  for (let i = -2; i <= 2; i++) {
    part(platformParts, 'box', i % 2 ? warmWood : woodLight, i * 0.498, top - 0.016, 0,
      0.476, 0.032, padDepth - 0.16);
  }
  const footprint = part(platformParts, 'gem', ivory, 0, top + SURFACE_GAP.detail, -0.2, 0.24, 0.017, 0.33);
  footprint.rotation.y = Math.PI / 4;
  for (const side of [-1, 1]) {
    part(platformParts, 'box', gold, side * (padWidth / 2 - 0.13), 0.31, padDepth / 2 - 0.025, 0.18, 0.47, 0.075);
    beam(platformParts, ivory, [0, top + SURFACE_GAP.detail, 0.24],
      [side * 0.19, top + SURFACE_GAP.detail, 0.43], 0.025, 0.043);
  }
  const platformWidth = Math.abs(cos) * padWidth + Math.abs(sin) * padDepth;
  const platformDepth = Math.abs(sin) * padWidth + Math.abs(cos) * padDepth;
  obstacles.push({
    ...rectangleBounds(worldX(x, z), worldZ(x, z), platformWidth, platformDepth), height: top,
    touches(px, pz) {
      const dx = Math.max(0, Math.abs(localX(px, pz) - x) - padWidth / 2);
      const dz = Math.max(0, Math.abs(localZ(px, pz) - z) - padDepth / 2);
      return dx * dx + dz * dz < PLAYER_RADIUS * PLAYER_RADIUS;
    },
  });
  const signX = -3.4;
  const signZ = 7.10;
  const sign = addGroup(THREE, bay, 'Observation platform sign', signX, 0, signZ, 0.12);
  part(sign, 'box', walnut, 0, 0.65, 0, 0.18, 1.3, 0.18);
  part(sign, 'box', gold, 0, 1.39, 0, 2.72, 0.68, 0.16);
  addGallerySign(THREE, document, sign, ['Jump Here to Say Hello!'], 0, 1.39, 0.08 + SURFACE_GAP.detail, 2.57, 0.57);
  circle(signX, signZ, 0.11, 1.66);

  circle(tower.x, tower.z, tower.radius, 13.3);
  const rapunzel = buildTower(THREE, bay, components, parts, tower);
  batch(components, bay);

  const greetingAudio = entryCue(playCue, galleryCues.rapunzel,
    cueSource(position.x + Math.sin(rotation)*platform.z, position.z + Math.cos(rotation)*platform.z, EYE_HEIGHT+top));
  return {
    getGroundHeight(x, z) {
      const lx = localX(x, z);
      const lz = localZ(x, z);
      if (lx < left || lx > -left || lz < rear || lz > front) return;
      return ground(lx, lz);
    },
    update(dt, player, grounded, reducedMotion) {
      const onPlatform = grounded && Math.abs(player.y - EYE_HEIGHT - top) <= footTolerance &&
        Math.abs(localX(player.x, player.z) - platform.x) <= padWidth / 2 &&
        Math.abs(localZ(player.x, player.z) - platform.z) <= padDepth / 2;
      greetingAudio.update(onPlatform, dt);
      rapunzel.update(dt, onPlatform, reducedMotion);
      return onPlatform;
    },
    reset() { greetingAudio.reset(); rapunzel.reset(); },
  };
}

function buildForestBackdrop(THREE, document, bay, width, rear, front, ceiling) {
  const texture = paintCanvasTexture(THREE, document, 1024, 768, (ink, w, h) => {
    const sky = ink.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#78648d');
    sky.addColorStop(0.41, '#aaa5a6');
    sky.addColorStop(0.73, '#c4bfa1');
    sky.addColorStop(1, '#577062');
    ink.fillStyle = sky;
    ink.fillRect(0, 0, w, h);
    const random = seededRandom(88);
    for (let i = 0; i < 44; i++) {
      const x = random() * w, y = random() * h * 0.43;
      ink.fillStyle = i % 3 ? '#ffedd490' : '#fff5d9c9';
      ink.fillRect(x, y, i % 3 ? 2 : 4, i % 3 ? 2 : 4);
    }
    for (const [color, base, lift, density] of [
      ['#8d9b8c', 660, 260, 23], ['#677f76', 720, 320, 19], ['#436660', 785, 365, 16],
    ]) {
      ink.fillStyle = color;
      ink.fillRect(0, base - 6, w, h - base + 6);
      for (let i = 0; i < density; i++) {
        const x = i * w / (density - 1) + (random() - 0.5) * 44;
        const top = base - lift * (0.51 + random() * 0.68);
        const span = 28 + random() * 55;
        ink.beginPath();
        ink.moveTo(x, top);
        for (let level = 1; level <= 4; level++) {
          const y = top + (base - top) * level / 4;
          ink.lineTo(x + span * level / 4, y);
          ink.lineTo(x + span * level / 8, y + 2);
        }
        ink.lineTo(x - span, base);
        for (let level = 3; level >= 1; level--) {
          const y = top + (base - top) * level / 4;
          ink.lineTo(x - span * level / 8, y + 6);
          ink.lineTo(x - span * level / 4, y);
        }
        ink.closePath();
        ink.fill();
      }
    }
  });
  if (!texture) return;
  const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  const height = ceiling - 0.35;
  const size = front - rear - 0.40;
  const set = (planeWidth, x, z, yaw) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(planeWidth, height), material);
    mesh.position.set(x, height / 2, z);
    mesh.rotation.y = yaw;
    bay.add(mesh);
  };
  set(width - 0.79, 0, rear + SURFACE_GAP.detail, 0);
  for (const side of [-1, 1]) set(size, side * (width / 2 - 0.39), (rear + front - 0.34) / 2, -side * Math.PI / 2);

  const skyTexture = paintCanvasTexture(THREE, document, 512, 512, (ink, w, h) => {
    const dusk = ink.createRadialGradient(w * 0.58, h * 0.35, 0, w * 0.58, h * 0.35, w * 0.69);
    dusk.addColorStop(0, '#b494a4');
    dusk.addColorStop(0.48, '#8a7398');
    dusk.addColorStop(1, '#6b5785');
    ink.fillStyle = dusk;
    ink.fillRect(0, 0, w, h);
    const random = seededRandom(239);
    for (let i = 0; i < 84; i++) {
      const radius = i % 6 === 0 ? 1.65 : 0.74;
      ink.fillStyle = i % 6 === 0 ? '#ffe7be9e' : '#fff1d867';
      ink.beginPath();
      ink.arc(random() * w, random() * h, radius, 0, Math.PI * 2);
      ink.fill();
    }
  });
  if (skyTexture) {
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.8, front - rear),
      new THREE.MeshBasicMaterial({ map: skyTexture, toneMapped: false }));
    sky.rotation.x = Math.PI / 2;
    sky.position.set(0, height + SURFACE_GAP.roof, (rear + front) / 2);
    sky.layers.set(PLAYER_ONLY_LAYER);
    bay.add(sky);
  }
}
