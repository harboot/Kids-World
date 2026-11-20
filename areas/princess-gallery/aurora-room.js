import { addGroup, paintCanvasTexture, SURFACE_GAP } from '../../core/geometry.js';
import { PLAYER_ONLY_LAYER } from '../../core/render-layers.js';
import { seededRandom } from '../../core/random.js';
import { addSolid } from './parts.js';

export const bedSite = { x: 0, z: -4.95, width: 5, depth: 7.3, top: 1.48 };

function pointedArch(THREE, width, shoulder, peak) {
  const shape = new THREE.Shape();
  shape.moveTo(-width, 0);
  shape.lineTo(width, 0);
  shape.lineTo(width, shoulder);
  shape.quadraticCurveTo(width, (shoulder + peak) / 2, 0, peak);
  shape.quadraticCurveTo(-width, (shoulder + peak) / 2, -width, shoulder);
  shape.closePath();
  return new THREE.ShapeGeometry(shape, 12);
}

export function buildAuroraFloor(THREE, document, parts, room, outline, { width, depth }) {
  const map = paintCanvasTexture(THREE, document, 1024, 1024, (ink, w, h) => {
    ink.scale(w / width, h / depth);
    ink.translate(width / 2, depth / 2);
    const random = seededRandom(880);
    for (let z = -depth / 2; z < depth / 2; z += 1.5) {
      for (let x = -width / 2; x < width / 2; x += 1.5) {
        ink.fillStyle = '#b590a6';
        ink.fillRect(x, z, 1.5, 1.5);
        ink.fillStyle = random() < .5 ? '#dfbecc' : '#ebccd1';
        ink.fillRect(x + .023, z + .023, 1.456, 1.456);
        ink.strokeStyle = '#fff3ee80';
        ink.lineWidth = .035;
        ink.beginPath();
        ink.moveTo(x + .08, z + 1.37);
        ink.quadraticCurveTo(x + random() * 1.3, z + .35, x + 1.4, z + .11);
        ink.stroke();
      }
    }
    ink.translate(0, -1.2);
    for (const [rx, rz, color] of [[6.4, 9.7, '#56344f'], [6.25, 9.55, '#dfb46d'],
      [6.12, 9.42, '#794564'], [5.76, 9.03, '#edc48a'], [5.67, 8.94, '#995877']]) {
      ink.fillStyle = color;
      ink.beginPath();
      ink.ellipse(0, 0, rx, rz, 0, 0, 2 * Math.PI);
      ink.fill();
    }
    for (let i = 0; i < 48; i++) {
      const angle = i * Math.PI / 24;
      ink.save();
      ink.translate(Math.sin(angle) * 5.95, Math.cos(angle) * 9.25);
      ink.rotate(-angle);
      ink.fillStyle = i % 2 ? '#d999aa' : '#f7d59e';
      ink.beginPath();
      ink.ellipse(0, 0, .20, .079, 0, 0, Math.PI * 2);
      ink.fill();
      ink.restore();
    }
    for (const z of [3.5, 6.3]) {
      ink.save();
      ink.translate(0, z);
      for (let i = 0; i < 12; i++) {
        ink.fillStyle = i % 2 ? '#c5809e' : '#d89aab';
        ink.beginPath();
        ink.moveTo(0, -.28);
        ink.quadraticCurveTo(.58, -.93, 0, -1.85);
        ink.quadraticCurveTo(-.58, -.93, 0, -.28);
        ink.fill();
        ink.rotate(Math.PI / 6);
      }
      ink.fillStyle = '#ebc187';
      ink.beginPath();
      ink.arc(0, 0, .29, 0, 2 * Math.PI);
      ink.fill();
      ink.restore();
    }
  });
  const geometry = new THREE.ShapeGeometry(new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z))));
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / width + .5, uv.getY(i) / depth + .5);
  const floor = parts.part(room, geometry, parts.matte(map ? 0xffffff : 0xbe879e, { map }), 0, 0, 0, 1, 1, 1);
  floor.name = 'Aurora marble floor and royal carpet';
  floor.rotation.x = -Math.PI / 2;
}

export function addThorns(parts, vine, points, palette, width) {
  const { part, beam } = parts;
  const { stem, leaf, darkLeaf } = palette;
  for (let i = 1; i < points.length; i++) {
    const [x, y, z] = points[i];
    beam(vine, stem, points[i - 1], points[i], width * .47);
    if (i === points.length - 1) continue;
    const side = i % 2 ? -1 : 1;
    part(vine, 'cone', darkLeaf, x + side * width * .37, y + width * .28, z,
      width * .19, width * .95, width * .20).rotation.z = -side * .94;
    part(vine, 'sphere', leaf, x - side * width * .96, y - width * .17, z + width * .24,
      width * 1.01, width * .31, width * .35).rotation.z = -side * .52;
  }
}

