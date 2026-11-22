import { addGroup, paintCanvasTexture, SURFACE_GAP } from '../../core/geometry.js';
import { seededRandom } from '../../core/random.js';
import { addRoundSolid, addSolid } from './parts.js';

export const AGRABAH_BALCONY = 2.35;

export function buildAgrabah({ THREE, document, room, exhibit, outline, parts, obstacles, toWorld, colors }) {
  const { part, beam, batch } = parts;
  const { sandstone, cream, shade, gold, brass, teal, blue, dark, lantern } = colors;
  buildDesertView(THREE, document, room, exhibit, outline, parts);
  const details = new THREE.Group();
  const box = (parent, material, ...values) => part(parent, 'box', material, ...values);
  const solid = (x, z, width, depth, height) =>
    addSolid(obstacles, ...toWorld(x, z), width, depth, height, exhibit.rotation);
  const circle = (x, z, radius, height) => addRoundSolid(obstacles, ...toWorld(x, z), radius, height);

  const court = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x * .965, -z * .961)));
  const floor = new THREE.ShapeGeometry(court);
  const vertices = floor.getAttribute('position');
  const uv = floor.getAttribute('uv');
  for (let i = 0; i < vertices.count; i++) {
    uv.setXY(i, vertices.getX(i) / exhibit.bounds.width + .5, vertices.getY(i) / exhibit.bounds.depth + .5);
  }
  const courtyardMap = paintCanvasTexture(THREE, document, 768, 768, (ink, width, height) => {
    const random = seededRandom(125);
    ink.fillStyle = '#d5a572';
    ink.fillRect(0, 0, width, height);
    const pavers = ['#e4bd8c', '#edc79a', '#d9b284', '#e8bd8e'];
    for (let z = 0; z < height; z += 48) {
      for (let x = -24; x < width; x += 48) {
        const tileX = x + (z % 96 ? 24 : 0);
        ink.fillStyle = pavers[Math.floor(random() * pavers.length)];
        ink.fillRect(tileX + 1, z + 1, 46, 46);
      }
    }
    for (const [x, z] of [[384, 106], [203, 248], [565, 248]]) {
      for (const [radius, color] of [[75, '#bf855e'], [72, '#447d7c'], [64, '#f4d5a2'], [60, '#79a29a']]) {
        ink.fillStyle = color;
        ink.beginPath();
        ink.arc(x, z, radius, 0, Math.PI * 2);
        ink.fill();
      }
      ink.fillStyle = '#f6dfa6';
      ink.beginPath();
      for (let i = 0; i < 16; i++) {
        const angle = i * Math.PI / 8;
        const radius = i % 2 ? 25 : 51;
        ink.lineTo(x + Math.sin(angle) * radius, z + Math.cos(angle) * radius);
      }
      ink.closePath();
      ink.fill();
    }
  });
  const courtMesh = part(room, floor, parts.matte(courtyardMap ? 0xffffff : 0xdab886, { map: courtyardMap }),
    0, SURFACE_GAP.detail, 0, 1, 1, 1);
  courtMesh.name = 'Agrabah tiled courtyard';
  courtMesh.rotation.x = -Math.PI / 2;

  const palace = addGroup(THREE, room, 'Agrabah Palace', 0, 0, 0);
  const stone = new THREE.Group();
  const buildingZ = -1.88;
  box(stone, shade, 0, .22, buildingZ, 6.90, .44, 5.11);
  box(stone, sandstone, 0, 2.88, buildingZ, 6.52, 5.37, 4.92);
  box(stone, cream, 0, 5.54, buildingZ, 6.76, .25, 5.04);
  box(stone, shade, 0, 5.77, buildingZ, 6.94, .23, 5.2);
  box(stone, cream, 0, 6.02, buildingZ, 6.82, .29, 5.10);
  solid(0, buildingZ, 6.90, 5.11, 6.17);

  const arch = new THREE.Shape();
  arch.moveTo(-.5, 0);
  arch.lineTo(.5, 0);
  arch.lineTo(.5, .55);
  arch.quadraticCurveTo(.5, .77, 0, 1);
  arch.quadraticCurveTo(-.5, .77, -.5, .55);
  arch.closePath();
  const archPanel = new THREE.ShapeGeometry(arch, 10);
  const lattice = (parent, x, y, z, width, height, yaw = 0, door = false) => {
    const window = addGroup(THREE, parent, door ? 'Palace entrance' : 'Pierced arch window', x, y, z, yaw);
    part(window, archPanel, shade, 0, 0, 0, width + .23, height + .19, 1);
    part(window, archPanel, brass, 0, .05, SURFACE_GAP.trim, width + .05, height + .07, 1);
    part(window, archPanel, dark, 0, .095, SURFACE_GAP.trim * 2, width - .11, height - .06, 1);
    for (const side of [-1, 1]) {
      box(window, teal, side * width * .23, height * .36, .082, width * .27, height * .48, .025);
      box(window, gold, side * width * .21, height * .36, .107, .035, height * .50, .027);
    }
    part(window, 'gem', lantern, 0, height * .67, .103, width * .13, height * .13, .046);
    if (door) box(window, brass, 0, height * .34, .102, .055, height * .54, .052);
  };
  lattice(stone, 0, AGRABAH_BALCONY + .018, .593 + SURFACE_GAP.trim, 2.25, 2.63, 0, true);
  for (const side of [-1, 1]) {
    lattice(stone, side * 2.08, 3.06, .593 + SURFACE_GAP.trim, .78, 1.88);
    for (const offset of [-1.4, 1.38]) lattice(stone, side * 3.26 + side * SURFACE_GAP.trim,
      2.47, buildingZ + offset, 1.05, 2.08, side * Math.PI / 2);
    lattice(stone, side * 1.77, 2.43, buildingZ - 2.46 - SURFACE_GAP.trim, 1.06, 2.15, Math.PI);
    for (const z of [.64, -4.43]) {
      box(stone, cream, side * 2.88, 3.09, z, .29, 4.56, .20);
      box(stone, brass, side * 2.88, 4.95, z + (z > 0 ? .13 : -.13), .45, .13, .13);
    }
  }
  for (const y of [1.33, 5.23]) {
    for (const z of [.61, -4.37]) box(stone, teal, 0, y, z, 6.44, .125, .13);
    for (const x of [-3.29, 3.29]) box(stone, teal, x, y, buildingZ, .13, .125, 4.80);
  }

  const domeProfile = [[1.43, 0], [1.55, .26], [1.67, .56], [1.63, .88], [1.48, 1.18],
    [1.16, 1.50], [.79, 1.77], [.47, 2.03], [.23, 2.28], [.055, 2.48], [0, 2.52]];
  const domeGeometry = new THREE.LatheGeometry(domeProfile.map(([r, y]) => new THREE.Vector2(r, y)), 32);
  const domeVertices = domeGeometry.getAttribute('position');
  const domeColors = [];
  const tint = new THREE.Color();
  for (let i = 0; i < domeVertices.count; i++) {
    const seam = Math.floor(i / domeProfile.length);
    tint.setHex(seam % 4 === 0 ? 0xe6a448 : seam % 4 === 2 ? 0xffda80 : 0xf9c567);
    tint.multiplyScalar(.84 + domeVertices.getY(i) * .09);
    domeColors.push(tint.r, tint.g, tint.b);
  }
  domeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(domeColors, 3));
  const domeMaterial = parts.matte(0xffffff, { vertexColors: true });
  function dome(parent, x, y, z, scale) {
    const cap = addGroup(THREE, parent, 'Golden onion dome', x, y, z);
    cap.scale.setScalar(scale);
    part(cap, 'drum', blue, 0, .11, 0, 1.53, .24, 1.53);
    part(cap, 'drum', brass, 0, .28, 0, 1.54, .14, 1.54);
    part(cap, domeGeometry, domeMaterial, 0, .34, 0, 1, 1, 1);
    part(cap, 'drum', brass, 0, 2.98, 0, .053, .52, .053);
    part(cap, 'gem', gold, 0, 3.25, 0, .16, .24, .16);
  }

  part(stone, 'drum', sandstone, 0, 6.39, buildingZ, 2.08, .55, 2.08);
  part(stone, 'drum', cream, 0, 6.70, buildingZ, 2.13, .12, 2.13);
  dome(stone, 0, 6.77, buildingZ, 1.27);
  for (const side of [-1, 1]) {
    const x = side * 3.38, z = -3.30;
    part(stone, 'drum', shade, x, .23, z, 1.28, .46, 1.28);
    part(stone, 'drum', sandstone, x, 3.12, z, 1.04, 5.80, 1.04);
    part(stone, 'drum', cream, x, 6.04, z, 1.25, .24, 1.25);
    part(stone, 'drum', blue, x, 5.78, z, 1.11, .17, 1.11);
    dome(stone, x, 6.17, z, .68);
    lattice(stone, x, 3.76, z + 1.06, .68, 1.44);
    circle(x, z, 1.28, 8.52);
    for (const row of [.93, -4.45]) {
      for (const offset of [.56, 1.39, 2.22, 3.05]) {
        box(stone, sandstone, side * offset, 6.22, row > 0 ? .55 : row, .38, .34, .35);
      }
    }
  }

  const terrace = addGroup(THREE, palace, 'Agrabah balcony');
  box(stone, shade, 0, 1.10, 1.36, 6.18, 2.20, 1.50);
  box(stone, cream, 0, 2.27, 1.48, 6.68, .16, 1.84);
  solid(0, 1.48, 6.68, 1.84, AGRABAH_BALCONY);
  // Each tread rises less than the engine's step height.
  const tread = .256;
  for (let i = 0; i < 15; i++) {
    const top = AGRABAH_BALCONY * (15 - i) / 16;
    const z = 2.40 + (i + .5) * tread;
    box(stone, shade, 0, (top - .045) / 2, z, 2.74, top - .045, tread);
    box(stone, i % 2 ? cream : sandstone, 0, top - .0225, z, 2.76, .045, tread - .005);
    solid(0, z, 2.76, tread, top);
  }
  const rails = new THREE.Group();
  for (const side of [-1, 1]) {
    const railX = side * 2.41;
    box(rails, teal, railX, AGRABAH_BALCONY + .43, 2.31, 1.80, .68, .17);
    box(rails, gold, railX, AGRABAH_BALCONY + .82, 2.31, 1.88, .13, .24);
    solid(railX, 2.31, 1.83, .24, AGRABAH_BALCONY + .90);
    for (let i = 0; i < 5; i++) {
      part(rails, 'gem', brass, railX + (i - 2) * .33, AGRABAH_BALCONY + .44, 2.415, .106, .156, .026);
    }
    box(rails, shade, side * 3.25, AGRABAH_BALCONY + .38, 1.56, .24, .76, 1.52);
    box(rails, gold, side * 3.25, AGRABAH_BALCONY + .8, 1.56, .28, .13, 1.57);
    solid(side * 3.25, 1.56, .26, 1.56, AGRABAH_BALCONY + .87);
    for (const z of [2.48, 4.20, 5.99]) {
      const y = (6.24 - z) * .61;
      box(stone, shade, side * 1.54, y * .56, z, .26, y * 1.12, .22);
      part(stone, 'gem', gold, side * 1.54, y * 1.12 + .07, z, .09, .13, .09);
    }
    beam(stone, brass, [side * 1.54, 2.57, 2.36], [side * 1.54, .62, 6.10], .09);
  }
  batch(rails, terrace);
  batch(stone, palace);

  const city = addGroup(THREE, room, 'Desert city rooftops');
  const mudbrick = [sandstone, shade, cream, parts.matte(0xc48771), parts.matte(0xd69b72)];
  const buildings = [
    [-6.2, -6.4, 1.73, 1.8], [-3.95, -7.60, 1.55, 2.24], [-2.05, -8.24, 1.43, 1.22],
    [.14, -8.19, 1.84, 1.65], [2.24, -7.84, 1.60, 2.4], [4.45, -7.26, 1.85, 1.45],
    [6.65, -6.34, 1.60, 2.15], [7.83, -4.21, 1.56, 1.53], [-8.12, -3.5, 1.91, 2.35],
    [-8.46, -1.0, 1.42, 1.52], [8.94, -1.82, 1.41, 1.80],
  ];
  for (const [i, [x, z, width, height]] of buildings.entries()) {
    const house = addGroup(THREE, details, 'Sandstone house', x, 0, z);
    box(house, mudbrick[i % mudbrick.length], 0, height / 2, 0, width, height, 1.40);
    box(house, cream, 0, height + .048, 0, width + .16, .096, 1.56);
    for (const dx of [-width * .29, width * .29]) {
      box(house, dark, dx, height - .46, .714, .22, .34, .031);
      box(house, lantern, dx, height - .46, .741, .13, .24, .025);
      box(house, shade, dx, height + .11, -.38, .26, .22, .27);
    }
    if (i % 3 === 1) dome(house, 0, height + .13, .04, .36);
    solid(x, z, width + .16, 1.56, height + .22);
  }
  batch(details, city);

  const courtyard = new THREE.Group();
  const leaves = [parts.matte(0x598c71), parts.matte(0x3e7566), parts.matte(0x80a276)];
  for (const [x, z, height] of [[-6.44, 2.38, 2.85], [6.51, 3.63, 3.21], [-7.28, -4.88, 2.78], [6.05, -5.0, 2.35]]) {
    const palm = addGroup(THREE, courtyard, 'Date palm', x, 0, z);
    part(palm, 'drum', shade, 0, .13, 0, .46, .26, .46);
    part(palm, 'drum', brass, 0, .29, 0, .40, .10, .40);
    part(palm, 'drum', shade, 0, height * .51, 0, .105, height - .24, .105).rotation.z = -.08;
    for (let i = 0; i < 7; i++) {
      const angle = i * Math.PI * 2 / 7;
      const frond = addGroup(THREE, palm, 'Palm frond', .12, height, 0, angle);
      part(frond, 'gem', leaves[i % 3], 0, .02, .45, .21, .12, .63).rotation.x = -.25;
      part(frond, 'gem', leaves[(i + 1) % 3], 0, -.20, .92, .15, .10, .43).rotation.x = -.52;
    }
    circle(x, z, .46, .34);
  }
  for (const side of [-1, 1]) {
    const x = side * 6.47, z = 7.05;
    part(courtyard, 'drum', shade, x, .18, z, .42, .36, .42);
    part(courtyard, 'drum', blue, x, .42, z, .35, .18, .35);
    part(courtyard, 'gem', lantern, x, .67, z, .18, .35, .18);
    circle(x, z, .42, .90);
  }
  batch(courtyard, room);
}

