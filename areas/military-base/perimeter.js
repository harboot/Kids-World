import { SURFACE_GAP } from '../../core/geometry.js';
import { shutter, window } from './buildings.js';
import { checkpoints, fence, lookout, northPost } from './layout.js';
import { hazard, stripe } from './roads.js';
import { ink } from './scenery.js';
import { buildNorthPost } from './observation-props.js';

function fenceLine(kit, [x, z], [endX, endZ]) {
  const { group, box, part, solid } = kit;
  const width = Math.hypot(endX - x, endZ - z);
  const yaw = Math.atan2(z - endZ, endX - x);
  const wall = group('Slate perimeter wall', (x + endX) / 2, 0, (z + endZ) / 2, yaw);
  const count = Math.ceil(width / 6);
  const span = width / count;
  box(wall, 0x7791a1, 0, .27, 0, width, .54, 1.12);
  box(wall, 0x405b6b, 0, 1.95, 0, width, 3.35, .76);
  box(wall, 0x577580, 0, 3.76, 0, width, .37, 1.13);
  for (let i = 0; i < count; i++) {
    const left = -width / 2 + i * span;
    box(wall, 0x536e7f, left, 1.98, 0, .52, 3.96, 1.15);
    const inset = left + span / 2;
    for (const side of [-1, 1]) {
      box(wall, i % 2 ? 0x486576 : 0x486879, inset, 1.96, side * .37, span - .81, 2.57, .096);
      box(wall, 0x6d8591, inset, .82, side * .442, span - 1.11, .14, .052);
      if (i % 4 === 1) {
        part(wall, 'tip', ink.sand, inset, 2.28, side * .441, .8, .53, .064, [0, 0, Math.PI]);
        box(wall, ink.sand, inset, 2.33, side * .467, 1.46, .14, .049);
      }
    }
    if (i % 3 === 0) {
      box(wall, ink.steel, left, 4.04, 0, 1.65, .36, 1.57);
      box(wall, 0xc3d2d5, left, 4.33, 0, 1.52, .23, 1.43);
      box(wall, 0x496776, left, 4.59, 0, 1.78, .29, 1.69);
    }
  }
  solid(wall, 0, 0, width, .9, 3.94);
}

function booth(kit, name, x, z, yaw, sub) {
  const { group, box, sign, solid } = kit;
  const post = group(name, x, 0, z, yaw);
  box(post, ink.footing, 0, .10, 0, 2.95, .20, 3.25);
  box(post, ink.olive, 0, 1.40, 0, 2.45, 2.80, 2.72);
  box(post, ink.dark, 0, 2.75, 0, 2.77, .28, 3.05);
  box(post, ink.roof, 0, 2.90, 0, 3.13, .16, 3.39);
  box(post, ink.yellow, 0, .71, 1.381, 2.42, .13, .045);
  solid(post, 0, 0, 2.49, 2.76, 2.98);
  window(kit, post, 0, 1.79, 1.36, 1.89, .93);
  for (const side of [-1, 1]) {
    const wall = group('Security booth side', side * 1.225, 0, 0, side * Math.PI / 2, post);
    window(kit, wall, 0, 1.80, 0, 1.65, .92);
  }
  const back = group('Closed security booth door', 0, 0, -1.36, Math.PI, post);
  shutter(kit, back, 0, 1.11, 0, 1.1, 2.0);
  sign(post, sub, 0, 2.66, 1.52, 2.33, .35);
  return post;
}

function camera(kit, parent, x, y, z, yaw) {
  const { group, box, beam, part } = kit;
  const eye = group('Security camera', x, y, z, yaw, parent);
  beam(eye, ink.dark, [0, .34, -.39], [0, .16, .19], .085);
  box(eye, ink.pale, 0, .10, .32, .46, .32, .75, [.26, 0, 0]);
  box(eye, ink.dark, 0, .017, .681, .38, .24, .065, [.26, 0, 0]);
  part(eye, 'drum', ink.glassLight, 0, .023, .725, .098, .046, .098, [Math.PI / 2 + .26, 0, 0]);
}

