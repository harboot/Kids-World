const game = document.querySelector('#game');
const canvas = document.querySelector('#view');
const start = document.querySelector('#start');
const startLabel = document.querySelector('#start-label');
const restart = document.querySelector('#restart');
const fullscreen = document.querySelector('#fullscreen');
const menuMessage = document.querySelector('#menu-message');
const notice = document.querySelector('#notice');
const scoreOutput = document.querySelector('#score');
const crosshair = document.querySelector('.crosshair');
const padButtons = [...document.querySelectorAll('.dpad button')];

const RANGE = { width: 45, depth: 48, eye: 1.68, radius: 0.34 };
const SPAWN = { x: 0, z: 10 };
const GOAL = 10;
const WAVE_SIZE = 3;
const FIRE_INTERVAL = 0.2;
const WAVE_DELAY = 0.5;
const SHOT_RANGE = 72;
const JUMP_SPEED = 6.3;
const GRAVITY = 15;
const TOUCH_AIM_SPEED = 0.004;
const MOUSE_AIM_SPEED = 0.0022;
const touchDevice = matchMedia('(pointer: coarse)').matches ||
  (navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches);

game.dataset.input = touchDevice ? 'touch' : 'mouse';

function showError(message) {
  game.dataset.state = 'error';
  menuMessage.textContent = message;
  notice.textContent = '';
  start.hidden = true;
  restart.disabled = true;
}

async function boot() {
  let THREE;
  try {
    THREE = await import('https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.js');
  } catch (error) {
    console.error(error);
    showError('Three.js failed to load. Check your internet connection and reload the page.');
    return;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !touchDevice, powerPreference: 'high-performance' });
  } catch {
    showError('WebGL 2 is unavailable. Enable hardware acceleration or try a browser that supports WebGL 2.');
    return;
  }

  playRange(THREE, renderer);
}

