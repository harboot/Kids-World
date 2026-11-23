import { addMesh, rectangleBounds } from '../../core/geometry.js';
import { EYE_HEIGHT } from '../../core/player.js';
import { seededRandom } from '../../core/random.js';
import { createAnimals } from './garden-animals.js';
import { addBalloon } from './garden-balloon.js';
import { createGardenBatcher } from './garden-batches.js';
import { addCabin } from './garden-cabin.js';
import { addCave, CAVE_MOUTHS } from './garden-cave.js';
import { addMonkey, MONKEY_TREE } from './garden-monkey.js';
import { addOrchard } from './garden-orchard.js';
import { addPanorama } from './garden-panorama.js';
import { addPond, blocksPondTravel, bridgeDeckHeight } from './garden-pond.js';
import { addRabbits } from './garden-rabbits.js';
import { addShelter } from './garden-shelters.js';
import { addHillPath, createTerrain, drawTerrain } from './garden-terrain.js';
import { metadata } from './metadata.js';
import { music } from './music.js';

export const flowerGarden = {
  ...metadata,
  music,
  load: loadGarden,
};

export default flowerGarden;

function loadGarden({ THREE, scene, viewmodel, camera, touch, playerRadius = .34, completeLevel, playCue, notify,
  reducedMotion, signal }) {
  const { width, depth } = flowerGarden;
  const obstacles = [];
  const gates = [];
  const gateWidth = 1.64;
  const gateHeight = 1.2;
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
    const span = gateWidth;
    const leaf = new THREE.Group();
    leaf.name = kind === 'cow' ? 'Cow pen gate' : 'Chicken pen gate';
    leaf.position.set(center - span / 2, 0, z);
    scene.add(leaf);
    for (const y of railHeights) {
      mesh(box, caps, span / 2, y - .16, 0, span - .09, .17, .11, leaf);
    }
    for (const offset of [.09, span - .09]) {
      mesh(box, wood, offset, gateHeight / 2, 0, .14, gateHeight, .16, leaf);
    }
    mesh(box, caps, span / 2, .69, .12, .12, 1.27, .09, leaf).rotation.z = -.95;
    mesh(box, roofBlue, span - .25, .96, .115, .22, .14, .12, leaf);
    let open = false;

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
    obstacles.push({ height: gateHeight, touches: (x, z) => touches(x, z, leaf.rotation.y) });
    gates.push({
      update(dt, player) {
        const near = player && Math.abs(player.y - EYE_HEIGHT) < 1.1 &&
          Math.hypot(player.x - center, player.z - z) < (open ? 3.05 : 2.48);
        const target = near ? Math.PI / 2 : 0;
        const maxStep = reducedMotion?.() ? Math.PI / 2 : 3.4 * dt;
        const nextAngle = leaf.rotation.y + THREE.MathUtils.clamp(target - leaf.rotation.y, -maxStep, maxStep);
        if (player && touches(player.x, player.z, nextAngle) && !touches(player.x, player.z, leaf.rotation.y)) return;
        if (Boolean(near) !== open) {
          open = Boolean(near);
          playCue?.([[open ? 59 : 52, { endPitch: open ? 44 : 37, duration: .12, level: .13, wave: 'triangle' }]]);
        }
        leaf.rotation.y = nextAngle;
        if (open && nextAngle === target) finishMission(kind === 'cow' ? 'cow-gate' : 'chicken-gate');
      },
      reset() {
        open = false;
        leaf.rotation.y = 0;
      },
    });
  }

  function pen(left, right, front, back, kind, roof) {
    const center = (left + right) / 2;
    const wing = ((right - left) - gateWidth) / 2;
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
    MONKEY_TREE, [-12.4, -13, 0.94], [14.1, -13, 0.92], [-11.8, -18.7, 1.14], [10.6, -13.7, 1.02],
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

  const completed = new Set();
  function finishMission(id) {
    if (completed.has(id)) return;
    completed.add(id);
    if (!objectives.every(({ id }) => completed.has(id))) return;
    completeLevel?.('garden');
    notify?.('Flower Garden complete!');
  }

  const visualKit = { scene, mesh, box, facet, matte, instances, batchParts, reducedMotion, signal, playCue, finishMission };
  addPanorama(THREE, visualKit);
  const cave = addCave(THREE, visualKit);
  const balloon = addBalloon(THREE, { ...visualKit, camera });
  const monkey = addMonkey(THREE, visualKit);
  const cabin = addCabin(THREE, { ...visualKit, obstacles, collision });
  const animals = createAnimals(THREE, scene, playerRadius, finishMission, playCue);
  const rabbits = addRabbits(THREE, {
    ...visualKit, obstacles, collision, getTerrainHeight, playerRadius,
    feedRabbits: () => finishMission('rabbits'),
  });
  const orchard = addOrchard(THREE, {
    ...visualKit, viewmodel, obstacles, collision, getTerrainHeight, table: cabin.table,
    deliver: () => finishMission('apples'),
  });
  const pond = addPond(THREE, {
    ...visualKit, obstacles, getTerrainHeight, playerRadius,
    feedFish: () => finishMission('fish'),
  });

  const objectives = [
    { id: 'apples', title: 'Collect and deliver apples', total: orchard.appleTarget,
      get current() { return orchard.collectedApples; },
      get hint() { return orchard.deliveryHint; } },
    { id: 'fish', title: 'Feed the pond fish', hint: 'Find the fish feeder on the pond shore by the bridge.' },
    { id: 'cow-gate', title: 'Open the cow pen gate', hint: 'Walk up to the cow pen gate to open it.' },
    { id: 'cow', title: 'Greet a cow', hint: 'Walk inside the cow pen and approach a cow.' },
    { id: 'rabbits', title: 'Feed the rabbits',
      get hint() {
        if (rabbits.feeding) return 'Watch the rabbits gather at the feeding tray.';
        return rabbits.hasCarrots ? 'Take the carrots to the feeding tray beneath the hill.' :
          'Pick carrots from the patch at the foot of the small hill.';
      } },
    { id: 'chicken-gate', title: 'Open the chicken pen gate', hint: 'Walk up to the chicken pen gate to open it.' },
    { id: 'chicken', title: 'Make a chicken jump', hint: 'Walk inside the chicken pen and approach a chicken.' },
    { id: 'monkey', title: 'Meet the hanging monkey', hint: 'Walk toward the tree with a swaying tail in front of the wooden house.' },
    { id: 'house', title: 'Open the wooden house door', hint: 'Climb the porch steps and open the wooden house door.' },
    { id: 'bench', title: 'Sit on the porch bench', hint: 'Take a seat on the bench beside the house door.' },
    { id: 'cave', title: 'Discover the cave bats', hint: 'Approach either entrance to the rock cave behind the animal pens.' },
    { id: 'balloon', title: 'Take a balloon ride', get hint() { return balloon.flightHint; } },
  ];
  const missionStatus = {
    missions: objectives.map(objective => ({
      id: objective.id, title: objective.title, total: objective.total ?? 1,
      get current() { return objective.current ?? Number(this.complete); },
      get complete() { return completed.has(objective.id); },
    })),
    get inventory() { return rabbits.hasCarrots ? ['Carrots'] : []; },
    get hint() { return objectives.find(({ id }) => !completed.has(id))?.hint ?? ''; },
  };
  return {
    obstacles,
    get missionStatus() { return missionStatus; },
    getGroundHeight(x, z) {
      return Math.max(getTerrainHeight(x, z), bridgeDeckHeight(x, z));
    },
    blocksGround(x, z, radius, feet, from) {
      return blocksPondTravel(x, z, radius) || cave.blocks(x, z, radius) ||
        balloon.blocks(x, z, radius, feet) || orchard.blocks(x, z, radius, from) || rabbits.blocks(x, z, feet);
    },
    getCeilingHeight(x, z) { return Math.min(cave.ceiling(x, z), cabin.ceiling(x, z)); },
    animals,
    interactions: [...orchard.interactions, ...rabbits.interactions, pond.feedingSpot, cabin.door, cabin.bench, balloon.ride],
    update(dt, player) {
      animals.update(dt, player);
      orchard.update(dt);
      pond.update(dt);
      rabbits.update(dt, player);
      balloon.update(dt);
      cabin.update(dt, player);
      monkey.update(dt, player);
      cave.update(dt, player);
      for (const gate of gates) gate.update(dt, player);
    },
    reset() {
      completed.clear();
      animals.reset();
      orchard.reset();
      pond.reset();
      rabbits.reset();
      balloon.reset();
      cave.reset();
      cabin.reset();
      monkey.reset();
      for (const gate of gates) gate.reset();
    },
    unload() {
      balloon.unload();
      cave.unload();
    },
  };
}
