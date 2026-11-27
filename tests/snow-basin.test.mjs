import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { areas } from '../game.js';
import { snowBasin } from '../areas/snow-basin/index.js';
import {
  CHOP_COOLDOWN, CHOPS, FALL_DURATION, SNOWBALL_RELOAD, SNOWBALL_STATION, SNOWMAN_COUNT, THROWING_POSITION,
  createSnowActivity, snowMissionsComplete, sweepSphere,
} from '../areas/snow-basin/activity.js';
import { CABIN, FIREPLACE } from '../areas/snow-basin/cabin.js';
import { SKATE_SITE, SKATE_CHECKPOINTS } from '../areas/snow-basin/skating.js';
import { ICE_TOWER, towerStairPoint } from '../areas/snow-basin/ice-tower.js';
import { ICE_HILLS, LAKE_LEVEL, MOUNTAIN_TRAIL } from '../areas/snow-basin/terrain.js';
import { SLIDE_START, SLIDE_PATH, SLIDE_LANDING, SLIDE_PLATFORM } from '../areas/snow-basin/slide.js';
import { nearestInteraction } from '../core/interactions.js';
import { createLevelProgress } from '../core/level-progress.js';
import { walkElevation } from '../core/movement.js';
import { createPlayer, EYE_HEIGHT } from '../core/player.js';
import { createWorldManager, resolveArea } from '../core/world-manager.js';
import { missionHudFixture } from './helpers/mission-hud.mjs';

const player = { x: 5.6, y: EYE_HEIGHT, z: -1.85 };
const throwingEye = { ...THROWING_POSITION, y: EYE_HEIGHT };
const forward = { x: -1, y: 0, z: 0 };
const pressF = () => Object.assign(new Event('keydown', { cancelable: true }), { code: 'KeyF' });

function activityFixture(options = {}) {
  return createSnowActivity({ width: 64, depth: 60, obstacles: [], ...options });
}

test('the pine requires an axe, five successful chops, and the full fall', () => {
  const cues = [];
  const activity = activityFixture({ cue: name => cues.push(name) });
  const { state, missions } = activity;
  assert.equal(activity.chop(), false);
  assert.ok(activity.pickUpAxe());
  assert.equal(activity.pickUpAxe(), false);
  for (let i = 1; i <= CHOPS; i++) {
    assert.ok(activity.chop());
    assert.equal(activity.chop(), false);
    assert.equal(state.chops, i);
    assert.equal(state.tree, i < CHOPS ? 'upright' : 'falling');
    assert.equal(missions.pine, false);
    if (i < CHOPS) activity.update(CHOP_COOLDOWN);
  }
  activity.update(FALL_DURATION - 0.01);
  assert.equal(missions.pine, false);
  activity.update(0.02);
  assert.equal(state.tree, 'fallen');
  assert.equal(missions.pine, true);
  assert.deepEqual(cues, ['pickup', 'chop', 'chop', 'chop', 'chop', 'chop', 'fall', 'land']);
  activity.reset();
  assert.equal(state.axe, false);
  assert.equal(state.chops, 0);
  assert.equal(state.tree, 'upright');
  assert.equal(missions.pine, false);
});

test('swept hits, gravity and obstacle collisions work at the longer arena distance', () => {
  assert.equal(sweepSphere({ x: -3, y: 1, z: 0 }, { x: 5, y: 1, z: 0 }, 0, 1, 0, 1), 0.25);
  assert.equal(sweepSphere({ x: -3, y: 3, z: 0 }, { x: 5, y: 3, z: 0 }, 0, 1, 0, 1), Infinity);
  const obstacles = [{ left: -25.2, right: -24.4, front: 2.5, back: 4, height: 2 }];
  const activity = activityFixture({ obstacles });
  const middle = activity.state.targets[1];
  activity.update(0, throwingEye);
  assert.ok(activity.throwBall(throwingEye, forward));
  const ball = activity.state.projectiles[0];
  activity.update(0.07, throwingEye);
  assert.ok(ball.vy < 0.9);
  activity.update(0.07, throwingEye);
  const firstY = ball.y;
  activity.update(0.07, throwingEye);
  assert.ok(ball.y < firstY);
  activity.update(0.33, throwingEye);
  assert.ok(middle.intact);
  assert.ok(!ball.active);
  obstacles.length = 0;
  assert.ok(activity.throwBall(throwingEye, forward));
  activity.update(0.42, throwingEye);
  assert.equal(middle.intact, false);
  assert.equal(activity.state.destroyed, 1);
  activity.update(0.1, throwingEye);
  assert.ok(activity.throwBall(throwingEye, forward));
  activity.update(0.42, throwingEye);
  assert.equal(activity.state.destroyed, 1);
});

test('the projectile pool stays bounded under rapid throws and reset clears it', () => {
  const activity = activityFixture();
  const direction = { x: 0, y: 0.8, z: -0.6 };
  activity.update(0, throwingEye);
  for (let shot = 0; shot < 3; shot++) {
    assert.ok(activity.throwBall(throwingEye, direction));
    activity.update(SNOWBALL_RELOAD, throwingEye);
  }
  assert.equal(activity.state.projectiles.filter(ball => ball.active).length, 3);
  assert.equal(activity.throwBall(throwingEye, direction), false);
  assert.ok(activity.state.held);
  activity.reset();
  assert.ok(activity.state.projectiles.every(ball => !ball.active));
  assert.ok(activity.state.targets.every(target => target.intact));
  assert.equal(activity.state.held, false);
});

class Element extends EventTarget {
  children = [];
  parent = null;
  hidden = false;

  append(child) {
    child.parent = this;
    this.children.push(child);
  }

