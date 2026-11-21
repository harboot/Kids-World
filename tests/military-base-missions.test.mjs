import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { areas } from '../game.js';
import { cruiseAltitude, flightDurations, sampleCircuit } from '../areas/military-base/helicopter-flight.js';
import { passengerEye } from '../areas/military-base/helicopter.js';
import { headquarters, helipad, motorPool, repairTank } from '../areas/military-base/layout.js';
import { createDroneCamera } from '../core/drone-view.js';
import { nearestInteraction } from '../core/interactions.js';
import { overlaps, walkElevation } from '../core/movement.js';
import { createPlayer, EYE_HEIGHT } from '../core/player.js';
import { createWorldManager } from '../core/world-manager.js';

const flightTime = Object.values(flightDurations).reduce((sum, time) => sum + time, 0);

async function missionFixture(t, { reducedMotion = () => false } = {}) {
  const camera = new THREE.PerspectiveCamera(62, 16 / 9, .07, 115);
  const notices = [];
  const cues = [];
  const completions = [];
  const worlds = createWorldManager(THREE, {
    areas,
    camera,
    services: {
      notify: message => notices.push(message), playCue: cue => cues.push(cue), reducedMotion,
      completeLevel: id => completions.push(id), isLevelComplete: id => completions.includes(id),
    },
  });
  const visit = await worlds.load('military-base');
  t.after(worlds.unload);
  const { area, scene } = visit;
  const player = createPlayer(THREE, camera);
  const find = label => area.interactions.filter(item => item.label === label);
  const row = id => area.missionStatus.missions.find(mission => mission.id === id);
  const node = name => scene.getObjectByName(name);
  const board = find('Board Helicopter')[0];
  function beginFlight() {
    const pad = { x: board.x, z: board.z, yaw: -.25 };
    player.reset(pad, area);
    assert.equal(nearestInteraction(area.interactions, camera.position), board);
    board.act({
      guideCamera(look) {
        const end = player.guide(look);
        return exit => { if (end()) player.reset(exit, area); };
      },
    });
    assert.ok(player.guided);
  }
  function advance(duration, position = camera.position, frequency = 60) {
    const frames = Math.ceil(duration * frequency);
    for (let frame = 0; frame < frames; frame++) worlds.update(duration / frames, position);
  }
  return { area, scene, worlds, visit, camera, player, node, find, board, row, beginFlight, advance, notices, cues, completions };
}

test('security panels activate once, signal green and cue the associated guards', async t => {
  const { area, find, row, node, advance } = await missionFixture(t);
  const panels = find('Activate Security');
  assert.equal(panels.length, 3);
  assert.equal(panels[2].reachable({ y: EYE_HEIGHT }), false);
  assert.equal(panels[2].reachable({ y: EYE_HEIGHT + 3.75 }), true);
  const guardArm = node('South Gate guard west').getObjectByName('Arm');
  const panel = node('South Gate control panel');
  panels[0].act();
  panels[0].act();
  assert.equal(panel.getObjectByName('Red indicator').scale.x, 0);
  assert.equal(panel.getObjectByName('Green indicator').scale.x, 1);
  advance(.5);
  assert.ok(guardArm.rotation.z > 2);
  assert.equal(row('security-patrol').current, 1);
  panels[1].act();
  panels[2].act();
  assert.equal(row('security-patrol').complete, true);
  area.reset();
  assert.equal(panel.getObjectByName('Red indicator').scale.x, 1);
  assert.ok(panels.every(item => item.active));
});

