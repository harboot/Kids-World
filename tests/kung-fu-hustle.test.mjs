import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { footprint, galleryBreaches, gateHalfWidth, gateZ, wingX } from '../areas/kung-fu-hustle/layout.js';
import { areas } from '../game.js';
import { createPlayer, EYE_HEIGHT } from '../core/player.js';
import { createWorldManager, resolveArea } from '../core/world-manager.js';

const id = 'kung-fu-hustle';

async function start(t) {
  const camera = new THREE.PerspectiveCamera();
  const player = createPlayer(THREE, camera);
  const worlds = createWorldManager(THREE, {
    areas, camera,
    prepare({ definition, area }) { player.reset(definition.spawn, area); },
  });
  t.after(worlds.unload);
  const url = new URL('https://example.test/Kids-World/?area=kung-fu-hustle');
  const visit = await worlds.load(resolveArea(url, areas, 'garden'));
  const movement = new THREE.Vector2();
  const position = camera.position;

  function walk(x, z, frames = 900) {
    for (let i = 0; i < frames; i++) {
      movement.set(x - position.x, z - position.z);
      if (movement.length() < .07) return true;
      player.move(1 / 60, movement.normalize(), visit);
    }
    return false;
  }

  return { visit, player, position, reset: worlds.reset, walk };
}

test('the public courtyard route starts within the gate and resets to the same spot', async t => {
  const { visit, position, reset, walk } = await start(t);
  assert.equal(visit.definition.id, id);
  assert.equal(areas[id].show, true);
  assert.deepEqual(visit.area.missionStatus.missions, []);
  assert.deepEqual(position.toArray(), [0, EYE_HEIGHT, gateZ - 2.2]);
  assert.ok(walk(3, 4));
  reset();
  assert.deepEqual(position.toArray(), [0, EYE_HEIGHT, gateZ - 2.2]);
});

test('a wide central L, both narrow side flights, and the upper central stair connect four floors', async t => {
  const { position, reset, walk } = await start(t);
  function reach(x, z) {
    assert.ok(walk(x, z), `Could not reach (${x}, ${z}) from ${position.toArray()}`);
  }
  const at = level => assert.ok(Math.abs(position.y - (EYE_HEIGHT + level * 3.25)) < 1e-5);

  for (const side of [-1, 1]) {
    reset();
    const stairs = z => reach(wingX(side, side * 11.6, z), z);
    const wing = z => reach(wingX(side, side * 14, z), z);

    reach(8.45, 5.3);
    reach(10.12, 4.65);
    reach(10.12, -.40);
    reach(.5, -.40);
    at(.5);
    reach(.5, -9);
    at(1);

    wing(-9);
    wing(6.2);
    stairs(6.2);
    stairs(-3.35);
    wing(-3.35);
    wing(-8.24);
    at(2);

    if (side === 1) {
      // The east wing is now isolated from the upper central staircase at level 3.
      assert.equal(position.y, EYE_HEIGHT + 6.5);
      continue;
    }
    reach(5.13, -8.24);
    reach(5.13, -4.5);
    reach(-4.85, -4.5);
    reach(-4.85, -9);
    at(3);
    reach(-4.85, -8.24);
    reach(wingX(-1, -14, -8.24), -8.24);
    at(3);
    reach(-4.85, -8.24);

    reach(-4.85, -9);
    reach(-4.85, -4.5);
    reach(5.13, -4.5);
    reach(5.13, -8.24);
    at(2);
    wing(-8.24);
    wing(-3.35);
    stairs(-3.35);
    stairs(6.2);
    wing(6.2);
    wing(-9);
    at(1);
    reach(.5, -9);
    reach(.5, -.4);
    reach(9.7, -.4);
    at(0);
  }
});

