import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { militaryBase } from '../areas/military-base/index.js';
import { hangarSite as h } from '../areas/military-base/robot-hangar.js';
import { createPlayer,EYE_HEIGHT } from '../core/player.js';

test('open robot lift carries the player to a walkable surrounding catwalk and back, with guarded edges',()=>{
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),player=createPlayer(THREE,camera);
  const area=militaryBase.load({THREE,scene,camera,carryPlayer:d=>player.carryVertically(d),reducedMotion:()=>true});
  const visit={area,definition:militaryBase};
  const lift=scene.getObjectByName('Open robot lift platform');
  const ride=area.interactions.find(i=>i.label==='Ride lift up');
  const step=new THREE.Vector2();
  const tick=()=>{player.move(1/60,step,visit);area.update(1/60,camera.position);};
  function walk(x,z){for(let i=0;i<1200;i++){step.set(x-camera.position.x,z-camera.position.z);if(step.length()<.085){player.stop();step.set(0,0);return;}step.normalize();tick();}assert.fail('cannot walk to '+x+','+z+' from '+camera.position.toArray());}
  area.reset();
  player.reset({x:h.x,z:h.z+h.liftZ+2.55},area,0);
  walk(h.x,h.z+h.liftZ);
  assert.ok(ride.reachable(camera.position));
  ride.act(); for(let i=0;i<40;i++)tick();
  assert.equal(lift.position.y,h.deck);
  assert.ok(Math.abs(camera.position.y-EYE_HEIGHT-h.deck)<1e-5);
  walk(h.x,h.z+4.15);
  walk(h.x+9,h.z+4.15);
  walk(h.x+9,h.z-4.15);
  walk(h.x-9,h.z-4.15);
  walk(h.x-9,h.z+4.15);
  walk(h.x,h.z+4.15);
  assert.equal(area.blocksGround(h.x,h.z+2.95,.34,h.deck,{x:h.x,z:h.z+3.6}),true);
  walk(h.x,h.z+h.liftZ);
  assert.equal(ride.label,'Ride lift down');ride.act();for(let i=0;i<40;i++)tick();
  assert.equal(lift.position.y,0);assert.ok(Math.abs(camera.position.y-EYE_HEIGHT)<1e-5);
  walk(h.x,h.z+h.liftZ+2.55);
  // Lower call works when empty platform is upstairs; reset restores lower position.
  player.reset({x:h.x,z:h.z+h.liftZ},area,0);ride.act();for(let i=0;i<40;i++)tick();
  walk(h.x,h.z+4.15);
  player.reset({x:h.x,z:h.z+h.liftZ+2.55},area,0);
  const call=area.interactions.find(i=>i.label==='Call lift to ground');
  assert.ok(call.active);call.act();for(let i=0;i<40;i++)tick();
  assert.equal(lift.position.y,0);area.reset();assert.equal(ride.label,'Ride lift up');area.unload();
});
