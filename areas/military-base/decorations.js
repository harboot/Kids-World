import { paintCanvasTexture, SURFACE_GAP } from '../../core/geometry.js';
import { seededRandom } from '../../core/random.js';
import { antennas, motorPool, radarControl } from './layout.js';
import { floodlight, roadblock } from './perimeter.js';
import { hazard, stripe } from './roads.js';
import { ink } from './scenery.js';

function crate(kit, parent, x, y, z, size, tint) {
  const { box } = kit;
  box(parent, tint, x, y + size / 2, z, size, size, size);
  for (const side of [-1, 1]) {
    box(parent, ink.footing, x + side * size * .34, y + size / 2, z, .079 * size, size + .05, size + .045);
    box(parent, ink.sand, x + side * size * .35, y + size * .37, z + size / 2 + .034, .10 * size, .18 * size, .04);
  }
  box(parent, ink.dark, x, y + size * .64, z + size / 2 + .018, .19 * size, .10 * size, .025);
}

function storage(kit, x, z, yaw, tint) {
  const { group, box, solid } = kit;
  const pile = group('Pallet of equipment crates', x, 0, z, yaw);
  box(pile, ink.footing, 0, .12, 0, 2.31, .22, 1.24);
  for (const side of [-1, 1]) crate(kit, pile, side * .54, .23, 0, 1.0, tint);
  crate(kit, pile, -.52, 1.23, .015, .83, tint);
  solid(pile, 0, 0, 2.31, 1.24, 1.35);
}

function drums(kit, x, z, yaw, tint) {
  const { group, part, solid } = kit;
  const cluster = group('Fuel drums', x, 0, z, yaw);
  for (const [xx, zz] of [[-.52, 0], [.48, 0], [.02, -.86]]) {
    part(cluster, 'drum', tint, xx, .57, zz, .43, 1.12, .43);
    for (const yy of [.15, .44, .82, 1.12]) part(cluster, 'drum', ink.dark, xx, yy, zz, .46, .056, .46);
    part(cluster, 'drum', ink.sand, xx + .17, 1.16, zz, .06, .044, .06);
    solid(cluster, xx, zz, .81, .81, 1.18);
  }
}

function tires(kit, x, z) {
  const { group, part, solid } = kit;
  const stack = group('Spare tire pile', x, 0, z);
  for (const [xx, zz, count] of [[0, 0, 3], [1.39, -.27, 2]]) {
    for (let i = 0; i < count; i++) {
      part(stack, 'drum', ink.rubber, xx, .16 + i * .29, zz, .65, .27, .65);
    }
    part(stack, 'drum', ink.dark, xx, .145 + count * .29, zz, .34, .08, .34);
    solid(stack, xx, zz, 1.23, 1.23, .29 * count + .1);
  }
}

function bench(kit, x, z, yaw, tools = false) {
  const { group, box, part, solid } = kit;
  const prop = group(tools ? 'Maintenance workbench' : 'Courtyard bench', x, 0, z, yaw);
  const top = tools ? 1.05 : .54;
  for (const side of [-1, 1]) {
    box(prop, ink.dark, side, top / 2, 0, .12, top, .52);
    box(prop, ink.steel, side, .097, 0, .18, .19, .78);
  }
  box(prop, tools ? ink.steel : ink.sand, 0, top, 0, 2.55, .12, .65);
  if (tools) {
    box(prop, ink.dark, 0, 1.48, -.26, 2.4, .85, .12);
    for (const [xx, yy, angle] of [[-.78, 1.6, .34], [-.29, 1.47, -.18], [.21, 1.7, .76], [.72, 1.52, -.12]]) {
      box(prop, ink.sand, xx, yy, -.163, .31, .065, .062, [0, 0, angle]);
      part(prop, 'drum', ink.pale, xx + .16 * Math.cos(angle), yy + .16 * Math.sin(angle), -.159,
        .065, .048, .065, [Math.PI / 2, 0, 0]);
    }
    box(prop, ink.yellow, .67, 1.15, 0, .61, .08, .32);
  } else box(prop, ink.sand, 0, .83, -.32, 2.54, .30, .13, [.13, 0, 0]);
  solid(prop, 0, 0, 2.55, .66, tools ? 1.9 : 1.01);
}

