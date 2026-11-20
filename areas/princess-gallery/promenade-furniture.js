import { addGroup, SURFACE_GAP } from '../../core/geometry.js';
import { addRoundSolid, addSolid, spaceTransform } from './parts.js';

const stations = [
  ['Lobby', -14.25, 47.55, Math.PI / 2, 0x618381],
  ['South promenade', -14.8, 26.6, .17, 0x937889],
  ['Woodland Wing', -25.08, -5.85, -Math.PI / 2, 0x6b8e7d],
  ['Royal Wing', -7.2, -31.7, .08, 0x9377a8],
  ['North Adventure Wing', 26.5, -15.2, Math.PI / 2, 0x5c8c9e],
  ['East Adventure Wing', 34.7, 18.0, -Math.PI / 2, 0x5c8793],
];

export function buildPromenadeFurniture({ THREE, parent, parts, colors, obstacles }) {
  const { part, beam, batch, matte } = parts;
  const { cream, ivory, plum, gold } = colors;
  const warm = matte(0xffdfa0, { emissive: 0xf6b575, emissiveIntensity: .64 });
  const dark = matte(0x514052);
  const wood = matte(0xad7855);
  const bin = new THREE.CylinderGeometry(.255, .22, .68, 14);
  const mouth = new THREE.TorusGeometry(.225, .028, 6, 20);
  const root = addGroup(THREE, parent, 'Promenade furniture');

  for (const [name, x, z, yaw, color] of stations) {
    const target = addGroup(THREE, root, name + ' rest stop', x, 0, z, yaw);
    const details = new THREE.Group();
    const accent = matte(color);
    const { toWorld } = spaceTransform({ position: { x, z }, rotation: yaw });

    // A wood and enamel bench with armrests.
    for (const side of [-1, 1]) {
      const a = side * 1.11;
      part(details, 'box', plum, a, .286, 0, .14, .57, .71);
      beam(details, dark, [a, .15, -.255], [a, 1.125, -.355], .084);
      part(details, 'box', accent, a, .722, .02, .16, .106, .74);
      part(details, 'sphere', gold, a, .748, .365, .060, .049, .054);
    }
    for (const dz of [-.254, -.093, .069, .23]) part(details, 'box', wood, 0, .536, dz, 2.61, .112, .139);
    for (const y of [.74, .90, 1.057]) part(details, 'box', accent, 0, y, -.335, 2.63, .127, .082);
    addSolid(obstacles, ...toWorld(0, 0), 2.65, .82, 1.15, yaw);

    // The dark recessed opening reads as a waste bin from walking height.
    const bx = -2.08, bz = .021;
    part(details, bin, accent, bx, .389, bz, 1, 1, 1);
    part(details, 'drum', dark, bx, .062, bz, .255, .124, .255);
    part(details, 'drum', dark, bx, .733, bz, .208, .043, .208);
    part(details, mouth, gold, bx, .769, bz, 1, 1, 1).rotation.x = Math.PI / 2;
    part(details, 'gem', cream, bx, .412, bz + .247 + SURFACE_GAP.detail, .076, .111, .041);
    addRoundSolid(obstacles, ...toWorld(bx, bz), .264, .81);

    const lx = 1.95, lz = -.52;
    part(details, 'drum', plum, lx, .086, lz, .232, .172, .232);
    part(details, 'drum', gold, lx, .226, lz, .139, .121, .139);
    part(details, 'drum', dark, lx, 1.289, lz, .073, 2.10, .073);
    part(details, 'drum', gold, lx, 2.271, lz, .115, .14, .115);
    part(details, 'box', gold, lx, 2.377, lz, .365, .083, .365);
    part(details, 'box', warm, lx, 2.616, lz, .248, .413, .248);
    for (const dx of [-.149, .149]) for (const dz of [-.149, .149]) {
      beam(details, dark, [lx + dx, 2.4, lz + dz], [lx + dx * .81, 2.845, lz + dz * .81], .033);
    }
    part(details, 'cone', accent, lx, 2.946, lz, .284, .28, .284).rotation.y = Math.PI / 4;
    part(details, 'gem', gold, lx, 3.133, lz, .081, .116, .081);
    addRoundSolid(obstacles, ...toWorld(lx, lz), .232, 3.24);
    batch(details, target);
  }

  const balloonColors = [0xdb838e, 0xf1c375, 0x89bbbd, 0xb1a0d3, 0x7eabc9].map(color => matte(color));
  const string = matte(0xb58ca3);
  for (const [index, [x, z]] of [[-6.52, 51.0], [-16.01, -22.8], [18.75, 26.9]].entries()) {
    const bouquet = addGroup(THREE, root, 'Balloon bouquet ' + (index + 1), x, 0, z);
    const details = new THREE.Group();
    part(details, 'drum', plum, 0, .134, 0, .29, .268, .29);
    part(details, 'drum', gold, 0, .269, 0, .213, .011, .213);
    const balloons = [[-.38, 2.65, .05], [.37, 2.96, .03], [-.08, 3.37, -.29],
      [.44, 2.45, -.29], [.18, 3.63, .30]];
    for (const [i, [dx, y, dz]] of balloons.entries()) {
      const fabric = balloonColors[(i + index * 2) % balloonColors.length];
      const size = .30 + (i % 3) * .037;
      part(details, 'sphere', fabric, dx, y, dz, size, size * 1.25, size * .91);
      part(details, 'cone', fabric, dx, y - size * 1.14, dz, .079, .125, .068);
      part(details, 'sphere', ivory, dx - size * .40, y + size * .33, dz + size * .738,
        .072, .106, .037).rotation.z = -.34;
      const mid = [dx * .49 + (i % 2 ? .061 : -.051), 1.48, dz * .56];
      beam(details, string, [0, .27, 0], mid, .017);
      beam(details, string, mid, [dx, y - size * 1.24, dz], .017);
    }
    addRoundSolid(obstacles, x, z, .29, .295);
    batch(details, bouquet);
  }
}
