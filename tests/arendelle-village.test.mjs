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

const ID = 'arendelle-village';
const CASTLE = 'frozen-castle';

function fixture(initial = ID) {
  let stored = JSON.stringify(['garden', 'wooden-house', 'snow']);
  const writes = [];
  const progress = createLevelProgress(areas, () => ({
    getItem: () => stored,
    setItem(key, value) { stored = value; writes.push(JSON.parse(value)); },
  }));
  const camera = new THREE.PerspectiveCamera();
  let still = false;
  const worlds = createWorldManager(THREE, {
    areas, camera, touch: true, playerRadius: PLAYER_RADIUS,
    services: { isLevelComplete: progress.has, completeLevel: progress.complete, reducedMotion: () => still },
  });
  const visit = worlds.load(initial);
  return { visit, worlds, camera, progress, writes, reduceMotion() { still = true; } };
}

function followPath(player, camera, visit, points) {
  const motion = new THREE.Vector2();
  for (const [x, z] of points) {
    for (let step = 0; step < 270; step++) {
      motion.set(x - camera.position.x, z - camera.position.z);
      if (motion.length() < 0.13) break;
      player.move(0.04, motion.multiplyScalar(2).clampLength(0, 1), visit);
    }
    assert.ok(Math.hypot(x - camera.position.x, z - camera.position.z) < 0.13,
      `could not reach ${x}, ${z} from ${camera.position.x}, ${camera.position.z}`);
  }
}

test('the unlocked Castle gateway opens the village and the return gateway arrives safely in the Castle hall', t => {
  const { visit, worlds, camera, progress, writes } = fixture(CASTLE);
  t.after(worlds.unload);
  const player = createPlayer(THREE, camera);
  const route = areaURL(new URL('https://example.test/Kids-World/'), ID);
  assert.equal(areas[ID].id, ID);
  assert.equal(resolveArea(route, areas, 'garden'), ID);

  const gateway = visit.area.interactions.find(item => item.destination === ID);
  const trips = [];
  function travel(id, heardCue, arrival) {
    trips.push({ id, heardCue, arrival });
    const { area, definition } = worlds.load(id);
    player.reset(area.arrivals?.[arrival] ?? definition.spawn, area);
  }
  assert.equal(gateway.active, false);
  gateway.act({ travel });
  assert.deepEqual(trips, []);
  for (const interaction of visit.area.interactions) {
    if (interaction.label === 'Activate crystal' || interaction.label === 'Play crystal') interaction.act();
  }
  const stairs = visit.area.interactions.find(item => item.label === 'Build ice staircase');
  stairs.act();
  stairs.act();
  assert.equal(gateway.active, false);
  stairs.act();
  worlds.update(0.6);
  assert.equal(gateway.active, true);
  assert.equal(progress.has(CASTLE), true);

  gateway.act({ travel, heardCue: true });
  assert.deepEqual(trips, [{ id: ID, heardCue: true, arrival: undefined }]);
  assert.equal(worlds.active.id, ID);
  const village = worlds.active;
  const { spawn } = village.definition;
  assert.deepEqual([camera.position.x, camera.position.z], [spawn.x, spawn.z]);
  assert.ok(camera.getWorldDirection(new THREE.Vector3()).z < 0, 'faces the village avenue');
  assert.equal(nearestInteraction(village.area.interactions, camera.position), null);
  followPath(player, camera, village, [[0, 27.55]]);
  const returnGate = nearestInteraction(village.area.interactions, camera.position);
  assert.equal(returnGate.label, 'Return to Frozen Castle');
  returnGate.act({ travel, heardCue: false });
  assert.deepEqual(trips[1], { id: CASTLE, heardCue: false, arrival: ID });
  assert.equal(historyArrival(CASTLE, { area: CASTLE, arrival: trips[1].arrival }), ID);
  const castle = worlds.active;
  const arrival = castle.area.arrivals[ID];
  assert.deepEqual([camera.position.x, camera.position.y, camera.position.z], [arrival.x, 1.68, arrival.z]);
  assert.equal(walkElevation(castle.area, arrival, arrival.x, arrival.z, 0, true), 0);
  assert.equal(nearestInteraction(castle.area.interactions, camera.position), null);
  assert.equal(castle.area.interactions.find(item => item.destination === ID).active, true);
  assert.deepEqual(writes, [['garden', 'wooden-house', 'snow', CASTLE]]);
});

