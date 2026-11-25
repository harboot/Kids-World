import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { buildLipstickGirl, lipstickPosition } from '../areas/kung-fu-hustle/lipstick-girl.js';
import { courtyardLayout } from '../areas/kung-fu-hustle/layout.js';
import { EYE_HEIGHT } from '../core/player.js';
import { walkElevation } from '../core/movement.js';

test('Lipstick Girl crouches, looks up and cries only for a nearby ground-floor player',()=>{
  const scene=new THREE.Scene(),layout=courtyardLayout(),encounters=[];
  const girl=buildLipstickGirl(THREE,scene,layout,id=>encounters.push(id));
  assert.deepEqual(girl.root.position.toArray(),Object.values(lipstickPosition));
  const head=girl.root.getObjectByName('Lipstick Girl head'),tears=head.getObjectByName('Falling tears');
  const p={x:lipstickPosition.x+2,y:EYE_HEIGHT,z:lipstickPosition.z+.4};
  for(let i=0;i<20;i++)girl.update(.1,{...p,y:p.y+3.25});
  assert.equal(girl.crying,false);assert.equal(encounters.length,0);
  for(let i=0;i<10;i++)girl.update(.1,p);
  assert.ok(head.rotation.x<-.35);assert.ok(girl.crying&&tears.visible);assert.ok(encounters.includes('lipstick'));
  for(let i=0;i<20;i++)girl.update(.1,{...p,x:p.x+10});
  assert.equal(girl.crying,false);assert.equal(tears.visible,false);
  girl.reset();assert.equal(head.rotation.x,.30);
  const {x,z}=lipstickPosition;assert.equal(walkElevation(layout,{x:x+1,z},x,z,0,true),null);
});
