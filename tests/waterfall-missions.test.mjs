import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import { nearestInteraction } from '../core/interactions.js';
import { walkElevation } from '../core/movement.js';
import { normalizeMissionStatus } from '../core/missions.js';
import { EYE_HEIGHT } from '../core/player.js';
import valley from '../areas/waterfall-valley/index.js';
import { clamp } from '../areas/waterfall-valley/landform.js';
import { createMineLayout } from '../areas/waterfall-valley/mine-layout.js';
import { BOAT_CHECKPOINT, trainCheckpoints } from '../areas/waterfall-valley/missions.js';

const titles = ['Boat Ride','Feed the Deer','Fishing','Gold Hunt','Campfire','Waterfall Discovery',
  'Restore Mine Power','Crystal Mining','Mine Train','Flying Fox'];
const crystalIds = ['crystal-deposit-blue','crystal-deposit-violet','crystal-deposit-green'];
const goldIds = ['gold-nugget-lower','gold-nugget-middle','gold-nugget-upper'];

function fixture(t, reducedMotion = false) {
  const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(), viewmodel=new THREE.Group();
  scene.add(camera);
  camera.add(viewmodel);
  const notifications=[], records=[];
  const visit=valley.load({THREE,scene,camera,viewmodel,reducedMotion:()=>reducedMotion,
    notify:message=>notifications.push(message),completeLevel:id=>records.push(id),
    isLevelComplete:id=>records.includes(id),
  });
  t.after(()=>visit.unload());
  const boat=scene.getObjectByName('Waterfall lake motorboat');
  const train=scene.getObjectByName('Mining locomotive');
  const beam=scene.getObjectByName('Boat Ride checkpoint');
  const trainBeams=Array.from({length:3},(_,i)=>scene.getObjectByName('Mine Train checkpoint '+(i+1)));
  let controls;

  function tick(seconds) {
    for(let i=0;i<Math.ceil(seconds/0.05);i++)visit.update(0.05,camera.position);
  }

  function stand({x,y,z},seconds=0.05){
    camera.position.set(x,y+EYE_HEIGHT,z);
    camera.updateMatrixWorld();
    tick(seconds);
  }

  function landmark(id, seconds) { stand(visit.landmarks[id].approach,seconds); }
  function model(name){
    const result=scene.getObjectByName(name);
    assert.ok(result,name);
    return result;
  }
  function row(id){return visit.missionStatus.missions.find(mission=>mission.id===id);}
  function prompt(){return nearestInteraction(visit.interactions,camera.position);}
  function act(label){
    const item=prompt();
    assert.equal(item?.label,label);
    item.act({});
  }
  function board(label) {
    const item=visit.interactions.find(item=>item.label===label && item.active!==false);
    assert.ok(item,label);
    item.act({guideCamera(look,options){
      controls=options;
      return place=>{
        controls=null;
        if(place)stand({...place,y:place.elevation});
      };
    }});
  }
  function drive(throttle,frames,steer=0,update=true){
    for(let i=0;i<frames && controls;i++){
      const x=typeof steer==='function'?steer(i):steer;
      controls.drive(0.05,{x,y:-throttle},1);
      if(update)visit.update(0.05,camera.position);
    }
  }
  function dismount(){
    controls.prompt.act();
    drive(0,80);
    assert.equal(controls,null);
  }

  return {scene,viewmodel,camera,visit,boat,train,beam,trainBeams,notifications,records,
    tick,stand,landmark,model,row,prompt,act,board,drive,dismount};
}

test('ten English missions start at zero and NPC hints leave progress untouched',t=>{
  const f=fixture(t);
  const status=normalizeMissionStatus(f.visit.missionStatus);
  assert.deepEqual(status.missions.map(m=>m.title),titles);
  assert.deepEqual(status.missions.map(m=>m.total),[1,1,1,3,1,2,1,3,3,1]);
  assert.ok(status.missions.every(m=>!m.current&&!m.complete));
  assert.equal(status.hint,'Drive the boat beneath the waterfall.');
  assert.equal(f.visit.interactions.some(item=>/cargo|firewood|pick up food/i.test(item.label)),false);
  assert.equal(f.beam.visible,false);
  assert.ok(f.trainBeams.every(marker=>!marker.visible));
  for(const [name,label,topic] of [
    ['Park ranger','Talk to Ranger',/gold.*cave/],
    ['Camper','Talk to Camper',/night.*daylight/],
    ['Fisherman','Talk to Fisherman',/spare rod/],
    ['Retired miner','Talk to Miner',/train.*generator/],
  ]){
    f.stand(f.model(name).position);
    f.act(label);
    assert.match(f.notifications.at(-1),topic);
  }
  assert.equal(normalizeMissionStatus(f.visit.missionStatus).completed,0);
});

