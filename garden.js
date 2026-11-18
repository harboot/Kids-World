function createAnimals(THREE, scene, playerRadius) {
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
        animal.reaction = animal.head ? 1.25 : 0.92;
        for (const { joint } of animal.legs) joint.rotation.x = 0;
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
      let top = 0;
      for (const animal of animals) {
        if (feet >= animal.height && touching(animal, x, z)) top = Math.max(top, animal.height);
      }
      return top;
    },
  };
}


export const gardenLevel = {
  width: 45,
  depth: 48,
  spawn: { x: 0, z: 9 },
  passage: { x: 17.8, z: -23.35, href: './snow.html', label: 'Enter Snow Basin' },
  build: buildGarden,
};

function buildGarden(THREE, scene, touch, playerRadius, camera) {
  const { width, depth } = gardenLevel;
  const obstacles = [];
  const gates = [];
  const box = new THREE.BoxGeometry(1, 1, 1);
  const facet = new THREE.IcosahedronGeometry(1, 0);
  const disk = new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2);
  const matte = color => new THREE.MeshLambertMaterial({ color });
  const soil = matte(0x799754);
  const grass = matte(0x8ba75f);
  const path = matte(0xe7c88d);
  const wood = matte(0x935d3b);
  const rails = matte(0xe8bf86);
  const caps = matte(0xf3d4a1);
  const hedge = matte(0x5d874d);
  const roofRed = matte(0xbf664d);
  const roofBlue = matte(0x6692a2);
  const cloud = new THREE.MeshBasicMaterial({ color: 0xf3f8f7 });
  const transform = new THREE.Object3D();

  scene.background = new THREE.Color(0xb2d9e3);
  scene.fog = new THREE.Fog(0xb2d9e3, 28, 82);
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
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.scale.set(sx, sy, sz);
    object.castShadow = shadow;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }

  function collision(x, z, sx, sz, height) {
    return { left: x - sx / 2, right: x + sx / 2, front: z - sz / 2, back: z + sz / 2, height };
  }

  mesh(box, soil, 0, -0.17, 0, width, 0.34, depth);
  mesh(box, path, 0, 0.005, -1.5, 1.56, 0.01, 40);
  mesh(box, path, 8.9, 0.006, -21.0, 19.4, 0.012, 1.65);
  mesh(box, path, 17.8, 0.007, -22.2, 1.8, 0.014, 2.7);
  mesh(disk, path, 0, 0.016, 4.9, 2.1, 1, 3.35);
  for (const side of [-1, 1]) {
    const branch = mesh(box, path, side * 2.62, 0.009, 0.55, 1.5, 0.012, 6.5);
    branch.rotation.y = -side * 0.94;
    mesh(disk, grass, side * 11, 0.01, 3.4, 7.8, 1, 10);
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

  function gate(center, z) {
    const span = 2.6;
    const leaf = new THREE.Group();
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
        const target = door.open ? Math.PI / 2 : 0;
        const nextAngle = leaf.rotation.y + THREE.MathUtils.clamp(target - leaf.rotation.y, -2.7 * dt, 2.7 * dt);
        if (!touches(player.x, player.z, nextAngle)) leaf.rotation.y = nextAngle;
      },
      reset() {
        door.open = false;
        leaf.rotation.y = 0;
      },
    });
  }

  function pen(left, right, front, back, roof) {
    const center = (left + right) / 2;
    const wing = ((right - left) - 2.6) / 2;
    fence(left, (front + back) / 2, back - front, false);
    fence(right, (front + back) / 2, back - front, false);
    fence(center, front, right - left, true);
    fence(left + wing / 2, back, wing, true);
    fence(right - wing / 2, back, wing, true);
    gate(center, back);

    const shelterZ = front + 1.13;
    mesh(box, rails, center, 0.83, shelterZ, 3.28, 1.66, 1.74, scene, true);
    for (const y of [1.05, 1.23, 1.41]) {
      mesh(box, wood, center, y, shelterZ + 0.881, 0.84, 0.075, 0.04);
    }
    obstacles.push(collision(center, shelterZ, 3.28, 1.74, 1.66));
    for (const side of [-1, 1]) {
      mesh(box, roof, center + side * 0.89, 1.91, shelterZ, 1.98, 0.18, 2.14, scene, true)
        .rotation.z = -side * 0.29;
    }
  }

  pen(-9.8, -0.9, -11.5, -2.1, roofRed);
  pen(0.8, 9.4, -10.1, -2.1, roofBlue);

  function instances(geometry, material, rows, colors, shadow = false) {
    const batch = new THREE.InstancedMesh(geometry, material, rows.length);
    rows.forEach(([x, y, z, sx, sy, sz, angle = 0], index) => {
      transform.position.set(x, y, z);
      transform.scale.set(sx, sy, sz);
      transform.rotation.y = angle;
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
    [-13, 5, 1.1], [13.7, 3.6, 1], [-15.8, -3.2, 1.1], [14.6, -6.8, 1.15],
    [-12.4, -13, 0.94], [14.1, -13, 0.92], [-11.8, -18.7, 1.14], [10.1, -18.4, 1.02],
    [-6, -18, 0.84], [5.6, -20, 0.9], [-19.3, 13.2, 1.2], [19.3, 14, 1.1],
  ];
  const greens = [0x6d984e, 0x82a751, 0x578342].map(color => new THREE.Color(color));
  const crowns = trees.flatMap(([x, z, s]) => [
    [x, 2.7 * s, z, 1.6 * s, 1.43 * s, 1.47 * s],
    [x + 0.77 * s, 2.43 * s, z + 0.26, 0.92 * s, 0.91 * s, 0.89 * s, 0.6],
    [x - 0.71 * s, 3.12 * s, z - 0.34, 1.02 * s, 0.91 * s, 0.92 * s, 1.1],
  ]);
  instances(box, wood, trees.map(([x, z, s]) => [x, 1.15 * s, z, 0.32 * s, 2.3 * s, 0.32 * s]), null, true);
  instances(facet, matte(0xffffff), crowns, crowns.map((_, i) => greens[i % 3]), true);
  for (const [x, z, s] of trees) obstacles.push(collision(x, z, 0.32 * s, 0.32 * s, 2.3 * s));

  const flowerBeds = [
    [-3.8, 6.8, 1.9, 2, 0], [3.6, 6.4, 1.9, 2.1, 1], [-6.1, 2.8, 1.85, 1.65, 2],
    [6.1, 2.5, 1.8, 1.65, 0], [-11.5, 1.1, 1.85, 2.7, 1], [11.55, -0.5, 2.05, 3.1, 2],
    [-12, -9.5, 1.6, 3, 0], [12.7, -12.2, 2.8, 3.6, 1], [-4, -15.5, 2.4, 1.7, 2],
    [3.3, -15.2, 1.95, 1.75, 0], [-8, 11.8, 2.4, 1.8, 1], [8.1, 11.5, 2.15, 1.95, 2],
  ];
  let seed = 728;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  const stems = [];
  const leaves = [];
  const petals = [];
  const centers = [];
  const petalColors = [];
  const flowerColors = [0xf2b247, 0xd96590, 0x9980d1, 0xf4d98d, 0xf395aa, 0xc1a4e8].map(hex => new THREE.Color(hex));
  for (const [cx, cz, rx, rz, color] of flowerBeds) {
    mesh(disk, grass, cx, 0.020, cz, rx * 1.08, 1, rz * 1.08);
    for (let i = 0; i < 26; i++) {
      const angle = 2 * Math.PI * random();
      const radius = Math.sqrt(random());
      const x = cx + Math.cos(angle) * radius * rx;
      const z = cz + Math.sin(angle) * radius * rz;
      const h = 0.28 + random() * 0.38;
      const bloom = 0.085 + random() * 0.065;
      stems.push([x, h / 2, z, 0.034, h, 0.034]);
      leaves.push([x + 0.07, h * 0.43, z, 0.13, 0.033, 0.061, angle]);
      centers.push([x, h + 0.038, z, bloom * 0.57, 0.059, bloom * 0.57]);
      for (let p = 0; p < 5; p++) {
        const ray = angle + p * Math.PI * 2 / 5;
        petals.push([x + Math.cos(ray) * bloom * 0.77, h, z + Math.sin(ray) * bloom * 0.77,
          bloom * 0.81, 0.041, bloom * 0.55, -ray]);
        petalColors.push(flowerColors[color + (i % 4 === 0 ? 3 : 0)]);
      }
    }
  }
  instances(box, matte(0x4e823e), stems);
  instances(facet, matte(0x6d9d4e), leaves);
  instances(facet, matte(0xffffff), petals, petalColors);
  instances(facet, matte(0xffc950), centers);

  for (const [x, z, sx, sy] of [[-34, -38, 14, 8], [-18, -44, 16, 10], [2, -42, 17, 8], [19, -43, 15, 11], [35, -36, 12, 8], [-38, 4, 10, 8], [37, 5, 10, 7]]) {
    mesh(facet, grass, x, -1.6, z, sx, sy, 11).rotation.y = x;
  }
  for (const [x, y, z] of [[-22, 13, -36], [10, 14.6, -56], [31, 10.4, -40]]) {
    mesh(facet, cloud, x, y, z, 4, 1.2, 1.65);
    mesh(facet, cloud, x + 2.1, y + 0.5, z, 2.65, 1.57, 1.3);
  }

  const animals = createAnimals(THREE, scene, playerRadius);
  const orchard = addOrchard(THREE, { scene, camera, mesh, box, facet, matte, obstacles, collision });
  const bench = addCabin({ mesh, box, matte, obstacles, collision });
  addGlacier(THREE, { mesh, facet, matte });
  return {
    obstacles,
    animals,
    interactions: [...gates.map(gate => gate.door), ...animals.interactions, ...orchard.interactions, bench],
    update(dt, player) {
      animals.update(dt, player);
      orchard.update(dt);
      for (const gate of gates) gate.update(dt, player);
    },
    reset() {
      animals.reset();
      orchard.reset();
      for (const gate of gates) gate.reset();
    },
  };
}

function addOrchard(THREE, { scene, camera, mesh, box, facet, matte, obstacles, collision }) {
  const treeX = 11.2;
  const treeZ = 8.25;
  const basketX = 8.7;
  const basketZ = 8.35;
  const bark = matte(0x855336);
  const greens = [matte(0x6f9b46), matte(0x89ab54), matte(0x527d43)];
  const red = matte(0xd84b46);
  const gold = matte(0xeeac4a);
  const wicker = matte(0xb77738);
  const rim = matte(0xd4a364);
  const canopy = new THREE.Group();
  canopy.name = 'Apple tree canopy';
  canopy.position.set(treeX, 2.2, treeZ);
  scene.add(canopy);
  const trunk = new THREE.CylinderGeometry(0.31, 0.49, 1, 7);
  mesh(trunk, bark, treeX, 1.45, treeZ, 1, 2.9, 1, scene, true);
  obstacles.push(collision(treeX, treeZ, 0.86, 0.86, 2.8));
  mesh(box, bark, -0.54, 0.7, 0, 0.29, 1.72, 0.29, canopy).rotation.z = 0.63;
  mesh(box, bark, 0.62, 0.63, 0.2, 0.27, 1.58, 0.27, canopy).rotation.z = -0.66;
  for (const [index, [x, y, z, sx, sy, sz]] of [
    [0, 2.03, 0, 2.02, 1.58, 1.6], [-1.26, 1.28, 0.1, 1.35, 1.09, 1.23],
    [1.29, 1.4, -0.08, 1.4, 1.15, 1.25], [0.08, 1.48, 1.02, 1.42, 1.17, 1.1],
    [-0.28, 1.68, -1.0, 1.53, 1.02, 1.05],
  ].entries()) {
    mesh(facet, greens[index % greens.length], x, y, z, sx, sy, sz, canopy, true).rotation.y = index;
  }

  const appleShape = new THREE.IcosahedronGeometry(0.13, 1);
  function makeApple(parent, index) {
    const fruit = new THREE.Group();
    mesh(appleShape, index % 4 === 3 ? gold : red, 0, 0, 0, 1, 0.89, 1, fruit);
    mesh(box, bark, 0.014, 0.114, 0, 0.021, 0.055, 0.022, fruit).rotation.z = -0.27;
    mesh(facet, greens[1], 0.065, 0.13, 0.003, 0.07, 0.016, 0.033, fruit).rotation.z = 0.3;
    parent.add(fruit);
    return fruit;
  }

  const branches = [
    [-1.48, 1.02, 0.91], [-1.12, 1.56, 1.39], [0.02, 0.84, 1.57], [0.88, 1.22, 1.49],
    [1.74, 1.38, 0.73], [1.46, 0.86, -0.54], [0.27, 1.18, -1.69],
    [-1.45, 1.05, -0.96], [-1.87, 1.44, -0.14],
  ];
  branches.forEach(([x, y, z], index) => makeApple(canopy, index).position.set(x, y, z));

  const basket = new THREE.Group();
  basket.name = 'Apple basket';
  scene.add(basket);
  const tub = new THREE.CylinderGeometry(0.31, 0.24, 0.24, 12);
  mesh(tub, wicker, 0, 0.12, 0, 1, 1, 1, basket);
  for (const [y, radius] of [[0.08, 0.267], [0.16, 0.293], [0.24, 0.309]]) {
    const band = new THREE.TorusGeometry(radius, 0.018, 5, 13);
    mesh(band, rim, 0, y, 0, 1, 1, 1, basket).rotation.x = -Math.PI / 2;
  }
  const handle = new THREE.TorusGeometry(0.27, 0.029, 6, 12, Math.PI);
  mesh(handle, rim, 0, 0.23, 0, 1, 1, 1, basket);
  const basketApples = [[-0.12, -0.09], [0.11, -0.09], [-0.11, 0.11], [0.1, 0.12], [0, 0.01]]
    .map(([x, z], index) => {
      const fruit = makeApple(basket, index);
      fruit.name = 'Basket apple';
      fruit.position.set(x, index === 4 ? 0.31 : 0.267, z);
      fruit.scale.setScalar(0.78);
      return fruit;
    });
  const drops = Array.from({ length: 6 }, (_, index) => {
    const mesh = makeApple(scene, index);
    mesh.name = 'Fallen apple';
    return { mesh, velocity: 0, ready: false };
  });
  let carried = false;
  let shakeTime = 0;
  let branchIndex = 0;

  function shake() {
    shakeTime = 0.9;
    for (const fruit of drops.filter(fruit => !fruit.mesh.visible).slice(0, 3)) {
      const [x, y, z] = branches[branchIndex];
      branchIndex = (branchIndex + 1) % branches.length;
      fruit.mesh.position.set(treeX + x, canopy.position.y + y, treeZ + z);
      fruit.mesh.rotation.set(0, 0, 0);
      fruit.mesh.visible = true;
      fruit.ready = false;
      fruit.velocity = 0;
    }
  }

  const interactions = [
    { x: treeX, z: treeZ, radius: 2.4, anchorY: 2.05,
      get active() { return shakeTime === 0 && drops.some(fruit => !fruit.mesh.visible); },
      label: 'Shake tree', act: shake },
    { x: basketX, z: basketZ, radius: 1.4, anchorY: 0.58,
      get active() { return !carried; },
      label: 'Pick up basket', act() {
        carried = true;
        camera.add(basket);
        basket.position.set(0.29, -0.44, -0.77);
        basket.rotation.set(-0.09, -0.13, 0.05);
        basket.scale.setScalar(0.61);
      } },
    ...drops.map(fruit => ({
      get x() { return fruit.mesh.position.x; },
      get z() { return fruit.mesh.position.z; },
      get active() { return carried && fruit.mesh.visible && fruit.ready; },
      label: 'Collect apple', radius: 1.15, anchorY: 0.34,
      act() {
        fruit.mesh.visible = false;
        fruit.ready = false;
        const spot = basketApples.find(apple => !apple.visible);
        if (spot) spot.visible = true;
      },
    })),
  ];

  return {
    interactions,
    update(dt) {
      shakeTime = Math.max(0, shakeTime - dt);
      canopy.rotation.z = Math.sin(shakeTime * 32) * shakeTime * 0.13;
      canopy.rotation.x = Math.cos(shakeTime * 29) * shakeTime * 0.09;
      for (const fruit of drops) {
        if (!fruit.mesh.visible || fruit.ready) continue;
        fruit.velocity -= 10.6 * dt;
        fruit.mesh.position.y = Math.max(0.115, fruit.mesh.position.y + fruit.velocity * dt);
        fruit.mesh.rotation.z += 2.5 * dt;
        if (fruit.mesh.position.y !== 0.115) continue;
        if (fruit.velocity < -2) fruit.velocity = -fruit.velocity * 0.24;
        else fruit.ready = true;
      }
    },
    reset() {
      carried = false;
      shakeTime = 0;
      branchIndex = 0;
      canopy.rotation.set(0, 0, 0);
      scene.add(basket);
      basket.position.set(basketX, 0.025, basketZ);
      basket.rotation.set(0, 0.21, 0);
      basket.scale.setScalar(1.23);
      for (const apple of basketApples) apple.visible = false;
      for (const fruit of drops) {
        fruit.mesh.visible = false;
        fruit.ready = false;
        fruit.velocity = 0;
      }
    },
  };
}

function addCabin({ mesh, box, matte, obstacles, collision }) {
  const cabinX = -17.15;
  const cabinZ = -17.15;
  const deck = 1.02;
  const porchZ = -14.2;
  const benchX = -15.23;
  const wood = matte(0x96603d);
  const paleWood = matte(0xc79966);
  const darkWood = matte(0x63402e);
  const roof = matte(0x974e41);
  const window = matte(0x9ec4c5);
  const stepDepth = 0.44;
  const steps = 5;
  mesh(box, paleWood, cabinX, deck - 0.13, -16.34, 6.45, 0.26, 5.16, undefined, true);
  obstacles.push(collision(cabinX, -16.34, 6.45, 5.16, deck));
  for (const x of [-19.88, -14.44]) {
    for (const z of [-18.53, -14.16]) {
      mesh(box, darkWood, x, 0.49, z, 0.32, 0.98, 0.34, undefined, true);
    }
  }
  for (let i = 0; i < steps; i++) {
    const height = deck * (steps - i) / steps;
    const z = -13.76 + stepDepth * (i + 0.5);
    mesh(box, paleWood, -17.6, height / 2, z, 1.94, height, stepDepth, undefined, true);
    obstacles.push(collision(-17.6, z, 1.94, stepDepth, height));
  }

  const wallDepth = 3.15;
  for (let i = 0; i < 10; i++) {
    mesh(box, i % 2 ? wood : paleWood, cabinX, deck + (i + 0.5) * 0.245, cabinZ,
      5.85, 0.237, wallDepth, undefined, true);
  }
  obstacles.push(collision(cabinX, cabinZ, 5.85, wallDepth, deck + 2.45));
  for (const side of [-1, 1]) {
    mesh(box, roof, cabinX + side * 1.5, deck + 2.82, cabinZ, 3.32, 0.2, 3.73, undefined, true)
      .rotation.z = -side * 0.31;
    const x = cabinX + side * 1.52;
    mesh(box, darkWood, x, deck + 1.41, cabinZ + 1.59, 1.26, 1.02, 0.09);
    mesh(box, window, x, deck + 1.41, cabinZ + 1.65, 1.02, 0.79, 0.045);
    mesh(box, darkWood, x, deck + 1.42, cabinZ + 1.69, 0.063, 0.79, 0.04);
    mesh(box, darkWood, x, deck + 1.42, cabinZ + 1.69, 1.02, 0.055, 0.04);
    mesh(box, darkWood, cabinX + side * 2.8, deck + 1.38, -13.95, 0.19, 2.76, 0.21, undefined, true);
  }
  mesh(box, roof, cabinX, deck + 2.51, -14.68, 6.25, 0.18, 1.95, undefined, true).rotation.x = 0.1;

  mesh(box, paleWood, benchX, deck + 0.47, porchZ, 1.62, 0.115, 0.5, undefined, true);
  for (const x of [benchX - 0.59, benchX + 0.59]) {
    mesh(box, darkWood, x, deck + 0.23, porchZ, 0.14, 0.46, 0.39);
    mesh(box, wood, x, deck + 0.72, porchZ - 0.22, 0.1, 0.65, 0.11);
  }
  for (const y of [0.72, 0.94]) {
    mesh(box, paleWood, benchX, deck + y, porchZ - 0.24, 1.62, 0.16, 0.105);
  }
  obstacles.push(collision(benchX, porchZ, 1.62, 0.5, deck + 0.53));

  return {
    x: benchX, z: porchZ, radius: 1.4, anchorY: deck + 0.96,
    label: 'Sit on bench',
    reachable: player => player.y >= 2.67 && player.z <= -13.54,
    act({ sit }) {
      sit({ x: benchX, y: deck + 1.31, z: porchZ + 0.04, yaw: Math.PI });
    },
  };
}

function addGlacier(THREE, { mesh, facet, matte }) {
  const ice = matte(0x7bb7cc);
  const blueIce = matte(0x8fcadd);
  const frost = matte(0xe4f2f5);
  const shard = new THREE.ConeGeometry(1, 1, 5);
  for (const [x, z, span, height] of [[11.9, -30.6, 5.5, 8.5], [16.9, -32.5, 7.6, 13.6], [23.1, -29.3, 5.8, 10.7]]) {
    const angle = x * 0.36;
    mesh(shard, blueIce, x, height / 2 - 0.2, z, span, height, span * 0.67).rotation.y = angle;
    mesh(shard, frost, x, height * 0.72 - 0.17, z, span * 0.57, height * 0.56, span * 0.38).rotation.y = angle;
  }
  for (const [x, z, scale] of [[14.6, -25.2, 0.9], [20.8, -24.9, 1.12], [21.8, -27.7, 1.42], [11.7, -26.5, 1.22]]) {
    mesh(facet, ice, x, 0.9 * scale, z, 1.62 * scale, 2.14 * scale, 1.2 * scale).rotation.y = x;
  }
}
