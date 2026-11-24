import { paintCanvasTexture } from '../../core/geometry.js';
import { footprint, gallery, wingSlope } from './layout.js';

export const ink = {
  plaster: 0xba9b81, cream: 0xc8b39c, brick: 0x965340, brickLight: 0xb16d53,
  stone: 0xa69a8b, band: 0x897b6c, shade: 0x605248, roof: 0x4f4948,
  ridge: 0x665954, tile: 0x7a655c, wood: 0x674035, door: 0x895543,
  dark: 0x41342e, green: 0x42605b, pane: 0x75837a, iron: 0x3c3837,
  oxblood: 0x974945, linen: 0xd8b389, brass: 0xba8a52,
};

export function masonryKit(THREE, scene) {
  const parts = new Map();
  const labels = new Map();
  const labelMaterials = new Map();
  const boxGeometry = new THREE.BoxGeometry();
  const drumGeometry = new THREE.CylinderGeometry(.5, .5, 1, 12);
  const ringGeometry = new THREE.CylinderGeometry(.5, .5, 1, 14, 1, true);
  const profile = new THREE.Shape();
  profile.moveTo(-.5, 0);
  profile.lineTo(.5, 0);
  profile.lineTo(0, 1);
  profile.closePath();
  const gableGeometry = new THREE.ExtrudeGeometry(profile, { depth: 1, bevelEnabled: false });
  const chip = new THREE.Shape([
    [-.5, -.13], [-.38, -.31], [-.14, -.31], [-.08, -.49], [.24, -.43],
    [.38, -.24], [.49, -.16], [.42, .18], [.21, .27], [.12, .46],
    [-.15, .42], [-.21, .30], [-.42, .24],
  ].map(([x, y]) => new THREE.Vector2(x, y)));
  const chipGeometry = new THREE.ShapeGeometry(chip);
  const panelGeometry = new THREE.PlaneGeometry();
  const ovalGeometry = new THREE.SphereGeometry(.5, 12, 8);
  const leafGeometry = new THREE.DodecahedronGeometry(.5);
  const ground = new THREE.Shape(footprint.map(([x, z]) => new THREE.Vector2(x, z)));
  const groundGeometry = new THREE.ExtrudeGeometry(ground, { depth: .32, bevelEnabled: false });
  const material = new THREE.MeshStandardMaterial({ roughness: .96, side: THREE.DoubleSide });
  const vertexMaterial = new THREE.MeshStandardMaterial({ roughness: .96, side: THREE.DoubleSide, vertexColors: true });
  const color = new THREE.Color();
  const transform = new THREE.Object3D();
  const projection = new THREE.Matrix4();

  function place(geometry, paint, x, y, z, width, height, depth, yaw = 0, pitch = 0, roll = 0, shadow = true) {
    const key = geometry.id + ':' + shadow;
    if (!parts.has(key)) parts.set(key, { geometry, shadow, instances: [] });
    transform.position.set(x, y, z);
    transform.rotation.set(pitch, yaw, roll, 'YXZ');
    transform.scale.set(width, height, depth);
    transform.updateMatrix();
    parts.get(key).instances.push({ matrix: transform.matrix.clone().premultiply(projection), paint });
  }

  function box(...args) { place(boxGeometry, ...args); }
  function drum(...args) { place(drumGeometry, ...args); }
  function ring(...args) { place(ringGeometry, ...args); }
  function wall(originX, originZ, yaw) {
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    function face(paint, u, y, v, width, height, depth, pitch = 0, roll = 0, shadow = true) {
      box(paint, originX + cos * u + sin * v, y, originZ - sin * u + cos * v, width, height, depth, yaw, pitch, roll, shadow);
    }
    face.chip = (paint, u, y, v, width, height, roll = 0) =>
      place(chipGeometry, paint, originX + cos * u + sin * v, y, originZ - sin * u + cos * v,
        width, height, 1, yaw, 0, roll, false);
    face.panel = (paint, u, y, v, width, height) =>
      place(panelGeometry, paint, originX + cos * u + sin * v, y, originZ - sin * u + cos * v,
        width, height, 1, yaw, 0, 0, false);
    face.label = (title, u, y, v, width, height) => {
      if (!labels.has(title)) {
        const texture = paintCanvasTexture(THREE, globalThis.document, 96, 40, ctx => {
          ctx.fillStyle = '#48392e';
          ctx.font = 'bold 31px "Noto Serif CJK SC", serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(title, 48, 21);
        });
        if (!texture) return;
        const geometry = new THREE.PlaneGeometry();
        labels.set(title, geometry);
        labelMaterials.set(geometry, new THREE.MeshBasicMaterial({ map: texture, alphaTest: .48 }));
      }
      place(labels.get(title), 0xffffff, originX + cos * u + sin * v, y, originZ - sin * u + cos * v,
        width, height, 1, yaw, 0, 0, false);
    };
    return face;
  }

  return {
    box, drum, ring, wall,
    extrude(name, paint, points, depth, x, y, z, yaw = 0, holes = []) {
      const vectors = polygon => polygon.map(([u, v]) => new THREE.Vector2(u, v));
      const shape = new THREE.Shape(vectors(points));
      shape.holes = holes.map(polygon => new THREE.Path(vectors(polygon)));
      const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
      geometry.name = name;
      place(geometry, paint, x, y, z, 1, 1, 1, yaw);
    },
    mesh(name, paint, geometry) {
      geometry.name = name;
      place(geometry, paint, 0, 0, 0, 1, 1, 1);
    },
    frame(x, y, z, yaw, draw) {
      projection.makeRotationY(yaw).setPosition(x, y, z);
      try { draw(); } finally { projection.identity(); }
    },
    oval(...args) { place(ovalGeometry, ...args); },
    leaf(...args) { place(leafGeometry, ...args); },
    gateLetter(letter, x, y, z) {
      const texture = paintCanvasTexture(THREE, globalThis.document, 64, 64, ctx => {
        ctx.fillStyle = '#594033';
        ctx.font = 'bold 49px "Noto Serif CJK SC", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(letter, 32, 33);
      });
      if (!texture) return;
      const label = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
      const geometry = new THREE.PlaneGeometry(.83, .83);
      for (const side of [-1, 1]) {
        const mesh = new THREE.Mesh(geometry, label);
        mesh.rotation.y = side < 0 ? Math.PI : 0;
        mesh.position.set(x * side, y, z + side * .106);
        scene.add(mesh);
      }
    },
    wing(side, draw) {
      const shear = side * wingSlope;
      projection.elements[8] = shear;
      projection.elements[12] = -gallery.court * shear;
      try { draw(); } finally { projection.identity(); }
    },
    ground() { place(groundGeometry, 0xa89079, 0, -.035, 0, 1, 1, 1, 0, Math.PI / 2, 0, false); },
    pavement(paint, x, z, width, depth, yaw) {
      place(chipGeometry, paint, x, -.022, z, width, depth, 1, yaw, Math.PI / 2, 0, false);
    },
    gable(...args) { place(gableGeometry, ...args); },
    beam(paint, x1, y1, z1, x2, y2, z2, width) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dz = z2 - z1;
      const horizontal = Math.hypot(dx, dz);
      box(paint, (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2,
        Math.hypot(horizontal, dy), width, width, Math.atan2(-dz, dx), 0, Math.atan2(dy, horizontal));
    },
    finish() {
      for (const { geometry, shadow, instances } of parts.values()) {
        const surface = labelMaterials.get(geometry) ?? (geometry.hasAttribute('color') ? vertexMaterial : material);
        const mesh = new THREE.InstancedMesh(geometry, surface, instances.length);
        mesh.name = geometry.name;
        mesh.castShadow = shadow;
        mesh.receiveShadow = true;
        instances.forEach((part, i) => {
          mesh.setMatrixAt(i, part.matrix);
          mesh.setColorAt(i, color.setHex(part.paint));
        });
        scene.add(mesh);
      }
    },
  };
}

