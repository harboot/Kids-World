import { SURFACE_GAP } from '../../core/geometry.js';
import { headquarters, hospital, motorPool, supplyDepot } from './layout.js';
import { hazard } from './roads.js';
import { ink } from './scenery.js';
import { buildBarracks } from './barracks.js';

export function window(kit, wall, x, y, z, width, height) {
  const { box } = kit;
  box(wall, ink.dark, x, y, z + .045, width + .22, height + .20, .17);
  box(wall, 0xe6c88c, x, y, z + .14, width, height, .05, [], true);
  box(wall, 0xffe9b5, x, y + height * .30, z + .175, width - .05, height * .18, .016, [], true);
  for (const side of [-1, 1]) box(wall, ink.steel, x + side * width * .177, y, z + .188, .063, height, .035);
  box(wall, ink.paleTeal, x, y - height / 2 - .08, z + .17, width + .18, .12, .28);
}

export function shutter(kit, wall, x, y, z, width, height, tint = ink.steel) {
  const { box } = kit;
  box(wall, ink.dark, x, y, z + .04, width + .33, height + .20, .24);
  box(wall, tint, x, y, z + .17, width, height, .14);
  const seams = Math.ceil(height / .32);
  for (let i = 1; i < seams; i++) {
    box(wall, ink.dark, x, y - height / 2 + i * height / seams, z + .242 + SURFACE_GAP.detail, width - .08, .035, .023);
  }
  for (const side of [-1, 1]) {
    box(wall, ink.sand, x + side * (width / 2 + .1), y, z + .22, .13, height + .05, .14);
  }
  box(wall, ink.yellow, x, y - height * .33, z + .28, Math.min(.52, width * .3), .09, .09);
}

function vent(kit, wall, x, y, z, width, height) {
  const { box } = kit;
  box(wall, ink.footing, x, y, z + .05, width, height, .25);
  for (let i = -2; i <= 2; i++) {
    box(wall, ink.dark, x, y + i * height * .154, z + .18 + SURFACE_GAP.detail, width * .84, .04, .035);
  }
}

function step(kit, node, x, z, width, depth, top, tint = ink.concrete) {
  kit.box(node, tint, x, top / 2, z, width, top, depth);
  kit.solid(node, x, z, width, depth, top);
}

export function cross(kit, node, x, y, z, size, tint = ink.red) {
  const { box } = kit;
  box(node, tint, x, y, z, size * .31, size, .07);
  for (const side of [-1, 1]) box(node, tint, x + side * size * .3275, y, z, size * .345, size * .31, .07);
}

