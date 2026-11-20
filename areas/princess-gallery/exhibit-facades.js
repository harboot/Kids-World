import { addGroup, paintCanvasTexture, SURFACE_GAP } from '../../core/geometry.js';
import { seededRandom } from '../../core/random.js';

export function buildExhibitFacade({ THREE, document, bay, parts, exhibit, outline, thickness,
  opening, deckBottom, upperLintel }) {
  const { id, bounds, entrance } = exhibit;
  const woodland = id === 'rapunzel' || id === 'aurora';
  const { part, beam, batch, matte } = parts;
  const [base, joints, stones] = id === 'rapunzel'
    ? ['#ae9b88', '#877d76', ['#a89382', '#b39e8a', '#ab9d8e', '#b3a396']]
    : ['#c5b5b6', '#ab9da8', ['#ccbabe', '#c4b3b6', '#b8abb4', '#c5b7b1']];
  const map = paintCanvasTexture(THREE, document, 512, 512, (ink, w, h) => {
    const random = seededRandom(218);
    ink.fillStyle = joints;
    ink.fillRect(0, 0, w, h);
    const width = w / 4, height = h / 8;
    for (let row = 0; row < 8; row++) {
      for (let i = 0; i < 4; i++) {
        const x = (i - (row % 2) * .5) * width, y = row * height;
        const color = stones[Math.floor(random() * stones.length)];
        for (const start of [x, x + w]) {
          ink.fillStyle = color;
          ink.fillRect(start + 1.2, y + 1.4, width - 2.4, height - 2.8);
          ink.fillStyle = '#fff8e235';
          ink.fillRect(start + 2, y + 1.8, width - 4, 1.3);
        }
      }
    }
  });
  if (map) map.wrapS = map.wrapT = THREE.RepeatWrapping;
  const stone = matte(map ? 0xffffff : base, { map });
  const trim = matte(woodland ? 0x8b6e72 : 0xb1a0ad);
  const edge = matte(woodland ? 0x9d7e78 : 0xd4bdab);
  const emblem = matte(woodland ? 0xd0a16b : 0xe2bc82);
  const group = addGroup(THREE, bay, woodland ? 'Woodland stone and ivy facade' : 'Royal palace facade');
  const details = new THREE.Group();
  const front = bounds.depth / 2;

  function panel([ax, az], [bx, bz], bottom, top, fullHeight = true) {
    const length = Math.hypot(bx - ax, bz - az);
    const yaw = Math.atan2(az - bz, bx - ax);
    const face = thickness / 2 + SURFACE_GAP.trim;
    const x = (ax + bx) / 2 + Math.sin(yaw) * face;
    const z = (az + bz) / 2 + Math.cos(yaw) * face;
    const plane = new THREE.PlaneGeometry(length + .03, top - bottom);
    const uv = plane.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, uv.getX(i) * length / 19, uv.getY(i) * (top - bottom) / 11);
    }
    part(group, plane, stone, x, (bottom + top) / 2, z, 1, 1, 1).rotation.y = yaw;
    if (fullHeight) {
      for (const [y, height, material] of [[8.1, .20, trim], [8.43, .17, edge], [top - .43, .29, trim]]) {
        part(details, 'box', material, x, y, z, length + .03, height, .20).rotation.y = yaw;
      }
    }
  }

  const gap = entrance / 2 + .13;
  panel(outline[0], [-gap, front], 0, bounds.height);
  panel([gap, front], outline[1], 0, bounds.height);
  for (let i = 1; i < outline.length; i++) panel(outline[i], outline[(i + 1) % outline.length], 0, bounds.height);
  panel([-gap, front], [gap, front], opening, deckBottom, false);
  panel([-gap, front], [gap, front], upperLintel, bounds.height, false);

  const face = front + thickness / 2 + .10;
  const random = seededRandom(woodland ? 736 : 198);
  const greens = [0x486b60, 0x6c8a68, 0x7b9367].map(color => matte(color));
  const ivyStem = matte(0x5c6250);
  const banner = matte(0x526b9b);
  const bannerShape = new THREE.Shape([
    new THREE.Vector2(-1, 1), new THREE.Vector2(-1, -.58), new THREE.Vector2(0, -1),
    new THREE.Vector2(1, -.58), new THREE.Vector2(1, 1),
  ]);
  const fabric = new THREE.ShapeGeometry(bannerShape);
  for (const side of [-1, 1]) {
    const x = side * (gap + (outline[1][0] - gap) * .58);
    if (woodland) {
      for (const [start, height] of [[x - .47, 9.6], [x + .85, 15.2]]) {
        let last = [start, .85, face];
        for (let y = 1.25; y <= height; y += .67) {
          const branch = [start + Math.sin(y * .63) * .81, y, face];
          beam(details, ivyStem, last, branch, .058);
          for (const leafSide of [-1, 1]) {
            const size = .22 + random() * .26;
            const leaf = part(details, 'ball', greens[Math.floor(random() * greens.length)],
              branch[0] + leafSide * (.20 + random() * .31), y + (random() - .5) * .56,
              face + .064, size, size * 1.36, .105);
            leaf.rotation.z = leafSide * -.52 - random() * .34;
          }
          last = branch;
        }
      }
    } else {
      const y = 12.32;
      part(details, 'box', edge, x, 5.21, face, .46, 5.38, .40);
      part(details, 'box', edge, x, 18.1, face, .46, 9.56, .40);
      part(details, 'box', trim, x, 15.5, face, 2.51, .30, .32);
      part(details, fabric, emblem, x, y, face + .239, 1.14, 3.04, 1);
      part(details, fabric, banner, x, y + .01, face + .260, 1.04, 2.91, 1);
      for (let i = 0; i < 4; i++) {
        const tip = part(details, 'gem', emblem, x, y + .12, face + .315, .19, .75, .064);
        tip.rotation.z = i * Math.PI / 4;
      }
    }
  }
  batch(details, group);
}
