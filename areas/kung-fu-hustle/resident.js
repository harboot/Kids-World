import { floorRise, gallery, stories, wingSlope, wingX } from './layout.js';
import { ink, masonryKit } from './masonry.js';
import { EYE_HEIGHT } from '../../core/player.js';
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

export function buildResident(THREE, kit, scene) {
  const { oval, beam } = kit;
  const robe = 0xbc848c;
  const trim = 0xe4c6c4;
  const yaw = Math.atan2(1, wingSlope);
  const hands = [[-1, [-.91, .46, .754]], [1, [.91, .69, .76]]];

  kit.frame(wingX(-1, wallX, z), sill, z, yaw, () => {
    kit.mesh('Resident full-length robe', robe, robeGeometry(THREE));
    kit.mesh('Faceted resident', 0xffffff, facetedResidentGeometry(THREE, robe, hands, 'body'));
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
  });
  // Only movable parts are separate from the static masonry batches.
  const root = new THREE.Group();
  root.name = 'Resident animation root';
  root.position.set(wingX(-1, wallX, z), sill, z);
  root.rotation.y = yaw;
  scene.add(root);
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true, flatShading: true, roughness: .96, side: THREE.DoubleSide,
  });
  function pivot(name, parent, x, y, depth) {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(x, y, depth);
    parent.add(group);
    return group;
  }
  function part(name, parent, type) {
    const geometry = facetedResidentGeometry(THREE, robe, hands, type);
    geometry.translate(-parent.position.x, -parent.position.y, -parent.position.z);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.castShadow = true;
    parent.add(mesh);
  }
  const head = pivot('Resident head pivot', root, .015, .856, .273);
  part('Resident animated head', head, 'head');
  const arms = pivot('Resident laundry arms', root, 0, .613, .137);
  part('Resident animated arms', arms, 'arms');
  // The cloth has its own hinge along the line between both hands. Rotation
  // preserves both grip points while the arms gently lift and shake the laundry.
  const left = new THREE.Vector3(...hands[0][1]);
  const right = new THREE.Vector3(...hands[1][1]);
  const middle = left.clone().add(right).multiplyScalar(.5);
  const axis = right.clone().sub(left).normalize();
  const cloth = pivot('Resident laundry hinge', arms,
    middle.x-arms.position.x, middle.y-arms.position.y, middle.z-arms.position.z);
  const clothContents = pivot('Resident laundry geometry', cloth, -middle.x, -middle.y, -middle.z);
  const laundryKit = masonryKit(THREE, clothContents);
  buildBra(THREE, laundryKit, hands);
  laundryKit.finish();

  const target = new THREE.Vector3();
  const clamp = (v, low, high) => Math.max(low, Math.min(high, v));
  let time = 0;
  return {
    update(dt, player) {
      if (!Number.isFinite(dt) || dt <= 0) return;
      dt = Math.min(dt, .1);
      time = (time + dt) % 40;
      const wave = Math.sin(time * Math.PI * 2 / 2.0);
      arms.rotation.x = .11 * wave;
      arms.rotation.z = .035 * Math.sin(time * Math.PI * 2);
      cloth.quaternion.setFromAxisAngle(axis, .16 * Math.sin(time * Math.PI * 2 / .5));
      let turn = 0, tilt = 0;
      // Only players passing the same upper gallery can attract her gaze.
      if (player && Math.abs(player.y - EYE_HEIGHT - floorRise * (stories - 1)) < .65) {
        target.copy(player);
        root.worldToLocal(target);
        target.sub(head.position);
        const distance = Math.hypot(target.x, target.z);
        if (distance < 5.2 && target.z > .15) {
          turn = clamp(Math.atan2(target.x, target.z), -.85, .85);
          tilt = clamp(-Math.atan2(target.y, distance), -.23, .23);
        }
      }
      const follow = 1 - Math.exp(-7 * dt);
      head.rotation.y += (turn - head.rotation.y) * follow;
      head.rotation.x += (tilt - head.rotation.x) * follow;
    },
  };
}

