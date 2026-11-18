import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { snowBasin } from '../areas/snow-basin.js';
import { CHOP_COOLDOWN, CHOPS, FALL_DURATION, SNOWMAN_COUNT, sweepSphere, createSnowActivity, snowMissionsComplete } from '../areas/snow-basin/activity.js';
import { nearestInteraction } from '../core/interactions.js';
import { walkElevation } from '../core/movement.js';
import { createWorldManager } from '../core/world-manager.js';

const player = { x: 5.6, y: 1.68, z: -1.85 };

function activityFixture(options = {}) {
  return createSnowActivity({
    width: 32, depth: 30, spawn: snowBasin.spawn, obstacles: [], clearSpot: () => true, random: () => 0.96, ...options,
  });
}

test('snowmen and snowballs start active, while five chops and a complete fall reveal the key', () => {
  const cues = [];
  const activity = activityFixture({ cue: cue => cues.push(cue) });
  const { state, missions } = activity;
  const targets = state.targets;
  assert.equal(targets.length, SNOWMAN_COUNT);
  assert.deepEqual({ ...missions }, { snowmen: false, tree: false, key: false });
  assert.ok(activity.canMakeBall());
  assert.equal(activity.chop(), false);
  assert.equal(activity.pickUpKey(), false);
  assert.ok(activity.pickUpAxe());
  assert.equal(activity.pickUpAxe(), false);

  for (let count = 1; count <= CHOPS; count++) {
    assert.ok(activity.chop());
    assert.equal(activity.chop(), false, 'an extra key or tap during the chop is ignored');
    assert.equal(state.chops, count);
    assert.equal(state.tree, count < CHOPS ? 'upright' : 'falling');
    assert.equal(state.targets, targets);
    assert.equal(missions.tree, false);
    assert.equal(activity.pickUpKey(), false);
    if (count < CHOPS) activity.update(CHOP_COOLDOWN);
  }
  activity.update(FALL_DURATION - 0.01);
  assert.equal(state.tree, 'falling');
  assert.ok(activity.canMakeBall());
  assert.equal(missions.tree, false);
  assert.equal(activity.pickUpKey(), false);
  activity.update(0.02);
  assert.equal(state.tree, 'fallen');
  assert.equal(state.targets, targets);
  assert.ok(missions.tree);
  assert.equal(missions.key, false);
  assert.equal(activity.chop(), false);
  assert.ok(activity.pickUpKey());
  assert.equal(activity.pickUpKey(), false);
  assert.ok(state.hasFrozenKey);
  assert.deepEqual(cues, ['pickup', 'chop', 'chop', 'chop', 'chop', 'chop', 'fall', 'land', 'key']);
});

test('bounded jitter falls back to unique surveyed slots away from the starting position', () => {
  const clearSpot = (x, z) => Math.abs(x * 10 - Math.round(x * 10)) < 1e-6 &&
    Math.abs(z * 10 - Math.round(z * 10)) < 1e-6;
  for (const spawn of [{ x: -12.3, z: -11.4 }, { x: 11.8, z: 11.5 }, snowBasin.spawn]) {
    const activity = activityFixture({ clearSpot, spawn });
    const targets = activity.state.targets;
    assert.equal(targets.length, SNOWMAN_COUNT);
    for (const [i, target] of targets.entries()) {
      assert.ok(clearSpot(target.x, target.z));
      assert.ok(Math.hypot(target.x - spawn.x, target.z - spawn.z) >= 3.2);
      for (const other of targets.slice(i + 1)) {
        assert.ok(Math.hypot(target.x - other.x, target.z - other.z) >= 2.8);
      }
    }
  }
});

test('snowballs consume one held snowball and clear each target exactly once', () => {
  const activity = activityFixture();
  const { state } = activity;
  const direction = { x: 0, y: 0, z: -1 };
  for (const [i, target] of state.targets.entries()) {
    const origin = { x: target.x, y: 1.65, z: target.z + 3.2 };
    assert.ok(activity.makeBall());
    assert.equal(activity.makeBall(), false);
    assert.ok(activity.throwBall(origin, direction));
    assert.equal(state.held, false);
    assert.equal(activity.throwBall(origin, direction), false);
    activity.update(0.23);
    assert.equal(state.destroyed, i + 1);
    assert.equal(target.intact, false);
    assert.ok(activity.makeBall());
    assert.ok(activity.throwBall(origin, direction));
    activity.update(0.23);
    assert.equal(state.destroyed, i + 1, 'the broken snowman cannot score another hit');
    activity.update(2);
  }
  assert.ok(state.targets.every(target => !target.intact));

  assert.ok(activity.makeBall(), 'snow piles stay reusable after completion');
  assert.ok(activity.throwBall({ x: 15.5, y: 1.7, z: 0 }, { x: 1, y: 0, z: 0 }));
  activity.update(0.1);
  assert.equal(state.destroyed, SNOWMAN_COUNT);
  assert.deepEqual({ ...activity.missions }, { snowmen: true, tree: false, key: false });
  assert.ok(state.projectiles.every(ball => !ball.active));
  activity.reset();
  assert.equal(state.axe, false);
  assert.equal(state.held, false);
  assert.equal(state.chops, 0);
  assert.equal(state.tree, 'upright');
  assert.equal(state.destroyed, 0);
  assert.equal(state.targets.length, SNOWMAN_COUNT);
  assert.ok(state.targets.every(target => target.intact));
  assert.ok(activity.makeBall());
});

