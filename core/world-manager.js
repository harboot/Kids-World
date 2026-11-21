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

const visitServices = ['isPlaying', 'playCue', 'notify', 'carryPlayer', 'completeLevel'];

export class AreaInitializationError extends Error {
  constructor(id, cause) {
    super(`Area "${id}" could not initialize: ${cause?.message ?? String(cause)}`, { cause });
    this.name = 'AreaInitializationError';
  }
}

export function createWorldManager(THREE, { areas, camera, touch, playerRadius, services, prepare }) {
  let active = null;
  let pending = null;

  function cleanupStep(action, id) {
    try {
      action();
    } catch (error) {
      console.error(`Could not finish cleanup for area "${id}".`, error);
    }
  }

  function release(visit, keep) {
    if (visit.state === 'unloading' || visit.state === 'disposed') return;
    visit.state = 'unloading';
    const { id, area, scene, viewmodel, lifetime, cleanups } = visit;
    // Capture attached resources before hooks can remove objects from the scene.
    const resources = collectResources([scene, viewmodel], camera);
    if (viewmodel.parent === camera) cleanupStep(() => viewmodel.removeFromParent(), id);
    if (camera.parent === scene) cleanupStep(() => camera.removeFromParent(), id);
    cleanupStep(() => lifetime.abort(), id);
    cleanupStep(() => area?.unload?.(), id);
    while (cleanups.length) cleanupStep(cleanups.pop(), id);
    for (const resource of collectResources([scene, viewmodel], camera)) resources.add(resource);

    const retained = collectResources(keep ? [keep.scene, keep.viewmodel, camera] : [camera]);
    for (const resource of resources) {
      if (retained.has(resource)) continue;
      cleanupStep(() => {
        // Dispose the separately collected texture once, even when another instance uses it.
        if (resource.isInstancedMesh && resource.morphTexture) resource.morphTexture = null;
        resource.dispose?.();
      }, id);
    }
    cleanupStep(() => scene.clear(), id);
    cleanupStep(() => viewmodel.clear(), id);
    scene.background = scene.environment = null;
    visit.state = 'disposed';
  }

  function cancelLoad() {
    if (!pending) return;
    const request = pending;
    pending = null;
    request.cancel();
  }

  function resetVisit(visit) {
    visit.area.reset?.();
    return prepare?.(visit);
  }

  function activate(request, definition) {
    const { id } = request;
    const scene = new THREE.Scene();
    const viewmodel = new THREE.Group();
    const lifetime = new AbortController();
    const cleanups = [];
    const next = { id, definition, scene, viewmodel, lifetime, cleanups, area: null, state: 'loading' };
    const cameraParent = camera.parent;
    const position = camera.position?.clone();
    const orientation = camera.quaternion?.clone();
    const scale = camera.scale?.clone();
    const context = { ...services, THREE, scene, camera, viewmodel, touch, playerRadius, signal: lifetime.signal,
      onCleanup(cleanup) {
        if (lifetime.signal.aborted) cleanupStep(cleanup, id);
        else cleanups.push(cleanup);
      },
    };
    function discard() {
      release(next, active);
      if (camera.parent !== cameraParent) {
        if (cameraParent) cameraParent.add(camera);
        else camera.removeFromParent();
      }
      if (position) camera.position.copy(position);
      if (orientation) camera.quaternion.copy(orientation);
      if (scale) camera.scale.copy(scale);
      camera.updateMatrixWorld?.();
    }
    for (const key of visitServices) {
      const service = context[key];
      if (typeof service === 'function') {
        context[key] = (...args) => next.state === 'active' && service(...args);
      }
    }

    try {
      next.area = definition.load(context);
      if (typeof next.area?.then === 'function') {
        Promise.resolve(next.area).catch(error => console.error(error));
        throw new TypeError(`Area "${id}" must build its visit synchronously.`);
      }
      if (!next.area || typeof next.area !== 'object') {
        throw new TypeError(`Area "${id}" must return a visit from its synchronous load function.`);
      }
      next.presentation = resetVisit(next);
      next.state = 'ready';
    } catch (error) {
      discard();
      throw error;
    }
    if (pending !== request) {
      discard();
      return null;
    }

    const previous = active;
    active = null;
    if (previous) release(previous, next);
    if (pending !== request) {
      release(next, active);
      return null;
    }
    try {
      scene.add(camera);
      camera.add(viewmodel);
    } catch (error) {
      release(next);
      throw error;
    }
    next.state = 'active';
    active = next;
    return next;
  }

  function load(id) {
    if (!hasArea(areas, id)) return Promise.reject(new Error(`Unknown area: ${String(id)}`));
    if (pending?.id === id) return pending.promise;

    cancelLoad();
    const request = { id };
    const canceled = new Promise(resolve => { request.cancel = () => resolve(null); });
    pending = request;
    // The browser may still finish the import. Its result cannot build a stale scene.
    const imported = loadAreaDefinition(id, areas[id]).then(
      definition => {
        if (pending !== request) return null;
        try {
          return activate(request, definition);
        } catch (error) {
          throw new AreaInitializationError(id, error);
        }
      },
      error => {
        if (pending === request) throw error;
        return null;
      },
    );
    request.promise = Promise.race([imported, canceled]).finally(() => {
      if (pending === request) pending = null;
    });
    return request.promise;
  }

  return {
    get active() { return active; },
    get state() { return pending ? 'loading' : active?.state ?? 'unloaded'; },
    load,
    cancelLoad,
    unload() {
      cancelLoad();
      const previous = active;
      active = null;
      if (previous) release(previous);
    },
    update(dt, position, elapsed = dt) {
      if (active?.state === 'active') active.area.update?.(dt, position, elapsed);
    },
    reset() {
      if (active?.state !== 'active' || pending) return;
      const visit = active;
      visit.state = 'ready';
      try {
        return resetVisit(visit);
      } finally {
        if (active === visit) visit.state = 'active';
      }
    },
  };
}

function collectResources(roots, excluded) {
  const resources = new Set();
  const inspectedUniforms = new Set();

  function texture(value) {
    if (value?.isTexture) resources.add(value.renderTarget ?? value);
    else if (value?.isRenderTarget) resources.add(value);
  }

  function uniform(value) {
    if (!value || typeof value !== 'object' || inspectedUniforms.has(value)) return;
    inspectedUniforms.add(value);
    texture(value);
    if (Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype) {
      for (const item of Object.values(value)) uniform(item);
    }
  }

  function material(value) {
    if (!value || resources.has(value)) return;
    resources.add(value);
    for (const property of Object.values(value)) texture(property);
    if (value.uniforms) uniform(value.uniforms);
  }

  function collect(object) {
    if (object === excluded) return;
    if (object.geometry) resources.add(object.geometry);
    if (object.isInstancedMesh) {
      resources.add(object);
      texture(object.morphTexture);
    }
    if (object.shadow) {
      // LightShadow.dispose delegates to these targets. Collect the targets once, even when shared.
      const { shadow } = object;
      if ('map' in shadow || 'mapPass' in shadow) {
        if (shadow.map) resources.add(shadow.map);
        if (shadow.mapPass) resources.add(shadow.mapPass);
      } else resources.add(shadow);
    }
    if (Array.isArray(object.material)) object.material.forEach(material);
    else material(object.material);
    material(object.customDepthMaterial);
    material(object.customDistanceMaterial);
    texture(object.background);
    texture(object.environment);
    for (const child of object.children) collect(child);
  }

  roots.forEach(collect);
  return resources;
}