function buildArena(THREE, scene, touch) {
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const solidMeshes = [];
  const obstacles = [];
  const boxBatches = new Map();
  const transform = new THREE.Object3D();
  const matte = color => new THREE.MeshLambertMaterial({ color });
  const materials = {
    floor: matte(0x626353),
    slab: matte(0x787966),
    wall: matte(0x454b44),
    facade: matte(0x535c51),
    post: matte(0x343d38),
    concrete: matte(0x6b7062),
    crate: matte(0x7b7054),
    crateDark: matte(0x514b37),
    rail: matte(0x2e3731),
    rust: matte(0x875c3e),
    stripe: matte(0xc69151),
    paint: matte(0x94967b),
    darkPaint: matte(0x56594a),
    bark: matte(0x554935),
    foliage: matte(0x506745),
    lamp: new THREE.MeshBasicMaterial({ color: 0xffc373, toneMapped: false }),
  };

  function box(x, y, z, width, height, depth, material, solid = false, shadow = false) {
    transform.position.set(x, y, z);
    transform.scale.set(width, height, depth);
    transform.updateMatrix();
    if (!boxBatches.has(material)) boxBatches.set(material, [[], []]);
    boxBatches.get(material)[Number(shadow)].push(transform.matrix.clone());
    if (solid) {
      const collider = new THREE.Mesh(unitBox, material);
      collider.matrixWorld.copy(transform.matrix);
      solidMeshes.push(collider);
    }
  }

  function barrier(x, z, width, height, depth, material) {
    box(x, height / 2, z, width, height, depth, material, true, true);
    obstacles.push({
      left: x - width / 2, right: x + width / 2,
      front: z - depth / 2, back: z + depth / 2,
      height,
    });
  }

  scene.fog = new THREE.Fog(0xaba897, 20, 92);
  scene.add(new THREE.HemisphereLight(0xf5f2d7, 0x62604a, 1.5));
  const sun = new THREE.DirectionalLight(0xffe0a9, 2.3);
  sun.position.set(-15, 23, -20);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(touch ? 512 : 1024);
  Object.assign(sun.shadow.camera, { left: -35, right: 35, top: 33, bottom: -33, near: 0.5, far: 82 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.normalBias = 0.035;
  scene.add(sun, sun.target);

  const halfWidth = RANGE.width / 2;
  const halfDepth = RANGE.depth / 2;
  const wallZ = -halfDepth - 0.45;
  box(0, -0.18, 0, RANGE.width, 0.36, RANGE.depth, materials.floor, true);
  box(0, -0.035, -3, 11, 0.08, 36, materials.slab);
  for (let z = -19; z <= 17; z += 4) {
    box(0, 0.02, z, 0.065, 0.025, 1.7, materials.paint);
  }
  for (const x of [-5.5, 5.5, -15.8, 15.8]) {
    box(x, 0.02, -2, 0.05, 0.025, 30, materials.paint);
  }
  for (const z of [-14.1, 4.2, 12.6]) {
    box(0, 0.02, z, 10.6, 0.025, 0.04, materials.darkPaint);
  }

  // The floor marks use one draw call, and their placement stays the same on restart.
  const marks = new THREE.InstancedMesh(unitBox, materials.darkPaint, 156);
  const mark = new THREE.Object3D();
  for (let i = 0; i < marks.count; i++) {
    mark.position.set(Math.sin(i * 95.1) * (halfWidth - 1), 0.028, Math.cos(i * 67.7) * (halfDepth - 1));
    mark.scale.set(0.055 + (i % 7) * 0.025, 0.006, 0.08 + (i % 5) * 0.065);
    mark.rotation.y = i * 1.4;
    mark.updateMatrix();
    marks.setMatrixAt(i, mark.matrix);
  }
  marks.receiveShadow = true;
  scene.add(marks);

  box(0, 2, wallZ, RANGE.width + 1, 4, 0.9, materials.wall, true, true);
  box(0, 1.65, -wallZ, RANGE.width + 1, 3.3, 0.9, materials.wall, true, true);
  box(0, 4.04, wallZ + 0.02, RANGE.width + 1.2, 0.18, 1.05, materials.concrete);
  for (const side of [-1, 1]) {
    box(side * (halfWidth + 0.45), 1.85, 0, 0.9, 3.7, RANGE.depth, materials.wall, true, true);
    box(side * (halfWidth + 0.43), 3.77, 0, 1.05, 0.15, RANGE.depth, materials.concrete);
    for (const z of [-20, -12, -4, 4, 12, 20]) {
      box(side * (halfWidth - 0.09), 1.82, z, 0.26, 3.65, 0.32, materials.post);
      box(side * (halfWidth - 0.24), 2.88, z + 0.3, 0.085, 0.12, 0.55, materials.lamp);
    }
  }

  for (const x of [-19, -15, -11, -7, -3, 3, 7, 11, 15, 19]) {
    box(x, 1.96, wallZ + 0.5, 3.62, 3.44, 0.13, materials.facade);
    box(x - 1.92, 2.05, wallZ + 0.66, 0.24, 4.05, 0.46, materials.post);
    box(x, 0.52, wallZ + 0.66, 3.58, 0.08, 0.14, materials.stripe);
  }

  // An overhead gantry frames the center lane.
  for (const x of [-3.65, 3.65]) {
    barrier(x, -16.6, 0.58, 4.45, 0.65, materials.post);
    box(x, 0.22, -16.6, 0.86, 0.44, 0.92, materials.concrete);
    box(x, 3.36, -16.24, 0.32, 0.63, 0.1, materials.lamp);
  }
  box(0, 4.48, -16.6, 8.32, 0.54, 0.68, materials.rail, true, true);
  box(0, 4.53, -16.23, 7.93, 0.11, 0.08, materials.rust);
  box(0, 4.02, -16.6, 4.8, 0.07, 0.14, materials.lamp);

  function crate(x, z, width, height, depth) {
    barrier(x, z, width, height, depth, materials.crate);
    for (const y of [0.18, height - 0.14]) {
      box(x, y, z, width + 0.08, 0.11, depth + 0.08, materials.crateDark);
    }
    for (const side of [-1, 1]) {
      box(x + side * (width / 2 - 0.17), height / 2, z, 0.10, height + 0.015, depth + 0.075, materials.crateDark);
    }
    box(x, height * 0.64, z + depth / 2 + 0.012, width * 0.38, 0.09, 0.035, materials.stripe);
  }

  crate(-6.4, 4.0, 3.2, 2.05, 2.3);
  crate(6.8, 3.1, 2.8, 1.95, 2.2);
  crate(-8.8, -8.4, 3, 2.42, 2.3);
  crate(8.6, -9.3, 3.5, 2.05, 2.6);
  crate(-12.7, -1.4, 2.2, 1.4, 2.5);
  crate(12.5, -0.1, 2.45, 1.55, 2);
  crate(11.1, -14.7, 2.7, 2.53, 1.8);
  crate(-10.9, 10.7, 3.0, 1.3, 2.3);
  barrier(-2.7, -7.7, 2.1, 0.72, 1.15, materials.concrete);
  barrier(3.7, -5.7, 1.95, 0.75, 1.12, materials.concrete);
  barrier(13.3, 10, 2.3, 1.4, 2.0, materials.concrete);
  crate(-16.6, -15, 3.0, 1.8, 2.2);
  crate(16.2, 15.7, 2.9, 2.1, 2.5);

  for (const [x, z] of [[-14.2, -3], [14.2, -3], [-12.5, 15.5], [12.5, -18]]) {
    const length = 5.2;
    obstacles.push({ left: x - length / 2, right: x + length / 2, front: z - 0.12, back: z + 0.12, height: 0.9 });
    for (const y of [0.33, 0.84]) {
      box(x, y, z, length, 0.12, 0.12, materials.rail, true, true);
    }
    for (const offset of [-2.5, 0, 2.5]) {
      box(x + offset, 0.45, z, 0.2, 0.9, 0.24, materials.post, true, true);
    }
  }

  const treeSpots = [[-18, -9, 1], [17.5, -12, 1.15], [-18.6, 6, 0.85], [19.2, 4, 1], [-8, -21, 0.95], [9.8, -21, 1.1]];
  const crowns = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 5), materials.foliage, treeSpots.length * 2);
  treeSpots.forEach(([x, z, scale], index) => {
    barrier(x, z, 0.42 * scale, 2 * scale, 0.42 * scale, materials.bark);
    for (const tier of [0, 1]) {
      mark.position.set(x, (2.25 + tier * 1.06) * scale, z);
      mark.scale.set((1.33 - tier * 0.36) * scale, 2.25 * scale, (1.33 - tier * 0.36) * scale);
      mark.rotation.y = index * 0.9 + tier * 0.3;
      mark.updateMatrix();
      crowns.setMatrixAt(index * 2 + tier, mark.matrix);
    }
  });
  crowns.castShadow = true;
  crowns.receiveShadow = true;
  scene.add(crowns);

  for (const [material, batches] of boxBatches) {
    batches.forEach((matrices, castsShadow) => {
      if (!matrices.length) return;
      const batch = new THREE.InstancedMesh(unitBox, material, matrices.length);
      matrices.forEach((matrix, index) => batch.setMatrixAt(index, matrix));
      batch.castShadow = Boolean(castsShadow);
      batch.receiveShadow = material !== materials.lamp;
      scene.add(batch);
    });
  }

  const ridgeGeometry = new THREE.CylinderGeometry(0.29, 1, 1, 6, 1, true).toNonIndexed();
  const ridgeVertices = ridgeGeometry.attributes.position;
  for (let i = 0; i < ridgeVertices.count; i++) {
    const x = ridgeVertices.getX(i);
    const y = ridgeVertices.getY(i);
    const z = ridgeVertices.getZ(i);
    if (y < 0) continue;
    const angle = Math.atan2(z, x);
    ridgeVertices.setXYZ(i, x + 0.15, y + Math.cos(angle * 2 + 0.8) * 0.13, z * 0.75);
  }
  ridgeGeometry.computeVertexNormals();
  const ridgeColors = [matte(0x737d70), matte(0x82877a), matte(0x8c8f80)];
  for (let i = 0; i < 11; i++) {
    const ridge = new THREE.Mesh(ridgeGeometry, ridgeColors[i % ridgeColors.length]);
    const height = 8 + (i * 7 % 13);
    ridge.position.set(-49 + i * 9.1, height * 0.26, -33 - (i % 3) * 4.5);
    ridge.scale.set(7 + i % 4, height, 8);
    ridge.rotation.y = i * 0.6;
    scene.add(ridge);
  }

  addSky(THREE, scene);

  scene.updateMatrixWorld(true);
  return { obstacles, solidMeshes };
}

