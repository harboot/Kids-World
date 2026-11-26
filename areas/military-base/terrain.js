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

function desertHeight(x, z) {
  const extent = outside(x, z);
  if (extent < .65 || (Math.abs(x) < 9 && z > fence.south)) return 0;
  const edge = Math.min(1, (extent - .65) / 8);
  let height = .18 + .48 * Math.sin(x * .105 + z * .061) ** 2;
  // Gentle wind-shaped ridges outside the playable compound only.
  height += .75 * (.5 + .5 * Math.sin(x * .14 + z * .038 + Math.sin(z * .075))) ** 2;
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
  const slope = new THREE.Color(0x9b7147);
  const crest = new THREE.Color(0xdfbd88);
  const colors = [];
  for (let i = 0; i < points.count; i += 3) {
    let elevation = 0;
    let x = 0;
    let z = 0;
    for (let j = i; j < i + 3; j++) {
      const px = points.getX(j);
      const pz = points.getZ(j);
      const y = desertHeight(px, pz);
      points.setY(j, y);
      elevation += y / 3;
      x += px / 3;
      z += pz / 3;
    }
    const sand = outside(x, z) > -1.6 && !(Math.abs(x) < 8 && z > fence.south + 1 && z < fence.approach);
    if (sand) {
      const dune = .5 + .5 * Math.sin(x * .115 + z * .048);
      tint.setHex(0xc5a171).lerp(crest, dune * .4)
        .lerp(slope, Math.min(1, elevation / 27) * (.25 + random() * .45));
      tint.multiplyScalar(.91 + random() * .09);
    } else tint.setHex(0xd0bea1).multiplyScalar(.96 + random() * .06);
    for (let j = 0; j < 3; j++) colors.push(tint.r, tint.g, tint.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const landscape = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  landscape.name = 'Moonlit desert dunes and sandstone hills';
  landscape.receiveShadow = true;
  scene.add(landscape);

  const scrub = group('Desert rocks and dry scrub');
  for (const [cx, cz, rx, rz, count] of [
    [-82, -4, 9, 53, 15], [83, 8, 12, 52, 18], [-49, -77, 25, 10, 16], [32, -75, 33, 9, 16],
    [-45, 76, 20, 10, 9], [43, 80, 24, 13, 11], [-110, -48, 12, 28, 9], [112, -64, 15, 21, 8],
  ]) {
    for (let i = 0; i < count; i++) {
      const x = cx + (random() * 2 - 1) * rx;
      const z = cz + (random() * 2 - 1) * rz;
      if (outside(x, z) < 2 || (Math.abs(x) < 10 && z > fence.south)) continue;
      const y = desertHeight(x, z);
      const turn = random() * Math.PI;
      const node = group('Desert cluster', x, y, z, turn, scrub);
      if (i % 4 !== 0) {
        const size = .6 + random() * 2.5;
        part(node, 'rock', i % 2 ? 0xad895e : 0x9b795a, 0, size * .16, 0, size, size * .52, size * .77);
        part(node, 'rock', 0xc0a075, size * .43, size * .11, -.27, size * .57, size * .36, size * .49, [0, .6, 0]);
      } else {
        // Sparse low, dry grasses: no evergreen trees or snow.
        for (let j = 0; j < 4; j++) {
          const a = j * Math.PI / 2;
          const height = .32 + random() * .4;
          part(node, 'cone', j % 2 ? 0x8e8653 : 0xa69662,
            Math.cos(a) * .15, height * .39, Math.sin(a) * .15,
            .085, height, .085, [Math.sin(a) * .35, 0, -Math.cos(a) * .35]);
        }
      }
    }
  }
}