  remove() {
    this.parent.children.splice(this.parent.children.indexOf(this), 1);
  }

  setAttribute() {}
}

async function buildWorld({ reducedMotion = () => false, saved = [] } = {}) {
  const camera = new THREE.PerspectiveCamera();
  const avatar = createPlayer(THREE, camera);
  const target = new EventTarget();
  const canvas = new EventTarget();
  const completions = [];
  const cues = [];
  let stored = JSON.stringify(saved);
  const storage = { getItem: () => stored, setItem(_key, value) { stored = value; } };
  const progress = createLevelProgress(areas, () => storage);
  const missionHud = missionHudFixture();
  const hud = new Element();
  const document = { createElement: () => new Element(), defaultView: target, pointerLockElement: null };
  hud.ownerDocument = document;
  hud.querySelector = selector => selector === '#view' ? canvas : null;
  let playing = true;
  const worlds = createWorldManager(THREE, {
    areas: { snow: areas.snow, garden: {
      ...areas.garden,
      async loadModule() { return { default: { ...areas.garden, load: () => ({ obstacles: [] }) } }; },
    } },
    camera, touch: true, playerRadius: 0.34,
    services: {
      hud, reducedMotion, isPlaying: () => playing, isPlayerGrounded: () => avatar.grounded, isLevelComplete: progress.has,
      completeLevel(id) { completions.push(id); progress.complete(id); },
      playCue: cue => cues.push(cue),
      notify: missionHud.notify,
    },
  });
  const visit = await worlds.load('snow');
  stand(visit.definition.spawn);

  function stand(spawn) {
    avatar.reset(spawn, worlds.active.area);
  }
  function guideCamera(look) {
    const current = worlds.active;
    const stop = avatar.guide(look);
    return spawn => {
      if (worlds.active === current && current.state === 'active' && stop()) stand(spawn);
    };
  }
  return {
    worlds, camera, avatar, target, canvas, document, hud, visit, progress, completions, cues, missionHud, stand, guideCamera,
    setPlaying(value) { playing = value; },
    frame(dt) { if (playing) worlds.update(dt, camera.position); },
    records: () => JSON.parse(stored),
  };
}

function assertProgress(area, { snowmen = 0, chops = 0, slide = 0, olaf = 0, sven = 0, tower = 0, skating = 0, cabin = 0, pineFallen = chops === CHOPS } = {}) {
  assert.deepEqual(area.missionStatus.missions, [
    { id: 'pine', title: 'Chop Down the Pine', current: chops, total: 5, complete: pineFallen },
    { id: 'snowmen', title: 'Snowball Challenge', current: snowmen, total: 3, complete: snowmen === 3 },
    { id: 'slide', title: 'Ice Slide Adventure', current: slide, total: 1, complete: slide === 1 },
    { id: 'olaf', title: 'Meet Olaf', current: olaf, total: 1, complete: olaf === 1 },
    { id: 'sven', title: 'Feed Sven', current: sven, total: 1, complete: sven === 1 },
    { id: 'tower', title: 'Ice Tower Lookout', current: tower, total: 1, complete: tower === 1 },
    { id: 'skating', title: 'Ice Skating Challenge', current: skating, total: 3, complete: skating === 3 },
    { id: 'cabin', title: 'Warm Up the Cabin', current: cabin, total: 1, complete: cabin === 1 },
  ]);
}

function fallInWorld(worlds, position = player) {
  const { interactions } = worlds.active.area;
  assert.ok(interactions.find(item => item.label === 'Pick up axe').act());
  const chop = interactions.find(item => item.label === 'Chop tree');
  for (let i = 0; i < CHOPS; i++) {
    assert.ok(chop.act());
    if (i < CHOPS - 1) worlds.update(CHOP_COOLDOWN, position);
  }
  worlds.update(FALL_DURATION, position);
}

function targetsIn(scene) {
  return scene.children.filter(node => /^Snowman \d/.test(node.name));
}

function aimFromStation(game, model) {
  game.stand(THROWING_POSITION);
  game.camera.lookAt(model.position.x, EYE_HEIGHT, model.position.z);
  game.frame(0);
}

function shootSnowmen(game) {
  const models = targetsIn(game.visit.scene);
  for (const model of models) {
    aimFromStation(game, model);
    assert.equal(game.target.dispatchEvent(pressF()), false, 'F launches once from the station');
    for (let i = 0; i < 31; i++) game.frame(1 / 60);
    assert.equal(model.children[0].visible, false, model.name);
  }
}
function reachableCells(area, width = 32, depth = 30) {
  const key = ({ x, z }) => x + ',' + z;
  const reached = new Set();
  const start = { x: 0, z: 8 };
  const queue = [start];
  reached.add(key(start));
  for (const { x, z } of queue) {
    for (const [dx, dz] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) {
      const next = { x: x + dx, z: z + dz };
      if (Math.abs(next.x) >= width / 2 || Math.abs(next.z) >= depth / 2 || reached.has(key(next))) continue;
      if (walkElevation(area, { x, z }, next.x, next.z, area.getGroundHeight(x, z), true) === null) continue;
      reached.add(key(next));
      queue.push(next);
    }
  }
  return queue;
}