export function roadblock(kit, x, z, yaw = 0) {
  const { group, box, part, solid } = kit;
  const barricade = group('Concrete traffic barrier', x, 0, z, yaw);
  part(barricade, 'crown', ink.concrete, 0, 0, 0, .85, .82, 2.72, [0, Math.PI / 2, 0]);
  box(barricade, ink.footing, 0, .082, 0, 2.84, .164, .95);
  for (const side of [-1, 1]) {
    box(barricade, ink.yellow, side * .88, .45, .352, .32, .18, .055, [-.16, 0, .25]);
    box(barricade, ink.yellow, side * .88, .45, -.352, .32, .18, .055, [.16, 0, -.25]);
  }
  solid(barricade, 0, 0, 2.84, .95, .82);
}

export function floodlight(kit, x, z, yaw, height = 5.6) {
  const { group, box, part, solid } = kit;
  const lamp = group('Perimeter floodlight', x, 0, z, yaw);
  box(lamp, ink.concrete, 0, .11, 0, .78, .22, .78);
  part(lamp, 'post', ink.dark, 0, height / 2, 0, .090, height, .09);
  box(lamp, ink.dark, 0, height - .11, .15, 1.05, .14, .29);
  for (const x of [-.34, .34]) {
    box(lamp, ink.steel, x, height, .31, .55, .27, .29, [.39, 0, 0]);
    box(lamp, 0xf7e1a2, x, height - .067, .454, .44, .155, .05, [.39, 0, 0], true);
  }
  solid(lamp, 0, 0, .19, .19, height);
}

function entrance(kit) {
  const { group, part, box, beam, sign, solid } = kit;
  const gate = group('Open South Gate', 0, 0, fence.south);
  for (const side of [-1, 1]) {
    const x = side * fence.gate;
    box(gate, ink.concrete, x, .28, 0, 1.45, .56, 1.55);
    box(gate, ink.steel, x, 2.73, 0, .72, 5.46, .78);
    box(gate, ink.teal, x, 3.23, .43, .37, 3.55, .14);
    box(gate, ink.paleTeal, x, 5.57, 0, 1.03, .24, 1.04);
    part(gate, 'cap', 0xffc966, x, 5.83, 0, .24, .22, .24, [], true);
    solid(gate, x, 0, 1.46, 1.55, 5.67);
    beam(gate, ink.teal, [x, 4.18, 0], [side * 6.29, 4.85, 0], .19);
    camera(kit, gate, side * 6.63, 4.44, .35, -side * .41);
    const boothZ = fence.south - (side < 0 ? 2.2 : 3.05);
    booth(kit, side < 0 ? 'West security booth' : 'East security booth', side * 6.25, boothZ, -side * Math.PI / 2, side < 0 ? 'SECURITY' : 'ACCESS DESK');
    const arm = group('Raised guard barrier', side * 4.27, 0, -1.67, 0, gate);
    box(arm, ink.dark, 0, .46, 0, .37, .92, .39);
    box(arm, ink.yellow, 0, .76, .019, .39, .36, .40);
    beam(arm, ink.white, [0, .89, 0], [-side * .35, 4.30, 0], .11, .15);
    for (let i = 0; i < 4; i++) box(arm, ink.red, -side * (.066 + i * .071), 1.59 + i * .68, .014, .12, .26, .172, [0, 0, side * .10]);
    solid(arm, 0, 0, .39, .40, .94);
    for (let k = 0; k < 2; k++) {
      const sandbags = group('Gate sandbag revetment', side * (9.4 + 2.27 * k), 0, .92, side * .08, gate);
      for (let n = 0; n < 3; n++) part(sandbags, 'cap', n % 2 ? 0xc5af77 : ink.sand, (n - 1) * .74, .18, 0, .39, .19, .32);
      for (let n = 0; n < 2; n++) part(sandbags, 'cap', 0xbaa372, (n - .5) * .72, .45, 0, .41, .17, .29);
      solid(sandbags, 0, 0, 2.25, .60, .62);
    }
  }
  box(gate, ink.dark, 0, 5.08, 0, 15.3, .59, .52);
  box(gate, ink.teal, 0, 4.81, .025, 14.46, .113, .59);
  box(gate, ink.steel, 0, 5.46, 0, 11.35, .18, .66);
  for (const side of [-1, 1]) {
    sign(gate, 'MILITARY BASE', 0, 5.23, side * .37, 8.8, 1.20,
      { yaw: side > 0 ? 0 : Math.PI, sub: 'SOUTH GATE  /  01' });
  }
  hazard(kit, gate, 0, -.85, 7.95, .45);
  for (const x of [-5.68, -2.84, 0, 2.84, 5.68]) roadblock(kit, x, fence.approach, x * .015);
}

