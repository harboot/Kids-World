import { floorRise, gallery, stories, wingSlope, wingX } from './layout.js';
import { ink } from './masonry.js';
import { facetedResidentGeometry } from './resident-model.js';

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
  const segments = 10;
  const vertices = [];
  const faces = [];
  for (const [i, [y, z, width, depth]] of rings.entries()) {
    for (let j = 0; j < segments; j++) {
      const a = j * Math.PI * 2 / segments;
      const pleat = 1 + .105 * Math.cos(5 * a) * (1 - i / rings.length);
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
  const faceted = geometry.toNonIndexed();
  faceted.computeVertexNormals();
  return faceted;
}

function buildBra(THREE, kit, hands) {
  const fabric = 0xe5cfc1;
  const binding = 0xb18388;
  const { beam, oval } = kit;
  const vertices = [];
  const faces = [];
  const segments = 10;
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
  const { oval, beam } = kit;
  const robe = 0xbc848c;
  const trim = 0xe4c6c4;
  const yaw = Math.atan2(1, wingSlope);
  const hands = [[-1, [-.91, .46, .754]], [1, [.91, .69, .76]]];

  kit.frame(wingX(-1, wallX, z), sill, z, yaw, () => {
    kit.mesh('Resident full-length robe', robe, robeGeometry(THREE));
    kit.mesh('Faceted resident', 0xffffff, facetedResidentGeometry(THREE, robe, hands));
    for (const [a, b] of [
      [[-.224, .649, .257], [-.120, .606, .294]],
      [[-.120, .606, .294], [0, .548, .285]],
      [[0, .548, .285], [.109, .606, .295]],
      [[.109, .606, .295], [.189, .652, .282]],
      [[0, .548, .285], [.018, .468, .232]],
    ]) beam(trim, ...a, ...b, .025);
    for (const [x, y, depth] of [[.015, .447, .201], [.023, .374, .123], [.030, .306, .042]]) {
      oval(trim, x, y, depth, .031, .031, .022);
    }
    buildBra(THREE, kit, hands);
  });
}
