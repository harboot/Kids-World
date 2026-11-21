import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { areas } from '../game.js';
import { nearestInteraction } from '../core/interactions.js';
import { createLevelProgress } from '../core/level-progress.js';
import { PLAYER_RADIUS, walkElevation } from '../core/movement.js';
import { createPlayer, EYE_HEIGHT } from '../core/player.js';
import { areaURL, createWorldManager, resolveArea } from '../core/world-manager.js';
import { missionHudFixture } from './helpers/mission-hud.mjs';

const ID = 'arendelle-village';
const CASTLE = 'frozen-castle';
const initialProgress = [
  { id: 'fishing', title: 'Catch and sell fish', current: 0, total: 3, complete: false },
  { id: 'reindeer', title: 'Return the lost reindeer', current: 0, total: 1, complete: false },
  { id: 'clock', title: 'Repair the Clock Tower', current: 0, total: 3, complete: false },
];

function assertMission(area, id, current, complete) {
  const initial = initialProgress.find(mission => mission.id === id);
  assert.deepEqual(area.missionStatus.missions.find(mission => mission.id === id), { ...initial, current, complete });
}

async function fixture(initial = ID) {
  let stored = JSON.stringify(['garden@2', 'wooden-house', 'snow']);
  const writes = [];
  const completions = [];
  const cues = [];
  const missionHud = missionHudFixture();
  const progress = createLevelProgress(areas, () => ({
    getItem: () => stored,
    setItem(key, value) { stored = value; writes.push(JSON.parse(value)); },
  }));
  const camera = new THREE.PerspectiveCamera();
  let still = false;
  const worlds = createWorldManager(THREE, {
    areas, camera, touch: true, playerRadius: PLAYER_RADIUS,
    services: {
      isLevelComplete: progress.has, reducedMotion: () => still,
      completeLevel(id) { completions.push(id); progress.complete(id); },
      playCue(notes) { cues.push(notes); },
      notify: missionHud.notify,
    },
  });
  const visit = await worlds.load(initial);
  return { visit, worlds, camera, progress, writes, completions, cues, missionHud, reduceMotion() { still = true; } };
}

function followPath(player, camera, visit, points, onStep = () => {}) {
  const motion = new THREE.Vector2();
  for (const [x, z] of points) {
    for (let step = 0; step < 270; step++) {
      motion.set(x - camera.position.x, z - camera.position.z);
      if (motion.length() < 0.13) break;
      player.move(0.04, motion.multiplyScalar(2).clampLength(0, 1), visit);
      onStep(0.04);
    }
    assert.ok(Math.hypot(x - camera.position.x, z - camera.position.z) < 0.13,
      `could not reach ${x}, ${z} from ${camera.position.x}, ${camera.position.z}`);
  }
}

test('a direct visit opens the village at the avenue before Castle missions are complete', async t => {
  const { worlds, camera, progress, writes } = await fixture(CASTLE);
  t.after(worlds.unload);
  const player = createPlayer(THREE, camera);
  const route = areaURL(new URL('https://example.test/Kids-World/'), ID);
  const visit = await worlds.load(resolveArea(route, areas, 'garden'));
  assert.equal(visit.id, ID);
  const { spawn } = visit.definition;
  player.reset(spawn, visit.area);
  assert.deepEqual(camera.position.toArray(), [spawn.x, EYE_HEIGHT + visit.area.getGroundHeight(spawn.x, spawn.z), spawn.z]);
  assert.ok(camera.getWorldDirection(new THREE.Vector3()).z < 0, 'faces the village avenue');
  assert.equal(nearestInteraction(visit.area.interactions, camera.position), null);
  assert.deepEqual(visit.area.missionStatus.missions, initialProgress);
  assert.equal(progress.has(CASTLE), false);
  assert.deepEqual(writes, []);
});