function sideCheckpoint(kit, data, west) {
  const { group, box, sign, solid } = kit;
  const { x, z, name } = data;
  const station = group(name, x, 0, z, west ? Math.PI / 2 : 0);
  if (west) booth(kit, name + ' booth', x - 2.4, z - 1.5, Math.PI / 2, 'WEST POST');
  else buildNorthPost(kit);
  for (const side of [-1, 1]) {
    box(station, ink.dark, side * 1.9, 1.46, 2.62, .13, 2.92, .15);
    solid(station, side * 1.9, 2.62, .15, .17, 2.92);
  }
  sign(station, name, 0, 2.67, 2.62, 4.16, .66, { bothSides: true, style: 'gold' });
  camera(kit, station, -1.88, 2.59, 2.1, .14);
  stripe(kit, station, 0, 1.5, 3.6, .24, ink.yellow);
}

function tower(kit, cx, cz, label, accessible = false) {
  const { group, box, part, beam, sign, solid } = kit;
  const { width, depth, height, rampWidth, rampEnd } = lookout;
  const front = depth / 2;
  const half = width / 2;
  const platform = group(label, cx, 0, cz);
  box(platform, ink.footing, 0, .21, 0, width + .52, .42, depth + .48);
  box(platform, 0x788a7a, 0, height / 2 - .15, 0, width - .10, height - .30, depth - .1);
  for (const x of [-half + .25, half - .25]) {
    for (const z of [-front + .25, front - .25]) {
      box(platform, ink.steel, x, height / 2, z, .34, height, .34);
    }
  }
  box(platform, ink.teal, 0, height - .16, 0, width, .32, depth);
  for (const side of [-1, 1]) {
    beam(platform, ink.dark, [side * (half - .16), .43, -front + .15], [side * (half - .16), height - .31, front - .15], .17);
    for (const x of [-1.45, 1.45]) {
      const wall = group('Watchtower ventilation', side * half, 0, 0, side * Math.PI / 2, platform);
      box(wall, ink.dark, x, 1.37, 0, .77, .49, .075);
      for (let i = -1; i <= 1; i++) box(wall, ink.steel, x, 1.37 + i * .121, .056, .64, .04, .04);
    }
  }
  const posts = [-half + .12, 0, half - .12];
  for (const x of [posts[0], posts[2]]) {
    for (const z of [-front + .13, front - .13]) box(platform, ink.dark, x, height + 1.47, z, .19, 2.94, .19);
  }
  function rails(x1, z1, x2, z2) {
    for (const offset of [.46, 1.02]) beam(platform, ink.steel, [x1, height + offset, z1], [x2, height + offset, z2], .09);
    const posts = Math.ceil(Math.hypot(x2 - x1, z2 - z1) / 1.85);
    for (let i = 1; i < posts; i++) box(platform, ink.dark, x1 + (x2 - x1) * i / posts, height + .53, z1 + (z2 - z1) * i / posts, .088, 1.06, .088);
  }
  rails(posts[0], -front + .13, posts[2], -front + .13);
  rails(posts[0], -front + .13, posts[0], front - .13);
  rails(posts[2], -front + .13, posts[2], front - .13);
  for (const side of [-1, 1]) {
    const stop = accessible ? side * rampWidth / 2 : 0;
    rails(side * posts[2], front - .13, stop, front - .13);
    box(platform, ink.dark, stop, height + .55, front - .13, .105, 1.1, .145);
  }
  box(platform, ink.dark, 0, height + 2.91, 0, width + .74, .28, depth + .72);
  part(platform, 'crown', ink.roof, 0, height + 3.04, 0, width + .89, .89, depth + .88);
  box(platform, ink.paleTeal, 0, height + 3.94, 0, (width + .9) * .69, .09, depth + .92);
  sign(platform, label.toUpperCase(), 0, height + 2.65, front + .28, width * .77, .50);
  if (!accessible) {
    solid(platform, 0, 0, width, depth, height + 3.1);
    return;
  }

  sign(platform, 'LOOKOUT RAMP', 2.18, 1.72, front + .01, 1.10, .51, { style: 'gold' });
  const length = rampEnd - (cz + front);
  const ramp = group('Walkable watchtower ramp', 0, 0, front, 0, platform);
  const angle = Math.atan(height / length);
  const run = Math.hypot(height, length);
  const slab = .14;
  box(ramp, 0x7b9586, 0, height / 2 - slab / 2 * Math.cos(angle), length / 2 - slab / 2 * Math.sin(angle),
    rampWidth, slab, run, [angle, 0, 0]);
  for (let i = 1; i < 18; i++) {
    const t = i / 18;
    box(ramp, i % 5 === 0 ? ink.sand : ink.steel, 0, height * (1 - t) + SURFACE_GAP.detail,
      length * t, rampWidth - .12, .022, .059, [angle, 0, 0]);
  }
  for (const x of [-rampWidth / 2, rampWidth / 2]) {
    for (const y of [.47, .98]) beam(ramp, ink.steel, [x, height + y, 0], [x, y, length], .09);
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      box(ramp, ink.dark, x, height * (1 - t) + .49, length * t, .135, 1.00, .135);
      if (i % 2 === 0 && i < 5) {
        const rise = height * (1 - t);
        box(ramp, ink.steel, x, rise / 2, length * t, .24, rise, .24);
      }
    }
  }
  hazard(kit, ramp, 0, length + .45, rampWidth, .34);
}

