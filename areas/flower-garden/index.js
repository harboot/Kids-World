import { addMesh, rectangleBounds } from '../../core/geometry.js';
import { seededRandom } from '../../core/random.js';
import { addBalloon } from './garden-balloon.js';
import { createGardenBatcher } from './garden-batches.js';
import { addCabin } from './garden-cabin.js';
import { addCave, CAVE_MOUTHS } from './garden-cave.js';
import { addOrchard } from './garden-orchard.js';
import { addPanorama } from './garden-panorama.js';
import { addPond, blocksPondTravel, bridgeDeckHeight } from './garden-pond.js';
import { addRabbits } from './garden-rabbits.js';
import { addShelter } from './garden-shelters.js';
import { addHillPath, createTerrain, drawTerrain } from './garden-terrain.js';

function createAnimals(THREE, scene, playerRadius, finishMission) {
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
    const head = new THREE.Group();
    head.name = 'Cow head';
    head.position.set(0, 1.17, 0.75);
    body.add(head);
    part(head, 'cream', 0, 0.05, 0.18, 0.47, 0.48, 0.51);
    part(head, 'pink', 0, -0.09, 0.46, 0.49, 0.23, 0.24);
    part(body, 'dark', 0, 0.84, -0.78, 0.08, 0.55, 0.09).rotation.x = 0.34;
    for (const side of [-1, 1]) {
      part(head, 'dark', side * 0.238, 0.12, 0.28, 0.025, 0.078, 0.08);
      part(head, 'pink', side * 0.29, 0.26, 0.13, 0.23, 0.10, 0.16).rotation.z = side * 0.3;
      part(head, 'cream', side * 0.15, 0.36, 0.11, 0.08, 0.19, 0.09).rotation.z = -side * 0.38;
      for (const end of [-1, 1]) {
        legs.push({ joint: leg(body, side * 0.28, 0.63, end * 0.48, 0.63, 0.13, 'cream', 'dark'), phase: side * end });
      }
    }
    return head;
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

  function animal(name, build, x, z, rx, rz, pace, offset, width, depth, height, front) {
    const root = new THREE.Group();
    root.name = name;
    const body = new THREE.Group();
    const shadow = new THREE.Mesh(shadowShape, shadowMaterial);
    shadow.position.set(0, 0.016, front);
    shadow.scale.set(width, 1, depth);
    const legs = [];
    const head = build(body, legs);
    root.add(body, shadow);
    scene.add(root);
    return { root, body, head, legs, x, z, rx, rz, pace, offset, width, depth, height, front, time: 0, reaction: 0 };
  }

  // Each route keeps the animal inside its own pen, even while the gate is open.
  const animals = [
    animal('Cow 1', cow, -7.45, -6.96, 0.52, 1.14, 0.43, 1.9, 0.45, 1.14, 1.5, 0.24),
    animal('Cow 2', cow, -3.39, -6.96, 0.58, 1.07, -0.39, 0.65, 0.45, 1.14, 1.5, 0.24),
    animal('White chicken 1', (body, legs) => chicken(body, legs, 'cream', 'cream'),
      3.1, -4.6, 0.74, 0.61, 1.1, 0.6, 0.19, 0.32, 0.62, 0.035),
    animal('Brown chicken 1', (body, legs) => chicken(body, legs, 'buff', 'wing'),
      7.0, -4.65, 0.76, 0.68, -1.04, 2.5, 0.19, 0.32, 0.62, 0.035),
    animal('White chicken 2', (body, legs) => chicken(body, legs, 'cream', 'cream'),
      7.0, -7.12, 0.62, 0.57, 0.91, 1.2, 0.19, 0.32, 0.62, 0.035),
    animal('Brown chicken 2', (body, legs) => chicken(body, legs, 'buff', 'wing'),
      3.1, -7.14, 0.65, 0.58, 1.0, 3.1, 0.19, 0.32, 0.62, 0.035),
  ];

  function overlaps(animal, x, z, yaw, playerX, playerZ) {
    const dx = playerX - x;
    const dz = playerZ - z;
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    const localX = cos * dx - sin * dz;
    const localZ = sin * dx + cos * dz - animal.front;
    const edgeX = Math.max(0, Math.abs(localX) - animal.width);
    const edgeZ = Math.max(0, Math.abs(localZ) - animal.depth);
    return edgeX * edgeX + edgeZ * edgeZ < playerRadius * playerRadius;
  }

  function place(animal, time, player) {
    const angle = time * animal.pace + animal.offset;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const x = animal.x + cos * animal.rx;
    const z = animal.z + sin * animal.rz;
    const yaw = Math.atan2(-sin * animal.rx * animal.pace, cos * animal.rz * animal.pace);
    if (player && overlaps(animal, x, z, yaw, player.x, player.z)) return;

    animal.time = time;
    animal.root.position.set(x, 0, z);
    animal.root.rotation.y = yaw;
    const stride = Math.sin((time * Math.abs(animal.pace) + animal.offset) * 10);
    animal.body.position.y = 0.016 + Math.abs(stride) * 0.025;
    for (const { joint, phase } of animal.legs) joint.rotation.x = stride * phase * 0.45;
  }

  function touching(animal, x, z) {
    const { position, rotation } = animal.root;
    return overlaps(animal, position.x, position.z, rotation.y, x, z);
  }

  return {
    interactions: animals.map(animal => ({
      get x() { return animal.root.position.x; },
      get z() { return animal.root.position.z; },
      get active() { return animal.reaction === 0; },
      label: animal.head ? 'Greet cow' : 'Make chicken jump',
      anchorY: animal.head ? 1.7 : 0.7,
      radius: animal.head ? 1.85 : 1.3,
      act() {
        if (animal.reaction) return;
        animal.reaction = animal.head ? 1.25 : 0.92;
        for (const { joint } of animal.legs) joint.rotation.x = 0;
        finishMission(animal.head ? 'cow' : 'chicken');
      },
    })),
    reset() {
      for (const animal of animals) {
        animal.reaction = 0;
        if (animal.head) animal.head.rotation.x = 0;
        place(animal, 0);
      }
    },
    update(dt, player) {
      for (const animal of animals) {
        if (!animal.reaction) {
          place(animal, animal.time + dt, player);
          continue;
        }
        animal.reaction = Math.max(0, animal.reaction - dt);
        if (animal.head) {
          const progress = 1 - animal.reaction / 1.25;
          animal.head.rotation.x = (1 - Math.cos(progress * Math.PI * 4)) * 0.26;
        } else {
          const progress = 1 - animal.reaction / 0.92;
          animal.body.position.y = 0.016 + 6.6 * progress * (1 - progress);
        }
      }
    },
    blocks(x, z, feet) {
      return animals.some(animal => feet < animal.height && touching(animal, x, z));
    },
    surface(x, z, feet) {
      let top = -Infinity;
      for (const animal of animals) {
        if (feet >= animal.height && touching(animal, x, z)) top = Math.max(top, animal.height);
      }
      return top;
    },
  };
}


