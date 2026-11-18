export function resolveArea(url, areas, defaultArea, savedArea) {
  for (const id of [url.searchParams.get('area'), url.searchParams.get('arrive'), savedArea]) {
    if (id && Object.hasOwn(areas, id)) return id;
  }
  return defaultArea;
}

export function areaURL(url, id) {
  const target = new URL('./index.html', url);
  target.search = url.search;
  target.hash = url.hash;
  target.searchParams.delete('arrive');
  target.searchParams.set('area', id);
  return target;
}

export function createWorldManager(THREE, { areas, camera, touch, playerRadius }) {
  let active = null;

  function release({ area, scene, viewmodel, lifetime }) {
    lifetime.abort();
    if (viewmodel.parent === camera) viewmodel.removeFromParent();
    if (camera.parent === scene) camera.removeFromParent();
    try {
      area?.unload?.();
    } finally {
      disposeWorld(scene, viewmodel);
    }
  }

  function unload() {
    if (!active) return;
    const previous = active;
    active = null;
    release(previous);
  }

  function load(id) {
    if (!Object.hasOwn(areas, id)) throw new Error(`Unknown area: ${id}`);
    const definition = areas[id];
    const scene = new THREE.Scene();
    const viewmodel = new THREE.Group();
    const lifetime = new AbortController();
    const next = { id, definition, scene, viewmodel, lifetime, area: null };

    try {
      // Keep the current visit available if building or resetting the next scene fails.
      next.area = definition.load({ THREE, scene, viewmodel, touch, playerRadius, signal: lifetime.signal });
      next.area.reset?.();
      unload();
    } catch (error) {
      release(next);
      throw error;
    }

    scene.add(camera);
    camera.add(viewmodel);
    active = next;
    return active;
  }

  return {
    get active() { return active; },
    load,
    unload,
    update(dt, position) { active?.area.update?.(dt, position); },
    reset() { active?.area.reset?.(); },
  };
}

function disposeWorld(scene, viewmodel) {
  const resources = new Set();
  const materials = new Set();

  function collect(object) {
    if (object.geometry) resources.add(object.geometry);
    if (object.isInstancedMesh) resources.add(object);
    if (object.shadow) resources.add(object.shadow);
    if (Array.isArray(object.material)) {
      for (const material of object.material) materials.add(material);
    } else if (object.material) {
      materials.add(object.material);
    }
  }

  scene.traverse(collect);
  viewmodel.traverse(collect);
  for (const texture of [scene.background, scene.environment]) {
    if (texture?.isTexture) resources.add(texture);
  }
  for (const material of materials) {
    for (const value of Object.values(material)) {
      if (value?.isTexture) resources.add(value);
    }
    resources.add(material);
  }
  for (const resource of resources) resource.dispose();
  scene.clear();
  viewmodel.clear();
}
