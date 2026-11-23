import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { footprint, wingX } from '../areas/kung-fu-hustle/layout.js';
import { areas } from '../game.js';
import { createPlayer, EYE_HEIGHT } from '../core/player.js';
import { createWorldManager, resolveArea } from '../core/world-manager.js';

const id = 'kung-fu-hustle';

async function start(t) {
  const camera = new THREE.PerspectiveCamera();
  const player = createPlayer(THREE, camera);
  const worlds = createWorldManager(THREE, {
    areas, camera,
    prepare({ definition, area }) { player.reset(definition.spawn, area); },
  });
  t.after(worlds.unload);
  const url = new URL('https://example.test/Kids-World/?area=kung-fu-hustle');
  const visit = await worlds.load(resolveArea(url, areas, 'garden'));
  const movement = new THREE.Vector2();
  const position = camera.position;

  function walk(x, z, frames = 900) {
    for (let i = 0; i < frames; i++) {
      movement.set(x - position.x, z - position.z);
      if (movement.length() < .07) return true;
      player.move(1 / 60, movement.normalize(), visit);
    }
    return false;
  }

  return { visit, player, position, reset: worlds.reset, walk };
}

test('the public courtyard route starts within the gate and resets to the same spot', async t => {
  const { visit, position, reset, walk } = await start(t);
  assert.equal(visit.definition.id, id);
  assert.equal(areas[id].show, true);
  assert.deepEqual(visit.area.missionStatus.missions, []);
  assert.deepEqual(position.toArray(), [0, EYE_HEIGHT, 12]);
  assert.ok(walk(3, 4));
  reset();
  assert.deepEqual(position.toArray(), [0, EYE_HEIGHT, 12]);
});

test('both stairways connect all four floors, with continuous corridors between the wings', async t => {
  const { position, reset, walk } = await start(t);
  function reach(x, z) {
    assert.ok(walk(x, z), `Could not reach (${x}, ${z}) from ${position.toArray()}`);
  }

  for (const side of [-1, 1]) {
    reset();
    const stairs = z => reach(wingX(side, side * 11.15, z), z);
    const wing = z => reach(wingX(side, side * 14, z), z);
    reach(side * 7.5, 6);
    reach(side * 16, 8.45);
    stairs(8.45);
    for (let level = 1; level <= 3; level++) {
      stairs(6.2);
      stairs(-3.35);
      wing(-3.35);
      wing(-9);
      reach(wingX(-side, -side * 14, -9), -9);
      assert.equal(position.y, EYE_HEIGHT + level * 3.25);
      wing(-9);
      wing(6.2);
    }
    wing(-3.35);
    for (let level = 3; level >= 1; level--) {
      stairs(-3.35);
      stairs(6.2);
      assert.equal(position.y, EYE_HEIGHT + (level - 1) * 3.25);
      if (level > 1) {
        wing(6.2);
        wing(-3.35);
      }
    }

  }
});

test('the gate, door facades, stair rails and gallery rails contain the player', async t => {
  const { visit, player, position, walk } = await start(t);
  assert.equal(walk(0, 16, 75), false);
  assert.ok(position.z < 14.2);
  player.jump();
  assert.equal(walk(0, 16, 75), false);

  player.reset({ x: 0, z: -9, elevation: 6.5 }, visit.area);
  assert.equal(walk(0, -11, 60), false);
  assert.equal(walk(0, -7, 60), false);
  player.jump();
  assert.equal(walk(0, -7, 75), false);
  assert.equal(position.y, EYE_HEIGHT + 6.5);

  player.reset({ x: wingX(1, 11.15, 1.4), z: 1.4, elevation: 1.625 }, visit.area);
  assert.equal(walk(wingX(1, 8.5, 1.4), 1.4, 75), false);
  assert.ok(Math.abs(position.y - (EYE_HEIGHT + 1.625)) < 1e-6);
});

test('shop fronts are solid and paths to the hexagonal fence corners are walkable', async t => {
  const { visit, player, position, walk } = await start(t);
  for (const side of [-1, 1]) {
    assert.ok(wingX(side, side * 14, 8.5) * side > 21);
    player.reset({ x: side * 12, z: 6.8 }, visit.area);
    assert.equal(walk(side * 12, 10.65, 100), false);
    assert.ok(position.z < 9);
    assert.ok(walk(side * 17.4, 7.7));
    assert.ok(walk(side * 20.5, 10.6));
    assert.ok(walk(side * 21.25, 13.2));
    assert.equal(walk(side * 21.25, 15.2, 55), false);
    assert.ok(position.z < 14.2);
  }

  for (const [i, [x, z]] of footprint.entries()) {
    const [nextX, nextZ] = footprint[(i + 1) % footprint.length];
    if (z === nextZ && z > 0) continue; // The front edge is split at the gate.
    const centerX = (x + nextX) / 2;
    const centerZ = (z + nextZ) / 2;
    assert.equal(visit.area.blocksGround(centerX, centerZ, .34, 0), true);
  }
});
