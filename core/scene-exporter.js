import { hasArea } from './area-registry.js';
import { PLAYER_RADIUS } from './movement.js';
import { PLAYER_ONLY_LAYER } from './render-layers.js';
import { createWorldManager } from './world-manager.js';

let exporting = false;
const noop = () => {};
const inactive = () => false;

function isRuntimeObject(object, camera) {
  // Area clearance markers use the same name suffix across the current builders.
  return object === camera || object.type.endsWith('Helper') || object.name.endsWith(' clearance');
}

function serializeScene(THREE, scene, camera) {
  const children = new Map();
  const geometries = new Map();
  const originalGeometries = new Map();
  try {
    scene.traverse(object => {
      const visualChildren = object.children.filter(child => !isRuntimeObject(child, camera));
      if (visualChildren.length !== object.children.length) {
        children.set(object, object.children);
        object.children = visualChildren;
      }

      // The Editor's camera uses layer 0. Keep roofs and other player-only scenery visible.
      if (object.layers.isEnabled(PLAYER_ONLY_LAYER)) object.layers.enable(0);

      const { geometry } = object;
      if (geometry?.parameters !== undefined) {
        // Three serializes primitives by constructor parameters, losing baked vertex edits.
        if (!geometries.has(geometry)) {
          // Share the original vertex arrays and UUID without changing the source geometry.
          const buffer = Object.assign(Object.create(THREE.BufferGeometry.prototype), geometry, {
            type: 'BufferGeometry', parameters: undefined, toJSON: THREE.BufferGeometry.prototype.toJSON,
          });
          geometries.set(geometry, buffer);
        }
        originalGeometries.set(object, geometry);
        object.geometry = geometries.get(geometry);
      }
    });
    scene.updateMatrixWorld(true);
    return JSON.stringify(scene.toJSON());
  } finally {
    for (const [object, original] of children) object.children = original;
    for (const [object, original] of originalGeometries) object.geometry = original;
  }
}

async function buildSceneJSON(id, { areas, loadThree, document }) {
  let world;
  let stage = 'initialize the scene';
  try {
    const THREE = await loadThree();
    const camera = new THREE.PerspectiveCamera(62, 1, 0.07, 115);
    world = createWorldManager(THREE, {
      areas, camera, touch: false, playerRadius: PLAYER_RADIUS,
      services: {
        // Some areas use the HUD's ownerDocument for their procedural textures and controls.
        hud: document.createElement('div'),
        isPlaying: inactive,
        playCue: noop,
        notify: noop,
        carryPlayer: noop,
        completeLevel: noop,
        isLevelComplete: inactive,
        isPlayerGrounded: () => true,
        reducedMotion: () => true,
      },
    });
    const { scene, definition } = await world.load(id);
    scene.name = definition.title;
    stage = 'serialize the scene';
    return serializeScene(THREE, scene, camera);
  } catch (cause) {
    throw new Error(`Could not ${stage}. ${cause?.message ?? String(cause)}`, { cause });
  } finally {
    world?.unload();
  }
}

export async function downloadAreaScene(id, { areas, loadThree, document }) {
  if (exporting) throw new Error('A scene export is already running.');
  if (!hasArea(areas, id)) throw new Error(`Unknown area: ${id}`);
  exporting = true;
  try {
    const json = await buildSceneJSON(id, { areas, loadThree, document });
    const link = document.createElement('a');
    link.download = `${areas[id].slug ?? id}.json`;
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    try {
      link.href = url;
      link.click();
    } finally {
      // Let the browser consume the URL before releasing it.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  } finally {
    exporting = false;
  }
}