test('the village roads connect the entrance, plaza, west lanes, bridge, stable, market and both piers', async t => {
  const { visit, worlds, camera } = await fixture();
  t.after(worlds.unload);
  const { area, definition, scene } = visit;
  assert.ok(definition.width * definition.depth > areas.snow.width * areas.snow.depth * 3);
  for (const name of ['Village trail lantern', 'Village Square', 'Clock tower', 'Village fountain', 'Village house 1',
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

test('buildings, quay, bridge walls, water edges and the world boundary block movement', async t => {
  const { visit, worlds } = await fixture();
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

test('shop interactions show temporary messages without completing village missions', async t => {
  const { visit, worlds, progress, writes, missionHud } = await fixture();
  t.after(worlds.unload);
  const { area } = visit;
  const prompts = [
    ['Visit Bakery', 'Bakery — Coming Soon', { x: 7.4, z: 8.5 }],
    ['Visit Fruit Shop', 'Fruit Shop — Coming Soon', { x: 14.2, z: 8.6 }],
  ];
  assert.deepEqual(area.missionStatus.missions, initialProgress);
  for (const [label, message, site] of prompts) {
    const item = nearestInteraction(area.interactions, { ...site, y: 1.68 });
    assert.equal(item.label, label);
    item.act();
    assert.equal(missionHud.toast.textContent, message);
    assert.deepEqual(area.missionStatus.missions, initialProgress);
    worlds.update(1.6);
    missionHud.advance(1600);
    assert.equal(missionHud.toast.textContent, message);
    worlds.update(1.7);
    missionHud.advance(1700);
    assert.equal(missionHud.toast.textContent, '');
    assert.deepEqual(area.missionStatus.missions, initialProgress);
  }
  assert.equal(nearestInteraction(area.interactions, { x: 7.4, y: 1.68, z: 10.1 }), null);
  assert.equal(nearestInteraction(area.interactions, { x: 18.5, y: 1.68, z: -3 }).label, 'Talk to Fish Seller');
  assert.equal(worlds.active.id, ID);
  assert.ok(!progress.has(ID) && progress.has('garden') && progress.has('snow') && progress.has('wooden-house'));
  assert.deepEqual(writes, []);
});

test('Restart restores motion, and travel disposes the first visit before recreating it', async t => {
  const { visit, worlds, camera, progress, reduceMotion, missionHud } = await fixture();
  t.after(worlds.unload);
  const boat = visit.scene.getObjectByName('City passenger boat');
  const waves = visit.scene.getObjectByName('Water ripples');
  const stillBoat = boat.position.clone();
  const stillWaves = waves.position.clone();
  let lineReleased = false;
  const geometries = new Set();
  const gameResources = new Set();
  visit.scene.traverse(node => {
    if (!node.isMesh) return;
    geometries.add(node.geometry);
    if (node.isInstancedMesh) gameResources.add(node);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) gameResources.add(material);
  });
  visit.scene.getObjectByName('Fishing line').geometry.addEventListener('dispose', () => { lineReleased = true; });
  for (const geometry of geometries) gameResources.add(geometry);
  const disposed = new Map();
  for (const resource of gameResources) {
    resource.addEventListener('dispose', () => disposed.set(resource, (disposed.get(resource) ?? 0) + 1));
  }

  const bakery = visit.area.interactions.find(item => item.label === 'Visit Bakery');
  bakery.act();
  worlds.update(1);
  assert.ok(!boat.position.equals(stillBoat) && boat.rotation.z !== 0 && !waves.position.equals(stillWaves));
  const children = visit.scene.children.length;
  worlds.reset();
  assert.equal(visit.scene.children.length, children);
  assert.equal(disposed.size, 0);
  assert.deepEqual(visit.area.missionStatus.missions, initialProgress);
  assert.ok(boat.position.equals(stillBoat) && waves.position.equals(stillWaves));
  assert.equal(boat.rotation.z, 0);
  worlds.update(1);
  reduceMotion();
  worlds.update(1);
  assert.ok(boat.position.equals(stillBoat) && waves.position.equals(stillWaves));
  assert.equal(boat.rotation.z, 0);

  await worlds.load(CASTLE);
  assert.ok(visit.lifetime.signal.aborted);
  assert.equal(visit.scene.children.length, 0);
  assert.equal(disposed.size, gameResources.size);
  assert.equal(lineReleased, true);
  assert.ok([...disposed.values()].every(count => count === 1));
  assert.ok(visit.area.interactions.every(item => item.active === false));
  const notices = missionHud.notifications.length;
  bakery.act();
  assert.equal(missionHud.notifications.length, notices);
  assert.deepEqual(visit.area.missionStatus.missions, initialProgress);

  const repeat = await worlds.load(ID);
  assert.equal(camera.parent, repeat.scene);
  assert.equal(repeat.scene.children.length, children);
  assert.notEqual(repeat.area.interactions, visit.area.interactions);
  assert.equal(repeat.area.interactions.length, visit.area.interactions.length);
  assert.deepEqual(repeat.area.missionStatus.missions, initialProgress);
  assert.ok(repeat.scene.getObjectByName('City passenger boat').position.equals(stillBoat));
  assert.ok(progress.has('snow') && !progress.has(ID));
});

test('the offline release ships all village runtime files', async () => {
  const manifest = JSON.parse(await readFile(new URL('../version.json', import.meta.url)));
  const files = await readdir(new URL('../areas/arendelle-village/', import.meta.url));
  const included = new Set(manifest.files.map(file => file.path));
  for (const file of files) assert.ok(included.has('./areas/arendelle-village/' + file), file);
});

function find(visit, label) {
  const item = visit.area.interactions.find(item => item.label === label);
  assert.ok(item, label);
  return item;
}

function catchFish(worlds, cast) {
  cast.act();
  worlds.update(3.5, { x: cast.x, z: cast.z });
  assert.equal(cast.label, 'Reel In!');
  cast.act();
}

function deliverFish(visit, worlds) {
  find(visit, 'Pick Up Fishing Rod').act();
  const cast = find(visit, 'Cast Fishing Line');
  for (let i = 0; i < 3; i++) catchFish(worlds, cast);
  find(visit, 'Sell 3 Fish').act();
}

function repairClock(visit) {
  for (const gear of visit.area.interactions.filter(item => item.label === 'Collect Clock Gear')) gear.act();
  find(visit, 'Repair Clock Tower').act();
}

function escort(visit, worlds, camera, checkStep = () => {}) {
  const player = createPlayer(THREE, camera);
  player.reset({ x: -12.35, z: -5.2 }, visit.area);
  const recruit = nearestInteraction(visit.area.interactions, camera.position);
  assert.equal(recruit.label, 'Follow Me');
  recruit.act();
  assert.equal(recruit.active, false);
  const update = dt => {
    worlds.update(dt, camera.position);
    checkStep();
  };
  followPath(player, camera, visit, [[-12.35, 5.6], [-12.35, 19.55], [-17.3, 19.55],
    [-23.1, 19.55], [-28.2, 19.55], [-28.2, 23.4], [-29.12, 24.85]], update);
  for (let i = 0; i < 90; i++) update(0.04);
  assertMission(visit.area, 'reindeer', 0, false);
  const keeper = nearestInteraction(visit.area.interactions, camera.position);
  assert.equal(keeper?.label, 'Return Reindeer');
  keeper.act();
  assert.equal(keeper.active, false, 'the keeper accepts the handoff once');
  for (let i = 0; i < 90; i++) update(0.04);
}

test('fishing supports pickup, bite timing, misses, walking away, and a single sale of three fish', async t => {
  const { visit, worlds, progress, cues, missionHud } = await fixture();
  t.after(worlds.unload);
  const { area, scene } = visit;
  const rod = scene.getObjectByName('Fishing rod');
  const bobber = scene.getObjectByName('Fishing bobber');
  const line = scene.getObjectByName('Fishing line');
  const items = area.interactions;
  const pickUp = nearestInteraction(items, { x: 28.8, z: -3.95, y: 1.68 });
  const cast = find(visit, 'Cast Fishing Line');
  const seller = find(visit, 'Talk to Fish Seller');
  const site = { x: cast.x, z: cast.z, y: 1.68 };
  assert.equal(pickUp.label, 'Pick Up Fishing Rod');
  seller.act();
  assert.match(missionHud.toast.textContent, /Bring me three fish/);
  assert.equal(cast.active, false);
  assert.ok(!line.visible && !bobber.visible);
  pickUp.act();
  assert.equal(rod.parent, visit.viewmodel);
  assert.equal(pickUp.active, false);
  assert.equal(nearestInteraction(items, site), cast);
  cast.act();
  assert.ok(bobber.visible && line.visible);
  assert.equal(cast.active, false);
  worlds.update(2.5, site);
  assert.equal(cast.active, false);
  worlds.update(0.11, site);
  assert.equal(cast.label, 'Reel In!');
  assert.ok(cues.length > 0);
  worlds.update(6.1, site);
  assert.ok(!bobber.visible);
  assert.match(missionHud.toast.textContent, /slipped away/);
  assertMission(area, 'fishing', 0, false);
  cast.act();
  worlds.update(1, { x: site.x - 4, z: site.z });
  assert.ok(cast.active && !line.visible);

  for (let i = 1; i <= 3; i++) {
    catchFish(worlds, cast);
    assertMission(area, 'fishing', i, false);
  }
  assert.equal(cast.active, false);
  cast.act();
  assert.equal(seller.label, 'Sell 3 Fish');
  assert.match(area.missionStatus.hint, /Take your fish to the Fish Shop/);
  const before = cues.length;
  seller.act();
  seller.act();
  assert.equal(cues.length, before + 1);
  assert.equal(seller.active, false);
  assertMission(area, 'fishing', 3, true);
  assert.ok(!progress.has(ID));
  assert.equal(area.interactions, items);

  worlds.reset();
  assert.deepEqual(area.missionStatus.missions, initialProgress);
  assert.equal(rod.parent, scene);
  assert.ok(!line.visible && !bobber.visible);
  assert.ok(pickUp.active && !cast.active);
  assert.equal(seller.label, 'Talk to Fish Seller');
});

test('the reindeer crosses the bridge and reaches the trough after the stable keeper accepts it', async t => {
  const { visit, worlds, camera, completions, missionHud } = await fixture();
  t.after(worlds.unload);
  const { area, scene } = visit;
  const deer = scene.getObjectByName('Lost reindeer');
  const original = deer.position.clone();
  const keeper = nearestInteraction(area.interactions, { x: -29.12, z: 24.88, y: 1.68 });
  assert.equal(keeper.label, 'Talk to Stable Keeper');
  keeper.act();
  assert.match(missionHud.toast.textContent, /west lanes/);
  let previous = deer.position.clone();
  let highest = 0;
  let inMotion = false;
  escort(visit, worlds, camera, () => {
    const p = deer.position;
    assert.equal(walkElevation(area, previous, p.x, p.z, previous.y, true), p.y);
    assert.equal(p.y, area.getGroundHeight(p.x, p.z));
    assert.ok(p.distanceTo(previous) < 0.25, 'walks to the next step smoothly');
    inMotion ||= Math.abs(deer.getObjectByName('Reindeer leg').rotation.x) > 0.10;
    highest = Math.max(highest, p.y);
    previous.copy(p);
  });
  assert.ok(highest > 0.49 && inMotion, 'animates while following on the bridge');
  assert.ok(deer.position.x < -27.9 && deer.position.z > 23.0, 'the reindeer reaches the feeding area');
  assertMission(area, 'reindeer', 1, true);
  assert.equal(keeper.active, false);
  assert.deepEqual(completions, []);
  worlds.update(4, camera.position);
  assertMission(area, 'reindeer', 1, true);

  worlds.reset();
  assert.ok(deer.position.equals(original));
  assert.equal(find(visit, 'Follow Me').active, true);
  const recruit = find(visit, 'Follow Me');
  await worlds.load(CASTLE);
  recruit.act();
  assert.equal(recruit.active, false);
  assert.ok(deer.position.equals(original));
});

test('gears are unique reachable pickups and the repair starts all four clock faces', async t => {
  const { visit, worlds, cues, reduceMotion } = await fixture();
  t.after(worlds.unload);
  const { area, scene } = visit;
  const gears = area.interactions.filter(item => item.label === 'Collect Clock Gear');
  const repair = find(visit, 'Repair Clock Tower');
  const hands = scene.getObjectsByProperty('name', 'Clock minute hand');
  const gearNames = ['Market clock gear', 'Bridge clock gear', 'Harbor clock gear'];
  assert.equal(gears.length, 3);
  assert.equal(hands.length, 4);
  repair.act();
  worlds.update(2.5);
  assert.ok(hands.every(hand => hand.rotation.z === 0));
  assert.equal(repair.active, false);
  gears.forEach((gear, i) => {
    const site = { x: gear.x, z: gear.z + 0.8, y: 1.68 };
    const feet = area.getGroundHeight(site.x, site.z);
    assert.equal(walkElevation(area, site, site.x, site.z, feet, true), feet);
    assert.equal(nearestInteraction(area.interactions, site), gear);
    gear.act();
    gear.act();
    assert.ok(!gear.active && !scene.getObjectByName(gearNames[i]).visible);
    assertMission(area, 'clock', i + 1, false);
    assert.equal(repair.active, i === 2);
  });
  assert.match(area.missionStatus.hint, /Return to the Clock Tower/);
  assert.equal(nearestInteraction(area.interactions, { x: 1.68, z: -9.55, y: 1.68 }), repair);
  repair.act();
  repair.act();
  assert.equal(cues.length, 4, 'three pickups and one bell cue');
  assertMission(area, 'clock', 3, true);
  worlds.update(1);
  assert.ok(hands.every(hand => hand.rotation.z < 0));
  reduceMotion();
  worlds.update(1);
  const angle = hands[0].rotation.z;
  worlds.update(0.5);
  assert.ok(hands.every(hand => hand.rotation.z === angle));
  worlds.reset();
  assert.ok(hands.every(hand => hand.rotation.z === 0));
  assert.ok(gearNames.every(name => scene.getObjectByName(name).visible));
  assert.ok(gears.every(gear => gear.active) && !repair.active);
});

test('any order completes the village only after all three missions and replay preserves the record', async () => {
  const orders = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  for (const order of orders) {
    const { worlds, camera, progress, writes, completions, missionHud } = await fixture();
    try {
      function playVisit(visit, replay = false) {
        const play = [() => deliverFish(visit, worlds), () => escort(visit, worlds, camera), () => repairClock(visit)];
        assert.deepEqual(visit.area.missionStatus.missions, initialProgress);
        order.forEach((mission, i) => {
          play[mission]();
          assert.equal(visit.area.missionStatus.missions.filter(mission => mission.complete).length, i + 1);
          assert.equal(missionHud.toast.textContent.includes('Arendelle Village complete!'), i === 2);
          assert.equal(progress.has(ID), replay || i === 2);
        });
      }
      playVisit(worlds.active);
      const repeat = await worlds.load(ID);
      playVisit(repeat, true);
      worlds.reset();
      assert.deepEqual(repeat.area.missionStatus.missions, initialProgress);
      assert.deepEqual(completions, [ID]);
      assert.deepEqual(writes, [['garden@2', 'wooden-house', 'snow', ID]]);
    } finally {
      worlds.unload();
    }
  }
});

test('the reindeer detours around a bench the player jumps over', async t => {
  const { visit, worlds, camera } = await fixture();
  t.after(worlds.unload);
  const { area, scene } = visit;
  const player = createPlayer(THREE, camera);
  const deer = scene.getObjectByName('Lost reindeer');
  player.reset({ x: -12.35, z: -5.2 }, area);
  find(visit, 'Follow Me').act();
  let previous = deer.position.clone();
  const update = dt => {
    worlds.update(dt, camera.position);
    const { x, y, z } = deer.position;
    assert.equal(walkElevation(area, previous, x, z, previous.y, true), y);
    previous.copy(deer.position);
  };
  followPath(player, camera, visit, [[-12.35, 5.2], [-7.22, 5.2], [-7.22, 1]], update);
  assert.ok(player.jump());
  followPath(player, camera, visit, [[-3.28, 1], [-3.28, 4.45]], update);
  const stopped = new THREE.Vector2();
  for (let i = 0; i < 120; i++) {
    player.move(0.04, stopped, visit);
    update(0.04);
  }
  assert.ok(deer.position.x > -5, 'reaches the player on the other side of the bench');
  assert.equal(find(visit, 'Follow Me').active, false, 'keeps following after the detour');
});

test('the reindeer keeps a wider following gap and steps back when approached', async t => {
  const { visit, worlds, camera } = await fixture();
  t.after(worlds.unload);
  const { area, scene } = visit;
  const player = createPlayer(THREE, camera);
  const deer = scene.getObjectByName('Lost reindeer');
  player.reset({ x: -12.35, z: -5.2 }, area);
  find(visit, 'Follow Me').act();
  const update = dt => worlds.update(dt, camera.position);
  followPath(player, camera, visit, [[-12.1, 1.0]], update);
  for (let i = 0; i < 100; i++) update(0.04);
  const distance = () => Math.hypot(camera.position.x - deer.position.x, camera.position.z - deer.position.z);
  assert.ok(distance() >= 2.64 && distance() < 2.84, 'the deer follows at about 2.65 world units');
  const before = deer.position.clone();
  player.reset({ x: before.x, z: before.z + 0.68 }, area);
  for (let i = 0; i < 50; i++) update(0.04);
  assert.ok(distance() > 2.05 && deer.position.distanceTo(before) > 1.2, 'the deer backs away from a close player');
});

test('the Clock Tower doors relocate the player between levels and the lookout rail stops walkers and jumps', async t => {
  const { visit, worlds, camera } = await fixture();
  t.after(worlds.unload);
  const { area, scene } = visit;
  const player = createPlayer(THREE, camera);
  const up = find(visit, 'Go Up Clock Tower');
  const down = find(visit, 'Go Down Clock Tower');
  const relocate = spawn => player.reset(spawn, area);
  const tower = scene.getObjectByName('Clock tower');
  assert.ok(tower.scale.y >= 1.4 && tower.scale.x > 1);
  player.reset({ x: up.x, z: up.z + 1.05 }, area);
  assert.equal(nearestInteraction(area.interactions, camera.position), up);
  up.act({ relocate });
  const elevation = camera.position.y - 1.68;
  assert.ok(elevation > 9, 'the upper door opens onto the raised lookout');
  assert.equal(area.getGroundHeight(camera.position.x, camera.position.z), 0, 'ground stays separate below');
  assert.equal(nearestInteraction(area.interactions, camera.position), null, 'arrival does not retrigger the door');

  const from = camera.position.clone();
  assert.equal(walkElevation(area, from, from.x, -7.83, elevation, true), null);
  assert.equal(walkElevation(area, from, from.x, -7.83, elevation + 0.8, false), null);
  player.reset({ x: from.x, z: from.z, elevation }, area);
  followPath(player, camera, visit, [[2.8, -9.15], [-0.05, -10.4]]);
  assert.ok(Math.abs(camera.position.y - 1.68 - elevation) < 1e-6);
  assert.equal(nearestInteraction(area.interactions, camera.position), down);
  down.act({ relocate });
  assert.equal(camera.position.y, 1.68);
  assert.equal(nearestInteraction(area.interactions, camera.position), null);
  assert.equal(worlds.active, visit);
});

test('the repair button uses a thin clearance marker and unlocks its approach only after repair', async t => {
  const { visit, worlds } = await fixture();
  t.after(worlds.unload);
  const { area, scene } = visit;
  const repair = find(visit, 'Repair Clock Tower');
  const outline = scene.getObjectByName('Repair Clock Tower clearance');
  const approach = { x: repair.x, z: -9.55, y: 1.68 };
  const blocked = { x: repair.x, z: -10.25 };
  assert.ok(outline.visible && outline.material.transparent);
  assert.equal(outline.geometry.parameters.shapes.holes.length, 1, 'uses a hollow rectangle');
  assert.equal(walkElevation(area, approach, blocked.x, blocked.z, 0, true), null);
  assert.equal(walkElevation(area, approach, blocked.x, blocked.z, 0.92, false), null);
  assert.equal(nearestInteraction(area.interactions, approach), null);
  for (const item of area.interactions.filter(item => item.label === 'Collect Clock Gear')) item.act();
  assert.equal(nearestInteraction(area.interactions, approach), repair);
  assert.equal(nearestInteraction(area.interactions, { ...blocked, y: 1.68 }), null);
  repair.act();
  assert.equal(outline.visible, false);
  assert.equal(walkElevation(area, approach, blocked.x, blocked.z, 0, true), 0);
  worlds.reset();
  assert.ok(outline.visible);
  assert.equal(walkElevation(area, approach, blocked.x, blocked.z, 0, true), null);
});

test('the two house plots share one building with walkable stairs and a railed balcony', async t => {
  const { visit, worlds, camera } = await fixture();
  t.after(worlds.unload);
  const { area, scene } = visit;
  const player = createPlayer(THREE, camera);
  assert.ok(scene.getObjectByName('Timber Hall'));
  assert.ok(scene.getObjectByName('Timber Hall exterior stairs'));
  player.reset({ x: -14.03, z: -12.5 }, area);
  followPath(player, camera, visit, [[-16.1, -12.5], [-21.0, -12.5], [-25.0, -12.5]]);
  assert.ok(Math.abs(camera.position.y - 4.08) < 1e-6, 'normal walking climbs to the balcony');
  const from = camera.position.clone();
  assert.equal(walkElevation(area, from, from.x, -11.44, 2.4, true), null);
  assert.equal(walkElevation(area, from, -26.01, from.z, 2.4, true), null);
  followPath(player, camera, visit, [[-20.25, -12.5], [-14.10, -12.5]]);
  assert.equal(camera.position.y, 1.68, 'walks back down to the street');
});

test('the larger fountain animates its droplets, toggles from its valve, and resets with idle bystanders', async t => {
  const { visit, worlds, reduceMotion } = await fixture();
  t.after(worlds.unload);
  const { area, scene } = visit;
  const droplets = scene.getObjectByName('Fountain droplets');
  const fountain = find(visit, 'Turn Fountain Off');
  const firstDrop = new THREE.Matrix4();
  const nextDrop = new THREE.Matrix4();
  const bystander = scene.getObjectByName('Village resident 1');
  const residents = scene.children.filter(node => node.name.startsWith('Village resident '));
  assert.ok(residents.length >= 4);
  assert.equal(nearestInteraction(area.interactions, bystander.position), null);
  assert.equal(nearestInteraction(area.interactions, { x: 0, z: 5.1, y: 1.68 }), fountain);
  assert.ok(droplets.visible && droplets.count >= 70);
  droplets.getMatrixAt(0, firstDrop);
  const yaw = bystander.rotation.y;
  worlds.update(0.35);
  droplets.getMatrixAt(0, nextDrop);
  assert.ok(!firstDrop.equals(nextDrop) && bystander.rotation.y !== yaw);
  fountain.act();
  assert.ok(!droplets.visible);
  assert.equal(fountain.label, 'Turn Fountain On');
  reduceMotion();
  fountain.act();
  worlds.update(0.2);
  droplets.getMatrixAt(0, nextDrop);
  assert.ok(droplets.visible && firstDrop.equals(nextDrop));
  fountain.act();
  worlds.reset();
  assert.ok(droplets.visible);
  assert.equal(fountain.label, 'Turn Fountain Off');
  worlds.unload();
  fountain.act();
  assert.equal(fountain.active, false);
});
