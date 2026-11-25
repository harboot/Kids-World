import { floorRise, gallery } from './layout.js';
import { crack, ink } from './masonry.js';
import { harpistOpening, harpistRoom } from './harpists.js';

const rearZ = -14.8;
const opening = [
  [8.15, 5.72], [8.38, 5.55], [10.27, 5.62], [10.82, 5.92], [10.96, 6.55],
  [11.50, 7.39], [11.91, 8.28], [12.03, 9.23], [12.47, 10.35], [12.49, 10.95],
  [12.17, 11.14], [11.84, 10.97], [11.28, 9.86], [11.44, 11.48], [11.32, 12.07],
  [10.97, 12.27], [10.63, 12.03], [10.42, 10.67], [10.27, 12.35], [10.01, 12.73],
  [9.68, 12.78], [9.34, 12.45], [9.27, 10.58], [8.94, 11.96], [8.59, 12.23],
  [8.19, 12.04], [8.08, 11.65], [8.29, 9.26], [7.47, 9.03], [6.70, 9.34],
  [6.16, 9.15], [5.94, 8.78], [6.15, 8.40], [7.04, 7.86], [7.68, 7.08], [8.02, 6.48],
];

function insideOpening(x, y) {
  let inside = false;
  for (let i = 0, j = opening.length - 1; i < opening.length; j = i++) {
    const [ax, ay] = opening[i];
    const [bx, by] = opening[j];
    if ((ay > y) !== (by > y) && x < ax + (bx - ax) * (y - ay) / (by - ay)) inside = !inside;
  }
  return inside;
}

export function damagedRearWall(kit, layout, height, random) {
  kit.extrude('Hand-shaped breach', ink.plaster,
    [[-18.75, floorRise], [18.75, floorRise], [18.75, height], [-18.75, height]],
    gallery.rear - rearZ, 0, 0, rearZ, 0, [opening, harpistOpening]);
  layout.addBarrier((x, z, radius, feet) => {
    if (Math.abs(x) > 18.75 + radius || z < rearZ - radius || z > gallery.rear + radius || feet < floorRise || feet >= height) return false;
    if (x < 6 || x > 12.5 || feet < 5.55) return true;
    for (const px of [x - radius, x, x + radius]) {
      for (const offset of [.04, .9, 1.82]) {
        if (!insideOpening(px, feet + offset)) return true;
      }
    }
    return false;
  });

  // Recess behind the new aperture: a visible room with a back wall, not a tunnel.
  const r=harpistRoom;
  kit.box(0x51483e,r.x,r.y+1.48,r.z-2.15,r.halfWidth*2,2.96,.18);
  kit.box(0x81705c,r.x,r.y-.035,r.z-1.03,r.halfWidth*2,.07,2.06);
  const face = kit.wall(0, gallery.rear, 0);
  // A single joined frame, entirely forward of the plaster facade. Its inner
  // edge is inset into the opening, never coplanar with the masonry reveal.
  const left=r.x-r.halfWidth,right=r.x+r.halfWidth;
  kit.extrude('Harpists aperture frame',ink.wood,
    [[left-.08,r.sill-.025],[right+.08,r.sill-.025],[right+.08,r.lintel+.08],[left-.08,r.lintel+.08]],
    .14,0,0,r.z+.025,0,
    [[[left+.025,r.sill+.025],[right-.025,r.sill+.025],[right-.025,r.lintel-.025],[left+.025,r.lintel-.025]]]);
  for (const [i, [x, y]] of opening.entries()) {
    const [nextX, nextY] = opening[(i + 1) % opening.length];
    const dx = nextX - x;
    const dy = nextY - y;
    const length = Math.hypot(dx, dy);
    const offset = .07 / length;
    const u = (x + nextX) / 2 + dy * offset;
    const v = (y + nextY) / 2 - dx * offset;
    face(i % 3 ? ink.brick : ink.brickLight, u, v, .035, length * .87, .13, .16, 0, Math.atan2(dy, dx));
  }
  for (const [x, y, direction] of [[5.66, 7.7, 1], [7.4, 10.15, -1], [12.53, 8.47, 1], [13.09, 10.20, -1]]) {
    crack(face, x, y, 1.55, direction);
  }

  for (let i = 0; i < 22; i++) {
    const x = 6.3 + random() * 6.6;
    const z = -6.3 + random() * 3.0;
    const size = .12 + random() * .31;
    kit.box(i % 3 ? ink.brick : ink.stone, x, size * .22, z, size, size * .48, size * .72,
      random() * Math.PI, random() * .5, random() * .32);
  }
}