export const flowerGarden = {
  title: 'Flower Garden',
  heading: ['Flower', 'Garden'],
  description: 'Help the garden animals, deliver apples, and explore by balloon or through the mountain cave.',
  completionRevision: 2,
  loadingMessage: 'Loading the garden…',
  canvasLabel: '3D flower garden',
  themeColor: '#e9eedc',
  music: 'garden',
  width: 45,
  depth: 58,
  spawn: { x: 0, z: 9 },
  load: loadGarden,
};

function loadGarden({ THREE, scene, viewmodel, touch, playerRadius = .34, completeLevel, playCue, notify,
  carryPlayer, reducedMotion, signal }) {
  const { width, depth } = flowerGarden;
  const obstacles = [];
  const gates = [];
  const terrain = createTerrain(width, depth);
  const { getTerrainHeight } = terrain;
  const box = new THREE.BoxGeometry(1, 1, 1);
  const facet = new THREE.IcosahedronGeometry(1, 0);
  const disk = new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2);
  const matte = color => new THREE.MeshLambertMaterial({ color });
  const grass = matte(0x8ba75f);
  const path = matte(0xe7c88d);
  const wood = matte(0x935d3b);
  const rails = matte(0xe8bf86);
  const caps = matte(0xf3d4a1);
  const hedge = matte(0x5d874d);
  const roofRed = matte(0xbf664d);
  const roofBlue = matte(0x6692a2);
  const transform = new THREE.Object3D();
  const batchParts = createGardenBatcher(THREE);

  scene.background = new THREE.Color(0xb2d9e3);
  scene.fog = new THREE.Fog(0xb2d9e3, 42, 113);
  scene.add(new THREE.HemisphereLight(0xfff3dc, 0x829866, 1.85));
  const sun = new THREE.DirectionalLight(0xfff0c7, 2);
  sun.position.set(-19, 27, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(touch ? 512 : 1024);
  Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 35, bottom: -35, near: 1, far: 80 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.normalBias = 0.03;
  scene.add(sun);

  function mesh(geometry, material, x, y, z, sx, sy, sz, parent = scene, shadow = false) {
    const object = addMesh(THREE, parent, geometry, material, x, y, z, sx, sy, sz);
    object.castShadow = shadow;
    object.receiveShadow = true;
    return object;
  }

  function collision(x, z, sx, sz, height) {
    return { ...rectangleBounds(x, z, sx, sz), height };
  }

  mesh(box, grass, 0, -0.54, 0, 216, 0.1, 216);
  drawTerrain(THREE, scene, terrain);
  addHillPath(THREE, { scene, getTerrainHeight, instances, matte });
  mesh(box, path, 0, 0.005, 0.55, 1.56, 0.01, 44.1);
  mesh(box, path, -7.1, 0.007, 4.18, 14.3, 0.014, 1.35);
  mesh(box, path, -14.0, 0.009, 4.65, 2.55, 0.018, 1.27);
  for (const { x, z, direction } of CAVE_MOUTHS) {
    mesh(box, path, x + direction * 1.4, .016, z, 2.81, .026, 1.81);
    mesh(disk, path, x + direction * 2.7, .023, z, .82, 1, .9);
  }
  mesh(disk, path, 0, 0.016, 4.9, 2.1, 1, 3.35);
  for (const side of [-1, 1]) {
    const branch = mesh(box, path, side * 2.62, 0.009, 0.55, 1.5, 0.012, 6.5);
    branch.rotation.y = -side * 0.94;
    mesh(box, hedge, side * (width / 2 + 0.23), 0.33, 0, 0.53, 0.66, depth);
    mesh(box, hedge, 0, 0.33, side * (depth / 2 + 0.23), width, 0.66, 0.53);
  }

  const posts = [];
  const boards = [];
  const postGap = 2.7;
  const fenceHeight = 1.4;
  const railHeights = [0.44, fenceHeight - 0.085];
  function fence(x, z, length, across) {
    const segments = Math.ceil(length / postGap);
    for (let index = 0; index <= segments; index++) {
      const offset = length * (index / segments - 0.5);
      posts.push([x + (across ? offset : 0), z + (across ? 0 : offset)]);
    }
    boards.push({ x, z, length, across });
    obstacles.push(collision(x, z, across ? length : 0.23, across ? 0.23 : length, fenceHeight));
  }

  function gate(center, z, kind) {
    const span = 2.6;
    const leaf = new THREE.Group();
    leaf.name = kind === 'cow' ? 'Cow pen gate' : 'Chicken pen gate';
    leaf.position.set(center - span / 2, 0, z);
    scene.add(leaf);
    for (const y of railHeights) {
      mesh(box, caps, span / 2, y, 0, span - 0.09, 0.17, 0.11, leaf);
    }
    for (const offset of [0.09, span - 0.09]) {
      mesh(box, wood, offset, 0.71, 0, 0.14, 1.37, 0.16, leaf);
    }
    mesh(box, caps, 1.29, 0.75, 0.12, 0.14, 1.84, 0.09, leaf).rotation.z = -0.96;
    mesh(box, roofBlue, span - 0.25, 1.12, 0.115, 0.22, 0.14, 0.12, leaf);

    const door = {
      x: center, z, open: false,
      get label() { return this.open ? 'Close' : 'Open'; },
      act() { this.open = !this.open; },
    };
    function touches(x, z, angle) {
      const dx = x - leaf.position.x;
      const dz = z - leaf.position.z;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const localX = dx * c - dz * s;
      const localZ = dx * s + dz * c;
      const edgeX = Math.max(0, -localX, localX - span);
      const edgeZ = Math.max(0, Math.abs(localZ) - 0.085);
      return edgeX * edgeX + edgeZ * edgeZ < playerRadius * playerRadius;
    }
    obstacles.push({ height: fenceHeight, touches: (x, z) => touches(x, z, leaf.rotation.y) });
    gates.push({
      door,
      update(dt, player) {
        const target = door.open ? -Math.PI / 2 : 0;
        const nextAngle = leaf.rotation.y + THREE.MathUtils.clamp(target - leaf.rotation.y, -2.7 * dt, 2.7 * dt);
        if (!player || !touches(player.x, player.z, nextAngle)) leaf.rotation.y = nextAngle;
      },
      reset() {
        door.open = false;
        leaf.rotation.y = 0;
      },
    });
  }

  function pen(left, right, front, back, kind, roof) {
    const center = (left + right) / 2;
    const wing = ((right - left) - 2.6) / 2;
    fence(left, (front + back) / 2, back - front, false);
    fence(right, (front + back) / 2, back - front, false);
    fence(center, front, right - left, true);
    fence(left + wing / 2, back, wing, true);
    fence(right - wing / 2, back, wing, true);
    gate(center, back, kind);
    addShelter(THREE, { scene, mesh, box, facet, matte, collision, obstacles, batchParts }, kind, center, front + 1.13, roof);
  }

  pen(-9.8, -0.9, -11.5, -2.1, 'cow', roofRed);
  pen(0.8, 9.4, -10.1, -2.1, 'chicken', roofBlue);

  function instances(geometry, material, rows, colors, shadow = false) {
    const batch = new THREE.InstancedMesh(geometry, material, rows.length);
    rows.forEach(([x, y, z, sx, sy, sz, angle = 0, pitch = 0], index) => {
      transform.position.set(x, y, z);
      transform.scale.set(sx, sy, sz);
      transform.rotation.set(pitch, angle, 0);
      transform.updateMatrix();
      batch.setMatrixAt(index, transform.matrix);
      if (colors) batch.setColorAt(index, colors[index]);
    });
    batch.castShadow = shadow;
    batch.receiveShadow = true;
    scene.add(batch);
  }

  instances(box, wood, posts.map(([x, z]) => [x, 0.75, z, 0.21, 1.5, 0.21]), null, true);
  instances(box, caps, posts.map(([x, z]) => [x, 1.49, z, 0.3, 0.13, 0.3]), null, true);
  instances(box, rails, boards.flatMap(({ x, z, length, across }) => railHeights
    .map(y => [x, y, z, across ? length : 0.12, 0.17, across ? 0.12 : length])), null, true);

  const trees = [
    [-10.7, 4.95, 1.1], [13.7, 3.6, 1], [-15.8, -3.2, 1.1], [14.6, -6.8, 1.15],
    [-12.4, -13, 0.94], [14.1, -13, 0.92], [-11.8, -18.7, 1.14], [10.6, -13.7, 1.02],
    [-6, -18, 0.84], [5.8, -13.65, 0.9], [-20.2, 4.4, 1.2], [20.5, 16.4, 1.1],
  ];
  const greens = [0x6d984e, 0x82a751, 0x578342].map(color => new THREE.Color(color));
  const crowns = trees.flatMap(([x, z, s]) => {
    const y = getTerrainHeight(x, z);
    return [
      [x, y + 2.7 * s, z, 1.6 * s, 1.43 * s, 1.47 * s],
      [x + 0.77 * s, y + 2.43 * s, z + 0.26, 0.92 * s, 0.91 * s, 0.89 * s, 0.6],
      [x - 0.71 * s, y + 3.12 * s, z - 0.34, 1.02 * s, 0.91 * s, 0.92 * s, 1.1],
    ];
  });
  instances(box, wood, trees.map(([x, z, s]) => [x, getTerrainHeight(x, z) + 1.15 * s, z, 0.32 * s, 2.3 * s, 0.32 * s]), null, true);
  instances(facet, matte(0xffffff), crowns, crowns.map((_, i) => greens[i % 3]), true);
  for (const [x, z, s] of trees) obstacles.push(collision(x, z, 0.32 * s, 0.32 * s, getTerrainHeight(x, z) + 2.3 * s));

  const flowerBeds = [
    [-3.8, 6.8, 1.9, 2, 0], [3.6, 6.4, 1.9, 2.1, 1], [-6.1, 2.8, 1.85, 1.65, 2],
    [6.1, 2.5, 1.8, 1.65, 0], [-11.5, 1.1, 1.85, 2.7, 1], [11.55, -0.5, 2.05, 3.1, 2],
    [-12, -9.5, 1.6, 3, 0], [12.7, -12.2, 2.8, 3.6, 1], [-4, -15.5, 2.4, 1.7, 2],
    [3.3, -15.2, 1.95, 1.75, 0], [-6.35, 12.7, 1.25, 1.8, 1], [8.1, 11.5, 2.15, 1.95, 2],
    [14.2, 10.75, 1.0, 1.25, 1], [19.7, 11.4, 1.15, 1.25, 2], [17.75, 16.3, 1.55, 1.05, 0],
    [-11.05, 21.9, 1.05, 0.93, 2], [-19.05, 22.1, 0.86, 0.71, 0],
  ];
  const random = seededRandom(728);
  const stems = [];
  const leaves = [];
  const petals = [];
  const centers = [];
  const petalColors = [];
  const flowerColors = [0xf2b247, 0xd96590, 0x9980d1, 0xf4d98d, 0xf395aa, 0xc1a4e8].map(hex => new THREE.Color(hex));
  for (const [cx, cz, rx, rz, color] of flowerBeds) {
    for (let i = 0; i < 26; i++) {
      const angle = 2 * Math.PI * random();
      const radius = Math.sqrt(random());
      const x = cx + Math.cos(angle) * radius * rx;
      const z = cz + Math.sin(angle) * radius * rz;
      const y = getTerrainHeight(x, z);
      const h = 0.28 + random() * 0.38;
      const bloom = 0.085 + random() * 0.065;
      stems.push([x, y + h / 2, z, 0.034, h, 0.034]);
      leaves.push([x + 0.07, y + h * 0.43, z, 0.13, 0.033, 0.061, angle]);
      centers.push([x, y + h + 0.038, z, bloom * 0.57, 0.059, bloom * 0.57]);
      for (let p = 0; p < 5; p++) {
        const ray = angle + p * Math.PI * 2 / 5;
        petals.push([x + Math.cos(ray) * bloom * 0.77, y + h, z + Math.sin(ray) * bloom * 0.77,
          bloom * 0.81, 0.041, bloom * 0.55, -ray]);
        petalColors.push(flowerColors[color + (i % 4 === 0 ? 3 : 0)]);
      }
    }
  }
  instances(box, matte(0x4e823e), stems);
  instances(facet, matte(0x6d9d4e), leaves);
  instances(facet, matte(0xffffff), petals, petalColors);
  instances(facet, matte(0xffc950), centers);

  const granite = matte(0x939a81);
  const hillRocks = [[12.55, 9.6, 0.72, 0.52, 0.57], [19.95, 9.18, 0.86, 0.79, 0.74],
    [13.25, 15.9, 0.69, 0.63, 0.65], [19.45, 18.3, 1.05, 0.76, 0.72]];
  for (const [x, z, sx, sy, sz] of hillRocks) {
    const y = getTerrainHeight(x, z);
    mesh(facet, granite, x, y + sy * 0.37, z, sx, sy, sz, scene, true).rotation.y = x;
    obstacles.push(collision(x, z, sx * 1.42, sz * 1.48, y + sy * 1.22));
  }

  const visualKit = { scene, mesh, box, facet, matte, instances, batchParts, reducedMotion, signal };
  addPanorama(THREE, visualKit);
  const cave = addCave(THREE, visualKit);
  const balloon = addBalloon(THREE, { ...visualKit, carryPlayer });

  const cabin = addCabin(THREE, { scene, mesh, box, matte, obstacles, collision });
  const missions = { apples: false, fish: false, cow: false, rabbits: false, chicken: false };
  function finishMission(id) {
    if (missions[id]) return;
    missions[id] = true;
    if (!Object.values(missions).every(Boolean)) return;
    completeLevel?.('garden');
    notify?.('Flower Garden complete!');
  }

  const animals = createAnimals(THREE, scene, playerRadius, finishMission);
  const rabbits = addRabbits(THREE, {
    ...visualKit, obstacles, collision, getTerrainHeight, playerRadius,
    feedRabbits: () => finishMission('rabbits'),
  });
  const orchard = addOrchard(THREE, {
    scene, viewmodel, mesh, box, facet, matte, obstacles, collision, getTerrainHeight, table: cabin.table,
    deliver: () => finishMission('apples'),
  });
  const pond = addPond(THREE, {
    scene, mesh, box, facet, matte, obstacles, instances, getTerrainHeight, playerRadius, playCue,
    feedFish: () => finishMission('fish'),
  });
  const missionStatus = {
    missions: [
      {
        id: 'apples', title: 'Collect and deliver apples', total: orchard.appleTarget,
        get current() { return orchard.collectedApples; },
        get complete() { return missions.apples; },
      },
      {
        id: 'fish', title: 'Feed the pond fish', total: 1,
        get current() { return Number(missions.fish); },
        get complete() { return missions.fish; },
      },
      {
        id: 'cow', title: 'Greet a cow', total: 1,
        get current() { return Number(missions.cow); },
        get complete() { return missions.cow; },
      },
      {
        id: 'rabbits', title: 'Feed the rabbits', total: 1,
        get current() { return Number(missions.rabbits); },
        get complete() { return missions.rabbits; },
      },
      {
        id: 'chicken', title: 'Make a chicken jump', total: 1,
        get current() { return Number(missions.chicken); },
        get complete() { return missions.chicken; },
      },
    ],
    get inventory() { return rabbits.hasCarrots ? ['Carrots'] : []; },
    get hint() {
      if (!missions.apples) return orchard.deliveryHint;
      if (!missions.fish) return 'Feed the fish from the pond shore.';
      if (!missions.cow) return 'Find a cow and greet it.';
      if (!missions.rabbits) {
        if (rabbits.feeding) return 'Watch the rabbits gather at the feeding tray.';
        return rabbits.hasCarrots ? 'Take the carrots to the feeding tray beneath the hill.' : 'Pick carrots from the patch at the foot of the hill.';
      }
      if (!missions.chicken) return 'Open the chicken pen and make a chicken jump.';
      return '';
    },
  };
  return {
    obstacles,
    get missionStatus() { return missionStatus; },
    getGroundHeight(x, z, feet) {
      return Math.max(getTerrainHeight(x, z), bridgeDeckHeight(x, z), balloon.surface(x, z, feet));
    },
    blocksGround(x, z, radius, feet, from) {
      return blocksPondTravel(x, z, radius) || cave.blocks(x, z, radius) ||
        balloon.blocks(x, z, radius, feet, from) || rabbits.blocks(x, z, feet);
    },
    getCeilingHeight: cave.ceiling,
    animals,
    interactions: [...gates.map(gate => gate.door), ...animals.interactions, ...orchard.interactions,
      ...rabbits.interactions, pond.feedingSpot, cabin.bench, balloon.ride],
    update(dt, player) {
      animals.update(dt, player);
      orchard.update(dt);
      pond.update(dt);
      rabbits.update(dt, player);
      balloon.update(dt, player);
      cave.update(dt, player);
      for (const gate of gates) gate.update(dt, player);
    },
    reset() {
      for (const id of Object.keys(missions)) missions[id] = false;
      animals.reset();
      orchard.reset();
      pond.reset();
      rabbits.reset();
      balloon.reset();
      cave.reset();
      for (const gate of gates) gate.reset();
    },
    unload() {
      balloon.unload();
      cave.unload();
    },
  };
}
