import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { createDroneCamera } from '../core/drone-view.js';
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
    assert.doesNotMatch(source, /['"](?:\.\.\/)+core\/(?:game|renderer|hud|drone-view|coordinate-picker)\.js['"]/, url.pathname);
    assert.doesNotMatch(source, /['"`]#?(?:objective|mission-(?:hud|summary|panel|list|hint|inventory|toast)(?:-text)?|drone-(?:panel|marker|coordinates))['"`]/, url.pathname);
    for (const value of Object.values(await import(url))) {
      if (typeof value?.load !== 'function' || typeof value.title !== 'string') continue;
      assert.equal(Object.hasOwn(value, 'show'), false, url.pathname);
      assert.equal(Object.hasOwn(value, 'hidden'), false, url.pathname);
    }
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
  view.render(scene, true);
  view.render(scene, true, drone.camera);
  assert.deepEqual(renders, [[floor, ceiling], [floor]]);
  assert.equal(ceiling.visible, true);
});