function command(kit) {
  const { group, part, box, beam, sign, solid, groundShadow } = kit;
  const { x, z, width, depth, yaw } = headquarters;
  const hq = group('Central Headquarters', x, 0, z, yaw);
  const face = depth / 2;
  const rear = 2.3;
  groundShadow(hq, 1.6, -1.18, 24.5, 23.8);
  box(hq, 0xb5c7be, 0, 3.40, (rear - face) / 2, width, 6.8, rear + face);
  solid(hq, 0, (rear - face) / 2, width, rear + face, 6.8);
  box(hq, 0xa7c1b5, 0, 5.62, (face + rear) / 2, width, 2.36, face - rear);
  for (const side of [-1, 1]) {
    box(hq, 0xcbd3bf, side * 7.28, 2.23, (face + rear) / 2, 5.44, 4.46, face - rear);
    solid(hq, side * 7.28, (face + rear) / 2, 5.44, face - rear, 4.46);
    box(hq, ink.footing, side * 7.28, .35, (face + rear) / 2, 5.50, .70, face - rear + .16);
    box(hq, ink.teal, side * 7.32, 1.15, face + .033, 5.40, .48, .15);
    for (const k of [5.75, 8.4]) {
      window(kit, hq, side * k, 2.74, face, 1.7, 1.28);
      window(kit, hq, side * k, 5.38, face, 1.55, .87);
    }
    const wall = group('Headquarters side facade', side * width / 2, 0, 0, side * Math.PI / 2, hq);
    for (const k of [-6.5, -2.15, 2.15, 6.6]) {
      window(kit, wall, k, 2.59, 0, 2.7, 1.15);
      box(wall, ink.teal, k, 1.35, .095, 2.78, .33, .11);
    }
    for (const k of [4.29, 9.15]) {
      part(hq, 'podium', 0xe5e7d3, side * k, 2.18, face + .59, .68, 4.38, .82, [0, Math.PI / 8, 0]);
      solid(hq, side * k, face + .59, 1.33, 1.62, 4.37);
      box(hq, ink.teal, side * k, 4.31, face + .59, 1.05, .22, 1.24);
    }
    const wing = group('Tapered headquarters wing', side * 7.1, 0, -2.2, side * -.055, hq);
    part(wing, 'podium', 0x498d79, 0, 7.07, 0, 3.95, 1.13, 6.71, [0, Math.PI / 8, 0]);
    part(wing, 'octagon', ink.paleTeal, 0, 7.68, 0, 3.10, .20, 5.64, [0, Math.PI / 8, 0]);
    vent(kit, wing, 0, 8.03, -2.69, 1.77, .37);
  }

  part(hq, 'octagon', 0x438674, 0, 6.84, .01, 10.16, .51, 9.36, [0, Math.PI / 8, 0]);
  part(hq, 'podium', 0x70beaa, 0, 8.08, -.9, 7.74, 2.19, 7.41, [0, Math.PI / 8, 0]);
  part(hq, 'octagon', 0xc8e3cf, 0, 9.20, -.9, 6.28, .39, 5.87, [0, Math.PI / 8, 0]);
  part(hq, 'podium', 0x5ca894, 0, 10.19, -.9, 6.12, 1.63, 5.67, [0, Math.PI / 8, 0]);
  part(hq, 'octagon', 0x447e7d, 0, 11.46, -.9, 5.02, 1.51, 4.78, [0, Math.PI / 8, 0]);
  for (let i = 0; i < 4; i++) {
    const side = i * Math.PI / 2;
    const deck = group('Command observation bay', Math.sin(side) * 4.29, 0, -.9 + Math.cos(side) * 4.29, side, hq);
    box(deck, ink.dark, 0, 11.48, .19, 4.35, 1.37, .39);
    box(deck, 0x75b8c0, 0, 11.56, .41, 3.94, .84, .075);
    box(deck, 0xd5dbc7, 0, 10.78, .45, 4.6, .16, .52);
    for (const cx of [-1.31, 0, 1.31]) {
      box(deck, 0x426a6d, cx, 11.56, .473, .092, .88, .06);
    }
    box(deck, ink.yellow, 0, 12.16, .43, 1.0, .12, .17);
  }
  part(hq, 'octagon', 0x3b8e86, 0, 12.47, -.9, 5.45, .65, 5.02, [0, Math.PI / 8, 0]);
  part(hq, 'dome', 0x4eb2a3, 0, 12.8, -.9, 4.50, 2.22, 4.12);
  part(hq, 'octagon', 0x84cbc0, 0, 12.94, -.9, 4.58, .22, 4.23, [0, Math.PI / 8, 0]);
  const mast = group('HQ command mast', .25, 14.93, -1.30, 0, hq);
  part(mast, 'drum', 0x476a6f, 0, .14, 0, .38, .30, .38);
  beam(mast, ink.steel, [0, .12, 0], [0, 2.38, 0], .085, .085, 'drum');
  beam(mast, ink.pale, [-.88, 1.47, 0], [.88, 1.47, 0], .083);
  part(mast, 'cap', 0xffbd55, 0, 2.38, 0, .15, .21, .15, [], true);
  const dish = group('HQ satellite uplink', -6.68, 7.75, -.2, -.53, hq);
  part(dish, 'post', ink.dark, 0, .54, 0, .24, 1.08, .24);
  part(dish, 'cap', ink.paleTeal, 0, 1.34, 0, 1.39, .22, 1.4, [.63, 0, 0]);
  beam(dish, ink.yellow, [0, 1.37, 0], [0, 1.96, .49], .11);

  // Each riser stays below Core's step limit and the floor ends at the rear wall.
  for (const [i, dz] of [2.26, 1.57, .88].entries()) step(kit, hq, 0, face + dz, 6.4, .69, .17 * (i + 1), ink.pale);
  const landing = face + .535;
  step(kit, hq, 0, (landing + rear) / 2, 9.03, landing - rear, .68, 0xd8dfce);
  box(hq, 0x308b83, 0, 4.52, face + .82, 8.75, .48, 2.72);
  box(hq, ink.paleTeal, 0, 4.40, face + 2.195, 8.8, .16, .12);
  for (const side of [-1, 1]) {
    box(hq, ink.glassLight, side * 3.78, 2.26, face - .25, 1.42, 2.48, .18);
    box(hq, ink.dark, side * 3.10, 2.30, face - .255, .12, 2.98, .22);
    solid(hq, side * 3.78, face - .25, 1.42, .24, 3.52);
    box(hq, ink.white, side * 2.42, 4.25, face + .83, .71, .07, .25, [], true);
  }
  box(hq, ink.footing, 0, 2.63, rear + .02, 8.96, 3.93, .15);
  shutter(kit, hq, 0, 1.85, rear + .105, 1.60, 2.34, ink.teal);
  sign(hq, 'OPERATIONS', 0, 3.59, rear + .14, 3.73, .58, { sub: 'STAFF ACCESS', style: 'gold' });
  sign(hq, 'HEADQUARTERS', 0, 5.59, face + .15, 7.1, 1.52, { sub: 'GLACIER COMMAND' });
  part(hq, 'tip', ink.yellow, 0, 6.61, face + .34, .93, .48, .13, [0, 0, Math.PI]);
  box(hq, ink.yellow, 0, 6.76, face + .34, 1.72, .13, .13);
}

