const APPLES_TO_DELIVER = 3;

export function nextBasketState(state, action) {
  if (action === 'reset') return 'ground';
  if (action === 'pickUp' && (state === 'ground' || state === 'placed')) return 'carried';
  if (action === 'place' && state === 'carried') return 'placed';
  return state;
}

export function addOrchard(THREE, { scene, viewmodel, mesh, box, facet, matte, obstacles, collision, getTerrainHeight, table, deliver }) {
  const treeX = 11.2;
  const treeZ = 8.25;
  const basketX = 8.7;
  const basketZ = 8.35;
  const treeGround = getTerrainHeight(treeX, treeZ);
  const basketGround = getTerrainHeight(basketX, basketZ);
  const bark = matte(0x855336);
  const greens = [matte(0x6f9b46), matte(0x89ab54), matte(0x527d43)];
  const red = matte(0xd84b46);
  const gold = matte(0xeeac4a);
  const wicker = matte(0xb77738);
  const rim = matte(0xd4a364);
  const canopy = new THREE.Group();
  canopy.name = 'Apple tree canopy';
  canopy.position.set(treeX, treeGround + 2.2, treeZ);
  scene.add(canopy);
  const trunk = new THREE.CylinderGeometry(0.31, 0.49, 1, 7);
  mesh(trunk, bark, treeX, treeGround + 1.45, treeZ, 1, 2.9, 1, scene, true);
  obstacles.push(collision(treeX, treeZ, 0.86, 0.86, treeGround + 2.8));
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
    return { mesh, velocity: 0, ready: false, floor: 0 };
  });
  let basketState = 'ground';
  let appleCount = 0;
  let shakeTime = 0;
  let branchIndex = 0;

  function shake() {
    shakeTime = 0.9;
    for (const fruit of drops.filter(fruit => !fruit.mesh.visible).slice(0, 3)) {
      const [x, y, z] = branches[branchIndex];
      branchIndex = (branchIndex + 1) % branches.length;
      fruit.mesh.position.set(treeX + x, canopy.position.y + y, treeZ + z);
      fruit.floor = getTerrainHeight(fruit.mesh.position.x, fruit.mesh.position.z) + 0.115;
      fruit.mesh.rotation.set(0, 0, 0);
      fruit.mesh.visible = true;
      fruit.ready = false;
      fruit.velocity = 0;
    }
  }

  function moveBasket(action) {
    const state = nextBasketState(basketState, action);
    if (state === basketState && action !== 'reset') return;
    basketState = state;
    if (state === 'carried') {
      viewmodel.add(basket);
      basket.position.set(0.29, -0.44, -0.77);
      basket.rotation.set(-0.09, -0.13, 0.05);
      basket.scale.setScalar(0.61);
      return;
    }
    scene.add(basket);
    if (state === 'placed') {
      basket.position.set(table.x, table.y + 0.004, table.z);
      basket.rotation.set(0, -0.18, 0);
      basket.scale.setScalar(1.08);
      if (appleCount >= APPLES_TO_DELIVER) deliver();
    } else {
      basket.position.set(basketX, basketGround + 0.025, basketZ);
      basket.rotation.set(0, 0.21, 0);
      basket.scale.setScalar(1.23);
    }
  }

  const interactions = [
    { x: treeX, z: treeZ, radius: 2.4, anchorY: treeGround + 2.05,
      get active() { return shakeTime === 0 && drops.some(fruit => !fruit.mesh.visible); },
      label: 'Shake tree', act: shake },
    { x: basketX, z: basketZ, radius: 1.4, anchorY: basketGround + 0.58,
      get active() { return basketState === 'ground'; },
      label: 'Pick up basket', act: () => moveBasket('pickUp') },
    { x: table.x, z: table.z, radius: 1.5, anchorY: table.y + 0.48, reachable: table.reachable,
      get active() { return basketState !== 'ground'; },
      get label() { return basketState === 'carried' ? 'Place basket' : 'Pick up basket'; },
      act() { moveBasket(basketState === 'carried' ? 'place' : 'pickUp'); } },
    ...drops.map(fruit => ({
      get x() { return fruit.mesh.position.x; },
      get z() { return fruit.mesh.position.z; },
      get active() { return basketState === 'carried' && appleCount < basketApples.length && fruit.mesh.visible && fruit.ready; },
      get anchorY() { return fruit.floor + 0.225; },
      label: 'Collect apple', radius: 1.15,
      act() {
        if (!this.active) return;
        fruit.mesh.visible = false;
        fruit.ready = false;
        basketApples[appleCount++].visible = true;
      },
    })),
  ];

  return {
    interactions,
    appleTarget: APPLES_TO_DELIVER,
    get collectedApples() { return Math.min(appleCount, APPLES_TO_DELIVER); },
    get deliveryHint() {
      if (basketState !== 'carried') {
        return basketState === 'ground' ? 'Pick up the basket by the apple tree' : 'Pick up your basket for more apples';
      }
      if (appleCount >= APPLES_TO_DELIVER) return 'Place the basket on the cabin table';
      return 'Shake the apple tree';
    },
    update(dt) {
      shakeTime = Math.max(0, shakeTime - dt);
      canopy.rotation.z = Math.sin(shakeTime * 32) * shakeTime * 0.13;
      canopy.rotation.x = Math.cos(shakeTime * 29) * shakeTime * 0.09;
      for (const fruit of drops) {
        if (!fruit.mesh.visible || fruit.ready) continue;
        fruit.velocity -= 10.6 * dt;
        fruit.mesh.position.y = Math.max(fruit.floor, fruit.mesh.position.y + fruit.velocity * dt);
        fruit.mesh.rotation.z += 2.5 * dt;
        if (fruit.mesh.position.y !== fruit.floor) continue;
        if (fruit.velocity < -2) fruit.velocity = -fruit.velocity * 0.24;
        else fruit.ready = true;
      }
    },
    reset() {
      moveBasket('reset');
      shakeTime = 0;
      branchIndex = 0;
      appleCount = 0;
      canopy.rotation.set(0, 0, 0);
      for (const apple of basketApples) apple.visible = false;
      for (const fruit of drops) {
        fruit.mesh.visible = false;
        fruit.ready = false;
        fruit.velocity = 0;
      }
    },
  };
}
