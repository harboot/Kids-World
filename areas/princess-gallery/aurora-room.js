import { addGroup, paintCanvasTexture, SURFACE_GAP } from '../../core/geometry.js';
import { seededRandom } from '../../core/random.js';
import { PLAYER_ONLY_LAYER } from '../../core/render-layers.js';
import { addRoundSolid, addSolid, spaceTransform } from './parts.js';

function buildCarpet(THREE, document, room, parts, exhibit, outline) {
  const { width, depth } = exhibit.bounds;
  const map = paintCanvasTexture(THREE, document, 1024, 1024, (ink, w, h) => {
    ink.scale(w / width, h / depth);
    ink.translate(width / 2, depth / 2);
    ink.fillStyle = '#ead5d8';
    ink.fillRect(-width / 2, -depth / 2, width, depth);
    const random = seededRandom(691);
    for (let z = -depth / 2; z < depth / 2; z += 2) {
      for (let x = -width / 2; x < width / 2; x += 2) {
        ink.fillStyle = ['#f2e2dd', '#e7d3d8', '#eddce1'][Math.floor(random() * 3)];
        ink.fillRect(x + .018, z + .018, 1.964, 1.964);
        ink.strokeStyle = '#ab819843';
        ink.lineWidth = .026;
        ink.beginPath();
        ink.moveTo(x + .09, z + 1.9);
        ink.bezierCurveTo(x + .61, z + .47, x + 1.1, z + 1.09, x + 1.88, z + .13 + random() * .4);
        ink.stroke();
      }
    }

    for (const [rx, rz, color] of [[6.21, 8.24, '#683557'], [6.13, 8.16, '#d9ac6b'],
      [6.01, 8.04, '#854468'], [5.65, 7.68, '#edc48c'], [5.59, 7.62, '#a95879']]) {
      ink.fillStyle = color;
      ink.beginPath();
      ink.ellipse(0, -.6, rx, rz, 0, 0, Math.PI * 2);
      ink.fill();
    }

    function petal(x, z, yaw, size, color) {
      ink.save();
      ink.translate(x, z);
      ink.rotate(yaw);
      ink.fillStyle = color;
      ink.beginPath();
      ink.moveTo(0, 0);
      ink.quadraticCurveTo(size * .5, -size * .4, 0, -size);
      ink.quadraticCurveTo(-size * .5, -size * .4, 0, 0);
      ink.fill();
      ink.restore();
    }
    for (let i = 0; i < 56; i++) {
      const angle = i * Math.PI / 28;
      petal(Math.sin(angle) * 5.80, Math.cos(angle) * 7.83 - .6, angle - .8, .28, '#edcd9d');
    }
    for (const [x, z, scale] of [[0, 2.9, 1], [-3.28, -2.0, .51], [3.28, -2.0, .51], [0, -4.55, .8]]) {
      ink.fillStyle = '#73395f';
      ink.beginPath();
      ink.arc(x, z, scale * 1.95, 0, Math.PI * 2);
      ink.fill();
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;
        petal(x, z, angle, scale * 1.82, '#f0c996');
        petal(x, z, angle + Math.PI / 8, scale * 1.31, '#cc7a99');
      }
      ink.fillStyle = '#f4d9b0';
      ink.beginPath();
      ink.arc(x, z, scale * .20, 0, Math.PI * 2);
      ink.fill();
    }
  });
  const geometry = new THREE.ShapeGeometry(new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z))));
  const positions = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < positions.count; i++) {
    uv.setXY(i, positions.getX(i) / width + .5, positions.getY(i) / depth + .5);
  }
  const floor = parts.part(room, geometry, parts.matte(map ? 0xffffff : 0xe9d4d9, { map }), 0, 0, 0, 1, 1, 1);
  floor.name = 'Aurora marble floor and embroidered royal carpet';
  floor.rotation.x = -Math.PI / 2;
}

