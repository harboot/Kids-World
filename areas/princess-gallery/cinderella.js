import { cueSource, entryCue, galleryCues } from './interaction-audio.js';
import { addGroup, paintCanvasTexture, SURFACE_GAP } from '../../core/geometry.js';
import { EYE_HEIGHT } from '../../core/player.js';
import { seededRandom } from '../../core/random.js';
import { PLAYER_ONLY_LAYER } from '../../core/render-layers.js';
import { buildCinderellaCharacter } from './cinderella-character.js';
import { addRoundSolid, addSolid, spaceTransform } from './parts.js';

const treadCount = 24;
const rise = .18;
const stairWidth = 2.76;
const landingZ = -7;
const landingHeight = treadCount * rise;
const shoeTread = 12;
const approachRadius = 2.65;

function stairPoint(side, progress, offset = 0) {
  const spread = 6.65;
  const run = 9.45;
  const tangentX = side * spread * 6 * progress * (1 - progress);
  const length = Math.hypot(run, tangentX);
  return [
    side * (3.4 + spread * progress ** 2 * (3 - 2 * progress)) + run * offset / length,
    landingZ + run * (1 - progress) + tangentX * offset / length,
  ];
}

const onSurface = ([x, z], y) => [x, y, z];

function buildGrandStaircase(THREE, details, parts, palette, exhibit, obstacles) {
  const { part, beam, matte } = parts;
  const { toLocal, toWorld } = spaceTransform(exhibit);
  const { stone, gold, navy, pearl, crystal } = palette;
  const stair = addGroup(THREE, details, 'Cinderella grand staircase');
  const positions = [], colors = [];
  const treadColors = [0xe4d4bd, 0xebddca, 0x334c77, 0x415d8b, 0xc19756].map(color => new THREE.Color(color));

  function face(points, shade) {
    const color = treadColors[shade];
    for (const index of [0, 1, 2, 0, 2, 3]) {
      positions.push(...points[index]);
      colors.push(color.r, color.g, color.b);
    }
  }

  // Each convex tread and its collision use the same four corners.
  function solidSurface(points, height) {
    const corners = points.map(([x, z]) => toWorld(x, z));
    const xs = corners.map(([x]) => x);
    const zs = corners.map(([, z]) => z);
    const left = Math.min(...xs), right = Math.max(...xs);
    const front = Math.min(...zs), back = Math.max(...zs);
    obstacles.push({
      left, right, front, back, height,
      touches(x, z) {
        if (x < left || x > right || z < front || z > back) return false;
        const [lx, lz] = toLocal(x, z);
        return points.every(([ax, az], i) => {
          const [bx, bz] = points[(i + 1) % points.length];
          return (bx - ax) * (lz - az) - (bz - az) * (lx - ax) <= 1e-7;
        });
      },
    });
  }

  function rail(a, b) {
    const lift = ([x, y, z], height) => [x, y + height, z];
    beam(stair, gold, lift(a, 1.13), lift(b, 1.13), .12, .14);
    beam(stair, navy, lift(a, .14), lift(b, .14), .10, .12);
    const [ax, ay, az] = a, [bx, by, bz] = b;
    for (const t of [.34, .68]) {
      const x = ax + (bx - ax) * t;
      const y = ay + (by - ay) * t;
      const z = az + (bz - az) * t;
      part(stair, 'drum', pearl, x, y + .61, z, .065, .98, .065);
      part(stair, 'gem', gold, x, y + .67, z, .116, .23, .116);
    }
    const [wx, wz] = toWorld((ax + bx) / 2, (az + bz) / 2);
    const yaw = Math.atan2(az - bz, bx - ax) + exhibit.rotation;
    addSolid(obstacles, wx, wz, Math.hypot(bx - ax, bz - az) + .05, .15, Math.max(ay, by) + 1.18, yaw);
  }

  function post([x, y, z], fancy = false) {
    const r = fancy ? .20 : .115;
    part(stair, 'drum', navy, x, y + .09, z, r * 1.26, .18, r * 1.26);
    part(stair, 'drum', gold, x, y + .65, z, r, 1.05, r);
    part(stair, 'gem', crystal, x, y + 1.26, z, r * 1.12, .22, r * 1.12);
  }

  const stripes = [-stairWidth / 2, -.77, -.70, .70, .77, stairWidth / 2];
  for (const side of [-1, 1]) {
    const edge = (t, direction) => stairPoint(side, t, direction * stairWidth / 2);
    for (let i = 0; i < treadCount; i++) {
      const t0 = i / treadCount, t1 = (i + 1) / treadCount;
      const y = (i + 1) * rise;
      for (let band = 0; band < stripes.length - 1; band++) {
        const left = stripes[band], right = stripes[band + 1];
        const a = stairPoint(side, t0, left), b = stairPoint(side, t0, right);
        const c = stairPoint(side, t1, right), d = stairPoint(side, t1, left);
        const shade = band === 2 ? 2 + (i % 2) : band % 2 ? 4 : i % 2;
        face([a, b, c, d].map(point => onSurface(point, y)), shade);
        face([a, b, b, a].map((point, k) => onSurface(point, k < 2 ? y - rise : y)), shade);
      }
      const a = edge(t0, -1), b = edge(t0, 1), c = edge(t1, 1), d = edge(t1, -1);
      for (const [p, q] of [[b, c], [d, a]]) {
        face([onSurface(p, y), onSurface(p, -SURFACE_GAP.detail), onSurface(q, -SURFACE_GAP.detail), onSurface(q, y)], 0);
      }
      solidSurface([a, b, c, d], y);
    }

    for (const direction of [-1, 1]) {
      let previous = onSurface(edge(0, direction), rise);
      post(previous, true);
      for (let i = 2; i <= treadCount; i += 2) {
        const current = onSurface(edge(i / treadCount, direction), i * rise);
        rail(previous, current);
        post(current, i === treadCount);
        previous = current;
      }
    }
  }

  const steps = new THREE.BufferGeometry();
  steps.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  steps.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  steps.computeVertexNormals();
  part(stair, steps, matte(0xffffff, { vertexColors: true }), 0, 0, 0, 1, 1, 1);

  const outer = stairPoint(1, 1, stairWidth / 2)[0];
  const inner = stairPoint(1, 1, -stairWidth / 2)[0];
  const gallery = [[-outer, landingZ], [outer, landingZ], [10.05, -10.72], [-10.05, -10.72]];
  const landingShape = new THREE.Shape(gallery.map(([x, z]) => new THREE.Vector2(x, -z)));
  const landing = part(stair, new THREE.ExtrudeGeometry(landingShape, { depth: landingHeight, bevelEnabled: false }),
    stone, 0, 0, 0, 1, 1, 1);
  landing.rotation.x = -Math.PI / 2;
  solidSurface(gallery, landingHeight);

  for (const [a, b] of [[[-inner, landingZ], [inner, landingZ]], ...gallery.slice(1).map((point, i) => [point, gallery[(i + 2) % gallery.length]])]) {
    const count = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.24);
    const point = i => onSurface(a.map((v, axis) => v + (b[axis] - v) * i / count), landingHeight);
    for (let i = 0; i < count; i++) {
      rail(point(i), point(i + 1));
      if (i) post(point(i));
    }
    beam(stair, gold, onSurface(a, landingHeight - .26), onSurface(b, landingHeight - .26), .12, .16);
  }
  // Deep blue panels give the solid staircase base the look of a palace mezzanine.
  for (const x of [-7.0, -4.6, -2.2, 0, 2.2, 4.6, 7.0]) {
    part(stair, 'box', gold, x, 1.95, landingZ + .09, 1.64, 2.79, .22);
    part(stair, 'box', navy, x, 1.95, landingZ + .22, 1.44, 2.58, .06);
    part(stair, 'gem', pearl, x, 1.95, landingZ + .278, .25, .45, .052);
  }

  const progress = (shoeTread - .5) / treadCount;
  const [x, z] = stairPoint(1, progress, -.98);
  const [nx, nz] = stairPoint(1, progress, .02);
  return { x, z, y: shoeTread * rise, rotation: Math.atan2(z - nz, nx - x) };
}

