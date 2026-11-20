import { addGroup, paintCanvasTexture, SURFACE_GAP } from '../../core/geometry.js';
import { PLAYER_ONLY_LAYER } from '../../core/render-layers.js';
import { seededRandom } from '../../core/random.js';
import { buildAtrium, ATRIUM_RADII } from './atrium.js';
import { buildConcessions } from './concessions.js';
import { buildExhibitFacade } from './exhibit-facades.js';
import { GALLERY_DEPTH, GALLERY_WIDTH, exhibitOutline, exhibits, wings } from './exhibits.js';
import { buildHangingDecor } from './hanging-decor.js';
import { addGallerySign, addSolid, createParts, spaceTransform } from './parts.js';
import { buildPromenadeFurniture } from './promenade-furniture.js';
import { buildPublicSpaces } from './public-spaces.js';
import { buildScenicBackdrops, buildScenicEdges, canopyMaterial, paintScenicGround } from './scenic-perimeter.js';
import { buildGalleryPeople } from './visitors.js';
import { buildWalkway, WALKWAY_HEIGHT, walkwayStairs } from './walkway.js';

const halfWidth = GALLERY_WIDTH / 2;
const halfDepth = GALLERY_DEPTH / 2;
const ceiling = 24.5;
const shellOutline = [[-61, 60], [60, 60], [70, 50], [70, -49], [60, -60], [-60, -60], [-70, -50], [-70, 51]];
const promenade = [[-16, 33], [-27, 24], [-30, 7], [-29, -18], [-17, -27], [3, -29],
  [25, -24], [34, -11], [33, 10], [26, 25], [11, 32], [-4, 32]];
const lobby = [[0, 59], [0, 51], [-4, 42], [-4, 32], [-1, 23], [0, 14]];
const links = {
  woodland: [[-30, 7], [-24, 3], [-17, 1]],
  royal: [[3, -29], [1, -23], [-2, -14]],
  adventure: [[33, 10], [25, 8], [17, 3]],
};

