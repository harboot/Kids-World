export const PALACE_WIDTH = 28;
export const PALACE_DEPTH = 28;
export const CHANNEL = { east: -8, west: -12, halfDepth: 2 };

const halfWidth = PALACE_WIDTH / 2;
const halfDepth = PALACE_DEPTH / 2;
const stair = { halfWidth: 4.1, foot: -4.7, top: -8.7, rise: 1.6, steps: 9 };

export function palaceGround(x, z) {
  if (Math.abs(x) > stair.halfWidth) return 0;
  return stair.rise * Math.max(0, Math.min(1, (stair.foot - z) / (stair.foot - stair.top)));
}

export function createPalaceBuilder(THREE, scene, obstacles) {
  const architecture = new THREE.Group();
  const shapes = {
    box: new THREE.BoxGeometry(1, 1, 1),
    gem: new THREE.OctahedronGeometry(1),
    drum: new THREE.CylinderGeometry(1, 1, 1, 8),
    peak: new THREE.ConeGeometry(1, 1, 5),
    ball: new THREE.IcosahedronGeometry(1),
  };
  const ice = (color, emissive = 0x000000) => new THREE.MeshLambertMaterial({ color, emissive, flatShading: true });
  const materials = {
    frost: ice(0xd8f7ff),
    snow: ice(0xf1f7ff),
    pearl: ice(0xaccce9),
    blue: ice(0x467fab),
    deep: ice(0x254975),
    glass: ice(0x65c4e3, 0x14374d),
    lilac: ice(0xa6abe0),
    silver: ice(0xe8eeff, 0x183e54),
    light: new THREE.MeshBasicMaterial({ color: 0xabeaff }),
  };

  function group(name, x = 0, y = 0, z = 0, parent = scene) {
    const model = new THREE.Group();
    model.name = name;
    model.position.set(x, y, z);
    parent.add(model);
    return model;
  }

  function part(parent, shape, material, x, y, z, width, height, depth) {
    const mesh = new THREE.Mesh(shapes[shape], material);
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    parent.add(mesh);
    return mesh;
  }

  function beam(parent, material, [x1, y1, z1], [x2, y2, z2], width, depth = width) {
    const end = new THREE.Vector3(x2 - x1, y2 - y1, z2 - z1);
    const mesh = part(parent, 'box', material, (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2, width, end.length(), depth);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.normalize());
    return mesh;
  }

  function solid(x, z, width, depth, height) {
    obstacles.push({ left: x - width / 2, right: x + width / 2, front: z - depth / 2, back: z + depth / 2, height });
  }

  function batchArchitecture() {
    architecture.updateMatrixWorld(true);
    const builds = new Map();
    architecture.traverse(mesh => {
      if (!mesh.isMesh) return;
      const key = mesh.geometry.id + ':' + mesh.material.id;
      if (!builds.has(key)) builds.set(key, []);
      builds.get(key).push(mesh);
    });
    for (const meshes of builds.values()) {
      const { geometry, material } = meshes[0];
      const batch = new THREE.InstancedMesh(geometry, material, meshes.length);
      meshes.forEach((mesh, i) => batch.setMatrixAt(i, mesh.matrixWorld));
      batch.instanceMatrix.needsUpdate = true;
      scene.add(batch);
    }
    architecture.clear();
  }

  return { architecture, ice, materials, group, part, beam, solid, batchArchitecture };
}

