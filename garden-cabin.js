export function addCabin(THREE, { scene, mesh, box, matte, obstacles, collision }) {
  const x = -17.15;
  const z = -17.55;
  const deck = 1.02;
  const porchZ = -14.2;
  const benchX = -15.05;
  const deckFront = -13.76;
  const wood = matte(0x96603d);
  const paleWood = matte(0xc79966);
  const darkWood = matte(0x63402e);
  const roof = matte(0x974e41);
  const glass = matte(0x9ec4c5);
  const warmGlass = matte(0xc6dfca);
  const brass = matte(0xe0af61);

  function part(color, px, py, pz, sx, sy, sz, parent = scene) {
    return mesh(box, color, px, py, pz, sx, sy, sz, parent, true);
  }

  part(paleWood, x, deck - 0.13, deckFront - 3.015, 7.52, 0.26, 6.03);
  obstacles.push(collision(x, deckFront - 3.015, 7.52, 6.03, deck));
  for (const side of [-1, 1]) {
    for (const postZ of [-19.45, -14.16]) {
      part(darkWood, x + side * 3.28, 0.49, postZ, 0.32, 0.98, 0.34);
    }
  }
  const stepDepth = 0.44;
  const steps = 5;
  for (let i = 0; i < steps; i++) {
    const height = deck * (steps - i) / steps;
    const stepZ = deckFront + stepDepth * (i + 0.5);
    part(paleWood, -17.6, height / 2, stepZ, 2.06, height, stepDepth);
    obstacles.push(collision(-17.6, stepZ, 2.06, stepDepth, height));
  }

  const wallDepth = 3.68;
  const wallWidth = 6.66;
  const front = z + wallDepth / 2;
  for (let i = 0; i < 11; i++) {
    part(i % 2 ? wood : paleWood, x, deck + (i + 0.5) * 0.245, z, wallWidth, 0.237, wallDepth);
  }
  obstacles.push(collision(x, z, wallWidth, wallDepth, deck + 2.695));
  for (const side of [-1, 1]) {
    part(roof, x + side * 1.69, deck + 3.16, z, 3.68, 0.22, 4.29)
      .rotation.z = -side * 0.33;
    const windowX = x + side * 2.02;
    part(darkWood, windowX, deck + 1.53, front + 0.04, 1.56, 1.23, 0.12);
    part(glass, windowX, deck + 1.53, front + 0.117, 1.32, 1.0, 0.043);
    part(warmGlass, windowX - 0.36, deck + 1.73, front + 0.144, 0.45, 0.51, 0.016);
    part(darkWood, windowX, deck + 1.53, front + 0.152, 0.07, 1.0, 0.04);
    part(darkWood, windowX, deck + 1.53, front + 0.152, 1.33, 0.071, 0.04);
    part(paleWood, windowX, deck + 0.93, front + 0.145, 1.7, 0.11, 0.27);
    part(darkWood, x + side * 3.27, deck + 1.42, -13.98, 0.21, 2.84, 0.23);
  }
  part(roof, x, deck + 2.63, -14.73, 7.24, 0.19, 2.11).rotation.x = 0.11;

  const door = new THREE.Group();
  door.name = 'Cabin entrance';
  door.position.set(x, deck, front + 0.08);
  door.userData.transition = { destination: 'cabin-interior', enabled: false };
  scene.add(door);
  part(darkWood, 0, 1.12, 0, 1.52, 2.24, 0.14, door);
  part(wood, 0, 1.07, 0.09, 1.25, 2.11, 0.10, door);
  for (const side of [-1, 1]) {
    part(paleWood, side * 0.68, 1.12, 0.149, 0.12, 2.25, 0.18, door);
  }
  part(paleWood, 0, 2.23, 0.149, 1.55, 0.15, 0.18, door);
  part(darkWood, 0, 0.07, 0.149, 1.60, 0.14, 0.18, door);
  part(glass, 0, 1.73, 0.154, 0.55, 0.36, 0.035, door);
  part(brass, 0.43, 1.04, 0.178, 0.13, 0.12, 0.12, door);

  part(paleWood, benchX, deck + 0.47, porchZ, 1.62, 0.115, 0.5);
  for (const legX of [benchX - 0.59, benchX + 0.59]) {
    part(darkWood, legX, deck + 0.23, porchZ, 0.14, 0.46, 0.39);
    part(wood, legX, deck + 0.72, porchZ - 0.22, 0.1, 0.65, 0.11);
  }
  for (const y of [0.72, 0.94]) part(paleWood, benchX, deck + y, porchZ - 0.24, 1.62, 0.16, 0.105);
  obstacles.push(collision(benchX, porchZ, 1.62, 0.5, deck + 0.53));

  const table = { x: -19.43, z: -14.32, y: deck + 0.86 };
  part(paleWood, table.x, table.y - 0.063, table.z, 1.24, 0.126, 0.86);
  for (const sideX of [-1, 1]) {
    for (const sideZ of [-1, 1]) {
      part(darkWood, table.x + sideX * 0.48, deck + 0.37, table.z + sideZ * 0.32, 0.116, 0.74, 0.12);
    }
  }
  obstacles.push(collision(table.x, table.z, 1.24, 0.86, table.y));
  const onPorch = player => player.y >= 2.67 && player.z <= deckFront + 0.22;
  table.reachable = onPorch;

  return {
    table,
    bench: {
      x: benchX, z: porchZ, radius: 1.58, anchorY: deck + 0.96, label: 'Sit on bench',
      reachable: onPorch,
      act({ sit }) {
        sit({ x: benchX, y: deck + 1.31, z: porchZ + 0.04, yaw: Math.PI });
      },
    },
  };
}