function gothicArch(THREE, halfWidth, shoulder, peak) {
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth, 0);
  shape.lineTo(halfWidth, 0);
  shape.lineTo(halfWidth, shoulder);
  shape.quadraticCurveTo(halfWidth, peak - .55, 0, peak);
  shape.quadraticCurveTo(-halfWidth, peak - .55, -halfWidth, shoulder);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function curtainCloth(THREE) {
  const rows = 18;
  const pleats = 24;
  const vertices = [], indices = [];
  for (let j = 0; j <= rows; j++) {
    const t = j / rows;
    const tie = Math.exp(-((t - .67) ** 2) / .047);
    for (let i = 0; i <= pleats; i++) {
      const u = i / pleats;
      const fold = Math.cos(u * Math.PI * 8);
      vertices.push(u * (1 - .66 * tie), 1 - t + .032 * t ** 8 * fold,
        .155 * (1 - .39 * tie) * fold);
      if (i < pleats && j < rows) {
        const a = j * (pleats + 1) + i;
        const b = a + pleats + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function buildWalls(THREE, document, details, parts, exhibit, outline, obstacles, palette, cloth) {
  const { part, beam, matte } = parts;
  const { ivory, gold, mauve, plum, velvet, green, leaf, wine, bloom } = palette;
  const { toWorld } = spaceTransform(exhibit);
  const frame = gothicArch(THREE, 1.78, 4.49, 6.76);
  const bevel = gothicArch(THREE, 1.65, 4.42, 6.54);
  const pane = gothicArch(THREE, 1.54, 4.34, 6.27);
  const skyMap = paintCanvasTexture(THREE, document, 256, 512, (ink, w, h) => {
    const sky = ink.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#43346c');
    sky.addColorStop(.55, '#8765a6');
    sky.addColorStop(1, '#ea94b5');
    ink.fillStyle = sky;
    ink.fillRect(0, 0, w, h);
    const random = seededRandom(107);
    for (let i = 0; i < 60; i++) {
      ink.fillStyle = i % 4 ? '#ffdcf4aa' : '#ffe9be';
      const size = i % 4 ? 2 : 4;
      ink.fillRect(random() * w, random() * h, size, size);
    }
    ink.fillStyle = '#ffe2b4';
    ink.beginPath();
    ink.arc(w * .5, h * .27, 31, 0, Math.PI * 2);
    ink.fill();
    for (const [color, base] of [['#5c447a', .70], ['#392e58', .86]]) {
      ink.fillStyle = color;
      ink.beginPath();
      ink.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) ink.lineTo(x, h * base + Math.sin(x * .031) * 11);
      ink.lineTo(w, h);
      ink.fill();
    }
  });
  const uv = pane.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3.08 + .5, uv.getY(i) / 6.27);
  const glass = new THREE.MeshBasicMaterial({ color: skyMap ? 0xffffff : 0xa268b0, map: skyMap });
  const candle = matte(0xffd2ad, { emissive: 0xff9dbb, emissiveIntensity: .42 });
  const thornShape = new THREE.ConeGeometry(1, 1, 5);
  const random = seededRandom(201);
  const wallOffset = .275;

  function vine(wall, start, height) {
    let last = [start, .7, .09];
    for (let y = 1.15; y < height; y += .50) {
      const x = start + Math.sin(y * 1.55 + start) * .44 + Math.sin(y * .37) * .32;
      const branch = [x, y, .102];
      beam(wall, green, last, branch, .076);
      const side = Math.sin(y * 3) < 0 ? -1 : 1;
      part(wall, 'ball', leaf, x + side * .17, y + .04, .15, .132, .267, .072).rotation.z = -side * .83;
      part(wall, thornShape, green, x - side * .083, y + .15, .137, .045, .176, .05).rotation.z = side * .76;
      if (random() > .73) {
        part(wall, 'sphere', wine, x, y + .19, .168, .148, .149, .106);
        part(wall, 'sphere', bloom, x + .026, y + .22, .242, .086, .088, .055);
      }
      last = branch;
    }
  }

  for (let i = 1; i < outline.length; i++) {
    const [ax, az] = outline[i];
    const [bx, bz] = outline[(i + 1) % outline.length];
    const yaw = Math.atan2(az - bz, bx - ax) + Math.PI;
    const inwardX = Math.sin(yaw), inwardZ = Math.cos(yaw);
    const length = Math.hypot(bx - ax, bz - az);
    const wall = addGroup(THREE, details, '', (ax + bx) / 2 + inwardX * wallOffset, 0,
      (az + bz) / 2 + inwardZ * wallOffset, yaw);
    part(wall, 'box', mauve, 0, 2.68, .045, length - .13, 3.08, .14);
    for (const side of [-1, 1]) {
      const x = side * length * .235;
      part(wall, 'box', plum, x, 2.74, .087, length * .418, 2.34, .083);
      part(wall, 'box', mauve, x, 2.74, .128, length * .397, 2.22, .046);
      part(wall, 'gem', gold, x, 2.74, .163, .121, .234, .055);
    }
    for (const [y, h, material, offset] of [[1.24, .13, gold, .15], [4.26, .23, ivory, .16],
      [4.39, .067, gold, .18], [13.72, .14, gold, .19], [14.02, .28, mauve, .18],
      [17.80, .16, gold, .18]]) {
      part(wall, 'box', material, 0, y, offset, length - .08, h, .17);
    }
    const window = addGroup(THREE, wall, 'Gothic window', 0, 6.05, SURFACE_GAP.trim);
    part(window, frame, gold, 0, 0, 0, 1, 1, 1);
    part(window, bevel, plum, 0, .10, SURFACE_GAP.detail, 1, 1, 1);
    part(window, pane, glass, 0, .22, SURFACE_GAP.trim, 1, 1, 1);
    part(window, 'box', ivory, 0, .06, .174, 3.77, .19, .45);
    part(window, 'box', gold, 0, 3.125, .071, .066, 5.83, .076);
    for (const y of [1.86, 3.52, 4.54]) part(window, 'box', gold, 0, y, .073, 3.03, .063, .075);
    part(window, 'gem', gold, 0, 4.67, .135, .256, .291, .055);
    for (const side of [-1, 1]) {
      beam(window, gold, [side * 1.39, 4.75, .075], [0, 5.89, .075], .067);
      if (i % 2 === 0 || i === 5) {
        const curtain = part(window, cloth, velvet, side * 2.08, -.27, .305, .95, 6.21, .64);
        if (side > 0) curtain.rotation.y = Math.PI;
        part(window, 'sphere', gold, side * 1.91, 1.82, .32, .213, .066, .106);
        part(window, 'gem', gold, side * 1.83, 1.66, .37, .093, .177, .078);
      }
    }
    if (i === 2 || i === 5 || i === 8 || i === 10) vine(wall, -length / 2 + .55, 10.5 + i % 3);
    if (i === 4 || i === 6 || i === 9) vine(wall, length / 2 - .55, 7.65);

    const px = ax + (bx - ax) * .065 + inwardX * .60;
    const pz = az + (bz - az) * .065 + inwardZ * .60;
    const column = addGroup(THREE, details, 'Ivory column', px, 0, pz, yaw);
    part(column, 'drum', ivory, 0, 7.05, 0, .284, 12.96, .284);
    for (const [y, h, radius, material] of [[.21, .42, .51, mauve], [.49, .15, .42, gold],
      [.71, .29, .36, ivory], [13.44, .18, .35, gold], [13.65, .27, .45, ivory],
      [13.84, .13, .48, gold]]) part(column, 'drum', material, 0, y, 0, radius, h, radius);
    part(column, 'gem', candle, 0, 3.90, .34, .18, .29, .171);
    part(column, 'sphere', gold, 0, 3.60, .34, .25, .078, .238);
    addRoundSolid(obstacles, ...toWorld(px, pz), .51, 13.91);
  }
}

function buildChandelier(THREE, details, parts, height, palette) {
  const { part, beam } = parts;
  const { gold, crystal, glow } = palette;
  const chandelier = addGroup(THREE, details, 'Aurora chandelier', -2.2, 11.95, -.85);
  const ring = new THREE.TorusGeometry(1, .026, 7, 44);
  beam(chandelier, gold, [0, 1.48, 0], [0, height - 11.95, 0], .074);
  for (const [y, radius] of [[0, 1.46], [.33, 1.68], [.87, .89], [1.30, .42]]) {
    part(chandelier, ring, gold, 0, y, 0, radius, radius, radius).rotation.x = Math.PI / 2;
  }
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6;
    const x = Math.cos(angle);
    const z = Math.sin(angle);
    beam(chandelier, gold, [x * .37, 1.33, z * .37], [x * 1.61, .34, z * 1.61], .053);
    part(chandelier, 'drum', gold, x * 1.65, .50, z * 1.65, .094, .29, .094);
    part(chandelier, 'gem', glow, x * 1.65, .71, z * 1.65, .083, .175, .083);
    part(chandelier, 'gem', crystal, x * 1.47, -.24, z * 1.47, .107, .29, .107);
  }
  part(chandelier, 'gem', crystal, 0, -.32, 0, .26, .58, .26);
  chandelier.traverse(object => {
    if (object.isMesh) object.layers.set(PLAYER_ONLY_LAYER);
  });
}

function bedPanel(THREE, width, peak, depth) {
  const shape = new THREE.Shape();
  const w = width / 2;
  shape.moveTo(-w, 0);
  shape.lineTo(w, 0);
  shape.lineTo(w, peak * .58);
  shape.quadraticCurveTo(w * .94, peak * .86, w * .60, peak * .83);
  shape.quadraticCurveTo(w * .25, peak * .87, 0, peak);
  shape.quadraticCurveTo(-w * .25, peak * .87, -w * .60, peak * .83);
  shape.quadraticCurveTo(-w * .94, peak * .86, -w, peak * .58);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true,
    bevelThickness: .045, bevelSize: .041, bevelSegments: 2, curveSegments: 12 });
}

