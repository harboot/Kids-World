import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { areas } from '../game.js';
import { renderAreaList } from '../core/area-picker.js';
import { createLevelProgress } from '../core/level-progress.js';
import { createWorldManager } from '../core/world-manager.js';

const publicFolders = {
  garden: 'flower-garden',
  snow: 'snow-basin',
  'wooden-house': 'wooden-house',
  'frozen-castle': 'frozen-castle',
  'arendelle-village': 'arendelle-village',
  'princess-gallery': 'princess-gallery',
  'military-base': 'military-base',
};

class Element extends EventTarget {
  children = [];
  dataset = {};
  attributes = new Map();

  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(name, value) { this.attributes.set(name, value); }
}

test('the picker lists all public areas with thumbnails, regardless of missions or current area', async () => {
  const list = new Element();
  list.ownerDocument = { createElement: () => new Element() };
  let saved = JSON.stringify(['snow', 'secret-apartment']);
  const progress = createLevelProgress(areas, () => ({
    getItem: () => saved,
    setItem(key, value) { saved = value; },
  }));
  const selected = [];
  const select = id => selected.push(id);
  renderAreaList(list, { areas, progress, current: 'secret-apartment', select });

  assert.deepEqual(list.children.map(card => card.dataset.area), Object.keys(publicFolders));
  assert.deepEqual(list.children.filter(card => card.children[2]).map(card => card.dataset.area), ['snow']);
  assert.ok(list.children.every(card => !card.attributes.has('aria-current')));
  const release = JSON.parse(await readFile(new URL('../version.json', import.meta.url)));
  await Promise.all(list.children.map(async card => {
    const { area } = card.dataset;
    const [thumbnail, title] = card.children;
    const folder = publicFolders[area];
    const asset = `areas/${folder}/${folder}.jpg`;
    assert.equal(card.type, 'button');
    assert.equal(title.textContent, areas[area].title);
    assert.ok(thumbnail.src.endsWith('/' + asset));
    assert.equal(thumbnail.alt, '');
    const image = await readFile(new URL(thumbnail.src));
    assert.deepEqual([...image.subarray(0, 3)], [0xff, 0xd8, 0xff]);
    assert.ok(release.files.some(file => file.path === './' + asset), asset);
    card.dispatchEvent(new Event('click'));
  }));
  assert.deepEqual(selected.sort(), Object.keys(publicFolders).sort());

  progress.complete('princess-gallery');
  renderAreaList(list, { areas, progress, current: 'princess-gallery', select });
  const [current] = list.children.filter(card => card.attributes.get('aria-current') === 'location');
  assert.equal(current.dataset.area, 'princess-gallery');
  assert.equal(current.children[2].children[1], 'Missions complete');
  assert.equal(JSON.parse(saved).includes('princess-gallery'), true);
});

test('each public world loads with no completion record and has only local interactions', t => {
  const worlds = createWorldManager(THREE, {
    areas, camera: new THREE.PerspectiveCamera(), touch: true, playerRadius: 0.34,
    services: { isLevelComplete: () => false },
  });
  t.after(worlds.unload);
  const destinations = Object.values(areas).map(area => area.title);
  for (const id of Object.keys(publicFolders)) {
    const { area, definition } = worlds.load(id);
    assert.equal(definition, areas[id]);
    assert.equal(area.arrivals, undefined, id);
    assert.ok(area.interactions.every(item => item.destination === undefined), id);
    for (const { label } of area.interactions) {
      assert.ok(destinations.every(title => !label.includes(title)), label);
    }
  }
});
