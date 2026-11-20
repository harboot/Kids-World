import { addGroup, SURFACE_GAP } from '../../core/geometry.js';
import { seededRandom } from '../../core/random.js';

export function buildTower(THREE, bay, components, parts, site) {
  const { part, beam, matte } = parts;
  const root = addGroup(THREE, components, 'Rapunzel tower', site.x, 0, site.z);
  const random = seededRandom(187);
  const grout = matte(0x58505d);
  const cutStone = [0x93848b, 0x9c8c92, 0xb29a93, 0x867a85, 0x998892, 0xa2928b].map(color => matte(color));
  const dressed = matte(0xbaa796);
  const weathered = matte(0x7b6978);
  const timber = matte(0x6c453c);
  const wood = matte(0xa56d4f);
  const iron = matte(0x422c46);
  const gold = matte(0xd4ac5c);
  const lead = matte(0x422a56);
  const roofColors = [0x543567, 0x61416f, 0x4a315f, 0x695077, 0x51355f].map(color => matte(color));
  const warmWindow = matte(0xffb670, { emissive: 0xffa645, emissiveIntensity: 0.74 });
  const darkWindow = matte(0x3e2738);
  const leaf = [matte(0x506943), matte(0x779345), matte(0x9fa855)];
  const blossoms = [matte(0xf0a6b6), matte(0xae79bb), matte(0xf3ca86)];
  const box = (material, ...values) => part(root, 'box', material, ...values);

  // Taper the shaft slightly toward the timber crown. Each course has a different joint pattern.
  const radius = y => 1.70 + 0.40 * Math.exp(-y * 0.22) + 0.032 * Math.cos(y * 1.45);
  const shaftProfile = Array.from({ length: 28 }, (_, i) => {
    const y = i * 0.36;
    return new THREE.Vector2(radius(y) - 0.057, y);
  });
  part(root, new THREE.LatheGeometry(shaftProfile, 48), grout, 0, -0.035, 0, 1, 1, 1);
  part(root, 'drum', weathered, 0, 0.18, 0, 2.20, 0.39, 2.20);
  part(root, 'drum', dressed, 0, 0.42, 0, 2.17, 0.12, 2.17);
  const count = 17;
  const angle = Math.PI * 2 / count;
  const stoneSlice = new THREE.CylinderGeometry(1, 1, 1, 4, 1, true, -angle * 0.47, angle * 0.94);
  for (let course = 0; course < 25; course++) {
    const y = 0.65 + course * 0.37;
    for (let i = 0; i < count; i++) {
      const thickness = radius(y) + random() * 0.048;
      const stone = part(root, stoneSlice, cutStone[Math.floor(random() * cutStone.length)], 0, y + (random() - 0.5) * 0.015, 0,
        thickness, 0.345 + random() * 0.011, thickness);
      stone.rotation.y = (i + (course % 2) * 0.50) * angle + 0.018 * Math.sin(course * 2);
    }
  }
  for (const [y, r, h, material] of [
    [3.15, 1.97, 0.11, weathered], [6.4, 1.90, 0.11, weathered], [9.43, 2.04, 0.28, dressed],
    [9.64, 2.14, 0.16, weathered], [9.82, 2.20, 0.21, dressed],
  ]) part(root, 'drum', material, 0, y, 0, r, h, r);
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8;
    const corbel = box(dressed, Math.sin(a) * 1.83, 9.29, Math.cos(a) * 1.83, 0.25, 0.48, 0.42);
    corbel.rotation.y = a;
  }

  // Gothic window backplates lift their visible faces clear of the curved masonry.
  const windowShape = new THREE.Shape();
  windowShape.moveTo(-0.28, -0.60);
  windowShape.lineTo(0.28, -0.60);
  windowShape.lineTo(0.28, 0.17);
  windowShape.quadraticCurveTo(0.28, 0.42, 0, 0.68);
  windowShape.quadraticCurveTo(-0.28, 0.42, -0.28, 0.17);
  windowShape.closePath();
  const lancet = new THREE.ExtrudeGeometry(windowShape, { depth: 0.10, bevelEnabled: false, curveSegments: 5 });
  for (const [a, y] of [[0.55, 3.91], [-0.56, 6.75], [1.64, 5.85], [2.89, 7.74], [-1.74, 4.94]]) {
    const s = radius(y) + 0.036;
    const window = addGroup(THREE, root, 'Lit lancet window', Math.sin(a) * s, y, Math.cos(a) * s, a);
    part(window, lancet, dressed, 0, 0, -0.01, 1.45, 1.2, 1.04);
    part(window, lancet, iron, 0, 0, 0.107, 1.10, 1, 0.20);
    part(window, lancet, warmWindow, 0, 0.001, 0.133 + SURFACE_GAP.detail, 0.85, 0.87, 0.14);
    part(window, 'box', timber, 0, -0.09, 0.18, 0.031, 0.80, 0.06);
    part(window, 'box', timber, 0, 0.01, 0.18, 0.48, 0.045, 0.06);
    part(window, 'box', weathered, 0, -0.65, 0.09, 0.99, 0.145, 0.37);
  }

  part(root, 'drum', dressed, 0, 11.04, 0, 2.13, 2.48, 2.13);
  part(root, 'drum', timber, 0, 12.26, 0, 2.25, 0.2, 2.25);
  for (let i = 0; i < 12; i++) {
    const a = (i + 0.5) * Math.PI / 6;
    const post = box(timber, Math.sin(a) * 2.08, 11.04, Math.cos(a) * 2.08, 0.18, 2.33, 0.19);
    post.rotation.y = a;
  }
  part(root, lancet, timber, 0, 11.12, 2.04, 3.63, 1.81, 1.85);
  part(root, lancet, darkWindow, 0, 11.12, 2.24, 2.98, 1.65, 0.34);
  part(root, lancet, warmWindow, 0, 11.56, 2.281 + SURFACE_GAP.detail, 1.76, 0.80, 0.15);
  box(timber, 0, 11.59, 2.33, 0.086, 0.80, 0.074);
  box(timber, 0, 11.51, 2.33, 0.91, 0.081, 0.074);
  for (const side of [-1, 1]) {
    const shutters = box(wood, side * 0.96, 11.20, 2.23, 0.38, 1.37, 0.13);
    shutters.rotation.y = -side * 0.25;
    box(gold, side * 0.96, 11.42, 2.35, 0.256, 0.075, 0.07);
  }

  const balcony = 9.79;
  box(timber, 0, balcony - 0.20, 2.40, 3.86, 0.35, 2.20);
  box(wood, 0, balcony - 0.036, 2.43, 4.02, 0.092, 2.21);
  for (let i = -4; i <= 4; i++) {
    box(i % 2 ? wood : timber, i * 0.426, balcony + SURFACE_GAP.detail, 2.47, 0.400, 0.028, 1.93);
  }
  for (const side of [-1, 1]) {
    const x = side * 1.82;
    beam(root, timber, [x * 0.69, balcony - 1.58, 1.45], [x, balcony - 0.29, 3.38], 0.23);
    beam(root, wood, [x, balcony + 0.75, 1.19], [x, balcony + 0.75, 3.47], 0.13);
    beam(root, wood, [x, balcony + 0.28, 1.20], [x, balcony + 0.28, 3.47], 0.085);
    for (const z of [1.39, 1.82, 2.26, 2.71, 3.15]) box(timber, x, balcony + 0.41, z, 0.073, 0.76, 0.085);
    box(timber, x, balcony + 0.40, 3.47, 0.18, 0.83, 0.18);
    part(root, 'ball', gold, x, balcony + 0.87, 3.47, 0.12, 0.11, 0.12);
  }
  box(wood, 0, balcony + 0.75, 3.47, 3.65, 0.14, 0.15);
  box(wood, 0, balcony + 0.26, 3.47, 3.65, 0.09, 0.10);
  for (let i = -4; i <= 4; i++) box(timber, i * 0.36, balcony + 0.43, 3.47, 0.075, 0.71, 0.085);

  for (const side of [-1, 1]) {
    const x = side * 1.21;
    box(timber, x, 10.88, 2.51, 0.78, 0.25, 0.43);
    box(wood, x, 10.91, 2.75, 0.80, 0.08, 0.07);
    for (let n = 0; n < 9; n++) {
      const y = 11.01 + random() * 0.21;
      part(root, 'ball', leaf[n % 3], x + (random() - 0.5) * 0.8, y, 2.64, 0.17, 0.102, 0.14);
      part(root, 'sphere', blossoms[n % 3], x + (random() - 0.5) * 0.76, y + 0.12, 2.68, 0.085, 0.078, 0.08);
    }
  }

  // Ring-shaped courses and scalloped tile relief catch light along the roof's taper.
  const roofBase = 12.33;
  const roofProfile = [
    [2.56, 0], [2.53, 0.16], [2.30, 0.54], [2.02, 1.02], [1.75, 1.58],
    [1.46, 2.2], [1.13, 2.9], [0.77, 3.61], [0.42, 4.25], [0.14, 4.73], [0.02, 4.91],
  ];
  const roofGeometry = new THREE.LatheGeometry(roofProfile.map(([r, y]) => new THREE.Vector2(r, y)), 38);
  part(root, roofGeometry, lead, 0, roofBase, 0, 1, 1, 1);
  part(root, 'drum', timber, 0, roofBase + 0.018, 0, 2.54, 0.14, 2.54);
  const shingle = new THREE.IcosahedronGeometry(1, 0);
  for (let row = 0; row < roofProfile.length - 1; row++) {
    const [r, y] = roofProfile[row];
    const [next, end] = roofProfile[row + 1];
    const tileCount = Math.max(6, Math.round(r * 13));
    const pitch = Math.atan2(r - next, end - y);
    for (let i = 0; i < tileCount; i++) {
      const a = (i + (row % 2) * 0.5) * Math.PI * 2 / tileCount;
      const tileR = r * 0.58 + next * 0.42 + SURFACE_GAP.roof;
      const tileY = roofBase + y * 0.58 + end * 0.42;
      const tile = part(root, shingle, roofColors[(i * 3 + row * 2) % roofColors.length],
        Math.sin(a) * tileR, tileY, Math.cos(a) * tileR,
        (tileR * Math.PI / tileCount) * 1.06, Math.hypot(r - next, end - y) * 0.78, 0.092);
      tile.rotation.set(-pitch, a, 0, 'YXZ');
    }
  }
  for (const [x, y, z, scale] of [[0, 17.27, 0, 1], [-1.56, 13.49, -0.54, 0.53], [1.80, 13.21, 0.20, 0.45]]) {
    part(root, 'drum', gold, x, y, z, 0.077 * scale, 0.68 * scale, 0.077 * scale);
    part(root, 'gem', gold, x, y + 0.30 * scale, z, 0.23 * scale, 0.45 * scale, 0.23 * scale);
    part(root, 'cone', lead, x, y - 0.41 * scale, z, 0.54 * scale, 1.11 * scale, 0.54 * scale);
  }
  const pennant = box(matte(0xc5709a), 0.33, 17.52, 0, 0.59, 0.24, 0.045);
  pennant.rotation.z = -0.21;

  for (const [leadAngle, start, end] of [[-0.88, 0.08, 9.20], [1.04, 0.08, 5.36], [2.29, 1.1, 7.2], [-2.1, 0.05, 6.4]]) {
    const climb = i => {
      const y = start + (end - start) * i / 21;
      const a = leadAngle + Math.sin(i * 0.38) * 0.36;
      const r = radius(y) + 0.065;
      return [Math.sin(a) * r, y, Math.cos(a) * r];
    };
    for (let i = 1; i <= 21; i++) {
      const p = climb(i);
      beam(root, leaf[0], climb(i - 1), p, 0.069);
      for (const side of [-1, 1]) {
        const [x, y, z] = p;
        const foliage = part(root, 'gem', leaf[(i + 2) % 3], x + side * 0.12, y - 0.06, z + side * 0.05,
          0.19, 0.12, 0.125);
        foliage.rotation.z = side * 0.66;
      }
    }
  }

  box(wood, 0, balcony + 0.125, 3.08, 1.47, 0.24, 0.72);
  const actor = addGroup(THREE, bay, 'Rapunzel', site.x, balcony + 0.25, site.z + 3.08);
  const rapunzel = buildRapunzelCharacter(THREE, actor, parts);

  // A thick three-strand braid passes over the railing and hangs clear of the stonework.
  const braid = new THREE.CatmullRomCurve3([
    [-0.30, balcony + 2.12, 3.04], [-0.55, balcony + 1.81, 3.17], [-0.79, balcony + 1.33, 3.43],
    [-1.10, balcony + 1.00, 3.68], [-1.34, balcony + 0.30, 3.68], [-1.43, 8.69, 3.25], [-1.39, 7.38, 2.44],
    [-0.94, 5.95, 1.97], [-0.55, 4.54, 1.99], [-0.70, 2.95, 2.09], [-1.05, 1.39, 2.06],
    [-1.21, 0.54, 2.14], [-1.54, 0.34, 2.31],
  ].map(point => new THREE.Vector3(...point)));
  const colors = [0xffcb53, 0xf3ac36, 0xffdb72];
  colors.forEach((color, strand) => {
    const geometry = braidedStrand(THREE, braid, strand);
    part(root, geometry, matte(color, { emissive: 0xa45a0d, emissiveIntensity: 0.17 }), 0, 0, 0, 1, 1, 1);
  });
  for (const [x, y, z, shade] of [
    [-0.83, 10.97, 3.56, blossoms[0]], [-1.13, 10.65, 3.86, blossoms[1]], [-1.42, 8.98, 3.54, blossoms[2]],
    [-0.78, 5.69, 2.13, blossoms[1]], [-1.14, 0.74, 2.26, blossoms[0]],
  ]) part(root, 'sphere', shade, x, y, z, 0.14, 0.12, 0.077);
  return rapunzel;
}

