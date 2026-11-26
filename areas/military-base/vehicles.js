import { cross } from './buildings.js';
import { motorPool, repairTank, surveyPads } from './layout.js';
import { ink } from './scenery.js';
import { buildCompactTank } from './compact-tank.js';
import { buildDrivableJeep } from './jeep.js';

function wheel(kit, parent, x, y, z, radius, width) {
  const { part } = kit;
  part(parent, 'drum', ink.rubber, x, y, z, radius, width, radius, [0, 0, Math.PI / 2]);
  const side = Math.sign(x);
  part(parent, 'drum', 0x829083, x + side * (width / 2 + .026), y, z, radius * .61, .055, radius * .61, [0, 0, Math.PI / 2]);
  part(parent, 'drum', ink.dark, x + side * (width / 2 + .068), y, z, radius * .23, .052, radius * .23, [0, 0, Math.PI / 2]);
}

function tank(kit, name, x, z, yaw, tint, moving) {
  const { group } = kit;
  const repair = Boolean(moving);
  const { part, box, beam } = moving ?? kit;
  const solid = moving ? kit.movingSolid : kit.solid;
  const lift = repair ? .24 : 0;
  const ground = group(name, x, 0, z, yaw);
  (moving ?? kit).groundShadow(ground, .51, -.32, 5.08, 7.88, .061);
  const vehicle = group('Tank body', 0, lift, 0, 0, ground);
  for (const side of [-1, 1]) {
    const xx = side * 1.35;
    part(vehicle, 'track', ink.rubber, xx, .55, 0, 5.2, 1.08, .82, [0, Math.PI / 2, 0]);
    for (let k = -2; k <= 2; k++) {
      if (repair && side === 1 && k === 1) continue;
      const zz = k * .91;
      part(vehicle, 'drum', 0x6f7d60, xx + side * .424, .52 + (Math.abs(k) === 2 ? .08 : 0), zz, .39, .092, .39, [0, 0, Math.PI / 2]);
      part(vehicle, 'drum', ink.dark, xx + side * .478, .52 + (Math.abs(k) === 2 ? .08 : 0), zz, .15, .05, .15, [0, 0, Math.PI / 2]);
    }
    for (let i = -5; i <= 5; i++) box(vehicle, 0x465253, xx, 1.108, i * .42, .81, .055, .095);
    box(vehicle, ink.moss, xx, 1.25, -.02, .91, .18, 4.92);
    box(vehicle, ink.white, side * 1.23, 1.35, 2.40, .27, .18, .16);
    box(vehicle, ink.red, side * 1.24, 1.24, -2.57, .23, .18, .12);
  }
  part(vehicle, 'track', tint, 0, 1.23, 0, 5.35, 1.22, 2.64, [0, Math.PI / 2, 0]);
  const engineCover=group(name+' engine cover',0,1.69,-1.73,0,vehicle);
  box(engineCover, ink.moss, 0, 0, 0, 1.88, .24, 1.27);
  for (const i of [-2, -1, 0, 1, 2]) box(engineCover, ink.dark, i * .27, .133, -.11, .10, .026, 1.11);
  if(repair) {
    box(vehicle,ink.dark,0,1.74,-1.73,1.76,.12,1.16);
    for(const x of [-.48,0,.48]) box(vehicle,ink.steel,x,1.78,-1.73,.29,.10,.73);
  }
  part(vehicle, 'drum', ink.dark, 0, 1.88, .22, .94, .25, .84);
  const turret = group(name + ' turret', 0, 1.97, .17, repair ? -.21 : .16, vehicle);
  part(turret, 'track', tint, 0, .31, -.05, 2.34, .82, 2.01, [0, Math.PI / 2, 0]);
  box(turret, ink.olive, 0, .72, -.27, 1.54, .12, 1.20);
  box(turret, ink.moss, 0, .32, 1.04, .84, .52, .35);
  beam(turret, ink.moss, [0, .37, 1.10], [0, .43, 3.36], .125, .125, 'drum');
  beam(turret, tint, [0, .415, 2.74], [0, .44, 3.53], .17, .17, 'drum');
  part(turret, 'drum', ink.dark, 0, .44, 3.54, .113, .026, .113, [Math.PI / 2, 0, 0]);
  part(turret, 'drum', ink.dark, -.51, .83, -.5, .39, .15, .37);
  part(turret, 'drum', tint, -.51, .92, -.5, .33, .084, .31);
  box(turret, ink.yellow, .40, .788, -.49, .35, .045, .23);
  for (const side of [-1, 1]) box(vehicle, 0xa8ca72, side * 1.37, 1.36, -.45, .55, .058, 1.11);
  beam(turret, ink.dark, [.77, .67, -.79], [.86, 1.74, -.86], .025);
  const hullSolid = solid(vehicle, 0, 0, 3.55, 5.25, 2.85);
  // A separate narrow footprint follows the overhanging part of the barrel.
  const barrelSolid = solid(turret, 0, 2.93, .28, 1.30, .58);
  if (!repair) return;
  const support = group('Tank jack stands', 0, 0, 0, 0, ground);
  for (const xx of [-1.37, 1.37]) {
    box(support, ink.yellow, xx, .14, .91, .90, .28, .68);
    box(support, ink.dark, xx, .049, .91, 1, .10, .76);
  }
  const looseWheel=group('Loose tank road wheel',2.60,.40,.83,0,ground);
  part(looseWheel,'drum',ink.rubber,0,0,0,.38,.25,.38,[0,0,Math.PI/2]);
  part(looseWheel,'drum',0x829083,.151,0,0,.23,.055,.23,[0,0,Math.PI/2]);
  part(looseWheel,'drum',ink.dark,.193,0,0,.09,.052,.09,[0,0,Math.PI/2]);
  const wheelSolid = solid(support, 2.60, .83, .30, .75, .79);
  const restoredWheel = group('Installed road wheel', 0, 0, 0, 0, vehicle);
  part(restoredWheel, 'drum', 0x6f7d60, 1.774, .52, .91, .39, .092, .39, [0, 0, Math.PI / 2]);
  part(restoredWheel, 'drum', ink.dark, 1.828, .52, .91, .15, .05, .15, [0, 0, Math.PI / 2]);
  const headlights = group('Repaired tank headlights', 0, 0, 0, 0, vehicle);
  for (const side of [-1, 1]) box(headlights, 0xffe8a0, side * 1.23, 1.35, 2.49, .24, .145, .05);
  const smoke = Array.from({ length: 6 }, (_, i) => {
    const puff = group('Tank exhaust puff', 0, 0, 0, 0, ground);
    part(puff, 'cap', i % 2 ? 0xa5b5b7 : 0x7c929c, 0, 0, 0, .50, .39, .49);
    return puff;
  });
  const parkingDistance = 5.04;
  return {
    ground,
    parkingDistance,
    pose(distance, engineTime = 0, motes = true) {
      const start = engineTime === 0;
      const raw = Math.min(1, engineTime / 1.4);
      const settle = raw*raw*(3-2*raw);
      ground.position.set(x + Math.sin(yaw) * distance, 0, z + Math.cos(yaw) * distance);
      vehicle.position.y = lift * (1 - settle);
      turret.position.set(.42*(1-settle),1.97+.55*(1-settle),.17-.22*(1-settle));
      turret.rotation.y = -.21 - .48*(1-settle);
      engineCover.position.set(0,1.69+.48*(1-settle),-1.73-.21*(1-settle));
      engineCover.rotation.x = -.9*(1-settle);
      support.scale.setScalar(raw < 1 ? 1 : 0);
      looseWheel.position.set(2.60+(1.79-2.60)*settle,.40+(.52-.40)*settle,.83+(.91-.83)*settle);
      looseWheel.scale.setScalar(raw < 1 ? 1 : 0);
      restoredWheel.scale.setScalar(raw < 1 ? 0 : 1);
      headlights.scale.setScalar(raw < 1 ? 0 : 1);
      for (const [i, puff] of smoke.entries()) {
        const t = (engineTime - .13 * i) / 1.14;
        puff.scale.setScalar(!start && raw < 1 && motes && t > 0 && t < 1 ? Math.sin(Math.PI * t) * (.45 + t * .85) : 0);
        puff.position.set(.8 + .54 * t, 1.76 + .93 * t, -2.38 - .67 * t);
      }
      hullSolid();
      barrelSolid();
      wheelSolid(raw < 1);
    },
  };
}