// Folded curtains leave the bed canopy open to the overlook and drone.
function curtain(THREE, parts, parent, material, x, top, z, width, height, side) {
  const vertices = [], indices = [];
  for (let row = 0; row <= 12; row++) {
    const t = row / 12;
    const gathered = Math.sin(Math.PI * t) ** 4;
    for (let col = 0; col <= 24; col++) {
      const u = col / 24;
      vertices.push((u - .5) * width * (1 - .63 * gathered) + side * width * .21 * gathered,
        -height * t + .08 * t * Math.sin(u * Math.PI * 10),
        .10 * Math.cos(u * Math.PI * 10) * (1 - .45 * gathered) - .13 * gathered);
      const i = row * 25 + col;
      if (row && col) indices.push(i - 26, i - 1, i - 25, i - 25, i - 1, i);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return parts.part(parent, geometry, material, x, top, z, 1, 1, 1);
}

export function buildAuroraWalls({ THREE, document, parts, room, details, outline, palette, bounds }) {
  const { part, beam, matte } = parts;
  const { stone, gold, ivory, burgundy, velvet, pale, candle } = palette;
  const arch = pointedArch(THREE, 1.24, 4.33, 6.18);
  const glass = pointedArch(THREE, 1.09, 4.26, 5.92);
  const skyline = paintCanvasTexture(THREE, document, 256, 512, (ink, w, h) => {
    const gradient = ink.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#403963');
    gradient.addColorStop(.57, '#8872aa');
    gradient.addColorStop(1, '#f1b9cb');
    ink.fillStyle = gradient;
    ink.fillRect(0, 0, w, h);
    ink.fillStyle = '#ffebd1';
    ink.beginPath();
    ink.arc(w * .64, h * .32, w * .16, 0, Math.PI * 2);
    ink.fill();
    const random = seededRandom(291);
    for (let i = 0; i < 36; i++) ink.fillRect(random() * w, random() * h * .72, i % 4 ? 2 : 4, i % 4 ? 2 : 4);
    for (const [base, color] of [[.80, '#64537f'], [.87, '#503b61']]) {
      ink.fillStyle = color;
      ink.beginPath();
      ink.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) ink.lineTo(x, base * h + 12 * Math.sin(x * .048 + base * 54));
      ink.lineTo(w, h);
      ink.fill();
    }
  });
  const uv = glass.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.18 + .5, uv.getY(i) / 5.92);
  const night = new THREE.MeshBasicMaterial({ color: skyline ? 0xffffff : 0x8d78a2, map: skyline, toneMapped: false });
  const ring = new THREE.TorusGeometry(1, .045, 7, 24);

  for (let i = 1; i < outline.length; i++) {
    const [ax, az] = outline[i], [bx, bz] = outline[(i + 1) % outline.length];
    const yaw = Math.atan2(az - bz, bx - ax) + Math.PI;
    const span = Math.hypot(bx - ax, bz - az);
    const nx = Math.sin(yaw), nz = Math.cos(yaw);
    const panel = addGroup(THREE, details, 'Aurora chamber wall panel',
      (ax + bx) / 2 + nx * .31, 0, (az + bz) / 2 + nz * .31, yaw);
    part(panel, 'box', stone, 0, 1.66, -.015, span - .17, 1.38, .13);
    for (const [y, height, material] of [[.97, .14, ivory], [2.42, .15, gold], [12.25, .29, ivory],
      [12.52, .13, gold], [17.73, .24, pale]]) {
      part(panel, 'box', material, 0, y, .067, span - .12, height, .19);
    }
    for (const side of [-1, 1]) {
      const x = side * (span / 2 - .42);
      part(panel, 'box', burgundy, x, .44, .12, .68, .88, .50);
      part(panel, 'drum', ivory, x, 6.44, .09, .25, 11.14, .24);
      part(panel, 'drum', gold, x, 1.04, .09, .295, .24, .30);
      part(panel, 'drum', gold, x, 11.96, .09, .322, .32, .30);
    }
    const window = addGroup(THREE, panel, 'Gothic moonlit window', 0, 4.62, .09);
    part(window, arch, gold, 0, 0, 0, 1, 1, 1);
    part(window, glass, night, 0, .118, SURFACE_GAP.trim, 1, 1, 1);
    part(window, 'box', ivory, 0, 0, .135, 2.60, .20, .36);
    for (const y of [1.61, 3.18, 4.28]) part(window, 'box', gold, 0, y, .058, 2.15, .062, .048);
    part(window, 'box', gold, 0, 2.21, .058, .065, 4.21, .075);
    part(window, ring, gold, 0, 4.77, .06, .34, .34, .35);
    for (const side of [-1, 1]) {
      beam(window, gold, [side * .91, 4.29, .06], [0, 5.63, .06], .047);
      if (i === 6 || i === 2 || i === 10) {
        curtain(THREE, parts, panel, velvet, side * 1.59, 11.20, .28, 1.02, 7.63, side);
        part(panel, 'gem', gold, side * 1.81, 7.40, .36, .16, .17, .13);
      }
    }
    if (i === 4 || i === 8 || i === 10 || i === 2) {
      const vine = addGroup(THREE, panel, 'Climbing thorny rose vine');
      const points = Array.from({ length: 15 }, (_, j) =>
        [Math.sin(j * .73) * .48 - .79, .23 + j * .45, .44 + .1 * Math.cos(j * .91)]);
      addThorns(parts, vine, points, palette, .21);
      for (let j = 2; j < points.length; j += 3) {
        const [x, y, z] = points[j];
        part(vine, 'sphere', burgundy, x, y, z + .10, .15, .14, .10);
        part(vine, 'sphere', pale, x + .052, y + .043, z + .175, .074, .081, .053);
      }
    }
  }

  const roof = part(room, new THREE.ShapeGeometry(new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, z)))),
    matte(0x8a638d), 0, bounds.height - SURFACE_GAP.roof, 0, 1, 1, 1);
  roof.name = 'Aurora oval ceiling';
  roof.rotation.x = Math.PI / 2;
  roof.layers.set(PLAYER_ONLY_LAYER);
  const overhead = mesh => mesh.layers.set(PLAYER_ONLY_LAYER);
  const chandelier = addGroup(THREE, details, 'Aurora royal chandelier', 0, 9.05, 3.30);
  const scroll = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, .79, 0), new THREE.Vector3(.47, .31, 0), new THREE.Vector3(1.11, -.18, 0),
    new THREE.Vector3(1.58, -.09, 0), new THREE.Vector3(1.76, .34, 0),
  ]);
  const arm = new THREE.TubeGeometry(scroll, 12, .049, 6, false);
  overhead(beam(chandelier, gold, [0, 1, 0], [0, bounds.height - 9.05, 0], .10));
  overhead(part(chandelier, 'drum', gold, 0, .42, 0, .24, 1.16, .24));
  overhead(part(chandelier, 'gem', pale, 0, -.30, 0, .31, .51, .31));
  overhead(part(chandelier, 'gem', candle, 0, -.69, 0, .13, .29, .13));
  for (let i = 0; i < 10; i++) {
    const angle = i * Math.PI / 5;
    const x = 1.76 * Math.cos(angle), z = 1.76 * Math.sin(angle);
    const branch = part(chandelier, arm, gold, 0, 0, 0, 1, 1, 1);
    branch.rotation.y = -angle;
    overhead(branch);
    overhead(part(chandelier, 'drum', gold, x, .37, z, .165, .12, .165));
    overhead(part(chandelier, 'drum', ivory, x, .54, z, .075, .26, .075));
    overhead(part(chandelier, 'gem', candle, x, .76, z, .088, .15, .088));
    overhead(part(chandelier, 'gem', pale, x * .85, -.37, z * .85, .092, .35, .092));
  }
}

