import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nearestInteraction } from '../core/interactions.js';
import { areaURL, createWorldManager, resolveArea } from '../core/world-manager.js';

class Node {
  children = [];
  parent = null;

  add(child) {
    child.removeFromParent();
    child.parent = this;
    this.children.push(child);
  }

  removeFromParent() {
    if (!this.parent) return;
    this.parent.children.splice(this.parent.children.indexOf(this), 1);
    this.parent = null;
  }

  traverse(visit) {
    visit(this);
    for (const child of this.children) child.traverse(visit);
  }

  clear() {
    for (const child of [...this.children]) child.removeFromParent();
  }
}

const THREE = { Scene: Node, Group: Node };

function registered(id, area) {
  const metadata = {
    id, title: id, heading: [id, ''], description: id, themeColor: '#000', canvasLabel: id,
    width: 10, depth: 10, spawn: { x: 0, z: 0 },
  };
  return { ...metadata, show: true, loadModule: async () => ({ default: { ...metadata, ...area } }) };
}

function areaFixture(name, events) {
  const disposed = [];
  const target = new EventTarget();

  function resource(label) {
    return { dispose() { disposed.push(label); } };
  }

  return {
    show: true,
    disposed,
    target,
    load({ scene, viewmodel, signal }) {
      events.push(`${name} load`);
      const geometry = resource('geometry');
      const texture = { ...resource('texture'), isTexture: true };
      const material = { ...resource('material'), map: texture };
      const instance = Object.assign(new Node(), {
        ...resource('instance'),
        geometry,
        material,
        isInstancedMesh: true,
      });
      const carried = Object.assign(new Node(), { geometry, material: [material] });
      const light = Object.assign(new Node(), { shadow: resource('shadow') });
      scene.add(instance);
      scene.add(light);
      viewmodel.add(carried);
      target.addEventListener('ping', () => events.push(`${name} ping`), { signal });

      const interactions = [{ x: 0, z: 0, label: name }];
      const obstacles = [{ height: 2 }];
      const area = {
        interactions,
        obstacles,
        state: 0,
        update(dt) { this.state += dt; },
        reset() {
          this.state = 0;
          events.push(`${name} reset`);
        },
        unload() {
          assert.ok(signal.aborted);
          events.push(`${name} unload`);
        },
      };
      return area;
    },
  };
}

test('area travel unloads the old world and attaches only the new world and viewmodel', async () => {
  const events = [];
  const garden = areaFixture('garden', events);
  const snow = areaFixture('snow', events);
  const camera = new Node();
  const worlds = createWorldManager(THREE, {
    areas: { garden: registered('garden', garden), snow: registered('snow', snow) }, camera,
  });

  const firstVisit = await worlds.load('garden');
  worlds.update(1);
  assert.equal(firstVisit.area.state, 1);
  worlds.reset();
  assert.equal(firstVisit.area.state, 0);
  assert.equal(worlds.active, firstVisit);
  assert.equal(garden.disposed.length, 0);
  worlds.update(2);

  const second = await worlds.load('snow');
  assert.deepEqual(events, ['garden load', 'garden reset', 'garden reset', 'snow load', 'snow reset', 'garden unload']);
  assert.deepEqual(garden.disposed.sort(), ['geometry', 'instance', 'material', 'shadow', 'texture']);
  assert.equal(firstVisit.scene.children.length, 0);
  assert.equal(firstVisit.viewmodel.children.length, 0);
  assert.equal(camera.parent, second.scene);
  assert.deepEqual(camera.children, [second.viewmodel]);
  assert.equal(nearestInteraction(second.area.interactions, { x: 0, z: 0 }).label, 'snow');
  assert.notEqual(second.area.obstacles, firstVisit.area.obstacles);

  garden.target.dispatchEvent(new Event('ping'));
  snow.target.dispatchEvent(new Event('ping'));
  worlds.update(1);
  assert.equal(events.at(-1), 'snow ping');
  assert.equal(firstVisit.area.state, 2);
  assert.equal(second.area.state, 1);

  const returnVisit = await worlds.load('garden');
  assert.equal(returnVisit.area.state, 0);
  assert.notEqual(returnVisit.area.interactions, firstVisit.area.interactions);
  assert.deepEqual(snow.disposed.sort(), ['geometry', 'instance', 'material', 'shadow', 'texture']);
  garden.target.dispatchEvent(new Event('ping'));
  assert.equal(events.filter(event => event === 'garden ping').length, 1);

  worlds.unload();
  worlds.unload();
  assert.equal(worlds.active, null);
  assert.equal(camera.parent, null);
  assert.deepEqual(camera.children, []);
  assert.equal(events.filter(event => event === 'garden unload').length, 2);
});

