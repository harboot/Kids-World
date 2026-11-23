import { seededRandom } from '../../core/random.js';
import { floorRise, gallery, gateZ, stair, stories } from './layout.js';

const ink = {
  plaster: 0xd0a580, cream: 0xd7ba93, brick: 0xa15c40, brickLight: 0xb97755,
  stone: 0xb1a28c, band: 0x907d68, shade: 0x665548, roof: 0x544b4a,
  ridge: 0x665954, tile: 0x7a655c, wood: 0x674035, door: 0x895543,
  dark: 0x41342e, green: 0x42605b, pane: 0x75837a, iron: 0x3c3837,
  oxblood: 0x974945, linen: 0xd8b389, brass: 0xba8a52,
};

function masonryKit(THREE, scene) {
  const parts = new Map();
  const boxGeometry = new THREE.BoxGeometry();
  const drumGeometry = new THREE.CylinderGeometry(.5, .5, 1, 12);
  const ringGeometry = new THREE.CylinderGeometry(.5, .5, 1, 14, 1, true);
  const profile = new THREE.Shape();
  profile.moveTo(-.5, 0);
  profile.lineTo(.5, 0);
  profile.lineTo(0, 1);
  profile.closePath();
  const gableGeometry = new THREE.ExtrudeGeometry(profile, { depth: 1, bevelEnabled: false });
  const material = new THREE.MeshStandardMaterial({ roughness: .96, side: THREE.DoubleSide });
  const color = new THREE.Color();
  const transform = new THREE.Object3D();

  function place(geometry, paint, x, y, z, width, height, depth, yaw = 0, pitch = 0, roll = 0, shadow = true) {
    const key = geometry.id + ':' + shadow;
    if (!parts.has(key)) parts.set(key, { geometry, shadow, instances: [] });
    transform.position.set(x, y, z);
    transform.rotation.set(pitch, yaw, roll, 'YXZ');
    transform.scale.set(width, height, depth);
    transform.updateMatrix();
    parts.get(key).instances.push({ matrix: transform.matrix.clone(), paint });
  }

  function box(...args) { place(boxGeometry, ...args); }
  function drum(...args) { place(drumGeometry, ...args); }
  function ring(...args) { place(ringGeometry, ...args); }
  function wall(originX, originZ, yaw) {
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    return (paint, u, y, v, width, height, depth, pitch = 0, roll = 0) =>
      box(paint, originX + cos * u + sin * v, y, originZ - sin * u + cos * v, width, height, depth, yaw, pitch, roll);
  }

  return {
    box, drum, ring, wall,
    gable(...args) { place(gableGeometry, ...args); },
    beam(paint, x1, y1, z1, x2, y2, z2, width) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dz = z2 - z1;
      const horizontal = Math.hypot(dx, dz);
      box(paint, (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2,
        Math.hypot(horizontal, dy), width, width, Math.atan2(-dz, dx), 0, Math.atan2(dy, horizontal));
    },
    finish() {
      for (const { geometry, shadow, instances } of parts.values()) {
        const mesh = new THREE.InstancedMesh(geometry, material, instances.length);
        mesh.castShadow = shadow;
        mesh.receiveShadow = true;
        instances.forEach((part, i) => {
          mesh.setMatrixAt(i, part.matrix);
          mesh.setColorAt(i, color.setHex(part.paint));
        });
        scene.add(mesh);
      }
    },
  };
}