test('the gate, door facades, stair rails and gallery rails contain the player', async t => {
  const { visit, player, position, walk } = await start(t);
  assert.equal(walk(0, gateZ + 1, 75), false);
  assert.ok(position.z < gateZ);
  player.jump();
  assert.equal(walk(0, gateZ + 1, 75), false);

  player.reset({ x: 0, z: -9, elevation: 6.5 }, visit.area);
  assert.equal(walk(0, -11, 60), false);
  assert.equal(walk(0, -7, 60), false);
  player.jump();
  assert.equal(walk(0, -7, 75), false);
  assert.equal(position.y, EYE_HEIGHT + 6.5);

  player.reset({ x: wingX(1, 11.6, 1.4), z: 1.4, elevation: 4.875 }, visit.area);
  assert.equal(walk(wingX(1, 8.5, 1.4), 1.4, 75), false);
  assert.ok(Math.abs(position.y - (EYE_HEIGHT + 4.875)) < 1e-6);
});

test('stocked shops can be entered and paths to the hexagonal fence corners are walkable', async t => {
  const { visit, player, position, walk } = await start(t);
  for (const side of [-1, 1]) {
    assert.ok(wingX(side, side * 14, 8.5) * side > 21);
    player.reset({ x: side * 12, z: 6.8 }, visit.area);
    const aisle = side < 0 ? -12.50 : 13.40;
    assert.ok(walk(aisle, 8.2));
    if (side > 0) {
      assert.ok(walk(aisle, 10.9));
      assert.equal(walk(aisle, 12.1, 65), false);
      assert.ok(walk(aisle, 8.2));
    }
    assert.ok(walk(side * 17.4, 7.7));
    assert.ok(walk(side * 20.5, 10.6));
    assert.ok(walk(side * 21.25, 13.2));
    assert.ok(walk(side * 21.25, 16.5));
    assert.equal(walk(side * 26.5, 16.5, 120), false);
    assert.ok(Math.abs(position.x) < 24);
  }

  for (const [i, [x, z]] of footprint.entries()) {
    const [nextX, nextZ] = footprint[(i + 1) % footprint.length];
    if (z === nextZ && z > 0) continue; // The front edge is split at the gate.
    const centerX = (x + nextX) / 2;
    const centerZ = (z + nextZ) / 2;
    assert.equal(visit.area.blocksGround(centerX, centerZ, .34, 0), true);
  }
});

test('the paved extension reaches the wider gate with no barrier across the old entrance', async t => {
  const { visit, player, position, walk } = await start(t);
  player.reset({ x: 0, z: 12.8 }, visit.area);
  assert.ok(walk(0, 17.5));
  assert.ok(walk(gateHalfWidth - .75, gateZ - .75));
  assert.equal(walk(gateHalfWidth - .75, gateZ + 1, 90), false);
  assert.ok(position.z < gateZ);
  assert.equal(visit.area.blocksGround(gateHalfWidth - .75, gateZ, .34, 0), false);
  assert.equal(visit.area.blocksGround(gateHalfWidth + 2, gateZ, .34, 0), true);

  visit.scene.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(12, 8, 17.5), new THREE.Vector3(0, -1, 0));
  const [surface] = ray.intersectObjects(visit.scene.children);
  assert.ok(surface && Math.abs(surface.point.y) < .065);
});

test('the hand-shaped breach is physically open through the rear wall', async t => {
  const { visit } = await start(t);
  visit.scene.updateMatrixWorld(true);
  const wall = visit.scene.getObjectByName('Hand-shaped breach');
  assert.ok(wall);
  const ray = new THREE.Raycaster(new THREE.Vector3(9.2, 8, -9.95), new THREE.Vector3(0, 0, -1));
  assert.equal(ray.intersectObject(wall).length, 0);
  ray.ray.origin.set(14, 8, -9.95);
  assert.ok(ray.intersectObject(wall).length > 0);
  assert.equal(visit.area.blocksGround(9.2, -12, .34, 6.5), false);
  assert.equal(visit.area.blocksGround(14, -12, .34, 6.5), true);
});

