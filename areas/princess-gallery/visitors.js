import { addGroup, SURFACE_GAP } from '../../core/geometry.js';
import { PLAYER_RADIUS } from '../../core/movement.js';

const people = [
  { name: 'Lobby guard', route: 'lobby', x: 3.12, z: 42.5, yaw: -.21, style: 'guard', skin: 0xc4866e, hair: 0x392826 },
  { name: 'Royal Wing guard', route: 'royalGuard', x: -3.05, z: -25.9, yaw: .50, style: 'guard', skin: 0x9c624d, hair: 0x322629 },
  { name: 'Woodland family parent with jacket', route: 'family', x: -19.7, z: 22.71, yaw: -2.55, color: 0x4f7f7a,
    skin: 0xc88767, hair: 0x483333, style: 'coat' },
  { name: 'Woodland family parent with dress', route: 'family', x: -18.55, z: 21.94, yaw: -1.53, color: 0xb0647d,
    skin: 0xa87554, hair: 0x352b30, style: 'dress' },
  { name: 'Woodland family child', route: 'family', x: -20.99, z: 21.77, yaw: -2.82, color: 0xedbb64,
    skin: 0xb77b5b, hair: 0x463338, style: 'child' },
  { name: 'Royal Wing visitor with dress', route: 'royalVisitors', x: -11.94, z: -18.35, yaw: 2.79, color: 0x7484af,
    skin: 0xe5ae90, hair: 0x9d5e3c, style: 'dress' },
  { name: 'Royal Wing visitor with satchel', route: 'royalVisitors', x: -9.86, z: -18.46, yaw: -2.81, color: 0xa16854,
    skin: 0x8f5e4d, hair: 0x3a3032, style: 'coat', satchel: true },
  { name: 'Adventure Wing stroller parent', route: 'stroller', x: 25.85, z: 17.25, yaw: -.53, color: 0x617caf,
    skin: 0xc68365, hair: 0x49323c, style: 'parent' },
];
const strolls = {
  lobby: { rx: .76, rz: -.45, period: 8.2 },
  royalGuard: { rx: .57, rz: -.40, period: 8.8 },
  family: { rx: .66, rz: .71, period: 9.6 },
  royalVisitors: { rx: .54, rz: .45, period: 8.4 },
  stroller: { rx: 1.09, rz: 1.36, period: 13.8 },
};
const vendorLooks = [[0xbc7f60, 0x433139], [0x9a654f, 0x3a2f32], [0xe0a784, 0x975745], [0xc38868, 0x392c30]];