function navigateBoat(f){
  f.drive(1,300,i=>{
    if(i<20)return 0;
    const {x,z}=f.boat.position;
    const target=Math.atan2(BOAT_CHECKPOINT.x-x,BOAT_CHECKPOINT.z-z);
    const heading=target-f.boat.rotation.y;
    return clamp(-2.8*Math.atan2(Math.sin(heading),Math.cos(heading)),-1,1);
  });
  assert.equal(f.row('boat-ride').complete,true);
}

test('the boat has one exact marker and scores only by driving at lake elevation',t=>{
  const f=fixture(t,true);
  assert.deepEqual(f.beam.position.toArray(),[3.76,4.31,-17.69]);
  assert.equal(f.scene.children.filter(node=>node.name.startsWith('Boat Ride checkpoint')).length,1);
  f.stand({x:3.76,y:4.31,z:-17.69});
  assert.equal(f.row('boat-ride').current,0);
  f.board('Drive Boat');
  f.tick(0.05);
  assert.equal(f.beam.visible,true);
  navigateBoat(f);
  assert.equal(f.beam.visible,false);
  assert.equal(f.row('boat-ride').current,1);
  assert.ok(f.visit.interactions.some(item=>item.label==='Drive Train'&&item.active!==false));
});

test('every rabbit and deer can be fed repeatedly and only deer count for the mission', t => {
  const f = fixture(t, true);
  for (const [species, count] of [['Rabbit', 6], ['Deer', 3]]) {
    const items = f.visit.interactions.filter(item => item.label === 'Feed ' + species);
    assert.equal(items.length, count);
    for (const item of [...items, items[0]]) {
      const y = f.visit.getGroundHeight(item.x, item.z);
      f.stand({ x: item.x, z: item.z, y });
      assert.ok(item.active && item.reachable(f.camera.position));
      item.act({});
      assert.equal(item.active, false);
      f.tick(2);
      assert.equal(item.active, true);
      assert.equal(f.row('feed-deer').current, species === 'Deer' ? 1 : 0);
    }
  }
});

test('fishing cancels without taking input and waits for a bite until one fish reaches the basket',t=>{
  const f=fixture(t);
  f.landmark('fishing-rod');
  f.act('Start Fishing');
  assert.equal(f.viewmodel.getObjectByName('Held fishing rod').visible,true);
  assert.equal(f.model('Fishing line and bobber').visible,true);
  f.act('Cancel Fishing');
  assert.equal(f.viewmodel.getObjectByName('Held fishing rod').visible,false);
  f.act('Start Fishing');
  f.stand({x:20,z:11,y:1.4});
  assert.equal(f.model('Fishing line and bobber').visible,false);
  assert.equal(f.row('fishing').current,0);
  f.landmark('fishing-rod');
  f.act('Start Fishing');
  f.tick(12);
  f.act('Catch Fish');
  assert.equal(f.row('fishing').current,0);
  f.tick(1);
  const fish=f.model('Fish caught at the pier');
  assert.equal(f.row('fishing').current,1);
  assert.equal(fish.visible,true);
  assert.ok(fish.position.distanceTo(f.model('Fishing basket').position)<0.5);
  assert.equal(f.viewmodel.getObjectByName('Held fishing rod').visible,false);
  assert.notEqual(f.prompt()?.label,'Start Fishing');
  f.visit.reset();
  assert.equal(fish.visible,false);
});