function galleryFloor(THREE, document, parts, parent) {
  const map = paintCanvasTexture(THREE, document, 2048, 2048, (ink, width, height) => {
    ink.scale(width / GALLERY_WIDTH, height / GALLERY_DEPTH);
    ink.translate(halfWidth, halfDepth);
    ink.fillStyle = '#bca2ab';
    ink.fillRect(-halfWidth, -halfDepth, GALLERY_WIDTH, GALLERY_DEPTH);
    const random = seededRandom(1083);
    const tiles = ['#bda3ae', '#b59ba8', '#c3a9b0', '#baa1ac'];
    for (let z = -halfDepth; z < halfDepth; z += 3) {
      for (let x = -halfWidth; x < halfWidth; x += 3) {
        ink.fillStyle = tiles[Math.floor(random() * tiles.length)];
        ink.fillRect(x + .055, z + .055, 2.89, 2.89);
        ink.strokeStyle = '#fff6e922';
        ink.lineWidth = .07;
        ink.beginPath();
        ink.moveTo(x + .15, z + 2.86);
        ink.quadraticCurveTo(x + 2.4, z + random() * 2, x + 2.84, z + .14);
        ink.stroke();
      }
    }
    paintScenicGround(ink, halfWidth, halfDepth);

    for (const exhibit of exhibits) {
      if (exhibit.build) continue;
      const { toWorld } = spaceTransform(exhibit);
      const outline = exhibitOutline(exhibit);
      for (const [scale, color] of [[1, '#e5cbb7'], [.88, wings[exhibit.wing].path], [.85, '#ebd7c7']]) {
        ink.fillStyle = color;
        ink.beginPath();
        for (const [x, z] of outline) ink.lineTo(...toWorld(x * scale, z * scale));
        ink.closePath();
        ink.fill();
      }
    }

    // All joins and inlays are painted on one floor surface, including where paths cross.
    function route(points, width, accent, loop = false) {
      const curves = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)), loop);
      const samples = curves.getPoints(points.length * 12);
      ink.lineCap = 'round';
      ink.lineJoin = 'round';
      ink.beginPath();
      ink.moveTo(samples[0].x, samples[0].z);
      for (const point of samples.slice(1)) ink.lineTo(point.x, point.z);
      if (loop) ink.closePath();
      for (const [color, size] of [['#6d5269', width + .68], ['#d5af6a', width + .42],
        [accent, width], ['#efdfd1', width - 1.45]]) {
        ink.strokeStyle = color;
        ink.lineWidth = size;
        ink.stroke();
      }
    }

    route(promenade, 6.7, '#9c728f', true);
    for (const exhibit of exhibits) {
      const { toWorld } = spaceTransform(exhibit);
      const front = exhibit.bounds.depth / 2;
      route([exhibit.approach, toWorld(0, front + 2.25), toWorld(0, front - .42)],
        exhibit.entrance - .9, wings[exhibit.wing].path);
    }
    for (const [wing, link] of Object.entries(links)) {
      route(link, 7.1, wings[wing].path);
    }
    for (const stair of walkwayStairs) route(stair.floorApproach, 3.9, '#7793a3');
    route(lobby, 9.2, '#b7808e');
    for (const [rx, rz, color] of [[5.0, 3.4, '#765071'], [4.81, 3.22, '#d0a361'], [4.54, 2.96, '#f2dfcb']]) {
      ink.fillStyle = color;
      ink.beginPath();
      ink.ellipse(0, 51, rx, rz, 0, 0, Math.PI * 2);
      ink.fill();
    }
    ink.fillStyle = '#b8837b';
    ink.beginPath();
    for (const point of [[0, 48.45], [.94, 50.57], [3.29, 51], [.94, 51.43],
      [0, 53.55], [-.94, 51.43], [-3.29, 51], [-.94, 50.57]]) ink.lineTo(...point);
    ink.closePath();
    ink.fill();

    for (const [rx, rz, color] of [[18.8, 16.8, '#765071'], [18.45, 16.45, '#d0a361'],
      [18.2, 16.2, '#edd7c5'], [16.9, 14.9, '#a57f9b'], [16.5, 14.5, '#f3e3d4']]) {
      ink.fillStyle = color;
      ink.beginPath();
      ink.ellipse(0, 0, rx, rz, 0, 0, Math.PI * 2);
      ink.fill();
    }
    ink.save();
    for (let i = 0; i < 16; i++) {
      ink.fillStyle = i % 2 ? '#ddc297' : '#b78375';
      ink.beginPath();
      ink.moveTo(0, -12.8);
      ink.lineTo(1.04, -9);
      ink.lineTo(0, -6.3);
      ink.lineTo(-1.04, -9);
      ink.closePath();
      ink.fill();
      ink.rotate(Math.PI / 8);
    }
    ink.restore();
  });
  const outline = new THREE.Shape(shellOutline.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geometry = new THREE.ShapeGeometry(outline);
  const vertices = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < vertices.count; i++) {
    uv.setXY(i, vertices.getX(i) / GALLERY_WIDTH + .5, vertices.getY(i) / GALLERY_DEPTH + .5);
  }
  const floor = parts.part(parent, geometry,
    parts.matte(map ? 0xffffff : 0xd0b3b1, { map }), 0, -SURFACE_GAP.trim, 0, 1, 1, 1);
  floor.name = 'Marble promenade, wing paths and atrium inlay';
  floor.rotation.x = -Math.PI / 2;
}

