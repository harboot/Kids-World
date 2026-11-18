import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { areas } from '../game.js';
import { nearestInteraction } from '../core/interactions.js';
import { createLevelProgress } from '../core/level-progress.js';
import { PLAYER_RADIUS, walkElevation } from '../core/movement.js';
import { createPlayer } from '../core/player.js';
import { areaURL, createWorldManager, historyArrival, resolveArea } from '../core/world-manager.js';

const ID = 'frozen-castle';
const storageKey = 'kids-world-completed-levels';

function fixture({ saved = [], still = false } = {}) {
  let stored = JSON.stringify(saved);
  const writes = [];
  const storage = {
    getItem: key => key === storageKey ? stored : null,
    setItem(key, value) { assert.equal(key, storageKey); stored = value; writes.push(value); },
  };
  const getStorage = () => storage;
  const progress = createLevelProgress(areas, getStorage);
  const recorded = [];
  const cues = [];
  const camera = new THREE.PerspectiveCamera();
  const worlds = createWorldManager(THREE, {
    areas, camera, touch: true, playerRadius: PLAYER_RADIUS,
    services: {
      reducedMotion: () => still,
      isLevelComplete: progress.has,
      completeLevel(id) { recorded.push(id); progress.complete(id); },
      playCue(notes) { cues.push(notes); },
    },
  });
  const visit = worlds.load(ID);
  const { area, scene } = visit;
  const withLabel = label => area.interactions.filter(item => item.label === label);
  return {
    worlds, camera, visit, area, scene, getStorage, writes, progress, recorded, cues,
    crystals: withLabel('Activate crystal'),
    music: withLabel('Play crystal'),
    bridge: withLabel('Create ice bridge')[0],
    gateway: withLabel('Enter Snowglow Village')[0],
    exit: withLabel('Return to Snow Basin')[0],
  };
}

function assertProgress(area, count) {
  assert.equal(area.objective.split('\n')[0], `Frozen Castle · ${count}/3 missions`);
}

function bridges(scene) {
  return [1, 2, 3].map(i => scene.getObjectByName('Ice bridge section ' + i));
}

function finishMission(game, mission) {
  if (mission === 'crystals') game.crystals.forEach(item => item.act());
  if (mission === 'melody') [...game.music].reverse().forEach(item => item.act());
  if (mission === 'bridge') {
    for (let i = 0; i < 3; i++) game.bridge.act();
    game.worlds.update(0.5);
  }
}

test('the castle route, safe entrance spawn and named Snow Basin arrival use the registered areas', () => {
  const { worlds, area, camera, exit, gateway } = fixture({ saved: ['snow'] });
  const castle = areas[ID];
  assert.equal(castle.id, ID);
  assert.equal(castle.title, 'Frozen Castle');
  assert.equal(gateway.destination, 'snowglow-village');
  assert.equal(Object.hasOwn(areas, gateway.destination), false);
  const url = areaURL(new URL('https://example.test/Kids-World/index.html?area=snow#explore'), ID);
  assert.equal(url.href, 'https://example.test/Kids-World/index.html?area=frozen-castle#explore');
  assert.equal(resolveArea(url, areas, 'garden', 'snow'), ID);

  const player = createPlayer(THREE, camera);
  player.reset(castle.spawn, area);
  assert.equal(walkElevation(area, castle.spawn, castle.spawn.x, castle.spawn.z, 0, true), 0);
  assert.equal(nearestInteraction(area.interactions, { x: castle.spawn.x, z: castle.spawn.z + 0.4 }), exit);
  assert.ok(camera.getWorldDirection(new THREE.Vector3()).z < 0, 'player faces the hall');

  exit.act({ heardCue: true, travel(destination, heardCue, arrival) {
    assert.equal(destination, 'snow');
    assert.equal(heardCue, true);
    assert.equal(historyArrival(destination, { area: destination, arrival }), ID);
    const { area: snow } = worlds.load(destination);
    const spawn = snow.arrivals[arrival];
    player.reset(spawn, snow);
    assert.equal(walkElevation(snow, spawn, spawn.x, spawn.z, 0, true), 0);
    assert.equal(nearestInteraction(snow.interactions, camera.position).label, 'Enter Frozen Castle');
    assert.ok(camera.getWorldDirection(new THREE.Vector3()).z > 0, 'player faces the Snow Basin doorway');
    assert.match(snow.objective, /^Snow Basin · 0\/3/);
  } });
  assert.equal(worlds.active.id, 'snow');
  worlds.unload();
});