function container(kit, x, z, yaw, tint) {
  const { group, box, sign, solid } = kit;
  const prop = group('Freight container', x, 0, z, yaw);
  box(prop, tint, 0, 1.28, 0, 2.67, 2.54, 5.65);
  box(prop, ink.steel, 0, 2.59, 0, 2.73, .13, 5.71);
  for (const side of [-1, 1]) {
    box(prop, ink.dark, side * 1.31, .10, 0, .18, .19, 5.73);
    for (const zz of [-2.74, 2.74]) box(prop, ink.dark, side * 1.31, 1.30, zz, .17, 2.59, .19);
    for (let zz = -2.44; zz < 2.6; zz += .44) box(prop, tint, side * 1.358, 1.24, zz, .11, 2.20, .11);
    box(prop, ink.dark, side * .64, 1.27, 2.846, 1.20, 2.35, .085);
    box(prop, tint, side * .64, 1.27, 2.90, 1.12, 2.24, .085);
    box(prop, ink.paleTeal, side * .70, 1.27, 2.965, .05, 2.18, .05);
  }
  sign(prop, 'CARGO', 0, 1.8, 2.965, 1.49, .36);
  solid(prop, 0, 0, 2.80, 5.82, 2.66);
}

function fuelFarm(kit) {
  const { group, part, box, beam, sign, solid } = kit;
  const node = group('Reserve fuel tanks', -22.5, 0, 35, Math.PI / 2);
  box(node, ink.footing, 0, .095, 0, 14.9, .18, 9.67);
  for (const xx of [-3.42, 3.42]) {
    for (const zz of [-2.39, 2.39]) box(node, ink.dark, xx, .44, zz, 2.79, .84, 1.02);
    part(node, 'drum', 0x83ad95, xx, 1.94, 0, 1.45, 6.08, 1.45, [Math.PI / 2, 0, 0]);
    for (const zz of [-3.03, 3.03]) part(node, 'cap', 0x83ad95, xx, 1.94, zz, 1.443, 1.443, .75);
    for (const zz of [-1.94, 1.94]) part(node, 'drum', ink.steel, xx, 1.94, zz, 1.50, .20, 1.50, [Math.PI / 2, 0, 0]);
    beam(node, ink.yellow, [xx, 3.46, 1.22], [xx, 3.98, 1.22], .13);
    beam(node, ink.yellow, [xx, 3.98, 1.22], [xx, 3.98, 3.89], .13);
    beam(node, ink.yellow, [xx, 3.98, 3.89], [xx, .15, 3.89], .13);
    solid(node, xx, 0, 2.85, 7.62, 3.43);
  }
  box(node, ink.dark, 0, .77, 4.59, .11, 1.55, .13);
  sign(node, 'FUEL RESERVE', 0, 1.46, 4.64, 3.27, .66, { style: 'gold' });
  solid(node, 0, 4.59, .15, .16, 1.55);
  hazard(kit, node, 0, 4.66, 12.7, .33, .18 + SURFACE_GAP.detail);
}