function doorsAndWindows(face, x, y, hasAwning) {
  face(ink.shade, x, y + 1.13, .035, 1.22, 2.26, .10);
  face(ink.wood, x, y + 1.115, .107, 1.09, 2.20, .075);
  for (const side of [-1, 1]) {
    face(ink.door, x + side * .255, y + .97, .154, .45, 1.81, .045);
    face(ink.wood, x + side * .255, y + .61, .183, .30, .53, .026);
    face(ink.dark, x + side * .255, y + 1.53, .183, .31, .44, .026);
    face(ink.brass, x + side * .08, y + 1.04, .208, .052, .12, .04);
  }
  face(ink.band, x, y + 2.31, .065, 1.39, .10, .24);

  const windowX = x + 1.62;
  face(ink.shade, windowX, y + 1.61, .045, 1.16, 1.22, .13);
  face(ink.green, windowX, y + 1.61, .12, 1.02, 1.09, .06);
  for (const dx of [-.30, 0, .30]) {
    for (const dy of [-.25, .23]) face(ink.pane, windowX + dx, y + 1.61 + dy, .155, .245, .415, .025);
  }
  face(ink.band, windowX, y + .985, .13, 1.26, .11, .27);
  if (hasAwning) {
    for (let stripe = -3; stripe <= 3; stripe++) {
      const paint = stripe % 2 === 0 ? ink.linen : ink.oxblood;
      face(paint, windowX + stripe * .20, y + 2.30, .38, .199, .055, .75, .24);
      face(paint, windowX + stripe * .20, y + 2.17, .744, .199, .13, .045);
    }
  }
}

function tenement(kit, layout, random) {
  const { box, wall } = kit;
  const height = stories * floorRise;
  const backZ = -12.65;
  const sideX = 17.05;
  const wingsZ = -1;
  box(ink.plaster, 0, height / 2, backZ, 37.5, height, 4.3);
  layout.solid(0, backZ, 37.5, 4.3, height);
  for (const side of [-1, 1]) {
    box(ink.cream, side * sideX, height / 2, wingsZ, 3.4, height, 19);
    layout.solid(side * sideX, wingsZ, 3.4, 19, height);
  }

  const facades = [
    { draw: wall(0, gallery.rear, 0), span: gallery.outer * 2, bays: 7 },
    { draw: wall(-gallery.outer, wingsZ, Math.PI / 2), span: 19, bays: 4 },
    { draw: wall(gallery.outer, wingsZ, -Math.PI / 2), span: 19, bays: 4 },
  ];

  for (const { draw, span, bays } of facades) {
    const spacing = span / bays;
    for (let level = 0; level < stories; level++) {
      const y = level * floorRise;
      draw(ink.band, 0, y + .17, .026, span, .34, .052);
      draw(ink.shade, 0, y + floorRise - .30, .037, span, .29, .09);
      for (let bay = 0; bay < bays; bay++) {
        const center = -span / 2 + (bay + .5) * spacing;
        doorsAndWindows(draw, center - .72, y, (bay + level * 2) % 4 === 1);
        if ((bay + level) % 3 === 0) {
          // Small exposed brick patches break up the plaster near the slab edges.
          for (let row = 0; row < 3; row++) {
            const count = row === 2 ? 1 : 2;
            for (let i = 0; i < count; i++) {
              draw(random() < .5 ? ink.brick : ink.brickLight, center + 1.65 + i * .25 - row * .10,
                y + .45 + row * .13, .018, .236, .115, .039);
            }
          }
        }
      }
    }
  }

  // Posts run up to the eaves along the back wall and beside the open side galleries.
  for (const x of [-11.95, -8, -4, 0, 4, 8, 11.95]) {
    box(ink.cream, x, height / 2, -7.59, .30, height, .30);
    layout.solid(x, -7.59, .30, .30, height);
  }
  for (const side of [-1, 1]) {
    for (const z of [-7.35, -5.35, 0.95, 3.85, 7.95]) {
      box(ink.cream, side * (stair.outer + .12), height / 2, z, .25, height, .31);
      layout.solid(side * (stair.outer + .12), z, .25, .31, height);
    }
    const end = wall(side * sideX, gallery.front, 0);
    end(ink.band, 0, .24, .035, 3.42, .48, .08);
    for (let level = 0; level < stories; level++) {
      const y = level * floorRise;
      end(ink.green, 0, y + 1.62, .048, 1.13, 1.22, .13);
      for (const x of [-.34, 0, .34]) end(ink.pane, x, y + 1.62, .125, .24, .98, .039);
      end(ink.band, 0, y + 1, .12, 1.45, .13, .28);
      end(ink.wood, 0, y + 2.29, .096, 1.34, .095, .23);
      const edge = side * (level % 2 === 0 ? 1 : -1);
      for (let row = 0; row < 3; row++) {
        for (let brick = row === 2 ? 1 : 0; brick < 3; brick++) {
          end(brick % 2 ? ink.brickLight : ink.brick, edge * (1.48 - brick * .29 + row * .064),
            y + .53 + row * .14, .02, .264, .12, .042);
        }
      }
    }
  }

  for (const side of [-1, 1]) {
    kit.gable(ink.cream, side * 18.75, height - .04, -11.65, 8.8, 1.33, .13, -side * Math.PI / 2);
    kit.gable(ink.plaster, side * 15.7, height - .04, gallery.front, 6.8, 1.04, .16);
  }
  roof(kit.wall(0, -11.65, 0), 38.6, 9.3, height - .04);
  for (const side of [-1, 1]) {
    roof(kit.wall(side * 15.7, .57, Math.PI / 2), 17.02, 7.07, height - .04);
  }

  // Raised center dormer and the roof tank give the compound a recognizable silhouette.
  const dormer = wall(0, -11.36, 0);
  dormer(ink.plaster, 0, height + 1.82, .10, 5.15, 2.15, 2.85);
  dormer(ink.cream, 0, height + 2.96, .10, 3.52, .37, 2.93);
  dormer(ink.band, 0, height + 3.20, .10, 2.15, .17, 2.98);
  dormer(ink.green, 0, height + 2.20, 1.55, .88, 1.05, .12);
  dormer(ink.brass, 0, height + 2.2, 1.63, .078, 1.05, .03);
  const tankX = -10.6;
  const tankZ = -12.2;
  for (const x of [-.64, .64]) {
    for (const z of [-.55, .55]) box(ink.wood, tankX + x, height + 2.05, tankZ + z, .14, 1.86, .14);
    kit.beam(ink.wood, tankX + x, height + 1.3, tankZ - .55, tankX + x, height + 2.88, tankZ + .55, .11);
  }
  kit.drum(ink.iron, tankX, height + 3.62, tankZ, 1.8, 1.43, 1.8);
  for (const y of [3, 3.57, 4.24]) kit.drum(ink.ridge, tankX, height + y, tankZ, 1.86, .072, 1.86);
  kit.drum(ink.roof, tankX, height + 4.39, tankZ, 1.92, .19, 1.92);
}

