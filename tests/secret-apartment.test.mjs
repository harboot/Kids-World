import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { areas } from '../game.js';
import { nearestInteraction } from '../core/interactions.js';
import { createLevelProgress } from '../core/level-progress.js';
import { walkElevation } from '../core/movement.js';
import { createPlayer } from '../core/player.js';
import { areaURL, createWorldManager, isPublicArea, resolveArea } from '../core/world-manager.js';

const ID = 'secret-apartment';

test('the hidden area can only be resolved by an explicit area URL and never enters public progress', () => {
  const root = new URL('https://example.test/Kids-World/');
  assert.equal(isPublicArea(areas, ID), false);
  assert.equal(resolveArea(root, areas, 'garden', ID), 'garden');
  assert.equal(resolveArea(new URL('?arrive=secret-apartment', root), areas, 'garden', 'snow'), 'snow');
  assert.equal(resolveArea(new URL('?area=secret-apartment&arrive=snow', root), areas, 'garden', 'snow'), ID);
  assert.equal(resolveArea(areaURL(root, ID), areas, 'garden'), ID);
  assert.equal(resolveArea(new URL('?area=snow', root), areas, 'garden', ID), 'snow');

  let saved = JSON.stringify([ID, 'garden']);
  const progress = createLevelProgress(areas, () => ({
    getItem: () => saved,
    setItem(key, value) { saved = value; },
  }));
  progress.complete(ID);
  assert.equal(progress.has(ID), false);
  progress.complete('snow');
  assert.deepEqual(JSON.parse(saved), ['garden', 'snow']);
  assert.equal(progress.has('garden'), true);
});

function fixture(reducedMotion = false) {
  const camera = new THREE.PerspectiveCamera();
  const player = createPlayer(THREE, camera);
  const worlds = createWorldManager(THREE, { areas, camera, services: { reducedMotion: () => reducedMotion } });
  const { area, scene, definition, lifetime } = worlds.load(ID);
  const { position } = camera;
  const arrivals = [];
  const action = {
    relocate(spawn) {
      arrivals.push(spawn);
      player.reset(spawn, area);
    },
  };
  player.reset(definition.spawn, area);

  function move(x, z) {
    const { x: startX, z: startZ } = position;
    const steps = Math.max(1, Math.ceil(Math.hypot(x - startX, z - startZ) / 0.13));
    for (let i = 1; i <= steps; i++) {
      const nextX = startX + (x - startX) * i / steps;
      const nextZ = startZ + (z - startZ) * i / steps;
      assert.equal(walkElevation(area, position, nextX, nextZ, 0, true), 0,
        `walkable on the route to (${x}, ${z}) at (${nextX.toFixed(2)}, ${nextZ.toFixed(2)})`);
      position.set(nextX, 1.68, nextZ);
    }
  }

  function act(label) {
    const prompt = nearestInteraction(area.interactions, position, item => item.label === label);
    assert.equal(prompt?.label, label);
    prompt.act(action);
  }

  function update(seconds) {
    for (let i = 0; i < Math.ceil(seconds / 0.05); i++) worlds.update(0.05, position);
  }

  return { area, scene, position, definition, player, worlds, lifetime, arrivals, move, act, update };
}