function roundHall(kit, { name, x, z, width, depth, tint, yaw = 0, hangar = false, service = false, open = false }) {
  const { group, part, box, sign, solid } = kit;
  const building = group(name, x, 0, z, yaw);
  kit.groundShadow(building, .7, -1.0, width + 3.8, depth + 4.4);
  const front = depth / 2;
  const height = hangar ? 3.55 : service ? 3.25 : 2.75;
  const rise = hangar ? 4.4 : 2.65;
  step(kit, building, 0, 0, width + .72, depth + .9, .135, ink.footing);
  const entry = width * .65;
  const roomDepth = 5.8;
  if (open) {
    box(building, tint, 0, height / 2 + .12, -roomDepth / 2, width, height, depth - roomDepth);
    solid(building, 0, -roomDepth / 2, width, depth - roomDepth, height + rise + .15);
    const wing = (width - entry) / 2;
    for (const side of [-1, 1]) {
      const x = side * (entry + wing) / 2;
      box(building, tint, x, height / 2 + .12, front - roomDepth / 2, wing, height, roomDepth);
      solid(building, x, front - roomDepth / 2, wing, roomDepth, height + rise + .15);
    }
    box(building, ink.footing, 0, height + .015, front - .024, entry, .234, .34);
    box(building, ink.pale, 0, height - .071, front - 2.1, 1.85, .055, .22, [], true);
    box(building, 0x477d73, 0, .91, front - roomDepth + .08, 3.54, 1.31, .15);
    for (const x of [-1.12, 0, 1.12]) {
      box(building, ink.yellow, x, 1.27, front - roomDepth + .178, .36, .32, .075);
    }
  } else {
    box(building, tint, 0, height / 2 + .12, 0, width, height, depth);
    solid(building, 0, 0, width, depth, height + rise + .15);
  }
  part(building, 'arch', tint, 0, height + .11, 0, width, rise, depth);
  part(building, 'arch', service ? 0x5bb88c : 0x54a987, 0, height + .13, 0, width + .37, rise + .21, depth - .29);
  for (let zz = -front + .62; zz < front - .43; zz += hangar ? 1.4 : 1.25) {
    part(building, 'arch', 0x70bd9f, 0, height + .14, zz, width + .51, rise + .24, .092);
  }
  for (const side of [-1, 1]) {
    part(building, 'arch', ink.teal, 0, height + .12, side * (front - .07), width + .60, rise + .34, .27);
    part(building, 'arch', tint, 0, height + .105, side * (front + .06), width -.11, rise -.07, .12);
    box(building, ink.paleTeal, side * (width / 2 + .05), height + .02, 0, .15, .18, depth + .31);
    const wall = group(name + ' side', side * width / 2, 0, 0, side * Math.PI / 2, building);
    for (let k = -front + 2; k < front - 1.2; k += 3.65) window(kit, wall, k, height * .58, 0, 1.94, .73);
  }
  if (hangar) {
    shutter(kit, building, 0, 2.22, front, width * .7, 4.13, 0x4f7575);
    sign(building, 'FLIGHT HANGAR', 0, 5.64, front + .19, 7.68, 1.10, { sub: 'AIR OPERATIONS' });
    for (const side of [-1, 1]) vent(kit, building, side * width * .42, 2.5, front, 1.35, .8);
  } else if (service) {
    if (!open) shutter(kit, building, 0, 1.59, front, entry, 3.01, 0x648981);
    sign(building, name.toUpperCase(), 0, 3.84, front + .19, width * .64, .68);
    box(building, ink.paleTeal, 0, height + .05, front + .20, width * .77, .15, .34);
    for (const side of [-1, 1]) {
      box(building, ink.paleTeal, side * width * .412, 1.62, front + .17, .35, 3.22, .41);
      box(building, ink.yellow, side * width * .417, .74, front + .416, .19, .34, .061);
    }
    box(building, 0x5ba68d, width * .36, height + 1.23, -depth * .21, 1.28, 2.48, 1.86);
    box(building, ink.paleTeal, width * .36, height + 2.50, -depth * .21, 1.48, .21, 2.05);
    part(building, 'drum', ink.dark, width * .36, height + 2.62, -depth * .21, .48, .09, .48);
    part(building, 'arch', 0xd5e1cb, 0, height + .135, -depth * .22, width + .40, rise + .275, .76);
  } else {
    shutter(kit, building, 0, 1.26, front, 1.64, 2.22, 0x668982);
    sign(building, name.toUpperCase(), 0, 3.69, front + .19, 4.9, .77);
    for (const side of [-1, 1]) window(kit, building, side * width * .28, 1.65, front, 2.0, 1.01);
  }
}

