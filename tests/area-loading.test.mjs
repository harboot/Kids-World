import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { setImmediate } from 'node:timers/promises';
import { test } from 'node:test';
import { createGame } from '../core/game.js';
import * as THREE from '../vendor/three.module.min.js';

test('importing the entry loads the central catalog and each lazy module stays in its own area', async t => {
  const areaRoot = new URL('../areas/', import.meta.url).href;
  const loaded = [];
  const hooks = registerHooks({
    load(url, context, next) {
      if (url.startsWith(areaRoot)) loaded.push(url.slice(areaRoot.length));
      return next(url, context);
    },
  });
  t.after(() => hooks.deregister());
  const { areas } = await import('../game.js');
  assert.deepEqual(loaded, []);
  assert.equal(areas['secret-apartment'].show, false);

  for (const [id, folder] of [['secret-apartment', 'secret-apartment'], ['snow', 'snow-basin']]) {
    loaded.length = 0;
    const module = await areas[id].loadModule();
    assert.equal(module.default.id, id);
    assert.ok(loaded.includes(folder + '/index.js'));
    assert.ok(loaded.includes(folder + '/metadata.js'));
    assert.ok(loaded.includes(folder + '/music.js'));
    assert.ok(loaded.every(file => file.startsWith(folder + '/')), loaded.join(', '));
  }
});

class Element extends EventTarget {
  style = { setProperty() {} };
  dataset = {};
  firstChild = {};
  children = [];
  elements = new Map();

  querySelector(selector) {
    if (!this.elements.has(selector)) {
      this.elements.set(selector, Object.assign(new Element(), { ownerDocument: this.ownerDocument }));
    }
    return this.elements.get(selector);
  }
  setAttribute() {}
  replaceChildren(...children) { this.children = children; }
  append(...children) { this.children.push(...children); }
  showModal() { this.open = true; }
  close() { this.open = false; }
  blur() {}
  click() { this.dispatchEvent(new Event('click')); }
}

function gameFixture(t, areas, startingArea, { online = true, preferences = new Map() } = {}) {
  const window = new EventTarget();
  const document = new Element();
  document.createElement = () => new Element();
  const game = new Element();
  game.ownerDocument = document;
  const location = new URL(`https://example.test/Kids-World/?area=${startingArea}`);
  const writes = [];
  const frames = new Map();
  const renders = [];
  let disposed = 0;
  let nextFrame = 1;
  let reloads = 0;
  location.reload = () => { reloads++; };
  const history = {
    pushState(state, title, url) { location.href = url; writes.push(['push', location.href]); },
    replaceState(state, title, url) { location.href = url; writes.push(['replace', location.href]); },
  };

  for (const [name, value] of Object.entries({
    window, document, history, location,
    matchMedia: () => ({ matches: false }),
    ResizeObserver: class { observe() {} },
    navigator: { maxTouchPoints: 0, onLine: online },
    requestAnimationFrame(callback) { const id = nextFrame++; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    localStorage: { getItem: key => preferences.get(key) ?? null, setItem: (key, value) => preferences.set(key, value) },
  })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, name, previous);
      else delete globalThis[name];
    });
  }
  class WebGLRenderer {
    shadowMap = {};
    renderLists = { dispose() {} };
    render(scene, camera) { renders.push({ scene, position: camera.position.clone(), yaw: camera.rotation.y }); }
    dispose() { disposed++; }
  }

  return {
    ready: createGame({ game, loadThree: async () => ({ ...THREE, WebGLRenderer }), areas, defaultArea: 'garden' }),
    game, location, writes, frames, renders, window, document,
    get disposed() { return disposed; },
    get reloads() { return reloads; },
    tick(stamp) {
      // Requests inside a frame run on the next tick.
      for (const [id, callback] of [...frames]) {
        if (frames.delete(id)) callback(stamp);
      }
    },
    go(id) {
      location.searchParams.set('area', id);
      window.dispatchEvent(new Event('popstate'));
    },
  };
}

function area(id, loadModule, show = true) {
  return {
    id, title: id, heading: [id, ''], description: id, canvasLabel: id, themeColor: '#000',
    width: 10, depth: 10, spawn: { x: 0, z: 0 }, show, loadModule,
  };
}

function visit(entry, scenes) {
  return {
    ...entry,
    load() {
      scenes.push(entry.id);
      return { obstacles: [], missionStatus: { missions: [] } };
    },
  };
}

