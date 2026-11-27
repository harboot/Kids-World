import { addGroup, SURFACE_GAP } from '../../core/geometry.js';
import { addGallerySign, addSolid, spaceTransform } from './parts.js';

export const TICKET_POST = Object.freeze({ x: 6.5, z: 49.7, yaw: -Math.PI / 2 });

export function buildTicketPost({ THREE, document, parent, parts, colors, obstacles }) {
  const { part, batch, matte } = parts;
  const { ivory, cream, gold, plum, wine } = colors;
  const { x, z, yaw } = TICKET_POST;
  const { toWorld } = spaceTransform({ position: { x, z }, rotation: yaw });
  const booth = addGroup(THREE, parent, 'Princess Gallery ticket post', x, 0, z, yaw);
  const detail = new THREE.Group();
  const wood = matte(0x986d52), dark = matte(0x4f3e4d), paper = matte(0xffe9b7);
  // The front window is open, keeping the officer visible from the entrance.
  part(detail, 'box', plum, 0, .08, 0, 2.65, .16, 1.85);
  part(detail, 'box', ivory, 0, .58, .75, 2.5, 1.0, .22);
  part(detail, 'box', wood, 0, 1.14, .75, 2.75, .13, .46);
  part(detail, 'box', wine, 0, 1.38, -.81, 2.48, 2.44, .16);
  for (const side of [-1,1]) {
    part(detail, 'box', ivory, side*1.20, .58, 0, .16, 1.0, 1.58);
    for (const zz of [-.76,.76]) part(detail, 'box', gold, side*1.20, 1.45, zz, .15, 2.58, .15);
    part(detail, 'box', wine, side*.72, .55, .87, .73, .62, .045);
    part(detail, 'gem', gold, side*.72, .55, .91, .13, .18, .055);
  }
  part(detail, 'box', plum, 0, 2.65, 0, 2.91, .20, 2.13);
  part(detail, 'box', gold, 0, 2.78, 0, 2.98, .075, 2.18);
  for (const side of [-1,1]) part(detail, 'box', wine, 0, 3.02, side*.49, 2.86, .14, 1.13).rotation.x = side*.39;
  part(detail, 'box', gold, 0, 3.22, 0, 2.90, .12, .17);
  part(detail, 'box', plum, 0, 2.42, .90, 2.42, .43, .14);
  addGallerySign(THREE, document, booth, ['TICKETS'], 0, 2.42, .98 + SURFACE_GAP.detail, 2.28, .37);
  part(detail, 'box', dark, -.78, 1.26, .65, .35, .12, .29);
  part(detail, 'box', dark, -.78, 1.42, .58, .29, .24, .055).rotation.x = -.18;
  for (let i=0;i<3;i++) part(detail, 'box', paper, .72+i*.06, 1.215+i*.018, .64, .25, .017, .13).rotation.y = i*.11;
  batch(detail, booth);
  addSolid(obstacles, x, z, 2.85, 2.0, 3.30, yaw);
  const [ox,oz] = toWorld(0, -.18);
  return { name: 'Ticket officer', x: ox, z: oz, y: .16, yaw, style: 'ticket', color: 0x76537b, skin: 0xc4866e, hair: 0x392826 };
}
