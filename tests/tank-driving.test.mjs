import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rectanglesOverlap, canPlaceTank } from '../areas/military-base/tank-driving.js';
import * as THREE from '../vendor/three.module.min.js';
import { militaryBase } from '../areas/military-base/index.js';

test('oriented vehicle collision includes the overhanging cannon and map bounds', () => {
  const a = { x: 0, z: 0, width: 3, depth: 5, yaw: .5 };
  assert.ok(rectanglesOverlap(a, { ...a, x: 1 }));
  assert.ok(!rectanglesOverlap(a, { ...a, x: 10 }));
  const obstacle = { height: 2, footprint: { x: 0, z: 3.5, width: .5, depth: .5, yaw: 0 } };
  const world = { obstacles: [obstacle], own: new Set(), traversal: {}, width: 100, depth: 100 };
  assert.equal(canPlaceTank(0, 0, 0, world), false);
  world.own.add(obstacle);
  assert.equal(canPlaceTank(0, 0, 0, world), true);
  assert.equal(canPlaceTank(49, 0, 0, world), false);
  assert.equal(canPlaceTank(0, 49, 0, world), false);
});

test('Tank 01 drives, exits at its current location and resets without modifying missions', () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(70, 1, .1, 200);
  const area = militaryBase.load({ THREE, scene, camera, reducedMotion: () => true });
  const tank = scene.getObjectByName('Tank 01');
  const original = tank.position.clone();
  const board = area.interactions.find(i => i.label === 'Drive Tank');
  assert.ok(board);
  camera.position.set(board.x, 1.68, board.z);
  let controller, exit, spawn;
  board.act({ guideCamera(_look, options) { controller = options.drive; exit = options.prompt; return p => { spawn = p; }; } });
  assert.equal(board.active, false);
  assert.ok(camera.position.y > 3);
  for (let i = 0; i < 45; i++) controller(1/60, { x: 0, y: -1 });
  assert.ok(tank.position.distanceTo(original) > .5);
  assert.ok(Math.abs(camera.position.y - 4.12) < .001);
  exit.act();
  assert.ok(spawn);
  assert.ok(Math.hypot(spawn.x - tank.position.x, spawn.z - tank.position.z) < 5);
  assert.equal(board.active, true);
  area.reset();
  assert.ok(tank.position.distanceTo(original) < 1e-6);
  assert.equal(area.missionStatus.missions.length, 5);
  area.unload();
});