test('tank parts are unique, installation drives once and the tank yields to a player in its lane', async t => {
  const { area, find, row, node, advance, notices, worlds, camera } = await missionFixture(t);
  const pickups = find('Pick Up Component');
  const [install] = find('Install Component');
  const tank = node('Tank 04 under repair');
  const wheel = node('Installed road wheel');
  assert.equal(wheel.scale.x, 0);
  assert.equal(install.active, false);
  pickups.forEach(item => { item.act(); item.act(); });
  assert.deepEqual(area.missionStatus.inventory, ['Engine Component', 'Track Component', 'Battery']);
  assert.equal(node('Engine Component').scale.x, 0);
  for (let i = 0; i < 3; i++) install.act();
  assert.deepEqual(area.missionStatus.inventory, []);
  assert.equal(row('repair-tank').current, 3);
  assert.equal(row('repair-tank').complete, false);
  const ahead = { x: repairTank.x + Math.sin(repairTank.yaw) * 3.4, y: EYE_HEIGHT,
    z: repairTank.z + Math.cos(repairTank.yaw) * 3.4 };
  advance(3, ahead);
  assert.equal(tank.position.z, repairTank.z);
  assert.match(notices.at(-1), /parking lane/);
  assert.equal(node('Repaired tank headlights').scale.x, 1);
  const barrel = node('Tank 04 under repair turret').localToWorld(new THREE.Vector3(0, 0, 2.93));
  const stationary = area.obstacles.filter(object => object.height > .225 &&
    !overlaps(object, tank.position.x, tank.position.z) && !overlaps(object, barrel.x, barrel.z));

  for (let i = 0; i < 56; i++) {
    worlds.update(.1, camera.position);
    for (const x of [-1.60, 0, 1.60]) {
      for (const z of [-2.48, 0, 2.48]) {
        const point = tank.localToWorld(new THREE.Vector3(x, 0, z));
        assert.ok(!stationary.some(obstacle => overlaps(obstacle, point.x, point.z)),
          `tank position ${point.x.toFixed(2)},${point.z.toFixed(2)} remains clear of static obstacles`);
      }
    }
  }
  assert.ok(tank.position.z > repairTank.z + 4.5);
  assert.equal(row('repair-tank').complete, true);
  assert.equal(wheel.scale.x, 1);
  const parked = tank.position.clone();
  assert.equal(walkElevation(area, { x: parked.x - 3, z: parked.z }, parked.x, parked.z, 0, true), null);
  advance(2);
  assert.deepEqual(tank.position, parked);
  area.reset();
  assert.equal(tank.position.z, repairTank.z);
  assert.equal(wheel.scale.x, 0);
  assert.ok(pickups.every(item => item.active));
});

test('supply delivery carries one crate at a time and alignment only spins the main radar after all three heads turn', async t => {
  const { area, find, row, node, advance, cues } = await missionFixture(t);
  const source = find('Pick Up Supplies');
  const [drop] = find('Deliver Supplies');
  source[0].act();
  source[1].act();
  assert.ok(source.every(item => !item.active));
  assert.deepEqual(area.missionStatus.inventory, ['Medical Supplies']);
  drop.act();
  drop.act();
  assert.equal(row('supply-delivery').current, 1);
  assert.equal(node('Delivered medical crate 1').scale.x, 1);
  assert.equal(node('Delivered medical crate 2').scale.x, 0);
  for (const item of source.slice(1)) { item.act(); drop.act(); }
  assert.ok(row('supply-delivery').complete);

  const targets = find('Align Antenna');
  const array = node('Rotating radar antenna');
  const initial = array.rotation.y;
  assert.ok(targets.every(item => !item.active));
  find('Inspect Radar Console')[0].act();
  assert.ok(targets.every(item => item.active));
  targets[1].act();
  targets[1].act();
  advance(.55);
  assert.notEqual(array.rotation.y, initial);
  assert.equal(row('radar-activation').current, 1);
  advance(2);
  const aligned = array.rotation.y;
  advance(1);
  assert.equal(array.rotation.y, aligned);
  targets[2].act();
  targets[0].act();
  assert.equal(row('radar-activation').complete, false);
  advance(1.6);
  assert.equal(row('radar-activation').complete, true);
  assert.equal(node('Online radar display').scale.x, 1);
  assert.ok(cues.length);
  assert.notEqual(array.rotation.y, aligned);
  area.reset();
  assert.equal(array.rotation.y, initial);
  assert.equal(node('Delivered medical crate 1').scale.x, 0);
  assert.equal(node('Online radar display').scale.x, 0);
  assert.ok(source.every(item => item.active));
});

test('the circuit is clockwise on the actual Drone View projection and keeps the facilities on its right', async t => {
  const { visit, scene } = await missionFixture(t);
  const { camera, focus } = createDroneCamera(THREE);
  focus(visit.definition, visit.area.droneView, 16 / 9);
  scene.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  let signedScreenArea = 0;
  let last = null;
  for (let i = 0; i <= 128; i++) {
    const { x, z, dx, dz, curvature } = sampleCircuit(i / 128);
    assert.ok(curvature > 0, 'each bend turns to the right');
    const point = new THREE.Vector3(x, cruiseAltitude, z);
    const ndc = point.clone().project(camera);
    const screen = { x: ndc.x, y: -ndc.y };
    if (last) signedScreenArea += last.x * screen.y - screen.x * last.y;
    last = screen;
    assert.ok(-dz * (headquarters.x - x) + dx * (headquarters.z - z) > 22, 'HQ lies to the right of the tangent');
    assert.ok(-dz * (motorPool.x - x) + dx * (motorPool.z - z) > 10, 'the garages remain on the passenger side');
    if (i % 4 === 0) {
      for (const lateral of [-5.5, 0, 5.5]) {
        ray.set(new THREE.Vector3(x - dz * lateral, cruiseAltitude + 20, z + dx * lateral), new THREE.Vector3(0, -1, 0));
        const hits = ray.intersectObjects(scene.children, true);
        assert.ok(hits.length > 0 && hits[0].point.y < cruiseAltitude - 4, 'route maintains four units of overhead clearance');
      }
    }
  }
  assert.ok(signedScreenArea > 0, 'screen coordinates grow right and down');
  for (const progress of [0, 1]) {
    const point = sampleCircuit(progress);
    assert.ok(Math.hypot(point.x - helipad.x, point.z - helipad.z) < 1e-9);
  }
});

