import { SURFACE_GAP } from '../../core/geometry.js';

export function insideClearance({ x, z, width, depth }, px, pz) {
  return Math.abs(px - x) <= width / 2 && Math.abs(pz - z) <= depth / 2;
}

export function clearanceMaterial(THREE) {
  return new THREE.MeshBasicMaterial({
    color: 0x376967, opacity: 0.43, transparent: true, depthWrite: false, toneMapped: false,
  });
}

export function addClearanceOutline(THREE, parent, label, { x, z, width, depth, mark }, material, elevation = 0) {
  if (mark === false) return null;

  function rectangle(path, halfWidth, halfDepth) {
    path.moveTo(-halfWidth, -halfDepth);
    path.lineTo(-halfWidth, halfDepth);
    path.lineTo(halfWidth, halfDepth);
    path.lineTo(halfWidth, -halfDepth);
    path.closePath();
    return path;
  }

  const shape = rectangle(new THREE.Shape(), width / 2, depth / 2);
  shape.holes.push(rectangle(new THREE.Path(), width / 2 - 0.034, depth / 2 - 0.034));
  const outline = new THREE.Mesh(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2), material);
  outline.name = `${label} clearance`;
  outline.position.set(x, elevation + SURFACE_GAP.detail, z);
  parent.add(outline);
  return outline;
}
