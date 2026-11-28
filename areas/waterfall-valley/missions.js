import { createFlyingFox } from './flying-fox.js';
import { createFieldInteractions, near } from './field-interactions.js';
import { createBursts, checkpointBeam } from './mission-effects.js';
import { LAKE_LEVEL } from './landform.js';
import { goldSites } from './detail-sites.js';

const missionDefinitions = [
  ['boat-ride','Boat Ride',1,'Drive the boat beneath the waterfall.'],
  ['feed-deer','Feed the Deer',1,'Find and feed the deer.'],
  ['fishing','Fishing',1,'Catch a fish at the fishing pier.'],
  ['gold-hunt','Gold Hunt',3,'Find three gold nuggets along the mountain trails.'],
  ['campfire','Campfire',1,'Light the campfire to experience the night.'],
  ['waterfall-discovery','Waterfall Discovery',2,'Discover both caves hidden behind the waterfall.'],
  ['restore-mine-power','Restore Mine Power',1,'Find the underground generator and restore mine power.'],
  ['crystal-mining','Crystal Mining',3,'Mine three different crystals inside the cave.'],
  ['mine-train','Mine Train',3,'Drive the mining train through three checkpoints.'],
  ['flying-fox','Flying Fox',1,'Ride the Flying Fox from the upper cave to the valley below.'],
];

export const BOAT_CHECKPOINT = Object.freeze({ x:3.76, y:4.31, z:-17.69 });

export function trainCheckpoints(mine) {
  return [[-18.7,-37.6],[-42,-52],[22.7,-32.3]].map(([x,z])=>{
    const [px,pz,y]=mine.main.points.reduce((a,b)=>
      Math.hypot(a[0]-x,a[1]-z)<Math.hypot(b[0]-x,b[1]-z)?a:b);
    return {x:px,y,z:pz};
  });
}

