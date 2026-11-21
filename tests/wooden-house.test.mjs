import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import * as THREE from '../vendor/three.module.min.js';
import { areas } from '../game.js';
import { createInteractions, nearestInteraction } from '../core/interactions.js';
import { createLevelProgress } from '../core/level-progress.js';
import { PLAYER_RADIUS, walkElevation } from '../core/movement.js';
import { createPlayer } from '../core/player.js';
import { areaURL, createWorldManager, resolveArea } from '../core/world-manager.js';

const house = 'wooden-house';
const labels = {
  bed: 'Make bed', dishes: 'Wash dishes', painting: 'Straighten painting', tv: 'Turn off TV', toys: 'Put away toys',
};
function missionProgress(completed = []) {
  return Object.entries(labels).map(([id, title]) => ({
    id, title, current: Number(completed.includes(id)), total: 1, complete: completed.includes(id),
  }));
}

const success = missionProgress(Object.keys(labels));

function fixture(saved = []) {
  let data = JSON.stringify(saved);
  const writes = [];
  const getStorage = () => ({
    getItem: () => data,
    setItem(key, value) {
      writes.push([key, value]);
      data = value;
    },
  });
  const progress = createLevelProgress(areas, getStorage);
  const completions = [];
  const cues = [];
  const notifications = [];
  const camera = new THREE.PerspectiveCamera();
  let reduced = false;
  const worlds = createWorldManager(THREE, {
    areas, camera, playerRadius: PLAYER_RADIUS,
    services: {
      reducedMotion: () => reduced,
      playCue: notes => cues.push(notes),
      notify: message => notifications.push(message),
      isLevelComplete: progress.has,
      completeLevel(id) {
        completions.push(id);
        progress.complete(id);
      },
    },
  });
  return { worlds, camera, completions, cues, notifications, progress, getStorage, writes, reduceMotion() { reduced = true; } };
}

function missions(area) {
  return Object.fromEntries(area.interactions.filter(item => item.id).map(item => [item.id, item]));
}

function models(scene) {
  const named = name => scene.getObjectByName(name);
  return {
    pillows: [named('Pillow 1'), named('Pillow 2')],
    quilt: named('Quilt'),
    folds: named('Bunched quilt'),
    plates: [named('Plate 1'), named('Plate 2'), named('Plate 3')],
    stains: ['Plate 1', 'Plate 2', 'Plate 3', 'Cup 1', 'Cup 2'].map(name => named('Stain on ' + name)),
    water: named('Running water'),
    painting: named('Landscape painting'),
    program: named('TV program'),
    screen: named('Dark TV screen'),
    toys: ['Toy block 1', 'Toy block 2', 'Toy block 3', 'Toy block 4', 'Toy car', 'Teddy bear'].map(named),
    lid: named('Toy box lid'),
    stars: named('Cleaning celebration'),
  };
}

const near = (a, b) => Math.abs(a - b) < 1e-6;

const tidy = {
  bed: model => model.pillows.every(pillow => near(pillow.position.z, -0.92) && pillow.rotation.y === 0) &&
    model.quilt.position.x === 0 && model.quilt.scale.x === 1 && !model.folds.visible,
  dishes: model => model.stains.every(stain => !stain.visible) && !model.water.visible &&
    model.plates.every(plate => plate.rotation.z === Math.PI / 2 && near(plate.position.z, -0.09)),
  painting: model => model.painting.rotation.z === 0,
  tv: model => !model.program.visible && model.screen.visible && model.screen.material.opacity === 1,
  toys: model => model.toys.every(toy => !toy.visible) && model.lid.rotation.x === 0,
};

