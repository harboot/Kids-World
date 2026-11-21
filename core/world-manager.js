import { hasArea, isPublicArea, loadAreaDefinition } from './area-registry.js';

export { isPublicArea } from './area-registry.js';

export function resolveArea(url, areas, defaultArea, savedArea) {
  const explicit = url.searchParams.get('area');
  if (explicit && hasArea(areas, explicit)) return explicit;
  for (const id of [url.searchParams.get('arrive'), savedArea]) {
    if (id && isPublicArea(areas, id)) return id;
  }
  if (!isPublicArea(areas, defaultArea)) throw new Error(`Default area "${defaultArea}" must be public.`);
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

export function createWorldManager(THREE, { areas, camera, touch, playerRadius, services }) {
  let active = null;
  let pending = null;

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

  function unloadActive() {
    if (!active) return;
    const previous = active;
    active = null;
    release(previous);
  }

  function activate(id, definition) {
    const scene = new THREE.Scene();
    const viewmodel = new THREE.Group();
    const lifetime = new AbortController();
    const next = { id, definition, scene, viewmodel, lifetime, area: null };

    try {
      // Keep the current visit available if building or resetting the next scene fails.
      next.area = definition.load({ ...services, THREE, scene, camera, viewmodel, touch, playerRadius, signal: lifetime.signal });
      next.area.reset?.();
      unloadActive();
    } catch (error) {
      release(next);
      throw error;
    }

    scene.add(camera);
    camera.add(viewmodel);
    active = next;
    return active;
  }

  function load(id) {
    if (!hasArea(areas, id)) return Promise.reject(new Error(`Unknown area: ${id}`));
    if (pending?.id === id) return pending.promise;

    const request = { id };
    pending = request;
    // Imports can finish after another navigation has superseded them.
    request.promise = loadAreaDefinition(id, areas[id]).then(
      definition => pending === request ? activate(id, definition) : null,
      error => {
        if (pending === request) throw error;
        return null;
      },
    ).finally(() => {
      if (pending === request) pending = null;
    });
    return request.promise;
  }

  return {
    get active() { return active; },
    load,
    cancelLoad() { pending = null; },
    unload() {
      pending = null;
      unloadActive();
    },
    update(dt, position, elapsed = dt) { active?.area.update?.(dt, position, elapsed); },
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
