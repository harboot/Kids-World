import { COLORS, ceilingLight, tileFloor, wallX, wallZ } from './geometry.js';
import { automaticGlassDoors } from './terrace-doors.js';

const ROOM = { left: 10.3, right: 22.35, front: -5.17, back: 2.30, height: 3.52, entrance: 15.65 };

export function buildGym(THREE, architecture, { b, x: offset }, reducedMotion, mission) {
  const { left, right, front, back, height, entrance } = ROOM;
  const width = right - left;
  const depth = back - front;
  const mid = (right + left) / 2;
  const middle = (front + back) / 2;
  const doorWidth = 2.65;
  tileFloor(b, mid, middle, width, depth, .78, [0x647477, 0x65787b, 0x5f7076], .018);
  wallX(b, 0xd9d1bd, left, right, front, height);
  for (const x of [left, right]) wallZ(b, 0xd3c8b3, x, front, back, height);
  b.part(0xcbbfa7, mid, height + .155, middle, width + .32, .31, depth + .4, { playerOnly: true });
  b.part(0x475b5c, mid, 3.27, back + .04, width + .28, .47, .42);
  const glass = new THREE.MeshStandardMaterial({ color: 0x95bbc4, transparent: true, opacity: .35, depthWrite: false });
  for (const [a, end] of [[left, entrance - doorWidth / 2], [entrance + doorWidth / 2, right]]) {
    const center = (a + end) / 2;
    b.block(0x597676, center, .18, back, end - a, .35, .24);
    architecture.box(b.root, glass, center, 1.62, back, end - a - .08, 2.6, .051);
    for (let i = 0; i <= 3; i++) {
      b.part(COLORS.ink, a + i * (end - a) / 3, 1.67, back + .027, .076, 2.74, .097);
    }
  }
  architecture.sign(b.root, ['RESIDENT GYM'], entrance, 3.28, back + .255, 2.55, .35, { background: '#384f54' });
  architecture.sign(b.root, ['WARM UP'], 17.9, 2.35, front + .14, 2.0, .43);
  for (const x of [12.5, 17, 20.7]) ceilingLight(b, x, -.78, 1.42, .39, height);
  const doors = automaticGlassDoors(THREE, architecture, b.root, {
    name: 'Sliding gym glass', x: entrance, z: back, width: doorWidth, reducedMotion,
    onMove: mission.doorCue,
    onCross: () => mission.activity('gym'),
  });

  const belts = [];
  for (const [i, x] of [12.38, 14.41, 16.43].entries()) {
    const z = -1.97;
    b.block(COLORS.ink, x, .27, z, 1.17, .37, 2.43);
    b.part(0x455b60, x, .475, z + .15, .89, .069, 1.94);
    for (const side of [-1, 1]) {
      b.part(COLORS.steel, x + side * .49, .86, z - .72, .079, .99, .10, { pitch: -.14 });
      b.part(COLORS.ink, x + side * .48, 1.29, z - .41, .092, .112, .77);
    }
    b.part(0x354750, x, 1.41, z - .80, .79, .15, .37, { pitch: .25 });
    b.part(i === 0 ? 0xbdd76d : 0x93bdb9, x, 1.49, z - .79, .57, .029, .21, { pitch: .25, glow: true });
    if (i === 0) {
      for (let line = 0; line < 7; line++) {
        const band = architecture.group(b.root, 'Treadmill moving belt', x, .515, z);
        const p = architecture.builder(band);
        p.part(0xa1d081, 0, 0, 0, .58, .012, .026);
        p.finish();
        belts.push(band);
      }
    }
  }
  const rackX = 20.2;
  b.block(0x444e55, rackX, .45, -3.66, 2.84, .9, .57);
  for (const y of [.40, .84]) {
    b.part(0xa7b3b1, rackX, y, -3.6, 2.77, .09, .55);
    for (let i = 0; i < 5; i++) {
      const x = rackX + (i - 2) * .52;
      b.part(COLORS.steel, x, y + .16, -3.51, .33, .038, .038);
      for (const side of [-1, 1]) b.part([0x70616c, 0x5e707c, 0xb58664][i % 3], x + side * .149,
        y + .151, -3.51, .088, .21, .21, { shape: 'cylinder', roll: Math.PI / 2 });
    }
  }
  b.block(0x334f5a, 20.11, .28, -.45, 2.17, .43, .72);
  b.part(0xa8ae8c, 19.08, .026, .74, 1.74, .034, .88);
  b.part(0x9e766e, 21.15, .031, .74, 1.73, .035, .91);
  let time = 0;
  return {
    interaction: {
      x: offset + 12.38, z: -.80, anchorY: .74, radius: 2.12, label: 'Start gym treadmill',
      silent: true, requiresView: true,
      reachable: p => p.z < back - .22 && p.x - offset > left && p.x - offset < right,
      get active() { return !mission.hasActivity('treadmill'); },
      act() { mission.activity('treadmill'); },
    },
    blocks: doors.blocks,
    ceiling(x, z) { return x > left && x < right && z > front && z < back ? height : Infinity; },
    reset() { doors.reset(); time = 0; },
    update(dt, x, z, still) {
      doors.update(dt, x, z);
      if (!still && mission.hasActivity('treadmill')) time = (time + dt * .95) % 1.62;
      belts.forEach((belt, i) => { belt.position.z = -2.56 + (time + i * 1.62 / belts.length) % 1.62; });
    },
  };
}
