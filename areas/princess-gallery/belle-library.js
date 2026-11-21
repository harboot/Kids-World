import { addGroup, paintCanvasTexture, SURFACE_GAP } from '../../core/geometry.js';
import { seededRandom } from '../../core/random.js';
import { PLAYER_ONLY_LAYER } from '../../core/render-layers.js';
import { addSolid, spaceTransform } from './parts.js';

function buildLibraryFloor(THREE, document, room, parts, outline, { width, depth }) {
  const map = paintCanvasTexture(THREE, document, 1024, 768, (ink, w, h) => {
    ink.scale(w / width, h / depth);
    ink.translate(width / 2, depth / 2);
    ink.fillStyle = '#946a51';
    ink.fillRect(-width / 2, -depth / 2, width, depth);
    const random = seededRandom(878);
    const planks = ['#af8170', '#b38b76', '#a97c65', '#a77b62', '#bd917d'];
    for (let x = -width / 2; x < width / 2; x += .60) {
      for (let z = -depth / 2 - 1.9 + random() * 1.75; z < depth / 2; z += 2.14) {
        ink.fillStyle = planks[Math.floor(random() * planks.length)];
        ink.fillRect(x + .018, z + .018, .565, 2.104);
        ink.strokeStyle = '#68463e30';
        ink.lineWidth = .019;
        ink.beginPath();
        ink.moveTo(x + .12, z + .09);
        ink.bezierCurveTo(x + .38, z + .72, x - .05, z + 1.31, x + .37, z + 1.93);
        ink.stroke();
      }
    }
    const rugZ = 1.38;
    for (const [rx, rz, color] of [[4.42, 6.45, '#67343f'], [4.31, 6.29, '#d9a554'],
      [4.19, 6.13, '#7e354a'], [3.91, 5.82, '#dfad64'], [3.84, 5.73, '#a04c5c']]) {
      ink.fillStyle = color;
      ink.beginPath();
      ink.ellipse(0, rugZ, rx, rz, 0, 0, Math.PI * 2);
      ink.fill();
    }
    for (let i = 0; i < 40; i++) {
      const a = i * Math.PI / 20;
      ink.save();
      ink.translate(Math.cos(a) * 4.04, rugZ + Math.sin(a) * 6.00);
      ink.rotate(a);
      ink.fillStyle = i % 2 ? '#deb084' : '#ebc184';
      ink.beginPath();
      ink.moveTo(-.105, 0);
      ink.quadraticCurveTo(0, -.37, .105, 0);
      ink.quadraticCurveTo(0, .37, -.105, 0);
      ink.fill();
      ink.restore();
    }
    for (const z of [-2.50, 1.35, 5.11]) {
      ink.fillStyle = '#863f56';
      ink.beginPath();
      ink.arc(0, z, 1.18, 0, Math.PI * 2);
      ink.fill();
      for (let i = 0; i < 8; i++) {
        ink.save();
        ink.translate(0, z);
        ink.rotate(i * Math.PI / 4);
        ink.fillStyle = i % 2 ? '#d78879' : '#eac48f';
        ink.beginPath();
        ink.moveTo(0, .16);
        ink.quadraticCurveTo(.45, .78, 0, 1.02);
        ink.quadraticCurveTo(-.45, .78, 0, .16);
        ink.fill();
        ink.restore();
      }
    }
  });
  const geometry = new THREE.ShapeGeometry(new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z))));
  const positions = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < positions.count; i++) uv.setXY(i, positions.getX(i) / width + .5, positions.getY(i) / depth + .5);
  const floor = parts.part(room, geometry, parts.matte(map ? 0xffffff : 0xb78361, { map }), 0, 0, 0, 1, 1, 1);
  floor.name = 'Belle library parquet and embroidered rug';
  floor.rotation.x = -Math.PI / 2;
}

