export function createGardenBatcher(THREE) {
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff });

  // The solid-colour Lambert props keep their own colours and move with their parent.
  return function batchParts(parent) {
    const batches = new Map();
    for (const mesh of parent.children) {
      if (!mesh.isMesh || !mesh.material.isMeshLambertMaterial || !mesh.visible) continue;
      const key = [mesh.geometry.id, mesh.castShadow, mesh.receiveShadow].join('/');
      if (!batches.has(key)) batches.set(key, []);
      batches.get(key).push(mesh);
    }
    for (const meshes of batches.values()) {
      if (meshes.length < 2) continue;
      const first = meshes[0];
      const batch = new THREE.InstancedMesh(first.geometry, material, meshes.length);
      batch.castShadow = first.castShadow;
      batch.receiveShadow = first.receiveShadow;
      meshes.forEach((mesh, i) => {
        mesh.updateMatrix();
        batch.setMatrixAt(i, mesh.matrix);
        batch.setColorAt(i, mesh.material.color);
      });
      batch.computeBoundingSphere();
      parent.remove(...meshes);
      parent.add(batch);
    }
  };
}