test('mine power and an indefinite campfire night are independent and reset per visit',t=>{
  const f=fixture(t);
  const sky=f.scene.background.clone(), sun=f.scene.children.find(node=>node.isDirectionalLight);
  const day=sun.intensity;
  const station=f.model('Mine station industrial lamps').material.color;
  const workshop=f.model('Mine workshop industrial lamps').material.color;
  const tunnel=f.model('Mine tunnel industrial lamps').material.color;
  const dark=station.clone();
  const floor = f.model('Faceted cavern floors').geometry;
  const positions = floor.getAttribute('position');
  const colors = floor.getAttribute('color');
  const sample = predicate => Array.from({ length: positions.count }, (_, i) => i)
    .find(i => predicate(positions.getZ(i)));
  const deep = sample(z => z < -58);
  const mouth = sample(z => z === -22);
  const deepDark = colors.getX(deep);
  const mouthDaylight = colors.getX(mouth);
  f.landmark('mine-power-control-panel');
  f.act('Start Generator');
  f.tick(0.65);
  assert.ok(!station.equals(dark) && workshop.equals(dark) && tunnel.equals(dark));
  f.tick(1.1);
  assert.ok(!station.equals(dark) && !workshop.equals(dark) && !tunnel.equals(dark));
  assert.equal(f.row('restore-mine-power').complete,true);
  assert.ok(colors.getX(deep) > deepDark * 4);
  assert.equal(colors.getX(mouth), mouthDaylight);
  const lit=station.clone();
  f.landmark('campfire');
  f.act('Light Campfire');
  f.tick(0.5);
  assert.equal(f.row('campfire').complete,false);
  assert.ok(!f.scene.background.equals(sky));
  f.act('Extinguish Campfire');
  f.tick(1);
  assert.ok(f.scene.background.equals(sky));
  assert.equal(f.model('Campfire flames and smoke').visible,false);
  f.act('Light Campfire');
  f.tick(3);
  assert.equal(f.row('campfire').complete,true);
  assert.ok(sun.intensity<day && f.model('Valley stars').parent.visible);
  f.tick(95);
  assert.equal(f.model('Campfire flames and smoke').visible,true);
  f.landmark('mine-power-control-panel');
  f.tick(2);
  assert.ok(station.equals(lit));
  assert.equal(sun.intensity,day);
  f.board('Drive Train');
  f.drive(1,12);
  f.dismount();
  assert.equal(f.model('Campfire flames and smoke').visible,true);
  f.landmark('campfire');
  f.act('Extinguish Campfire');
  f.tick(3);
  assert.ok(f.scene.background.equals(sky) && station.equals(lit));
  f.act('Light Campfire');
  f.tick(3);
  assert.equal(f.row('campfire').current,1);
  assert.equal(f.notifications.filter(message=>message==='The campfire lit up the valley night.').length,1);
  f.visit.reset();
  assert.ok(f.scene.background.equals(sky) && station.equals(dark));
  assert.equal(f.row('campfire').current,0);
});

function trainRoute(f, reverse) {
  const mine=createMineLayout(THREE);
  for(const point of trainCheckpoints(mine))f.stand(point);
  assert.equal(f.row('mine-train').current,0);
  f.board('Drive Train');
  f.tick(0.05);
  assert.ok(f.trainBeams.every(marker=>marker.visible));
  if(reverse){
    // Skip scoring on the outbound leg to exercise the reverse trigger in isolation.
    f.drive(1,1000,0,false);
    f.tick(0.05);
    assert.equal(f.row('mine-train').current,0);
  }
  f.drive(reverse?-1:1,reverse?151:64);
  const before=f.row('mine-train').current;
  assert.ok(before>=1&&before<3);
  f.dismount();
  assert.ok(f.trainBeams.every(marker=>!marker.visible));
  const parked=f.train.position.clone(), count=f.row('mine-train').current;
  f.tick(0.4);
  assert.ok(parked.equals(f.train.position));
  assert.equal(f.row('mine-train').current,count);
  f.board('Drive Train');
  f.drive(reverse?-1:1,1350);
  assert.equal(f.row('mine-train').current,3);
  assert.ok(f.trainBeams.every(marker=>!marker.visible));
  f.dismount();
}

function finishObjective(f,id){
  switch(id){
    case 'flying-fox': {
      const {x,z}=f.visit.interactions.find(item=>item.label==='Ride Flying Fox');
      const y=f.visit.getGroundHeight(x,z);
      f.stand({x,y,z});
      const ride=f.prompt();
      assert.equal(ride.label,'Ride Flying Fox');
      let landing;
      ride.act({guideCamera:()=>point=>{landing=point;}});
      f.tick(2);
      assert.equal(f.row(id).current,0);
      f.tick(5);
      assert.ok(landing && landing.z>20);
      const floor=f.visit.getGroundHeight(landing.x,landing.z);
      assert.equal(f.visit.blocksGround(landing.x,landing.z,0.34,floor,landing),false);
      break;
    }
    case 'boat-ride':
      f.board('Drive Boat');
      navigateBoat(f);
      f.drive(-1,500);
      f.dismount();
      break;
    case 'mine-train':
      trainRoute(f,false);
      break;
    case 'feed-deer': {
      const deer=f.model('Mountain deer 1');
      f.stand(deer.position);
      f.act('Feed Deer');
      assert.equal(f.viewmodel.getObjectByName('Held deer food').visible,true);
      f.tick(1.35);
      assert.equal(f.viewmodel.getObjectByName('Held deer food').visible,false);
      assert.equal(f.model('Deer feeding hearts').visible,true);
      break;
    }
    case 'gold-hunt':
      for(const key of [...goldIds].reverse()){
        f.landmark(key,0.23);
        assert.equal(f.visit.landmarks[key].object.visible,false);
      }
      break;
    case 'waterfall-discovery':
      for(const key of ['upper-cave-entrance','lower-cave-entrance'])f.landmark(key,0.3);
      break;
    case 'campfire':
      f.landmark('campfire');
      f.act('Light Campfire');
      f.tick(3);
      break;
    case 'restore-mine-power':
      f.landmark('mine-power-control-panel');
      f.act('Start Generator');
      f.tick(2);
      break;
    case 'crystal-mining':
      for(const [i,key] of crystalIds.entries()){
        f.landmark(key);
        assert.equal(f.viewmodel.getObjectByName('Held crystal pickaxe').visible,true);
        const deposit=f.visit.landmarks[key].object.getObjectByName('Mineable crystal formation');
        for(let swing=0;swing<3;swing++){
          f.act('Mine Crystal');
          assert.notEqual(f.prompt()?.label,'Mine Crystal');
          f.tick(0.43);
          assert.equal(f.row(id).current,i+Number(swing===2));
        }
        assert.ok(deposit.scale.y<0.4);
        assert.equal(f.viewmodel.getObjectByName('Held collected crystal').visible,true);
      }
      f.stand({x:-14,y:1.4,z:-23});
      assert.equal(f.viewmodel.getObjectByName('Held crystal pickaxe').visible,false);
      break;
    case 'fishing':
      f.landmark('fishing-rod');
      f.act('Start Fishing');
      f.tick(4);
      f.act('Catch Fish');
      f.tick(1);
      break;
  }
  assert.equal(f.row(id).complete,true,id);
}