test('all activities, the throne stairs, balcony and exit can be reached on foot with the bridge absent', () => {
  const { worlds, area, visit, crystals, bridge, music, exit } = fixture();
  const start = { ...visit.definition.spawn, feet: 0 };
  const queue = [start];
  const key = (x, z) => `${x.toFixed(2)},${z.toFixed(2)}`;
  const visited = new Set([key(start.x, start.z)]);
  for (const cell of queue) {
    for (const [dx, dz] of [[0.25, 0], [-0.25, 0], [0, 0.25], [0, -0.25]]) {
      const x = cell.x + dx;
      const z = cell.z + dz;
      if (visited.has(key(x, z)) || Math.abs(x) >= 14 || Math.abs(z) >= 14) continue;
      const feet = walkElevation(area, cell, x, z, cell.feet, true);
      if (feet === null) continue;
      visited.add(key(x, z));
      queue.push({ x, z, feet });
    }
  }
  const throne = area.interactions.find(item => item.label === 'Sit on Ice Throne');
  for (const item of [...crystals, bridge, ...music, throne, exit]) {
    assert.ok(queue.some(cell => nearestInteraction(area.interactions, { ...cell, y: cell.feet + 1.68 }) === item),
      `standing approach for ${item.label} at ${item.x},${item.z}`);
  }
  assert.ok(queue.some(cell => Math.abs(cell.x) < 1 && cell.z < -9.4 && cell.feet === 1.6), 'the central staircase is walkable');
  assert.ok(queue.some(cell => Math.abs(cell.x + 9.94) < 0.8 && cell.z < -12), 'the mountain balcony is walkable');
  assert.equal(walkElevation(area, { x: 5.7, z: 7.6 }, 5.7, 7.8, 0, true), null, 'pillar collision');
  assert.equal(walkElevation(area, { x: 8.45, z: -1.5 }, 8.45, -1.8, 0, true), null, 'fountain collision');
  assert.equal(walkElevation(area, { x: -9.9, z: -12.9 }, -9.9, -13.1, 1.4, false), null, 'balcony guard');
  worlds.unload();
});

test('three distinct activation crystals count once and illuminate the chandelier', () => {
  const { worlds, area, scene, crystals, music, bridge, gateway, cues } = fixture();
  const chandelier = scene.getObjectByName('Crystal chandelier').children[1].material;
  const dim = chandelier.emissiveIntensity;
  assertProgress(area, 0);
  assert.equal(crystals.length, 3);
  assert.equal(music.length, 3);
  assert.ok(bridge.active);
  assert.equal(gateway.active, false);

  const thirdCrystal = scene.getObjectByName('Activation crystal 3');
  const glow = thirdCrystal.children[0].material;
  const dimCrystal = glow.emissiveIntensity;
  crystals[2].act();
  assert.ok(thirdCrystal.getObjectByName('Crystal sparkles').visible);
  crystals[2].act();
  assert.equal(cues.length, 1);
  assert.match(area.objective, /Awaken ice crystals · 1\/3/);
  worlds.update(0.5);
  assert.ok(glow.emissiveIntensity > dimCrystal);
  assert.equal(chandelier.emissiveIntensity, dim);

  crystals[0].act();
  assert.match(area.objective, /Awaken ice crystals · 2\/3/);
  assertProgress(area, 0);
  crystals[1].act();
  worlds.update(0.7);
  assertProgress(area, 1);
  assert.doesNotMatch(area.objective, /Awaken ice crystals/);
  assert.ok(chandelier.emissiveIntensity > dim);
  assert.ok(crystals.every(item => !item.active));
  assert.equal(gateway.active, false);
  worlds.unload();
});

