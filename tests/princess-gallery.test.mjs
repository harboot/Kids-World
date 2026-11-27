import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { areas } from '../game.js';
import { wreckDeck } from '../areas/princess-gallery/ariel-wreck.js';
import { ATRIUM_RADII } from '../areas/princess-gallery/atrium.js';
import { exhibits, exhibitOutline } from '../areas/princess-gallery/exhibits.js';
import { MOANA_DOCK, VOYAGE_DURATION } from '../areas/princess-gallery/moana.js';
import { CARPET_DOCK } from '../areas/princess-gallery/jasmine-carpet.js';
import { MULAN_DEMONSTRATION_TIME } from '../areas/princess-gallery/mulan-character.js';
import { GONG_SITE } from '../areas/princess-gallery/mulan.js';
import { spaceTransform } from '../areas/princess-gallery/parts.js';
import { observationPlatform } from '../areas/princess-gallery/rapunzel.js';
import { WALKWAY_HEIGHT } from '../areas/princess-gallery/walkway.js';
import { walkwayLiftSite } from '../areas/princess-gallery/walkway-lift.js';
import { createCoordinatePicker } from '../core/coordinate-picker.js';
import { createDroneCamera, isDroneView } from '../core/drone-view.js';
import { nearestInteraction } from '../core/interactions.js';
import { createLevelProgress } from '../core/level-progress.js';
import { floorHeight, overlaps, PLAYER_RADIUS, walkElevation } from '../core/movement.js';
import { createPlayer, EYE_HEIGHT } from '../core/player.js';
import { PLAYER_ONLY_LAYER } from '../core/render-layers.js';
import { areaURL, createWorldManager, resolveArea } from '../core/world-manager.js';

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
  const cues = [];
  const worlds = createWorldManager(THREE, {
    areas, camera, touch: true, playerRadius: PLAYER_RADIUS,
    services: {
      reducedMotion: () => reduced,
      isPlayerGrounded: () => player.grounded,
      carryPlayer: player.carryVertically,
      notify: message => notices.push(message),
      playCue: notes => cues.push(notes),
      isLevelComplete: progress.has,
      completeLevel: progress.complete,
    },
  });
  return { worlds, camera, player, progress, storage, notices, cues };
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

test('public gallery opens by normal and drone URLs with no castle progress', async t => {
  const game = fixture();
  t.after(game.worlds.unload);
  assert.equal(hall.show, true);
  assert.deepEqual(hall.heading, ['Princess', 'Gallery']);
  assert.equal(areas['secret-apartment'].show, false);
  for (const flight of [false, true]) {
    const url = new URL('https://example.test/?area=princess-gallery' + (flight ? '&view=drone' : ''));
    assert.equal(isDroneView(url), flight);
    const visit = await game.worlds.load(resolveArea(url, areas, 'garden', 'snow'));
    assert.equal(visit.id, ID);
    assertSafeSpawn(hall.spawn, visit, game);
    const { missions } = visit.area.missionStatus;
    assert.deepEqual(missions.map(mission => mission.id), exhibits.map(exhibit => exhibit.id));
    assert.ok(missions.every(mission => !mission.complete && mission.current === 0 && mission.total === 1));
    assert.equal(visit.area.missionStatus.hint, 'Visit all 10 princess exhibits.');
    assert.equal(game.progress.has(CASTLE), false);
    assert.equal(game.progress.has(ID), false);
  }
  assert.equal(resolveArea(new URL('https://example.test/?area=secret-apartment'), areas, 'garden'), 'secret-apartment');
});

