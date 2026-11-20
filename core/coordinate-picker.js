export function pointerToNDC(clientX, clientY, rect, target) {
  const x = (clientX - rect.left) / rect.width;
  const y = (clientY - rect.top) / rect.height;
  if (!(x >= 0 && x <= 1 && y >= 0 && y <= 1)) return null;
  return target.set(x * 2 - 1, 1 - y * 2);
}

function solidMaterial(material) {
  return material?.visible && material.colorWrite && !material.transparent && material.opacity > 0;
}

export function createCoordinatePicker(THREE) {
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const candidates = [];
  const hits = [];

  function collect(object, excluded) {
    if (!object.visible || object === excluded) return;
    if (object.isMesh && object.layers.test(raycaster.layers) &&
        (Array.isArray(object.material) ? object.material.some(solidMaterial) : solidMaterial(object.material))) {
      candidates.push(object);
    }
    for (const child of object.children) collect(child, excluded);
  }

  return function pick(scene, camera, excluded, clientX, clientY, rect) {
    if (!pointerToNDC(clientX, clientY, rect, pointer)) return null;
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();
    raycaster.near = camera.near;
    raycaster.far = camera.far;
    raycaster.layers.mask = camera.layers.mask;
    raycaster.setFromCamera(pointer, camera);
    try {
      collect(scene, excluded);
      raycaster.intersectObjects(candidates, false, hits);
      const hit = hits.find(({ object, face }) => solidMaterial(Array.isArray(object.material)
        ? object.material[face?.materialIndex] : object.material));
      return hit?.point ?? null;
    } finally {
      candidates.length = 0;
      hits.length = 0;
    }
  };
}

export function formatCoordinate(value) {
  const rounded = value.toFixed(2);
  return rounded === '-0.00' ? '0.00' : rounded;
}

export function formatCoordinates({ x, y, z }) {
  return `{ x: ${formatCoordinate(x)}, y: ${formatCoordinate(y)}, z: ${formatCoordinate(z)} }`;
}
