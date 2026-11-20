import { addGroup, paintCanvasTexture, SURFACE_GAP } from '../../core/geometry.js';
import { seededRandom } from '../../core/random.js';
import { exhibitOutline, exhibits } from './exhibits.js';
import { addSolid, spaceTransform } from './parts.js';

const skyEdge = '#8fa5b9';
const tapestries = [
  ['Garden dusk', '#91a8ae', '#e3b59e', ['#9a93ae', '#738ba4', '#4c737d', '#3f665f']],
  ['Coastal sunset', '#8b9bc0', '#f1c2a6', ['#a694ae', '#778eab', '#527b93', '#366978']],
  ['Island coast', '#849bb9', '#e7b4a2', ['#a29bb8', '#688aaf', '#4c7f97', '#396a7c']],
  ['Alpine dusk', '#7b8cb3', '#ddafd0', ['#aa98bd', '#8b92b1', '#626f99', '#4b6085']],
  ['Alpine skyline', '#7d91b8', '#ddb9d4', ['#a690b5', '#858ab1', '#616f9a', '#4e6081']],
  ['Woodland twilight', '#829eac', '#c9b7ad', ['#8e9eae', '#728d94', '#50767a', '#395f61']],
  ['Woodland horizon', '#7f9bab', '#d7cbb7', ['#a1a5af', '#7b929c', '#557b78', '#365d58']],
  ['Garden ridge', '#8ea4b1', '#dec8ac', ['#9ba2b0', '#748d9d', '#507581', '#3c645f']],
];

export function canopyMaterial(THREE, document, width, depth, geometry) {
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / width + .5, uv.getY(i) / depth + .5);
  const sky = paintCanvasTexture(THREE, document, 1024, 1024, (ink, w, h) => {
    const gradient = ink.createRadialGradient(w * .52, h * .45, 40, w * .5, h * .5, w * .74);
    gradient.addColorStop(0, '#667da9');
    gradient.addColorStop(.45, '#8199b0');
    gradient.addColorStop(.64, skyEdge);
    gradient.addColorStop(1, skyEdge);
    ink.fillStyle = gradient;
    ink.fillRect(0, 0, w, h);
    const random = seededRandom(4941);
    for (let i = 0; i < 355; i++) {
      const x = random() * w, y = random() * h;
      ink.fillStyle = i % 5 ? '#e4eddf95' : '#fff4c7e3';
      const radius = i % 5 ? .48 + random() * .65 : .84 + random() * .96;
      ink.beginPath();
      ink.arc(x, y, radius, 0, Math.PI * 2);
      ink.fill();
    }
  });
  return new THREE.MeshBasicMaterial({ color: sky ? 0xffffff : 0x8c9db5, map: sky, side: THREE.DoubleSide, toneMapped: false });
}

