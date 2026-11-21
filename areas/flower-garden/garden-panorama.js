import { seededRandom } from '../../core/random.js';

export function addPanorama(THREE, { scene, mesh, box, facet, matte, instances }) {
  const random = seededRandom(9037);
  const peaks = [
    [-66, -37, 18, 17, 20], [-51, -62, 22, 24, 19], [-25, -67, 22, 14, 18],
    [5, -78, 23, 23, 15], [30, -69, 22, 17, 18], [52, -55, 17, 23, 19],
    [70, -33, 18, 17, 16], [67, 1, 14, 13, 18], [73, 24, 22, 20, 15],
    [50, 55, 20, 15, 22], [24, 65, 15, 17, 16], [2, 64, 17, 13, 17],
    [-23, 65, 18, 17, 14], [-47, 55, 16, 12, 15], [-65, 34, 20, 19, 22],
    [-71, 3, 21, 13, 18], [-25, -46, 12, 7.5, 10], [26, -43, 12, 9, 10],
    [46, 32, 12, 7, 11], [4, 43, 14, 9, 10], [-46, 1, 12, 8, 10],
  ];
  const colors = [0x7b9a6b, 0x8ca270, 0x8b8d7a, 0x73846b].map(hex => new THREE.Color(hex));
  instances(facet, matte(0xffffff), peaks.map(([x, z, w, h, d]) => [
    x, -.73, z, w, h, d, random() * Math.PI,
  ]), peaks.map((_, i) => colors[i % colors.length]));

  const lakeSites = [
    { x: -41.8, z: 31.7, rx: 14, rz: 12, angle: .38 },
    { x: 41.2, z: -11.8, rx: 11.3, rz: 18.3, angle: -.41 },
    { x: -26.9, z: -39.3, rx: 10.1, rz: 10.7, angle: .31 },
  ];

  function coast(lake, angle, radius) {
    const edge = 1 + .1 * Math.sin(angle * 3 + lake.angle) + .07 * Math.sin(angle * 6);
    const x = Math.cos(angle) * lake.rx * edge * radius;
    const z = Math.sin(angle) * lake.rz * edge * radius;
    return [lake.x + x * Math.cos(lake.angle) - z * Math.sin(lake.angle),
      lake.z + x * Math.sin(lake.angle) + z * Math.cos(lake.angle)];
  }

  const shore = matte(0xa59e6a);
  const water = matte(0x72b1ab);
  const highlights = matte(0x9dd0bf);
  const ripple = new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2);
  const reflections = [];
  function lakeSurface(lake, radius, y, material) {
    const vertices = [lake.x, y, lake.z];
    const indices = [];
    for (let i = 0; i < 48; i++) {
      const [x, z] = coast(lake, i * Math.PI / 24, radius);
      vertices.push(x, y, z);
      indices.push(0, (i + 1) % 48 + 1, i + 1);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return mesh(geometry, material, 0, 0, 0, 1, 1, 1);
  }

  for (const lake of lakeSites) {
    lakeSurface(lake, 1.07, -.45, shore);
    lakeSurface(lake, 1, -.41, water).name = 'Panorama lake';
    for (let i = 0; i < 23; i++) {
      const [x, z] = coast(lake, random() * Math.PI * 2, random() * .79);
      reflections.push([x, -.389, z, .5 + random() * 1.65, 1, .052 + random() * .045, .18 + lake.angle]);
    }
  }
  instances(ripple, highlights, reflections);

  const trunks = [];
  const broadleaf = [];
  const conifers = [];
  const leaves = [0x6e975d, 0x567e51, 0x699758, 0x82a565, 0x577c50].map(hex => new THREE.Color(hex));
  const cone = new THREE.ConeGeometry(1, 1, 6);
  const groves = [
    [-30, 2, 7, 17, 36], [30, 19, 8, 14, 33], [-7, 38, 18, 9, 39], [-47, 13, 11, 14, 28],
    [48, 15, 9, 15, 30], [12, -36, 12, 10, 33], [-48, -31, 12, 12, 29],
  ];
  for (const [cx, cz, rx, rz, count] of groves) {
    for (let i = 0; i < count; i++) {
      const angle = random() * Math.PI * 2;
      const spread = Math.sqrt(random());
      const x = cx + Math.cos(angle) * rx * spread;
      const z = cz + Math.sin(angle) * rz * spread;
      if ((Math.abs(x) < 24 && Math.abs(z) < 30) ||
          lakeSites.some(lake => Math.hypot((x - lake.x) / (lake.rx + 2), (z - lake.z) / (lake.rz + 2)) < 1.12)) continue;
      const scale = .75 + random() * 1.28;
      trunks.push([x, .65 * scale - .49, z, .225 * scale, 1.42 * scale, .23 * scale]);
      if (random() < .53) {
        conifers.push([x, 1.83 * scale - .49, z, .86 * scale, 2.38 * scale, .85 * scale, angle]);
        conifers.push([x, 2.58 * scale - .49, z, .62 * scale, 2.23 * scale, .64 * scale, angle + .33]);
      } else {
        broadleaf.push([x, 2.13 * scale - .49, z, 1.08 * scale, 1.35 * scale, 1.04 * scale, angle]);
        broadleaf.push([x + .64 * scale, 1.88 * scale - .49, z + .13, .72 * scale, .88 * scale, .74 * scale, angle + .63]);
      }
    }
  }
  instances(box, matte(0x836a48), trunks);
  instances(facet, matte(0xffffff), broadleaf, broadleaf.map((_, i) => leaves[i % leaves.length]));
  instances(cone, matte(0xffffff), conifers, conifers.map((_, i) => leaves[(i + 1) % leaves.length]));

  const cloud = new THREE.MeshBasicMaterial({ color: 0xf3f8f7 });
  for (const [x, y, z, yaw] of [[-26, 17, -42, .26], [9, 23, -63, .5], [43, 18, -50, .17],
    [-56, 16, 24, .33], [30, 25, 58, .25], [62, 16, 13, .55]]) {
    mesh(facet, cloud, x, y, z, 5.8, 1.55, 2.15, scene).rotation.y = yaw;
    mesh(facet, cloud, x + 2.65, y + .6, z + .28, 3.65, 1.85, 1.73, scene).rotation.y = yaw;
  }
}