function utilityHall(kit, { x, z, width, depth, name, tint, yaw = 0, logistics = false }) {
  const { group, part, box, solid, sign } = kit;
  const hall = group(name, x, 0, z, yaw);
  kit.groundShadow(hall, .5, -.75, width + 3.6, depth + 4.8);
  const front = depth / 2;
  box(hall, tint, 0, 2.24, 0, width, 4.48, depth);
  box(hall, ink.footing, 0, .39, .04, width + .16, .78, depth + .08);
  solid(hall, 0, 0, width, depth, 5.75);
  part(hall, 'crown', ink.roof, 0, 4.47, 0, width + 1.04, 1.23, depth + 1.08);
  box(hall, ink.moss, 0, 5.7, 0, (width + 1.04) * .69, .17, depth + 1.12);
  for (const side of [-1, 1]) {
    part(hall, 'crown', 0x8eb19b, 0, 4.47, side * depth * .36, width + 1.10, 1.29, .16);
    box(hall, 0xb8c6af, side * width * .20, 5.95, -.89, 1.52, .43, 1.62);
    box(hall, ink.steel, side * width * .20, 6.202, -.89, 1.66, .16, 1.77);
    for (const d of [-.44, 0, .44]) {
      box(hall, 0xb1c9b4, side * width * .20, 6.329, -.89 + d, 1.35, .10, .12);
    }
  }
  for (const side of [-1, 1]) {
    box(hall, ink.pale, side * (width / 2 - .43), 2.19, front + .055, .39, 4.38, .20);
    vent(kit, hall, side * width * .34, 2.92, front, 1.43, .77);
    const wall = group(name + ' side', side * width / 2, 0, 0, side * Math.PI / 2, hall);
    for (let k = -front + 1.8; k < front - 1; k += 3.15) window(kit, wall, k, 2.78, 0, 1.81, 1.08);
  }
  shutter(kit, hall, 0, logistics ? 2.09 : 1.83, front, 5.25, 3.32);
  sign(hall, name.toUpperCase(), 0, 4.05, front + .15, width * .61, .73);
  box(hall, ink.teal, 0, 3.54, front + 1.27, width * .82, .17, 2.26);
  for (const side of [-1, 1]) box(hall, ink.white, side * width * .25, 3.431, front + 1.62, .82, .045, .20, [], true);
  if (logistics) {
    step(kit, hall, 0, front + 1.14, 11.7, 2.26, .475, ink.footing);
    step(kit, hall, 4.0, front + 2.57, 2.85, .60, .315, ink.concrete);
    step(kit, hall, 4.0, front + 3.16, 2.85, .58, .155, ink.pale);
    hazard(kit, hall, -2.3, front + 2.12, 6.6, .28, .475 + SURFACE_GAP.detail);
    hazard(kit, hall, -2.2, front + 3.53, 6.7, .38);
  }
}

