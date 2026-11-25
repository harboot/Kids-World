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

test('standing harpist gestures and returns to the original idle pose',()=>{
  const h=buildHarpists(THREE,new THREE.Scene());
  const standing=h.root.getObjectByName('Standing Harpist');
  const hand=standing.getObjectByName('Hand 1');
  const idle=hand.position.clone();
  h.trigger.act();h.update(.21);
  assert.ok(hand.position.distanceTo(idle)>.15);
  assert.ok(Math.abs(standing.rotation.y)>.01);
  h.reset();assert.ok(hand.position.distanceTo(idle)<1e-9);
  assert.equal(standing.rotation.y,0);assert.equal(standing.rotation.z,0);
});

test('aperture trim is a single frame separated from the wall plane',()=>{
  const scene=new THREE.Scene();buildCourtyard(THREE,scene,courtyardLayout(),false);
  const frame=scene.getObjectByName('Harpists aperture frame');assert.ok(frame);
  frame.geometry.computeBoundingBox();
  const matrix=new THREE.Matrix4();frame.getMatrixAt(0,matrix);
  const bounds=frame.geometry.boundingBox.clone().applyMatrix4(matrix);
  assert.ok(bounds.min.z>harpistRoom.z+.02);
  assert.ok(bounds.max.z>bounds.min.z+.13);
  scene.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(harpistRoom.x,harpistRoom.y+1.5,harpistRoom.z+1),new THREE.Vector3(0,0,-1));
  assert.equal(ray.intersectObject(frame).length,0);
});
