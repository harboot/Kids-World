import { addGroup, paintCanvasTexture, rectangleBounds, SURFACE_GAP } from '../../core/geometry.js';
import { PLAYER_ONLY_LAYER } from '../../core/render-layers.js';
import { seededRandom } from '../../core/random.js';
import {
  CORRIDOR_WIDTH, END_HALL_START, EXHIBIT_DEPTH, EXHIBIT_HEIGHT, EXHIBIT_WIDTH,
  GALLERY_DEPTH, GALLERY_WIDTH, LOBBY_START, exhibits,
} from './exhibits.js';
import { addGallerySign, createParts } from './parts.js';

const ceiling = EXHIBIT_HEIGHT;
const halfWidth = GALLERY_WIDTH / 2;
const halfDepth = GALLERY_DEPTH / 2;
const passage = CORRIDOR_WIDTH / 2;
const wallDepth = 0.44;

export function buildGallery(THREE, scene, document, obstacles) {
  scene.background = new THREE.Color(0x5f456c);
  scene.fog = new THREE.Fog(0x866c9a, 43, 112);
  scene.add(new THREE.HemisphereLight(0xffe6d2, 0x9382b7, 2.05));
  const key = new THREE.DirectionalLight(0xffedce, 1.65);
  key.position.set(-14, 26, 13);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe6caff, 0.58);
  fill.position.set(12, 14, -15);
  scene.add(fill);

  const parts = createParts(THREE);
  const { part, beam, batch, matte } = parts;
  const ivory = matte(0xe4cdbb);
  const blush = matte(0xc293a9);
  const mauve = matte(0x9b739e);
  const plum = matte(0x542753);
  const wine = matte(0x743b68);
  const gold = matte(0xd4a661);
  const cream = matte(0xffe4bf);
  const stone = matte(0xb89caa);
  const crystal = matte(0xffcda3, { emissive: 0xf8a061, emissiveIntensity: 0.65 });
  const lantern = new THREE.MeshBasicMaterial({ color: 0xffe2af, toneMapped: false });
  const marbleMap = paintCanvasTexture(THREE, document, 256, 256, (ink, w, h) => {
    const random = seededRandom(52);
    ink.fillStyle = '#fcf4e8';
    ink.fillRect(0, 0, w, h);
    for (let i = 0; i < 29; i++) {
      const x = random() * w * 1.6 - w * 0.55;
      const drift = 30 + random() * 120;
      ink.strokeStyle = i % 4 ? '#ad7a9a19' : '#c8a58347';
      ink.lineWidth = 0.35 + random() * 1.9;
      ink.beginPath();
      ink.moveTo(x, -6);
      ink.bezierCurveTo(x + drift, 74 + random() * 38, x - drift * 0.29, 142, x + 0.83 * drift, 262);
      ink.stroke();
    }
  });
  const marble = [0xe2c9bd, 0xd4adb2, 0xf4dfd0, 0xe9d6cd].map(color => matte(color, {
    map: marbleMap, reflectivity: 0.18,
  }));

  const shell = addGroup(THREE, scene, 'Gallery architecture');
  const components = new THREE.Group();
  const box = (material, ...transform) => part(components, 'box', material, ...transform);
  const overhead = mesh => mesh.layers.set(PLAYER_ONLY_LAYER);

  function solid(x, z, width, depth, height = ceiling) {
    obstacles.push({ ...rectangleBounds(x, z, width, depth), height });
  }

  function wall(x, z, width, depth) {
    box(ivory, x, ceiling / 2, z, width, ceiling, depth);
    const base = 0.12;
    const vertical = width < depth;
    const faceWidth = vertical ? width + 2 * base : width;
    const faceDepth = vertical ? depth : depth + 2 * base;
    box(mauve, x, 0.79, z, faceWidth, 1.58, faceDepth);
    box(gold, x, 1.62, z, faceWidth + SURFACE_GAP.trim, 0.086, faceDepth + SURFACE_GAP.trim);
    solid(x, z, faceWidth, faceDepth);
  }

  box(stone, 0, -0.24, 0, GALLERY_WIDTH, 0.40, GALLERY_DEPTH);
  for (const side of [-1, 1]) wall(side * (halfWidth - wallDepth / 2), 0, wallDepth, GALLERY_DEPTH);
  for (const z of [-halfDepth + wallDepth / 2, halfDepth - wallDepth / 2]) wall(0, z, GALLERY_WIDTH - 2 * wallDepth, wallDepth);

  for (let row = 0; row <= 5; row++) {
    const z = LOBBY_START - row * EXHIBIT_WIDTH;
    for (const side of [-1, 1]) {
      wall(side * (passage + (EXHIBIT_DEPTH - wallDepth) / 2), z, EXHIBIT_DEPTH - wallDepth, wallDepth);
    }
  }

  // The corridor, lobby and end hall share a stone floor and a continuous inlay.
  function tiledFloor(x, z, width, depth, across, along) {
    const tileWidth = width / across;
    const tileDepth = depth / along;
    for (let i = 0; i < across; i++) {
      for (let j = 0; j < along; j++) {
        box(marble[(i * 7 + j * 11 + i * j) % marble.length],
          x - width / 2 + (i + 0.5) * tileWidth, -0.019, z - depth / 2 + (j + 0.5) * tileDepth,
          tileWidth - 0.034, 0.038, tileDepth - 0.034);
      }
    }
  }

  tiledFloor(0, (END_HALL_START + LOBBY_START) / 2, CORRIDOR_WIDTH, LOBBY_START - END_HALL_START, 6, 50);
  tiledFloor(0, (LOBBY_START + halfDepth) / 2, GALLERY_WIDTH, halfDepth - LOBBY_START, 26, 5);
  tiledFloor(0, (END_HALL_START - halfDepth) / 2, GALLERY_WIDTH, halfDepth + END_HALL_START, 26, 4);
  box(plum, 0, SURFACE_GAP.detail / 2, -0.45, 4.15, SURFACE_GAP.detail, 101.1);
  for (const side of [-1, 1]) {
    box(gold, side * 1.88, SURFACE_GAP.detail * 1.5, -0.45, 0.046, SURFACE_GAP.detail, 101.06);
    box(wine, side * 1.72, SURFACE_GAP.detail * 1.5, -0.45, 0.16, SURFACE_GAP.detail, 101.06);
  }

  function medallion(z, radius) {
    part(components, 'drum', gold, 0, 0.021, z, radius, 0.042, radius);
    part(components, 'drum', wine, 0, 0.036, z, radius * 0.92, 0.04, radius * 0.92);
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      const floret = part(components, 'gem', cream, Math.cos(angle) * radius * 0.48, 0.064,
        z + Math.sin(angle) * radius * 0.48, radius * 0.25, 0.013, radius * 0.10);
      floret.rotation.y = -angle;
    }
    part(components, 'gem', gold, 0, 0.067, z, radius * 0.17, 0.018, radius * 0.17).rotation.y = Math.PI / 4;
  }
  medallion(54.0, 3.7);
  for (const { position: { z } } of exhibits.filter((_, index) => index % 2 === 0)) medallion(z, 1.47);

  // Given a box ceiling, the beams and coffers provide depth without blocking drone inspection.
  overhead(box(ivory, 0, ceiling + 0.15, 0, GALLERY_WIDTH, 0.3, GALLERY_DEPTH));
  overhead(box(mauve, 0, ceiling - 0.12, 0, CORRIDOR_WIDTH, 0.24, GALLERY_DEPTH));
  overhead(box(cream, 0, ceiling - 0.26, 0, 4.8, 0.13, GALLERY_DEPTH));
  for (const side of [-1, 1]) {
    overhead(box(gold, side * 2.45, ceiling - 0.35, 0, 0.13, 0.18, GALLERY_DEPTH));
    overhead(box(plum, side * 5.66, ceiling - 0.21, 0, 0.34, 0.42, GALLERY_DEPTH));
  }

  const ring = new THREE.TorusGeometry(1, 0.045, 6, 28);
  function chandelier(z, scale) {
    const model = addGroup(THREE, components, 'Crystal chandelier', 0, 12.8, z);
    model.scale.setScalar(scale);
    const fixture = part(model, ring, gold, 0, 0, 0, 1.74, 1.74, 1.74);
    fixture.rotation.x = Math.PI / 2;
    const upper = part(model, ring, gold, 0, 0.44, 0, 1.09, 1.09, 1.09);
    upper.rotation.x = Math.PI / 2;
    overhead(fixture);
    overhead(upper);
    overhead(beam(components, gold, [0, 13.65, z], [0, ceiling - 0.28, z], 0.078));
    overhead(part(model, 'gem', crystal, 0, -0.96, 0, 0.39, 0.92, 0.39));
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      const x = Math.cos(angle) * 1.74;
      const offset = Math.sin(angle) * 1.74;
      overhead(beam(model, gold, [0, 1.37, 0], [x, 0.02, offset], 0.052));
      overhead(part(model, 'gem', crystal, x, -0.36, offset, 0.14, 0.44, 0.14));
      overhead(part(model, 'drum', gold, x, 0.1, offset, 0.14, 0.11, 0.14));
      overhead(part(model, 'sphere', lantern, x, 0.31, offset, 0.085, 0.16, 0.085));
    }
  }

  // Columns, banners and high arches repeat along the central axis.
  for (const z of [54, 49, 29, 9, -11, -31, -51, -55.6]) {
    for (const side of [-1, 1]) {
      const x = side * 5.36;
      solid(x, z, 1.18, 1.26, 15);
      part(components, 'box', plum, x, 0.16, z, 1.18, 0.32, 1.26);
      part(components, 'drum', ivory, x, 6.4, z, 0.43, 12.45, 0.43);
      for (const [y, size, height] of [[0.43, 0.55, 0.26], [1.04, 0.47, 0.09], [11.84, 0.49, 0.12], [12.53, 0.62, 0.33]]) {
        part(components, 'drum', gold, x, y, z, size, height, size);
      }
      const points = [[x, 12.55, z], [side * 4.87, 14.58, z], [side * 3.39, 16.27, z],
        [side * 1.61, 17.25, z], [0, 17.61, z]];
      for (let i = 1; i < points.length; i++) {
        overhead(beam(components, ivory, points[i - 1], points[i], 0.6, 0.73));
        const front = point => [point[0], point[1], z + 0.38];
        overhead(beam(components, gold, front(points[i - 1]), front(points[i]), 0.14, 0.12));
      }
      if (z > 49 || z < -51) continue;
      const banner = addGroup(THREE, components, 'Royal banner', side * 5.69, 6.92, z);
      banner.rotation.y = -side * Math.PI / 2;
      part(banner, 'box', wine, 0, 0, 0, 1.31, 2.91, 0.10);
      part(banner, 'box', gold, 0, 1.47, 0, 1.58, 0.12, 0.16);
      part(banner, 'gem', wine, 0, -1.31, 0, 0.653, 0.56, 0.055);
      part(banner, 'gem', gold, 0, 0.15, 0.073, 0.31, 0.54, 0.045);
      part(banner, 'gem', cream, 0, 0.15, 0.118, 0.124, 0.24, 0.038);
    }
  }

  for (const z of [54.4, 39, 19, -1, -21, -41, -54.9]) chandelier(z, z > 50 ? 1.38 : 1);
  const lobby = addGroup(THREE, components, 'Lobby title frame', 0, 0, LOBBY_START);
  part(lobby, 'box', plum, 0, 4.26, 0, 10.64, 0.22, 0.48);
  part(lobby, 'box', gold, 0, 4.26, 0.269, 10.64, 0.055, 0.058);
  part(lobby, 'box', plum, 0, 4.26, 0.26, 6.8, 0.95, 0.18);
  part(lobby, 'box', gold, 0, 4.26, 0.349, 6.64, 0.83, 0.11);
  part(lobby, 'gem', gold, 0, 4.84, 0.34, 0.23, 0.24, 0.10);
  addGallerySign(THREE, document, scene, ['Princess Gallery'], 0, 4.26,
    LOBBY_START + 0.404 + SURFACE_GAP.detail, 6.43, 0.70);

  const display = addGroup(THREE, components, 'Royal crown display', 0, 0, -55);
  part(display, 'drum', plum, 0, 0.27, 0, 1.88, 0.54, 1.88);
  part(display, 'drum', blush, 0, 0.76, 0, 1.42, 0.46, 1.42);
  part(display, 'drum', gold, 0, 1.02, 0, 1.37, 0.14, 1.37);
  part(display, ring, gold, 0, 1.38, 0, 0.94, 0.94, 0.94).rotation.x = Math.PI / 2;
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const x = Math.cos(angle);
    const z = Math.sin(angle);
    beam(display, gold, [x * 0.92, 1.41, z * 0.92], [x * 0.67, 2.18, z * 0.67], 0.066);
    part(display, 'gem', crystal, x * 0.67, 2.20, z * 0.67, 0.115, 0.2, 0.115);
  }
  part(display, 'gem', crystal, 0, 1.72, 0, 0.31, 0.61, 0.31);
  solid(0, -55, 3.76, 3.76, 2.36);
  batch(components, shell);

  const visits = exhibits.map(exhibit => {
    const { id, title, accent, position, rotation, bounds, build } = exhibit;
    const { width, depth } = bounds;
    const bay = addGroup(THREE, scene, id + ' exhibit', position.x, 0, position.z, rotation);
    const components = new THREE.Group();
    const box = (material, ...transform) => part(components, 'box', material, ...transform);
    const localPart = (shape, material, ...transform) => part(components, shape, material, ...transform);
    const tint = matte(accent);
    const front = depth / 2;
    const interiorFace = front - wallDepth / 2;
    const clearWidth = 6.7;
    const jambWidth = (width - clearWidth) / 2;
    const roomTrim = 0.30;
    const side = Math.sign(position.x);
    const z = position.z;

    for (const direction of [-1, 1]) {
      const x = direction * (clearWidth + jambWidth) / 2;
      box(ivory, x, ceiling / 2, front, jambWidth - 0.01, ceiling, wallDepth);
      box(mauve, x, 0.79, front, jambWidth - roomTrim, 1.58, 0.57);
      box(gold, x, 1.62, front, jambWidth - 0.12, 0.086, 0.61);
      solid(side * passage, z + x, 0.61, jambWidth);
      for (const offset of [3.69, 7.8]) {
        const pilaster = direction * offset;
        box(blush, pilaster, 3.16, front + 0.29, 0.58, 6.3, 0.33);
        box(cream, pilaster, 3.24, front + 0.43, 0.185, 5.97, 0.17);
        box(gold, pilaster, 0.25, front + 0.28, 0.68, 0.47, 0.45);
      }
      const mount = direction * 5.57;
      box(plum, mount, 2.99, front + 0.26, 0.24, 0.73, 0.16);
      box(gold, mount, 2.86, front + 0.43, 0.43, 0.12, 0.43);
      localPart('gem', crystal, mount, 3.29, front + 0.47, 0.2, 0.43, 0.21);
    }
    box(ivory, 0, (ceiling + 5.12) / 2, front, clearWidth, ceiling - 5.12, wallDepth);
    box(mauve, 0, 5.38, front + 0.24, clearWidth + 0.69, 0.55, 0.29);

    const arch = [[-3.53, 0], [-3.53, 3.68], [-2.97, 4.48], [-1.62, 5.01], [0, 5.18],
      [1.62, 5.01], [2.97, 4.48], [3.53, 3.68], [3.53, 0]];
    for (let i = 1; i < arch.length; i++) {
      const a = arch[i - 1];
      const b = arch[i];
      beam(components, plum, [...a, front + 0.31], [...b, front + 0.31], 0.37, 0.44);
      beam(components, gold, [...a, front + 0.535], [...b, front + 0.535], 0.075, 0.085);
    }

    const fascia = build ? [title] : [title, 'Coming Soon'];
    box(gold, 0, 5.73, front + 0.48, 6.58, 1.24, 0.16);
    addGallerySign(THREE, document, bay, fascia, 0, 5.73, front + 0.56 + SURFACE_GAP.detail, 6.4, 1.11);
    // Give players a readable sign at eye level when they are close to the doorway.
    box(gold, -5.3, 1.92, front + 0.25, 2.62, 0.83, 0.15);
    addGallerySign(THREE, document, bay, fascia, -5.3, 1.92, front + 0.325 + SURFACE_GAP.detail, 2.51, 0.72);

    box(tint, 0, SURFACE_GAP.detail / 2, front, clearWidth - 0.09, SURFACE_GAP.detail, 0.92);
    const mapLabel = addGallerySign(THREE, document, bay, fascia, 0, SURFACE_GAP.detail * 2,
      front + 1.32, 5.9, 1.02);
    if (mapLabel) mapLabel.rotation.set(-Math.PI / 2, 0, Math.PI);

    if (!build) {
      box(marble[0], 0, -0.019, 0, width - wallDepth, 0.038, depth - wallDepth);
      box(wine, 0, SURFACE_GAP.detail / 2, 0, 4.37, SURFACE_GAP.detail, depth - 1.16);
      for (const edge of [-1, 1]) {
        box(gold, edge * 2.04, SURFACE_GAP.detail * 1.5, 0, 0.055, SURFACE_GAP.detail, depth - 1.2);
      }
      const displayZ = -4.2;
      localPart('drum', plum, 0, 0.18, displayZ, 1.56, 0.36, 1.56);
      localPart('drum', gold, 0, 0.4, displayZ, 1.42, 0.12, 1.42);
      localPart('drum', tint, 0, 0.61, displayZ, 1.32, 0.33, 1.32);
      localPart('gem', tint, 0, 1.77, displayZ, 0.56, 1.03, 0.56).rotation.y = Math.PI / 4;
      for (const edge of [-1, 1]) {
        localPart('gem', crystal, edge * 0.73, 1.15, displayZ + 0.12, 0.18, 0.32, 0.17);
        box(blush, edge * 6.25, 5.0, -depth / 2 + 0.31, 2.2, 6.71, 0.12);
        box(gold, edge * 6.25, 8.43, -depth / 2 + 0.30, 2.55, 0.14, 0.21);
        localPart('gem', gold, edge * 6.25, 5.63, -depth / 2 + 0.439, 0.55, 1.14, 0.14);
      }
      solid(position.x + Math.sin(rotation) * displayZ, z, 3.12, 3.12, 2.8);
      box(plum, 0, 3.05, -depth / 2 + 0.33, 6.24, 1.46, 0.31);
      addGallerySign(THREE, document, bay, fascia, 0, 3.05, -depth / 2 + 0.485 + SURFACE_GAP.detail, 6.04, 1.22);
    }
    overhead(box(blush, 0, ceiling - 0.09, 0, width - 0.095, 0.17, depth - 0.10));
    for (const offset of [-7.8, 7.8]) overhead(box(cream, offset, ceiling - 0.22, 0, 0.31, 0.27, depth - 0.20));
    batch(components, bay);
    return build?.({ THREE, document, bay, exhibit, parts, obstacles, interiorFace });
  });

  return { exhibitVisits: visits.filter(Boolean), ceiling };
}
