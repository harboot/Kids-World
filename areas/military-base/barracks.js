import { ink } from './scenery.js';

// Open, walkable barracks; static furniture uses the area's existing instanced geometry.
export function buildBarracks(kit, { name, x, z, width, depth, tint, yaw }) {
  const { group, box, part, solid, sign } = kit;
  const hall = group(name, x, 0, z, yaw);
  const front = depth / 2, side = width / 2, floor = .135;
  const height = 2.75, rise = 2.65, thickness = .24, doorWidth = 2.24, doorHeight = 2.24;
  kit.groundShadow(hall, .7, -1, width + 3.8, depth + 4.4);
  box(hall, ink.footing, 0, floor / 2, 0, width + .72, floor, depth + .9);
  solid(hall, 0, 0, width + .72, depth + .9, floor);
  // Keep the exterior silhouette while replacing the old solid block with individual walls.
  const wall = (xx, zz, w, d) => {
    box(hall, tint, xx, floor + height / 2, zz, w, height, d);
    solid(hall, xx, zz, w, d, floor + height + rise);
  };
  for (const s of [-1, 1]) {
    wall(s * (side - thickness / 2), 0, thickness, depth - thickness * 2);
    const wing = (width - doorWidth) / 2;
    wall(s * (doorWidth + wing) / 2, front - thickness / 2, wing, thickness);
  }
  wall(0, -front + thickness / 2, width, thickness);
  box(hall, tint, 0, floor + doorHeight + (height - doorHeight) / 2, front - thickness / 2,
    doorWidth, height - doorHeight, thickness);
  const roofY = floor + height;
  part(hall, 'arch', tint, 0, roofY, 0, width, rise, depth);
  part(hall, 'arch', 0x54a987, 0, roofY + .02, 0, width + .37, rise + .21, depth - .29);
  for (let zz = -front + .62; zz < front - .43; zz += 1.25)
    part(hall, 'arch', 0x70bd9f, 0, roofY + .03, zz, width + .51, rise + .24, .092);
  for (const s of [-1, 1]) {
    part(hall, 'arch', ink.teal, 0, roofY + .01, s * (front - .07), width + .60, rise + .34, .27);
    part(hall, 'arch', tint, 0, roofY - .005, s * (front + .06), width - .11, rise - .07, .12);
    box(hall, ink.paleTeal, s * (side + .05), roofY - .09, 0, .15, .18, depth + .31);
    // Closed decorative window panels remain on exterior; interior wall is solid.
    const face = group(name + ' window wall', s * side, 0, 0, s * Math.PI / 2, hall);
    for (let k = -front + 2; k < front - 1.2; k += 3.65) {
      box(face, ink.dark, k, 1.7, .045, 2.12, .93, .15);
      box(face, 0xe6c88c, k, 1.7, .14, 1.94, .73, .05, [], 'powered');
      for (const q of [-.36,.36]) box(face, ink.steel, k + q, 1.7, .19, .065, .73, .04);
    }
    box(hall, ink.dark, s * (doorWidth / 2 + .08), floor + doorHeight / 2, front + .025, .16, doorHeight, .18);
    // Door leaves opened inward at 90 degrees, leaving a generous central entrance.
    const door = group(name + ' open door', s * (doorWidth / 2 + .10), floor, front - .65, 0, hall);
    box(door, ink.teal, 0, 1.06, 0, .10, 2.12, 1.02);
    box(door, ink.steel, -s * .065, 1.07, -.31, .055, .13, .10);
    solid(door, 0, 0, .10, 1.02, 2.12);
  }
  box(hall, ink.dark, 0, floor + doorHeight + .06, front + .025, doorWidth + .32, .16, .18);
  sign(hall, name.toUpperCase(), 0, 3.69, front + .19, 4.3, .66);
  // Eight two-level bunks per room, a central aisle, lockers, and a small table.
  const bedX = side - 1.34;
  function bunk(s, zz, index) {
    const bed = group(name + ' bunk ' + index, s * bedX, floor, zz, 0, hall);
    const frame = 0x4b605c, mattress = 0xd4c8a6;
    for (const xx of [-.55,.55]) for (const z of [-1.02,1.02])
      box(bed, frame, xx, .94, z, .085, 1.88, .085);
    for (const level of [.43,1.43]) {
      box(bed, frame, 0, level, 0, 1.16, .12, 2.14);
      box(bed, mattress, 0, level + .13, 0, 1.04, .14, 2.02);
      box(bed, 0xeee4ce, 0, level + .24, -.71, .74, .10, .40);
      box(bed, index % 2 ? 0x6c8756 : 0x85946d, 0, level + .221, .38, 1.05, .045, 1.06);
      box(bed, 0xaab28a, 0, level + .251, .18, 1.06, .018, .10);
    }
    const inside = -s * .61;
    for (const zz of [.64,.98]) box(bed, frame, inside, .94, zz, .065, 1.88, .065);
    for (const y of [.32,.66,1.00,1.34,1.68]) box(bed, ink.steel, inside, y, .81, .07, .06, .36);
    box(bed, frame, -s * .56, 1.76, -.15, .075, .08, 1.35);
    solid(bed, -s * .04, 0, 1.28, 2.16, 1.90);
  }
  let index = 0;
  for (const s of [-1,1]) for (const zz of [-4.65,-1.85,.95,3.75]) bunk(s, zz, ++index);
  for (const s of [-1,1]) {
    const locker = group(name + ' locker row', s * 2.00, floor, -front + .63, 0, hall);
    for (const xx of [-.35,.35]) {
      box(locker, 0x788b78, xx, .91, 0, .65, 1.82, .65);
      box(locker, 0x8da08a, xx, .91, .34, .59, 1.70, .055);
      box(locker, ink.dark, xx + .19, .91, .383, .07, .16, .055);
      for (let j = 0; j < 3; j++) box(locker, ink.dark, xx, 1.56 + j * .055, .38, .28, .027, .025);
    }
    solid(locker, 0, 0, 1.35, .72, 1.82);
  }
  const desk = group(name + ' table', 0, floor, -front + .88, 0, hall);
  box(desk, ink.sand, 0, .76, 0, 1.34, .12, .68);
  for (const xx of [-.57,.57]) for (const zz of [-.24,.24]) box(desk, ink.dark, xx, .35, zz, .09,.70,.09);
  box(desk, ink.pale, -.32,.84,0,.35,.045,.25);
  solid(desk, 0, 0, 1.34, .68, .82);
  for (const zz of [-3.45,3.45]) {
    const fixture = group('Barracks ceiling fixture', 0, roofY - .12, zz, 0, hall);
    box(fixture, ink.dark, 0, .035, 0, 1.53, .13, .26);
    box(fixture, 0xffe4b5, 0, -.05, 0, 1.38, .06, .20, [], 'powered');
  }
}