test('the village roads connect the entrance, plaza, west lanes, bridge, stable, market and both piers', t => {
  const { visit, worlds, camera } = fixture();
  t.after(worlds.unload);
  const { area, definition, scene } = visit;
  assert.ok(definition.width * definition.depth > areas.snow.width * areas.snow.depth * 3);
  for (const name of ['Village gateway', 'Village Square', 'Clock tower', 'Village fountain', 'Village house 1',
    'Stone bridge', 'Village stables', 'Stable enclosure', 'Bakery', 'Fruit Shop', 'Fish Shop',
    'Harbor seawall', 'Fishing pier', 'City boat pier', 'City passenger boat', 'Fjord mountains']) {
    assert.ok(scene.getObjectByName(name), name);
  }
  const player = createPlayer(THREE, camera);
  player.reset(definition.spawn, area);
  followPath(player, camera, visit, [[0, 7], [-3.3, 5], [-3.3, -3], [0, -6], [0, -10.2]]);
  followPath(player, camera, visit, [[-3.5, -9.7], [-3.5, 5.2], [-12.35, 5.2], [-27.8, 5.2], [-27.8, -10.6],
    [-12.35, -10.6], [-12.35, 19.55], [-17.3, 19.55]]);
  assert.ok(camera.position.y > 2.1, 'climbs the bridge');
  followPath(player, camera, visit, [[-23.1, 19.55], [-28.2, 19.55], [-28.2, 24.0]]);
  assert.ok(camera.position.y > 1.68, 'reaches rising ground in the enclosure');
  followPath(player, camera, visit, [[-28.2, 19.55], [-12.35, 19.55], [-12.35, 5.2], [-3.3, 5.2], [7.4, 6.7],
    [7.4, 8.1], [7.4, 7.0], [14.2, 7.0], [14.2, 8.2], [14.2, 7.0], [18.6, 7.0], [18.6, -3.0], [37.8, -3.0], [37.8, -5.4], [37.8, -0.6]]);
  assert.equal(camera.position.y, 1.68, 'walks both fishing edges');
  followPath(player, camera, visit, [[37.8, -3], [18.7, -3], [18.7, 17.25], [30.7, 17.25], [32.4, 18.45]]);
  assert.equal(camera.position.y, 1.68, 'walks to the end of the city pier');
});

test('buildings, quay, bridge walls, water edges and the world boundary block movement', t => {
  const { visit, worlds } = fixture();
  t.after(worlds.unload);
  const { area } = visit;
  function block(safe, blocked, jump = false) {
    const from = { x: safe[0], z: safe[1] };
    const floor = area.getGroundHeight(...safe);
    assert.ok(Number.isFinite(floor));
    assert.notEqual(walkElevation(area, from, ...safe, floor, true), null, `clear approach at ${safe}`);
    assert.equal(walkElevation(area, from, ...blocked, floor + (jump ? 0.92 : 0), !jump), null,
      `blocked at ${blocked}`);
  }
  block([-3.86, -2.35], [-4.67, -2.35]); // House
  block([7.4, 8.95], [7.4, 9.52]); // Bakery door
  block([0, -10.7], [0, -11.1]); // Clock tower
  block([22.05, 6], [22.51, 6]); // Seawall on land
  block([22.05, 6], [23.1, 6], true);
  block([38.56, -2.8], [38.81, -2.8]); // Fishing pier end
  block([36, -5.57], [36, -5.77], true);
  block([36, -0.44], [36, -0.24]);
  block([32.57, 17.25], [32.79, 17.25], true); // Passenger boat stays separate
  block([-17.3, 18.2], [-17.3, 17.7]); // Bridge railing
  block([-19.76, 24], [-19.24, 24], true); // Creek
  block([-28.1, 17.7], [-28.1, 17.22]); // Stable fence
  block([0, 33.57], [0, 33.79], true);
  block([-36.57, 3.7], [-36.79, 3.7], true);
});