test('the house opens by URL and the Garden cabin keeps its porch activities', t => {
  const direct = new URL('https://example.test/Kids-World/index.html?area=wooden-house');
  assert.equal(resolveArea(direct, areas, 'garden', 'snow'), house);
  assert.equal(resolveArea(new URL('./', direct), areas, 'garden', house), house);
  assert.equal(areaURL(direct, 'garden').search, '?area=garden');

  const { worlds, camera, completions } = fixture();
  t.after(worlds.unload);
  const player = createPlayer(THREE, camera);
  const { area: garden, scene } = worlds.load('garden');
  assert.ok(scene.getObjectByName('Cabin flower window'));
  garden.interactions.find(item => item.label === 'Pick up basket' && item.active).act();
  for (const label of ['Sit on bench', 'Place basket']) {
    const item = garden.interactions.find(item => item.label === label);
    const position = { x: item.x, y: 2.7, z: item.z + 0.54 };
    assert.equal(nearestInteraction(garden.interactions, position), item);
  }
  const { area, definition } = worlds.load(resolveArea(direct, areas, 'garden'));
  player.reset(definition.spawn, area);
  assert.deepEqual(camera.position.toArray(), [definition.spawn.x, 1.68, definition.spawn.z]);
  assert.deepEqual(area.missionStatus.missions, missionProgress());
  assert.deepEqual(completions, []);
});

test('the open layout connects the spawn to every interaction and blocks walls and major furniture', () => {
  const { worlds } = fixture();
  const { area, definition } = worlds.load(house);
  const open = (x, z) => walkElevation(area, { x, z }, x, z, 0, true) === 0;
  for (const [x, z] of [[-4.55, -3.45], [2.2, -4.62], [-2.07, 1.65], [-5.86, 1.49], [6.3, 0], [0, -5.29]]) {
    assert.equal(open(x, z), false);
  }
  const visited = new Set();
  const reachable = new Set();
  const queue = [[0, 0]];
  const steps = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let i = 0; i < queue.length; i++) {
    const [col, row] = queue[i];
    const x = definition.spawn.x + col * 0.15;
    const z = definition.spawn.z + row * 0.15;
    if (Math.abs(x) >= definition.width / 2 || Math.abs(z) >= definition.depth / 2 || !open(x, z)) continue;
    const item = nearestInteraction(area.interactions, { x, y: 1.68, z });
    if (item) reachable.add(item.label);
    for (const [dx, dz] of steps) {
      const key = `${col + dx},${row + dz}`;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push([col + dx, row + dz]);
    }
  }
  assert.deepEqual([...reachable].sort(), Object.values(labels).sort());
  worlds.unload();
});

test('each mission makes its actual furniture tidy exactly once and only after the animation', () => {
  const { worlds, completions, cues } = fixture();
  const { area, scene } = worlds.load(house);
  const tasks = missions(area);
  const model = models(scene);
  assert.deepEqual(Object.fromEntries(Object.values(tasks).map(task => [task.id, task.label])), labels);
  for (const [id, task] of Object.entries(tasks)) {
    worlds.reset();
    assert.deepEqual(area.missionStatus.missions, missionProgress());
    for (const [key, isTidy] of Object.entries(tidy)) {
      assert.equal(isTidy(model), false, key);
      assert.ok(tasks[key].active);
    }
    const initialCues = cues.length;
    task.act();
    task.act();
    assert.equal(task.active, false);
    assert.deepEqual(area.missionStatus.missions, missionProgress());
    if (id === 'dishes') assert.ok(model.water.visible);
    worlds.update(0.2);
    assert.deepEqual(area.missionStatus.missions, missionProgress());
    assert.equal(tidy[id](model), false);
    worlds.update(1.2);
    task.act();
    worlds.update(2);
    assert.deepEqual(area.missionStatus.missions, missionProgress([id]));
    assert.equal(tidy[id](model), true, id);
    assert.equal(cues.length, initialCues + 1);
    for (const other of Object.keys(tasks).filter(key => key !== id)) {
      assert.ok(tasks[other].active);
      assert.equal(tidy[other](model), false);
    }
  }
  assert.deepEqual(completions, []);
  worlds.unload();
});

