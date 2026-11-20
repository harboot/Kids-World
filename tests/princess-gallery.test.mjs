import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { areas } from '../game.js';
import { exhibits, exhibitOutline } from '../areas/princess-gallery/exhibits.js';
import { spaceTransform } from '../areas/princess-gallery/parts.js';
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
const rapunzel = exhibits.find(entry => entry.id === 'rapunzel');
const snowWhite = exhibits.find(entry => entry.id === 'snow-white');
const storageKey = 'kids-world-completed-levels';

function worldPoint(x, z) {
  const [worldX, worldZ] = spaceTransform(rapunzel).toWorld(x, z);
  return { x: worldX, z: worldZ };
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
    assert.match(visit.area.missionStatus.hint, /Visit Rapunzel and jump onto the observation platform/);
    assert.match(visit.area.missionStatus.hint, /Approach Snow White and the seven dwarfs/);
    assert.match(visit.area.missionStatus.hint, /Cinderella’s glass slipper on the ballroom stairs/);
    assert.equal(game.progress.has(CASTLE), false);
    assert.equal(game.progress.has(ID), false);
    assert.equal(game.progress.canSelect(ID), false);
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
  assert.equal(game.progress.canSelect(ID), false);
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
  assert.equal(game.progress.canSelect(CASTLE), true);
  assert.equal(game.progress.canSelect(ID), true);
  assert.equal(game.progress.has(ID), false);
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
  assert.equal(game.progress.canSelect(ID), true);
  assert.equal(game.progress.canSelect('secret-apartment'), false);
  assert.equal(game.progress.canSelect('arendelle-village'), false);
  assert.equal(game.progress.has(ID), false);
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

function containsPoint(polygon, [x, z]) {
  let inside = false;
  for (const [index, [ax, az]] of polygon.entries()) {
    const [bx, bz] = polygon[(index + 1) % polygon.length];
    if ((az > z) !== (bz > z) && x < ax + (bx - ax) * (z - az) / (bz - az)) inside = !inside;
  }
  return inside;
}

function edgesCross(a, b, c, d) {
  const side = ([x, z], [u, v], [s, t]) => (u - x) * (t - z) - (v - z) * (s - x);
  return side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0;
}

function assertWalkable(area, from, to, label) {
  const [ax, az] = from, [bx, bz] = to;
  const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / .18);
  let prev = { x: ax, z: az };
  let feet = area.getGroundHeight(ax, az);
  for (let i = 1; i <= steps; i++) {
    const x = ax + (bx - ax) * i / steps;
    const z = az + (bz - az) * i / steps;
    feet = walkElevation(area, prev, x, z, feet, true);
    assert.notEqual(feet, null, label + ' should be walkable at ' + [x, z].map(n => n.toFixed(2)));
    prev = { x, z };
  }
}

function walkableCells(area, start) {
  const queue = [{ x: Math.round(start.x), z: Math.round(start.z), feet: 0 }];
  const visited = new Set([queue[0].x + ':' + queue[0].z]);
  for (let i = 0; i < queue.length; i++) {
    const from = queue[i];
    for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const x = from.x + dx, z = from.z + dz, key = x + ':' + z;
      if (Math.abs(x) > hall.width / 2 || Math.abs(z) > hall.depth / 2 || visited.has(key)) continue;
      const feet = walkElevation(area, from, x, z, from.feet, true);
      if (feet === null || walkElevation(area, from, x - dx / 2, z - dz / 2, from.feet, true) === null) continue;
      visited.add(key);
      queue.push({ x, z, feet });
    }
  }
  return visited;
}

