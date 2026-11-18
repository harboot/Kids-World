import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { snowBasin } from '../areas/snow-basin.js';
import { CHOP_COOLDOWN, CHOPS, FALL_DURATION, sweepSphere, createSnowActivity } from '../areas/snow-basin/activity.js';
import { nearestInteraction } from '../core/interactions.js';
import { walkElevation } from '../core/movement.js';
import { createWorldManager } from '../core/world-manager.js';

const player = { x: 5.6, y: 1.68, z: -1.85 };

function activityFixture(options = {}) {
  return createSnowActivity({
    width: 32, depth: 30, obstacles: [], clearSpot: () => true, random: () => 0.96, ...options,
  });
}

function finishChops(activity, position = player) {
  assert.ok(activity.pickUpAxe());
  for (let i = 0; i < CHOPS; i++) {
    assert.ok(activity.chop());
    if (i < CHOPS - 1) activity.update(CHOP_COOLDOWN, position);
  }
}

test('pickup and chops are gated and only a finished fifth-chop fall creates snowmen', () => {
  const cues = [];
  const activity = activityFixture({ cue: cue => cues.push(cue) });
  const { state } = activity;
  assert.equal(activity.chop(), false);
  assert.equal(activity.makeBall(), false);
  assert.ok(activity.pickUpAxe());
  assert.equal(activity.pickUpAxe(), false);

  for (let count = 1; count <= CHOPS; count++) {
    assert.ok(activity.chop());
    assert.equal(activity.chop(), false, 'an extra key or tap during the chop is ignored');
    assert.equal(state.chops, count);
    assert.equal(state.tree, count < CHOPS ? 'upright' : 'falling');
    assert.equal(state.targets.length, 0);
    if (count < CHOPS) activity.update(CHOP_COOLDOWN, player);
  }
  activity.update(FALL_DURATION - 0.01, player);
  assert.equal(state.tree, 'falling');
  assert.equal(activity.makeBall(), false);
  assert.equal(state.targets.length, 0);
  activity.update(0.02, player);
  assert.equal(state.tree, 'fallen');
  assert.equal(state.targets.length, 5);
  assert.equal(activity.chop(), false);
  assert.deepEqual(cues, ['pickup', 'chop', 'chop', 'chop', 'chop', 'chop', 'fall', 'spawn']);
});

test('bounded jitter falls back to unique surveyed slots away from the player', () => {
  const clearSpot = (x, z) => Math.abs(x * 10 - Math.round(x * 10)) < 1e-6 &&
    Math.abs(z * 10 - Math.round(z * 10)) < 1e-6;
  for (const position of [{ x: -12.3, z: -11.4 }, { x: 11.8, z: 11.5 }, player]) {
    const activity = activityFixture({ clearSpot });
    finishChops(activity, position);
    activity.update(FALL_DURATION, position);
    const targets = activity.state.targets;
    assert.equal(targets.length, 5);
    for (const [i, target] of targets.entries()) {
      assert.ok(clearSpot(target.x, target.z));
      assert.ok(Math.hypot(target.x - position.x, target.z - position.z) >= 3.2);
      for (const other of targets.slice(i + 1)) {
        assert.ok(Math.hypot(target.x - other.x, target.z - other.z) >= 2.8);
      }
    }
  }
});

test('snowballs consume one held snowball and clear each target exactly once', () => {
  const activity = activityFixture();
  finishChops(activity);
  activity.update(FALL_DURATION, player);
  const { state } = activity;
  const direction = { x: 0, y: 0, z: -1 };
  for (const [i, target] of state.targets.entries()) {
    const origin = { x: target.x, y: 1.65, z: target.z + 3.2 };
    assert.ok(activity.makeBall());
    assert.equal(activity.makeBall(), false);
    assert.ok(activity.throwBall(origin, direction));
    assert.equal(state.held, false);
    assert.equal(activity.throwBall(origin, direction), false);
    activity.update(0.23, player);
    assert.equal(state.destroyed, i + 1);
    assert.equal(target.intact, false);
    assert.ok(activity.makeBall());
    assert.ok(activity.throwBall(origin, direction));
    activity.update(0.23, player);
    assert.equal(state.destroyed, i + 1, 'the broken snowman cannot score another hit');
    activity.update(2, player);
  }
  assert.ok(state.targets.every(target => !target.intact));

  assert.ok(activity.makeBall(), 'snow piles stay reusable after completion');
  assert.ok(activity.throwBall({ x: 15.5, y: 1.7, z: 0 }, { x: 1, y: 0, z: 0 }));
  activity.update(0.1, player);
  assert.equal(state.destroyed, 5);
  assert.ok(state.projectiles.every(ball => !ball.active));
  activity.reset();
  assert.equal(state.axe, false);
  assert.equal(state.held, false);
  assert.equal(state.chops, 0);
  assert.equal(state.tree, 'upright');
  assert.equal(state.destroyed, 0);
  assert.deepEqual(state.targets, []);
  assert.equal(activity.makeBall(), false);
});

