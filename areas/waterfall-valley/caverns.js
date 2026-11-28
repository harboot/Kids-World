import { seededRandom } from '../../core/random.js';
import { CLIFF_Z, faces, mix, smooth } from './landform.js';
import { chambers, lakeBasin, mineLake, shaft } from './mine-layout.js';

export function addCaverns(THREE, scene, layout, lamps, kit) {
  const { floor, ceiling, opening } = layout;
  const material = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const floorMesh = faces(THREE, scene, 'Faceted cavern floors', material);
  const walls = faces(THREE, scene, 'Irregular cavern walls', material);
  const roof = faces(THREE, scene, 'Cavern ceilings', material);
  const dark = new THREE.Color(0x333e47);
  const cool = new THREE.Color(0x347888);
  const warm = new THREE.Color(0xdc995c);
  const daylight = new THREE.Color(0x94a5a6);
  const random = seededRandom(301);

  function tint([x, y, z], strength, variation) {
    let light = 0;
    for (const lamp of lamps) {
      if (Math.abs(x - lamp.x) > 9 || Math.abs(z - lamp.z) > 9) continue;
      const d = Math.hypot(x - lamp.x, (y - lamp.y) * 1.23, z - lamp.z);
      light = Math.max(light, 1 - smooth(0.7, 9, d));
    }
    const reflected = (1 - smooth(0.65, 1.4, lakeBasin(x, z))) * (1 - smooth(1, 9, Math.abs(y - mineLake.y)));
    return dark.clone().lerp(cool, reflected * 0.58).lerp(warm, light * 0.69)
      .lerp(daylight, (1 - smooth(CLIFF_Z, -36, z)) * 0.72)
      .multiplyScalar(strength * variation);
  }

  function atHeight(p, grid) {
    return [p[0], grid.sample(p[0], p[2]), p[2]];
  }

  // Clip each grid triangle against the interpolated wall contour. Floors,
  // ceilings, walls and radius collision then share the same outline.
  for (const triangle of opening.triangles()) {
    const polygon = [];
    for (let i = 0; i < 3; i++) {
      const a = triangle[i], b = triangle[(i + 1) % 3];
      if (a[1] >= 0) polygon.push({ p: a, edge: a[1] === 0 });
      if (a[1] * b[1] < 0) {
        const t = a[1] / (a[1] - b[1]);
        polygon.push({ p: [mix(a[0], b[0], t), 0, mix(a[2], b[2], t)], edge: true });
      }
    }
    if (polygon.length < 3) continue;
    const low = polygon.map(({ p }) => atHeight(p, floor));
    const high = polygon.map(({ p }) => atHeight(p, ceiling));
    const variation = 0.83 + random() * 0.33;
    for (let i = 1; i < polygon.length - 1; i++) {
      const ground = [low[0], low[i], low[i + 1]];
      const overhead = [high[0], high[i + 1], high[i]];
      floorMesh.triangle(...ground, ground.map(p => tint(p, 1.12, variation)));
      roof.triangle(...overhead, overhead.map(p => tint(p, 0.66, variation)));
    }
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      if (!polygon[i].edge || !polygon[j].edge) continue;
      const a = low[i], b = low[j], c = high[j], d = high[i];
      if (a[2] === CLIFF_Z && b[2] === CLIFF_Z) continue;
      const middleA = [a[0], mix(a[1], d[1], 0.37), a[2]];
      const middleB = [b[0], mix(b[1], c[1], 0.54), b[2]];
      const lower = [a, b, middleB, middleA];
      const upper = [middleA, middleB, c, d];
      walls.triangle(lower[1], lower[0], lower[3], [lower[1], lower[0], lower[3]].map(p => tint(p, 0.9, variation)));
      walls.triangle(lower[1], lower[3], lower[2], [lower[1], lower[3], lower[2]].map(p => tint(p, 0.9, variation)));
      walls.triangle(upper[1], upper[0], upper[3], [upper[1], upper[0], upper[3]].map(p => tint(p, 0.78, variation)));
      walls.triangle(upper[1], upper[3], upper[2], [upper[1], upper[3], upper[2]].map(p => tint(p, 0.78, variation)));
    }
  }
  for (const mesh of [floorMesh, walls, roof]) mesh.finish();

  const formations = faces(THREE, scene, 'Stalactites and flowstone', material);
  const outcrops = [];
  for (const chamber of chambers) {
    for (let i = 0; i < 39; i++) {
      const angle = random() * Math.PI * 2;
      const radius = 0.25 + random() * 0.68;
      const x = chamber.x + Math.cos(angle) * chamber.rx * radius;
      const z = chamber.z + Math.sin(angle) * chamber.rz * radius;
      if (opening.sample(x, z) < 0.9 || Math.hypot(x - shaft.x, z - shaft.z) < 4.5) continue;
      const top = ceiling.sample(x, z), bottom = floor.sample(x, z);
      const walkingSurface = Math.max(bottom, kit.deckHeight(x, z) ?? -Infinity);
      const height = Math.min(0.65 + random() * 3.6, top - walkingSurface - 4.15);
      if (height > 0.25) spike(x, top + 0.035, z, -height, 0.45 + random() * 0.75);
      if (radius < 0.73 || kit.nearRail(x, z, 3.2) || lakeBasin(x, z) < 1.22) continue;
      const width = 0.35 + random() * 0.58;
      const size = 0.5 + random() * 1.65;
      spike(x, bottom - 0.12, z, size, width);
      outcrops.push({ x, z, radius: width * 0.87 });
    }
  }
  function spike(x, y, z, size, width) {
    const tip = [x + (random() - 0.5) * width, y + size, z + (random() - 0.5) * width];
    const ring = Array.from({ length: 5 }, (_, i) => {
      const angle = i * Math.PI * 2 / 5;
      const r = width * (0.76 + random() * 0.27);
      return [x + Math.cos(angle) * r, y, z + Math.sin(angle) * r];
    });
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      const tri = size > 0 ? [b, a, tip] : [a, b, tip];
      formations.triangle(...tri, tri.map(p => tint(p, 0.8, 0.87 + random() * 0.36)));
    }
  }
  formations.finish();

  const water = faces(THREE, scene, 'Still water in Echo Lake', material);
  const pool = new THREE.Color(0x25636d);
  const glint = new THREE.Color(0x46888c);
  for (const tri of floor.triangles()) {
    const [a, b, c] = tri;
    if (tri.some(p => lakeBasin(p[0], p[2]) > 1.19 || opening.sample(p[0], p[2]) <= 0)) continue;
    if (Math.min(a[1], b[1], c[1]) >= mineLake.y) continue;
    water.triangle(...tri.map(([x, , z]) => [x, mineLake.y, z]), pool.clone().lerp(glint, random() * 0.46));
  }
  water.finish();
  return outcrops;
}