test('ten distinct and nonoverlapping footprints surround the Central Atrium', t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { scene } = worlds.load(ID);
  assert.deepEqual([hall.width, hall.depth], [140, 120]);
  assert.ok(scene.getObjectByName('Central Atrium'));
  assert.ok(scene.getObjectByName('Marble promenade, wing paths and atrium inlay'));
  assert.equal(exhibits.length, 10);
  assert.deepEqual(new Set(exhibits.map(entry => entry.id)), new Set([
    'rapunzel', 'snow-white', 'cinderella', 'aurora', 'ariel', 'belle', 'jasmine', 'mulan', 'tiana', 'moana',
  ]));
  assert.deepEqual(exhibits.filter(entry => entry.status === 'complete' && entry.build).map(entry => entry.id),
    ['rapunzel', 'snow-white', 'cinderella']);
  assert.equal(exhibits.filter(entry => entry.status === 'coming-soon' && !entry.build).length, 7);
  assert.ok(new Set(exhibits.map(entry => entry.shape)).size >= 5);
  assert.ok(new Set(exhibits.map(entry => entry.rotation)).size >= 8);
  for (const key of ['width', 'depth', 'height']) {
    assert.ok(exhibits.every(entry => Number.isFinite(entry.bounds[key]) && entry.bounds[key] >= 17));
    assert.ok(new Set(exhibits.map(entry => entry.bounds[key])).size >= 4);
  }
  for (const wing of ['Woodland Wing', 'Royal Wing', 'Adventure Wing']) {
    assert.ok(scene.getObjectByName(wing + ' entrance'));
  }
  const outlines = exhibits.map(({ id, ...entry }) => {
    assert.ok(scene.getObjectByName(id + ' exhibit'));
    const polygon = exhibitOutline(entry).map(point => spaceTransform(entry).toWorld(...point));
    assert.ok(polygon.every(([x, z]) => Math.abs(x) < hall.width / 2 && Math.abs(z) < hall.depth / 2));
    assert.equal(containsPoint(polygon, [0, 0]), false, id + ' should leave the atrium open');
    return polygon;
  });
  for (const [i, a] of outlines.entries()) {
    for (const [offset, b] of outlines.slice(i + 1).entries()) {
      const intersect = a.some((p, n) => b.some((q, m) => edgesCross(p, a[(n + 1) % a.length], q, b[(m + 1) % b.length])));
      assert.ok(!intersect && !a.some(p => containsPoint(b, p)) && !b.some(p => containsPoint(a, p)),
        exhibits[i].id + ' overlaps ' + exhibits[i + 1 + offset].id);
    }
  }
});

test('visitors can walk from the lobby through the atrium and into all ten entrances', t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { area } = worlds.load(ID);
  const cells = walkableCells(area, hall.spawn);
  assert.ok(cells.has('0:12') && cells.has('0:-12'), 'both sides of the fountain are reachable');
  for (const exhibit of exhibits) {
    const { toWorld } = spaceTransform(exhibit);
    const front = exhibit.bounds.depth / 2;
    assert.ok(cells.has(exhibit.approach.join(':')), 'lobby to ' + exhibit.id);
    assertWalkable(area, exhibit.approach, toWorld(0, front + 1.25), exhibit.id + ' branch');
    assertWalkable(area, toWorld(0, front + 1.25), toWorld(0, front - 1.75), exhibit.id + ' entrance');
    const outline = exhibitOutline(exhibit);
    for (const [index, [ax, az]] of outline.slice(1).entries()) {
      const [bx, bz] = outline[(index + 2) % outline.length];
      const [x, z] = toWorld((ax + bx) / 2, (az + bz) / 2);
      assert.equal(walkElevation(area, { x, z }, x, z, 1.34, false), null, exhibit.id + ' partition');
    }
  }
  for (const outside of ['0:-60', '0:60', '-70:0', '70:0', '-68:58', '68:-58']) {
    assert.equal(cells.has(outside), false, 'perimeter holds near ' + outside);
  }
  const tower = worldPoint(0, -5.15);
  const flank = worldPoint(3.06, -5.15);
  assert.equal(walkElevation(area, tower, tower.x, tower.z, 0, true), null);
  const flankHeight = area.getGroundHeight(flank.x, flank.z);
  assert.equal(walkElevation(area, flank, flank.x, flank.z, flankHeight, true), flankHeight);
});

