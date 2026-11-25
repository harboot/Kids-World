import assert from 'node:assert/strict';
import {test} from 'node:test';
import {spatialMix} from '../core/spatial-audio.js';
import {ambientSounds,ambientZones,createAmbientSounds} from '../areas/kung-fu-hustle/ambient.js';
import {createCharacterSounds,sounds} from '../areas/kung-fu-hustle/sounds.js';
import {wellPosition} from '../areas/kung-fu-hustle/sauce.js';
import {EYE_HEIGHT} from '../core/player.js';

test('world-space gain falls smoothly with distance, floor separation and camera direction',()=>{
  const source={x:0,z:0,eyeY:EYE_HEIGHT,range:12,maxFloors:1};
  const listener=(x,y=EYE_HEIGHT,z=0,rightX=1,rightZ=0)=>({x,y,z,rightX,rightZ});
  const near=spatialMix(listener(-1),source);
  const mid=spatialMix(listener(-6),source);
  assert.equal(near.gain,1);assert.ok(mid.gain>0&&mid.gain<near.gain);
  assert.equal(spatialMix(listener(-12),source).gain,0);
  assert.equal(near.pan,.85);assert.equal(spatialMix(listener(-1,EYE_HEIGHT,0,-1),source).pan,-.85);
  assert.equal(spatialMix(listener(0,EYE_HEIGHT,2),source).pan,0);
  const upper=spatialMix(listener(0,EYE_HEIGHT+3.25),source);
  assert.ok(upper.gain>0&&upper.gain<.5);
  assert.equal(spatialMix(listener(0,EYE_HEIGHT+6.5),source).gain,0);
  assert.equal(spatialMix(listener(0,EYE_HEIGHT+3.25),{...source,maxFloors:0}).gain,0);
  assert.equal(spatialMix(null,source).gain,0);
});
test('character sounds preserve cue identity and attach position, range and floor metadata',()=>{
  const heard=[],s=createCharacterSounds((...args)=>heard.push(args));
  s.setListener({x:2,y:EYE_HEIGHT,z:0});
  s.play('kick',{x:0,z:0},6);
  assert.equal(heard[0][0],sounds.kick);
  assert.deepEqual(heard[0][1],{x:0,z:0,eyeY:EYE_HEIGHT,range:6,maxFloors:0});
  s.setListener({x:2,y:EYE_HEIGHT+3.25,z:0});s.play('kick',{x:0,z:0},6);
  assert.equal(heard.length,1);
});
test('ambient sources are bounded, staggered and resettable; far or muted-by-cinematic emits nothing',()=>{
  assert.equal(Object.keys(ambientSounds).length,7);
  assert.equal(ambientZones.length,10);
  for(const z of ambientZones){assert.ok(z.interval[0]>=3&&z.interval[1]>=z.interval[0]);assert.ok(z.source.range>0);}
  for(const notes of Object.values(ambientSounds))for(const [p,n,offset] of notes){
    assert.ok(Number.isFinite(p)&&n.level>0&&n.level<=.06&&n.duration>n.attack&&n.duration+offset<=2);
  }
  const heard=[],a=createAmbientSounds((...args)=>heard.push(args));
  const p={...wellPosition,y:EYE_HEIGHT};
  const tick=(n,pos=p,audible=true)=>{for(let i=0;i<n;i++)a.update(.1,pos,audible);};
  tick(100,p,false);assert.equal(heard.length,0);
  tick(16);assert.ok(heard.some(c=>c[0]===ambientSounds.drip));
  const first=heard.slice();a.reset();heard.length=0;tick(16);
  assert.deepEqual(heard,first);
  heard.length=0;tick(600,{x:100,y:EYE_HEIGHT,z:100});assert.equal(heard.length,0);
  a.reset();tick(600,p);assert.ok(heard.length>0&&heard.length<60);
});
