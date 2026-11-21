import assert from 'node:assert/strict';
import { test } from 'node:test';
import { areas } from '../game.js';
import { hasArea, isPublicArea, loadAreaDefinition, validateAreaRegistry } from '../core/area-registry.js';
import { createGame } from '../core/game.js';

test('the central registry explicitly declares visibility and identifies all public areas', async () => {
  validateAreaRegistry(areas);
  assert.deepEqual(Object.keys(areas).filter(id => isPublicArea(areas, id)), [
    'garden', 'snow', 'wooden-house', 'frozen-castle', 'arendelle-village', 'princess-gallery', 'military-base',
  ]);
  assert.equal(areas['secret-apartment'].show, false);
  assert.equal(hasArea(areas, 'secret-apartment'), true);
  assert.equal(hasArea(areas, 'missing'), false);
  assert.equal(hasArea(areas, 'constructor'), false);
  assert.equal(isPublicArea(areas, ['garden']), false);
  for (const [id, entry] of Object.entries(areas)) {
    assert.equal(entry.id, id);
    assert.equal(entry.load, undefined);
    assert.equal(entry.music, undefined);
    const definition = await loadAreaDefinition(id, entry);
    const { loadModule, show, thumbnail, ...metadata } = entry;
    for (const [name, value] of Object.entries(metadata)) assert.deepEqual(definition[name], value, `${id} ${name}`);
    assert.equal(typeof definition.load, 'function');
    assert.equal(Boolean(thumbnail), show);
  }
});

test('game startup rejects missing, inherited, and non-boolean visibility', async () => {
  const invalidDefinitions = [
    {},
    Object.create({ show: true }),
    { show: 'true' },
    { show: 'false' },
    { show: 1 },
    { show: null },
    null,
  ];
  for (const area of invalidDefinitions) {
    await assert.rejects(createGame({ areas: { invalid: area } }), {
      name: 'TypeError',
      message: 'Area "invalid" must declare "show" as true or false.',
    });
  }
});

test('registry rejects malformed metadata and loaders with the area and property in the error', () => {
  const entry = { ...areas.garden, id: 'meadow' };
  for (const [property, overrides] of [
    ['id', { id: 'garden' }],
    ['loadModule', { loadModule: null }],
    ['width', { width: 0 }],
    ['depth', { depth: Infinity }],
    ['spawn.x', { spawn: { x: '0', z: 0 } }],
    ['spawn.z', { spawn: { x: 0 } }],
    ['spawn.yaw', { spawn: { x: 0, z: 0, yaw: NaN } }],
    ['spawn.elevation', { spawn: { x: 0, z: 0, elevation: null } }],
    ['title', { title: '' }],
    ['description', { description: ' ' }],
    ['canvasLabel', { canvasLabel: false }],
    ['themeColor', { themeColor: null }],
    ['heading', { heading: ['One'] }],
    ['heading', { heading: ['', ' '] }],
    ['loadingMessage', { loadingMessage: {} }],
    ['completionRevision', { completionRevision: -1 }],
  ]) {
    assert.throws(() => validateAreaRegistry({ meadow: { ...entry, ...overrides } }), error =>
      error instanceof TypeError && error.message.includes('Area "meadow"') && error.message.includes(`"${property}"`));
  }
  assert.doesNotThrow(() => validateAreaRegistry({
    meadow: { ...entry, heading: ['Meadow', ''], spawn: { x: 0, z: 0 } },
  }));
});

test('checks the loader promise and the loaded definition before use', async () => {
  const entry = areas.garden;
  const definition = { ...entry, load: () => ({}) };
  await assert.rejects(loadAreaDefinition('garden', { ...entry, loadModule: () => ({ default: definition }) }),
    /must return a Promise/);
  await assert.rejects(loadAreaDefinition('garden', { ...entry, loadModule: async () => ({}) }),
    /must default-export/);
  await assert.rejects(loadAreaDefinition('garden', {
    ...entry, loadModule: async () => ({ default: { ...definition, id: 'snow' } }),
  }), /matching its registry key/);
});