export function buildRoyalBed({ THREE, parts, room, palette, exhibit, obstacles, toWorld }) {
  const { part, beam, batch } = parts;
  const { ivory, gold, burgundy, velvet, pale, quilt, lavender } = palette;
  const { x, z, width, depth, top } = bedSite;
  const model = addGroup(THREE, room, 'Aurora royal bed', x, 0, z);
  const bed = new THREE.Group();
  const foot = depth / 2, back = -foot;

  // Rounded horizontal upholstery pieces share the same beveled profile.
  const outline = new THREE.Shape();
  outline.moveTo(-.44, -.48);
  outline.lineTo(.44, -.48);
  outline.quadraticCurveTo(.48, -.48, .48, -.44);
  outline.lineTo(.48, .44);
  outline.quadraticCurveTo(.48, .48, .44, .48);
  outline.lineTo(-.44, .48);
  outline.quadraticCurveTo(-.48, .48, -.48, .44);
  outline.lineTo(-.48, -.44);
  outline.quadraticCurveTo(-.48, -.48, -.44, -.48);
  const padded = new THREE.ExtrudeGeometry(outline, { depth: .75, bevelSize: .02, bevelThickness: .125,
    bevelSegments: 3, curveSegments: 6 });
  padded.translate(0, 0, -.375);
  function layer(material, y, z, width, height, depth) {
    const piece = part(bed, padded, material, 0, y, z, width, depth, height);
    piece.rotation.x = -Math.PI / 2;
    return piece;
  }

  layer(burgundy, .69, 0, width, .49, depth);
  layer(gold, .88, 0, width + .06, .15, depth - .10);
  layer(ivory, top - .195, -.045, width - .40, .39, depth - .32).name = 'Aurora mattress';
  layer(lavender, 1.455, 1.78, 4.68, .135, 3.31);
  layer(quilt, 1.50, 2.46, 4.70, .10, 2.03);
  for (const side of [-1, 1]) {
    part(bed, 'sphere', quilt, side * 2.23, 1.31, 2.34, .155, .26, 1.04);
    part(bed, 'sphere', pale, side * .94, 1.49, -2.15, 1.0, .192, .61).rotation.y = side * .10;
    part(bed, 'sphere', ivory, side * .58, 1.58, -1.73, .63, .136, .51).rotation.y = side * -.12;
    for (const iz of [back + .16, foot - .17]) {
      const ix = side * (width / 2 - .14);
      const tall = iz < 0 ? 5.55 : 5.30;
      const post = addGroup(THREE, bed, 'Carved canopy bedpost', ix, 0, iz);
      part(post, 'sphere', burgundy, 0, .27, 0, .28, .31, .28);
      part(post, 'drum', gold, 0, .46, 0, .24, .14, .24);
      part(post, 'drum', burgundy, 0, tall / 2, 0, .14, tall - .43, .14);
      for (const y of [1.15, 1.34, 4.48, tall - .11]) part(post, 'drum', gold, 0, y, 0, .19, .14, .19);
      part(post, 'gem', gold, 0, tall + .15, 0, .22, .31, .22);
      curtain(THREE, parts, post, velvet, -side * .05, tall - .20, -.085, iz < 0 ? 1.70 : .69,
        iz < 0 ? 4.57 : 3.97, side);
      part(post, 'gem', gold, side * .17, tall * .59, .07, .14, .20, .15);
      addSolid(obstacles, ...toWorld(x + ix, z + iz), .55, .55, tall, exhibit.rotation);
    }
    beam(bed, gold, [side * 2.36, 5.30, foot - .17], [side * 2.36, 5.54, back + .16], .11);
  }
  for (const [iz, y] of [[back + .16, 5.5], [foot - .17, 5.23]]) {
    part(bed, 'box', burgundy, 0, y - .16, iz, 4.70, .34, .16);
    part(bed, 'box', gold, 0, y, iz, 4.90, .115, .22);
    for (let i = -5; i <= 5; i++) {
      part(bed, 'sphere', velvet, i * .405, y - .26, iz + .013, .263, .225, .105);
      part(bed, 'gem', gold, i * .405, y - .45, iz + .052, .057, .104, .066);
    }
  }

  const headboard = pointedArch(THREE, 2.11, 1.28, 2.10);
  const inset = pointedArch(THREE, 1.94, 1.18, 1.95);
  part(bed, headboard, gold, 0, .80, back + .09, 1, 1, 1);
  part(bed, inset, velvet, 0, .84, back + .09 + SURFACE_GAP.trim, 1, 1, 1);
  part(bed, 'box', burgundy, 0, 1.49, back + .015, 4.15, 1.15, .15);
  for (let i = -3; i <= 3; i++) {
    part(bed, 'gem', gold, i * .42, 2.18 - i ** 2 * .024, back + .17, .093, .12, .042);
  }
  part(bed, 'gem', pale, 0, 2.69, back + .15, .183, .21, .079);
  part(bed, 'box', burgundy, 0, .87, foot - .10, 4.91, .60, .23);
  part(bed, 'box', gold, 0, 1.17, foot + .015, 4.93, .093, .093);
  for (let i = -4; i <= 4; i++) {
    part(bed, 'gem', gold, i * .48, .87, foot + .027, .10, .12, .040);
    const motif = part(bed, 'gem', gold, i * .45, 1.55 + SURFACE_GAP.detail, 2.91, .103, .028, .20);
    motif.rotation.y = i * .10;
  }
  batch(bed, model);
  addSolid(obstacles, ...toWorld(x, z), width + .06, depth + .055, top, exhibit.rotation);
}
