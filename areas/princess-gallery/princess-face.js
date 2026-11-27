import { addGroup } from '../../core/geometry.js';

// Faces look along local +Z. Eye and lash groups share the same pivot so the lids can close in place.
export function buildPrincessFace(THREE, parts, head, { skin, blush, brow, lip, iris, pearl }, canClose = false, style = {}) {
  const { part, beam, batch, matte } = parts;
  const face = new THREE.Group();
  // A shaped cheek and jaw silhouette, without increasing sphere subdivisions.
  // Keep features in the same coordinate system so existing hair and eyelids fit.
  const shape = new THREE.SphereGeometry(1, 16, 12);
  const vertices = shape.getAttribute('position');
  const jaw = style.jaw ?? .18;
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
    const taper = 1 - jaw * Math.max(0, -y) ** 1.15;
    vertices.setXYZ(i, x * taper, y, z * (1 - .06 * Math.max(0,-y)));
  }
  shape.computeVertexNormals();
  part(face, shape, skin, 0, 0, 0, .305, .340, .274);
  part(face, 'sphere', skin, 0, -.037, .263, .047, .051, .062);
  part(face, 'sphere', lip, 0, -.139, .241, .063, .021, .025);
  for (const side of [-1, 1]) {
    part(face, 'sphere', skin, side * .289, -.032, -.025, .060, .079, .064);
    part(face, 'sphere', blush, side * .176, -.075, .218, .064, .038, .016);
    part(face, 'sphere', brow, side * .120, .127, .239, .067, .012, .018).rotation.z = side * -.13;
    beam(face, lip, [0, -.134, .260], [side * .061, -.123, .243], .010);
  }
  batch(face, head);

  const dark = matte(0x382135);
  const open = addGroup(THREE, head, 'Open eyes', 0, .035, 0);
  const eyes = new THREE.Group();
  const eyeWidth = style.eyeWidth ?? 1;
  for (const side of [-1, 1]) {
    const x = side * .117;
    part(eyes, 'sphere', dark, x, .003, .251, .074 * eyeWidth, .058, .031).rotation.z = side * .10;
    part(eyes, 'sphere', pearl, x, -.003, .263, .065 * eyeWidth, .046, .028);
    part(eyes, 'sphere', iris, x - .007, -.001, .287, .034, .040, .016);
    part(eyes, 'sphere', dark, x - .008, 0, .298, .019, .027, .010);
    part(eyes, 'sphere', pearl, x - .020, .018, .306, .012, .013, .006);
    beam(eyes, dark, [x + side*.045,.036,.270], [x + side*.073,.050,.247], .012);
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