function buildBookcases({ THREE, room, parts, exhibit, obstacles, palette }) {
  const { part, beam, batch, matte } = parts;
  const { oak, dark, gold, ivory, cream, wine, glow } = palette;
  const random = seededRandom(301);
  const { toWorld } = spaceTransform(exhibit);
  const cases = addGroup(THREE, room, 'Belle library bookcases');
  const details = new THREE.Group();
  const covers = [0x633847, 0x40505c, 0x6a8a82, 0xb38348, 0x927486, 0x9f5145, 0x496c58].map(color => matte(color));
  const arch = new THREE.Shape();
  arch.moveTo(-1.98, 0);
  arch.lineTo(1.98, 0);
  arch.lineTo(1.98, .34);
  arch.quadraticCurveTo(1.79, 1.42, 0, 1.78);
  arch.quadraticCurveTo(-1.79, 1.42, -1.98, .34);
  arch.closePath();
  const carved = new THREE.ExtrudeGeometry(arch, { depth: .12, bevelEnabled: true, bevelThickness: .035,
    bevelSize: .041, bevelSegments: 2, curveSegments: 10 });

  function bookshelf(x, z, base, yaw, rows, ladders = false) {
    const model = addGroup(THREE, details, '', x, base, z, yaw);
    const bank = 4.15;
    const step = .79;
    const top = rows * step + .24;
    part(model, 'box', dark, 0, top / 2, -.41, bank, top, .145);
    for (const side of [-1, 1]) {
      part(model, 'box', oak, side * (bank / 2 - .10), top / 2, 0, .21, top, .99);
      part(model, 'box', gold, side * (bank / 2 - .10), top / 2, .509, .075, top - .10, .049);
    }
    part(model, carved, oak, 0, top - .10, .036, 1.06, .93, 1);
    part(model, carved, dark, 0, top - .047, .19, .83, .77, .44);
    part(model, 'gem', gold, 0, top + .69, .27, .30, .43, .15);
    part(model, 'box', oak, 0, .16, .02, bank + .19, .32, 1.09);
    for (let row = 0; row <= rows; row++) {
      const y = .265 + row * step;
      part(model, 'box', oak, 0, y, .013, bank - .13, .104, .91);
      part(model, 'box', gold, 0, y + .018, .482, bank - .14, .050, .080);
      if (row === rows) continue;
      let left = -1.79 + random() * .093;
      while (left < 1.72) {
        const w = .13 + random() * .17;
        const h = .35 + random() * .32;
        const d = .28 + random() * .12;
        const px = left + w / 2;
        const pz = .15 - random() * .10;
        part(model, 'box', covers[Math.floor(random() * covers.length)], px, y + .063 + h / 2, pz, w, h, d);
        for (const dy of [.095, h - .061]) {
          part(model, 'box', row % 2 ? gold : cream, px, y + .063 + dy, pz + d / 2 + SURFACE_GAP.detail,
            w * .79, .034, .012);
        }
        left += w + .023 + random() * .045;
      }
    }
    if (ladders) {
      const ladderX = -.8;
      const high = top - .55;
      const front = 1.34;
      for (const side of [-1, 1]) {
        beam(model, dark, [ladderX + side * .36, 0, front], [ladderX + side * .36, high, .54], .085);
        part(model, 'sphere', gold, ladderX + side * .36, high, .56, .084, .092, .077);
      }
      for (let y = .27; y < high - .13; y += .33) {
        part(model, 'box', oak, ladderX, y, front - (.80 * y / high), .74, .081, .092);
      }
      const local = spaceTransform({ position: { x, z }, rotation: yaw });
      addSolid(obstacles, ...toWorld(...local.toWorld(ladderX, .96)), .87, .91, base + high, exhibit.rotation + yaw);
    }
    addSolid(obstacles, ...toWorld(x, z), bank + .20, 1.10, base + top + 1.48, exhibit.rotation + yaw);
  }

  // Each wing has floor-to-ceiling shelves and a rolling ladder.
  for (const side of [-1, 1]) {
    const yaw = -side * Math.PI / 2;
    for (const [x, z, ladder] of [[9.13, 4.71, false], [9.13, -.10, side < 0], [8.65, -4.48, false]]) {
      bookshelf(side * x, z, 0, yaw, 10, ladder);
    }
    bookshelf(side * 4.83, -8.43, 3.42, 0, 8, side > 0);
    const bay = addGroup(THREE, details, '', side * 8.37, 0, 7.63);
    part(bay, 'drum', ivory, 0, 6.55, 0, .27, 12, .27);
    for (const [y, r, h] of [[.23, .50, .46], [.53, .37, .19], [12.58, .39, .26], [12.91, .51, .29]]) {
      part(bay, 'drum', gold, 0, y, 0, r, h, r);
    }
    addSolid(obstacles, ...toWorld(side * 8.37, 7.63), .79, .79, 13, exhibit.rotation);
  }

  // The alcove glass and the jambs are stepped forward from the rear wall.
  const window = addGroup(THREE, details, '', 0, 4.45, -9.12);
  const outline = new THREE.Shape();
  outline.moveTo(-2.36, 0);
  outline.lineTo(2.36, 0);
  outline.lineTo(2.36, 4.41);
  outline.quadraticCurveTo(2.22, 6.38, 0, 7.91);
  outline.quadraticCurveTo(-2.22, 6.38, -2.36, 4.41);
  outline.closePath();
  const frame = new THREE.ShapeGeometry(outline, 18);
  const coloredGlass = matte(0x6276a1, { emissive: 0x365279, emissiveIntensity: .64 });
  part(window, frame, gold, 0, 0, 0, 1.10, 1.03, 1);
  part(window, frame, coloredGlass, 0, .125, SURFACE_GAP.trim, .98, .983, 1);
  for (const side of [-1, 1]) {
    beam(window, ivory, [side * 1.57, .2, .073], [side * 1.57, 5.47, .073], .082);
    beam(window, gold, [side * 2.27, 2.08, .08], [0, 3.74, .08], .072);
    beam(window, gold, [side * 2.27, 5.02, .08], [0, 3.74, .08], .072);
  }
  beam(window, ivory, [0, .23, .068], [0, 7.62, .068], .084);
  for (const y of [1.04, 2.0, 5.13]) part(window, 'box', ivory, 0, y, .08, 4.59, .081, .092);
  const rose = new THREE.TorusGeometry(.78, .085, 9, 28);
  part(window, rose, gold, 0, 3.72, .127, 1, 1, 1);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI * .25;
    part(window, 'sphere', wine, .37 * Math.cos(a), 3.72 + .37 * Math.sin(a), .136,
      .250, .139, .051).rotation.z = a;
  }
  part(window, 'gem', glow, 0, 3.72, .218, .15, .14, .091);

  // Brackets and carved cornices carry the height beyond the bookbanks.
  for (const x of [-8.9, 8.9]) {
    part(details, 'box', dark, x, 11.50, -.61, .47, .42, 14.32);
    part(details, 'box', gold, x + Math.sign(x) * -.13, 11.79, -.61, .39, .094, 14.36);
    part(details, 'box', ivory, x, 14.72, -.67, .49, .38, 14.37);
  }
  batch(details, cases);
}

