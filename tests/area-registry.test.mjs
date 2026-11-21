import assert from 'node:assert/strict';
import { test } from 'node:test';
import { areas } from '../game.js';
import { hasArea, isPublicArea, validateAreaRegistry } from '../core/area-registry.js';
import { createGame } from '../core/game.js';

test('the central registry explicitly declares visibility and identifies all public areas', () => {
  validateAreaRegistry(areas);
  assert.deepEqual(Object.keys(areas).filter(id => isPublicArea(areas, id)), [
    'garden', 'snow', 'wooden-house', 'frozen-castle', 'arendelle-village', 'princess-gallery', 'military-base',
  ]);
  assert.equal(areas['secret-apartment'].show, false);
  assert.equal(hasArea(areas, 'secret-apartment'), true);
  assert.equal(hasArea(areas, 'missing'), false);
  assert.equal(hasArea(areas, 'constructor'), false);
  assert.equal(isPublicArea(areas, ['garden']), false);
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

test('registry rejects malformed definitions with the area and property in the error', () => {
  const definition = areas.garden;
  for (const [property, overrides] of [
    ['load', { load: null }],
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
  ]) {
    assert.throws(() => validateAreaRegistry({ meadow: { ...definition, ...overrides } }), error =>
      error instanceof TypeError && error.message.includes('Area "meadow"') && error.message.includes(`"${property}"`));
  }
  assert.doesNotThrow(() => validateAreaRegistry({
    meadow: { ...definition, heading: ['Meadow', ''], spawn: { x: 0, z: 0 } },
  }));
});