export function buildPalace(THREE, scene, builder) {
  const { architecture, materials: { frost, snow, pearl, blue, deep, glass, lilac, silver, light }, group, part, beam, solid } = builder;
  const box = (material, ...values) => part(architecture, 'box', material, ...values);
  const gem = (material, ...values) => part(architecture, 'gem', material, ...values);

  scene.background = new THREE.Color(0xa5c5ed);
  scene.fog = new THREE.FogExp2(0xa8c8ed, 0.018);
  scene.add(new THREE.HemisphereLight(0xe4f7ff, 0x8299c1, 2.05));
  const daylight = new THREE.DirectionalLight(0xfff5fa, 1.34);
  daylight.position.set(-8, 12, 5);
  scene.add(daylight);

  // Floor tiles leave a real opening for the bridge and channel.
  const tiles = [pearl, frost, lilac, pearl, frost];
  for (let x = -13; x < 14; x += 2) {
    for (let z = -13; z < 14; z += 2) {
      if (x > CHANNEL.west && x < CHANNEL.east && Math.abs(z) < CHANNEL.halfDepth) continue;
      const tile = tiles[((x + 13) * 3 + (z + 13) * 7) % tiles.length];
      box(tile, x, -0.114, z, 1.971, 0.228, 1.971);
    }
  }
  const channelCenter = (CHANNEL.west + CHANNEL.east) / 2;
  const channelWidth = CHANNEL.east - CHANNEL.west;
  for (const x of [CHANNEL.west, CHANNEL.east]) {
    box(blue, x, -0.17, 0, 0.02, 0.34, CHANNEL.halfDepth * 2);
  }
  for (const z of [-CHANNEL.halfDepth, CHANNEL.halfDepth]) box(blue, channelCenter, -0.17, z, channelWidth, 0.34, 0.025);
  box(glass, channelCenter, -0.38, 0, channelWidth + 0.03, 0.10, CHANNEL.halfDepth * 2 + 0.03);
  for (const z of [-1.7, 1.7]) {
    for (let x = -11.75; x <= -8.25; x += 0.5) gem(frost, x, -0.29, z, 0.25, 0.12, 0.13);
  }

  box(blue, 0, 0.006, 4.65, 4.1, 0.012, 18.2);
  box(deep, 0, 0.012, 4.65, 3.65, 0.012, 18.2);
  for (const side of [-1, 1]) box(light, side * 1.93, 0.018, 4.65, 0.045, 0.012, 18.2);
  for (const z of [1.05, 5.45, 9.85]) {
    const inlay = group('Ice mosaic', 0, 0.028, z, architecture);
    inlay.rotation.x = -Math.PI / 2;
    snowflake(builder, inlay, light, 0, 0, 0, z === 5.45 ? 1.29 : 0.65);
    const border = part(inlay, 'box', blue, 0, 0, -0.014, 1.93, 1.93, 0.012);
    border.rotation.z = Math.PI / 4;
  }

  for (const side of [-1, 1]) {
    solid(side * halfWidth, 0, 0.38, PALACE_DEPTH, 12);
    box(deep, side * 13.91, 0.63, 0, 0.45, 1.26, 28);
    box(glass, side * 13.63, 1.29, 0, 0.18, 0.13, 28);
    box(blue, side * 13.94, 7.29, 0, 0.55, 1.55, 28);
    box(silver, side * 13.58, 6.5, 0, 0.18, 0.12, 28);
    for (const z of [-10.5, -3.5, 3.5, 10.5]) {
      const window = group('Pointed ice window', side * 13.88, 1.28, z, architecture);
      window.rotation.y = -side * Math.PI / 2;
      arch(builder, window, frost, 2.78, 4.12, 1.03, 0.22, 0.22);
      for (const off of [-1.91, 1.91]) part(window, 'box', glass, off, 2.76, 0, 1.59, 5.5, 0.35);
      part(window, 'box', blue, 0, 5.12, -0.02, 2.7, 0.58, 0.35);
      part(window, 'box', glass, 0, 3.03, 0.06, 0.06, 3.9, 0.09);
      beam(window, glass, [-1.28, 1.36, 0.07], [0, 2.16, 0.07], 0.065);
      beam(window, glass, [1.28, 1.36, 0.07], [0, 2.16, 0.07], 0.065);
      snowflake(builder, window, silver, 0, 3.65, 0.13, 0.47);
    }
    for (const z of [-14, -7, 0, 7, 14]) box(deep, side * 13.91, 3.9, z, 0.65, 7.8, 1.05);
    for (const z of [-9.45, -3.65, 2.8, 8.65]) {
      const x = side * 5.7;
      part(architecture, 'drum', blue, x, 0.14, z, 0.72, 0.28, 0.72);
      part(architecture, 'drum', glass, x, 3.65, z, 0.48, 7.2, 0.48);
      part(architecture, 'drum', pearl, x, 6.95, z, 0.65, 0.38, 0.65);
      part(architecture, 'drum', deep, x, 0.33, z, 0.63, 0.14, 0.63);
      gem(silver, x - side * 0.36, 4.35, z + 0.16, 0.17, 2.1, 0.2);
      gem(lilac, x + side * 0.41, 1.25, z + 0.17, 0.25, 0.96, 0.25);
      solid(x, z, 1.32, 1.32, 7.1);
    }
  }

  box(blue, 0, 3.9, 13.89, 28, 7.8, 0.45);
  box(blue, 2.79, 3.9, -13.89, 22.4, 7.8, 0.45);
  box(blue, -12.75, 3.9, -13.89, 2.5, 7.8, 0.45);
  box(blue, -9.95, 7.18, -13.89, 3.2, 1.3, 0.45);
  solid(0, halfDepth, 28, 0.42, 12);
  solid(0, -halfDepth, 28, 0.42, 12);
  for (const z of [-13.61, 13.61]) {
    box(deep, 0, 7.47, z, 27.4, 0.46, 0.4);
    box(light, 0, 7.41, z * 0.982, 26.68, 0.045, 0.03);
    for (const x of [-6.9, 0, 6.9]) gem(lilac, x, 6.7, z * 0.98, 0.38, 0.52, 0.13);
  }
  const balcony = group('Mountain balcony', -9.94, 0, -13.49, architecture);
  part(balcony, 'box', snow, 0, 0.013, 1.54, 3.48, 0.026, 2.82);
  arch(builder, balcony, frost, 3.35, 4.95, 1.35, 0.23, 0.4);
  part(balcony, 'box', deep, 0, 1.03, 0, 3.47, 0.14, 0.34);
  part(balcony, 'box', silver, 0, 1.15, 0, 3.56, 0.11, 0.4);
  for (const x of [-1.45, -0.75, 0, 0.75, 1.45]) part(balcony, 'box', blue, x, 0.52, 0, 0.14, 1.1, 0.2);
  solid(-9.94, -13.49, 3.47, 0.34, 2.05);

  for (const side of [-1, 1]) {
    const roof = box(side === -1 ? pearl : lilac, side * 7, 9.76, 0, 14.65, 0.28, 28);
    roof.rotation.z = -side * Math.atan2(4, 14);
    for (const z of [-13.53, -9.45, -3.65, 2.8, 8.65, 13.53]) {
      beam(architecture, silver, [side * 13.84, 7.73, z], [0, 11.73, z], 0.22, 0.26);
      beam(architecture, pearl, [side * 5.7, 7.06, z], [side * 3.1, 9.17, z], 0.29, 0.31);
      beam(architecture, frost, [side * 3.1, 9.17, z], [0, 10.18, z], 0.28, 0.35);
    }
  }
  box(frost, 0, 11.75, 0, 0.38, 0.35, 28);
  const gable = new THREE.BufferGeometry();
  gable.setAttribute('position', new THREE.Float32BufferAttribute([-14, 7.79, 0, 14, 7.79, 0, 0, 11.75, 0], 3));
  gable.computeVertexNormals();
  const gableMaterial = blue.clone();
  gableMaterial.side = THREE.DoubleSide;
  for (const z of [-13.87, 13.87]) {
    const panel = new THREE.Mesh(gable, gableMaterial);
    panel.position.z = z;
    architecture.add(panel);
  }

  const tread = (stair.foot - stair.top) / stair.steps;
  for (let i = 0; i < stair.steps; i++) {
    const y = stair.rise * (i + 1) / stair.steps;
    const z = stair.foot - (i + 0.5) * tread;
    box(i % 2 ? pearl : frost, 0, y / 2, z, stair.halfWidth * 2, y, tread + 0.004);
    box(glass, 0, y - 0.06, z + tread / 2, stair.halfWidth * 2, 0.072, 0.022);
  }
  box(blue, 0, stair.rise / 2, -11.23, stair.halfWidth * 2, stair.rise, 5.1);
  box(frost, 0, stair.rise - 0.03, -11.23, stair.halfWidth * 2, 0.06, 5.1);
  for (const side of [-1, 1]) {
    const x = side * stair.halfWidth;
    const rail = [stair.foot, stair.top, -13.61];
    for (const z of rail) {
      const y = palaceGround(x, z);
      part(architecture, 'drum', glass, x, y + 0.65, z, 0.25, 1.3, 0.25);
      gem(silver, x, y + 1.36, z, 0.25, 0.45, 0.25);
    }
    const line = (material, y, width) => {
      for (let i = 1; i < rail.length; i++) {
        const ends = [rail[i - 1], rail[i]].map(z => [x, palaceGround(x, z) + y, z]);
        beam(architecture, material, ...ends, width);
      }
    };
    line(frost, 1.02, 0.17);
    line(glass, 0.39, 0.26);
    solid(x, -9.13, 0.26, 8.92, 3.28);
  }
  addMountains(builder);
}

