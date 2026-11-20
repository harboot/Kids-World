import { addGroup, rectangleBounds, SURFACE_GAP } from '../../core/geometry.js';
import { PLAYER_RADIUS } from '../../core/movement.js';
import { seededRandom } from '../../core/random.js';
import { addRoundSolid, addSolid } from './parts.js';

function addOvalSolid(obstacles, x, z, rx, rz, height) {
  obstacles.push({
    ...rectangleBounds(x, z, 2 * rx, 2 * rz),
    height,
    touches: (px, pz) => ((px - x) / (rx + PLAYER_RADIUS)) ** 2 + ((pz - z) / (rz + PLAYER_RADIUS)) ** 2 < 1,
  });
}

function profile(THREE, points, segments = 32) {
  return new THREE.LatheGeometry(points.map(point => new THREE.Vector2(...point)), segments);
}

export function buildPublicSpaces({ THREE, parent, parts, colors, obstacles }) {
  const { part, beam, batch, matte } = parts;
  const { cream, ivory, plum, gold, moss, leaf } = colors;
  const wood = matte(0xa46e47);
  const dirt = matte(0x594a3a);
  const cobalt = matte(0x416686);
  const lime = matte(0x84a358);
  const palmGreen = matte(0x4a8063, { side: THREE.DoubleSide });
  const palmLight = matte(0x75a36a, { side: THREE.DoubleSide });
  const rock = [matte(0x6d777b), matte(0x929790)];
  const petals = [0xde8c9b, 0xf9d995, 0x9e91c4, 0xdb875f].map(tint => matte(tint));
  const rim = profile(THREE, [[.80, 0], [.96, 0], [.96, .12], [1, .14], [1, .37], [.98, .45], [.89, .45], [.87, .32]]);
  const soil = new THREE.CylinderGeometry(.89, .86, 1, 32);
  const publicSpaces = addGroup(THREE, parent, 'Gallery public spaces');

  function place(name, x, z, yaw, build) {
    const landmark = addGroup(THREE, publicSpaces, name, x, 0, z, yaw);
    const detail = new THREE.Group();
    build(detail);
    batch(detail, landmark);
  }

  function bed(parent, rx, rz, material) {
    part(parent, rim, material, 0, 0, 0, rx, 1, rz);
    part(parent, soil, dirt, 0, .16, 0, rx, .32, rz);
    part(parent, 'drum', plum, 0, .049, 0, rx * .94, .10, rz * .94);
  }

  function flower(parent, x, z, length, color, turn) {
    beam(parent, moss, [x, .30, z], [x, .33 + length, z], .025);
    for (const side of [-1, 1]) {
      const frond = part(parent, 'ball', leaf, x + side * .064, .30 + length * .46, z, .105, .045, .052);
      frond.rotation.z = side * .42;
      frond.rotation.y = turn;
    }
    const y = .34 + length;
    for (let i = 0; i < 5; i++) {
      const angle = turn + i * Math.PI * 2 / 5;
      part(parent, 'sphere', color, x + .10 * Math.cos(angle), y, z + .10 * Math.sin(angle), .076, .045, .071);
    }
    part(parent, 'sphere', gold, x, y + .037, z, .061, .043, .061);
  }

  for (const [index, x, z, rx, rz] of [[1, -22, 17.8, 3.4, 2.12], [2, -22, -11.6, 3.15, 2.35]]) {
    const random = seededRandom(228 + index);
    place('Woodland flower garden ' + index, x, z, 0, group => {
      bed(group, rx, rz, index === 1 ? cream : ivory);
      for (let i = 0; i < 9; i++) {
        const angle = i * Math.PI * 2 / 9 + .36;
        const cx = Math.cos(angle) * rx * .58;
        const cz = Math.sin(angle) * rz * .56;
        part(group, 'ball', i % 2 ? moss : leaf, cx, .43, cz, .37, .27, .35);
        for (let j = 0; j < 3; j++) {
          flower(group, cx + (random() - .5) * .55, cz + (random() - .5) * .52,
            .29 + random() * .56, petals[(i + index + Math.floor(j / 2)) % petals.length], random() * 6.3);
        }
      }
      for (const [dx, dz, height] of [[-.62, -.27, 1.42], [.53, .08, 1.18], [.04, .36, 1.62]]) {
        beam(group, wood, [dx, .29, dz], [dx + .12, height, dz], .087);
        part(group, 'ball', moss, dx, height - .09, dz, .48, .48, .49);
        part(group, 'ball', leaf, dx + .16, height + .19, dz, .39, .43, .46);
        part(group, 'ball', lime, dx - .12, height + .26, dz + .14, .28, .24, .32);
      }
    });
    addOvalSolid(obstacles, x, z, rx, rz, .77);
    addRoundSolid(obstacles, x, z, .97, 2.15);
  }

  for (const [x, z, yaw] of [[-24.65, 21.05, 2.68], [-24.30, -8.34, 2.58], [-18.65, -12.3, -Math.PI / 2]]) {
    place('Woodland bench', x, z, yaw, group => {
      for (const side of [-1, 1]) {
        const a = side * 1.0;
        part(group, 'box', plum, a, .32, -.06, .15, .64, .68);
        part(group, 'box', gold, a, .37, -.32, .12, .74, .14);
        beam(group, plum, [a, .16, -.29], [a, 1.06, -.42], .09);
        part(group, 'box', wood, a, .70, .009, .14, .10, .77);
      }
      for (const dz of [-.27, -.09, .09, .27]) part(group, 'box', wood, 0, .49, dz, 2.52, .114, .159);
      for (const y of [.80, .96, 1.12]) part(group, 'box', wood, 0, y, -.38, 2.53, .126, .095);
      for (const side of [-1, 1]) part(group, 'sphere', gold, side * 1.15, 1.12, -.32, .036, .036, .035);
    });
    addSolid(obstacles, x, z, 2.54, .85, 1.18, yaw);
  }

  const skirt = profile(THREE, [[.03, .04], [.83, .04], [.80, .20], [.69, .46], [.53, .72],
    [.47, .98], [.34, 1.23], [.24, 1.38]], 24);
  place('Royal dancer statue', -10.8, -22.1, .16, group => {
    part(group, 'drum', plum, 0, .10, 0, 1.48, .20, 1.48);
    part(group, 'drum', ivory, 0, .34, 0, 1.24, .32, 1.24);
    part(group, 'drum', gold, 0, .53, 0, 1.28, .077, 1.28);
    part(group, 'drum', cream, 0, .78, 0, .96, .44, .96);
    part(group, 'drum', ivory, 0, 1.045, 0, 1.10, .13, 1.10);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      part(group, 'gem', gold, Math.cos(a) * .965, .78, Math.sin(a) * .965, .11, .16, .095).rotation.y = -a;
    }
    const dancer = addGroup(THREE, group, 'Carved dancer', .01, 1.10, 0, -.17);
    part(dancer, skirt, cream, 0, 0, 0, 1.06, 1, .72).rotation.z = -.13;
    for (let i = 0; i < 9; i++) {
      const angle = i * Math.PI * 2 / 9;
      const dx = Math.cos(angle), dz = Math.sin(angle);
      const fold = part(dancer, 'sphere', ivory, dx * .51 + .055, .59, dz * .35, .10, .49, .075);
      fold.rotation.z = dx * .28 - .13;
      fold.rotation.x = -dz * .23;
    }
    part(dancer, 'sphere', cream, .19, 1.47, 0, .26, .37, .17).rotation.z = -.14;
    part(dancer, 'sphere', ivory, .19, 1.38, .013, .25, .071, .18).rotation.z = -.10;
    part(dancer, 'drum', cream, .19, 1.81, .012, .095, .21, .09);
    part(dancer, 'sphere', cream, .20, 2.02, .039, .19, .25, .175).rotation.z = -.13;
    part(dancer, 'sphere', ivory, .185, 2.13, -.054, .19, .16, .17);
    part(dancer, 'sphere', ivory, .194, 2.06, -.192, .117, .125, .12);
    part(dancer, 'sphere', cream, .226, 2.01, .193, .045, .056, .057);
    for (const [a, b, c] of [
      [[.40, 1.58, 0], [.69, 1.81, .10], [.94, 2.24, .22]],
      [[-.026, 1.64, -.011], [-.25, 1.39, .12], [-.55, 1.38, .26]],
    ]) {
      const curve = new THREE.CatmullRomCurve3([a, b, c].map(point => new THREE.Vector3(...point)));
      part(dancer, new THREE.TubeGeometry(curve, 10, .074, 8, false), cream, 0, 0, 0, 1, 1, 1);
      part(dancer, 'sphere', cream, ...c, .083, .108, .077);
    }
    part(dancer, 'gem', gold, .94, 2.50, .23, .18, .27, .12);
  });
  addRoundSolid(obstacles, -10.8, -22.1, 1.48, 3.85);

  const urn = profile(THREE, [[.25, 0], [.40, .06], [.36, .17], [.25, .31], [.41, .47],
    [.57, .68], [.55, .89], [.46, 1.05], [.53, 1.15], [.56, 1.23], [.48, 1.24], [.43, 1.10]]);
  const handle = new THREE.TorusGeometry(1, .15, 6, 15);
  for (const [x, z, yaw] of [[-14.45, -24.2, .13], [-7.55, -24.2, -.13], [-14.55, -20.05, .25], [-7.3, -20.1, -.33]]) {
    place('Royal urn planter', x, z, yaw, group => {
      part(group, 'box', ivory, 0, .13, 0, 1.34, .26, 1.34);
      part(group, urn, cream, 0, .24, 0, 1.17, 1, 1.17);
      part(group, 'drum', dirt, 0, 1.405, 0, .52, .073, .52);
      part(group, handle, gold, -.53, 1.02, 0, .21, .27, .16);
      part(group, handle, gold, .53, 1.02, 0, .21, .27, .16);
      for (let i = 0; i < 11; i++) {
        const angle = i * 2.4;
        const spread = .15 + (i % 4) * .115;
        const dx = spread * Math.cos(angle), dz = spread * Math.sin(angle);
        const y = 1.59 + (i % 4) * .17;
        beam(group, moss, [0, 1.40, 0], [dx, y, dz], .036);
        part(group, 'ball', i % 3 ? leaf : lime, dx, y, dz, .18, .28, .117).rotation.z = -dx;
        if (i % 4 === 2) part(group, 'sphere', petals[2], dx, y + .17, dz, .10, .088, .103);
      }
    });
    addRoundSolid(obstacles, x, z, .72, 2.48);
  }

  const frondPositions = [
    0, 0, 0, -.23, .33, .54, 0, .44, .65,
    0, 0, 0, 0, .44, .65, .23, .33, .54,
    -.23, .33, .54, -.14, .13, 1.14, 0, .20, 1.21,
    -.23, .33, .54, 0, .20, 1.21, 0, .44, .65,
    0, .44, .65, 0, .20, 1.21, .14, .13, 1.14,
    0, .44, .65, .14, .13, 1.14, .23, .33, .54,
    -.14, .13, 1.14, 0, -.12, 1.45, 0, .20, 1.21,
    0, .20, 1.21, 0, -.12, 1.45, .14, .13, 1.14,
  ];
  const frond = new THREE.BufferGeometry();
  frond.setAttribute('position', new THREE.Float32BufferAttribute(frondPositions, 3));
  frond.computeVertexNormals();

  for (const [x, z, rx, rz, yaw] of [[21.6, 23.55, 2.48, 1.24, -.13], [24.5, 13.85, 1.57, 1.00, .35]]) {
    place('Adventure rock and palm island', x, z, yaw, group => {
      bed(group, rx, rz, cobalt);
      for (const [dx, dz, h] of [[-.36, -.22, 2.66], [.57, .24, 2.14]]) {
        beam(group, wood, [dx - .18, .30, dz], [dx + .20, h, dz], .13);
        for (let i = 0; i < 7; i++) {
          const angle = i * Math.PI * 2 / 7 + h;
          part(group, frond, i % 2 ? palmGreen : palmLight, dx + .20, h, dz,
            .89, i % 3 ? .95 : 1.42, i % 2 ? .82 : .71).rotation.y = angle;
        }
      }
      for (const [i, dx, dz, scale] of [[0, -.76, .44, .63], [1, .89, -.29, .52], [2, .61, .46, .36]]) {
        const stone = part(group, 'ball', rock[i % 2], dx, .39 + scale * .43, dz, scale, scale * .70, scale * .62);
        stone.rotation.y = i * 1.3 + .2;
        part(group, 'ball', moss, dx - .075, .37 + scale * 1.04, dz, scale * .53, scale * .15, scale * .37);
      }
    });
    // The islands sit clear of the bridge approach and its existing guardrails.
    addSolid(obstacles, x, z, rx * 1.75, rz * 1.7, 2.9, yaw);
  }

  const mosaic = addGroup(THREE, publicSpaces, 'Adventure compass mosaic', 22.3, 0, 18.2, .18);
  const grout = new THREE.CircleGeometry(3.45, 64);
  const inlay = part(mosaic, grout, ivory, 0, -SURFACE_GAP.detail, 0, 1, 1, 1);
  inlay.rotation.x = -Math.PI / 2;
  const vertices = [], shades = [];
  const blues = [0x597d95, 0x3c6085, 0x86aaa8, 0xc7bc9e, 0xdfaa64, 0xe6d3a6].map(tint => new THREE.Color(tint));
  function tile(points, tint) {
    for (let index = 1; index + 1 < points.length; index++) {
      for (const [x, z] of [points[0], points[index], points[index + 1]]) {
        vertices.push(x, 0, z);
        shades.push(tint.r, tint.g, tint.b);
      }
    }
  }
  const polar = (radius, angle) => [radius * Math.cos(angle), -radius * Math.sin(angle)];
  for (let i = 0; i < 64; i++) {
    const a = i * Math.PI / 32 + .004;
    const b = (i + 1) * Math.PI / 32 - .004;
    tile([polar(3.10, a), polar(3.39, a), polar(3.39, b), polar(3.10, b)], blues[i % 2 ? 0 : 2]);
  }
  for (let i = 0; i < 24; i++) {
    const a = i * Math.PI / 12 + .004;
    const b = (i + 1) * Math.PI / 12 - .004;
    tile([[0, 0], polar(3.05, a), polar(3.05, b)], blues[i % 2]);
  }
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const tip = polar(i % 2 ? 2.02 : 2.91, angle);
    const start = vertices.length;
    tile([[0, 0], polar(.65, angle - Math.PI / 6), tip], blues[i % 2 ? 3 : 4]);
    tile([[0, 0], tip, polar(.65, angle + Math.PI / 6)], blues[5]);
    for (let j = start + 1; j < vertices.length; j += 3) vertices[j] = SURFACE_GAP.detail;
  }
  const pattern = new THREE.BufferGeometry();
  pattern.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  pattern.setAttribute('color', new THREE.Float32BufferAttribute(shades, 3));
  pattern.computeVertexNormals();
  part(mosaic, pattern, matte(0xffffff, { vertexColors: true }), 0, 0, 0, 1, 1, 1);
  part(mosaic, 'drum', gold, 0, .017, 0, .288, .016, .288);
}
