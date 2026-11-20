import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { areas } from '../game.js';
import { exhibits } from '../areas/princess-gallery/exhibits.js';
import { observationPlatform } from '../areas/princess-gallery/rapunzel.js';
import { createCoordinatePicker } from '../core/coordinate-picker.js';
import { createDroneCamera, isDroneView } from '../core/drone-view.js';
import { nearestInteraction } from '../core/interactions.js';
import { createLevelProgress } from '../core/level-progress.js';
import { floorHeight, overlaps, PLAYER_RADIUS, walkElevation } from '../core/movement.js';
import { createPlayer, EYE_HEIGHT } from '../core/player.js';
import { PLAYER_ONLY_LAYER } from '../core/render-layers.js';
import { areaURL, createWorldManager, historyArrival, resolveArea } from '../core/world-manager.js';

const ID = 'princess-gallery';
const CASTLE = 'frozen-castle';
const hall = areas[ID];
const rapunzel = exhibits[0];
const storageKey = 'kids-world-completed-levels';

function worldPoint(x, z) {
  const cos = Math.cos(rapunzel.rotation);
  const sin = Math.sin(rapunzel.rotation);
  return { x: rapunzel.position.x + cos * x + sin * z, z: rapunzel.position.z - sin * x + cos * z };
}

function fixture({ saved = [], reduced = false } = {}) {
  const values = new Map([[storageKey, JSON.stringify(saved)]]);
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const progress = createLevelProgress(areas, () => storage);
  const camera = new THREE.PerspectiveCamera();
  const player = createPlayer(THREE, camera);
  const notices = [];
  const worlds = createWorldManager(THREE, {
    areas, camera, touch: true, playerRadius: PLAYER_RADIUS,
    services: {
      reducedMotion: () => reduced,
      isPlayerGrounded: () => player.grounded,
      notify: message => notices.push(message),
      isLevelComplete: progress.has,
      completeLevel: progress.complete,
    },
  });
  return { worlds, camera, player, progress, storage, notices };
}

function assertSafeSpawn(spawn, visit, game) {
  const { area, definition } = visit;
  assert.ok(Math.abs(spawn.x) < definition.width / 2 - PLAYER_RADIUS);
  assert.ok(Math.abs(spawn.z) < definition.depth / 2 - PLAYER_RADIUS);
  assert.ok(!area.obstacles.some(entry => overlaps(entry, spawn.x, spawn.z)));
  game.player.reset(spawn, area);
  assert.deepEqual(game.camera.position.toArray(), [spawn.x, EYE_HEIGHT, spawn.z]);
  assert.equal(nearestInteraction(area.interactions, game.camera.position), null);
}

test('public gallery opens by normal and drone URLs with no castle progress', t => {
  const game = fixture();
  t.after(game.worlds.unload);
  assert.equal(hall.show, true);
  assert.deepEqual(hall.heading, ['Princess', 'Gallery']);
  assert.equal(areas['secret-apartment'].show, false);
  for (const flight of [false, true]) {
    const url = new URL('https://example.test/?area=princess-gallery' + (flight ? '&view=drone' : ''));
    assert.equal(isDroneView(url), flight);
    const visit = game.worlds.load(resolveArea(url, areas, 'garden', 'snow'));
    assert.equal(visit.id, ID);
    assertSafeSpawn(hall.spawn, visit, game);
    assert.deepEqual(visit.area.missionStatus.missions, []);
    assert.match(visit.area.missionStatus.hint, /jump onto the platform/);
    assert.equal(game.progress.has(CASTLE), false);
    assert.equal(game.progress.has(ID), false);
  }
  assert.equal(resolveArea(new URL('https://example.test/?area=secret-apartment'), areas, 'garden'), 'secret-apartment');
});

test('the castle gate explains its lock and unlocks only when all three missions complete', t => {
  const game = fixture();
  t.after(game.worlds.unload);
  const visit = game.worlds.load(CASTLE);
  const { area, scene } = visit;
  const gate = area.interactions.find(item => item.destination === ID);
  const seal = scene.getObjectByName('Magic seal');
  const sparks = scene.getObjectByName('Gateway crystals');
  const reach = { x: gate.x, z: gate.z - 1.8, y: EYE_HEIGHT };
  const travels = [];
  const travel = (...destination) => travels.push(destination);
  assert.equal(nearestInteraction(area.interactions, reach), gate);
  assert.match(gate.label, /Locked/);
  assert.equal(gate.unlocked, false);
  assert.ok(seal.visible && !sparks.visible);
  gate.act({ travel, heardCue: true });
  assert.deepEqual(travels, []);
  assert.match(game.notices.at(-1), /all three Frozen Castle missions/);
  assert.ok(area.missionStatus.missions.every(mission => !mission.complete));

  for (const item of area.interactions.filter(item => item.label === 'Activate crystal')) item.act();
  for (const item of area.interactions.filter(item => item.label === 'Play crystal').reverse()) item.act();
  assert.equal(gate.unlocked, false);
  const stairs = area.interactions.find(item => item.label === 'Build ice staircase');
  for (let i = 0; i < 3; i++) stairs.act();
  assert.equal(gate.unlocked, false);
  game.worlds.update(0.6, game.camera.position);
  assert.ok(area.missionStatus.missions.every(mission => mission.complete));
  assert.equal(game.progress.has(CASTLE), true);
  assert.equal(gate.unlocked, true);
  assert.equal(gate.label, 'Enter Princess Gallery');
  assert.ok(!seal.visible && sparks.visible);
  gate.act({ travel, heardCue: true });
  assert.deepEqual(travels, [[ID, true, CASTLE]]);
  assert.deepEqual(JSON.parse(game.storage.getItem(storageKey)), [CASTLE]);
});