function buildDesertView(THREE, document, room, exhibit, outline, { part }) {
  const random = seededRandom(274);
  const map = paintCanvasTexture(THREE, document, 1536, 640, (ink, width, height) => {
    const sky = ink.createLinearGradient(0, 0, 0, height);
    for (const [stop, color] of [[0, '#40587b'], [.38, '#7e8daa'], [.62, '#eabf9c'], [.79, '#ffdbab'], [1, '#d2a280']]) {
      sky.addColorStop(stop, color);
    }
    ink.fillStyle = sky;
    ink.fillRect(0, 0, width, height);
    for (let i = 0; i < 78; i++) {
      const x = random() * width, y = random() * height * .55;
      const size = i % 8 ? 1 : 2;
      ink.fillStyle = i % 8 ? '#fff1d481' : '#fff4e3c9';
      ink.fillRect(x, y, size, size);
    }
    const sunX = width * .61, sunY = height * .574;
    const glow = ink.createRadialGradient(sunX, sunY, 22, sunX, sunY, 87);
    glow.addColorStop(0, '#ffe6aabd');
    glow.addColorStop(1, '#ffe6aa00');
    ink.fillStyle = glow;
    ink.fillRect(sunX - 87, sunY - 87, 174, 174);
    ink.fillStyle = '#fff0c3';
    ink.beginPath();
    ink.arc(sunX, sunY, 28, 0, Math.PI * 2);
    ink.fill();

    for (const [row, color, scale] of [[460, '#bd9aab', 62], [514, '#d2a78f', 51], [554, '#d9af86', 42]]) {
      ink.fillStyle = color;
      ink.beginPath();
      ink.moveTo(0, row);
      for (let x = 0; x < width + 48; x += 48) {
        ink.lineTo(x, row - Math.sin(x * .010 + row) * scale * .44 - random() * scale);
      }
      ink.lineTo(width, height);
      ink.lineTo(0, height);
      ink.closePath();
      ink.fill();
    }
    for (const [base, tones] of [[565, ['#aa7d80', '#b78880', '#b98679']], [616, ['#ae7b65', '#bd8b71', '#c39276']]]) {
      for (let x = -10; x < width; x += 16 + random() * 17) {
        const w = 14 + random() * 22, h = 12 + random() * 48;
        const y = base - h + Math.sin(x * .04) * 12;
        ink.fillStyle = tones[Math.floor(random() * tones.length)];
        ink.fillRect(x, y, w, h + 16);
        if (random() < .36) {
          ink.beginPath();
          ink.ellipse(x + w / 2, y, w * .42, w * .29, 0, Math.PI, Math.PI * 2);
          ink.fill();
        }
        if (random() < .44) {
          ink.fillStyle = '#fbd291c9';
          ink.fillRect(x + w * .38, y + 8, 3, 5);
        }
      }
    }
  });

  const height = exhibit.bounds.height - .11;
  const front = exhibit.bounds.depth / 2;
  const edge = exhibit.entrance / 2 + .44;
  const perimeter = [[edge, front], ...outline.slice(1), outline[0], [-edge, front]];
  const distances = [0];
  for (let i = 1; i < perimeter.length; i++) {
    const [ax, az] = perimeter[i - 1];
    const [bx, bz] = perimeter[i];
    distances.push(distances.at(-1) + Math.hypot(bx - ax, bz - az));
  }
  const length = distances.at(-1);
  const vertices = [], uv = [], indices = [];
  // Leave the front edge open to both gallery entrances.
  for (let i = 1; i < perimeter.length; i++) {
    const [ax, az] = perimeter[i - 1].map(value => value * .951);
    const [bx, bz] = perimeter[i].map(value => value * .951);
    const a = vertices.length / 3;
    vertices.push(ax, .018, az, ax, height, az, bx, .018, bz, bx, height, bz);
    uv.push(distances[i - 1] / length, 0, distances[i - 1] / length, 1,
      distances[i] / length, 0, distances[i] / length, 1);
    indices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
  }
  const view = new THREE.BufferGeometry();
  view.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  view.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  view.setIndex(indices);
  const panorama = part(room, view, new THREE.MeshBasicMaterial({ color: map ? 0xffffff : 0xe1b7a0,
    map, toneMapped: false }), 0, 0, 0, 1, 1, 1);
  panorama.name = 'Agrabah desert city panorama';
}