function buildBookStairs({ THREE, room, parts, exhibit, obstacles, palette }) {
  const { part, beam, batch } = parts;
  const { dark, oak, gold, wine, ivory } = palette;
  const { toWorld } = spaceTransform(exhibit);
  const stairs = addGroup(THREE, room, 'Belle library staircase');
  const details = new THREE.Group();
  const x = 6.16;
  const half = 1.23;
  const front = 2.79;
  const back = -4.93;
  const height = 3.42;
  const rear = -8.42;
  const landingHalf = 7.79;
  const slope = z => height * (front - z) / (front - back);
  const count = 24;
  const tread = (front - back) / count;
  const rise = height / count;
  const solid = (lx, lz, w, d, top) => addSolid(obstacles, ...toWorld(lx, lz), w, d, top, exhibit.rotation);
  for (let i = 0; i < count; i++) {
    const top = (i + .5) * rise;
    const z = front - (i + .5) * tread;
    part(details, 'box', oak, x, top / 2, z, half * 2, top, tread);
    part(details, 'box', wine, x, top + SURFACE_GAP.detail, z, 1.45, .028, tread - .026);
    part(details, 'box', gold, x, top - .035, z + tread / 2 + SURFACE_GAP.detail, half * 2, .045, .028);
  }
  function rail(ax, az, bx, bz, start, end) {
    const length = Math.hypot(bx - ax, bz - az);
    const count = Math.ceil(length / .76);
    for (let i = 0; i < count; i++) {
      const f = i / count;
      const px = THREE.MathUtils.lerp(ax, bx, f);
      const pz = THREE.MathUtils.lerp(az, bz, f);
      const y = THREE.MathUtils.lerp(start, end, f);
      part(details, 'drum', gold, px, y + .49, pz, i % 3 ? .074 : .12, 1.0, i % 3 ? .074 : .12);
      part(details, 'gem', ivory, px, y + 1.13, pz, .105, .137, .105);
    }
    beam(details, oak, [ax, start + 1.02, az], [bx, end + 1.02, bz], .128, .158);
  }
  for (const side of [-1, 1]) {
    const edge = x + side * half;
    rail(edge, front, edge, back, 0, height);
    for (let index = 0; index < 12; index++) {
      const depth = (front - back) / 12;
      const z = front - (index + .5) * depth;
      solid(edge, z, .17, depth, slope(z - depth / 2) + 1.07);
    }
  }
  const middle = (back + rear) / 2;
  part(details, 'box', dark, 0, height / 2 - .032, middle, landingHalf * 2, height - .064, back - rear);
  part(details, 'box', oak, 0, height - .032, middle, landingHalf * 2 + .035, .064, back - rear);
  rail(-landingHalf, back, x - half, back, height, height);
  rail(landingHalf, back, landingHalf, rear, height, height);
  rail(-landingHalf, back, -landingHalf, rear, height, height);
  for (const edge of [-landingHalf, landingHalf]) solid(edge, middle, .18, back - rear, height + 1.09);
  solid((x - half - landingHalf) / 2, back, x - half + landingHalf, .18, height + 1.09);
  solid(0, rear, 2 * landingHalf, .32, height + 1.15);
  for (let i = -6; i <= 4; i++) {
    part(details, 'box', gold, i * 1.12, 1.70, back + .043, .91, 2.36, .108);
    part(details, 'box', oak, i * 1.12, 1.70, back + .104, .79, 2.21, .055);
    part(details, 'gem', wine, i * 1.12, 1.70, back + .167, .108, .26, .057);
  }
  batch(details, stairs);

  return function getGroundHeight(lx, lz) {
    if (Math.abs(lx - x) <= half && lz >= back && lz <= front) return slope(lz);
    if (Math.abs(lx) <= landingHalf && lz >= rear && lz < back) return height;
  };
}