test('every mission works from different positions outside its clearance while facing the object', () => {
  const { worlds, camera } = fixture();
  const { area, scene } = worlds.load(house);
  const tasks = missions(area);
  const button = Object.assign(new EventTarget(), { style: { setProperty() {} } });
  const prompts = createInteractions(THREE, {
    button, glyph: {}, label: {}, camera, playing: () => true, touchMode: () => false,
    runAction: item => item.act(),
  });
  const closePositions = { bed: [-3.13, -3.25], dishes: [2.24, -3.46], painting: [-5.62, -0.9],
    tv: [-4.98, 1.14], toys: [3.3, 2.2] };
  const approaches = {
    bed: [[-2.16, -4.1], [-3.45, -1.58]],
    dishes: [[1.05, -2.8], [3.65, -2.2]],
    painting: [[-4.5, -1.38], [-3.7, -0.27]],
    tv: [[-3.8, 0.14], [-4.2, 3.45]],
    toys: [[2.86, 0.24], [2.75, 4.04]],
  };
  for (const [id, task] of Object.entries(tasks)) {
    assert.equal(scene.getObjectByName(task.label + ' viewing zone'), undefined);
    const outline = scene.getObjectByName(task.label + ' clearance');
    if (id !== 'toys') assert.ok(outline.visible);
    const [closeX, closeZ] = closePositions[id];
    const [x, z] = approaches[id][0];
    prompts.setItems([task]);
    assert.equal(walkElevation(area, { x, z }, closeX, closeZ, 0, true), null, task.label);
    assert.equal(walkElevation(area, { x, z }, closeX, closeZ, 1.1, false), null, task.label);
    assert.equal(nearestInteraction([task], { x: closeX, z: closeZ }), null, task.label);
    assert.equal(nearestInteraction([task], { x: task.x + 8, z: task.z }), null, task.label);

    camera.position.set(x, 1.68, z);
    camera.lookAt(2 * x - task.x, 1.68, 2 * z - task.z);
    camera.updateMatrixWorld();
    prompts.update();
    assert.ok(button.hidden, task.label);
    prompts.interact();
    assert.ok(task.active);
    for (const [px, pz] of approaches[id]) {
      assert.equal(walkElevation(area, { x: px, z: pz }, px, pz, 0, true), 0, task.label);
      camera.position.set(px, 1.68, pz);
      camera.lookAt(task.x, task.anchorY, task.z);
      camera.updateMatrixWorld();
      prompts.update();
      assert.equal(button.hidden, false, task.label);
    }
    prompts.interact();
    if (outline) assert.ok(outline.visible, task.label);
    assert.ok(!task.active);
    assert.equal(walkElevation(area, { x, z }, closeX, closeZ, 0, true), null);
    worlds.update(1.3);
    if (outline) assert.equal(outline.visible, false, task.label);
    assert.equal(walkElevation(area, { x, z }, closeX, closeZ, 0, true), 0, task.label);
  }
  worlds.reset();
  for (const [id, task] of Object.entries(tasks)) {
    const [x, z] = closePositions[id];
    assert.ok(area.blocksGround(x, z));
    if (id !== 'toys') assert.ok(scene.getObjectByName(task.label + ' clearance').visible);
  }
  worlds.unload();
});