test('reopening the gallery uses the lobby spawn and retains its saved completion', async t => {
  const game = fixture({ saved: [ID] });
  t.after(game.worlds.unload);
  await game.worlds.load(CASTLE);
  const target = areaURL(new URL('https://example.test/?area=frozen-castle'), ID);
  const gallery = await game.worlds.load(resolveArea(target, areas, 'garden'));
  assertSafeSpawn(hall.spawn, gallery, game);
  assert.ok(gallery.area.missionStatus.missions.every(mission => !mission.complete));
  assert.ok(game.progress.has(ID));
  assert.equal(game.progress.has(CASTLE), false);
  assert.deepEqual(JSON.parse(game.storage.getItem(storageKey)), [ID]);
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

test('ten distinct and nonoverlapping footprints surround the Central Atrium', async t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { scene } = await worlds.load(ID);
  assert.deepEqual([hall.width, hall.depth], [140, 120]);
  assert.ok(scene.getObjectByName('Central Atrium'));
  assert.ok(scene.getObjectByName('Marble promenade, wing paths and atrium inlay'));
  assert.equal(exhibits.length, 10);
  assert.deepEqual(new Set(exhibits.map(entry => entry.id)), new Set([
    'rapunzel', 'snow-white', 'cinderella', 'aurora', 'ariel', 'belle', 'jasmine', 'mulan', 'tiana', 'moana',
  ]));
  assert.deepEqual(exhibits.filter(entry => entry.status === 'complete' && entry.build).map(entry => entry.id),
    ['rapunzel', 'snow-white', 'aurora', 'belle', 'cinderella', 'jasmine', 'mulan', 'ariel', 'moana', 'tiana']);
  assert.equal(exhibits.filter(entry => entry.status === 'coming-soon' && !entry.build).length, 0);
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

test('visitors can walk from the lobby through the atrium and into all ten entrances', async t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { area } = await worlds.load(ID);
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

test('landscape barriers close the rear gaps behind the exhibits', async t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { area, scene } = await worlds.load(ID);
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

test('the atrium ice mountain covers the roof opening and tapers down over the fountain', async t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { scene } = await worlds.load(ID);
  const ice = scene.getObjectByName('Inverted ice mountain');
  assert.ok(ice.layers.isEnabled(PLAYER_ONLY_LAYER));
  const roofY = scene.getObjectByName('Twilight canopy').position.y;
  const bounds = new THREE.Box3().setFromObject(ice);
  assert.ok(bounds.max.y <= roofY && bounds.max.y > roofY - .1);
  assert.ok(bounds.min.y > 9 && bounds.min.y < 11);

  const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
  ray.layers.set(PLAYER_ONLY_LAYER);
  assert.ok(ray.intersectObject(ice)[0]?.point.y < 12);
  for (let i = 0; i < 16; i++) {
    const angle = i * Math.PI / 8;
    ray.ray.origin.set(ATRIUM_RADII[0] * Math.cos(angle) * .999, 0, ATRIUM_RADII[1] * Math.sin(angle) * .999);
    const edge = ray.intersectObject(ice)[0];
    assert.ok(edge?.point.y > roofY - .5, 'covers the rim at angle ' + angle);
  }
});

test('the drone camera sees the gallery floor and picks surfaces below the ceiling', async t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { scene, definition, viewmodel } = await worlds.load(ID);
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

test('a normal jump lands on the observation platform and waving stops and repeats with real movement', async t => {
  const game = fixture();
  t.after(game.worlds.unload);
  const { worlds, camera, player } = game;
  const visit = await worlds.load(ID);
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

test('reduced motion, airborne exclusion, reset and unload clean up the greeting and resources', async () => {
  const { worlds, camera, player } = fixture({ reduced: true });
  const visit = await worlds.load(ID);
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

test('Snow White has eight distinct actors visitors can walk up to, with one shared type of reaction', async t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { scene, area } = await worlds.load(ID);
  const actors = snowActors(scene);
  const cells = walkableCells(area, hall.spawn);
  const appearances = actors.map(({ actor }) => {
    const colors = new Set();
    actor.traverse(object => { if (object.isMesh) colors.add(object.material.color.getHex()); });
    return [...colors].sort().join(':');
  });
  assert.equal(new Set(appearances).size, 8);
  scene.updateMatrixWorld(true);
  const princess = actors[0].actor;
  const skirt = new THREE.Box3().setFromObject(princess.getObjectByName('Snow White fitted skirt'), true);
  const bodice = new THREE.Box3().setFromObject(princess.getObjectByName('Snow White fitted bodice'), true);
  assert.ok(skirt.max.y - bodice.min.y > .035, 'the fitted bodice and skirt meet under the waist trim');
  assert.equal(scene.getObjectByName('snow-white exhibit').children.filter(child => snowCharacters.includes(child.name)).length, 8);
  for (const entry of actors) {
    const point = approachActor(entry, area);
    assert.ok(cells.has(Math.round(point.x) + ':' + Math.round(point.z)), 'walk to ' + entry.actor.name);
    assert.ok(!area.obstacles.some(o => overlaps(o, point.x, point.z)), entry.actor.name + ' approach is clear');
    const insideBubble = approachActor(entry, area, .96);
    const ground = area.getGroundHeight(insideBubble.x, insideBubble.z);
    for (const feet of [ground, ground + 1.18]) {
      assert.equal(walkElevation(area, point, insideBubble.x, insideBubble.z, feet, feet === ground), null,
        entry.actor.name + ' keeps the player clear while walking or jumping');
    }
  }
  assert.deepEqual(area.interactions.flatMap(item => item.destination ?? []), []);
  assert.ok(area.missionStatus.missions.every(mission => !mission.complete));
  const [x, z] = spaceTransform(snowWhite).toWorld(-1, -7.33);
  assert.equal(walkElevation(area, { x, z }, x, z, area.getGroundHeight(x, z), true), null, 'cottage has collision');
});

test('each actor animates independently, settles to idle on departure and responds again', async t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { scene, area } = await worlds.load(ID);
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

test('Snow White supports static greetings and resets all actors on unload', async () => {
  const { worlds } = fixture({ reduced: true });
  const visit = await worlds.load(ID);
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

test('Aurora’s bed and rose are solid with a clear approach from the gallery entrance', async t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { area, scene } = await worlds.load(ID);
  const exhibit = exhibits.find(entry => entry.id === 'aurora');
  const { toWorld } = spaceTransform(exhibit);
  const room = scene.getObjectByName('Aurora royal sleeping chamber');
  const bed = room.getObjectByName('Aurora royal bed');
  const character = bed.getObjectByName('Aurora character');
  const rose = room.getObjectByName('Enchanted rose');
  assert.ok(scene.getObjectByName('Aurora chamber ceiling').layers.isEnabled(PLAYER_ONLY_LAYER));
  assert.ok(new THREE.Box3().setFromObject(bed).getSize(new THREE.Vector3()).y > 4.8);
  const { x: rx, z: rz } = rose.position;
  const approach = toWorld(rx, rz + 1.8);
  assertWalkable(area, toWorld(0, 14), toWorld(0, 4.25), 'Aurora entrance');
  assertWalkable(area, toWorld(0, 4.25), approach, 'enchanted rose');
  const besideRose = toWorld(rx + 1.4, rz + 1.8);
  const besideBed = toWorld(rx + 1.4, bed.position.z);
  assertWalkable(area, approach, besideRose, 'front of the rose');
  assertWalkable(area, besideRose, besideBed, 'around the rose pedestal');
  assertWalkable(area, besideBed, toWorld(rx, bed.position.z), 'bedside aisle');
  for (const [x, z] of [
    [rx, rz], [0, bed.position.z], [2.39, bed.position.z + 2.73], [0, bed.position.z - 2.73],
  ].map(point => toWorld(...point))) {
    assert.equal(walkElevation(area, { x, z }, x, z, 0, true), null);
  }
  assert.equal(nearestInteraction(area.interactions, { x: approach[0], y: EYE_HEIGHT, z: approach[1] }), null);

  const head = character.getObjectByName('Aurora head');
  const sleepingHead = bed.worldToLocal(head.getWorldPosition(new THREE.Vector3()));
  assert.ok(sleepingHead.z < character.position.z - .95, 'the head rests toward the headboard');
  assert.ok(Math.abs(sleepingHead.y - character.position.y) < .12, 'the body rests level with the mattress');
  assert.ok(head.getObjectByName('Closed eyelids').visible);
  assert.equal(head.getObjectByName('Open eyes').visible, false);
  const mattress = new THREE.Box3().setFromObject(bed.getObjectByName('Aurora mattress'), true);
  assert.ok(mattress.max.y > 1.05 && mattress.max.y < 1.20);
  const leftFoot = character.getObjectByName('Aurora left leg');
  const rightFoot = character.getObjectByName('Aurora right leg');
  assert.ok(leftFoot.position.x < 0 && rightFoot.position.x > 0);
  assert.notEqual(leftFoot.position.z, rightFoot.position.z);
  for (const foot of [leftFoot, rightFoot]) {
    const bounds = new THREE.Box3().setFromObject(foot, true);
    assert.ok(bounds.min.y >= mattress.max.y && bounds.min.y <= mattress.max.y + .03,
      foot.name + ' rests on the lowered bed');
    const slipper = foot.children.find(object => object.isGroup);
    assert.ok(slipper.rotation.x < -.45 && slipper.rotation.x > -.75, 'the toes lift naturally from the bed');
  }
  for (const name of ['Aurora dressing table and mirror', 'Aurora velvet bench', 'Aurora bedside bouquet']) {
    const furniture = room.getObjectByName(name);
    assert.ok(furniture.children.some(mesh => mesh.isInstancedMesh), name);
    const { x, z } = furniture.getWorldPosition(new THREE.Vector3());
    assert.equal(walkElevation(area, { x, z }, x, z, 0, true), null, name + ' is solid');
  }
  const tooClose = toWorld(rx, rz + 1.18);
  assert.equal(walkElevation(area, { x: approach[0], z: approach[1] }, ...tooClose, 1.19, false), null);

});

test('approaching the rose wakes Aurora smoothly and repeatedly with a stable boundary', async t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { scene } = await worlds.load(ID);
  const { toWorld } = spaceTransform(exhibits.find(entry => entry.id === 'aurora'));
  const { x: rx, z: rz } = scene.getObjectByName('Enchanted rose').position;
  const body = scene.getObjectByName('Aurora upper body');
  const eyes = body.getObjectByName('Open eyes');
  const leftElbow = body.getObjectByName('Aurora left elbow');
  const dust = scene.getObjectByName('Aurora magical particles');
  const light = scene.getObjectByName('Aurora bedlight');
  const rest = body.rotation.x;
  const elbowAtRest = leftElbow.rotation.x;
  const idleMotes = dust.geometry.drawRange.count;
  const idleLight = light.intensity;
  const [bx, bz] = toWorld(rx, rz + 2.74);
  const boundary = { x: bx, y: EYE_HEIGHT, z: bz };
  const [nx, nz] = toWorld(rx, rz + 2.3);
  const near = { x: nx, y: EYE_HEIGHT, z: nz };

  function tick(player, seconds) {
    for (let i = 0; i < seconds * 60; i++) worlds.update(1 / 60, player);
  }

  tick({ ...near, y: EYE_HEIGHT + scene.getObjectByName('aurora overlook').position.y }, 2.4);
  assert.equal(eyes.visible, false, 'the Glass Walkway stays above the activation zone');
  assert.equal(light.intensity, idleLight);
  tick(boundary, 2.4);
  assert.equal(eyes.visible, false, 'the exit threshold cannot wake a sleeping Aurora');
  assert.notEqual(body.rotation.x, rest, 'she breathes when asleep');

  tick(near, .4);
  const partlyRaised = body.rotation.x;
  assert.ok(partlyRaised > rest + .02 && partlyRaised < rest + .6);
  tick(near, .6);
  assert.ok(body.rotation.x > partlyRaised + .3 && body.rotation.x < -.4);
  assert.ok(eyes.visible);
  tick(near, 1.2);
  assert.ok(body.rotation.x > -.35);
  assert.ok(leftElbow.rotation.x < elbowAtRest - .25);
  assert.equal(eyes.scale.y, 1);
  assert.ok(dust.geometry.drawRange.count > idleMotes);
  assert.ok(light.intensity > idleLight);
  const awakeLight = light.intensity;

  tick(near, 3);
  tick(boundary, 4);
  assert.ok(body.rotation.x > -.35, 'remaining nearby holds the awake pose past the entry threshold');
  assert.equal(light.intensity, awakeLight);
  const [ax, az] = toWorld(rx, rz + 3.3);
  const away = { x: ax, y: EYE_HEIGHT, z: az };
  tick(away, .75);
  assert.ok(body.rotation.x < -.42 && body.rotation.x > rest + .12, 'returning to the pillow takes time');
  tick(away, 1.35);
  assert.ok(Math.abs(body.rotation.x - rest) < .02);
  assert.equal(eyes.visible, false);
  assert.equal(light.intensity, idleLight);
  assert.equal(dust.geometry.drawRange.count, idleMotes);

  tick(near, 2.2);
  assert.ok(body.rotation.x > -.35, 'another approach wakes her again');
  assert.ok(eyes.visible);
  assert.equal(light.intensity, awakeLight);
});

test('Aurora resets her pose and effects and releases scene resources on travel', async t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const visit = await worlds.load(ID);
  const { scene } = visit;
  const body = scene.getObjectByName('Aurora upper body');
  const head = scene.getObjectByName('Aurora head');
  const rose = scene.getObjectByName('Enchanted rose');
  const dust = scene.getObjectByName('Aurora magical particles');
  const bloom = rose.children.filter(child => child.material?.emissive?.getHex());
  assert.ok(bloom.length >= 3, 'the petals use several glow levels');
  const near = rose.getWorldPosition(new THREE.Vector3());
  near.y = EYE_HEIGHT;
  const state = () => [body.rotation.x, body.scale.z, head.rotation.toArray(), head.getObjectByName('Open eyes').visible,
    bloom.map(petal => petal.material.emissiveIntensity), dust.geometry.drawRange.count,
    Array.from(dust.geometry.attributes.position.array.slice(0, dust.geometry.drawRange.count * 3))];
  const rest = state();
  worlds.update(2.2, near);
  assert.notDeepEqual(state(), rest);
  assert.ok(bloom.every((petal, i) => petal.material.emissiveIntensity > rest[4][i]));
  worlds.reset();
  assert.deepEqual(state(), rest);

  const resources = [dust.geometry, head.children.find(child => child.isMesh).material];
  const disposed = new Set();
  for (const resource of resources) resource.addEventListener('dispose', () => disposed.add(resource));
  worlds.update(2.2, near);
  await worlds.load(CASTLE);
  assert.deepEqual(disposed, new Set(resources));
  assert.equal(scene.children.length, 0);
  assert.deepEqual(state(), rest);
  visit.area.update(3, near);
  assert.deepEqual(state(), rest);
  const fresh = (await worlds.load(ID)).scene.getObjectByName('Aurora upper body');
  assert.equal(fresh.rotation.x, rest[0]);
  assert.equal(fresh.getObjectByName('Open eyes').visible, false);
});

test('reduced motion keeps Aurora still and wakes or settles her immediately', async t => {
  const { worlds } = fixture({ reduced: true });
  t.after(worlds.unload);
  const { scene } = await worlds.load(ID);
  const body = scene.getObjectByName('Aurora upper body');
  const head = scene.getObjectByName('Aurora head');
  const eyes = head.getObjectByName('Open eyes');
  const dust = scene.getObjectByName('Aurora magical particles');
  const rose = scene.getObjectByName('Enchanted rose');
  const near = rose.getWorldPosition(new THREE.Vector3());
  near.y = EYE_HEIGHT;
  const rest = body.rotation.x;
  assert.equal(dust.visible, false);
  worlds.update(1 / 60, near);
  assert.ok(body.rotation.x > -.35 && eyes.visible);
  assert.equal(dust.visible, false);
  const awake = [body.rotation.x, head.rotation.toArray()];
  worlds.update(1.3, near);
  assert.deepEqual([body.rotation.x, head.rotation.toArray()], awake);
  worlds.update(1 / 60, { ...near, y: EYE_HEIGHT + 15.6 });
  assert.equal(body.rotation.x, rest);
  assert.equal(eyes.visible, false);
  worlds.update(1 / 60, near);
  worlds.reset();
  assert.equal(body.rotation.x, rest);
  assert.equal(dust.visible, false);
});

test('Cinderella stands in view from the entrance and leaves both stair approaches clear', async t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { area, scene } = await worlds.load(ID);
  const ballroom = scene.getObjectByName('Cinderella palace ballroom');
  const character = ballroom.getObjectByName('Cinderella character');
  const head = character.getObjectByName('Cinderella head');
  assert.ok(head.getObjectByName('Open eyes').visible);
  const bounds = new THREE.Box3().setFromObject(character);
  const feet = character.getWorldPosition(new THREE.Vector3());
  assert.ok(Math.abs(bounds.min.y - feet.y) < 1e-5);
  assert.equal(floorHeight(area, feet.x, feet.z, feet.y), feet.y);
  assert.ok(bounds.max.y - feet.y > 2.5);

  const exhibit = exhibits.find(entry => entry.id === 'cinderella');
  const { toWorld } = spaceTransform(exhibit);
  assertWalkable(area, toWorld(0, 9.75), toWorld(0, -4), 'center ballroom aisle');
  assertWalkable(area, toWorld(0, 7), toWorld(-3.4, 3.3), 'left staircase approach');
  assertWalkable(area, toWorld(0, 7), toWorld(3.4, 3.15), 'right staircase approach');
  const [ex, ez] = toWorld(0, 9.75);
  const eye = new THREE.Vector3(ex, EYE_HEIGHT, ez);
  const aim = new THREE.Vector3(feet.x, feet.y + 1.25, feet.z);
  scene.updateMatrixWorld(true);
  const sight = new THREE.Raycaster(eye, aim.sub(eye).normalize()).intersectObject(scene, true)
    .find(hit => hit.object.isMesh && !hit.object.material.transparent);
  assert.ok(character.getObjectById(sight?.object.id), 'the figure is visible from the entrance');

  const [x, z] = toWorld(character.position.x, character.position.z + 1.3);
  const nearby = { x, y: EYE_HEIGHT, z };
  assert.equal(walkElevation(area, nearby, feet.x, feet.z, 0, true), null, 'the gown has a solid footprint');
  const pose = head.rotation.toArray();
  const restYaw = character.rotation.y;
  const slipper = ballroom.getObjectByName('Cinderella glass slipper');
  const slipperRest = slipper.position.y;
  assert.equal(nearestInteraction(area.interactions, nearby), null);
  function follow(dx, dz, elevation = 0) {
    const [x, z] = toWorld(character.position.x + dx, character.position.z + dz);
    for (let i = 0; i < 60; i++) worlds.update(1 / 60, { x, y: EYE_HEIGHT + elevation, z });
  }
  follow(6.7, 0);
  assert.ok(Math.abs(character.rotation.y - Math.PI / 2) < .03, 'her whole body turns at a generous distance');
  follow(-3.1, -3.1);
  assert.ok(Math.cos(character.rotation.y + Math.PI * .75) > .998, 'her body keeps facing the moving player');
  follow(11.89, -6.31, 4.32);
  assert.ok(Math.cos(character.rotation.y - Math.atan2(11.89, -6.31)) > .998, 'she tracks the far staircase landing');
  assert.ok(head.rotation.x < -.24, 'her head tilts up to meet the player’s eyes on the stairs');
  follow(0, 6.9, 15.6);
  assert.ok(Math.cos(character.rotation.y - restYaw) > .998, 'she settles when the player is above the ballroom');
  assert.equal(slipper.position.y, slipperRest);
  assert.equal(area.missionStatus.missions.find(mission => mission.id === 'cinderella').complete, false);
  follow(6.7, 0);
  worlds.reset();
  assert.equal(character.rotation.y, restYaw);
  assert.deepEqual(head.rotation.toArray(), pose);

  const gown = character.children.find(child => child.isMesh);
  let disposed = false;
  gown.material.addEventListener('dispose', () => { disposed = true; });
  worlds.unload();
  assert.ok(disposed);
  assert.deepEqual(head.rotation.toArray(), pose);
});

test('Cinderella’s curved staircase can be walked in both directions and the slipper responds on approach', async t => {
  const { worlds, player, camera } = fixture();
  t.after(worlds.unload);
  const visit = await worlds.load(ID);
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
  const display = slipper.parent.getWorldPosition(new THREE.Vector3());
  assert.equal(walkElevation(area, camera.position, display.x, display.z, camera.position.y - EYE_HEIGHT, true), null,
    'the glass slipper is buffered with room to pass on the stair');
  standStill(45);
  assert.ok(slipper.position.y > rest + .65);
  assert.equal(sparkles.visible, true);
  const floating = slipper.position.y;
  standStill(20);
  assert.notEqual(slipper.position.y, floating);

  walkTo(9.01, -4.64);
  walkTo(10.05, -7.96);
  standStill(30);
  const head = scene.getObjectByName('Cinderella head');
  assert.ok(head.getWorldDirection(new THREE.Vector3()).y > .24, 'she looks up as the player climbs the stairs');
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

test('Cinderella’s slipper holds a static sparkle in reduced motion and clears on unload', async () => {
  const { worlds } = fixture({ reduced: true });
  const visit = await worlds.load(ID);
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

test('the shipwreck’s deck and gangplank have one visible surface at the walking height', async t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { area, scene } = await worlds.load(ID);
  scene.updateMatrixWorld(true);
  const ship = scene.getObjectByName('Ariel shipwreck');
  const deck = ship.getObjectByName('Shipwreck deck boards');
  const ramp = ship.getObjectByName('Shipwreck gangplank boards');
  const hull = ship.getObjectByName('Shipwreck hull planking');
  for (const mesh of [deck, ramp, hull]) assert.ok(mesh.geometry.hasAttribute('color'));
  const down = new THREE.Vector3(0, -1, 0);
  for (const z of [wreckDeck.rear + .12, -.48, wreckDeck.front - .085, wreckDeck.front + .085,
    3.14, wreckDeck.rampEnd - .094]) {
    const eye = ship.localToWorld(new THREE.Vector3(.173, 5, z));
    const hits = new THREE.Raycaster(eye, down).intersectObjects([deck, ramp], false);
    assert.equal(hits.length, 1, 'one timber surface at ship depth ' + z);
    assert.ok(Math.abs(hits[0].point.y - area.getGroundHeight(eye.x, eye.z, hits[0].point.y)) < 1e-6);
  }
  // The beam looks through both sides once; the seams belong to those same faces.
  const eye = ship.localToWorld(new THREE.Vector3(4.3, 1.15, .82));
  const inside = ship.localToWorld(new THREE.Vector3(0, 1.15, .82)).sub(eye).normalize();
  assert.equal(new THREE.Raycaster(eye, inside).intersectObject(hull, false).length, 2);
});

test('Ariel slowly circles the shipwreck only while the deck is occupied', async t => {
  const { worlds, player, camera } = fixture();
  t.after(worlds.unload);
  const visit = await worlds.load(ID);
  const { area, scene } = visit;
  const exhibit = exhibits.find(entry => entry.id === 'ariel');
  const toHullWorld = (x, z) => spaceTransform(exhibit).toWorld(...spaceTransform(wreckDeck).toWorld(x, z));
  const room = scene.getObjectByName('Ariel undersea kingdom');
  const character = room.getObjectByName('Ariel character');
  const tail = character.getObjectByName('Ariel articulated tail tip');
  const deck = room.getObjectByName('Shipwreck deck');
  const fish = room.getObjectByName('Ariel schools of fish');
  const chest = room.getObjectByName('Ariel treasure chest');
  const ceiling = room.getObjectByName('Ariel overhead water canopy');
  assert.ok(ceiling.layers.isEnabled(PLAYER_ONLY_LAYER));
  for (const name of ['Ariel underwater palace', 'Ariel coral reef', 'Ariel treasure chest']) {
    assert.ok(room.getObjectByName(name).children.some(mesh => mesh.isInstancedMesh), name);
  }
  assert.ok(fish.children.reduce((sum, batch) => sum + batch.count, 0) >= 27);
  const chestPoint = chest.getWorldPosition(new THREE.Vector3());
  assert.equal(walkElevation(area, chestPoint, chestPoint.x, chestPoint.z, 0, true), null);
  assert.equal(character.visible, false);

  function walkTo(localX, localZ) {
    const destination = toHullWorld(localX, localZ);
    const direction = new THREE.Vector2();
    for (let i = 0; i < 320; i++) {
      direction.set(destination[0] - camera.position.x, destination[1] - camera.position.z);
      if (direction.length() < .12) {
        player.stop();
        return;
      }
      player.move(1 / 60, direction.normalize(), visit);
      worlds.update(1 / 60, camera.position);
    }
    assert.fail('could not walk to the ship coordinates ' + [localX, localZ]);
  }
  function wait(frames) {
    for (let i = 0; i < frames; i++) worlds.update(1 / 60, camera.position);
  }
  function shipPhase() {
    const { x, z } = character.position;
    const phase = Math.atan2((z + .70) / 5.33, x / 4.55);
    assert.ok(Math.abs((x / 4.55) ** 2 + ((z + .70) / 5.33) ** 2 - 1) < 1e-7);
    return phase;
  }

  const middle = deck.getWorldPosition(new THREE.Vector3());
  for (const level of [0, 15.6]) {
    worlds.update(1, { x: middle.x, y: level + EYE_HEIGHT, z: middle.z });
    assert.equal(character.visible, false);
  }
  const [x, z] = toHullWorld(0, wreckDeck.rampEnd + .7);
  player.reset({ x, z }, area);
  walkTo(0, 4.0);
  assert.ok(camera.position.y > EYE_HEIGHT + .9);
  assert.equal(character.visible, false, 'the gangplank does not trigger Ariel');
  walkTo(0, .57);
  wait(50);
  assert.ok(player.grounded);
  assert.ok(Math.abs(camera.position.y - EYE_HEIGHT - wreckDeck.height) < 1e-6);
  assert.ok(character.visible);
  const start = shipPhase();
  const before = character.position.clone();
  const [otherX, otherZ] = toHullWorld(-.66, -.51);
  player.reset({ x: otherX, z: otherZ }, area);
  worlds.update(0, camera.position);
  assert.ok(character.position.equals(before), 'the route is anchored to the ship as the player changes position');
  const initialBend = tail.rotation.x;
  wait(120);
  const arc = shipPhase() - start;
  assert.ok(arc > .65 && arc < .85, 'Ariel makes one lap in about 17 seconds');
  assert.notEqual(tail.rotation.x, initialBend);
  assert.equal(area.missionStatus.missions.find(mission => mission.id === 'ariel').complete, true);
  assert.equal(nearestInteraction(area.interactions, camera.position), null);
  walkTo(0, .57);
  walkTo(0, wreckDeck.rampEnd + .60);
  wait(60);
  assert.equal(character.visible, false);
  walkTo(0, .57);
  wait(50);
  assert.ok(character.visible, 'reboarding brings Ariel back');
  worlds.reset();
  assert.equal(character.visible, false);
  assert.equal(area.missionStatus.missions.find(mission => mission.id === 'ariel').complete, false);
});

test('Ariel holds a steady greeting in reduced motion and unload releases the exhibit', async t => {
  const { worlds, player, camera } = fixture({ reduced: true });
  t.after(worlds.unload);
  const visit = await worlds.load(ID);
  const deck = visit.scene.getObjectByName('Shipwreck deck').getWorldPosition(new THREE.Vector3());
  const ariel = visit.scene.getObjectByName('Ariel character');
  const tail = ariel.getObjectByName('Ariel articulated tail tip');
  const school = visit.scene.getObjectByName('Ariel schools of fish').children[0];
  const fishMatrix = school.instanceMatrix.array.slice();
  player.reset({ x: deck.x, z: deck.z }, visit.area);
  assert.ok(player.jump());
  worlds.update(.1, camera.position);
  assert.equal(ariel.visible, false, 'valid deck coordinates require a grounded player');
  player.reset({ x: deck.x, z: deck.z }, visit.area);
  worlds.update(1 / 60, camera.position);
  assert.ok(ariel.visible);
  const state = [ariel.position.toArray(), tail.rotation.toArray()];
  worlds.update(3, camera.position);
  assert.deepEqual([ariel.position.toArray(), tail.rotation.toArray()], state);
  assert.deepEqual(school.instanceMatrix.array, fishMatrix);
  let disposed = 0;
  school.geometry.addEventListener('dispose', () => disposed++);
  await worlds.load(CASTLE);
  assert.equal(disposed, 1);
  assert.equal(ariel.visible, false);
  visit.area.update(.2, camera.position);
  assert.equal(ariel.visible, false);
});

test('Ariel’s treasure chest opens and closes with a repeatable interaction and no extra mission', async t => {
  const { worlds, camera } = fixture();
  t.after(worlds.unload);
  const { scene, area } = await worlds.load(ID);
  const chest = scene.getObjectByName('Ariel treasure chest');
  const lid = chest.getObjectByName('Ariel treasure chest lid');
  const treasure = chest.getObjectByName('Ariel chest treasure');
  const action = area.interactions.find(item => item.label === 'Open treasure chest');
  function stand(z, y = EYE_HEIGHT) {
    camera.position.copy(chest.localToWorld(new THREE.Vector3(0, y, z)));
  }

  assert.equal(treasure.visible, false);
  assert.equal(Math.abs(lid.rotation.x), 0);
  stand(-1.9);
  assert.equal(nearestInteraction(area.interactions, camera.position), null);
  action.act();
  assert.equal(action.label, 'Open treasure chest');
  stand(1.9, EYE_HEIGHT + WALKWAY_HEIGHT);
  assert.equal(nearestInteraction(area.interactions, camera.position), null);
  stand(1.9);
  assert.equal(nearestInteraction(area.interactions, camera.position, () => false), null);
  assert.equal(nearestInteraction(area.interactions, camera.position, () => true), action);
  action.act();
  assert.equal(action.label, 'Close treasure chest');
  worlds.update(.13, camera.position);
  assert.ok(lid.rotation.x < 0 && lid.rotation.x > -1.2);
  worlds.update(.5, camera.position);
  assert.ok(lid.rotation.x < -1.2 && treasure.visible);
  action.act();
  worlds.update(.6, camera.position);
  assert.equal(Math.abs(lid.rotation.x), 0);
  assert.equal(treasure.visible, false);
  assert.equal(action.label, 'Open treasure chest');
  assert.ok(area.missionStatus.missions.every(mission => !mission.complete));

  action.act();
  worlds.update(.6, camera.position);
  worlds.reset();
  assert.equal(treasure.visible, false);
  worlds.unload();
  action.act();
  assert.equal(action.active, false);
  assert.equal(Math.abs(lid.rotation.x), 0);
});

test('Belle’s library has a walkable staircase, solid furniture, and both characters', async t => {
  const { worlds, player, camera } = fixture();
  t.after(worlds.unload);
  const visit = await worlds.load(ID);
  const { area, scene } = visit;
  const exhibit = exhibits.find(entry => entry.id === 'belle');
  const { toWorld } = spaceTransform(exhibit);
  const room = scene.getObjectByName('Belle castle library');
  const table = room.getObjectByName('Belle enchanted tea table');
  assert.ok(room.getObjectByName('Belle library ceiling').layers.isEnabled(PLAYER_ONLY_LAYER));
  assert.ok(room.getObjectByName('Belle library staircase').children.some(child => child.isInstancedMesh));
  assert.ok(room.getObjectByName('Belle library bookcases').children.some(child => child.count > 10));
  for (const name of ['Belle reading', 'The Beast in the library', 'Belle enchanted tea table']) {
    const model = room.getObjectByName(name);
    const center = model.getWorldPosition(new THREE.Vector3());
    assert.equal(walkElevation(area, center, center.x, center.z, 0, true), null, name + ' is solid');
  }
  assert.ok(new THREE.Box3().setFromObject(room.getObjectByName('Beast horned head')).max.y > 3.2);
  const approach = toWorld(table.position.x, table.position.z + 2.18);
  assertWalkable(area, toWorld(0, 10.4), approach, 'Belle entrance and tea table');

  function walkTo(lx, lz) {
    const [x, z] = toWorld(lx, lz);
    const direction = new THREE.Vector2();
    for (let i = 0; i < 340; i++) {
      direction.set(x - camera.position.x, z - camera.position.z);
      if (direction.length() < .12) {
        player.stop();
        return;
      }
      player.move(1 / 60, direction.normalize(), visit);
      worlds.update(1 / 60, camera.position);
    }
    assert.fail('could not reach the library coordinates ' + [lx, lz] + ' from ' + camera.position.toArray());
  }
  const [x, z] = toWorld(6.16, 4.0);
  player.reset({ x, z }, area);
  walkTo(6.16, -6.38);
  assert.ok(player.grounded && Math.abs(camera.position.y - EYE_HEIGHT - 3.42) < 1e-6);
  walkTo(0, -6.38);
  assert.ok(Math.abs(camera.position.y - EYE_HEIGHT - 3.42) < 1e-6);
  walkTo(6.16, -6.38);
  walkTo(6.16, 4.0);
  assert.ok(player.grounded && Math.abs(camera.position.y - EYE_HEIGHT) < 1e-6);
});

test('Belle’s teapot and cups dance on approach, settle on departure, and reset on unload', async t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const visit = await worlds.load(ID);
  const { area, scene } = visit;
  const table = scene.getObjectByName('Belle enchanted tea table');
  const pot = table.getObjectByName('Belle dancing teapot');
  const cups = table.children.filter(child => child.name.startsWith('Belle dancing cup'));
  const candles = table.getObjectByName('Belle magic candles');
  assert.equal(cups.length, 3);
  assert.ok(candles.children.some(mesh => mesh.material?.emissiveIntensity > .5));
  const shapes = [pot, ...cups];
  const pose = () => shapes.map(piece => [piece.position.toArray(), piece.rotation.toArray()]);
  const rest = pose();
  const at = (z, height = EYE_HEIGHT) => table.localToWorld(new THREE.Vector3(0, height, z));
  const near = at(2.62);
  const away = at(5.0);
  const mission = area.missionStatus.missions.find(entry => entry.id === 'belle');
  worlds.update(1, at(2.62, EYE_HEIGHT + WALKWAY_HEIGHT));
  assert.deepEqual(pose(), rest);
  assert.equal(mission.complete, false);
  assert.equal(nearestInteraction(area.interactions, near), null);

  worlds.update(.14, near);
  const started = pose();
  assert.notDeepEqual(started, rest);
  assert.equal(mission.complete, false);
  worlds.update(.30, near);
  assert.ok(shapes.every((piece, i) => piece.position.y > rest[i][0][1]));
  assert.notDeepEqual(pose(), started);
  assert.equal(mission.complete, true);
  worlds.update(.8, at(4.14));
  assert.notDeepEqual(pose(), rest, 'the outer edge has a stable exit threshold');
  worlds.update(.8, away);
  assert.deepEqual(pose(), rest);
  worlds.update(.8, near);
  assert.notDeepEqual(pose(), rest);
  worlds.unload();
  assert.deepEqual(pose(), rest);
  visit.area.update(.8, near);
  assert.deepEqual(pose(), rest);
});

test('Belle’s table presents a steady greeting in reduced motion', async t => {
  const { worlds } = fixture({ reduced: true });
  t.after(worlds.unload);
  const { area, scene } = await worlds.load(ID);
  const table = scene.getObjectByName('Belle enchanted tea table');
  const pot = table.getObjectByName('Belle dancing teapot');
  const near = table.localToWorld(new THREE.Vector3(0, EYE_HEIGHT, 2.0));
  const rest = pot.position.y;
  worlds.update(1 / 60, near);
  assert.ok(pot.position.y > rest);
  const pose = [pot.position.toArray(), pot.rotation.toArray()];
  worlds.update(.8, near);
  assert.deepEqual([pot.position.toArray(), pot.rotation.toArray()], pose);
  assert.equal(area.missionStatus.missions.find(entry => entry.id === 'belle').complete, true);
  worlds.reset();
  assert.equal(pot.position.y, rest);
});

test('the ten gallery missions record one interaction per exhibit and replay after reset', async t => {
  const game = fixture({ reduced: true });
  const { worlds, progress, notices } = game;
  t.after(worlds.unload);
  const { scene, area } = await worlds.load(ID);
  const { missions } = area.missionStatus;
  const point = (exhibit, x, z, feet = 0) => {
    const [wx, wz] = spaceTransform(exhibit).toWorld(x, z);
    return { x: wx, y: EYE_HEIGHT + feet, z: wz };
  };
  const completed = () => missions.filter(mission => mission.complete).map(mission => mission.id);
  const step = (position) => worlds.update(.2, position);
  const expected = [];
  const galleryNotice = 'Princess Gallery complete! You explored all ten exhibits.';
  for (const exhibit of exhibits) {
    let position;
    if (exhibit.display) {
      const display = scene.getObjectByName(exhibit.id + ' exhibit').getObjectByName('Story display');
      const prop = display.getObjectByName(exhibit.display);
      const glow = display.getObjectByName('Story display glow');
      const initialGlow = glow.material.emissiveIntensity;
      const z = display.position.z;
      const { x, z: worldZ } = point(exhibit, 0, z);
      assert.equal(walkElevation(area, { x, z: worldZ }, x, worldZ, 0, true), null, exhibit.id + ' display is solid');
      const approach = point(exhibit, 0, z + 2.75);
      const door = point(exhibit, 0, exhibit.bounds.depth / 2 + 1);
      assertWalkable(area, [door.x, door.z], [approach.x, approach.z], exhibit.id + ' display approach');
      step({ ...approach, y: EYE_HEIGHT + 15.6 });
      assert.deepEqual(completed(), expected, 'the overlook does not count');
      assert.equal(glow.material.emissiveIntensity, initialGlow);
      position = approach;
      step(position);
      assert.ok(prop.position.y > 1 && glow.material.emissiveIntensity > initialGlow);
      step(door);
      assert.equal(glow.material.emissiveIntensity, initialGlow);
    } else {
      switch (exhibit.id) {
        case 'rapunzel': {
          const { x, z, top } = observationPlatform;
          step(point(exhibit, x, z));
          assert.deepEqual(completed(), expected, 'standing below the platform does not count');
          position = point(exhibit, x, z, top);
          break;
        }
        case 'snow-white':
          position = approachActor(snowActors(scene)[0], area);
          break;
        case 'aurora': {
          const { x, z } = scene.getObjectByName('Enchanted rose').position;
          position = point(exhibit, x, z + 2.25);
          break;
        }
        case 'belle': {
          const tea = scene.getObjectByName('Belle enchanted tea table');
          position = point(exhibit, tea.position.x, tea.position.z + 2.55);
          break;
        }
        case 'jasmine': {
          const ride = area.interactions.find(item => item.label === 'Ride the magic carpet');
          position = point(exhibit, CARPET_DOCK.x, CARPET_DOCK.landingZ);
          game.camera.position.set(position.x, position.y, position.z);
          ride.act({ guideCamera: () => () => {} });
          for (let i = 0; i < 110; i++) step(game.camera.position);
          break;
        }
        case 'mulan': {
          const gong = area.interactions.find(item => item.label === 'Strike the great gong');
          position = point(exhibit, GONG_SITE.x, GONG_SITE.z + 2);
          const entrance = point(exhibit, 0, exhibit.bounds.depth / 2 - 1.75);
          assertWalkable(area, [entrance.x, entrance.z], [position.x, position.z], 'Mulan gong approach');
          step(position);
          assert.deepEqual(completed(), expected, 'approaching the gong does not count');
          game.camera.position.copy(position);
          gong.act();
          assert.deepEqual(completed(), expected, 'the demonstration must finish');
          for (let time = 0; time < MULAN_DEMONSTRATION_TIME + .2; time += .2) step(position);
          break;
        }
        case 'ariel': {
          const deck = scene.getObjectByName('Shipwreck deck').getWorldPosition(new THREE.Vector3());
          step({ x: deck.x, y: EYE_HEIGHT, z: deck.z });
          assert.deepEqual(completed(), expected, 'standing on the seabed does not count');
          position = { x: deck.x, y: EYE_HEIGHT + deck.y, z: deck.z };
          break;
        }
        case 'moana': {
          const ride = area.interactions.find(item => item.label === 'Sail with Moana');
          position = point(exhibit, MOANA_DOCK.x, MOANA_DOCK.landingZ);
          game.camera.position.set(position.x, position.y, position.z);
          ride.act({ guideCamera: () => () => {} });
          assert.deepEqual(completed(), expected, 'the voyage must finish');
          for (let i = 0; i < Math.ceil(VOYAGE_DURATION / .2) + 2; i++) step(game.camera.position);
          break;
        }
        case 'tiana': {
          position = point(exhibit, 0, 2.75);
          step({ ...position, y: EYE_HEIGHT + 15.6 });
          assert.deepEqual(completed(), expected, 'the overlook does not count');
          break;
        }
        case 'cinderella': {
          const site = scene.getObjectByName('Cinderella slipper display');
          step(point(exhibit, site.position.x, site.position.z + 1.2));
          assert.deepEqual(completed(), expected, 'standing below the slipper does not count');
          position = point(exhibit, site.position.x, site.position.z + 1.2, site.position.y);
          break;
        }
      }
    }
    step(position);
    step(position);
    expected.push(exhibit.id);
    assert.deepEqual(completed(), expected);
    if (expected.length < exhibits.length) assert.equal(progress.has(ID), false);
  }
  assert.ok(missions.every(mission => mission.current === mission.total));
  assert.equal(progress.has(ID), true);
  assert.equal(progress.has(CASTLE), false, 'gallery completion does not complete the castle');
  assert.deepEqual(notices.filter(message => message === galleryNotice), [galleryNotice]);
  worlds.reset();
  assert.ok(missions.every(mission => !mission.complete && mission.current === 0));
  assert.equal(progress.has(ID), true, 'reset preserves the saved level record');
  await worlds.load(CASTLE);
  assert.ok((await worlds.load(ID)).area.missionStatus.missions.every(mission => !mission.complete));
});

test('Mulan’s gong starts one demonstration from the garden path and can be struck again', async t => {
  const { worlds, camera, cues } = fixture();
  t.after(worlds.unload);
  const { area, scene } = await worlds.load(ID);
  const exhibit = exhibits.find(entry => entry.id === 'mulan');
  const { toWorld } = spaceTransform(exhibit);
  const room = scene.getObjectByName('mulan exhibit');
  for (const name of ['Three-tier garden pagoda', 'Sakura grove', 'Lotus pond', 'Great gong', 'Mulan practice sword']) {
    assert.ok(room.getObjectByName(name), name);
  }
  const gong = area.interactions.find(item => item.label === 'Strike the great gong');
  const disk = room.getObjectByName('Suspended bronze disk');
  const blade = room.getObjectByName('Mulan practice sword');
  const body = room.getObjectByName('Mulan waist pivot');
  const hips = room.getObjectByName('Mulan hips');
  const torso = room.getObjectByName('Mulan body');
  const legs = hips.children.filter(child => child.name === 'Mulan leg');
  assert.equal(legs.length, 2);
  assert.equal(torso.parent, body);
  const checkWaist = () => {
    const waist = body.getWorldPosition(new THREE.Vector3());
    assert.ok(waist.distanceTo(hips.getWorldPosition(new THREE.Vector3())) < 1e-6);
    for (const leg of legs) assert.ok(leg.getWorldPosition(new THREE.Vector3()).distanceTo(waist) < .18);
  };
  checkWaist();
  const mission = area.missionStatus.missions.find(entry => entry.id === 'mulan');
  const pose = () => [disk.rotation.x, ...blade.rotation.toArray(), ...body.rotation.toArray(), ...body.position.toArray()];
  const idle = pose();
  function stand(z, height = EYE_HEIGHT) {
    const [x, worldZ] = toWorld(GONG_SITE.x, GONG_SITE.z + z);
    camera.position.set(x, height, worldZ);
  }
  for (const [distance, height] of [[-1.9, EYE_HEIGHT], [1.9, EYE_HEIGHT + 1.2], [3.3, EYE_HEIGHT]]) {
    stand(distance, height);
    assert.equal(nearestInteraction([gong], camera.position), null);
    gong.act();
  }
  assert.equal(cues.length, 0);
  assert.deepEqual(pose(), idle);
  stand(1.9);
  assert.equal(nearestInteraction([gong], camera.position, () => false), null);
  assert.equal(nearestInteraction([gong], camera.position, () => true), gong);
  gong.act();
  gong.act();
  assert.equal(cues.length, 1);
  assert.equal(gong.active, false);
  worlds.update(.05, camera.position, .33);
  assert.notEqual(disk.rotation.x, 0);
  assert.notDeepEqual(pose(), idle);
  assert.equal(mission.complete, false);
  for (let i = 0; i < 25; i++) { worlds.update(.05, camera.position, .24); checkWaist(); }
  assert.equal(mission.complete, true);
  assert.deepEqual(pose(), idle);
  assert.equal(gong.active, true);

  gong.act();
  assert.equal(cues.length, 2);
  worlds.update(.05, camera.position, .24);
  worlds.reset();
  assert.equal(mission.complete, false);
  assert.equal(gong.active, true);
  assert.deepEqual(pose(), idle);
  gong.act();
  worlds.unload();
  assert.equal(gong.active, false);
  assert.deepEqual(pose(), idle);
});

test('Mulan’s reduced-motion demonstration holds a steady pose and still completes the mission', async t => {
  const { worlds, camera, cues } = fixture({ reduced: true });
  t.after(worlds.unload);
  const { area, scene } = await worlds.load(ID);
  const exhibit = exhibits.find(entry => entry.id === 'mulan');
  const [x, z] = spaceTransform(exhibit).toWorld(GONG_SITE.x, GONG_SITE.z + 1.9);
  const gong = area.interactions.find(item => item.label === 'Strike the great gong');
  const disk = scene.getObjectByName('Suspended bronze disk');
  const blade = scene.getObjectByName('Mulan practice sword');
  const idle = blade.rotation.z;
  camera.position.set(x, EYE_HEIGHT, z);
  gong.act();
  const greeting = blade.rotation.z;
  assert.notEqual(greeting, idle);
  for (let i = 0; i < 12; i++) {
    worlds.update(.05, camera.position, .25);
    assert.equal(blade.rotation.z, greeting);
    assert.equal(disk.rotation.x, 0);
  }
  for (let i = 0; i < 12; i++) worlds.update(.05, camera.position, .25);
  assert.ok(area.missionStatus.missions.find(entry => entry.id === 'mulan').complete);
  assert.equal(blade.rotation.z, idle);
  assert.equal(cues.length, 1);
});

test('the Glass Walkway lift can be called from either landing and carries the player both ways', async t => {
  const { worlds, player, camera } = fixture();
  t.after(worlds.unload);
  const visit = await worlds.load(ID);
  const { scene, area } = visit;
  const cabin = scene.getObjectByName('Glass lift cabin');
  const groundDoor = scene.getObjectByName('Lift ground station').getObjectByName('Landing door');
  const upperDoor = scene.getObjectByName('Lift walkway station').getObjectByName('Landing door');
  const { x, z, halfDepth, entry } = walkwayLiftSite;
  const front = x + halfDepth;
  const landingX = front + 1.04;
  const callGround = area.interactions.find(item => item.label === 'Call lift to ground floor');
  const callUpper = area.interactions.find(item => item.label === 'Call lift to Glass Walkway');
  const ride = area.interactions.find(item => item.label === 'Ride lift to Glass Walkway');
  const direction = new THREE.Vector2();

  function frame() {
    player.move(1 / 60, direction, visit);
    worlds.update(1 / 60, camera.position);
  }
  function wait(frames) {
    direction.set(0, 0);
    player.stop();
    for (let i = 0; i < frames; i++) frame();
  }
  function walkTo(tx, tz) {
    for (let i = 0; i < 320; i++) {
      direction.set(tx - camera.position.x, tz - camera.position.z);
      if (direction.length() < .11) {
        player.stop();
        return;
      }
      direction.normalize();
      frame();
    }
    assert.fail(`could not reach ${tx}, ${tz} from ${camera.position.toArray()}`);
  }
  function assertFloor(height) {
    assert.ok(Math.abs(camera.position.y - EYE_HEIGHT - height) < 1e-6);
    assert.ok(player.grounded);
  }

  assert.equal(groundDoor.visible, false);
  assert.equal(upperDoor.visible, true);
  player.reset({ x: entry[0], z: entry[1] }, area);
  walkTo(landingX, z);
  assert.equal(nearestInteraction(area.interactions, camera.position), null);
  walkTo(x, z);
  assertFloor(0);
  assert.equal(nearestInteraction(area.interactions, camera.position), ride);
  player.look(.32, -.12);
  const gaze = camera.rotation.toArray();
  ride.act();
  assert.equal(ride.active, false);
  wait(300);
  assert.ok(cabin.position.y > 8 && cabin.position.y < WALKWAY_HEIGHT * .82, 'the slower lift is still between floors after five seconds');
  assertFloor(cabin.position.y);
  assert.deepEqual(camera.rotation.toArray(), gaze, 'the camera keeps its look orientation');
  assert.ok(groundDoor.visible && upperDoor.visible);
  assert.ok(area.blocksGround(front, z, PLAYER_RADIUS, cabin.position.y), 'closed doors keep the rider inside');
  assert.ok(player.jump());
  wait(31);
  assert.ok(camera.position.y - EYE_HEIGHT >= cabin.position.y, 'jumping mid-trip keeps the moving floor underneath');
  wait(245);
  assertFloor(WALKWAY_HEIGHT);
  assert.equal(upperDoor.visible, false);
  assert.equal(groundDoor.visible, true);
  player.look(-.32, .12);
  walkTo(landingX, z);
  walkTo(...entry);
  assertFloor(WALKWAY_HEIGHT);
  walkTo(x, z);
  assert.equal(ride.label, 'Ride lift to ground floor');
  ride.act();
  wait(565);
  assertFloor(0);
  walkTo(landingX, z);
  assert.equal(Math.abs(camera.position.y - EYE_HEIGHT), 0);

  player.reset({ x: entry[0], z: entry[1], elevation: WALKWAY_HEIGHT }, area);
  walkTo(landingX, z);
  assert.equal(nearestInteraction(area.interactions, camera.position), callUpper);
  assert.ok(area.blocksGround(front, z, PLAYER_RADIUS, WALKWAY_HEIGHT), 'an empty shaft is blocked');
  callUpper.act();
  wait(565);
  assertFloor(WALKWAY_HEIGHT);
  assert.equal(cabin.position.y, WALKWAY_HEIGHT);
  assert.equal(upperDoor.visible, false);

  player.reset({ x: entry[0], z: entry[1] }, area);
  walkTo(landingX, z);
  assert.equal(nearestInteraction(area.interactions, camera.position), callGround);
  assert.ok(area.blocksGround(front, z, PLAYER_RADIUS, 0), 'the lower shaft is blocked when the cabin is upstairs');
  callGround.act();
  wait(565);
  assertFloor(0);
  assert.equal(cabin.position.y, 0);
  walkTo(x, z);
  ride.act();
  wait(90);
  assert.ok(cabin.position.y > 0);
  worlds.reset();
  assert.equal(cabin.position.y, 0);
  assert.equal(groundDoor.visible, false);
  assert.equal(upperDoor.visible, true);
});

test('the lift uses a short trip in reduced motion and clears its controls on unload', async t => {
  const { worlds, player, camera } = fixture({ reduced: true });
  t.after(worlds.unload);
  const { scene, area } = await worlds.load(ID);
  const { x, z } = walkwayLiftSite;
  player.reset({ x, z }, area);
  const ride = nearestInteraction(area.interactions, camera.position);
  assert.equal(ride.label, 'Ride lift to Glass Walkway');
  ride.act();
  for (let i = 0; i < 30; i++) worlds.update(1 / 60, camera.position);
  assert.ok(Math.abs(camera.position.y - EYE_HEIGHT - WALKWAY_HEIGHT) < 1e-6);
  assert.equal(ride.label, 'Ride lift to ground floor');
  const cabin = scene.getObjectByName('Glass lift cabin');
  assert.ok(cabin.children.filter(mesh => mesh.isMesh).every(mesh => mesh.layers.isEnabled(PLAYER_ONLY_LAYER)));
  worlds.unload();
  assert.equal(cabin.position.y, 0);
  assert.equal(ride.active, false);
});

test('both staircases connect the main level to the glass loop and all ten overlooks', async t => {
  const { worlds, player, camera } = fixture();
  t.after(worlds.unload);
  const visit = await worlds.load(ID);
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
    aurora: [0, 1.7, -6.35],
    belle: [0, 8.21, -8.93],
    ariel: [0, 4.8, -8.05],
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

test('the overhead lookout into Cinderella can still be inspected by the drone at floor level', async t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { area, scene, definition, viewmodel } = await worlds.load(ID);
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

test('the three wings have their own public landmarks with room to walk around them', async t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { area, scene } = await worlds.load(ID);
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

test('the Woodland bench at the second flower garden faces the path with a walking gap behind it', async t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { area, scene } = await worlds.load(ID);
  const landmarks = scene.getObjectByName('Gallery public spaces');
  const flowerGarden = landmarks.getObjectByName('Woodland flower garden 2');
  const bench = landmarks.children.find(child => child.name === 'Woodland bench' && child.position.x > -20);
  const front = bench.getWorldDirection(new THREE.Vector3());
  assert.ok(front.dot(bench.position.clone().sub(flowerGarden.position).normalize()) > .9);
  const { x, z } = bench.position;
  assertWalkable(area, [x + 3.0, z], [x + .85, z], 'bench approach');
  assertWalkable(area, [x - 1.05, z - 1.65], [x - 1.05, z + 1.65], 'gap between the planter and bench');
});

test('gallery guests include guards, a child with their parents, and a parent with an occupied stroller', async t => {
  const { worlds, camera } = fixture();
  t.after(worlds.unload);
  const { area, scene } = await worlds.load(ID);
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
  assert.deepEqual(area.interactions.flatMap(item => item.destination ?? []), []);

  const head = child.getObjectByName('Woodland family child head');
  const rest = head.rotation.toArray();
  worlds.update(.4, camera.position);
  assert.notDeepEqual(head.rotation.toArray(), rest);
  worlds.reset();
  assert.deepEqual(head.rotation.toArray(), rest);
});

test('reduced motion keeps gallery visitors in a steady pose', async t => {
  const { worlds, camera } = fixture({ reduced: true });
  t.after(worlds.unload);
  const { scene } = await worlds.load(ID);
  const arm = scene.getObjectByName('Woodland family child right arm');
  const rest = arm.rotation.toArray();
  worlds.update(1, camera.position);
  assert.deepEqual(arm.rotation.toArray(), rest);
});

test('four snack carts have walkable service approaches in separate parts of the gallery', async t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { area, scene } = await worlds.load(ID);
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

test('benches, bins, lamps and balloon bouquets are reachable along the promenade', async t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { area, scene } = await worlds.load(ID);
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

test('the hanging decorations stay above the public floor and clear Drone View', async t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { scene, definition } = await worlds.load(ID);
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

test('each cart has a vendor and a repeatable first-person tasting at its service side', async t => {
  const { worlds, camera } = fixture();
  t.after(worlds.unload);
  const { scene, area, viewmodel } = await worlds.load(ID);
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
  assert.ok(area.missionStatus.missions.every(mission => !mission.complete));
});

test('reduced motion holds the drink still and travel clears the snack viewmodel', async () => {
  const { worlds, camera } = fixture({ reduced: true });
  const visit = await worlds.load(ID);
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
  await worlds.load(CASTLE);
  assert.equal(model.visible, false);
  assert.equal(visit.viewmodel.children.length, 0);
  assert.equal(drink.active, false);
  drink.act();
  assert.equal(model.visible, false);
});

test('visitors, guards and stroller stroll while vendors and exhibit actors move at their posts', async t => {
  const { worlds } = fixture();
  t.after(worlds.unload);
  const { scene, area } = await worlds.load(ID);
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

test('Tiana transforms the frog into Naveen near the bank and resets when visitors leave', async t => {
  const { worlds } = fixture({ reduced: true });
  t.after(worlds.unload);
  const { area, scene } = await worlds.load(ID);
  const exhibit = exhibits.find(entry => entry.id === 'tiana');
  const { toWorld } = spaceTransform(exhibit);
  const frog = scene.getObjectByName('Enchanted frog');
  const prince = scene.getObjectByName('Prince Naveen');
  const mission = area.missionStatus.missions.find(entry => entry.id === 'tiana');
  const point = (x,z,y=EYE_HEIGHT) => { const [wx,wz] = toWorld(x,z); return { x:wx,y,z:wz }; };
  assert.ok(scene.getObjectByName('Tiana'));
  assert.ok(frog.visible && !prince.visible);
  worlds.update(.2, point(0,2.75,EYE_HEIGHT+15.6));
  assert.equal(mission.complete,false);
  worlds.update(.2, point(0,2.75));
  assert.ok(!frog.visible && prince.visible);
  assert.equal(mission.complete,true);
  worlds.update(.2, point(0,6.5));
  assert.ok(frog.visible && !prince.visible);
  worlds.update(.2, point(0,2.75));
  assert.ok(prince.visible);
  worlds.reset();
  assert.ok(frog.visible && !prince.visible);
  assert.equal(mission.complete,false);
});

test('Moana canoe sails and returns, completes one mission and resets', async t => {
  const { worlds, camera } = fixture({ reduced: true });
  t.after(worlds.unload);
  const { area, scene } = await worlds.load(ID);
  const exhibit = exhibits.find(entry => entry.id === 'moana');
  const boat = scene.getObjectByName('Moana voyaging canoe');
  const ride = area.interactions.find(item => item.label === 'Sail with Moana');
  const mission = area.missionStatus.missions.find(entry => entry.id === 'moana');
  const [x,z] = spaceTransform(exhibit).toWorld(MOANA_DOCK.x, MOANA_DOCK.landingZ);
  const dock = boat.position.clone();
  let restored = 0;
  const guide = () => () => restored++;
  camera.position.set(x,EYE_HEIGHT+15.6,z);
  ride.act({guideCamera:guide});
  assert.equal(ride.active,true);
  camera.position.set(x,EYE_HEIGHT,z);
  ride.act({guideCamera:guide});
  assert.equal(ride.active,false);
  for(let i=0;i<30;i++) worlds.update(.2,camera.position);
  assert.ok(boat.position.distanceTo(dock)>1);
  assert.equal(mission.complete,false);
  for(let i=0;i<60;i++) worlds.update(.2,camera.position);
  assert.equal(mission.complete,true);
  assert.equal(restored,1);
  assert.ok(boat.position.equals(dock));
  camera.position.set(x,EYE_HEIGHT,z);
  ride.act({guideCamera:guide});
  worlds.reset();
  assert.equal(restored,2);
  assert.ok(boat.position.equals(dock));
  assert.equal(mission.complete,false);
});
