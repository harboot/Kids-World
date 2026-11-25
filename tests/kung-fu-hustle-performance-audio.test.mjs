import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import kungFu from '../areas/kung-fu-hustle/index.js';
import {danceMusic,harpistPluck,cinematicCues} from '../areas/kung-fu-hustle/performance-audio.js';
import {danceDuration} from '../areas/kung-fu-hustle/axe-gang.js';
import {harpistDuration} from '../areas/kung-fu-hustle/harpists.js';
test('original dance phrases, plucks and cinematic cues remain bounded',()=>{
  assert.equal(danceMusic.length,16);
  for(const c of danceMusic)for(const [,n,offset=0] of c)assert.ok(n.duration+offset<=.56);
  assert.ok(harpistPluck(62).some(([,n])=>n.wave==='noise'));
  for(const notes of Object.values(cinematicCues))for(const [p,n,offset=0] of notes)assert.ok(Number.isFinite(p)&&n.level>0&&n.level<=.22&&n.attack<n.duration&&n.duration>0&&offset>=0);
});
test('performances duck BGM, restore after completion and dispatch synchronized cinematic cues',()=>{
  const heard=[],ducks=[],scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),viewmodel=new THREE.Group();
  const area=kungFu.load({THREE,scene,camera,viewmodel,playCue:c=>heard.push(c),setMusicDuck:v=>ducks.push(v)});
  scene.updateMatrixWorld(true);
  const trigger=label=>area.interactions.find(t=>t.label===label);
  const player=new THREE.Vector3(0,1.68,18);
  const tick=seconds=>{for(let i=0;i<Math.ceil(seconds*20);i++)area.update(.05,player);};
  trigger('Lets Dancing').act();assert.equal(ducks.at(-1),true);tick(danceDuration+.2);
  assert.equal(heard.filter(c=>danceMusic.includes(c)).length,16);assert.equal(ducks.at(-1),false);
  trigger('Play Music').act();assert.equal(ducks.at(-1),true);tick(harpistDuration+.2);assert.equal(ducks.at(-1),false);
  trigger('Open Book').act({guideCamera:()=>()=>{}});assert.equal(ducks.at(-1),true);tick(20);
  for(const key of ['book-rise','lift','aim','dive','impact'])assert.equal(heard.filter(c=>c===cinematicCues[key]).length,1,key);
  assert.equal(heard.filter(c=>c===cinematicCues.wind).length,4);
  assert.equal(ducks.at(-1),false);
  trigger('Lets Dancing').act();area.reset();assert.equal(ducks.at(-1),false);
});
