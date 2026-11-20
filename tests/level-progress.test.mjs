import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { flowerGarden } from '../areas/flower-garden/index.js';
import { fishPose } from '../areas/flower-garden/garden-pond.js';
import { createTerrain, POND, pondDistance } from '../areas/flower-garden/garden-terrain.js';
import { nearestInteraction } from '../core/interactions.js';
import { createLevelProgress } from '../core/level-progress.js';
import { createWorldManager } from '../core/world-manager.js';
import { walkElevation } from '../core/movement.js';

const areas = {
  garden: { ...flowerGarden, show: true },
  snow: { show: true, load: () => ({ obstacles: [] }) },
};

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

function gardenFixture(saved = false) {
  const storage = storageFixture();
  const progress = createLevelProgress(areas, () => storage);
  if (saved) progress.complete('garden');
  const camera = new THREE.PerspectiveCamera();
  const completions = [];
  const cues = [];
  const worlds = createWorldManager(THREE, {
    areas, camera, playerRadius: 0.34,
    services: {
      isLevelComplete: progress.has,
      completeLevel(id) {
        completions.push(id);
        progress.complete(id);
      },
      playCue: cue => cues.push(cue),
    },
  });
  const { area, scene } = worlds.load('garden');
  const find = label => area.interactions.find(item => item.label === label);
  const basket = find('Pick up basket');
  const shake = find('Shake tree');
  const feed = find('Feed fish');
  const cows = area.interactions.filter(item => item.label === 'Greet cow');
  const door = find('Enter Snow Basin');
  const model = scene.getObjectByName('Enter Snow Basin');
  const basketModel = scene.getObjectByName('Apple basket');
  const visibleApples = () => basketModel.children.filter(child => child.name === 'Basket apple' && child.visible).length;
  const fruit = area.interactions.filter(item => item.label === 'Collect apple');
  function collect(amount) {
    for (let i = 0; i < amount; i++) {
      if (!fruit.some(item => item.active)) {
        assert.ok(shake.active);
        shake.act();
        for (let step = 0; step < 65; step++) worlds.update(0.05, camera.position);
      }
      fruit.find(item => item.active).act();
    }
  }
  return {
    worlds, scene, area, camera, progress, storage, completions, cues, find, basket, feed, cows, door, model,
    sparkles: model.getObjectByName('Door unlock sparkles'), collect, visibleApples,
  };
}

function assertProgress(area, { apples = 0, fish = 0, cow = 0 } = {}) {
  assert.deepEqual(area.objective.split('\n').slice(0, 3), [
    `Collect apples · ${apples}/3`,
    `Feed the fish · ${fish}/1`,
    `Greet a cow · ${cow}/1`,
  ]);
}

test('only placing a basket with at least three apples completes delivery', () => {
  const game = gardenFixture();
  const { worlds, area, door, basket, find, collect, visibleApples, progress, completions } = game;
  for (const apples of [0, 1, 2, 3, 4, 5]) {
    worlds.reset();
    assert.ok(basket.active);
    assert.equal(visibleApples(), 0);
    assertProgress(area);
    basket.act();
    assert.match(area.objective, /Shake the apple tree/);
    collect(apples);
    const gathered = Math.min(apples, 3);
    assertProgress(area, { apples: gathered });
    assert.equal(visibleApples(), apples);
    assert.equal(door.active, false);
    if (apples >= 3) assert.match(area.objective, /Place the basket on the cabin table/);
    const table = find('Place basket');
    table.act();
    assertProgress(area, { apples: gathered });
    if (apples >= 3) assert.doesNotMatch(area.objective, /Place the basket/);
    else assert.match(area.objective, /Pick up your basket for more apples/);
    assert.equal(door.active, false);
    table.act();
    if (apples === 2) {
      collect(1);
      assertProgress(area, { apples: 3 });
      assert.match(area.objective, /Place the basket on the cabin table/);
      table.act();
      assert.doesNotMatch(area.objective, /Place the basket/);
    } else if (apples === 3) {
      collect(2);
      assert.equal(visibleApples(), 5);
      table.act();
      assertProgress(area, { apples: 3 });
    }
  }
  assert.equal(progress.has('garden'), false);
  assert.deepEqual(completions, []);
  worlds.unload();
});

