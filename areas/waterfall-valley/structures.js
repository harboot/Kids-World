import { faces, nearest, route } from './landform.js';

export function createTimberKit(THREE, scene) {
  const batches = new Map();
  const dummy = new THREE.Object3D();
  const axis = new THREE.Vector3(0, 1, 0);
  const vector = new THREE.Vector3();

  function box(material, x, y, z, width, height, depth, yaw = 0) {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(width, height, depth);
    store(material);
  }
  function beam(material, a, b, width, depth = width) {
    const [x, y, z] = a;
    const [nx, ny, nz] = b;
    vector.set(nx - x, ny - y, nz - z);
    dummy.position.set((x + nx) / 2, (y + ny) / 2, (z + nz) / 2);
    dummy.scale.set(width, vector.length(), depth);
    dummy.quaternion.setFromUnitVectors(axis, vector.normalize());
    store(material);
  }
  function store(material) {
    dummy.updateMatrix();
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push(dummy.matrix.clone());
  }
  return {
    box, beam,
    finish() {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      for (const [material, matrices] of batches) {
        const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
        mesh.name = material.name;
        matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
        scene.add(mesh);
      }
    },
  };
}

export function addFootbridge(THREE, kit, ground, start, end, width) {
  const [x, z, y] = start, [xx, zz, yy] = end;
  const path = route([start, end]);
  const { length } = path;
  const dx = (xx - x) / length, dz = (zz - z) / length;
  const wood = new THREE.MeshLambertMaterial({ name: 'Footbridge boards', color: 0x906745, flatShading: true });
  const dark = new THREE.MeshLambertMaterial({ name: 'Footbridge timber', color: 0x5f442f, flatShading: true });
  function at(t, side = 0, above = 0) {
    return [x + (xx - x) * t - dz * side, y + (yy - y) * t + above, z + (zz - z) * t + dx * side];
  }
  const count = Math.ceil(length / 0.43);
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    kit.beam(wood, at(t, -width / 2, -0.09), at(t, width / 2, -0.09), length / count - 0.025, 0.18);
  }
  const railingInset = 0.58 / length;
  for (const side of [-1, 1]) {
    const edge = side * width / 2;
    kit.beam(dark, at(0, edge * 0.77, -0.23), at(1, edge * 0.77, -0.23), 0.22, 0.29);
    kit.beam(wood, at(railingInset, edge, 0.94), at(1 - railingInset, edge, 0.94), 0.13);
    kit.beam(wood, at(railingInset, edge, 0.49), at(1 - railingInset, edge, 0.49), 0.09);
    const posts = Math.ceil(length / 2.65);
    for (let i = 0; i <= posts; i++) {
      const t = railingInset + (1 - 2 * railingInset) * i / posts;
      const [px, base, pz] = at(t, edge, -0.16);
      kit.beam(dark, [px, Math.min(base, ground(px, pz) - 0.1), pz], at(t, edge, 1.03), 0.19);
    }
  }
  return {
    surface(px, pz, margin = 0) {
      const along = (px - x) * dx + (pz - z) * dz;
      const offset = (pz - z) * dx - (px - x) * dz;
      if (along < 0 || along > length || Math.abs(offset) > width / 2 - margin) return undefined;
      return y + (yy - y) * along / length;
    },
    railing(px, pz, radius) {
      const along = (px - x) * dx + (pz - z) * dz;
      const offset = Math.abs((pz - z) * dx - (px - x) * dz);
      return along > railingInset * length && along < (1 - railingInset) * length && Math.abs(offset - width / 2) < radius + 0.08;
    },
  };
}

