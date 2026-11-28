import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { PLAYER_RADIUS, walkElevation } from '../core/movement.js';
import { areas } from '../game.js';
import { CLIFF_Z, hikingTrail, nearest, westTrail } from '../areas/waterfall-valley/landform.js';
import { safeStand } from '../areas/waterfall-valley/ride.js';
import { shaft } from '../areas/waterfall-valley/lift-layout.js';
import { chambers, createMineLayout } from '../areas/waterfall-valley/mine-layout.js';

const definition = (await areas['waterfall-valley'].loadModule()).default;
const headHeight = 1.82;
const scene = new THREE.Scene();
const visit = definition.load({ THREE, scene });
const mine = createMineLayout(THREE);

function walk(origin, waypoints) {
  let [x, z] = origin;
  let feet = visit.getGroundHeight(x, z);
  for (const [tx, tz] of waypoints) {
    const steps = Math.ceil(Math.hypot(tx - x, tz - z) / 0.08);
    const dx = (tx - x) / steps, dz = (tz - z) / steps;
    for (let step = 0; step < steps; step++) {
      const next = walkElevation(visit, { x, z }, x + dx, z + dz, feet, true);
      assert.notEqual(next, null, `blocked approaching ${tx}, ${tz} from ${x}, ${z}`);
      x += dx;
      z += dz;
      feet = next;
      assert.ok(feet + headHeight <= visit.getCeilingHeight(x, z, feet), `low ceiling at ${x}, ${z}`);
    }
  }
  return feet;
}

test('the public visit has a continuous walking loop through both entrances and over both outdoor bridges', () => {
  assert.equal(areas['waterfall-valley'].show, true);
  assert.deepEqual(visit.missionStatus.missions, []);
  const { x, z } = definition.spawn;
  const lowerPath = [...westTrail.points.slice(3), [-14, -18], [-14, -23]];
  const bypass = [[-16.5, -23.05], [-18.5, -23.55], [-18.5, -33.5], [-19, -36], [-19, -38]];
  const minePath = [...bypass, ...mine.main.points.filter(([x, z]) => z < -37.7 || x > 0 && z < CLIFF_Z - 1), [17, -23]];
  const upperPath = [...hikingTrail.points.slice(0, 10), [13, 46], [-5, 46], ...westTrail.points.slice(1, 3)];
  assert.ok(walk([x, z], [...lowerPath, ...minePath, ...upperPath]) > 3);
  assert.ok(walk([17, -23], [...minePath.slice(0, -1).reverse(), [-14, -23], [-14, -18], [-36, -18]]) > 1);
  assert.equal(visit.blocksGround(4, CLIFF_Z - 0.1, PLAYER_RADIUS, 13), true, 'cliff between entrances');
  assert.equal(visit.blocksGround(shaft.x, shaft.z, PLAYER_RADIUS, 17), true, 'guarded shaft');
});

