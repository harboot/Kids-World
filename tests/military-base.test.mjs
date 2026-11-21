import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { militaryBase } from '../areas/military-base/index.js';
import { antennas, checkpoints, fence, headquarters, helipad, hospital, lookout, motorPool, repairTank, supplyDepot } from '../areas/military-base/layout.js';
import { walkElevation } from '../core/movement.js';
import { createPlayer, EYE_HEIGHT } from '../core/player.js';
import { createWorldManager } from '../core/world-manager.js';

function fixture(reducedMotion) {
  const camera = new THREE.PerspectiveCamera();
  const worlds = createWorldManager(THREE, {
    areas: { 'military-base': militaryBase },
    camera,
    services: { reducedMotion },
  });
  const visit = worlds.load('military-base');
  const player = createPlayer(THREE, camera);
  const step = new THREE.Vector2();
  function spawn(x, z) { player.reset({ x, z }, worlds.active.area); }
  function walk(x, z) {
    for (let i = 0; i < 1500; i++) {
      step.set(x - camera.position.x, z - camera.position.z);
      if (step.length() < .095) {
        player.stop();
        return;
      }
      player.move(1 / 60, step.normalize(), worlds.active);
    }
    assert.fail(`Could not walk to ${x}, ${z} from ${camera.position.x.toFixed(2)}, ${camera.position.z.toFixed(2)}`);
  }
  spawn(militaryBase.spawn.x, militaryBase.spawn.z);
  return { worlds, visit, camera, spawn, walk };
}

test('the South Gate leads to a walkable HQ lobby and the physical stairs work in both directions', t => {
  const { worlds, camera, walk } = fixture();
  t.after(worlds.unload);
  assert.equal(camera.position.y, EYE_HEIGHT);
  const { x, z, yaw } = headquarters;
  const lobby = distance => walk(x + Math.sin(yaw) * distance, z + Math.cos(yaw) * distance);
  walk(0, 17.35);
  lobby(18);
  lobby(5.0);
  assert.ok(Math.abs(camera.position.y - EYE_HEIGHT - .68) < 1e-6);
  lobby(18);
  assert.equal(camera.position.y, EYE_HEIGHT);
});

test('the motor pool service bay, logistics dock, and flight apron are walkable', t => {
  const { worlds, camera, spawn, walk } = fixture();
  t.after(worlds.unload);
  spawn(0, 49.9);
  walk(motorPool.x + 9, 49.9);
  walk(motorPool.x + 9, 39.9);
  walk(motorPool.x + 10.7, 39.9);
  walk(motorPool.x + 10.7, 35);
  assert.equal(camera.position.y, EYE_HEIGHT);

  spawn(8, 18.55);
  walk(supplyDepot.x + 4, 18.55);
  walk(supplyDepot.x + 4, supplyDepot.z + 8.65);
  assert.ok(Math.abs(camera.position.y - EYE_HEIGHT - .475) < 1e-6);

  spawn(7.5, -15.5);
  walk(helipad.x, -15.5);
  walk(helipad.x, -28.5);
  assert.ok(Math.hypot(camera.position.x - helipad.x, camera.position.z - helipad.z) < helipad.radius);
});

test('the open service sheds are accessible and the roadway wraps around the HQ apron', t => {
  const { worlds, visit, camera, spawn, walk } = fixture();
  t.after(worlds.unload);
  visit.scene.updateMatrixWorld(true);
  const shed = visit.scene.getObjectByName('Service Shed 01');
  const local = (x, z) => new THREE.Vector3(x, 0, z).applyMatrix4(shed.matrixWorld);
  const approach = local(0, 10);
  const bay = local(0, 3.2);
  spawn(approach.x, approach.z);
  walk(bay.x, bay.z);
  assert.equal(camera.position.y, EYE_HEIGHT + .135);
  walk(approach.x, approach.z);
  assert.equal(camera.position.y, EYE_HEIGHT);

  const road = visit.scene.getObjectByName('Road network around the district islands');
  const hitsRoad = (x, z) => {
    const ray = new THREE.Raycaster(new THREE.Vector3(x, .10, z), new THREE.Vector3(0, -1, 0));
    return ray.intersectObject(road).length > 0;
  };
  assert.ok(hitsRoad(8, 5));
  assert.ok(hitsRoad(-30, 5));
  assert.equal(hitsRoad(headquarters.x, headquarters.z), false);
});

