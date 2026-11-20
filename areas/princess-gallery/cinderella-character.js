import { addGroup, SURFACE_GAP } from '../../core/geometry.js';
import { buildPrincessArm, buildPrincessFace, gownGeometry } from './princess-model.js';

// Follow the skirt profile under the two panniers so the fabrics stay apart.
function overskirtGeometry(THREE, skirt) {
  const segments = 48;
  const rows = 8;
  const positions = [], indices = [];
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    for (let i = 0; i < segments; i++) {
      const angle = i / segments * 2 * Math.PI;
      const side = Math.cos(angle), front = Math.sin(angle);
      const hem = 1.10 - .32 * side ** 4;
      const y = THREE.MathUtils.lerp(hem, 1.355, t);
      const upper = skirt.findIndex(ring => ring[0] >= y);
      const [base, width, depth, pleat = 0] = skirt[upper - 1];
      const [top, topWidth, topDepth, topPleat = 0] = skirt[upper];
      const height = (y - base) / (top - base);
      const inset = SURFACE_GAP.trim + .12 * Math.sin(t * Math.PI) * side ** 4;
      const fold = 1 + THREE.MathUtils.lerp(pleat, topPleat, height) * Math.cos(angle * 10);
      positions.push(side * (THREE.MathUtils.lerp(width, topWidth, height) * fold + inset),
        y, front * (THREE.MathUtils.lerp(depth, topDepth, height) * fold + inset));
      if (row === rows) continue;
      const a = row * segments + i;
      const b = row * segments + (i + 1) % segments;
      indices.push(a, a + segments, b, b, a + segments, b + segments);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function buildCinderellaCharacter(THREE, parts, ballroom, landingHeight) {
  const { part, beam, batch, matte } = parts;
  const model = addGroup(THREE, ballroom, 'Cinderella character', -5.2, landingHeight, -9.53, .23);
  const dress = addGroup(THREE, model, 'Cinderella ball gown');
  const details = new THREE.Group();
  const skin = matte(0xffd9ba);
  const blond = matte(0xe7b152), gold = matte(0xffcf71);
  const blue = matte(0x79b9ef), satin = matte(0xb8e3fb), shade = matte(0x548bc8);
  const pearl = matte(0xe5f5ff);
  const jewels = matte(0xc1ebff, { emissive: 0x71b8e8, emissiveIntensity: .38 });
  const skirt = [[0, 1.01, .64, .045], [.11, 1.07, .68, .067], [.32, 1.03, .65, .075],
    [.62, .89, .57, .073], [.92, .66, .46, .061], [1.16, .44, .32, .035], [1.37, .23, .176]];
  part(details, gownGeometry(THREE, skirt), blue, 0, 0, 0, 1, 1, 1);
  part(details, gownGeometry(THREE, [[0, .98, .635, .045], [.055, 1.063, .676, .056],
    [.103, 1.074, .683, .064], [.126, 1.072, .682, .065]]), pearl, 0, 0, 0, 1, 1, 1);

  part(details, overskirtGeometry(THREE, skirt), satin, 0, 0, 0, 1, 1, 1);
  const bodice = [[1.325, .259, .206], [1.43, .228, .167], [1.62, .267, .191],
    [1.77, .302, .193], [1.91, .247, .134]];
  part(details, gownGeometry(THREE, bodice), satin, 0, 0, 0, 1, 1, 1);
  part(details, 'sphere', skin, 0, 1.87, -.008, .256, .137, .143);
  part(details, 'drum', skin, 0, 2.032, 0, .103, .258, .095);
  part(details, 'drum', shade, 0, 2.047, .003, .109, .053, .110);
  part(details, 'gem', jewels, 0, 2.037, .115, .047, .057, .025);
  for (const side of [-1, 1]) {
    beam(details, pearl, [side * .153, 1.825, .159], [0, 1.731, .211], .028);
    beam(details, blue, [side * .12, 1.38, .163], [side * .169, 1.75, .169], .025);
    beam(details, pearl, [0, 1.262, .195], [side * .224, 1.362, .087], .043);
  }

  batch(details, dress);
  const left = buildPrincessArm(THREE, parts, model, -1, 1.79, satin, skin, pearl);
  const right = buildPrincessArm(THREE, parts, model, 1, 1.79, satin, skin, pearl);
  left.upper.rotation.set(-.22, 0, -.31);
  left.elbow.rotation.set(-.96, 0, .53);
  right.upper.rotation.set(.02, 0, .38);
  right.elbow.rotation.set(-1.19, 0, -.74);

  const head = addGroup(THREE, model, 'Cinderella head', 0, 2.266, .018, -.09);
  head.rotation.z = -.065;
  const hair = new THREE.Group();
  part(hair, 'sphere', blond, 0, .098, -.099, .311, .296, .23);
  part(hair, 'sphere', blond, 0, .325, -.154, .233, .202, .194);
  for (const side of [-1, 1]) {
    part(hair, 'sphere', gold, side * .106, .362, -.116, .139, .135, .160).rotation.z = side * -.48;
    const swept = side < 0;
    part(hair, 'sphere', gold, side * .145, swept ? .226 : .251, .135,
      swept ? .202 : .155, .083, .114).rotation.z = swept ? .42 : -.57;
    part(hair, 'gem', jewels, side * .287, -.09, .043, .049, .062, .048);
  }
  const band = part(hair, new THREE.TorusGeometry(1, .058, 8, 32), blue, 0, .238, -.027, .299, .225, .30);
  band.rotation.x = 1.05;
  part(hair, 'gem', jewels, 0, .354, .183, .053, .058, .036);
  batch(hair, head);
  buildPrincessFace(THREE, parts, head, skin, 0x3879ae);
  return model;
}