test('a failed load cleans up its resources and leaves the current world available', async () => {
  let aborted = false;
  let disposed = false;
  const camera = new Node();
  const worlds = createWorldManager(THREE, {
    camera,
    areas: {
      garden: registered('garden', areaFixture('garden', [])),
      broken: registered('broken', {
        load({ viewmodel, signal }) {
          signal.addEventListener('abort', () => { aborted = true; });
          viewmodel.add(Object.assign(new Node(), { geometry: { dispose() { disposed = true; } } }));
          throw new Error('broken');
        },
      }),
    },
  });

  const garden = await worlds.load('garden');
  await assert.rejects(worlds.load('broken'), /broken/);
  assert.equal(worlds.active, garden);
  assert.equal(camera.parent, garden.scene);
  assert.deepEqual(camera.children, [garden.viewmodel]);
  assert.ok(aborted);
  assert.ok(disposed);
});

test('coalesces duplicate imports and activates only the newest request', async () => {
  const firstImport = Promise.withResolvers();
  const events = [];
  const garden = registered('garden', areaFixture('garden', events));
  const snow = registered('snow', areaFixture('snow', events));
  let imports = 0;
  const areas = { garden: { ...garden, loadModule() { imports++; return firstImport.promise; } }, snow };
  const worlds = createWorldManager(THREE, { areas, camera: new Node() });
  const first = worlds.load('garden');
  assert.equal(worlds.load('garden'), first);
  assert.equal(imports, 1);
  assert.equal(worlds.active, null);
  const newest = await worlds.load('snow');
  firstImport.resolve(await garden.loadModule());
  assert.equal(await first, null);
  assert.equal(worlds.active, newest);
  assert.deepEqual(events, ['snow load', 'snow reset']);
});

test('a rejected import preserves the active world and stale failures are ignored', async () => {
  const failure = Promise.withResolvers();
  const areas = {
    garden: registered('garden', areaFixture('garden', [])),
    snow: { loadModule: () => failure.promise },
  };
  const worlds = createWorldManager(THREE, { areas, camera: new Node() });
  const current = await worlds.load('garden');
  const canceled = worlds.load('snow');
  worlds.cancelLoad();
  failure.reject(new Error('module unavailable'));
  assert.equal(await canceled, null);
  await assert.rejects(worlds.load('snow'), /module unavailable/);
  await assert.rejects(worlds.load('constructor'), /Unknown area/);
  assert.equal(worlds.active, current);
  assert.equal(current.lifetime.signal.aborted, false);
});

test('area routes honor explicit and legacy links, with a saved area as a fallback', () => {
  const areas = { garden: { show: true }, snow: { show: true }, apartment: { show: false } };
  const root = new URL('https://example.test/Kids-World/');
  assert.equal(resolveArea(root, areas, 'garden'), 'garden');
  assert.equal(resolveArea(root, areas, 'garden', 'snow'), 'snow');
  assert.equal(resolveArea(new URL('./index.html?arrive=garden', root), areas, 'garden', 'snow'), 'garden');
  assert.equal(resolveArea(new URL('./index.html?area=snow', root), areas, 'garden', 'garden'), 'snow');
  assert.equal(resolveArea(new URL('./?area=unknown', root), areas, 'garden', 'unknown'), 'garden');
  assert.equal(resolveArea(new URL('./?area=constructor', root), areas, 'garden', 'snow'), 'snow');
  assert.throws(() => resolveArea(root, areas, 'apartment'), /Default area "apartment" must be public/);
  const route = areaURL(new URL('./index.html?arrive=garden&source=test#scene', root), 'snow');
  assert.equal(route.href, 'https://example.test/Kids-World/index.html?source=test&area=snow#scene');
  assert.equal(resolveArea(route, areas, 'garden'), 'snow');
});

test('history URLs keep the area, other query parameters and hash', () => {
  const areas = { garden: { show: true }, snow: { show: true } };
  const initial = new URL('https://example.test/Kids-World/?arrive=garden&source=test&tag=a&tag=b#scene');
  const garden = areaURL(initial, 'garden');
  const snow = areaURL(garden, 'snow');
  for (const [url, id] of [[garden, 'garden'], [snow, 'snow']]) {
    assert.equal(resolveArea(url, areas, 'garden', 'snow'), id);
    assert.equal(url.searchParams.get('source'), 'test');
    assert.deepEqual(url.searchParams.getAll('tag'), ['a', 'b']);
    assert.equal(url.searchParams.has('arrive'), false);
    assert.equal(url.hash, '#scene');
    assert.equal(url.pathname, '/Kids-World/index.html');
    assert.equal(areaURL(url, id).href, url.href);
  }
});

