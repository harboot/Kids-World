import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { areas } from '../game.js';
import { BALLOON } from '../areas/flower-garden/garden-balloon.js';
import { caveCenterline, CAVE_MOUTHS } from '../areas/flower-garden/garden-cave.js';
import { MONKEY_TREE } from '../areas/flower-garden/garden-monkey.js';
import { BACK_HILL, HILL } from '../areas/flower-garden/garden-terrain.js';
import { flowerGarden } from '../areas/flower-garden/index.js';
import { nearestInteraction } from '../core/interactions.js';
import { PLAYER_RADIUS, walkElevation } from '../core/movement.js';
import { createPlayer, EYE_HEIGHT } from '../core/player.js';
import { createWorldManager } from '../core/world-manager.js';

async function fixture(t, reduced = false) {
  const camera = new THREE.PerspectiveCamera();
  const player = createPlayer(THREE, camera);
  const cues = [];
  const worlds = createWorldManager(THREE, {
    areas, camera, playerRadius: PLAYER_RADIUS,
    services: { reducedMotion: () => reduced, playCue: cue => cues.push(cue) },
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
  return { ...visit, worlds, camera, player, relocate, advance, follow, cues };
}

test('a picked bunch attracts every hill rabbit and feeding can repeat', async t => {
  const { area, scene, camera, relocate, follow, advance, worlds } = await fixture(t);
  const rabbits = scene.children.filter(object => /^Hill rabbit \d$/.test(object.name));
  assert.equal(rabbits.length, 5);
  const homes = rabbits.map(rabbit => rabbit.position.clone());
  assert.ok(homes.every(home => home.y > .65));
  const pickup = area.interactions.find(item => item.label === 'Pick carrots');
  const feed = area.interactions.find(item => item.label === 'Feed the rabbits');
  const mission = area.missionStatus.missions.find(item => item.id === 'rabbits');
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

test('both smaller pen gates open inward on approach and close after the player leaves', async t => {
  const { area, scene, relocate, advance, follow, worlds, cues } = await fixture(t);
  const trough = scene.getObjectByName('Cow feeding shelter').getObjectByName('Grass-filled feeding trough');
  const nests = scene.getObjectByName('Chicken nesting shelter').getObjectByName('Two rows of chicken nests');
  assert.ok(trough.children.some(batch => batch.count === 22), 'tufts of grass');
  assert.ok(nests.children.some(batch => batch.geometry.type === 'SphereGeometry' && batch.count === 18), 'individual eggs');
  assert.ok(area.interactions.every(item => !['Open', 'Close', 'Greet cow', 'Make chicken jump'].includes(item.label)));
  for (const [name, id] of [['Cow', 'cow-gate'], ['Chicken', 'chicken-gate']]) {
    const leaf = scene.getObjectByName(name + ' pen gate');
    const { x: hinge, z } = leaf.position;
    const x = hinge + .82;
    assert.equal(walkElevation(area, { x, z: z + .66 }, x, z + .21, 0, true), null);
    relocate({ x, z: z + 2.1 });
    const before = cues.length;
    advance(.9);
    assert.equal(leaf.rotation.y, Math.PI / 2);
    const end = leaf.localToWorld(new THREE.Vector3(1.64, 0, 0));
    assert.ok(end.z < z - 1.6);
    assert.equal(area.missionStatus.missions.find(mission => mission.id === id).complete, true);
    follow([[x, z + .5], [x, z - .7], [x, z + 3.3]]);
    advance(.9);
    assert.equal(leaf.rotation.y, 0);
    assert.equal(cues.length, before + 2);
  }
  worlds.reset();
  assert.ok(area.missionStatus.missions.every(mission => !mission.complete));
});

test('both cows keep their routes and collision footprint while walking and greeting', async t => {
  const { area, scene, worlds, cues } = await fixture(t);
  const cows = scene.children.filter(object => /^Cow [12]$/.test(object.name));
  const cowMission = area.missionStatus.missions.find(mission => mission.id === 'cow');
  assert.equal(cows.length, 2);

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
  const bodyGeometry = parts(cows[0], 'torso')[0].children[0].geometry;
  assert.equal(bodyGeometry.type, 'BoxGeometry');
  for (const cow of cows) {
    cow.children[0].traverse(part => {
      if (part.isMesh) assert.equal(part.geometry, bodyGeometry);
    });
  }
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

  const visitor = localPoint(1.10, .24);
  visitor.y = EYE_HEIGHT;
  const before = cues.length;
  area.animals.update(.025, visitor);
  assert.equal(cues.length, before + 1);
  assert.equal(cowMission.complete, true);
  area.animals.update(.3, { x: 0, z: 9 });
  assert.ok(cow.position.equals(position));
  assert.ok(parts(cow, 'head')[0].rotation.x > .18);
  worlds.reset();
  assert.deepEqual(cows.map(pose), initial);
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

test('the balloon moves its camera while the player stays at the boarding point', async t => {
  const { area, scene, camera, relocate, advance, player, worlds } = await fixture(t);
  const craft = scene.getObjectByName('Flower Garden hot air balloon');
  const ride = area.interactions.find(item => item.label === 'Ride the hot air balloon');
  const mission = area.missionStatus.missions.find(item => item.id === 'balloon');
  assert.deepEqual([craft.position.x, craft.position.z], [BALLOON.x, BALLOON.z]);
  assert.equal(scene.children.filter(child => child.name === 'Panorama lake').length, 3);
  relocate({ x: ride.x, z: ride.z - .5 });
  assert.equal(nearestInteraction(area.interactions, camera.position), ride);
  const start = camera.position.clone();
  let descent;
  let flightCamera;
  ride.act({
    guideCamera(look, options) {
      descent = options.prompt;
      flightCamera = options.camera;
      return player.guide(look);
    },
  });
  assert.ok(camera.position.equals(start));
  assert.equal(ride.active, false);
  assert.equal(descent.active, false);
  advance(2);
  assert.ok(craft.position.y > 2 && craft.position.y < BALLOON.rise);
  const relative = flightCamera.position.y - craft.position.y;
  advance(14, new THREE.Vector2(1, 1).normalize());
  assert.equal(craft.position.y, BALLOON.rise);
  assert.ok(Math.abs(flightCamera.position.y - craft.position.y - relative) < 1e-5);
  const yaw = flightCamera.rotation.y;
  player.look(.45, .1);
  assert.notEqual(flightCamera.rotation.y, yaw);
  assert.ok(camera.position.equals(start));
  assert.equal(camera.rotation.y, 0);
  assert.equal(player.jump(), false);
  assert.equal(descent.active, true);
  descent.act();
  advance(15);
  assert.equal(craft.position.y, 0);
  assert.ok(camera.position.equals(start));
  assert.equal(player.grounded, true);
  assert.equal(ride.active, true);
  assert.equal(mission.complete, true);
  worlds.reset();
  assert.equal(mission.complete, false);
});

test('reduced motion settles garden actions without flight or hopping animation', async t => {
  const { area, scene, relocate, advance, player, worlds } = await fixture(t, true);
  const ride = area.interactions.find(item => item.label === 'Ride the hot air balloon');
  const craft = scene.getObjectByName('Flower Garden hot air balloon');
  relocate({ x: ride.x, z: ride.z });
  let descent;
  ride.act({ guideCamera(look, options) { descent = options.prompt; return player.guide(look); } });
  advance(.025);
  assert.equal(craft.position.y, BALLOON.rise);
  descent.act();
  advance(.025);
  assert.equal(craft.position.y, 0);
  area.interactions.find(item => item.label === 'Pick carrots').act();
  area.interactions.find(item => item.label === 'Feed the rabbits').act();
  advance(.025);
  assert.ok(area.missionStatus.missions.find(item => item.id === 'rabbits').complete);
  relocate(CAVE_MOUTHS[0]);
  advance(1);
  assert.equal(scene.getObjectByName('Cave bat 1').visible, false);
  assert.ok(area.missionStatus.missions.find(item => item.id === 'cave').complete);
  worlds.unload();
  assert.equal(scene.children.length, 0);
});

test('three apples fall once, the trunk shakes, and delivery advances the single hint', async t => {
  const { area, scene, camera, relocate, advance, follow, worlds } = await fixture(t);
  const { missionStatus, interactions } = area;
  const shake = interactions.find(item => item.label === 'Shake tree');
  const basket = interactions.find(item => item.label === 'Pick up basket');
  assert.match(missionStatus.hint, /Pick up the basket/);
  const start = { x: shake.x - 1.8, z: shake.z };
  const close = shake.x - 1.24;
  const feet = area.getGroundHeight(start.x, start.z);
  assert.equal(walkElevation(area, start, close, start.z, feet, true), null);
  basket.act();
  assert.match(missionStatus.hint, /Shake tree/);
  relocate(start);
  assert.equal(nearestInteraction(interactions, camera.position), shake);
  shake.act();
  assert.equal(shake.active, false);
  advance(.12);
  assert.notEqual(scene.getObjectByName('Apple tree trunk').parent.rotation.z, 0);
  assert.equal(area.blocksGround(close, start.z, PLAYER_RADIUS, feet, start), false);
  advance(1.25);
  const drops = scene.getObjectsByProperty('name', 'Fallen apple');
  assert.equal(drops.filter(drop => drop.visible).length, 3);
  assert.match(missionStatus.hint, /Collect all three/);
  for (const item of interactions.filter(item => item.label === 'Collect apple')) {
    assert.equal(item.active, true);
    item.act();
  }
  shake.act();
  assert.ok(drops.every(drop => !drop.visible));
  assert.match(missionStatus.hint, /porch steps/);
  const deliver = interactions.find(item => item.label === 'Place basket');
  relocate({ x: -17.6, z: -11 });
  follow([[-17.6, -15], [-18.65, -15.38]]);
  assert.equal(nearestInteraction(interactions, camera.position), deliver);
  deliver.act();
  assert.ok(missionStatus.missions[0].complete);
  assert.match(missionStatus.hint, /fish feeder/);
  worlds.reset();
  assert.equal(shake.active, true);
  assert.ok(drops.every(drop => !drop.visible));
});

test('the furnished single-storey house is walkable under its closed roof', async t => {
  const { area, scene, camera, relocate, advance, follow, player } = await fixture(t);
  const door = area.interactions.find(item => item.label === 'Open house door');
  const leaf = scene.getObjectByName('Garden house door');
  relocate({ x: door.x, z: -11 });
  follow([[door.x, -15.45]]);
  assert.equal(nearestInteraction(area.interactions, camera.position), door);
  assert.equal(walkElevation(area, camera.position, door.x, door.z + .05, camera.position.y - EYE_HEIGHT, true), null);
  door.act();
  advance(1);
  assert.equal(leaf.rotation.y, Math.PI / 2);
  for (const name of ['Closed garden house roof', 'Garden house ceiling', 'Garden house bed',
    'Garden house kitchen', 'Garden house toilet and partition']) assert.ok(scene.getObjectByName(name), name);
  follow([[door.x, -18.4], [-16.3, -20.91], [-16.49, -23.4], [-16.49, -27.05], [-15.82, -27.05]]);
  assert.equal(camera.position.y, EYE_HEIGHT + 1.02);
  const ceiling = area.getCeilingHeight(camera.position.x, camera.position.z);
  assert.ok(Number.isFinite(ceiling));
  assert.ok(player.jump());
  for (let frame = 0; frame < 40; frame++) {
    advance(.025);
    assert.ok(camera.position.y + .14 <= ceiling + 1e-8);
  }
  follow([[-16.49, -27.05], [-16.49, -23.4], [-20.16, -23.4], [-20.16, -24.21]]);
  assert.equal(camera.position.y, EYE_HEIGHT + 1.02);
  const feet = camera.position.y - EYE_HEIGHT;
  assert.equal(walkElevation(area, camera.position, -20.16, -24.65, feet, true), null, 'the bed is solid');
  assert.equal(walkElevation(area, { x: -16.3, z: -20.91 }, -15.25, -20.91, feet, true), null, 'the counter is solid');
  assert.equal(walkElevation(area, { x: -16.8, z: -27 }, -17.12, -27, feet, true), null, 'the toilet partition is solid');
  follow([[-20.16, -23.4], [door.x, -23.4], [door.x, -15.5]]);
  assert.equal(area.getCeilingHeight(door.x, -15.5), Infinity);
});

test('the monkey reveals itself headfirst on approach and the back hill remains taller', async t => {
  const { area, scene, relocate, advance, cues } = await fixture(t);
  assert.ok(area.getGroundHeight(BACK_HILL.x, BACK_HILL.z) > HILL.height * 1.8);
  const tail = scene.getObjectByName('Swaying monkey tail');
  const monkey = scene.getObjectByName('Upside-down monkey');
  const oldAngle = tail.rotation.z;
  assert.equal(monkey.visible, false);
  advance(.16);
  assert.notEqual(oldAngle, tail.rotation.z);
  const [mx, mz] = MONKEY_TREE;
  const before = cues.length;
  relocate({ x: mx + 1, z: mz + 1.5 });
  advance(.6);
  assert.ok(monkey.visible && Math.cos(monkey.rotation.z) < -.98);
  assert.equal(cues.length, before + 1);
  assert.ok(area.missionStatus.missions.find(item => item.id === 'monkey').complete);
  relocate({ x: mx + 4, z: mz + 4 });
  advance(.6);
  assert.equal(monkey.visible, false);
});
