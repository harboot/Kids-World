import { fishPools } from './detail-sites.js';
import { seededRandom } from '../../core/random.js';
import { CLIFF_Z, LAKE_LEVEL, clamp, cliffTop, faces, lakeDistance, mix, riverCenter, riverLevel, riverWidth, smooth } from './landform.js';

// Each ribbon has its own width, fall line, and break point at the lake.
const streams = [
  { x: -25.5, width: 3.65, drift: -0.45, front: 2.85 },
  { x: -20.8, width: 3.3, drift: 0.32, front: 2.7 },
  { x: -17.1, width: 0.53, drift: 0.47, front: 2.4 },
  { x: -7.7, width: 5.8, drift: 0.26, front: 2.9 },
  { x: -0.95, width: 5.9, drift: -0.51, front: 2.6 },
  { x: 5.37, width: 3.95, drift: -0.52, front: 2.25 },
  { x: 10.2, width: 1.95, drift: -1.12, front: 2.3 },
  { x: 23.9, width: 2.2, drift: 0.67, front: 1.0, bottom: 18.5 },
  { x: 14.15, width: 0.46, drift: -0.55, front: 0.65, bottom: 20.5 },
];

function flowTexture(THREE) {
  const random = seededRandom(521);
  const width = 64, height = 128;
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    const u = (i / 4 % width) / width, v = Math.floor(i / 4 / width) / height;
    const ripple = Math.sin((u * 7 + Math.sin(v * 6.283) * 0.37) * 6.283);
    const breakUp = Math.sin((v * 3 + u * 2) * 6.283) * 0.3 + (random() - 0.5) * 0.27;
    const foam = smooth(-0.39, 0.97, ripple + breakUp);
    data[i] = mix(126, 243, foam);
    data[i + 1] = mix(202, 251, foam);
    data[i + 2] = mix(226, 255, foam);
    data[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, width, height);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export function addWater(THREE, scene, terrain, touch) {
  const random = seededRandom(2423);
  const level = z => z < 26 ? LAKE_LEVEL : riverLevel(z);
  const water = faces(THREE, scene, 'Lake and downstream water',
    new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
  const shallows = faces(THREE, scene, 'Clear water over trout shoals',
    new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true, depthWrite: false }));
  const alpha = [];
  const teal = new THREE.Color(0x23778b), shallow = new THREE.Color(0x5db8ac), blue = new THREE.Color(0x286b93);
  function transparency(x, z) {
    return Math.max(...fishPools.map(({ x: px, z: pz, rx, rz }) =>
      1 - smooth(0.61, 1.55, Math.hypot((x-px)/rx, (z-pz)/rz))));
  }
  for (const tri of terrain.triangles()) {
    if (tri.every(p => p[1] >= level(p[2]))) continue;
    if (tri.every(([x, , z]) => lakeDistance(x, z) > 1.19 && (z < 15 || Math.abs(x - riverCenter(z)) > riverWidth(z) * 1.31))) continue;
    const variation = random();
    const vertices = tri.map(([x, , z]) => [x, level(z) + 0.003, z]);
    const colors = tri.map(([x, y, z]) =>
      teal.clone().lerp(blue, variation * 0.35).lerp(shallow, (1 - smooth(0.1, 2.8, level(z) - y)) * 0.91));
    const clear = tri.map(([x, , z]) => transparency(x, z));
    if (clear.some(value => value > 0)) {
      shallows.triangle(...vertices, colors);
      alpha.push(...clear.map(value => 1 - value * 0.65));
    } else water.triangle(...vertices, colors);
  }
  water.finish();
  const clearWater = shallows.finish().geometry;
  const rgb = clearWater.getAttribute('color'), rgba = [];
  for (let i = 0; i < rgb.count; i++) rgba.push(rgb.getX(i), rgb.getY(i), rgb.getZ(i), alpha[i]);
  clearWater.setAttribute('color', new THREE.Float32BufferAttribute(rgba, 4));

  const texture = flowTexture(THREE);
  const positions = [], uvs = [], colors = [], indices = [];
  const vertical = 23, horizontal = 6;
  for (const { x, width, drift, front, bottom = LAKE_LEVEL - 0.05 } of streams) {
    const top = cliffTop(x) + 0.13;
    const height = top - bottom;
    const offset = positions.length / 3;
    for (let j = 0; j <= vertical; j++) {
      const t = j / vertical;
      for (let i = 0; i <= horizontal; i++) {
        const u = i / horizontal;
        const fan = t > 0.76 ? (t - 0.76) ** 2 * 7 : 0;
        const ripple = Math.sin(t * 18 + u * 8.6 + x) * 0.18 * Math.sin(t * Math.PI);
        const xx = x + (u - 0.5) * width * (1 + fan) + drift * t + ripple;
        const yy = top - t * height + (cliffTop(xx) - cliffTop(x)) * (1 - t) ** 5;
        const zz = CLIFF_Z + front + t * t * (bottom < 2 ? 2.65 : 1) - 2.85 * (1 - t) ** 22
          + Math.sin(u * 13 + t * 9) * 0.19 + fan * 1.55;
        positions.push(xx, yy, zz);
        uvs.push(u * (0.5 + width * 0.13), t * height / 9);
        const value = mix(0.63, 1.08, smooth(0, 0.39, Math.min(u, 1 - u))) + random() * 0.15;
        colors.push(value * 0.91, value, value);
        if (i < horizontal && j < vertical) {
          const k = offset + j * (horizontal + 1) + i;
          indices.push(k, k + horizontal + 1, k + 1, k + 1, k + horizontal + 1, k + horizontal + 2);
        }
      }
    }
  }
  const fall = new THREE.BufferGeometry();
  fall.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  fall.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  fall.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  fall.setIndex(indices);
  const curtains = new THREE.Mesh(fall, new THREE.MeshBasicMaterial({
    map: texture, vertexColors: true, side: THREE.DoubleSide, toneMapped: false,
  }));
  curtains.name = 'Animated waterfall ribbons';
  scene.add(curtains);

  const foam = faces(THREE, scene, 'Whitewater, splash and lake ripples',
    new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
  const white = new THREE.Color(0xd2f8f5);
  function crest(x, z, size, width, color, angle) {
    const end = (u, v) => {
      const px = x + Math.cos(angle) * u - Math.sin(angle) * v;
      const pz = z + Math.sin(angle) * u + Math.cos(angle) * v;
      return [px, level(pz) + 0.022, pz];
    };
    foam.quad(end(-size, 0), end(-size * 0.32, width), end(size, 0), end(size * 0.21, -width * 0.44), color);
  }
  for (let i = 0; i < 178; i++) {
    const z = mix(-16.1, 21, random()), x = mix(-28, 20, random());
    if (lakeDistance(x, z) > 0.84 || terrain.sample(x, z) > LAKE_LEVEL - 0.06) continue;
    crest(x, z, 0.17 + random() * 1.24, 0.025 + random() * 0.11, teal.clone().lerp(white, 0.32 + random() * 0.36), 0.12);
  }
  for (const z of [29.3, 51.65, 65.4]) {
    for (let i = 0; i < 34; i++) {
      const pz = z + (random() - 0.5) * 2.8;
      const x = riverCenter(pz) + (random() - 0.5) * riverWidth(pz) * 1.53;
      if (terrain.sample(x, pz) >= level(pz)) continue;
      crest(x, pz, 0.27 + random() * 0.78, 0.045 + random() * 0.23, white.clone().lerp(shallow, random() * 0.32), -0.12);
    }
  }
  for (const { x, width, bottom } of streams) {
    if (bottom) continue;
    for (let i = 0; i < 19; i++) {
      crest(x + (random() - 0.5) * (width + 1), -16.3 + random() * 3.4,
        0.22 + random() * 0.85, 0.1 + random() * 0.22, white, 0.05);
    }
  }
  foam.finish();

  const mistAlpha = new Uint8Array(32 * 32 * 4).fill(255);
  for (let i = 0; i < mistAlpha.length; i += 4) {
    mistAlpha[i + 1] = 255 * (1 - clamp(Math.hypot(i / 4 % 32 - 15.5, Math.floor(i / 128) - 15.5) / 15.5)) ** 1.7;
  }
  const softness = new THREE.DataTexture(mistAlpha, 32, 32);
  softness.magFilter = THREE.LinearFilter;
  softness.needsUpdate = true;
  const spray = new THREE.BufferGeometry();
  const spraySites = streams.filter(({ bottom }) => !bottom);
  const droplets = Array.from({ length: touch ? 42 : 76 }, (_, i) => ({
    origin: spraySites[i % spraySites.length].x + (random() - 0.5) * 4.1,
    phase: random(), speed: 0.43 + random() * 0.38, dx: (random() - 0.5) * 4.5,
    height: 0.8 + random() * 1.65, z: -17.7 + random() * 2.6,
  }));
  const points = new THREE.Float32BufferAttribute(new Float32Array(droplets.length * 3), 3);
  points.setUsage(THREE.DynamicDrawUsage);
  spray.setAttribute('position', points);
  const mist = new THREE.Points(spray, new THREE.PointsMaterial({
    color: 0xe4f7ff, size: 5.1, alphaMap: softness, opacity: 0.28, transparent: true, depthWrite: false,
  }));
  mist.frustumCulled = false;
  mist.name = 'Waterfall spray';
  scene.add(mist);

  function animate(time) {
    texture.offset.y = -(time * 0.85 % 1);
    for (let i = 0; i < droplets.length; i++) {
      const { origin, phase, speed, dx, height, z } = droplets[i];
      const t = (phase + time * speed) % 1;
      points.setXYZ(i, origin + dx * t, LAKE_LEVEL + Math.sin(t * Math.PI) * height, z + t * 3.3);
    }
    points.needsUpdate = true;
  }
  animate(0);
  return animate;
}
