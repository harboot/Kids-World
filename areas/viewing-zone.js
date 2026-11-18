const MARK_HEIGHT = 0.045;

export function insideZone({ x, z, width, depth }, px, pz) {
  return Math.abs(px - x) <= width / 2 && Math.abs(pz - z) <= depth / 2;
}

function outline(THREE, width, depth, thickness, material) {
  const rectangle = (path, halfWidth, halfDepth) => {
    path.moveTo(-halfWidth, -halfDepth);
    path.lineTo(-halfWidth, halfDepth);
    path.lineTo(halfWidth, halfDepth);
    path.lineTo(halfWidth, -halfDepth);
    path.closePath();
    return path;
  };
  const shape = rectangle(new THREE.Shape(), width / 2, depth / 2);
  shape.holes.push(rectangle(new THREE.Path(), width / 2 - thickness, depth / 2 - thickness));
  return new THREE.Mesh(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2), material);
}

export function addViewingZone(THREE, scene, target, bounds, color, clearance) {
  const { x, z, width, depth } = bounds;
  const marker = new THREE.Group();
  marker.name = `${target.label} viewing zone`;
  marker.position.set(x, MARK_HEIGHT, z);
  scene.add(marker);

  const ink = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  marker.add(outline(THREE, width, depth, 0.035, ink));

  const stamps = new THREE.InstancedMesh(new THREE.CircleGeometry(0.5, 12).rotateX(-Math.PI / 2), ink, 4);
  const pose = new THREE.Object3D();
  for (const side of [-1, 1]) {
    const index = side > 0 ? 2 : 0;
    pose.position.set(side * 0.117, 0, -0.08);
    pose.scale.set(0.115, 1, 0.20);
    pose.rotation.y = -side * 0.16;
    pose.updateMatrix();
    stamps.setMatrixAt(index, pose.matrix);
    pose.position.z = 0.067;
    pose.scale.set(0.085, 1, 0.087);
    pose.updateMatrix();
    stamps.setMatrixAt(index + 1, pose.matrix);
  }
  stamps.rotation.y = Math.atan2(x - target.x, z - target.z);
  marker.add(stamps);

  if (clearance && clearance.mark !== false) {
    const strip = outline(THREE, clearance.width, clearance.depth, 0.034,
      new THREE.MeshBasicMaterial({ color, opacity: 0.43, transparent: true, depthWrite: false, toneMapped: false }));
    strip.position.set(clearance.x - x, -0.006, clearance.z - z);
    marker.add(strip);
  }

  return {
    marker,
    radius: Math.hypot(Math.abs(target.x - x) + width / 2, Math.abs(target.z - z) + depth / 2),
    reachable: player => insideZone(bounds, player.x, player.z),
  };
}
