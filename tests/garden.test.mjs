import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nextBasketState } from '../garden-orchard.js';
import { BRIDGE, blocksPondTravel, bridgeDeckHeight, fishPose } from '../garden-pond.js';
import { createTerrain, HILL, POND, pondDistance } from '../garden-terrain.js';
import { advanceFall, floorHeight, overlaps, PLAYER_RADIUS, walkElevation } from '../movement.js';

const terrain = createTerrain(45, 48);
const { getTerrainHeight } = terrain;
const world = {
  obstacles: [],
  getGroundHeight: (x, z) => Math.max(getTerrainHeight(x, z), bridgeDeckHeight(x, z)),
  blocksGround: blocksPondTravel,
};

function near(actual, expected, margin = 1e-5) {
  assert.ok(Math.abs(actual - expected) < margin, `Expected ${actual} near ${expected}`);
}

test('terrain sampler interpolates the triangles drawn by the ground mesh', () => {
  const { left, front, dx, dz, stride, heights } = terrain;
  const row = 62;
  const col = 62;
  const i = row * stride + col;
  const x = left + col * dx;
  const z = front + row * dz;
  near(getTerrainHeight(x, z), heights[i]);
  near(getTerrainHeight(x + dx / 4, z + dz / 4),
    heights[i] * 0.5 + heights[i + 1] * 0.25 + heights[i + stride] * 0.25);
  near(getTerrainHeight(x + dx * 0.75, z + dz * 0.75),
    heights[i + stride + 1] * 0.5 + heights[i + 1] * 0.25 + heights[i + stride] * 0.25);
});

test('the hill can be climbed and descended with continuous ground contact', () => {
  const start = 4.5;
  const samples = 120;
  const x = HILL.x;
  let z = start;
  let feet = world.getGroundHeight(x, z);
  for (const direction of [1, -1]) {
    const increment = direction * (HILL.z - start) / samples;
    for (let step = 0; step < samples; step++) {
      const nextZ = z + increment;
      const next = walkElevation(world, { x, z }, x, nextZ, feet, true);
      assert.notEqual(next, null);
      near(next, world.getGroundHeight(x, nextZ));
      assert.ok(Math.abs(next - feet) < 0.055);
      z = nextZ;
      feet = next;
    }
    if (direction > 0) assert.ok(feet > 2.45 && feet <= 2.55);
  }
  near(feet, 0);
});

test('steep terrain and invalid heights block movement; a stair can be stepped up', () => {
  for (const height of [5, -5, NaN, Infinity]) {
    const bad = { obstacles: [], getGroundHeight: x => x > 0 ? height : 0 };
    assert.equal(walkElevation(bad, { x: 0, z: 0 }, 0.1, 0, 0, true), null);
  }

  const stairs = { obstacles: [{ left: 0.4, right: 1, front: -1, back: 1, height: 0.204 }] };
  near(walkElevation(stairs, { x: 0, z: 0 }, 0.1, 0, 0, true), 0.204);
  assert.equal(walkElevation(stairs, { x: 0, z: 0 }, 0.1, 0, 0, false), null);
  near(floorHeight(stairs, 0.1, 0, 0.204), 0.204);
  stairs.obstacles[0].height = 1.12;
  assert.ok(overlaps(stairs.obstacles[0], 0.1, 0));
  assert.equal(walkElevation(stairs, { x: 0, z: 0 }, 0.1, 0, 0, true), null);
});

test('a jump leaves the hillside and lands at its new elevation', () => {
  const result = {};
  let feet = getTerrainHeight(HILL.x, HILL.z);
  const initial = feet;
  let speed = 6.3;
  let max = feet;
  for (let i = 0; i < 120; i++) {
    const z = HILL.z + Math.min(i, 100) * 0.015;
    const floor = floorHeight(world, HILL.x, z, feet);
    advanceFall(feet, speed, floor, 1 / 120, result);
    assert.ok(result.feet >= floor);
    feet = result.feet;
    speed = result.speed;
    max = Math.max(max, feet);
  }
  assert.ok(max > initial + 1.2);
  assert.equal(result.grounded, true);
  near(result.feet, getTerrainHeight(HILL.x, HILL.z + 100 * 0.015));
});

test('bridge ramps connect both shores and block a side exit into the pond', () => {
  const x = BRIDGE.x;
  let z = BRIDGE.start - 0.25;
  let feet = world.getGroundHeight(x, z);
  let max = 0;
  while (z < BRIDGE.end + 0.25) {
    const next = walkElevation(world, { x, z }, x, z + 0.055, feet, true);
    assert.notEqual(next, null);
    max = Math.max(max, next);
    feet = next;
    z += 0.055;
  }
  near(max, BRIDGE.peak, 0.005);
  near(feet, 0);
  const railX = x + BRIDGE.railX - PLAYER_RADIUS;
  assert.ok(blocksPondTravel(railX, POND.z, PLAYER_RADIUS));
  assert.ok(blocksPondTravel(x + 3, POND.z, PLAYER_RADIUS));
  assert.equal(walkElevation(world, { x: x + 5.5, z: POND.z }, x + 3, POND.z, 0, false), null);
});

test('submerged terrain around the deck is blocked and dry paths approach both ramps', () => {
  for (let x = -21; x < -7; x += 0.12) {
    for (let z = 5.4; z < 21.6; z += 0.12) {
      if (Math.abs(x - BRIDGE.x) < BRIDGE.halfWidth || getTerrainHeight(x, z) > POND.waterY - 0.012) continue;
      assert.ok(blocksPondTravel(x, z, PLAYER_RADIUS), `Submerged access at ${x},${z}`);
    }
  }
  for (const z of [BRIDGE.start - 0.55, BRIDGE.end + 0.55]) {
    assert.equal(blocksPondTravel(BRIDGE.x, z, PLAYER_RADIUS), false);
    near(world.getGroundHeight(BRIDGE.x, z), 0);
  }
});

test('all eight swimming paths remain within the shore and have deterministic reset poses', () => {
  const pose = {};
  for (let i = 0; i < 8; i++) {
    fishPose(i, 0, pose);
    const initial = { ...pose };
    for (let t = 0; t < 120; t += 0.083) {
      fishPose(i, t, pose);
      assert.ok(pondDistance(pose.x, pose.z) < 0.86);
      assert.ok(pose.y + 0.11 < POND.waterY);
      for (const offset of [-0.7, 0, 0.5]) {
        const x = pose.x + Math.sin(pose.yaw) * offset;
        const z = pose.z + Math.cos(pose.yaw) * offset;
        assert.ok(pondDistance(x, z) < 0.92);
        assert.ok(pose.y - 0.11 > getTerrainHeight(x, z));
      }
      assert.ok([pose.x, pose.y, pose.z, pose.yaw, pose.tail].every(Number.isFinite));
    }
    fishPose(i, 0, pose);
    assert.deepEqual(pose, initial);
  }
});

test('basket follows ground, carried, placed, and reset transitions', () => {
  assert.equal(nextBasketState('ground', 'place'), 'ground');
  let state = nextBasketState('ground', 'pickUp');
  assert.equal(state, 'carried');
  assert.equal(nextBasketState(state, 'pickUp'), 'carried');
  state = nextBasketState(state, 'place');
  assert.equal(state, 'placed');
  assert.equal(nextBasketState(state, 'place'), 'placed');
  assert.equal(nextBasketState(state, 'reset'), 'ground');
  state = nextBasketState(state, 'pickUp');
  assert.equal(state, 'carried');
  assert.equal(nextBasketState(state, 'reset'), 'ground');
});
