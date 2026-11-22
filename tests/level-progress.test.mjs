import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { areas } from '../game.js';
import { fishPose } from '../areas/flower-garden/garden-pond.js';
import { createTerrain, POND, pondDistance } from '../areas/flower-garden/garden-terrain.js';
import { nearestInteraction } from '../core/interactions.js';
import { createLevelProgress } from '../core/level-progress.js';
import { createWorldManager } from '../core/world-manager.js';
import { walkElevation } from '../core/movement.js';

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

test('the five-mission Garden needs a new completion while other saved badges remain', () => {
  const storage = storageFixture();
  const key = 'kids-world-completed-levels';
  storage.setItem(key, JSON.stringify(['garden', 'snow@3']));
  const open = () => createLevelProgress(areas, () => storage);
  const progress = open();
  assert.equal(progress.has('garden'), false);
  assert.equal(progress.has('snow'), true);
  progress.complete('garden');
  assert.deepEqual(JSON.parse(storage.getItem(key)), ['snow@3', 'garden@2']);
  assert.equal(open().has('garden'), true);
  assert.equal(open().has('snow'), true);
});

async function gardenFixture() {
  const storage = storageFixture();
  const progress = createLevelProgress(areas, () => storage);
  const camera = new THREE.PerspectiveCamera();
  const completions = [];
  const cues = [];
  const notifications = [];
  const worlds = createWorldManager(THREE, {
    areas, camera, playerRadius: 0.34,
    services: {
      isLevelComplete: progress.has,
      completeLevel(id) {
        completions.push(id);
        progress.complete(id);
      },
      playCue: cue => cues.push(cue),
      notify: message => notifications.push(message),
    },
  });
  const { area, scene } = await worlds.load('garden');
  const find = label => area.interactions.find(item => item.label === label);
  const basket = find('Pick up basket');
  const shake = find('Shake tree');
  const feed = find('Feed fish');
  const cows = area.interactions.filter(item => item.label === 'Greet cow');
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
    worlds, scene, area, camera, progress, storage, completions, cues, notifications, find, basket, feed, cows, collect, visibleApples,
  };
}

function assertProgress(area, { apples = 0, fish = 0, cow = 0, rabbits = 0, chicken = 0, delivered = false } = {}) {
  assert.deepEqual(area.missionStatus.missions, [
    { id: 'apples', title: 'Collect and deliver apples', current: apples, total: 3, complete: delivered },
    { id: 'fish', title: 'Feed the pond fish', current: fish, total: 1, complete: fish === 1 },
    { id: 'cow', title: 'Greet a cow', current: cow, total: 1, complete: cow === 1 },
    { id: 'rabbits', title: 'Feed the rabbits', current: rabbits, total: 1, complete: rabbits === 1 },
    { id: 'chicken', title: 'Make a chicken jump', current: chicken, total: 1, complete: chicken === 1 },
  ]);
}

test('only placing a basket with at least three apples completes delivery', async () => {
  const game = await gardenFixture();
  const { worlds, area, basket, find, collect, visibleApples, progress, completions } = game;
  for (const apples of [0, 1, 2, 3, 4, 5]) {
    worlds.reset();
    assert.ok(basket.active);
    assert.equal(visibleApples(), 0);
    assertProgress(area);
    basket.act();
    assert.match(area.missionStatus.hint, /Shake the apple tree/);
    collect(apples);
    const gathered = Math.min(apples, 3);
    assertProgress(area, { apples: gathered });
    assert.equal(visibleApples(), apples);
    if (apples >= 3) assert.match(area.missionStatus.hint, /Place the basket on the cabin table/);
    const table = find('Place basket');
    table.act();
    assertProgress(area, { apples: gathered, delivered: apples >= 3 });
    if (apples >= 3) assert.doesNotMatch(area.missionStatus.hint, /Place the basket/);
    else assert.match(area.missionStatus.hint, /Pick up your basket for more apples/);
    table.act();
    if (apples === 2) {
      collect(1);
      assertProgress(area, { apples: 3 });
      assert.match(area.missionStatus.hint, /Place the basket on the cabin table/);
      table.act();
      assertProgress(area, { apples: 3, delivered: true });
      assert.doesNotMatch(area.missionStatus.hint, /Place the basket/);
    } else if (apples === 3) {
      collect(2);
      assert.equal(visibleApples(), 5);
      table.act();
      assertProgress(area, { apples: 3, delivered: true });
    }
  }
  assert.equal(progress.has('garden'), false);
  assert.deepEqual(completions, []);
  worlds.unload();
});

test('the dry shore feeding spot animates pellets, ripples and fish and stays reusable', async () => {
  const { worlds, area, scene, camera, feed, cues } = await gardenFixture();
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
  const { getTerrainHeight } = createTerrain(areas.garden.width, areas.garden.depth);
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

test('a chicken jump and either cow greeting each count once', async () => {
  const { worlds, area, scene, camera, cows, find } = await gardenFixture();
  assert.equal(cows.length, 2);
  for (const [i, cow] of cows.entries()) {
    worlds.reset();
    const model = scene.getObjectByName(`Cow ${i + 1}`);
    const chicken = find('Make chicken jump');
    assert.ok(area.animals.blocks(cow.x, cow.z, 0));
    chicken.act();
    worlds.update(0.25, camera.position);
    assert.ok(!chicken.active);
    assertProgress(area, { chicken: 1 });
    cow.act();
    assertProgress(area, { cow: 1, chicken: 1 });
    worlds.update(0.25, camera.position);
    assert.notEqual(model.getObjectByName('Cow head').rotation.x, 0);
    assert.ok(!cow.active);
    cow.act();
    cows[1 - i].act();
    assertProgress(area, { cow: 1, chicken: 1 });
    worlds.update(2, camera.position);
    assert.ok(cow.active);
    cow.act();
    assertProgress(area, { cow: 1, chicken: 1 });
  }
  worlds.unload();
});

test('all five missions record Garden completion in different orders and preserve it through replay', async () => {
  const { worlds, area, camera, completions, progress, storage, find, basket, collect, cows, feed, notifications } = await gardenFixture();
  const tasks = {
    apples() {
      basket.act();
      collect(3);
      find('Place basket').act();
    },
    fish: feed.act,
    cow() { cows[0].act(); },
    rabbits() {
      find('Pick carrots').act();
      find('Feed the rabbits').act();
      for (let step = 0; step < 65; step++) worlds.update(.05, camera.position);
    },
    chicken() { find('Make chicken jump').act(); },
  };
  const orders = [
    ['fish', 'cow', 'apples', 'chicken', 'rabbits'],
    ['rabbits', 'chicken', 'cow', 'apples', 'fish'],
    ['apples', 'rabbits', 'fish', 'cow', 'chicken'],
  ];
  for (const [visit, order] of orders.entries()) {
    assertProgress(area);
    const counts = {};
    for (const [index, id] of order.entries()) {
      tasks[id]();
      counts[id] = id === 'apples' ? 3 : 1;
      assertProgress(area, { ...counts, delivered: counts.apples === 3 });
      assert.equal(progress.has('garden'), visit > 0 || index === order.length - 1);
    }
    assert.equal(notifications.length, visit + 1);
    assert.equal(notifications.at(-1), 'Flower Garden complete!');
    assert.equal(completions.length, visit + 1);
    worlds.reset();
  }
  assert.equal(progress.has('snow'), false);
  await worlds.load('snow');
  const replay = await worlds.load('garden');
  assertProgress(replay.area);
  assert.equal(createLevelProgress(areas, () => storage).has('garden'), true);
  worlds.unload();
});
