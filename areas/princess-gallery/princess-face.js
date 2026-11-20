import { addGroup } from '../../core/geometry.js';

// Faces look along local +Z. Eye and lash groups share the same pivot so the lids can close in place.
export function buildPrincessFace(THREE, parts, head, { skin, blush, brow, lip, iris, pearl }, canClose = false) {
  const { part, beam, batch, matte } = parts;
  const face = new THREE.Group();
  part(face, 'sphere', skin, 0, 0, 0, .305, .340, .274);
  part(face, 'sphere', skin, 0, -.037, .263, .047, .051, .062);
  part(face, 'sphere', lip, 0, -.144, .246, .056, .025, .027);
  for (const side of [-1, 1]) {
    part(face, 'sphere', skin, side * .289, -.032, -.025, .060, .079, .064);
    part(face, 'sphere', blush, side * .178, -.078, .213, .075, .046, .027);
    part(face, 'sphere', brow, side * .120, .127, .241, .070, .014, .020).rotation.z = side * -.13;
    beam(face, lip, [0, -.137, .271], [side * .072, -.123, .245], .015);
  }
  batch(face, head);

  const dark = matte(0x382135);
  const open = addGroup(THREE, head, 'Open eyes', 0, .035, 0);
  const eyes = new THREE.Group();
  for (const side of [-1, 1]) {
    const x = side * .117;
    part(eyes, 'sphere', dark, x, .003, .251, .074, .062, .033).rotation.z = side * .10;
    part(eyes, 'sphere', pearl, x, -.003, .263, .065, .050, .030);
    part(eyes, 'sphere', iris, x - .007, -.001, .287, .035, .043, .016);
    part(eyes, 'sphere', dark, x - .008, 0, .298, .019, .027, .010);
    part(eyes, 'sphere', pearl, x - .020, .018, .306, .012, .013, .006);
  }
  batch(eyes, open);
  if (!canClose) return;

  const closed = addGroup(THREE, head, 'Closed eyelids', 0, .035, 0);
  const lashes = new THREE.Group();
  for (const side of [-1, 1]) {
    const x = side * .117;
    const outer = [x + side * .065, .006, .250];
    const center = [x, -.017, .288];
    beam(lashes, dark, [x - side * .060, .004, .283], center, .014);
    beam(lashes, dark, center, outer, .015);
    beam(lashes, dark, outer, [x + side * .079, .025, .248], .012);
  }
  batch(lashes, closed);
  return function setEyes(amount) {
    open.visible = amount > .10;
    open.scale.y = Math.max(.06, amount);
    closed.visible = !open.visible;
  };
}
