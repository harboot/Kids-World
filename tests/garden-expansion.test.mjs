import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { areas } from '../game.js';
import { BALLOON } from '../areas/flower-garden/garden-balloon.js';
import { caveCenterline, CAVE_MOUTHS } from '../areas/flower-garden/garden-cave.js';
import { flowerGarden } from '../areas/flower-garden/index.js';
import { nearestInteraction } from '../core/interactions.js';
import { PLAYER_RADIUS, walkElevation } from '../core/movement.js';
import { createPlayer, EYE_HEIGHT } from '../core/player.js';
import { createWorldManager } from '../core/world-manager.js';

async function fixture(t, reduced = false) {
  const camera = new THREE.PerspectiveCamera();
  const player = createPlayer(THREE, camera);
  const worlds = createWorldManager(THREE, {
    areas, camera, playerRadius: PLAYER_RADIUS,
    services: { carryPlayer: player.carryVertically, reducedMotion: () => reduced },
  });
  const visit = await worlds.load('garden');
  const relocate = spawn => player.reset(spawn, visit.area);
  relocate(flowerGarden.spawn);
  t.after(worlds.unload);
  function advance(seconds, direction = new THREE.Vector2()) {
    for (let frame = 0; frame < Math.ceil(seconds * 40); frame++) {
      player.move(.025, direction, visit);
      worlds.update(.025, camera.position);
    }
  }
  function follow(points) {
    const direction = new THREE.Vector2();
    for (const [x, z] of points) {
      for (let frame = 0; frame < 160; frame++) {
        direction.set(x - camera.position.x, z - camera.position.z);
        if (direction.length() < .12) break;
        advance(.025, direction.clampLength(0, 1));
      }
      assert.ok(Math.hypot(x - camera.position.x, z - camera.position.z) < .12, `could not walk to ${x}, ${z}`);
      player.stop();
    }
  }
  return { ...visit, worlds, camera, player, relocate, advance, follow };
}

test('a picked bunch attracts every hill rabbit and feeding can repeat', async t => {
  const { area, scene, camera, relocate, follow, advance, worlds } = await fixture(t);
  const rabbits = scene.children.filter(object => /^Hill rabbit \d$/.test(object.name));
  assert.equal(rabbits.length, 5);
  const homes = rabbits.map(rabbit => rabbit.position.clone());
  assert.ok(homes.every(home => home.y > .65));
  const pickup = area.interactions.find(item => item.label === 'Pick carrots');
  const feed = area.interactions.find(item => item.label === 'Feed the rabbits');
  const mission = area.missionStatus.missions[3];
  const carrots = scene.getObjectByName('Rabbit feeding tray').children.filter(child => child.name === 'Carrot');
  assert.equal(feed.active, false);
  feed.act();
  assert.equal(mission.complete, false);

  function offer() {
    relocate({ x: pickup.x, z: pickup.z - 1 });
    assert.equal(nearestInteraction(area.interactions, camera.position), pickup);
    pickup.act();
    assert.deepEqual(area.missionStatus.inventory, ['Carrots']);
    assert.equal(pickup.active, false);
    follow([[pickup.x, feed.z - 1.19], [feed.x, feed.z - 1.19]]);
    assert.equal(nearestInteraction(area.interactions, camera.position), feed);
    feed.act();
    assert.deepEqual(area.missionStatus.inventory, []);
    assert.ok(carrots.every(item => item.visible));
  }
  offer();
  advance(1.8);
  assert.equal(mission.complete, false);
  assert.ok(rabbits.every((rabbit, i) => rabbit.position.distanceTo(homes[i]) > .2));
  advance(1.5);
  assert.equal(mission.complete, true);
  assert.ok(rabbits.every(rabbit => Math.hypot(rabbit.position.x - feed.x, rabbit.position.z - feed.z) < 1.8));
  advance(6);
  assert.ok(rabbits.every((rabbit, i) => rabbit.position.equals(homes[i])));
  assert.ok(carrots.every(item => !item.visible));
  offer();
  worlds.reset();
  assert.equal(mission.complete, false);
  assert.deepEqual(area.missionStatus.inventory, []);
  assert.ok(rabbits.every((rabbit, i) => rabbit.position.equals(homes[i])));
});

test('both pen gates swing out and the shelters contain feed and rows of eggs', async t => {
  const { area, scene, relocate, advance, follow, worlds } = await fixture(t);
  const trough = scene.getObjectByName('Cow feeding shelter').getObjectByName('Grass-filled feeding trough');
  const nests = scene.getObjectByName('Chicken nesting shelter').getObjectByName('Two rows of chicken nests');
  assert.ok(trough.children.some(batch => batch.count === 22), 'tufts of grass');
  assert.ok(nests.children.some(batch => batch.geometry.type === 'SphereGeometry' && batch.count === 18), 'individual eggs');
  const gates = area.interactions.filter(item => item.label === 'Open');
  assert.equal(gates.length, 2);
  gates.forEach((gate, index) => {
    const leaf = scene.getObjectByName(index === 0 ? 'Cow pen gate' : 'Chicken pen gate');
    const { x, z } = gate;
    assert.equal(walkElevation(area, { x, z: z + .66 }, x, z + .21, 0, true), null);
    relocate({ x: x + .68, z: z + 2.1 });
    gate.act();
    advance(.9);
    assert.ok(leaf.rotation.y < 0 && leaf.rotation.y > -Math.PI / 2, 'the moving gate waits when its swing reaches the player');
    follow([[x + 1.75, z + 2.1]]);
    advance(.9);
    assert.equal(leaf.rotation.y, -Math.PI / 2);
    const end = leaf.localToWorld(new THREE.Vector3(2.6, 0, 0));
    assert.ok(end.z > z + 2.5);
    follow([[x, z + .5], [x, z - .7]]);
    gate.act();
    advance(.9);
    assert.equal(leaf.rotation.y, 0);
  });
  worlds.reset();
  assert.ok(gates.every(gate => gate.label === 'Open'));
});