export function buildBelleLibrary(context) {
  const { THREE, document, room, parts, exhibit, outline, palette } = context;
  buildLibraryFloor(THREE, document, room, parts, outline, exhibit.bounds);
  const height = exhibit.bounds.height;
  const ceiling = parts.part(room, new THREE.ShapeGeometry(new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, z)))),
    palette.dark, 0, height - SURFACE_GAP.roof, 0, 1, 1, 1);
  ceiling.name = 'Belle library ceiling';
  ceiling.rotation.x = Math.PI / 2;
  ceiling.layers.set(PLAYER_ONLY_LAYER);

  const { part, beam, batch } = parts;
  const { gold, dark, glow, ivory } = palette;
  const chandelier = addGroup(THREE, room, 'Belle library chandelier', -.4, 10.55, 1.27);
  const crystals = new THREE.Group();
  beam(crystals, gold, [0, .88, 0], [0, height - 10.60, 0], .089);
  const ring = new THREE.TorusGeometry(1, .036, 8, 36);
  for (const [y, r] of [[0, 1.49], [.29, 1.21], [.79, .43]]) {
    part(crystals, ring, gold, 0, y, 0, r, r, r).rotation.x = Math.PI / 2;
  }
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5;
    const x = Math.cos(a), z = Math.sin(a);
    beam(crystals, gold, [x * .38, .76, z * .38], [x * 1.39, 0, z * 1.39], .053);
    part(crystals, 'drum', dark, x * 1.46, .146, z * 1.46, .092, .30, .092);
    part(crystals, 'gem', glow, x * 1.46, .413, z * 1.46, .099, .207, .099);
    part(crystals, 'gem', ivory, x * 1.42, -.277, z * 1.42, .094, .218, .094);
  }
  crystals.traverse(mesh => {
    if (mesh.isMesh) mesh.layers.set(PLAYER_ONLY_LAYER);
  });
  batch(crystals, chandelier);
  buildBookcases(context);
  return buildBookStairs(context);
}
