import { addGroup, SURFACE_GAP } from '../../core/geometry.js';
import { addGallerySign, addSolid, spaceTransform } from './parts.js';

export const wreckDeck = {
  position: { x: -.85, z: .80 }, rotation: .26,
  height: 2.12, rear: -2.52, front: 1.98, halfWidth: 1.98, rampEnd: 6.85, rampHalfWidth: 1.26,
};

export function buildShipwreck({ THREE, document, room, parts, exhibit, obstacles, palette }) {
  const { part, beam, batch, matte } = parts;
  const { gold, teal, ivory, rock } = palette;
  const { position, rotation, height, rear, front, halfWidth, rampEnd, rampHalfWidth } = wreckDeck;
  const deckLength = front - rear;
  const rampLength = rampEnd - front;
  const rampHeight = z => height * (rampEnd - z) / rampLength;
  const local = spaceTransform(wreckDeck);
  const exhibitSpace = spaceTransform(exhibit);
  const ship = addGroup(THREE, room, 'Ariel shipwreck', position.x, 0, position.z, rotation);
  const details = new THREE.Group();
  const timber = [0x4d3433, 0x75504a, 0x995f47, 0x694141, 0xa17655].map(color => matte(color));
  const iron = matte(0x303f48);
  const hull = [
    // Impaled bow, broad working deck, and the broken edge around the gangplank.
    [-4.65, .29, .58], [-3.73, .96, 1.49], [-2.83, 1.72, 2.02], [rear, 2.08, height - .055],
    [-1.18, 2.14, height - .055], [.53, 2.14, height - .055], [front, 2.04, height - .055],
    [2.50, 1.74, .66],
  ];
  const positions = [], shades = [];
  const wood = [0x52383b, 0x70474a, 0x8a5450, 0x69403f, 0x93654e].map(color => new THREE.Color(color));

  function vertex([z, width, y], side, level) {
    return [side * width * (.43 + .57 * Math.sin(level * Math.PI / 2)), .095 + (y - .095) * level, z];
  }
  const layers = [0, .20, .40, .60, .80, 1];
  for (const side of [-1, 1]) {
    for (let i = 0; i < hull.length - 1; i++) {
      for (let row = 0; row < layers.length - 1; row++) {
        const a = vertex(hull[i], side, layers[row]);
        const b = vertex(hull[i + 1], side, layers[row]);
        const c = vertex(hull[i + 1], side, layers[row + 1]);
        const d = vertex(hull[i], side, layers[row + 1]);
        const color = wood[(row + (i % 3 === 0 ? 1 : 0)) % wood.length];
        for (const point of (side > 0 ? [a, d, b, b, d, c] : [a, b, d, b, c, d])) {
          positions.push(...point);
          shades.push(color.r, color.g, color.b);
        }
        if (row > 0) {
          a[0] += side * SURFACE_GAP.detail;
          b[0] += side * SURFACE_GAP.detail;
          beam(details, timber[0], a, b, .046);
        }
      }
    }
  }
  const shell = new THREE.BufferGeometry();
  shell.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  shell.setAttribute('color', new THREE.Float32BufferAttribute(shades, 3));
  shell.computeVertexNormals();
  part(details, shell, matte(0xffffff, { vertexColors: true }), 0, 0, 0, 1, 1, 1);

  // Timber deck and the sloping gangplank use the same dimensions as their walkable surfaces.
  const deck = addGroup(THREE, ship, 'Shipwreck deck', 0, height, (front + rear) / 2);
  const decking = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const width = halfWidth * 2 / 12;
    const x = -halfWidth + (i + .5) * width;
    const shade = timber[i % 2 ? 2 : 4];
    for (const [z, length] of [[-deckLength * .29, deckLength * .42], [deckLength * .21, deckLength * .58]]) {
      part(decking, 'box', shade, x, -.075, z, width - .013, .15, length - .012);
      part(decking, 'box', timber[1], x - width * .25, SURFACE_GAP.detail, z, .021, .013, length * .57);
      for (const dz of [-length * .38, length * .40]) {
        part(decking, 'drum', iron, x + .076, SURFACE_GAP.detail, z + dz, .025, .021, .025);
      }
    }
  }
  batch(decking, deck);
  const angle = Math.atan2(height, rampLength);
  const slopeLength = Math.hypot(height, rampLength);
  const mid = (front + rampEnd) / 2;
  for (let i = 0; i < 9; i++) {
    const width = rampHalfWidth * 2 / 9;
    const x = -rampHalfWidth + (i + .5) * width;
    part(details, 'box', timber[i % 3 + 1], x, height / 2 - Math.cos(angle) * .058, mid - Math.sin(angle) * .058,
      width - .018, .116, slopeLength - .025).rotation.x = angle;
  }
  for (let z = front + .34; z < rampEnd - .19; z += .45) {
    part(details, 'box', timber[4], 0, rampHeight(z) + SURFACE_GAP.detail, z, rampHalfWidth * 2 + .05,
      .045, .091).rotation.x = angle;
  }
  for (const side of [-1, 1]) {
    beam(details, timber[0], [side * 1.27, height - .10, front], [side * 1.27, -.08, rampEnd], .17);
    for (const [z0, z1] of [[rear, -.18], [.50, 1.87]]) {
      for (const z of [z0, (z0 + z1) / 2, z1]) {
        beam(details, timber[1], [side * 2.03, height - .16, z], [side * 2.04, height + .68, z], .14);
      }
      beam(details, timber[4], [side * 2.04, height + .65, z0], [side * 2.04, height + .60, z1], .14);
    }
    const [x, z] = exhibitSpace.toWorld(...local.toWorld(side * 2.06, (front + rear) / 2));
    addSolid(obstacles, x, z, .23, deckLength, height + .68, rotation + exhibit.rotation);
    for (let i = 0; i < 5; i++) {
      const z = -3.86 + i * .25;
      const x = side * (.46 + i * .25);
      beam(details, timber[i % 3 + 1], [x * .48, .17, z], [x, .55 + i * .26, z - .17], .18);
    }
  }
  for (const [x, z, width, length] of [[-.92, -3.22, 1.05, 1.2], [.68, -3.49, 1.04, 1.36]]) {
    const broken = part(details, 'box', timber[2], x, 1.01, z, width, .13, length);
    broken.rotation.set(-.43, -.26 * x, .21 * x);
  }
  beam(details, timber[0], [-1.23, .31, -3.01], [-1.94, 5.26, -3.67], .37);
  beam(details, timber[3], [-3.42, 3.56, -3.59], [-.74, 3.93, -3.52], .17);
  for (let i = 0; i < 4; i++) {
    part(details, 'drum', iron, -1.61 - i * .036, 3.00 + i * .19, -3.38 - i * .022, .22, .075, .22)
      .rotation.z = -.14;
  }
  const sailShape = new THREE.Shape([
    [-1.14, 0], [.84, 0], [.55, -.56], [.24, -.42], [-.06, -1.21], [-.54, -.80], [-1.0, -.94],
  ].map(([x, y]) => new THREE.Vector2(x, y)));
  part(details, new THREE.ShapeGeometry(sailShape), matte(0x8faaa4, { side: THREE.DoubleSide }),
    -2.07, 3.64, -3.53, 1, 1, 1).rotation.z = .13;
  part(details, 'ball', rock, 0, .29, -4.58, 1.34, .52, .68);
  for (const [x, y, z, s] of [[-1.49, .49, 1.79, .42], [1.83, .63, -.15, .55], [-1.23, .47, -3.13, .45]]) {
    part(details, 'ball', teal, x, y, z, s, .22, s * .69);
    part(details, 'sphere', ivory, x, y + .18, z, .072, .072, .072);
  }
  batch(details, ship);

  for (const [x, z, width, depth, top] of [[0, -3.60, 2.28, 2.09, 2.24], [-2.22, -3.68, .42, .49, 5.14]]) {
    addSolid(obstacles, ...exhibitSpace.toWorld(...local.toWorld(x, z)), width, depth, top, rotation + exhibit.rotation);
  }
  const sign = addGroup(THREE, ship, 'Ariel shipwreck sign', 1.99, 0, rampEnd - .16, -.20);
  part(sign, 'box', timber[0], 0, .58, 0, .112, 1.16, .123);
  part(sign, 'box', gold, 0, 1.12, 0, 2.11, .64, .14);
  addGallerySign(THREE, document, sign, ['Board the Shipwreck', 'Meet Ariel on the deck'], 0, 1.12,
    .07 + SURFACE_GAP.detail, 2.03, .56);
  addSolid(obstacles, ...exhibitSpace.toWorld(...local.toWorld(sign.position.x, sign.position.z)),
    .15, .34, 1.45, rotation + exhibit.rotation);

  function onDeck(x, z) {
    return Math.abs(x) <= halfWidth && z >= rear && z <= front;
  }
  return {
    toLocal: local.toLocal,
    onDeck,
    surface(x, z) {
      if (onDeck(x, z)) return height;
      if (Math.abs(x) <= rampHalfWidth && z > front && z <= rampEnd) return rampHeight(z);
    },
  };
}
