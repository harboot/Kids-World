import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
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
    const stair = side * 11.15;
    const wing = side * 14;
    reach(stair, 9);
    for (let level = 1; level <= 3; level++) {
      reach(stair, 6.2);
      reach(stair, -3.35);
      reach(wing, -3.35);
      reach(wing, -9);
      reach(-wing, -9);
      assert.equal(position.y, EYE_HEIGHT + level * 3.25);
      reach(wing, -9);
      reach(wing, 6.2);
    }
    reach(wing, -3.35);
    for (let level = 3; level >= 1; level--) {
      reach(stair, -3.35);
      reach(stair, 6.2);
      assert.equal(position.y, EYE_HEIGHT + (level - 1) * 3.25);
      if (level > 1) {
        reach(wing, 6.2);
        reach(wing, -3.35);
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

  player.reset({ x: 11.15, z: 1.4, elevation: 1.625 }, visit.area);
  assert.equal(walk(8.5, 1.4, 75), false);
  assert.ok(Math.abs(position.y - (EYE_HEIGHT + 1.625)) < 1e-6);
});