export function buildGallery(THREE, scene, document, obstacles, services) {
  scene.background = new THREE.Color(0xaab8c9);
  scene.fog = new THREE.Fog(0xaab8c9, 72, 124);
  scene.add(new THREE.HemisphereLight(0xffecd7, 0xc2a9dc, 2.18));
  const key = new THREE.DirectionalLight(0xffebc7, 1.45);
  key.position.set(-18, 30, 16);
  scene.add(key);

  const parts = createParts(THREE);
  const { part, batch, matte } = parts;
  const colors = {
    cream: matte(0xf7ddba), ivory: matte(0xe5c8b4), blush: matte(0xc495a1), wine: matte(0x704967),
    plum: matte(0x514058), gold: matte(0xbb8342), moss: matte(0x496b56), leaf: matte(0x75936a),
    glow: matte(0xffdc93, { emissive: 0xffba65, emissiveIntensity: .42 }),
  };
  const { cream, ivory, blush, wine, plum, gold, moss, leaf, glow } = colors;
  const wingMaterials = Object.fromEntries(Object.entries(wings).map(([id, wing]) => [id, matte(wing.accent)]));
  const shell = addGroup(THREE, scene, 'Gallery architecture');
  const components = new THREE.Group();
  const overhead = mesh => mesh.layers.set(PLAYER_ONLY_LAYER);
  galleryFloor(THREE, document, parts, shell);

  const roofShape = new THREE.Shape(shellOutline.map(([x, z]) => new THREE.Vector2(x, -z)));
  const [atriumX, atriumZ] = ATRIUM_RADII;
  const roofHole = new THREE.Path();
  roofHole.absellipse(0, 0, atriumX, atriumZ, 0, Math.PI * 2, true);
  roofShape.holes.push(roofHole);
  const canopy = new THREE.ShapeGeometry(roofShape, 32);
  const roof = part(shell, canopy, canopyMaterial(THREE, document, GALLERY_WIDTH, GALLERY_DEPTH, canopy),
    0, ceiling, 0, 1, 1, 1);
  roof.name = 'Twilight canopy';
  roof.rotation.x = -Math.PI / 2;
  overhead(roof);

  function wall(parent, a, b, height, material, base, transform, thickness = .58, dressed = true) {
    const [ax, az] = a;
    const [bx, bz] = b;
    const yaw = Math.atan2(az - bz, bx - ax);
    const x = (ax + bx) / 2;
    const z = (az + bz) / 2;
    const length = Math.hypot(bx - ax, bz - az);
    part(parent, 'box', material, x, height / 2, z, length + .04, height, thickness).rotation.y = yaw;
    if (dressed) {
      part(parent, 'box', base, x, .47, z, length + .13, .94, thickness + .16).rotation.y = yaw;
      part(parent, 'box', gold, x, 1, z, length, .09, thickness + .23).rotation.y = yaw;
      part(parent, 'box', base, x, height - .05, z, length, .26, thickness + .13).rotation.y = yaw;
    }
    const [wx, wz] = transform?.toWorld(x, z) ?? [x, z];
    addSolid(obstacles, wx, wz, length + .10, thickness + (dressed ? .23 : 0), height + .08,
      yaw + (transform?.rotation ?? 0));
  }

  for (const [index, point] of shellOutline.entries()) {
    wall(components, point, shellOutline[(index + 1) % shellOutline.length], ceiling, ivory, wine, null, 1, false);
  }
  buildScenicBackdrops({ THREE, document, parent: shell, parts, outline: shellOutline, ceiling });

  function gateway(parent, title, subtitle, span, height, accent, { reverse = false } = {}) {
    const model = addGroup(THREE, parent, title + ' arch');
    const local = new THREE.Group();
    const half = span / 2;
    const shoulder = height - span * .26;
    for (const side of [-1, 1]) {
      part(local, 'box', plum, side * (half + .22), .21, 0, .93, .42, .94);
      part(local, 'drum', ivory, side * (half + .23), (shoulder + .27) / 2, 0, .32, shoulder - .27, .36);
      part(local, 'drum', gold, side * (half + .23), shoulder - .14, 0, .46, .24, .47);
      part(local, 'gem', glow, side * (half + .24), 2.45, .32, .23, .38, .2);
    }
    function archBand(width) {
      const points = [];
      for (const edge of [1, -1]) {
        for (let i = 0; i <= 24; i++) {
          const angle = Math.PI * (edge === 1 ? i : 24 - i) / 24;
          points.push(new THREE.Vector2(Math.cos(angle) * (half + .23 + edge * width / 2),
            shoulder + Math.sin(angle) * (height - shoulder + edge * width / 2)));
        }
      }
      return new THREE.Shape(points);
    }
    const arch = new THREE.ExtrudeGeometry(archBand(.48), { depth: .56, bevelEnabled: false });
    part(local, arch, accent, 0, 0, -.28, 1, 1, 1);
    const pinstripe = new THREE.ShapeGeometry(archBand(.075));
    part(local, pinstripe, gold, 0, 0, .28 + SURFACE_GAP.detail, 1, 1, 1);
    if (reverse) part(local, pinstripe, gold, 0, 0, -.28 - SURFACE_GAP.detail, 1, 1, 1).rotation.y = Math.PI;

    const signs = subtitle ? [title, subtitle] : [title];
    const signWidth = Math.min(span + 1, Math.max(5.1, title.length / 5));
    const signY = height - .60;
    const face = .35;
    part(local, 'box', gold, 0, signY, 0, signWidth + .24, 1.29, face * 2);
    addGallerySign(THREE, document, model, signs, 0, signY, face + SURFACE_GAP.detail, signWidth, 1.13);
    if (reverse) {
      const sign = addGallerySign(THREE, document, model, signs, 0, signY, -face - SURFACE_GAP.detail, signWidth, 1.13);
      if (sign) sign.rotation.y = Math.PI;
    }
    batch(local, model);
  }

  function transition(x, z, yaw, span, title, subtitle, material) {
    const gate = addGroup(THREE, shell, title + ' entrance', x, 0, z, yaw);
    gateway(gate, title, subtitle, span, 6.8, material, { reverse: true });
    const { toWorld } = spaceTransform({ position: { x, z }, rotation: yaw });
    for (const side of [-1, 1]) {
      addSolid(obstacles, ...toWorld(side * (span / 2 + .22), 0), .96, .96, 4, yaw);
      const gardenX = side * (span / 2 + 2.25);
      const [gx, gz] = toWorld(gardenX, 0);
      const garden = addGroup(THREE, components, 'Wing garden edge', gx, 0, gz, yaw);
      part(garden, 'box', ivory, 0, .28, 0, 3.05, .56, 1.58);
      part(garden, 'box', material, 0, .59, 0, 3.18, .16, 1.66);
      for (let i = 0; i < 5; i++) {
        part(garden, 'ball', i % 2 ? leaf : moss, (i - 2) * .52, .84, Math.sin(i * 3) * .15, .51, .54, .63);
        part(garden, 'sphere', i % 2 ? cream : glow, (i - 2) * .52, 1.2, .26, .16, .13, .16);
      }
      addSolid(obstacles, ...toWorld(gardenX, 0), 3.18, 1.66, 1.25, yaw);
    }
  }

  transition(0, 44.2, .18, 10.3, 'Princess Gallery', 'Central Atrium', wine);
  transition(-24, 3, Math.PI / 2.6, 7.5, wings.woodland.title, 'Rapunzel · Snow White · Aurora', wingMaterials.woodland);
  transition(1, -23, Math.PI + .18, 7.6, wings.royal.title, 'Belle · Cinderella · Jasmine', wingMaterials.royal);
  transition(24.8, 7.9, -Math.PI / 3, 7.7, wings.adventure.title, 'Ariel · Mulan · Moana · Tiana', wingMaterials.adventure);

  for (const [x, z, yaw] of [[-8.2, 54.8, .13], [8.2, 54.8, -.13]]) {
    const planter = addGroup(THREE, components, 'Lobby topiary', x, 0, z, yaw);
    part(planter, 'box', plum, 0, .19, 0, 2.3, .38, 2.3);
    part(planter, 'drum', wine, 0, .48, 0, 1.03, .43, 1.03);
    part(planter, 'drum', gold, 0, .74, 0, 1.09, .12, 1.09);
    part(planter, 'drum', gold, 0, 1.4, 0, .12, 1.31, .12);
    for (const [y, size] of [[2.05, .9], [3.02, .68], [3.73, .48]]) {
      part(planter, 'ball', moss, 0, y, 0, size, size * .80, size).rotation.y = y;
      part(planter, 'ball', leaf, .23, y + .09, .17, size * .72, size * .67, size * .74);
    }
    addSolid(obstacles, x, z, 2.3, 2.3, 4.16, yaw);
  }

  // A blue mosaic crosses the Adventure path beneath level timber-and-marble decking.
  const bridgeYaw = -.24;
  const bridge = addGroup(THREE, components, 'Adventure mosaic bridge', 28.7, 0, 9.1, bridgeYaw);
  part(bridge, 'box', wingMaterials.adventure, 0, -.020, 0, 9.5, .034, 5.2);
  for (let i = -5; i <= 5; i++) {
    part(bridge, 'box', i % 2 ? ivory : cream, i * .69, -.015, 0, .665, .045, 4.04);
  }
  for (const side of [-1, 1]) {
    part(bridge, 'box', gold, 0, .83, side * 2.05, 7.8, .09, .11);
    part(bridge, 'box', wine, 0, .17, side * 2.05, 7.8, .12, .21);
    for (const x of [-3.8, -1.9, 0, 1.9, 3.8]) {
      part(bridge, 'box', gold, x, .45, side * 2.05, .17, .90, .17);
    }
    const { toWorld } = spaceTransform({ position: { x: 28.7, z: 9.1 }, rotation: bridgeYaw });
    addSolid(obstacles, ...toWorld(0, side * 2.05), 7.8, .21, .9, bridgeYaw);
  }

  buildAtrium({ THREE, document, shell, parts, colors, obstacles, ceiling });
  batch(components, shell);

  const exhibitVisits = [];
  for (const exhibit of exhibits) {
    const { id, title, accent, wing, position, rotation, bounds, build, entrance, status } = exhibit;
    const bay = addGroup(THREE, scene, id + ' exhibit', position.x, 0, position.z, rotation);
    const local = new THREE.Group();
    const tint = matte(accent);
    const front = bounds.depth / 2;
    const transform = { ...spaceTransform(exhibit), rotation };
    const outline = exhibitOutline(exhibit);
    const woodland = wing === 'woodland';
    const enclosed = id === 'rapunzel';
    const fullWalls = enclosed || id === 'cinderella';
    const height = fullWalls ? bounds.height : id === 'snow-white' ? 4.25 : wing === 'royal' ? 4.5 : 2.85;
    const thickness = enclosed ? .44 : .55;
    const interiorFace = front - thickness / 2;

    function partition(a, b, index) {
      wall(local, a, b, height + (fullWalls ? 0 : .26 * (index % 3)), enclosed ? ivory : woodland ? moss : ivory,
        enclosed ? blush : wingMaterials[wing], transform, thickness, !woodland || enclosed);
      const [ax, az] = a, [bx, bz] = b;
      if (fullWalls || (id === 'snow-white' && index >= 3 && index <= 9)) return;
      const length = Math.hypot(bx - ax, bz - az);
      const count = Math.max(1, Math.round(length / 3.8));
      const yaw = Math.atan2(az - bz, bx - ax);
      for (let i = 0; i < count; i++) {
        const t = (i + .5) / count;
        const x = ax + (bx - ax) * t;
        const z = az + (bz - az) * t;
        if (woodland) {
          part(local, 'ball', i % 2 ? leaf : moss, x, height + .16, z, 1.25, .74, .8).rotation.y = yaw;
          part(local, 'ball', tint, x + .42, height + .49, z, .45, .37, .44);
        } else {
          part(local, 'box', wingMaterials[wing], x, height - .35, z, 1.05, .94, .74).rotation.y = yaw;
          part(local, 'gem', tint, x, height + .25, z, .25, .49, .25).rotation.y = yaw;
        }
      }
    }
    partition(outline[0], [-entrance / 2 - .13, front], 0);
    partition([entrance / 2 + .13, front], outline[1], 0);
    for (let i = 1; i < outline.length; i++) partition(outline[i], outline[(i + 1) % outline.length], i);

    const facade = addGroup(THREE, bay, 'Exhibit entrance', 0, 0, front + .12);
    gateway(facade, title, status === 'coming-soon' ? 'Coming Soon' : null, entrance,
      woodland ? 6.5 : 5.9, tint);
    for (const side of [-1, 1]) {
      addSolid(obstacles, ...transform.toWorld(side * (entrance / 2 + .22), front + .12), .94, .94, 3.7, rotation);
    }

    if (fullWalls) {
      const opening = 6.75;
      // The upper opening gives the lookout access to the exhibit below its interior ceiling.
      const deckBottom = WALKWAY_HEIGHT - .26;
      const upperLintel = WALKWAY_HEIGHT + 3.2;
      for (const [bottom, top] of [[opening, deckBottom], [upperLintel, bounds.height]]) {
        part(local, 'box', ivory, 0, (bottom + top) / 2, front,
          entrance + .24, top - bottom, thickness);
      }
      const frameZ = front + thickness / 2 + SURFACE_GAP.detail;
      for (const side of [-1, 1]) {
        part(local, 'box', gold, side * (entrance / 2 + .23), (deckBottom + upperLintel) / 2,
          frameZ, .23, upperLintel - deckBottom + .32, .14);
      }
      part(local, 'box', gold, 0, upperLintel + .12, frameZ,
        entrance + .69, .24, .16);
      if (enclosed) overhead(part(local, 'box', blush, 0, bounds.height + .06, 0, bounds.width, .12, bounds.depth));
      buildExhibitFacade({ THREE, document, bay, parts, exhibit, outline, thickness, opening, deckBottom, upperLintel });
    } else if (!build) {
      // Small accent medallion reserves the scene and leaves the entire floor walkable.
      const displayZ = -bounds.depth * .24;
      const podium = addGroup(THREE, local, 'Exhibit reservation', 0, 0, displayZ);
      part(podium, 'drum', plum, 0, .31, 0, 1.38, .62, 1.38);
      part(podium, 'drum', gold, 0, .65, 0, 1.30, .10, 1.30);
      part(podium, 'gem', tint, 0, 1.57, 0, .64, .87, .64).rotation.y = Math.PI / 4;
      addSolid(obstacles, ...transform.toWorld(0, displayZ), 2.76, 2.76, 2.44, rotation);
    }

    batch(local, bay);
    if (build) exhibitVisits.push(build({ THREE, document, bay, exhibit, parts, obstacles, interiorFace, outline }));
  }
  buildScenicEdges({ THREE, parent: shell, parts, obstacles });
  const walkway = buildWalkway({ THREE, document, parent: shell, parts, exhibits, ceiling });
  buildPublicSpaces({ THREE, parent: shell, parts, colors, obstacles });
  buildPromenadeFurniture({ THREE, parent: shell, parts, colors, obstacles });
  const carts = buildConcessions({ THREE, document, parent: shell, parts, obstacles, ...services });
  buildHangingDecor({ THREE, parent: shell, parts, colors, ceiling });
  const people = buildGalleryPeople({ THREE, parent: shell, parts, obstacles, vendors: carts.vendors });
  return { exhibitVisits, ceiling, walkway, people, carts };
}