function braidedStrand(THREE, curve, strand) {
  const count = 160;
  const segments = 6;
  const positions = [], indices = [];
  const axis = new THREE.Vector3(0, 0, 1);
  const normal = new THREE.Vector3();
  const binormal = new THREE.Vector3();
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    normal.crossVectors(tangent, axis).normalize();
    binormal.crossVectors(tangent, normal).normalize();
    const braidAngle = (strand / 3 + t * 20) * Math.PI * 2;
    const taper = 1 - 0.73 * t ** 4;
    point.addScaledVector(normal, Math.cos(braidAngle) * 0.14 * taper);
    point.addScaledVector(binormal, Math.sin(braidAngle) * 0.14 * taper);
    for (let j = 0; j < segments; j++) {
      const section = j * Math.PI * 2 / segments;
      const vertex = point.clone()
        .addScaledVector(normal, Math.cos(section) * 0.137 * taper)
        .addScaledVector(binormal, Math.sin(section) * 0.137 * taper);
      positions.push(vertex.x, vertex.y, vertex.z);
      if (i) {
        const a = (i - 1) * segments + j;
        const b = (i - 1) * segments + (j + 1) % segments;
        indices.push(a, b, a + segments, b, b + segments, a + segments);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function buildRapunzelCharacter(THREE, actor, { part, matte }) {
  const linen = matte(0xf5cfb5);
  const blush = matte(0xe7a393);
  const dark = matte(0x413242);
  const olive = matte(0x41584f);
  const petal = matte(0xe6a4b7);
  const hair = matte(0xecab40);
  const highlights = matte(0xffd566);
  const bodice = matte(0x9c59aa);
  const dress = matte(0x7f4a9e);
  const pleat = matte(0xb877bc);
  const trim = matte(0xe8b9cd);

  const skirtProfile = [[0.65, 0.01], [0.62, 0.10], [0.55, 0.39], [0.38, 0.78], [0.29, 1.04]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  part(actor, new THREE.LatheGeometry(skirtProfile, 20), dress, 0, 0, 0, 1, 1, 0.77);
  part(actor, 'sphere', bodice, 0, 1.20, 0, 0.34, 0.41, 0.23);
  part(actor, 'sphere', trim, 0, 1.01, 0, 0.33, 0.065, 0.25);
  part(actor, 'gem', petal, 0, 1.25, 0.235, 0.12, 0.18, 0.05);
  part(actor, 'drum', linen, 0, 1.52, 0.016, 0.145, 0.20, 0.13);
  for (const side of [-1, 1]) {
    part(actor, 'sphere', pleat, side * 0.30, 0.51, 0.21, 0.091, 0.47, 0.085).rotation.z = -side * 0.37;
    part(actor, 'sphere', trim, side * 0.24, 1.40, 0.14, 0.10, 0.10, 0.077);
  }

  const head = addGroup(THREE, actor, 'Rapunzel head', 0, 1.83, 0.04);
  head.rotation.x = 0.14;
  part(head, 'sphere', hair, -0.035, 0.075, -0.077, 0.419, 0.416, 0.355);
  part(head, 'sphere', linen, 0, 0, 0.046, 0.345, 0.352, 0.303);
  part(head, 'sphere', highlights, -0.165, 0.248, 0.205, 0.278, 0.115, 0.142).rotation.z = 0.56;
  part(head, 'sphere', hair, 0.168, 0.23, 0.128, 0.22, 0.133, 0.169).rotation.z = -0.62;
  part(head, 'sphere', highlights, -0.301, 0.009, -0.011, 0.118, 0.33, 0.15).rotation.z = -0.24;
  for (const side of [-1, 1]) {
    part(head, 'sphere', linen, side * 0.327, -0.037, 0.079, 0.078, 0.099, 0.074);
    part(head, 'sphere', petal, side * 0.315, -0.115, 0.105, 0.042, 0.041, 0.044);
    part(head, 'sphere', dark, side * 0.122, 0.048, 0.326, 0.064, 0.086, 0.026);
    part(head, 'sphere', olive, side * 0.122, 0.041, 0.345, 0.040, 0.057, 0.022);
    part(head, 'sphere', linen, side * 0.122 - 0.015, 0.072, 0.361, 0.017, 0.016, 0.012);
    part(head, 'sphere', blush, side * 0.207, -0.081, 0.289, 0.069, 0.041, 0.021);
  }
  part(head, 'sphere', linen, 0, -0.051, 0.348, 0.060, 0.067, 0.072);
  const smile = new THREE.CatmullRomCurve3([
    [-0.093, -0.143, 0.326], [-0.043, -0.173, 0.329], [0.026, -0.177, 0.328], [0.090, -0.149, 0.327],
  ].map(point => new THREE.Vector3(...point)));
  part(head, new THREE.TubeGeometry(smile, 8, 0.016, 5, false), dark, 0, 0, 0, 1, 1, 1);

  for (const [x, y, z] of [[-0.28, 0.25, 0.17], [-0.34, 0.16, 0.18], [-0.38, 0.06, 0.16]]) {
    part(head, 'sphere', petal, x, y, z, 0.077, 0.065, 0.055);
    part(head, 'sphere', highlights, x, y, z + 0.047, 0.029, 0.029, 0.025);
  }

  const arms = [-1, 1].map(side => {
    const shoulder = addGroup(THREE, actor, side > 0 ? 'Rapunzel waving shoulder' : 'Rapunzel resting shoulder',
      side * 0.295, 1.41, 0.015);
    part(shoulder, 'sphere', pleat, 0, -0.035, 0, 0.165, 0.196, 0.152);
    part(shoulder, 'sphere', trim, 0, -0.16, 0, 0.117, 0.068, 0.11);
    part(shoulder, 'sphere', linen, 0, -0.245, 0, 0.075, 0.17, 0.077);
    const elbow = addGroup(THREE, shoulder, side > 0 ? 'Rapunzel waving elbow' : 'Rapunzel resting elbow', 0, -0.36, 0.012);
    part(elbow, 'sphere', linen, 0, -0.131, 0.012, 0.065, 0.164, 0.071);
    part(elbow, 'sphere', linen, 0, -0.30, 0.029, 0.084, 0.119, 0.050);
    part(elbow, 'sphere', linen, -0.063, -0.29, 0.036, 0.041, 0.069, 0.035).rotation.z = -0.44;
    return { shoulder, elbow };
  });
  const [left, right] = arms;
  left.shoulder.rotation.set(-0.70, 0.17, -0.41);
  left.elbow.rotation.set(-0.44, 0, 0.18);

  let blend = 0;
  let time = 0;
  let breathing = 0;

  function pose(wave) {
    right.shoulder.rotation.set(-0.34 + blend * 0.17, -blend * 0.25, 0.28 + blend * 1.88);
    right.elbow.rotation.set(-0.52 + blend * 0.34, blend * 0.28, 0.10 + blend * (0.85 + wave));
  }

  function reset() {
    blend = 0;
    time = breathing = 0;
    head.rotation.y = 0;
    left.shoulder.rotation.x = -.70;
    pose(0);
  }

  return {
    reset,
    update(dt, onPlatform, still) {
      if (!still) breathing += dt;
      head.rotation.y = still ? 0 : .10 * Math.sin(breathing * 1.16);
      left.shoulder.rotation.x = -.70 + (still ? 0 : .037 * Math.sin(breathing * 1.6));
      if (!onPlatform && blend === 0) return;
      const target = Number(onPlatform);
      blend = still ? target : blend + (target - blend) * (1 - Math.exp(-dt * 12));
      if (Math.abs(target - blend) < 0.001) blend = target;
      if (still || blend === 0) time = 0;
      else if (onPlatform) time += dt;
      pose(Math.sin(time * 8.4) * 0.48);
    },
  };
}