test('the cavern network reaches every chamber and accounts for approximately 40% of walkable floor', () => {
  const pitch = 0.5;
  function reachable(start, minZ, maxZ) {
    const queue = [];
    const keys = new Set();
    function enqueue(x, z, elevation) {
      const ground = visit.getGroundHeight(x, z, elevation);
      const key = `${x},${z},${ground}`;
      if (keys.has(key)) return;
      keys.add(key);
      queue.push([x, z, ground]);
    }
    enqueue(...start, visit.getGroundHeight(...start));
    for (let i = 0; i < queue.length; i++) {
      const [x, z, feet] = queue[i];
      for (const [dx, dz] of [[0, -pitch], [pitch, 0], [0, pitch], [-pitch, 0]]) {
        const px = x + dx, pz = z + dz;
        if (Math.abs(px) >= definition.width / 2 || pz < minZ || pz > maxZ) continue;
        const next = walkElevation(visit, { x, z }, px, pz, feet, true);
        if (next !== null && next + headHeight <= visit.getCeilingHeight(px, pz, next)) enqueue(px, pz, next);
      }
    }
    return queue;
  }
  const cavern = reachable([-14, -23], -87.5, -22.5);
  for (const { name, x, z } of chambers) {
    assert.ok(cavern.some(([px, pz]) => Math.hypot(px - x, pz - z) < 3), name);
  }
  assert.ok(cavern.some(([x, z]) => x === 17 && z === -22.5), 'upper portal reachable without leaving the mine');
  const outdoor = reachable([definition.spawn.x, definition.spawn.z], CLIFF_Z, 87.5);
  function isReachable(x, y, z) {
    return (z < CLIFF_Z ? cavern : outdoor).some(([px, pz, feet]) =>
      Math.hypot(px - x, pz - z) <= 0.58 && Math.abs(feet - y) < 0.38);
  }

  const expected = [
    'feeding-deer', 'deer-feeding-location', 'fishing-rod', 'fishing-location',
    'hiking-checkpoint-lower', 'hiking-checkpoint-middle', 'hiking-checkpoint-upper',
    'camp-firewood', 'campfire', 'lower-cave-entrance', 'upper-cave-entrance',
    'mine-generator', 'mine-power-control-panel', 'crystal-deposit-blue', 'crystal-deposit-violet',
    'crystal-deposit-green', 'cargo-ore-crate', 'cargo-supplies-crate', 'cargo-loading', 'cargo-unloading',
    'railway-lower-station', 'railway-upper-station', 'railway-crystal-junction',
    'railway-shaft-junction', 'railway-echo-lake-trestle',
  ];
  assert.deepEqual(Object.keys(visit.landmarks).sort(), expected.sort());
  for (const [id, landmark] of Object.entries(visit.landmarks)) {
    const { x, y, z } = landmark.approach;
    assert.equal(landmark.id, id);
    assert.equal(landmark.object?.userData.landmarkId ?? id, id);
    assert.ok(safeStand(visit, x, z, y), id + ' has a safe standing position');
    assert.ok(isReachable(x, y, z), id + ' reachable from the normal walking routes');
    if (id.startsWith('hiking-checkpoint-')) assert.equal(landmark.object, null);
  }
  for (const [name, x, z] of [
    ['cabin interior', -42, -7.6], ['fishing pier', 16.05, 8], ['waterfall lookout', 34, -16.5],
    ['Northern workshop', -27.3, -81.9], ['Echo Lake overlook', -41, -45.3],
    ['Lower cargo deck', -22.3, -31.1], ['Upper cargo deck', 14.85, -33.2],
  ]) {
    const y = visit.getGroundHeight(x, z);
    assert.ok(isReachable(x, y, z), name);
  }
  for (const id of ['cargo-loading', 'cargo-unloading']) {
    const { x, y, z } = visit.landmarks[id].position;
    assert.ok(Math.abs(y - nearest(mine.main, x, z).y - 0.88) < 1e-6, id + ' meets wagon height');
  }
  const outdoorRatio = outdoor.length / (outdoor.length + cavern.length);
  assert.ok(outdoorRatio >= 0.55 && outdoorRatio <= 0.65, `outdoor walkable floor ratio ${outdoorRatio}`);
});

test('the main line and two connected spurs have continuous grades and room for a compact mining train', () => {
  const [lower] = mine.main.points;
  const upper = mine.main.points.at(-1);
  assert.ok(upper[2] - lower[2] > 18);
  for (const branch of mine.branches) assert.ok(mine.main.points.some(p =>
    p.every((coordinate, i) => coordinate === branch.points[0][i])));
  for (const path of [mine.main, ...mine.branches]) {
    for (const { x, z, y, endY, dx, dz, length } of path.segments) {
      assert.ok(Math.abs(y - endY) / length <= 0.15, `combined railway grade at ${x}, ${z}`);
      if (z > CLIFF_Z - 0.5) continue;
      for (const offset of [-1.15, 0, 1.15]) {
        const px = x + dz / length * offset, pz = z - dx / length * offset;
        assert.ok(mine.opening.sample(px, pz) > 0, `track clearance at ${px}, ${pz}`);
        assert.ok(mine.ceiling.sample(px, pz) > y + 3.15, `track headroom at ${px}, ${pz}`);
      }
    }
  }
  assert.ok(scene.getObjectByName('Elevated rail trestle deck').geometry.getAttribute('position').count > 0);
});

test('waterfall advances and resets without changing the loaded scene', () => {
  const map = scene.getObjectByName('Animated waterfall ribbons').material.map;
  visit.update(0.05, null, 0.05);
  assert.ok(map.offset.y < 0);
  visit.reset();
  assert.equal(Math.abs(map.offset.y), 0);
});
