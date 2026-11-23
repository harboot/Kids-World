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

test('a wide central L, both narrow side flights, and the upper central stair connect four floors', async t => {
  const { position, reset, walk } = await start(t);
  function reach(x, z) {
    assert.ok(walk(x, z), `Could not reach (${x}, ${z}) from ${position.toArray()}`);
  }
  const at = level => assert.ok(Math.abs(position.y - (EYE_HEIGHT + level * 3.25)) < 1e-5);

  for (const side of [-1, 1]) {
    reset();
    const stairs = z => reach(wingX(side, side * 11.6, z), z);
    const wing = z => reach(wingX(side, side * 14, z), z);

    reach(8.45, 5.3);
    reach(10.12, 4.65);
    reach(10.12, -.40);
    reach(.5, -.40);
    at(.5);
    reach(.5, -9);
    at(1);

    wing(-9);
    wing(6.2);
    stairs(6.2);
    stairs(-3.35);
    wing(-3.35);
    wing(-8.24);
    at(2);

    reach(5.13, -8.24);
    reach(5.13, -4.5);
    reach(-4.85, -4.5);
    reach(-4.85, -9);
    at(3);
    reach(-4.85, -8.24);
    reach(wingX(-side, -side * 14, -8.24), -8.24);
    at(3);
    reach(-4.85, -8.24);

    reach(-4.85, -9);
    reach(-4.85, -4.5);
    reach(5.13, -4.5);
    reach(5.13, -8.24);
    at(2);
    wing(-8.24);
    wing(-3.35);
    stairs(-3.35);
    stairs(6.2);
    wing(6.2);
    wing(-9);
    at(1);
    reach(.5, -9);
    reach(.5, -.4);
    reach(9.7, -.4);
    at(0);
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

  player.reset({ x: wingX(1, 11.6, 1.4), z: 1.4, elevation: 4.875 }, visit.area);
  assert.equal(walk(wingX(1, 8.5, 1.4), 1.4, 75), false);
  assert.ok(Math.abs(position.y - (EYE_HEIGHT + 4.875)) < 1e-6);
});

test('stocked shops can be entered and paths to the hexagonal fence corners are walkable', async t => {
  const { visit, player, position, walk } = await start(t);
  for (const side of [-1, 1]) {
    assert.ok(wingX(side, side * 14, 8.5) * side > 21);
    player.reset({ x: side * 12, z: 6.8 }, visit.area);
    const aisle = side < 0 ? -12.50 : 13.40;
    assert.ok(walk(aisle, 8.2));
    assert.ok(walk(aisle, 10.9));
    assert.equal(walk(aisle, 12.1, 65), false);
    assert.ok(walk(aisle, 8.2));
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

test('the hand-shaped breach is physically open through the rear wall', async t => {
  const { visit } = await start(t);
  visit.scene.updateMatrixWorld(true);
  const wall = visit.scene.getObjectByName('Hand-shaped breach');
  assert.ok(wall);
  const ray = new THREE.Raycaster(new THREE.Vector3(9.2, 8, -9.95), new THREE.Vector3(0, 0, -1));
  assert.equal(ray.intersectObject(wall).length, 0);
  ray.ray.origin.set(14, 8, -9.95);
  assert.ok(ray.intersectObject(wall).length > 0);
  assert.equal(visit.area.blocksGround(9.2, -12, .34, 6.5), false);
  assert.equal(visit.area.blocksGround(14, -12, .34, 6.5), true);
});

test('each stair run has a single continuous mesh with one tread hit from above', async t => {
  const { visit } = await start(t);
  visit.scene.updateMatrixWorld(true);
  const flights = visit.scene.children.filter(child => child.name === 'Stair flight');
  assert.equal(flights.length, 5);
  const samples = [[5.2, -.22], [.64, -4.1], [.62, -4.41], ...[-1, 1].map(side => [wingX(side, side * 11.49, .33), .33])];
  for (const [i, [x, z]] of samples.entries()) {
    const ray = new THREE.Raycaster(new THREE.Vector3(x, 14, z), new THREE.Vector3(0, -1, 0));
    const [tread, underside, ...overlaps] = ray.intersectObject(flights[i]);
    assert.ok(tread && underside);
    assert.ok(tread.distance < underside.distance - .2);
    assert.deepEqual(overlaps, []);
  }
});

test('jumping clears rails on the highest gallery and lands quickly in the courtyard', async t => {
  const { visit, player, position } = await start(t);
  const height = 3 * 3.25;
  player.reset({ x: -7, z: -8.17, elevation: height }, visit.area);
  assert.ok(player.jump(visit.area));
  const forward = new THREE.Vector2(0, 1);
  let peak = height;
  let landed = 0;
  for (let frame = 1; frame < 150; frame++) {
    player.move(1 / 60, forward, visit);
    peak = Math.max(peak, position.y - EYE_HEIGHT);
    if (player.grounded) {
      landed = frame;
      break;
    }
  }
  assert.ok(peak > height + 1.4);
  assert.ok(position.z > -7);
  assert.equal(position.y, EYE_HEIGHT);
  assert.ok(landed > 60 && landed < 88, `Landing took ${landed} frames`);
});

test('the open ground-floor markets have room to browse under their ceilings', async t => {
  const { visit, player, position, walk } = await start(t);
  player.reset({ x: -1, z: -9.40 }, visit.area);
  assert.ok(walk(-1, -11.40));
  assert.ok(position.z < -10.7);
  assert.equal(visit.area.getCeilingHeight(-1, -11.40, 0), 3.25);
  assert.ok(walk(-1, -9.4));
  player.reset({ x: -13, z: -8.8, elevation: 3.25 }, visit.area);
  assert.equal(walk(-13, -11.4, 60), false);
});

test('the rear upper-left facade contains a recessed window with room in front of the wall', async t => {
  const { visit } = await start(t);
  visit.scene.updateMatrixWorld(true);
  const wall = visit.scene.getObjectByName('Hand-shaped breach');
  const ray = new THREE.Raycaster(new THREE.Vector3(-9.52, 11.65, -9.9), new THREE.Vector3(0, 0, -1));
  assert.deepEqual(ray.intersectObject(wall), []);
  ray.ray.origin.x = -11.2;
  assert.ok(ray.intersectObject(wall).length > 0);
});

test('a side stair can be vaulted toward the yard while walking still collides with its rail', async t => {
  const { visit, player, position, walk } = await start(t);
  const z = 1.4;
  const x = wingX(1, 11.6, z);
  player.reset({ x, z, elevation: 4.875 }, visit.area);
  assert.equal(walk(x - 1.9, z, 40), false);
  assert.ok(player.jump(visit.area));
  assert.ok(walk(x - 2, z, 85));
  assert.ok(position.x < wingX(1, 10.8, z));
  assert.ok(position.y >= EYE_HEIGHT);
  const stop = new THREE.Vector2();
  for (let i = 0; i < 60 && !player.grounded; i++) player.move(1 / 60, stop, visit);
  assert.equal(position.y, EYE_HEIGHT);
});
