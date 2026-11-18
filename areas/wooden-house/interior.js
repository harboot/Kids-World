export const HOUSE_WIDTH = 12.8;
export const HOUSE_DEPTH = 10.8;
const HEIGHT = 3.8;
const HALF_WIDTH = HOUSE_WIDTH / 2;
const HALF_DEPTH = HOUSE_DEPTH / 2;

export const colors = {
  cream: 0xffebca, linen: 0xfff6df, honey: 0xba7d50, walnut: 0x79523f, oak: 0xd7a372,
  gold: 0xf2be64, rose: 0xd9867b, brick: 0xa26460, mint: 0xa3bdb0, sage: 0x729687,
  teal: 0x4c7b80, blue: 0x6da9c2, plum: 0x856f80, ink: 0x34333b, leaf: 0x638c5e,
};

export function createHouseBuilder(THREE, scene, obstacles) {
  const architecture = new THREE.Group();
  const shapes = {
    box: new THREE.BoxGeometry(1, 1, 1),
    round: new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
    taper: new THREE.CylinderGeometry(0.5, 0.37, 1, 12),
    ball: new THREE.SphereGeometry(0.5, 12, 8),
    facet: new THREE.IcosahedronGeometry(0.5, 0),
    peak: new THREE.ConeGeometry(0.5, 1, 4),
  };
  const matte = new THREE.MeshLambertMaterial();
  const bright = new THREE.MeshBasicMaterial({ toneMapped: false });
  const materials = new Map();
  const staticParts = [];

  function group(name, x, y, z, parent = architecture) {
    const node = new THREE.Group();
    node.name = name;
    node.position.set(x, y, z);
    parent.add(node);
    return node;
  }

  function part(parent, color, x, y, z, width, height, depth, shape = 'box', lit = true) {
    const template = lit ? matte : bright;
    const mesh = new THREE.Mesh(shapes[shape], template);
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    parent.add(mesh);
    let root = parent;
    while (root.parent && root !== scene) root = root.parent;
    if (root === architecture) {
      staticParts.push({ mesh, color });
    } else {
      const key = color * 2 + Number(lit);
      if (!materials.has(key)) {
        const material = template.clone();
        material.color.setHex(color);
        materials.set(key, material);
      }
      mesh.material = materials.get(key);
    }
    return mesh;
  }

  function batchArchitecture() {
    architecture.updateMatrixWorld(true);
    for (const template of [matte, bright]) {
      for (const shape of Object.values(shapes)) {
        const parts = staticParts.filter(({ mesh }) => mesh.geometry === shape && mesh.material === template);
        if (!parts.length) continue;
        const batch = new THREE.InstancedMesh(shape, template, parts.length);
        const color = new THREE.Color();
        parts.forEach(({ mesh, color: hex }, i) => {
          batch.setMatrixAt(i, mesh.matrixWorld);
          batch.setColorAt(i, color.setHex(hex));
        });
        scene.add(batch);
      }
    }
    architecture.clear();
    staticParts.length = 0;
  }

  function solid(x, z, width, depth, height) {
    obstacles.push({ left: x - width / 2, right: x + width / 2, front: z - depth / 2, back: z + depth / 2, height });
  }

  return { group, part, solid, batchArchitecture };
}

