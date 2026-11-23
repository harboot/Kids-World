import { floorRise, gallery, stories, wingSlope, wingX } from './layout.js';
import { ink } from './masonry.js';

const roofPoint = { x: -19.98, y: 13.51, z: 5.76 };
const wallX = -gallery.outer;
const z = roofPoint.z;
const sill = floorRise * (stories - 1) + .80;
const lintel = Math.min(floorRise * stories - .35, roofPoint.y - .78);
const halfWidth = 1.03;
const openingHeight = lintel - sill;

export const residentWindow = {
  roofPoint,
  aperture: [[-z - halfWidth, sill], [-z + halfWidth, sill],
    [-z + halfWidth, lintel], [-z - halfWidth, lintel]],
};

export function buildResidentWindow(kit, random) {
  const { wall, beam, leaf } = kit;
  const frame = wall(wallX, z, Math.PI / 2);
  frame(0x4d4037, 0, sill + openingHeight / 2 - .36, -1.14, 2.12, openingHeight + .74, .15);
  frame(0x72614e, 0, sill - .823, -.56, 2.07, .045, 1.17);
  frame(ink.stone, 0, sill - .046, .106, 2.30, .17, .55);
  frame(ink.wood, 0, lintel + .032, .033, 2.15, .113, .17);
  for (const side of [-1, 1]) {
    frame(ink.wood, side * 1.015, sill + openingHeight / 2, .034, .118, openingHeight, .158);
    const shutter = wall(wallX + .25, z - side * 1.42, Math.PI / 2 - side * .49);
    shutter(0x815139, 0, sill + openingHeight / 2, 0, .85, openingHeight - .11, .11);
    for (let plank = -2; plank <= 2; plank++) {
      shutter(plank % 2 ? 0x895a41 : 0x76513c, plank * .151, sill + openingHeight / 2, .064,
        .142, openingHeight - .28, .034);
    }
    for (const dy of [.27, openingHeight - .28]) {
      shutter(ink.wood, 0, sill + dy, .097, .83, .084, .055);
      frame(ink.iron, side * 1.065, sill + dy, .12, .103, .084, .056);
    }
    const vineZ = z - side * 1.89;
    beam(0x555a3a, wallX + .095, sill - .35, vineZ, wallX + .095, lintel - .23, vineZ + .17 * side, .025);
    for (let i = 0; i < 12; i++) {
      leaf(i % 2 ? 0x64784f : 0x4d633f, wallX + .095 + random() * .05, sill - .29 + i * .17,
        vineZ + (random() - .48) * .32, .13, .15, .22, random() * Math.PI, 0, side * .55);
    }
  }
}

function robeGeometry(THREE) {
  const rings = [
    [-.62, -.53, .375, .24], [-.37, -.53, .398, .251], [-.12, -.48, .377, .243],
    [.14, -.38, .321, .236], [.31, -.22, .325, .252], [.49, -.011, .361, .251],
    [.63, .09, .317, .214], [.71, .13, .162, .138],
  ];
  const segments = 16;
  const vertices = [];
  const faces = [];
  for (const [i, [y, z, width, depth]] of rings.entries()) {
    for (let j = 0; j < segments; j++) {
      const a = j * Math.PI * 2 / segments;
      const pleat = 1 + .038 * Math.cos(5 * a) * (1 - i / rings.length);
      vertices.push(Math.cos(a) * width * pleat, y, z + Math.sin(a) * depth * pleat);
      if (i === 0) continue;
      const prev = (i - 1) * segments + j;
      const next = (i - 1) * segments + (j + 1) % segments;
      faces.push(prev, prev + segments, next, next, prev + segments, next + segments);
    }
  }
  return modelGeometry(THREE, vertices, faces);
}

function modelGeometry(THREE, vertices, faces) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(faces);
  geometry.computeVertexNormals();
  return geometry;
}