function addSky(THREE, scene) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      upper: { value: new THREE.Color(0x596e70) },
      horizon: { value: new THREE.Color(0xb3b2a0) },
      sunlight: { value: new THREE.Color(0xffd799) },
      sunDirection: { value: new THREE.Vector3(32, 24, -65).normalize() },
    },
    vertexShader: `
      varying vec3 direction;
      void main() {
        direction = position;
        vec4 view = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
        gl_Position = view.xyww;
      }
    `,
    fragmentShader: `
      uniform vec3 upper, horizon, sunlight, sunDirection;
      varying vec3 direction;
      void main() {
        vec3 ray = normalize(direction);
        float elevation = smoothstep(-0.06, 0.55, ray.y);
        float alignment = max(dot(ray, sunDirection), 0.0);
        float glow = pow(alignment, 24.0) * 0.53;
        float disc = smoothstep(0.9981, 0.99845, alignment);
        gl_FragColor = vec4(mix(mix(horizon, upper, elevation), sunlight, max(glow, disc)), 1.0);
        #include <colorspace_fragment>
      }
    `,
  }));
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  scene.add(sky);
}

function createAnimals(THREE, scene) {
  const block = new THREE.BoxGeometry(1, 1, 1);
  const shadowShape = new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: 0x161811, transparent: true, opacity: 0.24, depthWrite: false,
  });
  const palette = Object.fromEntries(Object.entries({
    cream: 0xece2c9, dark: 0x352c29, pink: 0xd59a92,
    red: 0xc5442e, gold: 0xe9a447, buff: 0xb97749, wing: 0x8f573b,
  }).map(([name, color]) => [name, new THREE.MeshLambertMaterial({ color })]));

  function part(parent, color, x, y, z, width, height, depth) {
    const mesh = new THREE.Mesh(block, palette[color]);
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    parent.add(mesh);
    return mesh;
  }

  function leg(parent, x, y, z, length, width, color, footColor) {
    const joint = new THREE.Group();
    joint.position.set(x, y, z);
    part(joint, color, 0, -length / 2, 0, width, length, width);
    part(joint, footColor, 0, -length + width / 3, width / 3, width, width * 2 / 3, width * 1.55);
    parent.add(joint);
    return joint;
  }

  function cow(body, legs) {
    part(body, 'cream', 0, 0.93, 0, 0.83, 0.68, 1.42);
    part(body, 'dark', 0, 1, -0.38, 0.845, 0.58, 0.43);
    part(body, 'dark', 0.42, 0.88, 0.3, 0.03, 0.29, 0.43);
    part(body, 'cream', 0, 1.09, 0.64, 0.41, 0.55, 0.53);
    part(body, 'cream', 0, 1.22, 0.93, 0.47, 0.48, 0.51);
    part(body, 'pink', 0, 1.08, 1.21, 0.49, 0.23, 0.24);
    part(body, 'dark', 0, 0.84, -0.78, 0.08, 0.55, 0.09).rotation.x = 0.34;
    for (const side of [-1, 1]) {
      part(body, 'dark', side * 0.238, 1.29, 1.03, 0.025, 0.078, 0.08);
      part(body, 'pink', side * 0.29, 1.43, 0.88, 0.23, 0.10, 0.16).rotation.z = side * 0.3;
      part(body, 'cream', side * 0.15, 1.53, 0.86, 0.08, 0.19, 0.09).rotation.z = -side * 0.38;
      for (const end of [-1, 1]) {
        legs.push({ joint: leg(body, side * 0.28, 0.63, end * 0.48, 0.63, 0.13, 'cream', 'dark'), phase: side * end });
      }
    }
  }

  function chicken(body, legs, feathers, wing) {
    part(body, feathers, 0, 0.29, 0, 0.28, 0.29, 0.39);
    part(body, feathers, 0, 0.443, 0.15, 0.18, 0.26, 0.17);
    part(body, 'red', 0, 0.583, 0.15, 0.068, 0.08, 0.12);
    part(body, 'red', 0, 0.40, 0.223, 0.07, 0.084, 0.046);
    part(body, 'gold', 0, 0.457, 0.268, 0.10, 0.07, 0.11);
    part(body, wing, 0, 0.39, -0.20, 0.16, 0.09, 0.19).rotation.x = 0.58;
    for (const side of [-1, 1]) {
      part(body, wing, side * 0.144, 0.29, -0.028, 0.05, 0.15, 0.24);
      part(body, 'dark', side * 0.092, 0.493, 0.19, 0.018, 0.033, 0.032);
      legs.push({ joint: leg(body, side * 0.077, 0.17, 0, 0.17, 0.031, 'gold', 'gold'), phase: side });
    }
  }

  function animal(name, build, x, z, rx, rz, pace, offset, width, depth) {
    const root = new THREE.Group();
    root.name = name;
    const body = new THREE.Group();
    const shadow = new THREE.Mesh(shadowShape, shadowMaterial);
    shadow.position.y = 0.016;
    shadow.scale.set(width, 1, depth);
    const legs = [];
    build(body, legs);
    root.add(body, shadow);
    scene.add(root);
    return { root, body, legs, x, z, rx, rz, pace, offset };
  }

  // Small walking loops stay clear of the central lane and static obstacles.
  const animals = [
    animal('Cow', cow, -5.2, -10.8, 0.72, 1.65, 0.43, 1.9, 0.66, 0.92),
    animal('White chicken', (body, legs) => chicken(body, legs, 'cream', 'cream'),
      -3.22, 4.45, 0.88, 0.72, 1.1, 0.6, 0.25, 0.34),
    animal('Brown chicken', (body, legs) => chicken(body, legs, 'buff', 'wing'),
      3.6, 4.65, 0.84, 0.82, -1.04, 2.5, 0.25, 0.34),
  ];

  return function updateAnimals(time) {
    for (const animal of animals) {
      const angle = time * animal.pace + animal.offset;
      const sin = Math.sin(angle);
      const cos = Math.cos(angle);
      animal.root.position.set(animal.x + cos * animal.rx, 0, animal.z + sin * animal.rz);
      animal.root.rotation.y = Math.atan2(-sin * animal.rx * animal.pace, cos * animal.rz * animal.pace);
      const stride = (time * Math.abs(animal.pace) + animal.offset) * 10;
      animal.body.position.y = 0.016 + Math.abs(Math.sin(stride)) * 0.025;
      for (const { joint, phase } of animal.legs) joint.rotation.x = Math.sin(stride) * phase * 0.45;
    }
  };
}