function jeep(kit, x, z, yaw, name) {
  const { group, part, box, beam, solid } = kit;
  const car = group(name, x, 0, z, yaw);
  kit.groundShadow(car, .35, -.25, 3.24, 5.44, .048);
  box(car, ink.dark, 0, .51, 0, 1.77, .22, 3.96);
  box(car, 0x72b466, 0, .81, -.10, 1.77, .49, 3.74);
  box(car, 0x98cc7f, 0, 1.15, 1.14, 1.62, .22, 1.29);
  box(car, ink.dark, 0, .93, 1.835, 1.13, .38, .075);
  for (let i = -2; i <= 2; i++) box(car, ink.steel, i * .173, .94, 1.893, .07, .26, .039);
  for (const side of [-1, 1]) {
    for (const zz of [-1.20, 1.18]) wheel(kit, car, side * .94, .43, zz, .41, .30);
    box(car, ink.olive, side * .82, 1.0, -.81, .17, .61, 1.9);
    box(car, ink.white, side * .67, 1.03, 1.87, .25, .22, .14);
    box(car, ink.red, side * .69, .97, -2.0, .19, .14, .10);
    box(car, ink.dark, side * .42, 1.26, -.30, .57, .65, .29, [.12, 0, 0]);
    beam(car, ink.dark, [side * .78, .95, -1.58], [side * .63, 1.93, -.91], .095);
    beam(car, ink.dark, [side * .63, 1.93, -.91], [side * .73, 1.83, .47], .095);
  }
  box(car, ink.dark, 0, 1.94, -.9, 1.32, .085, .085);
  box(car, ink.glass, 0, 1.50, .51, 1.45, .60, .106, [.25, 0, 0]);
  box(car, ink.glassLight, 0, 1.71, .617, 1.35, .079, .028, [.25, 0, 0]);
  part(car, 'drum', ink.rubber, 0, .99, -2.02, .41, .30, .41, [Math.PI / 2, 0, 0]);
  box(car, ink.dark, 0, .48, 1.96, 2.1, .17, .23);
  solid(car, 0, -.05, 2.18, 4.22, 1.96);
}