test('landscape barriers close the rear gaps behind the exhibits', t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { area, scene } = worlds.load(ID);
  const cells = walkableCells(area, hall.spawn);
  for (const behind of ['-62:41', '-67:19', '-62:-46', '-43:-53', '24:-57', '55:-50', '66:-32', '66:28', '56:55', '33:54']) {
    assert.equal(cells.has(behind), false, behind + ' is behind the landscape');
  }
  const scenery = scene.getObjectByName('Enchanted landscape borders');
  const borders = scenery.children.filter(child => child.name.endsWith('scenic barrier'));
  assert.equal(borders.length, 11);
  for (const border of borders) {
    const { x, z } = border.position;
    assert.equal(walkElevation(area, { x, z }, x, z, 1.34, false), null, border.name);
    assert.ok(new THREE.Box3().setFromObject(border).max.y < 15);
  }
  assert.equal(scene.getObjectByName('Scenic horizons').children.length, 8);
  assert.ok(scene.getObjectByName('Twilight canopy').layers.isEnabled(PLAYER_ONLY_LAYER));
  assert.ok(scene.getObjectByName('Woodland stone and ivy facade'));
  assert.ok(scene.getObjectByName('Royal palace facade'));
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
  for (const exhibit of exhibits) {
    const { toWorld } = spaceTransform(exhibit);
    const [x, z] = toWorld(0, exhibit.bounds.depth / 2 - 2.25);
    const point = new THREE.Vector3(x, 0, z).project(drone.camera);
    assert.ok(Math.abs(point.x) < 1 && Math.abs(point.y) < 1);
    const selected = pick(scene, drone.camera, viewmodel, (point.x + 1) * 510, (1 - point.y) * 300, rect);
    assert.ok(selected && selected.y < 1, 'drone should select the floor inside ' + exhibit.id);
    assert.ok(Math.abs(selected.x - x) < .001 && Math.abs(selected.z - z) < .001);
  }
  assert.ok(drone.resize(.52));
  for (const exhibit of exhibits) {
    for (const vertex of exhibitOutline(exhibit)) {
      const [x, z] = spaceTransform(exhibit).toWorld(...vertex);
      const point = new THREE.Vector3(x, 0, z).project(drone.camera);
      assert.ok(Math.abs(point.x) < 1 && Math.abs(point.y) < 1, 'portrait view fits ' + exhibit.id);
    }
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

const snowCharacters = ['Snow White', 'Doc', 'Grumpy', 'Happy', 'Sleepy', 'Bashful', 'Sneezy', 'Dopey'];

function snowActors(scene) {
  return snowCharacters.map(name => {
    const actor = scene.getObjectByName(name);
    assert.ok(actor?.isGroup, name);
    const joints = [];
    actor.traverse(object => {
      if (object.isGroup && object !== actor) joints.push(object);
    });
    return {
      actor,
      center: () => actor.getWorldPosition(new THREE.Vector3()),
      pose: () => joints.flatMap(joint => [...joint.rotation.toArray().slice(0, 3), joint.position.y]),
    };
  });
}

function approachActor(entry, area, distance = 1.82) {
  const point = entry.center();
  const forward = entry.actor.getWorldDirection(new THREE.Vector3());
  point.addScaledVector(forward, distance);
  point.y = EYE_HEIGHT + area.getGroundHeight(point.x, point.z);
  return point;
}

test('Snow White has eight distinct actors visitors can walk up to, with one shared type of reaction', t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { scene, area } = worlds.load(ID);
  const actors = snowActors(scene);
  const cells = walkableCells(area, hall.spawn);
  const appearances = actors.map(({ actor }) => {
    const colors = new Set();
    actor.traverse(object => { if (object.isMesh) colors.add(object.material.color.getHex()); });
    return [...colors].sort().join(':');
  });
  assert.equal(new Set(appearances).size, 8);
  assert.equal(scene.getObjectByName('snow-white exhibit').children.filter(child => snowCharacters.includes(child.name)).length, 8);
  for (const entry of actors) {
    const point = approachActor(entry, area);
    assert.ok(cells.has(Math.round(point.x) + ':' + Math.round(point.z)), 'walk to ' + entry.actor.name);
    assert.ok(!area.obstacles.some(o => overlaps(o, point.x, point.z)), entry.actor.name + ' approach is clear');
  }
  assert.deepEqual(area.interactions.flatMap(item => item.destination ?? []), [CASTLE]);
  assert.deepEqual(area.missionStatus.missions, []);
  const [x, z] = spaceTransform(snowWhite).toWorld(-1, -7.33);
  assert.equal(walkElevation(area, { x, z }, x, z, area.getGroundHeight(x, z), true), null, 'cottage has collision');
});

test('each actor animates independently, settles to idle on departure and responds again', t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { scene, area } = worlds.load(ID);
  const actors = snowActors(scene);
  const idle = actors.map(entry => entry.pose());
  const far = { x: hall.spawn.x, y: EYE_HEIGHT, z: hall.spawn.z };
  const advance = (frames, point) => {
    for (let frame = 0; frame < frames; frame++) worlds.update(1 / 60, point);
  };

  for (const [index, entry] of actors.entries()) {
    const name = entry.actor.name;
    const near = approachActor(entry, area, .87);
    advance(1, near);
    const start = entry.pose();
    advance(24, near);
    const greeting = entry.pose();
    assert.notDeepEqual(start, idle[index], name + ' starts reacting');
    assert.notDeepEqual(greeting, start, name + ' blends in and moves');
    advance(60, near);
    assert.notDeepEqual(entry.pose(), greeting, name + ' continues while nearby');
    assert.ok(actors.every((other, i) => i === index || other.pose().every((value, j) => value === idle[i][j])),
      name + ' does not trigger the others');

    advance(1, far);
    assert.notDeepEqual(entry.pose(), idle[index], name + ' eases out');
    advance(60, far);
    assert.deepEqual(entry.pose(), idle[index], name + ' returns to rest');
    advance(25, near);
    assert.deepEqual(entry.pose(), greeting, name + ' can react again from the original pose');
    advance(61, far);
  }

  const shared = actors[1].center().lerp(actors[2].center(), .5);
  shared.y = EYE_HEIGHT + area.getGroundHeight(shared.x, shared.z);
  advance(30, shared);
  assert.notDeepEqual(actors[1].pose(), idle[1], 'Doc reacts');
  assert.notDeepEqual(actors[2].pose(), idle[2], 'Grumpy reacts at the same time');
  assert.deepEqual(actors[0].pose(), idle[0], 'Snow White stays idle');
  worlds.reset();
  assert.deepEqual(actors.map(entry => entry.pose()), idle);
});

