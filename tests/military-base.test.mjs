import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { areas } from '../game.js';
import { militaryBase } from '../areas/military-base/index.js';
import { antennas, checkpoints, fence, headquarters, helipad, hospital, lookout, motorPool, repairTank, supplyDepot, northPost, generatorSite } from '../areas/military-base/layout.js';
import { walkElevation } from '../core/movement.js';
import { createPlayer, EYE_HEIGHT } from '../core/player.js';
import { createWorldManager } from '../core/world-manager.js';

async function fixture(reducedMotion) {
  const camera = new THREE.PerspectiveCamera();
  const worlds = createWorldManager(THREE, {
    areas,
    camera,
    services: { reducedMotion },
  });
  const visit = await worlds.load('military-base');
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
  function settle() {
    player.stop();
    step.set(0, 0);
    for (let i = 0; i < 30; i++) player.move(1 / 60, step, worlds.active);
    assert.ok(player.grounded, 'player settles on the floor');
  }
  return { worlds, visit, camera, spawn, walk, settle };
}

test('the South Gate leads to a walkable HQ lobby and the physical stairs work in both directions', async t => {
  const { worlds, camera, walk } = await fixture();
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

test('the motor pool service bay, logistics dock, and flight apron are walkable', async t => {
  const { worlds, camera, spawn, walk } = await fixture();
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

test('the open service sheds are accessible and the roadway wraps around the HQ apron', async t => {
  const { worlds, visit, camera, spawn, walk } = await fixture();
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

test('the South Lookout ramp and deck support normal player movement with guardrails', async t => {
  const { worlds, visit, camera, spawn, walk } = await fixture();
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

test('fences, closed buildings and parked vehicles use Core collision', async t => {
  const { worlds, visit, camera, spawn } = await fixture();
  t.after(worlds.unload);
  const { area } = visit;
  const blocked = (x, z) => walkElevation(area, camera.position, x, z, 0, true) === null;
  for (const [x, z] of [[fence.east, 40], [-fence.gate, fence.south + 4], [0, fence.approach],
    [hospital.x, hospital.z], [repairTank.x, repairTank.z],
    [-5.65, 41.6], [helipad.x, helipad.z], [30.15, 9.1]]) {
    assert.ok(blocked(x, z), `expected a collision at ${x}, ${z}`);
  }
  spawn(0, militaryBase.spawn.z);
  assert.equal(walkElevation(area, camera.position, 0, fence.south, 0, true), 0);
});

test('mission sites are in the environment and animated scenery resets with the visit', async t => {
  let reduced = false;
  const { worlds, visit } = await fixture(() => reduced);
  t.after(worlds.unload);
  const { area, scene } = visit;
  assert.deepEqual(area.missionStatus.missions.map(({ current, total }) => [current, total]),
    [[0, 3], [0, 1], [0, 1], [0, 1], [0, 1], [0, 3], [0, 1], [0, 5], [0, 1], [0, 1]]);
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
  assert.equal(snapshot()[0], initial[0], 'the radar waits for activation');
  snapshot().slice(1).forEach((value, i) => assert.notEqual(value, initial[i + 1]));
  worlds.reset();
  assert.deepEqual(snapshot(), initial);
  reduced = true;
  worlds.update(.5);
  assert.deepEqual(snapshot(), initial);
  let disposed = false;
  flagGeometry.addEventListener('dispose', () => { disposed = true; });
  const reentered = await worlds.load('military-base');
  assert.ok(disposed);
  assert.equal(scene.children.length, 0);
  assert.equal(reentered.scene.getObjectByName('Rotating radar antenna').rotation.y, initial[0]);
});

test('both barracks have walkable open doors, clear aisles, and collidable bunk beds', async t => {
  const { worlds, visit, camera, spawn, walk, settle } = await fixture();
  t.after(worlds.unload);
  visit.scene.updateMatrixWorld(true);
  for (const [name, width, depth] of [['Barracks 01',10.8,14],['Barracks 02',10.45,15]]) {
    const hall = visit.scene.getObjectByName(name);
    const local = (x,z) => new THREE.Vector3(x,0,z).applyMatrix4(hall.matrixWorld);
    const approach = local(0,depth/2+1.1);
    spawn(approach.x,approach.z);
    const middle = local(0,0), rear = local(0,-4.4);
    walk(middle.x,middle.z);
    assert.equal(camera.position.y,EYE_HEIGHT+.135);
    walk(rear.x,rear.z);
    const bed = local(width/2-1.34,-4.65);
    assert.equal(walkElevation(visit.area,camera.position,bed.x,bed.z,.135,true),null);
    const wall = local(width/2-.12,0);
    assert.equal(walkElevation(visit.area,camera.position,wall.x,wall.z,.135,true),null);
    assert.equal(hall.children.filter(o=>o.name.startsWith(name+' bunk ')).length,8);
    walk(middle.x,middle.z);
    walk(approach.x,approach.z);
    settle();
    assert.equal(camera.position.y,EYE_HEIGHT);
  }
  for (const name of ['COMMAND AVE','EAST SERVICES','MOTOR POOL','BARRACKS','FLIGHT LINE','SOUTH LOOKOUT'])
    assert.equal(visit.scene.getObjectByName(name+' wayfinding'),undefined);
  assert.ok(visit.scene.children.some(o=>o.name==='Night street lamp' && o.getObjectByName('HOSPITAL →')));
});

test('North Post is walkable through its open front and contains a solid monitoring desk', async t => {
  const { worlds, visit, camera, spawn, walk, settle } = await fixture();
  t.after(worlds.unload);
  const {x,z,depth,floor}=northPost;
  const outside=z+depth/2+1.0;
  spawn(x,outside);
  walk(x,z+.30);assert.equal(camera.position.y,EYE_HEIGHT+floor);
  assert.ok(visit.scene.getObjectByName('CCTV control desk'));
  assert.equal(walkElevation(visit.area,camera.position,x,z-1.28,floor,true),null);
  walk(x,outside);settle();assert.equal(camera.position.y,EYE_HEIGHT);
});

test('Generator has an open walkable entrance, accessible start control and solid equipment', async t => {
  const {worlds,visit,camera,spawn,walk,settle}=await fixture();
  t.after(worlds.unload);
  const {x,z,depth,floor}=generatorSite;
  assert.equal(visit.scene.getObjectByName('Weather and communications lodge'),undefined);
  assert.ok(visit.scene.getObjectByName('Generator electrical panels'));
  const outside=z+depth/2+.85;
  spawn(x,outside);walk(x,z);assert.equal(camera.position.y,EYE_HEIGHT+floor);
  walk(x,z-1.25);
  const prompt=visit.area.interactions.find(i=>i.label==='Start Generator');
  assert.ok(Math.hypot(camera.position.x-prompt.x,camera.position.z-prompt.z)<prompt.radius);
  assert.equal(walkElevation(visit.area,camera.position,x-2.22,z-.95,floor,true),null);
  prompt.act();assert.equal(visit.area.missionStatus.missions.find(m=>m.id==='restore-power').complete,true);
  walk(x,z);walk(x,outside);settle();assert.equal(camera.position.y,EYE_HEIGHT);
});

test('every street and perimeter lamp sits clear of the actual asphalt', async t => {
  const {worlds,visit}=await fixture();t.after(worlds.unload);
  const road=visit.scene.getObjectByName('Road network around the district islands');
  const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
  const poles=visit.scene.children.filter(o=>['Night street lamp','Perimeter floodlight'].includes(o.name));
  assert.ok(poles.length>=12);
  for(const pole of poles)for(const [dx,dz] of [[0,0],[.5,0],[-.5,0],[0,.5],[0,-.5]]){
    ray.set(new THREE.Vector3(pole.position.x+dx,12,pole.position.z+dz),down);
    assert.equal(ray.intersectObject(road,false).length,0,'asphalt under '+pole.position.toArray());
  }
});