test('each stair run has a single continuous mesh with one tread hit from above', async t => {
  const { visit } = await start(t);
  visit.scene.updateMatrixWorld(true);
  const flights = visit.scene.children.filter(child => child.name === 'Stair flight');
  assert.equal(flights.length, 5);
  const samples = [[5.2, -.22], [.64, -4.1], [.62, -4.41], ...[-1, 1].map(side => [wingX(side, side * 11.49, .33), .33])];
  for (const [i, [x, z]] of samples.entries()) {
    const ray = new THREE.Raycaster(new THREE.Vector3(x, 14, z), new THREE.Vector3(0, -1, 0));
    const [tread, underside, ...overlaps] = ray.intersectObject(flights[i]);
    assert.ok(tread && underside);
    assert.ok(tread.distance < underside.distance - .2);
    assert.deepEqual(overlaps, []);
  }
});

test('jumping clears rails on the highest gallery and lands quickly in the courtyard', async t => {
  const { visit, player, position } = await start(t);
  const height = 3 * 3.25;
  player.reset({ x: -7, z: -8.17, elevation: height }, visit.area);
  assert.ok(player.jump(visit.area));
  const forward = new THREE.Vector2(0, 1);
  let peak = height;
  let landed = 0;
  for (let frame = 1; frame < 150; frame++) {
    player.move(1 / 60, forward, visit);
    peak = Math.max(peak, position.y - EYE_HEIGHT);
    if (player.grounded) {
      landed = frame;
      break;
    }
  }
  assert.ok(peak > height + 1.4);
  assert.ok(position.z > -7);
  assert.equal(position.y, EYE_HEIGHT);
  assert.ok(landed > 60 && landed < 88, `Landing took ${landed} frames`);
});

test('the open ground-floor markets have room to browse under their ceilings', async t => {
  const { visit, player, position, walk } = await start(t);
  player.reset({ x: -1, z: -9.40 }, visit.area);
  assert.ok(walk(-1, -11.40));
  assert.ok(position.z < -10.7);
  assert.equal(visit.area.getCeilingHeight(-1, -11.40, 0), 3.25);
  assert.ok(walk(-1, -9.4));
  player.reset({ x: -13, z: -8.8, elevation: 3.25 }, visit.area);
  assert.equal(walk(-13, -11.4, 60), false);
});

test('the resident has a full robe and a real wing window below the selected roof point', async t => {
  const { visit } = await start(t);
  visit.scene.updateMatrixWorld(true);
  const windowWall = visit.scene.getObjectByName('West wing wall');
  const ray = new THREE.Raycaster(new THREE.Vector3(-19.98, 11.65, 5.76), new THREE.Vector3(-1, 0, 0));
  assert.equal(ray.intersectObject(windowWall).length, 0);
  ray.ray.origin.z = 3.9;
  assert.ok(ray.intersectObject(windowWall).length > 0);

  const rear = visit.scene.getObjectByName('Hand-shaped breach');
  ray.ray.origin.set(-9.52, 11.65, -9.9);
  ray.ray.direction.set(0, 0, -1);
  assert.ok(ray.intersectObject(rear).length > 0);

  const robe = visit.scene.getObjectByName('Resident full-length robe');
  const cups = visit.scene.getObjectByName('Bra cups');
  assert.ok(robe && cups);
  robe.geometry.computeBoundingBox();
  const transform = new THREE.Matrix4();
  robe.getMatrixAt(0, transform);
  const bounds = robe.geometry.boundingBox.clone().applyMatrix4(transform);
  assert.ok(bounds.min.y < 10 && bounds.max.y > 11);
  cups.getMatrixAt(0, transform);
  assert.equal(Math.round(transform.elements[14] * 100) / 100, 5.76);

  ray.ray.origin.set(-19.98, 20, 5.76);
  ray.ray.direction.set(0, -1, 0);
  assert.ok(Math.abs(ray.intersectObjects(visit.scene.children)[0].point.y - 13.51) < .02);
});