test('Snow White supports static greetings and resets all actors on unload', () => {
  const { worlds } = fixture({ reduced: true });
  const visit = worlds.load(ID);
  const actors = snowActors(visit.scene);
  const idle = actors.map(entry => entry.pose());
  const near = approachActor(actors[0], visit.area);
  worlds.update(.1, near);
  const greeting = actors[0].pose();
  assert.notDeepEqual(greeting, idle[0]);
  for (let frame = 0; frame < 60; frame++) worlds.update(1 / 60, near);
  assert.deepEqual(actors[0].pose(), greeting);
  worlds.update(.1, { x: hall.spawn.x, y: EYE_HEIGHT, z: hall.spawn.z });
  assert.deepEqual(actors[0].pose(), idle[0]);
  worlds.update(.1, near);
  assert.deepEqual(actors[0].pose(), greeting);

  let disposed = 0;
  const costume = actors[0].actor.getObjectByName('Snow White body').children.find(object => object.isMesh);
  costume.material.addEventListener('dispose', () => disposed++);
  worlds.unload();
  assert.equal(disposed, 1);
  assert.deepEqual(actors.map(entry => entry.pose()), idle);
  visit.area.update(.1, near);
  assert.deepEqual(actors.map(entry => entry.pose()), idle);
});

test('Cinderella’s curved staircase can be walked in both directions and the slipper responds on approach', t => {
  const { worlds, player, camera } = fixture();
  t.after(worlds.unload);
  const visit = worlds.load(ID);
  const { area, scene } = visit;
  const exhibit = exhibits.find(entry => entry.id === 'cinderella');
  const { toWorld } = spaceTransform(exhibit);
  const slipper = scene.getObjectByName('Cinderella glass slipper');
  const sparkles = scene.getObjectByName('Cinderella slipper sparkles');
  const rest = slipper.position.y;
  const [x, z] = toWorld(0, 9.75);
  player.reset({ x, z }, area);

  function walkTo(localX, localZ) {
    const [x, z] = toWorld(localX, localZ);
    const direction = new THREE.Vector2();
    for (let frame = 0; frame < 220; frame++) {
      direction.set(x - camera.position.x, z - camera.position.z);
      if (direction.length() < .12) return;
      player.move(1 / 60, direction.normalize(), visit);
      worlds.update(1 / 60, camera.position);
    }
    assert.fail('could not walk to ' + localX + ', ' + localZ);
  }

  function standStill(frames) {
    player.stop();
    for (let frame = 0; frame < frames; frame++) worlds.update(1 / 60, camera.position);
  }

  walkTo(3.4, 3.15);
  assert.equal(slipper.position.y, rest);
  assert.equal(sparkles.visible, false);
  walkTo(4.44, .09);
  walkTo(6.72, -2.28);
  assert.ok(player.grounded);
  assert.ok(camera.position.y > EYE_HEIGHT + 1.8);
  standStill(45);
  assert.ok(slipper.position.y > rest + .65);
  assert.equal(sparkles.visible, true);
  const floating = slipper.position.y;
  standStill(20);
  assert.notEqual(slipper.position.y, floating);

  walkTo(9.01, -4.64);
  walkTo(10.05, -7.96);
  walkTo(0, -8.36);
  assert.ok(Math.abs(camera.position.y - EYE_HEIGHT - 4.32) < 1e-6);
  assert.ok(player.grounded);
  const [railX, railZ] = toWorld(0, -7.04);
  assert.equal(walkElevation(area, camera.position, railX, railZ, camera.position.y - EYE_HEIGHT, true), null);
  standStill(70);
  assert.equal(slipper.position.y, rest);
  assert.equal(sparkles.visible, false);

  walkTo(-10.05, -8.1);
  walkTo(-9.01, -4.64);
  walkTo(-6.72, -2.28);
  walkTo(-4.44, .09);
  walkTo(-3.4, 3.3);
  assert.ok(Math.abs(camera.position.y - EYE_HEIGHT) < 1e-6);
  walkTo(3.4, 3.15);
  walkTo(4.44, .09);
  walkTo(6.72, -2.28);
  standStill(45);
  assert.ok(slipper.position.y > rest + .65, 'returning reactivates the slipper');
  assert.equal(sparkles.visible, true);
  worlds.reset();
  assert.equal(slipper.position.y, rest);
  assert.equal(sparkles.visible, false);
});

