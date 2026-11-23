import { rectangleBounds } from '../../core/geometry.js';
import { overlaps } from '../../core/movement.js';
import { COLORS } from './geometry.js';

export function buildTerraceFountain(architecture, { b, x: offset }, mission) {
  const x = 5.55;
  const z = 2.85;
  const basin = architecture.group(b.root, 'Garden fountain', x, 0, z);
  const p = architecture.builder(basin);
  p.part(0xbcb098, 0, .18, 0, 2.36, .36, 2.36, { shape: 'cylinder' });
  p.part(0xd9c8a9, 0, .373, 0, 2.21, .16, 2.21, { shape: 'tapered' });
  p.part(0x548b8d, 0, .458, 0, 1.89, .041, 1.89, { shape: 'cylinder' });
  p.part(0xbcb49f, 0, .62, 0, .42, .37, .42, { shape: 'tapered' });
  p.part(0xd3c9a8, 0, .83, 0, .65, .11, .65, { shape: 'tapered' });
  p.finish();
  b.solid(x, z, 2.20, 2.20);
  const jets = architecture.group(basin, 'Fountain water jets');
  const drops = Array.from({ length: 12 }, (_, i) => {
    const drop = architecture.group(jets, 'Water drop');
    const d = architecture.builder(drop);
    d.part(i % 3 ? 0xa7d8d4 : 0xe3f7ef, 0, 0, 0, .092, .138, .092, { shape: 'oval', glow: true });
    d.finish();
    return drop;
  });
  let time = 0;

  return {
    interaction: {
      x: x + offset, z, radius: 2.3, anchorY: .84, label: 'Turn on garden fountain', requiresView: true, silent: true,
      get active() { return !mission.hasActivity('fountain'); },
      act() { mission.activity('fountain'); },
    },
    reset() { time = 0; jets.visible = false; },
    update(dt, still) {
      jets.visible = mission.hasActivity('fountain');
      if (!jets.visible) return;
      if (!still) time = (time + dt * .75) % 1;
      drops.forEach((drop, i) => {
        const t = (time + i * .153) % 1;
        const angle = (i % 5) * Math.PI * 2 / 5;
        drop.position.set(Math.cos(angle) * t * .82, .83 + 1.6 * t - 1.94 * t * t, Math.sin(angle) * t * .82);
      });
    },
  };
}

export function buildRescueHelicopter(architecture, { b }) {
  const x = 7.4;
  const z = 31.7;
  const radius = 3.33;
  const deck = architecture.group(b.root, 'Rescue landing pad', x, 0, z);
  const p = architecture.builder(deck);
  p.part(0x646f6e, 0, .028, 0, 2 * radius, .055, 2 * radius, { shape: 'cylinder' });
  p.part(0xeee5cc, 0, .061, 0, 1.36, .011, .23);
  for (const side of [-1, 1]) p.part(0xeee5cc, side * .69, .062, 0, .23, .011, 1.62);
  for (let i = 0; i < 28; i++) {
    const a = i / 28 * 2 * Math.PI;
    p.part(0xeadbbf, Math.sin(a) * 2.8, .063, Math.cos(a) * 2.8, .31, .014, .073, { yaw: a + Math.PI / 2 });
  }
  p.finish();
  const craft = architecture.group(deck, 'Waiting rescue helicopter');
  const body = architecture.builder(craft);
  const red = 0xb56046;
  const ivory = 0xefdfbd;
  const glass = 0x3d666f;
  body.part(ivory, 0, .93, -.37, 1.42, .94, 2.12, { shape: 'oval' });
  body.part(red, 0, .69, -.29, 1.36, .54, 1.96, { shape: 'oval' });
  body.part(glass, 0, 1.105, -.91, 1.31, .63, .76, { shape: 'oval' });
  for (const side of [-1, 1]) {
    body.part(glass, side * .639, 1.14, -.11, .076, .41, .53, { shape: 'oval' });
    body.part(red, side * .66, .85, .12, .052, .174, .73);
    body.part(COLORS.ink, side * .63, .18, -.02, .075, .08, 2.81);
    body.part(COLORS.ink, side * .63, .23, -1.43, .077, .085, .28, { pitch: .42 });
    for (const pz of [-.64, .53]) body.part(COLORS.steel, side * .50, .38, pz, .073, .45, .087, { roll: side * .36 });
  }
  body.part(ivory, 0, .94, 1.16, .47, .32, 1.96, { pitch: -.10 });
  body.part(red, 0, 1.16, 2.12, .19, .78, .36, { pitch: .33 });
  body.part(ivory, 0, 1.04, 1.61, 1.16, .071, .30);
  body.part(COLORS.ink, 0, 1.51, -.19, .24, .37, .24, { shape: 'cylinder' });
  body.part(0xeb805c, 0, 1.78, 2.09, .14, .093, .14, { shape: 'oval', glow: true });
  body.finish();
  const rotor = architecture.group(craft, 'Rescue helicopter rotor', 0, 1.73, -.19);
  const blade = architecture.builder(rotor);
  for (const yaw of [0, Math.PI / 2]) blade.part(COLORS.ink, 0, 0, 0, 5.44, .055, .13, { yaw });
  blade.finish();
  const bounds = rectangleBounds(x, z + .12, 1.53, 3.42);
  return {
    blocks(px, pz) { return craft.visible && overlaps(bounds, px, pz); },
    reset() { craft.visible = false; rotor.rotation.y = .28; },
    update(dt, still, waiting) {
      craft.visible = waiting;
      if (waiting && !still) rotor.rotation.y += dt * 3.8;
    },
  };
}