export function buildScenicBackdrops({ THREE, document, parent, parts, outline, ceiling }) {
  const stage = addGroup(THREE, parent, 'Scenic horizons');
  for (const [index, [name, top, horizon, shades]] of tapestries.entries()) {
    const [ax, az] = outline[index], [bx, bz] = outline[(index + 1) % outline.length];
    const dx = bx - ax, dz = bz - az;
    const length = Math.hypot(dx, dz);
    const yaw = Math.atan2(-dz, dx) + Math.PI;
    const map = paintCanvasTexture(THREE, document, length < 20 ? 512 : 1024, 384, (ink, width, height) => {
      const w = 1536, h = 512;
      ink.scale(width / w, height / h);
      const random = seededRandom(2200 + index * 36);
      const sky = ink.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, skyEdge);
      sky.addColorStop(.14, top);
      sky.addColorStop(.56, horizon);
      sky.addColorStop(1, shades[0]);
      ink.fillStyle = sky;
      ink.fillRect(0, 0, w, h);

      if (index % 2 === 0) {
        const x = w * (.29 + random() * .4), y = h * (.23 + random() * .08);
        const halo = ink.createRadialGradient(x, y, 8, x, y, 119);
        halo.addColorStop(0, '#fff1d8d9');
        halo.addColorStop(1, '#fff1d800');
        ink.fillStyle = halo;
        ink.fillRect(x - 122, y - 122, 244, 244);
        ink.fillStyle = '#fff1d9df';
        ink.beginPath();
        ink.ellipse(x, y, 14, 16, 0, 0, Math.PI * 2);
        ink.fill();
      }
      for (let i = 0; i < 50; i++) {
        ink.fillStyle = i % 7 ? '#fff6e493' : '#fff1ced6';
        ink.beginPath();
        ink.arc(random() * w, random() * h * .46, .7 + random() * 1.3, 0, Math.PI * 2);
        ink.fill();
      }

      const alpine = index === 3 || index === 4;
      const sea = index === 1 || index === 2;
      for (const [layer, color] of shades.entries()) {
        const baseline = h * (.55 + layer * .128);
        const span = alpine ? 84 + layer * 17 : 146 - layer * 12;
        const peaks = [[-span, baseline]];
        for (let x = -span * .5; x < w + span; x += span) {
          const peak = baseline - (alpine ? 114 : 70) * (.45 + random() * .65) * (1 - layer * .12);
          peaks.push([x, peak], [x + span * .57, baseline - random() * 27]);
        }
        ink.fillStyle = color;
        ink.beginPath();
        ink.moveTo(-span, h);
        for (const [x, y] of peaks) ink.lineTo(x, y);
        ink.lineTo(w + span, h);
        ink.fill();
        if (alpine && layer < 2) for (let i = 1; i + 1 < peaks.length; i += 2) {
          const [x, y] = peaks[i];
          const [lx, ly] = peaks[i - 1], [rx, ry] = peaks[i + 1];
          ink.fillStyle = layer ? '#cbd9e164' : '#e5edf1a6';
          ink.beginPath();
          ink.moveTo(x, y);
          ink.lineTo(x + (rx - x) * .37, y + (ry - y) * .37);
          ink.lineTo(x + 4, y + 18);
          ink.lineTo(x - 6, y + 25);
          ink.lineTo(x + (lx - x) * .39, y + (ly - y) * .39);
          ink.fill();
        }
      }
      if (sea) {
        for (let i = 0; i < 42; i++) {
          const y = h * (.77 + random() * .18), x = random() * w;
          ink.strokeStyle = i % 3 ? '#c5e5db25' : '#f6dfa850';
          ink.lineWidth = 1 + 2 * random();
          ink.beginPath();
          ink.moveTo(x, y);
          ink.quadraticCurveTo(x + 13, y - 1.6, x + random() * 76, y);
          ink.stroke();
        }
      } else {
        for (const [level, [shade, base]] of [['#52817d', .95], ['#355c5d', 1.02]].entries()) {
          ink.fillStyle = shade;
          for (let i = 0; i < 44; i++) {
            const x = (i + random()) * w / 44;
            const y = h * base, height = 45 + random() * (level ? 111 : 93);
            const spread = 9 + random() * 21;
            ink.fillRect(x - 2, y - height * .5, 4, h - y + height * .5);
            ink.beginPath();
            ink.moveTo(x, y - height);
            for (let j = 1; j <= 3; j++) {
              const branch = y - height + j * height / 3;
              ink.lineTo(x - spread * j / 3, branch);
              ink.lineTo(x - spread * j / 6, branch - 1.5);
            }
            for (let j = 3; j >= 1; j--) {
              const branch = y - height + j * height / 3;
              ink.lineTo(x + spread * j / 3, branch);
              ink.lineTo(x + spread * (j - 1) / 6, branch - height / 6);
            }
            ink.fill();
          }
        }
      }
    });
    const offset = .5 + SURFACE_GAP.trim;
    const panel = parts.part(stage, new THREE.PlaneGeometry(length + .22, ceiling + .03),
      new THREE.MeshBasicMaterial({ color: map ? 0xffffff : 0x748d93, map, toneMapped: false }),
      (ax + bx) / 2 + Math.sin(yaw) * offset, ceiling / 2, (az + bz) / 2 + Math.cos(yaw) * offset, 1, 1, 1);
    panel.name = name;
    panel.rotation.y = yaw;
  }
}

const joins = [
  ['rapunzel', 1, 'snow-white', 0, 'grove'],
  ['snow-white', 1, 'aurora', 0, 'grove'],
  ['aurora', 1, 'belle', 0, 'grove'],
  ['belle', 1, 'cinderella', 0, 'ridge'],
  ['cinderella', 1, 'jasmine', 0, 'ridge'],
  ['jasmine', 1, 'mulan', 0, 'ridge'],
  ['mulan', 1, 'ariel', 0, 'coast'],
  ['ariel', 1, 'moana', 0, 'coast'],
  ['moana', 1, 'tiana', 0, 'coast'],
  ['tiana', 4, null, [13.6, 60], 'coast'],
  [null, [-30.7, 60], 'rapunzel', 0, 'grove'],
];

