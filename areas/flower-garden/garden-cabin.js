export function addCabin(THREE, { scene, mesh, box, matte, obstacles, collision, batchParts, playCue, finishMission }) {
  const left = -22.5;
  const right = -13.62;
  const back = -29;
  const deckFront = -13.76;
  const x = (left + right) / 2;
  const deck = 1.02;
  const front = -16.1;
  const z = (back + front) / 2;
  const width = right - left - .22;
  const depth = front - back;
  const porchZ = -14.65;
  const benchX = -15.05;
  const wood = matte(0x96603d);
  const paleWood = matte(0xc79966);
  const darkWood = matte(0x63402e);
  const roof = matte(0x974e41);
  const glass = matte(0x9ec4c5);
  const brass = matte(0xf1c46b);
  const cabin = new THREE.Group();
  cabin.name = 'Wooden garden house';
  scene.add(cabin);

  function part(color, px, py, pz, sx, sy, sz, parent = cabin) {
    return mesh(box, color, px, py, pz, sx, sy, sz, parent, true);
  }

  part(paleWood, x, deck - .13, (back + deckFront) / 2, right - left, .26, deckFront - back);
  obstacles.push(collision(x, (back + deckFront) / 2, right - left, deckFront - back, deck));
  for (const px of [left + .25, right - .25]) {
    for (const pz of [back + .27, -22.5, deckFront - .25]) part(darkWood, px, .49, pz, .32, .98, .34);
    part(darkWood, px, deck + 1.48, deckFront - .26, .23, 2.96, .24);
    obstacles.push(collision(px, deckFront - .26, .23, .24, deck + 2.96));
  }
  function stairs(px, pz, count, base, rise, run, stairWidth) {
    for (let i = 0; i < count; i++) {
      const height = rise * (count - i) / count;
      const stepZ = pz + run * (i + .5);
      part(i % 2 ? wood : paleWood, px, base + height / 2, stepZ, stairWidth, height, run);
      obstacles.push(collision(px, stepZ, stairWidth, run, base + height));
    }
  }
  stairs(-17.6, deckFront, 5, 0, deck, .44, 2.06);

  const doorX = -17.6;
  const doorWidth = 1.48;
  const doorHeight = 2.24;
  const eaves = 3.22;
  function wall(px, pz, sx, sz, base = 0) {
    const rows = Math.ceil((eaves - base) / .25);
    const height = (eaves - base) / rows;
    for (let row = 0; row < rows; row++) {
      part(row % 3 === 0 ? wood : paleWood, px, deck + base + (row + .5) * height, pz, sx, height - .013, sz);
    }
    if (!base) obstacles.push(collision(px, pz, sx, sz, deck + eaves));
  }
  const outerLeft = x - width / 2;
  const outerRight = x + width / 2;
  const doorLeft = doorX - doorWidth / 2;
  const doorRight = doorX + doorWidth / 2;
  wall(x, back + .12, width, .24);
  for (const px of [outerLeft + .12, outerRight - .12]) wall(px, z + .12, .24, depth - .48);
  wall((outerLeft + doorLeft) / 2, front - .12, doorLeft - outerLeft, .24);
  wall((outerRight + doorRight) / 2, front - .12, outerRight - doorRight, .24);
  wall(doorX, front - .12, doorWidth, .24, doorHeight);
  for (const px of [doorLeft - .07, doorRight + .07]) {
    part(darkWood, px, deck + doorHeight / 2, front + .05, .14, doorHeight, .13);
  }
  part(darkWood, doorX, deck + doorHeight + .065, front + .05, doorWidth + .28, .13, .15);

  const pitch = .56;
  const roofRun = width / 2 + .25;
  for (const side of [-1, 1]) {
    part(roof, x + side * roofRun / 2, deck + eaves + roofRun * Math.tan(pitch) / 2,
      z, roofRun / Math.cos(pitch), .22, depth + .45).rotation.z = -side * pitch;
    part(darkWood, x + side * roofRun, deck + eaves, z, .15, .15, depth + .49);
  }
  part(roof, x, deck + eaves + roofRun * Math.tan(pitch), z, .18, .18, depth + .48);
  part(roof, x, deck + 2.94, (front + deckFront) / 2, width + .27, .17, deckFront - front + .3).rotation.x = .09;

  const gable = new THREE.BufferGeometry();
  const gableRise = width / 2 * Math.tan(pitch);
  gable.setAttribute('position', new THREE.Float32BufferAttribute([
    -width / 2, 0, 0, width / 2, 0, 0, 0, gableRise, 0,
  ], 3));
  gable.computeVertexNormals();
  mesh(gable, wood, x, deck + eaves, front - .14, 1, 1, 1, cabin, true);
  mesh(gable, wood, x, deck + eaves, back + .15, 1, 1, 1, cabin, true).rotation.y = Math.PI;
  function window(px, y, w, h, flowerBox = false) {
    part(darkWood, px, y, front + .035, w + .21, h + .21, .12);
    part(glass, px, y, front + .112, w, h, .06);
    part(paleWood, px, y, front + .159, .085, h, .043);
    part(paleWood, px, y, front + .159, w, .085, .043);
    if (flowerBox) {
      const planter = new THREE.Group();
      planter.name = 'Cabin flower window';
      cabin.add(planter);
      part(wood, px, y - h / 2 - .12, front + .16, w + .26, .22, .36, planter);
      const leaves = matte(0x6c8953);
      const petals = matte(0xe99d80);
      for (let i = -2; i <= 2; i++) {
        part(leaves, px + i * .23, y - h / 2 + .02, front + .265, .18, .16, .18, planter).rotation.z = i * .12;
        part(petals, px + i * .23, y - h / 2 + .14 + Math.cos(i) * .04, front + .295, .13, .11, .13, planter);
      }
      batchParts(planter);
    }
  }
  window(-20.12, deck + 1.59, 1.45, 1.04, true);
  window(-15.12, deck + 1.59, 1.38, 1.04);
  window(x, deck + eaves + .78, 1.45, .86);

  const loftY = deck + 2.6;
  const loftFront = -24;
  const loftLeft = x + .22;
  const loftWidth = outerRight - loftLeft - .24;
  part(wood, loftLeft + loftWidth / 2, (loftY + deck) / 2, (back + loftFront) / 2,
    loftWidth, loftY - deck, loftFront - back);
  obstacles.push(collision(loftLeft + loftWidth / 2, (back + loftFront) / 2, loftWidth, loftFront - back, loftY));
  const stairX = loftLeft + .86;
  stairs(stairX, loftFront, 12, deck, loftY - deck, .29, 1.72);
  for (const [px, pz, sx, sz] of [
    [loftLeft + .08, (back + loftFront) / 2, .16, loftFront - back - .28],
    [-15.92, (back + loftFront) / 2, .16, loftFront - back - .28],
    [(-15.92 + outerRight - .24) / 2, loftFront - .08, outerRight - .24 + 15.92, .16],
  ]) {
    part(darkWood, px, loftY + .77, pz, sx, .14, sz);
    for (const side of [-1, 1]) part(paleWood, px + side * (sx - .14) / 2, loftY + .4,
      pz + side * (sz - .14) / 2, .14, .8, .14);
    obstacles.push(collision(px, pz, sx, sz, loftY + .84));
  }

  part(paleWood, benchX, deck + .47, porchZ, 1.62, .115, .5);
  for (const legX of [benchX - .59, benchX + .59]) {
    part(darkWood, legX, deck + .23, porchZ, .14, .46, .39);
    part(wood, legX, deck + .72, porchZ - .22, .1, .65, .11);
  }
  for (const y of [.72, .94]) part(paleWood, benchX, deck + y, porchZ - .24, 1.62, .16, .105);
  obstacles.push(collision(benchX, porchZ, 1.62, .5, deck + .53));

  const table = { x: -19.43, z: -14.58, y: deck + .86 };
  part(paleWood, table.x, table.y - .063, table.z, 1.24, .126, .86);
  for (const sideX of [-1, 1]) {
    for (const sideZ of [-1, 1]) {
      part(darkWood, table.x + sideX * .48, deck + .37, table.z + sideZ * .32, .116, .74, .12);
    }
  }
  obstacles.push(collision(table.x, table.z, 1.24, .86, table.y));
  batchParts(cabin);

  const leaf = new THREE.Group();
  leaf.name = 'Garden house door';
  leaf.position.set(doorLeft, deck, front - .055);
  cabin.add(leaf);
  for (let i = 0; i < 6; i++) {
    part(i % 2 ? wood : paleWood, (i + .5) * doorWidth / 6, doorHeight / 2, 0,
      doorWidth / 6 - .012, doorHeight - .05, .085, leaf);
  }
  for (const y of [.31, 1.92]) part(darkWood, doorWidth / 2, y, .063, doorWidth - .08, .11, .066, leaf);
  for (const side of [-1, 1]) part(brass, doorWidth - .19, 1.09, side * .085, .11, .1, .085, leaf);
  batchParts(leaf);

  function touches(px, pz, angle, radius = .34) {
    const dx = px - leaf.position.x;
    const dz = pz - leaf.position.z;
    const localX = dx * Math.cos(angle) - dz * Math.sin(angle);
    const localZ = dx * Math.sin(angle) + dz * Math.cos(angle);
    return Math.hypot(Math.max(0, -localX, localX - doorWidth), Math.max(0, Math.abs(localZ) - .07)) < radius;
  }
  obstacles.push({ height: deck + doorHeight, touches: (px, pz) => touches(px, pz, leaf.rotation.y) });
  const onPorch = player => player.y >= 2.67 && player.z <= deckFront + .22 && player.z >= front + .1;
  table.reachable = onPorch;
  let open = false;

  return {
    table,
    door: {
      x: doorX, z: front, radius: 1.85, anchorY: deck + 1.15, silent: true,
      get label() { return open ? 'Close house door' : 'Open house door'; },
      reachable: player => Math.abs(player.y - (deck + 1.68)) < .28,
      act() {
        open = !open;
        playCue?.([[open ? 51 : 47, { endPitch: 36, duration: .14, level: .16, wave: 'triangle' }]]);
        if (open) finishMission('house');
      },
    },
    bench: {
      x: benchX, z: porchZ, radius: 1.58, anchorY: deck + .96, label: 'Sit on bench',
      reachable: onPorch,
      act({ sit }) {
        sit({ x: benchX, y: deck + 1.31, z: porchZ + .04, yaw: Math.PI }, 'Stand up');
        finishMission('bench');
      },
    },
    update(dt, player) {
      const target = open ? Math.PI / 2 : 0;
      const angle = leaf.rotation.y + THREE.MathUtils.clamp(target - leaf.rotation.y, -3 * dt, 3 * dt);
      if (!player || !touches(player.x, player.z, angle) || touches(player.x, player.z, leaf.rotation.y)) {
        leaf.rotation.y = angle;
      }
    },
    reset() {
      open = false;
      leaf.rotation.y = 0;
    },
  };
}