test('the elevator opens, seals the doorway during transit, and connects all three landings', () => {
  const { area, scene, position, player, arrivals, move, act, update, worlds } = fixture();
  const first = scene.getObjectByName('basement');
  const panel = first.getObjectByName('Sliding elevator door');
  const closedX = panel.position.x;
  assert.ok(first.visible);
  assert.equal(area.blocksGround(-88, -9.75), true);
  assert.equal(area.blocksGround(-78.75, 3.75), true, 'the lit car is solid');
  assert.equal(area.blocksGround(-82.78, 4.4), true, 'the parking column is solid');
  move(-84.5, 5.8);
  move(-81.63, 5.8);
  move(-81.63, 2.05);
  move(-77.7, 2.05);
  move(-81.63, 2.05);
  move(-86.35, 1.9);
  move(-86.36, -8.31);
  act('Call elevator');
  update(0.25);
  assert.notEqual(panel.position.x, closedX);
  update(0.55);
  assert.equal(area.blocksGround(-88, -9.75), false);
  move(-88, -8.65);
  move(-88, -11.18);
  act('Go to Floor 8');
  assert.equal(area.blocksGround(-88, -9.75), true);
  update(0.95);
  assert.equal(arrivals.length, 0);
  update(0.45);
  assert.equal(arrivals.length, 1);
  assert.deepEqual(position.toArray(), [0, 1.68, -12.275]);
  assert.equal(area.blocksGround(position.x, position.z), false);
  assert.equal(first.visible, false);
  assert.equal(scene.getObjectByName('floor8').visible, true);
  assert.ok(player.jump());
  const idle = new THREE.Vector2();
  for (let i = 0; i < 30; i++) {
    player.move(0.04, idle, worlds.active);
    assert.ok(position.y < 2.44, 'the player camera stays below the cabin ceiling while jumping');
  }
  assert.equal(position.y, 1.68);
  update(0.75);
  move(0, -8.5);
  move(0, -12.0);
  act('Go to Floor 17');
  update(2);
  assert.deepEqual(position.toArray(), [88, 1.68, -12.275]);
  assert.equal(scene.getObjectByName('floor17').visible, true);
  act('Go to Basement');
  update(2);
  assert.deepEqual(position.toArray(), [-88, 1.68, -11.375]);
  assert.equal(first.visible, true);
  assert.equal(arrivals.length, 3);
  worlds.unload();
});

test('the terrace doors, pool deck, gazebo, apartment and kitchen have connected walking routes', () => {
  const { area, scene, position, move, act, update, worlds } = fixture(true);
  move(-87.5, -8.25);
  act('Call elevator');
  update(0.05);
  move(-88, -11.2);
  act('Go to Floor 8');
  update(0.85);
  move(0, -6.7);
  assert.equal(area.blocksGround(0, -5.35), true);
  act('Open terrace doors');
  update(0.05);
  move(0, -3.0);
  move(-15.6, -3.0);
  move(-15.6, 16.0);
  move(-15.7, 23.0);
  move(-17.1, 26.7);
  assert.ok(scene.getObjectByName('Gazebo table surface'));
  assert.equal(area.blocksGround(-4.5, 14.1), true);
  assert.equal(area.blocksGround(11.6, 18.3), true);
  const pool = scene.getObjectByName('Main swimming pool');
  assert.equal(pool.material.uniforms.time.value, 0);
  move(-15.7, 23.0);
  move(-15.6, 16.0);
  move(-15.6, -3.0);
  move(0, -3.0);
  move(0, -12);
  act('Go to Floor 17');
  update(0.85);
  assert.equal(position.x, 88);
  move(88, -7.7);
  move(92.75, -7.05);
  assert.equal(area.blocksGround(92.75, -5.35), true);
  act('Open Unit 17E');
  update(0.05);
  move(92.75, -2.74);
  move(91.34, -1.37);
  assert.equal(area.blocksGround(89.94, 0.08), true, 'the sofa is solid');
  move(91.34, -2.74);
  move(96.25, -2.74);
  move(97.15, -0.62);
  const oven = scene.getObjectByName('Oven front');
  assert.ok(oven);
  assert.equal(area.blocksGround(88 + oven.position.x + 0.24, oven.position.z), true);
  assert.equal(area.blocksGround(92.6, -10.65), true, '17C remains closed');
  worlds.unload();
});

test('restart cancels a trip, closes the doors, and returns the visit to baseline', () => {
  const { area, scene, definition, player, position, worlds, lifetime, arrivals, move, act, update } = fixture();
  move(-87.4, -8.35);
  act('Call elevator');
  update(0.8);
  move(-88, -11.2);
  act('Go to Floor 8');
  update(0.7);
  let disposed = 0;
  scene.getObjectByName('Main swimming pool').material.addEventListener('dispose', () => disposed++);
  worlds.reset();
  player.reset(definition.spawn, area);
  update(2.5);
  assert.equal(arrivals.length, 0);
  assert.equal(area.objective, 'Basement · Parking');
  assert.equal(position.z, definition.spawn.z);
  assert.equal(area.blocksGround(-88, -9.75), true);
  assert.equal(scene.getObjectByName('floor8').visible, false);
  move(-87.4, -8.35);
  act('Call elevator');
  update(0.8);
  assert.equal(area.blocksGround(-88, -9.75), false);
  worlds.unload();
  assert.equal(lifetime.signal.aborted, true);
  assert.equal(disposed, 1);
  assert.equal(scene.children.length, 0);
});
