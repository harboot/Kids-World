import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { buildFong, fongPosition, lollipopCart, kissDuration } from '../areas/kung-fu-hustle/fong.js';
import { courtyardLayout } from '../areas/kung-fu-hustle/layout.js';
import { walkElevation } from '../core/movement.js';
import { EYE_HEIGHT } from '../core/player.js';

test('Fong follows nearby player, offers repeatable kiss and floating hearts',()=>{
  const scene=new THREE.Scene(), viewmodel=new THREE.Group(), layout=courtyardLayout(), cues=[];
  const f=buildFong(THREE,scene,layout,viewmodel,n=>cues.push(n));
  const p={x:fongPosition.x-4,y:EYE_HEIGHT,z:fongPosition.z-2};
  f.update(.5,p);assert.ok(Math.abs(f.root.rotation.y-Math.PI)>.3);
  assert.equal(f.trigger.label,'Buy Lollipop');assert.equal(f.trigger.reachable({...p,y:EYE_HEIGHT+3.25}),false);
  f.trigger.act();f.update(.8,p);assert.ok(f.hearts.children.some(m=>m.visible));assert.equal(cues.length,1);assert.equal(f.trigger.active,false);
  f.update(kissDuration,p);assert.ok(f.trigger.active);assert.ok(f.hearts.children.every(m=>!m.visible));
  f.trigger.act();f.reset();assert.equal(f.kissing,false);assert.equal(viewmodel.getObjectByName('Fong kiss hearts').visible,false);
  for(const pos of [fongPosition,lollipopCart])assert.equal(walkElevation(layout,{x:pos.x,z:pos.z-1.2},pos.x,pos.z,0,true),null);
});
