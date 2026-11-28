import { seededRandom } from '../../core/random.js';
import {
  CLIFF_Z, LOWER_X, LAKE_LEVEL, cliffRelief, faces, hikingTrail, westTrail, lakeDistance,
  mix, nearest, riverCenter, riverWidth, smooth,
} from './landform.js';

export function addLandforms(THREE, scene, terrain, bedrock, mine) {
  const random = seededRandom(166);
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const valley = faces(THREE, scene, 'Alpine slopes and river banks', material);
  const crest = faces(THREE, scene, 'Snow peaks and granite ridges', material);
  const cliff = faces(THREE, scene, 'Waterfall escarpment', material);
  const greens = [0x739d30, 0x82a633, 0x6d9638, 0x5b8a42, 0x8bae3b].map(hex => new THREE.Color(hex));
  const granite = [0x5e6575, 0x777481, 0x555c6d, 0x686675, 0x88818a].map(hex => new THREE.Color(hex));
  const snow = [0xf3faff, 0xd4e5f5, 0xe7f2ff].map(hex => new THREE.Color(hex));
  const sand = new THREE.Color(0xb2a47b);
  const soil = new THREE.Color(0xa79964);
  const select = colors => colors[Math.floor(random() * colors.length)];

  function grade(a, b, c) {
    return Math.max(Math.abs(a[1] - b[1]), Math.abs(b[1] - c[1]), Math.abs(a[1] - c[1]));
  }
  for (const [a, b, c] of terrain.triangles()) {
    const x = (a[0] + b[0] + c[0]) / 3, z = (a[2] + b[2] + c[2]) / 3;
    const y = (a[1] + b[1] + c[1]) / 3;
    const slope = grade(a, b, c);
    let color = select(greens);
    if (slope > 2.6 || (slope > 1.85 && random() > 0.45)) color = select(granite);
    if (y < LAKE_LEVEL + 0.95 && (lakeDistance(x, z) < 1.16 || (z > 15 && Math.abs(x - riverCenter(z)) < riverWidth(z) * 1.35))) {
      color = sand.clone().multiplyScalar(0.82 + random() * 0.3);
    }
    if (Math.min(nearest(hikingTrail, x, z).offset, nearest(westTrail, x, z).offset) < 1.42) {
      color = soil.clone().multiplyScalar(0.87 + random() * 0.23);
    }
    valley.triangle(a, b, c, color);
  }
  for (const [a, b, c] of bedrock.triangles()) {
    const x = (a[0] + b[0] + c[0]) / 3, z = (a[2] + b[2] + c[2]) / 3;
    const y = (a[1] + b[1] + c[1]) / 3, slope = grade(a, b, c);
    let color = select(granite);
    if (y > 45 + 4.1 * Math.sin(x * 0.36 + z * 0.29) + slope * 0.6) color = select(snow);
    else if (y < 33 && slope < 3) color = select(greens);
    crest.triangle(a, b, c, color);
  }

  function wallSection(left, right, low, high, relief, color) {
    const a = [left, low(left), CLIFF_Z], b = [right, low(right), CLIFF_Z];
    const c = [right, high(right), CLIFF_Z], d = [left, high(left), CLIFF_Z];
    const ridge = (base, top, fraction) => {
      const x = base[0];
      const bulge = relief * cliffRelief(x);
      return [x + bulge * Math.sin(x * 0.32 + fraction * 3) * 0.29,
        mix(base[1], top[1], fraction + Math.sin(x * 0.52) * 0.11), CLIFF_Z + bulge];
    };
    const al = ridge(a, d, 0.32), bl = ridge(b, c, 0.32);
    const au = ridge(a, d, 0.71), bu = ridge(b, c, 0.71);
    cliff.quad(a, b, bl, al, color.clone().multiplyScalar(0.86));
    cliff.quad(al, bl, bu, au, color);
    cliff.quad(au, bu, c, d, color.clone().multiplyScalar(1.08));
  }
  const edge = mine.opening.points.at(-1);
  for (let i = 1; i < edge.length; i++) {
    const [x, a] = edge[i - 1], [xx, b] = edge[i];
    const cuts = [x];
    if (a * b < 0) cuts.push(mix(x, xx, a / (a - b)));
    cuts.push(xx);
    for (let j = 1; j < cuts.length; j++) {
      const left = cuts[j - 1], right = cuts[j];
      const ground = px => terrain.sample(px, CLIFF_Z) - 0.006;
      const top = px => bedrock.sample(px, CLIFF_Z);
      const color = select(granite);
      if (mine.opening.sample((left + right) / 2, CLIFF_Z) > 0) {
        wallSection(left, right, ground, px => mine.floor.sample(px, CLIFF_Z), 0, color);
        wallSection(left, right, px => mine.ceiling.sample(px, CLIFF_Z), top, 0, color);
      } else {
        wallSection(left, right, ground, top, 1.34, color);
      }
    }
  }
  for (const mesh of [valley, crest, cliff]) mesh.finish();
}

