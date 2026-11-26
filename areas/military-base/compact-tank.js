import { ink } from './scenery.js';

// Shared by the model and driving controller; all dimensions are in world units.
export const compactTank = Object.freeze({
  width: 2.36, depth: 3.48, bodyHeight: 2.02,
  cannonZ: 2.03, cannonWidth: .28, cannonDepth: .96, cannonHeight: 1.65,
  trackOffset: .86, wheelRadius: .265,
  seatZ: -.96, eyeHeight: 2.83, boardX: 1.55, boardZ: -.48,
});

export function buildCompactTank(kit, moving, x, z, yaw) {
  const { group, movingSolid } = kit;
  const { part, box, beam, groundShadow } = moving;
  const d = compactTank;
  const tint = 0x83b88d, armor = 0x527e65, trim = 0xc8bd79, cushion = 0x354952;
  const ground = group('Tank 01', x, 0, z, yaw);
  const body = group('Compact open scout tank', 0, 0, 0, 0, ground);
  groundShadow(ground, .19, -.10, 3.08, 4.93, .055);
  const wheels = [], treads = [], levers = [];
  for (const side of [-1, 1]) {
    const xx = side * d.trackOffset;
    part(body, 'track', ink.rubber, xx, .36, 0, 3.38, .72, .59, [0, Math.PI / 2, 0]);
    for (let k = 0; k < 4; k++) {
      const zz = (k - 1.5) * .74;
      const wheel = group('Scout road wheel', xx + side * .30, .35, zz, 0, body);
      part(wheel, 'drum', armor, 0, 0, 0, d.wheelRadius, .085, d.wheelRadius, [0, 0, Math.PI / 2]);
      part(wheel, 'drum', ink.dark, side * .048, 0, 0, .105, .028, .105, [0, 0, Math.PI / 2]);
      box(wheel, trim, side * .051, .185, 0, .025, .055, .055);
      wheels.push({ wheel, side });
    }
    for (let k = 0; k < 9; k++) {
      const start = (k - 4) * .32;
      const tread = group('Scout track link', xx, .732, start, 0, body);
      box(tread, 0x465253, 0, 0, 0, .57, .055, .085);
      treads.push({ tread, side, start });
    }
    box(body, armor, xx, .84, 0, .60, .17, 3.22);
    box(body, 0xffedc8, side * .87, .94, 1.56, .22, .13, .14, [], true);
    box(body, 0xff6055, side * .87, .89, -1.63, .19, .12, .10, [], true);
    box(body, trim, xx, .94, -.92, .42, .035, .68);
    for (const zz of [-1.15, -.92, -.69]) box(body, ink.dark, xx, .967, zz, .34, .023, .045);
    // Low open footrests and boarding handles, no roof or enclosing cabin.
    beam(body, ink.steel, [side * .60, .96, -1.22], [side * .60, 1.34, -1.22], .052);
    beam(body, ink.steel, [side * .60, 1.34, -1.22], [side * .60, 1.34, -.75], .052);
    beam(body, ink.steel, [side * .60, 1.34, -.75], [side * .60, .96, -.75], .052);
  }
  part(body, 'track', tint, 0, .77, 0, 3.46, .76, 1.35, [0, Math.PI / 2, 0]);
  box(body, armor, 0, 1.14, -.62, 1.28, .13, 1.76);
  box(body, tint, 0, 1.12, .93, 1.38, .22, 1.12);
  // Distinct open driver's seat: raised cushion, shaped back and headrest.
  const seat = group('Scout open driver seat', 0, 1.21, d.seatZ, 0, body);
  box(seat, ink.steel, 0, .06, 0, .52, .12, .48);
  box(seat, cushion, 0, .18, 0, .64, .17, .59);
  box(seat, armor, 0, .49, -.30, .63, .66, .12, [-.14, 0, 0]);
  box(seat, cushion, 0, .49, -.23, .51, .55, .13, [-.14, 0, 0]);
  box(seat, cushion, 0, .80, -.34, .36, .17, .15);
  // Dashboard faces the seated driver, with contrasting instruments and dual steering levers.
  const panel = group('Scout driver control panel', 0, 1.47, -.03, 0, body);
  box(panel, armor, 0, -.14, .02, .90, .38, .28);
  const face = group('Scout instrument face', 0, .09, -.14, 0, panel);
  face.rotation.x = -.45;
  box(face, ink.dark, 0, 0, 0, .94, .36, .10);
  box(face, 0x6fb9b5, 0, .035, -.065, .30, .14, .024, [], true);
  for (const side of [-1, 1]) {
    part(face, 'drum', ink.steel, side * .30, .035, -.067, .075, .025, .075, [Math.PI / 2, 0, 0]);
    part(face, 'drum', ink.paleTeal, side * .30, .035, -.084, .053, .016, .053, [Math.PI / 2, 0, 0]);
    box(face, ink.dark, side * .30, .039, -.098, .012, .067, .014, [0, 0, side * .62]);
    box(face, side > 0 ? ink.red : ink.yellow, side * .23, -.105, -.066, .08, .05, .026);
    const lever = group('Scout steering lever', side * .47, 1.21, -.40, 0, body);
    beam(lever, ink.steel, [0, 0, 0], [0, .38, -.10], .055);
    box(lever, cushion, 0, .39, -.10, .16, .11, .105);
    levers.push({ lever, side });
  }
  // Small forward-mounted decorative cannon with no weapon interaction.
  const cannon = group('Scout decorative cannon', 0, 1.24, .91, 0, body);
  part(cannon, 'track', armor, 0, .14, 0, .87, .37, .83, [0, Math.PI / 2, 0]);
  box(cannon, tint, 0, .22, .36, .48, .28, .28);
  beam(cannon, ink.moss, [0, .24, .46], [0, .28, 1.50], .086, .086, 'drum');
  beam(cannon, tint, [0, .27, 1.25], [0, .28, 1.57], .13, .13, 'drum');
  part(cannon, 'drum', ink.dark, 0, .28, 1.585, .085, .018, .085, [Math.PI / 2, 0, 0]);
  const hull = movingSolid(body, 0, 0, d.width, d.depth, d.bodyHeight);
  const barrel = movingSolid(body, 0, d.cannonZ, d.cannonWidth, d.cannonDepth, d.cannonHeight);
  const travel = [0, 0];
  function pose(px, pz, heading, left = 0, right = 0, throttle = 0, steer = 0) {
    ground.position.set(px, 0, pz);
    ground.rotation.y = heading;
    travel[0] += left; travel[1] += right;
    for (const { wheel, side } of wheels) wheel.rotation.x = travel[side > 0 ? 1 : 0] / d.wheelRadius;
    for (const { tread, side, start } of treads) {
      const shift = travel[side > 0 ? 1 : 0] + start + 1.44;
      tread.position.z = ((shift % 2.88) + 2.88) % 2.88 - 1.44;
    }
    for (const { lever, side } of levers) lever.rotation.x = (throttle + side * steer) * -.16;
    hull(); barrel();
  }
  return { ground, ownObstacles: [hull.obstacle, barrel.obstacle], pose,
    reset() { travel.fill(0); pose(x, z, yaw); } };
}