test('the bridge forms exactly three walkable segments and blocks every unfinished approach', () => {
  const { worlds, area, scene, bridge, gateway } = fixture();
  const models = bridges(scene);
  const walk = (from, x, z, feet = 0, grounded = true) => walkElevation(area, from, x, z, feet, grounded);
  const east = { x: -7.6, z: 0 };
  const west = { x: -12.42, z: 0 };
  assert.ok(models.every(model => !model.visible));
  assert.equal(walk(east, -7.75, 0), null);
  assert.equal(walk(east, -7.75, 0, 0.95, false), null);
  assert.equal(walk(west, -12.22, 0), null);

  bridge.act();
  assertProgress(area, 0);
  assert.equal(models.filter(model => model.visible).length, 1);
  assert.ok(models[0].position.y < 0);
  assert.equal(walk(east, -7.75, 0), null);
  worlds.update(0.5);
  assert.equal(walk(east, -7.75, 0), 0);
  assert.equal(walk({ x: -8.9, z: 0 }, -9.1, 0), null);
  assert.equal(walk(west, -12.22, 0), null);

  bridge.act();
  bridge.act();
  bridge.act();
  assert.equal(bridge.active, false);
  assert.equal(models.filter(model => model.visible).length, 3);
  assert.equal(walk(west, -12.22, 0), null);
  worlds.update(0.5);
  for (let x = east.x; x >= west.x; x -= 0.1) {
    assert.equal(walk({ x: x + 0.1, z: 0 }, x, 0), 0, `bridge at ${x}`);
  }
  assert.equal(walk({ x: -10, z: 0.7 }, -10, 0.9), null, 'bridge rails contain the player');
  assert.equal(walk({ x: -10, z: 2.4 }, -10, 2.28), null, 'channel side remains blocked');
  assertProgress(area, 1);
  assert.equal(gateway.active, false);
  worlds.unload();
});

test('the blue, pink and purple tuning crystals play distinct notes and can be replayed', () => {
  const { worlds, area, scene, music, cues } = fixture();
  const aurora = scene.getObjectByName('Ceiling aurora');
  assert.equal(aurora.visible, false);
  for (const index of [1, 1, 2, 0]) {
    music[index].act();
    assert.ok(scene.getObjectByName('Musical crystal ' + (index + 1)).children[1].visible);
    if (index === 1) assert.match(area.objective, /Play crystal melody · 1\/3/);
    if (index === 2) assert.match(area.objective, /Play crystal melody · 2\/3/);
  }
  worlds.update(0.1);
  assertProgress(area, 1);
  assert.ok(aurora.visible);
  assert.equal(cues[0][0][0], cues[1][0][0]);
  assert.equal(new Set([cues[0][0][0], cues[2][0][0], cues[3][0][0]]).size, 3);
  assert.ok(cues[4].length > 3, 'the completed melody plays its own sequence');
  music[1].act();
  assertProgress(area, 1);
  assert.equal(cues.length, 6, 'replaying a note does not replay the completion sequence');
  worlds.unload();
});