function createTargets(THREE, scene) {
  const spots = [
    [0, 1.68, 0], [-4.2, 1.72, -1.7], [4.5, 1.72, -0.6],
    [-7.4, 3.38, -7.1], [7.8, 3.05, -7.7], [0, 2.34, -13.2],
    [-11.7, 2.8, -5], [11.8, 2.9, -4], [-2, 2.4, -21],
    [0, 3, -22],
  ];
  const coreGeometry = new THREE.IcosahedronGeometry(0.38);
  const ringGeometry = new THREE.TorusGeometry(0.64, 0.044, 6, 22);
  const innerGeometry = new THREE.TorusGeometry(0.47, 0.014, 4, 20);
  const pickGeometry = new THREE.SphereGeometry(0.68, 12, 8);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xff9b48, toneMapped: false });
  const innerMaterial = new THREE.MeshBasicMaterial({ color: 0xffca90, toneMapped: false });
  const coreMaterial = new THREE.MeshLambertMaterial({ color: 0xff943e, emissive: 0xb34d16 });
  const pickMaterial = new THREE.MeshBasicMaterial();
  pickMaterial.visible = false;

  const targets = Array.from({ length: WAVE_SIZE }, (_, index) => {
    const group = new THREE.Group();
    const face = new THREE.Group();
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    const pick = new THREE.Mesh(pickGeometry, pickMaterial);
    const rim = new THREE.Mesh(ringGeometry, ringMaterial);
    const inner = new THREE.Mesh(innerGeometry, innerMaterial);
    face.add(rim, inner);
    group.add(face, core, pick);
    scene.add(group);
    const target = { group, face, core, pick, index, height: 0, pending: false };
    pick.userData.target = target;
    return target;
  });

  let nextSpot = 0;
  let nextWaveAt = Infinity;

  function spawnWave() {
    for (const target of targets) {
      const position = spots[nextSpot];
      target.pending = false;
      target.group.visible = Boolean(position);
      if (position) {
        target.group.position.set(...position);
        target.height = position[1];
        target.group.updateMatrixWorld(true);
        nextSpot++;
      }
    }
    nextWaveAt = Infinity;
  }

  function reset() {
    nextSpot = 0;
    spawnWave();
  }

  function hide(target, time) {
    target.group.visible = false;
    if (nextSpot < spots.length && targets.every(other => !other.group.visible)) {
      nextWaveAt = time + WAVE_DELAY;
    }
  }

  function update(camera, time) {
    if (time >= nextWaveAt) spawnWave();
    for (const target of targets) {
      if (!target.group.visible) continue;
      target.group.position.y = target.height + Math.sin(time * 2.25 + target.index) * 0.10;
      target.face.lookAt(camera.position);
      target.core.rotation.set(time * 0.8, time * 1.35, target.index);
      target.group.updateMatrixWorld(true);
    }
  }

  return { reset, hide, update, targets };
}