export function arch({ beam }, parent, material, width, shoulder, crown, thickness, depth) {
  const x = width / 2;
  const points = [[-x, 0, 0], [-x, shoulder, 0], [-x * 0.73, shoulder + crown * 0.42, 0],
    [0, shoulder + crown, 0], [x * 0.73, shoulder + crown * 0.42, 0], [x, shoulder, 0], [x, 0, 0]];
  for (let i = 1; i < points.length; i++) beam(parent, material, points[i - 1], points[i], thickness, depth);
}

export function snowflake({ beam }, parent, material, x, y, z, size) {
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3;
    const position = (radius, offset = 0) =>
      [x + Math.cos(angle + offset) * size * radius, y + Math.sin(angle + offset) * size * radius, z];
    const branch = position(0.62);
    beam(parent, material, [x, y, z], position(1), size * 0.056);
    for (const side of [-1, 1]) beam(parent, material, branch, position(0.93, side * 0.22), size * 0.05);
  }
}

function addMountains({ architecture, ice, materials: { snow, frost }, part }) {
  const ridge = [ice(0x587ca9), ice(0x779cc5), ice(0x95aadb)];
  for (let i = 0; i < 31; i++) {
    const angle = i * Math.PI * 2 / 31;
    const distance = 30 + i % 3 * 7;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const height = 9 + (i * 7 % 15);
    const width = 6 + i % 5;
    part(architecture, 'peak', ridge[i % 3], x, height / 2 - 6, z, width, height, width).rotation.y = i;
    part(architecture, 'peak', snow, x, height * 0.78 - 5.96, z, width * 0.46, height * 0.46, width * 0.46).rotation.y = i;
  }
  part(architecture, 'box', frost, 0, -1.12, 0, 92, 0.6, 92);
  for (let i = 0; i < 23; i++) {
    const angle = i * 2.39996;
    const distance = 20.9 + i % 4 * 2.8;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const height = 1.9 + i % 6 * 0.42;
    part(architecture, 'peak', ridge[0], x, height / 2 - 0.85, z, 0.84, height, 0.84);
    part(architecture, 'peak', snow, x, height * 0.65 - 0.85, z, 0.63, height * 0.76, 0.63);
  }
}