test('Cinderella’s slipper holds a static sparkle in reduced motion and clears on unload', () => {
  const { worlds } = fixture({ reduced: true });
  const visit = worlds.load(ID);
  const slipper = visit.scene.getObjectByName('Cinderella glass slipper');
  const sparkles = visit.scene.getObjectByName('Cinderella slipper sparkles');
  const rest = slipper.position.y;
  const location = slipper.parent.getWorldPosition(new THREE.Vector3());
  const near = location.clone();
  near.y += EYE_HEIGHT;
  worlds.update(.1, { ...near, y: EYE_HEIGHT });
  assert.equal(slipper.position.y, rest, 'the stair height matters for proximity');
  worlds.update(.1, near);
  const pose = [slipper.position.y, slipper.rotation.y, sparkles.children[0].position.toArray()];
  assert.ok(pose[0] > rest);
  assert.equal(sparkles.visible, true);
  worlds.update(1, near);
  assert.deepEqual([slipper.position.y, slipper.rotation.y, sparkles.children[0].position.toArray()], pose);

  const glass = slipper.children.find(object => object.isMesh);
  let disposed = 0;
  glass.material.addEventListener('dispose', () => disposed++);
  worlds.unload();
  assert.equal(disposed, 1);
  assert.equal(slipper.position.y, rest);
  assert.equal(sparkles.visible, false);
  visit.area.update(1, near);
  assert.equal(slipper.position.y, rest);
});

test('both staircases connect the main level to the glass loop and all ten overlooks', t => {
  const { worlds, player, camera } = fixture();
  t.after(worlds.unload);
  const visit = worlds.load(ID);
  const { area, scene } = visit;
  const walkway = scene.getObjectByName('Princess Gallery Glass Walkway');
  const floor = walkway.getObjectByName('Suspended glass bridge floor');
  assert.ok(floor.material.transparent && floor.material.opacity < .5);
  assert.ok(floor.layers.isEnabled(PLAYER_ONLY_LAYER));
  const direction = new THREE.Vector2();
  const ray = new THREE.Raycaster();
  ray.layers.enable(PLAYER_ONLY_LAYER);
  scene.updateMatrixWorld(true);
  const landmarks = {
    rapunzel: [0, 7.5, -5.15],
    'snow-white': [-1, 3.35, -7.33],
    cinderella: [0, 9.54, -10.65],
  };

  function walkTo(x, z) {
    for (let frame = 0; frame < 460; frame++) {
      direction.set(x - camera.position.x, z - camera.position.z);
      if (direction.length() < .12) {
        player.stop();
        assert.ok(player.grounded);
        return;
      }
      player.move(1 / 60, direction.normalize(), visit);
    }
    assert.fail(`could not walk to ${x}, ${z} from ${camera.position.toArray()}`);
  }

  player.reset(hall.spawn, area);
  walkTo(-21.15, 38.5);
  walkTo(-21.15, 54.62);
  walkTo(-16, 54.62);
  walkTo(-16, 33);
  const height = camera.position.y - EYE_HEIGHT;
  assert.ok(height > 15);
  assert.equal(area.getGroundHeight(-16, 33, 0), 0, 'the floor below remains usable');
  assert.ok(Math.abs(area.getGroundHeight(-16, 33, height) - height) < 1e-6);

  const ring = [[-16, 33], [-27, 24], [-30, 7], [-29, -18], [-17, -27],
    [3, -29], [14.5, -30], [25, -24], [34, -11], [33, 10], [26, 25], [11, 32], [-4, 32], [-16, 33]];
  for (const approach of ring) {
    walkTo(...approach);
    const exhibit = exhibits.find(e => e.approach.every((value, axis) => value === approach[axis]));
    if (!exhibit) continue;
    const platform = walkway.getObjectByName(exhibit.id + ' overlook');
    const offset = platform.position.clone().sub(new THREE.Vector3(approach[0], height, approach[1])).normalize();
    walkTo(platform.position.x - offset.x * .65, platform.position.z - offset.z * .65);
    assert.ok(Math.abs(camera.position.y - (height + EYE_HEIGHT)) < 1e-6);
    const across = platform.position.clone().addScaledVector(offset, -.65);
    assert.equal(walkElevation(area, camera.position, across.x + offset.z * 2.06,
      across.z - offset.x * 2.06, height, true), null, exhibit.id + ' railing');
    assert.equal(walkElevation(area, camera.position, platform.position.x, platform.position.z, height + 1.31, false),
      null, exhibit.id + ' railing also holds during a jump');
    const { toLocal, toWorld } = spaceTransform(exhibit);
    const [, localZ] = toLocal(camera.position.x, camera.position.z);
    assert.ok(localZ < exhibit.bounds.depth / 2 - 2, exhibit.id + ' platform reaches inside the facade');
    const [targetX, targetY, targetZ] = landmarks[exhibit.id] ?? [0, 1.5, -exhibit.bounds.depth * .24];
    const [aimX, aimZ] = toWorld(targetX, targetZ);
    const room = scene.getObjectByName(exhibit.id + ' exhibit');
    const visible = [.6, .85, 1.25].some(distance => {
      const eye = platform.position.clone().addScaledVector(offset, -distance);
      eye.y += EYE_HEIGHT;
      ray.set(eye, new THREE.Vector3(aimX, targetY, aimZ).sub(eye).normalize());
      const sight = ray.intersectObject(scene, true).find(hit => hit.object.isMesh && !hit.object.material.transparent);
      return sight && room.getObjectById(sight.object.id);
    });
    assert.ok(visible, exhibit.id + ' has a clear view into the exhibit');
    walkTo(...approach);
  }

  for (const point of ring.slice(1, 7)) walkTo(...point);
  walkTo(14.5, -11.62);
  walkTo(19.65, -11.62);
  walkTo(19.65, -27.5);
  assert.ok(Math.abs(camera.position.y - EYE_HEIGHT) < 1e-6, 'return to the main floor');
});

