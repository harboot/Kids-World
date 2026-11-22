import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { areas } from '../game.js';
import { exhibits } from '../areas/princess-gallery/exhibits.js';
import { CARPET_DOCK } from '../areas/princess-gallery/jasmine-carpet.js';
import { LAMP_SITE } from '../areas/princess-gallery/jasmine-characters.js';
import { AGRABAH_BALCONY } from '../areas/princess-gallery/jasmine-palace.js';
import { spaceTransform } from '../areas/princess-gallery/parts.js';
import { nearestInteraction } from '../core/interactions.js';
import { overlaps, PLAYER_RADIUS, walkElevation } from '../core/movement.js';
import { createPlayer, EYE_HEIGHT } from '../core/player.js';
import { createWorldManager } from '../core/world-manager.js';

const exhibit = exhibits.find(entry => entry.id === 'jasmine');
const { toWorld } = spaceTransform(exhibit);

function spawn(x, z) {
  const [wx, wz] = toWorld(x, z);
  return { x: wx, z: wz };
}

async function fixture(t, still = false) {
  const camera = new THREE.PerspectiveCamera();
  const player = createPlayer(THREE, camera);
  const cues = [];
  const worlds = createWorldManager(THREE, {
    areas, camera, touch: true, playerRadius: PLAYER_RADIUS,
    services: {
      reducedMotion: () => still,
      isPlayerGrounded: () => player.grounded,
      playCue: notes => cues.push(notes),
    },
  });
  t.after(worlds.unload);
  const visit = await worlds.load('princess-gallery');
  const { area, scene } = visit;
  const carpet = scene.getObjectByName('Agrabah magic carpet');
  const mission = area.missionStatus.missions.find(row => row.id === 'jasmine');
  const restored = [];
  function guideCamera(look) {
    const release = player.guide(look);
    return landing => {
      if (!release()) return;
      restored.push(landing);
      player.reset(landing, area);
    };
  }
  const update = dt => worlds.update(dt, camera.position);
  player.reset(spawn(CARPET_DOCK.x, CARPET_DOCK.landingZ), area);
  return { area, scene, camera, player, worlds, carpet, mission, cues, guideCamera, restored, update };
}

test('Agrabah has a walkable balcony and solid palace walls and characters', async t => {
  const { area, scene } = await fixture(t);
  for (const name of ['Agrabah Palace', 'Agrabah balcony', 'Desert city rooftops',
    'Agrabah desert city panorama', 'Jasmine', 'Aladin', 'Agrabah magic lamp']) {
    assert.ok(scene.getObjectByName(name), name);
  }

  let from = spawn(0, 7.05);
  let feet = 0;
  for (let z = 6.95; z >= 1.42; z -= .10) {
    const next = spawn(0, z);
    feet = walkElevation(area, from, next.x, next.z, feet, true);
    assert.notEqual(feet, null, 'stairs are walkable at z ' + z);
    from = next;
  }
  assert.equal(feet, AGRABAH_BALCONY);
  const palace = spawn(0, -.45);
  assert.equal(walkElevation(area, from, palace.x, palace.z, feet, true), null);
  for (const [x, z, base] of [[-2.07, 1.57, feet], [3.92, 5.33, 0]]) {
    const actor = spawn(x, z);
    assert.equal(walkElevation(area, actor, actor.x, actor.z, base, true), null);
  }
});

test('the guided carpet circles the palace with clearance and completes the mission at a safe landing', async t => {
  const { area, camera, player, carpet, mission, guideCamera, restored, update } = await fixture(t);
  const ride = area.interactions.find(item => item.label === 'Ride the magic carpet');
  assert.equal(nearestInteraction(area.interactions, camera.position), ride);
  assert.equal(ride.reachable({ x: camera.position.x, y: EYE_HEIGHT + 12, z: camera.position.z }), false);
  assert.ok(player.jump());
  assert.equal(ride.reachable(camera.position), false);
  player.reset(spawn(CARPET_DOCK.x, CARPET_DOCK.landingZ), area);

  ride.act({ guideCamera });
  assert.equal(player.guided, true);
  assert.equal(ride.active, false);
  const path = { east: false, west: false, rear: false };
  for (let step = 0; step < 420 && player.guided; step++) {
    update(.05);
    if (player.guided) assert.equal(mission.complete, false);
    const { x, y, z } = carpet.position;
    if (y >= 4.45) {
      path.east ||= x > 7;
      path.west ||= x < -7;
      path.rear ||= z < -7;
      const [wx, wz] = toWorld(x, z);
      assert.ok(!area.obstacles.some(solid => y < solid.height && overlaps(solid, wx, wz)),
        'flight clearance at ' + [x, y, z]);
    }
  }
  assert.deepEqual(path, { east: true, west: true, rear: true });
  assert.equal(player.guided, false);
  assert.equal(player.grounded, true);
  assert.equal(mission.complete, true);
  assert.equal(restored.length, 1);
  assert.equal(camera.position.y, EYE_HEIGHT);
  assert.equal(restored[0].yaw, exhibit.rotation);
  assert.ok(!area.obstacles.some(solid => overlaps(solid, camera.position.x, camera.position.z)));
  assert.deepEqual(carpet.position.toArray(), [CARPET_DOCK.x, CARPET_DOCK.height, CARPET_DOCK.z]);

  ride.act({ guideCamera });
  assert.equal(player.guided, true);
  update(3.5);
  assert.ok(carpet.position.y > 4);
  assert.equal(restored.length, 1);
});

test('reduced motion keeps the carpet level and reset interrupts the ride without completing the mission', async t => {
  const { area, player, carpet, camera, mission, worlds, guideCamera, restored, update } = await fixture(t, true);
  const ride = area.interactions.find(item => item.label === 'Ride the magic carpet');
  ride.act({ guideCamera });
  for (let i = 0; i < 210; i++) {
    update(.05);
    assert.ok(Math.abs(carpet.rotation.z) < 1e-6);
    assert.ok(Math.abs(camera.rotation.z) < 1e-6);
  }
  assert.ok(carpet.position.y > 4);
  assert.equal(mission.complete, false);
  worlds.reset();
  assert.equal(player.guided, false);
  assert.equal(ride.active, true);
  assert.equal(restored.length, 1);
  assert.equal(mission.complete, false);
  assert.equal(carpet.position.y, CARPET_DOCK.height);
  update(30);
  assert.equal(mission.complete, false);
});

test('rubbing the lamp raises Jin from the spout and allows another greeting after he disappears', async t => {
  const { area, scene, player, camera, mission, cues, worlds, update } = await fixture(t);
  const lamp = area.interactions.find(item => item.label === 'Rub the magic lamp');
  const jin = scene.getObjectByName('Jin emerging from the lamp');
  assert.equal(jin.visible, false);
  lamp.act();
  assert.equal(cues.length, 0);
  player.reset(spawn(LAMP_SITE.x, LAMP_SITE.z + 1.62), area);
  assert.equal(nearestInteraction(area.interactions, camera.position), lamp);
  lamp.act();
  update(.42);
  assert.equal(jin.visible, true);
  assert.ok(jin.scale.x < 1);
  assert.equal(lamp.active, false);
  update(.58);
  assert.equal(jin.scale.x, 1);
  assert.equal(mission.complete, false);
  update(5);
  assert.equal(jin.visible, false);
  assert.equal(lamp.active, true);
  lamp.act();
  update(.78);
  assert.equal(jin.visible, true);
  assert.equal(cues.length, 2);
  worlds.reset();
  assert.equal(jin.visible, false);
  assert.equal(lamp.active, true);
});