function truck(kit, x, z, yaw, name, ambulance = false, utility = false) {
  const { group, box, part, solid } = kit;
  const car = group(name, x, 0, z, yaw);
  const tint = ambulance ? 0xc8ccad : utility ? 0x65a494 : 0x79a668;
  const depth = utility ? 5.1 : 6.5;
  const bodyLength = depth - 2.62;
  kit.groundShadow(car, .39, -.35, 3.68, depth + 1.1, .048);
  const rear = -depth / 2 + bodyLength / 2 + .1;
  box(car, ink.dark, 0, .63, 0, 2.29, .27, depth - .21);
  box(car, tint, 0, 1.22, depth / 2 - .9, 2.32, .81, 1.79);
  box(car, tint, 0, 1.66, depth / 2 - 1.89, 2.32, 1.80, 1.28);
  box(car, ink.glass, 0, 2.07, depth / 2 - 1.224, 1.98, .64, .09, [.10, 0, 0]);
  box(car, ink.glassLight, 0, 2.26, depth / 2 - 1.141, 1.86, .108, .028, [.10, 0, 0]);
  box(car, ink.dark, 0, 1.16, depth / 2 + .021, 1.19, .43, .078);
  for (let i = -3; i <= 3; i++) box(car, ink.steel, i * .133, 1.16, depth / 2 + .071, .033, .33, .034);
  box(car, ink.dark, 0, .72, depth / 2 + .10, 2.62, .21, .27);
  box(car, tint, 0, 1.14, rear, 2.49, .72, bodyLength);
  if (ambulance) {
    box(car, 0xdce0c6, 0, 2.00, rear, 2.46, 1.68, bodyLength - .04);
    box(car, ink.teal, 0, 2.83, rear, 2.54, .15, bodyLength + .04);
    box(car, ink.dark, 0, 2.64, depth / 2 - 1.8, 1.05, .13, .34);
    for (const side of [-1, 1]) box(car, 0x56c3be, side * .32, 2.77, depth / 2 - 1.8, .32, .15, .21, [], true);
    const doors = group('Ambulance rear doors', 0, 0, -depth / 2 + .045, Math.PI, car);
    box(doors, ink.dark, 0, 1.91, 0, .048, 1.54, .13);
    cross(kit, doors, -.63, 2.11, .103, .57);
  } else if (!utility) {
    box(car, 0x7b875e, 0, 1.93, rear, 2.43, 1.2, bodyLength - .22);
    part(car, 'arch', 0x86936c, 0, 2.49, rear, 2.49, .40, bodyLength - .14);
    for (const k of [-1.0, -.25, .5, 1.25]) part(car, 'arch', ink.moss, 0, 2.495, rear + k, 2.54, .435, .055);
  } else {
    box(car, ink.steel, 0, 1.59, rear, 2.42, .31, bodyLength - .13);
    box(car, ink.yellow, -.59, 1.94, rear - .22, .78, .40, .72);
  }
  for (const side of [-1, 1]) {
    const wall = group(name + ' door', side * 1.16, 0, 0, side * Math.PI / 2, car);
    box(wall, ink.glass, -side * (depth / 2 - 1.83), 2.06, .042, 1.06, .66, .095);
    box(wall, ink.dark, -side * (depth / 2 - 2.16), 1.64, .097, .25, .055, .042);
    box(wall, ink.dark, -side * (depth / 2 - 1.28), 2.01, .27, .16, .33, .14);
    for (const zz of [-depth / 2 + .97, depth / 2 - .89]) wheel(kit, car, side * 1.16, .54, zz, .52, .34);
    if (!ambulance && !utility) wheel(kit, car, side * 1.16, .54, -depth / 2 + 2.12, .52, .34);
    if (ambulance) {
      box(wall, ink.red, -side * rear, 1.51, .097, bodyLength - .11, .18, .09);
      cross(kit, wall, -side * rear, 2.16, .139, .67);
    }
    box(car, ink.white, side * .87, 1.28, depth / 2 + .056, .37, .30, .16);
    box(car, ink.red, side * 1.02, 1.08, -depth / 2 + .038, .25, .18, .14);
  }
  solid(car, 0, 0, 2.64, depth, ambulance ? 2.9 : 2.6);
}


