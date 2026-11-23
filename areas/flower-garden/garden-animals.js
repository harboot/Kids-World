import { EYE_HEIGHT } from '../../core/player.js';

const moo = [
  [48, { endPitch: 41, duration: .46, level: .24, wave: 'triangle' }],
  [60, { endPitch: 52, duration: .34, level: .08, wave: 'triangle' }, .05],
];
const cluck = [
  [69, { endPitch: 59, duration: .088, level: .18, wave: 'triangle' }],
  [70, { endPitch: 61, duration: .077, level: .15, wave: 'triangle' }, .105],
  [75, { endPitch: 62, duration: .13, level: .19, wave: 'triangle' }, .2],
];

export function createAnimals(THREE, scene, playerRadius, finishMission, playCue) {
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
    const fullTurn = 2 * Math.PI;
    function pivot(parent, name, x, y, z) {
      const group = new THREE.Group();
      group.name = name;
      group.position.set(x, y, z);
      parent.add(group);
      return group;
    }

    const torso = pivot(body, 'Cow torso', 0, 0.93, 0);
    part(torso, 'cream', 0, 0, 0, 0.83, 0.68, 1.42);
    part(torso, 'dark', 0, 0.07, -0.38, 0.854, 0.585, 0.43);
    part(torso, 'dark', 0.429, -0.05, 0.3, 0.03, 0.29, 0.43);
    part(torso, 'cream', 0, 0.16, 0.64, 0.41, 0.55, 0.53);
    const head = pivot(torso, 'Cow head', 0, 0.24, 0.75);
    part(head, 'cream', 0, 0.05, 0.18, 0.47, 0.48, 0.51);
    part(head, 'pink', 0, -0.09, 0.46, 0.49, 0.23, 0.24);
    const eyes = pivot(head, 'Cow eyes', 0, 0.12, 0);
    const tail = pivot(torso, 'Cow tail', 0, 0.16, -0.7);
    part(tail, 'dark', 0, -0.25, 0, 0.08, 0.55, 0.09);

    const ears = [];
    const legs = [];
    for (const side of [-1, 1]) {
      part(eyes, 'dark', side * 0.238, 0, 0.28, 0.025, 0.078, 0.08);
      const ear = pivot(head, 'Cow ear', side * 0.29, 0.26, 0.13);
      part(ear, 'pink', 0, 0, 0, 0.23, 0.10, 0.16);
      ears.push({ side, pivot: ear });
      part(head, 'cream', side * 0.15, 0.36, 0.11, 0.08, 0.19, 0.09).rotation.z = -side * 0.38;
      for (const end of [-1, 1]) {
        const hip = pivot(body, 'Cow hip', side * 0.28, 0.65, end * 0.48);
        part(hip, 'cream', 0, -0.15, 0, 0.144, 0.38, 0.146);
        const knee = leg(hip, 0, -0.305, 0, 0.345, 0.13, 'cream', 'dark');
        knee.name = 'Cow knee';
        knee.children[1].scale.x = 0.148;
        legs.push({ hip, knee, phase: side === end ? 0 : Math.PI });
      }
    }

    const offset = variant * 1.3;
    let elapsed = 0, stride = offset, walk = 0;

    function pose(greetingProgress) {
      const idle = elapsed + offset;
      const greeting = Math.sin(Math.PI * greetingProgress);
      const nod = greeting * (1 - Math.cos(greetingProgress * fullTurn * 2)) * 0.19;
      const breath = Math.sin(idle * 2.2);
      const bob = walk * Math.abs(Math.sin(stride)) * 0.025;
      torso.position.y = 0.93 + bob;
      torso.scale.set(1 + breath * 0.013, 1 + breath * 0.022, 1);
      head.rotation.x = 0.035 * Math.sin(idle * 1.53) + nod + walk * Math.sin(stride * 2) * 0.025;
      head.rotation.y = 0.12 * Math.sin(idle * 0.84) * Math.sin(idle * 0.43) + greeting * 0.12;

      const blinkTime = (elapsed + variant * 0.9 + 0.7) % 4.6;
      eyes.scale.y = 1 - 0.93 * Math.sin(Math.PI * Math.min(blinkTime / 0.18, 1));
      for (const { side, pivot } of ears) {
        pivot.rotation.z = side * (0.30 + 0.065 * Math.sin(idle * 2.9 + side)
          + greeting * 0.19 * Math.sin(greetingProgress * fullTurn * 3 + side));
        pivot.rotation.y = side * (0.13 + greeting * 0.18);
      }
      tail.rotation.x = 0.34 + 0.12 * Math.sin(idle * 1.9);
      tail.rotation.z = 0.30 * Math.sin(idle * 2.5) + greeting * 0.24 * Math.sin(greetingProgress * fullTurn * 2);

      for (const { hip, knee, phase } of legs) {
        const step = stride + phase;
        const lift = Math.max(0, Math.sin(step)) * walk;
        hip.rotation.x = Math.cos(step) * walk * 0.32;
        hip.position.y = 0.65 + lift * 0.037;
        knee.rotation.x = 0.32 * lift;
      }
    }

    return {
      update(dt, speed, greetingProgress = 0) {
        elapsed += dt;
        stride = (stride + speed * dt * 11) % fullTurn;
        walk = THREE.MathUtils.damp(walk, Math.min(speed / 0.46, 1), 10, dt);
        pose(greetingProgress);
      },
      reset() {
        elapsed = 0;
        stride = offset;
        walk = 0;
        pose(0);
      },
    };
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
    return { root, body, cow, legs, x, z, rx, rz, pace, offset, width, depth, height, front, time: 0, reaction: 0, greeted: false };
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
    reset() {
      for (const animal of animals) {
        animal.reaction = 0;
        animal.greeted = false;
        animal.cow?.reset();
        place(animal, 0);
      }
    },
    update(dt, player) {
      for (const animal of animals) {
        const distance = player ? Math.hypot(player.x - animal.root.position.x, player.z - animal.root.position.z) : Infinity;
        const greetingRadius = animal.cow ? 1.85 : 1.3;
        if (distance > greetingRadius + .55) animal.greeted = false;
        if (!animal.reaction && !animal.greeted && distance <= greetingRadius &&
            Math.abs(player.y - EYE_HEIGHT) < .85) {
          animal.greeted = true;
          animal.reaction = animal.cow ? 1.25 : .92;
          for (const { joint } of animal.legs) joint.rotation.x = 0;
          playCue?.(animal.cow ? moo : cluck);
          finishMission(animal.cow ? 'cow' : 'chicken');
        }
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
