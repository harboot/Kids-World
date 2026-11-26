import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rectanglesOverlap, canPlaceTank, tankConfig } from '../areas/military-base/tank-driving.js';
import { tankTestCheckpoints } from '../areas/military-base/layout.js';
import { compactTank } from '../areas/military-base/compact-tank.js';
import * as THREE from '../vendor/three.module.min.js';
import { militaryBase } from '../areas/military-base/index.js';

test('oriented vehicle collision includes the overhanging cannon and map bounds', () => {
  const a = { x: 0, z: 0, width: 3, depth: 5, yaw: .5 };
  assert.ok(rectanglesOverlap(a, { ...a, x: 1 }));
  assert.ok(!rectanglesOverlap(a, { ...a, x: 10 }));
  const obstacle = { height: 2, footprint: { x: 0, z: 2.35, width: .5, depth: .5, yaw: 0 } };
  const world = { obstacles: [obstacle], own: new Set(), traversal: {}, width: 100, depth: 100 };
  assert.equal(canPlaceTank(0, 0, 0, world), false);
  world.own.add(obstacle);
  assert.equal(canPlaceTank(0, 0, 0, world), true);
  assert.equal(canPlaceTank(49, 0, 0, world), false);
  assert.equal(canPlaceTank(0, 49, 0, world), false);
});

test('Tank 01 drives, exits at its current location and resets without modifying missions', () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(70, 1, .1, 200);
  const area = militaryBase.load({ THREE, scene, camera, reducedMotion: () => true });
  const tank = scene.getObjectByName('Tank 01');
  const original = tank.position.clone();
  const board = area.interactions.find(i => i.label === 'Drive Tank');
  assert.ok(board);
  camera.position.set(board.x, 1.68, board.z);
  let controller, exit, spawn;
  board.act({ guideCamera(_look, options) { controller = options.drive; exit = options.prompt; return p => { spawn = p; }; } });
  assert.equal(board.active, false);
  assert.ok(Math.abs(camera.position.y - compactTank.eyeHeight) < .001);
  assert.ok(scene.getObjectByName('Scout open driver seat'));
  assert.ok(scene.getObjectByName('Scout driver control panel'));
  assert.equal(tank.children[0].name, 'Compact open scout tank');
  for (let i = 0; i < 45; i++) controller(1/60, { x: 0, y: -1 });
  assert.ok(tank.position.distanceTo(original) > .5);
  assert.ok(Math.abs(camera.position.y - compactTank.eyeHeight) < .001);
  exit.act();
  assert.ok(spawn);
  assert.ok(Math.hypot(spawn.x - tank.position.x, spawn.z - tank.position.z) < 5);
  assert.equal(board.active, true);
  area.reset();
  assert.ok(tank.position.distanceTo(original) < 1e-6);
  assert.equal(area.missionStatus.missions.length, 6);
  area.unload();
});

test('compact tank fits a narrow 2.8-unit lane without changing driving speeds', () => {
  const obstacles = [-1, 1].map(side => ({
    height: 5, footprint: { x: side * 1.65, z: 0, width: .5, depth: 20, yaw: 0 },
  }));
  const world = { obstacles, own: new Set(), traversal: {}, width: 100, depth: 100 };
  assert.equal(canPlaceTank(0, 0, 0, world), true);
  assert.equal(canPlaceTank(.35, 0, 0, world), false);
  assert.equal(canPlaceTank(0, 0, Math.PI / 2, world), false);
  assert.equal(tankConfig.forward, 15);
  assert.equal(tankConfig.reverse, 6);
  assert.equal(tankConfig.turn, 1.5);
  assert.ok(compactTank.width < 3.55 && compactTank.depth < 5.25);
});

test('Jeep drives with shared controls and a safe exit, and both vehicles reset independently', () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(70,1,.1,200);
  const area = militaryBase.load({THREE,scene,camera,reducedMotion:()=>true});
  const jeep = scene.getObjectByName('Entrance patrol jeep'), tank = scene.getObjectByName('Tank 01');
  const start=jeep.position.clone(), tankStart=tank.position.clone();
  const board=area.interactions.find(i=>i.label==='Drive Jeep');
  const tankBoard=area.interactions.find(i=>i.label==='Drive Tank');
  camera.position.set(board.x,1.68,board.z);
  let drive,exit,spawn;
  board.act({guideCamera(_look,o){drive=o.drive;exit=o.prompt;return p=>{spawn=p;};}});
  assert.ok(drive);
  assert.equal(tankBoard.active,false);
  assert.ok(Math.abs(camera.position.y-2.02)<.001);
  for(let i=0;i<30;i++) drive(1/60,{x:0,y:-1});
  assert.ok(jeep.position.distanceTo(start)>.25);
  area.update(0,camera.position);
  const local=scene.children.filter(o=>o.isPointLight);
  assert.equal(local.length,4);
  assert.ok(local[0].intensity>0);
  exit.act();assert.ok(spawn);
  assert.equal(tankBoard.active,true);
  assert.ok(tank.position.distanceTo(tankStart)<1e-6);
  area.reset();assert.ok(jeep.position.distanceTo(start)<1e-6);
  area.unload();
});

test('checkpoint centers can accommodate the full Scout Tank footprint', () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  const area = militaryBase.load({THREE,scene,camera});
  const tank = scene.getObjectByName('Tank 01');
  const own = new Set(area.obstacles.filter(o=>o.footprint && Math.hypot(o.footprint.x-tank.position.x,o.footprint.z-tank.position.z)<2.6));
  const world={obstacles:area.obstacles,own,traversal:area,width:154,depth:150};
  for(const point of tankTestCheckpoints) {
    assert.ok(Array.from({length:16},(_,i)=>i*Math.PI/8).some(yaw=>canPlaceTank(point.x,point.z,yaw,world)),
      'clear checkpoint '+JSON.stringify(point));
  }
  area.unload();
});