test('both cave mouths connect along the walkable corridor and release bats on approach', async t => {
  const { area, scene, camera, relocate, follow, advance, worlds } = await fixture(t);
  const [west, east] = CAVE_MOUTHS;
  const bats = scene.children.filter(object => /^Cave bat \d$/.test(object.name));
  assert.equal(bats.length, 6);
  assert.ok(scene.getObjectByName('Rock mountain and walk-through cave'));
  const x = 10.54;
  const z = caveCenterline(x);
  assert.ok(Math.abs(z + 19.66) < .35);
  assert.equal(walkElevation(area, { x, z }, x, z + 1.65, 0, true), null);
  assert.ok(area.getCeilingHeight(x, z) > EYE_HEIGHT + .5);
  assert.equal(area.getCeilingHeight(x, z + 11), Infinity);
  const route = Array.from({ length: 15 }, (_, i) => {
    const x = west.x + (east.x - west.x) * i / 14;
    return [x, caveCenterline(x)];
  });
  for (const [mouth, other, path] of [[west, east, route], [east, west, [...route].reverse()]]) {
    worlds.reset();
    relocate({ x: mouth.x + 1.91 * mouth.direction, z: mouth.z });
    advance(.81);
    assert.ok(bats.every(bat => bat.visible && (bat.position.x - mouth.x) * mouth.direction > 0));
    const wing = bats[0].getObjectByName('Bat wing');
    const angle = wing.rotation.z;
    advance(.045);
    assert.notEqual(wing.rotation.z, angle);
    advance(3);
    assert.ok(bats.every(bat => !bat.visible));
    follow([...path, [other.x + other.direction * 1.47, other.z]]);
    assert.ok(Math.abs(camera.position.y - EYE_HEIGHT) < 1e-5);
    assert.ok(bats.some(bat => bat.visible));
  }
  worlds.reset();
  assert.ok(bats.every(bat => !bat.visible));
});

test('the balloon boards, carries, contains and returns the real player', async t => {
  const { area, scene, camera, relocate, advance, player, worlds } = await fixture(t);
  const craft = scene.getObjectByName('Flower Garden hot air balloon');
  const ride = area.interactions.find(item => item.label === 'Ride the hot air balloon');
  assert.deepEqual([craft.position.x, craft.position.z], [BALLOON.x, BALLOON.z]);
  assert.equal(scene.children.filter(child => child.name === 'Panorama lake').length, 3);
  relocate({ x: ride.x, z: ride.z - .5 });
  assert.equal(nearestInteraction(area.interactions, camera.position), ride);
  ride.act({ relocate });
  assert.ok(camera.position.y > EYE_HEIGHT);
  assert.equal(ride.active, false);
  advance(2);
  assert.ok(craft.position.y > 2 && craft.position.y < BALLOON.rise);
  const relative = camera.position.y - craft.position.y;
  advance(14);
  assert.equal(craft.position.y, BALLOON.rise);
  assert.ok(Math.abs(camera.position.y - craft.position.y - relative) < 1e-5);
  assert.ok(player.grounded);
  assert.equal(ride.label, 'Bring the balloon down');
  assert.equal(nearestInteraction(area.interactions, camera.position), ride);
  assert.ok(!ride.reachable({ x: BALLOON.x, y: EYE_HEIGHT, z: BALLOON.z }));
  assert.ok(player.jump());
  advance(1.6, new THREE.Vector2(1, 1).normalize());
  assert.ok(Math.hypot(camera.position.x - BALLOON.x, camera.position.z - BALLOON.z) < 1.5);
  ride.act({ relocate });
  advance(15);
  assert.equal(craft.position.y, 0);
  assert.deepEqual(camera.position.toArray(), [ride.x, EYE_HEIGHT, ride.z]);
  assert.equal(ride.label, 'Ride the hot air balloon');
  worlds.reset();
  assert.equal(craft.position.y, 0);
});

test('reduced motion settles the balloon and rabbits without flight or hopping animation', async t => {
  const { area, scene, relocate, advance, worlds } = await fixture(t, true);
  const ride = area.interactions.find(item => item.label === 'Ride the hot air balloon');
  const craft = scene.getObjectByName('Flower Garden hot air balloon');
  relocate({ x: ride.x, z: ride.z });
  ride.act({ relocate });
  advance(.025);
  assert.equal(craft.position.y, BALLOON.rise);
  ride.act({ relocate });
  advance(.025);
  assert.equal(craft.position.y, 0);
  area.interactions.find(item => item.label === 'Pick carrots').act();
  area.interactions.find(item => item.label === 'Feed the rabbits').act();
  advance(.025);
  assert.ok(area.missionStatus.missions[3].complete);
  relocate(CAVE_MOUTHS[0]);
  advance(1);
  assert.equal(scene.getObjectByName('Cave bat 1').visible, false);
  worlds.unload();
  assert.equal(scene.children.length, 0);
});