test('all mission orders unlock the same placeholder and completion is saved only once', () => {
  for (const order of [
    ['crystals', 'bridge', 'melody'], ['crystals', 'melody', 'bridge'],
    ['bridge', 'crystals', 'melody'], ['bridge', 'melody', 'crystals'],
    ['melody', 'crystals', 'bridge'], ['melody', 'bridge', 'crystals'],
  ]) {
    const game = fixture({ saved: ['snow'] });
    const { worlds, area, gateway, recorded, writes, getStorage } = game;
    const travel = () => assert.fail('the future village never calls travel');
    saveCheck(false);
    order.forEach((mission, index) => {
      finishMission(game, mission);
      assertProgress(area, index + 1);
      saveCheck(index === 2);
    });
    assert.match(area.objective, /Castle Magic Restored!\nSnowglow Village unlocked!/);
    gateway.act({ travel });
    assert.match(area.objective, /Snowglow Village — Coming Soon/);
    worlds.update(3.3);
    assert.match(area.objective, /Snowglow Village unlocked!/);
    assert.equal(worlds.active.id, ID);
    for (const item of [...game.crystals, game.bridge, ...game.music]) item.act();
    assertProgress(area, 3);
    assert.deepEqual(recorded, [ID]);
    assert.equal(writes.length, 1);
    const reopened = createLevelProgress(areas, getStorage);
    assert.ok(reopened.has(ID) && reopened.has('snow'));
    worlds.unload();

    function saveCheck(open) {
      assert.equal(gateway.active, open);
      if (!open) {
        gateway.act({ travel });
        assert.doesNotMatch(area.objective, /Coming Soon/);
        assert.deepEqual(recorded, []);
      }
    }
  }
});

test('restart and replay restore temporary states, keep access, and release scene resources on unload', () => {
  const game = fixture({ still: true });
  const { worlds, visit, scene, area, gateway, crystals, progress, writes, recorded, cues } = game;
  const aurora = scene.getObjectByName('Ceiling aurora');
  const chandelier = scene.getObjectByName('Crystal chandelier').children[1].material;
  const originalGlow = chandelier.emissiveIntensity;
  const fountain = scene.getObjectByName('Fountain ice droplets').children[0];
  const originalPosition = fountain.position.clone();
  const sparkles = scene.getObjectByName('Crystal sparkles');
  const models = bridges(scene);
  for (const mission of ['melody', 'bridge', 'crystals']) finishMission(game, mission);
  assert.ok(aurora.visible && gateway.active && progress.has(ID));
  assert.ok(chandelier.emissiveIntensity > originalGlow);
  assert.ok(fountain.position.equals(originalPosition));
  assert.equal(sparkles.visible, false);
  assert.ok(models.every(model => model.position.y === 0 && model.scale.y === 1));
  gateway.act();
  worlds.reset();
  assertProgress(area, 0);
  assert.doesNotMatch(area.objective, /Coming Soon/);
  assert.equal(chandelier.emissiveIntensity, originalGlow);
  assert.equal(aurora.visible, false);
  assert.ok(models.every(model => !model.visible));
  assert.ok(scene.getObjectByName('Musical crystal 1').children[1].visible === false);
  assert.ok(crystals.every(item => item.active) && gateway.active);
  assert.equal(writes.length, 1);
  for (const mission of ['crystals', 'melody', 'bridge']) finishMission(game, mission);
  assert.deepEqual(recorded, [ID]);

  let disposed = false;
  aurora.children[0].geometry.addEventListener('dispose', () => { disposed = true; });
  const previousCues = cues.length;
  worlds.load('snow');
  assert.ok(visit.lifetime.signal.aborted);
  assert.equal(visit.scene.children.length, 0);
  assert.ok(disposed);
  assert.equal(aurora.visible, false);
  for (const item of [...crystals, game.bridge, ...game.music, gateway]) item.act();
  area.update(3);
  assert.equal(cues.length, previousCues);
  const next = worlds.load(ID);
  assertProgress(next.area, 0);
  assert.ok(next.area.interactions.find(item => item.label === 'Enter Snowglow Village').active);
  worlds.unload();
});

test('the offline release includes every Frozen Castle runtime module', async () => {
  const manifest = JSON.parse(await readFile(new URL('../version.json', import.meta.url)));
  const files = await readdir(new URL('../areas/frozen-castle/', import.meta.url));
  const included = new Set(manifest.files.map(file => file.path));
  assert.ok(files.length >= 4);
  for (const file of files) assert.ok(included.has('./areas/frozen-castle/' + file), file);
});