// A rig draws one opaque mesh per moving joint, with clothing and facial colors carried by its vertices.
function assemble(THREE, source, target, material) {
  source.updateMatrixWorld(true);
  const positions = [], normals = [], colors = [], indices = [];
  const position = new THREE.Vector3(), normal = new THREE.Vector3(), normalMatrix = new THREE.Matrix3();
  for (const mesh of source.children) {
    const vertices = mesh.geometry.getAttribute('position');
    const directions = mesh.geometry.getAttribute('normal');
    const { index } = mesh.geometry;
    const { r, g, b } = mesh.material.color;
    const offset = positions.length / 3;
    normalMatrix.getNormalMatrix(mesh.matrixWorld);
    for (let i = 0; i < vertices.count; i++) {
      positions.push(...position.fromBufferAttribute(vertices, i).applyMatrix4(mesh.matrixWorld).toArray());
      normals.push(...normal.fromBufferAttribute(directions, i).applyNormalMatrix(normalMatrix).toArray());
      colors.push(r, g, b);
    }
    for (let i = 0; i < (index?.count ?? vertices.count); i++) indices.push(offset + (index?.getX(i) ?? i));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  target.add(new THREE.Mesh(geometry, material));
}

function buildPerson(THREE, group, parts, palette, style, color, skinColor, hairColor, satchel) {
  const { part, beam, matte } = parts;
  const { navy, boots, linen, gold, ink, white, leather, trim, fabricMesh, skirt, hem } = palette;
  const guard = style === 'guard';
  const dress = style === 'dress';
  const child = style === 'child';
  const parent = style === 'parent';
  const vendor = style === 'vendor';
  const skin = matte(skinColor);
  const hair = matte(hairColor);
  const clothing = guard ? navy : matte(color);
  const body = new THREE.Group();
  part(body, 'sphere', clothing, 0, 1.063, 0, .242, .298, .156);
  part(body, 'drum', skin, 0, 1.356, 0, .071, .146, .069);
  part(body, 'sphere', linen, 0, 1.281, .065, .105, .062, .098);
  part(body, 'sphere', guard ? gold : leather, 0, .912, 0, .224, .046, .152);
  if (dress) {
    part(body, skirt, clothing, 0, 0, .002, 1, 1, .76);
    part(body, hem, linen, 0, 0, .002, 1, 1, .76);
    for (const side of [-1, 1]) {
      part(body, 'sphere', linen, side * .174, .545, .163, .032, .177, .029).rotation.z = side * .28;
    }
  } else {
    part(body, 'box', clothing, 0, .845, 0, .355, .20, .224);
    if (!child) for (const side of [-1, 1]) {
      beam(body, guard ? gold : linen, [side * .096, 1.285, .126], [side * .039, 1.104, .154], .036);
    }
    if (guard) {
      for (const y of [.973, 1.06, 1.15]) part(body, 'sphere', gold, 0, y, .156, .023, .023, .022);
      part(body, 'gem', gold, -.105, 1.192, .143, .049, .058, .030);
      part(body, 'box', leather, .139, .901, .124, .093, .124, .073);
    }
    if (vendor) {
      for (const side of [-1, 1]) {
        part(body, 'box', linen, side * .098, 1.141, .145, .036, .255, .035);
      }
      part(body, 'sphere', linen, 0, .966, .143, .158, .242, .054);
      part(body, 'box', trim, 0, .929, .202, .124, .079, .026);
    }
    if (child) {
      for (const side of [-1, 1]) {
        part(body, 'box', trim, side * .095, 1.114, .143, .045, .215, .033);
      }
      part(body, 'box', trim, 0, 1.053, .148 + SURFACE_GAP.detail, .228, .167, .068);
    }
  }


  if (satchel) {
    beam(body, leather, [-.18, 1.27, .117], [.18, .823, .170], .037);
    part(body, 'box', leather, .216, .787, .104, .222, .251, .156).rotation.z = -.16;
    part(body, 'box', trim, .227, .855, .193, .206, .124, .043).rotation.z = -.16;
    part(body, 'gem', gold, .223, .817, .220, .027, .030, .015);
  }
  assemble(THREE, body, group, fabricMesh);
  const legs = [-1, 1].map(side => {
    const leg = addGroup(THREE, group, group.name + (side < 0 ? ' left leg' : ' right leg'),
      side * .111, .766, 0);
    const shoe = new THREE.Group();
    const pants = guard || child ? navy : trim;
    part(shoe, 'sphere', boots, 0, -.695, .061, .094, .075, .146);
    part(shoe, 'sphere', dress ? skin : pants, 0, dress ? -.544 : -.290, 0, .076, dress ? .168 : .356, .080);
    if (guard) part(shoe, 'drum', boots, 0, -.597, 0, .079, .173, .082);
    assemble(THREE, shoe, leg, fabricMesh);
    return leg;
  });

  const head = addGroup(THREE, group, group.name + ' head', 0, child ? 1.51 : 1.574, .008);
  const face = new THREE.Group();
  const headWidth = child ? .219 : .189;
  part(face, 'sphere', skin, 0, 0, .013, headWidth, child ? .218 : .220, .166);
  part(face, 'sphere', hair, 0, .084, -.049, headWidth + .009, .169, .157);
  for (const side of [-1, 1]) {
    part(face, 'sphere', skin, side * headWidth, -.020, .014, .037, .052, .040);
    const eye = [side * .067, .030, .162];
    part(face, 'sphere', white, ...eye, .030, .035, .021);
    part(face, 'sphere', ink, eye[0] + .006, .026, .179, .018, .022, .014);
    part(face, 'sphere', white, eye[0] + .009, .038, .192, .007, .008, .004);
    part(face, 'sphere', hair, eye[0], .094, .157, .035, .010, .013).rotation.z = -side * .13;
    if (dress) part(face, 'sphere', gold, side * headWidth, -.072, .035, .023, .026, .022);
  }
  part(face, 'sphere', skin, 0, -.021, .167, .034, .038, .042);
  for (const side of [-1, 1]) {
    beam(face, leather, [0, -.083, .167], [side * .043, -.073, .163], .012);
  }
  if (guard) {
    part(face, 'drum', navy, 0, .184, -.003, .214, .125, .186);
    part(face, 'drum', gold, 0, .138, .003, .219, .036, .189);
    part(face, 'sphere', boots, 0, .116, .118, .204, .032, .126);
    part(face, 'gem', gold, 0, .193, .192, .042, .056, .026);
  } else if (vendor) {
    part(face, 'drum', clothing, 0, .143, -.012, .222, .062, .191);
    part(face, 'sphere', linen, .012, .194, -.025, .235, .095, .192);
    part(face, 'sphere', linen, .017, .139, .117, .174, .027, .125);
  } else {
    part(face, 'sphere', hair, -.061, .119, .122, headWidth * .70, .090, .103).rotation.z = .26;
    if (dress) {
      part(face, 'sphere', hair, .011, .103, -.169, .105, .102, .091);
      part(face, 'sphere', clothing, -.146, .15, .083, .072, .043, .048).rotation.z = .27;
    } else if (child) {
      part(face, 'sphere', hair, .142, .086, -.068, .095, .107, .103);
      part(face, 'sphere', clothing, .185, .069, -.047, .046, .047, .044);
    }
  }
  assemble(THREE, face, head, fabricMesh);

  const arms = [-1, 1].map(side => {
    const arm = addGroup(THREE, group, group.name + (side < 0 ? ' left arm' : ' right arm'),
      side * .235, 1.271, .012);
    const sleeve = new THREE.Group();
    part(sleeve, 'sphere', clothing, 0, -.113, 0, .083, .169, .086);
    if (guard) part(sleeve, 'box', gold, 0, -.005, 0, .136, .041, .125);
    const elbow = addGroup(THREE, arm, 'Elbow', 0, -.237, 0);
    const cuff = new THREE.Group();
    part(cuff, 'sphere', dress ? skin : clothing, 0, -.085, 0, .062, .118, .062);
    part(cuff, 'drum', guard ? gold : linen, 0, -.167, 0, .064, .035, .065);
    part(cuff, 'sphere', skin, 0, -.201, .007, .058, .088, .057);
    assemble(THREE, sleeve, arm, fabricMesh);
    assemble(THREE, cuff, elbow, fabricMesh);
    return { arm, elbow };
  });

  return (time, still, phase, pace = 0, vendorNearby = false) => {
    const glance = still ? 0 : Math.sin(time * .86 + phase);
    const gesture = still ? 0 : Math.sin(time * 1.45 + phase);
    const step = Math.sin(time * 7.1) * pace;
    const serve = still || !vendor ? 0 : (.35 + .65 * Number(vendorNearby)) * Math.max(0, gesture) ** 2;
    legs[0].rotation.x = step * .29;
    legs[1].rotation.x = -step * .29;
    head.rotation.set(child ? -.057 + gesture * .050 : glance * .037, glance * (guard ? .10 : .16),
      child ? .09 + glance * .067 : glance * .037);
    for (const [index, { arm, elbow }] of arms.entries()) {
      const side = index ? 1 : -1;
      const pointing = child && index === 1 && pace === 0;
      const serving = index === 1 ? serve : 0;
      arm.rotation.set(parent ? -1.24 : pointing ? -1.44 + gesture * .12 :
        -.11 + (gesture * .078 - step * .44) * side - serving * .62,
      pointing ? -.19 : 0, parent ? 0 : side * (pointing ? .23 : .12) + serving * .45);
      elbow.rotation.x = parent ? -.13 : pointing ? -.14 + gesture * .14 : (guard ? -.11 : -.21) - serving * .84;
    }
  };
}

function buildStroller(THREE, group, parts, palette) {
  const { part, beam, batch, matte } = parts;
  const { boots, navy, gold, linen, leather, ink, white, trim, fabricMesh } = palette;
  const fabric = matte(0x558583, { side: THREE.DoubleSide });
  const lining = matte(0x89afb0);
  const blanket = matte(0xe8b977);
  const skin = matte(0xd59476);
  const stroller = addGroup(THREE, group, 'Adventure stroller', 0, 0, 1.12);
  const details = new THREE.Group();
  const wheels = [];

  for (const side of [-1, 1]) {
    const x = side * .329;
    beam(details, navy, [x, .20, -.405], [x, .73, .29], .050);
    beam(details, gold, [x, .15, .423], [x, .81, -.29], .052);
    beam(details, navy, [x, .44, -.29], [x, 1.128, -.668], .054);
    for (const [z, r] of [[-.408, .196], [.437, .139]]) {
      const wheel = addGroup(THREE, stroller, 'Stroller wheel', side * .39, r, z);
      part(wheel, 'drum', boots, 0, 0, 0, r, .092, r).rotation.z = Math.PI / 2;
      part(wheel, 'drum', trim, side * .048, 0, 0, r * .64, .023, r * .64).rotation.z = Math.PI / 2;
      part(wheel, 'drum', gold, side * .063, 0, 0, .031, .022, .031).rotation.z = Math.PI / 2;
      beam(wheel, gold, [side * .064, -.56 * r, 0], [side * .064, .56 * r, 0], .020);
      wheels.push({ wheel, r });
    }
  }
  beam(details, leather, [-.348, 1.128, -.669], [.348, 1.128, -.669], .073);
  beam(details, navy, [-.352, .231, -.407], [.352, .231, -.407], .044);
  part(details, 'sphere', fabric, 0, .626, .037, .386, .181, .542);
  part(details, 'sphere', lining, 0, .725, .066, .339, .123, .465);
  part(details, 'sphere', linen, 0, .786, -.015, .259, .076, .362);

  const hood = [], segments = 12;
  const arch = (x, t) => {
    const width = Math.cos(x);
    return new THREE.Vector3(.392 * Math.sin(x), .716 + .492 * width * Math.cos(t), -.16 - .405 * width * Math.sin(t));
  };
  for (let i = 0; i < segments; i++) {
    const a = -Math.PI / 2 + i * Math.PI / segments;
    const b = a + Math.PI / segments;
    for (let j = 0; j < 8; j++) {
      const t0 = j * Math.PI / 16, t1 = (j + 1) * Math.PI / 16;
      for (const p of [arch(a, t0), arch(b, t0), arch(b, t1), arch(a, t0), arch(b, t1), arch(a, t1)]) {
        hood.push(...p.toArray());
      }
    }
  }
  const canvas = new THREE.BufferGeometry();
  canvas.setAttribute('position', new THREE.Float32BufferAttribute(hood, 3));
  canvas.computeVertexNormals();
  part(details, canvas, fabric, 0, 0, 0, 1, 1, 1);
  const seam = new THREE.CatmullRomCurve3(Array.from({ length: 13 },
    (_, i) => arch(-Math.PI / 2 + i * Math.PI / 12, 0)));
  part(details, new THREE.TubeGeometry(seam, 20, .022, 6, false), linen, 0, 0, 0, 1, 1, 1);

  const baby = addGroup(THREE, stroller, 'Baby in stroller', 0, .756, .094);
  const bundle = new THREE.Group();
  part(bundle, 'sphere', blanket, 0, .032, .139, .240, .103, .257);
  part(bundle, 'sphere', gold, 0, .105, .157, .225, .026, .098);
  part(bundle, 'sphere', linen, 0, .109, -.155, .220, .154, .166);
  part(bundle, 'sphere', skin, 0, .127, -.075, .157, .128, .121).rotation.x = -.24;
  for (const side of [-1, 1]) {
    part(bundle, 'sphere', ink, side * .055, .159, .030, .016, .019, .010);
    part(bundle, 'sphere', white, side * .055 + .005, .166, .041, .006, .006, .004);
    part(bundle, 'sphere', skin, side * .142, .098, -.047, .028, .033, .028);
  }
  part(bundle, 'sphere', linen, 0, .093, .043, .050, .031, .025);
  part(bundle, 'gem', gold, 0, .089, .070, .027, .020, .016);
  assemble(THREE, bundle, baby, fabricMesh);
  batch(details, stroller);
  return {
    pose(time, still, distance) {
      for (const { wheel, r } of wheels) wheel.rotation.x = distance / r;
      baby.rotation.y = still ? 0 : .13 * Math.sin(time * 1.6);
      baby.rotation.z = still ? 0 : .05 * Math.sin(time * 2.2);
    },
  };
}

function occupant(obstacles, radius, offset) {
  const collision = {
    height: 1.89,
    touches(x, z) { return (x - this.x) ** 2 + (z - this.z) ** 2 < (radius + PLAYER_RADIUS) ** 2; },
  };
  obstacles.push(collision);
  return {
    radius, offset,
    place(x, z, yaw) {
      collision.x = x + Math.sin(yaw) * offset;
      collision.z = z + Math.cos(yaw) * offset;
      collision.left = collision.x - radius;
      collision.right = collision.x + radius;
      collision.front = collision.z - radius;
      collision.back = collision.z + radius;
    },
  };
}

export function buildGalleryPeople({ THREE, parent, parts, obstacles, vendors }) {
  const { matte } = parts;
  const drape = points => new THREE.LatheGeometry(points.map(point => new THREE.Vector2(...point)), 16);
  const palette = {
    skirt: drape([[.334, .382], [.302, .484], [.240, .646], [.173, .865], [.177, .944]]),
    hem: drape([[.320, .319], [.345, .330], [.334, .382]]),
    fabricMesh: matte(0xffffff, { vertexColors: true }),
    navy: matte(0x38466c), boots: matte(0x332e37), linen: matte(0xf3ddba),
    ink: matte(0x392927), white: matte(0xfff0de), leather: matte(0x734739),
    trim: matte(0x626478), gold: matte(0xc99a59),
  };
  const visitors = addGroup(THREE, parent, 'Gallery visitors and guards');
  const routes = Object.fromEntries(Object.entries(strolls).map(([key, path]) =>
    [key, { ...path, time: 0, members: [] }]));
  const staff = vendors.map((vendor, index) => ({
    ...vendor, style: 'vendor', skin: vendorLooks[index][0], hair: vendorLooks[index][1],
  }));
  const guests = [...people, ...staff].map((site, index) => {
    const { name, x, z, yaw, style, color, skin, hair, satchel, route } = site;
    const scale = style === 'child' ? .64 : 1;
    const group = addGroup(THREE, visitors, name, x, 0, z, yaw);
    group.scale.setScalar(scale);
    const bodies = [occupant(obstacles, style === 'child' ? .42 : .54, 0)];
    const pose = buildPerson(THREE, group, parts, palette, style, color, skin, hair, satchel);
    const stroller = style === 'parent' ? buildStroller(THREE, group, parts, palette) : null;
    if (stroller) bodies.push(occupant(obstacles, .72, 1.12));
    const guest = { site, group, pose, stroller, bodies, phase: index * 1.17, pace: 0, distance: 0 };
    if (route) routes[route].members.push(guest);
    return guest;
  });

  let time = 0;
  function place(guest, x, z, yaw) {
    guest.distance += Math.hypot(x - guest.group.position.x, z - guest.group.position.z);
    guest.group.position.set(x, 0, z);
    guest.group.rotation.y = yaw;
    for (const body of guest.bodies) body.place(x, z, yaw);
  }

  function poseAll(still, player) {
    for (const guest of guests) {
      const { site, pose, phase, stroller, distance, pace } = guest;
      const nearby = site.style === 'vendor' && player && player.y < 3.9 &&
        Math.hypot(player.x - site.x, player.z - site.z) < 5;
      pose(time, still, phase, still ? 0 : pace, nearby);
      stroller?.pose(time, still, distance);
    }
  }

  function reset() {
    time = 0;
    for (const route of Object.values(routes)) route.time = 0;
    for (const guest of guests) {
      const { x, z, yaw } = guest.site;
      place(guest, x, z, yaw);
      guest.distance = guest.pace = 0;
    }
    poseAll(true);
  }
  reset();

  return {
    update(dt, still, player) {
      if (!still) {
        time += dt;
        for (const route of Object.values(routes)) {
          const next = route.time + dt;
          const phase = next * Math.PI * 2 / route.period;
          const dx = route.rx * Math.sin(phase), dz = route.rz * (1 - Math.cos(phase));
          const direction = Math.atan2(route.rx * Math.cos(phase), route.rz * Math.sin(phase));
          const glide = THREE.MathUtils.smoothstep(next, 0, .75);
          const changes = route.members.map(guest => {
            const { x, z, yaw } = guest.site;
            const angle = Math.atan2(Math.sin(direction - yaw), Math.cos(direction - yaw));
            return { guest, x: x + dx, z: z + dz, yaw: yaw + angle * glide };
          });
          const blocked = player?.y < 3.9 && changes.some(({ guest, x, z, yaw }) => guest.bodies.some(({ radius, offset }) =>
            Math.hypot(player.x - x - Math.sin(yaw) * offset, player.z - z - Math.cos(yaw) * offset) <
              radius + PLAYER_RADIUS + .13));
          if (!blocked) route.time = next;
          for (const { guest, x, z, yaw } of changes) {
            guest.pace = blocked ? 0 : glide;
            if (!blocked) place(guest, x, z, yaw);
          }
        }
      }
      poseAll(still, player);
    },
    reset,
  };
}