test('flight locks the player, keeps the camera on the right seat, lands before credit, and supports replay and reset', async t => {
  const { area, camera, player, visit, node, board, row, beginFlight, advance, notices } = await missionFixture(t);
  const aircraft = node('Utility helicopter');
  const motion = new THREE.Vector2(0, -1);
  const start = node('Helicopter parking position').position.clone();
  beginFlight();
  const atBoarding = camera.position.clone();
  assert.equal(player.jump(), false);
  player.move(.4, motion, visit);
  assert.deepEqual(camera.position, atBoarding);
  assert.ok(node('Left pilot seat').position.x > 0);
  assert.ok(node('Right passenger seat').position.x < 0);
  advance(flightDurations.boarding + flightDurations.startup + flightDurations.takeoff + 13);
  assert.equal(board.active, false);
  assert.ok(aircraft.worldToLocal(camera.position.clone()).distanceTo(new THREE.Vector3(...passengerEye)) < 1e-7);
  const aboveGround = aircraft.getWorldPosition(new THREE.Vector3()).y;
  assert.ok(aboveGround > 21 && aboveGround < 24);
  const beforeLook = camera.quaternion.clone();
  player.look(-2.2, .12);
  advance(.4);
  assert.ok(beforeLook.angleTo(camera.quaternion) > .6);
  assert.equal(row('helicopter-patrol').current, 0);
  advance(flightTime - flightDurations.boarding - flightDurations.startup - flightDurations.takeoff - 16.4);
  assert.equal(row('helicopter-patrol').current, 0, 'touchdown and rotor rundown are required');
  advance(3.5);
  assert.ok(row('helicopter-patrol').complete);
  assert.ok(board.active);
  assert.equal(player.guided, false);
  assert.deepEqual(node('Helicopter parking position').position, start);
  assert.equal(camera.position.y, EYE_HEIGHT);
  assert.match(notices.at(-1), /Helicopter Patrol Complete/);
  assert.equal(walkElevation(area, camera.position, camera.position.x, camera.position.z, 0, true), 0);

  beginFlight();
  advance(flightTime + .2, camera.position, 30);
  assert.equal(notices.filter(message => message.includes('Helicopter Patrol Complete')).length, 1);
  beginFlight();
  advance(19);
  area.reset();
  assert.equal(player.guided, false);
  assert.deepEqual(node('Helicopter parking position').position, start);
  assert.equal(row('helicopter-patrol').current, 0);
  assert.ok(board.active);

  beginFlight();
  advance(19);
  visit.area.unload();
  assert.equal(player.guided, false);
});

test('every mission prompt can be reached from a clear standing position', async t => {
  const { area, find } = await missionFixture(t);
  const point = label => find(label)[0];
  point('Inspect Radar Console').act();
  point('Pick Up Component').act();
  point('Pick Up Supplies').act();
  const verify = item => {
    let accessible = false;
    for (const r of [.8, 1.21, 1.55, item.radius - .03]) {
      if (r >= item.radius) continue;
      for (let i = 0; i < 32; i++) {
        const x = item.x + Math.sin(i * Math.PI / 16) * r;
        const z = item.z + Math.cos(i * Math.PI / 16) * r;
        const floor = area.getGroundHeight(x, z, 0);
        const standing = { x, z, y: EYE_HEIGHT + floor };
        if (walkElevation(area, standing, x, z, floor, true) === floor && item.reachable(standing)) accessible = true;
      }
    }
    assert.ok(accessible, `${item.label} can be approached at ${item.x}, ${item.z}`);
  };
  area.interactions.forEach(verify);
});

test('the last independent mission records area completion once across repeat visits', async t => {
  const { area, find, beginFlight, advance, completions } = await missionFixture(t, { reducedMotion: () => true });
  for (let visit = 0; visit < 2; visit++) {
    find('Inspect Radar Console')[0].act();
    find('Align Antenna').forEach(item => item.act());
    beginFlight();
    advance(flightTime + .1, undefined, 20);
    find('Activate Security').forEach(item => item.act());
    for (const item of find('Pick Up Supplies')) { item.act(); find('Deliver Supplies')[0].act(); }
    assert.equal(completions.length, visit);
    for (const item of find('Pick Up Component')) { item.act(); find('Install Component')[0].act(); }
    advance(6);
    assert.ok(area.missionStatus.missions.every(mission => mission.complete));
    assert.deepEqual(completions, ['military-base']);
    area.reset();
  }
});