function tankGarage(kit) {
  const { group, box, part, sign, solid } = kit;
  const garage = group('Motor Pool Garage', motorPool.x, 0, motorPool.z);
  kit.groundShadow(garage, 1.0, -1.15, 38.9, 19.15);
  const front = 7.35;
  const openCenter = 11.0;
  const openWidth = 9.2;
  const wall = 0xb7cbb9;
  box(garage, wall, 0, 2.75, -3.24, 34, 5.5, 8.22);
  solid(garage, 0, -3.24, 34, 8.22, 5.5);
  box(garage, wall, -5.3, 2.75, 4.08, 23.4, 5.5, 6.54);
  solid(garage, -5.3, 4.08, 23.4, 6.54, 5.5);
  box(garage, wall, 16.34, 2.75, 4.06, 1.32, 5.5, 6.58);
  solid(garage, 16.34, 4.06, 1.32, 6.58, 5.5);
  box(garage, ink.teal, 0, 5.11, front - .09, 34.3, .79, .60);
  box(garage, ink.roof, 0, 5.58, -.02, 35, .31, 15.6);
  for (const [bay, center] of [-11.24, 0, 11.24].entries()) {
    const color = bay === 2 ? 0x40997e : 0x55a771;
    part(garage, 'gable', color, center, 5.69, -.1, 11.13, 2.75, 14.96);
    part(garage, 'gable', 0xabcab9, center, 5.70, 7.46, 11.23, 2.80, .28);
    part(garage, 'gable', 0x408477, center, 5.76, 7.64, 9.87, 2.33, .16);
    for (const z of [-4.72, .08, 4.59]) {
      part(garage, 'gable', 0x81c4a4, center, 5.70, z, 11.2, 2.81, .17);
    }
    box(garage, ink.paleTeal, center, 8.49, -.1, .19, .13, 14.89);
    box(garage, ink.dark, center, 6.48, 7.75, 4.50, .57, .08);
    for (const x of [-1.38, 0, 1.38]) box(garage, 0xffe0a4, center + x, 6.48, 7.806, 1.18, .36, .044, [], true);
    box(garage, ink.footing, center + 1.45, 7.89, -2.64, 2.02, .27, 1.35);
    box(garage, bay === 2 ? ink.yellow : 0xdf8662, center + 1.45, 8.06, -2.64, 1.31, .15, .87);
  }
  for (const x of [-11, 0]) shutter(kit, garage, x, 2.14, front, 8.6, 3.96, x ? 0x63837b : 0x557674);
  for (const x of [-16.2, -5.5, 5.5, 16.1]) box(garage, ink.paleTeal, x, 2.55, front + .18, .30, 5.1, .28);
  sign(garage, 'MOTOR POOL', -5.6, 5.08, front + .39, 7.9, .57, { sub: 'HEAVY VEHICLE GARAGE' });
  sign(garage, 'SERVICE BAY', openCenter, 5.10, front + .39, 6.8, .57, { style: 'gold' });
  for (const x of [-1, 1].map(side => openCenter + side * (openWidth / 2 - .1))) {
    box(garage, ink.yellow, x, 2.17, front + .11, .14, 4.28, .18);
    box(garage, ink.white, x + (openCenter - x) * .50, 5.38, 4.16, 1.1, .052, .20, [], true);
  }
  for (const x of [8.0, 14.0]) {
    box(garage, ink.yellow, x, .041, 3.76, .105, .012, 5.37);
  }
  hazard(kit, garage, openCenter, front + .66, openWidth - .7, .34);
  box(garage, ink.olive, 7.31, .56, 2.05, .69, 1.1, 2.2);
  box(garage, ink.dark, 7.31, 1.13, 2.05, .78, .10, 2.25);
  solid(garage, 7.31, 2.05, .78, 2.25, 1.18);
  box(garage, ink.footing, openCenter, 1.39, .93, 3.61, 1.62, .12);
  for (const [i, y] of [1.15, 1.61, 2.04].entries()) {
    box(garage, i % 2 ? ink.sand : ink.dark, openCenter, y, 1.03, 3.15, .09, .13);
    for (const x of [openCenter - 1.03, openCenter, openCenter + 1.03]) {
      box(garage, ink.yellow, x, y + .15, 1.05, .36, .24, .17);
    }
  }
  for (const x of [8.65, 13.35]) {
    box(garage, ink.steel, x, .069, 4.55, .25, .14, 4.39);
    solid(garage, x, 4.55, .25, 4.39, .139);
    box(garage, ink.yellow, x, .14 + SURFACE_GAP.detail, 6.63, .26, .023, .27);
  }
  for (const side of [-1, 1]) {
    const end = group('Garage side', side * 17, 0, -.1, side * Math.PI / 2, garage);
    for (const x of [-4.6, 0, 4.6]) window(kit, end, x, 3.8, 0, 2.7, 1.1);
  }
}