test('the train scores reverse checkpoints and preserves them across a tunnel dismount',t=>{
  trainRoute(fixture(t,true),true);
});

test('a Crystal Hall stop supports walking from the train to a deposit and reboarding afterward', t => {
  const f=fixture(t,true);
  const turnout=f.visit.interactions.find(item=>item.label==='Switch to Crystal Hall');
  f.stand({x:turnout.x,y:f.visit.getGroundHeight(turnout.x,turnout.z),z:turnout.z});
  f.act('Switch to Crystal Hall');
  f.board('Drive Train');
  for(let i=0;i<210&&f.train.position.z>-54.5;i++)f.drive(1,1);
  f.dismount();
  const parked=f.train.position.clone();
  const entry={x:f.camera.position.x,y:f.camera.position.y-EYE_HEIGHT,z:f.camera.position.z};
  const deposit=f.visit.landmarks['crystal-deposit-blue'].approach;

  function approachOnFoot(start,target) {
    const sample=0.25;
    const x0=Math.round(start.x/sample)*sample,z0=Math.round(start.z/sample)*sample;
    const queue=[[x0,z0,f.visit.getGroundHeight(x0,z0,start.y)]];
    const seen=new Set([x0+','+z0]);
    for(const [x,z,y] of queue) {
      if(Math.hypot(x-target.x,z-target.z)<0.38&&Math.abs(y-target.y)<0.38)return {x,y,z};
      for(const [dx,dz] of [[sample,0],[-sample,0],[0,sample],[0,-sample]]) {
        const px=x+dx,pz=z+dz,key=px+','+pz;
        if(seen.has(key)||Math.hypot(px-start.x,pz-start.z)>9)continue;
        const next=walkElevation(f.visit,{x,z},px,pz,y,true);
        if(next===null||next+1.82>f.visit.getCeilingHeight(px,pz,next))continue;
        seen.add(key);
        queue.push([px,pz,next]);
      }
    }
    assert.fail('Connected walking route around the parked train');
  }

  f.stand(approachOnFoot(entry,deposit));
  for(let i=0;i<3;i++){f.act('Mine Crystal');f.tick(0.3);}
  assert.equal(f.row('crystal-mining').current,1);
  f.stand(approachOnFoot(deposit,entry));
  assert.equal(f.prompt()?.label,'Drive Train');
  assert.ok(parked.equals(f.train.position));
  const checkpoints=f.row('mine-train').current;
  f.board('Drive Train');
  f.drive(1,48);
  assert.ok(f.train.position.distanceTo(parked)>1);
  assert.equal(f.row('mine-train').current,checkpoints);
});

test('all missions complete in opposed orders and award the public badge only once',t=>{
  const f=fixture(t,true);
  const ids=f.visit.missionStatus.missions.map(m=>m.id);
  for(const order of [ids,[...ids].reverse()]){
    for(const [index,id] of order.entries()){
      finishObjective(f,id);
      assert.equal(normalizeMissionStatus(f.visit.missionStatus).completed,index+1);
    }
    assert.deepEqual(f.records,['waterfall-valley']);
    assert.equal(f.visit.missionStatus.hint,'');
    f.visit.reset();
    assert.equal(normalizeMissionStatus(f.visit.missionStatus).completed,0);
  }
});
