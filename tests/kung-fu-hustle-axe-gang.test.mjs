import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { buildAxeGang, brotherSumPosition, danceDuration } from '../areas/kung-fu-hustle/axe-gang.js';
import { EYE_HEIGHT } from '../core/player.js';
import { courtyardLayout } from '../areas/kung-fu-hustle/layout.js';
import { walkElevation } from '../core/movement.js';

test('Brother Sum leads six synchronized dancers and the interaction resets', () => {
  const scene=new THREE.Scene(), gang=buildAxeGang(THREE,scene,courtyardLayout());
  const {group,trigger}=gang;
  assert.deepEqual(group.position.toArray(),Object.values(brotherSumPosition));
  assert.equal(group.children.length,7);
  assert.equal(group.children[0].name,'Brother Sum');
  assert.ok(group.children.slice(1).every(n=>n.position.z<0));
  assert.equal(trigger.label,'Lets Dancing');
  assert.equal(trigger.reachable({y:EYE_HEIGHT+3.25}),false);
  assert.equal(trigger.active,true);
  const before=group.children.map(n=>n.position.clone());
  trigger.act(); gang.update(.85);
  assert.equal(trigger.active,false);
  const dx=group.children[0].position.x-before[0].x;
  assert.notEqual(dx,0);
  for(let i=1;i<7;i++) assert.ok(Math.abs(group.children[i].position.x-before[i].x-dx)<1e-9);
  group.traverse(n=>{if(n.isMesh) assert.ok(n.geometry.getAttribute('position').array.every(Number.isFinite));});
  gang.update(danceDuration);
  assert.equal(trigger.active,true);
  assert.deepEqual(group.children.map(n=>n.position.toArray()),before.map(n=>n.toArray()));
  trigger.act(); gang.update(1); gang.reset();
  assert.equal(gang.dancing,false);
  assert.equal(trigger.active,true);
});

test('each gang member blocks movement in idle and dance without sealing the formation', () => {
  const scene=new THREE.Scene(), layout=courtyardLayout();
  const gang=buildAxeGang(THREE,scene,layout);
  assert.equal(layout.obstacles.length,7);
  const world={...layout};
  function checkBodies(){
    for(const npc of gang.group.children){
      const x=gang.group.position.x+npc.position.x,z=gang.group.position.z+npc.position.z;
      assert.equal(walkElevation(world,{x,z:z+1},x,z,0,true),null);
      assert.equal(walkElevation(world,{x,z:z+1},x,z,.5,false),null);
    }
  }
  checkBodies();
  // The two columns leave a central aisle for the player.
  const x=brotherSumPosition.x,z=brotherSumPosition.z-3.30;
  assert.equal(walkElevation(world,{x,z:z+.1},x,z,0,true),0);
  gang.trigger.act();
  for(let i=0;i<32;i++){gang.update(.25);checkBodies();}
  gang.reset();checkBodies();
});