export function buildInterior(THREE, scene, { group, part, solid }) {
  const { cream, linen, honey, walnut, oak, gold, rose, mint, sage, leaf } = colors;
  const room = group('Wooden room', 0, 0, 0);
  scene.background = new THREE.Color(cream);
  scene.add(new THREE.HemisphereLight(0xfff4df, 0xad7a6c, 1.65));
  const sun = new THREE.DirectionalLight(0xffe8bd, 1.7);
  sun.position.set(-3, 6, 2);
  const fill = new THREE.DirectionalLight(0xe3f5ff, 0.9);
  fill.position.set(5, 4, -5);
  scene.add(sun, fill);

  part(room, honey, 0, -0.13, 0, HOUSE_WIDTH, 0.22, HOUSE_DEPTH);
  const planks = [0xc39164, 0xcb986b, 0xd39f71, 0xc08a5f, 0xd9a777];
  for (let row = 0; row < 30; row++) {
    const z = -HALF_DEPTH + (row + 0.5) * 0.36;
    let left = -HALF_WIDTH;
    for (let i = 0; left < HALF_WIDTH - 0.02; i++) {
      const span = Math.min(i ? 2.72 : 1.4 + (row % 4) * 0.37, HALF_WIDTH - left);
      part(room, planks[(row * 7 + i * 3) % planks.length], left + span / 2, -0.018, z, span - 0.012, 0.036, 0.351);
      left += span;
    }
  }
  part(room, 0xe7caac, 0, HEIGHT + 0.09, 0, HOUSE_WIDTH, 0.18, HOUSE_DEPTH);
  for (const z of [-4.96, -2.52, 0, 2.52, 4.96]) part(room, honey, 0, HEIGHT - 0.1, z, HOUSE_WIDTH, 0.2, 0.17);
  for (const x of [-5.98, 5.98]) part(room, walnut, x, HEIGHT - 0.18, 0, 0.18, 0.19, HOUSE_DEPTH);

  function wall(x, z, span, angle) {
    const face = group('Exterior wall', x, 0, z);
    face.rotation.y = angle;
    part(face, cream, 0, HEIGHT / 2, 0, span, HEIGHT, 0.19);
    for (let y = 1.36; y < HEIGHT; y += 0.28) part(face, 0xe7c8a4, 0, y, 0.098, span, 0.019, 0.015);
    part(face, oak, 0, 0.53, 0.107, span, 1.06, 0.036);
    for (let i = 1; i < Math.round(span / 0.32); i++) {
      const offset = span * (i / Math.round(span / 0.32) - 0.5);
      part(face, honey, offset, 0.53, 0.13, 0.018, 1.06, 0.016);
    }
    part(face, walnut, 0, 0.075, 0.15, span, 0.15, 0.075);
    part(face, honey, 0, 1.06, 0.158, span, 0.105, 0.102);
    return face;
  }

  const back = wall(0, -HALF_DEPTH, HOUSE_WIDTH, 0);
  const front = wall(0, HALF_DEPTH, HOUSE_WIDTH, Math.PI);
  const left = wall(-HALF_WIDTH, 0, HOUSE_DEPTH, Math.PI / 2);
  const right = wall(HALF_WIDTH, 0, HOUSE_DEPTH, -Math.PI / 2);
  for (const z of [-HALF_DEPTH, HALF_DEPTH]) solid(0, z, HOUSE_WIDTH, 0.2, HEIGHT);
  for (const x of [-HALF_WIDTH, HALF_WIDTH]) solid(x, 0, 0.2, HOUSE_DEPTH, HEIGHT);
  for (const wallFace of [back, front]) {
    for (const x of [-6.15, 6.15]) part(wallFace, honey, x, HEIGHT / 2, 0.179, 0.26, HEIGHT, 0.17);
  }

  function window(parent, x, y, width, curtain) {
    const frame = group('Window', x, y, 0.17, parent);
    part(frame, walnut, 0, 0, 0, width + 0.2, 1.5, 0.135);
    part(frame, 0xb6dfe7, 0, 0, 0.074, width, 1.3, 0.026, 'box', false);
    part(frame, 0xffe5a6, width * 0.26, 0.33, 0.095, 0.26, 0.26, 0.023, 'ball', false);
    for (const [px, py, span, tint] of [
      [-0.23, -0.375, 0.79, 0x9fbd91], [0.26, -0.429, 0.48, 0x89ab81], [0, -0.55, 0.97, 0x71986b],
    ]) {
      part(frame, tint, width * px, py, 0.1 - py * 0.03, width * span, 0.28, 0.02, 'ball', false);
    }
    for (const [px, py] of [[-0.34, 0.31], [-0.11, 0.47], [0.03, 0.25]]) {
      part(frame, 0xe8f5f1, width * px, py, 0.096, 0.29, 0.09, 0.017, 'ball', false);
    }
    part(frame, linen, 0, 0, 0.127, width, 0.06, 0.06);
    part(frame, linen, 0, 0, 0.127, 0.065, 1.32, 0.06);
    part(frame, oak, 0, -0.735, 0.13, width + 0.28, 0.11, 0.33);
    if (!curtain) return;
    part(frame, walnut, 0, 0.85, 0.27, width + 0.51, 0.045, 0.045);
    for (const side of [-1, 1]) {
      part(frame, gold, side * (width / 2 + 0.24), 0.85, 0.27, 0.09, 0.09, 0.09, 'ball');
      for (let i = 0; i < 4; i++) {
        part(frame, i % 2 ? curtain : linen, side * (width / 2 + 0.16 - i * 0.081),
          0.065 + i * 0.018, 0.252, 0.105, 1.46 - i * 0.036, 0.11, 'ball');
      }
      part(frame, gold, side * (width / 2 + 0.038), -0.14, 0.31, 0.315, 0.074, 0.07);
    }
  }
  window(back, -4.35, 2.41, 1.85, rose);
  window(back, 2.2, 2.42, 1.63);
  window(front, -3.42, 2.24, 1.99, mint);
  window(front, 3.52, 2.24, 2.12, rose);
  window(right, 1.68, 2.36, 1.85, mint);
  window(left, 3.93, 2.48, 1.5);

  const exit = group('Inside of cabin door', 0, 0, 0.18, front);
  solid(0, HALF_DEPTH - 0.29, 1.76, 0.27, 2.44);
  part(exit, walnut, 0, 1.22, 0, 1.76, 2.44, 0.17);
  part(exit, honey, 0, 1.17, 0.103, 1.41, 2.29, 0.11);
  for (const x of [-0.46, 0.46]) part(exit, oak, x, 0.75, 0.164, 0.35, 0.94, 0.032);
  part(exit, walnut, 0, 1.771, 0.172, 0.76, 0.55, 0.042);
  part(exit, 0xb6dfe7, 0, 1.771, 0.2, 0.63, 0.42, 0.025, 'box', false);
  part(exit, linen, 0, 1.77, 0.224, 0.037, 0.42, 0.035);
  part(exit, gold, -0.57, 1.02, 0.221, 0.125, 0.125, 0.115, 'ball');
  rug({ group, part }, 0, 4.57, 1.56, 0.61, walnut, oak);

  for (const [x, z] of [[-2.8, -1.75], [2.8, 0.15]]) {
    part(room, walnut, x, 3.5, z, 0.055, 0.55, 0.055, 'round');
    part(room, gold, x, 3.21, z, 0.62, 0.29, 0.62, 'taper').rotation.z = Math.PI;
    part(room, 0xffe7b4, x, 3.06, z, 0.43, 0.09, 0.43, 'ball', false);
  }

  const clock = group('Wall clock', 0.04, 2.67, 0.15, back);
  part(clock, walnut, 0, 0, 0, 0.56, 0.11, 0.56, 'round').rotation.x = Math.PI / 2;
  part(clock, linen, 0, 0, 0.062, 0.473, 0.053, 0.473, 'round').rotation.x = Math.PI / 2;
  part(clock, walnut, 0.047, 0.061, 0.099, 0.029, 0.17, 0.016).rotation.z = -0.65;
  part(clock, sage, -0.06, -0.035, 0.103, 0.026, 0.136, 0.018).rotation.z = -1;
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6;
    part(clock, walnut, 0.192 * Math.sin(angle), 0.192 * Math.cos(angle), 0.101, 0.026, 0.038, 0.02).rotation.z = -angle;
  }

  return {
    x: 0, z: HALF_DEPTH - 0.38, anchorY: 1.28, radius: 1.45, label: 'Return to Flower Garden',
    reachable: player => player.z < HALF_DEPTH - 0.35 && Math.abs(player.x) < 1.25,
    act({ travel, heardCue }) { travel('garden', heardCue, 'cabin'); },
  };
}

export function rug({ group, part }, x, z, width, depth, edge, field) {
  const mat = group('Woven rug', x, 0.012, z);
  part(mat, edge, 0, 0, 0, width, 0.025, depth);
  part(mat, field, 0, 0.015, 0, width - 0.13, 0.009, depth - 0.14);
  for (const side of [-1, 1]) {
    part(mat, colors.linen, 0, 0.021, side * (depth / 2 - 0.16), width - 0.2, 0.006, 0.035);
    for (let i = 1; i < 15; i++) {
      part(mat, edge, width * (i / 15 - 0.5), 0, side * (depth / 2 + 0.033), 0.028, 0.017, 0.073);
    }
  }
}