function buildBra(THREE, kit, hands) {
  const fabric = 0xe5cfc1;
  const binding = 0xb18388;
  const { beam, oval } = kit;
  const vertices = [];
  const faces = [];
  const segments = 14;
  const bust = .83;

  for (const [side, hand] of hands) {
    const centerX = side * .305;
    const centerY = .11 + side * .046;
    const cup = vertices.length / 3;
    const edge = [];
    vertices.push(centerX, centerY, bust + .25);
    for (const ring of [.55, 1]) {
      for (let i = 0; i < segments; i++) {
        const a = i * Math.PI * 2 / segments;
        const px = centerX + Math.cos(a) * .299 * ring;
        const py = centerY + (.211 * Math.sin(a) + side * .048 * Math.cos(a)) * ring;
        const pz = bust + .25 * (1 - ring * ring);
        vertices.push(px, py, pz);
        if (ring === 1) edge.push([px, py, pz + .010]);
      }
    }
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      const a = cup + 1 + i;
      const b = cup + 1 + next;
      faces.push(cup, a, b, a, a + segments, b, b, a + segments, b + segments);
      beam(binding, ...edge[i], ...edge[next], .020);
    }

    const top = [side * .46, centerY + .194, bust + .045];
    const outer = [side * .59, centerY - .041, bust];
    const fold = [side * .765, hand[1] - .15, hand[2] + .067];
    beam(fabric, ...top, ...hand, .048);
    beam(fabric, ...outer, ...fold, .066);
    beam(binding, ...fold, ...hand, .041);
  }

  kit.mesh('Bra cups', fabric, modelGeometry(THREE, vertices, faces));
  oval(binding, 0, .097, bust + .034, .154, .089, .068, 0, 0, .12);
}

export function buildResident(THREE, kit) {
  const { box, oval, beam, drum } = kit;
  const robe = 0xd3adba;
  const cuff = 0xe3c7ca;
  const skin = 0xc39173;
  const hair = 0x31252b;
  const yaw = Math.atan2(1, wingSlope);
  const hands = [[-1, [-.91, .46, .754]], [1, [.91, .69, .76]]];

  kit.frame(wingX(-1, wallX, z), sill, z, yaw, () => {
    kit.mesh('Resident full-length robe', robe, robeGeometry(THREE));
    for (const side of [-1, 1]) {
      const px = side * .16;
      oval(skin, px, -.670, -.52, .15, .22, .18);
      oval(0x674c48, px, -.747, -.47, .18, .10, .31);
    }

    for (const [a, b] of [
      [[-.225, .628, .255], [0, .537, .235]],
      [[0, .537, .235], [.192, .669, .255]],
      [[0, .537, .235], [.017, .443, .246]],
    ]) beam(cuff, ...a, ...b, .035);
    for (const [i, y] of [.455, .370, .291].entries()) {
      oval(cuff, .016, y, .239 - i * .082, .036, .036, .033);
    }
    oval(skin, .024, .767, .207, .213, .27, .225);

    function arm(paint, a, b, width) {
      const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
      const run = Math.hypot(dx, dz);
      oval(paint, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2,
        Math.hypot(run, dy) + .132, width, width, Math.atan2(-dz, dx), 0, Math.atan2(dy, run));
    }

    for (const [side, hand] of hands) {
      const elbow = [side * .592, hand[1] + .042, .404];
      arm(robe, [side * .267, .615, .142], elbow, .225);
      arm(skin, elbow, hand, .126);
      oval(cuff, ...elbow, .145, .178, .151);
      oval(skin, ...hand, .148, .107, .13, 0, 0, side * .22);
      oval(0xba8666, hand[0] - side * .040, hand[1] - .018, hand[2] + .053, .071, .052, .061);
    }

    oval(hair, .018, 1.187, .199, .659, .668, .561);
    oval(skin, .027, 1.115, .315, .445, .518, .37);
    for (const side of [-1, 1]) {
      oval(skin, side * .220, 1.096, .344, .091, .144, .112);
      oval(0xcaa368, side * .233, 1.042, .402, .041, .045, .028);
      const eyeX = .026 + side * .091;
      oval(0x816154, eyeX, 1.161, .480, .084, .040, .045, 0, 0, side * -.09);
      oval(0xe5c4aa, eyeX, 1.158, .498, .067, .027, .023);
      oval(0x352725, eyeX - .007, 1.154, .508, .030, .026, .013);
      oval(hair, eyeX + .004, 1.216, .476, .095, .018, .029, 0, 0, side * -.22);
    }
    oval(0xbd8266, .031, 1.108, .486, .088, .110, .093);
    oval(0x88535a, .025, 1.025, .491, .116, .029, .037, 0, 0, -.122);
    beam(0xe8dcbd, -.020, 1.026, .508, -.205, .990, .582, .031);
    beam(0x6f655f, -.205, .990, .582, -.238, .984, .595, .028);
    for (const [i, [x, y]] of [[-.28, 1.12], [-.29, 1.30], [-.22, 1.44], [-.055, 1.48],
      [.117, 1.47], [.25, 1.37], [.30, 1.21]].entries()) {
      const paint = [0x993c4e, 0xb5914d, 0x8c596e][i % 3];
      drum(paint, x, y, .365, .142, .104, .142, i % 2 ? .22 : -.22, Math.PI / 2);
      drum(hair, x, y, .419, .069, .022, .069, i % 2 ? .22 : -.22, Math.PI / 2);
    }

    buildBra(THREE, kit, hands);
  });
}
