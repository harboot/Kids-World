import { addMesh, paintCanvasTexture, rectangleBounds } from '../../core/geometry.js';
import { PLAYER_RADIUS } from '../../core/movement.js';

export function createParts(THREE) {
  const shapes = {
    box: new THREE.BoxGeometry(1, 1, 1),
    drum: new THREE.CylinderGeometry(1, 1, 1, 16),
    gem: new THREE.OctahedronGeometry(1),
    ball: new THREE.IcosahedronGeometry(1, 1),
    sphere: new THREE.SphereGeometry(1, 16, 12),
    cone: new THREE.ConeGeometry(1, 1, 12),
  };
  const matte = (color, settings) => new THREE.MeshLambertMaterial({ color, ...settings });

  function part(parent, shape, material, ...transform) {
    return addMesh(THREE, parent, shapes[shape] ?? shape, material, ...transform);
  }

  function beam(parent, material, [ax, ay, az], [bx, by, bz], width, depth = width) {
    const direction = new THREE.Vector3(bx - ax, by - ay, bz - az);
    const mesh = part(parent, 'box', material, (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2, width, direction.length(), depth);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return mesh;
  }

  // Each room owns its batches, so the renderer can cull rooms independently.
  function batch(source, target) {
    source.updateMatrixWorld(true);
    const buckets = new Map();
    source.traverse(mesh => {
      if (!mesh.isMesh) return;
      const key = [mesh.geometry.id, mesh.material.id, mesh.layers.mask].join('/');
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(mesh);
    });
    for (const meshes of buckets.values()) {
      const first = meshes[0];
      const instances = new THREE.InstancedMesh(first.geometry, first.material, meshes.length);
      instances.layers.mask = first.layers.mask;
      meshes.forEach((mesh, i) => instances.setMatrixAt(i, mesh.matrixWorld));
      instances.instanceMatrix.needsUpdate = true;
      instances.computeBoundingSphere();
      target.add(instances);
    }
    source.clear();
  }

  return { part, beam, batch, matte };
}

export function addGallerySign(THREE, document, parent, lines, x, y, z, width, height) {
  const texture = paintCanvasTexture(THREE, document, 768, lines.length > 1 ? 260 : 144, (ink, w, h) => {
    ink.fillStyle = '#412346';
    ink.fillRect(0, 0, w, h);
    ink.strokeStyle = '#d9ad69';
    ink.lineWidth = 4;
    ink.strokeRect(9, 9, w - 18, h - 18);
    for (const left of [31, w - 31]) {
      ink.fillStyle = '#d9ad69';
      ink.beginPath();
      ink.moveTo(left, h / 2 - 9);
      ink.lineTo(left + 6, h / 2);
      ink.lineTo(left, h / 2 + 9);
      ink.lineTo(left - 6, h / 2);
      ink.closePath();
      ink.fill();
    }
    ink.textAlign = 'center';
    ink.textBaseline = 'middle';
    lines.forEach((line, i) => {
      ink.fillStyle = i === 0 ? '#fff0d5' : '#eec1b6';
      ink.font = i === 0 ? 'bold 66px Georgia, serif' : '46px Georgia, serif';
      ink.fillText(line, w / 2, lines.length === 1 ? h / 2 : 87 + i * 88, w - 98);
    });
  });
  if (!texture) return null;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  sign.position.set(x, y, z);
  parent.add(sign);
  return sign;
}

// Collision for local rectangles, including thin wall segments at any angle.
export function spaceTransform({ position, rotation }) {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return {
    toWorld: (x, z) => [position.x + cos * x + sin * z, position.z - sin * x + cos * z],
    toLocal(x, z, target = []) {
      const dx = x - position.x;
      const dz = z - position.z;
      target[0] = cos * dx - sin * dz;
      target[1] = sin * dx + cos * dz;
      return target;
    },
  };
}

export function addSolid(obstacles, x, z, width, depth, height, yaw = 0) {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const solid = {
    ...rectangleBounds(x, z, Math.abs(cos) * width + Math.abs(sin) * depth,
      Math.abs(sin) * width + Math.abs(cos) * depth),
    height,
  };
  if (yaw) {
    solid.touches = (px, pz) => {
      const wx = px - x;
      const wz = pz - z;
      const dx = Math.max(0, Math.abs(cos * wx - sin * wz) - width / 2);
      const dz = Math.max(0, Math.abs(sin * wx + cos * wz) - depth / 2);
      return dx * dx + dz * dz < PLAYER_RADIUS * PLAYER_RADIUS;
    };
  }
  obstacles.push(solid);
}

export function addRoundSolid(obstacles, x, z, radius, height) {
  obstacles.push({
    ...rectangleBounds(x, z, radius * 2, radius * 2), height,
    touches: (px, pz) => (px - x) ** 2 + (pz - z) ** 2 < (radius + PLAYER_RADIUS) ** 2,
  });
}