function lookoutSurface(x, z) {
  const { x: cx, z: cz, width, depth, height, rampEnd, rampWidth } = lookout;
  const front = cz + depth / 2;
  const dx = Math.abs(x - cx);
  if (dx <= width / 2 && z >= cz - depth / 2 && z <= front) return height;
  if (dx <= rampWidth / 2 && z > front && z < rampEnd) return height * (rampEnd - z) / (rampEnd - front);
  return 0;
}

export function buildPerimeter(kit) {
  const { west, east, north, south, gate, approach } = fence;
  for (const [start, end] of [
    [[west, north], [east, north]], [[east, north], [east, south]],
    [[east, south], [gate, south]], [[-gate, south], [west, south]],
    [[west, south], [west, north]], [[gate, south], [gate, approach]],
    [[-gate, approach], [-gate, south]],
  ]) fenceLine(kit, start, end);

  entrance(kit);
  sideCheckpoint(kit, checkpoints[1], true);
  sideCheckpoint(kit, checkpoints[2], false);
  tower(kit, -65, 55, 'West lookout');
  tower(kit, -65, -58, 'Northwest lookout');
  tower(kit, 65, -58, 'Northeast lookout');
  tower(kit, lookout.x, lookout.z, 'South lookout', true);

  for (const [x, z, yaw] of [
    [-65, -35, 1.6], [-65, -13, 1.6], [-65, 29, 1.6], [-40, 56, Math.PI], [-23, 56, Math.PI],
    [18, 56, Math.PI], [39, 56, Math.PI], [66.6, 26, -1.6], [66.6, -.3, -1.6],
    [-42, -58, 0], [-18, -59, 0], [22, -58, 0], [43, -58, 0], [67, -33, -1.6],
  ]) floodlight(kit, x, z, yaw);

  return {
    getGroundHeight: lookoutSurface,
    getCeilingHeight(x, z) {
      const { x: cx, z: cz, width, depth, height } = lookout;
      if (Math.abs(x - cx) <= width / 2 && Math.abs(z - cz) <= depth / 2) return height + 2.77;
      if (Math.abs(x - northPost.x) <= northPost.width / 2 && Math.abs(z - northPost.z) <= northPost.depth / 2) return northPost.floor + 2.65;
      return Infinity;
    },
    blocksGround(x, z, radius, _feet, from) {
      const { x: cx, z: cz, width, depth, rampWidth, rampEnd } = lookout;
      const front = cz + depth / 2;
      const dx = Math.abs(x - cx);
      if (z > rampEnd) return false;
      const onTower = Boolean(from && lookoutSurface(from.x, from.z));
      if (!onTower) {
        return z >= front && z < rampEnd - .18 && Math.abs(dx - rampWidth / 2) < radius;
      }
      if (dx > width / 2 - radius || z < cz - depth / 2 + radius) return true;
      if (z >= front - radius - .13 && dx > rampWidth / 2 - radius) return true;
      return false;
    },
  };
}
