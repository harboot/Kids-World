import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { buildSauce } from '../areas/kung-fu-hustle/sauce.js';
import { EYE_HEIGHT } from '../core/player.js';

test('Sauce well interaction is repeatable and reset-safe',()=>{
  const scene=new THREE.Scene();
  const sauce=buildSauce(THREE,scene,{});
  const bucket=scene.getObjectByName('Sauce well bucket');
  assert.equal(bucket.visible,false);
  assert.equal(sauce.trigger.active,true);
  assert.equal(sauce.trigger.reachable({y:EYE_HEIGHT+3.25}),false);
  sauce.trigger.act();
  assert.equal(sauce.state,'draw');
  assert.equal(sauce.trigger.active,false);
  assert.equal(bucket.visible,true);
  sauce.trigger.act();
  sauce.update(2.2);
  assert.equal(sauce.state,'wash');
  assert.equal(sauce.root.getObjectByName('Sauce dipper').visible,true);
  sauce.update(5.4);
  assert.equal(sauce.state,'idle');
  assert.equal(bucket.visible,false);
  assert.equal(sauce.trigger.active,true);
  sauce.trigger.act();sauce.reset();
  assert.equal(sauce.trigger.active,true);
  assert.equal(bucket.visible,false);
});