test('a side stair can be vaulted toward the yard while walking still collides with its rail', async t => {
  const { visit, player, position, walk } = await start(t);
  const z = 1.4;
  const x = wingX(1, 11.6, z);
  player.reset({ x, z, elevation: 4.875 }, visit.area);
  assert.equal(walk(x - 1.9, z, 40), false);
  assert.ok(player.jump(visit.area));
  assert.ok(walk(x - 2, z, 85));
  assert.ok(position.x < wingX(1, 10.8, z));
  assert.ok(position.y >= EYE_HEIGHT);
  const stop = new THREE.Vector2();
  for (let i = 0; i < 60 && !player.grounded; i++) player.move(1 / 60, stop, visit);
  assert.equal(position.y, EYE_HEIGHT);
});

test('the player can walk the perimeter cap, step back into the courtyard, and stay inside the boundary', async t => {
  const { visit, player, position, walk } = await start(t);
  const capY = 1.92;
  player.reset({ x: 11, z: gateZ, elevation: capY }, visit.area);
  assert.equal(position.y, EYE_HEIGHT + capY);
  assert.ok(walk(15, gateZ));
  assert.equal(position.y, EYE_HEIGHT + capY);
  assert.equal(walk(15, gateZ + .7, 40), false);
  assert.ok(position.z <= gateZ + 1e-6);
  assert.ok(walk(15, gateZ - 3));
  assert.equal(position.y, EYE_HEIGHT);
});

test('flat and sloped rail tops support walking and let the player step off', async t => {
  const { visit, player, position, walk } = await start(t);
  const { area } = visit;
  const idle = new THREE.Vector2();
  function settle() {
    player.stop();
    for (let i = 0; i < 35 && !player.grounded; i++) player.move(1 / 60, idle, visit);
    assert.ok(player.grounded);
  }

  player.reset({ x: -7.8, z: -8.25, elevation: 9.75 }, area);
  assert.ok(player.jump(area));
  assert.ok(walk(-7.8, -7.5));
  settle();
  const upperRailY = position.y;
  assert.ok(upperRailY > EYE_HEIGHT + 10.9);
  assert.ok(walk(-6.7, -7.5));
  assert.equal(position.y, upperRailY);
  assert.ok(walk(-6.7, -8.55));
  settle();
  assert.equal(position.y, EYE_HEIGHT + 9.75);

  player.reset({ x: 5.7, z: 1.1, elevation: 3 }, area);
  const lowRailY = position.y;
  assert.ok(lowRailY > EYE_HEIGHT + 1.8);
  assert.ok(walk(4.2, 1.1));
  assert.ok(position.y > lowRailY + .25);
  assert.ok(walk(5, 1.1));
  assert.ok(position.y < lowRailY + .25);
  assert.ok(walk(5, 3.2));
  settle();
  assert.equal(position.y, EYE_HEIGHT);
});

test('Coolie uses simple articulated geometry and five carried sacks', async t => {
  const {visit}=await start(t);
  const root=visit.scene.getObjectByName('Coolie — porter');
  assert.deepEqual(root.position.toArray(),[13.11,-.04,14.27]);
  const body=root.getObjectByName('Coolie faceted body');
  const carried=root.getObjectByName('Coolie carried sacks');
  const ground=visit.scene.getObjectByName('Coolie ground sacks');
  assert.equal(carried.count,5);assert.equal(ground.count,17);
  assert.equal(carried.geometry,ground.geometry);
  assert.equal(carried.parent.name,'Coolie torso pivot');
  const meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o)});meshes.push(ground);
  let total=0;
  for(const m of meshes){
    assert.equal(m.material,body.material);
    for(const k of ['position','normal','color'])assert.ok(m.geometry.attributes[k].array.every(Number.isFinite));
    total+=m.geometry.attributes.position.count/3*(m.isInstancedMesh?m.count:1);
  }
  assert.ok(total<6500);
  visit.scene.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(root);
  assert.ok(bounds.max.y>2.7&&bounds.max.y<3.1);
  assert.ok(bounds.min.y>=-.015&&bounds.min.y<.02);
  assert.ok(visit.area.obstacles.some(o=>o.left<=13.11&&o.right>=13.11&&o.front<=14.27&&o.back>=14.27));
});