function buildRoyalBed(THREE, room, parts, exhibit, obstacles, palette, cloth) {
  const { part, beam, batch } = parts;
  const { gold, ivory, mauve, plum, velvet, blush, wine, glow } = palette;
  const bed = addGroup(THREE, room, 'Aurora royal bed', 0, 0, -5.24);
  const frame = new THREE.Group();
  const { toWorld } = spaceTransform(exhibit);
  const mattressTop = 1.13;
  const beddingDrop = .31;
  function solid(x, z, width, depth, height) {
    addSolid(obstacles, ...toWorld(x, bed.position.z + z), width, depth, height, exhibit.rotation);
  }
  part(frame, 'box', plum, 0, .43, 0, 4.82, .41, 5.64);
  part(frame, 'box', gold, 0, .91 - beddingDrop, 0, 4.93, .118, 5.76);
  part(frame, 'box', mauve, 0, .245, 0, 4.86, .121, 5.72);
  const mattress = new THREE.ExtrudeGeometry(new THREE.Shape([
    new THREE.Vector2(-2.16, -2.61), new THREE.Vector2(2.16, -2.61),
    new THREE.Vector2(2.16, 2.61), new THREE.Vector2(-2.16, 2.61),
  ]), { depth: .21, bevelThickness: .14, bevelSize: .14, bevelSegments: 4 });
  const cushion = part(bed, mattress, ivory, 0, mattressTop - .35, 0, 1, 1, 1);
  cushion.name = 'Aurora mattress';
  cushion.rotation.x = -Math.PI / 2;

  for (const [z, base, height, lining] of [[-2.73, .28, 3.04, velvet], [2.76, .25, .80, wine]]) {
    part(frame, bedPanel(THREE, 4.70, height, .18), plum, 0, base, z - .145, 1, 1, 1);
    part(frame, bedPanel(THREE, 4.42, height - .125, .071), gold, 0, base + .05, z + .028, 1, 1, 1);
    part(frame, bedPanel(THREE, 4.19, height - .28, .038), lining, 0, base + .12, z + .111, 1, 1, 1);
    for (let i = -3; i <= 3; i++) {
      part(frame, 'gem', gold, i * .50, base + height * .56 - .019 * i * i, z + .20, .047, .063, .037);
    }
    if (z < 0) {
      for (let i = -2; i <= 2; i++) {
        part(frame, 'gem', blush, i * .56, 2.40 - i * i * .05, z + .205, .052, .079, .037);
      }
      part(frame, 'gem', glow, 0, 3.04, z + .205, .162, .23, .082);
    }
    solid(0, z, 4.79, .38, base + height + .035);
  }

  const post = new THREE.LatheGeometry([
    [.21, 0], [.23, .15], [.16, .28], [.14, 1.20], [.21, 1.28], [.19, 1.44],
    [.098, 1.65], [.092, 3.92], [.18, 4.06], [.19, 4.49], [.14, 4.66],
  ].map(([x, y]) => new THREE.Vector2(x, y)), 16);
  const finial = new THREE.TorusGeometry(1, .10, 7, 24);
  for (const x of [-2.39, 2.39]) {
    for (const z of [-2.71, 2.73]) {
      part(frame, post, plum, x, 0, z, 1, 1, 1);
      for (const [y, size] of [[.20, .207], [1.31, .192], [1.57, .135], [3.91, .11], [4.49, .184]]) {
        part(frame, finial, gold, x, y, z, size, size, size).rotation.x = Math.PI / 2;
      }
      part(frame, 'gem', gold, x, 4.87, z, .196, .318, .196);
      addRoundSolid(obstacles, ...toWorld(x, bed.position.z + z), .23, 5.19);
    }
    part(frame, 'box', plum, x, 4.32, 0, .265, .34, 5.53);
    part(frame, 'box', gold, x, 4.50, 0, .285, .085, 5.55);
    for (const [y, z, height] of [[1.49, -2.63, 2.75], [2.17, 2.68, 2.03]]) {
      const drape = part(frame, cloth, velvet, x, y, z, .97, height, .70);
      drape.rotation.y = x < 0 ? Math.PI : 0;
      part(frame, 'sphere', gold, x + Math.sign(x) * .17, y + height * .33, z, .215, .071, .158);
      part(frame, 'gem', gold, x + Math.sign(x) * .21, y + height * .33 - .17, z + .089, .099, .169, .082);
    }
  }
  for (const z of [-2.71, 2.73]) {
    part(frame, 'box', plum, 0, 4.33, z, 4.65, .40, .265);
    part(frame, 'box', gold, 0, 4.51, z, 4.76, .092, .31);
    for (let i = -4; i <= 4; i++) {
      part(frame, 'sphere', velvet, i * .49, 4.15 + .06 * Math.abs(i), z, .31, .245, .132).rotation.z = -i * .045;
      part(frame, 'gem', gold, i * .49, 4.12 + .05 * Math.abs(i), z + .138, .053, .085, .042);
    }
  }
  // The fabric covers the head of the bed and leaves a clear sightline from the overlook.
  const canopy = new THREE.PlaneGeometry(4.70, 2.16, 24, 9);
  const linen = canopy.getAttribute('position');
  for (let i = 0; i < linen.count; i++) {
    const x = linen.getX(i);
    const z = linen.getY(i);
    linen.setXYZ(i, x, .18 * Math.cos(x * .55) + .047 * Math.cos(x * 10), z);
  }
  canopy.computeVertexNormals();
  part(frame, canopy, velvet, 0, 4.43, -1.55, 1, 1, 1);
  const canopyEdgeY = x => 4.43 + .18 * Math.cos(x * .55) + .047 * Math.cos(x * 10);
  for (let i = 0; i < 12; i++) {
    const x = -2.35 + i * 4.70 / 12;
    const nx = x + 4.70 / 12;
    beam(frame, gold, [x, canopyEdgeY(x), -.47], [nx, canopyEdgeY(nx), -.47], .048);
  }

  part(frame, 'box', mauve, 0, mattressTop - .009, -.19, 4.24, .050, 4.72);
  for (const x of [-1.98, 1.98]) {
    part(frame, 'box', blush, x, mattressTop + .021, -.18, .127, .019, 4.49);
    for (let z = -2.15; z < 1.33; z += .37) {
      part(frame, 'gem', gold, x, mattressTop + .042, z, .063, .022, .108);
    }
  }
  for (const [x, y, z, w, h, d, yaw, material] of [
    [0, 1.446 - beddingDrop, -1.10, .665, .205, .58, -.10, blush],
    [-1.36, 1.56 - beddingDrop, -1.97, .63, .23, .47, -.33, mauve],
    [1.36, 1.56 - beddingDrop, -1.97, .63, .23, .47, .33, mauve],
  ]) {
    part(frame, 'sphere', ivory, x, y, z, w + .035, h * .64, d + .031).rotation.y = yaw;
    part(frame, 'sphere', material, x, y + .033, z, w, h, d).rotation.y = yaw;
  }
  part(frame, 'sphere', blush, 0, 1.43 - beddingDrop, 2.20, 2.28, .126, .47);
  for (const side of [-1, 1]) {
    part(frame, 'sphere', mauve, side * 2.16, 1.23 - beddingDrop, 1.92, .193, .296, .76);
    part(frame, 'sphere', wine, side * 2.21, 1.15 - beddingDrop, 2.03, .159, .173, .60);
  }
  for (let i = -7; i <= 7; i++) {
    const x = i * .26;
    const y = 1.43 - beddingDrop + .124 * Math.sqrt(1 - (x / 2.28) ** 2 - (.22 / .47) ** 2);
    part(frame, 'gem', gold, x, y + SURFACE_GAP.detail, 2.42, .059, .022, .114).rotation.y = Math.PI / 4;
  }
  for (const side of [-1, 1]) {
    beam(frame, gold, [side * 2.43, .68 - beddingDrop, -2.47], [side * 2.43, .68 - beddingDrop, 2.49], .061);
    for (let i = -4; i <= 4; i++) {
      part(frame, 'gem', glow, side * 2.44, .67 - beddingDrop, i * .53, .046, .105, .121);
    }
  }
  // Protect the sleeping figure when a player jumps beside the lowered mattress.
  solid(0, 0, 5.19, 5.85, mattressTop + .38);
  batch(frame, bed);
  return { bed, mattressTop };
}

