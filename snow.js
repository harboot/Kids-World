export const snowLevel = {
  width: 18,
  depth: 20,
  spawn: { x: 0, z: 6 },
  passage: { x: 0, z: -9.48, href: './index.html', label: 'Return to Flower Garden' },
  build: buildSnowArena,
};

function buildSnowArena(THREE, scene, touch) {
  const { width, depth } = snowLevel;
  const obstacles = [];
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cone = new THREE.ConeGeometry(1, 1, 5);
  const rock = new THREE.DodecahedronGeometry(1);
  const hemisphere = new THREE.HemisphereLight(0xe8f5ff, 0x7087a7, 1.85);
  const sun = new THREE.DirectionalLight(0xe1efff, 2.3);
  sun.position.set(-7, 13, -6);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(touch ? 512 : 1024);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 0.5, far: 42 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.normalBias = 0.025;
  scene.add(hemisphere, sun);
  scene.background = new THREE.Color(0xadc8d8);
  scene.fog = new THREE.Fog(0xadc8d8, 16, 55);

  const material = color => new THREE.MeshLambertMaterial({ color });
  const snow = material(0xd1e3ec);
  const frost = material(0xe4eff4);
  const ridge = material(0x718c9e);
  const slate = material(0x4e6a7a);
  const pine = material(0x254d53);
  const wood = material(0x4d5155);
  const ice = material(0x77a8bc);

  function mesh(geometry, surface, x, y, z, sx, sy, sz, shadow = false) {
    const object = new THREE.Mesh(geometry, surface);
    object.position.set(x, y, z);
    object.scale.set(sx, sy, sz);
    object.castShadow = shadow;
    object.receiveShadow = true;
    scene.add(object);
    return object;
  }

  function block(x, z, sx, sz, height) {
    obstacles.push({ left: x - sx / 2, right: x + sx / 2, front: z - sz / 2, back: z + sz / 2, height });
  }

  mesh(box, snow, 0, -0.15, 0, width, 0.3, depth);
  // Snowbanks mark the boundary while leaving the horizon open.
  for (const side of [-1, 1]) {
    mesh(box, slate, side * (width / 2 + 0.3), 0.42, 0, 0.64, 0.84, depth + 1, true);
    mesh(box, frost, side * (width / 2 + 0.29), 0.83, 0, 0.7, 0.18, depth + 1, true);
    mesh(box, slate, 0, 0.42, side * (depth / 2 + 0.3), width, 0.84, 0.64, true);
    mesh(box, frost, 0, 0.83, side * (depth / 2 + 0.29), width, 0.18, 0.7, true);
  }

  const pond = new THREE.CylinderGeometry(1, 1, 1, 7);
  mesh(pond, frost, 0, 0.006, -0.7, 4.45, 0.025, 5.1).rotation.y = 0.29;
  mesh(pond, ice, 0, 0.022, -0.7, 4.17, 0.018, 4.8).rotation.y = 0.29;
  const cracks = new THREE.BufferGeometry();
  cracks.setAttribute('position', new THREE.Float32BufferAttribute([
    -3.25, 0.032, -0.2, -1.4, 0.032, -1.1, -1.4, 0.032, -1.1, 0.1, 0.032, -0.9,
    0.1, 0.032, -0.9, 1.05, 0.032, -2.1, 1.05, 0.032, -2.1, 2.15, 0.032, -2.4,
    0.1, 0.032, -0.9, 0.75, 0.032, 0.1, 0.75, 0.032, 0.1, 2.38, 0.032, 0.7,
    0.75, 0.032, 0.1, 0.2, 0.032, 1.65,
  ], 3));
  scene.add(new THREE.LineSegments(cracks, new THREE.LineBasicMaterial({ color: 0xb6d8e4 })));

  for (const [x, z, size] of [[-6.4, -5.7, 0.9], [6.6, -4.6, 0.72], [-6.2, 1.8, 1.15], [5.8, 3.2, 0.93]]) {
    mesh(rock, slate, x, size * 0.29, z, size, size * 0.47, size * 0.73, true).rotation.y = x;
    mesh(rock, frost, x - 0.1, size * 0.63, z, size * 0.8, size * 0.21, size * 0.65).rotation.y = x;
    block(x, z, size * 1.55, size * 1.25, size * 0.82);
  }

  for (const [x, z, scale] of [
    [-7.3, 5.4, 0.95], [-7.7, -1.7, 1.1], [-5.1, -4.5, 0.8], [-6.1, -8.2, 1.05], [-3.7, -8.3, 0.72],
    [7.5, 5.4, 1.03], [7.2, 0.2, 0.86], [5.1, -5.9, 1.02], [7.5, -7.7, 1.15], [3.9, -8.6, 0.68],
  ]) {
    mesh(box, wood, x, 0.55 * scale, z, 0.25 * scale, 1.1 * scale, 0.25 * scale, true);
    block(x, z, 0.27 * scale, 0.27 * scale, 1.1 * scale);
    for (let tier = 0; tier < 3; tier++) {
      const radius = (1.03 - tier * 0.23) * scale;
      const y = (1.24 + tier * 0.74) * scale;
      mesh(cone, pine, x, y, z, radius, 1.52 * scale, radius, true).rotation.y = x;
      mesh(cone, frost, x, y + 0.26 * scale, z, radius * 0.68, 1.07 * scale, radius * 0.68).rotation.y = x;
    }
  }

  for (const [x, z, span, height] of [
    [-24, -27, 10, 15], [-15, -24, 8, 12], [-9, -32, 13, 18],
    [4, -36, 12, 17], [15, -27, 10, 20], [24, -26, 9, 13],
    [-24, 1, 9, 11], [23, 1, 9, 11], [-12, 27, 11, 15], [9, 26, 13, 13],
  ]) {
    const angle = x * 0.22;
    mesh(cone, ridge, x, height / 2 - 0.8, z, span, height, span * 0.8).rotation.y = angle;
    mesh(cone, frost, x, height * 0.74 - 0.7, z, span * 0.56, height * 0.52, span * 0.445).rotation.y = angle;
  }

  return { obstacles };
}