test('swept intersections detect fast hits and obstacles stop a throw before a snowman', () => {
  assert.equal(sweepSphere({ x: -3, y: 1, z: 0 }, { x: 5, y: 1, z: 0 }, 0, 1, 0, 1), 0.25);
  assert.equal(sweepSphere({ x: -3, y: 3, z: 0 }, { x: 5, y: 3, z: 0 }, 0, 1, 0, 1), Infinity);
  assert.equal(sweepSphere({ x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 0 }, 0, 1, 0, 1), 0);
  const obstacles = [];
  const activity = activityFixture({ obstacles });
  finishChops(activity);
  activity.update(FALL_DURATION, player);
  const target = activity.state.targets[0];
  obstacles.push({ left: target.x - 1, right: target.x + 1, front: target.z + 1, back: target.z + 1.5, height: 2 });
  activity.makeBall();
  activity.throwBall({ x: target.x, y: 1.6, z: target.z + 3 }, { x: 0, y: 0, z: -1 });
  activity.update(0.3, player);
  assert.ok(target.intact);
  assert.equal(activity.state.destroyed, 0);
  assert.ok(activity.state.projectiles.every(ball => !ball.active));
});

test('the projectile pool caps active throws and reset clears all slots', () => {
  const activity = activityFixture();
  finishChops(activity);
  activity.update(FALL_DURATION, player);
  const origin = { x: 0, y: 1.68, z: 0 };
  const direction = { x: 0, y: 0.8, z: -0.6 };
  for (let shot = 0; shot < 3; shot++) {
    assert.ok(activity.makeBall());
    assert.ok(activity.throwBall(origin, direction));
  }
  assert.ok(activity.makeBall());
  assert.equal(activity.throwBall(origin, direction), false);
  assert.equal(activity.state.held, true);
  assert.equal(activity.state.projectiles.filter(ball => ball.active).length, 3);
  activity.reset();
  assert.ok(activity.state.projectiles.every(ball => !ball.active));
  assert.equal(activity.state.held, false);
});

class Element extends EventTarget {
  children = [];
  parent = null;

  append(child) {
    child.parent = this;
    this.children.push(child);
  }

  remove() {
    this.parent.children.splice(this.parent.children.indexOf(this), 1);
  }

  setAttribute() {}
}

function buildWorld() {
  const camera = new THREE.PerspectiveCamera();
  const target = new EventTarget();
  const hud = new Element();
  hud.ownerDocument = { createElement: () => new Element(), defaultView: target };
  const worlds = createWorldManager(THREE, {
    areas: { snow: snowBasin, garden: { load: () => ({ obstacles: [] }) } },
    camera, touch: true, playerRadius: 0.34,
    services: { hud, isPlaying: () => true },
  });
  const visit = worlds.load('snow');
  return { worlds, camera, target, hud, visit };
}

function fallInWorld(worlds, position = player) {
  const { interactions } = worlds.active.area;
  const pickup = interactions.find(item => item.label === 'Pick up axe');
  const chop = interactions.find(item => item.label === 'Chop tree');
  pickup.act();
  for (let i = 0; i < CHOPS; i++) {
    assert.ok(chop.act());
    if (i < CHOPS - 1) worlds.update(CHOP_COOLDOWN, position);
  }
  worlds.update(FALL_DURATION, position);
}

function reachableCells(area) {
  const key = ({ x, z }) => x + ',' + z;
  const reached = new Set();
  const start = { x: 0, z: 8 };
  const queue = [start];
  reached.add(key(start));
  for (const { x, z } of queue) {
    for (const [dx, dz] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) {
      const next = { x: x + dx, z: z + dz };
      if (Math.abs(next.x) > 15.5 || Math.abs(next.z) > 14.5 || reached.has(key(next))) continue;
      if (walkElevation(area, { x, z }, next.x, next.z, 0, true) === null) continue;
      reached.add(key(next));
      queue.push(next);
    }
  }
  return queue;
}