function buildFloor(THREE, document, bay, parts, outline, { width, depth }) {
  const map = paintCanvasTexture(THREE, document, 1024, 1024, (ink, w, h) => {
    ink.scale(w / width, h / depth);
    ink.translate(width / 2, depth / 2);
    const random = seededRandom(1701);
    ink.fillStyle = '#eee4d4';
    ink.fillRect(-width / 2, -depth / 2, width, depth);
    for (let z = -depth / 2; z < depth / 2; z += 1.35) {
      for (let x = -width / 2; x < width / 2; x += 1.35) {
        ink.fillStyle = (Math.round((x + width / 2) / 1.35) + Math.round((z + depth / 2) / 1.35)) % 2 ?
          '#f6ead8' : '#e4d9ce';
        ink.fillRect(x + .024, z + .024, 1.302, 1.302);
        ink.strokeStyle = '#baa58e27';
        ink.lineWidth = .025;
        ink.beginPath();
        ink.moveTo(x + .15, z + 1.3);
        ink.bezierCurveTo(x + random() * 1.2, z + .6, x + .25, z + .56, x + 1.28, z + .08);
        ink.stroke();
      }
    }
    for (const [factor, width, color] of [[.94, .29, '#425783'], [.905, .076, '#be9b60']]) {
      ink.beginPath();
      for (const [x, z] of outline) ink.lineTo(x * factor, z * factor);
      ink.closePath();
      ink.lineWidth = width;
      ink.strokeStyle = color;
      ink.stroke();
    }

    ink.translate(0, 5.25);
    for (const [radius, color] of [[4.65, '#344973'], [4.45, '#be9b60'], [4.28, '#e8d6bc'], [3.89, '#526b97']]) {
      ink.fillStyle = color;
      ink.beginPath();
      ink.arc(0, 0, radius, 0, Math.PI * 2);
      ink.fill();
    }
    for (let i = 0; i < 12; i++) {
      ink.fillStyle = i % 2 ? '#a6c3da' : '#e8c888';
      ink.beginPath();
      ink.moveTo(0, -3.63);
      ink.quadraticCurveTo(.89, -1.69, 0, -.69);
      ink.quadraticCurveTo(-.89, -1.69, 0, -3.63);
      ink.fill();
      ink.rotate(Math.PI / 6);
    }
    ink.fillStyle = '#f9e6b7';
    ink.beginPath();
    ink.arc(0, 0, .56, 0, Math.PI * 2);
    ink.fill();
  });
  const geometry = new THREE.ShapeGeometry(new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z))));
  const position = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < position.count; i++) {
    uv.setXY(i, position.getX(i) / width + .5, position.getY(i) / depth + .5);
  }
  const floor = parts.part(bay, geometry, parts.matte(map ? 0xffffff : 0xeadac1, { map }), 0, 0, 0, 1, 1, 1);
  floor.name = 'Cinderella ballroom marble floor';
  floor.rotation.x = -Math.PI / 2;
}