function radar(kit, moving) {
  const { THREE, group, part, box, beam, solid, sign } = kit;
  const pivots = {};
  for (const { x, z, kind } of antennas) {
    const mast = group('Radar ' + kind, x, 0, z);
    if (kind === 'relay') {
      box(mast, ink.footing, 0, .21, 0, 4.2, .42, 4.05);
    } else {
      part(mast, 'post', ink.teal, 0, .26, 0, 3.5, .52, 3.5, [0, .22, 0]);
      part(mast, 'post', ink.pale, 0, .58, 0, 2.71, .16, 2.71, [0, .22, 0]);
      solid(mast, 0, 0, 4.55, 4.55, .66);
      for (const [step, z] of [3.78, 3.45, 3.10].entries()) {
        const top = .165 * (step + 1);
        box(mast, ink.paleTeal, 0, top / 2, z, 1.74, top, .34);
        solid(mast, 0, z, 1.74, .34, top);
      }
      box(mast, ink.paleTeal, 0, .58, 2.65, 1.74, .16, .57);
    }
    const height = kind === 'relay' ? 8.85 : kind === 'array' ? 7.0 : 4.72;
    for (const side of [-1, 1]) {
      beam(mast, ink.dark, [side * 1.35, .40, 1.33], [side * .50, height, .51], .19);
      beam(mast, ink.dark, [side * 1.35, .40, -1.33], [side * .50, height, -.51], .19);
      for (let level = 0; level < 3; level++) {
        const a = height * level / 3;
        const b = height * (level + 1) / 3;
        const foot = 1.34 - level * .28;
        const top = foot - .28;
        beam(mast, ink.steel, [side * foot, a + .4, -foot], [side * top, b, top], .085);
        beam(mast, ink.steel, [-foot, a + .4, side * foot], [top, b, side * top], .085);
      }
    }
    box(mast, ink.teal, 0, height, 0, 1.45, .27, 1.45);
    solid(mast, 0, 0, 2.73, 2.73, height + 1);
    if (kind === 'dish') {
      const dish = group('Radar dish', 0, height + .99, 0, -.42, mast);
      pivots.dish = dish;
      dish.rotation.x = .88;
      beam(mast, ink.steel, [0, height, 0], [0, height + 1, 0], .35, .35, 'drum');
      const coordinates = Array.from({ length: 7 }, (_, i) => {
        const radius = i / 6;
        return new THREE.Vector2(radius * 2.65, radius * radius * .82 - .42);
      });
      const reflector = new THREE.Mesh(new THREE.LatheGeometry(coordinates, 24),
        new THREE.MeshLambertMaterial({ color: ink.paleTeal, side: THREE.DoubleSide, flatShading: true }));
      reflector.name = 'Concave radar reflector';
      dish.add(reflector);
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;
        moving.beam(dish, ink.steel, [0, -.33, 0], [2.62 * Math.cos(angle), .435, 2.62 * Math.sin(angle)], .059);
      }
      for (const side of [-1, 1]) moving.beam(dish, ink.dark, [side * 1.58, -.046, 0], [0, 1.45, 0], .086);
      moving.part(dish, 'post', ink.yellow, 0, 1.46, 0, .17, .39, .17);
    } else if (kind === 'relay') {
      const relay = group('Relay antenna head', 0, height, 0, .28, mast);
      pivots.relay = relay;
      moving.part(relay, 'drum', ink.dark, 0, 1.03, 0, .086, 2.08, .086);
      for (const side of [-1, 1]) {
        moving.beam(relay, ink.pale, [0, 1.12, 0], [side * 1.65, .95, .46], .095);
        for (let j = 0; j < 4; j++) moving.box(relay, ink.steel, side * (.43 + j * .35), 1, .16, .065, .065, 1.1 - j * .16);
      }
      moving.part(relay, 'cap', 0xf47752, 0, 2.13, 0, .11, .11, .11);
    }
  }
  const { x, z } = antennas.find(item => item.kind === 'array');
  const array = group('Rotating radar antenna', x, 7.27, z, -.39);
  pivots.array = array;
  moving.add(array, 'box', ink.dark, 0, .29, 0, .46, .66, .46);
  for (const side of [-1, 1]) {
    moving.add(array, 'box', ink.pale, 0, 1.08 + side * .49, 0, 4.65, .075, .092, [.18, 0, 0]);
    moving.add(array, 'box', ink.dark, side * 2.23, 1.08, 0, .13, 1.07, .087);
  }
  for (let i = -4; i <= 4; i++) moving.add(array, 'box', ink.teal, i * .45, 1.08, 0, .078, 1.03, .097, [.18, 0, 0]);
  for (const y of [.86, 1.09, 1.34]) moving.add(array, 'box', ink.teal, 0, y, 0, 4.45, .034, .074);
  moving.add(array, 'box', ink.yellow, 0, 1.65, 0, .25, .16, .21);
  const control = group('Radar Control Station', radarControl.x, 0, radarControl.z);
  box(control, ink.steel, 0, 1.39, 0, 5.65, 2.78, 4.73);
  box(control, ink.dark, 0, 2.84, 0, 5.93, .23, 5.03);
  box(control, ink.dark, 0, 1.04, 2.409, 1.05, 2.08, .19);
  box(control, ink.glassLight, -1.62, 1.72, 2.42, 1.2, .71, .12);
  box(control, ink.olive, 1.67, .89, 2.45, 1.45, 1.52, .21);
  sign(control, 'RADAR CONTROL', 0, 2.52, 2.48, 4.63, .53);
  solid(control, 0, 0, 5.69, 4.82, 2.98);
  return pivots;
}