test('the pine can be chopped from several positions with a clear view and a protected landing', async () => {
  const { worlds, visit, camera } = await buildWorld();
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
  const ring = boundary.geometry.parameters.outerRadius;
  const near = { x: chop.x - ring - 0.06, z: chop.z };
  assert.equal(nearestInteraction(area.interactions, near), chop);
  assert.equal(walkElevation(area, near, chop.x - ring + 0.06, chop.z, area.getGroundHeight(near.x, near.z), true), null);
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

test('each chop deepens the same trunk mesh and restart restores the starter notch', async () => {
  const { worlds, visit } = await buildWorld();
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
    assertProgress(visit.area, { chops: count + 1, pineFallen: false });
    const edge = notchEdge();
    assert.ok(edge > previous);
    assert.equal(tree.children.length, trees);
    previous = edge;
  }
  assert.equal(visit.area.missionStatus.hint, 'Watch the pine fall.');
  worlds.reset();
  assert.equal(notchEdge(), initial);
  worlds.unload();
});

test('the expanded basin connects the original spawn to each zone and climbs the marked trail', async () => {
  const { worlds, visit } = await buildWorld();
  const { area, scene } = visit;
  const { width, depth, spawn } = snowBasin;
  assert.deepEqual([width, depth, spawn], [64, 60, { x: 0, z: 9.4 }]);
  assert.equal(walkElevation(area, spawn, spawn.x, spawn.z, 0, true), 0);

  const reached = reachableCells(area, width, depth);
  for (const [x, z] of [[17, -12], [23, 5], [-23, 4], [-4, 18], [-3, -24], [-27, -20.5]]) {
    assert.ok(reached.some(point => point.x === x && point.z === z), `route to (${x}, ${z})`);
  }
  for (const name of ['Sven', 'Olaf', 'Kristoff']) {
    const { x, z } = scene.getObjectByName(name).position;
    assert.ok(reached.some(point => Math.hypot(point.x - x, point.z - z) < 4), name);
  }

  function walkTrail(trail) {
    let [x, z] = trail[0];
    let feet = area.getGroundHeight(x, z);
    for (const [nextX, nextZ] of trail.slice(1)) {
      const startX = x;
      const startZ = z;
      const steps = Math.ceil(Math.hypot(nextX - x, nextZ - z) / 0.12);
      for (let i = 1; i <= steps; i++) {
        const px = startX + (nextX - startX) * i / steps;
        const pz = startZ + (nextZ - startZ) * i / steps;
        const floor = walkElevation(area, { x, z }, px, pz, feet, true);
        assert.ok(floor !== null, `trail blocked at (${px}, ${pz})`);
        assert.equal(floor, area.getGroundHeight(px, pz));
        x = px;
        z = pz;
        feet = floor;
      }
    }
    return feet;
  }
  assert.ok(Math.abs(walkTrail(MOUNTAIN_TRAIL) - 8.1) < 1e-5);
  assert.equal(walkTrail(MOUNTAIN_TRAIL.slice().reverse()), 0);
  assert.ok(area.blocksGround(-4, -18, 0.34, 0), 'steep south face has no climbing shortcut');
  for (const [x, z] of [[-32, 0], [32, 0], [0, -30], [0, 30]]) {
    assert.ok(area.blocksGround(x, z, 0.34, 0));
  }

  scene.updateMatrixWorld(true);
  const mesh = scene.getObjectByName('Snow Basin terrain');
  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  for (const [x, z] of [[12.92, -25.4], [8.43, -26.71], [2.42, -24.55], [-5.61, -18.37], [23.2, 7.3]]) {
    ray.set(new THREE.Vector3(x, 20, z), down);
    const [surface] = ray.intersectObject(mesh);
    assert.ok(Math.abs(surface.point.y - area.getGroundHeight(x, z)) < 1e-5);
  }
  worlds.unload();
});

test('the ice slide follows an ordered descent with an accessible platform and open runout', async () => {
  const { worlds, visit } = await buildWorld();
  const { scene, area } = visit;
  const slide = scene.getObjectByName('Ice Mountain slide');
  const platform = slide.getObjectByName('Ice slide starting platform');
  assert.equal(SLIDE_PATH[0], SLIDE_START);
  assert.equal(SLIDE_PATH.at(-1), SLIDE_LANDING);
  assert.ok(Object.isFrozen(SLIDE_PATH));
  assert.ok(SLIDE_START.y - SLIDE_LANDING.y >= 7 && SLIDE_START.y - SLIDE_LANDING.y <= 9);
  let length = 0;
  for (const [i, point] of SLIDE_PATH.entries()) {
    assert.ok(Object.isFrozen(point));
    assert.ok(point.y > area.getGroundHeight(point.x, point.z));
    if (i) {
      const previous = SLIDE_PATH[i - 1];
      assert.ok(point.y < previous.y);
      length += Math.hypot(point.x - previous.x, point.y - previous.y, point.z - previous.z);
    }
  }
  assert.ok(Math.abs(length / 22.91152 - 3) < 0.02);
  const approach = { x: -3, z: SLIDE_START.z };
  const feet = area.getGroundHeight(approach.x, approach.z);
  const deck = walkElevation(area, approach, platform.position.x, approach.z, feet, true);
  assert.ok(Math.abs(deck - SLIDE_START.y) < 0.05);
  assert.equal(walkElevation(area, approach, SLIDE_START.x + 0.2, approach.z, feet, true), null);
  assert.equal(walkElevation(area, approach, SLIDE_START.x + 0.2, approach.z, feet + 0.8, false), null);
  const exit = { x: SLIDE_LANDING.x, z: SLIDE_LANDING.z + 1.2 };
  assert.ok(walkElevation(area, exit, SLIDE_LANDING.x, SLIDE_LANDING.z, 0, true) !== null);
  const action = area.interactions.find(item => item.label === 'Slide Down');
  assert.equal(nearestInteraction(area.interactions, { ...SLIDE_PLATFORM, y: feet + EYE_HEIGHT }), action);
  assert.equal(nearestInteraction(area.interactions, { ...SLIDE_PLATFORM, y: EYE_HEIGHT }), null);
  assertProgress(area);
  worlds.unload();
});

test('Sven, Olaf and Kristoff react on approach and can greet again after the player leaves', async t => {
  let still = false;
  const game = await buildWorld({ reducedMotion: () => still });
  const { visit, cues, worlds, missionHud } = game;
  t.after(worlds.unload);
  const { scene, area } = visit;
  for (const label of ['Pet Sven', 'Greet Olaf', 'Talk to Kristoff']) {
    assert.ok(!area.interactions.some(item => item.label === label));
  }
  const kristoff = scene.getObjectByName('Kristoff').position;
  game.stand({ x: kristoff.x, z: kristoff.z - 5.1 });
  game.frame(0);
  assert.doesNotMatch(missionHud.toast.textContent, /Kristoff/);
  game.stand({ x: kristoff.x, z: kristoff.z - 4.1 });
  game.frame(0.2);
  assert.match(missionHud.toast.textContent, /blue trail markers/);
  game.frame(0.2);
  assert.equal(missionHud.notifications.filter(message => message.startsWith('Kristoff')).length, 1);
  game.stand({ x: kristoff.x, z: kristoff.z - 5.2 });
  game.frame(0);
  game.stand({ x: kristoff.x, z: kristoff.z - 4.1 });
  game.frame(0.2);
  assert.equal(missionHud.notifications.filter(message => message.startsWith('Kristoff')).length, 2);

  for (const [i, name, joint, axis] of [
    [0, 'Sven', 'Sven head', 'x'], [1, 'Olaf', 'Olaf body', 'y'],
  ]) {
    const { x, z } = scene.getObjectByName(name).position;
    const part = scene.getObjectByName(joint);
    game.stand({ x, z: z - 5.1 });
    game.frame(0);
    assert.equal(cues.length, i);
    game.stand({ x, z: z - 4.1 });
    game.frame(0.28);
    assert.equal(cues.length, i + 1);
    assert.notEqual(part.rotation[axis], 0);
    game.frame(1);
    assert.equal(cues.length, i + 1);
  }
  assertProgress(area, { olaf: 1 });
  assert.deepEqual(game.completions, []);

  const olaf = scene.getObjectByName('Olaf');
  const { x, z } = olaf.position;
  game.stand({ x, z: z + 5.2 });
  game.frame(0);
  still = true;
  game.stand({ x, z: z + 4.1 });
  game.frame(0.3);
  assert.equal(cues.length, 3);
  assert.equal(scene.getObjectByName('Olaf body').rotation.y, 0);
  assertProgress(area, { olaf: 1 });
  assert.equal(targetsIn(scene).length, SNOWMAN_COUNT);
  worlds.reset();
  assertProgress(area);
  game.frame(0.3);
  assertProgress(area, { olaf: 1 });
});

test('unload disposes the new terrain, ice slide and character resources before a clean revisit', async () => {
  const { worlds, visit } = await buildWorld();
  const { scene } = visit;
  const terrain = scene.getObjectByName('Snow Basin terrain');
  const slide = scene.getObjectByName('Ice Mountain slide').children[0];
  const olaf = scene.getObjectByName('Olaf body').children.find(node => node.isInstancedMesh);
  const resources = [terrain.geometry, ...terrain.material, slide.geometry, slide.material, olaf, olaf.geometry];
  const disposed = new Set();
  for (const resource of resources) resource.addEventListener('dispose', () => disposed.add(resource));
  await worlds.load('garden');
  assert.equal(scene.children.length, 0);
  assert.equal(disposed.size, resources.length);
  const again = await worlds.load('snow');
  assert.notEqual(again.scene.getObjectByName('Snow Basin terrain').geometry, terrain.geometry);
  assert.ok(again.scene.getObjectByName('Olaf').visible);
  assertProgress(again.area);
  worlds.unload();
});

test('one automatic station uses a fixed, clear west arena and all three targets can be hit', async t => {
  const game = await buildWorld();
  const { worlds, visit, progress } = game;
  t.after(worlds.unload);
  const { area, scene } = visit;
  assert.equal(scene.children.filter(node => node.name === 'Snowball station').length, 1);
  assert.ok(scene.getObjectByName('Snowball throwing position'));
  assert.equal(scene.getObjectByName('Frozen Key'), undefined);
  assert.ok(!area.interactions.some(item => /key|snowball/i.test(item.label)));
  assert.ok(!progress.has('snow'));
  const reached = reachableCells(area, snowBasin.width, snowBasin.depth);
  assert.ok(reached.some(p => Math.hypot(THROWING_POSITION.x - p.x, THROWING_POSITION.z - p.z) < 0.3));
  assert.equal(walkElevation(area, THROWING_POSITION, THROWING_POSITION.x, THROWING_POSITION.z, 0, true), 0);
  const models = targetsIn(scene);
  const positions = models.map(model => model.position.clone());
  assert.equal(models.length, 3);
  assert.ok(positions.every(p => p.x < -20 && area.getGroundHeight(p.x, p.z) === 0));
  for (const [i, { x, z }] of positions.entries()) {
    const distance = Math.hypot(x - THROWING_POSITION.x, z - THROWING_POSITION.z);
    assert.ok(distance >= 6 && distance <= 9);
    if (i) assert.ok(positions[i].distanceTo(positions[i - 1]) >= 2 && positions[i].distanceTo(positions[i - 1]) <= 3);
  }
  shootSnowmen(game);
  assertProgress(area, { snowmen: 3 });
  assert.ok(scene.getObjectByName('Olaf').visible);
  assert.deepEqual(game.completions, []);
  worlds.reset();
  assertProgress(area);
  assert.deepEqual(targetsIn(scene).map(model => model.position), positions);
  assert.ok(targetsIn(scene).every(model => model.children[0].visible));
});

test('automatic pickup, cooldown, station boundary and desktop and touch controls work once per shot', async t => {
  const game = await buildWorld();
  const { worlds, visit, target, canvas, document, hud, cues } = game;
  t.after(worlds.unload);
  const { area, scene, viewmodel } = visit;
  const panel = hud.children[0];
  const button = panel.children.find(child => child.className === 'snow-throw');
  const held = viewmodel.getObjectByName('Held snowball');
  const launched = () => scene.children.filter(node => /^Snowball in flight/.test(node.name) && node.visible).length;
  const left = (pointerType = 'mouse') => Object.assign(new Event('pointerdown', { cancelable: true }), { pointerType, button: 0 });
  assert.equal(button.hidden, true);
  assert.equal(held.visible, false);
  game.stand({ x: SNOWBALL_STATION.x, z: SNOWBALL_STATION.z + 2.01 });
  game.frame(0);
  assert.equal(button.hidden, true);
  aimFromStation(game, targetsIn(scene)[1]);
  assert.equal(button.hidden, false);
  assert.ok(held.visible);
  assert.equal(area.missionStatus.hint, 'Aim and throw at the snowmen.');
  const packs = cues.length;
  game.frame(0.3);
  game.frame(0.4);
  assert.equal(cues.length, packs);
  assert.equal(canvas.dispatchEvent(left()), true, 'first click is available for pointer lock');
  document.pointerLockElement = canvas;
  assert.equal(canvas.dispatchEvent(left('touch')), true);
  assert.equal(canvas.dispatchEvent(left()), false);
  assert.equal(button.hidden, true);
  assert.equal(held.visible, false);
  game.frame(0.09);
  assert.equal(launched(), 1);
  game.frame(SNOWBALL_RELOAD - 0.1);
  assert.equal(button.hidden, true);
  game.frame(0.02);
  assert.equal(button.hidden, false);

  // A synthesized click after touch pointer events is the sole activation.
  assert.equal(button.dispatchEvent(left('touch')), true);
  button.dispatchEvent(new Event('click'));
  button.dispatchEvent(new Event('click'));
  game.frame(0.03);
  assert.equal(launched(), 1);
  assert.equal(button.hidden, true);
  game.frame(SNOWBALL_RELOAD);
  assert.equal(button.hidden, false);

  // Moving out before the next simulation frame still prevents firing.
  game.stand(snowBasin.spawn);
  assert.equal(target.dispatchEvent(pressF()), true);
  assert.equal(button.hidden, true);
  assert.equal(held.visible, false);
  assert.equal(target.dispatchEvent(pressF()), true);
  game.frame(2);
  assert.equal(launched(), 0);

  aimFromStation(game, targetsIn(scene)[1]);
  assert.ok(held.visible);
  game.stand(snowBasin.spawn);
  game.frame(0);
  assert.equal(held.visible, false);
  assert.equal(button.hidden, true);
  aimFromStation(game, targetsIn(scene)[1]);
  game.setPlaying(false);
  assert.equal(target.dispatchEvent(pressF()), true);
  game.setPlaying(true);
  assert.equal(target.dispatchEvent(pressF()), false);
  worlds.reset();
  assert.equal(launched(), 0);
  assert.equal(held.visible, false);
  await worlds.load('garden');
  assert.equal(hud.children.length, 0);
  assert.ok(visit.lifetime.signal.aborted);
  assert.equal(target.dispatchEvent(pressF()), true);
  assert.equal(canvas.dispatchEvent(left()), true);
});

function startRide(game) {
  game.stand(SLIDE_PLATFORM);
  const action = nearestInteraction(game.visit.area.interactions, game.camera.position);
  assert.equal(action?.label, 'Slide Down');
  assert.ok(action.act({ guideCamera: game.guideCamera }));
  assert.ok(game.avatar.guided);
  return action;
}

function finishRide(game, step = 1 / 60) {
  let duration = 0;
  while (game.avatar.guided && duration < 20) {
    game.frame(step);
    duration += step;
  }
  assert.equal(game.avatar.guided, false);
  assert.equal(game.avatar.grounded, true);
  assert.deepEqual(game.camera.position.toArray(), [SLIDE_LANDING.x, EYE_HEIGHT, SLIDE_LANDING.z]);
  return duration;
}

test('Slide Down requires standing on the platform and restores ordinary movement at the landing', async t => {
  const game = await buildWorld();
  const { worlds, visit, camera, avatar } = game;
  t.after(worlds.unload);
  const { area, scene } = visit;
  const action = area.interactions.find(item => item.label === 'Slide Down');
  const gate = scene.getObjectByName('Ice slide gate');
  camera.position.set(SLIDE_PLATFORM.x, EYE_HEIGHT, SLIDE_PLATFORM.z);
  assert.equal(action.act({ guideCamera: game.guideCamera }), false);
  game.stand({ x: SLIDE_PLATFORM.x, z: SLIDE_PLATFORM.z + 1.3 });
  assert.equal(action.reachable(camera.position), false);
  game.stand(SLIDE_PLATFORM);
  assert.ok(avatar.jump());
  assert.equal(action.act({ guideCamera: game.guideCamera }), false);
  startRide(game);
  assert.equal(gate.visible, false);
  assert.equal(action.active, false);
  assert.equal(action.act({ guideCamera: game.guideCamera }), false);
  assert.equal(avatar.jump(), false);
  const initial = camera.position.clone();
  avatar.move(0.05, { x: 1, y: 1 }, visit);
  assert.ok(camera.position.equals(initial));

  game.frame(0.62);
  const orientation = camera.quaternion.clone();
  avatar.look(0.8, 0.3);
  game.frame(0);
  assert.ok(camera.quaternion.angleTo(orientation) > 0.5);
  let elapsed = 0.62;
  let sawBank = false;
  while (elapsed < 15.8) {
    game.frame(1 / 60);
    elapsed += 1 / 60;
    const height = camera.position.y - slideSurfaceAt(camera.position);
    assert.ok(height > 0.91 && height < 0.97);
    sawBank ||= Math.abs(camera.rotation.z) > 0.004;
  }
  assert.ok(sawBank);
  assertProgress(area);
  assert.ok(avatar.guided);
  finishRide(game);
  assertProgress(area, { slide: 1 });
  assert.ok(gate.visible);
  const landing = camera.position.clone();
  assert.ok(Math.abs(camera.rotation.x + 0.3) < 1e-8, 'landing preserves the rider’s pitch');
  avatar.move(0.05, { x: 0, y: -1 }, visit);
  assert.ok(!camera.position.equals(landing));
  assert.ok(avatar.jump());
  startRide(game);
  finishRide(game, 1 / 27);
  assertProgress(area, { slide: 1 });
  assert.deepEqual(game.completions, []);
});

function slideSurfaceAt({ x, z }) {
  let closest = Infinity;
  let height = NaN;
  for (let i = 1; i < SLIDE_PATH.length; i++) {
    const a = SLIDE_PATH[i - 1];
    const b = SLIDE_PATH[i];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const t = THREE.MathUtils.clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
    const distance = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
    if (distance < closest) {
      closest = distance;
      height = a.y + (b.y - a.y) * t;
    }
  }
  assert.ok(closest < 1e-6, 'eye follows the channel centerline');
  return height;
}

test('reduced-motion ride is shorter, with a steady centerline and safe landing', async t => {
  const game = await buildWorld({ reducedMotion: () => true });
  t.after(game.worlds.unload);
  startRide(game);
  const { camera, avatar } = game;
  let elapsed = 0;
  while (avatar.guided && elapsed < 12) {
    game.frame(1 / 30);
    elapsed += 1 / 30;
    assert.ok(Math.abs(camera.rotation.z) < 1e-9);
    if (elapsed > 0.49 && elapsed < 9.9) {
      assert.ok(Math.abs(camera.position.y - slideSurfaceAt(camera.position) - 0.94) < 1e-8);
    }
  }
  assert.ok(elapsed > 10 && elapsed < 11);
  assert.deepEqual(camera.position.toArray(), [SLIDE_LANDING.x, EYE_HEIGHT, SLIDE_LANDING.z]);
  assertProgress(game.visit.area, { slide: 1 });
});

test('pause freezes the guided ride, restart cancels it and travel drops stale control', async t => {
  const game = await buildWorld();
  const { worlds, camera, avatar, visit, target, hud } = game;
  t.after(worlds.unload);
  const action = startRide(game);
  game.frame(1.5);
  const beforePause = camera.position.clone();
  game.setPlaying(false);
  game.frame(20);
  assert.ok(camera.position.equals(beforePause));
  assertProgress(visit.area);
  game.setPlaying(true);
  game.frame(0.1);
  assert.ok(!camera.position.equals(beforePause));
  worlds.reset();
  game.stand(snowBasin.spawn);
  assert.equal(avatar.guided, false);
  assert.ok(visit.scene.getObjectByName('Ice slide gate').visible);
  game.frame(8);
  assertProgress(visit.area);
  startRide(game);
  game.frame(1.2);
  const next = await worlds.load('garden');
  game.stand(next.definition.spawn);
  const nextPosition = camera.position.clone();
  visit.area.update(20, camera.position);
  assert.ok(camera.position.equals(nextPosition));
  assert.ok(visit.lifetime.signal.aborted);
  assert.equal(action.active, false);
  assert.equal(avatar.guided, false);
  assert.equal(hud.children.length, 0);
  assert.equal(target.dispatchEvent(pressF()), true);
  assertProgress(visit.area);
  assert.deepEqual(game.completions, []);
});

test('completes exactly once in any mission order and preserves other area badges', async t => {
  const orders = ['pine snowmen slide', 'pine slide snowmen', 'snowmen pine slide',
    'snowmen slide pine', 'slide pine snowmen', 'slide snowmen pine'];
  for (const order of orders.flatMap(base => Array.from({ length: 4 }, (_, index) => {
    const steps = base.split(' ');
    steps.splice(index, 0, 'olaf');
    steps.push('sven', 'tower', 'skating', 'cabin');
    if (index % 2) steps.reverse();
    return steps.join(' ');
  }))) {
    await t.test(order, async sub => {
      const game = await buildWorld({ saved: ['snow@2', 'garden@3', 'frozen-castle'] });
      const { worlds, visit, progress, completions } = game;
      sub.after(worlds.unload);
      assert.equal(progress.has('snow'), false);
      assert.ok(progress.has('garden'));
      assert.ok(progress.has('frozen-castle'));
      assert.equal(resolveArea(new URL('https://example.test/?area=snow'), areas, 'garden'), 'snow');
      assert.equal(resolveArea(new URL('https://example.test/?area=frozen-castle'), areas, 'garden'), 'frozen-castle');
      assertProgress(visit.area);
      const missions = new Set();
      for (const id of order.split(' ')) {
        if (id === 'pine') fallInWorld(worlds);
        else if (id === 'snowmen') shootSnowmen(game);
        else if (id === 'olaf') {
          const { x, z } = visit.scene.getObjectByName('Olaf').position;
          game.stand({ x, z: z + 3 });
          game.frame(0);
        } else if (id === 'sven') {
          visit.area.interactions.find(item => item.label === 'Offer carrot').act();
        } else if (id === 'tower') {
          const point = towerStairPoint(ICE_TOWER.stairEnd - 2);
          game.stand({ ...point, elevation: point.y });
          game.frame(0);
        } else if (id === 'cabin') {
          visit.area.interactions.find(item => item.label === 'Light fireplace').act();
        } else if (id === 'skating') {
          visit.area.interactions.find(item => item.label === 'Put on ice skates').act();
          for (const point of SKATE_CHECKPOINTS) { game.stand(point); game.frame(0); }
        } else {
          startRide(game);
          finishRide(game);
        }
        missions.add(id);
        assertProgress(visit.area, { chops: missions.has('pine') ? 5 : 0,
          snowmen: missions.has('snowmen') ? 3 : 0, slide: Number(missions.has('slide')), olaf: Number(missions.has('olaf')), sven: Number(missions.has('sven')),
          tower: Number(missions.has('tower')), skating: missions.has('skating') ? 3 : 0, cabin: Number(missions.has('cabin')) });
        assert.deepEqual(completions, missions.size === 8 ? ['snow'] : []);
      }
      assert.ok(progress.has('snow'));
      assert.deepEqual(new Set(game.records()), new Set(['snow@5', 'garden@3', 'frozen-castle']));
      assert.equal(game.missionHud.toast.textContent, 'Snow Basin complete!');
      assert.equal(visit.area.missionStatus.hint, 'Snow Basin complete!');
      startRide(game);
      finishRide(game);
      assert.deepEqual(completions, ['snow']);
      assert.equal(game.missionHud.notifications.filter(message => message === 'Snow Basin complete!').length, 1);
    });
  }
});

test('completion requires each mission flag', () => {
  for (const pine of [false, true]) {
    for (const snowmen of [false, true]) {
      for (const slide of [false, true]) {
        for (const olaf of [false, true]) {
          for (const sven of [false, true]) for (const tower of [false, true]) for (const skating of [false, true]) for (const cabin of [false, true]) {
            const missions = { pine, snowmen, slide, olaf, sven, tower, skating, cabin };
            assert.equal(snowMissionsComplete(missions), pine && snowmen && slide && olaf && sven && tower && skating && cabin);
          }
        }
      }
    }
  }
});

test('the axe strikes across the camera, drops when the tree lands, and returns on restart', async t => {
  const game = await buildWorld();
  const { area, scene, viewmodel } = game.visit;
  t.after(game.worlds.unload);
  const pickup = area.interactions.find(item => item.label === 'Pick up axe');
  const chop = area.interactions.find(item => item.label === 'Chop tree');
  const held = viewmodel.getObjectByName('Held axe');
  const placed = scene.getObjectByName('Snow Basin axe');
  const original = placed.position.clone();
  game.stand({ x: -0.6, z: -4.1 });
  assert.ok(pickup.act());
  assert.ok(chop.act());
  game.frame(CHOP_COOLDOWN * 0.18);
  assert.ok(held.visible && held.position.x > 0.28);
  game.frame(CHOP_COOLDOWN * 0.5);
  assert.ok(held.position.x < -0.2);
  game.frame(CHOP_COOLDOWN);
  for (let i = 1; i < CHOPS; i++) {
    assert.ok(chop.act());
    if (i < CHOPS - 1) game.frame(CHOP_COOLDOWN);
  }
  game.frame(FALL_DURATION);
  assert.equal(held.visible, false);
  assert.equal(placed.visible, true);
  assert.ok(placed.position.distanceTo(original) > 3);
  assert.equal(pickup.active, false);
  assert.equal(pickup.act(), false);
  game.worlds.reset();
  assert.ok(placed.position.equals(original));
  assert.ok(pickup.active);
});

test('the frozen lake is lower than snow, has walkable banks, and carries momentum only on ice', async t => {
  const game = await buildWorld();
  t.after(game.worlds.unload);
  const { visit, avatar, camera } = game;
  const { area, scene } = visit;
  const lake = scene.getObjectByName('Snow Basin terrain');
  assert.ok(lake.geometry.groups.find(group => group.materialIndex === 1).count > 250);
  assert.equal(area.getGroundHeight(-4, -7), LAKE_LEVEL);
  assert.equal(area.getGroundHeight(0, 9.4), 0);
  let z = 9.4;
  let feet = 0;
  while (z > -2) {
    const next = walkElevation(area, { x: 0, z }, 0, z - 0.08, feet, true);
    assert.notEqual(next, null);
    z -= 0.08;
    feet = next;
  }
  assert.equal(feet, LAKE_LEVEL);

  function coastingDistance(spawn) {
    game.stand(spawn);
    for (let i = 0; i < 65; i++) avatar.move(0.02, { x: 0, y: 1 }, visit);
    const release = camera.position.z;
    for (let i = 0; i < 50; i++) avatar.move(0.02, { x: 0, y: 0 }, visit);
    return camera.position.z - release;
  }
  assert.ok(coastingDistance({ x: -4, z: -9 }) > 1.85);
  assert.ok(coastingDistance({ x: 0, z: 9.4 }) < 0.35);
});

test('the spiral reaches the Ice Tower lookout and can be walked down without jumping', async t => {
  const game = await buildWorld();
  t.after(game.worlds.unload);
  const { visit, avatar, camera } = game;
  const { area, scene } = visit;
  const entrance = towerStairPoint(0);
  game.stand({ x: entrance.x, z: entrance.z - 1, yaw: 0 });

  function walkTo(point) {
    for (let i = 0; i < 100; i++) {
      const dx = point.x - camera.position.x;
      const dz = point.z - camera.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance <= 0.075) return;
      avatar.move(0.02, { x: dx / distance, y: dz / distance }, visit);
    }
    assert.fail(`blocked near (${point.x.toFixed(2)}, ${point.z.toFixed(2)})`);
  }

  const stair = scene.getObjectByName('Ice Tower spiral stairs');
  scene.updateMatrixWorld(true);
  const down = new THREE.Vector3(0, -1, 0);
  const ray = new THREE.Raycaster();
  const deckTread = ICE_TOWER.stairEnd - 2;
  for (let tread = 0; tread <= deckTread; tread += 0.5) {
    const point = towerStairPoint(tread);
    walkTo(point);
    assert.ok(avatar.grounded);
    assert.ok(Math.abs(camera.position.y - EYE_HEIGHT - point.y) < 0.065, `tread ${tread}`);
    if (tread % 1 === 0.5) {
      ray.set(new THREE.Vector3(point.x, point.y + 0.3, point.z), down);
      assert.ok(Math.abs(ray.intersectObject(stair)[0].point.y - point.y) < 1e-5);
    }
  }

  const deck = towerStairPoint(deckTread);
  assert.equal(area.getGroundHeight(deck.x, deck.z, ICE_TOWER.deckHeight), ICE_TOWER.deckHeight);
  assert.ok(area.getGroundHeight(deck.x, deck.z, 0) < 0.3, 'the ground level is separate from the deck');
  const edge = towerStairPoint(deckTread, 4.46);
  assert.ok(area.blocksGround(edge.x, edge.z, 0.34, ICE_TOWER.deckHeight, deck));
  const endRail = towerStairPoint(ICE_TOWER.stairEnd + 0.1);
  assert.ok(area.blocksGround(endRail.x, endRail.z, 0.34, ICE_TOWER.deckHeight, deck));
  for (let tread = deckTread - 0.5; tread >= 0; tread -= 0.5) walkTo(towerStairPoint(tread));
  walkTo({ x: entrance.x, z: entrance.z - 1 });
  assert.ok(avatar.grounded && Math.abs(camera.position.y - EYE_HEIGHT) < 0.05);
});