function buildPalace(THREE, document, details, bay, parts, palette, outline, height) {
  const { part, beam, matte } = parts;
  const { stone, gold, navy, pearl, crystal, glow } = palette;
  const arch = (width, length) => {
    const shape = new THREE.Shape();
    shape.moveTo(-width, 0);
    shape.lineTo(width, 0);
    shape.lineTo(width, length);
    shape.quadraticCurveTo(width, length + width, 0, length + width);
    shape.quadraticCurveTo(-width, length + width, -width, length);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  };
  const windowFrame = arch(1, 3.22);
  const windowGlass = arch(.84, 3.09);
  const skyMap = paintCanvasTexture(THREE, document, 256, 512, (ink, w, h) => {
    const sky = ink.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#172d61');
    sky.addColorStop(.65, '#668cb4');
    sky.addColorStop(1, '#d5bdd3');
    ink.fillStyle = sky;
    ink.fillRect(0, 0, w, h);
    ink.fillStyle = '#f8efd4';
    ink.beginPath();
    ink.arc(w * .66, h * .28, w * .15, 0, Math.PI * 2);
    ink.fill();
    const random = seededRandom(1212);
    for (let i = 0; i < 35; i++) ink.fillRect(random() * w, random() * h * .7, i % 4 ? 2 : 4, i % 4 ? 2 : 4);
    for (const [color, y] of [['#405986', .78], ['#273f70', .89]]) {
      ink.fillStyle = color;
      ink.beginPath();
      ink.moveTo(0, h);
      for (let x = 0; x <= w; x += 16) ink.lineTo(x, h * y + Math.sin(x * .041) * 18);
      ink.lineTo(w, h);
      ink.fill();
    }
  });
  const uv = windowGlass.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 1.68 + .5, uv.getY(i) / 3.93);
  const night = new THREE.MeshBasicMaterial({ color: skyMap ? 0xffffff : 0x506d9b, map: skyMap, toneMapped: false });

  function window(x, z, yaw, base) {
    const model = addGroup(THREE, details, 'Moonlit palace window', x, base, z, yaw);
    part(model, windowFrame, gold, 0, 0, 0, 1, 1, 1);
    part(model, windowGlass, night, 0, .11, SURFACE_GAP.trim, 1, 1, 1);
    part(model, 'box', gold, 0, -.05, .13, 2.18, .20, .33);
    part(model, 'box', pearl, 0, 1.96, .06, .064, 3.68, .066);
    for (const y of [.98, 2.05, 3.0]) part(model, 'box', pearl, 0, y, .07, 1.68, .071, .07);
  }

  function pilaster(x, z, yaw) {
    const model = addGroup(THREE, details, 'Ballroom pilaster', x, 0, z, yaw);
    part(model, 'box', navy, 0, .39, .09, .83, .78, .24);
    part(model, 'box', pearl, 0, 6.58, .063, .48, 11.63, .18);
    part(model, 'box', gold, 0, .91, .11, .74, .21, .31);
    part(model, 'box', gold, 0, 12.18, .11, .78, .28, .33);
    part(model, 'gem', glow, 0, 3.88, .27, .24, .41, .22);
  }

  for (let i = 1; i < outline.length; i++) {
    const [ax, az] = outline[i], [bx, bz] = outline[(i + 1) % outline.length];
    const yaw = Math.atan2(az - bz, bx - ax) + Math.PI;
    const length = Math.hypot(bx - ax, bz - az);
    const nx = Math.sin(yaw), nz = Math.cos(yaw);
    const wallPoint = (t, offset) => [ax + (bx - ax) * t + nx * offset, az + (bz - az) * t + nz * offset];
    const [x, z] = wallPoint(.5, .35);
    for (const [y, thickness, material, offset] of [[2.78, .17, navy, 0], [11.63, .18, gold, .05],
      [12.14, .30, stone, .02], [16.6, .21, navy, .02], [16.85, .12, gold, .09]]) {
      part(details, 'box', material, x + nx * offset, y, z + nz * offset,
        length - .28, thickness, .15).rotation.y = yaw;
    }
    if (i === 4) {
      for (const t of [.15, .85]) window(...wallPoint(t, .44), yaw, 5.85);
      for (const t of [.035, .30, .70, .965]) pilaster(...wallPoint(t, .40), yaw);
    } else if (length > 7) {
      for (const t of [.24, .66]) window(...wallPoint(t, .44), yaw, 5.65);
      for (const t of [.075, .45, .91]) pilaster(...wallPoint(t, .40), yaw);
    } else pilaster(...wallPoint(.52, .40), yaw);
  }

  const roof = part(bay, new THREE.ShapeGeometry(new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, z)))),
    matte(0x36416b), 0, height - 2.1, 0, 1, 1, 1);
  roof.rotation.x = Math.PI / 2;
  roof.layers.set(PLAYER_ONLY_LAYER);
  const ring = new THREE.TorusGeometry(1, .027, 8, 48);
  for (const [x, z, y, scale] of [[0, 2.0, 8.9, 1.43], [-7.8, -.85, 9.4, .8], [7.8, -.85, 9.4, .8]]) {
    const model = addGroup(THREE, details, 'Cinderella crystal chandelier', x, y, z);
    model.scale.setScalar(scale);
    const overhead = mesh => mesh.layers.set(PLAYER_ONLY_LAYER);
    overhead(beam(details, gold, [x, y + 1.65 * scale, z], [x, height - 2.12, z], .095));
    for (const [level, radius] of [[0, 1.77], [.58, 1.18], [1.13, .61]]) {
      const trim = part(model, ring, gold, 0, level, 0, radius, radius, radius);
      trim.rotation.x = Math.PI / 2;
      overhead(trim);
    }
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6;
      const dx = Math.cos(angle), dz = Math.sin(angle);
      const bulb = [dx * 1.77, .22, dz * 1.77];
      overhead(beam(model, gold, [dx * .52, 1.34, dz * .52], bulb, .055));
      overhead(part(model, 'drum', pearl, ...bulb, .103, .29, .103));
      overhead(part(model, 'gem', glow, bulb[0], .44, bulb[2], .112, .22, .112));
      overhead(part(model, 'gem', crystal, bulb[0], -.32, bulb[2], .125, .39, .125));
      overhead(part(model, 'gem', crystal, dx * 1.16, .36, dz * 1.16, .115, .24, .115));
    }
    overhead(part(model, 'gem', crystal, 0, -.49, 0, .31, .76, .31));
  }
  for (const x of [-9.35, 9.35]) {
    const bench = addGroup(THREE, details, 'Ballroom velvet settee', x, 0, 6.8, x < 0 ? Math.PI / 2 : -Math.PI / 2);
    part(bench, 'box', gold, 0, .48, 0, 3.25, .18, .86);
    part(bench, 'box', navy, 0, .60, 0, 3.14, .16, .82);
    part(bench, 'box', navy, 0, .97, -.34, 3.12, .68, .22);
    for (const side of [-1, 1]) {
      part(bench, 'box', gold, side * 1.42, .25, 0, .18, .50, .71);
      part(bench, 'drum', gold, side * 1.56, .78, 0, .09, .36, .09);
      part(bench, 'gem', pearl, side * 1.56, .94, 0, .12, .14, .12);
    }
  }
}

