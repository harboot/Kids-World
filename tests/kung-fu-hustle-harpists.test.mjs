import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { buildHarpists, harpistRoom, harpistDuration } from '../areas/kung-fu-hustle/harpists.js';
import { courtyardLayout } from '../areas/kung-fu-hustle/layout.js';
import { buildCourtyard } from '../areas/kung-fu-hustle/scene.js';
import { EYE_HEIGHT } from '../core/player.js';

test('Harpists play original cues and launch reusable forward waves',()=>{
  const scene=new THREE.Scene(),cues=[];
  const h=buildHarpists(THREE,scene,notes=>cues.push(notes));
  const p={x:harpistRoom.x,y:harpistRoom.y+EYE_HEIGHT,z:harpistRoom.z+1};
  assert.equal(h.trigger.label,'Play Music');assert.ok(h.trigger.reachable(p));
  assert.ok(!h.trigger.reachable({...p,y:EYE_HEIGHT}));assert.ok(!h.trigger.reachable({...p,z:harpistRoom.z-1}));
  assert.ok(h.root.getObjectByName('Seated Harpist'));assert.ok(h.root.getObjectByName('Standing Harpist'));assert.ok(h.root.getObjectByName('Guzheng'));
  h.trigger.act();assert.equal(cues.length,1);assert.equal(h.trigger.active,false);
  const wave=h.waves.children[0],z=wave.position.z;h.update(1.5);assert.ok(wave.visible&&wave.position.z>z+15);assert.ok(cues.length>1);
  h.update(harpistDuration);assert.ok(h.trigger.active);assert.ok(h.waves.children.every(w=>!w.visible));
  h.trigger.act();h.reset();assert.ok(h.trigger.active);assert.ok(h.waves.children.every(w=>!w.visible));
});

test('Harpists aperture is open visually, but the corridor wall collision remains',()=>{
  const scene=new THREE.Scene(),layout=courtyardLayout();buildCourtyard(THREE,scene,layout,false);
  scene.updateMatrixWorld(true);
  const wall=scene.getObjectByName('Hand-shaped breach');const r=harpistRoom;
  const ray=new THREE.Raycaster(new THREE.Vector3(r.x,r.y+1.6,r.z+1),new THREE.Vector3(0,0,-1));
  assert.equal(ray.intersectObject(wall).length,0);
  assert.equal(layout.blocksGround(r.x,r.z-.15,.34,r.y),true);
  assert.equal(layout.blocksGround(r.x,r.z+.8,.34,r.y),false);
  assert.equal(layout.getGroundHeight(r.x,r.z+.8,r.y),r.y);
});