test('the overhead lookout into Cinderella can still be inspected by the drone at floor level', t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { area, scene, definition, viewmodel } = worlds.load(ID);
  const [x, z] = spaceTransform(exhibits.find(entry => entry.id === 'cinderella')).toWorld(0, 9.6);
  assert.ok(area.getGroundHeight(x, z, 15.6) > 15);
  const drone = createDroneCamera(THREE);
  drone.focus(definition, undefined, 1.7);
  const pick = createCoordinatePicker(THREE);
  const point = new THREE.Vector3(x, 0, z).project(drone.camera);
  const rect = { left: 0, top: 0, width: 1020, height: 600 };
  const selected = pick(scene, drone.camera, viewmodel, (point.x + 1) * 510, (1 - point.y) * 300, rect);
  assert.ok(selected && Math.abs(selected.y) < .04);
});

test('the three wings have their own public landmarks with room to walk around them', t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { area, scene } = worlds.load(ID);
  const publicSpaces = scene.getObjectByName('Gallery public spaces');
  assert.ok(publicSpaces);
  for (const [name, count] of [
    ['Woodland flower garden 1', 1], ['Woodland flower garden 2', 1], ['Woodland bench', 3],
    ['Royal dancer statue', 1], ['Royal urn planter', 4], ['Adventure rock and palm island', 2],
  ]) {
    const landmarks = publicSpaces.children.filter(child => child.name === name);
    assert.equal(landmarks.length, count, name);
    for (const landmark of landmarks) {
      assert.ok(landmark.children.some(mesh => mesh.isMesh));
      const { x, z } = landmark.position;
      assert.equal(walkElevation(area, { x, z }, x, z, 0, true), null, name + ' footprint has collision');
    }
  }
  const compass = publicSpaces.getObjectByName('Adventure compass mosaic');
  assert.ok(compass?.children.some(child => child.geometry?.hasAttribute('color')));
  const { x, z } = compass.position;
  assertWalkable(area, [x - 1.6, z], [x + 1.6, z], 'compass mosaic');
});

test('gallery guests include guards, a child with their parents, and a parent with an occupied stroller', t => {
  const { worlds, camera } = fixture();
  t.after(worlds.unload);
  const { area, scene } = worlds.load(ID);
  const guests = scene.getObjectByName('Gallery visitors and guards');
  assert.ok(guests);
  for (const name of ['Lobby guard', 'Royal Wing guard', 'Royal Wing visitor with satchel']) {
    const figure = guests.getObjectByName(name);
    assert.ok(figure?.children.some(mesh => mesh.isMesh), name);
  }
  const child = guests.getObjectByName('Woodland family child');
  assert.ok(child.scale.y < .75);
  for (const name of ['Woodland family parent with jacket', 'Woodland family parent with dress']) {
    const parent = guests.getObjectByName(name);
    assert.ok(parent.position.distanceTo(child.position) < 3 && parent.scale.y > child.scale.y);
  }
  const strollerParent = guests.getObjectByName('Adventure Wing stroller parent');
  const stroller = strollerParent.getObjectByName('Adventure stroller');
  const baby = stroller.getObjectByName('Baby in stroller');
  assert.ok(baby.children.some(mesh => mesh.isMesh));
  const { x, z } = stroller.getWorldPosition(new THREE.Vector3());
  assert.equal(walkElevation(area, { x, z }, x, z, 0, true), null);
  assert.deepEqual(area.interactions.flatMap(item => item.destination ?? []), [CASTLE]);

  const head = child.getObjectByName('Woodland family child head');
  const rest = head.rotation.toArray();
  worlds.update(.4, camera.position);
  assert.notDeepEqual(head.rotation.toArray(), rest);
  worlds.reset();
  assert.deepEqual(head.rotation.toArray(), rest);
});

test('reduced motion keeps gallery visitors in a steady pose', t => {
  const { worlds, camera } = fixture({ reduced: true });
  t.after(worlds.unload);
  const { scene } = worlds.load(ID);
  const arm = scene.getObjectByName('Woodland family child right arm');
  const rest = arm.rotation.toArray();
  worlds.update(1, camera.position);
  assert.deepEqual(arm.rotation.toArray(), rest);
});