function buildClock(THREE, document, details, parts, palette) {
  const { part, beam } = parts;
  const { navy, gold, pearl } = palette;
  const clock = addGroup(THREE, details, 'Cinderella giant midnight clock', 0, 9.54, -10.77);
  const dialRadius = 2.58;
  const face = .39;
  const circular = new THREE.CylinderGeometry(1, 1, 1, 56);
  const molding = new THREE.TorusGeometry(1, .031, 8, 64);
  const dialMap = paintCanvasTexture(THREE, document, 640, 640, (ink, w, h) => {
    const center = w / 2;
    ink.translate(center, h / 2);
    const gradient = ink.createRadialGradient(-48, -75, 42, 0, 0, center);
    gradient.addColorStop(0, '#fff6d9');
    gradient.addColorStop(1, '#dbba83');
    ink.fillStyle = gradient;
    ink.fillRect(-center, -center, w, h);
    ink.strokeStyle = '#ac7b4d';
    ink.lineWidth = 3;
    for (const r of [.71, .93]) {
      ink.beginPath();
      ink.arc(0, 0, center * r, 0, Math.PI * 2);
      ink.stroke();
    }
    ink.strokeStyle = '#775039';
    for (let i = 0; i < 60; i++) {
      ink.lineWidth = i % 5 ? 2 : 4;
      ink.beginPath();
      ink.moveTo(0, -center * (i % 5 ? .89 : .86));
      ink.lineTo(0, -center * .93);
      ink.stroke();
      ink.rotate(Math.PI / 30);
    }
    ink.textAlign = 'center';
    ink.textBaseline = 'middle';
    ink.font = 'bold 41px Georgia, serif';
    ink.fillStyle = '#272d4d';
    for (const [index, numeral] of ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].entries()) {
      const angle = index * Math.PI / 6;
      ink.fillText(numeral, Math.sin(angle) * center * .79, -Math.cos(angle) * center * .79);
    }
  });
  part(clock, circular, navy, 0, 0, .04, 2.88, .65, 2.88).rotation.x = Math.PI / 2;
  part(clock, circular, gold, 0, 0, .36, 2.74, .20, 2.74).rotation.x = Math.PI / 2;
  part(clock, new THREE.CircleGeometry(dialRadius, 56),
    new THREE.MeshBasicMaterial({ color: dialMap ? 0xffffff : 0xecd4a6, map: dialMap, toneMapped: false }),
    0, 0, .47 + SURFACE_GAP.detail, 1, 1, 1);
  part(clock, molding, gold, 0, 0, .51, 2.65, 2.65, 1.45);
  part(clock, molding, pearl, 0, 0, .43, 2.78, 2.78, 1.4);
  for (const [angle, length, width, z] of [[-.18, 1.85, .105, face + .19], [-.065, 1.21, .16, face + .27]]) {
    const tip = [Math.sin(angle) * length, Math.cos(angle) * length, z];
    beam(clock, navy, [0, -.28, z], tip, width, .11);
    part(clock, 'gem', navy, ...tip, width * 1.33, .23, .07).rotation.z = -angle;
  }
  part(clock, circular, gold, 0, 0, .74, .17, .16, .17).rotation.x = Math.PI / 2;
  for (const side of [-1, 1]) {
    beam(clock, gold, [side * .65, 2.90, .18], [side * 1.3, 3.21, .20], .12);
    part(clock, 'gem', gold, side * .7, 3.15, .22, .31, .31, .15);
  }
  part(clock, 'gem', pearl, 0, 3.34, .23, .33, .51, .23);
}

