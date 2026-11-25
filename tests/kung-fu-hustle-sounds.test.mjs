import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import kungFu from '../areas/kung-fu-hustle/index.js';
import {sounds,createCharacterSounds} from '../areas/kung-fu-hustle/sounds.js';
import {cooliePosition} from '../areas/kung-fu-hustle/coolie.js';
import {tailorPosition} from '../areas/kung-fu-hustle/tailor.js';
import {beastPosition} from '../areas/kung-fu-hustle/the-beast.js';
import {lipstickPosition} from '../areas/kung-fu-hustle/lipstick-girl.js';
import {wingX} from '../areas/kung-fu-hustle/layout.js';
import {EYE_HEIGHT} from '../core/player.js';
test('character sound definitions are bounded and local sound gates respect floor and radius',()=>{
  const heard=[],s=createCharacterSounds(c=>heard.push(c));
  for(const notes of Object.values(sounds))for(const [pitch,n,offset=0] of notes){
    assert.ok(Number.isFinite(pitch)&&n.duration>0&&n.duration<=1&&n.attack<n.duration&&n.level>0&&n.level<=.2&&offset>=0);
  }
  s.setListener({x:0,y:EYE_HEIGHT,z:0});s.play('kick',{x:0,z:0});
  s.play('kick',{x:10,z:0});s.play('kick',{x:0,z:0},5,EYE_HEIGHT+3.25);
  assert.deepEqual(heard,[sounds.kick]);
  s.reset();s.play('kick',{x:0,z:0});assert.equal(heard.length,1);
});
test('courtyard character effects follow action landmarks without per-frame spam',()=>{
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),viewmodel=new THREE.Group(),heard=[];
  const area=kungFu.load({THREE,scene,camera,viewmodel,playCue:c=>heard.push(c)});
  scene.updateMatrixWorld(true);
  const tick=(p,n)=>{for(let i=0;i<n;i++)area.update(.1,p);};
  const ground=(p,dx=0,dz=0)=>({x:p.x+dx,y:EYE_HEIGHT,z:p.z+dz});
  const count=k=>heard.filter(c=>c===sounds[k]).length;
  tick(ground(cooliePosition,0,2),40);assert.equal(count('kick'),1);assert.equal(count('kickReady'),1);assert.equal(count('kickLand'),1);
  tick(ground(cooliePosition,0,2),40);assert.equal(count('kick'),1);assert.ok(count('squat')>0);
  tick(ground(tailorPosition,-2,0),30);assert.equal(count('tailorRings'),1);
  tick(ground(beastPosition,0,2),40);assert.ok(count('croak')>0);
  tick(ground(lipstickPosition,2,0),35);assert.ok(count('sob')>=1&&count('sob')<=2);
  tick({x:wingX(-1,-14,5.76),z:5.76,y:EYE_HEIGHT+9.75},30);assert.equal(count('landlady'),1);assert.ok(count('laundry')>0);
  function act(label,frames){
    const tr=area.interactions.find(t=>t.label===label),p={x:tr.x-.9,z:tr.z,y:EYE_HEIGHT};
    tick(p,12);assert.ok(tr.active,label);tr.act();tick(p,frames);
  }
  act('Draw Water',80);assert.equal(count('bucketDraw'),1);assert.equal(count('bucketSet'),1);assert.equal(count('waterPour'),2);assert.equal(count('scrub'),4);
  act('Take Steamed Bun',40);assert.equal(count('bunTake'),1);assert.equal(count('bite'),2);
  act('Lets Dancing',100);assert.equal(count('danceStep'),16);
  act('Buy Lollipop',40);assert.equal(count('kiss'),1);
  area.unload();
});
