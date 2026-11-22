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

test('both cows keep their routes and collision footprint while walking and greeting', async t => {
  const { area, scene, worlds } = await fixture(t);
  const cows = scene.children.filter(object => /^Cow [12]$/.test(object.name));
  const greetings = area.animals.interactions.filter(item => item.label === 'Greet cow');
  const cowMission = area.missionStatus.missions.find(mission => mission.id === 'cow');
  assert.equal(cows.length, 2);
  assert.equal(greetings.length, 2);

  const parts = (cow, name) => cow.getObjectsByProperty('name', 'Cow ' + name);
  const pose = cow => {
    const transforms = [];
    cow.traverse(({ position, rotation, scale }) => {
      transforms.push([position.toArray(), rotation.toArray(), scale.toArray()]);
    });
    return transforms;
  };
  const initial = cows.map(pose);
  const routes = [[-7.45, .52, 1.14, .43, 1.9], [-3.39, .58, 1.07, -.39, .65]];
  const hips = cows.flatMap(cow => parts(cow, 'hip'));
  const knees = cows.flatMap(cow => parts(cow, 'knee'));
  assert.equal(hips.length, 8);
  assert.equal(knees.length, 8);
  assert.equal(parts(cows[0], 'head')[0].children[0].geometry, parts(cows[1], 'head')[0].children[0].geometry);
  assert.notEqual(parts(cows[0], 'torso')[0].children[0].geometry, parts(cows[1], 'torso')[0].children[0].geometry);
  const swungForward = new Set();
  const swungBack = new Set();
  const bent = new Set();
  for (let frame = 1; frame <= 180; frame++) {
    area.animals.update(.1, { x: 0, z: 9 });
    cows.forEach((cow, i) => {
      const [center, rx, rz, pace, offset] = routes[i];
      const angle = frame * .1 * pace + offset;
      assert.ok(Math.abs(cow.position.x - (center + rx * Math.cos(angle))) < 1e-9);
      assert.ok(Math.abs(cow.position.z - (-6.96 + rz * Math.sin(angle))) < 1e-9);
      assert.ok(cow.position.x > -9.8 && cow.position.x < -.9);
      assert.ok(cow.position.z > -11.5 && cow.position.z < -2.1);
    });
    hips.forEach(hip => {
      if (hip.rotation.x < -.05) swungForward.add(hip);
      if (hip.rotation.x > .05) swungBack.add(hip);
    });
    knees.forEach(knee => {
      if (knee.rotation.x > .05) bent.add(knee);
    });
  }
  assert.equal(swungForward.size, 8);
  assert.equal(swungBack.size, 8);
  assert.equal(bent.size, 8);

  const [cow] = cows;
  const [greet] = greetings;
  const localPoint = (x, z) => cow.localToWorld(new THREE.Vector3(x, 0, z));
  const inside = localPoint(.45 + PLAYER_RADIUS - .01, .24);
  const outside = localPoint(.45 + PLAYER_RADIUS + .01, .24);
  assert.ok(area.animals.blocks(inside.x, inside.z, 1.49));
  assert.equal(area.animals.blocks(inside.x, inside.z, 1.5), false);
  assert.equal(area.animals.surface(inside.x, inside.z, 1.5), 1.5);
  assert.equal(area.animals.blocks(outside.x, outside.z, 0), false);
  assert.equal(area.animals.surface(outside.x, outside.z, 1.5), -Infinity);

  const position = cow.position.clone();
  const tail = parts(cow, 'tail')[0];
  const sway = tail.rotation.z;
  for (let frame = 0; frame < 20; frame++) area.animals.update(.05, position);
  assert.ok(cow.position.equals(position), 'the route pauses instead of walking into the player');
  assert.ok(hips.slice(0, 4).every(hip => Math.abs(hip.rotation.x) < .001));
  assert.notEqual(tail.rotation.z, sway);

  greet.act();
  assert.equal(greet.active, false);
  assert.equal(cowMission.complete, true);
  area.animals.update(.3, { x: 0, z: 9 });
  assert.ok(cow.position.equals(position));
  assert.ok(parts(cow, 'head')[0].rotation.x > .18);
  worlds.reset();
  assert.deepEqual(cows.map(pose), initial);
  assert.ok(greetings.every(interaction => interaction.active));
  assert.equal(cowMission.complete, false);

  area.animals.update(3.99, cow.position.clone());
  assert.ok(parts(cow, 'eyes')[0].scale.y < .1);
  area.animals.update(.15, cow.position.clone());
  assert.ok(parts(cow, 'eyes')[0].scale.y > .99);
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