test('a throwing unload hook and disposer leave the next scene active and clean the rest once', async t => {
  const log = t.mock.method(console, 'error', () => {});
  const released = [];
  let oldObject;
  const camera = new Node();
  const world = createWorldManager(THREE, {
    camera,
    areas: {
      garden: registered('garden', {
        load({ scene, onCleanup }) {
          oldObject = Object.assign(new Node(), {
            geometry: { dispose() { released.push('geometry'); throw new Error('disposer failed'); } },
            material: { dispose() { released.push('material'); } },
          });
          scene.add(oldObject);
          onCleanup(() => released.push('off-scene cleanup'));
          return {
            unload() {
              oldObject.removeFromParent();
              throw new Error('unload failed');
            },
          };
        },
      }),
      snow: registered('snow', { load: () => ({}) }),
    },
  });
  assert.equal(world.state, 'unloaded');
  const old = await world.load('garden');
  const next = await world.load('snow');
  assert.equal(old.state, 'disposed');
  assert.equal(next.state, 'active');
  assert.equal(world.active, next);
  assert.equal(camera.parent, next.scene);
  assert.equal(log.mock.callCount(), 2);
  assert.deepEqual(released, ['off-scene cleanup', 'geometry', 'material']);
  world.unload();
  world.unload();
  assert.deepEqual(released, ['off-scene cleanup', 'geometry', 'material']);
  assert.equal(next.state, 'disposed');
});

test('keeps shared scene, shader, render target, and camera resources until their last owner leaves', async () => {
  const disposed = [];
  const resource = (name, fields = {}) => ({ ...fields, dispose() { disposed.push(name); } });
  const geometry = resource('geometry');
  const image = resource('texture', { isTexture: true });
  const target = resource('target', { isRenderTarget: true });
  const attachment = resource('attachment', { isTexture: true, renderTarget: target });
  const permanent = resource('camera geometry');
  const camera = new Node();
  camera.add(Object.assign(new Node(), { geometry: permanent }));
  let firstMesh;

  const worlds = createWorldManager(THREE, {
    camera,
    areas: {
      garden: registered('garden', {
        load({ scene }) {
          firstMesh = Object.assign(new Node(), {
            geometry, isInstancedMesh: true, morphTexture: image,
            dispose() {
              disposed.push('instance');
              this.morphTexture?.dispose();
            },
            material: [resource('garden material', { map: image }), resource('target material', { map: attachment })],
            shadow: { map: target, mapPass: target, dispose() { target.dispose(); target.dispose(); } },
          });
          scene.add(firstMesh);
          return {};
        },
      }),
      snow: registered('snow', {
        load({ viewmodel }) {
          viewmodel.add(Object.assign(new Node(), {
            geometry,
            material: resource('snow material', { uniforms: { inputs: { value: [image, attachment] } } }),
          }));
          return {};
        },
      }),
    },
  });
  await worlds.load('garden');
  await worlds.load('snow');
  assert.deepEqual(disposed.sort(), ['garden material', 'instance', 'target material']);
  assert.equal(firstMesh.morphTexture, null);
  worlds.unload();
  worlds.unload();
  assert.deepEqual(disposed.sort(), ['garden material', 'geometry', 'instance', 'snow material', 'target',
    'target material', 'texture']);
  assert.equal(camera.children.length, 1);
});

test('failed preparation aborts and cleans the candidate, preserving resources and guarded services of the old visit', async () => {
  let oldServices;
  let rejectedServices;
  const events = [];
  const shared = { dispose() { events.push('shared disposed'); } };
  const temp = { dispose() { events.push('temporary disposed'); } };
  const worlds = createWorldManager(THREE, {
    camera: new Node(),
    services: {
      playCue: () => events.push('sound'),
      completeLevel: () => events.push('completed'),
    },
    prepare(visit) {
      if (visit.id === 'snow') throw new Error('preflight failed');
    },
    areas: {
      garden: registered('garden', {
        load(context) {
          oldServices = context;
          context.scene.add(Object.assign(new Node(), { geometry: shared }));
          return {};
        },
      }),
      snow: registered('snow', {
        load(context) {
          rejectedServices = context;
          context.scene.add(Object.assign(new Node(), { geometry: shared, material: temp }));
          context.onCleanup(() => events.push('candidate cleanup'));
          context.completeLevel();
          return {};
        },
      }),
    },
  });
  const old = await worlds.load('garden');
  await assert.rejects(worlds.load('snow'), /preflight failed/);
  assert.equal(worlds.active, old);
  assert.equal(rejectedServices.signal.aborted, true);
  rejectedServices.playCue();
  rejectedServices.completeLevel();
  oldServices.playCue();
  assert.deepEqual(events, ['candidate cleanup', 'temporary disposed', 'sound']);
  worlds.unload();
  oldServices.completeLevel();
  assert.deepEqual(events, ['candidate cleanup', 'temporary disposed', 'sound', 'shared disposed']);
});

test('cancel settles immediately and a late rejected import cannot run a scene hook', async () => {
  const importResult = Promise.withResolvers();
  const worlds = createWorldManager(THREE, {
    camera: new Node(), areas: { garden: { loadModule: () => importResult.promise } },
  });
  const result = worlds.load('garden');
  assert.equal(worlds.state, 'loading');
  worlds.cancelLoad();
  assert.equal(await result, null);
  assert.equal(worlds.state, 'unloaded');
  importResult.reject(new Error('late import error'));
  await Promise.resolve();
  assert.equal(worlds.active, null);
});
