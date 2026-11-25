import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { buildDonut, donutCounter } from '../areas/kung-fu-hustle/donut.js';
import { buildSauce } from '../areas/kung-fu-hustle/sauce.js';
import { EYE_HEIGHT } from '../core/player.js';

test('Donut offers a bun only to a nearby ground-floor player and repeats after eating',()=>{
  const scene=new THREE.Scene(),viewmodel=new THREE.Group();
  const donut=buildDonut(THREE,scene,{},viewmodel,new THREE.PerspectiveCamera());
  const player={x:donutCounter.x-1,y:EYE_HEIGHT,z:donutCounter.z};
  const hand=viewmodel.getObjectByName('Player eating steamed bun');
  const bun=donut.root.getObjectByName('Donut offered steamed bun');
  assert.equal(donut.trigger.label,'Take Steamed Bun');
  assert.equal(donut.trigger.active,false);
  donut.update(1,{...player,y:EYE_HEIGHT+3.25});
  assert.equal(donut.trigger.active,false);
  donut.update(1,player);
  assert.equal(donut.trigger.active,true);
  assert.equal(bun.visible,true);
  donut.trigger.act();
  assert.equal(bun.visible,false);
  assert.equal(hand.visible,true);
  assert.equal(donut.trigger.active,false);
  donut.update(1,player);
  assert.ok(hand.getObjectByName('Held steamed bun').scale.x<1);
  donut.update(3,player);
  assert.equal(hand.visible,false);
  donut.update(1,player);
  assert.equal(donut.trigger.active,true);
  donut.trigger.act();donut.reset();
  assert.equal(hand.visible,false);
  assert.equal(donut.eating,false);
});

test('Sauce uses English well prompt and a finite, closed torso mesh',()=>{
  const scene=new THREE.Scene(),sauce=buildSauce(THREE,scene,{});
  assert.equal(sauce.trigger.label,'Draw Water');
  const m=sauce.root.getObjectByName('Slim bare chest and protruding belly');
  assert.ok(m.geometry.getAttribute('position').array.every(Number.isFinite));
});