const scenicRoute = [joins.at(-1), ...joins.slice(0, -1)];
const outlines = Object.fromEntries(exhibits.map(exhibit => {
  const { toWorld } = spaceTransform(exhibit);
  return [exhibit.id, exhibitOutline(exhibit).map(point => toWorld(...point))];
}));

export function paintScenicGround(ink, halfWidth, halfDepth) {
  const edge = [scenicRoute[0][1]];
  for (const [index, [, , id, entry]] of scenicRoute.entries()) {
    if (id === null) {
      edge.push(entry);
      break;
    }
    const outline = outlines[id];
    const exit = scenicRoute[index + 1][1];
    for (let i = entry; ; i = (i + outline.length - 1) % outline.length) {
      edge.push(outline[i]);
      if (i === exit) break;
    }
  }
  ink.save();
  ink.beginPath();
  ink.rect(-halfWidth, -halfDepth, halfWidth * 2, halfDepth * 2);
  ink.moveTo(...edge[0]);
  for (const point of edge.slice(1)) ink.lineTo(...point);
  ink.closePath();
  ink.clip('evenodd');
  const terrain = ink.createLinearGradient(-halfWidth, 0, halfWidth, 0);
  terrain.addColorStop(0, '#6f8978');
  terrain.addColorStop(.27, '#7c8d84');
  terrain.addColorStop(.52, '#979aa3');
  terrain.addColorStop(1, '#72949a');
  ink.fillStyle = terrain;
  ink.fillRect(-halfWidth, -halfDepth, halfWidth * 2, halfDepth * 2);
  const random = seededRandom(5419);
  for (let i = 0; i < 477; i++) {
    const x = (random() * 2 - 1) * halfWidth, z = (random() * 2 - 1) * halfDepth;
    const radius = .22 + random() * 2.4;
    ink.fillStyle = i % 3 ? '#4e69642f' : '#dfdac637';
    ink.beginPath();
    ink.ellipse(x, z, radius, radius * .47, random() * Math.PI, 0, Math.PI * 2);
    ink.fill();
  }
  ink.restore();
}

