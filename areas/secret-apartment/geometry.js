import { addGroup, addMesh, paintCanvasTexture, rectangleBounds, SURFACE_GAP } from '../../core/geometry.js';
import { PLAYER_ONLY_LAYER } from '../../core/render-layers.js';

export const COLORS = {
  cream: 0xe8ddc9, ivory: 0xf9f1df, plaster: 0xe0d2ba, grout: 0xb0a291,
  ink: 0x252e36, brass: 0xb49a62, steel: 0xadb1ae, walnut: 0x593a2c, oak: 0x967353,
  warmLight: 0xffe9bc, whiteLight: 0xf2f5eb, leaf: 0x527f45,
};

export function createArchitecture(THREE) {
  const shapes = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
    tapered: new THREE.CylinderGeometry(0.32, 0.5, 1, 14),
    oval: new THREE.SphereGeometry(0.5, 14, 9),
    leaf: new THREE.IcosahedronGeometry(0.5, 1),
  };
  const matte = new THREE.MeshStandardMaterial({ roughness: 0.83 });
  const lit = new THREE.MeshBasicMaterial();
  const matrix = new THREE.Object3D();
  const tint = new THREE.Color();
  const signs = new Map();

  function group(parent, name, x = 0, y = 0, z = 0, yaw = 0) {
    return addGroup(THREE, parent, name, x, y, z, yaw);
  }

  function builder(root, solids = []) {
    const batches = new Map();
    function part(color, x, y, z, w, h, d, { shape = 'box', pitch = 0, yaw = 0, roll = 0, glow = false, playerOnly = false } = {}) {
      const key = `${shape}:${glow}:${playerOnly}`;
      if (!batches.has(key)) batches.set(key, { shape, glow, playerOnly, parts: [] });
      matrix.position.set(x, y, z);
      matrix.rotation.set(pitch, yaw, roll, 'YXZ');
      matrix.scale.set(w, h, d);
      matrix.updateMatrix();
      batches.get(key).parts.push({ transform: matrix.matrix.clone(), color });
    }

    function solid(x, z, w, d) {
      solids.push(rectangleBounds(x, z, w, d));
    }

    function block(color, x, y, z, w, h, d) {
      part(color, x, y, z, w, h, d);
      solid(x, z, w, d);
    }

    function finish({ independentMaterials = false } = {}) {
      const materials = new Map();
      for (const { shape, glow, playerOnly, parts } of batches.values()) {
        const template = glow ? lit : matte;
        if (!materials.has(template)) materials.set(template, independentMaterials ? template.clone() : template);
        const batch = new THREE.InstancedMesh(shapes[shape], materials.get(template), parts.length);
        if (playerOnly) batch.layers.set(PLAYER_ONLY_LAYER);
        parts.forEach(({ transform, color }, i) => {
          batch.setMatrixAt(i, transform);
          batch.setColorAt(i, tint.setHex(color));
        });
        batch.computeBoundingSphere();
        root.add(batch);
      }
      batches.clear();
    }
    return { root, part, solid, block, finish };
  }

  function box(parent, material, x, y, z, w, h, d) {
    return addMesh(THREE, parent, shapes.box, material, x, y, z, w, h, d);
  }

  function canvasTexture(width, height, draw) {
    return paintCanvasTexture(THREE, globalThis.document, width, height, draw);
  }

  function sign(parent, lines, x, y, z, w, h, { yaw = 0, color = '#fff1cd', background = '#252e36' } = {}) {
    const key = JSON.stringify([lines, w / h, color, background]);
    if (!signs.has(key)) {
      const map = canvasTexture(512, 128, (ctx, width, height) => {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(9, 9, width - 18, height - 18);
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        lines.forEach((line, i) => {
          ctx.font = '700 ' + (i === 0 ? Math.min(77 / lines.length ** 0.45, 270 / (w / h)) : 26) + 'px system-ui';
          ctx.save();
          ctx.translate(width / 2, height * (i + 0.55) / lines.length);
          ctx.scale(width / height / (w / h), 1);
          ctx.fillText(line, 0, 0, (width - 40) * (w / h) / (width / height));
          ctx.restore();
        });
      });
      signs.set(key, new THREE.MeshBasicMaterial({ map, color: map ? 0xffffff : background }));
    }
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), signs.get(key));
    mesh.name = lines.join(' ');
    mesh.position.set(x, y, z);
    mesh.rotation.y = yaw;
    parent.add(mesh);
    return mesh;
  }

  return { group, builder, box, sign, canvasTexture };
}