test('four snack carts have walkable service approaches in separate parts of the gallery', t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { area, scene } = worlds.load(ID);
  const collection = scene.getObjectByName('Princess Gallery snack carts');
  assert.deepEqual(new Set(collection.children.map(cart => cart.name)),
    new Set(['Popcorn cart', 'Cotton Candy cart', 'Hot Dogs cart', 'Cold Drinks cart']));
  for (const cart of collection.children) {
    assert.ok(cart.children.some(child => child.isInstancedMesh));
    const { x, z } = cart.position;
    const { toWorld } = spaceTransform({ position: { x, z }, rotation: cart.rotation.y });
    assert.equal(walkElevation(area, { x, z }, x, z, 0, true), null, cart.name + ' has a solid footprint');
    assertWalkable(area, toWorld(0, 2.8), toWorld(0, 1.42), cart.name);
    assert.ok(collection.children.every(other => other === cart || other.position.distanceTo(cart.position) > 15));
  }
});

test('benches, bins, lamps and balloon bouquets are reachable along the promenade', t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { area, scene } = worlds.load(ID);
  const furniture = scene.getObjectByName('Promenade furniture');
  const stations = furniture.children.filter(child => child.name.endsWith('rest stop'));
  const bouquets = furniture.children.filter(child => child.name.startsWith('Balloon bouquet'));
  assert.equal(stations.length, 6);
  assert.equal(bouquets.length, 3);
  const cells = walkableCells(area, hall.spawn);
  for (const station of stations) {
    const { x, z } = station.position;
    const { toWorld } = spaceTransform({ position: { x, z }, rotation: station.rotation.y });
    const approach = toWorld(0, 1.6);
    assert.ok(cells.has(approach.map(Math.round).join(':')), station.name);
    assertWalkable(area, approach, toWorld(0, .82), station.name);
    assert.equal(walkElevation(area, { x, z }, x, z, 0, true), null, station.name);
    assert.ok(new THREE.Box3().setFromObject(station).max.y > 3.1, station.name);
  }
  for (const bouquet of bouquets) {
    const { x, z } = bouquet.position;
    const approaches = [[x + 1.4, z], [x - 1.4, z], [x, z + 1.4], [x, z - 1.4]];
    assert.ok(approaches.some(point => cells.has(point.map(Math.round).join(':'))), bouquet.name);
    assert.equal(walkElevation(area, { x, z }, x, z, 0, true), null, bouquet.name);
    assert.ok(new THREE.Box3().setFromObject(bouquet).max.y > 3.7, bouquet.name);
  }
});

test('the hanging decorations stay above the public floor and clear Drone View', t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { scene, definition } = worlds.load(ID);
  const hanging = scene.getObjectByName('Princess Gallery hanging decorations');
  assert.deepEqual(new Set(hanging.children.map(piece => piece.name)), new Set([
    'Grand hanging crane', 'Adventure hanging bird', 'Woodland hanging cloud', 'Adventure hanging cloud',
    'Lobby hanging cloud', 'Royal crescent and star mobile', 'Woodland hanging lanterns',
    'Festival hot-air balloon',
  ]));
  const drone = createDroneCamera(THREE);
  drone.focus(definition, undefined, 1.7);
  for (const piece of hanging.children) {
    const bounds = new THREE.Box3().setFromObject(piece);
    assert.ok(bounds.min.y > 9.5 && bounds.max.y > 24.3, piece.name);
    assert.ok(piece.children.length > 0 && piece.children.every(mesh => !mesh.layers.test(drone.camera.layers)), piece.name);
  }
  const crane = hanging.getObjectByName('Grand hanging crane');
  assert.ok(new THREE.Box3().setFromObject(crane).getSize(new THREE.Vector3()).x > 9);
});

const tastings = [
  ['Popcorn', 'Eat popcorn', 'Tasting Popcorn'],
  ['Cotton Candy', 'Eat cotton candy', 'Tasting Cotton candy'],
  ['Hot Dogs', 'Eat a hot dog', 'Tasting Hot dog'],
  ['Cold Drinks', 'Sip a cold drink', 'Tasting Cold drink'],
];

function snackApproach(scene, name, depth) {
  const cart = scene.getObjectByName(name + ' cart');
  const { x, z } = cart.position;
  const { toWorld } = spaceTransform({ position: { x, z }, rotation: cart.rotation.y });
  const [px, pz] = toWorld(0, depth);
  return { x: px, y: EYE_HEIGHT, z: pz };
}