function ridgeGeometry(THREE, length, height, tint, random) {
  const positions = [], shades = [];
  const count = Math.max(2, Math.ceil(length / 2.1));
  const crossSections = Array.from({ length: count + 1 }, (_, index) => {
    const x = -length / 2 + index * length / count;
    const peak = height * (.73 + random() * .30);
    const shift = (random() - .5) * .45;
    return [[x, -.055, .81], [x, peak * .52, .69 + shift], [x, peak * .88, -.11 + shift],
      [x, peak, -1.21 + shift], [x, peak * .68, -2.23 + shift], [x, -.055, -2.6]];
  });
  function triangle(a, b, c, color) {
    const tone = color.clone().multiplyScalar(.84 + random() * .21);
    for (const point of [a, b, c]) {
      positions.push(...point);
      shades.push(tone.r, tone.g, tone.b);
    }
  }
  for (let i = 0; i < count; i++) {
    const a = crossSections[i], b = crossSections[i + 1];
    for (let j = 0; j < a.length - 1; j++) {
      const color = tint[j];
      triangle(a[j], b[j], b[j + 1], color);
      triangle(a[j], b[j + 1], a[j + 1], color);
    }
  }
  for (const section of [crossSections[0], crossSections.at(-1)]) {
    for (let j = 1; j < section.length - 1; j++) triangle(section[0], section[j], section[j + 1], tint[0]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(shades, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function buildScenicEdges({ THREE, parent, parts, obstacles }) {
  const group = addGroup(THREE, parent, 'Enchanted landscape borders');
  const { part, batch, matte } = parts;
  const rock = matte(0xffffff, { vertexColors: true, side: THREE.DoubleSide });
  const bark = matte(0x654b5c);
  const trees = [0x395f62, 0x5a8075, 0x6f8c79].map(color => matte(color));
  const hues = {
    grove: [0x566761, 0x688474, 0x83966e, 0x637b67, 0x4f655f],
    ridge: [0x676e88, 0x8389a1, 0xc6ccd3, 0x989eb5, 0x676e8b],
    coast: [0x5c7580, 0x6f8f98, 0xa0b1a5, 0x79949a, 0x627b88],
  };
  const highlights = Object.fromEntries(Object.entries(hues).map(([theme, colors]) => [theme, matte(colors[2])]));
  const palette = Object.fromEntries(Object.entries(hues).map(([theme, colors]) =>
    [theme, colors.map(color => new THREE.Color(color))]));

  function pine(model, x, y, z, size, turn) {
    part(model, 'drum', bark, x, y + size * .25, z, size * .039, size * .5, size * .039);
    for (let i = 0; i < 4; i++) {
      const radius = size * (.242 - i * .036);
      part(model, 'cone', trees[i % 3], x, y + size * (.35 + i * .168), z, radius, size * .43, radius * .91)
        .rotation.y = turn + i * .29;
    }
  }

  for (const [index, [from, fromIndex, to, toIndex, theme]] of joins.entries()) {
    const [ax, az] = from ? outlines[from][fromIndex] : fromIndex;
    const [bx, bz] = to ? outlines[to][toIndex] : toIndex;
    const yaw = Math.atan2(az - bz, bx - ax);
    const x = (ax + bx) / 2, z = (az + bz) / 2;
    const length = Math.hypot(bx - ax, bz - az);
    const height = theme === 'ridge' ? 6.65 : theme === 'grove' ? 4.15 : 5.10;
    const random = seededRandom(511 + index * 19);
    const model = new THREE.Group();
    const border = addGroup(THREE, group, (from ?? 'lobby') + ' to ' + (to ?? 'lobby') + ' scenic barrier', x, 0, z, yaw);
    part(model, ridgeGeometry(THREE, length + .20, height, palette[theme], random), rock, 0, 0, 0, 1, 1, 1);

    const saplings = Math.max(2, Math.round(length / 2.4));
    for (let i = 0; i < saplings; i++) {
      const px = length * ((i + .5) / saplings - .5);
      if (theme === 'grove' || i % 3 === 1) {
        const size = theme === 'grove' ? 3.5 + random() * 2.75 : 2.2 + random() * 1.6;
        pine(model, px, height * .72, -1.26 - random() * .68, size, i * .47);
      } else {
        const surface = part(model, 'ball', highlights[theme], px, height * .79, -1.3,
          1.10, 1.30 + random(), .96);
        surface.rotation.set(.29, i * .59, i % 2 ? -.33 : .24);
      }
    }
    batch(model, border);
    // Continue the room partitions across the gaps at ground level.
    addSolid(obstacles, x, z, length + .24, 1.57, height * .70, yaw);
    const rearOffset = -1.65;
    addSolid(obstacles, x + Math.sin(yaw) * rearOffset, z + Math.cos(yaw) * rearOffset,
      length + .11, 1.72, height * .66, yaw);
  }

  // Trees and rock silhouettes add depth behind the closed exhibit ring.
  for (const [index, [x, z, theme, span]] of [[-59, 42, 'grove', 6], [-60, -14, 'grove', 6], [-63, -45, 'grove', 5],
    [-44, -53.5, 'ridge', 6], [24.5, -55.8, 'ridge', 4], [56, -49.5, 'ridge', 6],
    [65.25, -24.9, 'coast', 3], [64, 26.4, 'coast', 5], [56.6, 55.5, 'coast', 4], [34.5, 55.9, 'grove', 4]].entries()) {
    const vista = addGroup(THREE, group, 'Outer landscape ' + (index + 1), x, 0, z);
    const model = new THREE.Group();
    const random = seededRandom(8100 + index);
    if (theme !== 'grove') {
      part(model, ridgeGeometry(THREE, span * 1.5, 7.4 + random() * 2.4, palette[theme], random),
        rock, 0, 0, 0, 1, 1, 1.65).rotation.y = -.35 + random() * .7;
    }
    for (let j = 0; j < 6; j++) {
      const size = (theme === 'grove' ? 6.9 : 3.6) + random() * 2;
      pine(model, (random() - .5) * span * 1.5, 0, (random() - .5) * 3.8, size, j * .68);
    }
    batch(model, vista);
  }
}