export function wallX(b, color, left, right, z, height, thickness = 0.24) {
  b.block(color, (left + right) / 2, height / 2, z, right - left, height, thickness);
}

export function wallZ(b, color, x, front, back, height, thickness = 0.24) {
  b.block(color, x, height / 2, (front + back) / 2, thickness, height, back - front);
}

export function tileFloor(b, x, z, w, d, tile, colors, y = 0) {
  const cols = Math.ceil(w / tile);
  const rows = Math.ceil(d / tile);
  const dx = w / cols;
  const dz = d / rows;
  b.part(COLORS.grout, x, y - 0.085, z, w, 0.13, d);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      b.part(colors[(row * 13 + col * 7 + row * col) % colors.length],
        x - w / 2 + (col + 0.5) * dx, y - 0.015, z - d / 2 + (row + 0.5) * dz,
        dx - 0.016, 0.03, dz - 0.016);
    }
  }
}

export function ceilingLight(b, x, z, w, d, y, color = COLORS.warmLight) {
  b.part(COLORS.steel, x, y - 0.033, z, w + 0.09, 0.066, d + 0.09, { playerOnly: true });
  b.part(color, x, y - 0.071, z, w, 0.035, d, { glow: true, playerOnly: true });
}

export function pointLight(THREE, parent, x, y, z, color, intensity, range) {
  const light = new THREE.PointLight(color, intensity, range);
  light.position.set(x, y, z);
  parent.add(light);
  return light;
}

export function roomDoor(b, architecture, number, x, z, yaw, { width = 1.25, height = 2.34, open = false, accent = false } = {}) {
  const dir = Math.cos(yaw);
  const frame = accent ? COLORS.brass : 0x836c58;
  const face = z + dir * 0.15;
  for (const side of [-1, 1]) b.part(frame, x + side * width / 2, height / 2, face, 0.115, height, 0.15);
  b.part(frame, x, height + 0.0575, face, width + 0.115, 0.115, 0.15);
  if (!open) {
    b.block(COLORS.walnut, x, height / 2, z, width - 0.09, height, 0.25);
    const front = z + dir * (0.125 + SURFACE_GAP.detail);
    b.part(0x694a38, x, 1.11, front, width - 0.26, 1.95, 0.025);
    b.part(COLORS.brass, x + dir * (width / 2 - 0.25), 1.02, front + dir * 0.045, 0.17, 0.05, 0.058);
    b.part(COLORS.ink, x, 1.55, front + dir * 0.021, 0.03, 0.03, 0.024, { shape: 'oval' });
  }
  if (number) architecture.sign(b.root, [number], x, height + 0.31, face, accent ? 0.76 : 0.58,
    accent ? 0.29 : 0.24, { yaw, background: accent ? '#493226' : '#342d27' });
}

export function lighterProp(architecture, parent, name, x, y, z, yaw) {
  const model = architecture.group(parent, name, x, y, z, yaw);
  const prop = architecture.builder(model);
  prop.part(0xd74819, 0, 0, -0.015, 0.083, 0.042, 0.113);
  prop.part(0xbfc8c5, 0, 0, 0.058, 0.083, 0.044, 0.031);
  prop.part(0xf7e7a1, 0, 0.025, -0.021, 0.036, 0.008, 0.045);
  prop.finish();
  return model;
}