test('both ice hills have walkable approaches to their summits', async t => {
  const { worlds, visit } = await buildWorld();
  t.after(worlds.unload);
  const { area } = visit;
  for (const hill of ICE_HILLS) {
    let x = hill.x - hill.width - 0.3;
    const { z } = hill;
    let feet = area.getGroundHeight(x, z);
    while (x < hill.x) {
      const next = Math.min(hill.x, x + 0.12);
      feet = walkElevation(area, { x, z }, next, z, feet, true);
      assert.notEqual(feet, null, `hill blocked at ${next.toFixed(2)}, ${z}`);
      x = next;
    }
    assert.ok(feet >= hill.height - 0.25);
  }
});


test('skating requires skates, counts each checkpoint once, restores traction and permits re-equipping', async t => {
  const game = await buildWorld();
  t.after(game.worlds.unload);
  const { area, scene } = game.visit;
  const equip = area.interactions.find(item => item.label === 'Put on ice skates');
  const gear = scene.getObjectByName('Ice skates');
  game.stand(SKATE_CHECKPOINTS[0]);
  game.frame(0);
  assertProgress(area);
  game.stand(SKATE_SITE);
  assert.equal(equip.act(), true);
  assert.equal(gear.visible, false);
  assert.equal(area.getGroundTraction(-4, -7), 0.035);
  assert.equal(area.getGroundTraction(0, 9.4), 1);
  for (const [i, point] of SKATE_CHECKPOINTS.entries()) {
    game.stand(point);
    game.frame(0);
    game.frame(0);
    assertProgress(area, { skating: i + 1 });
  }
  assert.equal(gear.visible, true);
  assert.equal(area.getGroundTraction(-4, -7), 0.08);
  assert.equal(equip.act(), true);
  assert.equal(area.getGroundTraction(-4, -7), 0.035);
  assertProgress(area, { skating: 3 });
  game.worlds.reset();
  assertProgress(area);
  assert.equal(gear.visible, true);
});