test('the dry shore feeding spot animates pellets, ripples and fish and stays reusable', () => {
  const { worlds, area, scene, camera, feed, cues } = gardenFixture();
  const approach = { x: feed.x + 0.75, z: feed.z, y: 1.68 };
  assert.equal(nearestInteraction(area.interactions, approach), feed);
  assert.notEqual(walkElevation(area, approach, approach.x - 0.2, approach.z, 0, true), null);
  assert.equal(nearestInteraction([feed], { x: feed.x - 1, z: feed.z }), null, 'cannot feed while in the pond');
  assert.equal(nearestInteraction([feed], { x: POND.x - POND.radiusX - 1, z: feed.z }), null);
  const fish = scene.children.filter(node => /^Pond fish \d/.test(node.name));
  const pellets = scene.children.filter(node => node.name === 'Fish food pellet');
  const ripples = scene.children.filter(node => node.name === 'Fish feeding ripple');
  assert.ok(pellets.length > 0 && ripples.length > 0);
  assert.ok(pellets.every(node => !node.visible));
  const start = fish.map(node => node.position.clone());
  assertProgress(area);
  assert.equal(feed.act(), true);
  assert.equal(feed.act(), false);
  assertProgress(area, { fish: 1 });
  assert.equal(cues.length, 1);
  assert.ok(pellets.some(node => node.visible));
  let sawRipples = false;
  const pose = {};
  const { getTerrainHeight } = createTerrain(flowerGarden.width, flowerGarden.depth);
  for (let step = 1; step <= 40; step++) {
    worlds.update(0.1, camera.position);
    sawRipples ||= ripples.some(node => node.visible);
    if (step === 20) {
      const gathering = fish.filter((node, i) => {
        fishPose(i, 2, pose);
        return Math.hypot(node.position.x - pose.x, node.position.z - pose.z) > 0.2;
      });
      assert.equal(gathering.length, 3);
    }
    for (const { position } of fish) {
      assert.ok(pondDistance(position.x, position.z) < 0.9);
      assert.ok(position.y < POND.waterY);
      assert.ok(position.y > getTerrainHeight(position.x, position.z) + 0.03);
    }
  }
  assert.ok(sawRipples);
  assert.ok(pellets.concat(ripples).every(node => !node.visible));
  assert.ok(feed.active);
  assert.ok(feed.act());
  assertProgress(area, { fish: 1 });
  assert.equal(cues.length, 2);
  worlds.reset();
  assertProgress(area);
  assert.ok(feed.active);
  assert.ok(pellets.concat(ripples).every(node => !node.visible));
  assert.ok(fish.every((node, i) => node.position.equals(start[i])));
  worlds.unload();
});

test('either cow can complete the greeting, while chickens and repeated greetings add no progress', () => {
  const { worlds, area, scene, camera, cows, find } = gardenFixture();
  assert.equal(cows.length, 2);
  for (const [i, cow] of cows.entries()) {
    worlds.reset();
    const model = scene.getObjectByName(`Cow ${i + 1}`);
    const chicken = find('Make chicken jump');
    assert.ok(area.animals.blocks(cow.x, cow.z, 0));
    chicken.act();
    worlds.update(0.25, camera.position);
    assert.ok(!chicken.active);
    assertProgress(area);
    cow.act();
    assertProgress(area, { cow: 1 });
    worlds.update(0.25, camera.position);
    assert.notEqual(model.getObjectByName('Cow head').rotation.x, 0);
    assert.ok(!cow.active);
    cow.act();
    cows[1 - i].act();
    assertProgress(area, { cow: 1 });
    worlds.update(2, camera.position);
    assert.ok(cow.active);
    cow.act();
    assertProgress(area, { cow: 1 });
  }
  worlds.unload();
});

test('all three missions unlock Snow Basin in different orders and survive replay as saved access', () => {
  const { worlds, area, scene, camera, completions, progress, storage, find, basket, collect, cows, feed, door, model,
    sparkles } = gardenFixture();
  const tasks = {
    apples() {
      basket.act();
      collect(3);
      find('Place basket').act();
    },
    fish: feed.act,
    cow() { cows[0].act(); },
  };
  for (const [visit, order] of [['fish', 'cow', 'apples'], ['cow', 'apples', 'fish'], ['apples', 'fish', 'cow']].entries()) {
    assertProgress(area);
    const counts = {};
    assert.equal(sparkles.visible, false);
    assert.equal(door.active, visit > 0);
    assert.equal(model.visible, visit > 0);
    if (visit === 0) assert.equal(walkElevation(area, camera.position, door.x, door.z, 0, true), 0);
    for (const [index, id] of order.entries()) {
      tasks[id]();
      counts[id] = id === 'apples' ? 3 : 1;
      assertProgress(area, counts);
      assert.equal(door.active, visit > 0 || index === 2);
      assert.equal(progress.has('garden'), visit > 0 || index === 2);
    }
    assert.match(area.objective, /Flower Garden complete! Snow Basin is unlocked!/);
    assert.equal(sparkles.visible, visit === 0);
    assert.equal(walkElevation(area, camera.position, door.x, door.z, 0, true), null);
    let destination;
    door.act({ travel: id => { destination = id; } });
    assert.equal(destination, 'snow');
    assert.equal(completions.length, visit + 1);
    worlds.update(4, camera.position);
    assert.equal(sparkles.visible, false);
    worlds.reset();
  }
  assert.equal(progress.has('snow'), false);
  worlds.load('snow');
  const replay = worlds.load('garden');
  assert.equal(replay.scene.getObjectByName('Enter Snow Basin').visible, true);
  assertProgress(replay.area);
  assert.equal(createLevelProgress(areas, () => storage).has('garden'), true);
  worlds.unload();
});

test('a legacy Garden completion preserves Snow Basin access on a fresh visit', () => {
  const { worlds, area, door, sparkles } = gardenFixture(true);
  assertProgress(area);
  assert.ok(door.active);
  assert.equal(sparkles.visible, false);
  assert.ok(area.interactions.find(item => item.label === 'Enter Wooden House'));
  worlds.unload();
});