export function exposedBrick(face, x, y, width, height, random) {
  face.chip(0x806257, x, y, .015, width, height);
  const rows = Math.max(2, Math.floor(height / .15));
  for (let row = 0; row < rows; row++) {
    const v = (row + .5) / rows - .5;
    const start = -.42 + Math.abs(v + .07) * .62 + random() * .09;
    const end = .40 - Math.abs(v - .04) * .64 - random() * .07;
    for (let u = start; u < end; u += .31 / width) {
      const brick = Math.min(.291, (end - u + .08) * width);
      if (brick < .095) continue;
      const paint = [ink.brick, ink.brickLight, 0x995f49][Math.floor(random() * 3)];
      face.panel(paint, x + u * width, y + v * height, .032, brick, .12);
    }
  }
}

export function crack(face, x, y, length, direction = 1) {
  let dx = 0;
  for (const [i, angle] of [-.23, .53, -.48, .26, -.34].entries()) {
    const segment = length / 5;
    const roll = angle * direction;
    face(0x746256, x + dx - Math.sin(roll) * segment / 2, y + (i + .5) * segment,
      .022, .028 - i * .002, segment * 1.16, .012, 0, roll, false);
    dx -= Math.sin(roll) * segment;
  }
}

export function laundry(face, x, y, reach, variation) {
  const colors = [0xcab59f, 0xa6857d, 0x828b91, 0xd3c0a8, 0xa88d70];
  face(0x6d5c4b, x, y, reach, 3.78, .036, .032, 0, -.035);
  for (let i = 0; i < 5; i++) {
    const width = i % 2 ? .56 : .43;
    const height = i % 3 === 0 ? .91 : .61;
    const u = x + (i - 2) * .62;
    const roll = (i % 2 ? -.06 : .08) + (variation % 3 - 1) * .03;
    face(colors[(i + variation) % colors.length], u, y - height / 2 + .02, reach + .020, width, height, .052, 0, roll);
    face(colors[(i + variation) % colors.length], u + width * .32, y - height / 2, reach + .053,
      .072, height * .97, .038, 0, roll);
  }
}

export function roof(draw, width, depth, eave, random) {
  const pitch = .29;
  const halfDepth = depth / 2;
  const rise = Math.tan(pitch) * halfDepth;
  const slope = halfDepth / Math.cos(pitch);
  for (const side of [-1, 1]) {
    draw(ink.roof, 0, eave + rise / 2, side * halfDepth / 2, width, .22, slope, side * pitch);
    draw(ink.wood, 0, eave - .03, side * halfDepth, width + .10, .24, .15);
    const columns = Math.floor(width / .47);
    const spacing = width / columns;
    for (let i = 0; i < columns; i++) {
      const x = -width / 2 + (i + .5) * spacing;
      const worn = random() < .13;
      const paint = [ink.tile, ink.ridge, 0x554a43, 0x756c62][Math.floor(random() * 4)];
      draw(paint, x, eave + rise / 2 + .146 + (worn ? .024 : 0),
        side * halfDepth / 2 + (worn ? side * .11 : 0), worn ? .21 : .16, .11, slope * (worn ? .92 : 1), side * pitch);
    }
    for (let row = 1; row < 7; row++) {
      const t = row / 7;
      draw(ink.ridge, 0, eave + rise * (1 - t) + .133, side * halfDepth * t, width, .085, .042, side * pitch);
    }
  }
  draw(ink.tile, 0, eave + rise + .16, 0, width + .35, .23, .25);
}