test('saved completion, existing castle gates and named arrivals survive reset and visits', t => {
  const game = fixture({ saved: [CASTLE] });
  t.after(game.worlds.unload);
  const castle = game.worlds.load(CASTLE);
  const gate = castle.area.interactions.find(item => item.destination === ID);
  const village = castle.area.interactions.find(item => item.destination === 'arendelle-village');
  const snow = castle.area.interactions.find(item => item.label === 'Return to Snow Basin');
  const calls = [];
  const travel = (...args) => calls.push(args);
  game.worlds.reset();
  assert.equal(gate.unlocked, true);
  assert.equal(village.active, true);
  assert.ok(castle.area.missionStatus.missions.every(mission => !mission.complete));
  assertSafeSpawn(castle.area.arrivals[ID], castle, game);
  gate.act({ travel, heardCue: true });
  village.act({ travel, heardCue: true });
  snow.act({ travel, heardCue: true });
  assert.deepEqual(calls, [[ID, true, CASTLE], ['arendelle-village', true], ['snow', true, CASTLE]]);
  const gallery = game.worlds.load(ID);
  assertSafeSpawn(gallery.area.arrivals[CASTLE], gallery, game);
  const [exit] = gallery.area.interactions;
  assert.equal(exit.label, 'Return to Frozen Castle');
  exit.act({ travel, heardCue: false });
  assert.deepEqual(calls.at(-1), [CASTLE, false, ID]);
  const target = areaURL(new URL('https://example.test/?area=princess-gallery'), CASTLE);
  assert.equal(resolveArea(target, areas, 'garden'), CASTLE);
  assert.equal(historyArrival(CASTLE, { area: CASTLE, arrival: ID }), ID);
  assert.equal(game.worlds.load(CASTLE).area.interactions.find(item => item.destination === ID).unlocked, true);
});

test('ten permanent bays have distinct IDs, five per side, and only Rapunzel is built', t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { area, scene } = worlds.load(ID);
  assert.deepEqual(exhibits.map(entry => entry.id), [
    'rapunzel', 'snow-white', 'cinderella', 'aurora', 'ariel', 'belle', 'jasmine', 'mulan', 'tiana', 'moana',
  ]);
  assert.equal(new Set(exhibits.map(entry => entry.id)).size, 10);
  assert.deepEqual(exhibits.filter(entry => entry.status === 'complete').map(entry => entry.id), ['rapunzel']);
  assert.equal(exhibits.filter(entry => entry.status === 'coming-soon' && !entry.build).length, 9);
  assert.equal(exhibits.filter(entry => entry.position.x < 0).length, 5);
  assert.equal(exhibits.filter(entry => entry.position.x > 0).length, 5);
  assert.equal(rapunzel.position.z, Math.max(...exhibits.map(entry => entry.position.z)));
  for (const { id, position, rotation, bounds } of exhibits) {
    assert.ok(bounds.height > 17.8);
    const bay = scene.getObjectByName(id + ' exhibit');
    assert.ok(bay);
    const doorZ = position.z;
    const facadeX = position.x + Math.sin(rotation) * bounds.depth / 2;
    // The middle of every facade is open, the flanks and the next bay's shared wall are solid.
    assert.equal(walkElevation(area, { x: facadeX, z: doorZ }, facadeX, doorZ, 0, true), 0);
    assert.equal(walkElevation(area, { x: facadeX, z: doorZ + 5 }, facadeX, doorZ + 5, 0, true), null);
    assert.equal(walkElevation(area, { x: position.x, z: doorZ - 10 }, position.x, doorZ - 10, 0, true), null);
  }
  const tower = worldPoint(0, -5.15);
  const flank = worldPoint(3.06, -5.15);
  assert.equal(walkElevation(area, tower, tower.x, tower.z, 0, true), null);
  const flankHeight = area.getGroundHeight(flank.x, flank.z);
  assert.equal(walkElevation(area, flank, flank.x, flank.z, flankHeight, true), flankHeight);
});