function fieldHospital(kit) {
  const { group, box, part, solid, sign, groundShadow } = kit;
  const clinic = group('Field Hospital', hospital.x, 0, hospital.z, -.14);
  const color = 0xe8eee7;
  groundShadow(clinic, 1.1, -.9, 19.8, 14.8);
  box(clinic, color, 0, 1.62, 0, 14, 3.24, 10.2);
  solid(clinic, 0, 0, 14, 10.2, 5.64);
  box(clinic, 0x78b59d, 0, .58, 0, 14.12, 1.16, 10.28);
  part(clinic, 'arch', color, 0, 3.20, 0, 14.49, 2.14, 10.68);
  for (const z of [-4.79, -.49, 4.79]) {
    part(clinic, 'arch', 0xd2e5dd, 0, 3.24, z, 14.55, 2.2, .19);
  }
  box(clinic, color, 0, 5.31, -.68, 4.25, .17, 4.0);
  box(clinic, 0x50af78, 0, 5.43, -.68, .88, .08, 2.93);
  for (const side of [-1, 1]) {
    box(clinic, 0x50af78, side * .96, 5.43, -.68, 1.04, .08, .88);
    window(kit, clinic, side * 4.62, 2.51, 5.1, 2.37, 1.19);
    const wall = group('Hospital side', side * 7, 0, 0, side * Math.PI / 2, clinic);
    for (const x of [-3.25, 0, 3.25]) window(kit, wall, x, 2.24, 0, 2.05, 1.17);
    box(clinic, 0x5eb59b, side * 1.91, 1.52, 6.25, .21, 3.05, .25);
    solid(clinic, side * 1.91, 6.25, .25, .29, 3.05);
  }
  shutter(kit, clinic, 0, 1.32, 5.11, 2.56, 2.47, 0x72ab9f);
  box(clinic, 0x669e8e, 0, 3.00, 5.96, 4.30, .20, 1.85, [.12, 0, 0]);
  sign(clinic, 'FIELD HOSPITAL', 0, 3.76, 5.41, 5.8, .69, { style: 'medical' });
  box(clinic, ink.white, -4.84, 3.68, 5.34, 1.34, 1.23, .19);
  cross(kit, clinic, -4.84, 3.68, 5.45, .93, 0x48a674);
}