export function addRailway(THREE, scene, layout, kit) {
  const wood = new THREE.MeshBasicMaterial({ name: 'Old mine timber', color: 0x805938, toneMapped: false });
  const dark = new THREE.MeshBasicMaterial({ name: 'Dark sleepers and bracing', color: 0x46342b, toneMapped: false });
  const iron = new THREE.MeshBasicMaterial({ name: 'Steel rails', color: 0x909b9d, toneMapped: false });
  const glow = new THREE.MeshBasicMaterial({ name: 'Amber mining lamps', color: 0xffd588, toneMapped: false });
  const { main, branches, floor, ceiling } = layout;
  const lamps = [], posts = [];
  const trestle = [];
  const gauge = 1.24;
  const deckHalfWidth = 2.94;
  const ties = faces(THREE, scene, 'Elevated rail trestle deck',
    new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
  const trackBed = new THREE.Color(0x765239);
  const sections = [];

  for (const [index, path] of [main, ...branches].entries()) {
    let previousRails;
    for (let i = 0; i < path.points.length; i++) {
      const point = path.points[i];
      const [x, z, y] = point;
      const before = path.points[Math.max(0, i - 1)], after = path.points[Math.min(path.points.length - 1, i + 1)];
      const angle = Math.atan2(after[0] - before[0], after[1] - before[1]);
      const s = Math.sin(angle), c = Math.cos(angle);
      const at = (offset, dy) => [x + c * offset, y + dy, z - s * offset];
      const rails = [-gauge / 2, gauge / 2].map(offset => at(offset, 0.15));
      const previous = i > 0 ? path.points[i - 1] : null;
      const openAir = z > -23;
      if (!openAir && (!index || i > 1)) kit.box(dark, x, y + 0.04, z, 2.05, 0.14, 0.24, angle);
      if (previous && previous[1] < -23 && !openAir) {
        for (let j = 0; j < 2; j++) kit.beam(iron, previousRails[j], rails[j], 0.083);
      }
      previousRails = rails;

      if (index !== 0 || openAir) continue;
      const onSpan = layout.bridgeSpan(x, z);
      if (onSpan) {
        const deck = [at(-deckHalfWidth, 0), at(deckHalfWidth, 0)];
        if (trestle.length && i === trestle.at(-1).index + 1) {
          const last = trestle.at(-1).deck;
          for (const side of [0, 1]) {
            kit.beam(dark, lower(last[side], 0.23), lower(deck[side], 0.23), 0.25);
            kit.beam(wood, lower(last[side], -0.81), lower(deck[side], -0.81), 0.14);
          }
          ties.quad(last[1], last[0], deck[0], deck[1], trackBed.clone().multiplyScalar(i % 2 ? 0.88 : 1));
          sections.push([last[1], last[0], deck[0]], [last[1], deck[0], deck[1]]);
        }
        trestle.push({ index: i, deck });
        if (i % 3 === 0) {
          for (const p of deck) {
            const bed = floor.sample(p[0], p[2]);
            kit.beam(dark, [p[0], Math.min(bed - 0.2, p[1] - 0.3), p[2]], lower(p, -1.04), 0.24);
          }
        }
      }
      const station = (z > -36 && x < 0) || (z > -41 && x > 0);
      if (i % (station ? 3 : 7) !== 0 || onSpan) continue;
      const crown = Math.min(at(0, 3.75)[1], ceiling.sample(x, z) - 0.17);
      const supports = [-2.78, 2.78].map(offset => at(offset, 0));
      for (const [px, , pz] of supports) {
        kit.beam(wood, [px, floor.sample(px, pz) - 0.17, pz], [px, crown + 0.12, pz], 0.29);
        posts.push({ x: px, z: pz, radius: 0.2 });
      }
      kit.beam(wood, [supports[0][0], crown, supports[0][2]], [supports[1][0], crown, supports[1][2]], 0.27);
      const [lx, ly, lz] = at(i % 2 === 0 ? 2.42 : -2.42, 2.42);
      lamp(lx, ly, lz);
    }
  }

  function lamp(x, y, z) {
    lamps.push({ x, y, z });
    kit.box(dark, x, y + 0.18, z, 0.29, 0.085, 0.27);
    kit.box(dark, x, y - 0.18, z, 0.28, 0.085, 0.26);
    kit.box(glow, x, y, z, 0.19, 0.29, 0.17);
  }
  function lower([x, y, z], dy) {
    return [x, y - dy, z];
  }
  function nearRail(x, z, clearance) {
    return [main, ...branches].some(path => nearest(path, x, z).offset < clearance);
  }

  // Low platforms occupy the open sides of the two station throats.
  const platforms = [];
  for (const [x, z, length] of [[-9.8, -29, 7], [24.6, -28, 5.4]]) {
    const y = floor.sample(x, z) + 0.15;
    kit.box(wood, x, y - 0.12, z, 1.65, 0.24, length);
    platforms.push({ left: x - 0.825, right: x + 0.825, front: z - length / 2, back: z + length / 2, height: y });
    lamp(x + 0.65, y + 1.85, z - length / 2 + 0.35);
  }
  for (const [x, z] of [[-25, -55], [-12, -57], [-21, -64], [-11, -72], [-28, -73],
    [-40, -67], [-53, -50], [-33, -58], [2, -73], [31, -59], [37, -54], [19, -55]]) {
    const y = floor.sample(x, z);
    kit.beam(dark, [x, y - 0.16, z], [x, y + 2.45, z], 0.19);
    posts.push({ x, z, radius: 0.15 });
    lamp(x + 0.14, y + 2.13, z);
  }

  ties.finish();

  function deckHeight(x, z) {
    for (const [a, b, c] of sections) {
      const ax = b[0] - a[0], az = b[2] - a[2];
      const bx = c[0] - a[0], bz = c[2] - a[2];
      const dx = x - a[0], dz = z - a[2];
      const determinant = ax * bz - az * bx;
      const u = (dx * bz - dz * bx) / determinant;
      const v = (ax * dz - az * dx) / determinant;
      if (u >= -1e-8 && v >= -1e-8 && u + v <= 1 + 1e-8) return a[1] + u * (b[1] - a[1]) + v * (c[1] - a[1]);
    }
    return undefined;
  }
  return { lamps, posts, platforms, nearRail, deckHalfWidth, deckHeight };
}
