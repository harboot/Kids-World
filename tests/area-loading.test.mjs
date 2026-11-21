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
  style = {};
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
  click() { this.dispatchEvent(new Event('click')); }
}

function gameFixture(t, areas, startingArea) {
  const window = new EventTarget();
  const document = new Element();
  document.createElement = () => new Element();
  const game = new Element();
  game.ownerDocument = document;
  const location = new URL(`https://example.test/Kids-World/?area=${startingArea}`);
  const writes = [];
  const history = {
    pushState(state, title, url) { location.href = url; writes.push(['push', location.href]); },
    replaceState(state, title, url) { location.href = url; writes.push(['replace', location.href]); },
  };

  for (const [name, value] of Object.entries({
    window, document, history, location,
    matchMedia: () => ({ matches: false }),
    ResizeObserver: class { observe() {} },
    requestAnimationFrame: () => {},
    localStorage: { getItem: () => null, setItem: () => {} },
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
  }

  return {
    ready: createGame({ game, loadThree: async () => ({ ...THREE, WebGLRenderer }), areas, defaultArea: 'garden' }),
    game, location, writes,
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