function flag(kit, document) {
  const { THREE, group, part, solid } = kit;
  const pole = group('Courtyard flagpole', -20.8, 0, 9.4);
  part(pole, 'drum', ink.footing, 0, .17, 0, .63, .33, .63);
  part(pole, 'post', ink.pale, 0, 3.89, 0, .082, 7.74, .082);
  part(pole, 'cap', ink.yellow, 0, 7.82, 0, .14, .15, .14);
  solid(pole, 0, 0, .28, .28, 7.80);

  const map = paintCanvasTexture(THREE, document, 256, 128, ctx => {
    ctx.fillStyle = '#297f86';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#e7bd61';
    ctx.fillRect(0, 0, 256, 12);
    ctx.fillRect(0, 116, 256, 12);
    ctx.fillStyle = '#e8e4c6';
    ctx.beginPath();
    ctx.moveTo(100, 31);
    ctx.lineTo(156, 31);
    ctx.lineTo(151, 76);
    ctx.lineTo(128, 100);
    ctx.lineTo(105, 76);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#496657';
    ctx.fillRect(112, 51, 32, 9);
    ctx.fillRect(119, 66, 18, 8);
  });
  const width = 3.25;
  const geometry = new THREE.PlaneGeometry(width, 1.61, 13, 3).translate(width / 2, 0, 0);
  const material = new THREE.MeshLambertMaterial({ color: map ? 0xffffff : ink.teal, map, side: THREE.DoubleSide });
  const fabric = new THREE.Mesh(geometry, material);
  fabric.name = 'Animated base flag';
  fabric.position.set(.089, 6.81, 0);
  fabric.rotation.y = -.41;
  pole.add(fabric);
  const position = geometry.attributes.position;
  position.setUsage(THREE.DynamicDrawUsage);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(width / 2, 0, 0), 2.05);
  return time => {
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      position.setZ(i, (x / width) * (.27 * Math.sin(x * 2.48 - time * 3.25) + .13 * Math.sin(x * 4.30 - time * 2.16)));
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
  };
}

function streetSigns(kit) {
  for (const [x, z, yaw, label, sub] of [
    [3.6, 39.8, .24, 'COMMAND AVE', 'HQ  /  FLIGHT LINE'],
    [11.1, 13.1, -.27, 'EAST SERVICES', 'HOSPITAL  →'],
    [13.9, 28.0, .16, 'MOTOR POOL', 'GARAGES  →'],
    [-31.5, 17.3, .26, 'BARRACKS', 'WORKSHOP  /  STORES'],
    [12.3, -21.55, .09, 'FLIGHT LINE', 'HELIPAD  /  RADAR  →'],
    [57.4, 57.2, -.32, 'SOUTH LOOKOUT', 'RAMP  →'],
  ]) {
    const pole = kit.group(label + ' wayfinding', x, 0, z, yaw);
    kit.box(pole, ink.dark, 0, 1.16, 0, .12, 2.33, .14);
    kit.sign(pole, label, 0, 2.14, .10, 3.19, .68, { sub });
    kit.solid(pole, 0, 0, .16, .16, 2.47);
  }
}

function heatingStation(kit) {
  const { group, part, box, beam, solid, sign } = kit;
  const plant = group('Snow-melt plant', -29.5, 0, 41.2, -.19);
  box(plant, ink.footing, 0, .145, 0, 4.06, .29, 8.24);
  for (const [i, z] of [-2.56, 0, 2.56].entries()) {
    part(plant, 'post', 0x4c7082, 0, 1.10, z, 1.03, 1.75, 1.03);
    part(plant, 'drum', i === 1 ? 0xf3bc50 : 0xe39664, 0, 1.99, z, .77, .21, .77);
    part(plant, 'drum', 0x374d58, 0, 2.13, z, .54, .11, .54);
    for (const x of [-.52, .52]) box(plant, 0xdfa564, x, .93, z + .80, .16, 1.17, .16, [.11, 0, 0]);
    if (i < 2) beam(plant, 0x3d6c73, [-.98, .48, z], [-.98, .48, z + 2.65], .16, .16, 'drum');
    solid(plant, 0, z, 2.02, 2.02, 2.21);
  }
  box(plant, ink.dark, 0, 1.03, 4.08, .09, 2.06, .11);
  sign(plant, 'SNOW-MELT PLANT', 0, 1.85, 4.12, 2.82, .49, { style: 'gold' });
  solid(plant, 0, 4.08, .13, .18, 2.06);
}

function medicalSupplies(kit) {
  const { group, box, solid } = kit;
  const stash = group('Field triage supplies', 19.2, 0, -10.67, Math.PI / 2);
  box(stash, ink.teal, 0, .37, 0, 1.37, .74, 6.8);
  box(stash, 0xe5e8d8, 0, .84, 0, 1.53, .22, 6.89);
  for (const z of [-2.17, 0, 2.17]) {
    box(stash, 0xdf8c66, 0, 1.011, z, .85, .18, 1.02);
    box(stash, ink.white, 0, 1.12, z, .14, .045, .53);
    for (const x of [-.15, .15]) box(stash, ink.white, x, 1.12, z, .16, .045, .15);
  }
  solid(stash, 0, 0, 1.53, 6.89, 1.17);
}

