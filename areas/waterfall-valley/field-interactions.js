import { EYE_HEIGHT } from '../../core/player.js';
import { PLAYER_ONLY_LAYER } from '../../core/render-layers.js';
import { detailKit } from './detail-kit.js';
import { crystalSites } from './detail-sites.js';
import { clamp, LAKE_LEVEL, mix, smooth } from './landform.js';

export function near(point, player, radius, height = 1.12) {
  return player && Math.abs(player.y-EYE_HEIGHT-point.y)<=height &&
    (player.x-point.x)**2+(player.z-point.z)**2<=radius**2;
}

export function createFieldInteractions({
  THREE, scene, viewmodel, camera, landmarks, wildlife, basket, veins, effects, notify, reducedMotion,
  finish, markCrystal, isComplete, driving, random=Math.random,
}) {
  const hands=viewmodel??new THREE.Group();
  const basic=color=>new THREE.MeshBasicMaterial({color,toneMapped:false});
  const poseFrom=new THREE.Vector3();
  const aim=new THREE.Vector3();
  const lure=new THREE.Vector3(13.24,LAKE_LEVEL+0.037,7.23);
  const basketTop=basket.position.clone().add(new THREE.Vector3(0,0.318,0));
  const rodSpot=landmarks['fishing-rod'].approach;
  const parkedRod=landmarks['fishing-rod'].object;
  const deer=wildlife.feedingDeer;
  const interactions=[];
  let player, feedTime=0, feeding=false, heartTime=0, fishing=null, strike=null, rewardTime=0;
  const hits = crystalSites.map(() => 0);

  function prop(name,parent=hands) {
    const group=new THREE.Group();
    group.name=name;
    parent.add(group);
    group.visible=false;
    return group;
  }

  const food=prop('Held deer food');
  food.position.set(0.27,-0.38,-0.63);
  const snack=detailKit(THREE,food);
  snack.part('body',0xdd8850,0,0.055,-0.087,0.14,0.19,0.16,0,0.12);
  snack.part('stone',0x8fa95b,0.027,0.144,-0.085,0.103,0.049,0.08,0,0,-0.35);
  snack.part('body',0xc28559,-0.084,-0.022,0.026,0.21,0.155,0.25,0,0,0.12);
  snack.finish(true);

  const hearts=prop('Deer feeding hearts',scene);
  const shape=new THREE.Shape();
  shape.moveTo(0,-0.17);
  shape.bezierCurveTo(-0.065,-0.09,-0.2,-0.022,-0.2,0.075);
  shape.bezierCurveTo(-0.2,0.185,-0.073,0.21,0,0.115);
  shape.bezierCurveTo(0.073,0.21,0.2,0.185,0.2,0.075);
  shape.bezierCurveTo(0.2,-0.022,0.065,-0.09,0,-0.17);
  const heartGeometry=new THREE.ShapeGeometry(shape,5);
  const heartMaterial=new THREE.MeshBasicMaterial({
    color:0xf38e9d, side:THREE.DoubleSide,transparent:true,depthWrite:false,toneMapped:false,
  });
  for(let i=0;i<4;i++)hearts.add(new THREE.Mesh(heartGeometry,heartMaterial));

  const pole=parkedRod.clone();
  pole.name='Held fishing rod';
  pole.getObjectByName('Parked fishing line').visible=false;
  pole.scale.setScalar(0.52);
  pole.visible=false;
  hands.add(pole);
  const cast=prop('Fishing line and bobber',scene);
  const lineGeometry=new THREE.BufferGeometry();
  const vertices=new THREE.Float32BufferAttribute(new Float32Array(6),3);
  vertices.setUsage(THREE.DynamicDrawUsage);
  lineGeometry.setAttribute('position',vertices);
  const line=new THREE.Line(lineGeometry,new THREE.LineBasicMaterial({ color:0xc8d4ce }));
  line.frustumCulled=false;
  const bobber=new THREE.Group();
  const floats=detailKit(THREE,bobber);
  floats.part('body',0xf5ceb0,0,-0.02,0,0.124,0.152,0.124);
  floats.part('body',0xdc5e47,0,0.047,0,0.116,0.119,0.116);
  floats.box(0x7b4037,0,0.113,0,0.027,0.065,0.027);
  floats.finish(true);
  cast.add(line,bobber);
  const caught=wildlife.fishModel.clone();
  caught.name='Fish caught at the pier';
  caught.scale.setScalar(0.95);
  caught.visible=false;
  scene.add(caught);

  const pickaxe=prop('Held crystal pickaxe');
  const tool=detailKit(THREE,pickaxe);
  tool.beam(0x9b6d48,[0,-0.26,0],[0,0.57,0.11],0.057,0.064,'cylinder');
  tool.beam(0x828a8e,[-0.23,0.546,0.12],[0.13,0.57,0.116],0.086,0.071);
  tool.beam(0x828a8e,[0.11,0.57,0.117],[0.25,0.513,0.135],0.073,0.063);
  tool.beam(0x697980,[-0.23,0.546,0.12],[-0.32,0.449,0.146],0.05,0.057);
  tool.part('body',0xb49979,0,0.016,0.005,0.17,0.175,0.132);
  tool.finish(true);
  const crystal=new THREE.Mesh(new THREE.DodecahedronGeometry(0.115,0),basic(0xffffff));
  crystal.name='Held collected crystal';
  crystal.position.set(-0.22,-0.36,-0.59);
  crystal.visible=false;
  hands.add(crystal);

  function suitable(point,radius,height) {
    return !driving() && near(point,camera?.position??player,radius,height);
  }
  function pointAt(object) { return object.position; }

  interactions.push({
    label:'Feed Deer',silent:true,radius:1.78,
    get x(){return deer.position.x;},
    get z(){return deer.position.z;},
    get anchorY(){return deer.position.y+1.06;},
    get active(){return !feeding&&!fishing&&!strike&&!isComplete('feed-deer')&&!driving();},
    reachable(p){return deer.visible&&near(pointAt(deer),p,1.78);},
    act(){
      const eye=camera?.position??player;
      if(feeding||fishing||strike||isComplete('feed-deer')||!suitable(pointAt(deer),1.78))return;
      wildlife.startFeeding(eye);
      feedTime=0;
      feeding=true;
      food.visible=true;
    },
  });

  function stopFishing(){
    fishing=null;
    pole.visible=cast.visible=false;
    parkedRod.visible=true;
    if(!isComplete('fishing'))caught.visible=false;
  }

  interactions.push({
    x:rodSpot.x,z:rodSpot.z,anchorY:rodSpot.y+0.8,silent:true,
    get radius(){return fishing?2.65:1.62;},
    get label(){
      if(fishing?.stage==='bite')return 'Catch Fish';
      return fishing?'Cancel Fishing':'Start Fishing';
    },
    get active(){return !isComplete('fishing')&&!driving()&&!feeding&&!strike&&fishing?.stage!=='reel';},
    reachable(p){return near(rodSpot,p,fishing?2.65:1.62);},
    act(){
      if(!suitable(rodSpot,fishing?2.65:1.62)||isComplete('fishing')||feeding||strike)return;
      if(fishing?.stage==='bite') {
        fishing.stage='reel';fishing.time=0;
        caught.position.copy(lure);
        caught.visible=true;
      }else if(fishing){
        if(fishing.stage!=='reel')stopFishing();
      }else{
        fishing={stage:'cast',time:0,delay:1.45+random()*1.45};
        pole.visible=cast.visible=true;
        parkedRod.visible=false;
        notify('Wait for the bobber to dip. Walk away to put the rod down.');
      }
    },
  });

  function animateFishing(dt) {
    if(!fishing)return;
    if(!suitable(rodSpot,2.68)){
      stopFishing();
      return;
    }
    fishing.time+=dt;
    const { stage,time }=fishing;
    const castTime=reducedMotion()?0.25:0.52;
    const reelTime=reducedMotion()?0.35:0.88;
    const castProgress=smooth(0,castTime,time);
    const reelProgress=smooth(0,reelTime,time);
    pole.position.set(0.35,-0.71,-0.59);
    pole.rotation.set(stage==='cast'?mix(-0.91,0.35,castProgress):stage==='reel'?mix(0.35,-0.52,reelProgress):0.35,
      Math.PI+0.16,0.11);
    if(viewmodel?.parent && camera){
      poseFrom.set(0,1.53,1.91);
      pole.localToWorld(poseFrom);
    }else{
      poseFrom.set(rodSpot.x,rodSpot.y+1.6,rodSpot.z);
    }
    const flutter=reducedMotion()?0:Math.sin(time*(stage==='bite'?14:4));
    switch(stage){
      case 'cast':
        bobber.position.copy(poseFrom).lerp(lure,castProgress);
        if(!reducedMotion())bobber.position.y+=Math.sin(castProgress*Math.PI)*1.08;
        if(time>=castTime){fishing.stage='wait';fishing.time=0;}
        break;
      case 'wait':
      case 'bite':
        bobber.position.copy(lure);
        bobber.position.y+=flutter*(stage==='bite'?0.083:0.023);
        if(stage==='wait'&&time>=fishing.delay){
          fishing.stage='bite';fishing.time=0;
          notify('A fish is biting!');
        }
        break;
      case 'reel':
        caught.position.copy(lure).lerp(basketTop,reelProgress);
        if(!reducedMotion())caught.position.y+=Math.sin(reelProgress*Math.PI)*1.76;
        caught.rotation.set(0.2*Math.sin(time*19),Math.PI*1.47+time*5,-0.36*Math.sin(time*24));
        bobber.position.copy(caught.position);
        bobber.position.y+=0.13;
        if(time>=reelTime){
          caught.position.copy(basketTop);
          caught.rotation.set(0,1.38,0.46);
          finish('fishing','Fish caught and placed in the basket!');
          stopFishing();
          return;
        }
        break;
    }
    bobber.rotation.z=stage==='bite'?flutter*0.28:0;
    vertices.setXYZ(0,poseFrom.x,poseFrom.y,poseFrom.z);
    vertices.setXYZ(1,bobber.position.x,bobber.position.y,bobber.position.z);
    vertices.needsUpdate=true;
  }

  const deposits=crystalSites.map(site=>({
    ...site,anchor:landmarks[site.id].approach,source:landmarks[site.id].position,cluster:veins.get(site.id).cluster,
  }));
  deposits.forEach(({anchor},i)=>{
    interactions.push({
      x:anchor.x,z:anchor.z,anchorY:anchor.y+0.95,radius:1.36,silent:true,label:'Mine Crystal',
      get active(){return hits[i]<3&&!strike&&!fishing&&!feeding&&!driving();},
      reachable(p){return near(anchor,p,1.36,1.22);},
      act(){
        if(hits[i]>=3||strike||fishing||feeding||!suitable(anchor,1.36,1.22))return;
        strike={index:i,time:0,contact:false};
        pickaxe.visible=true;
      },
    });
  });

  function animateTools(dt) {
    pickaxe.visible=!feeding&&!fishing&&!driving()&&deposits.some(({anchor},i)=>hits[i]<3&&suitable(anchor,1.5,1.22));
    if(strike){
      const {index}=strike, deposit=deposits[index];
      if(!suitable(deposit.anchor,1.62,1.28)){
        strike=null;
      }else{
        strike.time+=dt;
        const contact=reducedMotion()?0.1:0.17;
        if(!strike.contact&&strike.time>=contact){
          strike.contact=true;
          hits[index]++;
          aim.set(deposit.source.x,deposit.source.y+0.88,deposit.source.z);
          if(!reducedMotion())effects.emit(aim,deposit.color,hits[index]===3?11:6);
          deposit.cluster.scale.y=[1,.89,.72,.26][hits[index]];
          if(hits[index]===3){
            rewardTime=0.77;
            crystal.material.color.setHex(deposit.color);
            markCrystal();
          }else notify('Crystal strikes: '+hits[index]+'/3');
        }
        if(!reducedMotion())pickaxe.rotation.x=-0.31-1.43*Math.sin(Math.PI*clamp(strike.time/0.37));
        if(strike.time>=(reducedMotion()?0.19:0.37))strike=null;
      }
    }
    if(!strike)pickaxe.rotation.x=-0.31;
    pickaxe.position.set(0.38,-0.48,-0.68);
    pickaxe.rotation.y=-.17;
    pickaxe.rotation.z=-.2;
    rewardTime=Math.max(0,rewardTime-dt);
    crystal.visible=rewardTime>0 && !driving();
    if(crystal.visible&&!reducedMotion())crystal.rotation.y+=dt*3.1;
  }

  function animateDeer(dt) {
    if(feeding){
      if(!suitable(pointAt(deer),2.85)){
        feeding=food.visible=false;
        wildlife.stopFeeding();
      }else{
        feedTime+=dt;
        const duration = reducedMotion()?0.65:1.2;
        const t=clamp(feedTime/duration);
        wildlife.feedAt(t);
        food.position.y=-0.38+0.12*Math.sin(Math.PI*t);
        food.scale.setScalar(t>0.66?mix(1,0.2,(t-.66)/.34):1);
        if(t>=1){
          feeding=food.visible=false;
          wildlife.stopFeeding();
          hearts.position.copy(deer.position);
          hearts.position.y+=1.43;
          heartTime=1.15;
          finish('feed-deer','The deer enjoyed its snack!');
        }
      }
    }
    hearts.visible=heartTime>0;
    if(!hearts.visible)return;
    heartTime=Math.max(0,heartTime-dt);
    const t=1-heartTime/1.15;
    heartMaterial.opacity=0.96*(1-t);
    hearts.children.forEach((heart,i)=>{
      const phase=i*2.4;
      heart.position.set(Math.cos(phase)*(0.14+t*.35),0.09+i*.075+t*.8,Math.sin(phase)*(0.2+t*.21));
      if(camera)heart.quaternion.copy(camera.quaternion);
      heart.scale.setScalar(0.57+i*.15);
    });
  }

  function reset() {
    hitReset();
    feeding=food.visible=hearts.visible=false;
    heartTime=rewardTime=0;
    wildlife.stopFeeding();
    pickaxe.visible=crystal.visible=false;
    stopFishing();
    caught.visible=false;
  }

  function hitReset() {
    hits.fill(0);
    strike=null;
    for(const deposit of deposits)deposit.cluster.scale.y=1;
  }

  return {
    interactions, reset,
    get fishing(){return fishing!==null;},
    get feeding(){return feeding;},
    update(dt,eye){
      player=eye;
      if(!eye)return;
      animateDeer(dt);
      animateFishing(dt);
      animateTools(dt);
    },
  };
}