test('the South Lookout ramp and deck support normal player movement with guardrails', t => {
  const { worlds, visit, camera, spawn, walk } = fixture();
  t.after(worlds.unload);
  const { area } = visit;
  const { x, z, height } = lookout;
  const approach = lookout.rampEnd + 1.0;
  spawn(x - 7.5, z + 2.0);
  walk(x - 7.5, approach);
  walk(x, approach);
  walk(x, z);
  assert.equal(camera.position.y, EYE_HEIGHT + height);
  walk(x + 1.6, z - 1);
  assert.equal(walkElevation(area, { x: x + 2.41, z }, x + 2.56, z, height, true), null);
  walk(x, z);
  walk(x, approach);
  assert.equal(camera.position.y, EYE_HEIGHT);
  assert.equal(walkElevation(area, { x: x + 3.01, z }, x + 2.78, z, 0, true), null);

  visit.scene.updateMatrixWorld(true);
  for (const sampleZ of [z + .25, z + 4.1, z + 5.8, z + 8.2]) {
    const y = area.getGroundHeight(x, sampleZ);
    const ray = new THREE.Raycaster(new THREE.Vector3(x, y + .04, sampleZ), new THREE.Vector3(0, -1, 0), 0, .08);
    const hits = ray.intersectObject(visit.scene, true);
    assert.ok(hits.some(hit => Math.abs(hit.point.y - y) < 1e-5), `surface at ${sampleZ} matches the rendered ramp/deck`);
  }
});

test('fences, closed buildings and parked vehicles use Core collision', t => {
  const { worlds, visit, camera, spawn } = fixture();
  t.after(worlds.unload);
  const { area } = visit;
  const blocked = (x, z) => walkElevation(area, camera.position, x, z, 0, true) === null;
  for (const [x, z] of [[fence.east, 40], [-fence.gate, fence.south + 4], [0, fence.approach],
    [hospital.x, hospital.z], [-44, 7], [repairTank.x, repairTank.z],
    [-5.65, 41.6], [helipad.x, helipad.z], [30.15, 9.1]]) {
    assert.ok(blocked(x, z), `expected a collision at ${x}, ${z}`);
  }
  spawn(0, militaryBase.spawn.z);
  assert.equal(walkElevation(area, camera.position, 0, fence.south, 0, true), 0);
});

test('mission sites are in the environment and animated scenery resets with the visit', t => {
  let reduced = false;
  const { worlds, visit } = fixture(() => reduced);
  t.after(worlds.unload);
  const { area, scene } = visit;
  assert.deepEqual(area.missionStatus.missions.map(({ current, total }) => [current, total]),
    [[0, 3], [0, 3], [0, 3], [0, 3], [0, 1]]);
  assert.ok(area.interactions.some(({ label }) => label === 'Board Helicopter'));
  for (const { name } of checkpoints.slice(1)) assert.ok(scene.getObjectByName(name));
  assert.ok(scene.getObjectByName('Open South Gate'));
  for (const { kind } of antennas) assert.ok(scene.getObjectByName('Radar ' + kind));
  for (const name of ['Tank 04 under repair', 'Supply Depot', 'Field Hospital', 'Utility helicopter', 'Helipad H']) {
    assert.ok(scene.getObjectByName(name));
  }
  const radar = scene.getObjectByName('Rotating radar antenna');
  const rotor = scene.getObjectByName('Main rotor');
  const flagGeometry = scene.getObjectByName('Animated base flag').geometry;
  const flag = flagGeometry.attributes.position;
  const patrol = scene.getObjectByName('West road patrol');
  const snapshot = () => [radar.rotation.y, rotor.rotation.y, flag.getZ(flag.count - 1), patrol.position.z];
  const initial = snapshot();
  worlds.update(.5);
  assert.equal(snapshot()[0], initial[0], 'the radar waits for alignment');
  snapshot().slice(1).forEach((value, i) => assert.notEqual(value, initial[i + 1]));
  worlds.reset();
  assert.deepEqual(snapshot(), initial);
  reduced = true;
  worlds.update(.5);
  assert.deepEqual(snapshot(), initial);
  let disposed = false;
  flagGeometry.addEventListener('dispose', () => { disposed = true; });
  const reentered = worlds.load('military-base');
  assert.ok(disposed);
  assert.equal(scene.children.length, 0);
  assert.equal(reentered.scene.getObjectByName('Rotating radar antenna').rotation.y, initial[0]);
});
