import { addGroup, SURFACE_GAP } from '../../core/geometry.js';
import { EYE_HEIGHT } from '../../core/player.js';

const svenCue = [
  [54, { duration: 0.17, endPitch: 58, level: 0.105, wave: 'triangle' }],
  [60, { duration: 0.22, endPitch: 55, level: 0.09, wave: 'triangle' }, 0.13],
];
const olafCue = [[76, { duration: 0.14, level: 0.08 }], [81, { duration: 0.18, level: 0.07 }, 0.075]];

export function addSnowCharacters({ THREE, scene, kit, ground, playerRadius, reducedMotion, playCue, notify, onGreetOlaf, onFeedSven }) {
  const { box, cone, material, obstacles } = kit;
  const facet = new THREE.DodecahedronGeometry(1);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 5);
  const batches = new Map();
  const dummy = new THREE.Object3D();
  const direction = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const tint = new THREE.Color();

  function record(parent, shape, color) {
    if (!batches.has(parent)) batches.set(parent, new Map());
    const shapes = batches.get(parent);
    if (!shapes.has(shape)) shapes.set(shape, []);
    dummy.updateMatrix();
    shapes.get(shape).push({ matrix: dummy.matrix.clone(), color });
  }

  function part(parent, shape, color, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, sy, sz);
    dummy.rotation.set(rx, ry, rz);
    record(parent, shape, color);
  }

  function branch(parent, color, a, b, radius) {
    direction.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    dummy.position.set(a[0] + direction.x / 2, a[1] + direction.y / 2, a[2] + direction.z / 2);
    dummy.scale.set(radius, direction.length(), radius);
    dummy.quaternion.setFromUnitVectors(up, direction.normalize());
    record(parent, cylinder, color);
  }

  const coal = 0x252433;
  const white = 0xf0f7f8;
  const tawny = 0x906045;
  const cream = 0xd9ba94;
  const antler = 0xc8ab82;

  const sven = addGroup(THREE, scene, 'Sven', -3.8, ground(-3.8, 20.4), 20.4, 2.65);
  const svenBody = addGroup(THREE, sven, 'Sven body');
  part(svenBody, facet, tawny, 0, 1.19, -0.16, 0.5, 0.6, 0.96);
  part(svenBody, facet, 0x704a35, 0, 1.39, -0.3, 0.47, 0.41, 0.77);
  part(svenBody, facet, cream, 0, 1.30, 0.45, 0.39, 0.7, 0.40, 0.3);
  part(svenBody, facet, tawny, 0, 1.53, 0.52, 0.34, 0.64, 0.39, 0.3);
  const tail = addGroup(THREE, svenBody, 'Sven tail', 0, 1.39, -0.92);
  part(tail, facet, tawny, 0, 0.06, -0.16, 0.13, 0.14, 0.26, 0.34);
  part(tail, facet, cream, 0, 0.068, -0.32, 0.09, 0.09, 0.11);
  const legs = [];
  for (const side of [-1, 1]) {
    for (const z of [-0.68, 0.37]) {
      const leg = addGroup(THREE, svenBody, 'Sven leg', side * 0.31, 0.94, z);
      part(leg, facet, tawny, 0, -0.24, 0, 0.17, 0.38, 0.18);
      part(leg, box, 0x6e4936, 0, -0.59, 0.013, 0.14, 0.5, 0.16);
      part(leg, box, coal, 0, -0.84, 0.071, 0.23, 0.19, 0.30);
      legs.push(leg);
    }
  }
  const svenHead = addGroup(THREE, svenBody, 'Sven head', 0, 1.94, 0.66);
  part(svenHead, facet, tawny, 0, 0.12, 0.13, 0.42, 0.46, 0.46);
  part(svenHead, facet, cream, 0, -0.09, 0.46, 0.4, 0.27, 0.36);
  part(svenHead, facet, 0x422f30, 0, -0.012, 0.72, 0.25, 0.13, 0.145);
  for (const side of [-1, 1]) {
    part(svenHead, facet, tawny, side * 0.45, 0.31, 0.01, 0.27, 0.124, 0.14, 0, 0, side * 0.39);
    part(svenHead, facet, 0xd6a484, side * 0.46, 0.32, 0.103, 0.17, 0.07, 0.057, 0, 0, side * 0.39);
    part(svenHead, facet, white, side * 0.267, 0.17, 0.415, 0.129, 0.145, 0.095, 0, side * 0.27);
    part(svenHead, facet, coal, side * 0.26, 0.168, 0.482, 0.067, 0.092, 0.047);
    part(svenHead, facet, white, side * 0.26 + 0.026, 0.197, 0.522, 0.022, 0.025, 0.014);
    part(svenHead, box, 0x65412e, side * 0.234, 0.323, 0.406, 0.19, 0.047, 0.064, 0, 0, side * -0.19);

    const root = [side * 0.23, 0.42, 0.035];
    const fork = [side * 0.38, 0.73, -0.065];
    const elbow = [side * 0.67, 0.96, -0.21];
    branch(svenHead, antler, root, fork, 0.083);
    branch(svenHead, antler, fork, elbow, 0.071);
    branch(svenHead, antler, elbow, [side * 0.77, 1.16, -0.27], 0.047);
    branch(svenHead, antler, fork, [side * 0.36, 1.01, 0.15], 0.052);
    branch(svenHead, antler, elbow, [side * 0.66, 1.22, -0.035], 0.046);
    branch(svenHead, antler, elbow, [side * 0.92, 1.025, -0.16], 0.044);
  }

  const kristoff = addGroup(THREE, scene, 'Kristoff', 0.32, ground(0.32, 20.89), 20.89, -3.02);
  const tunic = 0x38424d;
  const fur = 0xb8a999;
  const skin = 0xe0a77b;
  const blond = 0xe4b750;
  const boot = 0x4b3c37;
  part(kristoff, facet, tunic, 0, 1.04, 0, 0.38, 0.53, 0.23);
  part(kristoff, box, tunic, 0, 0.78, 0.015, 0.57, 0.36, 0.36);
  part(kristoff, box, fur, 0, 1.37, 0.008, 0.51, 0.125, 0.37);
  part(kristoff, box, fur, 0, 0.70, 0.012, 0.59, 0.077, 0.38);
  part(kristoff, box, 0x64536d, 0, 0.94, 0.012, 0.61, 0.13, 0.43);
  part(kristoff, box, 0xc1a27b, 0.062, 0.94, 0.234, 0.14, 0.105, 0.036);
  for (const side of [-1, 1]) {
    part(kristoff, box, 0x555d67, side * 0.16, 0.55, 0, 0.24, 0.44, 0.23);
    part(kristoff, box, boot, side * 0.16, 0.20, 0.049, 0.26, 0.39, 0.30);
    part(kristoff, box, boot, side * 0.16, 0.084, 0.14, 0.27, 0.16, 0.41);
    part(kristoff, box, fur, side * 0.16, 0.34, 0.047, 0.273, 0.08, 0.31);
  }
  const kristoffHead = addGroup(THREE, kristoff, 'Kristoff head', 0, 1.43, 0);
  part(kristoffHead, facet, skin, 0, 0.25, 0.034, 0.252, 0.292, 0.23);
  part(kristoffHead, facet, blond, 0, 0.40, -0.01, 0.273, 0.23, 0.24);
  part(kristoffHead, facet, blond, -0.104, 0.444, 0.159, 0.178, 0.137, 0.127, 0, 0, -0.32);
  part(kristoffHead, facet, 0xf0c866, 0.099, 0.436, 0.162, 0.139, 0.115, 0.105, 0, 0, 0.42);
  part(kristoffHead, facet, skin, 0, 0.239, 0.258, 0.057, 0.060, 0.066);
  part(kristoffHead, box, 0x915940, 0.021, 0.158, 0.244, 0.114, 0.021, 0.021, 0, 0, 0.10);
  for (const side of [-1, 1]) {
    part(kristoffHead, facet, skin, side * 0.232, 0.247, 0.022, 0.061, 0.083, 0.067);
    part(kristoffHead, facet, coal, side * 0.092, 0.295, 0.239, 0.033, 0.038, 0.025);
  }
  const arms = [-1, 1].map(side => {
    const arm = addGroup(THREE, kristoff, 'Kristoff arm', side * 0.315, 1.29, 0);
    part(arm, box, tunic, 0, -0.227, 0, 0.20, 0.48, 0.23);
    part(arm, box, fur, 0, -0.43, 0, 0.214, 0.095, 0.246);
    part(arm, facet, boot, 0, -0.54, 0.02, 0.125, 0.15, 0.12);
    return arm;
  });

  const olaf = addGroup(THREE, scene, 'Olaf', -8.1, ground(-8.1, 5.3), 5.3, 0.35);
  const olafBody = addGroup(THREE, olaf, 'Olaf body');
  const snow = 0xf3f9fa;
  const twig = 0x5e4338;
  const snowball = new THREE.SphereGeometry(1, 12, 8);
  for (const side of [-1, 1]) part(olafBody, snowball, snow, side * 0.17, 0.104, 0.11, 0.188, 0.116, 0.21);
  part(olafBody, snowball, snow, 0, 0.365, 0, 0.43, 0.329, 0.357);
  part(olafBody, snowball, snow, 0, 0.74, 0.012, 0.318, 0.278, 0.274);
  for (const [x, y, z] of [[0.015, 0.43, 0.348], [-0.022, 0.65, 0.265], [0.013, 0.817, 0.275]]) {
    part(olafBody, facet, coal, x, y, z, 0.058, 0.055, 0.041);
  }

  const olafHead = addGroup(THREE, olafBody, 'Olaf head', 0, 0.975, 0.045);
  part(olafHead, snowball, snow, 0, 0.272, 0, 0.294, 0.368, 0.252);
  part(olafHead, snowball, snow, 0, 0.136, 0.067, 0.315, 0.198, 0.233);
  const smileVertices = [];
  const smileIndices = [];
  for (let column = 0; column <= 10; column++) {
    const u = column / 5 - 1;
    const x = 0.187 * u;
    const bottom = 0.037 + 0.137 * Math.abs(u) ** 2.8;
    const top = 0.113 + 0.061 * u * u;
    for (const y of [bottom, (bottom + top) / 2, top]) {
      const z = 0.067 + 0.233 * Math.sqrt(1 - (x / 0.315) ** 2 - ((y - 0.136) / 0.198) ** 2);
      smileVertices.push(x, y, z + SURFACE_GAP.detail);
    }
    if (column === 0) continue;
    for (const row of [0, 1]) {
      const a = (column - 1) * 3 + row;
      smileIndices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4);
    }
  }
  const smile = new THREE.BufferGeometry();
  smile.setAttribute('position', new THREE.Float32BufferAttribute(smileVertices, 3));
  smile.setIndex(smileIndices);
  smile.computeVertexNormals();
  olafHead.add(new THREE.Mesh(smile, material(coal)));
  part(olafHead, box, white, 0, 0.117, 0.326, 0.102, 0.062, 0.032);
  part(olafHead, cone, 0xed7735, 0.015, 0.281, 0.417, 0.092, 0.366, 0.084, Math.PI / 2 - 0.09, 0, -0.10);
  for (const side of [-1, 1]) {
    part(olafHead, snowball, white, side * 0.101, 0.391, 0.225, 0.092, 0.102, 0.064);
    part(olafHead, snowball, coal, side * 0.082, 0.389, 0.279, 0.042, 0.057, 0.027);
    part(olafHead, facet, white, side * 0.082 + 0.011, 0.408, 0.305, 0.015, 0.017, 0.009);
    part(olafHead, box, twig, side * 0.113, 0.5, 0.194, 0.121, 0.035, 0.038, 0, 0, side * -0.20);
    branch(olafHead, twig, [side * 0.049, 0.606, 0], [side * 0.121, 0.757, -0.023], 0.025);
  }
  branch(olafHead, twig, [0.01, 0.61, 0], [0.032, 0.799, -0.045], 0.029);

  const sticks = [-1, 1].map(side => {
    const arm = addGroup(THREE, olafBody, 'Olaf branch arm', side * 0.24, 0.83, 0);
    const elbow = [side * 0.25, 0.09, 0.016];
    const hand = [side * 0.42, 0.225, 0.034];
    branch(arm, twig, [0, 0, 0], elbow, 0.037);
    branch(arm, twig, elbow, hand, 0.032);
    branch(arm, twig, hand, [side * 0.56, 0.269, 0.04], 0.023);
    branch(arm, twig, hand, [side * 0.46, 0.352, 0.017], 0.022);
    return arm;
  });

  for (const [parent, shapes] of batches) {
    for (const [shape, pieces] of shapes) {
      if (pieces.length === 1) {
        const [{ matrix, color }] = pieces;
        const mesh = new THREE.Mesh(shape, material(color));
        matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
        parent.add(mesh);
        continue;
      }
      const mesh = new THREE.InstancedMesh(shape, material(0xffffff), pieces.length);
      for (const [i, { matrix, color }] of pieces.entries()) {
        mesh.setMatrixAt(i, matrix);
        mesh.setColorAt(i, tint.setHex(color));
      }
      mesh.computeBoundingSphere();
      parent.add(mesh);
    }
  }

  const shadowShape = new THREE.CircleGeometry(1, 12).rotateX(-Math.PI / 2);
  const shadowInk = new THREE.MeshBasicMaterial({ color: 0x6792a9, transparent: true, opacity: 0.22, depthWrite: false });
  for (const [model, width, length] of [[sven, 0.64, 1.2], [kristoff, 0.52, 0.37], [olaf, 0.52, 0.4]]) {
    const shadow = new THREE.Mesh(shadowShape, shadowInk);
    shadow.position.copy(model.position);
    shadow.position.y += SURFACE_GAP.detail;
    shadow.rotation.y = model.rotation.y;
    shadow.scale.set(width, 1, length);
    scene.add(shadow);
  }

  // Carrot appears at Sven's muzzle during feeding; no inventory pickup needed.
  const carrot = new THREE.Group();
  carrot.name = 'Sven offered carrot';
  carrot.position.set(0, -0.14, 0.96);
  carrot.rotation.x = Math.PI / 2;
  const carrotRoot = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.42, 7), material(0xf58a26));
  carrotRoot.rotation.z = Math.PI;
  carrot.add(carrotRoot);
  const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.16, 5), material(0x589646));
  leaves.position.y = 0.27;
  carrot.add(leaves);
  svenHead.add(carrot);
  carrot.visible = false;
  let feeding = 0;
  const greetingRadius = 4.4;
  let time = 0;
  const characters = [
    {
      model: sven, width: 0.53, depth: 1.04, height: 1.54, duration: 1.32,
      action: () => playCue?.(svenCue),
      pose(t, reaction) {
        const happy = Math.sin(Math.PI * reaction);
        const hoof = Math.max(0, Math.sin(t * 1.4)) ** 12;
        svenHead.rotation.x = Math.sin(t * 1.08) * 0.07 - Math.sin(reaction * Math.PI * 4) * happy * 0.18;
        svenHead.rotation.y = Math.sin(t * 0.76) * 0.17;
        tail.rotation.y = Math.sin(t * 2.05) * 0.17 + Math.sin(reaction * Math.PI * 11) * happy * 0.54;
        legs[1].rotation.x = -0.18 * hoof - 0.34 * happy;
        legs[1].position.y = 0.94 + 0.046 * hoof + 0.13 * happy;
      },
    },
    {
      model: kristoff, width: 0.36, depth: 0.26, height: 1.32, duration: 1.62,
      action: () => notify?.('Kristoff: Follow the blue trail markers up the northern ice mountain!'),
      pose(t, reaction) {
        kristoffHead.rotation.y = Math.sin(t * 0.83) * 0.16;
        kristoffHead.rotation.x = Math.sin(t * 1.28) * 0.046;
        arms[0].rotation.z = -0.15 - 0.16 * Math.max(0, Math.sin(t * 1.2)) ** 6;
        const wave = Math.min(1, reaction * 8, (1 - reaction) * 5);
        arms[1].rotation.z = 0.15 + wave * (2.83 + Math.sin(reaction * Math.PI * 7) * 0.24);
        arms[1].rotation.x = -0.24 * wave;
      },
    },
    {
      model: olaf, width: 0.36, depth: 0.29, height: 0.61, duration: 1.08,
      action() {
        playCue?.(olafCue);
        notify?.('Olaf: Hi! Nice to meet you!');
        onGreetOlaf();
      },
      pose(t, reaction) {
        const bounce = Math.sin(t * 2.02);
        const happy = Math.sin(Math.PI * reaction);
        olafBody.position.y = 0.045 * bounce * bounce + 0.26 * happy;
        olafBody.rotation.y = Math.PI * 2 * reaction * reaction * (3 - 2 * reaction);
        olafHead.rotation.y = Math.sin(t * 0.95) * 0.21;
        sticks[0].rotation.z = Math.sin(t * 1.16) * 0.15 - 0.45 * happy;
        sticks[1].rotation.z = -Math.sin(t * 1.62) * 0.16 + 0.45 * happy;
      },
    },
  ];

  for (const character of characters) {
    const { model, width, depth, height } = character;
    const { x, y, z } = model.position;
    const cos = Math.cos(model.rotation.y);
    const sin = Math.sin(model.rotation.y);
    obstacles.push({
      height: y + height,
      touches(px, pz) {
        const dx = px - x;
        const dz = pz - z;
        return Math.hypot((dx * cos - dz * sin) / (width + playerRadius),
          (dz * cos + dx * sin) / (depth + playerRadius)) < 1;
      },
    });
  }

  return {
    interaction: {
      x: sven.position.x, z: sven.position.z, anchorY: sven.position.y + 1.8, radius: 2.7,
      label: 'Offer carrot', get active() { return feeding === 0; },
      act() {
        if (feeding > 0) return false;
        feeding = 1.5;
        playCue?.(svenCue);
        notify?.('Sven: Yum! Thank you for the carrot!');
        onFeedSven?.();
        return true;
      },
    },
    update(dt, eye) {
      const still = reducedMotion?.();
      if (!still) time = (time + dt) % 600;
      for (const character of characters) {
        if (eye) {
          const { x, y, z } = character.model.position;
          const distance = Math.hypot(eye.x - x, eye.z - z);
          const vertical = Math.abs(eye.y - y - EYE_HEIGHT);
          if (distance > greetingRadius + 0.65 || vertical >= 1.4) character.nearby = false;
          if (!character.nearby && distance <= greetingRadius && vertical < 1) {
            character.nearby = true;
            character.remaining = character.duration;
            character.action();
          }
        }
        if (still) character.remaining = 0;
        else character.remaining = Math.max(0, character.remaining - dt);
        const reaction = character.remaining > 0 ? 1 - character.remaining / character.duration : 0;
        character.pose(still ? 0 : time, reaction);
      }
      feeding = Math.max(0, feeding - dt);
      carrot.visible = feeding > 0.35;
      carrot.scale.setScalar(Math.min(1, feeding / 0.75));
      if (feeding > 0 && !still) {
        svenHead.rotation.x = 0.19 + Math.sin(feeding * 18) * 0.08;
        tail.rotation.y = Math.sin(feeding * 15) * 0.47;
      }
    },
    reset() {
      feeding = 0;
      carrot.visible = false;
      time = 0;
      for (const character of characters) {
        character.remaining = 0;
        character.nearby = false;
        character.pose(0, 0);
      }
    },
  };
}
