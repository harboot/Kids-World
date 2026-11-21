import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { addGroup, addMesh, paintCanvasTexture, rectangleBounds } from '../core/geometry.js';
import { seededRandom } from '../core/random.js';
import { createScenery } from '../areas/arendelle-village/scenery.js';

test('centered bounds use the original axis edges and retain village quarter-turn footprints', () => {
  assert.deepEqual(rectangleBounds(-2, 4, 6, 3), { left: -5, right: 1, front: 2.5, back: 5.5 });
  const obstacles = [];
  const kit = createScenery(THREE, new THREE.Scene(), null, obstacles);
  const house = kit.group('House', 10, 2, 20, Math.PI / 2);
  kit.solid(house, 6, 4, 5, 2, 1);
  assert.deepEqual(obstacles, [{ left: 9, right: 13, front: 15, back: 21, height: 7 }]);
});

test('mesh and group placement retain local transforms and use the supplied resources', () => {
  const scene = new THREE.Scene();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial();
  const empty = addGroup(THREE, scene, 'Origin');
  const group = addGroup(THREE, scene, 'Building', 6, 2, -3, Math.PI / 2);
  const mesh = addMesh(THREE, group, geometry, material, 1, 3, 2, 5, 4, 2);
  assert.deepEqual(empty.position.toArray(), [0, 0, 0]);
  assert.equal(empty.rotation.y, 0);
  assert.equal(group.name, 'Building');
  assert.equal(group.parent, scene);
  assert.equal(mesh.parent, group);
  assert.equal(mesh.geometry, geometry);
  assert.equal(mesh.material, material);
  assert.deepEqual(mesh.position.toArray(), [1, 3, 2]);
  assert.deepEqual(mesh.scale.toArray(), [5, 4, 2]);
  const world = mesh.getWorldPosition(new THREE.Vector3());
  assert.ok(world.distanceTo(new THREE.Vector3(8, 5, -4)) < 1e-9);
});

test('painted canvas textures retain the color space, filtering and headless fallback', () => {
  const ink = {};
  const canvas = { getContext(type) { assert.equal(type, '2d'); return ink; } };
  const document = { createElement(tag) { assert.equal(tag, 'canvas'); return canvas; } };
  const texture = paintCanvasTexture(THREE, document, 64, 32, (context, width, height) => {
    assert.equal(context, ink);
    assert.deepEqual([width, height], [64, 32]);
    assert.deepEqual([canvas.width, canvas.height], [64, 32]);
  });
  assert.equal(texture.image, canvas);
  assert.equal(texture.colorSpace, THREE.SRGBColorSpace);
  assert.equal(texture.anisotropy, 4);
  assert.equal(paintCanvasTexture(THREE, null, 64, 32, assert.fail), null);
  assert.equal(paintCanvasTexture(THREE, { createElement: () => ({ getContext: () => null }) }, 64, 32, assert.fail), null);
});

test('seeded scenery sequences retain the garden and village values and independent state', () => {
  const garden = seededRandom(728);
  const village = seededRandom(391);
  assert.equal(garden(), 2225678423 / 4294967296);
  assert.equal(village(), 1664733498 / 4294967296);
  assert.equal(garden(), 1335339466 / 4294967296);
  assert.equal(village(), 3194335057 / 4294967296);
});