test('startup stays pending until the selected hidden area has constructed its scene', async t => {
  const loading = Promise.withResolvers();
  const scenes = [];
  const garden = area('garden', () => assert.fail('unrelated loader was invoked'));
  const secret = area('secret', () => loading.promise, false);
  const { game, ready, writes } = gameFixture(t, { garden, secret }, 'secret');

  let finished = false;
  ready.then(() => { finished = true; });
  await setImmediate();
  assert.equal(finished, false);
  assert.equal(game.dataset.state, 'traveling');
  assert.equal(game.querySelector('#choose-level').disabled, true);
  assert.match(game.querySelector('#notice').textContent, /Loading secret/);
  assert.deepEqual(writes, []);
  loading.resolve({ default: visit(secret, scenes) });
  await ready;
  assert.deepEqual(scenes, ['secret']);
  assert.equal(game.dataset.state, 'menu');
  assert.equal(game.dataset.level, 'secret');
  assert.equal(writes.length, 1);
});

test('history can supersede startup even while the first import is still pending', async t => {
  const loading = Promise.withResolvers();
  const scenes = [];
  const garden = area('garden', () => loading.promise);
  const snow = area('snow', async () => ({ default: visit(snow, scenes) }));
  const { game, ready, go } = gameFixture(t, { garden, snow }, 'garden');
  await setImmediate();
  go('snow');
  await ready;
  assert.equal(game.dataset.state, 'menu');
  assert.equal(game.dataset.level, 'snow');
  loading.resolve({ default: visit(garden, scenes) });
  await setImmediate();
  assert.deepEqual(scenes, ['snow']);
});

test('picker and history transitions handle failure and keep the newest destination', async t => {
  const failed = Promise.withResolvers();
  const delayed = Promise.withResolvers();
  const scenes = [];
  const garden = area('garden', async () => ({ default: visit(garden, scenes) }));
  const broken = area('broken', () => failed.promise);
  const slow = area('slow', () => delayed.promise);
  const newest = area('newest', async () => ({ default: visit(newest, scenes) }));
  const { ready, game, location, writes, go } = gameFixture(t, { garden, broken, slow, newest }, 'garden');
  t.mock.method(console, 'error', () => {});
  await ready;
  const select = id => {
    game.querySelector('#choose-level').click();
    game.querySelector('#area-list').children.find(item => item.dataset.area === id).click();
  };

  select('broken');
  assert.equal(game.dataset.state, 'traveling');
  assert.equal(location.searchParams.get('area'), 'garden');
  assert.equal(game.querySelector('#restart').disabled, true);
  failed.reject(new Error('module unavailable'));
  await setImmediate();
  assert.equal(game.dataset.state, 'menu');
  assert.equal(game.dataset.level, 'garden');
  assert.match(game.querySelector('#notice').textContent, /broken could not load/);

  select('slow');
  go('newest');
  await setImmediate();
  delayed.resolve({ default: visit(slow, scenes) });
  await setImmediate();
  assert.deepEqual(scenes, ['garden', 'newest']);
  assert.equal(game.dataset.state, 'menu');
  assert.equal(game.dataset.level, 'newest');
  assert.equal(location.searchParams.get('area'), 'newest');
  assert.equal(writes.length, 1, 'only successful startup rewrote history');
});

function send(target, type, fields = {}) {
  target.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), fields));
}

test('one frame loop bounds elapsed time and preserves the visit through pause and BFCache', async t => {
  const updates = [];
  let resets = 0;
  const garden = area('garden', async () => ({
    default: { ...garden, load: () => ({
      obstacles: [], missionStatus: { missions: [] },
      update(dt, position, elapsed) { updates.push([dt, elapsed]); },
      reset() { resets++; },
    }) },
  }));
  const f = gameFixture(t, { garden }, 'garden');
  await f.ready;
  assert.equal(resets, 1);
  assert.equal(f.frames.size, 1);
  f.tick(0);
  assert.equal(f.frames.size, 0, 'an idle menu renders only when invalidated');
  f.game.querySelector('#start').click();
  assert.equal(f.frames.size, 1);
  f.tick(16);
  f.tick(10_000);
  assert.deepEqual(updates, [[0, 0], [0.05, 0.25]]);
  assert.equal(f.frames.size, 1);

  const stale = [...f.frames.values()][0];
  f.document.hidden = true;
  send(f.document, 'visibilitychange');
  assert.equal(f.game.dataset.state, 'paused');
  assert.equal(f.frames.size, 0);
  f.document.hidden = false;
  send(f.document, 'visibilitychange');
  stale(15_000);
  assert.equal(f.frames.size, 1);
  f.tick(16_000);
  assert.equal(updates.length, 2);

  f.game.querySelector('#start').click();
  f.tick(20_000);
  assert.deepEqual(updates.at(-1), [0, 0]);
  send(f.window, 'pagehide', { persisted: true });
  assert.equal(f.frames.size, 0);
  send(f.window, 'pageshow', { persisted: true });
  send(f.window, 'pageshow', { persisted: true });
  assert.equal(f.frames.size, 1);
  f.tick(90_000);
  assert.equal(updates.length, 3);
  assert.equal(resets, 1);
  f.game.querySelector('#restart').click();
  f.game.querySelector('#restart').click();
  assert.equal(resets, 3);
  assert.equal(f.frames.size, 1);
});

