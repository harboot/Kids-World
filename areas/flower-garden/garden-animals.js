import { createCowFactory } from './garden-cow.js';

export function createAnimals(THREE, scene, playerRadius, finishMission) {
  const createCow = createCowFactory(THREE);
  const block = new THREE.BoxGeometry(1, 1, 1);
  const shadowShape = new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: 0x161811, transparent: true, opacity: 0.24, depthWrite: false,
  });
  const palette = Object.fromEntries(Object.entries({
    cream: 0xece2c9, dark: 0x352c29,
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

  function buildCow(body, variant) {
    const cow = createCow(variant);
    body.add(cow.root);
    return cow;
  }

  function animal(name, build, x, z, rx, rz, pace, offset, width, depth, height, front) {
    const root = new THREE.Group();
    root.name = name;
    const body = new THREE.Group();
    const shadow = new THREE.Mesh(shadowShape, shadowMaterial);
    shadow.position.set(0, 0.016, front);
    shadow.scale.set(width, 1, depth);
    const legs = [];
    const cow = build(body, legs);
    root.add(body, shadow);
    scene.add(root);
    return { root, body, cow, legs, x, z, rx, rz, pace, offset, width, depth, height, front, time: 0, reaction: 0 };
  }

  // Each route keeps the animal inside its own pen, even while the gate is open.
  const animals = [
    animal('Cow 1', body => buildCow(body, 0),
      -7.45, -6.96, 0.52, 1.14, 0.43, 1.9, 0.45, 1.14, 1.5, 0.24),
    animal('Cow 2', body => buildCow(body, 1),
      -3.39, -6.96, 0.58, 1.07, -0.39, 0.65, 0.45, 1.14, 1.5, 0.24),
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
    if (player && overlaps(animal, x, z, yaw, player.x, player.z)) return 0;

    animal.time = time;
    animal.root.position.set(x, 0, z);
    animal.root.rotation.y = yaw;
    if (animal.cow) {
      return Math.abs(animal.pace) * Math.hypot(sin * animal.rx, cos * animal.rz);
    }
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
      label: animal.cow ? 'Greet cow' : 'Make chicken jump',
      anchorY: animal.cow ? 1.7 : 0.7,
      radius: animal.cow ? 1.85 : 1.3,
      act() {
        if (animal.reaction) return;
        animal.reaction = animal.cow ? 1.25 : 0.92;
        for (const { joint } of animal.legs) joint.rotation.x = 0;
        finishMission(animal.cow ? 'cow' : 'chicken');
      },
    })),
    reset() {
      for (const animal of animals) {
        animal.reaction = 0;
        animal.cow?.reset();
        place(animal, 0);
      }
    },
    update(dt, player) {
      for (const animal of animals) {
        if (!animal.reaction) {
          const speed = place(animal, animal.time + dt, player);
          animal.cow?.update(dt, speed);
          continue;
        }
        animal.reaction = Math.max(0, animal.reaction - dt);
        if (animal.cow) {
          animal.cow.update(dt, 0, 1 - animal.reaction / 1.25);
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
