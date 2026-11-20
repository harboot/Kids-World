export const SURFACE_GAP = Object.freeze({
  detail: 0.012,
  trim: 0.025,
  roof: 0.04,
});

export function rectangleBounds(x, z, width, depth) {
  return { left: x - width / 2, right: x + width / 2, front: z - depth / 2, back: z + depth / 2 };
}

export function addGroup(THREE, parent, name, x = 0, y = 0, z = 0, yaw = 0) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, y, z);
  group.rotation.y = yaw;
  parent.add(group);
  return group;
}

export function addMesh(THREE, parent, geometry, material, x, y, z, width, height, depth) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(width, height, depth);
  parent.add(mesh);
  return mesh;
}

export function paintCanvasTexture(THREE, document, width, height, paint) {
  const canvas = document?.createElement('canvas');
  if (!canvas?.getContext) return null;
  canvas.width = width;
  canvas.height = height;
  const ink = canvas.getContext('2d');
  if (!ink) return null;
  paint(ink, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