function surveyAircraft(kit, { x, z, yaw }, index) {
  const { group, part, box, beam, sign, solid, groundShadow } = kit;
  const pad = group('Auxiliary survey hardstand ' + index, x, 0, z, yaw);
  groundShadow(pad, .51, -.41, 7.62, 7.3);
  part(pad, 'podium', 0x4b948a, 0, .21, 0, 3.89, .40, 3.56, [0, Math.PI / 8, 0]);
  part(pad, 'octagon', 0xd8e7d7, 0, .418, 0, 3.16, .08, 2.93, [0, Math.PI / 8, 0]);
  box(pad, 0x648b84, 0, .082, 3.77, 1.84, .164, .70);
  box(pad, 0x83ada1, 0, .158, 3.10, 1.84, .316, .69);
  sign(pad, 'SURVEY 0' + index, 0, .345, 3.22, 1.58, .24);
  solid(pad, 0, 3.77, 1.84, .70, .164);
  solid(pad, 0, 3.10, 1.84, .69, .316);
  solid(pad, 0, 0, 6.51, 4.76, .458);
  solid(pad, 0, 0, 4.96, 6.28, .458);
  const craft = group('Parked survey aircraft ' + index, 0, .46, 0, 0, pad);
  part(craft, 'cap', index === 1 ? 0x60ae78 : 0x65ae9b, 0, .88, 0, .78, .47, 1.37);
  part(craft, 'cap', ink.glass, 0, .90, .89, .57, .28, .62);
  part(craft, 'cap', ink.yellow, 0, .65, .93, .46, .24, .64);
  for (const side of [-1, 1]) {
    beam(craft, ink.dark, [side * .40, .06, -.77], [side * .40, .06, .71], .093);
    for (const z of [-1.20, 1.15]) {
      beam(craft, ink.teal, [side * .36, .82, z * .54], [side * 1.58, 1.01, z], .24, .17);
      part(craft, 'rotorRing', 0x65b57b, side * 1.56, 1.02, z, .56, .65, .56);
      box(craft, ink.dark, side * 1.56, 1.02, z, .69, .068, .10, [0, side * .41, 0]);
      part(craft, 'cap', ink.yellow, side * 1.56, 1.08, z, .12, .091, .12);
    }
  }
  solid(craft, 0, 0, 2.9, 2.8, 1.18);
}

export function buildVehicles(kit, moving) {
  const { x, z } = motorPool;
  const drivable = buildCompactTank(kit, moving, x - 11.5, z + 13.2, -.08);
  tank(kit, 'Tank 02', x - 4.0, z + 13.4, .14, 0x90bd64);
  tank(kit, 'Tank 03', x + 3.1, z + 13.0, -.13, 0x65a766);
  const repair = tank(kit, 'Tank 04 under repair', repairTank.x, repairTank.z, repairTank.yaw, 0x92ab55, moving);
  const drivableJeep = buildDrivableJeep(kit, moving, -5.65, 41.6, -.37);
  jeep(kit, 55.4, 41.1, .26, 'Perimeter patrol jeep');
  truck(kit, -37, 39.4, -.14, 'Military transport truck');
  truck(kit, -45.8, -26.5, 1.65, 'Maintenance pickup', false, true);
  truck(kit, 30.15, 9.1, Math.PI / 2, 'Field ambulance', true);
  truck(kit, 55.9, 13.8, .12, 'Supply truck');
  surveyPads.forEach((pad, index) => surveyAircraft(kit, pad, index + 1));
  return { repair, drivable, drivableJeep };
}