test('shop and dock interactions show temporary messages without travel or completion', t => {
  const { visit, worlds, progress, writes } = fixture();
  t.after(worlds.unload);
  const { area } = visit;
  const prompts = [
    ['Visit Bakery', 'Bakery — Coming Soon', { x: 7.4, z: 8.5 }],
    ['Visit Fruit Shop', 'Fruit Shop — Coming Soon', { x: 14.2, z: 8.6 }],
    ['To The City', 'City Adventure — Coming Soon', { x: 30.1, z: 17.25 }],
  ];
  assert.equal(area.interactions.length, 4);
  assert.equal(area.objective, '');
  for (const [label, message, site] of prompts) {
    const item = nearestInteraction(area.interactions, { ...site, y: 1.68 });
    assert.equal(item.label, label);
    item.act({ travel() { assert.fail('Coming Soon should stay in the current area'); } });
    assert.equal(area.objective, message);
    worlds.update(1.6);
    assert.equal(area.objective, message);
    worlds.update(1.7);
    assert.equal(area.objective, '');
  }
  assert.equal(nearestInteraction(area.interactions, { x: 7.4, y: 1.68, z: 10.1 }), null);
  assert.equal(nearestInteraction(area.interactions, { x: 18.5, y: 1.68, z: -3 }), null, 'Fish Shop awaits Phase 2');
  assert.equal(worlds.active.id, ID);
  assert.ok(!progress.has(ID) && progress.has('garden') && progress.has('snow') && progress.has('wooden-house'));
  assert.deepEqual(writes, []);
});

test('Restart restores motion and messages, and travel disposes the first visit before recreating it', t => {
  const { visit, worlds, camera, progress, reduceMotion } = fixture();
  t.after(worlds.unload);
  const boat = visit.scene.getObjectByName('City passenger boat');
  const waves = visit.scene.getObjectByName('Water ripples');
  const stillBoat = boat.position.clone();
  const stillWaves = waves.position.clone();
  const geometries = new Set();
  const gameResources = new Set();
  visit.scene.traverse(node => {
    if (!node.isMesh) return;
    geometries.add(node.geometry);
    if (node.isInstancedMesh) gameResources.add(node);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) gameResources.add(material);
  });
  for (const geometry of geometries) gameResources.add(geometry);
  const disposed = new Map();
  for (const resource of gameResources) {
    resource.addEventListener('dispose', () => disposed.set(resource, (disposed.get(resource) ?? 0) + 1));
  }

  const cityPrompt = visit.area.interactions.find(item => item.label === 'To The City');
  cityPrompt.act();
  worlds.update(1);
  assert.ok(!boat.position.equals(stillBoat) && boat.rotation.z !== 0 && !waves.position.equals(stillWaves));
  const children = visit.scene.children.length;
  worlds.reset();
  assert.equal(visit.scene.children.length, children);
  assert.equal(disposed.size, 0);
  assert.equal(visit.area.objective, '');
  assert.ok(boat.position.equals(stillBoat) && waves.position.equals(stillWaves));
  assert.equal(boat.rotation.z, 0);
  worlds.update(1);
  reduceMotion();
  worlds.update(1);
  assert.ok(boat.position.equals(stillBoat) && waves.position.equals(stillWaves));
  assert.equal(boat.rotation.z, 0);

  worlds.load(CASTLE);
  assert.ok(visit.lifetime.signal.aborted);
  assert.equal(visit.scene.children.length, 0);
  assert.equal(disposed.size, gameResources.size);
  assert.ok([...disposed.values()].every(count => count === 1));
  assert.ok(visit.area.interactions.every(item => item.active === false));
  cityPrompt.act();
  assert.equal(visit.area.objective, '');

  const repeat = worlds.load(ID);
  assert.equal(camera.parent, repeat.scene);
  assert.equal(repeat.scene.children.length, children);
  assert.notEqual(repeat.area.interactions, visit.area.interactions);
  assert.equal(repeat.area.interactions.length, visit.area.interactions.length);
  assert.equal(repeat.area.objective, '');
  assert.ok(repeat.scene.getObjectByName('City passenger boat').position.equals(stillBoat));
  assert.ok(progress.has('snow') && !progress.has(ID));
});

test('the offline release ships all village runtime files', async () => {
  const manifest = JSON.parse(await readFile(new URL('../version.json', import.meta.url)));
  const files = await readdir(new URL('../areas/arendelle-village/', import.meta.url));
  const included = new Set(manifest.files.map(file => file.path));
  for (const file of files) assert.ok(included.has('./areas/arendelle-village/' + file), file);
});
