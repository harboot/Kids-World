import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeMissionStatus } from '../core/missions.js';
import { PLAYER_RADIUS } from '../core/movement.js';
import { createWorldManager } from '../core/world-manager.js';
import { areas } from '../game.js';
import * as THREE from '../vendor/three.module.min.js';

const fish = { id: 'fish', title: 'Catch and sell fish', current: 3, total: 3, complete: false };

test('normalization counts actual completion independently of numeric progress', () => {
  const mission = { ...fish };
  const status = { missions: [mission], hint: 'Take your fish to the Fish Shop.', inventory: ['Fishing rod'] };
  const caught = normalizeMissionStatus(status);
  assert.deepEqual(caught, { ...status, completed: 0 });
  assert.equal(normalizeMissionStatus(status, caught), caught);

  mission.complete = true;
  status.hint = ' ';
  status.inventory.pop();
  const sold = normalizeMissionStatus(status, caught);
  assert.deepEqual(sold, { missions: [mission], completed: 1, hint: '', inventory: [] });
  assert.equal(caught.missions[0].complete, false);
  assert.deepEqual(caught.inventory, ['Fishing rod']);
  assert.deepEqual(normalizeMissionStatus({ missions: [] }), { missions: [], completed: 0, hint: '', inventory: [] });
});

test('normalization rejects invalid mission fields and duplicate IDs', () => {
  assert.throws(() => normalizeMissionStatus({}), /missions array/);
  assert.throws(() => normalizeMissionStatus({ missions: [], hint: [] }), /hint must be text/);
  assert.throws(() => normalizeMissionStatus({ missions: [], inventory: [''] }), /items must have names/);
  assert.throws(() => normalizeMissionStatus({ missions: [fish, { ...fish }] }), /nonempty and unique/);
  for (const [fields, message] of [
    [{ id: '' }, /nonempty and unique/],
    [{ title: '  ' }, /must have a title/],
    [{ current: -1 }, /progress/],
    [{ current: 4 }, /progress/],
    [{ current: 0.5 }, /progress/],
    [{ total: 0, current: 0 }, /progress/],
    [{ total: '3' }, /progress/],
    [{ complete: 1 }, /completion as true or false/],
  ]) {
    assert.throws(() => normalizeMissionStatus({ missions: [{ ...fish, ...fields }] }), message);
  }
});

test('every registered area provides a fresh mission status and releases its visit on travel', async t => {
  const camera = new THREE.PerspectiveCamera();
  const worlds = createWorldManager(THREE, { areas, camera, playerRadius: PLAYER_RADIUS });
  t.after(worlds.unload);
  const totalsByArea = new Map([
    ['garden', [3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]],
    ['snow', [5, 3, 1, 1, 1, 1, 3, 1, 1, 1]],
    ['wooden-house', [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]],
    ['frozen-castle', [4, 3, 3]],
    ['arendelle-village', [3, 1, 3]],
    ['waterfall-valley', [1, 1, 1, 3, 1, 2, 1, 3, 3]],
    ['secret-apartment', [2, 2, 5, 1, 1, 1, 1, 1, 1, 1, 1, 1]],
  ]);
  for (const id of Object.keys(areas).sort((a, b) => Number(areas[b].show) - Number(areas[a].show))) {
    const previous = worlds.active;
    const { area, scene } = await worlds.load(id);
    assert.ok(Array.isArray(area.obstacles), id);
    if (areas[id].missionCount > 0 || area.reset !== undefined) assert.equal(typeof area.reset, 'function', id);
    assert.ok(Array.isArray(area.interactions) && area.interactions.every(item => typeof item.act === 'function'), id);
    const status = normalizeMissionStatus(area.missionStatus);
    if (totalsByArea.has(id)) assert.deepEqual(status.missions.map(mission => mission.total), totalsByArea.get(id), id);
    assert.equal(status.missions.length, areas[id].missionCount, id);
    assert.equal(status.completed, 0, id);
    assert.ok(status.missions.every(mission => mission.current === 0), id);
    assert.equal(camera.parent, scene);
    if (previous) {
      assert.equal(previous.lifetime.signal.aborted, true);
      assert.deepEqual(previous.scene.children, []);
      assert.deepEqual(previous.viewmodel.children, []);
    }
  }
  assert.equal(areas[worlds.active.id].show, false);
});
