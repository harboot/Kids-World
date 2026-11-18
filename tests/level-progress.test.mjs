import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { flowerGarden } from '../areas/flower-garden/index.js';
import { createLevelProgress } from '../core/level-progress.js';
import { createWorldManager } from '../core/world-manager.js';
import { walkElevation } from '../core/movement.js';

const areas = { garden: flowerGarden, snow: { load: () => ({ obstacles: [] }) } };

function storageFixture() {
  const entries = new Map();
  return {
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
  };
}

test('completion is independent of the last area and survives reopening', () => {
  const storage = storageFixture();
  storage.setItem('kids-world-last-area', 'snow');
  const initial = createLevelProgress(areas, () => storage);
  assert.equal(initial.has('garden'), false);
  assert.equal(initial.has('snow'), false);
  initial.complete('garden');
  initial.complete('castle');
  const reopened = createLevelProgress(areas, () => storage);
  assert.equal(reopened.has('garden'), true);
  assert.equal(reopened.has('snow'), false);
  assert.equal(reopened.has('castle'), false);
  assert.equal(storage.getItem('kids-world-last-area'), 'snow');

  reopened.complete('snow');
  initial.refresh();
  assert.equal(initial.has('snow'), true);
});

test('Garden opens its ice door when a basket holding at least five apples is placed on the table', () => {
  const storage = storageFixture();
  const progress = createLevelProgress(areas, () => storage);
  const camera = new THREE.PerspectiveCamera();
  const worlds = createWorldManager(THREE, {
    areas, camera, playerRadius: 0.34,
    services: { isLevelComplete: progress.has, completeLevel: progress.complete },
  });
  const visit = worlds.load('garden');
  const { area } = visit;
  const door = area.interactions.find(item => item.label === 'Enter Snow Basin');
  const model = visit.scene.getObjectByName('Enter Snow Basin');
  const sparkles = model.getObjectByName('Door unlock sparkles');
  const pickup = area.interactions.find(item => item.label === 'Pick up basket');
  const shake = area.interactions.find(item => item.label === 'Shake tree');
  const collect = area.interactions.filter(item => item.label === 'Collect apple');
  function ripenDrops() {
    assert.equal(shake.active, true);
    shake.act();
    for (let step = 0; step < 65; step++) worlds.update(0.05, camera.position);
  }

  let destination;
  door.act({ travel: id => { destination = id; } });
  assert.equal(destination, undefined);
  assert.equal(door.active, false);
  assert.equal(model.visible, false);
  assert.equal(area.objective, 'Pick up the basket by the apple tree');
  assert.equal(sparkles.visible, false);
  assert.equal(walkElevation(area, camera.position, door.x, door.z, 0, true), 0);
  pickup.act();
  assert.match(area.objective, /collect apples · 0\/5/);
  const table = area.interactions.find(item => item.label === 'Place basket');
  ripenDrops();
  for (const fruit of collect.filter(item => item.active).slice(0, 3)) fruit.act();
  ripenDrops();
  collect.find(item => item.active).act();
  assert.match(area.objective, /collect apples · 4\/5/);
  table.act();
  assert.equal(door.active, false);
  assert.equal(model.visible, false);
  assert.equal(progress.has('garden'), false);
  assert.equal(area.objective, 'Pick up your basket from the cabin table');
  table.act();
  collect.find(item => item.active).act();
  assert.equal(area.objective, 'Place the basket on the cabin table');
  assert.equal(door.active, false, 'five apples in a carried basket are not a delivery yet');
  table.act();
  assert.equal(door.active, true);
  assert.equal(model.visible, true);
  assert.match(area.objective, /Snow Basin is open!/);
  assert.equal(sparkles.visible, true);
  assert.equal(walkElevation(area, camera.position, door.x, door.z, 0, true), null);
  door.act({ travel: id => { destination = id; } });
  assert.equal(destination, 'snow');
  assert.equal(progress.has('garden'), true);
  assert.equal(progress.has('snow'), false);
  for (let step = 0; step < 50; step++) worlds.update(0.05, camera.position);
  assert.equal(sparkles.visible, false);

  worlds.reset();
  assert.equal(pickup.active, true);
  assert.equal(model.visible, true);
  worlds.load('snow');
  assert.equal(worlds.load('garden').scene.getObjectByName('Enter Snow Basin').visible, true);
  assert.equal(createLevelProgress(areas, () => storage).has('garden'), true);
  worlds.unload();
});
