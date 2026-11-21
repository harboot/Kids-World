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
  const wood = [0x52383b, 0x70474a, 0x8a5450, 0x69403f, 0x93654e, 0x402f35]
    .map(color => new THREE.Color(color));
  const woodMaterial = matte(0xffffff, { vertexColors: true, side: THREE.DoubleSide });

  function panels(parent, name) {
    const positions = [], shades = [];
    return {
      quad(a, b, c, d, color) {
        for (const point of [a, b, c, a, c, d]) {
          positions.push(...point);
          shades.push(color.r, color.g, color.b);
        }
      },
      finish() {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(shades, 3));
        geometry.computeVertexNormals();
        part(parent, geometry, woodMaterial, 0, 0, 0, 1, 1, 1).name = name;
      },
    };
  }
  const hullPanels = panels(ship, 'Shipwreck hull planking');
  const { quad } = hullPanels;

  function vertex([z, width, y], side, level) {
    return [side * width * (.43 + .57 * Math.sin(level * Math.PI / 2)), .095 + (y - .095) * level, z];
  }

  // The dark seams are adjacent strips in the hull itself, including on the closed ends.
  function plank(a, b, sideA, sideB, row, color) {
    const low = row / 5;
    const high = (row + 1) / 5;
    const seam = high - .012;
    function span(bottom, top, shade) {
      quad(vertex(a, sideA, bottom), vertex(a, sideA, top),
        vertex(b, sideB, top), vertex(b, sideB, bottom), shade);
    }
    span(low, seam, color);
    span(seam, high, wood[5]);
  }
  for (let row = 0; row < 5; row++) {
    for (let i = 0; i < hull.length - 1; i++) {
      const color = wood[(row + (i % 3 === 0 ? 1 : 0)) % 5];
      plank(hull[i], hull[i + 1], 1, 1, row, color);
      plank(hull[i + 1], hull[i], -1, -1, row, color);
    }
    for (const [section, side] of [[hull[0], -1], [hull.at(-1), 1]]) {
      plank(section, section, side, -side, row, wood[row]);
    }
  }
  for (let i = 0; i < hull.length - 1; i++) {
    quad(vertex(hull[i], -1, 0), vertex(hull[i + 1], -1, 0),
      vertex(hull[i + 1], 1, 0), vertex(hull[i], 1, 0), wood[5]);
  }
  hullPanels.finish();

  // Each walking surface includes the plank faces, seams, and edges in one mesh.
  function buildDeckSurface(parent, name, width, count, start, end, elevation, underside, capStart = true) {
    const surface = panels(parent, name);
    const plankWidth = width / count;
    function top(left, right, first, last, color) {
      surface.quad([left, elevation(first), first], [left, elevation(last), last],
        [right, elevation(last), last], [right, elevation(first), first], color);
    }
    for (let i = 0; i < count; i++) {
      const left = -width / 2 + i * plankWidth;
      const right = left + plankWidth;
      const joint = THREE.MathUtils.lerp(start, end, .38 + (i % 3) * .11);
      const seamWidth = SURFACE_GAP.detail;
      top(left, right - seamWidth, start, joint, wood[(i + 2) % 5]);
      top(left, right - seamWidth, joint, joint + seamWidth, wood[5]);
      top(left, right - seamWidth, joint + seamWidth, end, wood[(i + 4) % 5]);
      top(right - seamWidth, right, start, end, wood[5]);
    }
    for (const side of [-1, 1]) {
      const x = side * width / 2;
      surface.quad([x, elevation(start), start], [x, underside(start), start],
        [x, underside(end), end], [x, elevation(end), end], wood[0]);
    }
    for (const z of capStart ? [start, end] : [end]) {
      surface.quad([-width / 2, elevation(z), z], [width / 2, elevation(z), z],
        [width / 2, underside(z), z], [-width / 2, underside(z), z], wood[0]);
    }
    surface.finish();
  }

  const deckZ = (front + rear) / 2;
  const deck = addGroup(THREE, ship, 'Shipwreck deck', 0, height, deckZ);
  buildDeckSurface(deck, 'Shipwreck deck boards', halfWidth * 2, 12, rear - deckZ, front - deckZ,
    () => 0, () => -.15);
  buildDeckSurface(ship, 'Shipwreck gangplank boards', rampHalfWidth * 2, 9, front, rampEnd,
    rampHeight, z => rampHeight(z) - .116, false);
  const angle = Math.atan2(height, rampLength);
  for (let z = front + .37; z < rampEnd - .26; z += .48) {
    const offset = SURFACE_GAP.trim;
    part(details, 'box', timber[4], 0, rampHeight(z) + Math.cos(angle) * offset, z + Math.sin(angle) * offset,
      rampHalfWidth * 2 - .055, .06, .092).rotation.x = angle;
  }
  const port = new THREE.TorusGeometry(1, .135, 6, 24);
  for (const side of [-1, 1]) {
    for (const z of [-1.28, -.04, 1.09]) {
      part(details, 'drum', iron, side * 1.902, 1.22, z, .15, .195, .15).rotation.z = Math.PI / 2;
      part(details, port, gold, side * 2.0, 1.22, z, .158, .158, .128).rotation.y = side * Math.PI / 2;
    }
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
    ship,
    toLocal: local.toLocal,
    onDeck,
    surface(x, z) {
      if (onDeck(x, z)) return height;
      if (Math.abs(x) <= rampHalfWidth && z > front && z <= rampEnd) return rampHeight(z);
    },
  };
}