test('a hidden load failure restores the complete working URL and exposes the requested area for reload', async t => {
  t.mock.method(console, 'error', () => {});
  const scenes = [];
  const garden = area('garden', async () => ({ default: visit(garden, scenes) }));
  const secret = area('secret', async () => { throw new TypeError('module unavailable'); }, false);
  const f = gameFixture(t, { garden, secret }, 'garden&source=park#gate', { online: false });
  await f.ready;
  const prior = f.location.href;
  f.location.searchParams.set('source', 'hidden');
  f.go('secret');
  await setImmediate();
  assert.equal(f.location.href, prior);
  assert.match(f.game.querySelector('#notice').textContent, /unavailable offline/);
  const retry = f.game.querySelector('#area-retry');
  assert.equal(retry.hidden, false);
  assert.match(retry.href, /area=secret/);
  assert.match(retry.href, /source=hidden/);
  assert.deepEqual(scenes, ['garden']);
  assert.equal(f.game.querySelector('#choose-level').disabled, false);
});

test('context loss cancels an in-flight import and offers a reload without further render calls', async t => {
  const waiting = Promise.withResolvers();
  const scenes = [];
  let unloaded = 0;
  const garden = area('garden', async () => ({
    default: { ...garden, load: () => ({ obstacles: [], missionStatus: { missions: [] }, unload() { unloaded++; } }) },
  }));
  const snow = area('snow', () => waiting.promise);
  const f = gameFixture(t, { garden, snow }, 'garden');
  await f.ready;
  f.tick(0);
  f.game.querySelector('#start').click();
  f.go('snow');
  assert.equal(f.game.dataset.state, 'traveling');
  send(f.game.querySelector('#view'), 'webglcontextlost');
  waiting.resolve({ default: visit(snow, scenes) });
  await setImmediate();
  assert.equal(f.disposed, 1);
  assert.equal(unloaded, 1);
  assert.equal(f.frames.size, 0);
  assert.deepEqual(scenes, []);
  assert.equal(f.game.dataset.state, 'error');
  assert.match(f.game.querySelector('#menu-message').textContent, /WebGL context was lost/);
  f.game.querySelector('#start').click();
  assert.equal(f.reloads, 1);
});

test('travel clears camera guidance and pointer lock before the next area receives controls', async t => {
  let finishRide;
  let oldUpdates = 0;
  let newUpdates = 0;
  const garden = area('garden', async () => ({
    default: {
      ...garden,
      load() {
        return {
          obstacles: [], missionStatus: { missions: [] },
          update() { oldUpdates++; },
          interactions: [{
            x: 0, z: 0,
            act({ guideCamera }) { finishRide = guideCamera(); },
          }],
        };
      },
    },
  }));
  const snow = area('snow', async () => ({
    default: { ...snow, load: () => ({ obstacles: [], missionStatus: { missions: [] }, update() { newUpdates++; } }) },
  }));
  const f = gameFixture(t, { garden, snow }, 'garden');
  await f.ready;
  f.game.querySelector('#start').click();
  const canvas = f.game.querySelector('#view');
  f.document.pointerLockElement = canvas;
  f.document.exitPointerLock = () => { f.document.pointerLockElement = null; };
  send(f.document, 'pointerlockchange');
  send(f.window, 'keydown', { code: 'Space' });
  assert.equal(f.game.dataset.seated, 'true');
  assert.equal(typeof finishRide, 'function');

  f.go('snow');
  assert.equal(f.document.pointerLockElement, null);
  await setImmediate();
  finishRide({ x: 3, z: 3 });
  assert.equal(f.game.dataset.seated, undefined);
  f.game.querySelector('#start').click();
  send(f.window, 'keydown', { code: 'KeyW' });
  f.tick(0);
  f.tick(16);
  assert.equal(oldUpdates, 0);
  assert.equal(newUpdates, 2);
  assert.equal(f.renders.at(-1).position.x, 0);
  assert.ok(f.renders.at(-1).position.z < 0);
  assert.equal(f.game.querySelector('#interaction').hidden, true);
});

