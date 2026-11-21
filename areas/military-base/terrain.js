import { seededRandom } from '../../core/random.js';
import { fence } from './layout.js';

const hills = [
  [-90, -40, 24, 36, 12], [-94, 19, 26, 42, 8], [-92, 63, 26, 30, 10],
  [-70, -83, 25, 27, 15], [-35, -87, 29, 27, 10], [2, -90, 28, 27, 12], [44, -87, 37, 25, 15],
  [93, -51, 29, 40, 13], [96, 11, 28, 33, 9], [91, 51, 25, 31, 11],
  [-52, 88, 35, 27, 8], [49, 87, 37, 26, 8], [-131, -99, 55, 49, 26], [121, -109, 52, 45, 24],
];

function outside(x, z) {
  return Math.max(fence.west - x, x - fence.east, fence.north - z, z - fence.south);
}

function snowbank(x, z) {
  const extent = outside(x, z);
  if (extent < .65 || (Math.abs(x) < 9 && z > fence.south)) return 0;
  const edge = Math.min(1, (extent - .65) / 8);
  let height = .18 + .48 * Math.sin(x * .105 + z * .061) ** 2;
  for (const [cx, cz, rx, rz, peak] of hills) {
    const distance = ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2;
    height += peak * Math.max(0, 1 - distance) ** 2;
  }
  return edge * height;
}

export function buildTerrain(kit) {
  const { THREE, scene, group, part } = kit;
  const random = seededRandom(17045);
  const plain = new THREE.PlaneGeometry(355, 310, 86, 76).rotateX(-Math.PI / 2);
  const geometry = plain.toNonIndexed();
  plain.dispose();
  const points = geometry.attributes.position;
  const tint = new THREE.Color();
  const slope = new THREE.Color(0xb8cbe0);
  const colors = [];
  for (let i = 0; i < points.count; i += 3) {
    let elevation = 0;
    let x = 0;
    let z = 0;
    for (let j = i; j < i + 3; j++) {
      const px = points.getX(j);
      const pz = points.getZ(j);
      const y = snowbank(px, pz);
      points.setY(j, y);
      elevation += y / 3;
      x += px / 3;
      z += pz / 3;
    }
    const snow = outside(x, z) > -1.6 && !(Math.abs(x) < 8 && z > fence.south + 1 && z < fence.approach);
    if (snow) {
      tint.setHex(0xe0eaf5).lerp(slope, Math.min(1, elevation / 27) * random() * .72);
      tint.multiplyScalar(.88 + random() * .12);
    } else tint.setHex(0xd0bea1).multiplyScalar(.96 + random() * .06);
    for (let j = 0; j < 3; j++) colors.push(tint.r, tint.g, tint.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const landscape = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  landscape.name = 'Snow-covered hills and spruce belt';
  landscape.receiveShadow = true;
  scene.add(landscape);

  const grove = group('Frosted perimeter spruce');
  for (const [cx, cz, rx, rz, count] of [
    [-82, -4, 9, 53, 21], [83, 8, 12, 52, 25], [-49, -77, 25, 10, 24], [32, -75, 33, 9, 24],
    [-45, 76, 20, 10, 13], [43, 80, 24, 13, 17], [-110, -48, 12, 28, 12], [112, -64, 15, 21, 10],
  ]) {
    for (let i = 0; i < count; i++) {
      const x = cx + (random() * 2 - 1) * rx;
      const z = cz + (random() * 2 - 1) * rz;
      const y = snowbank(x, z);
      const turn = random() * Math.PI;
      if (i % 4 === 0) {
        const size = .79 + random() * 1.76;
        part(grove, 'rock', 0x839bb4, x, y + size * .17, z, size, size * .61, size * .78, [0, turn, 0]);
        part(grove, 'rock', 0xd8e7f4, x + .08, y + size * .49, z - .05, size * .86, size * .33, size * .66, [0, turn, 0]);
      } else {
        const size = 2.65 + random() * 5.1;
        part(grove, 'post', 0x7b7b7c, x, y + size * .20, z, .20, size * .63, .20);
        for (const [level, radius] of [[.43, .30], [.64, .24], [.84, .16]]) {
          part(grove, 'cone', 0x809aa8, x, y + size * level, z, size * radius, size * .46, size * radius, [0, turn, 0]);
          part(grove, 'cone', 0xdce8f8, x, y + size * (level + .071), z, size * radius * .93,
            size * .41, size * radius * .93, [0, turn, 0]);
        }
      }
    }
  }
}