test('each cart has a vendor and a repeatable first-person tasting at its service side', t => {
  const { worlds, camera } = fixture();
  t.after(worlds.unload);
  const { scene, area, viewmodel } = worlds.load(ID);
  const models = viewmodel.getObjectByName('Gallery snack tasting').children;
  const actions = tastings.map(([, label]) => area.interactions.find(item => item.label === label));
  assert.equal(models.length, 4);
  assert.ok(models.every(model => !model.visible));

  for (const [index, [name, , modelName]] of tastings.entries()) {
    const action = actions[index];
    assert.ok(scene.getObjectByName(name + ' vendor right arm'));
    const behind = snackApproach(scene, name, -1.65);
    const front = snackApproach(scene, name, 2.36);
    camera.position.set(behind.x, behind.y, behind.z);
    assert.equal(nearestInteraction(actions, camera.position), null);
    action.act();
    assert.ok(models.every(model => !model.visible));
    camera.position.set(front.x, front.y + 2, front.z);
    assert.equal(nearestInteraction(actions, camera.position), null);
    camera.position.y = front.y;
    assert.equal(nearestInteraction(actions, camera.position, () => false), null);
    assert.equal(nearestInteraction(actions, camera.position, () => true), action);
    action.act();
    const model = viewmodel.getObjectByName(modelName);
    assert.deepEqual(models.filter(node => node.visible), [model]);
    assert.ok(actions.every(item => !item.active));
    const held = model.getObjectByName('Held food');
    worlds.update(.35, camera.position);
    const lower = held.position.clone();
    worlds.update(.50, camera.position);
    const lift = model.getObjectByName('Popcorn in hand');
    if (lift) assert.ok(lift.visible && lift.parent.position.z > -.51);
    else assert.ok(held.position.z > lower.z);
    worlds.update(2.25, camera.position);
    assert.ok(models.every(node => !node.visible));
    assert.ok(actions.every(item => item.active));
    action.act();
    assert.equal(model.visible, true, name + ' can be tasted again');
    worlds.reset();
    assert.equal(model.visible, false);
  }
  assert.deepEqual(area.missionStatus.missions, []);
});

test('reduced motion holds the drink still and travel clears the snack viewmodel', () => {
  const { worlds, camera } = fixture({ reduced: true });
  const visit = worlds.load(ID);
  const drink = visit.area.interactions.find(item => item.label === 'Sip a cold drink');
  const front = snackApproach(visit.scene, 'Cold Drinks', 2.1);
  camera.position.set(front.x, front.y, front.z);
  drink.act();
  const model = visit.viewmodel.getObjectByName('Tasting Cold drink');
  const held = model.getObjectByName('Held food');
  const originalPose = held.position.toArray();
  worlds.update(.85, camera.position);
  assert.ok(model.visible);
  assert.deepEqual(held.position.toArray(), originalPose);
  worlds.load(CASTLE);
  assert.equal(model.visible, false);
  assert.equal(visit.viewmodel.children.length, 0);
  assert.equal(drink.active, false);
  drink.act();
  assert.equal(model.visible, false);
});

test('visitors, guards and stroller stroll while vendors and exhibit actors move at their posts', t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { scene, area } = worlds.load(ID);
  const crowd = scene.getObjectByName('Gallery visitors and guards').children;
  const guests = crowd.filter(actor => !actor.name.endsWith(' vendor'));
  const start = guests.map(actor => actor.position.clone());
  const vendors = crowd.filter(actor => actor.name.endsWith(' vendor'));
  const arms = vendors.map(vendor => vendor.getObjectByName(vendor.name + ' right arm'));
  const rests = arms.map(arm => arm.rotation.toArray());
  const wheel = scene.getObjectByName('Stroller wheel');
  const baby = scene.getObjectByName('Baby in stroller');
  const rapunzelHead = scene.getObjectByName('Rapunzel head');
  const idle = { x: 0, y: EYE_HEIGHT, z: 54.3 };
  for (let i = 0; i < 90; i++) worlds.update(1 / 60, idle);
  for (const [index, actor] of guests.entries()) {
    assert.ok(actor.position.distanceTo(start[index]) > .20, actor.name + ' walks');
    const { x, z } = actor.position;
    assert.equal(walkElevation(area, { x, z }, x, z, 0, true), null, actor.name + ' collision follows its position');
  }
  assert.notEqual(wheel.rotation.x, 0);
  assert.notEqual(baby.rotation.y, 0);
  assert.notEqual(rapunzelHead.rotation.y, 0);
  for (const { actor } of snowActors(scene)) assert.notEqual(actor.rotation.z, 0, actor.name + ' has idle motion');
  assert.equal(vendors.length, 4);
  for (const [i, arm] of arms.entries()) assert.notDeepEqual(arm.rotation.toArray(), rests[i]);

  const guard = guests[0];
  const guardPosition = guard.position.clone();
  worlds.update(.08, { x: guardPosition.x, y: EYE_HEIGHT, z: guardPosition.z });
  assert.ok(guard.position.equals(guardPosition), 'guard pauses if its path would crowd the player');
  worlds.reset();
  assert.equal(wheel.rotation.x, 0);
  assert.ok(guests.every((actor, i) => actor.position.equals(start[i])));
});
