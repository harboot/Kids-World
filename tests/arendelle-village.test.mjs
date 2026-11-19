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
const initialProgress = [
  'Catch and sell fish · 0/3',
  'Return the lost reindeer · 0/1',
  'Repair the clock · 0/3 gears',
].join('\n');

function fixture(initial = ID) {
  let stored = JSON.stringify(['garden', 'wooden-house', 'snow']);
  const writes = [];
  const completions = [];
  const cues = [];
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
    },
  });
  const visit = worlds.load(initial);
  return { visit, worlds, camera, progress, writes, completions, cues, reduceMotion() { still = true; } };
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
  assert.equal(area.objective, initialProgress);
  for (const [label, message, site] of prompts) {
    const item = nearestInteraction(area.interactions, { ...site, y: 1.68 });
    assert.equal(item.label, label);
    item.act({ travel() { assert.fail('Coming Soon should stay in the current area'); } });
    assert.equal(area.objective, initialProgress + '\n' + message);
    worlds.update(1.6);
    assert.equal(area.objective, initialProgress + '\n' + message);
    worlds.update(1.7);
    assert.equal(area.objective, initialProgress);
  }
  assert.equal(nearestInteraction(area.interactions, { x: 7.4, y: 1.68, z: 10.1 }), null);
  assert.equal(nearestInteraction(area.interactions, { x: 18.5, y: 1.68, z: -3 }).label, 'Talk to Fish Seller');
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

  const cityPrompt = visit.area.interactions.find(item => item.label === 'To The City');
  cityPrompt.act();
  worlds.update(1);
  assert.ok(!boat.position.equals(stillBoat) && boat.rotation.z !== 0 && !waves.position.equals(stillWaves));
  const children = visit.scene.children.length;
  worlds.reset();
  assert.equal(visit.scene.children.length, children);
  assert.equal(disposed.size, 0);
  assert.equal(visit.area.objective, initialProgress);
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
  assert.equal(lineReleased, true);
  assert.ok([...disposed.values()].every(count => count === 1));
  assert.ok(visit.area.interactions.every(item => item.active === false));
  cityPrompt.act();
  assert.equal(visit.area.objective, initialProgress);

  const repeat = worlds.load(ID);
  assert.equal(camera.parent, repeat.scene);
  assert.equal(repeat.scene.children.length, children);
  assert.notEqual(repeat.area.interactions, visit.area.interactions);
  assert.equal(repeat.area.interactions.length, visit.area.interactions.length);
  assert.equal(repeat.area.objective, initialProgress);
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
    [-23.1, 19.55], [-28.2, 19.55], [-28.2, 23.4]], update);
  for (let i = 0; i < 90; i++) update(0.04);
}

test('fishing supports pickup, bite timing, misses, walking away, and a single sale of three fish', t => {
  const { visit, worlds, progress, cues } = fixture();
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
  assert.match(area.objective, /Bring me three fish/);
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
  assert.match(area.objective, /slipped away/);
  assert.match(area.objective, /sell fish · 0\/3/);
  cast.act();
  worlds.update(1, { x: site.x - 4, z: site.z });
  assert.ok(cast.active && !line.visible);

  for (let i = 1; i <= 3; i++) {
    catchFish(worlds, cast);
    assert.ok(area.objective.includes(`Catch and sell fish · ${i}/3`));
  }
  assert.equal(cast.active, false);
  cast.act();
  assert.equal(seller.label, 'Sell 3 Fish');
  assert.match(area.objective, /Take your fish to the Fish Shop/);
  const before = cues.length;
  seller.act();
  seller.act();
  assert.equal(cues.length, before + 1);
  assert.equal(seller.active, false);
  assert.match(area.objective, /sell fish · 3\/3 ✓/);
  assert.ok(!progress.has(ID));
  assert.equal(area.interactions, items);

  worlds.reset();
  assert.equal(area.objective, initialProgress);
  assert.equal(rod.parent, scene);
  assert.ok(!line.visible && !bobber.visible);
  assert.ok(pickUp.active && !cast.active);
  assert.equal(seller.label, 'Talk to Fish Seller');
});

test('the reindeer follows the actual player across the bridge and reaches the trough without clipping', t => {
  const { visit, worlds, camera, completions } = fixture();
  t.after(worlds.unload);
  const { area, scene } = visit;
  const deer = scene.getObjectByName('Lost reindeer');
  const original = deer.position.clone();
  const keeper = nearestInteraction(area.interactions, { x: -25, z: 22.4, y: 1.68 });
  assert.equal(keeper.label, 'Talk to Stable Keeper');
  keeper.act();
  assert.match(area.objective, /west lanes/);
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
  assert.match(area.objective, /lost reindeer · 1\/1/);
  assert.equal(keeper.active, false);
  assert.deepEqual(completions, []);
  worlds.update(4, camera.position);
  assert.match(area.objective, /lost reindeer · 1\/1/);

  worlds.reset();
  assert.ok(deer.position.equals(original));
  assert.equal(find(visit, 'Follow Me').active, true);
  const recruit = find(visit, 'Follow Me');
  worlds.load(CASTLE);
  recruit.act();
  assert.equal(recruit.active, false);
  assert.ok(deer.position.equals(original));
});

test('gears are unique reachable pickups and the repair starts all four clock faces', t => {
  const { visit, worlds, cues, reduceMotion } = fixture();
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
    assert.ok(area.objective.includes(`Repair the clock · ${i + 1}/3 gears`));
    assert.equal(repair.active, i === 2);
  });
  assert.match(area.objective, /Return to the Clock Tower/);
  assert.equal(nearestInteraction(area.interactions, { x: 1.45, z: -10.35, y: 1.68 }), repair);
  repair.act();
  repair.act();
  assert.equal(cues.length, 4, 'three pickups and one bell cue');
  assert.match(area.objective, /Repair the clock · 3\/3 gears ✓/);
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

test('any order completes the village only after all three missions and replay preserves the record', () => {
  const orders = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  for (const order of orders) {
    const { worlds, camera, progress, writes, completions } = fixture();
    try {
      function playVisit(visit, replay = false) {
        const play = [() => deliverFish(visit, worlds), () => escort(visit, worlds, camera), () => repairClock(visit)];
        assert.equal(visit.area.objective, initialProgress);
        order.forEach((mission, i) => {
          play[mission]();
          assert.equal(visit.area.objective.includes('Arendelle Village Complete!'), i === 2);
          assert.equal(progress.has(ID), replay || i === 2);
        });
      }
      playVisit(worlds.active);
      const repeat = worlds.load(ID);
      playVisit(repeat, true);
      worlds.reset();
      assert.equal(repeat.area.objective, initialProgress);
      assert.deepEqual(completions, [ID]);
      assert.deepEqual(writes, [['garden', 'wooden-house', 'snow', ID]]);
    } finally {
      worlds.unload();
    }
  }
});

test('the reindeer detours around a bench the player jumps over', t => {
  const { visit, worlds, camera } = fixture();
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
  followPath(player, camera, visit, [[-3.25, 1]], update);
  const stopped = new THREE.Vector2();
  for (let i = 0; i < 120; i++) {
    player.move(0.04, stopped, visit);
    update(0.04);
  }
  assert.ok(deer.position.x > -5, 'reaches the player on the other side of the bench');
  assert.equal(find(visit, 'Follow Me').active, false, 'keeps following after the detour');
});