function signalStation(kit) {
  const { group, part, box, beam, solid, sign, groundShadow } = kit;
  const hut = group('Weather and communications lodge', -12, 0, 33.2, -.16);
  groundShadow(hut, .8, -.6, 13.0, 12.4);
  part(hut, 'octagon', 0x9cafa9, 0, .25, 0, 5.13, .50, 4.83, [0, Math.PI / 8, 0]);
  part(hut, 'octagon', 0x66a988, 0, 2.05, 0, 4.72, 3.25, 4.39, [0, Math.PI / 8, 0]);
  part(hut, 'octagon', 0x6dc1ad, 0, 3.74, 0, 5.03, .46, 4.74, [0, Math.PI / 8, 0]);
  part(hut, 'dome', 0x399b95, 0, 3.93, 0, 4.04, 3.08, 3.92);
  part(hut, 'octagon', 0xbdd6b0, 0, 4.12, 0, 4.09, .27, 3.94, [0, Math.PI / 8, 0]);
  part(hut, 'drum', 0xd2a957, 0, 6.98, 0, .65, .27, .65);
  beam(hut, ink.yellow, [0, 7, 0], [.48, 8.7, -.12], .109);
  beam(hut, ink.pale, [-.72, 7.92, -.08], [1.38, 8.1, -.08], .075);
  shutter(kit, hut, 0, 1.45, 4.06, 1.74, 2.42, 0x3b8884);
  sign(hut, 'SIGNAL LODGE', 0, 3.17, 4.19, 3.8, .58);
  for (const side of [-1, 1]) window(kit, hut, side * 2.60, 2.32, 4.04, 1.22, .82);
  solid(hut, 0, 0, 8.72, 8.16, 5.4);
}

function airControl(kit) {
  const { group, box, solid, part, sign } = kit;
  const tower = group('Air Traffic Control', 53.4, 0, -32.5);
  box(tower, ink.footing, 0, .34, 0, 6.15, .68, 5.95);
  box(tower, ink.teal, 0, 3.82, 0, 4.15, 7.64, 3.95);
  solid(tower, 0, 0, 4.21, 4.04, 10.0);
  solid(tower, 0, 0, 6.15, 5.95, .68);
  box(tower, ink.dark, 0, 7.34, 0, 7.01, .44, 6.45);
  box(tower, ink.glass, 0, 8.28, 0, 6.5, 1.64, 5.96);
  box(tower, ink.roof, 0, 9.28, 0, 7.21, .42, 6.61);
  for (const side of [-1, 1]) {
    for (const x of [-3.08, -1.04, 1.04, 3.08]) box(tower, ink.paleTeal, x, 8.33, side * 3.01, .12, 1.61, .115);
    for (const z of [-2.78, -.91, .91, 2.78]) box(tower, ink.paleTeal, side * 3.28, 8.33, z, .115, 1.61, .12);
    box(tower, 0xffe0a4, 0, 8.76, side * 3.01, 6.19, .15, .05, [], true);
  }
  for (const y of [2.4, 4.02, 5.65]) window(kit, tower, 0, y, 1.98, .85, .68);
  shutter(kit, tower, 0, 1.11, 2, 1.3, 2.1);
  sign(tower, 'AIR CONTROL', 0, 6.7, 2.14, 3.75, .62);
  part(tower, 'post', ink.dark, 2.01, 10.26, 1.52, .085, 1.6, .085);
  part(tower, 'cap', 0xff7451, 2.01, 11.1, 1.52, .15, .15, .15, [], true);
}

export function buildBuildings(kit) {
  command(kit);
  tankGarage(kit);
  for (const [i, x] of [-50.4, -39.5, -28.1].entries()) {
    roundHall(kit, {
      name: 'Service Shed 0' + (i + 1), x, z: -35.3 + i * .73, width: 9.35, depth: 12.1,
      tint: i % 2 ? 0x48a88c : 0x64ac75, yaw: -.10, service: true, open: i !== 1,
    });
  }
  buildBarracks(kit, { name: 'Barracks 01', x: -45.8, z: -8.2, width: 10.8, depth: 14, tint: 0x73ac73, yaw: 1.49 });
  buildBarracks(kit, { name: 'Barracks 02', x: -44.6, z: 7.15, width: 10.45, depth: 15, tint: 0x60ad92, yaw: 1.45 });
  utilityHall(kit, { name: 'Maintenance', x: -44, z: 25, width: 14.6, depth: 11.2, tint: 0x84aa91, yaw: -.12 });
  utilityHall(kit, { name: 'Equipment Stores', x: -48.7, z: 39, width: 12.4, depth: 7.3, tint: 0xacbb9b, yaw: 1.56 });
  roundHall(kit, { name: 'Helicopter Hangar', x: 43, z: -44.9, width: 22.8, depth: 8, tint: 0x71b5a0, hangar: true });
  airControl(kit);
  fieldHospital(kit);
  signalStation(kit);
  utilityHall(kit, { name: 'Supply Depot', ...supplyDepot, width: 17, depth: 13, tint: 0x80ad87, logistics: true });
}
