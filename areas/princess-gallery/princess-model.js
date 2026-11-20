import { addGroup } from '../../core/geometry.js';

// Ring profiles give the gowns a fitted waist and a folded, elliptical hem.
export function gownGeometry(THREE, profile, pleats = 10) {
  const positions = [], indices = [];
  const segments = 48;
  for (const [y, width, depth, fold = 0] of profile) {
    for (let i = 0; i < segments; i++) {
      const angle = i / segments * 2 * Math.PI;
      const radius = 1 + fold * Math.cos(angle * pleats);
      positions.push(Math.cos(angle) * width * radius, y, Math.sin(angle) * depth * radius);
    }
  }
  for (let row = 0; row < profile.length - 1; row++) {
    for (let i = 0; i < segments; i++) {
      const a = row * segments + i;
      const b = row * segments + (i + 1) % segments;
      indices.push(a, a + segments, b, b, a + segments, b + segments);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function buildPrincessFace(THREE, parts, head, skin, irisColor) {
  const { part, beam, matte, batch } = parts;
  const white = matte(0xfff5ef);
  const dark = matte(0x443041);
  const brow = matte(0x9e673c);
  const iris = matte(irisColor);
  const face = new THREE.Group();
  const eyes = addGroup(THREE, head, 'Open eyes');
  const lids = addGroup(THREE, head, 'Sleeping eyelids');
  const opened = new THREE.Group();
  const closed = new THREE.Group();
  part(face, 'sphere', skin, 0, 0, 0, .285, .322, .248);
  part(face, 'sphere', skin, 0, -.041, .239, .046, .058, .056);
  for (const side of [-1, 1]) {
    const x = side * .116;
    part(face, 'sphere', skin, side * .274, -.025, -.004, .047, .080, .046);
    part(face, 'sphere', brow, x, .132, .217, .071, .014, .022).rotation.z = side * -.19;
    part(opened, 'sphere', white, x, .057, .222, .064, .049, .025);
    part(opened, 'sphere', iris, x + .006, .057, .245, .028, .036, .014);
    part(opened, 'sphere', dark, x + .006, .056, .257, .014, .023, .008);
    part(opened, 'sphere', white, x - .004, .07, .264, .010, .011, .006);
    beam(closed, dark, [x - .052, .047, .225], [x, .029, .253], .017);
    beam(closed, dark, [x, .029, .253], [x + .052, .047, .225], .017);
  }
  const lips = matte(0xb9516a);
  for (const side of [-1, 1]) {
    beam(face, lips, [0, -.159, .223], [side * .057, -.142, .215], .018);
  }
  part(face, 'sphere', lips, 0, -.162, .215, .038, .016, .018);
  batch(face, head);
  // The eye groups sit at lid height so scaling them produces a blink.
  for (const group of [opened, closed]) {
    for (const mesh of group.children) mesh.position.y -= .05;
  }
  eyes.position.y = lids.position.y = .05;
  batch(opened, eyes);
  batch(closed, lids);
  lids.visible = false;
  return { eyes, lids };
}

export function buildPrincessArm(THREE, parts, body, side, y, sleeve, skin, glove = skin) {
  const { part, batch } = parts;
  const upper = addGroup(THREE, body, side < 0 ? 'Left shoulder' : 'Right shoulder', side * .30, y, 0);
  const elbow = addGroup(THREE, upper, 'Elbow', 0, -.323, 0);
  const shoulder = new THREE.Group(), forearm = new THREE.Group();
  part(shoulder, 'sphere', skin, 0, -.17, 0, .073, .205, .074);
  part(shoulder, 'sphere', sleeve, 0, -.034, -.001, .126, .135, .119);
  part(forearm, 'sphere', glove, 0, -.137, 0, .064, .18, .064);
  part(forearm, 'sphere', glove, 0, -.307, .014, .067, .098, .045);
  part(forearm, 'sphere', glove, -side * .044, -.277, .036, .029, .048, .030);
  batch(shoulder, upper);
  batch(forearm, elbow);
  return { upper, elbow };
}