export function addForest(THREE, scene, terrain, bedrock, bridges) {
  const random = seededRandom(989);
  const dummy = new THREE.Object3D();
  const tree = [], trunks = [], rocks = [], bushes = [], clouds = [], grass = [];
  const obstacles = [];
  const makeColor = hex => new THREE.Color(hex);

  function place(batch, x, y, z, sx, sy, sz, color, yaw = random() * 6.283, lean = 0) {
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, sy, sz);
    dummy.rotation.set(lean, yaw, -lean * 0.65);
    dummy.updateMatrix();
    batch.push({ matrix: dummy.matrix.clone(), color: makeColor(color).multiplyScalar(0.84 + random() * 0.28) });
  }
  function plant(x, y, z, size, collision) {
    const radius = size * (0.17 + random() * 0.033);
    place(trunks, x, y + size * 0.39, z, radius * 0.27, size * 0.78, radius * 0.27, 0x66503a);
    const colors = [0x224d2c, 0x386831, 0x518134, 0x679039];
    for (let i = 0; i < colors.length; i++) {
      const width = radius * (1.17 - i * 0.19);
      place(tree, x + i * 0.036, y + size * (0.36 + i * 0.163), z, width,
        size * (0.48 - i * 0.041), width * 0.92, colors[i], i * 0.53, 0.028);
    }
    if (collision) obstacles.push({ x, z, radius: radius * 0.24 });
  }
  const sightline = (x, z) => z > 9 && z < 41 && Math.abs(x + 21 - (39 - z) * 0.34) < 5.5;
  const clearing = (x, z) => sightline(x, z) || Math.hypot(x + 18, z - 44) < 9
    || Math.hypot(x - 29, z - 34) < 7 || Math.hypot(x + 30, z - 16) < 5;
  for (let i = 0; i < 1530; i++) {
    const x = (random() - 0.5) * 137, z = mix(-21, 82, random());
    const y = terrain.sample(x, z);
    if (bridges.some(bridge => bridge.surface(x, z, -0.65) !== undefined)) continue;
    const trail = Math.min(nearest(hikingTrail, x, z).offset, nearest(westTrail, x, z).offset);
    const riparian = z > 17 && Math.abs(x - riverCenter(z)) < riverWidth(z) * 1.2;
    const shoreline = lakeDistance(x, z);
    const size = 2.3 + random() ** 1.6 * 6.7;
    if (y > 0.95 && shoreline > 1.03 && !riparian && trail > 3.05 && !clearing(x, z)
      && (random() > 0.35 || Math.abs(x) > 37)) {
      plant(x, y - 0.14, z, size, true);
    } else if (trail > 1.8 && !clearing(x, z) && (shoreline > 0.79 && shoreline < 1.25 || random() < 0.29)) {
      const rock = 0.34 + random() ** 2 * 1.7;
      if (Math.abs(x - LOWER_X) < 5.6 && z < -14) continue;
      place(rocks, x, y + rock * 0.28, z, rock, rock * (0.5 + random() * 0.5), rock * 0.8, 0x727381, undefined, 0.19);
      if (rock > 0.64 && y > 0.1) obstacles.push({ x, z, radius: rock * 0.69 });
    }
    if (trail > 1.5 && y > 1 && !riparian && random() < 0.32) {
      const size = 0.19 + random() * 0.4;
      place(bushes, x, y + size * 0.42, z, size * 1.4, size, size, random() > 0.34 ? 0x648537 : 0x88a845);
    }
    if (trail > 1.45 && y > 0.85 && !riparian && random() < 0.58) {
      const size = 0.14 + random() * 0.34;
      place(grass, x, y + size * 0.23, z, size * 0.43, size, size * 0.43, 0x85a746, undefined, 0.14);
    }
  }
  for (let i = 0; i < 435; i++) {
    const x = mix(-70, 70, random()), z = mix(-75, -22.7, random());
    const y = bedrock.sample(x, z);
    if (y > 38 || Math.abs(bedrock.sample(x + 0.8, z) - y) > 0.75) continue;
    if (z > -32 && x > -27 && x < 25) continue;
    plant(x, y - 0.17, z, 1.8 + random() ** 2 * 4.5, false);
  }
  for (const [x, y, z, size] of [[-61, 58, -58, 9], [-34, 67, -81, 11], [2, 60, -85, 8],
    [47, 70, -65, 9], [68, 55, -43, 7], [-66, 53, -26, 8]]) {
    for (let i = 0; i < 7; i++) {
      place(clouds, x + (i - 3) * size * 0.72, y + random() * 3.5, z + random() * 4,
        size * (0.56 + random() * 0.5), size * (0.22 + random() * 0.2), size * 0.53, 0xf1f7ff);
    }
  }

  function finish(name, batch, geometry, material) {
    const mesh = new THREE.InstancedMesh(geometry, material, batch.length);
    mesh.name = name;
    batch.forEach(({ matrix, color }, i) => {
      mesh.setMatrixAt(i, matrix);
      mesh.setColorAt(i, color);
    });
    scene.add(mesh);
  }
  const facets = new THREE.MeshLambertMaterial({ flatShading: true });
  const stones = new THREE.DodecahedronGeometry(1);
  finish('Pine trunks', trunks, new THREE.CylinderGeometry(0.67, 1.15, 1, 5), facets);
  finish('Pine crowns', tree, new THREE.CylinderGeometry(0.04, 1, 1, 7), facets);
  finish('Granite boulders', rocks, stones, facets);
  finish('Alpine undergrowth', bushes, stones, facets);
  finish('Bunchgrasses', grass, new THREE.ConeGeometry(1, 1, 4), facets);
  finish('Faceted clouds', clouds, new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ toneMapped: false }));
  return obstacles;
}