export function buildDecorations(kit, moving, document) {
  const { group, box, part, solid } = kit;
  const radarHeads = radar(kit, moving);
  const poseFlag = flag(kit, document);
  fuelFarm(kit);
  heatingStation(kit);
  medicalSupplies(kit);
  streetSigns(kit);
  for (const [x, z, yaw] of [[12, -25, 1.7], [48, -23, -.4], [31, -45, -1.2], [54.7, 37, -1.6],
    [-26.1, 12.3, 1.6], [35.4, 7.6, Math.PI], [56, 10.1, Math.PI], [-10.8, 46.5, Math.PI]]) {
    floodlight(kit, x, z, yaw, 5.0);
  }
  for (const [x, z, yaw] of [[-63.2, 29.7, .18], [11.4, 55, .06], [15.2, 55, -.11],
    [66.88, -21, Math.PI / 2], [-11.1, -58, Math.PI / 2]]) {
    roadblock(kit, x, z, yaw);
  }
  for (const [x, z, yaw, tint] of [
    [-53.5, 42.8, .14, 0xa1a66a], [-38, 34.1, .18, 0x9c9f73], [-16.9, 45.4, -.19, 0x7ca182],
    [motorPool.x + 17.75, motorPool.z + 11.9, .34, 0xa2a66e], [12.8, -45, Math.PI / 2, 0x72a19a],
    [56, -48.4, -.27, 0x8fa377], [41.8, 9.55, .22, 0xa6a96b], [47, 13.15, -.22, 0x91a17e],
    [34.6, -4.7, Math.PI / 2, 0x8c9f81], [-42.4, -45.6, -.26, 0x8ca588], [-55, -27.8, 0, 0x8da477],
    [-33.8, -28.7, .20, 0x99ad86], [-22.5, -33.75, .12, 0x9dad78],
  ]) storage(kit, x, z, yaw, tint);
  drums(kit, -43.1, 33.7, .12, 0x678f88);
  drums(kit, motorPool.x + 18.35, motorPool.z + 6.2, -.25, 0xaba453);
  drums(kit, -47.1, -45.45, .38, 0x6c9c93);
  drums(kit, 63.1, -13.4, .22, 0x83a872);
  tires(kit, -48.5, 33.4);
  tires(kit, motorPool.x + 18.95, motorPool.z + 8.75);
  bench(kit, -39.2, 31.1, Math.PI, true);
  bench(kit, motorPool.x + 18.52, motorPool.z + 13.83, -Math.PI / 2, true);
  bench(kit, -5.1, 10.4, Math.PI / 2);
  bench(kit, -24.8, 9.6, .18);
  bench(kit, 24.5, 5.9, 0);
  bench(kit, 52, -25.8, Math.PI / 2);
  container(kit, 37, -7.3, -.09, 0x68a19c);
  container(kit, 52.6, -9.5, Math.PI / 2, 0xb6b377);
  container(kit, -60, -40.5, .15, 0x84a77f);
  container(kit, 48.7, 56.6, Math.PI / 2, 0x74a69f);

  const yard = group('West training court', -14.95, 0, -35.5, -.15);
  const random = seededRandom(9013);
  for (const side of [-1, 1]) {
    for (const z of [-4.8, -1.4, 2.4, 5.3]) {
      const x = side * (3.69 + random() * .52);
      part(yard, 'post', ink.sand, x, .30, z, .24, .58, .24);
      part(yard, 'cap', 0x74a16f, x, .59, z, .50, .51, .49);
      solid(yard, x, z, .74, .75, .96);
    }
  }
  for (const z of [-3.15, -.20, 2.82]) {
    for (const side of [-1, 1]) {
      box(yard, ink.teal, side * 1.82, .62, z, .16, 1.25, .16);
      solid(yard, side * 1.82, z, .22, .22, 1.25);
    }
    box(yard, ink.sand, 0, 1.16, z, 3.81, .14, .145);
    solid(yard, 0, z, 3.81, .145, 1.22);
  }
  for (const x of [-2.64, 2.64]) stripe(kit, yard, x, -.4, .15, 11, 0xb7b88e);
  kit.sign(yard, 'TRAINING COURT', 0, 1.73, 6.15, 4.33, .66);
  for (const x of [-1.7, 1.7]) {
    box(yard, ink.dark, x, .84, 6.15, .094, 1.68, .11);
    solid(yard, x, 6.15, .13, .15, 1.69);
  }
  return { radarHeads, poseFlag };
}
