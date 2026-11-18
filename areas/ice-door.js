export function registerDoor(THREE, scene, obstacles, model, { bounds, available, reducedMotion, ...interaction }) {
  const isOpen = available ?? (() => true);
  model.visible = isOpen();
  model.name = interaction.label;
  scene.add(model);
  obstacles.push({ ...bounds, get height() { return isOpen() ? bounds.height : 0; } });
  const sparkles = available ? addDoorSparkles(THREE, model, bounds) : null;
  let remaining = 0;
  return {
    ...interaction,
    get active() { return isOpen(); },
    act(context) { if (isOpen()) interaction.act(context); },
    refresh(dt = 0) {
      const open = isOpen();
      if (open && !model.visible) remaining = 2.4;
      model.visible = open;
      if (!sparkles || remaining === 0) return;
      remaining = open ? Math.max(0, remaining - dt) : 0;
      sparkles.visible = remaining > 0;
      sparkles.scale.setScalar(reducedMotion?.() ? 1 : 0.85 + 0.15 * Math.cos(remaining * 9));
    },
    resetHighlight() {
      remaining = 0;
      if (sparkles) sparkles.visible = false;
    },
  };
}

function addDoorSparkles(THREE, model, bounds) {
  const sparkles = new THREE.Group();
  sparkles.name = 'Door unlock sparkles';
  sparkles.position.set(0, bounds.height + 0.25, 0.48);
  sparkles.visible = false;
  const geometry = new THREE.OctahedronGeometry(1);
  const material = new THREE.MeshBasicMaterial({ color: 0xfff0ae });
  for (const [x, y, size] of [[-0.55, 0, 0.17], [0, 0.27, 0.24], [0.55, 0.06, 0.15]]) {
    const sparkle = new THREE.Mesh(geometry, material);
    sparkle.position.set(x, y, 0);
    sparkle.scale.set(size * 0.62, size, size * 0.62);
    sparkles.add(sparkle);
  }
  model.add(sparkles);
  return sparkles;
}

export function addIceDoor(THREE, scene, obstacles, passage) {
  const door = new THREE.Group();
  door.position.set(passage.x, 0, passage.z);
  const frame = new THREE.MeshLambertMaterial({ color: 0x589dbb });
  const panel = new THREE.MeshLambertMaterial({ color: 0x96d7e8, emissive: 0x17404d });
  const trim = new THREE.MeshBasicMaterial({ color: 0xe2faff });
  const geometry = new THREE.BoxGeometry(1, 1, 1);

  function part(x, y, z, sx, sy, sz, material) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.receiveShadow = true;
    door.add(mesh);
  }

  part(0, 1.38, 0, 1.75, 2.76, 0.15, panel);
  part(0, 2.91, 0.01, 2.37, 0.3, 0.34, frame);
  part(0, 2.92, 0.19, 0.98, 0.1, 0.04, trim);
  part(0, 0.06, 0.15, 2.36, 0.12, 0.51, frame);
  for (const side of [-1, 1]) {
    part(side * 0.99, 1.45, 0, 0.26, 2.9, 0.32, frame);
    part(side * 0.39, 1.37, 0.092, 0.035, 1.75, 0.035, trim);
  }
  const shard = new THREE.OctahedronGeometry(1);
  for (const [x, y, sx, sy] of [[-1.16, 2.64, .28, .88], [1.12, 2.49, .24, .72], [0, 1.36, .39, .62]]) {
    const crystal = new THREE.Mesh(shard, x ? frame : trim);
    crystal.position.set(x, y, 0.13);
    crystal.scale.set(sx, sy, 0.2);
    door.add(crystal);
  }
  return registerDoor(THREE, scene, obstacles, door, {
    x: passage.x, z: passage.z, label: passage.label,
    available: passage.available, reducedMotion: passage.reducedMotion,
    bounds: {
      left: passage.x - 1.19, right: passage.x + 1.19,
      front: passage.z - 0.16, back: passage.z + 0.24, height: 3.06,
    },
    act({ travel, heardCue }) {
      travel(passage.destination, heardCue);
    },
  });
}