function buildBedroomFurniture(THREE, room, parts, exhibit, obstacles, palette) {
  const { part, beam, batch, matte } = parts;
  const { gold, ivory, mauve, plum, blush, green, leaf, bloom, wine } = palette;
  const { toWorld } = spaceTransform(exhibit);

  function furnish(name, x, z, yaw, width, depth, height, decorate) {
    const furniture = addGroup(THREE, room, name, x, 0, z, yaw);
    const details = new THREE.Group();
    decorate(details);
    batch(details, furniture);
    addSolid(obstacles, ...toWorld(x, z), width, depth, height, yaw + exhibit.rotation);
  }

  furnish('Aurora dressing table and mirror', -6.19, -5.68, .47, 2.72, 1.34, 3.36, table => {
    part(table, 'box', plum, 0, .93, 0, 2.47, .43, 1.09);
    part(table, 'box', gold, 0, 1.16, 0, 2.63, .14, 1.20);
    part(table, 'box', ivory, 0, 1.26, 0, 2.55, .11, 1.14);
    for (const x of [-1.06, 1.06]) {
      for (const z of [-.40, .40]) part(table, 'drum', plum, x, .44, z, .105, .88, .105);
      part(table, 'box', mauve, x * .51, .91, .562, .97, .25, .060);
      part(table, 'gem', gold, x * .51, .91, .611, .079, .070, .049);
    }
    part(table, 'sphere', gold, 0, 2.28, -.36, .83, 1.02, .135);
    part(table, 'sphere', plum, 0, 2.27, -.26, .745, .91, .089);
    const silver = matte(0x879ac0, { emissive: 0x555f86, emissiveIntensity: .37 });
    part(table, 'sphere', silver, 0, 2.29, -.192, .681, .83, .076);
    part(table, 'sphere', ivory, -.23, 2.48, -.124, .078, .42, .010).rotation.z = -.47;
    part(table, 'gem', gold, 0, 3.32, -.32, .16, .195, .092);
    for (const [x, scale, material] of [[-.94, .90, blush], [.88, 1, mauve], [1.06, .71, wine]]) {
      part(table, 'sphere', material, x, 1.32 + .135 * scale, .14, .113 * scale, .14 * scale, .108 * scale);
      part(table, 'gem', gold, x, 1.32 + .30 * scale, .14, .069, .067, .062);
    }
  });

  furnish('Aurora velvet bench', -5.75, -3.87, .47, 1.92, .90, .67, bench => {
    part(bench, 'box', plum, 0, .46, 0, 1.83, .16, .78);
    part(bench, 'sphere', mauve, 0, .56, 0, .93, .102, .405);
    for (const side of [-1, 1]) {
      for (const z of [-.28, .28]) part(bench, 'drum', gold, side * .75, .21, z, .086, .42, .086);
      part(bench, 'gem', gold, side * .83, .54, .288, .08, .064, .065);
    }
  });

  furnish('Aurora bedside bouquet', 5.20, -7.88, -.25, 1.49, 1.28, 2.29, stand => {
    part(stand, 'drum', plum, 0, .11, 0, .58, .22, .52);
    part(stand, 'drum', mauve, 0, .57, 0, .38, .93, .38);
    part(stand, 'drum', gold, 0, 1.04, 0, .71, .12, .62);
    part(stand, 'drum', ivory, 0, 1.12, 0, .67, .073, .59);
    part(stand, 'sphere', plum, 0, 1.36, 0, .29, .22, .28);
    part(stand, 'drum', gold, 0, 1.55, 0, .17, .11, .17);
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI * 2 / 6;
      const x = Math.cos(angle) * .34, z = Math.sin(angle) * .29;
      const y = 2.02 + .14 * Math.cos(i * 1.9);
      beam(stand, green, [0, 1.55, 0], [x, y, z], .043);
      part(stand, 'sphere', leaf, x * .80, y - .19, z * .74, .072, .125, .045).rotation.z = angle - .6;
      part(stand, 'sphere', wine, x, y, z, .138, .132, .13);
      part(stand, 'sphere', bloom, x, y + .068, z + .035, .102, .080, .105);
    }
  });
}

export function buildAuroraRoom({ THREE, document, room, parts, exhibit, outline, obstacles, palette }) {
  const { part, batch } = parts;
  const details = new THREE.Group();
  const cloth = curtainCloth(THREE);
  buildCarpet(THREE, document, room, parts, exhibit, outline);
  buildWalls(THREE, document, details, parts, exhibit, outline, obstacles, palette, cloth);
  const ceilingY = exhibit.bounds.height - SURFACE_GAP.roof;
  const ceiling = part(room,
    new THREE.ShapeGeometry(new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, z)))),
    palette.plum, 0, ceilingY, 0, 1, 1, 1);
  ceiling.name = 'Aurora chamber ceiling';
  ceiling.rotation.x = Math.PI / 2;
  ceiling.layers.set(PLAYER_ONLY_LAYER);
  buildChandelier(THREE, details, parts, ceilingY, palette);
  batch(details, room);
  buildBedroomFurniture(THREE, room, parts, exhibit, obstacles, palette);
  return buildRoyalBed(THREE, room, parts, exhibit, obstacles, palette, cloth);
}