function buildGlassSlipper(THREE, parent, parts, palette, site) {
  const { part } = parts;
  const { navy, gold, crystal } = palette;
  const display = addGroup(THREE, parent, 'Cinderella slipper display', site.x, site.y, site.z, site.rotation);
  display.scale.setScalar(.78);
  const cushion = part(display, new THREE.SphereGeometry(1, 20, 10), navy, 0, .073, 0, .72, .093, .22);
  cushion.name = 'Slipper cushion';
  const seam = part(display, new THREE.TorusGeometry(1, .035, 6, 32), gold, 0, .064, 0, .687, .211, .18);
  seam.rotation.x = Math.PI / 2;
  const slipper = addGroup(THREE, display, 'Cinderella glass slipper', 0, .17, 0, -.08);
  const glass = new THREE.MeshPhongMaterial({
    color: 0x85d9fc, emissive: 0x2d86d3, emissiveIntensity: .18, specular: 0xffffff, shininess: 118,
    transparent: true, opacity: .72, depthWrite: false, side: THREE.DoubleSide,
  });
  const heel = new THREE.MeshPhongMaterial({
    color: 0x9bdcf6, emissive: 0x347dba, emissiveIntensity: .22, specular: 0xffffff, shininess: 90,
  });

  // Cross sections follow the high heel, arch and pointed toe.
  const profile = [
    // x, sole, rim, half-width
    [-.65, .46, .68, .055], [-.59, .44, .75, .155], [-.46, .40, .73, .202],
    [-.28, .31, .55, .188], [-.08, .17, .40, .158], [.14, .08, .29, .201],
    [.35, .055, .25, .201], [.53, .064, .22, .142], [.66, .086, .155, .037],
  ];
  const positions = [];
  function quad(a, b, c, d) {
    for (const vertex of [a, b, c, a, c, d]) positions.push(...vertex);
  }
  for (let i = 0; i < profile.length - 1; i++) {
    const [x, bottom, top, span] = profile[i];
    const [nx, lower, upper, width] = profile[i + 1];
    for (const side of [-1, 1]) {
      const a = [x, bottom, side * span * .72], b = [nx, lower, side * width * .72];
      const c = [nx, upper, side * width], d = [x, top, side * span];
      const e = [x, top - .02, side * span * .82], f = [nx, upper - .02, side * width * .82];
      quad(a, b, c, d);
      quad(d, c, f, e);
      quad(e, f, [nx, lower + .04, side * width * .60], [x, bottom + .04, side * span * .60]);
    }
    quad([x, bottom, -span * .72], [nx, lower, -width * .72],
      [nx, lower, width * .72], [x, bottom, span * .72]);
    // The toe is covered. The heel opening exposes the blue insole.
    const dome = i >= 4 ? .074 : 0;
    const nextDome = i >= 4 && i < profile.length - 2 ? .074 : 0;
    const backLevel = dome ? top : bottom + .042;
    const frontLevel = i >= 4 ? upper : lower + .042;
    if (i === 4) quad([x, bottom + .042, -span * .62], [x, bottom + .042, span * .62],
      [x, top, span * .84], [x, top, -span * .84]);
    for (const side of [-1, 1]) {
      quad([x, backLevel + dome, 0], [nx, frontLevel + nextDome, 0],
        [nx, frontLevel, side * width * .84], [x, backLevel, side * span * .84]);
    }
  }
  for (const [x, bottom, top, span] of [profile[0], profile.at(-1)]) {
    quad([x, bottom, -span * .72], [x, bottom, span * .72], [x, top, span], [x, top, -span]);
  }
  const shell = new THREE.BufferGeometry();
  shell.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  shell.computeVertexNormals();
  part(slipper, shell, glass, 0, 0, 0, 1, 1, 1).renderOrder = 1;
  const heelStem = part(slipper, new THREE.CylinderGeometry(.106, .046, .435, 8), heel,
    -.47, .224, -.008, 1, 1, .93);
  heelStem.rotation.z = .15;
  const jewel = part(slipper, 'gem', crystal, .265, .374, 0, .11, .087, .095);
  jewel.rotation.y = Math.PI / 4;

  const highlights = new THREE.LineBasicMaterial({ color: 0xc7f4ff, transparent: true, opacity: .85, depthWrite: false });
  for (const side of [-1, 1]) {
    const edge = new THREE.BufferGeometry().setFromPoints(profile.map(([x, , y, span]) =>
      new THREE.Vector3(x, y + SURFACE_GAP.detail, side * span)));
    const line = new THREE.Line(edge, highlights);
    line.renderOrder = 2;
    slipper.add(line);
  }

  const sparks = addGroup(THREE, display, 'Cinderella slipper sparkles');
  const star = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const radius = i % 2 ? .26 : 1;
    if (i) star.lineTo(Math.sin(angle) * radius, Math.cos(angle) * radius);
    else star.moveTo(0, 1);
  }
  star.closePath();
  const starShape = new THREE.ShapeGeometry(star);
  const starMaterial = new THREE.MeshBasicMaterial({ color: 0xffefb7, side: THREE.DoubleSide, toneMapped: false });
  const stars = Array.from({ length: 8 }, () => {
    const glint = addGroup(THREE, sparks, 'Glass glint');
    part(glint, starShape, starMaterial, 0, 0, 0, 1, 1, 1);
    part(glint, starShape, starMaterial, 0, 0, 0, 1, 1, 1).rotation.y = Math.PI / 2;
    return glint;
  });

  let hover = 0;
  let time = 0;
  function pose() {
    slipper.position.y = .17 + hover * (.84 + .105 * Math.sin(time * 3));
    slipper.rotation.y = -.08 + hover * (.42 * Math.sin(time * 1.7));
    slipper.rotation.z = hover * .09 * Math.sin(time * 2.4);
    glass.emissiveIntensity = .18 + hover * .72;
    sparks.visible = hover > .035;
    if (!sparks.visible) return;
    for (const [index, glint] of stars.entries()) {
      const angle = index * 2.399 + time * (index % 2 ? .85 : -.61);
      const pulse = .35 + .65 * (.5 + .5 * Math.sin(time * 7.3 + index * 2.6)) ** 2;
      glint.position.set(Math.cos(angle) * (.68 + index * .055),
        slipper.position.y + .25 + Math.sin(angle * 1.72) * .49, Math.sin(angle) * (.38 + index * .036));
      glint.rotation.y = angle;
      glint.scale.setScalar(hover * pulse * (index % 3 ? .137 : .206));
    }
  }
  function reset() {
    hover = time = 0;
    pose();
  }
  reset();
  return {
    reset,
    update(dt, nearby, reducedMotion) {
      const target = Number(nearby);
      if (!target && !hover) return;
      hover = reducedMotion ? target : THREE.MathUtils.damp(hover, target, 7.5, dt);
      if (Math.abs(hover - target) < .001) hover = target;
      time = reducedMotion || !hover ? 0 : time + dt;
      pose();
    },
  };
}

