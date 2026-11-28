import { EYE_HEIGHT } from '../../core/player.js';
import { clamp, faces, mix } from './landform.js';
import { shaft, shaftContains } from './lift-layout.js';
import { createTimberKit } from './structures.js';

const { x, z, half, lower, upper } = shaft;
const travelTime = 6.4;
const headroom = 2.9;

export function addLift({ THREE, scene, mine, carryPlayer }) {
  const metal = new THREE.MeshBasicMaterial({ name: 'Lift guide steel', color: 0x53616a, toneMapped: false });
  const iron = new THREE.MeshBasicMaterial({ name: 'Lift frame iron', color: 0x384048, toneMapped: false });
  const brass = new THREE.MeshBasicMaterial({ name: 'Lift controls and safety trim', color: 0xc08a4f, toneMapped: false });
  const wood = new THREE.MeshBasicMaterial({ name: 'Lift deck planks', color: 0x906544, toneMapped: false });
  const light = new THREE.MeshBasicMaterial({ name: 'Lift signal lights', color: 0xffda83, toneMapped: false });
  const fixed = createTimberKit(THREE, scene);
  const hoistY = upper + headroom;
  const wall = faces(THREE, scene, 'Rock lining inside the mining shaft',
    new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
  const stone = new THREE.Color(0x4c535b), pale = new THREE.Color(0x575962);
  const lamps = [];
  const west = x - half, east = x + half, north = z - half, south = z + half;

  function shaftSide(ax, az, bx, bz, floor, top) {
    for (let i = 0; i < 4; i++) {
      const a = i / 4, b = (i + 1) / 4;
      const px = mix(ax, bx, a), pz = mix(az, bz, a);
      const qx = mix(ax, bx, b), qz = mix(az, bz, b);
      const lo = floor(px, pz), hi = floor(qx, qz);
      const split = 0.37 + 0.19 * Math.sin(i * 2.46);
      const p = [px, mix(lo, top, split), pz], q = [qx, mix(hi, top, split), qz];
      wall.quad([qx, hi, qz], [px, lo, pz], p, q, i % 2 ? stone : pale);
      wall.quad(q, p, [px, top, pz], [qx, top, qz], i % 2 ? pale : stone);
    }
  }
  const lowerRoof = mine.adit.ceiling.sample;
  shaftSide(east, north, west, north, lowerRoof, upper);
  shaftSide(west, south, east, south, lowerRoof, upper);
  shaftSide(west, north, west, south, lowerRoof, upper);
  shaftSide(east, south, east, north, () => lower - 0.25, upper);
  wall.finish();
  fixed.box(iron, x, lower - 0.35, z, 4.08, 0.14, 4.08);
  fixed.box(iron, x, hoistY - 0.01, z, 4.34, 0.21, 0.26);
  for (const side of [-1, 1]) {
    const pz = z + side * 1.91;
    fixed.box(iron, x, (hoistY + lower) / 2, pz, 0.23, hoistY - lower, 0.19);
    fixed.box(metal, x - 0.21, (hoistY + lower) / 2, pz - side * 0.09, 0.11, hoistY - lower, 0.12);
    for (const px of [west - 0.08, east + 0.08]) {
      const landing = px < x ? lower : upper;
      fixed.box(iron, px, landing + 1.21, pz, 0.23, 2.42, 0.21);
      fixed.box(brass, px, landing + 1.30, pz - side * 0.09, 0.13, 0.36, 0.08);
    }
    fixed.box(iron, x, lower - 0.171, z + side * 2.022, 4.08, 0.31, 0.083);
    fixed.box(iron, x + side * 2.022, lower - 0.171, z, 0.083, 0.31, 3.96);
    for (const landing of [lower, upper]) {
      // Recess the threshold beneath both walking surfaces and close the
      // clearance between the cage and the shaft at grazing view angles.
      fixed.box(iron, x, landing - 0.046, z + side * 2.035, 4.19, 0.058, 0.108);
      fixed.box(iron, x + side * 2.035, landing - 0.046, z, 0.108, 0.058, 3.955);
      fixed.box(iron, x + 0.04, landing + 0.5, pz, 4.06, 0.065, 0.11);
      fixed.box(iron, x + 0.04, landing + 1.03, pz, 4.06, 0.11, 0.14);
    }
  }
  fixed.box(iron, west - 0.11, upper + 1.02, z, 0.15, 0.11, 3.85);
  fixed.box(iron, west - 0.11, upper + 0.54, z, 0.12, 0.074, 3.85);
  for (const [px, pz, base] of [[1,-34,null],[6,-36,null],[12,-40,null],[18,-44,null],[22,-49,null],
    [25.3,-57.2,lower],[30.75,-54.65,upper]]) {
    const y = (base ?? mine.adit.floor.sample(px, pz)) + 2.04;
    lamps.push({ x: px, y, z: pz });
    fixed.box(iron, px, y - 0.92, pz + 1.55, 0.11, 1.87, 0.14);
    fixed.box(iron, px, y + 0.12, pz + 1.29, 0.13, 0.075, 0.62);
    fixed.box(light, px, y, pz + 1.04, 0.15, 0.23, 0.17);
  }

  for (const [px, pz, y] of [[west - 0.63, z + 1.18, lower], [east + 0.64, z - 1.16, upper]]) {
    fixed.box(iron, px, y + 0.53, pz, 0.12, 1.06, 0.13);
    fixed.box(metal, px, y + 1.1, pz, 0.29, 0.31, 0.28);
    fixed.box(light, px, y + 1.18, pz - 0.155, 0.12, 0.095, 0.036);
  }
  fixed.finish();

  const cage = new THREE.Group();
  cage.name = 'Mine lift moving platform';
  cage.position.set(x, lower, z);
  scene.add(cage);
  const deck = createTimberKit(THREE, cage);
  deck.box(iron, 0, -0.19, 0, 3.91, 0.2, 3.91);
  for (let i = 0; i < 12; i++) deck.box(wood, 0, -0.046, -1.79 + i * 0.325, 3.92, 0.092, 0.314);
  for (const side of [-1, 1]) {
    for (const px of [-1.77, 1.77]) {
      deck.box(iron, px, 1.21, side * 1.76, 0.095, 2.42, 0.095);
      deck.box(brass, px, 0.105, side * 1.76, 0.18, 0.21, 0.18);
    }
    deck.box(metal, 0, 0.52, side * 1.76, 3.64, 0.073, 0.10);
    deck.box(metal, 0, 1.06, side * 1.76, 3.64, 0.095, 0.12);
    deck.box(iron, 0, 2.43, side * 1.76, 3.68, 0.087, 0.11);
    deck.beam(iron, [-1.67, 2.43, side * 1.76], [0, 2.76, side * 1.76], 0.11);
    deck.beam(iron, [1.67, 2.43, side * 1.76], [0, 2.76, side * 1.76], 0.11);
  }
  deck.box(metal, 0.44, 1.11, 1.58, 0.32, 0.26, 0.23);
  deck.box(light, 0.44, 1.16, 1.452, 0.13, 0.115, 0.032);
  deck.finish();

  const gateShape = new THREE.BoxGeometry(0.095, 0.082, 3.64);
  function gate(px, height) {
    const leaves = new THREE.Group();
    leaves.position.set(px, height, z);
    const mid = new THREE.Mesh(gateShape, metal), top = new THREE.Mesh(gateShape, brass);
    mid.position.y = 0.55;
    top.position.y = 1.05;
    leaves.add(mid, top);
    scene.add(leaves);
    return leaves;
  }
  const landingGates = [gate(west - 0.04, lower), gate(east + 0.04, upper)];
  const cageGates = [-1, 1].map(side => {
    const group = new THREE.Group();
    group.position.x = side * 1.93;
    for (const y of [0.55, 1.05]) {
      const bar = new THREE.Mesh(gateShape, y > 1 ? brass : metal);
      bar.position.y = y;
      group.add(bar);
    }
    cage.add(group);
    return group;
  });

  const cables = [], pulleys = [];
  const cableGeometry = new THREE.CylinderGeometry(0.022, 0.022, 1, 5);
  const pulleyGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.12, 12).rotateX(Math.PI / 2);
  for (const side of [-1, 1]) {
    const cable = new THREE.Mesh(cableGeometry, metal);
    cable.position.set(x, 0, z + side * 1.76);
    scene.add(cable);
    cables.push(cable);
    const pulley = new THREE.Mesh(pulleyGeometry, brass);
    pulley.position.set(x, hoistY + 0.16, z + side * 1.76);
    scene.add(pulley);
    pulleys.push(pulley);
  }

  let level = 0, destination = 0, progress = 1, height = lower;
  const heights = [lower, upper];
  const moving = () => progress < 1;

  function pose() {
    cage.position.y = height;
    for (let i = 0; i < 2; i++) {
      const raised = !moving() && level === i ? 1.4 : 0;
      landingGates[i].position.y = heights[i] + raised;
      cageGates[i].position.y = raised;
      cables[i].scale.y = Math.max(0.06, hoistY + 0.18 - height - 2.76);
      cables[i].position.y = hoistY + 0.18 - cables[i].scale.y / 2;
      pulleys[i].rotation.z = (height - lower) * 4;
    }
  }

  function inside(px, pz, inset = 0) { return shaftContains(px, pz, -inset); }

  function aboard(player, before = height) {
    return player && inside(player.x, player.z) && player.y - EYE_HEIGHT >= before - 0.15
      && player.y - EYE_HEIGHT <= before + 1.55;
  }

  function start(next) {
    if (moving() || next === level) return;
    destination = next;
    progress = 0;
    pose();
  }

  function update(dt, player) {
    if (!moving() || !dt) return;
    const previous = height;
    const riding = aboard(player, previous);
    progress = clamp(progress + dt / travelTime);
    const eased = progress * progress * (3 - 2 * progress);
    height = mix(heights[level], heights[destination], eased);
    if (!moving()) level = destination;
    if (riding) carryPlayer(height - previous);
    pose();
  }

  function blocks(px, pz, radius, feet, from) {
    if (!shaftContains(px, pz, radius)) return false;
    const nearPlatform = feet >= height - 0.18 && feet <= height + 1.58;
    if (moving()) {
      return !nearPlatform || !from || !inside(from.x, from.z, -0.05) || !inside(px, pz, radius + 0.1);
    }
    if (!nearPlatform || Math.abs(pz - z) >= half - radius - 0.10) return true;
    return level === 0 ? px >= east - radius - 0.06 : px <= west + radius + 0.06;
  }

  const interactions = heights.flatMap((y, i) => [
    {
      x: i === 0 ? west - 0.65 : east + 0.63, z: z + (i === 0 ? 1.16 : -1.15), anchorY: y + 1.12,
      radius: 1.85, label: 'Call Lift', silent: true,
      get active() { return !moving() && level !== i; },
      reachable(p) { return Math.abs(p.y - EYE_HEIGHT - y) < 0.62 && !inside(p.x, p.z); },
      act() { start(i); },
    },
    {
      x: x + 0.44, z: z + 1.58, anchorY: y + 1.15, radius: 3.46, label: i === 0 ? 'Go Up' : 'Go Down', silent: true,
      get active() { return !moving() && level === i; },
      reachable(p) { return aboard(p); },
      act() { start(1 - i); },
    },
  ]);

  function reset() {
    level = destination = 0;
    progress = 1;
    height = lower;
    pose();
  }
  reset();
  return { interactions, lamps, blocks, update, reset, inside, get height() { return height; } };
}