function roof(draw, width, depth, eave) {
  const pitch = .29;
  const halfDepth = depth / 2;
  const rise = Math.tan(pitch) * halfDepth;
  const slope = halfDepth / Math.cos(pitch);
  for (const side of [-1, 1]) {
    draw(ink.roof, 0, eave + rise / 2, side * halfDepth / 2, width, .22, slope, side * pitch);
    draw(ink.wood, 0, eave - .03, side * halfDepth, width + .10, .24, .15);
    const columns = Math.floor(width / .47);
    const spacing = width / columns;
    for (let i = 0; i < columns; i++) {
      const x = -width / 2 + (i + .5) * spacing;
      draw(i % 4 === 0 ? ink.tile : ink.ridge, x, eave + rise / 2 + .146,
        side * halfDepth / 2, .13, .11, slope, side * pitch);
    }
    for (let row = 1; row < 7; row++) {
      const t = row / 7;
      draw(ink.ridge, 0, eave + rise * (1 - t) + .133, side * halfDepth * t, width, .085, .042, side * pitch);
    }
  }
  draw(ink.tile, 0, eave + rise + .16, 0, width + .35, .23, .25);
}

function walkways(kit, layout) {
  const { box, beam } = kit;
  for (const { x, z, width, depth, low, high, front, back } of layout.surfaces) {
    if (low === high) {
      if (low === 0) continue;
      box(ink.stone, x, low - gallery.slab / 2, z, width, gallery.slab, depth);
      continue;
    }

    const count = 19;
    const tread = depth / count;
    const rise = high - low;
    const angle = Math.atan2(rise, depth);
    box(ink.band, x, (low + high) / 2 - .16, z, width, .19, Math.hypot(rise, depth), 0, angle);
    for (let i = 0; i < count; i++) {
      const y = low + (i + 1) * rise / count;
      box(i % 4 === 0 ? ink.cream : ink.stone, x, y - .14, back - (i + .5) * tread, width, .28, tread);
    }
    for (const side of [-1, 1]) {
      beam(ink.band, x + side * (width / 2 - .05), low, back, x + side * (width / 2 - .05), high, front, .16);
    }
  }

  const posts = new Set();
  for (const { x1, z1, x2, z2, low, high, length } of layout.guards) {
    const count = Math.ceil(length / .47);
    beam(ink.wood, x1, low + 1.12, z1, x2, high + 1.12, z2, .15);
    beam(ink.band, x1, low + .22, z1, x2, high + .22, z2, .14);
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const x = x1 + (x2 - x1) * t;
      const z = z1 + (z2 - z1) * t;
      const y = low + (high - low) * t;
      const key = [x, y, z].map(value => value.toFixed(3)).join(',');
      if (posts.has(key)) continue;
      posts.add(key);
      const major = i === 0 || i === count;
      const width = major ? .24 : .10;
      box(major ? ink.band : ink.stone, x, y + .57, z, width, 1.11, width);
    }
  }
}