test('the actual winter layout produces five reachable targets and replaces the trunk with a low obstacle', () => {
  const { worlds, visit } = buildWorld();
  const { scene, area } = visit;
  const tree = scene.getObjectByName('Marked pine');
  const chop = area.interactions.find(item => item.label === 'Chop tree');
  assert.equal(chop.reachable({ x: 9 }), false);
  assert.equal(walkElevation(area, player, 7.5, -1.85, 2.3, false), null);

  for (let cycle = 0; cycle < 12; cycle++) {
    worlds.reset();
    assert.equal(Math.abs(tree.rotation.z), 0);
    assert.equal(scene.children.filter(node => /^Snowman \d/.test(node.name) && node.visible).length, 0);
    const position = cycle % 2 ? { x: -12.3, z: -11.4 } : player;
    fallInWorld(worlds, position);
    const snowmen = scene.children.filter(node => /^Snowman \d/.test(node.name) && node.visible);
    assert.equal(snowmen.length, 5);
    assert.equal(tree.rotation.z, -Math.PI / 2);
    assert.equal(walkElevation(area, player, 7.5, -1.85, 2.3, false), 2.3);
    const accessible = reachableCells(area);
    for (const model of snowmen) {
      const { x, z } = model.position;
      assert.ok(Math.hypot(x - position.x, z - position.z) >= 3.2);
      assert.ok(Math.abs(x) >= 5.7 || Math.abs(z + 0.7) >= 6.0);
      assert.ok(accessible.some(cell => Math.hypot(cell.x - x, cell.z - z) < 1.7), `snowman at ${x},${z} must be reachable`);
    }
  }
  worlds.unload();
});

test('doors, reset and unload keep HUD, held objects and snow controls scoped to a visit', () => {
  const { worlds, camera, target, hud, visit } = buildWorld();
  const { area, scene, viewmodel } = visit;
  const panel = hud.children[0];
  const throwButton = panel.children.find(child => child.className === 'snow-throw');
  const progress = panel.children.find(child => child.className === 'snow-progress');
  const notice = panel.children.find(child => child.className === 'snow-notice');
  const door = area.interactions.find(item => item.label === 'Frozen Castle');
  const exit = area.interactions.find(item => item.label === 'Return to Flower Garden');
  const pickup = area.interactions.find(item => item.label === 'Pick up axe');
  let destination;
  door.act({ travel: id => { destination = id; } });
  assert.equal(destination, undefined);
  assert.equal(notice.textContent, 'Frozen Castle — Coming Soon');
  exit.act({ travel: id => { destination = id; } });
  assert.equal(destination, 'garden');
  assert.equal(nearestInteraction(area.interactions, { x: 0.9, y: 1.68, z: 6.5 }), pickup);

  fallInWorld(worlds);
  assert.equal(progress.textContent, 'Snowmen: 0 / 5');
  const pile = area.interactions.find(item => item.label === 'Make snowball');
  assert.ok(pile.act());
  assert.equal(throwButton.hidden, false);
  camera.position.set(-5, 1.68, 8);
  throwButton.dispatchEvent(Object.assign(new Event('pointerdown', { cancelable: true }), { pointerType: 'touch' }));
  throwButton.dispatchEvent(new Event('click'));
  worlds.update(0.01, camera.position);
  assert.equal(scene.children.filter(node => /^Snowball in flight/.test(node.name) && node.visible).length, 1);
  assert.equal(throwButton.hidden, true);
  assert.equal(viewmodel.getObjectByName('Held snowball').visible, false);

  worlds.reset();
  assert.ok(pickup.active);
  assert.equal(progress.hidden, true);
  assert.equal(notice.textContent, '');
  assert.equal(scene.children.some(node => /^Snowball in flight/.test(node.name) && node.visible), false);

  fallInWorld(worlds);
  pile.act();
  const press = () => Object.assign(new Event('keydown', { cancelable: true }), { code: 'KeyF', repeat: false });
  assert.equal(target.dispatchEvent(press()), false);
  worlds.load('garden');
  assert.equal(hud.children.length, 0);
  assert.equal(visit.lifetime.signal.aborted, true);
  assert.equal(target.dispatchEvent(press()), true);
  assert.equal(scene.children.length, 0);
  const again = worlds.load('snow');
  assert.ok(again.area.interactions.find(item => item.label === 'Pick up axe').active);
  assert.equal(again.scene.children.some(node => /^Snowman \d/.test(node.name) && node.visible), false);
  assert.equal(hud.children.length, 1);
  worlds.unload();
});
