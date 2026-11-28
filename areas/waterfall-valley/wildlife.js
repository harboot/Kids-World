import { seededRandom } from '../../core/random.js';
import { detailKit, detailRegion } from './detail-kit.js';
import { fishPools } from './detail-sites.js';
import { clamp, LAKE_LEVEL, mix, riverLevel } from './landform.js';
import { mineLake } from './mine-layout.js';

const tau=Math.PI*2;

export function addValleyWildlife({ THREE, scene, terrain, mine, world, reducedMotion, touch, register }) {
  const random=seededRandom(15483);
  const ground=terrain.sample;
  const animals=[], fliers=[], fish=[];
  let feedingPose = null;
  function group(name,x=0,y=0,z=0){
    const node=new THREE.Group();
    node.name=name;
    node.position.set(x,y,z);
    scene.add(node);
    return node;
  }
  function child(node,x,y,z){
    const part=new THREE.Group();
    part.position.set(x,y,z);
    node.add(part);
    return part;
  }
  function safeOrigin(x,z){
    for(const [dx,dz] of [[0,0],[0,1.2],[1.4,0],[-1.4,0],[0,-1.2],[2,1.5],[-1.6,2]]){
      const px=x+dx,pz=z+dz, y=ground(px,pz);
      if(!world.blocksGround(px,pz,.28,y,{x:px,z:pz}))return [px,pz];
    }
    return [x,z];
  }
  function meadowRoute(x,z,range){
    const y=ground(x,z), points=[];
    for(let i=0;i<9;i++){
      const a=i*tau/9, dx=Math.cos(a)*range, dz=Math.sin(a)*range;
      const clear=[.25,.5,.75,1].every(t=>{
        const px=x+dx*t,pz=z+dz*t, h=ground(px,pz);
        return Math.abs(h-y)<Math.hypot(dx,dz)*t*.61 && !world.blocksGround(px,pz,.26,h,{x,z});
      });
      if(clear)points.push([dx,dz]);
    }
    return points;
  }
  for(const [i, site] of [[-22,28],[-26,54],[-14,33]].entries()){
    const [x,z]=safeOrigin(...site);
    const root=group('Mountain deer '+(i+1),x,ground(x,z),z);
    const hide=[0xa97a4d,0xb0845b,0x936846][i], legs=[], body=detailKit(THREE,root);
    body.part('body',hide,0,.91,-.01,.55,.58,1.21);
    body.part('body',0xc4a376,0,.755,-.03,.42,.25,.88);
    body.part('body',hide,0,.89,-.46,.43,.47,.44);
    body.part('stone',0xd3b58c,0,1.00,-.659,.18,.19,.32,0,.5);
    for(const side of [-1,1])for(const offset of [-.42,.4]){
      const joint=child(root,side*.187,.78,offset);
      const leg=detailKit(THREE,joint);
      leg.beam(hide,[0,0,0],[side*.014,-.365,-.07],.132,.143,'taper');
      leg.beam(hide,[side*.014,-.365,-.07],[0,-.71,.006],.072,.094,'taper');
      leg.part('body',0x4e3d32,0,-.736,.031,.108,.105,.141);
      leg.finish(true);legs.push(joint);
    }
    body.finish(true);
    const neck=child(root,0,1.024,.44);
    const neckKit=detailKit(THREE,neck);
    neckKit.beam(hide,[0,-.19,-.13],[0,.372,.15],.31,.34,'taper');
    neckKit.finish(true);
    const head=child(neck,0,.39,.169), headKit=detailKit(THREE,head);
    headKit.part('body',hide,0,.06,.057,.288,.312,.382);
    headKit.part('body',0xc8aa7f,0,.018,.231,.231,.184,.226,0,-.16);
    headKit.part('stone',0x484139,0,.034,.324,.153,.111,.097);
    for(const side of [-1,1]){
      headKit.part('stone',0x3e342b,side*.126,.102,.157,.044,.05,.045);
      headKit.part('body',hide,side*.179,.227,-.016,.128,.278,.098,0,.36,-side*.65);
      headKit.part('stone',0xd8b690,side*.191,.243,.035,.082,.175,.046,0,0,-side*.62);
      if(i===0){
        headKit.beam(0xc6ad87,[side*.158,.171,-.063],[side*.223,.493,-.159],.049);
        headKit.beam(0xb59a76,[side*.187,.351,-.093],[side*.177,.503,.049],.04);
        headKit.beam(0xc6ad87,[side*.207,.436,-.137],[side*.292,.54,-.105],.038);
      }
    }
    headKit.finish(true);
    const origin=[x,z], paths=meadowRoute(x,z,2.1+random()*.85);
    animals.push({ root,neck,head,legs,origin,paths,kind:'deer',phase:i*2.87 });
    if(i===0){
      register('feeding-deer',root,[x+.68,z+1.12]);
      register('deer-feeding-location',null,[x+.68,z+1.12],ground(x+.68,z+1.12));
    }
  }
  for(const [i,site] of [[-10.7,44],[-13.1,42.1],[-27.5,28],[-23.8,18.1],[26.5,34.9],[31.3,37.5]].entries()){
    const [x,z]=safeOrigin(...site), root=group('Meadow rabbit '+(i+1),x,ground(x,z),z);
    const color=i%2===0?0xa98b73:0x9c9485, kit=detailKit(THREE,root);
    kit.part('body',color,0,.195,-.032,.28,.29,.44);
    kit.part('body',color,0,.24,.158,.221,.225,.246);
    kit.part('stone',0xcdba9e,0,.251,-.248,.14,.128,.118);
    kit.part('stone',0x55473b,0,.228,.272,.053,.05,.047);
    for(const side of [-1,1]){
      kit.part('body',color,side*.099,.077,-.087,.151,.117,.215);
      kit.part('stone',0x41372d,side*.102,.274,.207,.034,.036,.044);
    }
    kit.finish(true);
    const ears=[-1,1].map(side=>{
      const ear=child(root,side*.057,.325,.135);
      const parts=detailKit(THREE,ear);
      parts.part('body',color,0,.113,0,.079,.25,.067);
      parts.part('stone',0xc99488,0,.121,.026,.047,.184,.027);
      parts.finish(true);return ear;
    });
    animals.push({root,ears,origin:[x,z],paths:meadowRoute(x,z,1.08),kind:'rabbit',phase:i*3.9});
  }

  const perch=detailRegion(THREE,scene,'Bird roost boulders',ground);
  const birdRoutes=[
    {x:-29,z:4,r:5.7,dx:-29.7,dz:8.1,y:10,phase:1},
    {x:20,z:2,r:9,dx:19.6,dz:3.1,y:14,phase:6},
    {x:37,z:-10,r:10,dx:40.2,dz:-3.4,y:19,phase:16},
    {x:-12,z:-10,r:8,dx:-19.7,dz:-9.6,y:14,phase:11},
  ];
  for(const [i,route] of birdRoutes.entries()){
    const floor=ground(route.dx,route.dz);
    if(floor>LAKE_LEVEL+.17){
      perch.kit.part('stone',0x797e78,route.dx,floor+.24,route.dz,1.1,.69,.9,i*.6);
      route.perch=floor+.51;
    }
    fliers.push(buildFlier('Valley bird '+(i+1),route,false));
  }
  perch.finish();
  for(let i=0;i<(touch?4:6);i++){
    fliers.push(buildFlier('Echo Lake bat '+(i+1),{x:-41+i*.72,z:-54,r:4.2+i*.41,phase:i*5.18},true));
  }

  function buildFlier(name,route,bat){
    const root=group(name), kit=detailKit(THREE,root,bat);
    const body=bat?0x57515a:0x5b666c, wing=bat?0x594857:0x727b80;
    const scale=bat?.53:.73;
    root.scale.setScalar(scale);
    kit.part('body',body,0,0,0,.31,.28,.58);
    kit.part('body',bat?0x685762:0x8a8d82,0,.028,.25,.251,.227,.25);
    if(!bat)kit.part('taper',0xd5b468,0,.014,.418,.087,.183,.098,0,Math.PI/2);
    kit.part('stone',body,0,-.035,-.284,.24,.11,.32);
    for(const side of [-1,1])kit.part('stone',bat?0x785d64:0x374346,side*.089,bat?.167:.056,.294,.084,.11,.063);
    kit.finish(true);
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute([
      0,0,.15,.47,.02,.099,.96,.038,-.095,
      0,0,.15,.96,.038,-.095,.66,-.025,-.283,
      0,0,.15,.66,-.025,-.283,.25,-.016,-.213,
    ],3));
    geometry.computeVertexNormals();
    const mat=new THREE.MeshBasicMaterial({color:wing,side:THREE.DoubleSide,toneMapped:false});
    const wings=[-1,1].map(side=>{
      const pivot=child(root,side*.104,.006,-.015);
      const mesh=new THREE.Mesh(geometry,mat);
      mesh.scale.x=side;
      pivot.add(mesh);return pivot;
    });
    return { root,wings,route,bat };
  }

  for(const [school,pool] of fishPools.entries())for(let i=0;i<(touch?5:8);i++){
    const root=group((school?'River trout ':'Lake trout ')+(i+1)), model=detailKit(THREE,root);
    const color=[0x52866f,0x6c8f8b,0xa87853][i%3];
    const size=.65+random()*.5;
    root.scale.setScalar(size);
    model.part('body',color,0,0,0,.168,.21,.59);
    model.part('body',0xa7b398,0,-.067,.011,.137,.081,.42);
    model.part('stone',0x566b62,0,.104,-.025,.067,.14,.24);
    for(const side of [-1,1])model.part('stone',0x384241,side*.067,.019,.205,.035,.038,.039);
    model.finish(true);
    const tail=child(root,0,0,-.258), tailKit=detailKit(THREE,tail);
    tailKit.part('stone',color,0,0,-.116,.103,.27,.283,0,-.24);
    tailKit.finish(true);
    fish.push({root,tail,pool,phase:i*tau/(touch?5:8)+school*.44,school,index:i});
  }

  const dropGeometry=new THREE.IcosahedronGeometry(.068,0);
  const dropMaterial=new THREE.MeshBasicMaterial({color:0x8ad0e7,toneMapped:false});
  const rippleGeometry=new THREE.RingGeometry(.87,1,16).rotateX(-Math.PI/2);
  const rippleMaterial=new THREE.MeshBasicMaterial({color:0x66b1b2,transparent:true,opacity:.46,depthWrite:false,toneMapped:false});
  const dropSites=Array.from({length:touch?5:9},(_,i)=>{
    const x=-46+random()*8,z=-55+random()*4, top=mine.ceiling.sample(x,z);
    return {x,z,top,duration:1.6+random()*1.14,phase:i*.41};
  });
  const drops=new THREE.InstancedMesh(dropGeometry,dropMaterial,dropSites.length);
  drops.name='Echo Lake falling droplets';
  const ripples=new THREE.InstancedMesh(rippleGeometry,rippleMaterial,dropSites.length);
  ripples.name='Echo Lake droplet ripples';
  drops.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  ripples.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  drops.frustumCulled=ripples.frustumCulled=false;
  scene.add(drops,ripples);
  const dummy=new THREE.Object3D();
  let age=0, frame=0;

  function pose(eye, reset=false){
    for(const a of animals){
      if(feedingPose && a===animals[0]) continue;
      const [x,z]=a.origin, distance=eye?Math.hypot(eye.x-x,eye.z-z):Infinity;
      a.root.visible=reset || (distance<41 && (eye.z>-27 || eye.y>a.root.position.y+12));
      if(!a.root.visible)continue;
      const t=age+a.phase, slot=Math.floor(t/12), phase=(t%12)/12;
      const [dx,dz]=a.paths[slot%Math.max(1,a.paths.length)]??[0,0];
      const path=phase<.12||reset?0:Math.sin((phase-.12)/.88*Math.PI)**2;
      const px=x+dx*path,pz=z+dz*path, moving=path>.015&&phase<.9 && !reset;
      const stride=moving?Math.sin(t*8.2):0;
      const hop=a.kind==='rabbit'&&moving?.16*Math.abs(stride)**2:0;
      a.root.position.set(px,ground(px,pz)+hop,pz);
      a.root.rotation.y=Math.atan2(dx,dz)+(phase>.58?Math.PI:0);
      if(a.kind==='deer'){
        a.legs.forEach((leg,i)=>{leg.rotation.x=stride*.33*(i%3===0?1:-1);});
        const watching=distance<6.7&&Math.abs(eye.y-a.root.position.y)<2.8;
        const turn=watching?Math.atan2(eye.x-px,eye.z-pz)-a.root.rotation.y:Math.sin(t*.57)*.25;
        a.neck.rotation.x=watching||moving?-.02:Math.max(0,Math.cos(t*.94))*.93;
        a.head.rotation.y=clamp(Math.atan2(Math.sin(turn),Math.cos(turn)),-1.28,1.28);
      }else a.ears.forEach((ear,i)=>{
        ear.rotation.z=(i===0?1:-1)*(.3+Math.sin(t*2.8+i)*.13);
        ear.rotation.x=.11+stride*.20;
      });
    }
    for(const flier of fliers){
      const { root,wings,route,bat }=flier;
      const distance=eye?Math.hypot(eye.x-route.x,eye.z-route.z):Infinity;
      root.visible=reset || distance<(bat?41:58) && (bat?eye.z<-25:eye.z>-27 || eye.y>21);
      if(!root.visible)continue;
      const cycle=(age+route.phase)%26, t=(age+route.phase)*(bat?.91:.48);
      let x=route.x+route.r*Math.cos(t),z=route.z+route.r*.65*Math.sin(t), y;
      let rest=0;
      if(bat){
        const sky=mine.ceiling.sample(x,z), floor=mine.floor.sample(x,z);
        y=Math.max(floor+2.22,sky-1.07-.56*Math.sin(t*1.9));
        root.visible=sky-floor>3.26 && mine.opening.sample(x,z)>1;
      }else{
        if(route.perch!==undefined){
          rest=clamp(1-Math.max(4-cycle,cycle-13,0)/4);
          rest=rest*rest*(3-2*rest);
          x=mix(x,route.dx,rest);z=mix(z,route.dz,rest);
        }
        const terrainY=ground(x,z);
        y=Math.max(terrainY+0.37,mix(Math.max(route.y,terrainY+3.9)+Math.sin(t*1.1)*.85,route.perch??route.y,rest));
      }
      root.position.set(x,y,z);
      root.rotation.y=Math.atan2(-Math.sin(t),Math.cos(t)*.65);
      wings.forEach((wing,i)=>{wing.rotation.z=(i===0?-1:1)*mix(Math.sin(t*(bat?16:12))*.69,-.48,rest);});
    }
    for(const f of fish){
      const { root,tail,pool,school,index }=f;
      if(!reset && (!eye || eye.z<-26 || Math.hypot(eye.x-pool.x,eye.z-pool.z)>30)){
        root.visible=false;
        continue;
      }
      const t=age*.56+f.phase, a=pool.rx*(.48+(index%3)*.1), b=pool.rz*(.64+(index%3)*.07);
      const x=pool.x+Math.cos(t)*a,z=pool.z+Math.sin(t)*b;
      const surface=school?riverLevel(z):LAKE_LEVEL, bed=ground(x,z);
      root.visible=surface-bed>.33;
      root.position.set(x,clamp(surface-.25-.045*Math.sin(t*2),bed+.14,surface-.14),z);
      root.rotation.y=Math.atan2(-a*Math.sin(t),b*Math.cos(t));
      tail.rotation.y=Math.sin(t*12.7)*.43;
    }

    const show=!reset && eye && eye.z < -27 && Math.hypot(eye.x+42,eye.z+54)<45;
    drops.visible=ripples.visible=Boolean(show);
    if(show){
      for(const [i,spot] of dropSites.entries()){
        const t=((age+spot.phase)%spot.duration)/spot.duration;
        dummy.position.set(spot.x,mix(spot.top,mineLake.y,t*t/.61),spot.z);
        dummy.scale.setScalar(t<.781?.73:0);
        dummy.updateMatrix();drops.setMatrixAt(i,dummy.matrix);
        dummy.position.set(spot.x,mineLake.y+.035,spot.z);
        dummy.scale.setScalar(t>.78?mix(.05,.48,(t-.78)/.22):0);
        dummy.updateMatrix();ripples.setMatrixAt(i,dummy.matrix);
      }
      drops.instanceMatrix.needsUpdate=ripples.instanceMatrix.needsUpdate=true;
    }
  }
  pose(null,true);
  const feedingDeer = animals[0];
  function startFeeding(player) {
    const { x, z } = feedingDeer.root.position;
    const gap = Math.hypot(player.x-x,player.z-z);
    const step = gap > 0.01 ? Math.min(0.58, Math.max(0,gap-0.82))/gap : 0;
    const tx=x+(player.x-x)*step, tz=z+(player.z-z)*step, y=ground(tx,tz);
    const clear=!world.blocksGround(tx,tz,0.28,y,{x,z});
    feedingPose={x,z,tx:clear?tx:x,tz:clear?tz:z,
      yaw:gap > 0.01 ? Math.atan2(player.x-x,player.z-z) : feedingDeer.root.rotation.y};
  }

  function feedAt(progress) {
    if(!feedingPose)return;
    const { root,neck,head,legs }=feedingDeer;
    const {x,z,tx,tz,yaw}=feedingPose;
    const t=clamp(progress/0.37);
    const px=mix(x,tx,t),pz=mix(z,tz,t);
    root.position.set(px,ground(px,pz),pz);
    root.rotation.y=yaw;
    head.rotation.y=0;
    neck.rotation.x=t*0.86+Math.sin(progress*23)*0.045*t;
    legs.forEach((leg,i)=>{
      leg.rotation.x=t<1?Math.sin(t*Math.PI*2)*(i%2?0.20:-0.20):0;
    });
  }

  return {
    feedingDeer: feedingDeer.root,
    startFeeding, feedAt,
    stopFeeding(){ feedingPose=null; },
    fishModel: fish[0].root,
    reset(){age=frame=0;feedingPose=null;pose(null,true);},
    update(dt,eye){
      if(reducedMotion()){
        drops.visible=ripples.visible=false;
        return;
      }
      age+=dt;frame+=dt;
      if(frame<(touch?.066:.043))return;
      frame=0;pose(eye);
    },
  };
}