export function buildCinderella({ THREE, document, bay, exhibit, parts, obstacles, outline, playCue = () => {} }) {
  const { matte, batch } = parts;
  const { toWorld, toLocal } = spaceTransform(exhibit);
  const palette = {
    stone: matte(0xd0b89b),
    gold: matte(0xb98a43),
    navy: matte(0x354575),
    pearl: matte(0xf0ddbd),
    crystal: matte(0xa0d7f3, { emissive: 0x5b96bd, emissiveIntensity: .35 }),
    glow: matte(0xffdb93, { emissive: 0xffb954, emissiveIntensity: .80 }),
  };
  const ballroom = addGroup(THREE, bay, 'Cinderella palace ballroom');
  const details = new THREE.Group();
  buildFloor(THREE, document, ballroom, parts, outline, exhibit.bounds);
  buildPalace(THREE, document, details, ballroom, parts, palette, outline, exhibit.bounds.height);
  for (const x of [-9.35, 9.35]) addSolid(obstacles, ...toWorld(x, 6.8), 1, 3.30, 1.39, exhibit.rotation);
  const site = buildGrandStaircase(THREE, details, parts, palette, exhibit, obstacles);
  buildClock(THREE, document, details, parts, palette);
  batch(details, ballroom);
  const character = buildCinderellaCharacter(THREE, ballroom, parts, exhibit, obstacles, landingHeight);
  addRoundSolid(obstacles, ...toWorld(site.x, site.z), .39, site.y + 1.36);
  const slipper = buildGlassSlipper(THREE, ballroom, parts, palette, site);
  const audio = entryCue(playCue,galleryCues.cinderella,cueSource(...toWorld(site.x,site.z),EYE_HEIGHT+site.y));
  const local = [0, 0];
  return {
    reset() {
      audio.reset();
      slipper.reset();
      character.reset();
    },
    update(dt, player, _grounded, reducedMotion) {
      const [x, z] = toLocal(player.x, player.z, local);
      const feet = player.y - EYE_HEIGHT;
      character.update(dt, x, z, player.y, feet, reducedMotion);
      const nearby = (x - site.x) ** 2 + (z - site.z) ** 2 <= approachRadius ** 2 &&
        Math.abs(feet - site.y) < 1.24;
      audio.update(nearby,dt);
      slipper.update(dt, nearby, reducedMotion);
      return nearby;
    },
  };
}
