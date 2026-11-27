import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { CAVE_MOUTHS } from '../areas/flower-garden/garden-cave.js';
import { MONKEY_TREE } from '../areas/flower-garden/garden-monkey.js';
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

test('the expanded Garden needs a new completion while other saved badges remain', () => {
  const storage = storageFixture();
  const key = 'kids-world-completed-levels';
  storage.setItem(key, JSON.stringify(['garden@2', 'snow@4']));
  const open = () => createLevelProgress(areas, () => storage);
  const progress = open();
  assert.equal(progress.has('garden'), false);
  assert.equal(progress.has('snow'), true);
  progress.complete('garden');
  assert.deepEqual(JSON.parse(storage.getItem(key)), ['snow@4', 'garden@3']);
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
    worlds, scene, area, camera, progress, storage, completions, cues, notifications, find, basket, feed, collect, visibleApples,
  };
}

function assertProgress(area, counts = {}) {
  for (const mission of area.missionStatus.missions) {
    assert.equal(mission.current, counts[mission.id] ?? 0, mission.id);
    assert.equal(mission.complete, mission.id === 'apples' ? Boolean(counts.delivered) : counts[mission.id] === 1, mission.id);
  }
}

test('only placing a basket with all three apples completes delivery', async t => {
  const { worlds, area, basket, find, collect, visibleApples, progress, completions } = await gardenFixture();
  t.after(worlds.unload);
  for (const apples of [0, 1, 2, 3]) {
    worlds.reset();
    assert.ok(basket.active);
    assert.equal(visibleApples(), 0);
    assertProgress(area);
    basket.act();
    assert.match(area.missionStatus.hint, /Shake tree/);
    collect(apples);
    assertProgress(area, { apples });
    assert.equal(visibleApples(), apples);
    if (apples === 3) assert.match(area.missionStatus.hint, /place the basket/);
    const table = find('Place basket');
    table.act();
    assertProgress(area, { apples, delivered: apples === 3 });
    if (apples === 3) assert.match(area.missionStatus.hint, /fish feeder/);
    else assert.match(area.missionStatus.hint, /Pick the basket back up/);
    table.act();
    if (apples === 2) {
      collect(1);
      assertProgress(area, { apples: 3 });
      table.act();
      assertProgress(area, { apples: 3, delivered: true });
    }
  }
  assert.equal(progress.has('garden'), false);
  assert.deepEqual(completions, []);
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

test('approaching either cow or a chicken counts once and does not repeat while nearby', async t => {
  const { worlds, area, scene, cues } = await gardenFixture();
  t.after(worlds.unload);
  for (const name of ['Cow 1', 'Cow 2']) {
    worlds.reset();
    const cow = scene.getObjectByName(name);
    const chicken = scene.getObjectByName('White chicken 1');
    const position = model => Object.assign(model.position.clone(), { y: 1.68 });
    const count = cues.length;
    assert.ok(area.animals.blocks(cow.position.x, cow.position.z, 0));
    area.animals.update(.2, position(chicken));
    assert.ok(chicken.children[0].position.y > .7);
    assertProgress(area, { chicken: 1 });
    const nearby = position(cow);
    area.animals.update(.24, nearby);
    assert.notEqual(cow.getObjectByName('Cow head').rotation.x, 0);
    for (let i = 0; i < 16; i++) area.animals.update(.1, nearby);
    assert.equal(cues.length, count + 2);
    assertProgress(area, { cow: 1, chicken: 1 });
    area.animals.update(.025, { x: 0, y: 1.68, z: 9 });
    area.animals.update(.025, position(cow));
    assert.equal(cues.length, count + 3);
    assertProgress(area, { cow: 1, chicken: 1 });
  }
});

test('all twelve missions record Garden completion in any order and preserve it through replay', async t => {
  const { worlds, area, camera, scene, completions, progress, storage, find, basket, collect, feed, notifications } = await gardenFixture();
  t.after(worlds.unload);
  const approach = (x, z, duration) => {
    camera.position.set(x, 1.68, z);
    for (let i = 0; i < Math.ceil(duration / .05); i++) worlds.update(.05, camera.position);
    camera.position.set(0, 1.68, 9);
  };
  const approachAnimal = name => {
    const { x, z } = scene.getObjectByName(name).position;
    approach(x, z, .05);
  };
  const approachGate = name => {
    const { x, z } = scene.getObjectByName(name).position;
    approach(x + .82, z + 2, .65);
  };
  const tasks = {
    apples() {
      basket.act();
      collect(3);
      find('Place basket').act();
    },
    fish: feed.act,
    'cow-gate': () => approachGate('Cow pen gate'),
    cow: () => approachAnimal('Cow 1'),
    rabbits() {
      find('Pick carrots').act();
      find('Feed the rabbits').act();
      approach(0, 9, 3.25);
    },
    'chicken-gate': () => approachGate('Chicken pen gate'),
    chicken: () => approachAnimal('White chicken 1'),
    monkey: () => approach(MONKEY_TREE[0] + 1, MONKEY_TREE[1] + 1, .5),
    house: () => find('Open house door').act(),
    bench: () => find('Sit on bench').act({ sit() {} }),
    cave: () => approach(CAVE_MOUTHS[0].x - 2, CAVE_MOUTHS[0].z, .05),
    balloon() {
      let descend;
      find('Ride the hot air balloon').act({ guideCamera(_look, { prompt }) { descend = prompt; return () => {}; } });
      approach(0, 9, 16);
      assert.ok(descend.active);
      descend.act();
      approach(0, 9, 16);
    },
  };
  const ids = area.missionStatus.missions.map(mission => mission.id);
  const orders = [ids, [...ids].reverse(), [...ids.slice(4), ...ids.slice(0, 4)]];
  for (const [visit, order] of orders.entries()) {
    assertProgress(area);
    const counts = {};
    for (const [index, id] of order.entries()) {
      assert.ok(area.missionStatus.hint);
      tasks[id]();
      counts[id] = id === 'apples' ? 3 : 1;
      assertProgress(area, { ...counts, delivered: counts.apples === 3 });
      assert.equal(progress.has('garden'), visit > 0 || index === order.length - 1);
    }
    assert.equal(area.missionStatus.hint, '');
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
});