test('the drone camera sees the gallery floor and picks surfaces below the ceiling', t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { scene, definition, viewmodel } = worlds.load(ID);
  const drone = createDroneCamera(THREE);
  drone.focus(definition, undefined, 1.7);
  let roof = 0;
  scene.traverse(object => {
    if (object.isMesh && object.layers.isEnabled(PLAYER_ONLY_LAYER)) {
      roof++;
      assert.equal(object.layers.test(drone.camera.layers), false);
    }
  });
  assert.ok(roof > 0);
  const pick = createCoordinatePicker(THREE);
  const rect = { left: 0, top: 0, width: 1020, height: 600 };
  for (const { position } of exhibits) {
    const point = new THREE.Vector3(position.x, 0, position.z + 4).project(drone.camera);
    assert.ok(Math.abs(point.x) < 1 && Math.abs(point.y) < 1);
    const selected = pick(scene, drone.camera, viewmodel, (point.x + 1) * 510, (1 - point.y) * 300, rect);
    assert.ok(selected && selected.y < 1, 'drone should select the floor inside ' + position.z);
  }
});

test('a normal jump lands on the observation platform and waving stops and repeats with real movement', t => {
  const game = fixture();
  t.after(game.worlds.unload);
  const { worlds, camera, player } = game;
  const visit = worlds.load(ID);
  const pad = observationPlatform;
  const center = worldPoint(pad.x, pad.z);
  const approach = worldPoint(pad.x, pad.z + pad.depth / 2 + 0.65);
  const shoulder = visit.scene.getObjectByName('Rapunzel waving shoulder');
  const elbow = visit.scene.getObjectByName('Rapunzel waving elbow');
  const rest = shoulder.rotation.z;
  player.reset(approach, visit.area);

  function advance(seconds, x = 0, z = 0) {
    const move = new THREE.Vector2(x, z);
    for (let frame = 0; frame < Math.round(seconds * 60); frame++) {
      player.move(1 / 60, move, visit);
      worlds.update(1 / 60, camera.position);
    }
  }

  assert.equal(floorHeight(visit.area, center.x, center.z, 1.1), pad.top);
  advance(0.7, -1);
  assert.equal(camera.position.y, EYE_HEIGHT, 'walking toward the platform does not climb it');
  assert.equal(shoulder.rotation.z, rest);
  assert.ok(player.jump());
  advance(0.46, -1);
  advance(0.43);
  assert.equal(player.grounded, true);
  assert.ok(Math.abs(camera.position.y - EYE_HEIGHT - pad.top) < 1e-6);
  assert.ok(shoulder.rotation.z > 1.7, `position ${camera.position.toArray()} arm ${shoulder.rotation.z}`);
  const first = elbow.rotation.z;
  advance(0.29);
  assert.notEqual(elbow.rotation.z, first, 'the arm continues to wave on the platform');
  advance(0.9, 0, 1);
  advance(0.9);
  assert.equal(shoulder.rotation.z, rest);
  assert.ok(player.jump());
  advance(0.86);
  assert.equal(shoulder.rotation.z, rest, 'jumping next to the platform does not wave');

  player.reset(approach, visit.area);
  assert.ok(player.jump());
  advance(0.60, -1);
  advance(0.3);
  assert.ok(shoulder.rotation.z > 1.7, 'landing on the platform again restarts the wave');
  worlds.reset();
  assert.equal(shoulder.rotation.z, rest);
  assert.equal(game.progress.has(ID), false);
});

test('reduced motion, airborne exclusion, reset and unload clean up the greeting and resources', () => {
  const { worlds, camera, player } = fixture({ reduced: true });
  const visit = worlds.load(ID);
  const shoulder = visit.scene.getObjectByName('Rapunzel waving shoulder');
  const elbow = visit.scene.getObjectByName('Rapunzel waving elbow');
  const rest = shoulder.rotation.z;
  const pad = observationPlatform;
  const center = worldPoint(pad.x, pad.z);

  camera.position.set(center.x, EYE_HEIGHT + pad.top, center.z);
  assert.ok(player.jump());
  worlds.update(0.1, camera.position);
  assert.equal(shoulder.rotation.z, rest, 'airborne feet at the platform elevation do not wave');
  player.reset(hall.spawn, visit.area);
  camera.position.set(center.x, EYE_HEIGHT + pad.top + 0.50, center.z);
  worlds.update(0.1, camera.position);
  assert.equal(shoulder.rotation.z, rest);
  camera.position.y = EYE_HEIGHT + pad.top;
  worlds.update(0.1, camera.position);
  assert.ok(shoulder.rotation.z > 2);
  const staticGreeting = elbow.rotation.z;
  worlds.update(1, camera.position);
  assert.equal(elbow.rotation.z, staticGreeting);

  let released = 0;
  const mesh = shoulder.children.find(child => child.isMesh);
  mesh.geometry.addEventListener('dispose', () => released++);
  mesh.material.addEventListener('dispose', () => released++);
  worlds.unload();
  assert.equal(worlds.active, null);
  assert.equal(visit.lifetime.signal.aborted, true);
  assert.equal(visit.scene.children.length, 0);
  assert.equal(released, 2);
  assert.equal(shoulder.rotation.z, rest);
  visit.area.update(1, camera.position);
  assert.equal(shoulder.rotation.z, rest);
});