function createWeapon(THREE, scene) {
  const weapon = new THREE.Group();
  weapon.scale.setScalar(0.86);
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const body = new THREE.MeshLambertMaterial({ color: 0x39413b });
  const dark = new THREE.MeshLambertMaterial({ color: 0x212923 });
  const panels = new THREE.MeshLambertMaterial({ color: 0x6b7160 });
  const accent = new THREE.MeshBasicMaterial({ color: 0xfaba68, toneMapped: false });

  function part(x, y, z, width, height, depth, material) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    weapon.add(mesh);
    return mesh;
  }

  part(0, 0, -0.07, 0.22, 0.18, 0.47, body);
  part(0, 0.085, -0.12, 0.19, 0.054, 0.53, panels);
  part(0, -0.035, -0.36, 0.162, 0.126, 0.19, dark);
  part(0, -0.035, -0.475, 0.142, 0.117, 0.1, body);
  part(0, 0.105, -0.37, 0.069, 0.081, 0.04, dark);
  part(0, 0.148, -0.371, 0.039, 0.012, 0.033, accent);
  part(-0.113, 0.023, -0.193, 0.018, 0.043, 0.203, accent);
  part(0.113, 0.023, -0.193, 0.018, 0.043, 0.203, accent);
  part(0, -0.145, 0.08, 0.13, 0.22, 0.16, dark).rotation.x = 0.24;
  part(0, -0.1, 0.22, 0.26, 0.13, 0.27, dark);
  for (const z of [-0.023, -0.085, -0.147]) {
    part(0, 0.119, z, 0.159, 0.02, 0.023, dark);
  }

  const muzzle = new THREE.Group();
  const flash = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), accent);
  flash.scale.z = 2.8;
  const flashCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.065),
    new THREE.MeshBasicMaterial({ color: 0xfff6cf, toneMapped: false }));
  flashCore.position.z = -0.055;
  muzzle.add(flash, flashCore);
  muzzle.position.set(0, -0.035, -0.56);
  muzzle.visible = false;
  weapon.add(muzzle);
  scene.add(weapon, new THREE.HemisphereLight(0xfff0d4, 0x81886f, 2.35));
  const light = new THREE.DirectionalLight(0xffd48d, 1.6);
  light.position.set(-2, 3, -4);
  scene.add(light);
  return { weapon, muzzle };
}

function createEffects(THREE, scene) {
  const bulletSpeed = 150;
  const tailGeometry = new THREE.CylinderGeometry(0.045, 0.004, 1, 6);
  const tipGeometry = new THREE.IcosahedronGeometry(0.066);
  const tailMaterial = new THREE.MeshBasicMaterial({ color: 0xffab48, toneMapped: false });
  const tipMaterial = new THREE.MeshBasicMaterial({ color: 0xfff2c2, toneMapped: false });
  const up = new THREE.Vector3(0, 1, 0);
  const bullets = Array.from({ length: Math.ceil(SHOT_RANGE / bulletSpeed / FIRE_INTERVAL) + 1 }, () => {
    const mesh = new THREE.Group();
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    mesh.add(tail, new THREE.Mesh(tipGeometry, tipMaterial));
    scene.add(mesh);
    return {
      mesh, tail, from: new THREE.Vector3(), direction: new THREE.Vector3(),
      distance: 0, travelled: 0, impact: null,
    };
  });

  const burstPositions = new Float32Array(36);
  const burstGeometry = new THREE.BufferGeometry();
  burstGeometry.setAttribute('position', new THREE.BufferAttribute(burstPositions, 3));
  const burstMaterial = new THREE.PointsMaterial({
    color: 0xffc36e, size: 0.106, transparent: true, depthWrite: false, toneMapped: false,
  });
  const burst = new THREE.Points(burstGeometry, burstMaterial);
  burst.frustumCulled = false;
  scene.add(burst);

  const velocity = Array.from({ length: 12 }, () => new THREE.Vector3());
  let burstTime = 0;
  let hitTime = 0;

  function fire(from, to, impact) {
    const bullet = bullets.find(shot => !shot.mesh.visible);
    bullet.from.copy(from);
    bullet.direction.subVectors(to, from);
    bullet.distance = bullet.direction.length();
    bullet.direction.normalize();
    bullet.travelled = 0;
    bullet.impact = impact;
    bullet.mesh.position.copy(from);
    bullet.mesh.quaternion.setFromUnitVectors(up, bullet.direction);
    bullet.tail.scale.y = 0;
    bullet.mesh.visible = true;
  }

  function spark(point, normal, targetHit) {
    burstMaterial.color.setHex(targetHit ? 0xffc36e : 0xffe4a8);
    for (const [index, direction] of velocity.entries()) {
      direction.copy(point).addScaledVector(normal, 0.045).toArray(burstPositions, index * 3);
      direction.set(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5)
        .add(normal).normalize().multiplyScalar(1.5 + Math.random() * 3);
    }
    burstTime = 0.34;
    if (targetHit) hitTime = 0.15;
  }

  function update(dt) {
    burstTime = Math.max(0, burstTime - dt);
    hitTime = Math.max(0, hitTime - dt);
    burst.visible = burstTime > 0;
    burstMaterial.opacity = burstTime / 0.34;
    game.classList.toggle('hit', hitTime > 0);
    crosshair.classList.toggle('hit', hitTime > 0);
    if (burst.visible) {
      for (const [index, direction] of velocity.entries()) {
        const offset = index * 3;
        direction.y -= 6 * dt;
        burstPositions[offset] += direction.x * dt;
        burstPositions[offset + 1] += direction.y * dt;
        burstPositions[offset + 2] += direction.z * dt;
      }
      burstGeometry.attributes.position.needsUpdate = true;
    }
  }

  function advanceBullets(dt) {
    for (const bullet of bullets) {
      if (!bullet.mesh.visible) continue;
      bullet.travelled = Math.min(bullet.distance, bullet.travelled + dt * bulletSpeed);
      bullet.mesh.position.copy(bullet.from).addScaledVector(bullet.direction, bullet.travelled);
      const trailLength = Math.min(2.4, bullet.travelled);
      bullet.tail.scale.y = trailLength;
      bullet.tail.position.y = -trailLength / 2;
      if (bullet.travelled >= bullet.distance) {
        bullet.mesh.visible = false;
        bullet.impact?.(bullet.mesh.position);
        bullet.impact = null;
      }
    }
  }

  function reset() {
    for (const bullet of bullets) {
      bullet.mesh.visible = false;
      bullet.impact = null;
    }
    burstTime = 0;
    hitTime = 0;
    update(0);
  }

  reset();
  return { fire, spark, update, advanceBullets, reset };
}

