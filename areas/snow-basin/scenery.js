import { addMesh, paintCanvasTexture, rectangleBounds, SURFACE_GAP } from '../../core/geometry.js';

export function addWinterScenery({ THREE, scene, touch, width, depth, ground, document }) {
  const obstacles = [];
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cone = new THREE.ConeGeometry(1, 1, 5);
  const rock = new THREE.DodecahedronGeometry(1);
  const log = new THREE.CylinderGeometry(1, 1, 1, 7);
  const crystal = new THREE.OctahedronGeometry(1);
  const hemisphere = new THREE.HemisphereLight(0xe8f5ff, 0x7087a7, 1.85);
  const sun = new THREE.DirectionalLight(0xe1efff, 2.3);
  sun.position.set(-13, 29, -12);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(touch ? 512 : 1024);
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 0.5, far: 72 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.normalBias = 0.028;
  scene.add(hemisphere, sun);
  scene.background = new THREE.Color(0xadc8d8);
  scene.fog = new THREE.Fog(0xadc8d8, 24, 72);

  const materials = new Map();
  function material(color) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshLambertMaterial({ color }));
    return materials.get(color);
  }
  const frost = 0xe4eff4;
  const ridge = 0x819baa;
  const slate = 0x597686;
  const pine = 0x254d53;
  const wood = 0x664833;
  const batches = new Map();
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();

  // Cull scenery in groups by zone. Instance colours keep each primitive to one material.
  function part(shape, color, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    const column = x < -15 ? 'west' : x > 15 ? 'east' : 'center';
    const row = z < -15 ? 'north' : z > 15 ? 'south' : 'middle';
    const key = shape.id + '/' + column + '/' + row;
    if (!batches.has(key)) batches.set(key, { shape, pieces: [] });
    batches.get(key).pieces.push([color, x, y, z, sx, sy, sz, rx, ry, rz]);
  }

  function mesh(geometry, surface, x, y, z, sx, sy, sz, shadow = false, parent = scene) {
    const object = addMesh(THREE, parent, geometry, surface, x, y, z, sx, sy, sz);
    object.castShadow = shadow;
    object.receiveShadow = true;
    return object;
  }

  function block(x, z, sx, sz, height) {
    obstacles.push({ ...rectangleBounds(x, z, sx, sz), height });
  }

  // The distant snowfield joins the horizon to the edge of the playable basin.
  const snowfield = new THREE.PlaneGeometry(114, 112).rotateX(-Math.PI / 2);
  mesh(snowfield, material(0xb4cad8), 0, -0.65, 0, 1, 1, 1);
  const cracks = new THREE.BufferGeometry();
  const crackPoints = [];
  for (const stroke of [
    [[-10.3, -3.5], [-8, -4.1], [-6.7, -3.35], [-4.5, -3.8], [-2.7, -5.2], [-0.2, -5.5], [2.1, -7.1]],
    [[-6.7, -3.35], [-6.2, -1.3], [-4.5, -0.5], [-3.6, 1.2], [-1.5, 1.4]],
    [[-4.5, -3.8], [-3.15, -2.2], [-1, -2.75], [0.7, -1.8], [2.3, -2.3], [4.1, -1.3]],
    [[-8.3, -7.5], [-7.4, -7.85], [-6.0, -7.5], [-5, -8.8], [-3.65, -9.05]],
    [[-8.5, 2.85], [-6.7, 3.15], [-5.4, 2.4], [-3.2, 3.4], [-2.1, 3.05]],
    [[-1.5, 1.4], [-0.4, 2.1], [1.42, 1.92]],
  ]) {
    for (let i = 1; i < stroke.length; i++) {
      for (const [x, z] of [stroke[i - 1], stroke[i]]) crackPoints.push(x, ground(x, z) + SURFACE_GAP.detail, z);
    }
  }
  cracks.setAttribute('position', new THREE.Float32BufferAttribute(crackPoints, 3));
  const iceVeins = new THREE.LineSegments(cracks, new THREE.LineBasicMaterial({ color: 0xc5e8ef }));
  iceVeins.name = 'Frozen lake veins';
  scene.add(iceVeins);

  function boulder(x, z, size) {
    const y = ground(x, z);
    part(rock, slate, x, y + size * 0.29, z, size, size * 0.47, size * 0.73, 0, x);
    part(rock, frost, x - 0.1, y + size * 0.63, z, size * 0.8, size * 0.21, size * 0.65, 0, x);
    block(x, z, size * 1.55, size * 1.25, y + size * 0.82);
  }

  for (const [x, z, size] of [
    [-12.9, -6.5, 0.9], [6.6, -4.6, 0.72], [-13.6, 1.8, 1.15], [5.8, 3.2, 0.93],
    [-22, -13, 1.5], [-27, 12, 1.25], [-16, 21, 1.2], [14.4, 22.3, 1.4],
    [20.5, -9.9, 1.65], [27, 4, 1.2], [22, 13, 1.2], [27, -19, 1.55],
    [-13, -18, 1.35], [2, -17, 1.18], [-9.6, 10.5, 0.86], [6.7, 12.4, 0.95], [26.1, -0.4, 1.15],
  ]) boulder(x, z, size);

  for (const [x, z, scale] of [
    [-9.5, 7.8, 0.95], [-13.8, -2.7, 1.1], [-12.3, -8.5, 0.8], [-9.1, -12.2, 1.05], [-4.3, -14.1, 0.72],
    [7.5, 5.4, 1.03], [12.9, 5.2, 0.86], [6.6, -7.1, 1.02], [7.5, -7.7, 1.15], [5.9, -10.4, 0.68],
    [-12.2, 4.9, 1.16], [-13.7, -7.4, 1.02], [13.7, -7.8, 1.02], [14.2, 8.3, 1.15],
    [18, -5, 1.25], [21, -8, 0.8], [25.6, -14.4, 1.4], [27, -16, 1.1], [29, -10, 1.4],
    [25, -4, 1.2], [24.9, 0.9, 0.8], [28, 0, 1.35], [29, 7, 0.95], [20.1, 10.2, 1.5], [18, 12, 0.85],
    [24, 12, 1.15], [26, 16, 1.3], [20, 18, 0.95], [29, 20, 1.2], [21, 24, 1.25], [11, 25, 1.15],
    [7, 27, 1.32], [2, 28, 0.88], [-13, 26, 1.2], [-17, 24, 0.95], [-23, 23, 1.3], [-29.1, 16.8, 1.2],
    [-29, 5, 0.9], [-29, -2, 1.4], [-25, -11, 1.2], [-20, -9, 0.86], [-16, -15, 1.25],
    [-8, -15.5, 0.84], [5, -15.5, 1.08], [22, -20, 0.92], [25, -24, 1.34], [29, -25, 1.15],
    [-24, -26.5, 1.18], [-29, -25, 1.38],
  ]) {
    const y = ground(x, z);
    part(box, 0x4d5155, x, y + 0.55 * scale, z, 0.25 * scale, 1.1 * scale, 0.25 * scale);
    block(x, z, 0.27 * scale, 0.27 * scale, y + 1.1 * scale);
    for (let tier = 0; tier < 3; tier++) {
      const radius = (1.03 - tier * 0.23) * scale;
      const center = (1.24 + tier * 0.74) * scale;
      const tierHeight = 1.52 * scale;
      const capHeight = 1.07 * scale;
      const capY = center + 0.26 * scale;
      const capRadius = radius * (center + tierHeight / 2 - capY + capHeight / 2) / tierHeight + SURFACE_GAP.trim;
      part(cone, pine, x, y + center, z, radius, tierHeight, radius, 0, x);
      part(cone, frost, x, y + capY, z, capRadius, capHeight, capRadius, 0, x);
    }
  }

  for (const [x, z, scale] of [
    [-9.5, -10.1, 0.55], [4.45, -6.9, 0.68], [-11.8, 3.6, 0.42], [4.4, 3.4, 0.38],
    [22, -13, 0.96], [25.2, -1.2, 0.72], [15.0, 5.9, 0.9], [29.2, 12.6, 1.03],
    [-15.8, -20.8, 1.14], [-11.6, -27.4, 1.14], [-1.6, -27.4, 0.88], [-24.8, -17.4, 0.74],
  ]) {
    for (const [dx, dz, height, tilt] of [[0, 0, 0.83, 0.08], [0.42, -0.1, 0.53, -0.31], [-0.42, 0.16, 0.62, 0.32]]) {
      const cx = x + dx * scale;
      const cz = z + dz * scale;
      part(crystal, height > 0.8 ? 0x80c5e2 : 0xaee6f2, cx, ground(cx, cz) + height * 0.63 * scale,
        cz, 0.27 * scale, height * scale, 0.26 * scale, tilt * 0.5, x, tilt);
    }
  }

  for (const [x, z, sx, sz] of [
    [-29, -9, 2.7, 1.42], [-25, -5, 2.3, 1.15], [-21, -5.7, 2.25, 1.04], [-17, -7.1, 1.6, 0.96],
    [-29, 10, 1.45, 2.75], [-23, 11, 2.8, 1], [-19, 11, 1.9, 1.14], [-28.7, 21.6, 1.7, 1.35],
    [18, 21, 2.9, 1.23], [27, 22, 2.4, 1.6], [24, 3.2, 1.65, 1.35], [18, -3, 2.4, 1],
    [-17, -11, 2.5, 1.5], [-10, -17, 1.75, 1.3], [-22, -28, 2.6, 1.1],
  ]) part(rock, frost, x, ground(x, z) - 0.14, z, sx, 0.48, sz, 0, x * 0.42);

  // Drifts at the edges of the basin and distant peaks keep the playable boundary legible.
  for (let i = -3; i <= 3; i++) {
    for (const side of [-1, 1]) {
      part(rock, frost, side * (width / 2 + 0.46), 0.01, i * 8.44, 1.6, 0.94, 5.35, 0, i * 0.07);
      part(rock, frost, i * 9.13, 0.03, side * (depth / 2 + 0.44), 5.2, 0.95, 1.7, 0, i * 0.09);
    }
  }
  for (const [x, z, span, height] of [
    [-39, -38, 9, 14], [-28, -45, 10, 17], [-14, -39, 10, 18], [1, -46, 14, 20],
    [17, -42, 10, 15], [30, -41, 12, 20], [43, -36, 10, 14], [-44, -16, 9, 12], [43, -10, 10, 13],
    [-42, 12, 11, 12], [43, 15, 10, 13], [-29, 41, 11, 16], [-11, 44, 12, 12], [15, 44, 11, 17], [34, 41, 9, 12],
  ]) {
    const angle = x * 0.22;
    part(cone, ridge, x, height / 2 - 0.8, z, span, height, span * 0.8, 0, angle);
    part(cone, frost, x, height * 0.74 - 0.7, z, span * 0.56, height * 0.52, span * 0.445, 0, angle);
  }

  function timber(x, y, z, length, radius) {
    part(log, wood, x, y, z, radius, length, radius, 0, 0, Math.PI / 2);
    for (const side of [-1, 1]) {
      part(log, 0xcba77e, x + side * (length / 2 + SURFACE_GAP.detail), y, z, radius * 0.81, 0.024, radius * 0.81, 0, 0, Math.PI / 2);
    }
  }

  for (const [x, z, length, radius] of [[24, -8, 2.7, 0.38], [24, 8.5, 3.15, 0.42], [-25, -7.5, 2.65, 0.35]]) {
    const y = ground(x, z);
    timber(x, y + radius * 0.8, z, length, radius);
    part(rock, frost, x, y + radius * 1.65, z, length * 0.44, radius * 0.28, radius * 0.78);
    block(x, z, length, radius * 1.66, y + radius * 1.8);
  }

  function fence(x, z, count, alongX = true) {
    const space = 1.78;
    for (let i = 0; i <= count; i++) {
      const px = x + (alongX ? i * space : 0);
      const pz = z + (alongX ? 0 : i * space);
      const y = ground(px, pz);
      part(box, wood, px, y + 0.47, pz, 0.19, 0.94, 0.19);
      part(rock, frost, px, y + 0.94, pz, 0.16, 0.09, 0.16);
      if (i === count) continue;
      const cx = px + (alongX ? space / 2 : 0);
      const cz = pz + (alongX ? 0 : space / 2);
      for (const h of [0.33, 0.66]) {
        part(box, 0x956d4e, cx, y + h, cz, alongX ? space : 0.1, 0.115, alongX ? 0.1 : space);
      }
    }
    const length = count * space;
    const cx = x + (alongX ? length / 2 : 0);
    const cz = z + (alongX ? 0 : length / 2);
    block(cx, cz, alongX ? length + 0.2 : 0.2, alongX ? 0.2 : length + 0.2, ground(cx, cz) + 0.95);
  }

  fence(-24.6, -4, 3);
  fence(-24.6, 10.2, 3);
  fence(-28, 3.3, 2, false);
  fence(-12.5, 21.8, 3, false);
  fence(-12.5, 27.14, 3);
  fence(3.7, 24, 2, false);

  function sign(x, z, title, yaw = 0) {
    const y = ground(x, z);
    const post = new THREE.Group();
    post.name = title;
    post.position.set(x, y, z);
    post.rotation.y = yaw;
    scene.add(post);
    part(box, wood, x, y + 0.58, z, 0.15, 1.16, 0.17);
    mesh(box, material(0x866143), 0, 1.15, 0, 1.37, 0.42, 0.13, false, post);
    mesh(box, material(frost), 0, 1.37, 0, 1.42, 0.075, 0.19, false, post);
    const map = paintCanvasTexture(THREE, document, 256, 72, ink => {
      ink.fillStyle = '#39291f';
      ink.fillRect(0, 0, 256, 72);
      ink.strokeStyle = '#d4b48b';
      ink.lineWidth = 3;
      ink.strokeRect(5, 5, 246, 62);
      ink.fillStyle = '#fff2d6';
      ink.font = 'bold 25px sans-serif';
      ink.textAlign = 'center';
      ink.textBaseline = 'middle';
      ink.fillText(title, 128, 36);
    });
    if (map) {
      const face = new THREE.MeshBasicMaterial({ map });
      mesh(new THREE.PlaneGeometry(1.24, 0.35), face, 0, 1.15, 0.065 + SURFACE_GAP.detail, 1, 1, 1, false, post);
    }
  }

  sign(14.5, -12.7, 'ICE MOUNTAIN');
  sign(-18.2, 5, 'SNOW PLAY', Math.PI / 2);
  sign(-7.3, 16, 'WINTER CABIN', Math.PI);
  sign(15, 2.4, 'ICE TOWER', -Math.PI / 2);
  sign(-2.9, 8.2, 'FROZEN LAKE', Math.PI);

  // Shore lights and resting places mark the way around the ice.
  for (const [x, z] of [[-11.7, 6.1], [-7.4, 8.2], [3.8, 6.8], [7.2, -7.7], [-3.2, -14.3], [-13.2, -9.8], [-24.8, 21.6]]) {
    const y = ground(x, z);
    part(box, wood, x, y + 0.49, z, 0.11, 0.98, 0.11);
    part(box, 0x39414a, x, y + 0.96, z, 0.28, 0.09, 0.28);
    part(box, 0xf7be73, x, y + 1.1, z, 0.19, 0.21, 0.19);
    part(cone, 0x39414a, x, y + 1.25, z, 0.22, 0.14, 0.22);
    part(rock, frost, x, y + 1.31, z, 0.12, 0.06, 0.12);
  }
  for (const [x, z] of [[-6.9, 9.1], [4.7, 8.4], [-11.5, -10.9]]) {
    const y = ground(x, z);
    for (const dx of [-0.64, 0.64]) part(box, wood, x + dx, y + 0.22, z, 0.17, 0.44, 0.36);
    part(box, 0xa97651, x, y + 0.48, z, 1.64, 0.11, 0.45);
    part(box, 0x946343, x, y + 0.78, z + 0.2, 1.64, 0.24, 0.10);
    block(x, z, 1.63, 0.48, y + 0.9);
  }

  for (const [x, z] of [[-12.4, 7.2], [8.7, 7.6], [21.4, 14.6], [5.7, 24.3]]) {
    const y = ground(x, z);
    part(box, wood, x, y + 0.23, z, 0.48, 0.46, 0.48, 0, x * 0.13);
    part(box, 0xac7955, x, y + 0.47, z, 0.5, 0.06, 0.5, 0, x * 0.13);
    block(x, z, 0.49, 0.49, y + 0.5);
  }

  for (const [x, z] of [[19, -13], [19, -16], [18, -18.7], [16.1, -21.8], [16, -24.6],
    [13.9, -27.8], [10.1, -29], [6.1, -28.6], [2.5, -26.6], [-0.5, -26.1]]) {
    const y = ground(x, z);
    part(box, wood, x, y + 0.29, z, 0.14, 0.7, 0.14);
    part(box, 0x8ed2eb, x, y + 0.59, z, 0.19, 0.16, 0.19);
    part(rock, frost, x, y + 0.68, z, 0.14, 0.06, 0.15);
  }

  addCabin();

  function addCabin() {
    const x = -7.4;
    const z = 23.7;
    const planks = [0x916341, 0x81563a, 0x9d6e48];
    // The shell casts one static shadow. Its trim and campsite share the scenery batches.
    const cabin = mesh(box, material(planks[0]), x, 1.27, z, 6.1, 2.55, 4.2, true);
    cabin.name = 'Snow-covered log cabin';
    block(x, z, 6.2, 4.3, 2.55);
    for (let i = 0; i < 8; i++) {
      const y = 0.19 + i * 0.31;
      for (const side of [-1, 1]) {
        part(box, planks[i % 3], x, y, z + side * 2.12, 6.24, 0.28, 0.18);
        part(box, planks[(i + 1) % 3], x + side * 3.07, y, z, 0.19, 0.28, 4.01);
      }
    }
    const halfSpan = 3.5;
    const rise = 1.87;
    const pitch = Math.atan2(rise, halfSpan);
    const slope = Math.hypot(halfSpan, rise);
    const ridgeY = 4.43;
    const gable = new THREE.Shape().moveTo(-3.08, 0).lineTo(3.08, 0).lineTo(0, 1.65).closePath();
    mesh(new THREE.ExtrudeGeometry(gable, { depth: 4.2, bevelEnabled: false }), material(0x805a40),
      x, 2.52, z - 2.1, 1, 1, 1);
    for (const side of [-1, 1]) {
      const sx = x + side * halfSpan / 2;
      const y = ridgeY - rise / 2;
      const rz = -side * pitch;
      part(box, 0x503726, sx, y, z, slope, 0.21, 4.93, 0, 0, rz);
      part(box, frost, sx, y + 0.15 + SURFACE_GAP.roof, z, slope + 0.08, 0.2, 5.01, 0, 0, rz);
      for (let i = 0; i < 5; i++) {
        const length = 0.21 + (i % 3) * 0.083;
        part(cone, 0xa8d0e1, x + side * (halfSpan - i * 0.13),
          2.59 + i * 0.073 - length * 0.47, z - 2.49, 0.082, length, 0.082, Math.PI);
      }
    }
    part(box, slate, x - 1.78, 4.14, z + 0.94, 0.68, 1.52, 0.64);
    part(box, frost, x - 1.78, 4.91, z + 0.94, 0.78, 0.14, 0.75);
    const front = z - 2.23;
    part(box, 0x593c2e, x, 1, front, 0.99, 2, 0.15);
    part(box, 0xd2a46c, x - 0.31, 1.01, front - 0.097, 0.11, 0.12, 0.08);
    for (const side of [-1, 1]) {
      const wx = x + side * 1.9;
      part(box, 0x533a2e, wx, 1.52, front, 1.28, 1.04, 0.16);
      part(box, 0xffca79, wx, 1.52, front - 0.09, 1.04, 0.81, 0.044);
      part(box, 0x533a2e, wx, 1.52, front - 0.124, 0.07, 0.84, 0.044);
      part(box, 0x533a2e, wx, 1.52, front - 0.124, 1.06, 0.075, 0.044);
      part(box, frost, wx, 1.03, front - 0.095, 1.36, 0.12, 0.28);
    }

    for (const [dx, dy, dz] of [[0, 0, 0], [0, 0, 0.37], [0, 0, 0.74], [0.09, 0.29, 0.19], [0.09, 0.29, 0.56]]) {
      timber(-11.1 + dx, 0.17 + dy, 23.15 + dz, 1.55, 0.18);
    }
    block(-11.1, 23.52, 1.6, 1.12, 0.64);

    // Sled rails curl up at the nose, with crosspieces and boards above them.
    for (const side of [-1, 1]) {
      const sx = 1 + side * 0.47;
      part(box, 0x603a30, sx, 0.12, 23.6, 0.12, 0.15, 2.02);
      part(box, 0x603a30, sx, 0.24, 22.47, 0.12, 0.15, 0.43, 0.54);
      for (const sz of [23.07, 24.25]) part(box, wood, sx, 0.27, sz, 0.13, 0.27, 0.14);
    }
    for (const sz of [23.07, 24.25]) part(box, wood, 1, 0.43, sz, 1.14, 0.12, 0.14);
    for (let i = -2; i <= 2; i++) part(box, 0xbd8b56, 1 + i * 0.196, 0.52, 23.58, 0.18, 0.09, 1.73);
    block(1, 23.54, 1.12, 2.22, 0.56);

    const lanternX = -2.85;
    const lanternZ = 23.49;
    part(log, wood, lanternX, 0.25, lanternZ, 0.34, 0.5, 0.32);
    part(log, 0xcba77e, lanternX, 0.502 + SURFACE_GAP.detail, lanternZ, 0.3, 0.024, 0.29);
    const glow = new THREE.MeshBasicMaterial({ color: 0xffb95e });
    mesh(box, glow, lanternX, 0.75, lanternZ, 0.23, 0.32, 0.23);
    for (const dx of [-0.13, 0.13]) {
      for (const dz of [-0.13, 0.13]) part(box, 0x403134, lanternX + dx, 0.74, lanternZ + dz, 0.038, 0.36, 0.038);
    }
    part(box, 0x403134, lanternX, 0.56, lanternZ, 0.32, 0.07, 0.32);
    part(cone, 0x403134, lanternX, 0.97, lanternZ, 0.23, 0.17, 0.23);
    block(lanternX, lanternZ, 0.57, 0.57, 1.04);
    timber(-1.6, 0.25, 25.15, 1.92, 0.27);
    block(-1.6, 25.15, 1.9, 0.48, 0.52);
    for (let i = 0; i < 7; i++) {
      const angle = i * Math.PI * 2 / 7;
      part(rock, slate, -2.6 + Math.cos(angle) * 0.76, 0.08, 25.25 + Math.sin(angle) * 0.76, 0.24, 0.19, 0.24, 0, i);
    }
  }

  const instancedMaterial = material(0xffffff);
  for (const { shape, pieces } of batches.values()) {
    const batch = new THREE.InstancedMesh(shape, instancedMaterial, pieces.length);
    batch.receiveShadow = true;
    for (const [i, [color, x, y, z, sx, sy, sz, rx, ry, rz]] of pieces.entries()) {
      dummy.position.set(x, y, z);
      dummy.scale.set(sx, sy, sz);
      dummy.rotation.set(rx, ry, rz);
      dummy.updateMatrix();
      batch.setMatrixAt(i, dummy.matrix);
      batch.setColorAt(i, tint.setHex(color));
    }
    batch.computeBoundingSphere();
    scene.add(batch);
  }

  return { obstacles, box, cone, material, mesh, block };
}