export function createValleyMissions({
  THREE, scene, viewmodel, camera, mine, landmarks, characters, wildlife, veins, basket,
  boat, train, campfire, power, getGroundHeight, getCeilingHeight, notify, reducedMotion, touch,
  completeLevel, isLevelComplete, areaId,
}) {
  const rows=missionDefinitions.map(([id,title,total])=>({id,title,total,current:0,complete:false}));
  const byId=new Map(rows.map(row=>[row.id,row]));
  const hints=new Map(missionDefinitions.map(([id,,,hint])=>[id,hint]));
  const effects=createBursts(THREE,scene,touch);
  const driving=()=>boat.driving||train.driving||zipline.riding;
  const zipline=createFlyingFox({THREE,scene,camera,ground:getGroundHeight,
    busy:()=>boat.driving||train.driving, onLand:()=>progress('flying-fox','Flying Fox ride complete!')});
  const gold=goldSites.map(([id])=>landmarks[id]);
  const entrances=[
    {point:landmarks['lower-cave-entrance'].approach, label:'Lower waterfall cave discovered!'},
    {point:landmarks['upper-cave-entrance'].approach, label:'Upper waterfall cave discovered!'},
  ];
  const entranceVisited=[false,false];
  const trainVisited=[false,false,false];
  const boatBeam=checkpointBeam(THREE,scene,'Boat Ride checkpoint',BOAT_CHECKPOINT,
    LAKE_LEVEL+0.052,BOAT_CHECKPOINT.y+4.0,0x67dcef,0.99);
  const rails=trainCheckpoints(mine);
  const railBeams=rails.map((point,i)=>checkpointBeam(THREE,scene,'Mine Train checkpoint '+(i+1),point,
    point.y+0.23,Math.min(point.y+4.6,getCeilingHeight(point.x,point.z,point.y)-0.12),0xf5b861,0.74));
  let previousBoat=0, previousTrain=0, badgeReported=false, hint='';

  function isComplete(id){return byId.get(id).complete;}
  function progress(id, message) {
    const row=byId.get(id);
    if(row.complete)return;
    row.current++;
    if(row.current===row.total){
      row.complete=true;
      if(!badgeReported&&rows.every(mission=>mission.complete)){
        badgeReported=true;
        if(!isLevelComplete(areaId))completeLevel(areaId);
        notify('Hidden Waterfall Valley complete!');
        return;
      }
    }
    if(message)notify(message);
  }

  const field=createFieldInteractions({
    THREE, scene, viewmodel, camera, landmarks, wildlife, basket, veins, effects, notify, reducedMotion,
    finish:progress,isComplete,driving,
    markCrystal(){progress('crystal-mining','Crystal collected ('+(byId.get('crystal-mining').current+1)+'/3).');},
  });

  const hearth=landmarks.campfire.approach, panel=landmarks['mine-power-control-panel'].approach;
  function interactionAt(point,label,action,radius=1.7,active=()=>true) {
    return {
      x:point.x,z:point.z,anchorY:point.y+1.02,radius,silent:true,
      get label(){return typeof label==='function'?label():label;},
      get active(){return !driving()&&active();},
      reachable(p){return near(point,p,radius);},
      act(){if(!driving()&&active())action();},
    };
  }
  const interactions=[
    interactionAt(hearth,()=>campfire.lit?'Extinguish Campfire':'Light Campfire',()=>campfire.toggle(),1.6),
    interactionAt(panel,'Start Generator',()=>{
      power.start();
      notify('The generator is starting.');
    },1.52,()=>!power.started),
    ...field.interactions,
    zipline.interaction,
  ];
  for(const [name,label,tip,radius] of [
    ['Park ranger','Talk to Ranger','Look for gold along the hiking trails. Two cave entrances hide behind the waterfall.',1.35],
    ['Camper','Talk to Camper','Light the campfire to bring on the night. Extinguish it to bring back the daylight.',1.35],
    ['Fisherman','Talk to Fisherman','Use the spare rod at the pier. Wait for a bite, then reel in your fish.',1.0],
    ['Retired miner','Talk to Miner','The train can stop beside the crystal galleries. Look for the generator in the power station.',1.36],
  ]) interactions.push(interactionAt(characters.people[name].position,label,()=>notify(tip),radius,
    ()=>!field.fishing&&!field.feeding));

  function updateVehicles(){
    const boatMoved=boat.distanceTravelled>previousBoat, trainMoved=train.distanceTravelled>previousTrain;
    previousBoat=boat.distanceTravelled;previousTrain=train.distanceTravelled;
    if(boat.driving&&boatMoved&&!isComplete('boat-ride')){
      const {x,y,z}=boat.position;
      if(Math.abs(y-LAKE_LEVEL)<0.35 && Math.hypot(x-BOAT_CHECKPOINT.x,z-BOAT_CHECKPOINT.z)<2.35){
        progress('boat-ride','You reached the waterfall by boat!');
      }
    }
    boatBeam.visible=boat.driving&&!isComplete('boat-ride');

    if(train.driving&&trainMoved&&!isComplete('mine-train')){
      const p=train.position;
      for(const [i,point] of rails.entries()){
        if(!trainVisited[i]&&Math.abs(p.y-point.y)<1.08&&Math.hypot(p.x-point.x,p.z-point.z)<1.38){
          trainVisited[i]=true;
          progress('mine-train','Railway checkpoint ('+(byId.get('mine-train').current+1)+'/3).');
        }
      }
    }
    railBeams.forEach((beam,i)=>{beam.visible=train.driving&&!isComplete('mine-train')&&!trainVisited[i];});
  }

  function inspectFoot(player,atMine) {
    if(!driving()&&!atMine&&!isComplete('gold-hunt')){
      gold.forEach(({object,approach},index)=>{
        if(!object.visible||!near(approach,player,1.18,0.9))return;
        object.visible=false;
        if(!reducedMotion())effects.emit({x:approach.x,y:approach.y+0.36,z:approach.z},0xf7cf61,8);
        progress('gold-hunt','Gold nugget '+(index+1)+' found ('+(byId.get('gold-hunt').current+1)+'/3).');
      });
    }
    if(!isComplete('waterfall-discovery')){
      entrances.forEach(({point,label},i)=>{
        if(entranceVisited[i]||!near(point,player,1.61,1.23))return;
        entranceVisited[i]=true;
        progress('waterfall-discovery',label);
      });
    }
  }

  function selectHint(atMine) {
    let options;
    if(zipline.riding)options=['flying-fox'];
    else if(boat.driving)options=['boat-ride'];
    else if(train.driving)options=['mine-train','crystal-mining','restore-mine-power'];
    else if(field.fishing)options=['fishing'];
    else if(field.feeding)options=['feed-deer'];
    else if(atMine)options=['crystal-mining','restore-mine-power','mine-train','waterfall-discovery'];
    else options=['boat-ride','feed-deer','fishing','gold-hunt','campfire','waterfall-discovery'];
    const available=options.find(id=>!isComplete(id))??rows.find(row=>!row.complete)?.id;
    return available?hints.get(available):'';
  }

  const missionStatus={missions:rows,get hint(){return hint;}};
  function reset(){
    for(const row of rows){row.current=0;row.complete=false;}
    gold.forEach(({object})=>{object.visible=true;});
    entranceVisited.fill(false);
    trainVisited.fill(false);
    previousBoat=previousTrain=0;
    badgeReported=false;
    boatBeam.visible=false;
    railBeams.forEach(beam=>{beam.visible=false;});
    effects.reset();
    field.reset();
    zipline.reset();
    hint=selectHint(false);
  }
  reset();

  return {
    interactions, missionStatus, reset,
    update(dt,player,atMine){
      zipline.update(dt);
      if(campfire.nighttime&&!isComplete('campfire'))progress('campfire','The campfire lit up the valley night.');
      if(power.ready&&!isComplete('restore-mine-power'))progress('restore-mine-power','Mine power restored!');
      if(player){
        updateVehicles();
        inspectFoot(player,atMine);
      }
      field.update(dt,player);
      effects.update(dt);
      hint=selectHint(atMine);
    },
    unload(){zipline.reset();field.reset();effects.reset();},
  };
}