function courtyard(kit, layout, random) {
  const { box, drum, ring, wall, beam } = kit;
  box(0xc6a582, 0, -.18, 0, 42, .30, 36, 0, 0, 0, false);

  const pavers = [0xb4987d, 0xc0a285, 0xbaa08a, 0xcbb092, 0xaf9580, 0xcaad8b];
  for (let row = 0; row < 19; row++) {
    for (let col = 0; col < 28; col++) {
      const x = (col - 13.5) * 1.33 + (row % 2) * .38;
      const z = (row - 7) * 1.2;
      const border = Math.abs(x) > 8.9 || z < -6 || z > 10.1 || Math.abs(x) < 2.3;
      if (!border && random() > .13) continue;
      box(pavers[Math.floor(random() * pavers.length)], x, -.041, z, 1.292, .112, 1.163, 0, 0, 0, false);
    }
  }

  for (const side of [-1, 1]) {
    const fenceWidth = 16.5;
    const x = side * (fenceWidth / 2 + 2.55);
    box(ink.plaster, x, .96, gateZ, fenceWidth, 1.92, .52);
    box(ink.cream, x, 1.95, gateZ, fenceWidth + .07, .16, .68);
    box(ink.band, x, .22, gateZ, fenceWidth, .44, .61);
    layout.solid(x, gateZ, fenceWidth, .52, 2.03);
    box(ink.cream, side * 18.78, 1.05, 11.35, .54, 2.10, 5.7);
    box(ink.band, side * 18.78, 2.11, 11.35, .65, .14, 5.73);
    layout.solid(side * 18.78, 11.35, .54, 5.7, 2.18);

    for (let i = 0; i < 7; i++) {
      const pierX = side * (2.58 + i * 2.7);
      const gatePier = i === 0;
      const y = gatePier ? 3.15 : 2.30;
      const width = gatePier ? .77 : .53;
      box(ink.band, pierX, y / 2, gateZ, width, y, .87);
      box(ink.cream, pierX, y, gateZ, width + .18, .19, 1.02);
      if (gatePier) drum(ink.band, pierX, y + .29, gateZ, .35, .40, .35);
    }

    const fenceFace = wall(x, gateZ + .267, 0);
    for (let i = 0; i < 9; i++) {
      const u = (i - 4) * 1.48;
      const row = i % 3;
      fenceFace(ink.brickLight, u, .52 + row * .13, 0, .29, .112, .035);
      fenceFace(ink.brick, u + .31, .52 + row * .13, .006, .29, .112, .045);
      fenceFace(ink.brickLight, u + .17, .65 + row * .13, .003, .29, .112, .039);
    }
  }

  // A wrought-iron arch with two closed gate leaves.
  function archY(x) { return 3.10 + 1.46 * (1 - (x / 2.57) ** 2); }
  for (let i = 0; i < 16; i++) {
    const a = -2.56 + i * .32;
    const b = a + .32;
    beam(ink.iron, a, archY(a), gateZ, b, archY(b), gateZ, .14);
    beam(ink.iron, a, archY(a) - .43, gateZ, b, archY(b) - .43, gateZ, .085);
    beam(ink.iron, a, archY(a) - .43, gateZ, b, archY(b), gateZ, .066);
  }
  box(ink.oxblood, 0, 4.32, gateZ, 1.72, .51, .13);
  box(ink.brass, 0, 4.32, gateZ - .079, 1.45, .32, .04);
  box(ink.brass, 0, 4.32, gateZ + .079, 1.45, .32, .04);
  for (const side of [-1, 1]) {
    box(ink.iron, side * 1.13, .34, gateZ, 2.22, .44, .13);
    box(ink.iron, side * 1.13, 1.30, gateZ, 2.22, .08, .12);
    for (let i = 0; i < 9; i++) {
      const x = side * (.14 + i * .25);
      const y = 2.42 + .22 * (1 - Math.abs(x) / 2.2);
      box(ink.iron, x, y / 2, gateZ, .061, y, .074);
    }
  }
  layout.solid(0, gateZ, 5.12, .22, 3.12);

  // Central stone well and the structural timber frame above it.
  const wellX = -3.5;
  const wellZ = -.8;
  drum(ink.dark, wellX, .08, wellZ, 1.73, .16, 1.73);
  ring(ink.band, wellX, .45, wellZ, 2.03, .90, 2.03);
  ring(ink.shade, wellX, .45, wellZ, 1.53, .90, 1.53);
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 14; i++) {
      const angle = (i + (row % 2) / 2) * Math.PI * 2 / 14;
      const radius = row === 2 ? .895 : .90;
      box(i % 3 === 0 ? ink.cream : ink.stone, wellX + Math.sin(angle) * radius, .15 + row * .29,
        wellZ + Math.cos(angle) * radius, .385, .275, row === 2 ? .39 : .26, angle);
    }
  }
  layout.solid(wellX, wellZ, 2.13, 2.13, .89);
  for (const side of [-1, 1]) box(ink.wood, wellX + side * 1.14, 1.31, wellZ, .16, 2.63, .17);
  for (const side of [-1, 1]) layout.solid(wellX + side * 1.14, wellZ, .16, .17, 2.63);
  box(ink.wood, wellX, 2.63, wellZ, 2.72, .19, .18);
  box(ink.brass, wellX, 2.12, wellZ, .044, .86, .044);
}

