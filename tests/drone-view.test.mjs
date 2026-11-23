import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { createControls } from '../core/controls.js';
import { bindDroneControls, createDroneCamera, createDroneView, isDroneView, replaceDroneView } from '../core/drone-view.js';
import { createPlayer } from '../core/player.js';
import { resolveArea } from '../core/world-manager.js';
import { areas } from '../game.js';

const root = new URL('https://example.test/Kids-World/');
const rect = { left: 20, top: 30, width: 800, height: 400 };
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} ≈ ${expected}`);

test('drone links use the same area routing, including link-only areas', () => {
  assert.equal(isDroneView(root), false);
  assert.equal(isDroneView(new URL('?view=unknown', root)), false);
  for (const id of Object.keys(areas)) {
    const url = new URL(`?area=${id}&view=drone`, root);
    assert.equal(isDroneView(url), true);
    assert.equal(resolveArea(url, areas, 'garden'), id);
  }
  assert.equal(areas['secret-apartment'].show, false);
});

test('view UI replaces only the view parameter and preserves the current history state', () => {
  const url = new URL('?area=garden&view=drone&tag=a&tag=b&__kw_release=v1#bridge', root);
  const state = { area: 'garden', arrival: 'cabin', other: { important: true } };
  const replacements = [];
  const history = { state, replaceState: (...args) => replacements.push(args) };
  replaceDroneView(url, history, false);
  const [stored, , target] = replacements[0];
  assert.equal(stored, state);
  assert.equal(target.href, 'https://example.test/Kids-World/?area=garden&tag=a&tag=b&__kw_release=v1#bridge');
  replaceDroneView(target, history, true);
  assert.equal(replacements[1][0], state);
  assert.equal(isDroneView(replacements[1][2]), true);
  assert.equal(replacements.length, 2);
});

test('the overhead camera fits the map, keeps north up, and refits on portrait resize', () => {
  const drone = createDroneCamera(THREE);
  const definition = { width: 90, depth: 40 };
  assert.ok(drone.focus(definition, undefined, 2));
  const { camera } = drone;
  assert.ok(camera.isOrthographicCamera);
  const aim = camera.getWorldDirection(new THREE.Vector3());
  near(aim.y, -1);
  near(aim.z, 0);
  const northWest = new THREE.Vector3(-45, 20, -20);
  function assertFit(aspect) {
    const projected = northWest.clone().project(camera);
    assert.ok(projected.x < 0 && projected.x > -1);
    assert.ok(projected.y > 0 && projected.y < 1);
    assert.ok(projected.z > -1 && projected.z < 1);
    near(camera.right / camera.top, aspect);
  }
  assertFit(2);
  assert.ok(drone.resize(0.5));
  assertFit(0.5);
  assert.equal(drone.resize(0.5), false);
  const next = { center: { x: -88, z: 9 }, width: 30, depth: 18 };
  assert.ok(drone.focus(definition, next, 0.5));
  assert.equal(camera.position.x, -88);
  assert.equal(camera.position.z, 9);
  assert.equal(drone.focus(definition, next, 0.5), false);
});

test('pan and cursor-centered zoom clamp to the map and Reset View restores the overview', () => {
  const drone = createDroneCamera(THREE);
  drone.focus({ width: 80, depth: 50 }, undefined, 2);
  const { camera } = drone;
  const anchor = new THREE.Vector3(0.25, -0.25, 0);
  const before = anchor.clone().unproject(camera);
  drone.zoom(2, rect.left + rect.width * 0.625, rect.top + rect.height * 0.625, rect);
  const after = anchor.clone().unproject(camera);
  near(before.x, after.x);
  near(before.z, after.z);
  drone.zoom(1000, 420, 230, rect);
  assert.equal(camera.zoom, 16);
  drone.zoom(0.0001, 420, 230, rect);
  assert.equal(camera.zoom, 0.8);
  drone.pan(5000, -5000, rect);
  assert.deepEqual([camera.position.x, camera.position.z], [-40, 25]);
  drone.pan(-5000, 5000, rect);
  assert.deepEqual([camera.position.x, camera.position.z], [40, -25]);
  drone.reset();
  assert.deepEqual([camera.position.x, camera.position.z, camera.zoom], [0, 0, 1]);
});

class Element extends EventTarget {
  captured = new Set();
  style = {};
  attributes = new Map();
  textContent = '';
  hidden = true;
  dataset = {};

  getBoundingClientRect() { return rect; }
  hasPointerCapture(id) { return this.captured.has(id); }
  setPointerCapture(id) { this.captured.add(id); }
  releasePointerCapture(id) { this.captured.delete(id); }
  setAttribute(name, value) { this.attributes.set(name, value); }
}

function pointer(canvas, type, pointerId, clientX, clientY, button = 0) {
  canvas.dispatchEvent(Object.assign(new Event(type), { pointerId, clientX, clientY, button }));
  if (type === 'pointerup' || type === 'pointercancel') canvas.releasePointerCapture(pointerId);
}

test('only taps select after pointer drags, pinches, cancellation, and mode changes', () => {
  const canvas = new Element();
  const controller = new AbortController();
  const selected = [];
  const pans = [];
  const zooms = [];
  let enabled = true;
  bindDroneControls(canvas, {
    signal: controller.signal, enabled: () => enabled,
    select: (...point) => selected.push(point), pan: (...delta) => pans.push(delta), zoom: (...zoom) => zooms.push(zoom),
  });
  pointer(canvas, 'pointerdown', 1, 100, 100);
  pointer(canvas, 'pointermove', 1, 102, 102);
  pointer(canvas, 'pointerup', 1, 102, 102);
  assert.deepEqual(selected, [[102, 102]]);
  pointer(canvas, 'pointerdown', 1, 100, 100);
  pointer(canvas, 'pointermove', 1, 124, 100);
  pointer(canvas, 'pointerup', 1, 124, 100);
  assert.deepEqual(pans, [[24, 0]]);

  pointer(canvas, 'pointerdown', 1, 100, 100);
  pointer(canvas, 'pointerdown', 2, 140, 100);
  pointer(canvas, 'pointermove', 2, 160, 100);
  pointer(canvas, 'pointerup', 2, 160, 100);
  pointer(canvas, 'pointerup', 1, 100, 100);
  assert.deepEqual(zooms, [[1.5, 130, 100]]);
  pointer(canvas, 'pointerdown', 1, 100, 100);
  pointer(canvas, 'pointercancel', 1, 100, 100);
  pointer(canvas, 'pointerup', 1, 100, 100);
  enabled = false;
  pointer(canvas, 'pointerdown', 1, 100, 100);
  pointer(canvas, 'pointerup', 1, 100, 100);
  enabled = true;
  pointer(canvas, 'pointerdown', 1, 100, 100);
  controller.abort();
  pointer(canvas, 'pointerup', 1, 100, 100);
  assert.equal(canvas.hasPointerCapture(1), false);
  assert.deepEqual(selected, [[102, 102]]);
});

test('inspection keeps the player pose, world visibility, and marker scoped to the visit', async () => {
  const browser = new EventTarget();
  const copied = [];
  browser.navigator = { clipboard: { async writeText(text) { copied.push(text); } } };
  const nodes = Object.fromEntries(['panel', 'area', 'coordinates', 'copy', 'reset', 'exit', 'feedback', 'marker']
    .map(id => ['#drone-' + id, new Element()]));
  const game = new Element();
  game.ownerDocument = { defaultView: browser };
  game.querySelector = id => nodes[id];
  const canvas = new Element();
  const drone = createDroneView(THREE, {
    game, canvas, aspect: () => 2, enabled: () => true, invalidate() {}, exit() { drone.stop(); },
  });
  const scene = new THREE.Scene();
  const player = new THREE.PerspectiveCamera();
  const viewmodel = new THREE.Group();
  player.add(viewmodel);
  scene.add(player);
  player.position.set(-2, 1.68, 9);
  player.rotation.set(0.2, -0.4, 0);
  const pose = [player.position.toArray(), player.quaternion.toArray()];
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(8, 8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial());
  ground.position.y = 3;
  scene.add(ground);
  const lifetime = new AbortController();
  const visit = { definition: { title: 'Room', canvasLabel: 'Player view', width: 8, depth: 8 }, area: {}, scene, lifetime, viewmodel };
  drone.start(visit);
  assert.equal(viewmodel.visible, false);
  assert.equal(nodes['#drone-coordinates'].hidden, true);
  const clickGround = () => {
    pointer(canvas, 'pointerdown', 1, 420, 230);
    pointer(canvas, 'pointerup', 1, 420, 230);
  };
  clickGround();
  assert.equal(nodes['#drone-coordinates'].textContent, 'X: 0.00  Y: 3.00  Z: 0.00');
  assert.equal(nodes['#drone-marker'].hidden, false);
  assert.ok(!scene.children.includes(nodes['#drone-marker']));
  clickGround();
  assert.equal(nodes['#drone-coordinates'].textContent, 'X: 0.00  Y: 3.00  Z: 0.00');
  nodes['#drone-copy'].dispatchEvent(new Event('click'));
  await Promise.resolve();
  assert.deepEqual(copied, ['{ x: 0.00, y: 3.00, z: 0.00 }']);
  assert.equal(nodes['#drone-feedback'].textContent, 'Coordinates copied.');
  browser.navigator.clipboard = undefined;
  nodes['#drone-copy'].dispatchEvent(new Event('click'));
  assert.match(nodes['#drone-feedback'].textContent, /Clipboard unavailable/);
  assert.deepEqual([player.position.toArray(), player.quaternion.toArray()], pose);
  nodes['#drone-exit'].dispatchEvent(new Event('click'));
  assert.equal(drone.camera, undefined);
  assert.equal(nodes['#drone-marker'].hidden, true);
  assert.equal(viewmodel.visible, true);
  assert.deepEqual([player.position.toArray(), player.quaternion.toArray()], pose);

  viewmodel.visible = false;
  drone.start(visit);
  assert.equal(nodes['#drone-panel'].hidden, false);
  lifetime.abort();
  assert.equal(drone.camera, undefined);
  assert.equal(nodes['#drone-panel'].hidden, true);
  assert.equal(nodes['#drone-feedback'].textContent, '');
  assert.equal(viewmodel.visible, false);
  ground.geometry.dispose();
  ground.material.dispose();
});

test('normal keyboard, mouse, and touch controls resume after drone input releases pointer lock', t => {
  const prior = { document: globalThis.document, window: globalThis.window };
  const browser = new EventTarget();
  const document = new EventTarget();
  globalThis.window = browser;
  globalThis.document = document;
  t.after(() => {
    for (const [key, value] of Object.entries(prior)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  });

  const game = new Element();
  const canvas = new Element();
  const joystick = new Element();
  const thumb = new Element();
  const camera = new THREE.PerspectiveCamera();
  const player = createPlayer(THREE, camera);
  const area = { obstacles: [] };
  const visit = { definition: { width: 20, depth: 20 }, area };
  player.reset({ x: 0, z: 0 }, area);
  let enabled = true;
  let touch = false;
  let pauses = 0;
  let interactions = 0;
  let canInteract = true;
  let requests = 0;
  canvas.requestPointerLock = () => { requests++; };
  document.exitPointerLock = () => { document.pointerLockElement = null; };
  const controls = createControls(THREE, {
    game, canvas, joystick, thumb, playing: () => enabled, seated: () => false, touchMode: () => touch,
    look: player.look, jump: player.jump, interact() { if (!canInteract) return false; interactions++; return true; }, pause() { pauses++; },
  });
  function send(target, type, fields = {}) {
    target.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), fields));
  }
  canvas.dispatchEvent(new Event('click'));
  assert.equal(requests, 1);
  document.pointerLockElement = canvas;
  send(document, 'pointerlockchange');
  send(browser, 'mousemove', { movementX: 20, movementY: -10 });
  controls.sample(0.05);
  assert.notEqual(camera.rotation.y, 0);

  enabled = false;
  controls.clear();
  controls.releaseMouse();
  canvas.dispatchEvent(new Event('click'));
  send(browser, 'keydown', { code: 'Space' });
  send(browser, 'keydown', { code: 'KeyM' });
  send(browser, 'keydown', { code: 'KeyW' });
  assert.equal(requests, 1);
  assert.equal(interactions, 0);
  assert.equal(controls.sample(0.05).length(), 0);
  enabled = true;
  send(document, 'pointerlockchange'); // A queued unlock notification can arrive after mode changes.
  assert.equal(pauses, 0);
  send(browser, 'keydown', { code: 'KeyM' });
  assert.equal(interactions, 0);
  send(browser, 'keydown', { code: 'Space' });
  send(browser, 'keydown', { code: 'Space', repeat: true });
  player.move(.05, controls.sample(.05), visit);
  assert.equal(interactions, 1);
  assert.equal(camera.position.y, 1.68, 'an interaction consumes the jump key');
  canInteract = false;
  send(browser, 'keydown', { code: 'Space' });
  send(browser, 'keydown', { code: 'KeyW' });
  player.move(.05, controls.sample(.05), visit);
  assert.equal(interactions, 1);
  assert.ok(camera.position.y > 1.68 && camera.position.z < 0);
  document.pointerLockElement = canvas;
  send(document, 'pointerlockchange');
  document.exitPointerLock();
  send(document, 'pointerlockchange');
  assert.equal(pauses, 1, 'an unrequested unlock still pauses normal gameplay');

  controls.clear();
  touch = true;
  pointer(joystick, 'pointerdown', 1, 500, 230);
  assert.ok(controls.sample(0.05).x > 0);
  pointer(joystick, 'pointerup', 1, 500, 230);
  assert.equal(controls.sample(0.05).length(), 0);
});