test('winter cabin has a walkable open doorway and the fireplace lights once and resets', async t => {
  const game = await buildWorld();
  t.after(game.worlds.unload);
  const { area, scene } = game.visit;
  const hearth = area.interactions.find(item => item.label === 'Light fireplace');
  const fire = scene.getObjectByName('Cabin fire');
  const smoke = scene.getObjectByName('Cabin chimney smoke');
  const warmth = scene.getObjectByName('Cabin warmth');
  assert.equal(fire.visible, false);
  assert.equal(smoke.visible, false);
  assert.equal(warmth.intensity, 0);
  let z = CABIN.z - 3.1;
  let feet = area.getGroundHeight(CABIN.x, z);
  while (z < CABIN.z) {
    const next = walkElevation(area, { x: CABIN.x, z }, CABIN.x, z + 0.06, feet, true);
    assert.notEqual(next, null, 'open cabin doorway must be walkable');
    feet = next;
    z += 0.06;
  }
  assert.equal(hearth.reachable({ x: CABIN.x, y: EYE_HEIGHT, z: CABIN.z - 2.5 }), false);
  game.stand({ x: FIREPLACE.x, z: FIREPLACE.z - 1.1 });
  assert.equal(hearth.reachable(game.camera.position), true);
  assert.equal(hearth.act(), true);
  assert.equal(hearth.active, false);
  assert.equal(hearth.act(), false);
  assert.equal(fire.visible, true);
  assert.equal(smoke.visible, true);
  assert.ok(warmth.intensity > 0);
  game.frame(0.1);
  assertProgress(area, { cabin: 1 });
  game.worlds.reset();
  assertProgress(area);
  assert.equal(hearth.active, true);
  assert.equal(fire.visible, false);
  assert.equal(smoke.visible, false);
  assert.equal(warmth.intensity, 0);
});