function playRange(THREE, renderer) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, 1, 0.07, 115);
  const weaponScene = new THREE.Scene();
  const weaponCamera = new THREE.PerspectiveCamera(62, 1, 0.03, 5);
  const arena = buildArena(THREE, scene, touchDevice);
  const updateAnimals = createAnimals(THREE, scene);
  const range = createTargets(THREE, scene);
  const { weapon, muzzle } = createWeapon(THREE, weaponScene);
  const effects = createEffects(THREE, scene);
  const raycaster = new THREE.Raycaster();
  const center = new THREE.Vector2(0, 0);
  const movement = new THREE.Vector2();
  const speed = new THREE.Vector2();
  const startPoint = new THREE.Vector3();
  const endPoint = new THREE.Vector3();
  const clamp = THREE.MathUtils.clamp;

  const keyActions = { w: 'forward', a: 'left', s: 'backward', d: 'right', ' ': 'fire' };
  const arrowActions = { ArrowLeft: 'lookLeft', ArrowRight: 'lookRight', ArrowUp: 'lookUp', ArrowDown: 'lookDown' };
  const keysHeld = new Set();
  const touchesHeld = new Map();
  const canvasTouches = new Map();
  const mouseLook = new THREE.Vector2();
  let aimPointer = null;
  let mouseHeld = false;
  let lockRequested = false;
  let yaw = 0;
  let pitch = 0;
  let time = 0;
  let startedAt = null;
  let elapsed = 0;
  let elevation = 0;
  let verticalSpeed = 0;
  let grounded = true;
  let nextFire = 0;
  let recoil = 0;
  let score = 0;
  let lastFrame = null;
  let renderPending = true;

  renderer.autoClear = false;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;

  const isPlaying = () => game.dataset.state === 'playing';
  const isTouch = () => game.dataset.input === 'touch';

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touchDevice ? 1.35 : 1.75));
    renderer.setSize(width, height, false);
    for (const view of [camera, weaponCamera]) {
      view.aspect = width / height;
      view.fov = view.aspect < 1 ? 68 : 62;
      view.updateProjectionMatrix();
    }
    renderPending = true;
  }

  function setScore(value) {
    score = value;
    scoreOutput.value = `${score} / ${GOAL}`;
  }

  function clearInput() {
    keysHeld.clear();
    touchesHeld.clear();
    canvasTouches.clear();
    mouseLook.set(0, 0);
    aimPointer = null;
    mouseHeld = false;
    padButtons.forEach(button => button.classList.remove('held'));
  }

  function updateCamera() {
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    camera.updateMatrixWorld();
  }

  function resetGame() {
    clearInput();
    time = 0;
    startedAt = null;
    elapsed = 0;
    elevation = 0;
    verticalSpeed = 0;
    grounded = true;
    nextFire = 0;
    recoil = 0;
    yaw = 0;
    pitch = 0;
    speed.set(0, 0);
    camera.position.set(SPAWN.x, RANGE.eye, SPAWN.z);
    updateCamera();
    range.reset();
    range.update(camera, time);
    updateAnimals(time);
    effects.reset();
    animateWeapon(0);
    renderPending = true;
    setScore(0);
  }

  function showMenu(paused) {
    stopClock();
    clearInput();
    speed.set(0, 0);
    renderPending = true;
    game.dataset.state = paused ? 'paused' : 'menu';
    startLabel.textContent = paused ? 'RESUME GAME' : 'START GAME';
    menuMessage.textContent = paused ? 'Game paused. Resume to return to the range.' :
      'Hit 10 targets as fast as you can.';
  }

  function begin() {
    clearInput();
    notice.textContent = '';
    start.blur();
    startedAt = performance.now();
    game.dataset.state = 'playing';
  }

  function stopClock() {
    if (startedAt === null) return;
    elapsed += (performance.now() - startedAt) / 1000;
    startedAt = null;
  }

  function finish() {
    stopClock();
    clearInput();
    renderPending = true;
    game.dataset.state = 'complete';
    startLabel.textContent = 'PLAY AGAIN';
    menuMessage.textContent = `You hit ${GOAL} targets in ${elapsed.toFixed(2)} seconds.`;
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  }

  function lockFailed() {
    if (!lockRequested) return;
    lockRequested = false;
    notice.textContent = 'Pointer Lock was unavailable. Click the start button to try again.';
  }

  function requestLock() {
    lockRequested = true;
    try {
      canvas.requestPointerLock()?.catch(lockFailed);
    } catch {
      lockFailed();
    }
  }

  start.addEventListener('click', event => {
    if (game.dataset.state === 'complete') {
      resetGame();
      showMenu(false);
    }
    if (game.dataset.state === 'menu' && event.pointerType) {
      game.dataset.input = event.pointerType === 'mouse' ? 'mouse' : 'touch';
    }
    if (isTouch()) {
      begin();
    } else {
      requestLock();
    }
  });

  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
      lockRequested = false;
      begin();
    } else if (isPlaying() && !isTouch()) {
      showMenu(true);
    }
  });
  document.addEventListener('pointerlockerror', lockFailed);

  restart.addEventListener('click', () => {
    resetGame();
    showMenu(false);
    notice.textContent = '';
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  });

  const getFullscreen = () => document.fullscreenElement || document.webkitFullscreenElement;
  const enterFullscreen = game.requestFullscreen || game.webkitRequestFullscreen;
  if (enterFullscreen && (document.fullscreenEnabled || document.webkitFullscreenEnabled)) {
    fullscreen.hidden = false;
    fullscreen.setAttribute('aria-pressed', 'false');
    fullscreen.addEventListener('click', async () => {
      try {
        if (getFullscreen()) {
          const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
          await exitFullscreen.call(document);
        } else {
          await enterFullscreen.call(game);
        }
      } catch (error) {
        console.warn('Fullscreen is unavailable.', error);
      }
    });
    const syncFullscreen = () => {
      const active = Boolean(getFullscreen());
      const label = active ? 'Exit fullscreen' : 'Fullscreen';
      fullscreen.setAttribute('aria-pressed', String(active));
      fullscreen.setAttribute('aria-label', label);
      fullscreen.title = label;
      resize();
    };
    document.addEventListener('fullscreenchange', syncFullscreen);
    document.addEventListener('webkitfullscreenchange', syncFullscreen);
  }

  function look(dx, dy, sensitivity) {
    yaw -= dx * sensitivity;
    pitch = clamp(pitch - dy * sensitivity, -1.43, 1.43);
    updateCamera();
  }

  window.addEventListener('mousemove', event => {
    if (!isPlaying() || document.pointerLockElement !== canvas) return;
    mouseLook.x += event.movementX;
    mouseLook.y += event.movementY;
  }, { capture: true, passive: true });

  function aimDesktop(dt) {
    const horizontal = Number(keysHeld.has('lookRight')) - Number(keysHeld.has('lookLeft'));
    const vertical = Number(keysHeld.has('lookDown')) - Number(keysHeld.has('lookUp'));
    const dx = mouseLook.x * MOUSE_AIM_SPEED + horizontal * dt * 1.65;
    const dy = mouseLook.y * MOUSE_AIM_SPEED + vertical * dt * 1.65;
    mouseLook.set(0, 0);
    if (dx || dy) look(dx, dy, 1);
  }

  function actionHeld(action) {
    if (keysHeld.has(action) || (action === 'fire' && mouseHeld)) return true;
    for (const button of touchesHeld.values()) {
      if (button.dataset.action === action) return true;
    }
    return false;
  }

  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.pointerLockElement === canvas) {
      document.exitPointerLock();
      return;
    }
    const action = arrowActions[event.key] || keyActions[event.key.toLowerCase()];
    if (!isPlaying() || isTouch() || !action) return;
    event.preventDefault();
    keysHeld.add(action);
    if (action === 'fire' && !event.repeat) {
      aimDesktop(0);
      shoot();
    }
  });

  window.addEventListener('keyup', event => {
    keysHeld.delete(arrowActions[event.key] || keyActions[event.key.toLowerCase()]);
  });

  canvas.addEventListener('mousedown', event => {
    if (!isPlaying() || isTouch() || event.button !== 0) return;
    mouseHeld = true;
    aimDesktop(0);
    shoot();
  });

  window.addEventListener('mouseup', event => {
    if (event.button === 0) mouseHeld = false;
  });

  for (const button of padButtons) {
    button.addEventListener('pointerdown', event => {
      if (!isPlaying() || !isTouch()) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      touchesHeld.set(event.pointerId, button);
      button.classList.add('held');
      if (button.dataset.action === 'jump' && grounded) {
        verticalSpeed = JUMP_SPEED;
        grounded = false;
      }
    });

    function release(event) {
      touchesHeld.delete(event.pointerId);
      if (!actionHeld(button.dataset.action)) button.classList.remove('held');
    }
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  }

  canvas.addEventListener('pointerdown', event => {
    if (!isPlaying() || !isTouch()) return;
    const bounds = canvas.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    canvasTouches.set(event.pointerId, { startX: x, startY: y, x, y, dragged: false, stamp: performance.now() });
    if (aimPointer === null && x - bounds.left >= bounds.width / 2) aimPointer = event.pointerId;
  });

  function trackTouch(event) {
    const touch = canvasTouches.get(event.pointerId);
    if (!touch) return;
    const x = event.clientX;
    const y = event.clientY;
    touch.dragged ||= Math.hypot(x - touch.startX, y - touch.startY) >= 9;
    if (touch.dragged && event.pointerId === aimPointer) {
      look(x - touch.x, y - touch.y, TOUCH_AIM_SPEED);
      touch.x = x;
      touch.y = y;
    }
    return touch;
  }

  function releaseTouch(event) {
    canvasTouches.delete(event.pointerId);
    if (aimPointer === event.pointerId) aimPointer = null;
  }
  canvas.addEventListener('pointermove', trackTouch);
  canvas.addEventListener('pointerup', event => {
    const touch = trackTouch(event);
    releaseTouch(event);
    if (touch && !touch.dragged && performance.now() - touch.stamp < 450) shoot();
  });
  canvas.addEventListener('pointercancel', releaseTouch);
  canvas.addEventListener('lostpointercapture', releaseTouch);
  game.addEventListener('contextmenu', event => {
    if (isPlaying()) event.preventDefault();
  });
  window.addEventListener('blur', clearInput);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden || !isPlaying()) return;
    showMenu(true);
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  });

  function overlaps(obstacle, x, z) {
    const dx = x - clamp(x, obstacle.left, obstacle.right);
    const dz = z - clamp(z, obstacle.front, obstacle.back);
    return dx * dx + dz * dz < RANGE.radius * RANGE.radius;
  }

  function blocked(x, z) {
    return arena.obstacles.some(obstacle => elevation < obstacle.height && overlaps(obstacle, x, z));
  }

  function moveVertical(dt, position) {
    let surface = 0;
    for (const obstacle of arena.obstacles) {
      if (obstacle.height <= elevation && overlaps(obstacle, position.x, position.z)) {
        surface = Math.max(surface, obstacle.height);
      }
    }
    verticalSpeed -= GRAVITY * dt;
    elevation = Math.max(surface, elevation + verticalSpeed * dt);
    grounded = elevation === surface && verticalSpeed <= 0;
    if (grounded) verticalSpeed = 0;
    position.y = RANGE.eye + elevation;
  }

  function move(dt) {
    const strafe = Number(actionHeld('right')) - Number(actionHeld('left'));
    const forward = Number(actionHeld('forward')) - Number(actionHeld('backward'));
    movement.set(strafe, -forward);
    if (movement.lengthSq() > 1) movement.normalize();
    movement.rotateAround(center, -yaw).multiplyScalar(4.6);
    speed.lerp(movement, 1 - Math.exp(-15 * dt));

    const xLimit = RANGE.width / 2 - RANGE.radius;
    const zLimit = RANGE.depth / 2 - RANGE.radius;
    const { position } = camera;
    const x = clamp(position.x + speed.x * dt, -xLimit, xLimit);
    const z = clamp(position.z + speed.y * dt, -zLimit, zLimit);
    if (!blocked(x, position.z)) position.x = x;
    if (!blocked(position.x, z)) position.z = z;
    moveVertical(dt, position);
    camera.updateMatrixWorld();
  }

  function shoot() {
    if (!isPlaying() || time < nextFire) return;
    nextFire = time + FIRE_INTERVAL;
    recoil = 1;

    camera.updateMatrixWorld();
    raycaster.setFromCamera(center, camera);
    raycaster.far = SHOT_RANGE;
    const picks = range.targets.filter(target => target.group.visible).map(target => target.pick);
    const impact = raycaster.intersectObjects([...picks, ...arena.solidMeshes], false)[0];
    let onImpact = null;
    if (impact) {
      endPoint.copy(impact.point);
      const normal = impact.face.normal.clone().transformDirection(impact.object.matrixWorld);
      const target = impact.object.userData.target;
      const targetHit = Boolean(target && !target.pending);
      if (targetHit) target.pending = true;
      onImpact = point => {
        if (!isPlaying()) return;
        effects.spark(point, normal, targetHit);
        if (!targetHit) return;
        range.hide(target, time);
        setScore(score + 1);
        if (score === GOAL) finish();
      };
    } else {
      raycaster.ray.at(SHOT_RANGE, endPoint);
    }

    muzzle.getWorldPosition(startPoint).applyMatrix4(camera.matrixWorld);
    effects.fire(startPoint, endPoint, onImpact);
  }

  function animateWeapon(dt) {
    recoil *= Math.exp(-13 * dt);
    const bob = speed.length() * 0.0018;
    const horizontalSpace = Math.min(camera.aspect, 1.72) * 0.17;
    weapon.position.set(
      horizontalSpace + Math.sin(time * 10) * bob,
      -0.29 + Math.sin(time * 20) * bob - recoil * 0.014,
      -0.58 + recoil * 0.07,
    );
    weapon.rotation.set(recoil * 0.11, 0.18, -0.025);
    muzzle.visible = recoil > 0.56;
    muzzle.scale.setScalar(0.55 + recoil * 0.75);
    muzzle.rotation.z = time * 14;
  }

  function frame(stamp) {
    const dt = lastFrame === null ? 0 : Math.min((stamp - lastFrame) / 1000, 0.05);
    lastFrame = stamp;
    const playing = isPlaying();
    if (playing) {
      time += dt;
      if (!isTouch()) aimDesktop(dt);
      move(dt);
      range.update(camera, time);
      updateAnimals(time);
      animateWeapon(dt);
      effects.advanceBullets(dt);
      effects.update(dt);
      if (actionHeld('fire')) shoot();
    }

    if (playing || renderPending) {
      renderer.clear();
      renderer.render(scene, camera);
      if (playing) {
        renderer.clearDepth();
        renderer.render(weaponScene, weaponCamera);
      }
      renderPending = false;
    }
    requestAnimationFrame(frame);
  }

  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    stopClock();
    clearInput();
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    showError('The WebGL context was lost. Reload the page to reopen the range.');
  });
  new ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize', resize);
  resize();
  resetGame();
  showMenu(false);
  start.disabled = false;
  restart.disabled = false;
  notice.textContent = '';
  requestAnimationFrame(frame);
}

boot();
