import { buildPrincessFace } from './princess-face.js';
import { galleryCues } from './interaction-audio.js';
import { addGroup, SURFACE_GAP } from '../../core/geometry.js';
import { EYE_HEIGHT } from '../../core/player.js';
import { addGallerySign, addRoundSolid, addSolid, spaceTransform } from './parts.js';

export const MOANA_DOCK = Object.freeze({ x: 0, z: 3.1, landingZ: 6.4 });
export const VOYAGE_DURATION = 16;
const ease = t => t * t * (3 - 2 * t);

export function buildMoana(context) {
  const { THREE, document, bay, parts, exhibit, obstacles, camera, isActive,
    isPlayerGrounded, reducedMotion, playCue, outline } = context;
  const { part, beam, batch, matte } = parts;
  const { toWorld, toLocal } = spaceTransform(exhibit);
  const room = addGroup(THREE, bay, 'Moana tropical lagoon');
  const sand = matte(0xe8c68b);
  const sea = matte(0x329fa9), foam = matte(0xd2f4e6), shallow = matte(0x69c9c2);
  const wood = matte(0x96603d), darkWood = matte(0x593d32), rope = matte(0xd7b47b);
  const green = matte(0x47874e), lime = matte(0x83b85d), stone = matte(0x706e66);
  const red = matte(0xb84e3d), sail = matte(0xf5dcaa, { side: THREE.DoubleSide });
  const skin = matte(0xa56743), hair = matte(0x302327), ivory = matte(0xffead2);
  const details = new THREE.Group();
  function floor(points, material, y) {
    const shape = new THREE.Shape(points.map(([x,z]) => new THREE.Vector2(x,-z)));
    part(details,new THREE.ShapeGeometry(shape),material,0,y,0,1,1,1).rotation.x=-Math.PI/2;
  }
  // Sample a smooth shoreline once; every water band shares the same outline.
  // The deep-water surface and shallows form one mesh with vertex colors, not overlapping planes.
  floor(outline.map(([x,z])=>[x*.97,z*.97]),sand,0);
  const shoreControls = [[-10.3,3.0],[-8.1,4.0],[-5.0,4.45],[-2.3,4.1],
    [0,4.0],[2.8,4.25],[6.2,4.5],[9.0,3.65],[11.1,1.7],
    [10.3,-5.1],[6.4,-10.5],[-5.8,-10.1],[-10.6,-5.9]];
  const curve = new THREE.CatmullRomCurve3(shoreControls.map(([x,z])=>new THREE.Vector3(x,0,z)),true,'centripetal');
  const rim = curve.getPoints(96).slice(0,-1);
  const center = new THREE.Vector3(0,0,-2.8);
  const rings = [1,.96,.86,.70,.43,0];
  const palette = [0x9ed8cb,0x83d9ce,0x42bfc0,0x269aa9,0x187f9e,0x197c9d].map(c=>new THREE.Color(c));
  const vertices=[], colors=[], indices=[];
  for(let k=0;k<rings.length;k++){
    for(const p of rim){
      const x=center.x+(p.x-center.x)*rings[k], z=center.z+(p.z-center.z)*rings[k];
      vertices.push(x,.035,z);
      const c=palette[k].clone().multiplyScalar(1+.025*Math.sin(x*1.7+z*.9));
      colors.push(c.r,c.g,c.b);
    }
  }
  const n=rim.length;
  for(let k=0;k<rings.length-1;k++)for(let i=0;i<n;i++){
    const a=k*n+i,b=k*n+(i+1)%n,c=a+n,d=b+n;
    indices.push(a,b,c);
    if(k<rings.length-2)indices.push(b,d,c);
  }
  const waterGeo=new THREE.BufferGeometry();
  waterGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  waterGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  waterGeo.setIndex(indices);
  waterGeo.computeVertexNormals();
  // The rim is clockwise in X/Z; correct winding if necessary.
  if(waterGeo.getAttribute('normal').getY(0)<0){
    for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
    waterGeo.setIndex(indices);waterGeo.computeVertexNormals();
  }
  const surface=part(details,waterGeo,matte(0xffffff,{vertexColors:true}),0,0,0,1,1,1);
  surface.name='Moana lagoon gradient water';
  // A continuous beach-side collision boundary matches the curved shoreline.
  for(let i=0;i<n;i++){
    const a=rim[i],b=rim[(i+1)%n];
    const mx=(a.x+b.x)/2,mz=(a.z+b.z)/2;
    addSolid(obstacles,...toWorld(mx,mz),Math.hypot(b.x-a.x,b.z-a.z)+.08,.25,2.6,
      exhibit.rotation+Math.atan2(a.z-b.z,b.x-a.x));
    if(i%4===0 && mz>2.5 && Math.abs(mx)>1.75){
      part(details,'ball',stone,mx,.16,mz,.34,.22,.31).rotation.y=i*.73;
    }
  }
  // Thin curved foam ribbons and scattered surface glints, above the water plane.
  function ribbon(scale, first, count, width, material, y){
    const positions=[], index=[];
    for(let j=0;j<=count;j++){
      const p=rim[(first+j)%n];
      for(const r of [scale,scale-width]){
        positions.push(center.x+(p.x-center.x)*r,y,center.z+(p.z-center.z)*r);
      }
      if(j<count){const i=j*2;index.push(i,i+1,i+2,i+1,i+3,i+2);}
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    g.setIndex(index);g.computeVertexNormals();
    if(g.getAttribute('normal').getY(0)<0){
      for(let i=0;i<index.length;i+=3)[index[i+1],index[i+2]]=[index[i+2],index[i+1]];
      g.setIndex(index);g.computeVertexNormals();
    }
    part(details,g,material,0,0,0,1,1,1);
  }
  for(let i=0;i<n;i+=12)ribbon(.965,i,8,.008,foam,.057);
  for(let i=5;i<n;i+=16)ribbon(.88,i,7,.005,shallow,.049);
  const ripples=addGroup(THREE,room,'Lagoon surface ripples');
  const rippleMat=matte(0x9edee0,{transparent:true,opacity:.48,depthWrite:false});
  for(let i=0;i<22;i++){
    const angle=i*2.39996,r=.24+(i%5)*.12;
    const x=Math.cos(angle)*8*r,z=-2.8+Math.sin(angle)*6*r;
    part(ripples,'sphere',rippleMat,x,.063,z,.23+(i%4)*.14,.006,.036).rotation.y=.25*Math.sin(i);
  }
  // Boardwalk lies on the sand, keeping the existing floor-height contract.
  part(details,'box',wood,0,.06,5.0,2.9,.12,2.2);
  for(let i=0;i<10;i++) part(details,'box',darkWood,0,.126,4.02+i*.21,2.83,.012,.035);
  for(const s of [-1,1]){
    for(const z of [4.25,5.75]){
      part(details,'drum',darkWood,s*1.5,.44,z,.14,.88,.14);
      part(details,'drum',rope,s*1.5,.68,z,.16,.09,.16);
    }
    beam(details,rope,[s*1.5,.65,4.25],[s*1.5,.65,5.75],.065);
  }
  // Curving palms and recognizable broad fronds.
  for(const [x,z,h] of [[-7.4,6.5,4.6],[7.0,6.4,5.1],[-9.1,2.4,4.3],[9.5,1.1,4.8],[-7.6,-6.4,5.5]]){
    const bend=x<0?.7:-.7;
    let prev=[x,0,z];
    for(let i=1;i<=7;i++){
      const t=i/7, next=[x+bend*t*t,h*t,z+.35*t*t];
      const trunk=part(details,'drum',wood,(prev[0]+next[0])/2,(prev[1]+next[1])/2,(prev[2]+next[2])/2,
        .24-.08*t,Math.hypot(next[0]-prev[0],next[1]-prev[1],next[2]-prev[2])+.035,.24-.08*t);
      trunk.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(next[0]-prev[0],next[1]-prev[1],next[2]-prev[2]).normalize());
      prev=next;
    }
    for(let i=0;i<9;i++){
      const a=i*Math.PI*2/9, dx=Math.cos(a),dz=Math.sin(a);
      const frond=part(details,'sphere',i%2?green:lime,prev[0]+dx*.91,h-.18,prev[2]+dz*.91,.32,.12,1.22);
      frond.rotation.set(.32,Math.atan2(dx,dz),0,'YXZ');
      part(details,'sphere',green,prev[0]+dx*1.58,h-.65,prev[2]+dz*1.58,.23,.13,.72).rotation.y=Math.atan2(dx,dz);
    }
    for(let i=0;i<3;i++)part(details,'ball',darkWood,prev[0]+.23*Math.cos(i*2.1),h-.30,prev[2]+.23*Math.sin(i*2.1),.21,.24,.21);
    addRoundSolid(obstacles,...toWorld(x,z),.32,h);
  }
  // Motunui-style island backdrop: rocks and greenery outside the sailing loop.
  for(const [x,z,s] of [[-8,-7.4,1.3],[7.3,-8,1.2],[8.5,-5.2,.85],[-9,-3.6,.7]]){
    part(details,'ball',stone,x,s*.48,z,s*1.35,s*.8,s);
    part(details,'ball',green,x,s*1.05,z,s*.85,s*.5,s*.76);
  }
  for(let i=0;i<16;i++){
    const x=(i%2?1:-1)*(4.5+(i%4)*.63), z=6.0+(i%3)*.65;
    part(details,'ball',green,x,.24,z,.45,.32,.41);
    part(details,'gem',i%2?red:ivory,x,.52,z,.12,.15,.12);
  }
  batch(details,room);
  addGallerySign(THREE,document,room,['Sail with Moana'],2.25,1.12,5.95,2.25,.43);

  // Moana stands on the beach beside the dock.
  const moana=addGroup(THREE,room,'Moana',-2.9,0,6.0);
  moana.rotation.y=.30;
  for(const s of [-1,1]){
    part(moana,'sphere',skin,s*.17,.40,0,.13,.37,.15);
    part(moana,'sphere',skin,s*.17,.09,.10,.14,.09,.26);
  }
  const skirt=new THREE.LatheGeometry([[.45,.48],[.49,.56],[.43,.78],[.32,1.10]].map(([r,y])=>new THREE.Vector2(r,y)),16);
  part(moana,skirt,ivory,0,0,0,1,1,.80);
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6;
    part(moana,'box',rope,Math.sin(a)*.40,.75,Math.cos(a)*.40,.075,.46,.09).rotation.y=a;
  }
  part(moana,'drum',red,0,1.11,0,.31,.17,.23);
  part(moana,'sphere',skin,0,1.40,0,.33,.40,.23);
  part(moana,'sphere',red,0,1.44,.13,.31,.22,.15);
  part(moana,'drum',skin,0,1.74,0,.12,.20,.12);
  const head=addGroup(THREE,moana,'Moana head',0,2.01,0);
  buildPrincessFace(THREE,parts,head,{skin,blush:matte(0xc08366),brow:hair,lip:matte(0x8d4039),iris:matte(0x573626),pearl:ivory},false,{jaw:.13,eyeWidth:1.02});
  part(head,'sphere',hair,0,.10,-.13,.33,.34,.27);
  const shoulders=[];
  for(const side of [-1,1]){
    part(head,'sphere',hair,side*.16,.23,.12,.18,.11,.12).rotation.z=side*-.42;
    part(head,'sphere',hair,side*.26,-.04,-.08,.12,.23,.17);
  }
  for(const s of [-1,1]){
    for(let i=0;i<5;i++)part(head,'sphere',hair,s*(.27+.025*Math.sin(i*1.6)),-.02-i*.16,-.16-i*.02,.14,.20,.17);
    const arm=addGroup(THREE,moana,'Moana shoulder',s*.30,1.55,0);
    arm.rotation.z=s*.20;
    part(arm,'sphere',skin,0,-.035,0,.112,.12,.11);
    part(arm,'sphere',skin,0,-.21,0,.105,.23,.11);
    const elbow=addGroup(THREE,arm,'Moana elbow',0,-.38,.01);
    part(elbow,'sphere',skin,0,-.025,0,.10,.10,.10);
    part(elbow,'sphere',skin,0,-.16,.025,.09,.20,.10);
    part(elbow,'sphere',skin,0,-.35,.035,.10,.11,.09);
    shoulders.push({arm,elbow,s});
  }
  for(const side of [-1,1])beam(moana,rope,[side*.10,1.72,.17],[0,1.62,.25],.018);
  part(moana,'gem',sea,0,1.62,.25,.075,.12,.04);
  addRoundSolid(obstacles,...toWorld(-2.9,6),.65,2.5);

  // Polynesian-inspired outrigger canoe with a curved hull and woven triangular sail.
  const boat=addGroup(THREE,room,'Moana voyaging canoe',0,.13,MOANA_DOCK.z);
  const hull=new THREE.Group();
  const hullShape=new THREE.Shape();
  hullShape.moveTo(0,-2.05); hullShape.quadraticCurveTo(.94,-.85,.82,1.15);
  hullShape.quadraticCurveTo(.50,1.90,0,2.10); hullShape.quadraticCurveTo(-.50,1.90,-.82,1.15);
  hullShape.quadraticCurveTo(-.94,-.85,0,-2.05);
  const hullGeo=new THREE.ExtrudeGeometry(hullShape,{depth:.38,bevelEnabled:true,bevelThickness:.10,bevelSize:.10,bevelSegments:1,steps:1,curveSegments:8});
  const deck=part(hull,hullGeo,wood,0,.12,0,1,1,1); deck.rotation.x=-Math.PI/2;
  for(let i=0;i<10;i++){
    const z=-1.12+i*.24;
    part(hull,'box',i%2?wood:rope,0,.53,z,1.32,.075,.225);
  }
  for(const s of [-1,1]){
    beam(hull,darkWood,[s*.68,.64,-1.05],[s*.68,.64,1.10],.10);
  }
  for(const z of [-.95,.96])beam(hull,wood,[.5,.54,z],[2.0,.39,z],.15);
  part(hull,'sphere',darkWood,2.0,.16,0,.26,.24,1.72);
  beam(hull,darkWood,[-.36,.55,-.55],[-.36,4.3,-.55],.13);
  beam(hull,rope,[-.36,4.20,-.55],[-.36,.95,-1.76],.075);
  beam(hull,rope,[-.36,.98,-1.75],[-.36,2.1,1.23],.07);
  const clothGeo=new THREE.BufferGeometry();
  clothGeo.setAttribute('position',new THREE.Float32BufferAttribute([
    -.36,4.12,-.55, -.36,1.05,-1.70, -.36,2.10,1.16,
  ],3));
  clothGeo.computeVertexNormals();
  part(hull,clothGeo,sail,0,0,0,1,1,1);
  // Stylized red sail emblem on both sides, clear of the cloth plane.
  for(const s of [-1,1]){
    const emblem=part(hull,new THREE.TorusGeometry(.28,.035,5,20,Math.PI*1.65),red,-.36+s*.026,2.42,-.31,1,1,1);
    emblem.rotation.y=Math.PI/2;
  }
  beam(hull,wood,[-.42,.68,1.15],[.45,1.18,1.57],.085);
  part(hull,'sphere',wood,.55,1.24,1.63,.105,.06,.30).rotation.y=.6;
  batch(hull,boat);
  const wake=addGroup(THREE,room,'Canoe wake');
  for(const s of [-1,1])for(let i=0;i<4;i++)part(wake,'sphere',foam,s*(.45+i*.20),.065,-.7-i*.39,.075,.018,.42);
  const [wx,wz]=toWorld(0,MOANA_DOCK.z);
  const [lx,lz]=toWorld(0,MOANA_DOCK.landingZ);
  const landing={x:lx,z:lz,yaw:exhibit.rotation};
  const startEye=new THREE.Vector3(), eye=new THREE.Vector3(), stopEye=new THREE.Vector3(lx,EYE_HEIGHT,lz);
  const startRotation=new THREE.Quaternion(), facing=new THREE.Quaternion(), angles=new THREE.Euler(0,0,0,'YXZ');
  const local=[0,0];
  let release=null,time=0,yaw=0,pitch=0,completed=false,nextWave=2;
  const dock=()=>{boat.position.set(0,.13,MOANA_DOCK.z);boat.rotation.set(0,Math.PI/2,0);wake.visible=false;room.add(moana);moana.position.set(-2.9,0,6);moana.rotation.set(0,.30,0);for(const {arm,elbow,s} of shoulders){arm.rotation.set(0,0,s*.20);elbow.rotation.set(0,0,0);}};
  function stop(spawn){const restore=release;release=null;dock();restore?.(spawn);}
  function reachable(position){
    if(!position||!isPlayerGrounded()||Math.abs(position.y-EYE_HEIGHT)>.25)return false;
    toLocal(position.x,position.z,local);
    return Math.abs(local[0])<1.45&&local[1]>5.1&&local[1]<7.3;
  }
  const interaction={x:wx,z:wz,anchorY:1.1,radius:4.4,label:'Sail with Moana',silent:true,reachable,
    get active(){return isActive()&&!release;},
    act({guideCamera}={}){
      if(!this.active||!reachable(camera?.position)||typeof guideCamera!=='function')return;
      const restore=guideCamera((dx,dy)=>{yaw=THREE.MathUtils.clamp(yaw-dx,-1.6,1.6);pitch=THREE.MathUtils.clamp(pitch-dy,-.65,.8);});
      if(typeof restore!=='function')return;
      release=restore;startEye.copy(camera.position);startRotation.copy(camera.quaternion);time=yaw=pitch=0;nextWave=2;
      playCue(galleryCues.moanaDepart);
    }};
  function pose(a,still){
    const x=4.35*Math.sin(a),z=-2.55+5.65*Math.cos(a);
    const heading=Math.atan2(4.35*Math.cos(a),-5.65*Math.sin(a));
    boat.position.set(x,.13+(still?0:.065*Math.sin(a*4)),z);
    boat.rotation.set(0,heading,still?0:.035*Math.sin(a*2));
    // Attach to the moving hull so her feet follow its pitch and roll.
    if(moana.parent!==boat)boat.add(moana);
    moana.position.set(.17,.568,.79);
    moana.rotation.set(0,0,0);
    for(const {arm,elbow,s} of shoulders){
      arm.rotation.set(-.15,0,s*.32);
      elbow.rotation.x=-.30+(still?0:.05*Math.sin(a*2));
    }
    const [px,pz]=toWorld(x,z);
    eye.set(px,boat.position.y+.60+EYE_HEIGHT,pz);
    angles.set(pitch,heading+exhibit.rotation+Math.PI+yaw,0,'YXZ');
    facing.setFromEuler(angles);
    wake.position.set(x,0,z);wake.rotation.y=heading;wake.visible=true;
  }
  dock();
  return {interactions:[interaction],
    update(dt,_player,_grounded,still,elapsed=dt){
      if(!still && !reducedMotion()) { ripples.position.y = .003*Math.sin((ripples.userData.phase=(ripples.userData.phase??0)+dt)*2); }
      else ripples.position.y=0;
      if(!release)return false;
      time=Math.min(VOYAGE_DURATION,time+Math.max(0,elapsed));
      const steady=still||reducedMotion();
      // The rider hears local water sounds at restrained intervals, never per frame.
      if(time>=nextWave && time<15){nextWave=time+2.4;playCue(galleryCues.moanaWave);}
      if(time<1){
        pose(0,steady);wake.visible=false;
        camera.position.lerpVectors(startEye,eye,ease(time));
        camera.quaternion.slerpQuaternions(startRotation,facing,ease(time));
      }else if(time<15){
        pose(ease((time-1)/14)*Math.PI*2,steady);
        camera.position.copy(eye);camera.quaternion.copy(facing);
      }else{
        pose(0,steady);wake.visible=false;
        camera.position.lerpVectors(eye,stopEye,ease(time-15));
        camera.quaternion.copy(facing);
      }
      camera.updateMatrixWorld();
      if(time<VOYAGE_DURATION)return false;
      stop({...landing,yaw:landing.yaw+yaw});
      playCue(galleryCues.moanaArrive);
      if(completed)return false;
      completed=true;return true;
    },
    reset(){stop(landing);completed=false;ripples.position.y=0;ripples.userData.phase=0;},
  };
}
