import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import * as THREE from '../vendor/three.module.min.js';
import { areas } from '../game.js';
import { createInteractions, nearestInteraction } from '../core/interactions.js';
import { createLevelProgress } from '../core/level-progress.js';
import { PLAYER_RADIUS, walkElevation } from '../core/movement.js';
import { createPlayer, EYE_HEIGHT } from '../core/player.js';
import { FRONT, STAIR_Z, UPSTAIRS } from '../areas/wooden-house/layout.js';
import { areaURL, createWorldManager, resolveArea } from '../core/world-manager.js';

const house = 'wooden-house';
const labels = {
  mother: 'Help Mom stir the soup', dishes: 'Wash dishes', table: 'Set the dining table',
  father: 'Whistle with Dad', bird: 'Feed the bird', painting: 'Straighten painting', tv: 'Turn off TV',
  wake: 'Gently wake the boy', bed: 'Make bed', toys: 'Put away toys', girl: 'Play dolls with the girl',
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

const familySpots = {
  mother: [4.44, EYE_HEIGHT, -2.02],
  father: [-4.58, EYE_HEIGHT, -2.70],
  wake: [-6.52, UPSTAIRS + EYE_HEIGHT, -2.12],
  girl: [2.06, UPSTAIRS + EYE_HEIGHT, -2.15],
};

function approachFamily(worlds, id) {
  worlds.update(.02, new THREE.Vector3(...familySpots[id]));
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

test('the house opens by URL and the Garden cabin keeps its porch activities', async t => {
  const direct = new URL('https://example.test/Kids-World/index.html?area=wooden-house');
  assert.equal(resolveArea(direct, areas, 'garden', 'snow'), house);
  assert.equal(resolveArea(new URL('./', direct), areas, 'garden', house), house);
  assert.equal(areaURL(direct, 'garden').search, '?area=garden');

  const { worlds, camera, completions } = fixture();
  t.after(worlds.unload);
  const player = createPlayer(THREE, camera);
  const { area: garden, scene } = await worlds.load('garden');
  assert.ok(scene.getObjectByName('Cabin flower window'));
  garden.interactions.find(item => item.label === 'Pick up basket' && item.active).act();
  for (const label of ['Sit on bench', 'Place basket']) {
    const item = garden.interactions.find(item => item.label === label);
    const position = { x: item.x, y: 2.7, z: item.z + 0.54 };
    assert.equal(nearestInteraction(garden.interactions, position), item);
  }
  const { area, definition } = await worlds.load(resolveArea(direct, areas, 'garden'));
  player.reset(definition.spawn, area);
  assert.deepEqual(camera.position.toArray(), [definition.spawn.x, 1.68, definition.spawn.z]);
  assert.deepEqual(area.missionStatus.missions, missionProgress());
  assert.deepEqual(completions, []);
});

test('the player starts inside and takes the front staircase to the decorated upper hall', async t => {
  const { worlds, camera } = fixture();
  t.after(worlds.unload);
  const visit = await worlds.load(house);
  const { area, definition, scene } = visit;
  const player = createPlayer(THREE, camera);
  player.reset({ ...definition.spawn, yaw: 0 }, area);
  const tasks = missions(area);
  assert.ok(camera.position.z < FRONT - 1);
  assert.equal(tasks.door, undefined);
  assert.equal(walkElevation(area, camera.position, 0, FRONT, 0, true), null);
  for (const name of ['Wooden House front door', 'Parents’ room decorative door', 'Study decorative door',
    'Toilet decorative door', 'Upstairs linen console', 'Upstairs reading bench']) {
    assert.ok(scene.getObjectByName(name), name);
  }
  const direction = new THREE.Vector2();
  function walk(x, z) {
    for (let frame = 0; frame < 300; frame++) {
      direction.set(x - camera.position.x, z - camera.position.z);
      if (direction.length() < .105) break;
      player.move(.025, direction.clampLength(0, 1), visit);
    }
    assert.ok(Math.hypot(x - camera.position.x, z - camera.position.z) < .105,
      `cannot reach ${x},${z} from ${camera.position.toArray()}`);
    player.stop();
  }
  walk(7.2, STAIR_Z);
  walk(-.45, STAIR_Z);
  assert.ok(near(camera.position.y, UPSTAIRS + EYE_HEIGHT));
  walk(-.45, 1.2);
  walk(2.06, 1.2);
  walk(2.06, -2.15);
  assert.ok(!tasks.dishes.reachable(new THREE.Vector3(tasks.dishes.x, camera.position.y, tasks.dishes.z)));
  walk(2.06, 1.2);
  walk(-6.55, 1.2);
  walk(-6.55, -2.07);
  assert.ok(!tasks.bed.active && !tasks.toys.reachable({ x: tasks.toys.x, y: EYE_HEIGHT, z: tasks.toys.z }));
  walk(-6.55, 2.7);
  walk(-.45, 2.7);
  walk(-.45, STAIR_Z);
  walk(7.2, STAIR_Z);
  assert.ok(near(camera.position.y, EYE_HEIGHT));
  walk(definition.spawn.x, definition.spawn.z);
});

test('family missions start on approach, stay on their own floor, and use no prompts', async t => {
  const { worlds, cues } = fixture();
  t.after(worlds.unload);
  const { area } = await worlds.load(house);
  const tasks = missions(area);
  const done = id => area.missionStatus.missions.find(mission => mission.id === id).complete;
  for (const [id, [x, y, z]] of Object.entries(familySpots)) {
    assert.equal(tasks[id], undefined);
    worlds.update(.02, new THREE.Vector3(x, y > 3 ? EYE_HEIGHT : UPSTAIRS + EYE_HEIGHT, z));
    worlds.update(2);
    assert.equal(done(id), false);
    worlds.reset();
    const count = cues.length;
    approachFamily(worlds, id);
    assert.equal(cues.length, count + 1);
    assert.equal(done(id), false);
    worlds.update(1.7, new THREE.Vector3(x, y, z));
    assert.equal(done(id), true);
    approachFamily(worlds, id);
    assert.equal(cues.length, count + 1);
    if (id === 'wake') assert.equal(tasks.bed.active, true);
    worlds.reset();
  }
});

test('each mission makes its actual furniture tidy exactly once and only after the animation', async () => {
  const { worlds, completions, cues } = fixture();
  const { area, scene } = await worlds.load(house);
  const tasks = missions(area);
  const model = models(scene);
  assert.deepEqual(Object.fromEntries(Object.values(tasks).map(task => [task.id, task.label])),
    Object.fromEntries(Object.entries(labels).filter(([id]) => !familySpots[id])));
  for (const [id, isTidy] of Object.entries(tidy)) {
    const task = tasks[id];
    worlds.reset();
    if (id === 'bed') { approachFamily(worlds, 'wake'); worlds.update(1.2); }
    const before = id === 'bed' ? ['wake'] : [];
    assert.deepEqual(area.missionStatus.missions, missionProgress(before));
    for (const [key, isTidy] of Object.entries(tidy)) {
      assert.equal(isTidy(model), false, key);
      assert.equal(tasks[key].active, key !== 'bed' || id === 'bed');
    }
    const initialCues = cues.length;
    task.act();
    task.act();
    assert.equal(task.active, false);
    assert.deepEqual(area.missionStatus.missions, missionProgress(before));
    if (id === 'dishes') assert.ok(model.water.visible);
    worlds.update(0.2);
    assert.deepEqual(area.missionStatus.missions, missionProgress(before));
    assert.equal(isTidy(model), false);
    worlds.update(1.2);
    task.act();
    worlds.update(2);
    assert.deepEqual(area.missionStatus.missions, missionProgress([...before, id]));
    assert.equal(isTidy(model), true, id);
    assert.equal(cues.length, initialCues + 1);
    for (const other of Object.keys(tidy).filter(key => key !== id)) {
      assert.equal(tidy[other](model), false);
    }
  }
  assert.deepEqual(completions, []);
  worlds.unload();
});

test('every mission works from different positions outside its clearance while facing the object', async () => {
  const { worlds, camera } = fixture();
  const { area, scene } = await worlds.load(house);
  const tasks = missions(area);
  const button = Object.assign(new EventTarget(), { style: { setProperty() {} } });
  const prompts = createInteractions(THREE, {
    button, glyph: {}, label: {}, camera, playing: () => true, touchMode: () => false,
    runAction: item => item.act(),
  });
  const positions = {
    bed: { close: [-3.12, -3.72], approaches: [[-6.50, -2.67], [-5.9, -2.4]], floor: UPSTAIRS },
    dishes: { close: [2.24, -3.46], approaches: [[1.05, -2.8], [3.65, -2.2]], floor: 0 },
    painting: { close: [-7.87, -.90], approaches: [[-6.65, -1.38], [-5.95, -.32]], floor: 0 },
    tv: { close: [-7.33, 1.14], approaches: [[-6.58, .14], [-6.6, 3.1]], floor: 0 },
    toys: { close: [-2.64, -2.17], approaches: [[-2.52, -3.65], [-3.85, -3.57]], floor: UPSTAIRS },
  };
  approachFamily(worlds, 'wake');
  worlds.update(1.2);
  for (const [id, { close: [closeX, closeZ], approaches, floor }] of Object.entries(positions)) {
    const task = tasks[id];
    const outline = scene.getObjectByName(task.label + ' clearance');
    if (id !== 'toys') assert.ok(outline.visible);
    const [x, z] = approaches[0];
    prompts.setItems([task]);
    assert.equal(walkElevation(area, { x, z }, closeX, closeZ, floor, true), null, task.label);
    assert.equal(walkElevation(area, { x, z }, closeX, closeZ, floor + 1.1, false), null, task.label);
    assert.equal(nearestInteraction([task], { x: closeX, y: floor + EYE_HEIGHT, z: closeZ }), null, task.label);
    camera.position.set(x, floor + EYE_HEIGHT, z);
    camera.lookAt(2 * x - task.x, camera.position.y, 2 * z - task.z);
    camera.updateMatrixWorld();
    prompts.update();
    assert.ok(button.hidden, task.label);
    prompts.interact();
    assert.ok(task.active);
    for (const [px, pz] of approaches) {
      camera.position.set(px, floor + EYE_HEIGHT, pz);
      camera.lookAt(task.x, task.anchorY, task.z);
      camera.updateMatrixWorld();
      prompts.update();
      assert.equal(button.hidden, false, task.label);
    }
    prompts.interact();
    if (outline) assert.ok(outline.visible, task.label);
    assert.ok(!task.active);
    assert.equal(walkElevation(area, { x, z }, closeX, closeZ, floor, true), null);
    worlds.update(1.3);
    if (outline) assert.equal(outline.visible, false, task.label);
    assert.notEqual(walkElevation(area, { x, z }, closeX, closeZ, floor, true), null, task.label);
  }
  worlds.reset();
  for (const [id, { close: [x, z], floor }] of Object.entries(positions)) {
    assert.ok(area.blocksGround(x, z, PLAYER_RADIUS, floor));
    if (id !== 'toys') assert.ok(scene.getObjectByName(tasks[id].label + ' clearance').visible);
  }
  worlds.unload();
});

test('all eleven tasks show one hint and can be completed in different orders', async () => {
  const { worlds, getStorage, writes, completions, progress, cues, notifications } = fixture(['garden@3', 'snow@3']);
  for (const order of [
    Object.keys(labels),
    ['toys', 'painting', 'tv', 'wake', 'bed', 'dishes', 'girl', 'table', 'bird', 'father', 'mother'],
  ]) {
    const { area, scene } = worlds.active ?? await worlds.load(house);
    const tasks = missions(area);
    const model = models(scene);
    assert.deepEqual(area.missionStatus.missions, missionProgress());
    assert.ok(!model.stars.visible);
    assert.match(area.missionStatus.hint, /Mom at the stove/);
    order.forEach((id, i) => {
      assert.ok(area.missionStatus.hint);
      const before = cues.length;
      if (familySpots[id]) approachFamily(worlds, id);
      else tasks[id].act();
      worlds.update(1.6);
      assert.ok(cues.length > before, id);
      assert.deepEqual(area.missionStatus.missions, missionProgress(order.slice(0, i + 1)));
    });
    for (const [id, task] of Object.entries(tasks)) {
      if (tidy[id]) assert.ok(tidy[id](model), id);
      assert.equal(task.active, false);
      task.act();
    }
    assert.ok(model.stars.visible);
    worlds.update(2);
    assert.equal(model.stars.visible, false);
    assert.deepEqual(area.missionStatus.missions, success);
    assert.equal(area.missionStatus.hint, '');
    assert.ok(progress.has(house));
    const reopened = createLevelProgress(areas, getStorage);
    assert.ok(reopened.has(house));
    assert.ok(reopened.has('garden') && reopened.has('snow'));
    worlds.reset();
    assert.deepEqual(area.missionStatus.missions, missionProgress());
    assert.ok(Object.values(tidy).every(isTidy => !isTidy(model)));
  }
  assert.deepEqual(completions, [house, house]);
  assert.deepEqual(notifications, Array(2).fill('Great job helping the whole family!'));
  assert.equal(writes.length, 1);
  assert.equal(cues.length, 24);
  await worlds.load('garden');
  const revisit = await worlds.load(house);
  assert.deepEqual(revisit.area.missionStatus.missions, missionProgress());
  assert.ok(Object.values(missions(revisit.area)).every(task => task.active === (task.id !== 'bed')));
  worlds.unload();
});

test('unload cancels running missions and releases their resources', async () => {
  const { worlds, completions, cues } = fixture();
  const first = await worlds.load(house);
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
  await worlds.load('garden');
  assert.ok(first.lifetime.signal.aborted);
  assert.equal(first.scene.children.length, 0);
  assert.ok(disposed);
  assert.equal(model.water.visible, false);
  assert.equal(model.screen.visible, false);
  tasks.dishes.act();
  first.area.update(2);
  assert.equal(cues.length, 4);
  assert.deepEqual(completions, []);
  const next = await worlds.load(house);
  assert.deepEqual(next.area.missionStatus.missions, missionProgress());
  worlds.unload();
});

test('reduced motion keeps the TV still and applies tidy poses without animated effects', async () => {
  const { worlds, reduceMotion, completions } = fixture();
  reduceMotion();
  const { area, scene } = await worlds.load(house);
  const model = models(scene);
  const cloud = model.program.children[3];
  const cloudPosition = cloud.position.clone();
  worlds.update(1);
  assert.ok(cloud.position.equals(cloudPosition));
  for (const id of Object.keys(familySpots)) approachFamily(worlds, id);
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