test('a stalled transition times out, ignores restart while pending and restores the last scene', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.mock.method(console, 'error', () => {});
  const slow = Promise.withResolvers();
  let resets = 0;
  const scenes = [];
  const garden = area('garden', async () => ({
    default: { ...garden, load: () => ({ obstacles: [], missionStatus: { missions: [] }, reset() { resets++; } }) },
  }));
  const snow = area('snow', () => slow.promise);
  const f = gameFixture(t, { garden, snow }, 'garden');
  await f.ready;
  f.go('snow');
  f.game.querySelector('#restart').click();
  assert.equal(resets, 1);
  t.mock.timers.tick(30_000);
  await setImmediate();
  assert.equal(f.game.dataset.state, 'menu');
  assert.equal(f.location.searchParams.get('area'), 'garden');
  assert.equal(f.game.querySelector('#restart').disabled, false);
  assert.match(f.game.querySelector('#notice').textContent, /snow could not load/);
  slow.resolve({ default: visit(snow, scenes) });
  await setImmediate();
  assert.deepEqual(scenes, []);
});

test('hidden scene initialization errors are distinct from unavailable downloads', async t => {
  t.mock.method(console, 'error', () => {});
  let cleaned = 0;
  const garden = area('garden', async () => { throw new Error('unrelated'); });
  const secret = area('secret', async () => ({
    default: {
      ...secret,
      load({ onCleanup }) {
        onCleanup(() => { cleaned++; });
        return { obstacles: [], missionStatus: null };
      },
    },
  }), false);
  const f = gameFixture(t, { garden, secret }, 'secret', { online: false });
  await f.ready;
  assert.equal(cleaned, 1);
  assert.equal(f.game.dataset.state, 'error');
  assert.match(f.game.querySelector('#menu-message').textContent, /secret could not initialize/);
});

test('settings default to one finger, pause gameplay, and restore a saved control mode', async t => {
  const garden = area('garden', async () => ({ default: visit(garden, []) }));
  const preferences = new Map([['kids-world-controls', 'third-person']]);
  const first = gameFixture(t, { garden }, 'garden', { preferences });
  await first.ready;
  assert.equal(first.game.dataset.controls, 'one-finger');
  first.game.querySelector('#start').click();
  first.game.querySelector('#open-settings').click();
  const dialog = first.game.querySelector('#settings');
  assert.equal(dialog.open, true);
  assert.equal(first.game.dataset.state, 'paused');

  const change = new Event('change');
  Object.defineProperty(change, 'target', { value: { name: 'controls', value: 'two-finger', checked: true } });
  dialog.dispatchEvent(change);
  assert.equal(first.game.dataset.controls, 'two-finger');
  assert.equal(preferences.get('kids-world-controls'), 'two-finger');

  const reopened = gameFixture(t, { garden }, 'garden', { preferences });
  await reopened.ready;
  assert.equal(reopened.game.dataset.controls, 'two-finger');
  assert.equal(reopened.game.querySelector('#settings').querySelector('#controls-two-finger').checked, true);
});

test('speed sliders clamp persisted values and scale keyboard turn and movement independently', async t => {
  const garden = area('garden', async () => ({ default: visit(garden, []) }));
  const preferences = new Map([['kids-world-turn-speed', '130'], ['kids-world-move-speed', '45']]);
  const fixture = gameFixture(t, { garden }, 'garden', { preferences });
  const { game, window, renders } = fixture;
  await fixture.ready;
  const dialog = game.querySelector('#settings');
  const turn = dialog.querySelector('#turn-speed');
  const move = dialog.querySelector('#move-speed');
  assert.equal(turn.value, '100');
  assert.equal(move.value, '50');
  assert.equal(dialog.querySelector('#move-speed-value').textContent, '50%');

  turn.value = '50';
  turn.dispatchEvent(new Event('input'));
  game.querySelector('#start').click();
  const key = (event, code) => window.dispatchEvent(Object.assign(new Event(event), { code }));
  key('keydown', 'ArrowRight');
  for (let i = 0; i <= 10; i++) fixture.tick(i * 20);
  assert.ok(Math.abs(renders.at(-1).yaw + .165) < 1e-8);
  key('keyup', 'ArrowRight');

  const start = renders.at(-1).position;
  key('keydown', 'KeyW');
  for (let i = 11; i <= 30; i++) fixture.tick(i * 20);
  const distance = renders.at(-1).position.distanceTo(start);
  assert.ok(distance > .75 && distance < .82, `Unexpected movement distance ${distance}`);
  key('keyup', 'KeyW');

  turn.dispatchEvent(new Event('change'));
  move.value = '73';
  move.dispatchEvent(new Event('change'));
  assert.equal(preferences.get('kids-world-turn-speed'), '50');
  assert.equal(preferences.get('kids-world-move-speed'), '73');
  assert.equal(dialog.querySelector('#move-speed-value').textContent, '73%');
});
