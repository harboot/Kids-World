import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { areas } from '../game.js';
import { cruiseAltitude, flightDurations, sampleCircuit } from '../areas/military-base/helicopter-flight.js';
import { passengerEye } from '../areas/military-base/helicopter.js';
import { cctvViews, cctvLensClearance } from '../areas/military-base/observation-props.js';
import { headquarters, helipad, motorPool, repairTank, tankTestCheckpoints, securityPanels } from '../areas/military-base/layout.js';
import { createDroneCamera } from '../core/drone-view.js';
import { nearestInteraction } from '../core/interactions.js';
import { overlaps, walkElevation, floorHeight } from '../core/movement.js';
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

test('security panels at South Gate, West Post and East Post activate once and cue guards', async t => {
  const { area, find, row, node, advance } = await missionFixture(t);
  const panels = find('Activate Security');
  assert.equal(panels.length, 3);
  assert.ok(panels.every(panel=>panel.reachable({y:EYE_HEIGHT})));
  assert.deepEqual(panels.map(p=>[p.x,p.z]),securityPanels.map(p=>[p.x,p.z]));
  assert.equal(node('South Gate control panel').rotation.y,Math.PI);
  assert.ok(node('04  /  EAST POST'));
  assert.equal(node('Motor Pool control panel'),undefined);
  assert.equal(node('South Lookout control panel'),undefined);
  const guardArm = node('South Gate guard west').getObjectByName('Arm');
  const panel = node('South Gate control panel');
  panels[0].act();
  panels[0].act();
  assert.equal(panel.getObjectByName('Red indicator').scale.x, 0);
  assert.equal(panel.getObjectByName('Blue indicator').scale.x, 1);
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

test('tank is repaired in place with a single interaction, all parts reassemble and reset', async t => {
  const {area,find,row,node,advance}=await missionFixture(t);
  const [repair]=find('Repair Tank');
  const tank=node('Tank 04 under repair'), wheel=node('Installed road wheel'), loose=node('Loose tank road wheel');
  const turret=node('Tank 04 under repair turret'), cover=node('Tank 04 under repair engine cover');
  const start=tank.position.clone(), detached=turret.position.clone();
  assert.equal(find('Pick Up Component').length,0);
  assert.equal(find('Install Component').length,0);
  assert.equal(node('Engine Component'),undefined);
  assert.equal(node('Track Component'),undefined);
  assert.equal(wheel.scale.x,0);
  assert.equal(loose.scale.x,1);
  assert.ok(cover.rotation.x<-.8);
  assert.equal(repair.active,true);
  repair.act();repair.act();
  assert.equal(repair.active,false);
  assert.deepEqual(area.missionStatus.inventory,[]);
  advance(.7);
  assert.ok(turret.position.y<detached.y);
  assert.equal(row('repair-tank').complete,false);
  advance(1);
  assert.equal(row('repair-tank').current,1);
  assert.equal(row('repair-tank').complete,true);
  assert.equal(wheel.scale.x,1);
  assert.equal(loose.scale.x,0);
  assert.equal(node('Tank jack stands').scale.x,0);
  assert.ok(Math.abs(cover.rotation.x)<1e-6);
  assert.deepEqual(tank.position,start);
  assert.ok(tank.children.filter(o=>o.name==='Tank exhaust puff').every(o=>o.scale.x===0));
  area.reset();
  assert.deepEqual(turret.position,detached);
  assert.equal(wheel.scale.x,0);
  assert.equal(loose.scale.x,1);
  assert.equal(repair.active,true);
});

test('barracks inspection wakes one sleeping soldier, who stands and salutes before completion', async t=>{
  const {area,find,row,node,advance}=await missionFixture(t);
  const npc=node('Barracks sleeping soldier'), arm=npc.getObjectByName('Arm');
  const [wake]=find('Wake Soldier');
  const initial=npc.position.clone();
  assert.equal(npc.parent.name,'Barracks 01');
  assert.equal(npc.rotation.x,-Math.PI/2);
  assert.equal(wake.active,true);
  wake.act();wake.act();
  assert.equal(wake.active,false);
  advance(.65);
  assert.equal(row('barracks-inspection').complete,false);
  advance(.8);
  assert.ok(Math.abs(npc.rotation.x)<1e-6);
  assert.ok(Math.abs(npc.position.y-.135)<1e-6);
  assert.ok(arm.rotation.z>2);
  assert.equal(row('barracks-inspection').current,1);
  assert.equal(row('barracks-inspection').complete,true);
  area.reset();
  assert.deepEqual(npc.position,initial);
  assert.equal(npc.rotation.x,-Math.PI/2);
  assert.equal(wake.active,true);
});

test('one medical crate and one radar console complete their respective missions and reset', async t => {
  const { area, find, row, node, advance, cues, scene } = await missionFixture(t);
  const source = find('Pick Up Supplies');
  const [drop] = find('Deliver Supplies');
  assert.equal(source.length, 1);
  assert.equal(node('Medical pickup 2'), undefined);
  source[0].act();
  source[0].act();
  assert.ok(source.every(item => !item.active));
  assert.deepEqual(area.missionStatus.inventory, ['Medical Supplies']);
  drop.act(); drop.act();
  assert.equal(row('supply-delivery').current, 1);
  assert.equal(node('Delivered medical crate 1').scale.x, 1);
  assert.equal(node('Delivered medical crate 2'), undefined);
  assert.ok(row('supply-delivery').complete);
  const targets = find('Activate Radar');
  const dish = node('Rotating radar antenna');
  const initial = dish.rotation.y;
  assert.equal(targets.length, 1);
  assert.equal(find('Align Antenna').length, 0);
  assert.equal(node('Radar array'), undefined);
  assert.equal(node('Radar relay'), undefined);
  const panels = [];
  scene.traverse(o => { if (o.name.endsWith(' control panel')) panels.push(o.name); });
  assert.deepEqual(panels.filter(n => !n.includes('Scout')).sort(),
    ['East Post control panel','Radar Console control panel','South Gate control panel','West Post control panel'].sort());
  advance(1);
  assert.equal(dish.rotation.y, initial);
  targets[0].act(); targets[0].act();
  assert.equal(row('radar-activation').current, 1);
  assert.equal(row('radar-activation').complete, true);
  assert.equal(node('Online radar display').scale.x, 1);
  advance(.6);
  assert.notEqual(dish.rotation.y, initial);
  assert.ok(cues.length);
  area.reset();
  assert.equal(dish.rotation.y, initial);
  assert.equal(node('Delivered medical crate 1').scale.x, 0);
  assert.equal(node('Online radar display').scale.x, 0);
  assert.ok(source.every(item => item.active));
});
 
test('vehicle checkpoints are hidden on foot, progress survives switching vehicles and order is enforced', async t => {
  const { area, camera, find, node, row } = await missionFixture(t, { reducedMotion: () => true });
  const marker = node('Tank driving checkpoint');
  const tank = node('Tank 01');
  const jeep = node('Entrance patrol jeep');
  const mission = row('tank-driving-test');
  const update = () => area.update(0,camera.position);
  const move = (vehicle, point) => { vehicle.position.x = point.x; vehicle.position.z = point.z; update(); };
  assert.equal(mission.total, 3);
  assert.equal(mission.title, 'Vehicle Driving Test');
  assert.equal(marker.visible, false);
  camera.position.set(tankTestCheckpoints[0].x,1.68,tankTestCheckpoints[0].z);
  update(); assert.equal(mission.current,0); assert.equal(marker.visible,false);
  const mount = item => {
    let exit;camera.position.set(item.x,1.68,item.z);
    item.act({guideCamera(_look,opts){exit=opts.prompt;return ()=>{};}});
    update();return exit;
  };
  const exit=mount(find('Drive Jeep')[0]);
  assert.equal(marker.visible,true);
  move(jeep,tankTestCheckpoints[1]);assert.equal(mission.current,0);
  move(jeep,tankTestCheckpoints[0]);assert.equal(mission.current,1);
  exit.act();update();assert.equal(marker.visible,false);
  mount(find('Drive Tank')[0]);
  assert.equal(marker.visible,true);assert.equal(find('Drive Jeep')[0].active,false);
  for (let i=1;i<3;i++) {move(tank,tankTestCheckpoints[i]);assert.equal(mission.current,i+1);}
  assert.equal(mission.complete,true);assert.equal(marker.visible,false);
  area.reset();assert.equal(mission.current,0);assert.equal(marker.visible,false);
});
 
test('night vision binoculars use a zoomed independent camera, can look around, and complete on use', async t => {
  const {area,scene,camera,find,node,row}=await missionFixture(t);
  const item=find('Use Binoculars')[0];
  assert.ok(node('Night vision binoculars'));
  assert.equal(item.reachable({y:1.68}),false);
  camera.position.set(item.x-.7,5.43,item.z);
  const start=camera.position.clone();
  let look,opts,releases=0;
  item.act({guideCamera(l,o){look=l;opts=o;return ()=>{releases++;};}});
  assert.equal(opts.viewMode,'night-vision');assert.equal(opts.fov,26);
  assert.notEqual(opts.camera,camera);assert.equal(row('night-observation').complete,true);
  const before=opts.camera.quaternion.clone();look(.4,.2);
  assert.ok(before.angleTo(opts.camera.quaternion)>.2);
  // Test yaw limits and near-field occlusion using actual instanced scene geometry.
  const ray=new THREE.Raycaster(),meshes=[];
  scene.updateMatrixWorld(true);
  scene.traverse(o=>{if(o.isMesh&&o.visible&&o.material&&!o.material.transparent)meshes.push(o);});
  const check=()=>{for(const x of [-.6,0,.6])for(const y of [-.6,0,.6]){
    ray.setFromCamera(new THREE.Vector2(x,y),opts.camera);ray.near=opts.camera.near;ray.far=.45;
    assert.equal(ray.intersectObjects(meshes,false).length,0,'binocular near-field obstruction');
  }};
  look(100,100);check();const left=opts.camera.quaternion.clone();look(100,0);
  assert.ok(left.angleTo(opts.camera.quaternion)<1e-6);
  look(-200,0);check();const right=opts.camera.quaternion.clone();look(-200,0);
  assert.ok(right.angleTo(opts.camera.quaternion)<1e-6);
  const heading=q=>{const d=new THREE.Vector3(0,0,-1).applyQuaternion(q);d.y=0;return d.normalize();};
  assert.ok(heading(left).dot(heading(right))<-.999);
  assert.equal(opts.prompt.label,'Exit Binoculars');
  opts.prompt.act();assert.equal(releases,1);assert.deepEqual(camera.position,start);
  area.reset();assert.equal(row('night-observation').current,0);
});

test('CCTV console cycles five real fixed views with one camera and exits on sixth interaction', async t => {
  const {area,camera,find,node,row}=await missionFixture(t);
  const item=find('View CCTV')[0];const mission=row('cctv-monitoring');
  for(let i=1;i<=5;i++){assert.ok(node('CCTV monitor '+i));assert.ok(node('CCTV camera '+i));}
  let opts,release=0;
  const start=camera.position.clone();
  item.act({guideCamera(_look,o){opts=o;return ()=>{release++;};}});
  assert.equal(opts.viewMode,'cctv');assert.equal(opts.fov,58);
  const cameraView=opts.camera;
  const locations=new Set();
  for(let i=1;i<=5;i++){
    assert.equal(opts.camera,cameraView);
    assert.equal(mission.current,i);
    assert.match(opts.prompt.label,new RegExp('CCTV '+i+'/5'));
    locations.add(cameraView.position.toArray().join(','));
    if(i<5)opts.prompt.act();
  }
  assert.equal(locations.size,5);assert.equal(mission.complete,false);
  opts.prompt.act();assert.equal(release,1);assert.equal(mission.complete,true);assert.deepEqual(camera.position,start);
  area.reset();assert.equal(mission.current,0);assert.equal(mission.complete,false);
  item.act({guideCamera(_look,o){opts=o;return ()=>{release++;};}});
  area.reset();assert.equal(release,2);assert.equal(mission.current,0);
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
  point('Activate Radar').act();
  point('Pick Up Supplies').act();
  const verify = item => {
    let accessible = false;
    for (const r of [.8, 1.21, 1.55, item.radius - .03]) {
      if (r >= item.radius) continue;
      for (let i = 0; i < 32; i++) {
        const x = item.x + Math.sin(i * Math.PI / 16) * r;
        const z = item.z + Math.cos(i * Math.PI / 16) * r;
        const floor = floorHeight(area, x, z, (item.anchorY ?? 1.38) - 1.1);
        const standing = { x, z, y: EYE_HEIGHT + floor };
        if (walkElevation(area, standing, x, z, floor, true) === floor && item.reachable(standing)) accessible = true;
      }
    }
    assert.ok(accessible, `${item.label} can be approached at ${item.x}, ${item.z}`);
  };
  area.interactions.forEach(verify);
});

test('the last independent mission records area completion once across repeat visits', async t => {
  const { area, find, beginFlight, advance, completions, worlds } = await missionFixture(t, { reducedMotion: () => true });
  for (let visit = 0; visit < 2; visit++) {
    find('Activate Radar')[0].act();
    beginFlight();
    advance(flightTime + .1, undefined, 20);
    find('Activate Security').forEach(item => item.act());
    for (const item of find('Pick Up Supplies')) { item.act(); find('Deliver Supplies')[0].act(); }
    assert.equal(completions.length, visit);
    find('Repair Tank')[0].act();
    find('Wake Soldier')[0].act();
    advance(2);
    const night = find('Use Binoculars')[0];
    let prompt;
    const guideCamera = (_look,opts) => { prompt=opts.prompt; return ()=>{}; };
    night.act({guideCamera}); prompt.act();
    find('View CCTV')[0].act({guideCamera});
    for(let i=0;i<5;i++) prompt.act();
    find('Start Generator')[0].act();
    const tank = area.interactions.find(item => item.label === 'Drive Tank');
    tank.act({ guideCamera() { return () => {}; } });
    const scout = area === worlds.active.area ? worlds.active.scene.getObjectByName('Tank 01') : null;
    for (const point of tankTestCheckpoints) { scout.position.set(point.x,0,point.z); advance(.05); }
    assert.ok(area.missionStatus.missions.every(mission => mission.complete));
    assert.deepEqual(completions, ['military-base']);
    area.reset();
  }
});

test('all five CCTV optical origins clear their physical housings and nearby scene geometry', async t => {
  const {area,scene,find,node}=await missionFixture(t);
  let opts;
  find('View CCTV')[0].act({guideCamera(_look,o){opts=o;return ()=>{};}});
  const view=opts.camera;
  scene.updateMatrixWorld(true);
  const ray=new THREE.Raycaster();
  const meshes=[];
  scene.traverse(o=>{if(o.isMesh && o.visible && o.material && !o.material.transparent)meshes.push(o);});
  for(let i=0;i<cctvViews.length;i++){
    const {eye,target}=cctvViews[i];
    const origin=new THREE.Vector3(...eye);
    const focus=new THREE.Vector3(...target);
    const direction=focus.clone().sub(origin).normalize();
    const expected=origin.clone().addScaledVector(direction,cctvLensClearance);
    assert.ok(view.position.distanceTo(expected)<1e-6);
    const housing=node('CCTV camera '+(i+1));
    const axis=new THREE.Vector3(0,0,1).transformDirection(housing.matrixWorld);
    assert.ok(axis.dot(direction)>.9999);
    assert.ok(view.position.distanceTo(origin)>.7);
    if(i===4)assert.ok(view.position.y>5,'North Post optical origin clears overhead sign');
    // Check center and peripheral rays against actual rendered opaque geometry,
    // not just gameplay colliders. Reject any large object immediately in front.
    for(const x of [-.65,0,.65])for(const y of [-.65,0,.65]){
      ray.setFromCamera(new THREE.Vector2(x,y),view);
      ray.near=view.near;ray.far=1.15;
      const hits=ray.intersectObjects(meshes,false);
      assert.equal(hits.length,0,'CCTV '+(i+1)+' blocked at '+x+','+y+' by '+hits.map(h=>h.object.name).join(','));
    }
    if(i<4)opts.prompt.act();
  }
  opts.prompt.act();
});