export function buildCourtyard(THREE, scene, layout, touch) {
  const random = seededRandom(1748);
  const kit = masonryKit(THREE, scene);
  scene.background = new THREE.Color(0xe6cdb7);
  scene.fog = new THREE.FogExp2(0xe6cdb7, .015);
  scene.add(new THREE.HemisphereLight(0xfff0e3, 0x827a77, 1.53));
  const sun = new THREE.DirectionalLight(0xffe3c1, 2.2);
  sun.position.set(-24, 34, 24);
  sun.castShadow = true;
  const shadow = sun.shadow;
  shadow.mapSize.set(touch ? 1024 : 2048, touch ? 1024 : 2048);
  Object.assign(shadow.camera, { left: -28, right: 28, bottom: -22, top: 22, near: 8, far: 88 });
  shadow.normalBias = .038;
  shadow.bias = -.0002;
  scene.add(sun);

  tenement(kit, layout, random);
  walkways(kit, layout);
  courtyard(kit, layout, random);

  // A muted skyline sits outside the playable compound.
  kit.box(0xbfa28f, 0, -.42, 0, 160, .42, 160, 0, 0, 0, false);
  for (let i = 0; i < 24; i++) {
    const angle = i * Math.PI / 12;
    const distance = 37 + random() * 12;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const height = 3.2 + random() * 5.8;
    const width = 4.4 + random() * 4;
    const paint = i % 3 === 0 ? 0xa58e82 : 0xb39a8a;
    kit.box(paint, x, height / 2, z, width, height, 5, 0, 0, 0, false);
    kit.box(0x8b7c79, x, height, z, width + .34, .26, 5.24, 0, 0, 0, false);
  }
  kit.finish();
}
