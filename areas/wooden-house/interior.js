import { addGroup, addMesh, rectangleBounds } from '../../core/geometry.js';
import { PLAYER_ONLY_LAYER } from '../../core/render-layers.js';
import { BACK, FRONT, SIDE, UPSTAIRS } from './layout.js';

const HEIGHT = UPSTAIRS + 3.16;
const HOUSE_WIDTH = SIDE * 2;
const HOUSE_DEPTH = FRONT - BACK;

export const colors = {
  cream: 0xffebca, linen: 0xfff6df, honey: 0xba7d50, walnut: 0x79523f, oak: 0xd7a372,
  gold: 0xf2be64, rose: 0xd9867b, brick: 0xa26460, mint: 0xa3bdb0, sage: 0x729687,
  teal: 0x4c7b80, blue: 0x6da9c2, plum: 0x856f80, ink: 0x34333b, leaf: 0x638c5e,
};

export function createHouseBuilder(THREE, scene, obstacles, upper) {
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
    return addGroup(THREE, parent, name, x, y, z);
  }

  function part(parent, color, x, y, z, width, height, depth, shape = 'box', lit = true) {
    const template = lit ? matte : bright;
    const mesh = addMesh(THREE, parent, shapes[shape], template, x, y, z, width, height, depth);
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
        for (const layer of [0, PLAYER_ONLY_LAYER]) {
          const parts = staticParts.filter(({ mesh }) =>
            mesh.geometry === shape && mesh.material === template && mesh.layers.isEnabled(layer));
          if (!parts.length) continue;
          const batch = new THREE.InstancedMesh(shape, template, parts.length);
          batch.layers.set(layer);
          const color = new THREE.Color();
          parts.forEach(({ mesh, color: hex }, i) => {
            batch.setMatrixAt(i, mesh.matrixWorld);
            batch.setColorAt(i, color.setHex(hex));
          });
          scene.add(batch);
        }
      }
    }
    architecture.clear();
    staticParts.length = 0;
  }

  function solid(x, z, width, depth, height, floor = 0) {
    if (floor) {
      upper.add(x, z, width, depth, height, floor);
      return;
    }
    obstacles.push({ ...rectangleBounds(x, z, width, depth), height });
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

  const midpoint = (FRONT + BACK) / 2;
  part(room, 0x94a96c, 0, -.16, 0, 20, .3, 18);
  part(room, honey, 0, -.13, midpoint, HOUSE_WIDTH, .24, HOUSE_DEPTH);
  const rows = Math.ceil(HOUSE_DEPTH / .36);
  const spacing = HOUSE_DEPTH / rows;
  const planks = [0xc39164, 0xcb986b, 0xd39f71, 0xc08a5f, 0xd9a777];
  for (let row = 0; row < rows; row++) {
    const z = BACK + (row + .5) * spacing;
    let left = -SIDE;
    for (let i = 0; left < SIDE - .02; i++) {
      const span = Math.min(i ? 2.72 : 1.4 + (row % 4) * .37, SIDE - left);
      part(room, planks[(row * 7 + i * 3) % planks.length], left + span / 2, -.019, z, span - .012, .037, spacing - .011);
      left += span;
    }
  }
  part(room, 0xe7caac, 0, HEIGHT + .09, midpoint, HOUSE_WIDTH, .18, HOUSE_DEPTH).layers.set(PLAYER_ONLY_LAYER);
  const pitch = .26;
  for (const side of [-1, 1]) {
    const slope = part(room, 0x975a4b, side * (SIDE + .26) / 2, HEIGHT + 1.21, midpoint,
      (SIDE + .26) / Math.cos(pitch) + .10, .24, HOUSE_DEPTH + .58);
    slope.rotation.z = -side * pitch;
    slope.layers.set(PLAYER_ONLY_LAYER);
  }
  part(room, walnut, 0, HEIGHT + 2.4, midpoint, .23, .2, HOUSE_DEPTH + .62).layers.set(PLAYER_ONLY_LAYER);
  const gable = new THREE.Shape();
  gable.moveTo(-SIDE, 0);
  gable.lineTo(-SIDE, .08);
  gable.lineTo(0, 2.39);
  gable.lineTo(SIDE, .08);
  gable.lineTo(SIDE, 0);
  gable.closePath();
  const gableGeometry = new THREE.ExtrudeGeometry(gable, { depth: .18, bevelEnabled: false });
  const gableWood = new THREE.MeshLambertMaterial({ color: honey });
  for (const z of [BACK - .09, FRONT - .09]) {
    const face = new THREE.Mesh(gableGeometry, gableWood);
    face.position.set(0, HEIGHT, z);
    face.layers.set(PLAYER_ONLY_LAYER);
    scene.add(face);
  }


  function wall(face, center, span) {
    part(face, cream, center, HEIGHT / 2, 0, span, HEIGHT, .19);
    for (const floor of [0, UPSTAIRS]) {
      part(face, oak, center, floor + .51, .107, span, 1.02, .036);
      part(face, walnut, center, floor + .065, .147, span, .13, .075);
      part(face, honey, center, floor + 1.015, .149, span, .098, .093);
      for (let y = 1.35; y < 3.05; y += .29) part(face, 0xe7c8a4, center, floor + y, .103, span, .018, .014);
    }
  }
  const back = group('Rear wall', 0, 0, BACK);
  const front = group('Front wall and entry', 0, 0, FRONT);
  front.rotation.y = Math.PI;
  const left = group('West wall', -SIDE, 0, midpoint);
  left.rotation.y = Math.PI / 2;
  const right = group('East wall', SIDE, 0, midpoint);
  right.rotation.y = -Math.PI / 2;
  wall(back, 0, HOUSE_WIDTH);
  wall(front, 0, HOUSE_WIDTH);
  wall(left, 0, HOUSE_DEPTH);
  wall(right, 0, HOUSE_DEPTH);
  solid(0, BACK, HOUSE_WIDTH, .20, HEIGHT);
  for (const x of [-SIDE, SIDE]) solid(x, midpoint, .20, HOUSE_DEPTH, HEIGHT);
  solid(0, FRONT, HOUSE_WIDTH, .22, HEIGHT);

  function window(parent, x, y, width, curtain) {
    const floor = y >= UPSTAIRS ? UPSTAIRS : 0;
    const frame = group('Window', x, Math.min(y, floor + 1.92), .17, parent);
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
  window(front, 3.52, 2.24, 2.12, rose);
  window(right, 1.68, 2.36, 1.85, mint);
  window(left, 3.93, 2.48, 1.5);

  window(back, -4.3, UPSTAIRS + 2.0, 2.12, colors.blue);
  window(back, 3.2, UPSTAIRS + 2.0, 1.94, rose);
  window(left, -1.47, UPSTAIRS + 1.89, 1.76, colors.blue);
  const facade = group('Exterior window frames', 0, 0, FRONT);
  for (const [x, floor, tint] of [[-4.35, 0, mint], [4.35, 0, rose], [-4.35, UPSTAIRS, colors.blue], [4.35, UPSTAIRS, rose]]) {
    window(facade, x, floor + 2.03, 1.72);
    for (const side of [-1, 1]) {
      part(facade, tint, x + side * 1.19, floor + 2.03, .23, .43, 1.38, .13);
    }
  }


  for (const [x, z, y] of [[-2.8, -1.75, UPSTAIRS - .21], [2.8, .15, UPSTAIRS - .21],
    [-3.4, -2.4, HEIGHT], [3.1, -2.2, HEIGHT], [.65, 2.82, HEIGHT]]) {
    part(room, walnut, x, y - .19, z, .05, .39, .05, 'round');
    part(room, gold, x, y - .39, z, .62, .24, .62, 'taper').rotation.z = Math.PI;
    part(room, 0xffe7b4, x, y - .51, z, .43, .085, .43, 'ball', false);
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
}

export function rug({ group, part }, x, z, width, depth, edge, field, floor = 0) {
  const mat = group('Woven rug', x, floor + .012, z);
  part(mat, edge, 0, 0, 0, width, 0.025, depth);
  part(mat, field, 0, 0.015, 0, width - 0.13, 0.009, depth - 0.14);
  for (const side of [-1, 1]) {
    part(mat, colors.linen, 0, 0.021, side * (depth / 2 - 0.16), width - 0.2, 0.006, 0.035);
    for (let i = 1; i < 15; i++) {
      part(mat, edge, width * (i / 15 - 0.5), 0, side * (depth / 2 + 0.033), 0.028, 0.017, 0.073);
    }
  }
}