test('swept intersections detect fast hits and obstacles stop a throw before a snowman', () => {
  assert.equal(sweepSphere({ x: -3, y: 1, z: 0 }, { x: 5, y: 1, z: 0 }, 0, 1, 0, 1), 0.25);
  assert.equal(sweepSphere({ x: -3, y: 3, z: 0 }, { x: 5, y: 3, z: 0 }, 0, 1, 0, 1), Infinity);
  assert.equal(sweepSphere({ x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 0 }, 0, 1, 0, 1), 0);
  const obstacles = [];
  const activity = activityFixture({ obstacles });
  const target = activity.state.targets[0];
  obstacles.push({ left: target.x - 1, right: target.x + 1, front: target.z + 1, back: target.z + 1.5, height: 2 });
  activity.makeBall();
  activity.throwBall({ x: target.x, y: 1.6, z: target.z + 3 }, { x: 0, y: 0, z: -1 });
  activity.update(0.3);
  assert.ok(target.intact);
  assert.equal(activity.state.destroyed, 0);
  assert.ok(activity.state.projectiles.every(ball => !ball.active));
});

test('the projectile pool caps active throws and reset clears all slots', () => {
  const activity = activityFixture();
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

function buildWorld(saved = false) {
  const camera = new THREE.PerspectiveCamera();
  const target = new EventTarget();
  const completed = new Set(saved ? ['snow'] : []);
  const completions = [];
  const cues = [];
  const hud = new Element();
  hud.ownerDocument = { createElement: () => new Element(), defaultView: target };
  const worlds = createWorldManager(THREE, {
    areas: { snow: snowBasin, garden: { load: () => ({ obstacles: [] }) } },
    camera, touch: true, playerRadius: 0.34,
    services: {
      hud, isPlaying: () => true, isLevelComplete: id => completed.has(id),
      completeLevel(id) { completions.push(id); completed.add(id); },
      playCue: cue => cues.push(cue),
    },
  });
  const visit = worlds.load('snow');
  return { worlds, camera, target, hud, visit, completed, completions, cues };
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

test('every reset populates three reachable targets that stay put through the pine fall', () => {
  const { worlds, visit } = buildWorld();
  const { scene, area } = visit;
  const tree = scene.getObjectByName('Marked pine');
  const chop = area.interactions.find(item => item.label === 'Chop tree');
  assert.equal(chop.reachable({ x: 9 }), false);
  assert.equal(walkElevation(area, player, 7.5, -1.85, 2.3, false), null);
  assert.equal(walkElevation(area, player, 6.1, -1.85, 0, true), null);
  assert.equal(walkElevation(area, player, 5.8, -1.85, 0, true), null);
  assert.equal(walkElevation(area, player, 4.7, -1.85, 0, true), 0);

  const layouts = new Set();
  for (let cycle = 0; cycle < 12; cycle++) {
    worlds.reset();
    assert.equal(Math.abs(tree.rotation.z), 0);
    const snowmen = scene.children.filter(node => /^Snowman \d/.test(node.name));
    assert.equal(snowmen.length, SNOWMAN_COUNT);
    assert.ok(snowmen.every(model => model.visible));
    const positions = snowmen.map(model => model.position.clone());
    layouts.add(JSON.stringify(positions));
    for (const available of [reachableCells(area), (() => {
      fallInWorld(worlds);
      assert.equal(tree.rotation.z, -Math.PI / 2);
      assert.equal(walkElevation(area, player, 7.5, -1.85, 2.3, false), 2.3);
      return reachableCells(area);
    })()]) {
      for (const [i, model] of snowmen.entries()) {
        assert.ok(model.position.equals(positions[i]));
        const { x, z } = positions[i];
        assert.ok(Math.hypot(x - snowBasin.spawn.x, z - snowBasin.spawn.z) >= 3.2);
        assert.ok(Math.abs(x) >= 5.7 || Math.abs(z + 0.7) >= 6.0);
        assert.ok(available.some(cell => Math.hypot(cell.x - x, cell.z - z) < 1.7), `snowman at ${x},${z} must be reachable`);
      }
    }
  }
  assert.ok(layouts.size > 1);
  worlds.unload();
});

test('the pine can be chopped from several positions with a clear view and a protected landing', () => {
  const { worlds, visit, camera } = buildWorld();
  const { scene, area } = visit;
  const tree = scene.getObjectByName('Marked pine');
  assert.equal(scene.getObjectByName('Chop tree viewing zone'), undefined);
  const boundary = scene.getObjectByName('Pine clearance');
  const axe = visit.viewmodel.getObjectByName('Held axe');
  const axeHeight = axe.position.y;
  const chop = area.interactions.find(item => item.label === 'Chop tree');
  const positions = [{ x: -0.6, z: -4.1 }, { x: 0.7, z: 3.05 }, { x: 1.55, z: -0.05 }];
  const { x, z } = positions[0];
  assert.equal(chop.active, false);
  assert.equal(boundary.visible, true);
  area.interactions.find(item => item.label === 'Pick up axe').act();
  worlds.update(0, { x, z });
  for (const position of positions) {
    assert.equal(nearestInteraction(area.interactions, position), chop);
    assert.equal(walkElevation(area, position, position.x, position.z, 0, true), 0);
  }
  assert.equal(chop.reachable({ x: 4.67, z: -1.85 }), false);
  assert.equal(nearestInteraction([chop], { x: -5, z: -1.85 }), null);
  assert.equal(nearestInteraction([chop], { x: 14, z: -1.85 }), null);
  assert.ok(reachableCells(area).some(cell => chop.reachable(cell)));

  for (const [fov, aspect] of [[62, 16 / 9], [68, 412 / 915]]) {
    camera.fov = fov;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    camera.position.set(x, 1.68, z);
    camera.lookAt(chop.x, 3.28, chop.z);
    camera.updateMatrixWorld();
    for (const lean of [0, -Math.PI / 4, -Math.PI / 2]) {
      tree.rotation.z = lean;
      tree.updateMatrixWorld();
      for (const height of [0, 7.92]) {
        const screen = tree.localToWorld(new THREE.Vector3(0, height, 0)).project(camera);
        assert.ok(Math.abs(screen.x) < 1 && Math.abs(screen.y) < 1, `Tree endpoint at ${lean} in ${aspect}`);
      }
    }
  }

  for (let i = 0; i < CHOPS; i++) {
    assert.ok(chop.act());
    worlds.update(CHOP_COOLDOWN, { x, z });
  }
  assert.ok(boundary.visible);
  assert.ok(axe.position.y < axeHeight);
  assert.equal(walkElevation(area, { x, z }, 5.4, -1.85, 0, true), null);
  worlds.update(FALL_DURATION, { x, z });
  assert.equal(boundary.visible, false);
  assert.equal(chop.active, false);
  assert.equal(axe.position.y, axeHeight);
  assert.equal(walkElevation(area, { x, z }, 5.4, -1.85, 0, true), 0);
  worlds.reset();
  assert.ok(boundary.visible);
  assert.equal(chop.active, false);
  worlds.unload();
});

test('doors, reset and unload keep HUD, held objects and snow controls scoped to a visit', () => {
  const { worlds, camera, target, hud, visit } = buildWorld();
  const { area, scene, viewmodel } = visit;
  const panel = hud.children[0];
  const throwButton = panel.children.find(child => child.className === 'snow-throw');
  const notice = panel.children.find(child => child.className === 'snow-notice');
  const door = area.interactions.find(item => item.label === 'Enter Frozen Castle');
  const exit = area.interactions.find(item => item.label === 'Return to Flower Garden');
  const pickup = area.interactions.find(item => item.label === 'Pick up axe');
  let destination;
  door.act({ travel: id => { destination = id; } });
  assert.equal(destination, undefined);
  assert.equal(notice.textContent, '');
  assert.equal(door.active, false);
  assert.equal(scene.getObjectByName('Enter Frozen Castle').visible, false);
  exit.act({ travel: id => { destination = id; } });
  assert.equal(destination, 'garden');
  assert.equal(nearestInteraction(area.interactions, { x: 0.9, y: 1.68, z: 6.5 }), pickup);
  assert.match(area.objective, /^Snow Basin · 0\/3 missions\nMake a snowball \(0\/3 snowmen\) · Find the axe · Frozen Castle is still locked$/);
  pickup.act();
  assert.match(area.objective, /Chop the pine from the pond side \(0\/5\)/);
  worlds.reset();

  const pile = area.interactions.find(item => item.label === 'Make snowball');
  assert.ok(pile.act());
  assert.match(area.objective, /Throw at a snowman \(0\/3 snowmen\)/);
  assert.equal(throwButton.hidden, false);
  camera.position.set(-5, 1.68, 8);
  throwButton.dispatchEvent(Object.assign(new Event('pointerdown', { cancelable: true }), { pointerType: 'touch' }));
  throwButton.dispatchEvent(new Event('click'));
  worlds.update(0.01, camera.position);
  assert.equal(scene.children.filter(node => /^Snowball in flight/.test(node.name) && node.visible).length, 1);
  assert.equal(throwButton.hidden, true);
  assert.match(area.objective, /Make a snowball \(0\/3 snowmen\)/);
  assert.equal(viewmodel.getObjectByName('Held snowball').visible, false);

  worlds.reset();
  assert.ok(pickup.active);
  assert.match(area.objective, /^Snow Basin · 0\/3 missions\nMake a snowball \(0\/3 snowmen\) · Find the axe · Frozen Castle is still locked$/);
  assert.equal(notice.textContent, '');
  assert.equal(scene.children.some(node => /^Snowball in flight/.test(node.name) && node.visible), false);

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
  assert.equal(again.scene.children.filter(node => /^Snowman \d/.test(node.name) && node.visible).length, SNOWMAN_COUNT);
  assert.equal(hud.children.length, 1);
  worlds.unload();
});

test('each chop deepens the same trunk mesh and restart restores the starter notch', () => {
  const { worlds, visit } = buildWorld();
  const tree = visit.scene.getObjectByName('Marked pine');
  const positions = tree.getObjectByName('Marked trunk').geometry.getAttribute('position');
  const trees = tree.children.length;
  const notchEdge = () => {
    let edge = Infinity;
    for (let i = 0; i < positions.count; i++) {
      if (Math.abs(positions.getY(i) + 2.67 - 0.85) < 0.1) edge = Math.min(edge, positions.getX(i));
    }
    return edge;
  };
  const initial = notchEdge();
  let previous = initial;
  const { interactions } = visit.area;
  interactions.find(item => item.label === 'Pick up axe').act();
  const chop = interactions.find(item => item.label === 'Chop tree');
  for (let count = 0; count < CHOPS; count++) {
    assert.ok(chop.act());
    worlds.update(CHOP_COOLDOWN, player);
    const edge = notchEdge();
    assert.ok(edge > previous);
    assert.equal(tree.children.length, trees);
    previous = edge;
  }
  worlds.reset();
  assert.equal(notchEdge(), initial);
  worlds.unload();
});

function shootSnowmen({ visit, worlds, camera, target }, onHit) {
  const pile = visit.area.interactions.find(item => item.label === 'Make snowball');
  const snowmen = visit.scene.children.filter(node => /^Snowman \d/.test(node.name));
  const press = () => Object.assign(new Event('keydown', { cancelable: true }), { code: 'KeyF' });
  for (const [i, model] of snowmen.entries()) {
    const { x, z } = model.position;
    const position = [[x, z + 1.07], [x, z - 1.07], [x + 1.07, z], [x - 1.07, z]]
      .find(([sx, sz]) => walkElevation(visit.area, { x: sx, z: sz }, sx, sz, 0, true) === 0);
    assert.ok(position, 'the snowman has a clear standing position');
    assert.ok(pile.act());
    camera.position.set(position[0], 1.66, position[1]);
    camera.lookAt(x, 1.66, z);
    assert.equal(target.dispatchEvent(press()), false);
    worlds.update(0.08, camera.position);
    assert.equal(model.children[0].visible, false);
    onHit(i + 1);
  }
}

function count(area, finished) {
  assert.equal(area.objective.split('\n')[0], `Snow Basin · ${finished}/3 missions`);
}

test('tree and key can come first and the gate waits for the last snowman', () => {
  const game = buildWorld();
  const { worlds, visit, completed, completions, hud, cues } = game;
  const { area, scene } = visit;
  const castle = scene.getObjectByName('Enter Frozen Castle');
  const sparkles = castle.getObjectByName('Door unlock sparkles');
  const key = scene.getObjectByName('Frozen Key');
  const door = area.interactions.find(item => item.label === 'Enter Frozen Castle');
  const pickup = area.interactions.find(item => item.label === 'Pick up Frozen Key');
  const notice = hud.children[0].children.find(item => item.className === 'snow-notice');
  assert.equal(key.visible, false);
  assert.equal(pickup.active, false);
  assert.equal(pickup.act(), false);
  count(area, 0);
  fallInWorld(worlds);
  count(area, 1);
  assert.equal(castle.visible, false);
  assert.ok(key.visible && pickup.active);
  assert.match(area.objective, /0\/3 snowmen.*Find the Frozen Key/);
  assert.ok(reachableCells(area).some(pos => nearestInteraction([pickup], pos) === pickup));
  assert.ok(pickup.act());
  assert.equal(pickup.act(), false);
  count(area, 2);
  assert.equal(notice.textContent, 'Frozen Key collected!');
  assert.equal(key.visible, false);
  assert.equal(door.active, false);
  assert.equal(castle.visible, false);
  assert.equal(sparkles.visible, false);
  assert.equal(completed.has('snow'), false);
  assert.deepEqual(completions, []);
  door.act({ travel: () => assert.fail('an incomplete visit cannot travel') });
  shootSnowmen(game, (hits) => {
    count(area, hits === SNOWMAN_COUNT ? 3 : 2);
    assert.equal(completed.has('snow'), hits === SNOWMAN_COUNT);
  });
  assert.match(area.objective, /Snow Basin complete! Frozen Castle unlocked!/);
  assert.equal(notice.textContent, 'Frozen Castle unlocked!');
  assert.ok(door.active && castle.visible && sparkles.visible);
  const travelCalls = [];
  door.act({ heardCue: true, travel: (...args) => travelCalls.push(args) });
  assert.deepEqual(travelCalls, [['frozen-castle', true]]);
  worlds.update(3.1, player);
  assert.equal(notice.textContent, '');
  assert.equal(sparkles.visible, false);
  assert.equal(cues.at(-1).length, 4, 'the full completion plays its own cue');
  assert.deepEqual(completions, ['snow']);
  worlds.reset();
  count(area, 0);
  assert.ok(door.active && castle.visible);
  assert.equal(sparkles.visible, false);
  assert.equal(key.visible, false);
  assert.equal(pickup.active, false);
  assert.equal(notice.textContent, '');
  worlds.unload();
});

test('snowmen can be cleared first and never unlock the castle or complete the level alone', () => {
  const game = buildWorld();
  const { worlds, visit, completions } = game;
  const { area, scene } = visit;
  const door = area.interactions.find(item => item.label === 'Enter Frozen Castle');
  const pickup = area.interactions.find(item => item.label === 'Pick up Frozen Key');
  shootSnowmen(game, hits => {
    count(area, hits === SNOWMAN_COUNT ? 1 : 0);
    assert.equal(door.active, false);
    assert.equal(Math.abs(scene.getObjectByName('Marked pine').rotation.z), 0);
    assert.equal(completions.length, 0);
  });
  assert.match(area.objective, /Find the axe/);
  assert.doesNotMatch(area.objective, /snowmen/);
  fallInWorld(worlds);
  count(area, 2);
  assert.match(area.objective, /Find the Frozen Key/);
  assert.equal(door.active, false);
  assert.deepEqual(completions, []);
  assert.ok(pickup.act());
  assert.equal(pickup.act(), false);
  count(area, 3);
  assert.ok(door.active);
  assert.deepEqual(completions, ['snow']);
  worlds.unload();
});

test('a legacy Snow Basin completion keeps Frozen Castle available on replay', () => {
  const { worlds, visit, completed, completions } = buildWorld(true);
  function checkVisit(areaVisit) {
    count(areaVisit.area, 0);
    assert.ok(areaVisit.scene.getObjectByName('Enter Frozen Castle').visible);
    assert.equal(areaVisit.scene.getObjectByName('Door unlock sparkles').visible, false);
    assert.ok(areaVisit.scene.getObjectByName('Snow Basin axe').visible);
    assert.equal(areaVisit.scene.getObjectByName('Frozen Key').visible, false);
    assert.equal(areaVisit.scene.children.filter(node => /^Snowman \d/.test(node.name) && node.visible).length, SNOWMAN_COUNT);
    assert.ok(completed.has('snow'));
  }
  checkVisit(visit);
  worlds.load('garden');
  checkVisit(worlds.load('snow'));
  assert.deepEqual(completions, []);
  worlds.unload();
});

test('the Snow Basin gate requires every mission flag, including combinations unreachable during normal play', () => {
  for (const snowmen of [false, true]) {
    for (const tree of [false, true]) {
      for (const key of [false, true]) {
        const missions = { snowmen, tree, key };
        assert.equal(snowMissionsComplete(missions), Object.values(missions).every(Boolean), JSON.stringify(missions));
      }
    }
  }
});
