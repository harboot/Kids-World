import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nearestInteraction } from '../core/interactions.js';
import { areaURL, createWorldManager, historyArrival, resolveArea } from '../core/world-manager.js';

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

test('area travel unloads the old world and attaches only the new world and viewmodel', () => {
  const events = [];
  const garden = areaFixture('garden', events);
  const snow = areaFixture('snow', events);
  const camera = new Node();
  const worlds = createWorldManager(THREE, { areas: { garden, snow }, camera });

  const firstVisit = worlds.load('garden');
  worlds.update(1);
  assert.equal(firstVisit.area.state, 1);
  worlds.reset();
  assert.equal(firstVisit.area.state, 0);
  assert.equal(worlds.active, firstVisit);
  assert.equal(garden.disposed.length, 0);
  worlds.update(2);

  const second = worlds.load('snow');
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

  const returnVisit = worlds.load('garden');
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

test('a failed load cleans up its resources and leaves the current world available', () => {
  let aborted = false;
  let disposed = false;
  const camera = new Node();
  const worlds = createWorldManager(THREE, {
    camera,
    areas: {
      garden: areaFixture('garden', []),
      broken: {
        show: true,
        load({ viewmodel, signal }) {
          signal.addEventListener('abort', () => { aborted = true; });
          viewmodel.add(Object.assign(new Node(), { geometry: { dispose() { disposed = true; } } }));
          throw new Error('broken');
        },
      },
    },
  });

  const garden = worlds.load('garden');
  assert.throws(() => worlds.load('broken'), /broken/);
  assert.equal(worlds.active, garden);
  assert.equal(camera.parent, garden.scene);
  assert.deepEqual(camera.children, [garden.viewmodel]);
  assert.ok(aborted);
  assert.ok(disposed);
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

test('history routes keep their area, named arrival, query parameters and hash', () => {
  const areas = { garden: { show: true }, snow: { show: true } };
  const initial = new URL('https://example.test/Kids-World/?arrive=garden&source=test&tag=a&tag=b#scene');
  const garden = areaURL(initial, 'garden');
  const snow = areaURL(garden, 'snow');
  const arrivalState = { area: 'garden', arrival: 'cabin' };
  for (const [url, state, id, arrival] of [
    [garden, arrivalState, 'garden', 'cabin'],
    [snow, null, 'snow', undefined],
  ]) {
    assert.equal(resolveArea(url, areas, 'garden', 'snow'), id);
    assert.equal(historyArrival(id, state), arrival);
    assert.equal(url.searchParams.get('source'), 'test');
    assert.deepEqual(url.searchParams.getAll('tag'), ['a', 'b']);
    assert.equal(url.searchParams.has('arrive'), false);
    assert.equal(url.hash, '#scene');
    assert.equal(url.pathname, '/Kids-World/index.html');
    assert.equal(areaURL(url, id).href, url.href);
  }
  assert.equal(historyArrival('snow', arrivalState), undefined);
  assert.equal(historyArrival('garden', { area: 'garden', arrival: 1 }), undefined);
});
