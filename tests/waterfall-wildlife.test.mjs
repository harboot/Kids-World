import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import valley from '../areas/waterfall-valley/index.js';
import { CLIFF_Z, LAKE_LEVEL, X_MIN, heightGrid, riverLevel, terrainHeight } from '../areas/waterfall-valley/landform.js';
import { createMineLayout } from '../areas/waterfall-valley/mine-layout.js';

function build() {
  const scene = new THREE.Scene();
  let reduced = false;
  const visit = valley.load({ THREE, scene, reducedMotion: () => reduced });
  const named = prefix => scene.children.filter(item => item.name.startsWith(prefix));
  return { scene, visit, named, reduce: () => { reduced = true; } };
}

test('deer and rabbits animate over valid ground and the ranger tracks a nearby player', () => {
  const { scene, visit, named, reduce } = build();
  const deer = named('Mountain deer ');
  const rabbits = named('Meadow rabbit ');
  const ranger = scene.getObjectByName('Park ranger');
  const terrain = heightGrid(X_MIN, 72, CLIFF_Z, 88, terrainHeight);
  assert.equal(deer.length, 3);
  assert.equal(rabbits.length, 6);
  for (const name of ['Camper', 'Fisherman', 'Retired miner']) assert.ok(scene.getObjectByName(name));
  const head = ranger.children[1];
  const startRotation = head.rotation.y;
  const locations = [...deer, ...rabbits].map(animal => animal.position.clone());
  const eye = new THREE.Vector3(ranger.position.x + 3, ranger.position.y + 1.68, ranger.position.z);
  for (let i = 0; i < 240; i++) {
    visit.update(0.05, eye);
    for (const animal of [...deer, ...rabbits]) {
      if (!animal.visible) continue;
      const { x, y, z } = animal.position;
      const floor = terrain.sample(x, z);
      assert.ok(y >= floor - 0.001 && y <= floor + 0.17);
      assert.equal(visit.blocksGround(x, z, 0.25, floor, { x, z }), false);
    }
  }
  assert.ok(Math.abs(head.rotation.y - startRotation) > 0.2);
  assert.ok(deer.some((animal, i) => !animal.position.equals(locations[i])));
  assert.ok(rabbits.some((animal, i) => !animal.position.equals(locations[i + deer.length])));
  const before = deer[0].position.clone();
  reduce();
  visit.update(0.05, eye);
  assert.ok(deer[0].position.equals(before));
  visit.reset();
  assert.ok(deer[0].position.equals(locations[0]));
  assert.deepEqual(visit.missionStatus.missions, []);
  assert.equal(visit.interactions.some(item => /fish|feed|fire|collect crystal|restore power/i.test(item.label)), false);
});

test('shoaling fish stay submerged and Echo Lake bats and droplets remain in the cave', () => {
  const { scene, visit, named } = build();
  const terrain = heightGrid(X_MIN, 72, CLIFF_Z, 88, terrainHeight);
  const mine = createMineLayout(THREE);
  const lakeFish = named('Lake trout '), riverFish = named('River trout ');
  assert.ok(lakeFish.length > 3 && riverFish.length > 3);
  assert.ok(named('Valley bird ').length >= 3);
  const bats = named('Echo Lake bat ');
  for (const [school, x, z, level] of [
    [lakeFish, 16, 8, () => LAKE_LEVEL], [riverFish, 4, 33, riverLevel],
  ]) {
    const first = school[0].position.clone();
    const eye = { x, y: 2.4, z };
    for (let i = 0; i < 90; i++) {
      visit.update(0.05, eye);
      for (const fish of school.filter(item => item.visible)) {
        const { x, y, z } = fish.position;
        assert.ok(y <= level(z) - 0.13 && y >= terrain.sample(x, z) + 0.13);
      }
    }
    assert.ok(school.some(item => item.visible));
    assert.ok(!school[0].position.equals(first));
  }

  const eye = { x: -42, y: 5.1, z: -49 };
  for (let i = 0; i < 125; i++) {
    visit.update(0.05, eye);
    for (const bat of bats.filter(item => item.visible)) {
      const { x, y, z } = bat.position;
      assert.ok(mine.opening.sample(x, z) > 1);
      assert.ok(y < mine.ceiling.sample(x, z) && y > mine.floor.sample(x, z));
    }
  }
  assert.ok(bats.some(item => item.visible));
  assert.equal(scene.getObjectByName('Echo Lake falling droplets').visible, true);
  assert.equal(scene.getObjectByName('Echo Lake droplet ripples').visible, true);
});