test('all five tasks can finish in different orders, record once per visit and remain replayable', () => {
  const { worlds, getStorage, writes, completions, progress, cues, notifications } = fixture(['garden', 'snow']);
  for (const order of [
    ['toys', 'painting', 'tv', 'bed', 'dishes'],
    ['dishes', 'bed', 'toys', 'tv', 'painting'],
  ]) {
    const { area, scene } = worlds.active ?? worlds.load(house);
    const tasks = missions(area);
    const model = models(scene);
    assert.deepEqual(area.missionStatus.missions, missionProgress());
    assert.ok(!model.stars.visible);
    order.forEach((id, i) => {
      tasks[id].act();
      worlds.update(1.3);
      assert.deepEqual(area.missionStatus.missions, missionProgress(order.slice(0, i + 1)));
    });
    for (const [id, task] of Object.entries(tasks)) {
      assert.ok(tidy[id](model), id);
      assert.equal(task.active, false);
      task.act();
    }
    assert.ok(model.stars.visible);
    worlds.update(2);
    assert.equal(model.stars.visible, false);
    assert.deepEqual(area.missionStatus.missions, success);
    assert.ok(progress.has(house));
    const reopened = createLevelProgress(areas, getStorage);
    assert.ok(reopened.has(house));
    assert.ok(reopened.has('garden') && reopened.has('snow'));
    worlds.reset();
    assert.deepEqual(area.missionStatus.missions, missionProgress());
    assert.ok(Object.values(tidy).every(isTidy => !isTidy(model)));
  }
  assert.deepEqual(completions, [house, house]);
  assert.deepEqual(notifications, Array(2).fill('Great job! The house is sparkling clean!'));
  assert.equal(writes.length, 1);
  assert.equal(cues.length, 12);
  worlds.load('garden');
  const revisit = worlds.load(house);
  assert.deepEqual(revisit.area.missionStatus.missions, missionProgress());
  assert.ok(Object.values(missions(revisit.area)).every(task => task.active));
  worlds.unload();
});

test('unload cancels running missions and releases their resources', () => {
  const { worlds, completions, cues } = fixture();
  const first = worlds.load(house);
  const model = models(first.scene);
  const tasks = missions(first.area);
  let disposed = false;
  model.screen.material.addEventListener('dispose', () => { disposed = true; });
  tasks.dishes.act();
  tasks.tv.act();
  worlds.update(0.3);
  assert.ok(model.water.visible);
  assert.ok(model.screen.visible);
  worlds.reset();
  assert.equal(model.water.visible, false);
  assert.equal(model.screen.visible, false);
  assert.deepEqual(first.area.missionStatus.missions, missionProgress());
  tasks.dishes.act();
  tasks.tv.act();
  worlds.load('garden');
  assert.ok(first.lifetime.signal.aborted);
  assert.equal(first.scene.children.length, 0);
  assert.ok(disposed);
  assert.equal(model.water.visible, false);
  assert.equal(model.screen.visible, false);
  tasks.dishes.act();
  first.area.update(2);
  assert.equal(cues.length, 4);
  assert.deepEqual(completions, []);
  const next = worlds.load(house);
  assert.deepEqual(next.area.missionStatus.missions, missionProgress());
  worlds.unload();
});

test('reduced motion keeps the TV still and applies tidy poses without animated effects', () => {
  const { worlds, reduceMotion, completions } = fixture();
  reduceMotion();
  const { area, scene } = worlds.load(house);
  const model = models(scene);
  const cloud = model.program.children[3];
  const cloudPosition = cloud.position.clone();
  worlds.update(1);
  assert.ok(cloud.position.equals(cloudPosition));
  for (const task of Object.values(missions(area))) task.act();
  assert.ok(Object.values(tidy).every(isTidy => isTidy(model)));
  assert.deepEqual(area.missionStatus.missions, success);
  assert.deepEqual(completions, [house]);
  const star = model.stars.children[0];
  const starPosition = star.position.clone();
  worlds.update(0.5);
  assert.ok(star.position.equals(starPosition));
  worlds.update(2);
  assert.equal(model.stars.visible, false);
  worlds.unload();
});

test('the offline release includes every Wooden House runtime module', async () => {
  const version = JSON.parse(await readFile(new URL('../version.json', import.meta.url)));
  const files = await readdir(new URL('../areas/wooden-house/', import.meta.url));
  const included = new Set(version.files.map(file => file.path));
  assert.ok(files.length >= 4);
  for (const file of files) assert.ok(included.has('./areas/wooden-house/' + file), file);
});
