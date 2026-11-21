import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import * as villageClearance from '../areas/arendelle-village/clearance.js';
import * as houseClearance from '../areas/wooden-house/clearance.js';
import { createDroneCamera } from '../core/drone-view.js';
import { SURFACE_GAP } from '../core/geometry.js';
import { PLAYER_ONLY_LAYER } from '../core/render-layers.js';
import { createView } from '../core/renderer.js';

async function javascriptModules(directory) {
  const files = await readdir(directory, { recursive: true });
  return files.filter(file => file.endsWith('.js')).map(file => new URL(file, directory));
}

test('Core is independent of the area implementations and registration entry', async () => {
  for (const url of await javascriptModules(new URL('../core/', import.meta.url))) {
    const source = await readFile(url, 'utf8');
    assert.doesNotMatch(source, /\b(?:from|import)\s*(?:\(\s*)?['"](?:\.\.\/)+(?:areas\/|game\.js['"])/, url.pathname);
  }
});

test('area modules leave visibility, the shared HUD, and Drone View to their owners', async () => {
  for (const url of await javascriptModules(new URL('../areas/', import.meta.url))) {
    const source = await readFile(url, 'utf8');
    assert.doesNotMatch(source, /['"](?:\.\.\/)+core\/(?:game|renderer|hud|drone-view|coordinate-picker|interaction-clearance)\.js['"]/, url.pathname);
    assert.doesNotMatch(source, /['"`]#?(?:objective|mission-(?:hud|summary|panel|list|hint|inventory|toast)(?:-text)?|drone-(?:panel|marker|coordinates))['"`]/, url.pathname);
    for (const value of Object.values(await import(url))) {
      if (typeof value?.load !== 'function' || typeof value.title !== 'string') continue;
      assert.equal(Object.hasOwn(value, 'show'), false, url.pathname);
      assert.equal(Object.hasOwn(value, 'hidden'), false, url.pathname);
    }
  }
});

test('the village and house own clearance markers and preserve inclusive boundaries and presentation', async () => {
  await assert.rejects(readFile(new URL('../core/interaction-clearance.js', import.meta.url)), { code: 'ENOENT' });
  assert.notEqual(villageClearance.insideClearance, houseClearance.insideClearance);
  const footprint = { x: 2, z: -3, width: 4, depth: 2 };
  for (const { insideClearance, clearanceMaterial, addClearanceOutline } of [villageClearance, houseClearance]) {
    assert.equal(insideClearance(footprint, 4, -4), true);
    assert.equal(insideClearance(footprint, 4.001, -4), false);
    assert.equal(insideClearance(footprint, 4, -4.001), false);

    const group = new THREE.Group();
    const material = clearanceMaterial(THREE);
    const outline = addClearanceOutline(THREE, group, 'Approach', footprint, material, 0.036);
    assert.equal(outline.name, 'Approach clearance');
    assert.deepEqual(outline.position.toArray(), [2, 0.036 + SURFACE_GAP.detail, -3]);
    assert.equal(outline.geometry.parameters.shapes.holes.length, 1);
    assert.equal(outline.material.color.getHex(), 0x376967);
    assert.equal(outline.material.opacity, 0.43);
    assert.equal(outline.material.transparent, true);
    assert.equal(outline.material.depthWrite, false);
    assert.equal(outline.material.toneMapped, false);
    assert.equal(addClearanceOutline(THREE, group, 'Hidden', { ...footprint, mark: false }, material), null);
    assert.deepEqual(group.children, [outline]);
    outline.geometry.dispose();
    material.dispose();
  }
});

test('the player renderer includes the normal and player-only layers and the drone keeps the normal layer', t => {
  const previousWindow = globalThis.window;
  const previousObserver = globalThis.ResizeObserver;
  globalThis.window = new EventTarget();
  globalThis.ResizeObserver = class { observe() {} };
  t.after(() => {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousObserver === undefined) delete globalThis.ResizeObserver;
    else globalThis.ResizeObserver = previousObserver;
  });

  const renders = [];
  class Renderer {
    shadowMap = {};
    setSize() {}
    setPixelRatio() {}
    render(scene, camera) {
      renders.push(scene.children.filter(object => object.layers.test(camera.layers)));
    }
  }
  const canvas = Object.assign(new EventTarget(), { clientWidth: 800, clientHeight: 400 });
  const view = createView({ ...THREE, WebGLRenderer: Renderer }, { game: {}, canvas });
  const drone = createDroneCamera(THREE);
  drone.focus({ width: 25, depth: 40 }, undefined, view.camera.aspect);
  const scene = new THREE.Scene();
  const floor = new THREE.Mesh();
  const ceiling = new THREE.Mesh();
  ceiling.layers.set(PLAYER_ONLY_LAYER);
  scene.add(floor, ceiling);

  assert.equal(PLAYER_ONLY_LAYER, 1);
  assert.deepEqual([view.camera.near, view.camera.far], [0.07, 115]);
  assert.equal(view.camera.isPerspectiveCamera, true);
  assert.equal(view.render(null, false), false);
  assert.equal(view.render(scene, false), true);
  assert.equal(view.render(scene, false), false);
  assert.equal(view.render(scene, true, drone.camera), true);
  assert.deepEqual(renders, [[floor, ceiling], [floor]]);
  assert.equal(ceiling.visible, true);
});