test('Coolie squats with planted feet and holds a proximity-triggered kick before resuming',async t=>{
  const {visit}=await start(t),root=visit.scene.getObjectByName('Coolie — porter');
  const torso=root.getObjectByName('Coolie torso pivot');
  const knee=root.getObjectByName('Coolie left knee');
  const ankle=root.getObjectByName('Coolie left ankle');
  const right=root.getObjectByName('Coolie right ankle');
  const far=new THREE.Vector3(0,1.68,0),near=new THREE.Vector3(13.11,1.68,16.5);
  const frames=(n,p)=>{for(let i=0;i<n;i++)visit.area.update(1/60,p);};
  const at=o=>o.getWorldPosition(new THREE.Vector3());
  const initial=at(ankle),rightInitial=at(right),standing=torso.position.y;
  frames(96,far);
  assert.ok(torso.position.y<standing-.24);
  assert.ok(at(ankle).distanceTo(initial)<1e-6);
  assert.ok(at(right).distanceTo(rightInitial)<1e-6);
  frames(80,near);
  const held=at(ankle),angle=knee.rotation.x;
  assert.ok(held.y>initial.y+.5);
  assert.ok(angle<.2);
  frames(24,near);
  assert.ok(at(ankle).distanceTo(held)<1e-6);
  assert.ok(at(right).distanceTo(rightInitial)<1e-6);
  frames(80,near);
  assert.ok(at(ankle).distanceTo(initial)<1e-6);
  // No second demonstration while player stays within the radius.
  frames(90,near);assert.ok(at(ankle).distanceTo(initial)<1e-6);
  frames(1,far);frames(80,near);
  assert.ok(at(right).y>rightInitial.y+.5);
});

test('both damaged upper galleries have a true full-width gap and allow a drop', async t => {
  const {visit,player,position,walk}=await start(t);
  const {area}=visit;
  for(const {y,left,right} of galleryBreaches) {
    for(const z of [-10.1,-9,-8.0]){
      assert.equal(area.getGroundHeight((left+right)/2,z,y),3.25);
      assert.equal(area.getGroundHeight(left-.25,z,y),y);
      assert.equal(area.getGroundHeight(right+.25,z,y),y);
    }
    assert.equal(area.canDropFrom(left-.03,-9,y),true);
    assert.equal(area.canDropFrom(right+.03,-9,y),true);
  }
  player.reset({x:5.3,z:-9,elevation:9.75},area);
  assert.ok(walk(8,-9));
  const idle=new THREE.Vector2();
  for(let i=0;i<120&&!player.grounded;i++) player.move(1/60,idle,visit);
  assert.ok(position.y<EYE_HEIGHT+9.75);
});

test('three new wall kiosks have usable entrances and the well is relocated',async t=>{
  const {visit,player,walk}=await start(t);
  const {area}=visit;
  for(const x of [-17.80,-13.85,-9.90]){
    const aisle=x+(x===-9.90?.65:-.65);
    player.reset({x:aisle,z:15.2},area);
    assert.ok(walk(aisle,17.55));
    assert.equal(walk(aisle,20.0,90),false);
    assert.ok(walk(aisle,15.2));
  }
  assert.ok(area.obstacles.some(o=>o.left<=-11.12&&o.right>=-11.12&&o.front<=5.14&&o.back>=5.14));
  assert.ok(!area.obstacles.some(o=>o.left<=-3.5&&o.right>=-3.5&&o.front<=-.8&&o.back>=-.8));
});
